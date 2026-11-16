import React from 'react';
import { COLOR_PALETTE } from './view3dTypes';
const theme = {
  border: '#28465b', surface: '#102638', raised: '#183449',
  text: '#e6f3fb', muted: '#a9c1d0', accent: '#40c8ed',
};
const S: Record<string, React.CSSProperties> = {
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 4px', borderBottom: `1px solid ${theme.border}`, direction: 'rtl' },
  label: { fontSize: 13, fontWeight: 600, color: theme.text },
  value: { fontSize: 13, fontWeight: 700, color: theme.accent },
  input: { width: 90, maxWidth: '100%', padding: '7px 9px', border: `1px solid ${theme.border}`, borderRadius: 7, fontSize: 13, textAlign: 'center', direction: 'ltr', color: theme.text, background: theme.surface, boxSizing: 'border-box' },
  btn: { flex: '1 1 auto', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
export const rowStyle = S.row;
export const labelStyle = S.label;
export const valueStyle = S.value;
export const inputStyle = S.input;
const normalizeNumber = (raw: string) => raw.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0)).replace(/[٫،]/g, '.').replace(/,/g, '.').trim();
export const CollapsibleSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return <section style={{ borderBottom: `1px solid ${theme.border}`, direction: 'rtl' }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 5px', background: 'transparent', border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: theme.text, textAlign: 'right' }}>
      <span>{title}</span><span aria-hidden="true" style={{ color: theme.accent, fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
    </button>
    {open && <div style={{ padding: '0 5px 14px' }}>{children}</div>}
  </section>;
};
export const ColorPicker: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const [showPalette, setShowPalette] = React.useState(false);
  return <div style={{ padding: '10px 4px', direction: 'rtl' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <span style={S.label}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-label={`اللون الحالي ${value}`} title={value} style={{ width: 38, height: 27, background: value, borderRadius: 6, border: `2px solid ${theme.border}`, display: 'inline-block' }} />
        <button type="button" aria-expanded={showPalette} onClick={() => setShowPalette(v => !v)} style={{ padding: '6px 11px', fontSize: 12, border: `1px solid ${theme.border}`, borderRadius: 7, cursor: 'pointer', background: showPalette ? theme.accent : theme.raised, color: showPalette ? '#072131' : theme.text, fontWeight: 700 }}>{showPalette ? 'إخفاء الألوان' : 'اختيار لون'}</button>
      </div>
    </div>
    {showPalette && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(34px, 1fr))', gap: 7, padding: 10, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 9, marginTop: 10 }}>
      {COLOR_PALETTE.map(c => <button type="button" key={c} onClick={() => onChange(c)} aria-label={`اختيار اللون ${c}`} aria-pressed={value.toLowerCase() === c.toLowerCase()} title={c} style={{ width: '100%', minHeight: 34, aspectRatio: '1', background: c, borderRadius: 6, border: value.toLowerCase() === c.toLowerCase() ? `3px solid ${theme.accent}` : '1px solid #71889b', cursor: 'pointer', padding: 0 }} />)}
      <label title="لون مخصص" style={{ minHeight: 34, aspectRatio: '1', borderRadius: 6, border: `1px solid ${theme.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', position: 'relative', overflow: 'hidden' }}>
        <input aria-label="اختيار لون مخصص" type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
      </label>
    </div>}
  </div>;
};
export const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <div style={S.row}><span style={S.label}>{label}</span>{children}</div>;
export const SliderRow: React.FC<{ label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }> = ({ label, value, min, max, step, display, onChange }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [invalid, setInvalid] = React.useState(false);
  const startEdit = () => { setDraft(String(value)); setInvalid(false); setEditing(true); };
  const commit = () => {
    const normalized = normalizeNumber(draft);
    const next = Number(normalized);
    if (!normalized || !Number.isFinite(next) || next < min || next > max) { setInvalid(true); return; }
    onChange(next); setEditing(false); setInvalid(false);
  };
  return <div style={{ padding: '11px 4px', borderBottom: `1px solid ${theme.border}`, direction: 'rtl' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 9 }}>
      <span style={S.label}>{label}</span>
      {editing ? <input type="text" inputMode="decimal" dir="ltr" aria-label={`تعديل ${label}`} aria-invalid={invalid} value={draft} autoFocus onFocus={e => e.currentTarget.select()} onChange={e => { setDraft(e.target.value); setInvalid(false); }} onBlur={() => { const n = Number(normalizeNumber(draft)); if (normalizeNumber(draft) && Number.isFinite(n) && n >= min && n <= max) { onChange(n); } setEditing(false); setInvalid(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setEditing(false); setInvalid(false); } }} style={{ ...S.input, borderColor: invalid ? '#f28b8b' : theme.accent }} /> : <button type="button" onClick={startEdit} title="انقر لتعديل القيمة" style={{ ...S.value, cursor: 'pointer', border: `1px dashed ${theme.accent}`, borderRadius: 6, background: theme.raised, padding: '5px 9px' }}>{display}</button>}
    </div>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: theme.accent, cursor: 'pointer' }} />
    {invalid && editing && <div role="alert" style={{ fontSize: 11, color: '#ffaaa9' }}>أدخل قيمة بين {min} و{max}.</div>}
  </div>;
};
export const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => <FormRow label={label}><input aria-label={label} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: theme.accent, cursor: 'pointer' }} /></FormRow>;
export const ButtonGroup: React.FC<{ label?: string; options: { value: any; label: string }[]; selected: any; onChange: (v: any) => void; compact?: boolean }> = ({ label, options, selected, onChange, compact }) => <div style={{ padding: '10px 4px', direction: 'rtl' }}>
  {label && <span style={S.label}>{label}</span>}
  <div role="group" aria-label={label || 'خيارات'} style={{ display: 'flex', gap: 7, marginTop: label ? 9 : 0, flexWrap: 'wrap' }}>
    {options.map(opt => <button type="button" key={String(opt.value)} aria-pressed={selected === opt.value} onClick={() => onChange(opt.value)} style={{ ...S.btn, minWidth: compact ? 42 : 64, background: selected === opt.value ? theme.accent : theme.raised, borderColor: selected === opt.value ? theme.accent : theme.border, color: selected === opt.value ? '#082335' : theme.text }}>{opt.label}</button>)}
  </div>
</div>;
