import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool, Upload, Check } from 'lucide-react';

interface SignaturePadCanvasProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
  height?: number;
}

export const SignaturePadCanvas: React.FC<SignaturePadCanvasProps> = ({
  value,
  onChange,
  label = 'Dibujar firma manuscrita',
  height = 170,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.4;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasStrokes(true);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasStrokes(false);
    }
  }, [value]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasStrokes(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStrokes(false);
    onChange(undefined);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-sky-600" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="w-3.5 h-3.5" /> Subir PNG
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            <Eraser className="w-3.5 h-3.5" /> Limpiar
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={560}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full touch-none cursor-crosshair block bg-white"
          style={{ height: `${height}px` }}
        />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Firme aquí con el mouse, lápiz táctil o dedo
          </div>
        )}
        {hasStrokes && (
          <span className="pointer-events-none absolute bottom-2 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
            <Check className="w-3 h-3" /> Firma capturada
          </span>
        )}
      </div>
    </div>
  );
};
