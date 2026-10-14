import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

type Props = { onChange: (image: Blob | null) => void };

export default function SignaturePad({ onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const element = canvas.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * element.width / bounds.width,
      y: (event.clientY - bounds.top) * element.height / bounds.height,
    };
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const element = canvas.current;
    const next = point(event);
    const context = element?.getContext('2d');
    if (!context || !next) return;
    context.lineTo(next.x, next.y);
    context.stroke();
    setHasInk(true);
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!hasInk) {
      onChange(null);
      return;
    }
    canvas.current?.toBlob(onChange, 'image/png');
  }

  function clear() {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (element && context) context.clearRect(0, 0, element.width, element.height);
    setHasInk(false);
    onChange(null);
  }

  return (
    <div className="signature-pad">
      <canvas
        ref={canvas}
        width="720"
        height="240"
        aria-label="Draw a visual signature here"
        onPointerDown={(event) => {
          const element = canvas.current;
          const start = point(event);
          const context = element?.getContext('2d');
          if (!context || !start) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          context.beginPath();
          context.moveTo(start.x, start.y);
          context.strokeStyle = '#243b3b';
          context.lineWidth = 4;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          drawing.current = true;
        }}
        onPointerMove={draw}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
      <div className="signature-pad-footer">
        <span>{hasInk ? 'Drawn signature ready' : 'Use a mouse, touch, or stylus'}</span>
        <button className="text-button" type="button" onClick={clear} disabled={!hasInk}>Clear</button>
      </div>
    </div>
  );
}
