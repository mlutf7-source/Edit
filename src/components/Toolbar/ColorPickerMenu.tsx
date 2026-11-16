import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ColorTheme } from '../../core/colorTheme';
import { COLOR_ITEMS } from '../../core/colorTheme';
import { StudioIcon } from './StudioIcon';
interface Props {
  theme: ColorTheme;
  onColorChange: (key: keyof ColorTheme, value: string) => void;
  onReset: () => void;
}
const groups: { title: string; icon: React.ComponentProps<typeof StudioIcon>['name']; keys: (keyof ColorTheme)[] }[] = [
  { title: 'الجدران والحدود', icon: 'wall', keys: ['wallFill', 'wallBorder', 'wallHandle', 'wallDimensionLabel', 'landBoundaryFill', 'helperLineFill', 'roundCornerFirstFill'] },
  { title: 'الأبواب والنوافذ', icon: 'door', keys: ['windowFrame', 'windowGlass', 'windowGlassLines', 'doorRegular', 'doorMain', 'doorShop'] },
  { title: 'الأعمدة والسلالم', icon: 'stairs', keys: ['columnFill', 'stairFill', 'stairBorder', 'stairLines', 'landingFill', 'landingBorder', 'stairArrow'] },
  { title: 'الغرف والمناطق', icon: 'home', keys: ['kitchenFill', 'bathroomFill', 'roomFill', 'hallFill'] },
  { title: 'القياسات والمحاور', icon: 'ruler', keys: ['dimensionLine', 'dimensionText', 'axisLine', 'axisText'] },
  { title: 'ألوان عامة', icon: 'palette', keys: ['selection', 'textColor'] },
];
const actionStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  border: '1px solid #33516c', borderRadius: 9, background: '#142c43',
  color: '#e6f6ff', padding: '8px 11px', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
};
export const ColorPickerMenu: React.FC<Props> = ({ theme, onColorChange, onReset }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const updatePosition = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const bounds = trigger.getBoundingClientRect();
    const margin = 10;
    const width = Math.min(340, window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(bounds.right - width, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - bounds.bottom - margin;
    const spaceAbove = bounds.top - margin;
    const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(120, placeAbove ? spaceAbove - 6 : spaceBelow - 6);
    setPosition({
      position: 'fixed', left, width, maxHeight: Math.min(520, availableHeight),
      ...(placeAbove ? { bottom: window.innerHeight - bounds.top + 6 } : { top: bounds.bottom + 6 }),
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const update = () => updatePosition();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, updatePosition]);
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
        setConfirmReset(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setConfirmReset(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);
  const toggle = (name: string) => setCollapsed(previous => previous.includes(name)
    ? previous.filter(item => item !== name)
    : [...previous, name]);
  const used = new Set(groups.flatMap(group => group.keys));
  const extra = COLOR_ITEMS.filter(item => !used.has(item.key));
  const allGroups = [...groups, ...(extra.length ? [{ title: 'ألوان إضافية', icon: 'palette' as const, keys: extra.map(item => item.key) }] : [])];
  const filter = search.trim().toLocaleLowerCase();
  const visible = allGroups.map(group => ({
    ...group,
    items: COLOR_ITEMS.filter(item => group.keys.includes(item.key) &&
      (!filter || item.label.toLocaleLowerCase().includes(filter) || String(item.key).toLowerCase().includes(filter))),
  })).filter(group => group.items.length > 0);
  return <div className="edit-studio-colors" dir="rtl" style={{ flex: '0 0 auto' }}>
    <button ref={buttonRef} type="button" aria-expanded={open} aria-haspopup="dialog"
      aria-controls={open ? titleId : undefined}
      onClick={() => { setOpen(previous => !previous); setConfirmReset(false); }}
      style={{ ...actionStyle, background: open ? '#14546a' : '#142c43', borderColor: open ? '#28d9ef' : '#33516c' }}>
      <StudioIcon name="palette" size={17} /> الألوان
      <StudioIcon name="chevron" size={13} />
    </button>
    {open && createPortal(<div ref={panelRef} id={titleId} role="dialog" aria-label="تخصيص ألوان المخطط"
      dir="rtl" className="edit-studio-colors-menu"
      style={{ ...position, zIndex: 2147483000, boxSizing: 'border-box', overflowY: 'auto', overscrollBehavior: 'contain',
        padding: 12, border: '1px solid #35637c', borderRadius: 13, background: '#10263b', color: '#e8f7ff',
        boxShadow: '0 14px 38px #0008', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 11 }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}><StudioIcon name="palette" size={18} /> تخصيص ألوان المخطط</strong>
        <button type="button" aria-label="إغلاق لوحة الألوان" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
          style={{ ...actionStyle, padding: '4px 9px' }}>✕</button>
      </div>
      <input ref={searchRef} type="search" value={search} onChange={event => setSearch(event.target.value)}
        placeholder="البحث عن لون..." aria-label="البحث في ألوان المخطط"
        style={{ boxSizing: 'border-box', width: '100%', padding: '9px', border: '1px solid #3d617b', borderRadius: 8,
          marginBottom: 10, fontSize: 13, background: '#0a1c2d', color: '#fff', fontFamily: 'inherit' }} />
      {visible.map(group => <section key={group.title} style={{ border: '1px solid #2c4c65', borderRadius: 9, overflow: 'hidden', marginBottom: 8 }}>
        <button type="button" aria-expanded={!collapsed.includes(group.title) || Boolean(filter)}
          onClick={() => toggle(group.title)}
          style={{ ...actionStyle, width: '100%', justifyContent: 'space-between', border: 0, borderRadius: 0, background: '#19374f' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><StudioIcon name={group.icon} size={17} /> {group.title}</span>
          <StudioIcon name={collapsed.includes(group.title) && !filter ? 'plus' : 'minus'} size={15} />
        </button>
        {(!collapsed.includes(group.title) || Boolean(filter)) && group.items.map(item => <label key={item.key}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '9px 10px', borderTop: '1px solid #27465e', fontSize: 12, cursor: 'pointer' }}>
          <span>{item.label}</span>
          <span style={{ position: 'relative', width: 46, height: 29, flexShrink: 0, borderRadius: 7,
            border: '1px solid #6a8296', background: theme[item.key], boxShadow: 'inset 0 0 0 2px #fff' }}>
            <input type="color" aria-label={`تغيير ${item.label}`} value={theme[item.key]}
              onChange={event => onColorChange(item.key, event.target.value)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </span>
        </label>)}
      </section>)}
      {visible.length === 0 && <div role="status" style={{ padding: 14, textAlign: 'center', fontSize: 12 }}>لا توجد ألوان مطابقة للبحث</div>}
      {confirmReset ? <div role="group" aria-label="تأكيد استعادة الألوان الافتراضية"
        style={{ padding: 10, border: '1px solid #647d95', borderRadius: 9, background: '#19374f' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12 }}>هل تريد استعادة جميع الألوان الافتراضية؟</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={{ ...actionStyle, flex: 1, background: '#0e7490' }}
            onClick={() => { onReset(); setConfirmReset(false); }}>نعم، استعادة</button>
          <button type="button" style={{ ...actionStyle, flex: 1 }} onClick={() => setConfirmReset(false)}>إلغاء</button>
        </div>
      </div> : <button type="button" onClick={() => setConfirmReset(true)}
        style={{ ...actionStyle, width: '100%', marginTop: 4 }}>
        <StudioIcon name="undo" size={16} /> استعادة الألوان الافتراضية
      </button>}
    </div>, document.body)}
  </div>;
};
