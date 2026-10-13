import { useEffect, useRef, useState } from 'react';
import { getDocument, type PDFDocumentProxy } from './pdfjs';

type Props = {
  file: File | null;
  pageNumber: number;
  onPageCount: (count: number) => void;
  onThumbnail: (dataUrl: string) => void;
};

function previewError(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'PasswordException' || /password|encrypted/i.test(message)) {
    return 'This PDF is encrypted. Unlock it before using Folioyard.';
  }
  return 'This file could not be read as a PDF. Check that it is valid and try again.';
}

export default function PdfPreview({ file, pageNumber, onPageCount, onThumbnail }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [documentResult, setDocumentResult] = useState<{ file: File; pdf: PDFDocumentProxy | null; error: string | null } | null>(null);
  const [renderResult, setRenderResult] = useState<{ file: File; pageNumber: number; text: string; error: string | null } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 840, height: 740 });
  const currentDocument = documentResult?.file === file ? documentResult : null;
  const pdf = currentDocument?.pdf ?? null;
  const loading = Boolean(file && !currentDocument);
  const currentRender = renderResult?.file === file && renderResult.pageNumber === pageNumber ? renderResult : null;
  const error = currentDocument?.error ?? currentRender?.error ?? null;
  const pageText = currentRender?.text ?? '';

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

    if (!file) {
      return;
    }

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
        setDocumentResult({ file, pdf: document, error: null });
        onPageCount(document.numPages);
      } catch (loadError) {
        if (!cancelled) setDocumentResult({ file, pdf: null, error: previewError(loadError) });
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
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          background: 'rgb(255, 255, 255)',
        });
        const textPromise = page.getTextContent().then((content) => {
          const text = content.items.map((item) => ('str' in item ? item.str : '')).filter(Boolean).join(' ');
          if (!cancelled) setRenderResult({
            file,
            pageNumber,
            text: text || 'No selectable text was found on this page.',
            error: null,
          });
        });
        await Promise.all([renderTask.promise, textPromise]);
        if (!cancelled && pageNumber === 1) {
          const thumbnail = document.createElement('canvas');
          thumbnail.width = 48;
          thumbnail.height = 64;
          const thumbnailContext = thumbnail.getContext('2d');
          if (thumbnailContext) {
            const thumbnailScale = Math.min(thumbnail.width / canvas.width, thumbnail.height / canvas.height);
            const width = canvas.width * thumbnailScale;
            const height = canvas.height * thumbnailScale;
            thumbnailContext.fillStyle = '#FFFFFF';
            thumbnailContext.fillRect(0, 0, thumbnail.width, thumbnail.height);
            thumbnailContext.drawImage(canvas, (thumbnail.width - width) / 2, (thumbnail.height - height) / 2, width, height);
          }
          onThumbnail(thumbnail.toDataURL('image/jpeg', 0.72));
        }
      } catch (renderError) {
        if (!cancelled) setRenderResult({ file, pageNumber, text: '', error: previewError(renderError) });
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [file, onThumbnail, pageNumber, pdf, stageSize]);

  return (
    <div className="preview-stage" ref={stageRef} aria-busy={loading}>
      {!file && <p className="preview-empty">Add a PDF to see its pages here.</p>}
      {loading && <output className="preview-message">Opening PDF…</output>}
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
