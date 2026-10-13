# Folioyard

Folioyard is a local-first PDF workspace. Its toolkit merges PDFs, splits and edits pages, converts PNG/JPEG images to PDF, renders selected PDF pages as PNGs, adds text watermarks and page numbers, places a visible text note, and adds a drawn or typed visual signature. Processing runs in this browser tab; the app has no account, upload endpoint, or document storage.

## Run locally

Requires Node.js supported by Vite 8 and npm.

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## PDF compatibility

Encrypted and password-protected PDFs are unsupported. Folioyard does not provide password encryption or decryption. Page-copy operations flatten form fields. They retain ordinary page annotations where `pdf-lib` can copy them, but do not preserve document-level metadata, bookmarks, or attachments. Rewriting a signed PDF invalidates its original digital signature. The signature tool adds a visual mark only; it does not create a certificate-backed signature. PDF-to-PNG output is rasterized and no longer has selectable text or vector content. Review the compatibility note in the app before exporting.

Input and output files stay in tab memory and are cleared when the page is refreshed or closed. Large or complex PDFs can use substantial device memory; no arbitrary file-size quota is imposed.

## Architecture and evidence

- React and Vite provide the workbench.
- PDF.js parses and previews PDFs; its worker is bundled separately.
- `pdf-lib` handles page copying, image-to-PDF conversion, and page overlays in dedicated merge and page-operation Web Workers.
- PDF-to-PNG renders selected pages sequentially using PDF.js and the browser canvas; PNGs stay in memory until download or session cleanup.
- [Architecture](docs/ARCHITECTURE.md), [project status](docs/PROJECT_STATUS.md), [QA evidence](docs/QA_EVIDENCE.md), and [known limitations](docs/KNOWN_LIMITATIONS.md) describe the current boundary and verification.
- Browser-distributed dependency notices are in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt); the lockfile is the version source.

The original research and Merge MVP specification remain under `research/` and `architecture/`. The supplied brand preview assets are references; implemented colors are in `src/styles/tokens.css`.
