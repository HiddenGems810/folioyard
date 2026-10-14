export const PDFCPU_MAX_INPUT_BYTES = 50 * 1024 * 1024;

export type PdfCpuOperation = 'compress' | 'encrypt' | 'decrypt';

export type PdfCpuRequest = {
  file: File;
  operation: PdfCpuOperation;
  password: string;
};

export type PdfCpuResponse =
  | { type: 'success'; bytes: ArrayBuffer; pageCount: number }
  | { type: 'error'; message: string };
