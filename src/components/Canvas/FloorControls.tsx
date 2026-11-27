import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  activeFloor: number;
  maxFloor: number;
  showPreviousFloor: boolean;
  onSetActiveFloor: (floor: number) => void;
  onAddFloor: () => void;
  onCopyFloor: (count: number) => void;
  onDeleteFloor: (floor: number) => void;
  onTogglePreviousFloor: () => void;
  floorHeights: number[];
  onSetFloorHeight: (floor: number, height: number) => void;
}
const FLOOR_LABELS = [
  'الأرضي', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر',
];
const labelFor = (floor: number) => FLOOR_LABELS[floor] || `الدور ${floor}`;
const colors = {
  surface: '#102338', elevated: '#172f48', border: '#35546a',
  text: '#edf7ff', muted: '#a9c3d2', accent: '#48dced', danger: '#ff8292',
};
const buttonStyle: React.CSSProperties = {
  width: '100%', minWidth: 0, padding: '10px 12px', borderRadius: 9,
  border: `1px solid ${colors.border}`, background: colors.elevated,
  color: colors.text, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  fontFamily: 'inherit', boxSizing: 'border-box', touchAction: 'manipulation',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
export const FloorControls: React.FC<Props> = React.memo(({
  activeFloor, maxFloor, showPreviousFloor, onSetActiveFloor, onAddFloor,
  onCopyFloor, onDeleteFloor, onTogglePreviousFloor, floorHeights, onSetFloorHeight,
}) => {
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
const [copyCount, setCopyCount] = useState('1');

const validCopyCount =
  Number.isInteger(Number(copyCount)) &&
  Number(copyCount) >= 1 &&
  Number(copyCount) <= 20;

const confirmCopy = () => {
  if (!validCopyCount) return;
  setCopyDialogOpen(false);
  onCopyFloor(Number(copyCount));
};
  const listId = useId();
  const floorList = Array.from({ length: Math.max(0, maxFloor + 1) }, (_, i) => i).reverse();
  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();
  const handleHeightBlur = (e: React.FocusEvent<HTMLInputElement>, floor: number) => {
    const input = e.currentTarget;
    const value = Number(input.value.trim().replace(',', '.'));
    if (Number.isFinite(value) && value > 0 && value <= 10) {
      onSetFloorHeight(floor, value);
      input.value = String(value);
    } else {
      input.value = String(floorHeights[floor] ?? 3);
    }
  };
  return (
    <div className="studio-floor-controls" dir="rtl"
      style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box' }}
      onPointerDown={stopPointer} onPointerMove={stopPointer}
      onPointerUp={stopPointer} onPointerCancel={stopPointer}>
      <button
  type="button"
  onClick={() => {
    setCopyCount('1');
    setCopyDialogOpen(true);
  }}
  style={buttonStyle}
  title="نسخ عناصر الدور الحالي"
>
        <StudioIcon name="copy" size={17} /> نسخ الدور
      </button>
      <button type="button" onClick={onAddFloor} style={buttonStyle} title="إضافة دور فارغ">
        <StudioIcon name="plus" size={17} /> دور جديد
      </button>
      <button type="button" onClick={() => setOpen(prev => !prev)}
        aria-expanded={open} aria-controls={listId}
        style={{ ...buttonStyle, borderColor: open ? colors.accent : colors.border,
          background: open ? '#17435a' : colors.elevated }} title="اختيار الدور وإدارة ارتفاعاته">
        <StudioIcon name="floor" size={17} />
        <span style={{ flex: 1, textAlign: 'right' }}>{labelFor(activeFloor)}</span>
        <StudioIcon name={open ? 'chevron-up' : 'chevron'} size={16} />
      </button>
      {open && (
        <div id={listId} className="studio-floor-list" role="region" aria-label="قائمة الطوابق"
          style={{ position: 'relative', width: '100%', minWidth: 0, maxHeight: 'min(45vh, 320px)',
            overflowY: 'auto', overflowX: 'hidden', background: colors.surface,
            border: `1px solid ${colors.border}`, borderRadius: 9, padding: 6,
            boxSizing: 'border-box', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          onWheel={e => e.stopPropagation()}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '8px 5px', marginBottom: 4,
            background: colors.surface, borderBottom: `1px solid ${colors.border}`,
            color: colors.muted, fontSize: 12, fontWeight: 700 }}>
            اختر الدور للتعديل <span style={{ fontWeight: 400 }}>(الارتفاع بالمتر)</span>
          </div>
          {floorList.map(i => {
            const isActive = i === activeFloor;
            const floorLabel = labelFor(i);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 4px', marginTop: 2, borderRadius: 7,
                border: isActive ? '1px solid #327c95' : '1px solid transparent',
                background: isActive ? '#17435a' : 'transparent', minWidth: 0 }}>
                <button type="button" onClick={() => { onSetActiveFloor(i); setOpen(false); }}
                  aria-current={isActive ? 'true' : undefined}
                  style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: 5,
                    minWidth: 0, padding: '7px 3px', border: 'none', borderRadius: 5,
                    background: 'transparent', color: isActive ? colors.accent : colors.text,
                    fontSize: 12, fontWeight: isActive ? 700 : 500, textAlign: 'right',
                    cursor: 'pointer', fontFamily: 'inherit' }} title={`اختيار ${floorLabel}`}>
                  <StudioIcon name={isActive ? 'check' : 'floor'} size={15} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{floorLabel}</span>
                </button>
                <input key={`${i}-${floorHeights[i] ?? 3}`} type="text" inputMode="decimal"
                  dir="ltr" defaultValue={String(floorHeights[i] ?? 3)}
                  onFocus={e => e.currentTarget.select()}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); }}
                  onBlur={e => handleHeightBlur(e, i)}
                  style={{ width: 49, minWidth: 0, flexShrink: 0, padding: '7px 3px',
                    borderRadius: 6, border: `1px solid ${colors.border}`,
                    background: '#0c1c2d', color: colors.text, fontSize: 12,
                    textAlign: 'center', boxSizing: 'border-box' }}
                  title={`ارتفاع ${floorLabel} بالمتر`} aria-label={`ارتفاع ${floorLabel} بالمتر`} />
                {i > 0 && (
                  <button type="button" onClick={e => { e.stopPropagation(); setPendingDelete(i); }}
                    style={{ flexShrink: 0, display: 'grid', placeItems: 'center',
                      width: 30, height: 30, border: '1px solid #78414f', borderRadius: 6,
                      background: '#472735', color: colors.danger, cursor: 'pointer',
                      touchAction: 'manipulation' }} title={`حذف ${floorLabel}`}
                    aria-label={`حذف ${floorLabel}`}>
                    <StudioIcon name="trash" size={15} />
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 8, paddingTop: 8 }}>
            <button type="button" onClick={onTogglePreviousFloor}
              aria-pressed={showPreviousFloor}
              style={{ ...buttonStyle, fontSize: 12, padding: '9px 6px',
                background: showPreviousFloor ? '#17435a' : colors.elevated,
                borderColor: showPreviousFloor ? colors.accent : colors.border }}
              title="تبديل عرض الدور السابق">
              <StudioIcon name={showPreviousFloor ? 'eye-off' : 'eye'} size={16} />
              {showPreviousFloor ? 'إخفاء الدور السابق' : 'إظهار الدور السابق (شفاف)'}
            </button>
          </div>
        </div>
      )}
      {copyDialogOpen && createPortal(
  <div
    dir="rtl"
    onPointerDown={e => e.stopPropagation()}
    onPointerMove={e => e.stopPropagation()}
    onPointerUp={e => e.stopPropagation()}
    onClick={e => {
      e.stopPropagation();
      if (e.target === e.currentTarget) {
        setCopyDialogOpen(false);
      }
    }}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(1, 9, 18, .72)',
      padding: 12,
      boxSizing: 'border-box',
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="نسخ الدور"
      onKeyDown={e => {
        e.stopPropagation();

        if (e.key === 'Escape') {
          setCopyDialogOpen(false);
        }

        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          confirmCopy();
        }
      }}
      style={{
        width: 235,
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: 12,
        borderRadius: 10,
        background: colors.surface,
        border: `1px solid ${colors.accent}`,
        color: colors.text,
        boxShadow: '0 12px 35px rgba(0,0,0,.45)',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          color: colors.accent,
          fontSize: 15,
          fontWeight: 700,
          paddingBottom: 10,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <StudioIcon name="copy" size={17} />
        نسخ الدور
      </div>

      <label
        htmlFor="studio-copy-floor-count"
        style={{
          display: 'block',
          textAlign: 'center',
          fontSize: 12,
          margin: '12px 0 8px',
        }}
      >
        عدد الأدوار المراد نسخها
      </label>

      <input
        id="studio-copy-floor-count"
        type="number"
        inputMode="numeric"
        min={1}
        max={20}
        step={1}
        dir="ltr"
        value={copyCount}
        onChange={e => setCopyCount(e.target.value)}
        onFocus={e => e.currentTarget.select()}
        style={{
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          padding: '7px',
          borderRadius: 7,
          border: `1px solid ${colors.border}`,
          background: '#0c1c2d',
          color: colors.text,
          fontSize: 16,
          fontWeight: 700,
          textAlign: 'center',
          outlineColor: colors.accent,
        }}
      />

      <div
        style={{
          fontSize: 11,
          color: validCopyCount
            ? colors.muted
            : colors.danger,
          textAlign: 'center',
          margin: '7px 0 12px',
        }}
      >
        من 1 إلى 20 دوراً
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={!validCopyCount}
          onClick={confirmCopy}
          style={{
            ...buttonStyle,
            flex: 1,
            padding: '8px',
            background: '#17435a',
            borderColor: colors.accent,
            color: colors.accent,
            opacity: validCopyCount ? 1 : 0.5,
          }}
        >
          <StudioIcon name="copy" size={15} />
          نسخ
        </button>

        <button
          type="button"
          onClick={() => setCopyDialogOpen(false)}
          style={{
            ...buttonStyle,
            flex: 1,
            padding: '8px',
          }}
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
      {pendingDelete !== null && (
        <div role="presentation" onPointerDown={e => e.stopPropagation()}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center',
            background: 'rgba(1, 9, 18, .72)', padding: 16 }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="studio-floor-delete-title"
            aria-describedby="studio-floor-delete-desc" dir="rtl"
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setPendingDelete(null); }}
            style={{ width: 'min(100%, 260px)', borderRadius: 14, padding: 20,
              background: colors.surface, border: `1px solid ${colors.border}`,
              color: colors.text, boxShadow: '0 18px 50px rgba(0,0,0,.45)' }}>
            <h3 id="studio-floor-delete-title" style={{ margin: '0 0 12px', fontSize: 17 }}>
              تأكيد حذف الطابق
            </h3>
            <p id="studio-floor-delete-desc" style={{ margin: '0 0 20px', fontSize: 13,
              color: colors.muted, lineHeight: 1.8 }}>
              هل تريد حذف {labelFor(pendingDelete)}؟ سيتم حذف جميع عناصره وإنزال الأدوار الأعلى تلقائياً.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" autoFocus onClick={() => setPendingDelete(null)}
                style={{ ...buttonStyle, flex: 1 }}>إلغاء</button>
              <button type="button" onClick={() => {
                const floor = pendingDelete;
                setPendingDelete(null);
                onDeleteFloor(floor);
                setOpen(false);
              }} style={{ ...buttonStyle, flex: 1, background: '#813047', borderColor: '#aa5066' }}>
                <StudioIcon name="trash" size={16} /> حذف الطابق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
FloorControls.displayName = 'FloorControls';
