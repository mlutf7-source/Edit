import React, { useEffect, useState } from 'react';
import type { Wall } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  walls: Wall[];
  onAdd: (data: { wallId: string; position: number; width: number; height: number }) => void;
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
  display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#b6d6e6',
};
const fieldStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 11px',
  borderRadius: 8, border: '1px solid #3c6379', background: '#102b40',
  color: '#f3fbff', fontSize: 14, outlineOffset: 2, accentColor: '#42d8ef',
};
export const WindowForm: React.FC<Props> = ({ walls, onAdd }) => {
  const [wallId, setWallId] = useState(walls[0]?.id ?? '');
  const [pos, setPos] = useState('0');
  const [width, setWidth] = useState('1.2');
  const [height, setHeight] = useState('1.5');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!walls.some(wall => wall.id === wallId)) setWallId(walls[0]?.id ?? '');
  }, [walls, wallId]);
  const updateField = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(normalizeNumber(event.target.value));
      if (error) setError('');
    };
  const handleAdd = () => {
    const position = Number(normalizeNumber(pos.trim()));
    const parsedWidth = Number(normalizeNumber(width.trim()));
    const parsedHeight = Number(normalizeNumber(height.trim()));
    if (!wallId || !walls.some(wall => wall.id === wallId)) {
      setError('اختر جداراً صالحاً لإضافة النافذة.');
      return;
    }
    if (!pos.trim() || !width.trim() || !height.trim() ||
        ![position, parsedWidth, parsedHeight].every(Number.isFinite)) {
      setError('أدخل قيماً رقمية صحيحة للموقع والعرض والارتفاع.');
      return;
    }
    if (position < 0 || parsedWidth <= 0 || parsedHeight <= 0) {
      setError('يجب ألا يكون الموقع سالباً، ويجب أن يكون العرض والارتفاع أكبر من الصفر.');
      return;
    }
    setError('');
    onAdd({ wallId, position, width: parsedWidth, height: parsedHeight });
  };
  return (
    <section style={panelStyle} aria-label="إضافة نافذة جديدة" dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span style={{ color: '#56dcef', display: 'flex' }}><StudioIcon name="window" size={21} /></span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>إضافة نافذة جديدة</div>
          <div style={{ fontSize: 11, color: '#91b9cb', marginTop: 3 }}>
            اختر الجدار وحدد موقع النافذة وعرضها وارتفاعها بالمتر
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="studio-window-wall" style={labelStyle}>الجدار</label>
        <select id="studio-window-wall" value={wallId} onChange={event => { setWallId(event.target.value); setError(''); }} style={fieldStyle} disabled={walls.length === 0}>
          {walls.length === 0 && <option value="">لا توجد جدران متاحة</option>}
          {walls.map((wall, index) => (
            <option key={wall.id} value={wall.id}>
              جدار {index + 1} — {wall.type === 'exterior' ? 'خارجي' : 'داخلي'}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
        {([
          { id: 'position', label: 'الموقع (م)', value: pos, setter: setPos },
          { id: 'width', label: 'العرض (م)', value: width, setter: setWidth },
          { id: 'height', label: 'الارتفاع (م)', value: height, setter: setHeight },
        ] as const).map(field => (
          <div key={field.id}>
            <label htmlFor={`studio-window-${field.id}`} style={labelStyle}>{field.label}</label>
            <input
              id={`studio-window-${field.id}`}
              type="text" inputMode="decimal" dir="ltr"
              value={field.value} onChange={updateField(field.setter)}
              onFocus={event => event.currentTarget.select()}
              style={fieldStyle}
            />
          </div>
        ))}
      </div>
      {error && <p role="alert" style={{ color: '#ffb4b4', fontSize: 12, margin: '12px 0 0' }}>{error}</p>}
      {walls.length === 0 && <p style={{ color: '#a8c6d5', fontSize: 12, margin: '12px 0 0' }}>ارسم جداراً أولاً لتتمكن من إضافة نافذة.</p>}
      <button
        type="button" onClick={handleAdd} disabled={walls.length === 0}
        style={{
          marginTop: 14, width: '100%', border: '1px solid #39d5eb', borderRadius: 9,
          padding: '10px 14px', fontSize: 14, fontWeight: 800,
          background: walls.length ? '#087e99' : '#39505d', color: '#fff',
          cursor: walls.length ? 'pointer' : 'not-allowed',
        }}
      >
        إضافة النافذة
      </button>
    </section>
  );
};
