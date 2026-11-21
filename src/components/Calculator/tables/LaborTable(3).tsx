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

export const LaborTable: React.FC<Props> = ({
  results,
  hasMarble,
  hasExteriorPlaster,
  exteriorPlasterGross,
}) => {
  return (
    <div style={cardStyle}>
      <div className="qty-main-heading">
  👷 بند كميات العمالة
</div>
      <TableDetailsToggle title="كميات العمالة" rows={[
        { label: 'عمالة بناء الجدران الخارجية', value: Math.ceil(results.exteriorWallGross), unit: 'م²', formula: 'تقريب مساحة الجدران الخارجية الإجمالية إلى العدد الصحيح الأعلى' },
        { label: 'عمالة بناء الجدران الداخلية', value: Math.ceil(results.interiorWallGross), unit: 'م²', formula: 'تقريب مساحة الجدران الداخلية الإجمالية إلى العدد الصحيح الأعلى' },
        ...(hasMarble ? [{ label: 'عمالة بناء الرخام', value: Math.ceil(results.marbleArea), unit: 'م²', formula: 'الكمية المعتمدة في بند الرخام الرئيسي، مقربة إلى الأعلى' }] : []),
       ...(hasExteriorPlaster
  ? [{
      label: 'عمالة تلييس الجدران الخارجية',
      value: Math.ceil(exteriorPlasterGross),
      unit: 'م²',
      formula: 'تقريب مساحة التلييس الخارجي الإجمالية قبل خصم الفتحات إلى الأعلى',
    }]
  : []),
      { label: 'عمالة تلييس الجدران الداخلية', value: Math.ceil(results.plasterWallsLabor), unit: 'م²', formula: 'تقريب كمية تلييس الجدران إلى الأعلى' },
        { label: 'عمالة تلييس الأسقف', value: Math.ceil(results.plasterCeilingLabor - results.innerWallArea), unit: 'م²', formula: 'تقريب (تلييس الأسقف − مساحة الجدران الداخلية) إلى الأعلى' },
        { label: 'عمالة طلاء الجدران', value: Math.ceil(results.paintWalls), unit: 'م²', formula: 'تقريب كمية طلاء الجدران إلى الأعلى' },
        { label: 'عمالة طلاء الأسقف', value: Math.ceil(results.paintCeiling - results.innerWallArea), unit: 'م²', formula: 'تقريب (طلاء الأسقف − مساحة الجدران الداخلية) إلى الأعلى' },
        { label: 'عمالة بلاط الأرضيات', value: Math.ceil(results.correctedTileFloor), unit: 'م²', formula: 'الكمية المعتمدة في بند بلاط الأرضيات الرئيسي، مقربة إلى الأعلى' },
        { label: 'عمالة بلاط أرضيات المطابخ', value: Math.ceil(results.tileKitchenFloor), unit: 'م²', formula: 'المساحة المعتمدة لبلاط أرضيات المطابخ في بند البلاط الرئيسي، مقربة إلى الأعلى' },
        { label: 'عمالة بلاط جدران المطابخ', value: Math.ceil(results.correctedTileKitchenWalls), unit: 'م²', formula: 'تقريب مساحة بلاط جدران المطابخ إلى الأعلى' },
        { label: 'عمالة بلاط أرضيات الحمامات', value: Math.ceil(results.tileBathroomFloor), unit: 'م²', formula: 'المساحة المعتمدة لبلاط أرضيات الحمامات في بند البلاط الرئيسي، مقربة إلى الأعلى' },
        { label: 'عمالة بلاط جدران الحمامات', value: Math.ceil(results.correctedTileBathroomWalls), unit: 'م²', formula: 'تقريب مساحة بلاط جدران الحمامات إلى الأعلى' },
        ...(results.landingTileArea > 0 ? [{
          label: 'عمالة بلاط بسطات السلالم',
          value: Math.ceil(results.landingTileArea),
          unit: 'م²',
          formula: 'المساحة المعتمدة لبسطات السلالم في بند البلاط الرئيسي',
        }] : []),
        ...(results.stepTileCount > 0 ? [{
          label: 'عمالة بلاط درجات السلالم (النوائم)',
          value: results.stepTileCount,
          unit: 'درجة',
          formula: 'عدد درجات السلم المعتمد في بند البلاط الرئيسي',
        }] : []),
      ]}>{null}</TableDetailsToggle>
      <div style={bodyStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>البند</th>
              <th style={thStyle}>الكمية</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>بناء الجدران الخارجية</td><td style={tdStyle}>{Math.ceil(results.exteriorWallGross)}</td></tr>
            <tr><td style={tdStyle}>بناء الجدران الداخلية</td><td style={tdStyle}>{Math.ceil(results.interiorWallGross)}</td></tr>
            {hasMarble && <tr><td style={tdStyle}>بناء الرخام</td><td style={tdStyle}>{Math.ceil(results.marbleArea)}</td></tr>}
            {hasExteriorPlaster && (
  <tr>
    <td style={tdStyle}>تلييس الجدران الخارجية</td>
    <td style={tdStyle}>{Math.ceil(exteriorPlasterGross)}</td>
  </tr>
)}
            <tr><td style={tdStyle}>تلييس الجدران الداخلية</td><td style={tdStyle}>{Math.ceil(results.plasterWallsLabor)}</td></tr>
            <tr><td style={tdStyle}>تلييس الأسقف</td><td style={tdStyle}>{Math.ceil(results.plasterCeilingLabor - results.innerWallArea)}</td></tr>
            <tr><td style={tdStyle}>طلاء الجدران</td><td style={tdStyle}>{Math.ceil(results.paintWalls)}</td></tr>
            <tr><td style={tdStyle}>طلاء الأسقف</td><td style={tdStyle}>{Math.ceil(results.paintCeiling - results.innerWallArea)}</td></tr>
            <tr><td style={tdStyle}>بلاط الأرضيات</td><td style={tdStyle}>{Math.ceil(results.correctedTileFloor)}</td></tr>
            <tr><td style={tdStyle}>بلاط أرضيات المطابخ</td><td style={tdStyle}>{Math.ceil(results.tileKitchenFloor)}</td></tr>
            <tr><td style={tdStyle}>بلاط جدران المطابخ</td><td style={tdStyle}>{Math.ceil(results.correctedTileKitchenWalls)}</td></tr>
            <tr><td style={tdStyle}>بلاط أرضيات الحمامات</td><td style={tdStyle}>{Math.ceil(results.tileBathroomFloor)}</td></tr>
            <tr><td style={tdStyle}>بلاط جدران الحمامات</td><td style={tdStyle}>{Math.ceil(results.correctedTileBathroomWalls)}</td></tr>
            {results.landingTileArea > 0 && (
              <tr><td style={tdStyle}>بلاط بسطات السلالم</td><td style={tdStyle}>{Math.ceil(results.landingTileArea)}</td></tr>
            )}
            {results.stepTileCount > 0 && (
              <tr><td style={tdStyle}>بلاط درجات السلالم (النوائم)</td><td style={tdStyle}>{results.stepTileCount}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
