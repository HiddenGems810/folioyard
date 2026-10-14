import type { MouseEvent, ReactNode } from 'react';
import type { ToolInfo } from './tool-catalog';
import { toolGroups, toolPath, tools } from './tool-catalog';
import ToolIcon from './ToolIcon';
import BrandLockup from './BrandLockup';

type RouteLinkProps = { href: string; onNavigate: (href: string) => void; children: ReactNode; className?: string; ariaLabel?: string };

function RouteLink({ href, onNavigate, children, className, ariaLabel }: RouteLinkProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(href);
  }

  return <a className={className} href={href} aria-label={ariaLabel} onClick={follow}>{children}</a>;
}

function SiteHeader({ onNavigate, workspace = false }: { onNavigate: (href: string) => void; workspace?: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <RouteLink href="/" onNavigate={onNavigate} className="brand-lockup" ariaLabel="Folioyard home">
          <BrandLockup />
        </RouteLink>
        <nav className="site-nav" aria-label="Main navigation">
          <RouteLink href="/#all-tools" onNavigate={onNavigate}>All tools</RouteLink>
          <RouteLink href="/#how-it-works" onNavigate={onNavigate}>How it works</RouteLink>
          <RouteLink href="/privacy/" onNavigate={onNavigate}>Privacy</RouteLink>
          {workspace && <span className="site-nav-current">PDF workspace</span>}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <footer className="site-footer">
      <RouteLink href="/" onNavigate={onNavigate} className="brand-lockup"><BrandLockup /></RouteLink>
      <p>PDF work, kept on your device.</p>
      <nav aria-label="Footer">
        <RouteLink href="/#all-tools" onNavigate={onNavigate}>All tools</RouteLink>
        <RouteLink href="/privacy/" onNavigate={onNavigate}>Privacy</RouteLink>
        <RouteLink href="/compatibility/" onNavigate={onNavigate}>Compatibility</RouteLink>
        <a href="https://github.com/HiddenGems810/folioyard" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://github.com/HiddenGems810/folioyard/issues" target="_blank" rel="noreferrer">Report a problem</a>
      </nav>
    </footer>
  );
}

function ToolLink({ info, onNavigate }: { info: ToolInfo; onNavigate: (href: string) => void }) {
  return (
    <RouteLink href={toolPath(info)} onNavigate={onNavigate} className="discovery-tool">
      <span className="discovery-icon"><ToolIcon tool={info.id} /></span>
      <span className="discovery-copy"><strong>{info.title}</strong><span>{info.description}</span></span>
      <span className="discovery-arrow" aria-hidden="true">↗</span>
    </RouteLink>
  );
}

export function HomePage({ onNavigate, onChooseFiles }: { onNavigate: (href: string) => void; onChooseFiles: (files: File[]) => void }) {
  return (
    <div className="site-page">
      <SiteHeader onNavigate={onNavigate} />
      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow">FOLIOYARD <span aria-hidden="true">/</span> PDF WORKBENCH</p>
            <h1>Get your PDF in order.<br /><span>Then get on with it.</span></h1>
            <p className="home-lede">Merge the stack, fix the page that came in sideways, or add a note or signature. Folioyard handles the fiddly part in this tab.</p>
            <div className="home-actions">
              <label className="button button-primary home-file-button">
                Choose a PDF
                <input className="visually-hidden" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => {
                  onChooseFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = '';
                }} />
              </label>
              <a className="button button-secondary" href="#all-tools">Explore all tools</a>
            </div>
            <p className="home-privacy-line"><span className="privacy-dot" />No upload step. No account. No daily limit.</p>
          </div>
          <aside className="home-hero-aside" aria-label="Common PDF problems Folioyard can fix">
            <p className="eyebrow">YOU KNOW THE PDF</p>
            <ul>
              <li>The page that came in sideways.</li>
              <li>The stack that should be one file.</li>
              <li>The signature line. Still blank.</li>
            </ul>
            <p className="home-hero-aside-note">There’s a tool for each. Fifteen, actually.</p>
          </aside>
        </section>

        <section className="home-featured" aria-labelledby="popular-tools-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">FOUR QUICK FIXES</p><h2 id="popular-tools-title">When PDFs get fussy.</h2></div>
            <a href="#all-tools">Browse all 15 tools <span aria-hidden="true">↘</span></a>
          </div>
          <div className="featured-tools">
            {['merge', 'compress', 'split', 'images-to-pdf'].map((id) => {
              const info = tools.find((item) => item.id === id);
              return info ? <ToolLink key={info.id} info={info} onNavigate={onNavigate} /> : null;
            })}
          </div>
        </section>

        <section className="all-tools-section" id="all-tools" aria-labelledby="all-tools-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">THE TOOLKIT</p><h2 id="all-tools-title">Find the right tool</h2></div>
            <p>One clear action for each job. Start with a tool; add your files when you’re ready.</p>
          </div>
          {toolGroups.map((group) => (
            <section className="tool-group" key={group} aria-labelledby={`group-${group.replace(/[^a-z]+/gi, '-').toLowerCase()}`}>
              <h3 id={`group-${group.replace(/[^a-z]+/gi, '-').toLowerCase()}`}>{group}</h3>
              <div className="tool-group-list">
                {tools.filter((info) => info.category === group).map((info) => <ToolLink key={info.id} info={info} onNavigate={onNavigate} />)}
              </div>
            </section>
          ))}
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="how-intro"><p className="eyebrow">NO UPLOAD QUEUE</p><h2 id="how-title">Your file stays put.</h2><p>Open it, make the change, save a checked copy. Supported documents are processed in this tab with browser code and local workers; Folioyard has no file-upload endpoint.</p><RouteLink href="/privacy/" onNavigate={onNavigate}>See exactly how files are handled <span aria-hidden="true">↗</span></RouteLink></div>
          <ol className="how-steps">
            <li><span>01</span><div><strong>Pick</strong><p>Choose a PDF or image from your device.</p></div></li>
            <li><span>02</span><div><strong>Fix</strong><p>Make the change and check the preview.</p></div></li>
            <li><span>03</span><div><strong>Keep</strong><p>Download the checked copy. Your source stays put.</p></div></li>
          </ol>
        </section>
      </main>
      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}

export function ToolDetails({ info, onNavigate }: { info: ToolInfo; onNavigate: (href: string) => void }) {
  const related = tools.filter((tool) => tool.category === info.category && tool.id !== info.id).slice(0, 3);
  return (
    <section className="tool-details" aria-labelledby="tool-details-title">
      <div className="tool-details-copy">
        <p className="eyebrow">ABOUT THIS TOOL</p>
        <h2 id="tool-details-title">{info.title}, on your device</h2>
        <p>{info.intro}</p>
        <h3>How to {info.title.toLowerCase()}</h3>
        <ol>{info.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <h3>Supported files and limits</h3>
        <p>{info.limits}</p>
        <h3>Frequently asked</h3>
        <details className="tool-faq"><summary>{info.faq.question}</summary><p>{info.faq.answer}</p></details>
      </div>
      <aside className="related-tools">
        <p className="eyebrow">RELATED TOOLS</p>
        {related.length > 0 ? related.map((item) => <ToolLink key={item.id} info={item} onNavigate={onNavigate} />) : <ToolLink info={tools.find((item) => item.id === 'merge')!} onNavigate={onNavigate} />}
        <RouteLink href="/#all-tools" onNavigate={onNavigate} className="all-tools-link">Explore all tools <span aria-hidden="true">↗</span></RouteLink>
      </aside>
    </section>
  );
}

export function PolicyPage({ page, onNavigate }: { page: 'privacy' | 'compatibility'; onNavigate: (href: string) => void }) {
  const privacy = page === 'privacy';
  return (
    <div className="site-page">
      <SiteHeader onNavigate={onNavigate} />
      <main className="policy-page">
        <p className="eyebrow">FOLIOYARD / {privacy ? 'PRIVACY' : 'COMPATIBILITY'}</p>
        <h1>{privacy ? 'Documents stay in this browser.' : 'A browser that can open modern PDFs.'}</h1>
        {privacy ? <>
          <p className="policy-lede">Folioyard processes selected files in the browser tab. Document bytes and passwords are not sent to a Folioyard processing service.</p>
          <h2>Where files go</h2><p>PDF operations run in browser code and same-origin workers. The app has no account system, upload endpoint, document storage, telemetry, or third-party processing API. Network requests used in verified local workflows fetched app assets from the same origin; file bytes and passwords were not posted.</p>
          <h2>What stays in memory</h2><p>Selected files, generated results, and preview URLs remain in the open tab. Refreshing or closing it clears the working session. Downloaded files are saved through your browser when you choose to download them.</p>
          <h2>Limits and document changes</h2><p>Some PDF operations flatten forms or omit document-level details, bookmarks, and attachments. Editing a signed PDF invalidates its existing digital signature. Compression and password operations have a 50 MB input limit. Each tool explains its relevant limits before processing.</p>
          <h2>App requests</h2><p>Folioyard does not currently collect document analytics or error telemetry. The hosting provider may receive ordinary web-server request metadata when the site is hosted; the static app does not send it file contents or passwords.</p>
        </> : <>
          <p className="policy-lede">Folioyard uses the modern PDF.js browser build. Use a current stable version of Chromium, Firefox, Safari, or Edge.</p>
          <h2>Processing requirements</h2><p>PDF preview and operations need a browser with JavaScript, Web Workers, Blob URLs, and WebAssembly support. Large documents require additional device memory. Compression and password tools accept files up to 50 MB and decoded streams up to 100 MB.</p>
          <h2>Known limitations</h2><p>Very large page-to-image jobs may take longer because PNG rendering is sequential. PDFs with encryption, unusual annotations, attachments, or complex forms may not work in every operation. Review each tool’s limits and keep an unchanged source copy.</p>
          <h2>Device testing</h2><p>Automated Chromium, Firefox, and WebKit workflows run in CI. Physical phones, full assistive-technology combinations, and broad large-file stress conditions are still being evaluated.</p>
        </>}
        <RouteLink href="/" onNavigate={onNavigate} className="policy-home-link">Back to Folioyard <span aria-hidden="true">↗</span></RouteLink>
      </main>
      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}

export function NotFoundPage({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <div className="site-page">
      <SiteHeader onNavigate={onNavigate} />
      <main className="policy-page not-found-page">
        <p className="eyebrow">404 / PAGE NOT FOUND</p>
        <h1>That page isn’t here.</h1>
        <p className="policy-lede">Choose a PDF tool from the Folioyard homepage.</p>
        <RouteLink href="/" onNavigate={onNavigate} className="policy-home-link">Back to Folioyard <span aria-hidden="true">↗</span></RouteLink>
      </main>
      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}
