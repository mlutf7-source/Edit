import React, { useEffect, useId, useState } from 'react';
import type { RoundedCorner, Wall } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  corner: RoundedCorner;
  walls: Wall[];
  onUpdate: (id: string, radius: number) => void;
  onCommit: () => void;
  onDelete: (id: string) => void;
  onDeselect: () => void;
}
const normalizeNumber = (value: string): string => value
  .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
  .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
  .replace(/[٫،,]/g, '.')
  .replace(/\u066c/g, '');
const parseRadius = (value: string): number | null => {
  const normalized = normalizeNumber(value).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};
const buttonBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  minHeight: 38, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
export const RoundedCornerProperties: React.FC<Props> = ({
  corner, walls, onUpdate, onCommit, onDelete, onDeselect,
}) => {
  const wallA = walls.find(w => w.id === corner.wallAId);
  const wallB = walls.find(w => w.id === corner.wallBId);
  const maxRadius = (() => {
    if (!wallA || !wallB) return 2;
    const lenA = Math.hypot(wallA.end.x - wallA.start.x, wallA.end.y - wallA.start.y);
    const lenB = Math.hypot(wallB.end.x - wallB.start.x, wallB.end.y - wallB.start.y);
    return Math.max(0.1, Math.min(lenA, lenB) / 2);
  })();
  const minRadius = Math.min(0.05, maxRadius);
  const [inputStr, setInputStr] = useState(corner.radius.toFixed(2));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const radiusId = useId();
  const errorId = useId();
  useEffect(() => {
    setInputStr(corner.radius.toFixed(2));
    setError('');
  }, [corner.id, corner.radius]);
  useEffect(() => setConfirmDelete(false), [corner.id]);
  const applyRadius = (): boolean => {
    const parsed = parseRadius(inputStr);
    if (parsed === null || parsed < minRadius || parsed > maxRadius) {
      setError(`أدخل نصف قطر بين ${minRadius.toFixed(2)} و${maxRadius.toFixed(2)} متر.`);
      return false;
    }
    setError('');
    if (Math.abs(parsed - corner.radius) > 0.000001) {
      onUpdate(corner.id, parsed);
      onCommit();
    }
    setInputStr(parsed.toFixed(2));
    return true;
  };
  return (
    <section
      aria-label="خصائص الركن المقوس"
      dir="rtl"
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 200,
        width: 'min(290px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 110px)',
        overflowY: 'auto', boxSizing: 'border-box', borderRadius: 13,
        padding: 14, direction: 'rtl', color: '#e9faff',
        background: 'linear-gradient(140deg, #112d40, #091b2a)',
        border: '1px solid rgba(73, 213, 235, 0.55)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.45)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14 }}>
          <StudioIcon name="arc" size={18} /> خصائص الركن المقوس
        </span>
        <button type="button" onClick={onDeselect} aria-label="إغلاق خصائص الركن" title="إغلاق"
          style={{ ...buttonBase, width: 32, minHeight: 32, border: '1px solid #33556b', background: '#142f43', color: '#d6faff' }}>
          <StudioIcon name="close" size={17} />
        </button>
      </header>
      <label htmlFor={radiusId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, fontSize: 12, color: '#b9e3ed' }}>
        <span>نصف قطر التقويس</span>
        <strong style={{ color: '#6beaff' }}>{(corner.radius * 100).toFixed(0)} سم</strong>
      </label>
      <input type="range" aria-label="تعديل نصف قطر التقويس" min={minRadius} max={maxRadius} step={0.01}
        value={Math.max(minRadius, Math.min(maxRadius, corner.radius))}
        onChange={event => { setError(''); onUpdate(corner.id, Number(event.target.value)); }}
        onPointerUp={onCommit} onKeyUp={onCommit}
        style={{ width: '100%', accentColor: '#29d9f2', marginBottom: 12 }} />
      <input id={radiusId} type="text" inputMode="decimal" dir="ltr" value={inputStr}
        aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
        onChange={event => { setInputStr(event.target.value); setError(''); }}
        onFocus={event => event.currentTarget.select()}
        onBlur={applyRadius}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') { setInputStr(corner.radius.toFixed(2)); setError(''); event.currentTarget.blur(); }
        }}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '8px 10px',
          borderRadius: 9, border: `1px solid ${error ? '#f77' : '#4c91a9'}`,
          background: '#071725', color: '#f0fdff', fontSize: 14, textAlign: 'center' }} />
      <div style={{ marginTop: 6, fontSize: 11, color: '#9ac7d2' }}>الوحدة: متر — الحد الأعلى {maxRadius.toFixed(2)} م</div>
      {error && <p id={errorId} role="alert" style={{ color: '#ffaaaa', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      {!confirmDelete ? (
        <button type="button" onClick={() => setConfirmDelete(true)}
          style={{ ...buttonBase, width: '100%', marginTop: 16, border: '1px solid #a95059', background: '#572731', color: '#ffe5e5' }}>
          <StudioIcon name="trash" size={16} /> حذف الركن
        </button>
      ) : (
        <div role="group" aria-label="تأكيد حذف الركن" style={{ marginTop: 14, padding: 10, borderRadius: 10, border: '1px solid #a95059', background: '#361f2b' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12 }}>هل تريد حذف هذا الركن المقوس؟</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setConfirmDelete(false)}
              style={{ ...buttonBase, flex: 1, border: '1px solid #426479', background: '#19364a', color: '#e9faff' }}>إلغاء</button>
            <button type="button" onClick={() => onDelete(corner.id)}
              style={{ ...buttonBase, flex: 1, border: '1px solid #d46c76', background: '#a33442', color: '#fff' }}>تأكيد الحذف</button>
          </div>
        </div>
      )}
    </section>
  );
};
