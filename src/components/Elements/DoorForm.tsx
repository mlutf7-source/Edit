import React, { useEffect, useState } from 'react';
import type { Wall, Door, DoorType } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  walls: Wall[];
  onAdd: (data: Omit<Door, 'id'>) => void;
}
const DOOR_DEFAULTS: Record<DoorType, { width: number; height: number; label: string; description: string }> = {
  regular: { width: 1, height: 2.2, label: 'باب عادي', description: 'باب مفرد' },
  main: { width: 1.4, height: 2.4, label: 'باب رئيسي', description: 'باب مزدوج الدرف' },
  shop: { width: 3, height: 2.5, label: 'باب محل', description: 'باب سحاب' },
};
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
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#b6d6e6' };
const fieldStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 11px',
  borderRadius: 8, border: '1px solid #3c6379', background: '#102b40',
  color: '#f3fbff', fontSize: 14, outlineOffset: 2, accentColor: '#42d8ef',
};
export const DoorForm: React.FC<Props> = ({ walls, onAdd }) => {
  const [wallId, setWallId] = useState(walls[0]?.id ?? '');
  const [doorType, setDoorType] = useState<DoorType>('regular');
  const [pos, setPos] = useState('0');
  const [w, setW] = useState('1');
  const [h, setH] = useState('2.2');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!walls.some(wall => wall.id === wallId)) setWallId(walls[0]?.id ?? '');
  }, [walls, wallId]);
  const selectDoorType = (nextType: DoorType) => {
    setDoorType(nextType);
    setW(String(DOOR_DEFAULTS[nextType].width));
    setH(String(DOOR_DEFAULTS[nextType].height));
    setError('');
  };
  const handleAdd = () => {
    const position = Number(normalizeNumber(pos.trim()));
    const width = Number(normalizeNumber(w.trim()));
    const height = Number(normalizeNumber(h.trim()));
    if (!wallId || !walls.some(wall => wall.id === wallId)) {
      setError('اختر جداراً صالحاً لإضافة الباب.');
      return;
    }
    if (!pos.trim() || !w.trim() || !h.trim() || ![position, width, height].every(Number.isFinite)) {
      setError('أدخل قيماً رقمية صحيحة للموقع والعرض والارتفاع.');
      return;
    }
    if (position < 0 || width <= 0 || height <= 0) {
      setError('يجب ألا يكون الموقع سالباً، ويجب أن يكون العرض والارتفاع أكبر من الصفر.');
      return;
    }
    setError('');
    onAdd({
      wallId, position, width, height,
      thickness: 0.05, hinge: 'start', swing: 1, side: 1, doorType,
    });
  };
  const updateField = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(normalizeNumber(event.target.value));
      if (error) setError('');
    };
  return (
    <section style={panelStyle} aria-label="إضافة باب جديد" dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span style={{ color: '#56dcef', display: 'flex' }}><StudioIcon name="door" size={21} /></span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>إضافة باب جديد</div>
          <div style={{ fontSize: 11, color: '#91b9cb', marginTop: 3 }}>اختر نوع الباب والجدار وحدد الأبعاد بالمتر</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="studio-door-type" style={labelStyle}>نوع الباب</label>
        <select id="studio-door-type" value={doorType} onChange={event => selectDoorType(event.target.value as DoorType)} style={fieldStyle}>
          {(Object.keys(DOOR_DEFAULTS) as DoorType[]).map(type => (
            <option key={type} value={type}>{DOOR_DEFAULTS[type].label} — {DOOR_DEFAULTS[type].description}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="studio-door-wall" style={labelStyle}>الجدار المستهدف</label>
        <select id="studio-door-wall" value={wallId} onChange={event => { setWallId(event.target.value); setError(''); }} style={fieldStyle} disabled={walls.length === 0}>
          {walls.length === 0 && <option value="">لا توجد جدران متاحة</option>}
          {walls.map((wall, index) => (
            <option key={wall.id} value={wall.id}>جدار {index + 1} — {wall.type === 'exterior' ? 'خارجي' : 'داخلي'}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 12 }}>
        {([
          ['الموقع (م)', pos, setPos, 'studio-door-position'],
          ['العرض (م)', w, setW, 'studio-door-width'],
          ['الارتفاع (م)', h, setH, 'studio-door-height'],
        ] as const).map(([label, value, setter, id]) => (
          <div key={id} style={{ minWidth: 0 }}>
            <label htmlFor={id} style={labelStyle}>{label}</label>
            <input id={id} type="text" inputMode="decimal" dir="ltr" lang="en" value={value}
              onChange={updateField(setter)} onFocus={event => event.currentTarget.select()}
              style={{ ...fieldStyle, textAlign: 'center' }} />
          </div>
        ))}
      </div>
      {error && <div role="alert" style={{ color: '#ffd1d1', background: 'rgba(195, 53, 65, .18)', border: '1px solid rgba(248, 113, 113, .35)', borderRadius: 8, padding: 9, fontSize: 12, marginBottom: 12 }}>{error}</div>}
      {walls.length === 0 && <p style={{ color: '#f2c889', fontSize: 12, margin: '0 0 12px' }}>ارسم جداراً أولاً حتى تتمكن من إضافة باب.</p>}
      <button type="button" onClick={handleAdd} disabled={walls.length === 0}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7,
          border: '1px solid #51e3f0', borderRadius: 8, padding: '10px 12px',
          background: walls.length ? 'linear-gradient(135deg, #087c98, #0c9caa)' : '#314859',
          color: '#fff', fontWeight: 800, fontSize: 13, cursor: walls.length ? 'pointer' : 'not-allowed' }}>
        <StudioIcon name="plus" size={17} /> إضافة الباب
      </button>
    </section>
  );
};
