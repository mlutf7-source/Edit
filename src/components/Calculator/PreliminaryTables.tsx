import { formatQuantity } from './quantityFormat';
import React from 'react';

interface PreliminaryResults {
    landBoundaryArea: number;
      buildingArea: number;
          excavationVolume: number;
                backfillVolume: number;
                        plinthArea: number;
                                }


        interface Props {
          results: PreliminaryResults;
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

                                const thStyle: React.CSSProperties = {
                                  padding: '8px 5px',
                                    border: '1px solid #ddd',
                                      background: '#0f4c81',
                                        color: 'white',
                                          fontSize: '0.8rem',
                                            fontWeight: 700,
                                            };

                                            const tdStyle: React.CSSProperties = {
                                              padding: '10px 5px',
                                                border: '1px solid #ddd',
                                                  textAlign: 'center',
                                                    fontSize: '0.85rem',
                                                    };

                                                    const totalStyle: React.CSSProperties = {
                                                      background: '#e8f5e9',
                                                        color: '#1b5e20',
                                                          fontWeight: 700,
                                                          };

                                                          export const PreliminaryTables: React.FC<Props> = ({ results }) => {
                                                            const rows = [
                                                                  { label: 'مساحة الأرض (حدود الأرض)', value: `${formatQuantity(results.landBoundaryArea ?? 0)} م²` },
                                                                      { label: 'مساحة المبنى', value: `${formatQuantity(results.buildingArea)} م²` },
                                                                              { label: 'حجم الحفر', value: `${formatQuantity(results.excavationVolume)} م³` },
                                                            
                                                                        { label: 'حجم الدفان', value: `${formatQuantity(results.backfillVolume)} م³` },
                                                                            { label: 'مساحة الكرسي', value: `${formatQuantity(results.plinthArea)} م²` },
                                                                              ];

                                                                                return (
                                                                                    <div style={cardStyle}>
                                                                                          <div className="qty-main-heading">
  📊 نتائج التمهيدية
</div>
                                                                                                <div style={{ padding: 10, overflowX: 'auto' }}>
                                                                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                                                                  <thead>
                                                                                                                              <tr>
                                                                                                                                            <th style={thStyle}>البند</th>
                                                                                                                                                          <th style={thStyle}>الكمية</th>
                                                                                                                                                                      </tr>
                                                                                                                                                                                </thead>
                                                                                                                                                                                          <tbody>
                                                                                                                                                                                                      {rows.map((row, index) => (
                                                                                                                                                                                                                    <tr key={index}>
                                                                                                                                                                                                                                    <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'right' }}>{row.label}</td>
                                                                                                                                                                                                                                                    <td style={tdStyle}>{row.value}</td>
                                                                                                                                                                                                                                                                  </tr>
                                                                                                                                                                                                                                                                              ))}
                                                                                                                                                                                                                                                                                        </tbody>
                                                                                                                                                                                                                                                                                                </table>
                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                            );
                                                                                                                                                                                                                                                                                                            };
