import { PDFDocument } from 'pdf-lib';

export type MergeInput = { name: string; readBytes: () => Promise<Uint8Array> };
export type MergeProgress = { name: string; completedFiles: number; pageCount: number };
export type MergeOutput = { bytes: Uint8Array; pageCount: number };

export async function mergePdfFiles(
  files: readonly MergeInput[],
  onProgress?: (progress: MergeProgress) => void,
): Promise<MergeOutput> {
  if (files.length < 2) throw new Error('Add at least two PDFs to merge.');

  const merged = await PDFDocument.create();
  let pageCount = 0;

  for (const [index, file] of files.entries()) {
    let source: PDFDocument;
    try {
      source = await PDFDocument.load(await file.readBytes());
    } catch (error) {
      if (error instanceof Error && error.message.includes('document to `PDFDocument.load` is encrypted')) {
        throw new Error(`“${file.name}” is encrypted or password-protected. Unlock it before merging.`, { cause: error });
      }
      throw new Error(`Could not read “${file.name}”. It may be damaged or not a valid PDF.`, { cause: error });
    }

    const indices = source.getPageIndices();
    if (indices.length === 0) throw new Error(`“${file.name}” has no pages to merge.`);

    try {
      const copiedPages = await merged.copyPages(source, indices);
      for (const page of copiedPages) merged.addPage(page);
      pageCount += copiedPages.length;
    } catch (error) {
      throw new Error(`Could not copy pages from “${file.name}”.`, { cause: error });
    }

    onProgress?.({ name: file.name, completedFiles: index + 1, pageCount: indices.length });
  }

  return { bytes: await merged.save(), pageCount };
}
