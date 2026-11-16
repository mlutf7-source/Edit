import React, { useEffect, useState } from 'react';
import type { Stair } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  stair: Stair | null;
  onChangeWidth: (width: number) => void;
  onChangeTotalLength: (length: number) => void;
  onChangeLandingLength: (length: number) => void;
  onChangeTreadDepth: (depth: number) => void;
  onChangeRiserHeight: (height: number) => void;
  onRotate: () => void;
}
type FieldKey = 'width' | 'totalLength' | 'landingLength' | 'treadDepth' | 'riserHeight';
const fields: { key: FieldKey; label: string; hint: string }[] = [
  { key: 'width', label: 'عرض السلم', hint: 'متر' },
  { key: 'totalLength', label: 'الطول الكلي', hint: 'متر' },
  { key: 'landingLength', label: 'طول البسطة', hint: 'متر' },
  { key: 'treadDepth', label: 'عمق الدرجة', hint: 'متر' },
  { key: 'riserHeight', label: 'ارتفاع الدرجة', hint: 'متر' },
];
const format = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '';
const normalize = (value: string) => value
  .replace(/[٠-٩]/g, char => String(char.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, char => String(char.charCodeAt(0) - 0x06F0))
  .replace(/[٫،]/g, '.').replace(/,/g, '.');
const panelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12, padding: 14,
  margin: 8, borderRadius: 12, direction: 'rtl',
  background: 'linear-gradient(145deg, #102c40, #0a1d30)',
  border: '1px solid rgba(67, 203, 232, 0.38)', color: '#e8f8ff',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 10px',
  borderRadius: 8, border: '1px solid #42677b', background: '#081a2a',
  color: '#e8f8ff', fontSize: 14, textAlign: 'center', direction: 'ltr',
  outlineColor: '#32d6ed',
};
export const StairProperties: React.FC<Props> = ({
  stair, onChangeWidth, onChangeTotalLength, onChangeLandingLength,
  onChangeTreadDepth, onChangeRiserHeight, onRotate,
}) => {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    width: '', totalLength: '', landingLength: '', treadDepth: '', riserHeight: '',
  });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!stair) return;
    setValues({
      width: format(stair.width), totalLength: format(stair.totalLength),
      landingLength: format(stair.landingLength), treadDepth: format(stair.treadDepth),
      riserHeight: format(stair.riserHeight),
    });
    setError(null);
  }, [stair]);
  if (!stair) return null;
  const callbacks: Record<FieldKey, (value: number) => void> = {
    width: onChangeWidth, totalLength: onChangeTotalLength,
    landingLength: onChangeLandingLength, treadDepth: onChangeTreadDepth,
    riserHeight: onChangeRiserHeight,
  };
  const commit = (key: FieldKey) => {
    const raw = normalize(values[key].trim());
    const valid = /^\d+(?:\.\d+)?$/.test(raw);
    const number = valid ? Number(raw) : NaN;
    if (!Number.isFinite(number) || number <= 0) {
      setValues(previous => ({ ...previous, [key]: format(stair[key]) }));
      setError(`يرجى إدخال قيمة موجبة وصحيحة لحقل ${fields.find(field => field.key === key)?.label}.`);
      return;
    }
    setError(null);
    setValues(previous => ({ ...previous, [key]: format(number) }));
    if (number !== stair[key]) callbacks[key](number);
  };
  return (
    <section style={panelStyle} aria-label="خصائص السلم">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#8deaff', fontWeight: 700, fontSize: 15 }}>
        <StudioIcon name="stairs" size={19} />
        <span>خصائص السلم</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 }}>
        {fields.map(field => (
          <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: '#c3dce9', fontWeight: 600 }}>{field.label} ({field.hint})</span>
            <input
              type="text" inputMode="decimal" dir="ltr"
              value={values[field.key]} style={inputStyle}
              aria-label={`${field.label} بالمتر`}
              onFocus={event => event.currentTarget.select()}
              onChange={event => {
                const next = normalize(event.target.value);
                if (/^\d*(?:\.\d*)?$/.test(next)) {
                  setValues(previous => ({ ...previous, [field.key]: next }));
                  if (error) setError(null);
                }
              }}
              onBlur={() => commit(field.key)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  setValues(previous => ({ ...previous, [field.key]: format(stair[field.key]) }));
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
        ))}
      </div>
      {error && <div role="alert" style={{ color: '#ffc4ba', background: 'rgba(183, 58, 48, 0.17)', borderRadius: 7, padding: '8px 10px', fontSize: 12 }}>{error}</div>}
      <button
        type="button" onClick={onRotate}
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 13px', borderRadius: 8, border: '1px solid #36c7df',
          background: '#075b75', color: '#eaffff', fontWeight: 700, cursor: 'pointer' }}
        aria-label="تدوير السلم 90 درجة"
      >
        <StudioIcon name="rotate" size={17} />
        تدوير 90°
      </button>
    </section>
  );
};
