import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { MergeResponse } from './merge-protocol';

const PdfPreview = lazy(() => import('./PdfPreview'));

type Source = { id: number; file: File };
type MergeState =
  | { kind: 'idle' }
  | { kind: 'running'; completedFiles: number; totalFiles: number; fileName: string; pagesDone: number }
  | { kind: 'done'; pageCount: number; fileSize: number };

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
  const [undoSources, setUndoSources] = useState<Source[] | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<number, number>>({});
  const [pageNumber, setPageNumber] = useState(1);
  const [showOutput, setShowOutput] = useState(false);
  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mergeState, setMergeState] = useState<MergeState>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const outputUrl = useRef<string | null>(null);
  const nextId = useRef(1);
  const pagesMerged = useRef(0);
  const activeSource = sources.find((source) => source.id === activeSourceId) ?? null;
  const previewFile = showOutput ? outputFile : activeSource?.file ?? null;
  const previewPages = showOutput ? (mergeState.kind === 'done' ? mergeState.pageCount : 0) : (activeSource ? pageCounts[activeSource.id] ?? 0 : 0);

  const clearOutput = useCallback(() => {
    if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
    outputUrl.current = null;
    setOutputFile(null);
    setDownloadUrl(null);
    setShowOutput(false);
    setMergeState({ kind: 'idle' });
    pagesMerged.current = 0;
  }, []);

  useEffect(() => () => {
    worker.current?.terminate();
    if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
  }, []);

  const updatePageCount = useCallback((count: number) => {
    if (activeSourceId === null || showOutput || count < 1) return;
    setPageCounts((current) => ({ ...current, [activeSourceId]: count }));
  }, [activeSourceId, showOutput]);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    clearOutput();
    setError(null);
    setNotice(null);
    setUndoSources(null);
    setPageNumber(1);
    const added = files.map((file) => ({ id: nextId.current++, file }));
    setSources((current) => [...current, ...added]);
    setActiveSourceId((current) => current ?? added[0]?.id ?? null);
  }

  function openPicker() {
    fileInput.current?.click();
  }

  function selectSource(id: number) {
    setActiveSourceId(id);
    setShowOutput(false);
    setPageNumber(1);
    setError(null);
    setNotice(null);
  }

  function moveSource(id: number, direction: -1 | 1) {
    if (mergeState.kind === 'running') return;
    const index = sources.findIndex((source) => source.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sources.length) return;
    const next = [...sources];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setUndoSources(sources);
    clearOutput();
    setSources(next);
    setError(null);
    setNotice(null);
  }

  function removeSource(id: number) {
    if (mergeState.kind === 'running') return;
    const index = sources.findIndex((source) => source.id === id);
    const next = sources.filter((source) => source.id !== id);
    setUndoSources(null);
    clearOutput();
    setSources(next);
    setPageCounts((current) => {
      const counts = { ...current };
      delete counts[id];
      return counts;
    });
    if (activeSourceId === id) setActiveSourceId(next[Math.min(index, next.length - 1)]?.id ?? null);
    setPageNumber(1);
    setError(null);
    setNotice(null);
  }

  function undoMove() {
    if (!undoSources || mergeState.kind === 'running') return;
    clearOutput();
    setSources(undoSources);
    setUndoSources(null);
    setError(null);
    setNotice('Previous source order restored.');
  }

  function cancelMerge() {
    if (mergeState.kind !== 'running') return;
    worker.current?.terminate();
    worker.current = null;
    setMergeState({ kind: 'idle' });
    setNotice('Merge cancelled. Your source files are unchanged.');
  }

  function startMerge() {
    if (sources.length < 2 || mergeState.kind === 'running') return;
    clearOutput();
    setError(null);
    setNotice(null);
    setMergeState({ kind: 'running', completedFiles: 0, totalFiles: sources.length, fileName: 'Reading the first PDF', pagesDone: 0 });

    const currentWorker = new Worker(new URL('./merge.worker.ts', import.meta.url), { type: 'module' });
    worker.current = currentWorker;

    currentWorker.onmessage = (event: MessageEvent<MergeResponse>) => {
      const message = event.data;
      if (message.type === 'progress') {
        pagesMerged.current += message.pageCount;
        const source = sources[message.completedFiles - 1];
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
        completedFiles: sources.length,
        totalFiles: sources.length,
        fileName: 'Checking the merged PDF',
        pagesDone: pagesMerged.current,
      });
      void verifyAndKeepOutput(message);
    };

    currentWorker.onerror = () => {
      currentWorker.terminate();
      if (worker.current === currentWorker) worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('The merge worker stopped unexpectedly. Try fewer or smaller PDFs; your source files are still available.');
    };

    try {
      currentWorker.postMessage({ files: sources.map(({ file }) => ({ name: file.name, file })) });
    } catch {
      currentWorker.terminate();
      worker.current = null;
      setMergeState({ kind: 'idle' });
      setError('The PDFs could not be prepared for merging. Your source files are still available.');
    }
  }

  async function verifyAndKeepOutput(message: Extract<MergeResponse, { type: 'success' }>) {
    try {
      if (message.pageCount !== pagesMerged.current) throw new Error('The merged page count does not match the source pages.');
      const merged = new File([message.bytes], 'folioyard-merged.pdf', { type: 'application/pdf' });
      const { getDocument } = await import('./pdfjs');
      const verificationTask = getDocument({ data: new Uint8Array(await merged.arrayBuffer()) });
      const verified = await verificationTask.promise;
      const actualPages = verified.numPages;
      await verificationTask.destroy();
      if (actualPages !== message.pageCount) throw new Error('The merged PDF did not pass its page-count check.');

      const url = URL.createObjectURL(merged);
      outputUrl.current = url;
      setOutputFile(merged);
      setDownloadUrl(url);
      setShowOutput(true);
      setPageNumber(1);
      setMergeState({ kind: 'done', pageCount: actualPages, fileSize: merged.size });
      setNotice('Merged PDF checked and ready to download.');
    } catch (verificationError) {
      setMergeState({ kind: 'idle' });
      setError(verificationError instanceof Error
        ? `${verificationError.message} No download was created; your source files are still available.`
        : 'The merged PDF failed validation. No download was created; your source files are still available.');
    }
  }

  function downloadOutput() {
    if (!downloadUrl || !outputFile) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = outputFile.name;
    link.click();
  }

  function statusText() {
    if (error) return 'Merge needs attention';
    if (mergeState.kind === 'running') {
      if (mergeState.fileName === 'Checking the merged PDF') return 'Checking the exported document…';
      return mergeState.completedFiles === 0
        ? 'Reading the first PDF…'
        : `Added ${mergeState.completedFiles} of ${mergeState.totalFiles} PDFs · ${mergeState.pagesDone} pages so far`;
    }
    if (mergeState.kind === 'done') return `${mergeState.pageCount} pages · ${formatBytes(mergeState.fileSize)} · ready to download`;
    if (notice) return notice;
    if (sources.length < 2) return 'Add at least two PDFs to merge.';
    return `${sources.length} PDFs in order · processing stays on this device.`;
  }

  const selectedName = showOutput ? outputFile?.name : activeSource?.file.name;

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="wordmark">folioyard</span>
          <span className="topbar-divider" aria-hidden="true" />
          <span className="topbar-label">PDF workspace</span>
          <p className="privacy-note"><span className="privacy-dot" aria-hidden="true" />Files stay in this browser</p>
        </div>
      </header>

      <main className="app-shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PDF TOOL <span aria-hidden="true">/</span> MERGE</p>
            <h1>Merge PDF</h1>
            <p className="page-intro">Put documents in order, check the pages, then save one PDF.</p>
          </div>
          <p className="session-note">No account. No upload.</p>
        </div>

        <div className="workbench">
          <section className="sources-panel" aria-labelledby="sources-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">01 <span aria-hidden="true">/</span> INPUT</p>
                <h2 id="sources-title">Source files <span className="count-label">{sources.length}</span></h2>
              </div>
              <button className="button button-secondary add-button" type="button" onClick={openPicker} disabled={mergeState.kind === 'running'}>
                Add PDFs
              </button>
              <input
                ref={fileInput}
                className="visually-hidden"
                type="file"
                accept="application/pdf,.pdf"
                multiple
                aria-label="Choose PDF files"
                tabIndex={-1}
                onChange={(event) => {
                  addFiles(event.currentTarget.files ?? []);
                  event.currentTarget.value = '';
                }}
              />
            </div>

            {sources.length === 0 ? (
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
                <p className="drop-title">Drop PDF files here</p>
                <p className="drop-copy">or choose files from your device</p>
                <button className="button button-primary" type="button" onClick={openPicker}>Choose PDFs</button>
                <p className="drop-footnote">Files are opened in this tab for preview and merging.</p>
              </div>
            ) : (
              <>
                <ol className="source-list" aria-label="PDF merge order">
                  {sources.map((source, index) => (
                    <li className={`source-row${activeSourceId === source.id && !showOutput ? ' source-row--active' : ''}`} key={source.id}>
                      <span className="source-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
                          {formatBytes(source.file.size)}{pageCounts[source.id] ? ` · ${pageCounts[source.id]} pages` : ''}
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
                          disabled={mergeState.kind === 'running' || index === sources.length - 1}
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
                  <span>Drop more PDFs here</span>
                  <div className="add-strip-actions">
                    {undoSources && <button type="button" className="text-button" aria-label="Undo last source move" onClick={undoMove} disabled={mergeState.kind === 'running'}>Undo</button>}
                    <button type="button" className="text-button" onClick={openPicker} disabled={mergeState.kind === 'running'}>Browse</button>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="preview-panel" aria-labelledby="preview-title">
            <div className="preview-heading">
              <div className="preview-heading-main">
                <p className="eyebrow">02 <span aria-hidden="true">/</span> PREVIEW</p>
                <h2 id="preview-title">{showOutput ? 'Merged output' : 'Page preview'}</h2>
                <p className="preview-filename" title={selectedName ?? undefined}>{selectedName ?? 'No document selected'}</p>
              </div>
              {outputFile && (
                <div className="preview-tabs" role="group" aria-label="Preview source or merged output">
                  <button type="button" aria-pressed={!showOutput} onClick={() => { setShowOutput(false); setPageNumber(1); }}>Source</button>
                  <button type="button" aria-pressed={showOutput} onClick={() => { setShowOutput(true); setPageNumber(1); }}>Merged output</button>
                </div>
              )}
            </div>
            <div className="preview-controls">
              <span className="folio-label">
                {showOutput ? 'OUTPUT' : activeSource ? `SOURCE ${String(sources.findIndex((source) => source.id === activeSource.id) + 1).padStart(2, '0')}` : 'NO SOURCE'}
              </span>
              <div className="page-navigation">
                <button className="page-button" type="button" aria-label="Previous page" disabled={!previewPages || pageNumber <= 1} onClick={() => setPageNumber((page) => Math.max(1, page - 1))}>Previous</button>
                <span className="page-count" aria-live="polite">{previewPages ? `${pageNumber} / ${previewPages}` : '— / —'}</span>
                <button className="page-button" type="button" aria-label="Next page" disabled={!previewPages || pageNumber >= previewPages} onClick={() => setPageNumber((page) => Math.min(previewPages, page + 1))}>Next</button>
              </div>
            </div>
            {previewFile ? (
              <Suspense fallback={<div className="preview-stage"><p className="preview-message" role="status">Loading PDF renderer…</p></div>}>
                <PdfPreview file={previewFile} pageNumber={pageNumber} onPageCount={updatePageCount} />
              </Suspense>
            ) : (
              <div className="preview-stage"><p className="preview-empty">Add a PDF to see its pages here.</p></div>
            )}
          </section>
        </div>
      </main>

      <footer className="action-bar">
        <div className="action-bar-inner">
          <div className="action-status" aria-live="polite" aria-atomic="true">
            {error ? <p className="inline-error" role="alert">{error}</p> : <p>{statusText()}</p>}
            <p className="resource-note">Large PDFs use more of your device memory.</p>
          </div>
          {mergeState.kind === 'running' ? (
            <button className="button button-secondary primary-action" type="button" onClick={cancelMerge}>Cancel merge</button>
          ) : outputFile && downloadUrl ? (
            <button className="button button-primary primary-action" type="button" onClick={downloadOutput}>Download merged PDF</button>
          ) : (
            <button className="button button-primary primary-action" type="button" onClick={startMerge} disabled={sources.length < 2}>Merge PDFs</button>
          )}
        </div>
      </footer>
    </div>
  );
}
