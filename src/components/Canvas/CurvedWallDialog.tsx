import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
interface Props {
  initialRadius: number;
  minRadius: number;
  wallStart: { x: number; y: number };
  wallEnd: { x: number; y: number };
  onRadiusChange: (radius: number) => void;
  onConfirm: (side: 1 | -1) => void;
  onCancel: () => void;
}
export const CurvedWallDialog: React.FC<Props> = ({
  initialRadius,
  minRadius,
  wallStart,
  wallEnd,
  onRadiusChange,
  onConfirm,
  onCancel,
}) => {
  const maxRadius = Math.max(50, minRadius);
  const safeMinRadius = Number.isFinite(minRadius) ? Math.max(0.01, minRadius) : 0.01;
  const clampRadius = (value: number) => Math.max(safeMinRadius, Math.min(maxRadius, value));
  const [radius, setRadius] = useState(() => clampRadius(Number.isFinite(initialRadius) ? initialRadius : safeMinRadius));
  const [inputStr, setInputStr] = useState(() => radius.toFixed(2));
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const radiusInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  useEffect(() => {
    const value = clampRadius(Number.isFinite(initialRadius) ? initialRadius : safeMinRadius);
    setRadius(value);
    setInputStr(value.toFixed(2));
    setError('');
  }, [initialRadius, minRadius]);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    radiusInputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [onCancel]);
  const dx = wallEnd.x - wallStart.x;
  const dy = wallEnd.y - wallStart.y;
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);
  const positiveSideDirection = isHorizontal
    ? (dx >= 0 ? 'down' : 'up')
    : (dy >= 0 ? 'left' : 'right');
  const directionOptions = isHorizontal
    ? [{ label: 'تقعر لأعلى', direction: 'up', icon: '↑' }, { label: 'تقعر لأسفل', direction: 'down', icon: '↓' }]
    : [{ label: 'تقعر لليمين', direction: 'right', icon: '→' }, { label: 'تقعر لليسار', direction: 'left', icon: '←' }];
  const commitRadius = (value: number) => {
    if (!Number.isFinite(value)) {
      setError('أدخل قيمة رقمية صحيحة لنصف القطر.');
      return false;
    }
    if (value < safeMinRadius || value > maxRadius) {
      setError(`يجب أن يكون نصف القطر بين ${safeMinRadius.toFixed(2)} و${maxRadius.toFixed(2)} متر.`);
      return false;
    }
    setRadius(value);
    setInputStr(value.toFixed(2));
    setError('');
    onRadiusChange(value);
    return true;
  };
  const parseInput = () => {
    const normalized = inputStr.trim().replace(/,/g, '.');
    if (!normalized || !/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      setError('أدخل رقماً صحيحاً أو عشرياً لنصف القطر.');
      return null;
    }
    const value = Number(normalized);
    return commitRadius(value) ? value : null;
  };
  const confirmDirection = (direction: string) => {
    if (parseInput() === null) return;
    onConfirm(direction === positiveSideDirection ? 1 : -1);
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', border: '1px solid #36839b', borderRadius: 10,
    padding: '11px 12px', background: '#0b2536', color: '#eafaff', fontSize: 16,
    textAlign: 'center', outlineOffset: 3,
  };
  const buttonStyle: React.CSSProperties = {
    flex: 1, minHeight: 74, padding: '12px 8px', borderRadius: 12,
    border: '1px solid #35b9d1', background: 'linear-gradient(145deg, #12536b, #103248)',
    color: '#e6fbff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
  };
  return createPortal(
    <div
      className="studio-ui-curved-wall-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(2, 11, 22, .78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, boxSizing: 'border-box' }}
    >
      <div
        ref={dialogRef}
        className="studio-ui-curved-wall-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        dir="rtl"
        style={{ width: 'min(100%, 430px)', maxHeight: 'min(90dvh, 760px)', overflowY: 'auto', boxSizing: 'border-box', background: 'linear-gradient(160deg, #102e42, #081a2a)', color: '#e9f7ff', border: '1px solid #327d94', borderRadius: 18, padding: '20px clamp(14px, 4vw, 24px)', boxShadow: '0 22px 70px rgba(0,0,0,.58), 0 0 24px rgba(0,203,235,.10)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div>
            <h2 id={titleId} style={{ fontSize: 19, margin: 0, color: '#a4f4ff' }}>الجدار المنحني</h2>
            <p id={descriptionId} style={{ margin: '8px 0 0', fontSize: 13, color: '#b4cad7', lineHeight: 1.7 }}>اضبط نصف قطر الجدار، ثم اختر جهة الانحناء لتطبيق التعديل.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="إغلاق نافذة الجدار المنحني" style={{ border: '1px solid #456779', borderRadius: 9, color: '#e6f5ff', background: '#18384c', cursor: 'pointer', fontSize: 21, width: 34, height: 34, flexShrink: 0 }}>×</button>
        </div>
        <section style={{ border: '1px solid #294f63', borderRadius: 12, padding: 14, marginTop: 18, background: 'rgba(8,30,47,.55)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <label htmlFor={`${titleId}-range`} style={{ fontSize: 14, fontWeight: 700 }}>نصف القطر</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#71eaff' }} dir="ltr">{radius.toFixed(2)} m</span>
          </div>
          <input id={`${titleId}-range`} type="range" min={safeMinRadius} max={maxRadius} step="0.01" value={radius} onChange={(event) => commitRadius(Number(event.target.value))} style={{ width: '100%', accentColor: '#22d6ec', cursor: 'pointer' }} />
          <label htmlFor={`${titleId}-input`} style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '16px 0 7px' }}>أو أدخل القيمة يدوياً (متر)</label>
          <input id={`${titleId}-input`} ref={radiusInputRef} type="text" inputMode="decimal" dir="ltr" value={inputStr} onChange={(event) => { setInputStr(event.target.value); setError(''); }} onFocus={(event) => event.target.select()} onBlur={() => { if (inputStr.trim()) parseInput(); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} style={inputStyle} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9bb9c8' }}>النطاق المسموح: {safeMinRadius.toFixed(2)} – {maxRadius.toFixed(2)} متر</p>
          {error && <p id={errorId} role="alert" style={{ margin: '10px 0 0', color: '#ffb2a8', fontSize: 13, lineHeight: 1.6 }}>{error}</p>}
        </section>
        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#d8f7ff' }}>جهة الانحناء</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {directionOptions.map((option) => (
              <button key={option.direction} type="button" onClick={() => confirmDirection(option.direction)} style={buttonStyle}>
                <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1, color: '#75f3ff' }}>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>
        <div style={{ marginTop: 18, borderTop: '1px solid #284d60', paddingTop: 14 }}>
          <button type="button" onClick={onCancel} style={{ width: '100%', minHeight: 42, border: '1px solid #547084', borderRadius: 10, background: '#1a3548', color: '#eaf6ff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>إلغاء</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
