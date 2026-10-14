export type Tool =
  | 'merge' | 'split' | 'extract' | 'reorder' | 'rotate' | 'delete'
  | 'images-to-pdf' | 'pdf-to-images' | 'watermark' | 'page-numbers'
  | 'annotate' | 'signature' | 'compress' | 'protect' | 'unlock';

export type ToolCategory = 'Organize' | 'Convert' | 'Annotate' | 'Protect & optimize';

export type ToolInfo = {
  id: Tool;
  slug: string;
  title: string;
  category: ToolCategory;
  description: string;
  pageTitle: string;
  metaDescription: string;
  intro: string;
  steps: [string, string, string];
  limits: string;
  faq: { question: string; answer: string };
};

export const tools: ToolInfo[] = [
  {
    id: 'merge', slug: 'merge-pdf', title: 'Merge PDF', category: 'Organize',
    description: 'Put documents in order, check the pages, then save one PDF.',
    pageTitle: 'Merge PDF files in your browser | Folioyard',
    metaDescription: 'Combine PDF files in the order you choose. Preview the result and download it; your documents stay on your device.',
    intro: 'Combine several PDFs into one ordered document. Add files, arrange their order, review the pages, and save the result on this device.',
    steps: ['Choose two or more PDF files.', 'Move files into the order you want and inspect the preview.', 'Select Merge PDFs, then download the validated result.'],
    limits: 'Page content and ordinary annotations are retained in tested cases. Form fields are flattened; document details, bookmarks, and attachments are not carried over. Editing invalidates existing digital signatures.',
    faq: { question: 'Are my PDFs uploaded?', answer: 'No. The merge worker reads the selected files in this browser tab. Folioyard has no document upload endpoint.' },
  },
  {
    id: 'split', slug: 'split-pdf', title: 'Split PDF', category: 'Organize',
    description: 'Choose break points to save separate PDFs from one document.',
    pageTitle: 'Split a PDF into separate files | Folioyard',
    metaDescription: 'Split a PDF at the page numbers you choose and download each part. Processing runs in your browser.',
    intro: 'Choose the pages after which a new part should begin. Folioyard creates separate PDFs and lets you inspect and download each one.',
    steps: ['Choose a PDF and inspect its page count.', 'Enter the page numbers that end each part.', 'Split the file and download the parts you need.'],
    limits: 'The last page is included automatically. Form fields are flattened; document details, bookmarks, and attachments are not carried over. Existing digital signatures will no longer be valid.',
    faq: { question: 'Can I choose nonconsecutive split points?', answer: 'Yes. Enter page numbers separated by commas, such as 2, 5. Each listed page ends a part.' },
  },
  {
    id: 'extract', slug: 'extract-pdf-pages', title: 'Extract pages', category: 'Organize',
    description: 'Keep selected pages in a new PDF and leave your source unchanged.',
    pageTitle: 'Extract pages from a PDF | Folioyard',
    metaDescription: 'Select pages or ranges and save them as a separate PDF. Your original file stays unchanged on your device.',
    intro: 'Make a new PDF from only the pages you need. Enter page numbers or ranges, then check the extracted document before downloading.',
    steps: ['Choose a PDF.', 'Enter page numbers or ranges, for example 1, 3-5.', 'Extract the pages and download the new PDF.'],
    limits: 'The source file stays in the workspace. Form fields are flattened; document details, bookmarks, and attachments are not carried over. Existing digital signatures will no longer be valid.',
    faq: { question: 'Can I extract a range of pages?', answer: 'Yes. Use a range such as 3-7, or combine ranges and single pages with commas.' },
  },
  {
    id: 'reorder', slug: 'reorder-pdf-pages', title: 'Reorder pages', category: 'Organize',
    description: 'Set a new order for every page in the selected PDF.',
    pageTitle: 'Reorder PDF pages | Folioyard',
    metaDescription: 'Reorder every PDF page with a clear page-number list, inspect the output, and save a new file in your browser.',
    intro: 'Specify the complete page order as a numbered list. The source remains available while Folioyard creates and previews a reordered copy.',
    steps: ['Choose a PDF and check its page count.', 'List every page number once in the order you want.', 'Save the new order and inspect the output.'],
    limits: 'Every page must appear exactly once. Form fields are flattened; document details, bookmarks, and attachments are not carried over. Existing digital signatures will no longer be valid.',
    faq: { question: 'Do I need to include every page?', answer: 'Yes. Reordering changes the sequence only; use Extract pages if you also want to leave pages out.' },
  },
  {
    id: 'rotate', slug: 'rotate-pdf-pages', title: 'Rotate pages', category: 'Organize',
    description: 'Turn selected pages clockwise and keep the rest as they are.',
    pageTitle: 'Rotate PDF pages | Folioyard',
    metaDescription: 'Rotate selected PDF pages and preview the saved copy. Files are processed locally in your browser.',
    intro: 'Correct page orientation without changing the other pages. Choose pages, set a clockwise rotation, and review the resulting PDF.',
    steps: ['Choose a PDF.', 'Select pages and choose a clockwise rotation.', 'Apply the change and download the reviewed copy.'],
    limits: 'Page rotations are written to a new PDF. Form fields are flattened; document details, bookmarks, and attachments are not carried over. Existing digital signatures will no longer be valid.',
    faq: { question: 'Can I rotate only some pages?', answer: 'Yes. Enter the page numbers or ranges to rotate; unselected pages keep their current orientation.' },
  },
  {
    id: 'delete', slug: 'delete-pdf-pages', title: 'Delete pages', category: 'Organize',
    description: 'Remove selected pages from a copy of your PDF.',
    pageTitle: 'Delete pages from a PDF | Folioyard',
    metaDescription: 'Remove selected pages from a PDF and review the new document before downloading it from your device.',
    intro: 'Remove unwanted pages while keeping the original source in the workspace. Folioyard blocks deleting every page so the output cannot be empty.',
    steps: ['Choose a PDF.', 'Enter the page numbers or ranges to remove.', 'Review and download the remaining pages.'],
    limits: 'At least one page must remain. Form fields are flattened; document details, bookmarks, and attachments are not carried over. Existing digital signatures will no longer be valid.',
    faq: { question: 'Can I undo a deletion?', answer: 'The source remains unchanged. Run the operation again with a corrected page list if needed.' },
  },
  {
    id: 'images-to-pdf', slug: 'images-to-pdf', title: 'Images to PDF', category: 'Convert',
    description: 'Place PNG and JPEG images into a clean, ordered PDF.',
    pageTitle: 'Convert PNG and JPEG images to PDF | Folioyard',
    metaDescription: 'Arrange PNG or JPEG images, preview their order, and create a PDF locally in your browser.',
    intro: 'Turn PNG and JPEG files into a PDF. Arrange images, check the preview, and save one page per image.',
    steps: ['Choose PNG or JPEG images.', 'Move them into the desired page order.', 'Create the PDF and download it.'],
    limits: 'Each image becomes one Letter-size page with a small margin. Original image metadata is not carried over. Other image formats are not supported.',
    faq: { question: 'Which image formats are supported?', answer: 'This tool accepts PNG and JPEG images. Each chosen image becomes a separate PDF page.' },
  },
  {
    id: 'pdf-to-images', slug: 'pdf-to-png', title: 'PDF to images', category: 'Convert',
    description: 'Render selected PDF pages as downloadable PNG images.',
    pageTitle: 'Convert PDF pages to PNG images | Folioyard',
    metaDescription: 'Render PDF pages as PNG images in your browser and download them individually.',
    intro: 'Render selected pages as PNG images for sharing or viewing. The PDF remains available as the original source.',
    steps: ['Choose a PDF.', 'Enter the page numbers or ranges to render.', 'Render and download the PNG files.'],
    limits: 'Rendered pages are raster images; text, links, and vector content are no longer selectable. Very large page selections may use substantial memory and take longer.',
    faq: { question: 'Will text remain selectable in a PNG?', answer: 'No. PNG is a raster image format, so text and vector content become pixels.' },
  },
  {
    id: 'watermark', slug: 'add-watermark-to-pdf', title: 'Watermark', category: 'Annotate',
    description: 'Add a light, diagonal text watermark to selected pages.',
    pageTitle: 'Add a text watermark to a PDF | Folioyard',
    metaDescription: 'Add a diagonal text watermark to selected PDF pages, preview it, and save a new copy locally.',
    intro: 'Place a light diagonal text watermark on the pages you choose, then inspect the output before saving it.',
    steps: ['Choose a PDF and enter watermark text.', 'Select pages to mark.', 'Add the watermark and download the new PDF.'],
    limits: 'Watermarks become part of page content and are not separately editable PDF annotations. Rewriting the document invalidates existing digital signatures.',
    faq: { question: 'Can I remove the watermark later?', answer: 'The watermark is written into page content, so keep the original if you may need an unmarked copy.' },
  },
  {
    id: 'page-numbers', slug: 'add-page-numbers-to-pdf', title: 'Page numbers', category: 'Annotate',
    description: 'Add a centered page number to every page.',
    pageTitle: 'Add page numbers to a PDF | Folioyard',
    metaDescription: 'Add centered page numbers to every page in a PDF and save the numbered copy on your device.',
    intro: 'Add centered page numbers across the document and review the output before downloading it.',
    steps: ['Choose a PDF.', 'Preview the numbering operation.', 'Add page numbers and download the new PDF.'],
    limits: 'Numbers become part of page content rather than editable page labels. Rewriting the document invalidates existing digital signatures.',
    faq: { question: 'Can I number only selected pages?', answer: 'This tool numbers every page in the document. Use the source copy if you need a different numbering scheme.' },
  },
  {
    id: 'annotate', slug: 'add-note-to-pdf', title: 'Add a note', category: 'Annotate',
    description: 'Add a short, visible note to selected pages.',
    pageTitle: 'Add a visible note to a PDF | Folioyard',
    metaDescription: 'Place a short visible note on selected PDF pages and preview the new copy in your browser.',
    intro: 'Add a short text note to selected pages. The note appears in the page itself, so it is visible in common PDF viewers.',
    steps: ['Choose a PDF and enter a short note.', 'Select the pages that should show it.', 'Add the note, inspect the PDF, and download it.'],
    limits: 'The note is page content, not a separately editable comment annotation. Rewriting the document invalidates existing digital signatures.',
    faq: { question: 'Is this a PDF comment annotation?', answer: 'No. The note is written visibly into page content so it displays consistently, but it is not a separate comment object.' },
  },
  {
    id: 'signature', slug: 'add-visual-signature-to-pdf', title: 'Visual signature', category: 'Annotate',
    description: 'Place a drawn or typed visual signature on selected pages.',
    pageTitle: 'Add a visual signature to a PDF | Folioyard',
    metaDescription: 'Draw or type a visual signature, place it on selected PDF pages, and save the result locally.',
    intro: 'Draw a signature or enter a name, place the visible mark on selected pages, and review the document before downloading.',
    steps: ['Choose a PDF.', 'Draw or type the signature and select pages.', 'Place it on the page and download the result.'],
    limits: 'This creates a visual mark only. It is not a certificate-backed digital signature, identity check, or e-signature request. Rewriting invalidates any existing digital signature.',
    faq: { question: 'Is this a digital signature?', answer: 'No. Folioyard places a visual mark in the PDF. It does not verify identity or create a certificate-backed signature.' },
  },
  {
    id: 'compress', slug: 'compress-pdf', title: 'Compress PDF', category: 'Protect & optimize',
    description: 'Reduce file size losslessly. A download is offered only when the PDF becomes smaller.',
    pageTitle: 'Compress a PDF without resizing images | Folioyard',
    metaDescription: 'Optimize PDF structure without resizing or re-encoding images. Files up to 50 MB are processed in your browser.',
    intro: 'Recompress supported PDF streams and optimize document resources without reducing image resolution. Folioyard offers a download only if the result is smaller.',
    steps: ['Choose a PDF up to 50 MB.', 'Start compression and wait for output validation.', 'Download the result when it is smaller than the source.'],
    limits: 'Images are not resampled, so image-heavy PDFs may not shrink. Inputs are limited to 50 MB and decoded streams to 100 MB; large files need additional browser memory.',
    faq: { question: 'Will compression always make the file smaller?', answer: 'No. Already optimized files and image-heavy PDFs may not shrink. Folioyard withholds a download when the result is not smaller.' },
  },
  {
    id: 'protect', slug: 'protect-pdf', title: 'Protect PDF', category: 'Protect & optimize',
    description: 'Encrypt a PDF with an AES-256 open password that stays on this device.',
    pageTitle: 'Password-protect a PDF with AES-256 | Folioyard',
    metaDescription: 'Encrypt a PDF with an AES-256 open password in your browser. Inputs are limited to 50 MB.',
    intro: 'Create an AES-256 encrypted copy that asks for a password when opened. The operation runs locally and clears password fields after use.',
    steps: ['Choose a PDF up to 50 MB.', 'Enter and confirm an open password.', 'Encrypt the PDF and download the protected copy.'],
    limits: 'Passwords must contain 8–127 UTF-8 bytes. A separate random owner password is discarded; Folioyard cannot recover a forgotten open password. Decoded streams are limited to 100 MB.',
    faq: { question: 'Can Folioyard recover a forgotten password?', answer: 'No. Folioyard does not store the open password. Keep it in a safe place before encrypting your PDF.' },
  },
  {
    id: 'unlock', slug: 'unlock-pdf', title: 'Unlock PDF', category: 'Protect & optimize',
    description: 'Create an unprotected copy of a PDF using its open password.',
    pageTitle: 'Unlock a password-protected PDF | Folioyard',
    metaDescription: 'Use a PDF open password to create an unprotected copy locally in your browser. Inputs are limited to 50 MB.',
    intro: 'If you know the PDF open password, use it to create a new unprotected copy. Folioyard keeps the password in this tab and clears it after processing.',
    steps: ['Choose a supported encrypted PDF up to 50 MB.', 'Enter the document open password.', 'Unlock, validate, and download the new copy.'],
    limits: 'Only encrypted PDFs supported by the bundled pdfcpu engine can be opened. Inputs are limited to 50 MB and decoded streams to 100 MB. Do not use this tool to bypass access controls.',
    faq: { question: 'Can I unlock a PDF without its password?', answer: 'No. You need the correct open password. Folioyard does not bypass PDF access controls.' },
  },
];

export const toolGroups: ToolCategory[] = ['Organize', 'Convert', 'Annotate', 'Protect & optimize'];

export function toolPath(tool: Tool | ToolInfo) {
  const info = typeof tool === 'string' ? toolById(tool) : tool;
  return `/${info.slug}/`;
}

export function toolById(id: Tool) {
  const info = tools.find((tool) => tool.id === id);
  if (!info) throw new Error(`Unknown PDF tool: ${id}`);
  return info;
}

export function toolByPath(path: string) {
  const cleanPath = path.replace(/\/+$/, '') || '/';
  return tools.find((tool) => `/${tool.slug}` === cleanPath);
}
