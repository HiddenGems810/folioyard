import { readFile } from 'node:fs/promises';
import { PDFDocument, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { mergePdfFiles } from '../src/merge';

async function makePdf(pages: Array<{ width: number; height: number; rotation?: number }>) {
  const document = await PDFDocument.create();
  for (const page of pages) {
    const added = document.addPage([page.width, page.height]);
    if (page.rotation) added.setRotation(degrees(page.rotation));
  }
  return document.save();
}

const source = (name: string, bytes: Uint8Array) => ({
  name,
  readBytes: async () => new Uint8Array(bytes),
});

describe('mergePdfFiles', () => {
  it('copies every page in source order and retains rotation', async () => {
    const first = await makePdf([{ width: 240, height: 360 }]);
    const second = await makePdf([
      { width: 300, height: 420, rotation: 90 },
      { width: 320, height: 440 },
    ]);

    const merged = await mergePdfFiles([
      source('first.pdf', first),
      source('second.pdf', second),
    ]);
    const result = await PDFDocument.load(merged.bytes);
    const pages = result.getPages();

    expect(merged.pageCount).toBe(3);
    expect(pages.map((page) => page.getWidth())).toEqual([240, 300, 320]);
    expect(pages[1].getRotation().angle).toBe(90);
  });

  it('keeps all pages from a multipage source', async () => {
    const first = await makePdf([{ width: 100, height: 200 }, { width: 110, height: 210 }]);
    const second = await makePdf([{ width: 120, height: 220 }]);

    const merged = await mergePdfFiles([
      source('two-pages.pdf', first),
      source('one-page.pdf', second),
    ]);
    const result = await PDFDocument.load(merged.bytes);

    expect(result.getPageCount()).toBe(3);
    expect(result.getPages().map((page) => page.getWidth())).toEqual([100, 110, 120]);
  });

  it('reports progress after each source has actually been copied', async () => {
    const first = await makePdf([{ width: 100, height: 200 }]);
    const second = await makePdf([{ width: 120, height: 220 }, { width: 140, height: 240 }]);
    const progress: Array<{ name: string; completedFiles: number; pageCount: number }> = [];
    const sequence: string[] = [];

    await mergePdfFiles([
      { name: 'first.pdf', readBytes: async () => { sequence.push('read first'); return first; } },
      { name: 'second.pdf', readBytes: async () => { sequence.push('read second'); return second; } },
    ], (event) => {
      progress.push(event);
      sequence.push(`copied ${event.name}`);
    });

    expect(progress).toEqual([
      { name: 'first.pdf', completedFiles: 1, pageCount: 1 },
      { name: 'second.pdf', completedFiles: 2, pageCount: 2 },
    ]);
    expect(sequence).toEqual(['read first', 'copied first.pdf', 'read second', 'copied second.pdf']);
  });

  it('requires at least two source PDFs', async () => {
    const only = await makePdf([{ width: 100, height: 200 }]);
    await expect(mergePdfFiles([source('only.pdf', only)])).rejects.toThrow(/at least two/i);
  });

  it('rejects malformed PDF bytes with the source name', async () => {
    await expect(mergePdfFiles([
      source('broken.pdf', new TextEncoder().encode('not a PDF')),
      source('valid.pdf', await makePdf([{ width: 100, height: 100 }])),
    ])).rejects.toThrow(/broken\.pdf/i);
  });

  it('rejects an encrypted PDF without ignoring encryption', async () => {
    const encrypted = new Uint8Array(await readFile(new URL('./fixtures/encrypted.pdf', import.meta.url)));
    const valid = await makePdf([{ width: 100, height: 100 }]);

    await expect(mergePdfFiles([
      source('locked.pdf', encrypted),
      source('valid.pdf', valid),
    ])).rejects.toThrow(/encrypted|password/i);
  });
});
