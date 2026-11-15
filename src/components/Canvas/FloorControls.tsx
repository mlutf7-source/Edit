
import React, { useState } from 'react';

interface Props {
  activeFloor: number;
  maxFloor: number;
  showPreviousFloor: boolean;
  onSetActiveFloor: (floor: number) => void;
  onAddFloor: () => void;
  onCopyFloor: () => void;
  onDeleteFloor: (floor: number) => void;
  onTogglePreviousFloor: () => void;
  floorHeights: number[];
  onSetFloorHeight: (floor: number, height: number) => void;
}

const FLOOR_LABELS = [
  'الأرضي',
  'الأول',
  'الثاني',
  'الثالث',
  'الرابع',
  'الخامس',
  'السادس',
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
  'الحادي عشر',
  'الثاني عشر',
  'الثالث عشر',
  'الرابع عشر',
  'الخامس عشر',
];

const buttonStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  touchAction: 'manipulation',
};

export const FloorControls: React.FC<Props> = React.memo(({
  activeFloor,
  maxFloor,
  showPreviousFloor,
  onSetActiveFloor,
  onAddFloor,
  onCopyFloor,
  onDeleteFloor,
  onTogglePreviousFloor,
  floorHeights,
  onSetFloorHeight,
}) => {
  const [open, setOpen] = useState(false);

  const activeLabel =
    FLOOR_LABELS[activeFloor] || `الدور ${activeFloor}`;

  const floorList = Array.from(
    { length: Math.max(0, maxFloor + 1) },
    (_, i) => i
  ).reverse();

  const stopPointer = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const handleHeightBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    floor: number
  ) => {
    const input = e.currentTarget;
    const value = Number(input.value.trim().replace(',', '.'));

    if (
      Number.isFinite(value) &&
      value > 0 &&
      value <= 10
    ) {
      onSetFloorHeight(floor, value);
      input.value = String(value);
    } else {
      input.value = String(floorHeights[floor] ?? 3.0);
    }
  };

  return (
    <div
      className="studio-floor-controls"
      dir="rtl"
      style={{
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxSizing: 'border-box',
      }}
      onPointerDown={stopPointer}
      onPointerMove={stopPointer}
      onPointerUp={stopPointer}
      onPointerCancel={stopPointer}
    >
      {/* نسخ عناصر الدور الحالي */}
      <button
        type="button"
        onClick={onCopyFloor}
        style={buttonStyle}
        title="نسخ عناصر الدور الحالي"
      >
        📋 نسخ الدور
      </button>

      {/* إضافة دور فارغ */}
      <button
        type="button"
        onClick={onAddFloor}
        style={buttonStyle}
        title="إضافة دور فارغ"
      >
        ➕ دور جديد
      </button>

      {/* فتح وإغلاق قائمة الأدوار */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls="studio-floor-list"
        style={{
          ...buttonStyle,
          background: open ? '#00509e' : '#fff',
          color: open ? '#fff' : '#333',
          borderColor: open ? '#00509e' : '#ccc',
        }}
        title="اختيار الدور وإدارة ارتفاعاته"
      >
        🔢 {activeLabel} {open ? '▴' : '▾'}
      </button>

      {/* قائمة الأدوار داخل النافذة الجانبية */}
      {open && (
        <div
          id="studio-floor-list"
          className="studio-floor-list"
          style={{
            position: 'relative',
            width: '100%',
            minWidth: 0,
            maxHeight: 'min(45vh, 320px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: 6,
            boxSizing: 'border-box',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          onWheel={e => e.stopPropagation()}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              padding: '7px 5px',
              marginBottom: 4,
              background: '#fff',
              borderBottom: '1px solid #eee',
              color: '#555',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            اختر الدور للتعديل
          </div>

          {floorList.map(i => {
            const isActive = i === activeFloor;
            const floorLabel =
              FLOOR_LABELS[i] || `الدور ${i}`;

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 3px',
                  marginTop: 2,
                  borderRadius: 6,
                  background: isActive
                    ? '#e6f0ff'
                    : 'transparent',
                  minWidth: 0,
                }}
              >
                {/* اختيار الدور */}
                <button
                  type="button"
                  onClick={() => {
                    onSetActiveFloor(i);
                    setOpen(false);
                  }}
                  aria-current={
                    isActive ? 'true' : undefined
                  }
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    padding: '6px 3px',
                    border: 'none',
                    borderRadius: 5,
                    background: 'transparent',
                    color: isActive
                      ? '#00509e'
                      : '#333',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'right',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  title={`اختيار ${floorLabel}`}
                >
                  {isActive ? '✅' : '⬜'} {floorLabel}
                </button>

                {/* ارتفاع الدور بالمتر */}
                <input
                  key={`${i}-${floorHeights[i] ?? 3}`}
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  defaultValue={String(
                    floorHeights[i] ?? 3.0
                  )}
                  onFocus={e => e.currentTarget.select()}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    e.stopPropagation();

                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={e => handleHeightBlur(e, i)}
                  style={{
                    width: 48,
                    minWidth: 0,
                    flexShrink: 0,
                    padding: '5px 3px',
                    borderRadius: 5,
                    border: '1px solid #ccc',
                    background: '#fff',
                    color: '#333',
                    fontSize: 12,
                    textAlign: 'center',
                    boxSizing: 'border-box',
                  }}
                  title={`ارتفاع ${floorLabel} بالمتر`}
                  aria-label={`ارتفاع ${floorLabel} بالمتر`}
                />

                {/* لا يسمح بحذف الدور الأرضي */}
                {i > 0 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteFloor(i);
                      setOpen(false);
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '5px 6px',
                      border: 'none',
                      borderRadius: 5,
                      background: '#dc3545',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                      touchAction: 'manipulation',
                    }}
                    title={`حذف ${floorLabel}`}
                    aria-label={`حذف ${floorLabel}`}
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}

          {/* إظهار أو إخفاء الدور السابق */}
          <div
            style={{
              borderTop: '1px solid #eee',
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <button
              type="button"
              onClick={onTogglePreviousFloor}
              aria-pressed={showPreviousFloor}
              style={{
                ...buttonStyle,
                fontSize: 12,
                padding: '9px 6px',
                background: showPreviousFloor
                  ? '#e6f0ff'
                  : '#f7f7f7',
                color: '#333',
              }}
              title="تبديل عرض الدور السابق"
            >
              {showPreviousFloor
                ? '👁️ إخفاء الدور السابق'
                : '👁️ إظهار الدور السابق (شفاف)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

FloorControls.displayName = 'FloorControls';
