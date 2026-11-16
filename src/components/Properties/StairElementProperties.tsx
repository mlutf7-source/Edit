import React, { useEffect, useState } from 'react';
import type { StairElement } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  element: StairElement | null;
  onUpdate: (id: string, patch: Partial<StairElement>) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}
type Field = 'length' | 'width' | 'elevation' | 'treadDepth' | 'riserHeight';
const normalizeNumber = (text: string) => text
  .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
  .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0))
  .replace(/[٫،,]/g, '.').trim();
const formatted = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '0.00';
const panel: React.CSSProperties = {
  direction: 'rtl', display: 'flex', flexDirection: 'column', gap: 12,
  margin: 8, padding: 14, borderRadius: 12,
  background: 'linear-gradient(145deg, #102c40, #0a1d30)',
  border: '1px solid rgba(67, 203, 232, .38)', color: '#e8f8ff',
  boxShadow: '0 8px 24px rgba(0, 0, 0, .2)', minWidth: 0,
};
const input: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 10px',
  borderRadius: 8, border: '1px solid #42677b', background: '#081a2a',
  color: '#e8f8ff', fontSize: 14, textAlign: 'center', direction: 'ltr',
  outlineColor: '#32d6ed',
};
const action: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: 36, padding: '8px 12px', borderRadius: 8,
  border: '1px solid #42677b', background: '#16364a', color: '#e8f8ff',
  fontWeight: 700, cursor: 'pointer', flex: '1 1 110px',
};
export const StairElementProperties: React.FC<Props> = ({ element, onUpdate, onRotate, onDelete }) => {
  const [values, setValues] = useState<Record<Field, string>>({
    length: '', width: '', elevation: '', treadDepth: '', riserHeight: '',
  });
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!element) return;
    setValues({
      length: formatted(element.length),
      width: formatted(element.width),
      elevation: formatted(element.elevation ?? 0),
      treadDepth: formatted(element.treadDepth ?? 0.27),
      riserHeight: formatted(element.riserHeight ?? 0.17),
    });
    setError('');
    setConfirmDelete(false);
  }, [element]);
  if (!element) return null;
  const currentValue = (field: Field): number => {
    switch (field) {
      case 'length': return element.length;
      case 'width': return element.width;
      case 'elevation': return element.elevation ?? 0;
      case 'treadDepth': return element.treadDepth ?? 0.27;
      case 'riserHeight': return element.riserHeight ?? 0.17;
    }
  };
  const commit = (field: Field) => {
    const raw = normalizeNumber(values[field]);
    const value = raw !== '' ? Number(raw) : NaN;
    if (!Number.isFinite(value) || (field !== 'elevation' && value <= 0)) {
      setError(`يرجى إدخال قيمة ${field === 'elevation' ? 'رقمية صحيحة' : 'موجبة وصحيحة'}.`);
      setValues(prev => ({ ...prev, [field]: formatted(currentValue(field)) }));
      return;
    }
    setError('');
    setValues(prev => ({ ...prev, [field]: formatted(value) }));
    if (field === 'length' && element.type === 'step') {
      const tread = element.treadDepth ?? 0.27;
      onUpdate(element.id, { length: value, stepCount: Math.max(2, Math.floor(value / tread)) });
    } else if (field === 'treadDepth' && element.type === 'step') {
      onUpdate(element.id, { treadDepth: value, stepCount: Math.max(2, Math.floor(element.length / value)) });
    } else {
      onUpdate(element.id, { [field]: value } as Partial<StairElement>);
    }
  };
  const field = (key: Field, label: string) => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 110px', minWidth: 0, fontSize: 13, fontWeight: 700 }}>
      <span>{label} (م)</span>
      <input
        type="text" inputMode="decimal" dir="ltr" value={values[key]}
        aria-label={label} style={input}
        onFocus={e => e.currentTarget.select()}
        onChange={e => { setError(''); setValues(prev => ({ ...prev, [key]: e.target.value })); }}
        onBlur={() => commit(key)}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    </label>
  );
  const stepCount = element.type === 'step'
    ? (element.stepCount ?? Math.max(2, Math.floor(element.length / (element.treadDepth ?? 0.27))))
    : 0;
  return (
    <section style={panel} aria-label="خصائص عنصر السلم">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #34586b', paddingBottom: 10 }}>
        <StudioIcon name="stairs" size={20} />
        <strong style={{ flex: 1 }}>{element.type === 'step' ? 'خصائص سحبة السلم' : 'خصائص البسطة'}</strong>
        {element.locked && <span style={{ fontSize: 12, color: '#ffcc81' }}>مقفل</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {field('length', 'الطول')}
        {field('width', 'العرض')}
        {field('elevation', 'المنسوب')}
        {element.type === 'step' && <>
          {field('treadDepth', 'عمق الدرجة')}
          {field('riserHeight', 'ارتفاع الدرجة')}
        </>}
      </div>
      {element.type === 'step' && (
        <div style={{ padding: '9px 10px', borderRadius: 8, background: '#15394c', fontWeight: 700, fontSize: 13 }}>
          عدد الدرجات: {stepCount}
        </div>
      )}
      {error && <div role="alert" style={{ color: '#ffb4a9', fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" style={action} onClick={() => onRotate(element.id)}>
          <StudioIcon name="rotate" size={16} /> تدوير 90°
        </button>
        <button type="button" style={{ ...action, borderColor: element.locked ? '#e6aa53' : '#42677b' }}
          aria-pressed={!!element.locked} onClick={() => onUpdate(element.id, { locked: !element.locked })}>
          <StudioIcon name={element.locked ? 'unlock' : 'lock'} size={16} />
          {element.locked ? 'إلغاء القفل' : 'قفل العنصر'}
        </button>
        <button type="button" style={{ ...action, borderColor: '#a84b57', color: '#ffbec5' }} onClick={() => setConfirmDelete(true)}>
          <StudioIcon name="trash" size={16} /> حذف
        </button>
      </div>
      {confirmDelete && (
        <div role="alertdialog" aria-label="تأكيد حذف عنصر السلم" style={{ padding: 12, border: '1px solid #a84b57', borderRadius: 9, background: '#241e2d' }}>
          <p style={{ margin: '0 0 10px' }}>هل تريد حذف {element.type === 'step' ? 'سحبة السلم' : 'البسطة'}؟ لا يمكن التراجع عن هذا الإجراء إلا عبر سجل التراجع إن كان متاحاً.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={action} onClick={() => setConfirmDelete(false)}>إلغاء</button>
            <button type="button" style={{ ...action, background: '#8f2939', borderColor: '#c65364' }} onClick={() => { setConfirmDelete(false); onDelete(element.id); }}>تأكيد الحذف</button>
          </div>
        </div>
      )}
    </section>
  );
};
