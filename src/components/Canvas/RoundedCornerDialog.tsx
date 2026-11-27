import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  initialRadius: number;
  maxRadius: number;
  onRadiusChange: (radius: number) => void;
  onConfirm: (radius: number) => void;
  onCancel: () => void;
}
const MIN_RADIUS = 0.05;
export const RoundedCornerDialog: React.FC<Props> = ({
  initialRadius,
  maxRadius,
  onRadiusChange,
  onConfirm,
  onCancel,
}) => {
  const upperBound = Number.isFinite(maxRadius) ? maxRadius : MIN_RADIUS;
  const canEdit = upperBound >= MIN_RADIUS;
  const clamp = (value: number) => Math.min(upperBound, Math.max(MIN_RADIUS, value));
  const safeInitial = Number.isFinite(initialRadius) ? initialRadius : MIN_RADIUS;
  const [radius, setRadius] = useState(() => canEdit ? clamp(safeInitial) : MIN_RADIUS);
  const [inputStr, setInputStr] = useState(() => (canEdit ? clamp(safeInitial) : MIN_RADIUS).toFixed(2));
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  useEffect(() => {
    const next = canEdit ? clamp(safeInitial) : MIN_RADIUS;
    setRadius(next);
    setInputStr(next.toFixed(2));
    setError(canEdit ? '' : 'لا توجد مساحة كافية لتقويس هذا الركن.');
  }, [initialRadius, maxRadius]);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    
// ينتظر الحقل ضغط المستخدم قبل فتح لوحة المفاتيح.
    
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel]);
  const commitRadius = (value: number): boolean => {
    if (!canEdit || !Number.isFinite(value) || value < MIN_RADIUS || value > upperBound) {
      setError(`أدخل قيمة بين ${MIN_RADIUS.toFixed(2)} و${Math.max(0, upperBound).toFixed(2)} متر.`);
      return false;
    }
    const next = clamp(value);
    setRadius(next);
    setInputStr(next.toFixed(2));
    setError('');
    onRadiusChange(next);
    return true;
  };
  const parseInput = () => {
    const value = inputStr.trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(value)) {
      setError('أدخل رقماً صحيحاً لنصف قطر التقويس.');
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const handleBlur = () => {
    const parsed = parseInput();
    if (parsed !== null) commitRadius(parsed);
  };
  const handleConfirm = () => {
    const parsed = parseInput();
    if (parsed !== null && commitRadius(parsed)) onConfirm(parsed);
  };
  const inputStyle: React.CSSProperties = {
    boxSizing: 'border-box', width: '100%', padding: '12px 14px', borderRadius: 10,
    background: '#081c30', border: error ? '1px solid #fb7185' : '1px solid #36758c',
    color: '#e8fbff', fontSize: 16, fontWeight: 700, textAlign: 'center', outlineOffset: 2,
  };
  return createPortal(
    <div
      dir="rtl"
      style={{ position: 'fixed', inset: 0, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, boxSizing: 'border-box', background: 'rgba(1, 10, 23, .76)' }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ width: '100%', maxWidth: 300, maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', boxSizing: 'border-box', borderRadius: 16, border: '1px solid #27758d', background: 'linear-gradient(155deg, #112b43, #071a2e)', boxShadow: '0 24px 70px rgba(0,0,0,.6), 0 0 24px rgba(0,216,245,.12)', color: '#e8faff', padding: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <StudioIcon name="arc" size={23} />
          <h2 id={titleId} style={{ flex: 1, margin: 0, fontSize: 19 }}>تقويس الركن</h2>
          <button type="button" onClick={onCancel} aria-label="إغلاق النافذة" style={{ background: 'transparent', border: '1px solid #3d7186', color: '#e8faff', borderRadius: 8, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <StudioIcon name="close" size={19} />
          </button>
        </div>
        <p id={descriptionId} style={{ color: '#a9c5d4', fontSize: 13, lineHeight: 1.8, margin: '0 0 20px' }}>
          اضبط نصف قطر القوس، وستظهر المعاينة المباشرة على المسقط قبل التأكيد.
        </p>
        <div style={{ background: '#0b2238', border: '1px solid #254a63', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <label htmlFor={`${titleId}-slider`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            <span>نصف قطر التقويس</span>
            <span style={{ color: '#67e8f9', direction: 'ltr' }}>{(radius * 100).toFixed(0)} سم</span>
          </label>
          <input
            id={`${titleId}-slider`}
            type="range"
            min={MIN_RADIUS}
            max={Math.max(MIN_RADIUS, upperBound)}
            step={0.01}
            value={radius}
            disabled={!canEdit}
            onChange={(event) => commitRadius(Number(event.target.value))}
            style={{ width: '100%', accentColor: '#22d3ee', cursor: canEdit ? 'pointer' : 'not-allowed' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94b6c8', marginTop: 6 }}>
            <span>{MIN_RADIUS.toFixed(2)} م</span>
            <span>{Math.max(0, upperBound).toFixed(2)} م</span>
          </div>
        </div>
        <label htmlFor={`${titleId}-input`} style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>إدخال نصف القطر يدوياً (متر)</label>
        <input
          ref={inputRef}
          id={`${titleId}-input`}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={inputStr}
          disabled={!canEdit}
          onChange={(event) => { setInputStr(event.target.value); setError(''); }}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={handleBlur}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleConfirm(); } }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          style={inputStyle}
        />
        {error && <p id={errorId} role="alert" style={{ color: '#fda4af', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={handleConfirm} disabled={!canEdit} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: 0, background: '#0891b2', color: '#fff', fontWeight: 700, fontSize: 15, cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : .5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <StudioIcon name="check" size={17} /> تأكيد التقويس
          </button>
          <button type="button" onClick={onCancel} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #50778c', background: '#19354a', color: '#e8faff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>إلغاء</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
