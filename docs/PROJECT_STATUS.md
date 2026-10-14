# Folioyard project status

**Updated:** 2026-10-14
**Readiness:** Review-ready locally for the current implementation; public release remains unverified.

## Product state

- Fifteen browser-based PDF tools share a document queue, preview, validated output, and one local processing boundary.
- The homepage and individual tool routes explain the product and guide users into the matching workspace. Privacy and compatibility pages disclose processing and format limits.
- A checked PDF output can be handed into another single-document PDF tool in the same tab. Existing input files remain available in the source list.
- The homepage now uses direct, lightly dry copy and a before/after page-rotation illustration. The selected original logo asset remains preserved; the dot-removed raster derivative is still a review candidate.

## Engineering and evidence

- Baseline commit: `479c25b` on `codex/folioyard-recovery`; existing repository history is preserved.
- Changes are carried on the existing development branch and [PR #1](https://github.com/HiddenGems810/folioyard/pull/1) remains the review target. GitHub Actions covers the Go/WASM build, lint, typecheck, unit tests, production build, and Chromium/Firefox/WebKit browser runs.
- Local checks: 16 TypeScript tests, 22 Chromium workflows, three WebKit cross-browser journeys, production build, lint, and diff whitespace check.
- The merge journey checks downloaded PDF bytes and page count. The handoff journey merges two files, carries the checked three-page output into Add a note, and validates the second output.
- Firefox cannot launch in this Windows environment (`spawn UNKNOWN`); GitHub Actions runs it on Linux.
- Go/WASM verification and dependency/security scans are recorded in [QA evidence](QA_EVIDENCE.md); they were not repeated for this UI milestone.

## Remaining release work

- Review the live homepage and logo candidate in the running preview.
- GitHub Actions is configured to run Linux CI for the updated PR head, including Firefox.
- Complete a screen-reader and keyboard audit, physical phone checks, large-file/device-memory stress, and production-hosting network verification.
- Configure the real HTTPS site origin before emitting production canonicals and the sitemap. The domain is not configured in this checkout.
- Deployment and public release require the project’s separate explicit authorization.

See [architecture](ARCHITECTURE.md), [known limitations](KNOWN_LIMITATIONS.md), [SEO and discovery](SEO_AND_DISCOVERY.md), [competitive baseline](COMPETITIVE_BASELINE.md), [experience audit](COMPETITOR_EXPERIENCE_AUDIT.md), and [QA evidence](QA_EVIDENCE.md).
