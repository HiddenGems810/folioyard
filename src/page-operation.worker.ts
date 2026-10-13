import { applyPageOperation, imagesToPdf } from './page-operations';
import type { PageOperationResponse, PageOperationRequest } from './page-operation-protocol';

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<PageOperationRequest>) => void) | null;
  postMessage(message: PageOperationResponse, transfer?: Transferable[]): void;
};

workerScope.onmessage = async ({ data }) => {
  try {
    const outputs = data.kind === 'images-to-pdf'
      ? [await imagesToPdf(data.files)]
      : await applyPageOperation(new Uint8Array(await data.file.arrayBuffer()), data.file.name, data.operation);
    const files = outputs.map(({ name, bytes, pageCount }) => ({ name, bytes: bytes.slice().buffer as ArrayBuffer, pageCount }));
    workerScope.postMessage({ type: 'success', files }, files.map((file) => file.bytes));
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'The PDF pages could not be processed.',
    });
  }
};
