import { useEffect, useId, useRef, useState } from 'react';
import { PenLine, Trash2, Upload } from 'lucide-react';

type Props = { label: string; value: string; onChange: (value: string) => void };

const WIDTH = 320;
const HEIGHT = 96;

export function SignatureField({ label, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const inputId = useId();
  const [error, setError] = useState('');

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.strokeStyle = '#111827';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  };

  useEffect(() => {
    resetCanvas();
    if (!value) return;
    const image = new Image();
    image.onload = () => canvasRef.current?.getContext('2d')?.drawImage(image, 0, 0, WIDTH, HEIGHT);
    image.src = value;
  }, [value]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * WIDTH / bounds.width, y: (event.clientY - bounds.top) * HEIGHT / bounds.height };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    lastPoint.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext('2d');
    const next = point(event);
    if (!context) return;
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPoint.current = next;
  };

  const finishDrawing = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current?.toDataURL('image/jpeg', 0.7) || '');
  };

  const upload = (file?: File) => {
    setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('Choose a PNG or JPEG image.');
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resetCanvas();
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      const scale = Math.min(WIDTH / image.width, HEIGHT / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      onChange(canvas.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(source);
    };
    image.onerror = () => { setError('Could not read that image.'); URL.revokeObjectURL(source); };
    image.src = source;
  };

  const clear = () => { resetCanvas(); setError(''); onChange(''); };

  return <div className="mt-3 space-y-2">
    <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700"><PenLine size={14} />{label}</span><div className="flex items-center gap-1">
      <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50"><Upload size={13} />Upload</label>
      <input id={inputId} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ''; }} />
      <button type="button" onClick={clear} disabled={!value} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={13} />Clear</button>
    </div></div>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={`Draw ${label.toLowerCase()}`} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} className="h-24 w-full touch-none cursor-crosshair bg-white ring-1 ring-slate-200" />
    <p className="text-xs text-slate-500">Draw above or upload a PNG/JPEG. Optional.</p>
    {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
  </div>;
}

