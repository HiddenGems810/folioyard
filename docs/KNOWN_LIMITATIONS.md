# Known limitations

## Implemented scope

The available tools are Merge PDFs, Split PDFs, Extract pages, Reorder pages, Rotate pages, Delete pages, Images to PDF, PDF to images, Watermark, Page numbers, Add a note, Visual signature, Compress PDF, Protect PDF, and Unlock PDF. Advanced editing is not implemented.

## PDF fidelity and security

- Protect creates AES-256 encrypted PDFs and accepts user passwords from 8 to 127 UTF-8 bytes. Unlock accepts encrypted PDFs supported by pdfcpu. Folioyard creates a separate random owner password and discards it; it cannot recover a forgotten open password. Compression and the other PDF.js/pdf-lib tools reject encrypted PDFs.
- Page-copy operations flatten interactive form fields. Document-level metadata, outlines/bookmarks, and embedded attachments are not preserved. Ordinary page annotations are covered by the current fixture; unusual annotations and PDF features have not been exhaustively tested.
- Rewriting a signed PDF invalidates its original certificate-backed signature. The Visual signature tool places a drawn or typed visual mark; it is not a digital signature and carries no identity verification.
- Add a note places a short visible text box in page content; it is not a separately editable PDF comment annotation. Watermarks and page numbers also become page content.
- PDF-to-PNG rendering turns each selected page into a raster image. It loses selectable text, links, and vector content. PNG rendering currently runs sequentially on the main thread, so very large page selections may make the tab less responsive.
- Images to PDF supports PNG and JPEG only and places each image, without adding the original image metadata, on a new Letter-size page.
- Compression uses pdfcpu v0.16.2 in a WebAssembly worker. It losslessly recompresses non-image streams and optimizes resources; images are not resampled. Because size can increase for already-optimized PDFs, Folioyard offers a download only when the result is smaller. Synthetic tests cover reduction, object-stream encryption privacy, circular filter rejection, and a feature-rich PDF; broad corpus compatibility and large-file stress are not established. The pinned release includes upstream fixes for encrypted object-stream plaintext leakage and recursive stream-filter stack exhaustion ([GHSA-ppm7-rg95-2c2p](https://github.com/pdfcpu/pdfcpu/security/advisories/GHSA-ppm7-rg95-2c2p), [GHSA-gj7c-wpph-xx35](https://github.com/pdfcpu/pdfcpu/security/advisories/GHSA-gj7c-wpph-xx35)). [pdfcpu optimization behavior](https://pdfcpu.io/core/optimize/)
- The pdfcpu worker accepts inputs up to 50 MB and caps decoded streams at 100 MB. Processing requires additional memory for source bytes, decoded streams, and output, so practical limits vary by browser and device. The 50 MB cap should be revisited after physical mobile-device profiling.
- PDFCPU is a pinned third-party parser compiled to WebAssembly. Parsing hostile or unusually complex PDFs still carries CPU and memory exhaustion risk within the browser tab; input and decoded-stream limits bound but do not eliminate that risk.

## Runtime and verification

- Documents and outputs exist in tab memory only; refreshing or closing the tab clears them.
- A generated PDF can continue into a compatible single-document PDF tool in the same tab. Merge and image conversion outputs are not offered as handoff targets because the current source queue cannot distinguish carried output from original inputs.
- PDF.js uses its modern build and expects a current browser. If `Promise.try` is unavailable, Folioyard now shows an update-browser message and leaves the source available. Edge 122.0.2365.106 was observed before that guard was added; it is not a supported-browser test. Use a current stable browser. See [PDF.js browser support](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-support).
- Cross-engine, full screen-reader, physical-device, and complete WCAG 2.2 AA testing remain outstanding. Chromium checks do not establish those results.
- Cross-browser, physical-device, large-file, and production-hosting behavior have not been verified. No deployment has been prepared or published.
