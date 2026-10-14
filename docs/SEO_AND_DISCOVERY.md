# SEO and discovery

## Route model

- `/` is the public homepage and file-selection entry.
- Each of the fifteen tools has a stable, readable route from `src/tool-catalog.ts`, for example `/merge-pdf/` and `/add-note-to-pdf/`.
- `/privacy/` and `/compatibility/` explain file handling, browser requirements, and limitations.
- Tool pages include unique titles and descriptions, one descriptive H1, supported-file steps, limitations, an FAQ, links to related tools, and a direct route into the live workbench.

`vite.config.ts` writes crawlable static fallback HTML into the production route folders after the Vite build. The same route renders as the interactive React application at runtime. The homepage and fallback retain semantic links without JavaScript.

## Canonical and sitemap behavior

Set `VITE_SITE_URL` to the verified HTTPS origin at production build time. The build then writes absolute canonical links for the homepage, fifteen tool routes, privacy, and compatibility, plus `sitemap.xml` and a `Sitemap:` entry in `robots.txt`. The build rejects non-HTTPS values and values containing a path, query, or fragment.

`VITE_SITE_URL` is not configured in this checkout because the production hostname has not been established. The current `robots.txt` allows crawling; it does not point crawlers at a sitemap. Do not publish a made-up canonical origin.

## Content and indexing decisions

- Claims describe implemented behavior and link to visible explanations of local processing and PDF fidelity limits.
- Internal links connect task pages, related tools, the privacy page, and the shared tool directory.
- No structured data is added: the pages do not have ratings, reviews, or other third-party proof that would justify it.
- No claim is made that search engines have indexed the routes, that rankings changed, or that public-host canonical behavior has been verified.

## Release checks still needed

Build with the real origin, inspect all generated route titles and canonical URLs, validate sitemap and robots output, verify redirects and 404 behavior on the production-equivalent host, and inspect Google Search Console after public launch. These checks require a confirmed hostname and a separately authorized deployment.
