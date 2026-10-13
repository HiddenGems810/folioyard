import { mergePdfFiles } from './merge';
import type { MergeRequest, MergeResponse } from './merge-protocol';

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<MergeRequest>) => void) | null;
  postMessage(message: MergeResponse, transfer?: Transferable[]): void;
};

workerScope.onmessage = async ({ data }) => {
  try {
    const result = await mergePdfFiles(
      data.files.map(({ name, file }) => ({
        name,
        readBytes: async () => new Uint8Array(await file.arrayBuffer()),
      })),
      (progress) => workerScope.postMessage({ ...progress, totalFiles: data.files.length, type: 'progress' }),
    );
    const bytes = result.bytes.slice().buffer as ArrayBuffer;
    workerScope.postMessage(
      { type: 'success', bytes, pageCount: result.pageCount },
      [bytes],
    );
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'The PDFs could not be merged.',
    });
  }
};
