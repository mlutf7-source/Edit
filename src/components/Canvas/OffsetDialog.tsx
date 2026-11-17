import React, { useEffect, useId, useRef, useState } from 'react';
type Direction = 'up' | 'down' | 'left' | 'right';
interface Props {
  operation: 'copy' | 'move';
  onConfirm: (dx: number, dy: number) => void;
  onCancel: () => void;
}
const DIRECTIONS: Record<Direction, { label: string; symbol: string; vector: [number, number] }> = {
  up: { label: 'أعلى', symbol: '↑', vector: [0, -1] },
  down: { label: 'أسفل', symbol: '↓', vector: [0, 1] },
  left: { label: 'يسار', symbol: '←', vector: [-1, 0] },
  right: { label: 'يمين', symbol: '→', vector: [1, 0] },
};
export const OffsetDialog: React.FC<Props> = ({ operation, onConfirm, onCancel }) => {
  const [direction, setDirection] = useState<Direction>('right');
  const [distance, setDistance] = useState('1.00');
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: rect.left, y: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    const width = Math.min(220, window.innerWidth - 16);
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - width - 8, drag.x + event.clientX - drag.pointerX)),
      y: Math.max(64, Math.min(window.innerHeight - 52, drag.y + event.clientY - drag.pointerY)),
    });
    event.stopPropagation();
  };
  const titleId = useId();
  const descriptionId = useId();
  const distanceId = useId();
  const parsedDistance = Number(distance.trim().replace(',', '.'));
  const valid = distance.trim() !== '' && Number.isFinite(parsedDistance) && parsedDistance > 0;
  const title = operation === 'copy' ? 'نسخ العنصر' : 'تحريك العنصر';
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);
  const confirm = () => {
    if (!valid) return;
    const [x, y] = DIRECTIONS[direction].vector;
    onConfirm(x * parsedDistance, y * parsedDistance);
  };
  const directionButton = (id: Direction) => {
    const selected = direction === id;
    return (
      <button
        key={id}
        type="button"
        aria-label={`الاتجاه: ${DIRECTIONS[id].label}`}
        aria-pressed={selected}
        title={DIRECTIONS[id].label}
        onClick={() => setDirection(id)}
        style={{
          width: 40, height: 36, borderRadius: 8,
          border: `1px solid ${selected ? '#58dff5' : '#47647e'}`,
          background: selected ? 'linear-gradient(145deg, #087ba9, #125a8b)' : '#263b50',
          color: selected ? '#fff' : '#dcecf8',
          boxShadow: selected ? '0 0 0 1px rgba(77,219,247,.22), 0 0 14px rgba(15,190,233,.23)' : 'none',
          fontSize: 20, cursor: 'pointer', touchAction: 'manipulation',
        }}
      >
        {DIRECTIONS[id].symbol}
      </button>
    );
  };
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      dir="rtl"
      onPointerDown={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()}
      style={{
        position: 'fixed', left: position?.x ?? 'max(76px, calc(50vw - 110px))', top: position?.y ?? 'max(76px, calc(50dvh - 170px))',
        right: 'auto', width: 'min(220px, calc(100vw - 16px))',
        maxHeight: 'calc(100dvh - 95px)', overflowY: 'auto',
        zIndex: 10030, padding: 9, boxSizing: 'border-box',
        borderRadius: 16, background: '#17283a',
        border: '1px solid #42617c',
        boxShadow: '0 14px 36px rgba(0,0,0,.42), 0 0 0 1px rgba(71,205,242,.08)',
        color: '#f1f6fb', fontFamily: 'inherit',
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={event => { dragRef.current = null; event.stopPropagation(); }}
        onPointerCancel={() => { dragRef.current = null; }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8, cursor: 'grab', touchAction: 'none', borderBottom: '1px solid #42647a', paddingBottom: 5 }}
      >
        <span aria-hidden="true" title="اسحب لتحريك النافذة" style={{ fontSize: 20, color: '#67e8f9' }}>⠿</span>
        <strong id={titleId} style={{ fontSize: 16 }}>{title}</strong>
        <button
          type="button" onClick={onCancel} onPointerDown={event => event.stopPropagation()} aria-label="إغلاق النافذة" title="إغلاق"
          style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #45627b', background: '#24394e', color: '#e8f5ff', fontSize: 23, cursor: 'pointer' }}
        >×</button>
      </div>
      <p id={descriptionId} style={{ fontSize: 12, lineHeight: 1.7, color: '#b8cede', margin: '0 0 8px' }}>
        اختر الاتجاه ثم أدخل المسافة بالمتر.
      </p>
      <div role="group" aria-label="اتجاه الإزاحة" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 9 }}>
        {directionButton('up')}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {directionButton('right')}
          <span aria-hidden="true" style={{ width: 28, textAlign: 'center', color: '#72d9f3', fontSize: 22 }}>⊕</span>
          {directionButton('left')}
        </div>
        {directionButton('down')}
      </div>
      <label htmlFor={distanceId} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7 }}>
        المسافة (متر)
      </label>
      <input
        ref={inputRef}
        id={distanceId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        dir="ltr"
        value={distance}
        onChange={event => setDistance(event.target.value)}
        onFocus={event => event.currentTarget.select()}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            confirm();
          }
        }}
        aria-invalid={!valid}
        aria-describedby={!valid ? `${descriptionId} offset-validation` : descriptionId}
        style={{
          width: '100%', padding: '7px 9px', boxSizing: 'border-box',
          borderRadius: 10, border: `1px solid ${valid ? '#527996' : '#ee9b86'}`,
          outlineOffset: 2, background: '#263b50', color: '#fff',
          fontSize: 16, textAlign: 'center', fontFamily: 'inherit',
        }}
      />
      {!valid && (
        <div id="offset-validation" role="status" style={{ color: '#ffb4a5', fontSize: 12, marginTop: 7 }}>
          أدخل مسافة أكبر من صفر.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
        <button
          type="button" onClick={onCancel}
          style={{ flex: 1, padding: 8, borderRadius: 10, border: '1px solid #4b6982', background: '#263b50', color: '#eaf5fd', fontWeight: 600, cursor: 'pointer' }}
        >إلغاء</button>
        <button
          type="button" disabled={!valid} onClick={confirm}
          style={{ flex: 1.4, padding: 8, border: 0, borderRadius: 10, background: valid ? 'linear-gradient(135deg, #128cbd, #116b9e)' : '#596879', color: '#fff', fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed' }}
        >{operation === 'copy' ? 'تأكيد النسخ' : 'تأكيد التحريك'}</button>
      </div>
    </div>
  );
};
