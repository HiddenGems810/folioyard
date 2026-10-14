# Folioyard competitive baseline

**Code baseline:** `479c25b` (`Fit Folioyard logo on narrow headers`)
**Market evidence captured:** 2026-10-12
**Evidence boundary:** Public entry pages and vendor documentation only. No file was selected or uploaded to a competitor.

## Product position

Folioyard is a focused PDF workbench for common document chores: combine files, change pages, annotate, convert images, compress, and protect/unlock PDFs. Its clearest product distinction is that supported document processing happens in the browser tab. The app has no document-upload endpoint, account flow, or usage meter.

This position is supported by the local code and browser request evidence recorded in [QA evidence](QA_EVIDENCE.md). It is not an independent privacy certification, and the static host may still receive ordinary page-request metadata when deployed.

## Baseline against the category

| Area | Folioyard at baseline | Category evidence | Product implication |
|---|---|---|---|
| Entry into a task | The app opened directly into the shared workbench; there was no public home route or tool-specific landing route. | The reviewed competitors exposed a direct file-selection or drop state on their merge entry pages. | Keep a clear file action near the top and make each public tool route open its matching workbench. |
| File and page handling | Fifteen operations, a source list, PDF preview, and explicit page controls. | PDF24, iLovePDF, Smallpdf, and PDFgear document page-level arrange/remove workflows; Adobe documents pre-merge file ordering. | Keep order and page count visible; consider stronger page-level sequencing only when it improves a common task. |
| Privacy | File processing, workers, and output URLs run in the browser; the checked local request ledger showed same-origin GETs in covered flows. | Competitor handling varies by product and operation; several publish upload and retention claims, while PDFgear claims local processing for selected routes. | Explain the mechanism and limits plainly, and avoid generalizing one vendor or operation’s policy across its suite. |
| Breadth | Fifteen focused operations; office conversion, OCR, collaborative signing, and document storage are outside the product. | The large suites advertise broader conversion, account, cloud, and signature services. | Win on focused local handling and honest scope instead of making breadth claims the product cannot support. |
| Flow continuity | Generated outputs had to be downloaded and selected again before another operation. | Competitor merge/page workflows commonly keep the user in a continuing editing flow; evidence details are operation-specific. | Keep validated PDF outputs in the tab and offer a safe handoff to the next compatible operation. |
| Brand and discovery | The selected lockup used two isolated coral circles; the product had no public landing page or unique tool pages. | The captured category pages mostly prioritize task name, file selection, and utility navigation. | Make the task action familiar while using Folioyard’s local-processing stance and a more human voice for distinction. |

## Primary evidence

The detailed operation matrix, vendor statements, source links, and REA screenshot IDs are in [the competitor comparison](../research/COMPETITOR_COMPARISON_MATRIX.md) and [the REA readiness report](../research/REA_READINESS_AND_COMPETITOR_RECON.md). Those files separate observed page state, published vendor claims, unverified behavior, and unmeasured performance.

No comparative processing time, upload behavior, output fidelity, mobile task completion, or independent privacy audit was measured. Adobe’s captured page was access-denied. PDFgear’s captured page included third-party consent/analytics requests before file selection; that does not establish that PDF contents are uploaded.
