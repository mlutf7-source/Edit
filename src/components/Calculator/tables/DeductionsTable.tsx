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

                                                export const DeductionsTable: React.FC<Props> = ({ results }) => {
                                                  return (
                                                      <div style={cardStyle}>
                                                            <div style={headStyle}>📉 مساحات الخصومات من الجدران</div>
                                                                  <TableDetailsToggle title="مساحات الخصومات من الجدران" rows={[
{ label: 'خصم الأعمدة من الجدران الخارجية', value: results.outerColumnArea, unit: 'م²', formula: 'مساحة مقاطع الأعمدة الواقعة على الواجهات الخارجية بحسب مواضعها وارتفاعاتها' },
{ label: 'خصم الأعمدة من الجدران الداخلية', value: results.innerColumnArea, unit: 'م²', formula: 'مساحة مقاطع الأعمدة الواقعة على الجدران الداخلية بحسب مواضعها وارتفاعاتها' },
{ label: 'خصم النوافذ الخارجية', value: results.extWindowArea, unit: 'م²', formula: 'مجموع (عرض النافذة × ارتفاعها) للفتحات على الجدران الخارجية' },
{ label: 'خصم النوافذ الداخلية', value: results.intWindowArea, unit: 'م²', formula: 'مجموع (عرض النافذة × ارتفاعها) للفتحات على الجدران الداخلية' },
{ label: 'خصم الأبواب الخارجية', value: results.extDoorArea, unit: 'م²', formula: 'مجموع (عرض الباب × ارتفاعه) للأبواب على الجدران الخارجية' },
{ label: 'خصم الأبواب الداخلية', value: results.intDoorArea, unit: 'م²', formula: 'مجموع (عرض الباب × ارتفاعه) للأبواب على الجدران الداخلية' },
{ label: 'إجمالي خصومات الجدران الخارجية', value: results.outerColumnArea + results.extWindowArea + results.extDoorArea, unit: 'م²', formula: 'الأعمدة الخارجية + النوافذ الخارجية + الأبواب الخارجية' },
{ label: 'إجمالي خصومات الجدران الداخلية', value: results.innerColumnArea + results.intWindowArea + results.intDoorArea, unit: 'م²', formula: 'الأعمدة الداخلية + النوافذ الداخلية + الأبواب الداخلية' },
{ label: 'صافي الجدران الخارجية', value: results.exteriorWallNet, unit: 'م²', formula: 'الأكبر بين صفر و(إجمالي الجدران الخارجية − خصوماتها)' },
{ label: 'صافي الجدران الداخلية', value: results.interiorWallNet, unit: 'م²', formula: 'الأكبر بين صفر و(إجمالي الجدران الداخلية − خصوماتها)' }
]}>{null}</TableDetailsToggle>
<div style={bodyStyle}>
                                                                          <table style={tableStyle}>
                                                                                    <thead>
                                                                                                <tr>
                                                                                                              <th style={thStyle}>البند</th>
                                                                                                                            <th style={thStyle}>الجدران الخارجية (م²)</th>
                                                                                                                                          <th style={thStyle}>الجدران الداخلية (م²)</th>
                                                                                                                                                      </tr>
                                                                                                                                                                </thead>
                                                                                                                                                                          <tbody>
                                                                                                                                                                                      <tr>
                                                                                                                                                                                                    <td style={tdStyle}>الأعمدة</td>
                                                                                                                                                                                                                  <td style={tdStyle}>{formatQuantity(results.outerColumnArea)}</td>
                                                                                                                                                                                                                                <td style={tdStyle}>{formatQuantity(results.innerColumnArea)}</td>
                                                                                                                                                                                                                                            </tr>
                                                                                                                                                                                                                                                        <tr>
                                                                                                                                                                                                                                                                      <td style={tdStyle}>النوافذ</td>
                                                                                                                                                                                                                                                                                    <td style={tdStyle}>{formatQuantity(results.extWindowArea)}</td>
                                                                                                                                                                                                                                                                                                  <td style={tdStyle}>{formatQuantity(results.intWindowArea)}</td>
                                                                                                                                                                                                                                                                                                              </tr>
                                                                                                                                                                                                                                                                                                                          <tr>
                                                                                                                                                                                                                                                                                                                                        <td style={tdStyle}>الأبواب</td>
                                                                                                                                                                                                                                                                                                                                                      <td style={tdStyle}>{formatQuantity(results.extDoorArea)}</td>
                                                                                                                                                                                                                                                                                                                                                                    <td style={tdStyle}>{formatQuantity(results.intDoorArea)}</td>
                                                                                                                                                                                                                                                                                                                                                                                </tr>
                                                                                                                                                                                                                                                                                                                                                                                          </tbody>
                                                                                                                                                                                                                                                                                                                                                                                                  </table>
                                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                                                              );
                                                                                                                                                                                                                                                                                                                                                                                                              };