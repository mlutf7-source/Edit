import { formatQuantity } from '../quantityFormat';
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

export const OpeningTables: React.FC<Props> = ({ results }) => {
  return (
    <>
      {/* جدول النوافذ */}
      <div style={cardStyle}>
        <div style={headStyle}>🪟 بند النوافذ</div>
        <TableDetailsToggle title="🪟 بند النوافذ" rows={results.windowGroups.map((g, i) => ({
          label: `مجموعة النوافذ ${i + 1} (العدد: ${g.count}، العرض: ${g.width} م، الارتفاع: ${g.height} م)`,
          value: g.totalArea,
          unit: 'م²',
          formula: `${g.width} × ${g.height} = ${g.unitArea} م² للفتحة الواحدة؛ × ${g.count} = ${g.totalArea} م²`
        }))}>{null}</TableDetailsToggle>
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>عدد النوافذ</th>
                <th style={thStyle}>الأبعاد (م)</th>
                <th style={thStyle}>مساحة النافذة (م²)</th>
                <th style={thStyle}>إجمالي المساحات (م²)</th>
              </tr>
            </thead>
            <tbody>
              {results.windowGroups.map((g, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{g.count}</td>
                  <td style={tdStyle}>{g.width} × {g.height}</td>
                  <td style={tdStyle}>{formatQuantity(g.unitArea)}</td>
                  <td style={tdStyle}>{formatQuantity(g.totalArea)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f0f0', fontWeight: 700 }}>
                <td style={tdStyle} colSpan={3}>إجمالي مساحات النوافذ</td>
                <td style={tdStyle}>{formatQuantity(results.windowGroups.reduce((s, g) => s + g.totalArea, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول الأبواب */}
      <div style={cardStyle}>
        <div style={headStyle}>🚪 بند الأبواب</div>
        <TableDetailsToggle title="🚪 بند الأبواب" rows={results.doorGroups.map((g, i) => ({
          label: `مجموعة الأبواب ${i + 1} (العدد: ${g.count}، العرض: ${g.width} م، الارتفاع: ${g.height} م)`,
          value: g.totalArea,
          unit: 'م²',
          formula: `${g.width} × ${g.height} = ${g.unitArea} م² للفتحة الواحدة؛ × ${g.count} = ${g.totalArea} م²`
        }))}>{null}</TableDetailsToggle>
        <div style={bodyStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>عدد الأبواب</th>
                <th style={thStyle}>الأبعاد (م)</th>
                <th style={thStyle}>مساحة الباب (م²)</th>
                <th style={thStyle}>إجمالي المساحات (م²)</th>
              </tr>
            </thead>
            <tbody>
              {results.doorGroups.map((g, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{g.count}</td>
                  <td style={tdStyle}>{g.width} × {g.height}</td>
                  <td style={tdStyle}>{formatQuantity(g.unitArea)}</td>
                  <td style={tdStyle}>{formatQuantity(g.totalArea)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f0f0', fontWeight: 700 }}>
                <td style={tdStyle} colSpan={3}>إجمالي مساحات الأبواب</td>
                <td style={tdStyle}>{formatQuantity(results.doorGroups.reduce((s, g) => s + g.totalArea, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
