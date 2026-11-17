import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
type Props = { value: string; onApply: (hex: string) => void; onClose: () => void; title?: string };
type HSV = { h: number; s: number; v: number };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const normalizeHex = (s: string) => /^#?[0-9a-f]{6}$/i.test(s.trim()) ? `#${s.trim().replace(/^#/, '').toUpperCase()}` : null;
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map(n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const hsvToHex = ({ h, s, v }: HSV) => {
  const f = (n: number) => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)) * 255; };
  return rgbToHex(f(5), f(3), f(1));
};
const hexToHsv = (hex: string): HSV => {
  const n = normalizeHex(hex) || '#FFFFFF';
  const [r, g, b] = [1, 3, 5].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) { if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
};
const presets = ['#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#0088FF', '#0000FF', '#FF00FF', '#FFFFFF', '#888888', '#000000', '#8040C0'];
const button: React.CSSProperties = { border: '1px solid #41647b', borderRadius: 6, background: '#17394d', color: '#eaf7ff', fontSize: 11, padding: '5px 8px', cursor: 'pointer' };
export const AdvancedColorPicker: React.FC<Props> = ({ value, onApply, onClose, title = 'اختيار اللون المخصص' }) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexText, setHexText] = useState(() => normalizeHex(value) || '#FFFFFF');
  const id = useId();
  const squareRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const hex = hsvToHex(hsv);
  const setColor = (next: HSV) => { setHsv(next); setHexText(hsvToHex(next)); };
  const trackSquare = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = squareRef.current?.getBoundingClientRect(); if (!rect) return;
    setColor({ ...hsv, s: clamp((event.clientX - rect.left) / rect.width, 0, 1), v: 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1) });
  };
  const trackHue = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = hueRef.current?.getBoundingClientRect(); if (!rect) return;
    setColor({ ...hsv, h: clamp((event.clientX - rect.left) / rect.width, 0, 1) * 359.999 });
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return createPortal(
    <div dir="rtl" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 2147483646, background: '#0009', display: 'grid', placeItems: 'center', padding: 6, boxSizing: 'border-box' }}>
      <div role="dialog" aria-modal="true" aria-labelledby={id}
        style={{ width: '50vw', height: '50dvh', minWidth: 'min(240px, 96vw)', minHeight: 'min(290px, 90dvh)', maxWidth: '96vw', maxHeight: '90dvh', boxSizing: 'border-box', overflowY: 'auto', overscrollBehavior: 'contain', padding: 9, borderRadius: 12, border: '1px solid #48758d', background: '#102638', color: '#eaf7ff', boxShadow: '0 15px 45px #0009', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <strong id={id} style={{ fontSize: 12 }}>{title}</strong>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={button}>✕</button>
        </div>
        <div ref={squareRef} role="slider" tabIndex={0} aria-label="التشبع والإضاءة" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsv.s * 100)}
          onKeyDown={event => { if (event.key === 'ArrowRight') setColor({ ...hsv, s: clamp(hsv.s + .01, 0, 1) }); if (event.key === 'ArrowLeft') setColor({ ...hsv, s: clamp(hsv.s - .01, 0, 1) }); if (event.key === 'ArrowUp') setColor({ ...hsv, v: clamp(hsv.v + .01, 0, 1) }); if (event.key === 'ArrowDown') setColor({ ...hsv, v: clamp(hsv.v - .01, 0, 1) }); }}
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); trackSquare(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) trackSquare(event); }}
          style={{ position: 'relative', flex: '1 1 90px', minHeight: 75, borderRadius: 7, border: '1px solid #67849b', touchAction: 'none', cursor: 'crosshair', background: `linear-gradient(to top, #000, transparent), linear-gradient(to left, hsl(${hsv.h}, 100%, 50%), #fff)` }}>
          <span style={{ position: 'absolute', left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, width: 11, height: 11, border: '2px solid white', borderRadius: '50%', boxShadow: '0 0 2px #000', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        </div>
        <div ref={hueRef} role="slider" tabIndex={0} aria-label="تدرج اللون" aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(hsv.h)}
          onKeyDown={event => { if (event.key === 'ArrowRight') setColor({ ...hsv, h: (hsv.h + 1) % 360 }); if (event.key === 'ArrowLeft') setColor({ ...hsv, h: (hsv.h + 359) % 360 }); }}
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); trackHue(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) trackHue(event); }}
          style={{ height: 15, flexShrink: 0, position: 'relative', borderRadius: 6, touchAction: 'none', cursor: 'pointer', background: 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)' }}>
          <span style={{ position: 'absolute', left: `${hsv.h / 360 * 100}%`, top: -2, height: 19, width: 5, borderRadius: 3, border: '1px solid #333', background: '#fff', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>HEX
            <input dir="ltr" aria-label="رمز اللون HEX" value={hexText} onChange={event => { const text = event.target.value; setHexText(text); const valid = normalizeHex(text); if (valid) setHsv(hexToHsv(valid)); }} onBlur={() => setHexText(hex)} maxLength={7}
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '4px', borderRadius: 5, border: `1px solid ${normalizeHex(hexText) ? '#54788c' : '#e66'}`, color: '#fff', background: '#091c2b', fontSize: 11 }} />
          </label>
          <div aria-label={`معاينة اللون ${hex}`} title={hex} style={{ width: 28, height: 26, background: hex, borderRadius: 5, border: '1px solid #c5d6e2' }} />
        </div>
        <div aria-label="ألوان جاهزة" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 3 }}>
          {presets.map(color => <button key={color} type="button" title={color} aria-label={`اختيار ${color}`} onClick={() => setColor(hexToHsv(color))} style={{ minWidth: 0, aspectRatio: '1', padding: 0, border: '1px solid #b3c3ce', borderRadius: 3, background: color, cursor: 'pointer' }} />)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => onApply(hex)} style={{ ...button, flex: 1, background: '#087e9c', borderColor: '#36c8df' }}>تطبيق اللون</button>
          <button type="button" onClick={onClose} style={{ ...button, flex: 1 }}>إلغاء</button>
        </div>
      </div>
    </div>, document.body
  );
};
