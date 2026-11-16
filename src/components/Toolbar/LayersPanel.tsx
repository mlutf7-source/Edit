import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudioIcon, type StudioIconName } from './StudioIcon';
export interface LayersState {
  walls: boolean; landBoundaries: boolean; helperLines: boolean;
  dimensions: boolean; columns: boolean; windows: boolean;
  doors: boolean; openings: boolean; texts: boolean;
  regions: boolean; stairs: boolean; northArrow: boolean; axes: boolean;
}
interface Props {
  layers: LayersState;
  onToggleLayer: (layer: keyof LayersState) => void;
  onToggleAll: () => void;
  allUnlocked: boolean;
}
type LayerItem = { key: keyof LayersState; label: string; icon: StudioIconName };
type LayerGroup = { title: string; icon: StudioIconName; items: LayerItem[] };
const groups: LayerGroup[] = [
  { title: 'الجدران والحدود', icon: 'wall', items: [
    { key: 'walls', label: 'الجدران', icon: 'wall' },
    { key: 'landBoundaries', label: 'حدود الأرض', icon: 'square' },
    { key: 'helperLines', label: 'الخطوط المساعدة', icon: 'ruler' },
  ] },
  { title: 'العناصر المعمارية', icon: 'home', items: [
    { key: 'columns', label: 'الأعمدة', icon: 'column' },
    { key: 'doors', label: 'الأبواب', icon: 'door' },
    { key: 'windows', label: 'النوافذ', icon: 'window' },
    { key: 'openings', label: 'الفتحات', icon: 'square' },
    { key: 'stairs', label: 'السلالم', icon: 'stairs' },
  ] },
  { title: 'المناطق', icon: 'home', items: [
    { key: 'regions', label: 'الغرف والمناطق', icon: 'home' },
  ] },
  { title: 'القياسات والتوضيحات', icon: 'ruler', items: [
    { key: 'dimensions', label: 'الأبعاد', icon: 'ruler' },
    { key: 'axes', label: 'المحاور', icon: 'grid' },
    { key: 'texts', label: 'النصوص', icon: 'type' },
    { key: 'northArrow', label: 'سهم الشمال', icon: 'compass' },
  ] },
];
const allItems = groups.flatMap(group => group.items);
export const LayersPanel: React.FC<Props> = ({ layers, onToggleLayer, onToggleAll, allUnlocked }) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const unlocked = allItems.filter(item => layers[item.key]).length;
  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(310, window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
    const availableBelow = window.innerHeight - rect.bottom - margin * 2;
    const availableAbove = rect.top - margin * 2;
    const showAbove = availableBelow < 240 && availableAbove > availableBelow;
    setPosition({
      position: 'fixed',
      left,
      width,
      ...(showAbove ? { bottom: window.innerHeight - rect.top + 5 } : { top: rect.bottom + 5 }),
      maxHeight: Math.max(120, Math.min(window.innerHeight - margin * 2, showAbove ? availableAbove : availableBelow)),
      zIndex: 10050,
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    searchRef.current?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);
  const toggleGroup = (title: string) => setCollapsed(current =>
    current.includes(title) ? current.filter(item => item !== title) : [...current, title]);
  const query = search.trim();
  const visibleGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => item.label.includes(query)),
  })).filter(group => group.items.length > 0);
  const menu = open && (
    <div ref={menuRef} id={menuId} className="edit-studio-layers-menu" dir="rtl"
      role="dialog" aria-label="إدارة الطبقات"
      style={{ ...position, boxSizing: 'border-box', overflowY: 'auto', overscrollBehavior: 'contain',
        padding: 12, borderRadius: 12, background: '#fff', color: '#24364b',
        border: '1px solid #b9cfe3', boxShadow: '0 14px 38px rgba(9,30,56,.28)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14 }}>
          <StudioIcon name="layers" size={18} /> إدارة الطبقات
        </strong>
        <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}
          aria-label="إغلاق إدارة الطبقات" style={{ border: 0, background: 'transparent', fontSize: 23, cursor: 'pointer', color: 'inherit' }}>×</button>
      </div>
      <div aria-live="polite" style={{ fontSize: 12, opacity: .75, marginBottom: 9 }}>
        الطبقات المفتوحة: {unlocked} من {allItems.length}
      </div>
      <input ref={searchRef} type="search" value={search} onChange={event => setSearch(event.target.value)}
        placeholder="بحث عن طبقة..." aria-label="البحث في الطبقات"
        style={{ boxSizing: 'border-box', width: '100%', padding: '9px 10px', border: '1px solid #cad8e8', borderRadius: 8, marginBottom: 10, fontSize: 13 }} />
      {visibleGroups.map(group => {
        const expanded = Boolean(query) || !collapsed.includes(group.title);
        return <section key={group.title} style={{ marginBottom: 8, border: '1px solid #dce7f1', borderRadius: 9, overflow: 'hidden' }}>
          <button type="button" onClick={() => toggleGroup(group.title)} aria-expanded={expanded}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px', border: 0,
              background: '#edf4fa', color: '#18395b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><StudioIcon name={group.icon} size={16} />{group.title}</span>
            <StudioIcon name={expanded ? 'minus' : 'plus'} size={15} />
          </button>
          {expanded && group.items.map(item => <div key={item.key}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 9px', borderTop: '1px solid #edf2f7', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
              <StudioIcon name={item.icon} size={16} />{item.label}
            </span>
            <button type="button" aria-label={`${layers[item.key] ? 'قفل' : 'فتح'} ${item.label}`}
              aria-pressed={layers[item.key]} title={layers[item.key] ? 'الطبقة مفتوحة' : 'الطبقة مقفلة'}
              onClick={() => onToggleLayer(item.key)}
              style={{ minWidth: 65, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 8px', borderRadius: 7, border: `1px solid ${layers[item.key] ? '#bfdbfe' : '#fecaca'}`,
                background: layers[item.key] ? '#eff6ff' : '#fef2f2', color: layers[item.key] ? '#1d4ed8' : '#b91c1c',
                fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <StudioIcon name={layers[item.key] ? 'eye' : 'lock'} size={14} />
              {layers[item.key] ? 'مفتوحة' : 'مقفلة'}
            </button>
          </div>)}
        </section>;
      })}
      {visibleGroups.length === 0 && <div role="status" style={{ padding: 14, textAlign: 'center', fontSize: 12 }}>لا توجد طبقة بهذا الاسم</div>}
      <button type="button" onClick={onToggleAll}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: 10, marginTop: 5, border: '1px solid #bfdbfe', borderRadius: 8,
          background: '#eaf3ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
        <StudioIcon name={allUnlocked ? 'lock' : 'eye'} size={16} />
        {allUnlocked ? 'قفل جميع الطبقات' : 'فتح جميع الطبقات'}
      </button>
    </div>
  );
  return <div className="edit-studio-layers" dir="rtl" style={{ position: 'relative', width: '100%' }}>
    <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={menuId}
      onClick={() => setOpen(value => !value)}
      style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6,
        padding: '8px 6px', border: '1px solid #c5d9ed', borderRadius: 8,
        background: open ? '#dcefff' : '#f0f8ff', color: '#18395b', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <StudioIcon name="layers" size={16} /> الطبقات
      <StudioIcon name="chevron" size={13} />
    </button>
    {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
  </div>;
};
