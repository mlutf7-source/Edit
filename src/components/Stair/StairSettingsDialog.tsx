import React, { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  onClose: () => void;
  onInsertStep: (config: {
    width: number;
    length: number;
    treadDepth: number;
    riserHeight: number;
    stepCount: number;
    elevation: number;
  }) => void;
  onInsertLanding: (config: {
    width: number;
    length: number;
    elevation: number;
  }) => void;
}
type FieldName = 'sLength' | 'sWidth' | 'sTread' | 'sRiser' | 'sElevation' | 'lLength' | 'lWidth' | 'lElevation';
const initialValues: Record<FieldName, string> = {
  sLength: '3', sWidth: '1.2', sTread: '0.27', sRiser: '0.17', sElevation: '0',
  lLength: '1', lWidth: '1.2', lElevation: '0',
};
const parseValue = (value: string): number => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  return Number(normalized);
};
const colors = {
  panel: '#0c2032', section: '#102c42', field: '#071a2a', border: '#28536c',
  cyan: '#69edff', text: '#e8f5ff', muted: '#a5c0d1', danger: '#ffb6ac',
};
const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 25, minHeight: 25, padding: '2px 4px',
  border: `1px solid ${colors.border}`, borderRadius: 5, background: colors.field,
  color: colors.text, fontSize: 11, outlineOffset: 2, textAlign: 'center', direction: 'ltr',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 2, fontSize: 10, fontWeight: 600,
  color: colors.muted, lineHeight: 1.2,
};
const sectionStyle: React.CSSProperties = {
  background: colors.section, border: `1px solid ${colors.border}`, borderRadius: 8,
  padding: 7, display: 'grid', alignContent: 'start', gap: 6, minWidth: 0,
};
const buttonStyle: React.CSSProperties = {
  border: '1px solid #159fba', background: 'linear-gradient(135deg,#067e9d,#0a597e)',
  color: '#fff', minHeight: 28, borderRadius: 6, padding: '4px 6px',
  fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 4,
};
export const StairSettingsDialog: React.FC<Props> = ({ onClose, onInsertStep, onInsertLanding }) => {
  const [values, setValues] = useState<Record<FieldName, string>>(initialValues);
  const [error, setError] = useState('');
  const titleId = useId();
  const errorId = useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement && dialogRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
  }, []);
  const setField = (name: FieldName, value: string) => {
    setValues(previous => ({ ...previous, [name]: value }));
    setError('');
  };
  const numeric = useMemo(() => ({
    sLength: parseValue(values.sLength), sWidth: parseValue(values.sWidth),
    sTread: parseValue(values.sTread), sRiser: parseValue(values.sRiser),
    sElevation: parseValue(values.sElevation), lLength: parseValue(values.lLength),
    lWidth: parseValue(values.lWidth), lElevation: parseValue(values.lElevation),
  }), [values]);
  const validStep = [numeric.sLength, numeric.sWidth, numeric.sTread, numeric.sRiser].every(n => Number.isFinite(n) && n > 0)
    && Number.isFinite(numeric.sElevation);
  const validLanding = [numeric.lLength, numeric.lWidth].every(n => Number.isFinite(n) && n > 0)
    && Number.isFinite(numeric.lElevation);
  const stepCount = validStep ? Math.max(2, Math.floor(numeric.sLength / numeric.sTread)) : null;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const renderField = (name: FieldName, label: string) => (
    <label key={name} style={{ minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoFocus={false}
        value={values[name]}
        onChange={event => setField(name, event.target.value)}
        onFocus={event => event.currentTarget.select()}
        aria-invalid={values[name].trim() !== '' && !Number.isFinite(numeric[name])}
        style={fieldStyle}
      />
    </label>
  );
  const insertStep = () => {
    if (!validStep || stepCount === null) {
      setError('أدخل قيماً رقمية صحيحة وموجبة لأبعاد السحبة، ومنسوباً رقمياً صحيحاً.');
      return;
    }
    setError('');
    onInsertStep({ width: numeric.sWidth, length: numeric.sLength, treadDepth: numeric.sTread,
      riserHeight: numeric.sRiser, stepCount, elevation: numeric.sElevation });
  };
  const insertLanding = () => {
    if (!validLanding) {
      setError('أدخل طولاً وعرضاً موجبين للبسطة، ومنسوباً رقمياً صحيحاً.');
      return;
    }
    setError('');
    onInsertLanding({ width: numeric.lWidth, length: numeric.lLength, elevation: numeric.lElevation });
  };
  return createPortal(
    <div
      dir="rtl"
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box', background: 'rgba(1,10,20,.77)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        style={{
          boxSizing: 'border-box', width: 'min(100%, 340px)', maxHeight: 'min(92dvh, 410px)',
          overflowY: 'auto', overscrollBehavior: 'contain', borderRadius: 10,
          background: colors.panel, color: colors.text, border: `1px solid ${colors.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,.55)', padding: 8,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ color: colors.cyan }}><StudioIcon name="stairs" size={17} /></span>
          <h2 id={titleId} style={{ margin: 0, fontSize: 13, flex: 1 }}>إعدادات السلم المتعدد</h2>
          <button
            type="button" onClick={onClose} aria-label="إغلاق نافذة إعدادات السلم"
            style={{ background: '#183a50', color: colors.text, border: `1px solid ${colors.border}`,
              borderRadius: 5, width: 24, height: 24, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <StudioIcon name="close" size={14} />
          </button>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 7, alignItems: 'start' }}>
          <section style={sectionStyle} aria-label="خصائص سحبة السلم">
            <h3 style={{ margin: 0, fontSize: 12, color: colors.cyan }}>خصائص السحبة</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
              {renderField('sLength', 'الطول (م)')}
              {renderField('sWidth', 'العرض (م)')}
              {renderField('sTread', 'النائم (م)')}
              {renderField('sRiser', 'القائم (م)')}
              <div style={{ gridColumn: '1 / -1' }}>{renderField('sElevation', 'المنسوب (م)')}</div>
            </div>
            <div aria-live="polite" style={{ textAlign: 'center', color: colors.muted, fontSize: 10,
              background: colors.field, borderRadius: 5, padding: 4 }}>
              عدد الدرجات: <strong style={{ color: colors.cyan, marginInlineStart: 4 }}>{stepCount ?? '—'}</strong>
            </div>
            <button type="button" onClick={insertStep} style={buttonStyle}>
              <StudioIcon name="plus" size={13} /> إدراج السحبة
            </button>
          </section>
          <section style={sectionStyle} aria-label="خصائص بسطة السلم">
            <h3 style={{ margin: 0, fontSize: 12, color: colors.cyan }}>خصائص البسطة</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
              {renderField('lLength', 'الطول (م)')}
              {renderField('lWidth', 'العرض (م)')}
              <div style={{ gridColumn: '1 / -1' }}>{renderField('lElevation', 'المنسوب (م)')}</div>
            </div>
            <button type="button" onClick={insertLanding} style={buttonStyle}>
              <StudioIcon name="plus" size={13} /> إدراج البسطة
            </button>
          </section>
        </div>
        {error && <p id={errorId} role="alert" style={{ margin: '7px 0 0', padding: 6,
          borderRadius: 5, background: '#482b33', color: colors.danger, fontSize: 10 }}>{error}</p>}
      </div>
    </div>,
    document.body
  );
};
