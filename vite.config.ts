import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadEnv, type Plugin } from 'vite';
import { toolGroups, toolPath, tools } from './src/tool-catalog.ts';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function rootWithMarkup(html: string, markup: string) {
  const updated = html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
  if (updated === html) throw new Error('Unable to add the static page content to the built HTML.');
  return updated;
}

function updateHead(html: string, title: string, description: string, canonical?: string) {
  let updated = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, '');
  if (canonical) updated = updated.replace('</head>', `<link rel="canonical" href="${escapeHtml(canonical)}" /></head>`);
  return updated;
}

function homeFallback() {
  const grouped = toolGroups.map((group) => `<section><h2>${escapeHtml(group)}</h2><ul>${tools.filter((tool) => tool.category === group).map((tool) => `<li><a href="${toolPath(tool)}">${escapeHtml(tool.title)}</a> — ${escapeHtml(tool.description)}</li>`).join('')}</ul></section>`).join('');
  return `<main class="site-home-fallback"><header><a class="brand-lockup" href="/" aria-label="Folioyard home"><img src="/folioyard-logo-v2.png" alt="Folioyard" width="150" height="50"></a><nav><a href="#all-tools">All tools</a> · <a href="/privacy/">Privacy</a></nav></header><section><p>FOLIOYARD / PDF WORKBENCH</p><h1>Get your PDF in order. Then get on with it.</h1><p>Merge the stack, fix the page that came in sideways, or add a note or signature. Folioyard handles the fiddly part in this tab.</p><a href="/merge-pdf/">Choose a PDF</a> · <a href="#all-tools">Explore all tools</a><p>No upload step. No account. No daily limit.</p></section><section id="all-tools"><h2>PDF tools</h2>${grouped}</section><footer><a href="/privacy/">Privacy</a> · <a href="/compatibility/">Compatibility</a></footer></main>`;
}

function toolFallback(info: typeof tools[number]) {
  return `<main class="tool-static-fallback"><nav><a href="/">Folioyard</a> / <a href="/#all-tools">PDF tools</a> / ${escapeHtml(info.title)}</nav><p>${escapeHtml(info.category.toUpperCase())}</p><h1>${escapeHtml(info.title)}</h1><p>${escapeHtml(info.intro)}</p><a href="${toolPath(info)}#merge-workspace">Open ${escapeHtml(info.title)}</a><h2>How to use this tool</h2><ol>${info.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol><h2>Supported files and limits</h2><p>${escapeHtml(info.limits)}</p><h2>${escapeHtml(info.faq.question)}</h2><p>${escapeHtml(info.faq.answer)}</p><p><a href="/privacy/">Learn about local file processing</a></p></main>`;
}

function policyFallback(page: 'privacy' | 'compatibility') {
  if (page === 'privacy') return '<main><nav><a href="/">Folioyard</a></nav><h1>Documents stay in this browser.</h1><p>Folioyard processes selected files in the browser tab. Document bytes and passwords are not sent to a Folioyard processing service.</p><h2>Where files go</h2><p>PDF operations run in browser code and same-origin workers. The app has no account system, upload endpoint, document storage, telemetry, or third-party processing API.</p><h2>What stays in memory</h2><p>Selected files, generated results, and preview URLs remain in the open tab. Refreshing or closing it clears the working session.</p><h2>Document changes</h2><p>Some operations flatten forms or omit document details, bookmarks, and attachments. Editing a signed PDF invalidates its existing digital signature.</p></main>';
  return '<main><nav><a href="/">Folioyard</a></nav><h1>Browser compatibility</h1><p>Folioyard uses the modern PDF.js browser build. Use a current stable version of Chromium, Firefox, Safari, or Edge.</p><h2>Processing requirements</h2><p>PDF preview and operations need JavaScript, Web Workers, Blob URLs, and WebAssembly support. Large documents require additional device memory.</p><h2>Known limitations</h2><p>Very large page-to-image jobs may take longer because PNG rendering is sequential. Review the relevant tool limits before processing.</p></main>';
}

function staticSitePages(siteUrl?: string): Plugin {
  const origin = siteUrl ? new URL(siteUrl) : undefined;
  if (origin && (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash)) {
    throw new Error('VITE_SITE_URL must be an HTTPS origin, such as https://example.com.');
  }
  return {
    name: 'folioyard-static-discovery-pages',
    apply: 'build',
    async writeBundle(outputOptions) {
      if (!outputOptions.dir) throw new Error('Static route generation requires a directory build output.');
      const outputDir = resolve(outputOptions.dir);
      const base = await readFile(join(outputDir, 'index.html'), 'utf8');
      const home = updateHead(base, 'Folioyard — PDF workbench', 'A practical PDF workbench to merge files, fix sideways pages, and save checked copies in your browser.', origin ? new URL('/', origin).href : undefined);
      await writeFile(join(outputDir, 'index.html'), rootWithMarkup(home, homeFallback()));

      for (const info of tools) {
        const page = updateHead(base, info.pageTitle, info.metaDescription, origin ? new URL(toolPath(info), origin).href : undefined);
        const directory = join(outputDir, info.slug);
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, 'index.html'), rootWithMarkup(page, toolFallback(info)));
      }

      const policyPages = [
        { page: 'privacy' as const, title: 'Privacy and local file processing | Folioyard', description: 'Learn how Folioyard processes documents locally in your browser and what happens to selected files.' },
        { page: 'compatibility' as const, title: 'Browser compatibility | Folioyard', description: 'Supported browsers, device requirements, and known PDF processing limits for Folioyard.' },
      ];
      for (const entry of policyPages) {
        const path = `/${entry.page}/`;
        const page = updateHead(base, entry.title, entry.description, origin ? new URL(path, origin).href : undefined);
        const directory = join(outputDir, entry.page);
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, 'index.html'), rootWithMarkup(page, policyFallback(entry.page)));
      }

      let robots = (await readFile(join(outputDir, 'robots.txt'), 'utf8')).trim();
      robots = robots.replace(/^Sitemap:.*\r?\n?/gm, '');
      if (origin) robots += `\nSitemap: ${new URL('/sitemap.xml', origin).href}`;
      await writeFile(join(outputDir, 'robots.txt'), `${robots}\n`);
      if (origin) {
        const paths = ['/', '/privacy/', '/compatibility/', ...tools.map(toolPath)];
        const urls = paths.map((path) => `<url><loc>${escapeHtml(new URL(path, origin).href)}</loc></url>`).join('');
        await writeFile(join(outputDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL;
  return {
    plugins: [react(), staticSitePages(siteUrl)],
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
