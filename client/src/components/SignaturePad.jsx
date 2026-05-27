import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * SignaturePad
 *
 * Props:
 *   value      {string}  – base64 PNG (controlled)
 *   onChange   {fn}      – called with new base64 PNG string, or '' when cleared
 *   label      {string}  – field label shown above the row
 *   width      {number}  – canvas width  (default 200)
 *   height     {number}  – canvas height (default 64)
 *   className  {string}  – wrapper className
 *
 * Layout: label on top, then a row of [ typed-name input | canvas ]
 */
export default function SignaturePad({
  value,
  onChange,
  label,
  width = 200,
  height = 64,
  className = '',
}) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [signerName, setSignerName] = useState('');

  /* ---------- helpers ---------- */

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const ctx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const c = canvas.getContext('2d');
    c.strokeStyle = '#1a1a2e';
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    return c;
  };

  /* ---------- draw events ---------- */

  const startDraw = useCallback((e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
    const c = ctx();
    if (!c) return;
    c.beginPath();
    c.arc(lastPos.current.x, lastPos.current.y, 1, 0, Math.PI * 2);
    c.fillStyle = '#1a1a2e';
    c.fill();
  }, []);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    const c = ctx();
    if (!c) return;
    c.beginPath();
    c.moveTo(lastPos.current.x, lastPos.current.y);
    c.lineTo(pos.x, pos.y);
    c.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  }, []);

  const stopDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange?.(canvas.toDataURL('image/png'));
  }, [onChange]);

  /* ---------- clear ---------- */

  const clear = useCallback((e) => {
    e?.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange?.('');
  }, [onChange]);

  /* ---------- restore value when modal opens ---------- */
  useEffect(() => {
    if (!value || !canvasRef.current || !isOpen) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current?.getContext('2d');
      if (c) {
        c.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        c.drawImage(img, 0, 0);
        setIsEmpty(false);
      }
    };
    img.src = value;
  }, [isOpen]);

  /* ---------- touch listeners (passive: false) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    return () => {
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [isOpen, startDraw, draw, stopDraw]);

  /* ---------- render ---------- */

  return (
    <div className={`${className}`}>
      {/* Field label (same style as the rest of the form) */}
      {label && (
        <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      )}

      {/* Row: typed name | signature preview trigger */}
      <div className="flex items-end gap-2 border-b-2 border-gray-400 pb-1">
        {/* Typed name on the left */}
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder-gray-300 min-w-0"
          placeholder="Print name"
          value={signerName}
          onChange={e => setSignerName(e.target.value)}
        />

        {/* Signature area on the right — click to open modal */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="shrink-0 flex items-center gap-1 border border-dashed border-gray-300 rounded px-2 py-0.5 hover:border-blue-400 transition-colors bg-white"
          style={{ minWidth: 90, minHeight: 36 }}
          title="Click to sign"
        >
          {value ? (
            <img src={value} alt="signature" className="h-7 max-w-[80px] object-contain" />
          ) : (
            <span className="text-xs text-gray-300 italic">Sign ✏️</span>
          )}
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-5"
            style={{ width: width + 40 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-gray-800">{label || 'Signature'}</div>
                <div className="text-xs text-gray-400">Draw your signature below</div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Canvas */}
            <div
              className="relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden"
              style={{ width, height }}
            >
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="absolute inset-0 cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
              />
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-300 select-none font-medium tracking-wide">
                    Draw signature here
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 gap-3">
              <button
                type="button"
                onClick={clear}
                disabled={isEmpty}
                className="text-xs text-red-400 hover:text-red-600 font-semibold disabled:opacity-30 transition-colors"
              >
                🗑 Clear
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { clear(); setIsOpen(false); }}
                  className="px-4 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isEmpty}
                  className="px-5 py-2 text-xs bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 disabled:opacity-40 transition-colors"
                >
                  Accept ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}