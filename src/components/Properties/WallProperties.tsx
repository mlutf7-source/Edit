import React, { useEffect, useState } from 'react';
import type { Wall } from '../../core/types';
import { distance } from '../../core/geometry';
import { getWallActualLength } from '../../core/curvedWallGeometry';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  wall: Wall | null;
  onChangeLength: (len: number) => void;
  onChangeThickness: (t: number) => void;
  onChangeRadius: (radius: number) => void;
  onFlipCurveSide?: () => void;
  contourWalls?: Wall[];
  contourPerimeter?: number;
  contourArea?: number;
  onUnlinkContour?: () => void;
}
const colors = {
  surface: '#0d2235', raised: '#142e44', border: 'rgba(75,182,208,.28)',
  text: '#e6f5fa', muted: '#a4bdcb', accent: '#4be1f1', danger: '#ffb1b1',
};
const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '9px 11px',
  borderRadius: 9, border: `1px solid ${colors.border}`,
  background: colors.surface, color: colors.text, fontSize: 14,
  direction: 'ltr', textAlign: 'center', outlineOffset: 2,
};
const actionStyle: React.CSSProperties = {
  borderRadius: 9, border: `1px solid ${colors.border}`,
  padding: '8px 12px', background: colors.raised, color: colors.accent,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 7, fontWeight: 700, cursor: 'pointer', fontSize: 12,
};
const normalizeNumber = (raw: string): number => {
  const normalized = raw.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٫,]/g, '.').trim();
  return normalized !== '' && /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
};
export const WallProperties: React.FC<Props> = ({
  wall, onChangeLength, onChangeThickness, onChangeRadius, onFlipCurveSide,
  contourWalls, contourPerimeter, contourArea, onUnlinkContour,
}) => {
  const [lengthStr, setLengthStr] = useState('');
  const [thicknessStr, setThicknessStr] = useState('');
  const [radiusStr, setRadiusStr] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!wall) {
      setLengthStr(''); setThicknessStr(''); setRadiusStr(''); setError('');
      return;
    }
    const actualLength = wall.curveRadius ? getWallActualLength(wall) : distance(wall.start, wall.end);
    setLengthStr(actualLength.toFixed(2));
    setThicknessStr(String(wall.thickness));
    setRadiusStr(wall.curveRadius ? String(wall.curveRadius) : '');
    setError('');
  }, [wall]);
  if (!wall) return null;
  const isCurved = !!wall.curveRadius;
  const hasContour = !!contourWalls && contourWalls.length >= 2;
  const resetLength = () => setLengthStr((isCurved ? getWallActualLength(wall) : distance(wall.start, wall.end)).toFixed(2));
  const commitLength = () => {
    if (isCurved) { resetLength(); return; }
    const value = normalizeNumber(lengthStr);
    if (!Number.isFinite(value) || value <= 0) {
      setError('طول الجدار يجب أن يكون رقماً موجباً.'); resetLength(); return;
    }
    setError(''); onChangeLength(value);
  };
  const commitThickness = () => {
    const value = normalizeNumber(thicknessStr);
    if (!Number.isFinite(value) || value <= 0 || value > 1) {
      setError('سماكة الجدار يجب أن تكون أكبر من صفر ولا تتجاوز متراً واحداً.');
      setThicknessStr(String(wall.thickness)); return;
    }
    setError(''); onChangeThickness(value);
  };
  const commitRadius = () => {
    if (!isCurved) return;
    const value = normalizeNumber(radiusStr);
    const minRadius = distance(wall.start, wall.end) / 2;
    if (!Number.isFinite(value) || value <= minRadius + 0.001) {
      setError(`نصف القطر يجب أن يكون أكبر من ${(minRadius + 0.01).toFixed(2)} م.`);
      setRadiusStr(String(wall.curveRadius)); return;
    }
    setError(''); onChangeRadius(value);
  };
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); (event.currentTarget).blur(); }
    if (event.key === 'Escape') { event.currentTarget.blur(); }
  };
  const field = (
    id: string, label: string, value: string, setter: (value: string) => void,
    commit: () => void, readOnly = false,
  ) => (
    <label htmlFor={id} style={{ display: 'grid', gap: 6, flex: '1 1 120px', minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>{label}</span>
      <input id={id} type="text" inputMode="decimal" value={value} readOnly={readOnly}
        aria-readonly={readOnly} style={{ ...fieldStyle, ...(readOnly ? { opacity: .65, cursor: 'not-allowed' } : {}) }}
        onFocus={event => { if (!readOnly) event.currentTarget.select(); }}
        onChange={event => { setter(event.currentTarget.value); if (error) setError(''); }}
        onBlur={commit} onKeyDown={onEnter} />
    </label>
  );
  return (
    <section dir="rtl" aria-label="خصائص الجدار المحدد"
      style={{ color: colors.text, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
        <StudioIcon name="wall" size={19} />
        <span>خصائص الجدار</span>
        <span style={{ marginInlineStart: 'auto', fontSize: 11, color: colors.accent, background: colors.raised, borderRadius: 20, padding: '4px 8px' }}>
          {isCurved ? 'منحني' : 'مستقيم'}
        </span>
      </div>
      {hasContour && (
        <div style={{ display: 'grid', gap: 9, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.raised }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
            <StudioIcon name="lock" size={16} />
            <strong>{contourWalls!.length} جدران مرتبطة</strong>
            <span>المحيط: <b dir="ltr">{Number.isFinite(contourPerimeter) ? contourPerimeter!.toFixed(2) : '—'} م</b></span>
            <span>المساحة: <b dir="ltr">{Number.isFinite(contourArea) ? contourArea!.toFixed(2) : '—'} م²</b></span>
          </div>
          {onUnlinkContour && <button type="button" onClick={onUnlinkContour} style={{ ...actionStyle, justifySelf: 'start', color: colors.danger }}>
            <StudioIcon name="unlock" size={16} /> فك الربط
          </button>}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {field('studio-wall-length', isCurved ? 'طول القوس (م) — للعرض فقط' : 'الطول (م)', lengthStr, setLengthStr, commitLength, isCurved)}
        {field('studio-wall-thickness', 'السماكة (م)', thicknessStr, setThicknessStr, commitThickness)}
      </div>
      {isCurved && (
        <div style={{ display: 'grid', gap: 10, padding: 10, background: colors.raised, borderRadius: 10, border: `1px solid ${colors.border}` }}>
          {field('studio-wall-radius', 'نصف قطر الانحناء (م)', radiusStr, setRadiusStr, commitRadius)}
          {onFlipCurveSide && <button type="button" onClick={onFlipCurveSide} style={actionStyle}>
            <StudioIcon name="rotate" size={16} /> عكس اتجاه الانحناء
          </button>}
        </div>
      )}
      {error && <div role="alert" style={{ color: colors.danger, background: 'rgba(255,100,100,.09)', border: '1px solid rgba(255,100,100,.3)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>{error}</div>}
    </section>
  );
};
