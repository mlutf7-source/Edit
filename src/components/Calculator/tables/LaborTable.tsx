import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  results: FinishResults;
  hasMarble: boolean;
  hasExteriorPlaster: boolean;
  exteriorPlasterGross: number;
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
  unit: 'م²' | 'درجة';
  formula: string;
};

const laborQuantity = (value: number): number =>
  Number.isFinite(value) ? Math.ceil(Math.max(0, value)) : 0;

export const LaborTable: React.FC<Props> = ({
  results,
  hasMarble,
  hasExteriorPlaster,
  exteriorPlasterGross,
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
  ];

  return (
    <div style={cardStyle}>
      <div className="qty-main-heading">👷 بند كميات العمالة</div>
      <TableDetailsToggle
        title="كميات العمالة"
        rows={rows.map(row => ({
          label: `عمالة ${row.label}`,
          value: row.quantity,
          unit: row.unit,
          formula: row.formula,
        }))}
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
            {rows.map(row => (
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
