
import React from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Props {
  operation: 'copy' | 'move';
  onConfirm: (dx: number, dy: number) => void;
  onCancel: () => void;
}

export const OffsetDialog: React.FC<Props> = ({
  operation,
  onConfirm,
  onCancel,
}) => {
  const [direction, setDirection] = React.useState<Direction>('right');
  const [distance, setDistance] = React.useState('1.00');

  const value = Number(distance.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0;

  const confirm = () => {
    if (!valid) return;

    const offsets: Record<Direction, [number, number]> = {
      up: [0, -value],
      down: [0, value],
      left: [-value, 0],
      right: [value, 0],
    };

    onConfirm(...offsets[direction]);
  };

  const arrow = (id: Direction, symbol: string) => (
    <button
      type="button"
      onClick={() => setDirection(id)}
      aria-label={id}
      style={{
        width: 48,
        height: 44,
        borderRadius: 10,
        border: '1px solid #48617A',
        background: direction === id ? '#1687C8' : '#25394D',
        color: '#fff',
        fontSize: 23,
        cursor: 'pointer',
      }}
    >
      {symbol}
    </button>
  );

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        right: 12,
        top: 72,
        width: 'min(230px, calc(100vw - 24px))',
        maxHeight: 'calc(100dvh - 84px)',
        overflowY: 'auto',
        zIndex: 10001,
        padding: 14,
        boxSizing: 'border-box',
        borderRadius: 16,
        background: '#17283A',
        border: '1px solid #38516A',
        boxShadow: '0 8px 28px rgba(0,0,0,.3)',
        color: '#F1F6FB',
        direction: 'rtl',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <strong>{operation === 'copy' ? 'نسخ العنصر' : 'تحريك العنصر'}</strong>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            color: '#D7E5F2',
            border: 0,
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        marginBottom: 14,
      }}>
        {arrow('up', '↑')}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {arrow('left', '←')}
          <span style={{ width: 35, textAlign: 'center', color: '#7ACDF2' }}>
            ✥
          </span>
          {arrow('right', '→')}
        </div>
        {arrow('down', '↓')}
      </div>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
        المسافة بالمتر
      </label>
      
<input
  type="text"
  inputMode="decimal"
  dir="ltr"
  value={distance}
  onChange={e => setDistance(e.target.value)}
  onFocus={e => e.currentTarget.select()}
  onClick={e => e.currentTarget.select()}
  onKeyDown={e => {
    if (e.key === 'Enter') confirm();
  }}

        style={{
          width: '100%',
          padding: 10,
          boxSizing: 'border-box',
          borderRadius: 8,
          border: '1px solid #5B7792',
          background: '#263B50',
          color: '#fff',
          fontSize: 16,
          textAlign: 'center',
        }}
      />

      <button
        type="button"
        disabled={!valid}
        onClick={confirm}
        style={{
          width: '100%',
          marginTop: 12,
          padding: 11,
          border: 0,
          borderRadius: 9,
          background: valid ? '#1687C8' : '#596879',
          color: '#fff',
          fontWeight: 700,
          cursor: valid ? 'pointer' : 'not-allowed',
        }}
      >
        {operation === 'copy' ? 'تأكيد النسخ' : 'تأكيد التحريك'}
      </button>
    </div>
  );
};
        
