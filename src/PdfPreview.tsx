import { useEffect, useRef, useState } from 'react';
import { getDocument, type PDFDocumentProxy } from './pdfjs';

type Props = {
  file: File | null;
  pageNumber: number;
  onPageCount: (count: number) => void;
};

function previewError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'PasswordException' || /password|encrypted/i.test(message)) {
    return 'This PDF is encrypted. Unlock it before using Folioyard Merge.';
  }
  return 'This file could not be read as a PDF. Check that it is valid and try again.';
}

export default function PdfPreview({ file, pageNumber, onPageCount }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [stageSize, setStageSize] = useState({ width: 840, height: 740 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageText, setPageText] = useState('');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    setPdf(null);
    setPageText('');
    setError(null);
    onPageCount(0);

    if (!file) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (cancelled) return;
        loadingTask = getDocument({ data: bytes });
        const document = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy();
          return;
        }
        setPdf(document);
        onPageCount(document.numPages);
      } catch (loadError) {
        if (!cancelled) setError(previewError(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [file, onPageCount]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !file) return;
    let cancelled = false;
    let renderTask: { promise: Promise<unknown>; cancel: () => void } | null = null;
    const canvas = canvasRef.current;

    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(stageSize.width / baseViewport.width, stageSize.height / baseViewport.height, 1.35);
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas is unavailable');

        canvas.width = Math.ceil(viewport.width * outputScale);
        canvas.height = Math.ceil(viewport.height * outputScale);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        setPageText('');
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          background: 'rgb(255, 255, 255)',
        });
        const textPromise = page.getTextContent().then((content) => {
          const text = content.items.map((item) => ('str' in item ? item.str : '')).filter(Boolean).join(' ');
          if (!cancelled) setPageText(text || 'No selectable text was found on this page.');
        });
        await Promise.all([renderTask.promise, textPromise]);
      } catch (renderError) {
        if (!cancelled) setError(previewError(renderError));
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [file, pageNumber, pdf, stageSize]);

  return (
    <div className="preview-stage" ref={stageRef} aria-busy={loading}>
      {!file && <p className="preview-empty">Add a PDF to see its pages here.</p>}
      {loading && <p className="preview-message" role="status">Opening PDF…</p>}
      {error && <p className="preview-message preview-message--error" role="alert">{error}</p>}
      {file && !loading && !error && pdf && (
        <div className="paper-wrap">
          <canvas ref={canvasRef} aria-hidden="true" />
          <p className="visually-hidden" aria-live="polite">
            {pageText ? `Text from ${file.name}, page ${pageNumber}: ${pageText}` : `Preview of ${file.name}, page ${pageNumber}.`}
          </p>
        </div>
      )}
    </div>
  );
}
