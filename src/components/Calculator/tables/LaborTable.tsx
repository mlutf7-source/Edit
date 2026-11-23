import React from 'react';
import { TableDetailsToggle } from '../TableDetailsToggle';
import type { FinishResults } from '../../../core/finishCalculations';
import type { RoomQuantityRow } from '../RoomQuantityDetails';

interface Props {
  results: FinishResults;
  roomRows?: RoomQuantityRow[];
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>;
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

export type LaborRow = {
  label: string;
  originalLabel?: string;
  quantity: number;
  unit: 'م²' | 'درجة' | 'م طولي';
  formula: string;
};

const laborQuantity = (value: number): number =>
  Number.isFinite(value) ? Math.ceil(Math.max(0, value)) : 0;


export const calculateLaborDifferences = (
  roomRows?: RoomQuantityRow[],
  finishItemRows?: Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>
) => {
  const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const finishTotals = (rows: RoomQuantityRow[]) => rows.reduce((sum, row) => {
    const area = nonNegative(row.area);
    const walls = nonNegative(row.perimeter) * nonNegative(row.height);
    sum.ceilings += area;
    if (row.type !== 'kitchen' && row.type !== 'bathroom') sum.walls += walls;
    if (row.type === 'kitchen') {
      sum.kitchenFloor += area;
      sum.kitchenWalls += walls;
    } else if (row.type === 'bathroom') {
      sum.bathroomFloor += area;
      sum.bathroomWalls += walls;
    } else sum.floor += area;
    return sum;
  }, { walls: 0, ceilings: 0, floor: 0, kitchenFloor: 0, kitchenWalls: 0, bathroomFloor: 0, bathroomWalls: 0 });
  const empty = finishTotals([]);
  const diff = (kind: 'plaster' | 'paint' | 'tile') => {
    const editedRows = finishItemRows?.[kind];
    if (!roomRows || !editedRows?.length) return { ...empty };
    const original = finishTotals(roomRows);
    const edited = finishTotals(editedRows);
    return {
      walls: edited.walls - original.walls,
      ceilings: edited.ceilings - original.ceilings,
      floor: edited.floor - original.floor,
      kitchenFloor: edited.kitchenFloor - original.kitchenFloor,
      kitchenWalls: edited.kitchenWalls - original.kitchenWalls,
      bathroomFloor: edited.bathroomFloor - original.bathroomFloor,
      bathroomWalls: edited.bathroomWalls - original.bathroomWalls,
    };
  };
  return { plaster: diff('plaster'), paint: diff('paint'), tile: diff('tile') };
};

export const buildLaborRows = ({ results, hasMarble, hasExteriorPlaster, exteriorPlasterGross, stairSkirtingLength, detailCellEdits, roomRows, finishItemRows }: Props): LaborRow[] => {
  const differences = calculateLaborDifferences(roomRows, finishItemRows);
  const adjusted = (value: number, difference: number) => laborQuantity(value + difference);
  const rows: LaborRow[] = [
    { label: 'بناء الجدران الخارجية', quantity: laborQuantity(results.exteriorWallGross), unit: 'م²', formula: 'مساحة الجدران الخارجية الإجمالية قبل الخصومات، مقربة إلى الأعلى' },
    { label: 'بناء الجدران الداخلية', quantity: laborQuantity(results.interiorWallGross), unit: 'م²', formula: 'مساحة الجدران الداخلية الإجمالية قبل الخصومات، مقربة إلى الأعلى' },
    ...(hasMarble ? [{ label: 'بناء الرخام', quantity: laborQuantity(results.marbleArea), unit: 'م²' as const, formula: 'كمية الرخام في نتائج البند الرئيسي، مقربة إلى الأعلى' }] : []),
    ...(hasExteriorPlaster ? [{ label: 'تلييس الجدران الخارجية', quantity: laborQuantity(exteriorPlasterGross), unit: 'م²' as const, formula: 'مساحة التلييس الخارجي الإجمالية قبل خصم الفتحات، مقربة إلى الأعلى' }] : []),
    { label: 'تلييس الجدران الداخلية', quantity: adjusted(results.plasterWallsLabor, differences.plaster.walls), unit: 'م²', formula: 'كمية عمالة تلييس الجدران الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'تلييس الأسقف', quantity: adjusted(results.plasterCeilingLabor, differences.plaster.ceilings), unit: 'م²', formula: 'مساحة الأسقف الواردة من محرك الحساب دون طرح مساحة الجدران الداخلية' },
    { label: 'طلاء الجدران', quantity: adjusted(results.paintWalls, differences.paint.walls), unit: 'م²', formula: 'كمية طلاء الجدران الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'طلاء الأسقف', quantity: adjusted(results.paintCeiling, differences.paint.ceilings), unit: 'م²', formula: 'مساحة طلاء الأسقف الواردة من محرك الحساب دون طرح مساحة الجدران الداخلية' },
    { label: 'بلاط الأرضيات', quantity: adjusted(results.correctedTileFloor, differences.tile.floor), unit: 'م²', formula: 'كمية بلاط الأرضيات الواردة من نتائج البند الرئيسي، مقربة إلى الأعلى' },
    { label: 'بلاط أرضيات المطابخ', quantity: adjusted(results.tileKitchenFloor, differences.tile.kitchenFloor), unit: 'م²', formula: 'كمية بلاط أرضيات المطابخ الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط جدران المطابخ', quantity: adjusted(results.correctedTileKitchenWalls, differences.tile.kitchenWalls), unit: 'م²', formula: 'كمية بلاط جدران المطابخ الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط أرضيات الحمامات', quantity: adjusted(results.tileBathroomFloor, differences.tile.bathroomFloor), unit: 'م²', formula: 'كمية بلاط أرضيات الحمامات الواردة من محرك الحساب، مقربة إلى الأعلى' },
    { label: 'بلاط جدران الحمامات', quantity: adjusted(results.correctedTileBathroomWalls, differences.tile.bathroomWalls), unit: 'م²', formula: 'كمية بلاط جدران الحمامات الواردة من محرك الحساب، مقربة إلى الأعلى' },
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
  return rows.map(row => {
    const edit = detailCellEdits?.[JSON.stringify(['labor', row.label])];
    return {
      ...row,
      originalLabel: row.label,
      label: edit?.label?.trim() || row.label,
      quantity: typeof edit?.value === 'number' && Number.isFinite(edit.value) && edit.value >= 0
        ? edit.value : row.quantity,
    };
  });
};

export const LaborTable: React.FC<Props> = (props) => {
  const { onDetailCellEdit } = props;
  const visibleRows = buildLaborRows(props);
  const rows = visibleRows;

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
          onDetailCellEdit('labor', rows[index].originalLabel || rows[index].label, { label: label.replace(/^عمالة\s*/, '') });
        } : undefined}
        onValueEdit={onDetailCellEdit ? (_row, index, value) => {
          onDetailCellEdit('labor', rows[index].originalLabel || rows[index].label, { value });
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
