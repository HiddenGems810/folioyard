import { PDFCPU_MAX_INPUT_BYTES, type PdfCpuRequest, type PdfCpuResponse } from './pdfcpu-protocol';

type GoRuntime = {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
};
type GoConstructor = new () => GoRuntime;
type ProcessResult = { ok: true; bytes: Uint8Array; pageCount: number } | { ok: false; code: string };
type WorkerScope = typeof globalThis & {
  Go?: GoConstructor;
  location: Location;
  folioyardPdfcpuProcess?: (bytes: Uint8Array, operation: string, password: string) => ProcessResult;
  onmessage: ((event: MessageEvent<PdfCpuRequest>) => void) | null;
  postMessage(message: PdfCpuResponse, transfer?: Transferable[]): void;
};

const scope = globalThis as WorkerScope;
const wasmUrl = new URL(`${import.meta.env.BASE_URL}pdfcpu.wasm`, scope.location.href).href;
let engineReady: Promise<void> | null = null;

function messageFor(operation: PdfCpuRequest['operation'], code = '') {
  if (code === 'too-large') return 'PDF tools are limited to files of 50 MB or less.';
  if (code === 'invalid-password') return 'Use a password between 8 and 127 UTF-8 bytes.';
  if (operation === 'decrypt') return 'The PDF could not be unlocked. Check the password and make sure the file is valid.';
  if (operation === 'encrypt') return 'The PDF could not be protected. It may already be encrypted or unsupported.';
  return 'The PDF could not be compressed. It may be encrypted, damaged or unsupported.';
}

async function loadEngine() {
  if (!engineReady) {
    engineReady = (async () => {
      await import(/* @vite-ignore */ new URL(`${import.meta.env.BASE_URL}pdfcpu-wasm-exec.js`, scope.location.href).href);
      const Go = scope.Go;
      if (!Go) throw new Error('PDF tools could not start. Reload this page and try again.');
      const go = new Go();
      const response = await fetch(wasmUrl);
      if (!response.ok) throw new Error('PDF tools could not load. Reload this page and try again.');
      const { instance } = await WebAssembly.instantiateStreaming(response, go.importObject);
      void go.run(instance).catch(() => undefined);
      if (!scope.folioyardPdfcpuProcess) throw new Error('PDF tools could not start. Reload this page and try again.');
    })();
  }
  await engineReady;
}

scope.onmessage = async ({ data }) => {
  try {
    if (data.file.size > PDFCPU_MAX_INPUT_BYTES) {
      scope.postMessage({ type: 'error', message: messageFor(data.operation, 'too-large') });
      return;
    }
    await loadEngine();
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const process = scope.folioyardPdfcpuProcess;
    if (!process) throw new Error('PDF tools could not start. Reload this page and try again.');
    const result = process(bytes, data.operation, data.password);
    if (!result.ok) {
      scope.postMessage({ type: 'error', message: messageFor(data.operation, result.code) });
      return;
    }
    const output = result.bytes.buffer as ArrayBuffer;
    scope.postMessage({ type: 'success', bytes: output, pageCount: result.pageCount }, [output]);
  } catch (error) {
    scope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : messageFor(data.operation),
    });
  }
};
