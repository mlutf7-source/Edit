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
  return (
    <aside
      className={
        'studio-drawing-rail' +
        (expanded ? '' : ' is-collapsed')
      }
      dir="rtl"
      aria-label="أدوات الرسم السريعة"
      data-expanded={expanded ? "true" : "false"}
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
        aria-label={
          expanded
            ? 'طي شريط أدوات الرسم'
            : 'فتح شريط أدوات الرسم'
        }
        title={
          expanded
            ? 'طي شريط أدوات الرسم'
            : 'فتح شريط أدوات الرسم'
        }
        onClick={() => setExpanded(v => !v)}
      >
        <StudioIcon name="menu" size={17} />
        <span>{expanded ? 'طي' : 'فتح'}</span>
        <span
          className={
            'studio-rail-collapse-arrow' +
            (expanded ? ' is-expanded' : '')
          }
          aria-hidden="true"
        >
          <StudioIcon name={expanded ? "chevron-up" : "chevron-right"} size={15} />
        </span>
      </button>
      <div
        id="studio-drawing-rail-tools"
        className="studio-rail-tools"
        role="group"
        aria-label="أوامر الرسم"
        hidden={!expanded}
        style={
          expanded
            ? undefined
            : { display: 'none' }
        }
      >
        {tools.map(t => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            aria-label={t.label}
            aria-pressed={
              t.active === undefined
                ? undefined
                : t.active
            }
            className={
              'studio-rail-tool' +
              (t.active ? ' is-active' : '')
            }
            onClick={t.action}
          >
            <StudioIcon name={t.icon} size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
