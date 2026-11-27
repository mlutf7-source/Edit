import React, { useEffect, useId, useState } from 'react';
import type { Axis } from '../../core/types';
import { v4 as uuidv4 } from 'uuid';
interface Props { onClose: () => void; onCreateAxes: (axes: Axis[]) => void; existingAxes: Axis[]; }
const inputStyle: React.CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px', borderRadius: 8, border: '1px solid #47647a', background: '#0e2638', color: '#f0fbff', fontSize: 14, textAlign: 'center', direction: 'ltr', outlineColor: '#39d9f0' };
const buttonStyle: React.CSSProperties = { borderRadius: 8, border: '1px solid #47647a', padding: '10px 14px', color: '#e9f9ff', background: '#203c50', cursor: 'pointer', fontWeight: 600 };
// ✅ دالة تقريب الأرقام لمنع الأعداد العشرية اللانهائية
const formatNum = (n: number): string => {
  if (!isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
};
export const AxisDialog: React.FC<Props> = ({ onClose, onCreateAxes, existingAxes }) => {
  const titleId = useId();
  const [error, setError] = useState('');
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const vAxes = existingAxes.filter(a => a.type === 'vertical').sort((a, b) => a.position - b.position);
  const hAxes = existingAxes.filter(a => a.type === 'horizontal').sort((a, b) => a.position - b.position);
  const [vLen, setVLen] = useState(vAxes.length > 0 ? formatNum(vAxes[0].length) : '10');
  const [hLen, setHLen] = useState(hAxes.length > 0 ? formatNum(hAxes[0].length) : '10');
  const [vSpacings, setVSpacings] = useState<string[]>(() => {
    if (vAxes.length < 2) return ['3', '3'];
    const sp: string[] = [];
    for (let i = 1; i < vAxes.length; i++) sp.push(formatNum(Math.abs(vAxes[i].position - vAxes[i - 1].position)));
    return sp;
  });
  const [hSpacings, setHSpacings] = useState<string[]>(() => {
    if (hAxes.length < 2) return ['3', '3'];
    const sp: string[] = [];
    for (let i = 1; i < hAxes.length; i++) sp.push(formatNum(Math.abs(hAxes[i].position - hAxes[i - 1].position)));
    return sp;
  });
  const safeParse = (v: string, fb = 0) => { if (v === '' || v === '.' || v === ',') return fb; const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? fb : n; };
  const handleCreate = () => {
    const vl = safeParse(vLen, NaN); const hl = safeParse(hLen, NaN);
    const allSpacings = [...vSpacings, ...hSpacings].map(s => safeParse(s, NaN));
    if (![vl, hl].every(n => Number.isFinite(n) && n > 0) || !allSpacings.every(n => Number.isFinite(n) && n > 0)) {
      setError('يرجى إدخال أطوال ومسافات موجبة وصحيحة لجميع المحاور.');
      return;
    }
    setError('');
    const vSp = vSpacings.map(s => safeParse(s, 0)).filter(x => x > 0);
    const hSp = hSpacings.map(s => safeParse(s, 0)).filter(x => x > 0);
    const vPos: number[] = [0]; vSp.forEach(s => vPos.push(vPos[vPos.length - 1] + s));
    const hPos: number[] = [0]; hSp.forEach(s => hPos.push(hPos[hPos.length - 1] + s));
    const vc = vPos.reduce((a, b) => a + b, 0) / vPos.length;
    const hc = hPos.reduce((a, b) => a + b, 0) / hPos.length;
    const newAxes: Axis[] = [];
    vPos.forEach((p, i) => newAxes.push({ id: uuidv4(), type: 'vertical', label: String.fromCharCode(65 + i), position: p - vc, center: 0, length: vl, offset: 0 }));
    hPos.forEach((p, i) => newAxes.push({ id: uuidv4(), type: 'horizontal', label: String(i + 1), position: p - hc, center: 0, length: hl, offset: 0 }));
    onCreateAxes(newAxes); onClose();
  };
  const renderColumn = (title: string, len: string, setLen: (s: string) => void, spacings: string[], setSpacings: (s: string[]) => void, type: 'vertical' | 'horizontal') => (
    <div style={{ flex: '1 1 235px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, padding: 12, border: '1px solid #35556a', borderRadius: 10, background: '#122e42' }}>
      <h4 style={{ margin: 0, color: '#80edff' }}>{title}</h4>
      <label style={{ fontSize: 12, fontWeight: 700 }}>طول المحاور (متر):</label>
      <input
        type="text" inputMode="decimal" dir="ltr" value={len}
        onChange={e => setLen(e.target.value)}
        onFocus={(e) => e.target.select()}
        style={inputStyle}
      />
      <label style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>المسافات بين المحاور:</label>
      {spacings.map((s, i) => {
        const l1 = type === 'vertical' ? String.fromCharCode(65 + i) : String(i + 1);
        const l2 = type === 'vertical' ? String.fromCharCode(65 + i + 1) : String(i + 2);
        return (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, minWidth: 60, color: '#d5ebf4' }}>{l1} — {l2}:</span>
            <input
              type="text" inputMode="decimal" dir="ltr" value={s}
              onChange={e => { const c = [...spacings]; c[i] = e.target.value; setSpacings(c); }}
              onFocus={(e) => e.target.select()}
              style={inputStyle}
            />
            <button type="button" aria-label={`حذف المسافة ${l1} إلى ${l2}`} onClick={() => setSpacings(spacings.filter((_, j) => j !== i))} style={{ ...buttonStyle, padding: '8px 11px', background: '#632a39', borderColor: '#994b5c' }}>×</button>
          </div>
        );
      })}
      <button type="button" onClick={() => setSpacings([...spacings, '3'])} style={{ ...buttonStyle, borderStyle: 'dashed', color: '#7feaff' }}>+ إضافة مسافة</button>
    </div>
  );
  return (
    <div dir="rtl" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(1, 12, 22, .78)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ boxSizing: 'border-box', background: '#0b2132', border: '1px solid #3a657a', color: '#f0fbff', boxShadow: '0 18px 60px rgba(0,0,0,.45)', borderRadius: 14, padding: 12, width: '100%', maxWidth: 480, maxHeight: 'min(92vh, 800px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #35556a', paddingBottom: 12 }}>
          <div>
            <h3 id={titleId} style={{ margin: 0, color: '#83f0ff', fontSize: 18 }}>إعداد المحاور</h3>
            <p style={{ margin: '5px 0 0', color: '#a8c4d3', fontSize: 12 }}>حدد الأطوال والمسافات بين المحاور الرأسية والأفقية بالمتر.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق نافذة المحاور" style={{ ...buttonStyle, padding: '6px 11px', fontSize: 20 }}>×</button>
        </header>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {renderColumn('المحاور الرأسية', vLen, setVLen, vSpacings, setVSpacings, 'vertical')}
          {renderColumn('المحاور الأفقية', hLen, setHLen, hSpacings, setHSpacings, 'horizontal')}
        </div>
        {error && <div role="alert" style={{ color: '#ffd1d1', background: '#5b2632', padding: 10, borderRadius: 8, fontSize: 13 }}>{error}</div>}
        <footer style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #35556a', paddingTop: 12 }}>
          <button type="button" onClick={handleCreate} style={{ ...buttonStyle, flex: '1 1 220px', background: '#086e86', borderColor: '#24b9d5' }}>توقيع المحاور على الشبكة</button>
          <button type="button" onClick={onClose} style={{ ...buttonStyle, flex: '0 1 110px' }}>إلغاء</button>
        </footer>
      </section>
    </div>
  );
};
