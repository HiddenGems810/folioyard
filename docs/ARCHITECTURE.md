# Folioyard architecture

## Runtime

- Vite serves one React 19 and TypeScript workbench. `src/App.tsx` owns the PDF source queue, preview selection, tool settings, operation status, errors, and output URLs.
- `src/PdfPreview.tsx` uses PDF.js to parse and paint one page at a time. `src/pdfjs.ts` points PDF.js at its separately bundled worker. Preview state is keyed by `File` and page number so switching tools does not reopen the active PDF.
- `src/merge.ts` loads sources sequentially, flattens form fields, copies pages, and returns the merged bytes. `src/merge.worker.ts` runs the operation away from the UI thread with the typed merge protocol.
- `src/page-operations.ts` implements split, extract, reorder, rotate, delete, watermark, page-number, visible-note, visual-signature, and image-to-PDF operations. `src/page-operation.worker.ts` handles them using a separate worker and typed messages.
- `src/pdfcpu.worker.ts` owns the lazy-loaded pdfcpu WebAssembly runtime for lossless compression and AES-256 encrypt/decrypt. Its Go source and locked module graph live in `tools/pdfcpu-wasm/`; `npm run build:pdfcpu` recreates the same-origin assets in `public/` with Go 1.27.2.
- PDF-to-PNG uses PDF.js to render selected pages sequentially into one reusable browser canvas. Encoding and output URLs stay local to the tab; rendering itself runs on the main thread.
- `src/page-list.ts` parses and bounds page lists. `src/pdf-structure.ts` removes broken widget references left by `pdf-lib` after form flattening.
- PDF.js reopens each completed output before Folioyard creates download URLs. The source queue stays available after failures; new operations and source changes revoke prior output URLs.

## Data boundary

Source and output bytes remain in browser memory. The app has no account, server upload route, telemetry, document persistence, or external processing API. Refreshing or closing the tab clears the working session. The PDFCPU worker fetches its WASM and runtime from the same origin; it does not send PDFs or passwords. Worker isolation improves responsiveness but does not reduce the memory required to parse PDFs and hold outputs.

## PDF fidelity

Copied pages retain page order, dimensions, rotation, and ordinary page annotations covered by the fixtures. Form fields are flattened to visible page content. Document-level metadata, outlines/bookmarks, and embedded attachments are not carried over. Digital signatures cannot remain valid after the underlying PDF is rewritten. The password tools accept AES-256 encrypted PDFs for unlock; other preview and page-copy operations still reject encrypted input. Compression recompresses non-image streams losslessly and runs pdfcpu resource optimization; images are not resampled and no output is offered unless it is smaller. Watermarks, page numbers, notes, and visual signatures become page content, not independently editable PDF annotations. A visual signature is not certificate-backed.

## Scope

The implemented tool set is Merge, Split, Extract pages, Reorder pages, Rotate pages, Delete pages, Images to PDF, PDF to images, Watermark, Page numbers, Add a note, Visual signature, Compress PDF, Protect PDF, and Unlock PDF. The three pdfcpu tools have a 50 MB input cap and a 100 MB decoded-stream cap. Advanced editing is outside the current scope.

The Merge MVP contract and its original research remain in [the architecture and research folders](../architecture/FOLIOYARD_MERGE_MVP_SPEC.md).
