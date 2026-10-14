export function parsePageList(value: string, pageCount: number, maximum = pageCount) {
  if (!value.trim()) throw new Error('Enter at least one page number.');
  const pages: number[] = [];
  for (const part of value.split(',')) {
    const match = part.match(/^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/);
    if (!match) throw new Error('Use page numbers separated by commas, with ranges such as 2-4.');
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > maximum) throw new Error(`Pages must be between 1 and ${maximum}.`);
    for (let page = start; page <= end; page += 1) pages.push(page);
  }
  if (new Set(pages).size !== pages.length) throw new Error('Do not repeat a page number.');
  return pages;
}
