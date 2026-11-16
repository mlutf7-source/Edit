import React, { useState } from 'react';
import type { Point } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  onAdd: (data: { position: Point; width: number; length: number }) => void;
}
const normalizeNumber = (value: string): string => value
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٫,،]/g, '.');
const panelStyle: React.CSSProperties = {
  direction: 'rtl', padding: 14, margin: 4, borderRadius: 12,
  border: '1px solid rgba(55, 191, 216, .38)',
  background: 'linear-gradient(160deg, #102b40, #091b2c)',
  color: '#e7f5fc', boxShadow: '0 8px 24px rgba(0, 0, 0, .18)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700,
  marginBottom: 6, color: '#b6d6e6',
};
const fieldStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box',
  padding: '10px 11px', borderRadius: 8,
  border: '1px solid #3c6379', background: '#102b40',
  color: '#f3fbff', fontSize: 14, outlineOffset: 2,
};
export const ColumnForm: React.FC<Props> = ({ onAdd }) => {
  const [x, setX] = useState('0');
  const [y, setY] = useState('0');
  const [width, setWidth] = useState('0.4');
  const [length, setLength] = useState('0.4');
  const [error, setError] = useState('');
  const updateField = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(normalizeNumber(event.target.value));
      if (error) setError('');
    };
  const handleAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = [x, y, width, length];
    const numbers = values.map(value => Number(normalizeNumber(value.trim())));
    if (values.some(value => !value.trim()) || numbers.some(value => !Number.isFinite(value))) {
      setError('أدخل قيماً رقمية صحيحة لإحداثيات العمود وأبعاده.');
      return;
    }
    const [parsedX, parsedY, parsedWidth, parsedLength] = numbers;
    if (parsedX < 0 || parsedY < 0 || parsedWidth <= 0 || parsedLength <= 0) {
      setError('الإحداثيات يجب ألا تكون سالبة، والعرض والطول يجب أن يكونا أكبر من الصفر.');
      return;
    }
    setError('');
    onAdd({ position: { x: parsedX, y: parsedY }, width: parsedWidth, length: parsedLength });
  };
  const fields = [
    { id: 'column-x', label: 'الإحداثي X', value: x, setter: setX },
    { id: 'column-y', label: 'الإحداثي Y', value: y, setter: setY },
    { id: 'column-width', label: 'العرض (م)', value: width, setter: setWidth },
    { id: 'column-length', label: 'الطول (م)', value: length, setter: setLength },
  ];
  return (
    <section style={panelStyle} aria-label="إضافة عمود جديد">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <StudioIcon name="column" size={20} />
        <strong style={{ fontSize: 15 }}>إضافة عمود جديد</strong>
      </div>
      <p style={{ color: '#a9c9da', fontSize: 12, margin: '0 0 13px' }}>
        حدد موقع العمود وأبعاده بالمتر.
      </p>
      <form onSubmit={handleAdd} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 10 }}>
          {fields.map(field => (
            <div key={field.id} style={{ minWidth: 0 }}>
              <label htmlFor={field.id} style={labelStyle}>{field.label}</label>
              <input
                id={field.id}
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={field.value}
                onChange={updateField(field.setter)}
                onFocus={event => event.currentTarget.select()}
                style={fieldStyle}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'column-form-error' : undefined}
              />
            </div>
          ))}
        </div>
        {error && (
          <p id="column-form-error" role="alert" style={{ color: '#ffb9b9', fontSize: 12, margin: '12px 0 0' }}>
            {error}
          </p>
        )}
        <button type="submit" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          marginTop: 14, padding: '10px 16px', borderRadius: 9,
          border: '1px solid #2ed8f1', background: '#087b9d',
          color: '#fff', fontWeight: 700, cursor: 'pointer',
        }}>
          <StudioIcon name="plus" size={17} />
          إضافة العمود
        </button>
      </form>
    </section>
  );
};
