import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import type { MergeResponse } from './merge-protocol';
import type { PageOperationRequest, PageOperationResponse } from './page-operation-protocol';
import type { PageOperation } from './page-operations';
import { PDFCPU_MAX_INPUT_BYTES, type PdfCpuOperation, type PdfCpuResponse } from './pdfcpu-protocol';
import { parsePageList } from './page-list';
import SignaturePad from './SignaturePad';

const PdfPreview = lazy(() => import('./PdfPreview'));

type Source = { id: number; file: File; url?: string };
type Tool = 'merge' | 'split' | 'extract' | 'reorder' | 'rotate' | 'delete' | 'images-to-pdf' | 'pdf-to-images' | 'watermark' | 'page-numbers' | 'annotate' | 'signature' | 'compress' | 'protect' | 'unlock';
type OutputPdf = { file: File; url: string; pageCount: number; locked: boolean };
type OutputImage = { file: File; url: string; pageNumber: number };
type MergeState =
  | { kind: 'idle' }
  | { kind: 'running'; completedFiles: number; totalFiles: number; fileName: string; pagesDone: number }
  | { kind: 'done'; pageCount: number; fileSize: number };

const tools: Array<{ id: Tool; title: string; mark: string }> = [
  { id: 'merge', title: 'Merge PDF', mark: 'M' },
  { id: 'split', title: 'Split PDF', mark: 'S' },
  { id: 'extract', title: 'Extract pages', mark: 'E' },
  { id: 'reorder', title: 'Reorder pages', mark: 'R' },
  { id: 'rotate', title: 'Rotate pages', mark: '↻' },
  { id: 'delete', title: 'Delete pages', mark: '−' },
  { id: 'images-to-pdf', title: 'Images to PDF', mark: 'I' },
  { id: 'pdf-to-images', title: 'PDF to images', mark: 'P' },
  { id: 'watermark', title: 'Watermark', mark: 'W' },
  { id: 'page-numbers', title: 'Page numbers', mark: '#' },
  { id: 'annotate', title: 'Add a note', mark: 'N' },
  { id: 'signature', title: 'Visual signature', mark: '✎' },
  { id: 'compress', title: 'Compress PDF', mark: '↓' },
  { id: 'protect', title: 'Protect PDF', mark: '◇' },
  { id: 'unlock', title: 'Unlock PDF', mark: '↗' },
];

const descriptions: Record<Tool, string> = {
  merge: 'Put documents in order, check the pages, then save one PDF.',
  split: 'Choose break points to save separate PDFs from one document.',
  extract: 'Keep selected pages in a new PDF and leave your source unchanged.',
  reorder: 'Set a new order for every page in the selected PDF.',
  rotate: 'Turn selected pages clockwise and keep the rest as they are.',
  delete: 'Remove selected pages from a copy of your PDF.',
  'images-to-pdf': 'Place PNG and JPEG images into a clean, ordered PDF.',
  'pdf-to-images': 'Render selected PDF pages as downloadable PNG images.',
  watermark: 'Add a light, diagonal text watermark to selected pages.',
  'page-numbers': 'Add a centered page number to every page.',
  annotate: 'Add a short, visible note to selected pages.',
  signature: 'Place a drawn or typed visual signature on selected pages.',
  compress: 'Reduce file size losslessly. A download is offered only when the PDF becomes smaller.',
  protect: 'Encrypt a PDF with an AES-256 open password that stays on this device.',
  unlock: 'Create an unprotected copy of a PDF using its open password.',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export default function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [imageSources, setImageSources] = useState<Source[]>([]);
  const [undoSources, setUndoSources] = useState<Source[] | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<number, number>>({});
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [tool, setTool] = useState<Tool>('merge');
  const [pageList, setPageList] = useState('1');
  const [watermarkText, setWatermarkText] = useState('DRAFT');
  const [annotationText, setAnnotationText] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [protectPassword, setProtectPassword] = useState('');
  const [confirmProtectPassword, setConfirmProtectPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [pageNumber, setPageNumber] = useState(1);
  const [showOutput, setShowOutput] = useState(false);
  const [outputPdfs, setOutputPdfs] = useState<OutputPdf[]>([]);
  const [outputImages, setOutputImages] = useState<OutputImage[]>([]);
  const [activeOutputIndex, setActiveOutputIndex] = useState(0);
  const [mergeState, setMergeState] = useState<MergeState>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const previewState = useRef({ activeSourceId, showOutput, tool });
  const fileInput = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const verificationTask = useRef<PDFDocumentLoadingTask | null>(null);
  const imageRenderTask = useRef<{ cancel: () => void } | null>(null);
  const mergeRun = useRef(0);
  const outputUrls = useRef<string[]>([]);
  const sourceUrls = useRef<string[]>([]);
  const nextId = useRef(1);
  const pagesMerged = useRef(0);
  const currentSources = tool === 'images-to-pdf' ? imageSources : sources;
  const activeSource = currentSources.find((source) => source.id === activeSourceId) ?? null;
  previewState.current = { activeSourceId, showOutput, tool };
  const selectedOutput = outputPdfs[activeOutputIndex] ?? null;
  const previewFile = showOutput ? selectedOutput?.locked ? null : selectedOutput?.file ?? null : tool === 'images-to-pdf' ? null : activeSource?.file ?? null;
  const previewPages = showOutput
    ? tool === 'pdf-to-images' ? outputImages.length : outputPdfs[activeOutputIndex]?.locked ? 0 : outputPdfs[activeOutputIndex]?.pageCount ?? 0
    : activeSource ? pageCounts[activeSource.id] ?? 0 : 0;

  const clearOutput = useCallback(() => {
    outputUrls.current.forEach((url) => URL.revokeObjectURL(url));
    outputUrls.current = [];
    setOutputPdfs([]);
    setOutputImages([]);
    setActiveOutputIndex(0);
    setShowOutput(false);
    setMergeState({ kind: 'idle' });
    setProtectPassword('');
    setConfirmProtectPassword('');
    setUnlockPassword('');
    pagesMerged.current = 0;
  }, []);

  useEffect(() => () => {
    mergeRun.current += 1;
    worker.current?.terminate();
    imageRenderTask.current?.cancel();
    imageRenderTask.current = null;
    if (verificationTask.current) void verificationTask.current.destroy();
    outputUrls.current.forEach((url) => URL.revokeObjectURL(url));
    sourceUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const updatePageCount = useCallback((count: number) => {
    const { activeSourceId: sourceId, showOutput: viewingOutput, tool: selectedTool } = previewState.current;
    if (sourceId === null || viewingOutput || count < 1) return;
    setPageCounts((current) => ({ ...current, [sourceId]: count }));
    if (selectedTool === 'reorder') {
      setPageList((current) => current || Array.from({ length: count }, (_, index) => index + 1).join(', '));
    }
  }, []);

  const updateThumbnail = useCallback((dataUrl: string) => {
    if (activeSourceId === null || showOutput) return;
    setThumbnails((current) => current[activeSourceId] === dataUrl
      ? current
      : { ...current, [activeSourceId]: dataUrl });
  }, [activeSourceId, showOutput]);

  function addFiles(fileList: FileList | File[]) {
    if (mergeState.kind === 'running') return;
    const offered = Array.from(fileList);
    const images = tool === 'images-to-pdf';
    const supported = offered.filter((file) => images
      ? file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name)
      : file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (supported.length !== offered.length) setError(images
      ? 'Only PNG and JPEG images can be converted. Unsupported files were skipped.'
      : 'Only PDF files can be opened here. Unsupported files were skipped.');
    const files = supported;
    if (files.length === 0) return;
    clearOutput();
    if (supported.length === offered.length) setError(null);
    setNotice(images ? 'Images are ready to convert on this device.' : null);
    setUndoSources(null);
    setPageNumber(1);
    const added = files.map((file) => {
      const source: Source = { id: nextId.current++, file };
      if (images) {
        source.url = URL.createObjectURL(file);
        sourceUrls.current.push(source.url);
        setPageCounts((current) => ({ ...current, [source.id]: 1 }));
      }
      return source;
    });
    if (images) setImageSources((current) => [...current, ...added]);
    else setSources((current) => [...current, ...added]);
    setActiveSourceId((current) => current ?? added[0]?.id ?? null);
  }

  function openPicker() {
    fileInput.current?.click();
  }

  function selectSource(id: number) {
    setActiveSourceId(id);
    setShowOutput(false);
    setPageNumber(1);
    setProtectPassword('');
    setConfirmProtectPassword('');
    setUnlockPassword('');
    if (tool === 'reorder' && pageCounts[id]) setPageList(Array.from({ length: pageCounts[id] }, (_, index) => index + 1).join(', '));
    setError(null);
    setNotice(null);
  }

  function selectTool(nextTool: Tool) {
    if (mergeState.kind === 'running' || nextTool === tool) return;
    clearOutput();
    setTool(nextTool);
    const nextSources = nextTool === 'images-to-pdf' ? imageSources : sources;
    const nextSource = nextSources[0] ?? null;
    setActiveSourceId(nextSource?.id ?? null);
    setPageList(nextTool === 'reorder' && nextSource ? (pageCounts[nextSource.id] ? Array.from({ length: pageCounts[nextSource.id] }, (_, index) => index + 1).join(', ') : '') : '1');
    setPageNumber(1);
    setUndoSources(null);
    setSignatureBlob(null);
    setError(null);
    setNotice(null);
  }

  function moveSource(id: number, direction: -1 | 1) {
    if (mergeState.kind === 'running') return;
    const index = currentSources.findIndex((source) => source.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentSources.length) return;
    const next = [...currentSources];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setUndoSources(currentSources);
    clearOutput();
    if (tool === 'images-to-pdf') setImageSources(next);
    else setSources(next);
    setError(null);
    setNotice(null);
  }

  function removeSource(id: number) {
    if (mergeState.kind === 'running') return;
    const index = currentSources.findIndex((source) => source.id === id);
    const next = currentSources.filter((source) => source.id !== id);
    setUndoSources(null);
    clearOutput();
    if (tool === 'images-to-pdf') setImageSources(next);
    else setSources(next);
    const removed = currentSources[index];
    if (removed?.url) {
      URL.revokeObjectURL(removed.url);
      sourceUrls.current = sourceUrls.current.filter((url) => url !== removed.url);
    }
    setPageCounts((current) => {
      const counts = { ...current };
      delete counts[id];
      return counts;
    });
    setThumbnails((current) => {
      const nextThumbnails = { ...current };
      delete nextThumbnails[id];
      return nextThumbnails;
    });
    if (activeSourceId === id) setActiveSourceId(next[Math.min(index, next.length - 1)]?.id ?? null);
    setPageNumber(1);
    setError(null);
    setNotice(null);
  }

  function undoMove() {
    if (!undoSources || mergeState.kind === 'running') return;
    clearOutput();
    if (tool === 'images-to-pdf') setImageSources(undoSources);
    else setSources(undoSources);
    setUndoSources(null);
    setError(null);
    setNotice('Previous source order restored.');
  }

  function cancelMerge() {
    if (mergeState.kind !== 'running') return;
    mergeRun.current += 1;
    worker.current?.terminate();
    worker.current = null;
    imageRenderTask.current?.cancel();
    imageRenderTask.current = null;
    const task = verificationTask.current;
    verificationTask.current = null;
    if (task) void task.destroy();
    setMergeState({ kind: 'idle' });
    setNotice('Processing cancelled. Your source files are unchanged.');
  }

  function startMerge() {
    if (sources.length < 2 || mergeState.kind === 'running') return;
    const runId = ++mergeRun.current;
    const mergeSources = sources;
    clearOutput();
    setError(null);
    setNotice(null);
    setMergeState({ kind: 'running', completedFiles: 0, totalFiles: sources.length, fileName: 'Reading the first PDF', pagesDone: 0 });

    const currentWorker = new Worker(new URL('./merge.worker.ts', import.meta.url), { type: 'module' });
    worker.current = currentWorker;

    currentWorker.onmessage = (event: MessageEvent<MergeResponse>) => {
      if (runId !== mergeRun.current) return;
      const message = event.data;
      if (message.type === 'progress') {
        pagesMerged.current += message.pageCount;
        const source = mergeSources[message.completedFiles - 1];
        if (source) setPageCounts((current) => ({ ...current, [source.id]: message.pageCount }));
        setMergeState({
          kind: 'running',
          completedFiles: message.completedFiles,
          totalFiles: message.totalFiles,
          fileName: message.name,
          pagesDone: pagesMerged.current,
        });
        return;
      }

      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      if (message.type === 'error') {
        setMergeState({ kind: 'idle' });
        setError(message.message);
        return;
      }

      setMergeState({
        kind: 'running',
        completedFiles: mergeSources.length,
        totalFiles: mergeSources.length,
        fileName: 'Checking the merged PDF',
        pagesDone: pagesMerged.current,
      });
      void verifyAndKeepOutputs([{ name: 'folioyard-merged.pdf', bytes: message.bytes, pageCount: message.pageCount }], runId);
    };

    currentWorker.onerror = () => {
      if (runId !== mergeRun.current) return;
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('The merge worker stopped unexpectedly. Try fewer or smaller PDFs; your source files are still available.');
    };

    try {
      currentWorker.postMessage({ files: mergeSources.map(({ file }) => ({ name: file.name, file })) });
    } catch {
      if (runId !== mergeRun.current) return;
      currentWorker.terminate();
      worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('The PDFs could not be prepared for merging. Your source files are still available.');
    }
  }

  async function verifyAndKeepOutputs(
    files: Array<{ name: string; bytes: ArrayBuffer; pageCount: number; locked?: boolean }>,
    runId: number,
    successMessage?: string,
  ) {
    try {
      const validated: Array<{ file: File; pageCount: number; locked: boolean }> = [];
      for (const output of files) {
        if (runId !== mergeRun.current) return;
        const file = new File([output.bytes], output.name, { type: 'application/pdf' });
        if (output.locked) {
          validated.push({ file, pageCount: output.pageCount, locked: true });
          continue;
        }
        const { getDocument } = await import('./pdfjs');
        const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        verificationTask.current = task;
        try {
          const verified = await task.promise;
          if (runId !== mergeRun.current) return;
          if (verified.numPages !== output.pageCount) throw new Error(`“${output.name}” did not pass its page-count check.`);
          validated.push({ file, pageCount: verified.numPages, locked: false });
        } finally {
          if (verificationTask.current === task) {
            verificationTask.current = null;
            await task.destroy();
          }
        }
      }
      if (runId !== mergeRun.current) return;
      const created = validated.map(({ file, pageCount, locked }) => ({ file, pageCount, locked, url: URL.createObjectURL(file) }));
      outputUrls.current = created.map(({ url }) => url);
      setOutputPdfs(created);
      setOutputImages([]);
      setActiveOutputIndex(0);
      setShowOutput(true);
      setPageNumber(1);
      setMergeState({ kind: 'done', pageCount: created.reduce((sum, output) => sum + output.pageCount, 0), fileSize: created.reduce((sum, output) => sum + output.file.size, 0) });
      setNotice(successMessage ?? (created.length > 1 ? `${created.length} PDFs checked and ready to download.` : 'PDF checked and ready to download.'));
    } catch (verificationError) {
      if (runId !== mergeRun.current) return;
      setMergeState({ kind: 'idle' });
      setError(verificationError instanceof Error
        ? `${verificationError.message} No download was created; your source files are still available.`
        : 'The merged PDF failed validation. No download was created; your source files are still available.');
    }
  }

  async function startPageOperation() {
    if (!activeSource || mergeState.kind === 'running' || tool === 'merge' || tool === 'images-to-pdf' || tool === 'pdf-to-images') return;
    const count = pageCounts[activeSource.id] ?? 0;
    if (!count) {
      setError('Wait for the selected PDF preview to finish loading, then try again.');
      return;
    }

    let operation: PageOperation;
    try {
      if (tool === 'page-numbers') operation = { kind: 'page-numbers' };
      else if (tool === 'split') operation = { kind: 'split', afterPages: parsePageList(pageList, count, count - 1) };
      else if (tool === 'reorder') operation = { kind: 'reorder', pages: parsePageList(pageList, count) };
      else if (tool === 'extract') operation = { kind: 'extract', pages: parsePageList(pageList, count) };
      else if (tool === 'delete') operation = { kind: 'delete', pages: parsePageList(pageList, count) };
      else if (tool === 'rotate') operation = { kind: 'rotate', pages: parsePageList(pageList, count), degrees: rotation };
      else if (tool === 'watermark') operation = { kind: 'watermark', pages: parsePageList(pageList, count), text: watermarkText };
      else if (tool === 'annotate') operation = { kind: 'annotate', pages: parsePageList(pageList, count), text: annotationText };
      else operation = {
        kind: 'signature',
        pages: parsePageList(pageList, count),
        signaturePng: signatureBlob ? await signatureBlob.arrayBuffer() : undefined,
        signatureText,
      };
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Check the page numbers and try again.');
      return;
    }

    if (tool === 'signature' && !signatureBlob && !signatureText.trim()) {
      setError('Draw a visual signature or enter a name before continuing.');
      return;
    }
    runPageWorker({ kind: 'pdf', file: activeSource.file, operation }, count, 'page-operation');
  }

  function runPageWorker(request: PageOperationRequest, pageCount: number, operationLabel: string) {
    clearOutput();
    setError(null);
    setNotice(null);
    setMergeState({ kind: 'running', completedFiles: 0, totalFiles: 1, fileName: `Processing ${operationLabel}`, pagesDone: pageCount });
    const runId = ++mergeRun.current;
    const currentWorker = new Worker(new URL('./page-operation.worker.ts', import.meta.url), { type: 'module' });
    worker.current = currentWorker;
    currentWorker.onmessage = (event: MessageEvent<PageOperationResponse>) => {
      if (runId !== mergeRun.current) return;
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      const message = event.data;
      if (message.type === 'error') {
        setMergeState({ kind: 'idle' });
        setError(message.message);
        return;
      }
      setMergeState({ kind: 'running', completedFiles: 1, totalFiles: 1, fileName: 'Checking the exported PDFs', pagesDone: pageCount });
      void verifyAndKeepOutputs(message.files, runId);
    };
    currentWorker.onerror = () => {
      if (runId !== mergeRun.current) return;
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('Processing stopped unexpectedly. Try a smaller file; your source is unchanged.');
    };
    try {
      const transfer: Transferable[] = request.kind === 'pdf' && request.operation.kind === 'signature' && request.operation.signaturePng
        ? [request.operation.signaturePng]
        : [];
      currentWorker.postMessage(request, transfer);
    } catch {
      currentWorker.terminate();
      worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('The file could not be prepared for processing. Your source is unchanged.');
    }
  }

  function runPdfCpu(operation: PdfCpuOperation) {
    if (!activeSource || mergeState.kind === 'running') return;
    const source = activeSource;
    const password = operation === 'encrypt' ? protectPassword : operation === 'decrypt' ? unlockPassword : '';
    if (operation === 'encrypt') {
      const passwordBytes = new TextEncoder().encode(password).length;
      if (passwordBytes < 8 || passwordBytes > 127) {
        setError('Use a password between 8 and 127 UTF-8 bytes.');
        return;
      }
      if (password !== confirmProtectPassword) {
        setError('The password entries do not match.');
        return;
      }
    }
    if (operation === 'decrypt' && !password) {
      setError('Enter the PDF password to continue.');
      return;
    }

    clearOutput();
    setError(null);
    setNotice(null);
    const pageCount = pageCounts[source.id] ?? 0;
    setMergeState({
      kind: 'running',
      completedFiles: 0,
      totalFiles: 1,
      fileName: operation === 'compress' ? 'Compressing PDF' : operation === 'encrypt' ? 'Protecting PDF' : 'Unlocking PDF',
      pagesDone: pageCount,
    });
    const runId = ++mergeRun.current;
    let currentWorker: Worker;
    try {
      currentWorker = new Worker(new URL('./pdfcpu.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      setMergeState({ kind: 'idle' });
      setError('PDF processing could not start. Reload this page and try again.');
      return;
    }
    worker.current = currentWorker;
    currentWorker.onmessage = (event: MessageEvent<PdfCpuResponse>) => {
      if (runId !== mergeRun.current) return;
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      const message = event.data;
      if (message.type === 'error') {
        setMergeState({ kind: 'idle' });
        setError(message.message);
        return;
      }
      if (operation === 'compress' && message.bytes.byteLength >= source.file.size) {
        setMergeState({ kind: 'idle' });
        setNotice('Lossless optimization did not reduce the file size, so no download was created. Your original is unchanged.');
        return;
      }
      const name = source.file.name.replace(/\.pdf$/i, '');
      const suffix = operation === 'compress' ? 'compressed' : operation === 'encrypt' ? 'protected' : 'unlocked';
      const successMessage = operation === 'compress'
        ? `Reduced from ${formatBytes(source.file.size)} to ${formatBytes(message.bytes.byteLength)}${Math.round((1 - message.bytes.byteLength / source.file.size) * 100) > 0 ? ` (${Math.round((1 - message.bytes.byteLength / source.file.size) * 100)}%)` : ''}. Lossless; image quality is unchanged.`
        : operation === 'encrypt'
          ? 'Protected with AES-256. Save the password; Folioyard does not retain it.'
          : 'The unlocked PDF passed validation and is ready to download.';
      setMergeState({ kind: 'running', completedFiles: 1, totalFiles: 1, fileName: 'Checking the processed PDF', pagesDone: message.pageCount });
      void verifyAndKeepOutputs([{
        name: `${name}-${suffix}.pdf`,
        bytes: message.bytes,
        pageCount: message.pageCount,
        locked: operation === 'encrypt',
      }], runId, successMessage);
    };
    currentWorker.onerror = () => {
      if (runId !== mergeRun.current) return;
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('PDF processing stopped unexpectedly. Your source file is unchanged.');
    };
    try {
      currentWorker.postMessage({ file: source.file, operation, password });
      setProtectPassword('');
      setConfirmProtectPassword('');
      setUnlockPassword('');
    } catch {
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('The PDF could not be prepared for processing. Your source file is unchanged.');
    }
  }

  function startImagesToPdf() {
    if (!imageSources.length || mergeState.kind === 'running') return;
    runPageWorker({ kind: 'images-to-pdf', files: imageSources.map(({ file }) => file) }, imageSources.length, 'image conversion');
  }

  async function startPdfToImages() {
    if (!activeSource || mergeState.kind === 'running') return;
    const count = pageCounts[activeSource.id] ?? 0;
    let pages: number[];
    try {
      pages = parsePageList(pageList, count);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Check the page numbers and try again.');
      return;
    }

    clearOutput();
    setError(null);
    setNotice(null);
    const runId = ++mergeRun.current;
    setMergeState({ kind: 'running', completedFiles: 0, totalFiles: pages.length, fileName: 'Rendering PNG pages', pagesDone: 0 });
    let task: PDFDocumentLoadingTask | null = null;
    const created: OutputImage[] = [];
    const canvas = document.createElement('canvas');
    let committed = false;
    try {
      const { getDocument } = await import('./pdfjs');
      if (runId !== mergeRun.current) return;
      task = getDocument({ data: new Uint8Array(await activeSource.file.arrayBuffer()) });
      verificationTask.current = task;
      const pdf = await task.promise;
      for (const [index, sourcePageNumber] of pages.entries()) {
        if (runId !== mergeRun.current) return;
        const page = await pdf.getPage(sourcePageNumber);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 1800 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas is unavailable for PNG rendering.');
        // shortcut: render sequentially on the main thread, move it to a worker if large selections prove unresponsive.
        const renderTask = page.render({ canvas, canvasContext: context, viewport, background: 'rgb(255, 255, 255)' });
        imageRenderTask.current = renderTask;
        await renderTask.promise;
        imageRenderTask.current = null;
        if (runId !== mergeRun.current) return;
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((image) => image ? resolve(image) : reject(new Error(`Page ${sourcePageNumber} could not be saved as PNG.`)), 'image/png'));
        page.cleanup();
        const stem = activeSource.file.name.replace(/\.pdf$/i, '');
        const file = new File([blob], `${stem}-page-${String(sourcePageNumber).padStart(3, '0')}.png`, { type: 'image/png' });
        created.push({ file, url: URL.createObjectURL(file), pageNumber: sourcePageNumber });
        setMergeState({ kind: 'running', completedFiles: index + 1, totalFiles: pages.length, fileName: `Rendering page ${sourcePageNumber}`, pagesDone: index + 1 });
      }
      if (runId !== mergeRun.current) {
        created.forEach(({ url }) => URL.revokeObjectURL(url));
        return;
      }
      outputUrls.current = created.map(({ url }) => url);
      committed = true;
      setOutputPdfs([]);
      setOutputImages(created);
      setActiveOutputIndex(0);
      setShowOutput(true);
      setPageNumber(1);
      setMergeState({ kind: 'done', pageCount: created.length, fileSize: created.reduce((sum, image) => sum + image.file.size, 0) });
      setNotice(`${created.length} PNG ${created.length === 1 ? 'image' : 'images'} rendered and ready to download.`);
    } catch (renderError) {
      if (runId !== mergeRun.current) return;
      setMergeState({ kind: 'idle' });
      setError(renderError instanceof Error ? renderError.message : 'The PDF pages could not be rendered. Your source is unchanged.');
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      if (!committed) created.forEach(({ url }) => URL.revokeObjectURL(url));
      imageRenderTask.current = null;
      if (verificationTask.current === task && task) {
        verificationTask.current = null;
        await task.destroy();
      }
    }
  }

  function downloadOutput() {
    const output = outputEntries[activeOutputIndex];
    if (!output) return;
    const link = document.createElement('a');
    link.href = output.url;
    link.download = output.file.name;
    link.click();
  }

  function statusText() {
    if (error) return 'File needs attention';
    if (mergeState.kind === 'running') {
      if (mergeState.fileName.startsWith('Checking')) return 'Checking the exported document…';
      if (tool === 'pdf-to-images') return `Rendering ${mergeState.completedFiles} of ${mergeState.totalFiles} PNG pages…`;
      if (tool === 'images-to-pdf') return `Placing ${mergeState.pagesDone} of ${mergeState.totalFiles} images…`;
      if (tool === 'compress') return 'Compressing PDF losslessly on this device…';
      if (tool === 'protect') return 'Applying AES-256 protection on this device…';
      if (tool === 'unlock') return 'Unlocking PDF on this device…';
      if (tool !== 'merge') return `Processing ${pageCounts[activeSourceId ?? -1] ?? 0} pages…`;
      return mergeState.completedFiles === 0
        ? 'Reading the first PDF…'
        : `Added ${mergeState.completedFiles} of ${mergeState.totalFiles} PDFs · ${mergeState.pagesDone} pages so far`;
    }
    if (mergeState.kind === 'done') {
      if (['compress', 'protect', 'unlock'].includes(tool) && notice) return notice;
      return tool === 'pdf-to-images'
        ? `${outputImages.length} PNG ${outputImages.length === 1 ? 'image' : 'images'} · ${formatBytes(mergeState.fileSize)} · ready to download`
        : outputPdfs.length > 1
          ? `${outputPdfs.length} PDFs · ${mergeState.pageCount} pages · ready to download`
          : `${mergeState.pageCount} ${mergeState.pageCount === 1 ? 'page' : 'pages'} · ${formatBytes(mergeState.fileSize)} · ready to download`;
    }
    if (notice) return notice;
    if (tool === 'merge') return currentSources.length < 2 ? 'Add at least two PDFs to merge.' : `${currentSources.length} PDFs in order · processing stays on this device.`;
    if (tool === 'images-to-pdf') return imageSources.length ? `${imageSources.length} images in order · processing stays on this device.` : 'Add PNG or JPEG images to make a PDF.';
    return activeSource ? `Ready to process ${activeSource.file.name} on this device.` : 'Add a PDF, then choose the pages to process.';
  }

  const hasOutputs = outputPdfs.length > 0 || outputImages.length > 0;
  const outputEntries = tool === 'pdf-to-images'
    ? outputImages.map((output) => ({ file: output.file, url: output.url, detail: `Source page ${output.pageNumber}` }))
    : outputPdfs.map((output) => ({ file: output.file, url: output.url, detail: `${output.pageCount} pages${output.locked ? ' · password protected' : ''}` }));
  const selectedName = showOutput ? outputEntries[activeOutputIndex]?.file.name : activeSource?.file.name;
  const pageCount = activeSource ? pageCounts[activeSource.id] ?? 0 : 0;
  const pageFieldLabel = tool === 'split' ? 'Split after pages'
    : tool === 'reorder' ? 'New page order'
      : 'Pages';
  const pageFieldHint = tool === 'split' ? 'Each listed page ends a part. The last page is included automatically.'
    : tool === 'reorder' ? `List every page from 1 to ${pageCount}, once each.`
      : `Use page numbers or ranges, such as 1, 3-5. This PDF has ${pageCount} pages.`;

  return (
    <div className="app-frame">
      <header className="topbar">
        <a className="skip-link" href="#merge-workspace">Skip to document workspace</a>
        <div className="topbar-inner">
          <a className="brand-lockup" href="/" aria-label="Folioyard home">
            <img src="/folioyard-logo.png" alt="" width="150" height="38" />
          </a>
          <span className="topbar-divider" aria-hidden="true" />
          <span className="topbar-label">PDF workspace</span>
          <p className="privacy-note"><span className="privacy-dot" aria-hidden="true" />Files stay in this browser</p>
        </div>
      </header>

      <main className="app-shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PDF TOOL <span aria-hidden="true">/</span> {tools.find((item) => item.id === tool)?.title.toUpperCase()}</p>
            <h1>{tools.find((item) => item.id === tool)?.title}</h1>
            <p className="page-intro">{descriptions[tool]}</p>
          </div>
          <p className="session-note">No account. No upload.</p>
        </div>

        <div className="workspace-layout">
          <nav className="tool-rail" aria-label="PDF tools">
            <p className="tool-rail-label">PDF TOOLS</p>
            <ul className="tool-list">
              {tools.map((item) => (
                <li key={item.id}>
                  <button className="tool-link" type="button" aria-pressed={tool === item.id} disabled={mergeState.kind === 'running'} onClick={() => selectTool(item.id)}>
                    <span className="tool-link-mark" aria-hidden="true">{item.mark}</span>
                    <span>{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="tool-rail-note">Available PDF tools</p>
          </nav>
          <div className="workbench" id="merge-workspace">
          <section className="sources-panel" aria-labelledby="sources-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">01 <span aria-hidden="true">/</span> INPUT</p>
                <h2 id="sources-title">Source files <span className="count-label">{currentSources.length}</span></h2>
              </div>
              <button className="button button-secondary add-button" type="button" onClick={openPicker} disabled={mergeState.kind === 'running'}>
                {tool === 'images-to-pdf' ? 'Add images' : 'Add PDFs'}
              </button>
              <input
                ref={fileInput}
                className="visually-hidden"
                type="file"
                accept={tool === 'images-to-pdf' ? 'image/png,image/jpeg,.png,.jpg,.jpeg' : 'application/pdf,.pdf'}
                multiple
                aria-label={tool === 'images-to-pdf' ? 'Choose PNG or JPEG images' : 'Choose PDF files'}
                tabIndex={-1}
                onChange={(event) => {
                  addFiles(event.currentTarget.files ?? []);
                  event.currentTarget.value = '';
                }}
              />
            </div>

            {currentSources.length === 0 ? (
              <div
                className={`drop-zone${dragActive ? ' drop-zone--active' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  addFiles(event.dataTransfer.files);
                }}
              >
                <p className="drop-title">{tool === 'images-to-pdf' ? 'Drop PNG or JPEG images here' : 'Drop PDF files here'}</p>
                <p className="drop-copy">or choose files from your device</p>
                <button className="button button-primary" type="button" onClick={openPicker}>{tool === 'images-to-pdf' ? 'Choose images' : 'Choose PDFs'}</button>
                <p className="drop-footnote">Files are opened and processed on this device.</p>
              </div>
            ) : (
              <>
                <ol className="source-list" aria-label={tool === 'merge' ? 'PDF merge order' : tool === 'images-to-pdf' ? 'Image order' : 'PDF source files'}>
                  {currentSources.map((source, index) => (
                    <li className={`source-row${activeSourceId === source.id && !showOutput ? ' source-row--active' : ''}`} key={source.id}>
                      <span className="source-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      {source.url
                        ? <img className="source-thumbnail" src={source.url} alt={`Thumbnail of ${source.file.name}`} />
                        : thumbnails[source.id]
                        ? <img className="source-thumbnail" src={thumbnails[source.id]} alt={`First page of ${source.file.name}`} />
                        : <span className="source-thumbnail-placeholder" aria-hidden="true"><span /></span>}
                      <div className="source-information">
                        <button
                          className="source-name"
                          type="button"
                          onClick={() => selectSource(source.id)}
                          aria-pressed={activeSourceId === source.id && !showOutput}
                          disabled={mergeState.kind === 'running'}
                          title={source.file.name}
                        >
                          {source.file.name}
                        </button>
                        <span className="source-meta">
                          {formatBytes(source.file.size)}{pageCounts[source.id] ? ` · ${pageCounts[source.id]} ${pageCounts[source.id] === 1 ? 'page' : 'pages'}` : ''}
                        </span>
                      </div>
                      <div className="source-actions">
                        <button
                          className="move-button"
                          type="button"
                          aria-label={`Move ${source.file.name} up`}
                          title="Move up"
                          disabled={mergeState.kind === 'running' || index === 0}
                          onClick={() => moveSource(source.id, -1)}
                        >↑</button>
                        <button
                          className="move-button"
                          type="button"
                          aria-label={`Move ${source.file.name} down`}
                          title="Move down"
                          disabled={mergeState.kind === 'running' || index === currentSources.length - 1}
                          onClick={() => moveSource(source.id, 1)}
                        >↓</button>
                        <button
                          className="remove-button"
                          type="button"
                          aria-label={`Remove ${source.file.name}`}
                          disabled={mergeState.kind === 'running'}
                          onClick={() => removeSource(source.id)}
                        >Remove</button>
                      </div>
                    </li>
                  ))}
                </ol>
                <div
                  className={`add-strip${dragActive ? ' add-strip--active' : ''}`}
                  aria-disabled={mergeState.kind === 'running'}
                  onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    if (mergeState.kind !== 'running') addFiles(event.dataTransfer.files);
                  }}
                >
                  <span>{tool === 'images-to-pdf' ? 'Drop more images here' : 'Drop more PDFs here'}</span>
                  <div className="add-strip-actions">
                    {undoSources && <button type="button" className="text-button" aria-label="Undo last source move" onClick={undoMove} disabled={mergeState.kind === 'running'}>Undo</button>}
                    <button type="button" className="text-button" onClick={openPicker} disabled={mergeState.kind === 'running'}>Browse</button>
                  </div>
                </div>
              </>
            )}
            {!['merge', 'images-to-pdf', 'page-numbers', 'compress', 'protect', 'unlock'].includes(tool) && (
              <div className="operation-controls" aria-labelledby="operation-settings-title">
                <p className="eyebrow" id="operation-settings-title">{tool === 'watermark' || tool === 'annotate' || tool === 'signature' ? 'PAGE AND CONTENT SETTINGS' : 'PAGE SETTINGS'}</p>
                <label htmlFor="page-list">{tool === 'pdf-to-images' ? 'Pages to render' : pageFieldLabel}</label>
                <input id="page-list" type="text" value={pageList} placeholder={tool === 'reorder' ? '1, 2, 3' : tool === 'split' ? '2, 5' : '1, 3-5'} autoComplete="off" spellCheck={false} disabled={mergeState.kind === 'running'} aria-describedby="page-list-hint" onChange={(event) => {
                  setPageList(event.currentTarget.value);
                  setError(null);
                  if (hasOutputs) clearOutput();
                }} />
                <p className="field-hint" id="page-list-hint">{tool === 'pdf-to-images' ? `Choose pages for PNG output. This PDF has ${pageCount} pages.` : pageFieldHint}</p>
                {tool === 'rotate' && (
                  <label className="rotation-setting">Turn clockwise
                    <select value={rotation} disabled={mergeState.kind === 'running'} onChange={(event) => {
                      setRotation(Number(event.currentTarget.value) as 90 | 180 | 270);
                      if (outputPdfs.length) clearOutput();
                    }}>
                      <option value="90">90°</option>
                      <option value="180">180°</option>
                      <option value="270">270°</option>
                    </select>
                  </label>
                )}
                {tool === 'watermark' && <>
                  <label htmlFor="watermark-text">Watermark text</label>
                  <input id="watermark-text" type="text" maxLength={80} value={watermarkText} disabled={mergeState.kind === 'running'} onChange={(event) => setWatermarkText(event.currentTarget.value)} />
                  <p className="field-hint">A light diagonal mark appears on the selected pages.</p>
                </>}
                {tool === 'annotate' && <>
                  <label htmlFor="annotation-text">Short page note</label>
                  <textarea id="annotation-text" rows={2} maxLength={120} value={annotationText} disabled={mergeState.kind === 'running'} onChange={(event) => setAnnotationText(event.currentTarget.value)} />
                  <p className="field-hint">Adds a visible note near the top of each selected page.</p>
                </>}
                {tool === 'signature' && <>
                  <p className="field-label">Draw your visual signature</p>
                  <SignaturePad onChange={setSignatureBlob} />
                  <label htmlFor="signature-text">Or type a name</label>
                  <input id="signature-text" type="text" maxLength={80} value={signatureText} disabled={mergeState.kind === 'running'} onChange={(event) => setSignatureText(event.currentTarget.value)} />
                  <p className="field-hint">This adds a visual mark only. It is not a certificate-backed digital signature.</p>
                </>}
              </div>
            )}
            {tool === 'compress' && (
              <div className="operation-controls" aria-labelledby="operation-settings-title">
                <p className="eyebrow" id="operation-settings-title">COMPRESSION SETTINGS</p>
                <p className="field-hint">Lossless stream and resource optimization only. Images are not resampled. Files are limited to {formatBytes(PDFCPU_MAX_INPUT_BYTES)}; no download is offered unless the result is smaller.</p>
              </div>
            )}
            {tool === 'protect' && (
              <div className="operation-controls" aria-labelledby="operation-settings-title">
                <p className="eyebrow" id="operation-settings-title">PASSWORD SETTINGS</p>
                <label htmlFor="protect-password">Open password</label>
                <input id="protect-password" type="password" autoComplete="new-password" value={protectPassword} disabled={mergeState.kind === 'running'} aria-describedby="protect-password-hint" onChange={(event) => { setProtectPassword(event.currentTarget.value); setError(null); }} />
                <label htmlFor="confirm-protect-password">Confirm open password</label>
                <input id="confirm-protect-password" type="password" autoComplete="new-password" value={confirmProtectPassword} disabled={mergeState.kind === 'running'} onChange={(event) => { setConfirmProtectPassword(event.currentTarget.value); setError(null); }} />
                <p className="field-hint" id="protect-password-hint">Use 8–127 UTF-8 bytes. A separate random owner password is discarded after processing. Folioyard cannot recover your open password.</p>
              </div>
            )}
            {tool === 'unlock' && (
              <div className="operation-controls" aria-labelledby="operation-settings-title">
                <p className="eyebrow" id="operation-settings-title">UNLOCK SETTINGS</p>
                <label htmlFor="unlock-password">PDF password</label>
                <input id="unlock-password" type="password" autoComplete="current-password" value={unlockPassword} disabled={mergeState.kind === 'running'} aria-describedby="unlock-password-hint" onChange={(event) => { setUnlockPassword(event.currentTarget.value); setError(null); }} />
                <p className="field-hint" id="unlock-password-hint">The password is used on this device and cleared after processing.</p>
              </div>
            )}
            {tool === 'page-numbers' && activeSource && <p className="field-hint page-number-note">Page numbers will be added to every page in this PDF.</p>}
            {currentSources.length > 0 && (
              <aside className="fidelity-note" aria-label="PDF processing compatibility">
                <span className="fidelity-note-title">{tool === 'merge' ? 'Before you merge' : 'Before you continue'}</span>
                <p>{tool === 'pdf-to-images'
                  ? 'PNG pages are raster images. Text, links, and vector content will no longer be selectable.'
                  : tool === 'images-to-pdf'
                    ? 'Each image is placed on its own Letter page with a small margin. Original image metadata is not carried over.'
                    : tool === 'compress'
                      ? 'Compression is lossless. Embedded images are not resized or re-encoded, so some PDFs will not get smaller.'
                      : tool === 'protect'
                        ? 'AES-256 protects opening the file. Save the password somewhere safe; it is never sent to a server.'
                        : tool === 'unlock'
                          ? 'Unlocking creates an unprotected copy. Keep the downloaded file private like the original.'
                          : 'Forms become static pages. Bookmarks, attachments, and document details are not carried over. Digital signatures will no longer be valid.'}</p>
              </aside>
            )}
          </section>

          <section className="preview-panel" aria-labelledby="preview-title">
            <div className="preview-heading">
              <div className="preview-heading-main">
                <p className="eyebrow">02 <span aria-hidden="true">/</span> PREVIEW</p>
                <h2 id="preview-title">{showOutput ? tool === 'pdf-to-images' ? 'PNG output' : tool === 'merge' ? 'Merged output' : tool === 'split' && outputPdfs.length > 1 ? 'Split output' : selectedOutput?.locked ? 'Protected output' : 'Processed output' : 'Document preview'}</h2>
                <p className="preview-filename" title={selectedName ?? undefined}>{selectedName ?? 'No document selected'}</p>
              </div>
              {hasOutputs && (
                <div className="preview-tabs">
                  <button type="button" aria-pressed={!showOutput} onClick={() => { setShowOutput(false); setPageNumber(1); }}>Source</button>
                  <button type="button" aria-pressed={showOutput} onClick={() => { setShowOutput(true); setPageNumber(1); }}>{tool === 'pdf-to-images' ? 'PNG images' : tool === 'merge' ? 'Merged PDF' : selectedOutput?.locked ? 'Protected PDF' : 'Processed output'}</button>
                </div>
              )}
              {showOutput && tool !== 'pdf-to-images' && outputEntries.length > 1 && (
                <label className="output-select-label">View file
                  <select aria-label="Select split output file" value={activeOutputIndex} onChange={(event) => {
                    setActiveOutputIndex(Number(event.currentTarget.value));
                    setPageNumber(1);
                  }}>
                    {outputEntries.map((output, index) => <option value={index} key={output.file.name}>{output.file.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="preview-controls">
              <span className="folio-label">
                {showOutput ? 'OUTPUT' : activeSource ? `SOURCE ${String(currentSources.findIndex((source) => source.id === activeSource.id) + 1).padStart(2, '0')}` : 'NO SOURCE'}
              </span>
              <div className="page-navigation">
                <button className="page-button" type="button" aria-label="Previous page" disabled={!previewPages || pageNumber <= 1} onClick={() => {
                  const page = Math.max(1, pageNumber - 1);
                  setPageNumber(page);
                  if (showOutput && tool === 'pdf-to-images') setActiveOutputIndex(page - 1);
                }}>Previous</button>
                <span className="page-count" aria-live="polite">{previewPages ? `${pageNumber} / ${previewPages}` : '— / —'}</span>
                <button className="page-button" type="button" aria-label="Next page" disabled={!previewPages || pageNumber >= previewPages} onClick={() => {
                  const page = Math.min(previewPages, pageNumber + 1);
                  setPageNumber(page);
                  if (showOutput && tool === 'pdf-to-images') setActiveOutputIndex(page - 1);
                }}>Next</button>
              </div>
            </div>
            {showOutput && tool === 'pdf-to-images' && outputImages[activeOutputIndex] ? (
              <div className="preview-stage"><img className="rendered-image" src={outputImages[activeOutputIndex].url} alt={`PNG render of source page ${outputImages[activeOutputIndex].pageNumber}`} /></div>
            ) : !showOutput && tool === 'images-to-pdf' && activeSource?.url ? (
              <div className="preview-stage"><img className="rendered-image" src={activeSource.url} alt={activeSource.file.name} /></div>
            ) : showOutput && selectedOutput?.locked ? (
              <div className="preview-stage">
                <div className="preview-empty-state">
                  <span className="empty-page-mark" aria-hidden="true"><i /><i /><i /></span>
                  <p>Password-protected PDF</p>
                  <span>Download it and open it with the password you set. Folioyard does not keep the password.</span>
                </div>
              </div>
            ) : previewFile ? (
              <Suspense fallback={<div className="preview-stage"><output className="preview-message">Loading PDF renderer…</output></div>}>
                <PdfPreview file={previewFile} pageNumber={pageNumber} onPageCount={updatePageCount} onThumbnail={updateThumbnail} />
              </Suspense>
            ) : (
              <div className="preview-stage">
                <div className="preview-empty-state">
                  <span className="empty-page-mark" aria-hidden="true"><i /><i /><i /></span>
                  <p>Start with a document</p>
                  <span>{tool === 'images-to-pdf' ? 'Add images to check their order before conversion.' : tool === 'pdf-to-images' ? 'Select a PDF to render its pages as PNG images.' : 'Select a PDF to inspect its pages here.'}</span>
                </div>
              </div>
            )}
            {showOutput && outputEntries.length > 1 && (
              <details className="output-downloads">
                <summary>Download output files ({outputEntries.length})</summary>
                <ul>
                  {outputEntries.map((output) => (
                    <li key={output.file.name}>
                      <span>{output.file.name} · {output.detail}</span>
                      <a href={output.url} download={output.file.name}>Download</a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
        </div>
      </main>

      <footer className="action-bar">
        <div className="action-bar-inner">
          <div className="action-status" aria-live="polite" aria-atomic="true">
            {error ? <p className="inline-error" role="alert">{error}</p> : <p>{statusText()}</p>}
            <p className="resource-note">Large PDFs use more of your device memory.</p>
          </div>
          {mergeState.kind === 'running' ? (
            <button className="button button-secondary primary-action" type="button" onClick={cancelMerge}>{tool === 'merge' ? 'Cancel merge' : 'Cancel processing'}</button>
          ) : hasOutputs ? (
            <button className="button button-primary primary-action" type="button" onClick={downloadOutput}>
              {tool === 'pdf-to-images' ? `Download PNG ${activeOutputIndex + 1} of ${outputImages.length}` : outputPdfs.length > 1 ? `Download part ${activeOutputIndex + 1} of ${outputPdfs.length}` : tool === 'merge' ? 'Download merged PDF' : 'Download output PDF'}
            </button>
          ) : tool === 'merge' ? (
            <button className="button button-primary primary-action" type="button" onClick={startMerge} disabled={currentSources.length < 2}>Merge PDFs</button>
          ) : tool === 'images-to-pdf' ? (
            <button className="button button-primary primary-action" type="button" onClick={startImagesToPdf} disabled={!imageSources.length}>Create PDF</button>
          ) : tool === 'pdf-to-images' ? (
            <button className="button button-primary primary-action" type="button" onClick={() => void startPdfToImages()} disabled={!activeSource || !pageCount}>Render PNGs</button>
          ) : tool === 'compress' ? (
            <button className="button button-primary primary-action" type="button" onClick={() => runPdfCpu('compress')} disabled={!activeSource || !pageCount || activeSource.file.size > PDFCPU_MAX_INPUT_BYTES}>Compress PDF</button>
          ) : tool === 'protect' ? (
            <button className="button button-primary primary-action" type="button" onClick={() => runPdfCpu('encrypt')} disabled={!activeSource || !pageCount || activeSource.file.size > PDFCPU_MAX_INPUT_BYTES}>Protect PDF</button>
          ) : tool === 'unlock' ? (
            <button className="button button-primary primary-action" type="button" onClick={() => runPdfCpu('decrypt')} disabled={!activeSource || activeSource.file.size > PDFCPU_MAX_INPUT_BYTES}>Unlock PDF</button>
          ) : (
            <button className="button button-primary primary-action" type="button" onClick={startPageOperation} disabled={!activeSource || !pageCount}>
              {tool === 'split' ? 'Split PDF' : tool === 'extract' ? 'Extract pages' : tool === 'reorder' ? 'Save page order' : tool === 'rotate' ? 'Rotate pages' : tool === 'delete' ? 'Delete pages' : tool === 'watermark' ? 'Add watermark' : tool === 'page-numbers' ? 'Add page numbers' : tool === 'annotate' ? 'Add note' : 'Add visual signature'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
