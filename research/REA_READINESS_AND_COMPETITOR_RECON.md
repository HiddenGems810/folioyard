# REA readiness and competitor reconnaissance

**Captured:** 2026-10-12  
**Scope:** Public merge-tool entry pages for PDF24, iLovePDF, Smallpdf, Adobe Acrobat Online, and PDFgear. No competitor files were selected or uploaded.

## REA readiness

| Check | Result | Evidence |
|---|---|---|
| Local configuration | Present | `C:\Users\TAGDesigns\.codex\config.toml` has an `rea` MCP entry pointing to the installed `rea-agents` package and Node runtime. |
| Runtime/package | Present and compatible | Node 24.19.0 in the configured runtime; `rea-agents` 6.4.0 requires Node `^24.11.0`; configured executable and package paths exist. |
| REA self-diagnostic | Pass | `node rea.mjs mcp doctor`: healthy production stdio adapter; protocol `2025-11-25`; 170/170 expected tools and 6/6 prompts; no missing, unexpected, or duplicate registrations; package/catalog digest matched; `binary_session` flow passed; stderr empty. |
| Direct MCP operation | Pass | A direct stdio client initialized the server, listed the tool catalog, and successfully called `capture_browser_scenario` for the public product pages. |
| This Codex session's native tool registry | **Not connected** | REA tools do not appear in the active session's native tool catalog. The installed package works when launched directly, but this chat did not inherit the configured MCP server. |

**Configuration issue to report:** REA is installed and operational, but not registered in the live Codex tool catalog. REA's setup guidance says to restart the agent after setup; the likely remedy is restarting the Codex app/session so it reloads the config. Direct MCP stdio calls provided a working route for this research. This does not establish that native integration is fixed.

## Capture method and limits

- REA `capture_browser_scenario`, isolated Chromium 154.0.8037.99, 1440 × 960, `en-US`, `America/Chicago`, light mode, reduced motion, service workers blocked.
- Captures requested screenshot, DOM, accessibility tree, URL, history, console, page errors, and network event metadata. Request/response bodies and header values were not captured.
- The browser loaded the public merge entry route only. No file picker was opened and no file was sent to a competitor. Therefore upload routing, server-side processing, output correctness, download reliability, processing duration, and encrypted-file behavior were not runtime-verified.
- Adobe's official merge URL returned an access-denied page in the controlled browser. No proxy, alternate identity, automation evasion, or access-control bypass was attempted. Its public help pages remain usable as documentation evidence.
- PDFgear's capture step is complete and retained 247 network events with zero dropped events, but REA marks the overall event section incomplete. Treat page screenshot/DOM observations as usable; do not infer complete traffic coverage from that run.
- An initial REA bootstrap probe used too short a startup window and timed out; the configured doctor and a subsequent direct protocol session both passed. This was a probe timeout, not a failed package diagnostic.

## Directly observed first-screen states

| Product | Public route | REA Evidence ID | Screenshot | First-screen observation |
|---|---|---|---|---|
| PDF24 | [Merge PDF](https://tools.pdf24.org/en/merge-pdf) | `ev_8903fd0124108cd2943f06406d6799c9e4c048a5938702e8ea1da3b7d0cb73bf` | [PNG](evidence/screenshots/tools-pdf24-org-merge-entry.png) | Title and file-selection/drop area; page copy describes a free tool. Page-level behavior was not exercised. |
| iLovePDF | [Merge PDF](https://www.ilovepdf.com/merge_pdf) | `ev_978c30d7b20911a65aad06deaacf9a871f859af788951dc09cf7b4da9d0efd87` | [PNG](evidence/screenshots/ilovepdf-com-merge-entry.png) | Merge heading, “Select PDF files” action, drop target, and device/cloud entry options. |
| Smallpdf | [Merge PDF](https://smallpdf.com/merge-pdf) | `ev_0e46ec4c039ce1c20bc3c3d89be02d3f9ab2e86840c3a898f67a952b82cd9785` | [PNG](evidence/screenshots/smallpdf-com-merge-entry.png) | Merge heading, file-selection/drop target, and tool navigation. |
| Adobe Acrobat Online | [Merge PDFs](https://www.adobe.com/acrobat/online/merge-pdf.html) | `ev_2b28bf87640b8409fa82de58fbd38556a756ad6b996eb2cf1f30b5ff8e602afa` | [PNG](evidence/screenshots/adobe-com-merge-entry.png) | Access-denied response. No further browser attempt was made. |
| PDFgear | [Merge PDF Online](https://www.pdfgear.com/merge-pdf/) | `ev_fe3019066f0628f9e28a42099e25ee6f2979f3dc1efb0f6965b10dd6027baa05` | [PNG](evidence/screenshots/pdfgear-com-merge-entry.png) | “Select PDF File(s)” and drop area; page states files are processed locally; a cookie-consent prompt is visible. |

The screenshot manifest contains the exact SHA-256 and byte count for every image. Entry screenshots are observations of the rendered first screen, not confirmation of every control's effect. PDFgear's browser made requests to its own origin and third-party analytics/consent origins before file selection. REA did not capture request bodies; this is evidence of page-level network activity, not evidence that PDF contents are uploaded.

## Evidence classes

- **Observed:** REA's captured first-screen text, controls, screenshots, route, and access-denied state.
- **Published claim:** The vendor's own help, privacy, or product page describes a workflow or file-handling policy.
- **Unverified:** A claim not exercised with a synthetic file, or behavior unavailable due to the access-denied state.
- **Not measured:** Competitor processing time, throughput, mobile behavior, and output fidelity. No processing benchmark was run.

The detailed operation matrix and source links are in [the competitor comparison](../COMPETITOR_COMPARISON_MATRIX.md). Raw REA output is retained privately under this folder; see this folder's README before sharing artifacts.
