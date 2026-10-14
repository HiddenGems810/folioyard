# Folioyard QA evidence

**Updated:** 2026-10-13

## Repository checks

- Baseline before implementation: `npm run typecheck` passed, `npm test` passed (6/6), and `npm run build` passed.
- Current toolkit: `npm run lint`, `npm run typecheck`, and `npm test` passed (16/16); `go test ./...` and `go mod verify` passed for pdfcpu v0.16.2 operations; `npm run build:pdfcpu` and `npm run build` passed with Go 1.27.2 and Vite 8.3.4.
- `npm audit` and `npm audit --omit=dev` reported no known vulnerabilities at the time of the check.
- `govulncheck` found no vulnerabilities in called symbols or imported packages. It reported GO-2026-5932 for the `golang.org/x/crypto/openpgp` module; the analyzer found no call path from Folioyard to that package.
- A physical-package license inventory is in `docs/DEPENDENCY_LICENSES.md`; production notices are in `public/THIRD_PARTY_NOTICES.txt`.
- The GitHub Actions workflow runs Go tests and WASM build, lint, typecheck, TypeScript tests, and production build. Earlier PR verification applied to the pre-v0.16.2 revision.
- CI now installs Playwright Chromium, Firefox, and WebKit and runs `npm run test:e2e` after the production build.
- The built main application bundle is 258.10 kB (79.41 kB gzip). The pdfcpu v0.16.2 WASM is 20,805,255 bytes and Go runtime is 16,992 bytes; both are separate lazy-loaded same-origin assets. No browser performance benchmark or large-file stress test was run.

## REA MCP

- Codex CLI 0.139.0 lists REA as enabled. The active registry exposes 170 native REA tools; a direct `binary_session` call returned REA 6.4.0 identity and capability evidence.
- REA's configured command uses the Codex-managed Node 24.19 runtime. The system `npx` uses Node 24.5, below REA's current minimum; its setup dry-run reported stale state. The scoped dry-run using Codex's configured runtime found the registration aligned and planned/applied no changes.
- Optional Ghidra and IDA engines are unavailable. They were not needed for target-free native-tool verification.

## PDF unit and structure evidence

- `tests/fixtures/feature-rich.pdf` contains two pages with mixed orientations, text, an ordinary annotation, a filled form field, title/author metadata, an outline, and an embedded text file.
- `tests/fixtures/signed-feature-rich.pdf` contains a cryptographically intact signature validated with its isolated test certificate. Merge tests confirm the signature field is removed from rewritten output.
- `tests/merge.test.ts` verifies page order, page count, page dimensions/rotation, real progress order, malformed/encrypted rejection, ordinary annotation retention, form flattening, and loss of metadata, outlines, and attachments.
- `tests/page-operations.test.ts` covers page-list validation, extraction/reordering, splitting, deletion safeguards, rotation, PNG-to-PDF conversion, page overlays, visual signatures, and malformed/encrypted error handling.
- `tools/pdfcpu-wasm/operations_test.go` verifies actual size reduction on a synthetic uncompressed stream, preservation of a feature-rich two-page input, AESV3 output, absence of canary plaintext in encrypted object streams, circular stream-filter rejection, wrong-password rejection, correct encrypt/decrypt round-trip, malformed input rejection, and UTF-8 password byte limits.

## Browser verification completed

- Loaded synthetic multipage and feature-rich PDFs in the running local app; PDF.js rendered real page text and the source list created a first-page thumbnail.
- Merge produced a validated four-page output, showed the output preview and download control, and reported that forms and document-level data are not fully preserved.
- Split created two named one-page outputs. Extraction produced one selected page. Reorder `2, 1` was checked by text: output page one contained the original second page.
- Rotate produced a two-page output. Deleting one page retained the other page. Attempting to delete every page showed a clear error and preserved the source.
- After the first reorder attempt exposed a state-reset race, the callback was stabilized; the corrected output order was verified in the browser.
- Downloaded merged bytes were reopened with pdf-lib and confirmed to contain four pages. Split outputs and extracted, reordered, rotated, and deleted outputs were also checked for expected page counts or order.
- Invalid and encrypted PDFs showed distinct recovery messages while keeping the input list intact. Long source filenames clipped within the narrow layout and retained the full name in their title.
- Keyboard activation of the Move Up control and Undo were checked. This is a focused keyboard check, not a complete assistive-technology audit.
- The saved 390×844 and 1440×960 screenshots show the earlier empty-state shell and predate the twelve-tool expansion; they are retained as shell references, not current full-interface proof.
- A clean reload rendered the current application without new React errors. Historical dev-console entries from the earlier hot reload remain in the console history.
- The expanded fifteen-tool interface passed the seven-width no-horizontal-overflow check at CSS widths 320, 390, 430, 768, 1200, 1440, and 1728 pixels.
- Images to PDF converted a local PNG fixture. The downloaded PDF reopened as a one-page Letter document with one embedded image object.
- The JPEG branch also converted in the browser; its downloaded PDF reopened as one landscape Letter page with one embedded image object. The unit test covers mixed PNG/JPEG input ordering and page orientation.
- PDF to images rendered page 1 of the synthetic two-page source. The downloaded PNG had a valid PNG signature and measured 918×1188 pixels (31,747 bytes).
- Watermark output preview text included `CONFIDENTIAL`; page-number output included `1 / 2`. The selected-page note was visibly rendered on page 2. A drawn signature appeared in the output preview and remained explicitly labeled as visual only.
- Browser checks on the local production preview protected `feature-rich.pdf`, showed an error before processing when the confirmation differed, and produced an AESV3-encrypted download. Password fields were cleared afterward and the encrypted output was not previewed as plaintext.
- The generated protected PDF was re-opened as an input. A wrong password showed the generic unlock error without removing the source; the correct password produced an unprotected two-page output whose original page text rendered.
- Compression reduced the 240,551-byte synthetic uncompressed-stream PDF to 1.6 KB (99% reported reduction); PDF.js rendered its repeated text from the output. The small feature-rich fixture exercised the no-reduction path and produced no download.
- Chromium's network ledger during upload, protect, unlock, and compression contained same-origin GET requests only, including the lazy-loaded `pdfcpu-wasm-exec.js` and `pdfcpu.wasm`; no document or password POST was observed.
- The native REA analyzer statically inspected `dist/` and enumerated the PDFCPU worker/runtime modules. Its semantic graph was partial because several large bundles exceeded analyzer heap/result budgets; no runtime conclusions were inferred from that scan.
- Current Codex REA integration is enabled: the managed Node 24.19.0 doctor reports the Codex registration healthy, scoped setup dry-run plans no changes, and a native `binary_session` call returned REA 6.4.0 identity with 170 tools and six prompts. The system `npx` uses Node 24.5.0, below REA's supported minimum; its doctor result is not representative of the configured Codex runtime.
- Edge 122.0.2365.106 previously failed to open a PDF because `Promise.try` was unavailable. `PdfPreview` now detects that browser capability and shows an update-browser message while preserving the source. This old Edge build is not current-browser compatibility evidence; the PDF.js modern build targets current browsers.
- After rebuilding with pdfcpu v0.16.2, Chromium rechecked the changed password and compression flows: mismatched confirmation left the source intact; AESV3 protection output contained no raw copy of the fixture's page-text canary and both password fields were cleared; a wrong unlock password preserved both source files; the correct password produced a validated two-page unprotected PDF whose original page text rendered and whose download reopened with pdf-lib without an `/Encrypt` marker.
- The rebuilt compression flow reduced the 240,551-byte synthetic fixture to 1,591 bytes (99%); the downloaded result reopened with pdf-lib as a one-page PDF. The feature-rich fixture exercised the no-reduction path and showed no download button.
- The seven viewport widths (320, 390, 430, 768, 1200, 1440, and 1728 CSS pixels) were rechecked after the rebuild; `documentElement.scrollWidth` equaled `clientWidth` at each width.
- The network ledger for the rebuilt file operations contained same-origin GETs only, including the pdfcpu worker, `pdfcpu-wasm-exec.js`, and `pdfcpu.wasm`; no PDF or password POST was observed. The console had no errors or warnings during these checks.

## Remaining verification

- The committed Playwright suite passed four Chromium workflows (merge, signature validation and export, unsupported-browser messaging, and PDF preview) and two WebKit checks (unsupported-browser messaging and PDF preview). Firefox could not launch in this Windows environment (`spawn UNKNOWN`); CI installs and runs Firefox on Linux. Current Microsoft Edge was not tested.
- The blank-signature regression confirms an empty pointer tap remains empty and is rejected; a real mouse stroke is accepted and produces a downloadable PDF.
- Full keyboard/focus review, screen-reader pass, and WCAG conformance audit have not been completed.
- Full browser/production-hosting network behavior was not tested; the local request ledger confirms no off-origin request in the exercised flows.
- This checkout does not have Go on PATH, so Go tests and the WASM rebuild were not rerun locally in this turn. GitHub Actions for the exact PR #1 head passed and runs both with Go 1.27.2.
- No large-file stress test, browser performance benchmark, or production deployment validation was run.
