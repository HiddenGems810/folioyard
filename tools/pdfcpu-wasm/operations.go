package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/filter"
	"github.com/pdfcpu/pdfcpu/pkg/log"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// shortcut: 50 MB bounds browser memory use, raise after mobile-device profiling.
const maxInputBytes = 50 * 1024 * 1024
const maxDecodedStreamBytes = 100 * 1024 * 1024

var (
	ErrInputTooLarge    = errors.New("PDF exceeds the 50 MB limit")
	ErrInvalidPassword  = errors.New("password must be between 8 and 127 UTF-8 bytes")
	ErrPasswordRequired = errors.New("password is required")
	configureOnce       sync.Once
)

func init() {
	configureOnce.Do(func() {
		api.DisableConfigDir()
		log.DisableLoggers()
	})
}

func Process(input []byte, operation, password string) ([]byte, int, error) {
	if len(input) == 0 {
		return nil, 0, errors.New("empty PDF input")
	}
	if len(input) > maxInputBytes {
		return nil, 0, ErrInputTooLarge
	}

	inputPassword := ""
	if operation == "decrypt" {
		inputPassword = password
	}
	if operation == "encrypt" {
		if err := validatePassword(password); err != nil {
			return nil, 0, err
		}
	}
	beforePages, err := pageCount(input, inputPassword)
	if err != nil {
		return nil, 0, err
	}

	var output bytes.Buffer
	switch operation {
	case "compress":
		var optimized []byte
		optimized, err = optimizePDF(input)
		if err == nil {
			output.Write(optimized)
		}
	case "encrypt":
		var ownerPassword string
		ownerPassword, err = randomOwnerPassword()
		if err == nil {
			configuration := newConfiguration(password, model.ENCRYPT)
			configuration.OwnerPW = ownerPassword
			configuration.EncryptUsingAES = true
			configuration.EncryptKeyLength = 256
			configuration.Permissions = model.PermissionsAll
			err = api.Encrypt(context.Background(), bytes.NewReader(input), &output, configuration)
		}
	case "decrypt":
		if password == "" {
			err = ErrPasswordRequired
		} else {
			configuration := newConfiguration(password, model.DECRYPT)
			err = api.Decrypt(context.Background(), bytes.NewReader(input), &output, configuration)
		}
	default:
		return nil, 0, fmt.Errorf("unsupported PDF operation %q", operation)
	}
	if err != nil {
		return nil, 0, err
	}

	result := output.Bytes()
	if operation == "encrypt" {
		if _, err := pageCount(result, ""); err == nil {
			return nil, 0, errors.New("encrypted output did not require a password")
		}
	}
	outputPassword := ""
	if operation == "encrypt" {
		outputPassword = password
	}
	verifiedPages, err := pageCount(result, outputPassword)
	if err != nil {
		return nil, 0, fmt.Errorf("verify PDF output: %w", err)
	}
	if verifiedPages != beforePages {
		return nil, 0, fmt.Errorf("PDF output has %d pages; expected %d", verifiedPages, beforePages)
	}
	return result, verifiedPages, nil
}

func newConfiguration(password string, command model.CommandMode) *model.Configuration {
	configuration := model.NewDefaultConfiguration()
	configuration.Cmd = command
	configuration.UserPW = password
	configuration.Limits.MaxStreamBytes = maxInputBytes
	configuration.Limits.MaxDecodeBytes = maxDecodedStreamBytes
	configuration.Limits.MaxImageBytes = maxDecodedStreamBytes
	configuration.Limits.MaxObjectCount = 250_000
	configuration.Limits.MaxObjectStreamCount = 100_000
	configuration.Limits.MaxXRefEntries = 250_000
	return configuration
}

func optimizePDF(input []byte) ([]byte, error) {
	configuration := newConfiguration("", model.OPTIMIZE)
	configuration.OptimizeDuplicateContentStreams = true
	ctx := context.Background()
	context, err := api.ReadAndValidate(ctx, bytes.NewReader(input), configuration)
	if err != nil {
		return nil, err
	}
	for _, entry := range context.Table {
		switch stream := entry.Object.(type) {
		case types.StreamDict:
			if stream.Image() {
				continue
			}
			optimized, changed, err := compressStream(stream, configuration.Limits.MaxDecodeBytes)
			if err != nil {
				return nil, fmt.Errorf("compress stream: %w", err)
			}
			if changed {
				entry.Object = optimized
			}
		case *types.StreamDict:
			if stream == nil || stream.Image() {
				continue
			}
			optimized, changed, err := compressStream(*stream, configuration.Limits.MaxDecodeBytes)
			if err != nil {
				return nil, fmt.Errorf("compress stream: %w", err)
			}
			if changed {
				entry.Object = &optimized
			}
		}
	}
	if err := api.OptimizeContext(ctx, context); err != nil {
		return nil, err
	}
	var output bytes.Buffer
	if err := api.WriteContext(ctx, context, &output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func compressStream(stream types.StreamDict, maxDecodeBytes int64) (types.StreamDict, bool, error) {
	original := stream.Clone().(types.StreamDict)
	content, err := stream.DecodeLengthWithLimit(-1, maxDecodeBytes)
	if err != nil {
		return original, false, err
	}
	stream.Content = content
	stream.FilterPipeline = []types.PDFFilter{{Name: filter.Flate}}
	stream.Update("Filter", types.Name(filter.Flate))
	stream.Delete("DecodeParms")
	if err := stream.Encode(); err != nil {
		return original, false, err
	}
	if len(stream.Raw) >= len(original.Raw) {
		return original, false, nil
	}
	return stream, true, nil
}

func validatePassword(password string) error {
	if len([]byte(password)) < 8 || len([]byte(password)) > 127 {
		return ErrInvalidPassword
	}
	return nil
}

func randomOwnerPassword() (string, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", fmt.Errorf("create owner password: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(secret), nil
}

func pageCount(input []byte, password string) (int, error) {
	configuration := newConfiguration(password, model.VALIDATE)
	context, err := api.ReadValidateAndOptimize(context.Background(), bytes.NewReader(input), configuration, nil)
	if err != nil {
		return 0, err
	}
	if context.PageCount < 1 {
		return 0, errors.New("PDF contains no pages")
	}
	return context.PageCount, nil
}
