import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  results: FinishResults;
  hasMarble: boolean;
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

export const LaborTable: React.FC<Props> = ({ results, hasMarble }) => {
  return (
    <div style={cardStyle}>
      <div style={headStyle}>👷 بند كميات العمالة</div>
      <TableDetailsToggle title="كميات العمالة" rows={[
        { label: 'عمالة بناء الجدران الخارجية', value: Math.ceil(results.exteriorWallGross), unit: 'م²', formula: 'تقريب مساحة الجدران الخارجية الإجمالية إلى العدد الصحيح الأعلى' },
        { label: 'عمالة بناء الجدران الداخلية', value: Math.ceil(results.interiorWallGross), unit: 'م²', formula: 'تقريب مساحة الجدران الداخلية الإجمالية إلى العدد الصحيح الأعلى' },
        ...(hasMarble ? [{ label: 'عمالة بناء الرخام', value: Math.ceil(results.exteriorWallGross), unit: 'م²', formula: 'تقريب مساحة الجدران الخارجية الإجمالية إلى الأعلى (كما في الجدول الأصلي)' }] : []),
        { label: 'عمالة تلييس الجدران الداخلية', value: Math.ceil(results.plasterWallsLabor), unit: 'م²', formula: 'تقريب كمية تلييس الجدران إلى الأعلى' },
        { label: 'عمالة تلييس الأسقف', value: Math.ceil(results.plasterCeilingLabor - results.innerWallArea), unit: 'م²', formula: 'تقريب (تلييس الأسقف − مساحة الجدران الداخلية) إلى الأعلى' },
        { label: 'عمالة طلاء الجدران', value: Math.ceil(results.paintWalls), unit: 'م²', formula: 'تقريب كمية طلاء الجدران إلى الأعلى' },
        { label: 'عمالة طلاء الأسقف', value: Math.ceil(results.paintCeiling - results.innerWallArea), unit: 'م²', formula: 'تقريب (طلاء الأسقف − مساحة الجدران الداخلية) إلى الأعلى' },
        { label: 'عمالة بلاط الأرضيات', value: Math.ceil(results.tileFloorArea - results.innerWallArea), unit: 'م²', formula: 'تقريب (مساحة بلاط الأرضيات − مساحة الجدران الداخلية) إلى الأعلى' },
        { label: 'عمالة بلاط أرضيات المطابخ', value: Math.ceil(results.tileKitchenFloor), unit: 'م²', formula: 'تقريب مساحة بلاط أرضيات المطابخ إلى الأعلى' },
        { label: 'عمالة بلاط جدران المطابخ', value: Math.ceil(results.tileKitchenWalls), unit: 'م²', formula: 'تقريب مساحة بلاط جدران المطابخ إلى الأعلى' },
        { label: 'عمالة بلاط أرضيات الحمامات', value: Math.ceil(results.tileBathroomFloor), unit: 'م²', formula: 'تقريب مساحة بلاط أرضيات الحمامات إلى الأعلى' },
        { label: 'عمالة بلاط جدران الحمامات', value: Math.ceil(results.tileBathroomWalls), unit: 'م²', formula: 'تقريب مساحة بلاط جدران الحمامات إلى الأعلى' },
      ]}>{null}</TableDetailsToggle>
      <div style={bodyStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>البند</th>
              <th style={thStyle}>الكمية بالمتر المربع</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>بناء الجدران الخارجية</td><td style={tdStyle}>{Math.ceil(results.exteriorWallGross)}</td></tr>
            <tr><td style={tdStyle}>بناء الجدران الداخلية</td><td style={tdStyle}>{Math.ceil(results.interiorWallGross)}</td></tr>
            {hasMarble && <tr><td style={tdStyle}>بناء الرخام</td><td style={tdStyle}>{Math.ceil(results.exteriorWallGross)}</td></tr>}
            <tr><td style={tdStyle}>تلييس الجدران الداخلية</td><td style={tdStyle}>{Math.ceil(results.plasterWallsLabor)}</td></tr>
            <tr><td style={tdStyle}>تلييس الأسقف</td><td style={tdStyle}>{Math.ceil(results.plasterCeilingLabor - results.innerWallArea)}</td></tr>
            <tr><td style={tdStyle}>طلاء الجدران</td><td style={tdStyle}>{Math.ceil(results.paintWalls)}</td></tr>
            <tr><td style={tdStyle}>طلاء الأسقف</td><td style={tdStyle}>{Math.ceil(results.paintCeiling - results.innerWallArea)}</td></tr>
            <tr><td style={tdStyle}>بلاط الأرضيات</td><td style={tdStyle}>{Math.ceil(results.tileFloorArea - results.innerWallArea)}</td></tr>
            <tr><td style={tdStyle}>بلاط أرضيات المطابخ</td><td style={tdStyle}>{Math.ceil(results.tileKitchenFloor)}</td></tr>
            <tr><td style={tdStyle}>بلاط جدران المطابخ</td><td style={tdStyle}>{Math.ceil(results.tileKitchenWalls)}</td></tr>
            <tr><td style={tdStyle}>بلاط أرضيات الحمامات</td><td style={tdStyle}>{Math.ceil(results.tileBathroomFloor)}</td></tr>
            <tr><td style={tdStyle}>بلاط جدران الحمامات</td><td style={tdStyle}>{Math.ceil(results.tileBathroomWalls)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
