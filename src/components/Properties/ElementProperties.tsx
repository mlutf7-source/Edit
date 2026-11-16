import React, { useState } from 'react';
import type { Column, Window, Door, Wall, Opening } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  selected: { id: string; type: 'column' | 'window' | 'door' | 'opening' } | null;
  columns: Column[];
  windows: Window[];
  doors: Door[];
  openings?: Opening[];
  walls: Wall[];
  updateColumn: (id: string, patch: Partial<Column>) => void;
  updateWindow: (id: string, patch: Partial<Window>) => void;
  updateDoor: (id: string, patch: Partial<Door>) => void;
  updateOpening?: (id: string, patch: Partial<Opening>) => void;
}
type IconName = React.ComponentProps<typeof StudioIcon>['name'];
const normalizeNumber = (raw: string): number => {
  const normalized = raw.trim()
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٫,،]/g, '.');
  if (!normalized) return NaN;
  return Number(normalized);
};
const panelStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
  padding: '12px 14px', margin: 8, borderRadius: 12,
  background: 'linear-gradient(135deg, #10283c, #0b1b2b)',
  border: '1px solid rgba(57, 202, 232, .38)', color: '#e8f7ff',
  direction: 'rtl', boxShadow: '0 8px 22px rgba(0,0,0,.15)',
};
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 100, flex: '1 1 110px' };
const inputStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 10px',
  borderRadius: 8, border: '1px solid #42677d', background: '#071827',
  color: '#f1fbff', fontSize: 14, textAlign: 'center', direction: 'ltr', outlineColor: '#35d5ef',
};
interface NumericFieldProps {
  id: string;
  label: string;
  value: number;
  onCommit: (value: number) => void;
  positive?: boolean;
  suffix?: string;
}
const NumericField: React.FC<NumericFieldProps> = ({ id, label, value, onCommit, positive = true, suffix = 'م' }) => {
  const [error, setError] = useState('');
  const commit = (element: HTMLInputElement) => {
    const next = normalizeNumber(element.value);
    if (!Number.isFinite(next) || (positive && next <= 0)) {
      setError(positive ? 'أدخل قيمة أكبر من الصفر' : 'أدخل رقماً صحيحاً');
      element.value = String(value);
      return;
    }
    setError('');
    element.value = String(next);
    if (next !== value) onCommit(next);
  };
  return (
    <label style={fieldStyle}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#b8d9e9' }}>{label} ({suffix})</span>
      <input key={`${id}-${value}`} type="text" inputMode="decimal" dir="ltr"
        defaultValue={String(value)} style={inputStyle}
        onFocus={event => event.currentTarget.select()}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        onBlur={event => commit(event.currentTarget)} aria-invalid={Boolean(error)}
        aria-label={`${label} (${suffix})`} />
      {error && <span role="alert" style={{ color: '#ffacac', fontSize: 11 }}>{error}</span>}
    </label>
  );
};
const PanelHeading: React.FC<{ icon: IconName; title: string }> = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, color: '#77e8fa', flex: '1 0 100%', fontSize: 14 }}>
    <StudioIcon name={icon} size={18} /><span>{title}</span>
  </div>
);
export const ElementProperties: React.FC<Props> = ({
  selected, columns, windows, doors, openings = [],
  updateColumn, updateWindow, updateDoor, updateOpening,
}) => {
  if (!selected) return null;
  if (selected.type === 'column') {
    const column = columns.find(item => item.id === selected.id);
    if (!column) return null;
    const circular = column.columnShape === 'circle';
    return (
      <section style={panelStyle} aria-label="خصائص العمود">
        <PanelHeading icon="column" title={circular ? 'خصائص العمود الدائري' : 'خصائص العمود'} />
        <NumericField id={`${column.id}-width`} label={circular ? 'القطر' : 'العرض'} value={column.width}
          onCommit={width => updateColumn(column.id, circular ? { width, length: width } : { width })} />
        {!circular && <NumericField id={`${column.id}-length`} label="الطول" value={column.length}
          onCommit={length => updateColumn(column.id, { length })} />}
        {!circular && <NumericField id={`${column.id}-rotation`} label="الدوران" suffix="°" positive={false}
          value={Number(((column.rotation || 0) * 180 / Math.PI).toFixed(4))}
          onCommit={degrees => updateColumn(column.id, { rotation: degrees * Math.PI / 180 })} />}
      </section>
    );
  }
  if (selected.type === 'window') {
    const win = windows.find(item => item.id === selected.id);
    if (!win) return null;
    return (
      <section style={panelStyle} aria-label="خصائص النافذة">
        <PanelHeading icon="window" title="خصائص النافذة" />
        <NumericField id={`${win.id}-width`} label="العرض" value={win.width} onCommit={width => updateWindow(win.id, { width })} />
        <NumericField id={`${win.id}-height`} label="الارتفاع" value={win.height} onCommit={height => updateWindow(win.id, { height })} />
        <NumericField id={`${win.id}-thickness`} label="السماكة" value={win.thickness} onCommit={thickness => updateWindow(win.id, { thickness })} />
      </section>
    );
  }
  if (selected.type === 'door') {
    const door = doors.find(item => item.id === selected.id);
    if (!door) return null;
    return (
      <section style={panelStyle} aria-label="خصائص الباب">
        <PanelHeading icon="door" title="خصائص الباب" />
        <NumericField id={`${door.id}-width`} label="العرض" value={door.width} onCommit={width => updateDoor(door.id, { width })} />
        <NumericField id={`${door.id}-height`} label="الارتفاع" value={door.height} onCommit={height => updateDoor(door.id, { height })} />
        <NumericField id={`${door.id}-thickness`} label="السماكة" value={door.thickness} onCommit={thickness => updateDoor(door.id, { thickness })} />
        <button type="button" onClick={() => updateDoor(door.id, { swing: door.swing === 1 ? -1 : 1 })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#164c65', color: '#e4faff', border: '1px solid #3db8d5', borderRadius: 8, padding: '9px 13px', cursor: 'pointer', fontWeight: 700 }}>
          <StudioIcon name="rotate" size={16} /> عكس اتجاه الفتح
        </button>
      </section>
    );
  }
  if (selected.type === 'opening') {
    const opening = openings.find(item => item.id === selected.id);
    if (!opening || !updateOpening) return null;
    return (
      <section style={panelStyle} aria-label="خصائص الفتحة">
        <PanelHeading icon="opening" title="خصائص الفتحة" />
        <NumericField id={`${opening.id}-width`} label="العرض" value={opening.width} onCommit={width => updateOpening(opening.id, { width })} />
        <NumericField id={`${opening.id}-height`} label="الارتفاع" value={opening.height} onCommit={height => updateOpening(opening.id, { height })} />
        <NumericField id={`${opening.id}-thickness`} label="السماكة" value={opening.thickness} onCommit={thickness => updateOpening(opening.id, { thickness })} />
        <NumericField id={`${opening.id}-elevation`} label="المنسوب" positive={false} value={opening.elevation || 0}
          onCommit={elevation => updateOpening(opening.id, { elevation })} />
      </section>
    );
  }
  return null;
};
