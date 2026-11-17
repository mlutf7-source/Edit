import React, { useState } from 'react';
import { StudioIcon } from '../Toolbar/StudioIcon';
import type { StudioIconName } from '../Toolbar/StudioIcon';
import type { AppMode, DrawingType } from '../../core/types';
interface Props {
  mode: AppMode;
  drawingType: DrawingType;
  onStartDrawing: (type: DrawingType) => void;
  onCurvedWall: () => void;
  onBoundary: () => void;
  onHelperLine: () => void;
  onFence: () => void;
  onStairs: () => void;
  onDimensions: () => void;
  onAxes: () => void;
  onCancel: () => void;
  showFloorsPanel: boolean;
  onToggleFloorsPanel: () => void;
}
type Tool = {
  id: string;
  label: string;
  icon: StudioIconName;
  action: () => void;
  active?: boolean;
};
export const StudioDrawingRail: React.FC<Props> = p => {
  const [expanded, setExpanded] = useState(true);
  const storageKey = 'edit-studio-rail-shortcuts';
  const [customizing, setCustomizing] = useState(false);
  const [savedIds, setSavedIds] = useState<string[] | null>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return null;
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) && value.every(v => typeof v === 'string')
        ? value : null;
    } catch { return null; }
  });
  const saveIds = (ids: string[]) => {
    setSavedIds(ids);
    try { window.localStorage.setItem(storageKey, JSON.stringify(ids)); }
    catch { /* Storage may be unavailable; state still works. */ }
  };
  const drawing = (type: DrawingType) =>
    p.mode === 'drawing' && p.drawingType === type;
  const tools: Tool[] = [
    {
      id: 'select',
      label: 'تحديد',
      icon: 'select',
      action: p.onCancel,
      active: p.mode === 'view',
    },
    {
      id: 'exterior',
      label: 'جدار خارجي',
      icon: 'wall',
      action: () => p.onStartDrawing('exterior'),
      active: drawing('exterior'),
    },
    {
      id: 'interior',
      label: 'جدار داخلي',
      icon: 'wall',
      action: () => p.onStartDrawing('interior'),
      active: drawing('interior'),
    },
    {
      id: 'curved',
      label: 'جدار منحني',
      icon: 'arc',
      action: p.onCurvedWall,
      active: drawing('curved-wall'),
    },
    {
      id: 'boundary',
      label: 'حدود الأرض',
      icon: 'boundary',
      action: p.onBoundary,
      active: drawing('land-boundary'),
    },
    {
      id: 'helper',
      label: 'خط مساعد',
      icon: 'helper-line',
      action: p.onHelperLine,
      active: drawing('helper-line'),
    },
    {
      id: 'fence',
      label: 'سور الحدود',
      icon: 'fence',
      action: p.onFence,
    },
    {
      id: 'stairs',
      label: 'السلالم',
      icon: 'stairs',
      action: p.onStairs,
    },
    {
      id: 'dimensions',
      label: 'الأبعاد',
      icon: 'dimension',
      action: p.onDimensions,
    },
    {
      id: 'axes',
      label: 'المحاور',
      icon: 'axis',
      action: p.onAxes,
    },
    {
      id: 'floors',
      label: 'الأدوار',
      icon: 'floor',
      action: p.onToggleFloorsPanel,
      active: p.showFloorsPanel,
    },
  ];
  const allIds = tools.map(t => t.id);
  const orderedIds = savedIds === null ? allIds : [
    ...savedIds.filter(id => allIds.includes(id)),
  ];
  const visibleTools = orderedIds
    .map(id => tools.find(t => t.id === id))
    .filter((t): t is Tool => t !== undefined);
  const availableTools = tools.filter(t => !orderedIds.includes(t.id));
  const moveTool = (id: string, delta: number) => {
    const next = [...orderedIds];
    const from = next.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    saveIds(next);
  };
  const controlStyle: React.CSSProperties = {
    border: '1px solid #42647a', background: '#102f43', color: '#e6faff',
    borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
  };
  return (
    <aside
      className={'studio-drawing-rail' + (expanded ? '' : ' is-collapsed')}
      dir="rtl"
      aria-label="أدوات الرسم السريعة"
      data-expanded={expanded ? 'true' : 'false'}
      onPointerDown={e => e.stopPropagation()}
      onPointerMove={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onPointerCancel={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <button
        type="button"
        className="studio-rail-toggle studio-rail-collapse-control"
        aria-expanded={expanded}
        aria-controls="studio-drawing-rail-tools"
        aria-label={expanded ? 'طي شريط أدوات الرسم' : 'فتح شريط أدوات الرسم'}
        title={expanded ? 'طي شريط أدوات الرسم' : 'فتح شريط أدوات الرسم'}
        onClick={() => setExpanded(v => !v)}
      >
        <StudioIcon name="menu" size={17} />
        <span>{expanded ? 'طي' : 'فتح'}</span>
        <span className={'studio-rail-collapse-arrow' + (expanded ? ' is-expanded' : '')} aria-hidden="true">
          <StudioIcon name={expanded ? 'chevron-up' : 'chevron-right'} size={15} />
        </span>
      </button>
      <div
        id="studio-drawing-rail-tools"
        className="studio-rail-tools"
        role="group"
        aria-label="أوامر الرسم"
        hidden={!expanded}
        style={!expanded ? { display: 'none' } : undefined}
      >
        {visibleTools.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%' }}>
            <button
              type="button"
              title={t.label}
              aria-label={t.label}
              aria-pressed={t.active === undefined ? undefined : t.active}
              className={'studio-rail-tool' + (t.active ? ' is-active' : '')}
              onClick={t.action}
              style={{ flex: 1, minWidth: 0 }}
            >
              <StudioIcon name={t.icon} size={20} />
              <span>{t.label}</span>
            </button>
            {customizing && (
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" style={controlStyle} title="رفع الاختصار" aria-label={'رفع ' + t.label}
                  disabled={orderedIds.indexOf(t.id) === 0} onClick={() => moveTool(t.id, -1)}>↑</button>
                <button type="button" style={controlStyle} title="خفض الاختصار" aria-label={'خفض ' + t.label}
                  disabled={orderedIds.indexOf(t.id) === orderedIds.length - 1} onClick={() => moveTool(t.id, 1)}>↓</button>
                <button type="button" style={controlStyle} title="إزالة الاختصار" aria-label={'إزالة ' + t.label}
                  onClick={() => saveIds(orderedIds.filter(id => id !== t.id))}>×</button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="studio-rail-tool" aria-pressed={customizing}
          title="تخصيص اختصارات الشريط" onClick={() => setCustomizing(v => !v)}>
          <StudioIcon name="settings" size={18} />
          <span>{customizing ? 'إنهاء التخصيص' : 'تخصيص'}</span>
        </button>
        {customizing && (
          <div style={{ display: 'grid', gap: 6, padding: 6, background: '#0b2438', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}>
            <select aria-label="إضافة اختصار" value="" onChange={e => {
              const id = e.target.value;
              if (id && !orderedIds.includes(id) && allIds.includes(id)) saveIds([...orderedIds, id]);
            }} style={{ ...controlStyle, width: '100%', minWidth: 0 }}>
              <option value="">+ إضافة اختصار</option>
              {availableTools.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button type="button" style={controlStyle} onClick={() => saveIds(allIds)}>
              استعادة الاختصارات الافتراضية
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
