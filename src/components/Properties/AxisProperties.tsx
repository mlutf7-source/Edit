import React, { useEffect, useId, useState } from 'react';
import type { Axis } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  axis: Axis | null;
  onChangeLength: (len: number) => void;
  onChangeOffset: (off: number) => void;
}
const panelStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
  padding: '12px 14px', margin: 8, borderRadius: 12,
  background: 'linear-gradient(135deg, #10283b, #0a1c2c)',
  border: '1px solid rgba(71, 203, 226, 0.35)',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)', color: '#e9faff',
  direction: 'rtl',
};
const fieldStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 160px', minWidth: 0,
};
const labelStyle: React.CSSProperties = {
  fontWeight: 600, fontSize: 12, color: '#b5dce7',
};
const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box', width: '100%', minHeight: 38,
  padding: '7px 10px', borderRadius: 8,
  border: '1px solid rgba(82, 185, 210, 0.5)',
  background: '#071725', color: '#f0fdff', fontSize: 14,
  textAlign: 'center', direction: 'ltr', outlineOffset: 2,
};
const normalizeNumber = (value: string): string =>
  value
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[٫،,]/g, '.')
    .replace(/\u066c/g, '');
const parseInput = (value: string): number | null => {
  const normalized = normalizeNumber(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
};
export const AxisProperties: React.FC<Props> = ({ axis, onChangeLength, onChangeOffset }) => {
  const [lenStr, setLenStr] = useState('');
  const [offStr, setOffStr] = useState('');
  const [lengthError, setLengthError] = useState('');
  const [offsetError, setOffsetError] = useState('');
  const lengthId = useId();
  const offsetId = useId();
  useEffect(() => {
    if (axis) {
      setLenStr(axis.length.toFixed(2));
      setOffStr(axis.offset.toFixed(2));
    } else {
      setLenStr('');
      setOffStr('');
    }
    setLengthError('');
    setOffsetError('');
  }, [axis?.id, axis?.length, axis?.offset]);
  if (!axis) return null;
  const commit = (
    value: string,
    fallback: number,
    onChange: (n: number) => void,
    setter: (s: string) => void,
    setError: (message: string) => void,
    requirePositive: boolean,
  ) => {
    const parsed = parseInput(value);
    if (parsed === null || (requirePositive && parsed <= 0)) {
      setError(requirePositive ? 'أدخل طولاً أكبر من صفر.' : 'أدخل قيمة إزاحة رقمية صحيحة.');
      setter(fallback.toFixed(2));
      return;
    }
    setError('');
    if (parsed !== fallback) onChange(parsed);
    setter(parsed.toFixed(2));
  };
  const offsetLabel = axis.type === 'vertical'
    ? 'الإزاحة يمين (+) / يسار (-) (م)'
    : 'الإزاحة أعلى (+) / أسفل (-) (م)';
  return (
    <section style={panelStyle} aria-label={`خصائص المحور ${axis.label}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 100%', color: '#8eeaff', fontWeight: 700 }}>
        <StudioIcon name="axis" size={19} />
        <span>خصائص المحور {axis.label}</span>
        <span style={{ fontSize: 11, color: '#9fb9c9', marginInlineStart: 'auto' }}>
          {axis.type === 'vertical' ? 'محور رأسي' : 'محور أفقي'}
        </span>
      </div>
      <div style={fieldStyle}>
        <label htmlFor={lengthId} style={labelStyle}>الطول (م)</label>
        <input
          id={lengthId} type="text" inputMode="decimal" dir="ltr"
          value={lenStr} style={inputStyle} aria-invalid={Boolean(lengthError)}
          aria-describedby={lengthError ? `${lengthId}-error` : undefined}
          onFocus={event => event.currentTarget.select()}
          onChange={event => { setLenStr(event.target.value); setLengthError(''); }}
          onBlur={() => commit(lenStr, axis.length, onChangeLength, setLenStr, setLengthError, true)}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        />
        {lengthError && <span id={`${lengthId}-error`} role="alert" style={{ fontSize: 11, color: '#ffb3b3' }}>{lengthError}</span>}
      </div>
      <div style={fieldStyle}>
        <label htmlFor={offsetId} style={labelStyle}>{offsetLabel}</label>
        <input
          id={offsetId} type="text" inputMode="decimal" dir="ltr"
          value={offStr} style={inputStyle} aria-invalid={Boolean(offsetError)}
          aria-describedby={offsetError ? `${offsetId}-error` : undefined}
          onFocus={event => event.currentTarget.select()}
          onChange={event => { setOffStr(event.target.value); setOffsetError(''); }}
          onBlur={() => commit(offStr, axis.offset, onChangeOffset, setOffStr, setOffsetError, false)}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        />
        {offsetError && <span id={`${offsetId}-error`} role="alert" style={{ fontSize: 11, color: '#ffb3b3' }}>{offsetError}</span>}
      </div>
    </section>
  );
};
