import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test.use({ viewport: { width: 1440, height: 1100 } });

const fixture = (name: string) => resolve('tests/fixtures', name);

async function openPdf(page: import('@playwright/test').Page, name = 'feature-rich.pdf') {
  await page.goto('/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture(name));
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
}

test('merges two PDFs into a validated downloadable document', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose PDF files').setInputFiles([
    fixture('demo-first.pdf'),
    fixture('demo-second-rotated.pdf'),
  ]);
  await expect(page.getByRole('heading', { name: 'Source files 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Merge PDFs' }).click();

  await expect(page.getByRole('heading', { name: 'Merged output' })).toBeVisible();
  await expect(page.getByText(/3 pages.*ready to download/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download merged PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('requires actual ink before accepting a drawn signature', async ({ page }) => {
  await openPdf(page);
  await page.getByRole('button', { name: 'Visual signature' }).click();
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
  await page.goto('/');
  await page.getByLabel('Choose PDF files').setInputFiles(fixture('demo-first.pdf'));

  await expect(page.getByRole('alert')).toContainText('Update your browser to preview PDFs');
});

test('previews a real PDF in every supported browser engine @cross-browser', async ({ page }) => {
  await openPdf(page, 'feature-rich.pdf');
  await expect(page.getByRole('heading', { name: 'Document preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
