import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';

interface Props {
  results: FinishResults;
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (
    tableId: string,
    rowId: string,
    patch: { label?: string; value?: number }
  ) => void;
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

                                                export const WallConstructionTables: React.FC<Props> = ({
  results,
  detailCellEdits,
  onDetailCellEdit,
}) => {
  const displayRows = (
    tableId: string,
    rows: import('../TableDetailsToggle').DetailValue[]
  ) => rows.map(row => {
    const rowId = row.key ?? row.label;
    const edit = detailCellEdits?.[JSON.stringify([tableId, rowId])];
    return {
      ...row,
      label: edit?.label?.trim() || row.label,
      value: typeof edit?.value === 'number' &&
        Number.isFinite(edit.value) && edit.value >= 0
          ? edit.value
          : row.value,
    };
  });

  const editLabel = (tableId: string, rows: import('../TableDetailsToggle').DetailValue[]) =>
    onDetailCellEdit
      ? (_row: import('../TableDetailsToggle').DetailValue, index: number, label: string) =>
          onDetailCellEdit(tableId, rows[index].key ?? rows[index].label, { label })
      : undefined;

  const editValue = (tableId: string, rows: import('../TableDetailsToggle').DetailValue[]) =>
    onDetailCellEdit
      ? (_row: import('../TableDetailsToggle').DetailValue, index: number, value: number) =>
          onDetailCellEdit(tableId, rows[index].key ?? rows[index].label, { value })
      : undefined;

  const exteriorRows: import('../TableDetailsToggle').DetailValue[] = [
    { label: 'مساحة الجدران الإجمالية', value: results.exteriorWallGross, key: 'exteriorWallGross', unit: 'م²', formula: 'مجموع (طول الجدار + ضعفي السماكة) × ارتفاع الدور' },
    { label: 'مساحة الأعمدة المخصومة', value: results.outerColumnArea, key: 'outerColumnArea', unit: 'م²', formula: 'تُخصم من مساحة الجدران الإجمالية' },
    { label: 'مساحة النوافذ المخصومة', value: results.extWindowArea, key: 'extWindowArea', unit: 'م²', formula: 'مجموع عرض × ارتفاع النوافذ المرتبطة بهذه الجدران' },
    { label: 'مساحة الأبواب المخصومة', value: results.extDoorArea, key: 'extDoorArea', unit: 'م²', formula: 'مجموع عرض × ارتفاع الأبواب المرتبطة بهذه الجدران' },
    { label: 'صافي مساحة الجدران', value: results.exteriorWallNet, key: 'exteriorWallNet', unit: 'م²', formula: 'الأكبر بين الصفر و(المساحة الإجمالية − الأعمدة − النوافذ − الأبواب)' },
    { label: 'عدد البلوك', value: results.exteriorBlocks, key: 'exteriorBlocks', unit: 'بلوكة', formula: 'تقريب للأعلى (صافي المساحة × 12)' },
    { label: 'أكياس الأسمنت', value: results.exteriorBlockCement, key: 'exteriorBlockCement', unit: 'كيس', formula: 'تقريب للأعلى (عدد البلوك ÷ 50)' },
    { label: 'حجم الرمل', value: results.exteriorBlockSand, key: 'exteriorBlockSand', unit: 'م³', formula: 'أكياس الأسمنت × 0.15' },
  ];
  const interiorRows: import('../TableDetailsToggle').DetailValue[] = [
    { label: 'مساحة الجدران الإجمالية', value: results.interiorWallGross, key: 'interiorWallGross', unit: 'م²', formula: 'مجموع طول كل جدار × ارتفاع الدور' },
    { label: 'مساحة الأعمدة المخصومة', value: results.innerColumnArea, key: 'innerColumnArea', unit: 'م²', formula: 'تُخصم من مساحة الجدران الإجمالية' },
    { label: 'مساحة النوافذ المخصومة', value: results.intWindowArea, key: 'intWindowArea', unit: 'م²', formula: 'مجموع عرض × ارتفاع النوافذ المرتبطة بهذه الجدران' },
    { label: 'مساحة الأبواب المخصومة', value: results.intDoorArea, key: 'intDoorArea', unit: 'م²', formula: 'مجموع عرض × ارتفاع الأبواب المرتبطة بهذه الجدران' },
    { label: 'صافي مساحة الجدران', value: results.interiorWallNet, key: 'interiorWallNet', unit: 'م²', formula: 'الأكبر بين الصفر و(المساحة الإجمالية − الأعمدة − النوافذ − الأبواب)' },
    { label: 'عدد البلوك', value: results.interiorBlocks, key: 'interiorBlocks', unit: 'بلوكة', formula: 'تقريب للأعلى (صافي المساحة × 12)' },
    { label: 'أكياس الأسمنت', value: results.interiorBlockCement, key: 'interiorBlockCement', unit: 'كيس', formula: 'تقريب للأعلى (عدد البلوك ÷ 50)' },
    { label: 'حجم الرمل', value: results.interiorBlockSand, key: 'interiorBlockSand', unit: 'م³', formula: 'أكياس الأسمنت × 0.15' },
  ];
                                                  return (
                                                      <>
                                                            {/* جدول بناء الجدران الخارجية */}
                                                                  <div style={cardStyle}>
                                                                          <div className="qty-main-heading">🧱 كميات بناء الجدران الخارجية</div>
          <TableDetailsToggle
            title="🧱 كميات بناء الجدران الخارجية"
            rows={displayRows('exteriorWalls', exteriorRows)}
            onLabelEdit={editLabel('exteriorWalls', exteriorRows)}
            onValueEdit={editValue('exteriorWalls', exteriorRows)}
          >{null}</TableDetailsToggle>
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
                                                                                                                                                                                                                          <tr><td style={tdStyle}>عدد البلوك</td><td style={tdStyle}>{Math.ceil(results.exteriorBlocks)}</td><td style={tdStyle}>بلوكة</td></tr>
                                                                                                                                                                                                                                        <tr><td style={tdStyle}>أكياس الأسمنت</td><td style={tdStyle}>{Math.ceil(results.exteriorBlockCement)}</td><td style={tdStyle}>كيس</td></tr>
                                                                                                                                                                                                                                                      <tr><td style={tdStyle}>الرمل</td><td style={tdStyle}>{Math.ceil(results.exteriorBlockSand)}</td><td style={tdStyle}>م³</td></tr>
                                                                                                                                                                                                                                                                  </tbody>
                                                                                                                                                                                                                                                                            </table>
                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                          </div>

                                                                                                                                                                                                                                                                                                {/* جدول بناء الجدران الداخلية */}
                                                                                                                                                                                                                                                                                                      <div style={cardStyle}>
                                                                                                                                                                                                                                                                                                              <div className="qty-main-heading">🧱 كميات بناء الجدران الداخلية</div>
          <TableDetailsToggle
            title="🧱 كميات بناء الجدران الداخلية"
            rows={displayRows('interiorWalls', interiorRows)}
            onLabelEdit={editLabel('interiorWalls', interiorRows)}
            onValueEdit={editValue('interiorWalls', interiorRows)}
          >{null}</TableDetailsToggle>
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                              <tr><td style={tdStyle}>عدد البلوك</td><td style={tdStyle}>{Math.ceil(results.interiorBlocks)}</td><td style={tdStyle}>بلوكة</td></tr>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            <tr><td style={tdStyle}>أكياس الأسمنت</td><td style={tdStyle}>{Math.ceil(results.interiorBlockCement)}</td><td style={tdStyle}>كيس</td></tr>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <tr><td style={tdStyle}>الرمل</td><td style={tdStyle}>{Math.ceil(results.interiorBlockSand)}</td><td style={tdStyle}>م³</td></tr>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </tbody>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </table>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    };