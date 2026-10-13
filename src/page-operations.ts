import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { flattenFormFields } from './pdf-structure';
export { parsePageList } from './page-list';

export type PageOperation =
  | { kind: 'split'; afterPages: number[] }
  | { kind: 'extract'; pages: number[] }
  | { kind: 'reorder'; pages: number[] }
  | { kind: 'rotate'; pages: number[]; degrees: 90 | 180 | 270 }
  | { kind: 'delete'; pages: number[] }
  | { kind: 'watermark'; pages: number[]; text: string }
  | { kind: 'page-numbers' }
  | { kind: 'annotate'; pages: number[]; text: string }
  | { kind: 'signature'; pages: number[]; signaturePng?: ArrayBuffer; signatureText?: string };

export type PageOperationOutput = { name: string; bytes: Uint8Array; pageCount: number };

function validatePages(pages: number[], pageCount: number, maximum = pageCount) {
  if (pages.length === 0) throw new Error('Select at least one page.');
  if (new Set(pages).size !== pages.length) throw new Error('Do not repeat a page number.');
  if (pages.some((page) => !Number.isInteger(page) || page < 1 || page > maximum)) throw new Error(`Pages must be between 1 and ${maximum}.`);
}

async function copyPages(source: PDFDocument, indices: number[], name: string): Promise<PageOperationOutput> {
  const output = await PDFDocument.create();
  for (const page of await output.copyPages(source, indices)) output.addPage(page);
  return { name, bytes: await output.save(), pageCount: indices.length };
}

export async function applyPageOperation(bytes: Uint8Array, fileName: string, operation: PageOperation): Promise<PageOperationOutput[]> {
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(bytes);
  } catch (error) {
    throw new Error(`Could not read “${fileName}”. It may be encrypted, damaged, or not a valid PDF.`, { cause: error });
  }
  flattenFormFields(source, fileName);

  const pageCount = source.getPageCount();
  if (pageCount < 1) throw new Error(`“${fileName}” has no pages to process.`);
  const indices = source.getPageIndices();
  const stem = fileName.replace(/\.pdf$/i, '');

  if (operation.kind === 'split') {
    if (pageCount < 2) throw new Error('A PDF needs at least two pages to split.');
    validatePages(operation.afterPages, pageCount, pageCount - 1);
    const breaks = new Set(operation.afterPages);
    const outputs: PageOperationOutput[] = [];
    let start = 0;
    for (let page = 1; page <= pageCount; page += 1) {
      if (page === pageCount || breaks.has(page)) {
        const part = outputs.length + 1;
        outputs.push(await copyPages(source, indices.slice(start, page), `${stem}-part-${String(part).padStart(2, '0')}.pdf`));
        start = page;
      }
    }
    return outputs;
  }

  let selectedIndices = indices;
  let suffix: string;
  if (operation.kind === 'extract') {
    validatePages(operation.pages, pageCount);
    selectedIndices = operation.pages.map((page) => page - 1);
    suffix = 'extracted';
  } else if (operation.kind === 'reorder') {
    if (operation.pages.length !== pageCount || new Set(operation.pages).size !== pageCount || operation.pages.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)) {
      throw new Error(`Enter every page once, from 1 to ${pageCount}, in the order you want.`);
    }
    selectedIndices = operation.pages.map((page) => page - 1);
    suffix = 'reordered';
  } else if (operation.kind === 'delete') {
    validatePages(operation.pages, pageCount);
    const deleted = new Set(operation.pages);
    selectedIndices = indices.filter((index) => !deleted.has(index + 1));
    if (selectedIndices.length === 0) throw new Error('A PDF must keep at least one page.');
    suffix = 'edited';
  } else if (operation.kind === 'watermark') {
    validatePages(operation.pages, pageCount);
    const text = operation.text.trim();
    if (!text || text.length > 80) throw new Error('Enter a watermark between 1 and 80 characters.');
    const font = await source.embedFont(StandardFonts.HelveticaBold);
    try { font.encodeText(text); } catch { throw new Error('Watermark text supports basic Latin characters only.'); }
    for (const pageNumber of operation.pages) {
      const page = source.getPage(pageNumber - 1);
      const size = Math.min(44, Math.max(18, page.getWidth() / 12));
      const textWidth = font.widthOfTextAtSize(text, size);
      if (textWidth > page.getWidth() * 1.25) throw new Error('The watermark is too wide for a page. Use shorter text.');
      page.drawText(text, {
        x: (page.getWidth() - textWidth) / 2,
        y: page.getHeight() / 2,
        size,
        font,
        color: rgb(0.25, 0.31, 0.3),
        opacity: 0.22,
        rotate: degrees(45),
      });
    }
    suffix = 'watermarked';
  } else if (operation.kind === 'page-numbers') {
    const font = await source.embedFont(StandardFonts.Helvetica);
    for (const [index, page] of source.getPages().entries()) {
      if (page.getWidth() < 40 || page.getHeight() < 30) throw new Error('A page is too small to place a page number.');
      const label = `${index + 1} / ${pageCount}`;
      const size = 9;
      page.drawText(label, {
        x: (page.getWidth() - font.widthOfTextAtSize(label, size)) / 2,
        y: 18,
        size,
        font,
        color: rgb(0.35, 0.38, 0.37),
      });
    }
    suffix = 'numbered';
  } else if (operation.kind === 'annotate') {
    validatePages(operation.pages, pageCount);
    const text = operation.text.trim();
    if (!text || text.length > 120 || /[\r\n\t]/.test(text)) throw new Error('Enter a single-line note between 1 and 120 characters.');
    const font = await source.embedFont(StandardFonts.Helvetica);
    try { font.encodeText(text); } catch { throw new Error('Note text supports basic Latin characters only.'); }
    for (const pageNumber of operation.pages) {
      const page = source.getPage(pageNumber - 1);
      if (page.getHeight() < 60 || page.getWidth() < 80) throw new Error('A page is too small to place a note.');
      const size = 11;
      const textWidth = font.widthOfTextAtSize(text, size);
      const maxWidth = page.getWidth() - 48;
      if (textWidth > maxWidth - 20) throw new Error('The note is too wide for a page. Use shorter text.');
      const boxWidth = textWidth + 20;
      const x = 24;
      const y = page.getHeight() - 54;
      page.drawRectangle({ x, y, width: boxWidth, height: 30, color: rgb(1, 0.97, 0.82), borderColor: rgb(0.78, 0.68, 0.35), borderWidth: 0.8 });
      page.drawText(text, { x: x + 10, y: y + 10, size, font, color: rgb(0.2, 0.2, 0.18) });
    }
    suffix = 'annotated';
  } else if (operation.kind === 'signature') {
    validatePages(operation.pages, pageCount);
    const text = operation.signatureText?.trim() ?? '';
    if (!operation.signaturePng && !text) throw new Error('Draw a signature or enter a name to sign.');
    const signatureImage = operation.signaturePng ? await source.embedPng(new Uint8Array(operation.signaturePng)) : null;
    const font = signatureImage ? null : await source.embedFont(StandardFonts.TimesRomanItalic);
    for (const pageNumber of operation.pages) {
      const page = source.getPage(pageNumber - 1);
      if (signatureImage) {
        const availableWidth = page.getWidth() - 72;
        const availableHeight = page.getHeight() - 72;
        if (availableWidth < 1 || availableHeight < 1) throw new Error('A page is too small to place a signature.');
        const scale = Math.min(1, 180 / signatureImage.width, 76 / signatureImage.height, availableWidth / signatureImage.width, availableHeight / signatureImage.height);
        page.drawImage(signatureImage, {
          x: page.getWidth() - signatureImage.width * scale - 36,
          y: 36,
          width: signatureImage.width * scale,
          height: signatureImage.height * scale,
        });
      } else if (font) {
        if (text.length > 80) throw new Error('Keep a typed signature under 80 characters.');
        try { font.encodeText(text); } catch { throw new Error('Typed signatures support basic Latin characters only.'); }
        const size = Math.min(26, Math.max(16, page.getWidth() / 24));
        const width = font.widthOfTextAtSize(text, size);
        if (width > page.getWidth() - 72) throw new Error('The typed signature is too wide for a page.');
        page.drawText(text, { x: page.getWidth() - width - 36, y: 56, size, font, color: rgb(0.12, 0.2, 0.22) });
      }
    }
    suffix = 'signed-visually';
  } else {
    validatePages(operation.pages, pageCount);
    for (const page of operation.pages) {
      const sourcePage = source.getPage(page - 1);
      sourcePage.setRotation(degrees((sourcePage.getRotation().angle + operation.degrees) % 360));
    }
    suffix = 'rotated';
  }

  return [await copyPages(source, selectedIndices, `${stem}-${suffix}.pdf`)];
}

export async function imagesToPdf(files: Array<Pick<File, 'name' | 'type' | 'arrayBuffer'>>): Promise<PageOperationOutput> {
  if (files.length === 0) throw new Error('Choose at least one PNG or JPEG image.');
  const document = await PDFDocument.create();
  for (const file of files) {
    const name = file.name.toLowerCase();
    const jpeg = file.type === 'image/jpeg' || /\.jpe?g$/.test(name);
    const png = file.type === 'image/png' || name.endsWith('.png');
    if (!jpeg && !png) throw new Error(`“${file.name}” is not a supported image. Choose PNG or JPEG files.`);
    try {
      const image = jpeg
        ? await document.embedJpg(await file.arrayBuffer())
        : await document.embedPng(await file.arrayBuffer());
      const landscape = image.width > image.height;
      const pageWidth = landscape ? 792 : 612;
      const pageHeight = landscape ? 612 : 792;
      const scale = Math.min((pageWidth - 72) / image.width, (pageHeight - 72) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const page = document.addPage([pageWidth, pageHeight]);
      page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
    } catch (error) {
      throw new Error(`Could not read “${file.name}” as a PNG or JPEG image.`, { cause: error });
    }
  }
  const bytes = await document.save();
  return { name: 'folioyard-images.pdf', bytes, pageCount: files.length };
}
