import React from 'react';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  showZoom?: boolean;
  orthogonalMode?: boolean;
  onToggleOrthogonal?: () => void;
}
/** Controls stay independent from canvas pointer gestures and drawing state. */
export const CanvasZoomControls: React.FC<Props> = React.memo(({
  onZoomIn,
  onZoomOut,
  onReset,
  showZoom = true,
  orthogonalMode = false,
  onToggleOrthogonal,
}) => {
  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    padding: 0,
    borderRadius: 9,
    border: '1px solid rgba(100, 185, 211, 0.35)',
    background: 'linear-gradient(180deg, #17384b, #10293a)',
    color: '#d9f4ff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
    touchAction: 'manipulation',
  };
  const stopCanvasPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };
  return (
    <div
      className="studio-canvas-zoom-controls"
      role="toolbar"
      aria-label="التحكم في عرض المخطط"
      dir="rtl"
      onPointerDown={stopCanvasPointer}
      onPointerMove={stopCanvasPointer}
      onPointerUp={stopCanvasPointer}
      onPointerCancel={stopCanvasPointer}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()}
    >
      {showZoom && (
        <>
          <button type="button" className="studio-canvas-zoom-btn" onClick={onZoomIn}
            style={buttonStyle} title="تكبير المخطط" aria-label="تكبير المخطط">
            <StudioIcon name="zoom-in" size={20} />
          </button>
          <button type="button" className="studio-canvas-zoom-btn" onClick={onZoomOut}
            style={buttonStyle} title="تصغير المخطط" aria-label="تصغير المخطط">
            <StudioIcon name="zoom-out" size={20} />
          </button>
          <button type="button" className="studio-canvas-zoom-btn" onClick={onReset}
            style={buttonStyle} title="إعادة ضبط العرض" aria-label="إعادة ضبط العرض">
            <StudioIcon name="maximize" size={20} />
          </button>
        </>
      )}
      {onToggleOrthogonal && (
        <button
          type="button"
          className="studio-canvas-zoom-btn"
          onClick={onToggleOrthogonal}
          aria-pressed={orthogonalMode}
          aria-label={orthogonalMode ? 'إلغاء وضع الزاوية القائمة' : 'تفعيل وضع الزاوية القائمة'}
          title={orthogonalMode ? 'إلغاء الزاوية القائمة (رسم حر)' : 'تفعيل الزاوية القائمة (0° / 90°)'}
          style={{
            ...buttonStyle,
            background: orthogonalMode
              ? 'linear-gradient(180deg, #087c9b, #07526f)'
              : buttonStyle.background,
            borderColor: orthogonalMode ? '#38d8ed' : 'rgba(100, 185, 211, 0.35)',
            color: orthogonalMode ? '#ffffff' : '#d9f4ff',
            boxShadow: orthogonalMode
              ? '0 0 0 1px rgba(56, 216, 237, 0.25), 0 0 12px rgba(0, 211, 235, 0.22)'
              : buttonStyle.boxShadow,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>∟</span>
        </button>
      )}
    </div>
  );
});
CanvasZoomControls.displayName = 'CanvasZoomControls';
