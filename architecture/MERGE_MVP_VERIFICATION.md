# Folioyard Merge MVP verification

**Run date:** 2026-10-12  
**Readiness:** Review-ready for the first local merge slice. This is not a production deployment.

## Implemented workflow

The browser app imports local PDFs, previews source pages, reorders whole source files with keyboard-operable move buttons, merges in the visible order in a Web Worker, validates the generated PDF with PDF.js, previews the result, and downloads `folioyard-merged.pdf`. Files are held in the current tab only. Split, compression, conversion, signing, annotation, page-level rearrangement, and password protection are not implemented.

## Verification evidence

- `npm run build` — passed. This runs `tsc --noEmit` and the Vite production build.
- `npm test -- --reporter=verbose` — passed, 6/6 tests. The generated and fixture PDFs cover source order, multipage content, page rotation, real per-file progress, the two-input minimum, malformed bytes, and encrypted input rejection.
- Browser walkthrough — imported two synthetic PDFs; confirmed Undo restores the previous order; then used Tab and Enter on the move-up button, merged in reversed order, and checked rendered output text across pages: rotated source first, then source A pages 1 and 2. The UI reports three pages and retains the source queue after invalid and encrypted merge failures.
- Download — Playwright captured the real browser download as `output/folioyard-merged.pdf`. `pdf-lib` reopened those downloaded bytes and reported 3 pages with rotations `[90, 0, 0]`.
- Network — the browser capture during local selection, preview, merge, and download contained same-origin `GET` requests to the local Vite server only. No upload request, other write request, or external origin appeared.
- Responsive widths — 320, 390, 430, 768, 1200, 1440, and 1728 CSS px. At every width, `documentElement.scrollWidth` equaled `clientWidth` after the 320 px minimum-width issue was fixed.
- Screenshots — [desktop 1440 × 960](../output/playwright/folioyard-merge-desktop.png) and [mobile 390 × 844](../output/playwright/folioyard-merge-mobile.png). The mobile capture is scrolled to show the source order and complete output preview together.

## Performance and fidelity limits

- No competitor processing-time benchmark or large-file throughput test was run. Competitor performance statements remain vendor claims in the research matrix.
- Build output: initial app bundle 233.14 kB (72.78 kB gzip); lazy PDF.js viewer 429.07 kB (128.99 kB gzip); merge worker 423.53 kB; PDF.js worker 1,264.34 kB. The viewer and workers load only when needed, but device memory and PDF complexity still bound practical input size.
- The encrypted fixture is rejected. This stack does not decrypt PDFs. `pdf-lib` page copying may omit document-level structures such as forms or outlines; digital signatures cannot remain valid after modification. Fidelity for complex interactive PDFs was not tested.
- Long-running cancellation, physical-device behavior, a full keyboard audit, and screen-reader testing were not exercised. The move control was operated by keyboard in the browser walkthrough; this is not a complete accessibility audit.
- The workspace has no Git repository, so `git status` and `git diff --check` are unavailable. No commit or deployment was made.

## REA readiness

REA package 6.4.0 passed `mcp doctor` with the production stdio adapter healthy, protocol 2025-11-25, all 170 tools and 6 prompts available, matching digest, and no missing, unexpected, or duplicate tools. A direct MCP session listed tools and successfully called `capture_browser_scenario`. The current Codex session itself did not expose REA in its live tool registry; restart/reload Codex MCP registration before relying on REA as a native tool in this session. Competitor captures and evidence hashes are documented in [the research report](../research/REA_READINESS_AND_COMPETITOR_RECON.md).
