import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';

export function flattenFormFields(document: PDFDocument, fileName: string) {
  try {
    const form = document.getForm();
    if (form.getFields().length === 0) return;
    const widgetRefs = new Set<string>();

    for (const page of document.getPages()) {
      for (const annotation of page.node.Annots()?.asArray() ?? []) {
        const dictionary = document.context.lookupMaybe(annotation, PDFDict);
        if (dictionary?.get(PDFName.of('Subtype'))?.toString() === '/Widget') widgetRefs.add(annotation.toString());
      }
    }

    form.flatten();
    // pdf-lib 1.17.1 leaves deleted widget references in page /Annots after flattening.
    for (const page of document.getPages()) {
      const annotations = page.node.Annots();
      if (!annotations) continue;
      for (let index = annotations.size() - 1; index >= 0; index -= 1) {
        if (widgetRefs.has(annotations.get(index).toString())) annotations.remove(index);
      }
    }
  } catch (error) {
    throw new Error(`Could not preserve the visible form fields in “${fileName}”.`, { cause: error });
  }
}
