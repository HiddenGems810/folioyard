import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { tools } from '../../src/tool-catalog';

test.use({ viewport: { width: 1440, height: 1100 } });

const fixture = (name: string) => resolve('tests/fixtures', name);

async function verifyPdfDownload(download: import('@playwright/test').Download, pageCount: number) {
  const filePath = await download.path();
  if (!filePath) throw new Error('The browser did not provide the downloaded file path.');
  const bytes = await readFile(filePath);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBe(pageCount);
}

async function openPdf(page: import('@playwright/test').Page, name = 'feature-rich.pdf') {
  await page.goto('/merge-pdf/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture(name));
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
}

test('merges two PDFs into a validated downloadable document @cross-browser', async ({ page }) => {
  await page.goto('/merge-pdf/');
  await page.getByLabel('Choose PDF files').setInputFiles([
    fixture('demo-first.pdf'),
    fixture('demo-second-rotated.pdf'),
  ]);
  await expect(page.getByRole('heading', { name: 'Source files 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Merge PDFs' }).click();

  try {
    await expect(page.getByRole('heading', { name: 'Merged output' })).toBeVisible({ timeout: 15_000 });
  } catch (error) {
    throw new Error(`Merge did not finish: ${await page.locator('.action-status').innerText()}`, { cause: error });
  }
  await expect(page.getByText(/3 pages.*ready to download/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download merged PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  await verifyPdfDownload(download, 3);
});

test('requires actual ink before accepting a drawn signature', async ({ page }) => {
  await openPdf(page);
  await page.getByRole('link', { name: 'Visual signature' }).click();
  const canvas = page.getByLabel('Draw a visual signature here');
  await canvas.click({ position: { x: 360, y: 120 } });
  await expect(page.getByText('Use a mouse, touch, or stylus')).toBeVisible();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Add visual signature' }).click();

  await expect(page.getByRole('alert')).toContainText('Draw a visual signature or enter a name');
  await expect(page.getByRole('button', { name: 'Download output PDF' })).toHaveCount(0);

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Signature canvas is not visible.');
  await page.mouse.move(bounds.x + 40, bounds.y + 80);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 80, bounds.y + 110, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByText('Drawn signature ready')).toBeVisible();
  await page.getByRole('button', { name: 'Add visual signature' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download output PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('shows an update message instead of treating an unsupported browser as corrupt @cross-browser', async ({ page }) => {
  await page.addInitScript(() => Reflect.deleteProperty(Promise, 'try'));
  await page.goto('/merge-pdf/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture('demo-first.pdf'));

  await expect(page.getByRole('alert')).toContainText('Update your browser to preview PDFs');
});

test('previews a real PDF in every supported browser engine @cross-browser', async ({ page }) => {
  await openPdf(page, 'feature-rich.pdf');
  await expect(page.getByRole('heading', { name: 'Document preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('homepage links to each useful tool page with unique metadata and working workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Get your PDF in order\. Then get on with it/ })).toBeVisible();
  const logo = page.locator('.site-header .brand-lockup img');
  await expect(logo).toHaveAttribute('src', '/folioyard-logo-v2.png');
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#all-tools a')).toHaveCount(15);
  for (const tool of tools) {
    const response = await page.request.get(`/${tool.slug}/`);
    expect(response.ok(), `${tool.slug} route should exist`).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(`<title>${tool.pageTitle}</title>`);
    expect(html).toContain(`<h1>${tool.title}</h1>`);
    await page.goto(`/${tool.slug}/`);
    await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeVisible();
    await expect(page.getByRole('button', { name: /PDF$|PDFs$|images$/ }).first()).toBeVisible();
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(tool.metaDescription);
  }
});

test('homepage fits narrow and wide viewports without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 390, 430, 768, 1200, 1440, 1728]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll, `homepage overflows at ${width}px`).toBe(dimensions.client);
  }
});

test('homepage file selection opens the merge workspace with the chosen file', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose a PDF').setInputFiles(fixture('demo-first.pdf'));
  await expect(page).toHaveURL(/\/merge-pdf\/$/);
  await expect(page.getByRole('heading', { name: 'Source files 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'demo-first.pdf', exact: true })).toBeVisible();
});

test('tool links keep selected documents available and browser history restores the tool', async ({ page }) => {
  await page.goto('/merge-pdf/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture('demo-first.pdf'));
  await page.getByRole('navigation', { name: 'PDF tools' }).getByRole('link', { name: 'Split PDF' }).click();
  await expect(page).toHaveURL(/\/split-pdf\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Split PDF' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Source files 1' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/merge-pdf\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Source files 1' })).toBeVisible();
});

const pageOperationJourneys = [
  { tool: 'split', file: 'feature-rich.pdf', action: 'Split PDF', outputHeading: 'Split output', download: 'Download part 1 of 2', pages: 1 },
  { tool: 'extract', file: 'feature-rich.pdf', action: 'Extract pages', outputHeading: 'Processed output', download: 'Download output PDF', pages: 1 },
  { tool: 'reorder', file: 'feature-rich.pdf', action: 'Save page order', outputHeading: 'Processed output', download: 'Download output PDF', pages: 2, pageList: '2, 1' },
  { tool: 'rotate', file: 'feature-rich.pdf', action: 'Rotate pages', outputHeading: 'Processed output', download: 'Download output PDF', pages: 2 },
  { tool: 'delete', file: 'feature-rich.pdf', action: 'Delete pages', outputHeading: 'Processed output', download: 'Download output PDF', pages: 1 },
  { tool: 'watermark', file: 'feature-rich.pdf', action: 'Add watermark', outputHeading: 'Processed output', download: 'Download output PDF', pages: 2 },
  { tool: 'page-numbers', file: 'feature-rich.pdf', action: 'Add page numbers', outputHeading: 'Processed output', download: 'Download output PDF', pages: 2 },
  { tool: 'annotate', file: 'feature-rich.pdf', action: 'Add note', outputHeading: 'Processed output', download: 'Download output PDF', pages: 2, note: 'Reviewed for delivery' },
  { tool: 'signature', file: 'feature-rich.pdf', action: 'Add visual signature', outputHeading: 'Processed output', download: 'Download output PDF', pages: 2, signature: 'Folioyard QA' },
  { tool: 'compress', file: 'compressible-uncompressed-stream.pdf', action: 'Compress PDF', outputHeading: 'Processed output', download: 'Download output PDF', pages: 1 },
] as const;

for (const journey of pageOperationJourneys) {
  test(`${journey.tool} creates a valid downloadable PDF`, async ({ page }) => {
    test.setTimeout(60_000);
    const info = tools.find((entry) => entry.id === journey.tool);
    if (!info) throw new Error(`Missing tool route for ${journey.tool}.`);
    await page.goto(`/${info.slug}/`);
    await page.getByLabel('Choose PDF files').setInputFiles(fixture(journey.file));
    if ('pageList' in journey) await page.locator('#page-list').fill(journey.pageList);
    if ('note' in journey) await page.getByLabel('Short page note').fill(journey.note);
    if ('signature' in journey) await page.getByLabel('Or type a name').fill(journey.signature);
    await page.getByRole('button', { name: journey.action, exact: true }).click();
    await expect(page.getByRole('heading', { name: journey.outputHeading, exact: true })).toBeVisible({ timeout: 30_000 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: journey.download, exact: true }).click(),
    ]);
    await verifyPdfDownload(download, journey.pages);
  });
}

test('images to PDF converts PNG and JPEG inputs into two pages', async ({ page }) => {
  await page.goto('/images-to-pdf/');
  await page.getByLabel('Choose PNG or JPEG images').setInputFiles([fixture('pixel.png'), fixture('pixel.jpg')]);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Processed output', exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download output PDF', exact: true }).click(),
  ]);
  await verifyPdfDownload(download, 2);
});

test('a checked PDF output can continue into another tool without downloading it', async ({ page }) => {
  await page.goto('/merge-pdf/');
  await page.getByLabel('Choose PDF files').setInputFiles([fixture('demo-first.pdf'), fixture('demo-second-rotated.pdf')]);
  await page.getByRole('button', { name: 'Merge PDFs' }).click();
  await expect(page.getByRole('heading', { name: 'Merged output' })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel('One more thing?').selectOption('annotate');
  await page.getByRole('button', { name: 'Use this PDF' }).click();
  await expect(page).toHaveURL(/\/add-note-to-pdf\/$/);
  await expect(page.getByRole('heading', { name: 'Source files 3' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'folioyard-merged.pdf', exact: true })).toBeVisible();
  await expect(page.getByText('1 / 3')).toBeVisible();
  await page.getByLabel('Short page note').fill('Checked after merging');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Processed output', exact: true })).toBeVisible({ timeout: 30_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download output PDF', exact: true }).click(),
  ]);
  await verifyPdfDownload(download, 3);
});

test('PDF to images renders and downloads a valid PNG', async ({ page }) => {
  await page.goto('/pdf-to-png/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture('feature-rich.pdf'));
  await page.getByRole('button', { name: 'Render PNGs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'PNG output', exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG 1 of 1', exact: true }).click(),
  ]);
  const filePath = await download.path();
  if (!filePath) throw new Error('The browser did not provide the PNG download path.');
  expect((await readFile(filePath)).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
});

test('protect and unlock round trip retains the PDF pages', async ({ page }) => {
  test.setTimeout(90_000);
  const password = 'folioyard-e2e-password';
  await page.goto('/protect-pdf/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture('feature-rich.pdf'));
  await page.getByLabel('Open password', { exact: true }).fill(password);
  await page.getByLabel('Confirm open password').fill(password);
  await page.getByRole('button', { name: 'Protect PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Protected output', exact: true })).toBeVisible({ timeout: 60_000 });
  const [protectedDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download output PDF', exact: true }).click(),
  ]);
  const protectedPath = await protectedDownload.path();
  if (!protectedPath) throw new Error('The browser did not provide the protected PDF download path.');
  const protectedBytes = await readFile(protectedPath);
  expect(protectedBytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(protectedBytes.includes(Buffer.from('/Encrypt'))).toBeTruthy();

  await page.getByRole('button', { name: 'Remove feature-rich.pdf' }).click();
  await page.getByRole('navigation', { name: 'PDF tools' }).getByRole('link', { name: 'Unlock PDF' }).click();
  await page.getByLabel('Choose PDF files').setInputFiles({ name: 'protected-feature-rich.pdf', mimeType: 'application/pdf', buffer: protectedBytes });
  await page.getByLabel('PDF password').fill(password);
  await page.getByRole('button', { name: 'Unlock PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Processed output', exact: true })).toBeVisible({ timeout: 60_000 });
  const [unlockedDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download output PDF', exact: true }).click(),
  ]);
  await verifyPdfDownload(unlockedDownload, 2);
});
