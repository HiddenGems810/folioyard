# Folioyard QA evidence

**Updated:** 2026-10-13

## Repository checks

- Baseline before implementation: `npm run typecheck` passed, `npm test` passed (6/6), and `npm run build` passed.
- Current foundation and everyday tools: `npm run lint` passed; `npm run typecheck` passed; `npm test` passed (16/16); `npm run build` passed with Vite 8.3.4.
- `npm audit` and `npm audit --omit=dev` reported no known vulnerabilities at the time of the check.
- A physical-package license inventory is in `docs/DEPENDENCY_LICENSES.md`; production notices are in `public/THIRD_PARTY_NOTICES.txt`.
- The GitHub Actions workflow runs lint, typecheck, tests, and build. The verify job passed on PR #1.
- The built main application bundle is 251.48 kB (77.90 kB gzip); PDF.js and its workers remain separate assets. No browser performance benchmark or large-file stress test was run.

## REA MCP

- Codex CLI 0.139.0 lists REA as enabled. The active registry exposes 170 native REA tools; a direct `binary_session` call returned REA 6.4.0 identity and capability evidence.
- REA's configured command uses the Codex-managed Node 24.19 runtime. The system `npx` uses Node 24.5, below REA's current minimum; its setup dry-run reported stale state. The scoped dry-run using Codex's configured runtime found the registration aligned and planned/applied no changes.
- Optional Ghidra and IDA engines are unavailable. They were not needed for target-free native-tool verification.

## PDF unit and structure evidence

- `tests/fixtures/feature-rich.pdf` contains two pages with mixed orientations, text, an ordinary annotation, a filled form field, title/author metadata, an outline, and an embedded text file.
- `tests/fixtures/signed-feature-rich.pdf` contains a cryptographically intact signature validated with its isolated test certificate. Merge tests confirm the signature field is removed from rewritten output.
- `tests/merge.test.ts` verifies page order, page count, page dimensions/rotation, real progress order, malformed/encrypted rejection, ordinary annotation retention, form flattening, and loss of metadata, outlines, and attachments.
- `tests/page-operations.test.ts` covers page-list validation, extraction/reordering, splitting, deletion safeguards, rotation, PNG-to-PDF conversion, page overlays, visual signatures, and malformed/encrypted error handling.

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
- The expanded twelve-tool interface passed the seven-width no-overflow check at CSS widths 320, 390, 430, 768, 1200, 1440, and 1728 pixels.
- Images to PDF converted a local PNG fixture. The downloaded PDF reopened as a one-page Letter document with one embedded image object.
- The JPEG branch also converted in the browser; its downloaded PDF reopened as one landscape Letter page with one embedded image object. The unit test covers mixed PNG/JPEG input ordering and page orientation.
- PDF to images rendered page 1 of the synthetic two-page source. The downloaded PNG had a valid PNG signature and measured 918×1188 pixels (31,747 bytes).
- Watermark output preview text included `CONFIDENTIAL`; page-number output included `1 / 2`. The selected-page note was visibly rendered on page 2. A drawn signature appeared in the output preview and remained explicitly labeled as visual only.
- The REA browser capture covered initial app loading at 320×844 and showed same-origin Vite GET requests only. It did not exercise file upload or merge, so interaction-level network behavior was not captured.

## Remaining verification

- Cross-browser verification has not been completed; the runtime walkthrough used Chromium in the Codex in-app browser, and Edge was unavailable in this environment.
- Full keyboard/focus review, screen-reader pass, and WCAG conformance audit have not been completed.
- Interaction-level network inspection during upload and processing was unavailable; the initial-load capture is limited evidence.
- GitHub Actions has not run yet. Push and PR checks remain outstanding.
- No large-file stress test, browser performance benchmark, or production deployment validation was run.
