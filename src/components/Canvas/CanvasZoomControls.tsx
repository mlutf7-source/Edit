
import React from 'react';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  showZoom?: boolean;
  orthogonalMode?: boolean;
  onToggleOrthogonal?: () => void;
}

export const CanvasZoomControls: React.FC<Props> = React.memo(({
  onZoomIn,
  onZoomOut,
  onReset,
  showZoom = true,
  orthogonalMode = false,
  onToggleOrthogonal,
}) => {
  const zoomBtnStyle: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: 18,
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    color: '#333',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  };

  return (
    <div
      className="studio-canvas-zoom-controls"
      onPointerDown={e => e.stopPropagation()}
      onPointerMove={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onPointerCancel={e => e.stopPropagation()}
    >
      {/* أزرار التكبير والتصغير وإعادة ضبط العرض */}
      {showZoom && (
        <>
          <button
            type="button"
            className="studio-canvas-zoom-btn"
            onClick={onZoomIn}
            style={zoomBtnStyle}
            title="تكبير"
            aria-label="تكبير"
          >
            +
          </button>

          <button
            type="button"
            className="studio-canvas-zoom-btn"
            onClick={onZoomOut}
            style={zoomBtnStyle}
            title="تصغير"
            aria-label="تصغير"
          >
            −
          </button>

          <button
            type="button"
            className="studio-canvas-zoom-btn"
            onClick={onReset}
            style={zoomBtnStyle}
            title="إعادة ضبط العرض"
            aria-label="إعادة ضبط العرض"
          >
            ↺
          </button>
        </>
      )}

      {/* تفعيل أو إلغاء وضع الزاوية القائمة */}
      {onToggleOrthogonal && (
        <button
          type="button"
          className="studio-canvas-zoom-btn"
          onClick={onToggleOrthogonal}
          aria-pressed={orthogonalMode}
          aria-label={
            orthogonalMode
              ? 'إلغاء الزاوية القائمة'
              : 'تفعيل الزاوية القائمة'
          }
          title={
            orthogonalMode
              ? 'إلغاء الزاوية القائمة (رسم حر)'
              : 'تفعيل الزاوية القائمة (0° / 90°)'
          }
          style={{
            ...zoomBtnStyle,
            background: orthogonalMode ? '#00509e' : '#fff',
            color: orthogonalMode ? '#fff' : '#333',
            fontWeight: 700,
            border: orthogonalMode
              ? '1px solid #00509e'
              : '1px solid #ccc',
          }}
        >
          ∟
        </button>
      )}
    </div>
  );
});

CanvasZoomControls.displayName = 'CanvasZoomControls';
