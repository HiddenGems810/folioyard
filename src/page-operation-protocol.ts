import type { PageOperation } from './page-operations';

export type PageOperationRequest =
  | { kind: 'pdf'; file: File; operation: PageOperation }
  | { kind: 'images-to-pdf'; files: File[] };
export type PageOperationResponse =
  | { type: 'success'; files: Array<{ name: string; bytes: ArrayBuffer; pageCount: number }> }
  | { type: 'error'; message: string };
