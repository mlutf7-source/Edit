import React, { useState, useRef, useEffect } from 'react';
import type { ColorTheme } from '../../core/colorTheme';
import { COLOR_ITEMS } from '../../core/colorTheme';

interface Props {
  theme: ColorTheme;
  onColorChange: (key: keyof ColorTheme, value: string) => void;
  onReset: () => void;
}

export const ColorPickerMenu: React.FC<Props> = ({ theme, onColorChange, onReset }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #d0c0f0',
          background: '#f3e8ff',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
          color: '#6b21a8',
        }}
      >
        🎨 الألوان
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 6,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 10,
          padding: 10,
          minWidth: 250,
          maxHeight: 420,
          overflowY: 'auto',
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          zIndex: 99999,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: '1px solid #eee',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#333' }}>تخصيص الألوان</span>
            <button
              onClick={onReset}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              ↺ استعادة
            </button>
          </div>
          {COLOR_ITEMS.map(item => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                gap: 10,
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 13, color: '#555' }}>{item.label}</span>
              <div style={{ position: 'relative', width: 40, height: 24 }}>
                <div style={{
                  width: 40,
                  height: 24,
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  background: theme[item.key],
                  boxShadow: 'inset 0 0 0 2px #fff',
                }} />
                <input
                  type="color"
                  value={theme[item.key]}
                  onChange={e => onColorChange(item.key, e.target.value)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
