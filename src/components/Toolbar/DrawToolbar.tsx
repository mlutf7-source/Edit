import React from 'react';
import type { AppMode, DrawingType } from '../../core/types';
import { StudioIcon } from './StudioIcon';
interface Props {
  mode: AppMode;
  drawingType: DrawingType;
  onStartDrawing: (type: DrawingType) => void;
}
/** Controls only the presentation of the drawing-mode choices. */
export const DrawToolbar: React.FC<Props> = ({
  mode,
  drawingType,
  onStartDrawing,
}) => {
  const choices = [
    { type: 'exterior' as const, label: 'رسم خارجي', icon: 'wall' as const },
    { type: 'interior' as const, label: 'رسم داخلي', icon: 'home' as const },
  ];
  return (
    <div
      className="studio-draw-toolbar"
      role="group"
      aria-label="اختيار نوع الرسم"
      dir="rtl"
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}
    >
      {choices.map(({ type, label, icon }) => {
        const active = mode === 'drawing' && drawingType === type;
        return (
          <button
            key={type}
            type="button"
            className={`studio-draw-toolbar-button${active ? ' is-active' : ''}`}
            aria-pressed={active}
            title={label}
            onClick={() => onStartDrawing(type)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              margin: 0,
              border: `1px solid ${active ? '#3495dc' : '#c7d7e8'}`,
              borderRadius: 9,
              background: active ? '#ddecff' : '#f4f8fd',
              color: '#18344e',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <StudioIcon name={icon} size={17} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
