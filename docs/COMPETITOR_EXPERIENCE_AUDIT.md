# Competitor experience audit

**Basis:** REA captures and public vendor documentation dated 2026-10-12. See the [comparison matrix](../research/COMPETITOR_COMPARISON_MATRIX.md) for operation-level details. No competitor received a file upload.

## Findings

| Priority | Finding | Folioyard response |
|---|---|---|
| High | The first useful action is consistent across the category: name the task and let the user choose a file. | The homepage puts file selection beside routes to all fifteen tools; each tool page returns users to its matching workbench. |
| High | Local handling is a meaningful distinction only when the mechanism is specific. A privacy badge alone does not explain where bytes go. | State that supported PDF processing runs in the tab with browser code and same-origin workers, disclose the lack of an upload endpoint, and link to the handling policy. |
| Medium | Page-level organization varies widely. Vendor docs describe thumbnail drag/drop, but not every operation or account tier supports the same controls. | Folioyard retains its ordered source list and preview. Reorder uses a complete page-number list; no drag-only behavior is claimed. |
| Medium | “Sign” can mean placing a visual mark, requesting e-signatures, or applying a certificate-backed digital signature. | Call the current feature a visual signature and disclose that it does not verify identity or preserve a prior certificate signature after rewriting. |
| Medium | Broad suites add accounts, cloud routes, limits, and persistence. Those details differ by vendor and operation. | Keep the current scope focused and document tab-memory behavior, format limits, and output fidelity instead of implying suite-wide equivalence. |

## Current differentiation

Folioyard combines fifteen common operations with browser-local document handling, no account, and no daily usage meter. Its updated editorial voice uses recognizable PDF annoyances—the sideways scan, the packet split across files, and the blank signature line—to make the product feel specific without inventing social proof or performance claims.

## Limits of this audit

The source research examined public entry states and first-party documentation. It did not submit synthetic documents, accept vendor terms, create accounts, benchmark processing, or test the full competitor workflows. Adobe’s controlled capture returned access denied. Published retention, local-processing, pricing, and quota statements remain vendor claims, not independent measurements.

## Next useful evidence

After the local build is accepted, test Folioyard’s actual tasks with representative users and permitted synthetic documents on physical mobile devices. Measure completion, error recovery, processing time, and whether users understand what stays in the browser before expanding scope.
