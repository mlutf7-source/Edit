import React, { useContext, useRef, useState } from 'react';
import { DetailPdfShareButton } from '../DetailPdfShareButton';
import { DetailPdfContext } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';
import type { FinalQuantityRow } from '../../../core/finalQuantityCalculations';
import { formatQuantity } from '../quantityFormat';

interface Props {
  finalQuantityRows?: readonly FinalQuantityRow[];
  // Compatibility with the existing caller until FinishTables is connected.
  results?: FinishResults;
  hasMarble?: boolean;
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  electricalPts?: number;
  plumbingPts?: number;
  onElectricalChange?: (value: number) => void;
  onPlumbingChange?: (value: number) => void;
}

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const cell: React.CSSProperties = { padding: '7px 6px', border: '1px solid var(--qty-border)', textAlign: 'center' };
const heading: React.CSSProperties = { ...cell, background: 'var(--qty-navy)', color: '#fff' };
const numeric: React.CSSProperties = { ...cell, direction: 'ltr' };

export const UtilitySummaryTables: React.FC<Props> = ({ finalQuantityRows }) => {
  const [open, setOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const { projectName, floorName } = useContext(DetailPdfContext);
  const rows = (finalQuantityRows ?? []).filter(row => Number.isFinite(row.quantity) && row.quantity > 0);
  return (
    <section dir="rtl" className="qty-table-section" aria-label="إجمالي الكميات النهائي" style={{ background: 'var(--qty-card)', color: 'var(--qty-text)', border: '1px solid var(--qty-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div className="qty-main-heading">📦 إجمالي الكميات النهائي</div>
      <div style={{ padding: 10 }}>
        <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ marginBottom: 8, padding: '7px 10px', border: '1px solid var(--qty-border)', background: 'var(--qty-accent-soft)', color: 'var(--qty-text)', cursor: 'pointer' }}>
          {open ? 'إخفاء الحسابات التفصيلية' : 'إظهار الحسابات التفصيلية'}
        </button>
        {open && (
          <div ref={detailRef} data-pdf-exclude="true">
          {rows.map(row => (
          <div key={row.id} style={{ marginBottom: 10, overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{row.label}</div>
            <table style={table}>
              <thead><tr><th style={heading}>مصدر الكمية</th><th style={heading}>الكمية</th><th style={heading}>الوحدة</th></tr></thead>
              <tbody>
                {row.sources.map((source, index) => <tr key={index}><td style={cell}>{source.label}</td><td style={numeric}>{formatQuantity(source.quantity)}</td><td style={cell}>{row.unit}</td></tr>)}
                <tr style={{ fontWeight: 700 }}><td style={cell}>الإجمالي</td><td style={numeric}>{formatQuantity(row.quantity)}</td><td style={cell}>{row.unit}</td></tr>
              </tbody>
            </table>
          </div>
          ))}
          <div data-pdf-exclude="true" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <DetailPdfShareButton getElement={() => detailRef.current}
              title="الحسابات التفصيلية — إجمالي الكميات النهائي"
              projectName={projectName} floorName={floorName} disabled={rows.length === 0} />
          </div>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead><tr><th style={heading}>البند</th><th style={heading}>الكمية</th><th style={heading}>الوحدة</th></tr></thead>
            <tbody>
              {rows.map(row => <tr key={row.id}><td style={cell}>{row.label}</td><td style={numeric}>{formatQuantity(row.quantity)}</td><td style={cell}>{row.unit}</td></tr>)}
              {rows.length === 0 && <tr><td colSpan={3} style={cell}>{finalQuantityRows === undefined ? 'لم يتم ربط بيانات الإجمالي بعد' : 'لا توجد كميات'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
