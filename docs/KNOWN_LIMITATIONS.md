# Known limitations

## Implemented scope

The available tools are Merge PDFs, Split PDFs, Extract pages, Reorder pages, Rotate pages, Delete pages, Images to PDF, PDF to images, Watermark, Page numbers, Add a note, and Visual signature. Meaningful compression, password encryption/decryption, and advanced editing are not implemented.

## PDF fidelity and security

- Encrypted or password-protected PDFs are rejected; Folioyard does not offer password unlock or encryption.
- Page-copy operations flatten interactive form fields. Document-level metadata, outlines/bookmarks, and embedded attachments are not preserved. Ordinary page annotations are covered by the current fixture; unusual annotations and PDF features have not been exhaustively tested.
- Rewriting a signed PDF invalidates its original certificate-backed signature. The Visual signature tool places a drawn or typed visual mark; it is not a digital signature and carries no identity verification.
- Add a note places a short visible text box in page content; it is not a separately editable PDF comment annotation. Watermarks and page numbers also become page content.
- PDF-to-PNG rendering turns each selected page into a raster image. It loses selectable text, links, and vector content. PNG rendering currently runs sequentially on the main thread, so very large page selections may make the tab less responsive.
- Images to PDF supports PNG and JPEG only and places each image, without adding the original image metadata, on a new Letter-size page.
- Compression is not included: the current editing library cannot guarantee a useful size reduction while retaining source quality. QPDF documents lossless stream/object compression but does not resample images; a browser WASM distribution and integration still need supply-chain and fidelity verification before use. [QPDF optimization behavior](https://qpdf.readthedocs.io/en/latest/cli.html#optimizing-file-size)
- Password encryption and decryption are not included. No browser QPDF WASM build has been independently validated for this security-sensitive workflow. Secure PDF encryption should use AES-256; weak modes must remain unavailable. [QPDF encryption guidance](https://qpdf.readthedocs.io/en/latest/cli.html#encryption)
- PDF complexity and available browser memory limit practical inputs. Folioyard does not impose an arbitrary size quota, and large-file stress limits have not been established.

## Runtime and verification

- Documents and outputs exist in tab memory only; refreshing or closing the tab clears them.
- The current browser checks ran in Chromium through the Codex in-app browser. Cross-browser, full screen-reader, physical-device, and complete WCAG 2.2 AA testing remain outstanding.
- GitHub CI has been authored locally but is not yet verified on a pull request. No deployment has been prepared or published.
