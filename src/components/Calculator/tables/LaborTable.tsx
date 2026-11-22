import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  results: FinishResults;
  hasMarble: boolean;
  hasExteriorPlaster: boolean;
  exteriorPlasterGross: number;
  stairSkirtingLength?: number;
  /** Persisted per-floor edits, keyed by JSON.stringify(['labor', original row label]). */
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 12,
};

const headStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '10px 12px',
  fontWeight: 700,
  color: '#003366',
  fontSize: 14,
  borderBottom: '1px solid #ddd',
};

const bodyStyle: React.CSSProperties = {
  padding: 10,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
};

const thStyle: React.CSSProperties = {
  background: '#003366',
  color: 'white',
  padding: '8px 6px',
  border: '1px solid #003366',
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 6px',
  border: '1px solid #ccc',
  textAlign: 'center',
};

type LaborRow = {
  label: string;
  quantity: number;
  unit: 'م²' | 'درجة' | 'م طولي';
  formula: string;
};

const laborQuantity = (value: number): number =>
  Number.isFinite(value) ? Math.ceil(Math.max(0, value)) : 0;

export const LaborTable: React.FC<Props> = ({
  results,
  hasMarble,
  hasExteriorPlaster,
  exteriorPlasterGross,
  stairSkirtingLength,
  detailCellEdits,
  onDetailCellEdit,
}) => {
  // Both the detailed view and the summary table use these same rows.
  const rows: LaborRow[] = [
    { label: 'بناء الجدران الخارجية', quantity: laborQuantity(results.exteriorWallGross), unit: 'م²', formula: 'مساحة الجدران الخارجية الإجمالية قبل الخصومات، مقربة إلى الأعلى' },
    { label: 'بناء الجدران الداخلية', quantity: laborQuantity(results.interiorWallGross), unit: 'م²', formula: 'مساحة الجدران الداخلية الإجمالية قبل الخصومات، مقربة إلى الأعلى' },
    ...(hasMarble ? [{ label: 'بناء الرخام', quantity: laborQuantity(results.marbleArea), unit: 'م²' as const, formula: 'كمية الرخام في نتائج البند الرئيسي، مقربة إلى الأعلى' }] : []),
    ...(hasExteriorPlaster ? [{ label: 'تلييس الجدران الخارجية', quantity: laborQuantity(exteriorPlasterGross), unit: 'م²' as const, formula: 'مساحة التلييس الخارجي الإجمالية قبل خصم الفتحات، مقربة إلى الأعلى' }] : []),
    { label: 'تلييس الجدران الداخلية', quantity: laborQuantity(results.plasterWallsLabor), unit: 'م²', formula: 'كمية عمالة تلييس الجدران الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'تلييس الأسقف', quantity: laborQuantity(results.plasterCeilingLabor), unit: 'م²', formula: 'مساحة الأسقف الواردة من محرك الحساب دون طرح مساحة الجدران الداخلية' },
    { label: 'طلاء الجدران', quantity: laborQuantity(results.paintWalls), unit: 'م²', formula: 'كمية طلاء الجدران الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'طلاء الأسقف', quantity: laborQuantity(results.paintCeiling), unit: 'م²', formula: 'مساحة طلاء الأسقف الواردة من محرك الحساب دون طرح مساحة الجدران الداخلية' },
    { label: 'بلاط الأرضيات', quantity: laborQuantity(results.correctedTileFloor), unit: 'م²', formula: 'كمية بلاط الأرضيات الواردة من نتائج البند الرئيسي، مقربة إلى الأعلى' },
    { label: 'بلاط أرضيات المطابخ', quantity: laborQuantity(results.tileKitchenFloor), unit: 'م²', formula: 'كمية بلاط أرضيات المطابخ الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط جدران المطابخ', quantity: laborQuantity(results.correctedTileKitchenWalls), unit: 'م²', formula: 'كمية بلاط جدران المطابخ الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط أرضيات الحمامات', quantity: laborQuantity(results.tileBathroomFloor), unit: 'م²', formula: 'كمية بلاط أرضيات الحمامات الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط جدران الحمامات', quantity: laborQuantity(results.correctedTileBathroomWalls), unit: 'م²', formula: 'كمية بلاط جدران الحمامات الواردة من محرك الحساب، مقربة إلى الأعلى' },
    ...(results.landingTileArea > 0 ? [{ label: 'بلاط بسطات السلالم', quantity: laborQuantity(results.landingTileArea), unit: 'م²' as const, formula: 'مساحة بسطات السلالم الواردة من محرك الحساب' }] : []),
    ...(results.stepTileCount > 0 ? [{ label: 'بلاط درجات السلالم (النوائم)', quantity: laborQuantity(results.stepTileCount), unit: 'درجة' as const, formula: 'عدد درجات السلالم الوارد من محرك الحساب' }] : []),
    ...(stairSkirtingLength !== undefined ? [{
      label: 'نعلة السلم',
      quantity: Math.round(Math.max(0, Number.isFinite(stairSkirtingLength) ? stairSkirtingLength : 0) * 100) / 100,
      unit: 'م طولي' as const,
      formula: 'مجموع نعلة جميع السحبات والبسطات وفق الكميات المعتمدة بعد التعديل اليدوي',
    }] : []),
  ];

  // Keep the original label as a stable identifier; changing its display text
  // must not change the saved-edit key or affect other quantity tables.
  const visibleRows = rows.map(row => {
    const edit = detailCellEdits?.[JSON.stringify(['labor', row.label])];
    return {
      ...row,
      label: edit?.label?.trim() || row.label,
      quantity: typeof edit?.value === 'number' && Number.isFinite(edit.value) && edit.value >= 0
        ? edit.value : row.quantity,
    };
  });

  return (
    <div style={cardStyle}>
      <div className="qty-main-heading">👷 بند كميات العمالة</div>
      <TableDetailsToggle
        title="كميات العمالة"
        rows={visibleRows.map(row => ({
          label: `عمالة ${row.label}`,
          value: row.quantity,
          unit: row.unit,
          formula: row.formula,
        }))}
        onLabelEdit={onDetailCellEdit ? (_row, index, label) => {
          onDetailCellEdit('labor', rows[index].label, { label: label.replace(/^عمالة\s*/, '') });
        } : undefined}
        onValueEdit={onDetailCellEdit ? (_row, index, value) => {
          onDetailCellEdit('labor', rows[index].label, { value });
        } : undefined}
      >
        {null}
      </TableDetailsToggle>
      <div style={bodyStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>البند</th>
              <th style={thStyle}>الكمية</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.label}>
                <td style={tdStyle}>{row.label}</td>
                <td style={tdStyle}>{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
