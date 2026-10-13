package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

func fixture(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "tests", "fixtures", "feature-rich.pdf"))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func compressibleFixture(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "tests", "fixtures", "compressible-uncompressed-stream.pdf"))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func objectStreamFixture(t *testing.T, canary string) []byte {
	t.Helper()
	configuration := model.NewDefaultConfiguration()
	ctx, err := api.ReadAndValidate(context.Background(), bytes.NewReader(fixture(t)), configuration)
	if err != nil {
		t.Fatal(err)
	}
	ctx.RootDict["FolioyardEncryptionCanary"] = types.StringLiteral(canary)
	var output bytes.Buffer
	if err := api.WriteContext(context.Background(), ctx, &output); err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(output.Bytes(), []byte("/ObjStm")) {
		t.Fatal("security fixture was not written with an object stream")
	}
	return output.Bytes()
}

func circularFilterPDF() []byte {
	var pdf bytes.Buffer
	var offsets []int
	pdf.WriteString("%PDF-1.4\n")
	for _, body := range []string{
		"<</Type/Catalog/Pages 2 0 R>>",
		"<</Type/Pages/Kids[]/Count 0>>",
		"<</Length 1/Filter 3 0 R>>\nstream\nx\nendstream",
	} {
		offsets = append(offsets, pdf.Len())
		fmt.Fprintf(&pdf, "%d 0 obj\n%s\nendobj\n", len(offsets), body)
	}
	xref := pdf.Len()
	pdf.WriteString("xref\n0 4\n0000000000 65535 f \n")
	for _, offset := range offsets {
		fmt.Fprintf(&pdf, "%010d 00000 n \n", offset)
	}
	fmt.Fprintf(&pdf, "trailer\n<</Size 4/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n", xref)
	return pdf.Bytes()
}

func TestProcessOptimizesAndPreservesPageCount(t *testing.T) {
	input := compressibleFixture(t)
	output, pages, err := Process(input, "compress", "")
	if err != nil {
		t.Fatal(err)
	}
	if pages != 1 || !bytes.HasPrefix(output, []byte("%PDF-")) {
		t.Fatalf("unexpected optimized PDF: pages=%d, signature=%q", pages, output[:min(8, len(output))])
	}
	if len(output) >= len(input) {
		t.Fatalf("lossless optimization did not reduce the synthetic PDF: %d -> %d bytes", len(input), len(output))
	}
	featureRich, featureRichPages, err := Process(fixture(t), "compress", "")
	if err != nil {
		t.Fatal(err)
	}
	if featureRichPages != 2 || !bytes.HasPrefix(featureRich, []byte("%PDF-")) {
		t.Fatalf("feature-rich PDF changed page count or signature: pages=%d", featureRichPages)
	}
}

func TestProcessEncryptDecryptRequiresCorrectPassword(t *testing.T) {
	input := fixture(t)
	password := "folioyard-test-password"
	encrypted, pages, err := Process(input, "encrypt", password)
	if err != nil {
		t.Fatal(err)
	}
	if pages != 2 {
		t.Fatalf("encrypted output has %d pages; want 2", pages)
	}
	if !bytes.Contains(encrypted, []byte("/AESV3")) {
		t.Fatal("protected output does not advertise AES-256 encryption")
	}
	if _, _, err := Process(encrypted, "decrypt", "incorrect-password"); err == nil {
		t.Fatal("wrong password unexpectedly decrypted the PDF")
	}
	decrypted, pages, err := Process(encrypted, "decrypt", password)
	if err != nil {
		t.Fatal(err)
	}
	if pages != 2 || !bytes.HasPrefix(decrypted, []byte("%PDF-")) {
		t.Fatalf("unexpected decrypted PDF: pages=%d, signature=%q", pages, decrypted[:min(8, len(decrypted))])
	}
}

func TestProcessEncryptsStringsInsideObjectStreams(t *testing.T) {
	const password = "folioyard-test-password"
	const canary = "folioyard-object-stream-encryption-canary"
	input := objectStreamFixture(t, canary)
	encrypted, pages, err := Process(input, "encrypt", password)
	if err != nil {
		t.Fatal(err)
	}
	if pages != 2 || !bytes.Contains(encrypted, []byte("/AESV3")) {
		t.Fatalf("unexpected protected object-stream PDF: pages=%d", pages)
	}
	if bytes.Contains(encrypted, []byte(canary)) {
		t.Fatal("protected output exposed a catalog string without its password")
	}
	decrypted, _, err := Process(encrypted, "decrypt", password)
	if err != nil {
		t.Fatal(err)
	}
	ctx, err := api.ReadAndValidate(context.Background(), bytes.NewReader(decrypted), model.NewDefaultConfiguration())
	if err != nil {
		t.Fatal(err)
	}
	value, ok := ctx.RootDict["FolioyardEncryptionCanary"].(types.StringLiteral)
	if !ok || string(value) != canary {
		t.Fatalf("decrypted catalog canary = %v, want %q", ctx.RootDict["FolioyardEncryptionCanary"], canary)
	}
}

func TestProcessRejectsWeakPasswordAndMalformedPDF(t *testing.T) {
	if _, _, err := Process(fixture(t), "encrypt", "short"); !errors.Is(err, ErrInvalidPassword) {
		t.Fatalf("weak password error = %v", err)
	}
	if _, _, err := Process([]byte("not a PDF"), "compress", ""); err == nil {
		t.Fatal("malformed input unexpectedly processed")
	}
}

func TestProcessRejectsCircularFilterReference(t *testing.T) {
	if _, _, err := Process(circularFilterPDF(), "compress", ""); err == nil || !strings.Contains(err.Error(), "circular object reference") {
		t.Fatalf("circular filter reference error = %v", err)
	}
}

func TestPasswordValidationUsesUTF8ByteLength(t *testing.T) {
	if err := validatePassword("ééé"); !errors.Is(err, ErrInvalidPassword) {
		t.Fatalf("three multibyte characters should be under 8 bytes: %v", err)
	}
	if err := validatePassword("ab\u00e9\u00e9\u00e9"); err != nil {
		t.Fatalf("8-byte password rejected: %v", err)
	}
	if err := validatePassword(string(bytes.Repeat([]byte{'x'}, 128))); !errors.Is(err, ErrInvalidPassword) {
		t.Fatalf("128-byte password should be rejected: %v", err)
	}
}
