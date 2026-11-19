import { formatQuantity } from './quantityFormat';
import React, { useState } from 'react';
import type { Wall, Window, Door } from '../../core/types';

interface Props {
  walls: Wall[];
  windows: Window[];
  doors: Door[];
  floor: number;
  height: number;
}

const fmt = (n: number) => Number.isFinite(n)
  ? formatQuantity(n) : '—';
const td: React.CSSProperties = { padding: '8px 6px', border: '1px solid #d2e1e8', textAlign: 'center' };

/** Read-only audit of the original finish engine's per-wall gross-area formulas.
 * Columns are deliberately not distributed to individual walls: the engine
 * calculates their deductions separately and may share a column between walls.
 */
export const WallElementTrace: React.FC<Props> = ({ walls, windows, doors, floor, height }) => {
  const [open, setOpen] = useState(false);
  const currentWalls = walls.filter(w => (w.floor ?? 0) === floor && (!w.kind || w.kind === 'wall'));
  const currentWindows = windows.filter(w => (w.floor ?? 0) === floor);
  const currentDoors = doors.filter(d => (d.floor ?? 0) === floor);
  const data = currentWalls.map((wall, index) => {
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const effectiveLength = wall.type === 'exterior' ? length + 2 * wall.thickness : length;
    const wallWindows = currentWindows.filter(w => w.wallId === wall.id);
    const wallDoors = currentDoors.filter(d => d.wallId === wall.id);
    const windowArea = wallWindows.reduce((sum, w) => sum + w.width * w.height, 0);
    const doorArea = wallDoors.reduce((sum, d) => sum + d.width * d.height, 0);
    return { wall, index, length, effectiveLength, gross: effectiveLength * height, windowArea, doorArea, wallWindows, wallDoors };
  });
  const total = (selector: (row: typeof data[number]) => number) => data.reduce((sum, row) => sum + selector(row), 0);
  return <section dir="rtl" style={{ margin: '12px 0', background: '#fff', border: '1px solid #bdd9e4', borderRadius: 10, overflow: 'hidden' }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
      style={{ width: '100%', textAlign: 'right', background: '#eaf9fb', color: '#0b3045', border: 0, padding: 12, fontWeight: 700, cursor: 'pointer' }}>
      {open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية لكل جدار وفتحاته — الدور {floor + 1}
    </button>
    {open && <div style={{ padding: 12 }}>
      <p style={{ fontSize: 13, color: '#36576b' }}>
        معادلة الجدار الخارجي: (طول خط الجدار + 2 × السماكة) × ارتفاع الدور؛
        الجدار الداخلي: طول خط الجدار × ارتفاع الدور. تُحسب الفتحات من العرض × الارتفاع.
        لا يشمل الصافي الموضح خصومات الأعمدة؛ تُحتسب الأعمدة منفصلة في محرك الحساب الأصلي.
      </p>
      {data.length === 0 ? <p>لا توجد جدران مرسومة لهذا الدور.</p> : <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#0b3045', color: '#fff' }}>
            {['الجدار', 'النوع', 'الطول (م)', 'السماكة (م)', 'الارتفاع (م)', 'معادلة المساحة الإجمالية', 'الإجمالي (م²)', 'النوافذ (م²)', 'الأبواب (م²)', 'الصافي قبل الأعمدة (م²)'].map(label => <th key={label} style={td}>{label}</th>)}
          </tr></thead>
          <tbody>{data.map(row => <tr key={row.wall.id}>
            <td style={td}>{row.index + 1}</td>
            <td style={td}>{row.wall.type === 'exterior' ? 'خارجي' : 'داخلي'}</td>
            <td style={td}>{fmt(row.length)}</td><td style={td}>{fmt(row.wall.thickness)}</td><td style={td}>{fmt(height)}</td>
            <td style={td} dir="ltr">{row.wall.type === 'exterior' ? `(${fmt(row.length)} + 2 × ${fmt(row.wall.thickness)}) × ${fmt(height)}` : `${fmt(row.length)} × ${fmt(height)}`}</td>
            <td style={td}>{fmt(row.gross)}</td>
            <td style={td} title={row.wallWindows.map(w => `${fmt(w.width)} × ${fmt(w.height)}`).join('، ')}>{fmt(row.windowArea)} ({row.wallWindows.length})</td>
            <td style={td} title={row.wallDoors.map(d => `${fmt(d.width)} × ${fmt(d.height)}`).join('، ')}>{fmt(row.doorArea)} ({row.wallDoors.length})</td>
            <td style={td}>{fmt(row.gross - row.windowArea - row.doorArea)}</td>
          </tr>)}</tbody>
          <tfoot><tr style={{ fontWeight: 700 }}><td style={td} colSpan={6}>الإجمالي</td>
            <td style={td}>{fmt(total(r => r.gross))}</td><td style={td}>{fmt(total(r => r.windowArea))}</td>
            <td style={td}>{fmt(total(r => r.doorArea))}</td><td style={td}>{fmt(total(r => r.gross - r.windowArea - r.doorArea))}</td>
          </tr></tfoot>
        </table>
      </div>}
    </div>}
  </section>;
};
