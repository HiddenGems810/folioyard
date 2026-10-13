# Folioyard

Folioyard is an independently engineered, local-first PDF workspace. The current milestone is a focused Merge PDF workbench: import PDFs, inspect and reorder the source queue, merge in a worker, preview the result, and download it.

## Run locally

Requires Node.js compatible with the versions pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

## Checks

```sh
npm test
npm run typecheck
npm run build
```

## Architecture

- React and Vite provide the workbench.
- PDF.js handles document parsing and page previews.
- `pdf-lib` performs page copying and serialization in a dedicated merge worker.
- Source documents are held in browser memory. Encrypted PDFs are reported as unsupported; broader PDF feature fidelity is documented in `architecture/FOLIOYARD_MERGE_MVP_SPEC.md`.

See `research/COMPETITOR_COMPARISON_MATRIX.md` for the evidence-backed product study and `research/REA_READINESS_AND_COMPETITOR_RECON.md` for REA capture scope and limitations. Research screenshots and implementation screenshots are retained; raw REA capture payloads are intentionally excluded from version control.

The files `folioyard-brand-preview.html`, `folioyard-dark-workspace.png`, and `folioyard-mobile-preview.png` are early visual references. They are not the implementation specification; the approved token source is `src/styles/tokens.css`.
