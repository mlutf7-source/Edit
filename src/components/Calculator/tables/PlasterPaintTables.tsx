import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  results: FinishResults;
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

export const PlasterPaintTables: React.FC<Props> = ({ results }) => {
  // ✅ القيم المصححة مباشرة من النتائج
  const correctedPlasterWalls = results.correctedPlasterWalls;
  const correctedPlasterCeiling = results.correctedPlasterCeiling;
  const correctedPlasterArea = results.correctedPlasterArea;
  const correctedPlasterCement = results.correctedPlasterCement;
  const correctedPlasterSand = results.correctedPlasterSand;

  const correctedPaintWalls = results.correctedPaintWalls;
  const correctedPaintCeiling = results.correctedPaintCeiling;
  const correctedPaintTotal = results.correctedPaintTotal;
  const correctedPutty = Math.ceil(correctedPaintTotal * 0.8);
  const correctedPrimer = Math.ceil(correctedPaintTotal / 8);
  const correctedPaint = Math.ceil(correctedPaintTotal / 8);

  return (
    <>
      {/* جدول التلييس */}
      <div style={cardStyle}>
        <div style={headStyle}>🏗️ بند التلييس</div>
          <TableDetailsToggle title="🏗️ بند التلييس" rows={[{ label: 'تلييس الجدران', value: results.correctedPlasterWalls, unit: 'م²', formula: 'max(0، تلييس الجدران للعمالة − مساحات الأبواب والنوافذ − مساحات جدران المطابخ والحمامات)' }, { label: 'تلييس الأسقف', value: results.correctedPlasterCeiling, unit: 'م²', formula: 'max(0، مساحة السقف − مساحة إشغال الجدران الداخلية)' }, { label: 'إجمالي التلييس', value: results.correctedPlasterArea, unit: 'م²', formula: 'تلييس الجدران + تلييس الأسقف' }, { label: 'أسمنت التلييس', value: results.correctedPlasterCement, unit: 'كيس', formula: 'تقريب أعلى (إجمالي التلييس × 0.15)' }, { label: 'رمل التلييس', value: results.correctedPlasterSand, unit: 'م³', formula: 'تقريب أعلى (أسمنت التلييس × 0.15)' }]}>{null}</TableDetailsToggle>
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>البند</th>
                <th style={thStyle}>الكمية</th>
                <th style={thStyle}>الوحدة</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>تلييس الجدران الداخلية</td><td style={tdStyle}>{Math.ceil(correctedPlasterWalls)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>تلييس الأسقف</td><td style={tdStyle}>{Math.ceil(correctedPlasterCeiling)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>أكياس الأسمنت</td><td style={tdStyle}>{correctedPlasterCement}</td><td style={tdStyle}>كيس</td></tr>
              <tr><td style={tdStyle}>الرمل</td><td style={tdStyle}>{correctedPlasterSand}</td><td style={tdStyle}>م³</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول الطلاء */}
      <div style={cardStyle}>
        <div style={headStyle}>🎨 بند الطلاء</div>
          <TableDetailsToggle title="🎨 بند الطلاء" rows={[{ label: 'طلاء الجدران', value: results.correctedPaintWalls, unit: 'م²', formula: 'يساوي صافي تلييس الجدران' }, { label: 'طلاء الأسقف', value: results.correctedPaintCeiling, unit: 'م²', formula: 'يساوي صافي تلييس الأسقف' }, { label: 'إجمالي الطلاء', value: results.correctedPaintTotal, unit: 'م²', formula: 'طلاء الجدران + طلاء الأسقف' }, { label: 'المعجون', value: Math.ceil(results.correctedPaintTotal * 0.8), unit: 'كجم', formula: 'تقريب أعلى (إجمالي الطلاء × 0.8)' }, { label: 'البرايمر', value: Math.ceil(results.correctedPaintTotal / 8), unit: 'كجم', formula: 'تقريب أعلى (إجمالي الطلاء ÷ 8)' }, { label: 'الطلاء', value: Math.ceil(results.correctedPaintTotal / 8), unit: 'كجم', formula: 'تقريب أعلى (إجمالي الطلاء ÷ 8)' }]}>{null}</TableDetailsToggle>
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>البند</th>
                <th style={thStyle}>الكمية</th>
                <th style={thStyle}>الوحدة</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>طلاء الجدران</td><td style={tdStyle}>{Math.ceil(correctedPaintWalls)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>طلاء الأسقف</td><td style={tdStyle}>{Math.ceil(correctedPaintCeiling)}</td><td style={tdStyle}>م²</td></tr>
              <tr><td style={tdStyle}>المعجون</td><td style={tdStyle}>{correctedPutty}</td><td style={tdStyle}>كجم</td></tr>
              <tr><td style={tdStyle}>البرايمر</td><td style={tdStyle}>{correctedPrimer}</td><td style={tdStyle}>كجم</td></tr>
              <tr><td style={tdStyle}>الطلاء</td><td style={tdStyle}>{correctedPaint}</td><td style={tdStyle}>كجم</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
