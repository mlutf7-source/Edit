import { formatQuantity } from './quantityFormat';
import React, { useState } from 'react';
import type { RoomQuantityRow } from './RoomQuantityDetails';

interface Props { rows: RoomQuantityRow[] }

const format = (value: number) =>
  Number.isFinite(value) ? formatQuantity(value) : '—';

const cell: React.CSSProperties = { padding: '8px', border: '1px solid #d3e1e8', textAlign: 'center' };

/**
 * Read-only trace of room-derived quantities.
 * These are gross wall areas; openings and columns are NOT deducted here.
 * The editable source remains RoomQuantityDetails and the existing calculation pipeline.
 */
export const RoomGeometryTrace: React.FC<Props> = ({ rows }) => {
  const [open, setOpen] = useState(false);
  const totalArea = rows.reduce((sum, room) => sum + room.area, 0);
  const totalGrossWalls = rows.reduce((sum, room) => sum + room.perimeter * room.height, 0);
  return (
    <section dir="rtl" style={{ margin: '12px 0', border: '1px solid #bdd9e4', borderRadius: 10, background: '#fff' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: 12, background: '#eaf9fb', border: 0, color: '#0b3045', fontWeight: 700, cursor: 'pointer', textAlign: 'right' }}>
        {open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية لمساحات الغرف والجدران
      </button>
      {open && <div style={{ padding: 12 }}>
        <p style={{ marginTop: 0, fontSize: 13, color: '#36576b' }}>
          الحساب هنا: مساحة الجدران الإجمالية = محيط الغرفة الفعلي × ارتفاعها.
          لا تُطرح الفتحات أو الأعمدة في هذا الجدول؛ تُحسب خصوماتها في جداول الخصومات الأصلية.
          بيانات الغرف أدناه من مسودة الدور الحالية.
        </p>
        {rows.length === 0 ? <p>لا توجد تفاصيل غرف محفوظة لهذا الدور. احسب كميات الدور أولاً.</p> :
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#0b3045', color: '#fff' }}>
                {['الغرفة', 'المساحة (م²)', 'المحيط (م)', 'الارتفاع (م)', 'معادلة الجدران', 'الإجمالي (م²)'].map(h => <th key={h} style={cell}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(room => <tr key={room.id}>
                  <td style={cell}>{room.name}</td><td style={cell}>{format(room.area)}</td>
                  <td style={cell}>{format(room.perimeter)}</td><td style={cell}>{format(room.height)}</td>
                  <td style={cell} dir="ltr">{format(room.perimeter)} × {format(room.height)}</td>
                  <td style={cell}>{format(room.perimeter * room.height)}</td>
                </tr>)}
              </tbody>
              <tfoot><tr style={{ fontWeight: 700 }}>
                <td style={cell}>الإجمالي</td><td style={cell}>{format(totalArea)}</td>
                <td style={cell}>—</td><td style={cell}>—</td><td style={cell}>Σ (المحيط × الارتفاع)</td>
                <td style={cell}>{format(totalGrossWalls)}</td>
              </tr></tfoot>
            </table>
          </div>}
      </div>}
    </section>
  );
};
