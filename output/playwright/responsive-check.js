async (page) => {
  const widths = [320, 390, 430, 768, 1200, 1440, 1728];
  const results = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    results.push(await page.evaluate(() => ({
      viewport: innerWidth,
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    })));
  }
  return results;
}
