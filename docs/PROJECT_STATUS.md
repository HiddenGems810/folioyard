# Folioyard project status

**Updated:** 2026-10-13
**Readiness:** Review-ready locally for all fifteen tools; the latest CI state is on [PR #1](https://github.com/HiddenGems810/folioyard/pull/1).

## Phase status

- **Phase 0 — Integrity:** Complete. Work remains on `codex/folioyard-recovery`; the existing `origin/main` history was preserved.
- **Phase 1 — REA:** The native REA JavaScript application analyzer inspected the production build and recovered its asset/module inventory. Semantic graph coverage was partial because several large bundles exceeded analyzer heap/result limits; browser behavior was verified separately.
- **Phase 2 — Audit:** Complete for the covered PDF structures. Synthetic malformed, encrypted, annotated, filled-form, metadata, outline, attachment, signed, and uncompressed-stream fixtures cover known fidelity and failure boundaries.
- **Phase 3 — Workbench:** Complete for fifteen tools. The document-first shell, file queue, previews, thumbnails, settings, status/errors, and responsive navigation are implemented. Chromium width checks show no horizontal page overflow from 320 to 1728 CSS pixels.
- **Phase 4 — Toolkit:** Complete for Merge, Split, Extract, Reorder, Rotate, Delete, Images to PDF, PDF to images, Watermark, Page numbers, Add a note, Visual signature, Compress, Protect, and Unlock. Compression and AES-256 password operations run in a lazy-loaded, same-origin pdfcpu WebAssembly worker.
- **Phase 5 — Engineering:** Local lint, typecheck, TypeScript tests, Go tests, module verification, vulnerability scan, WASM build, and production build pass with pdfcpu v0.16.2. Dependency notices include the shipped pdfcpu graph and Go WebAssembly runtime. Cross-browser, assistive-technology, physical-device, and large-file stress checks remain outstanding.
- **Phase 6 — GitHub:** [PR #1](https://github.com/HiddenGems810/folioyard/pull/1) is the review target for `codex/folioyard-recovery`. GitHub Actions validates the Go tests and WASM build together with the npm checks and production build; deployment and public release remain out of scope.

## Current checks

- `npm run lint`, `npm run typecheck`, and `npm test` passed (16/16 TypeScript tests).
- `go test -count=1 ./...` and `go mod verify` passed for the pinned pdfcpu operation package and module graph.
- `npm run build:pdfcpu` and `npm run build` passed. The pdfcpu v0.16.2 WASM is 20,805,255 bytes and the Go runtime is 16,992 bytes; both are loaded lazily from the same origin.
- `govulncheck` found no vulnerabilities in called symbols or packages; it reported GO-2026-5932 for `golang.org/x/crypto/openpgp` as a module-only issue with no call path from Folioyard.
- Chromium browser checks on the rebuilt runtime exercised lossless compression, the no-reduction path, AESV3 output, password mismatch, wrong-password rejection, successful unlock, and text/page validation. The updated seven-width layout check showed no horizontal overflow.
- The source and generated outputs remain local; the browser request ledger showed same-origin static assets only during file operations.

Deployment and public release are not part of this work.

See [architecture](ARCHITECTURE.md), [QA evidence](QA_EVIDENCE.md), and [known limitations](KNOWN_LIMITATIONS.md).
