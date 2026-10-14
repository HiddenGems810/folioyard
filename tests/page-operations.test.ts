import { readFile } from 'node:fs/promises';
import { File } from 'node:buffer';
import { PDFDocument, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { applyPageOperation, imagesToPdf } from '../src/page-operations';
import { parsePageList } from '../src/page-list';

async function makePdf(widths: number[]) {
  const document = await PDFDocument.create();
  for (const [index, width] of widths.entries()) {
    const page = document.addPage([width, 500]);
    if (index === 1) page.setRotation(degrees(90));
  }
  return document.save();
}

async function loadOutput(bytes: Uint8Array) {
  return PDFDocument.load(bytes);
}

describe('page operations', () => {
  it('parses bounded page ranges and rejects duplicate or invalid pages', () => {
    expect(parsePageList('1, 3-4', 5)).toEqual([1, 3, 4]);
    expect(() => parsePageList('1, 1', 5)).toThrow(/repeat/i);
    expect(() => parsePageList('0, 3', 5)).toThrow(/between/i);
    expect(() => parsePageList('2--4', 5)).toThrow(/comma/i);
  });

  it('extracts and reorders requested pages', async () => {
    const input = await makePdf([100, 200, 300]);
    const extracted = await applyPageOperation(input, 'sample.pdf', { kind: 'extract', pages: [3, 1] });
    const reordered = await applyPageOperation(input, 'sample.pdf', { kind: 'reorder', pages: [3, 1, 2] });

    expect((await loadOutput(extracted[0].bytes)).getPages().map((page) => page.getWidth())).toEqual([300, 100]);
    expect((await loadOutput(reordered[0].bytes)).getPages().map((page) => page.getWidth())).toEqual([300, 100, 200]);
  });

  it('splits after selected page boundaries and deletes pages without producing an empty PDF', async () => {
    const input = await makePdf([100, 200, 300, 400]);
    const split = await applyPageOperation(input, 'sample.pdf', { kind: 'split', afterPages: [1, 3] });
    const deleted = await applyPageOperation(input, 'sample.pdf', { kind: 'delete', pages: [2] });

    expect(split.map((file) => file.pageCount)).toEqual([1, 2, 1]);
    expect(split.map((file) => file.name)).toEqual(['sample-part-01.pdf', 'sample-part-02.pdf', 'sample-part-03.pdf']);
    expect((await loadOutput(deleted[0].bytes)).getPages().map((page) => page.getWidth())).toEqual([100, 300, 400]);
    await expect(applyPageOperation(input, 'sample.pdf', { kind: 'delete', pages: [1, 2, 3, 4] })).rejects.toThrow(/keep at least one/i);
  });

  it('requires at least two pages to split and rejects fractional reorder indexes', async () => {
    const input = await makePdf([100, 200]);
    await expect(applyPageOperation(await makePdf([100]), 'single.pdf', { kind: 'split', afterPages: [] }))
      .rejects.toThrow(/at least two pages/i);
    await expect(applyPageOperation(input, 'sample.pdf', { kind: 'reorder', pages: [1.5, 2] }))
      .rejects.toThrow(/every page once/i);
  });

  it('applies page rotation while leaving unselected pages unchanged', async () => {
    const input = await makePdf([100, 200, 300]);
    const [output] = await applyPageOperation(input, 'sample.pdf', { kind: 'rotate', pages: [2, 3], degrees: 90 });
    const result = await loadOutput(output.bytes);

    expect(result.getPages().map((page) => page.getRotation().angle)).toEqual([0, 180, 90]);
  });

  it('creates a valid PDF from ordered PNG and JPEG inputs', async () => {
    const pixelPng = await readFile(new URL('./fixtures/pixel.png', import.meta.url));
    const pixelJpeg = await readFile(new URL('./fixtures/pixel.jpg', import.meta.url));
    const output = await imagesToPdf([
      new File([pixelPng], 'first.png', { type: 'image/png' }),
      new File([pixelJpeg], 'second.jpg', { type: 'image/jpeg' }),
    ]);
    const result = await loadOutput(output.bytes);

    expect(output.name).toBe('folioyard-images.pdf');
    expect(output.pageCount).toBe(2);
    expect(result.getPages()).toHaveLength(2);
    expect(result.getPages().map((page) => [page.getWidth(), page.getHeight()])).toEqual([[612, 792], [792, 612]]);
  });

  it('applies watermarks, page numbers, visible notes, and visual signatures to PDF copies', async () => {
    const input = await makePdf([100, 200]);
    const pixelPng = await readFile(new URL('./fixtures/pixel.png', import.meta.url));
    const watermarked = await applyPageOperation(input, 'sample.pdf', { kind: 'watermark', pages: [1], text: 'DRAFT' });
    const numbered = await applyPageOperation(input, 'sample.pdf', { kind: 'page-numbers' });
    const annotated = await applyPageOperation(input, 'sample.pdf', { kind: 'annotate', pages: [2], text: 'Review this page' });
    const signed = await applyPageOperation(input, 'sample.pdf', { kind: 'signature', pages: [1], signaturePng: pixelPng.buffer.slice(pixelPng.byteOffset, pixelPng.byteOffset + pixelPng.byteLength) });
    const typed = await applyPageOperation(input, 'sample.pdf', { kind: 'signature', pages: [2], signatureText: 'Example Name' });

    expect((await loadOutput(watermarked[0].bytes)).getPageCount()).toBe(2);
    expect((await loadOutput(numbered[0].bytes)).getPageCount()).toBe(2);
    expect((await loadOutput(annotated[0].bytes)).getPageCount()).toBe(2);
    expect((await loadOutput(signed[0].bytes)).getPageCount()).toBe(2);
    expect((await loadOutput(typed[0].bytes)).getPageCount()).toBe(2);
    expect(watermarked[0].bytes.length).toBeGreaterThan(input.length);
    expect(annotated[0].bytes.length).toBeGreaterThan(input.length);
    expect(signed[0].name).toContain('signed-visually');
  });

  it('reports malformed and encrypted files clearly', async () => {
    const invalid = new Uint8Array(await readFile(new URL('./fixtures/invalid.pdf', import.meta.url)));
    const encrypted = new Uint8Array(await readFile(new URL('./fixtures/encrypted.pdf', import.meta.url)));
    await expect(applyPageOperation(invalid, 'broken.pdf', { kind: 'rotate', pages: [1], degrees: 90 })).rejects.toThrow(/broken\.pdf/i);
    await expect(applyPageOperation(encrypted, 'locked.pdf', { kind: 'rotate', pages: [1], degrees: 90 })).rejects.toThrow(/locked\.pdf/i);
  });
});
