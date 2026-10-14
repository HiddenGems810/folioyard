# PDF fixtures

- `demo-first.pdf` and `demo-second-rotated.pdf` are synthetic, text-only merge samples with multiple pages and mixed orientation/rotation. They contain no personal or customer data.
- `compressible-uncompressed-stream.pdf` is a synthetic one-page PDF with a 240 KB uncompressed text stream. It exercises the lossless compression reduction path in Go and browser checks; it contains no personal or customer data.
- `invalid.pdf` is malformed input; `encrypted.pdf` is password-protected input generated with pypdf 6.10.0. Tests verify rejection without decrypting it.
- `feature-rich.pdf` is a synthetic two-page fixture with portrait and landscape pages, text, an ordinary text annotation, a filled form field, title/author metadata, an outline, and an embedded text file. It was generated with the installed `pdf-lib` version.
- `signed-feature-rich.pdf` is the feature-rich fixture signed with a short-lived, self-signed test certificate using pyHanko 0.37.0. Its signature was verified as intact and valid while trusting that test certificate. It contains no real identity or user data. The repository keeps the signed fixture, not its signing key.
- `pixel.png` and `pixel.jpg` are small synthetic raster images used for PNG/JPEG-to-PDF conversion tests.

Merge tests cover page order, dimensions/rotation, progress, malformed/encrypted rejection, annotation retention, form flattening, signature-field removal, and loss of catalog metadata, outlines, and attachments. Page-operation tests cover parsing, split/extract/reorder/rotate/delete behavior, PNG/JPEG-to-PDF conversion, page overlays, visual signatures, and failure boundaries.
