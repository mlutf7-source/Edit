import React, { useEffect, useMemo, useState } from 'react';
import type { RoomQuantityRow } from './RoomQuantityDetails';
import { plasterRoomQuantity, plasterDetailTotals, type PlasterOpeningsByRoom } from './plasterDetailCalculations';
import { calculateStairTileSkirting, type StairFlightQuantity, type StairLandingQuantity } from '../../core/stairTileSkirting';

type Kind = 'plaster' | 'paint' | 'tile';
type NumericField = 'length' | 'width' | 'height' | 'area' | 'perimeter';

interface Props {
  kind: Kind;
  plasterOpenings?: PlasterOpeningsByRoom;
  /** Changes only when the selected floor draft is reset. */
  resetRevision?: number;
  /** Optional display-only edits, stored by the parent for the selected floor. */
  detailCellEdits?: Record<string, { label?: string; value?: number }>;
  onDetailCellEdit?: (tableId: string, rowId: string, patch: { label?: string; value?: number }) => void;
  rows: RoomQuantityRow[];
  onChange: (rows: RoomQuantityRow[]) => void;
  /** مجموع عروض الأبواب والفتحات التي تقطع النعلة لكل منطقة. */
  skirtingDeductions?: Record<string, number>;
  /** Individual stair flights for the selected floor. */
  stairFlights?: readonly StairFlightQuantity[];
  /** Individual stair landings for the selected floor. */
  stairLandings?: readonly StairLandingQuantity[];
  /** Parent-owned stair overrides; persistence is implemented in FinishesPage. */
  onStairQuantitiesChange?: (flights: StairFlightQuantity[], landings: StairLandingQuantity[]) => void;
  /** Independent rows for this finish item, supplied by the parent for draft persistence. */
  editedRows?: RoomQuantityRow[];
  /** Save changes to the independent rows for this finish item. */
  onEditedRowsChange?: (rows: RoomQuantityRow[]) => void;
}

const fmt = (v: number) => String(Math.round((v + Number.EPSILON) * 100) / 100);
const th: React.CSSProperties = {
  border: '1px solid #cbd5e1', padding: 8, background: '#0b354a',
  color: 'white', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  border: '1px solid #cbd5e1', padding: 6, textAlign: 'center',
};

const createRow = (): RoomQuantityRow => ({
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: '', type: 'room', length: 0, width: 0,
  height: 0, area: 0, perimeter: 0,
});

export const RoomFinishBreakdown: React.FC<Props> = ({
  kind, plasterOpenings = {}, resetRevision = 0, rows, onChange: _onChange, editedRows, onEditedRowsChange,
  detailCellEdits, onDetailCellEdit,
  skirtingDeductions = {}, stairFlights = [], stairLandings = [], onStairQuantitiesChange,
}) => {
  const [open, setOpen] = useState(false);
  // Local fallback keeps edits confined to this particular table. The parent
  // should provide editedRows/onEditedRowsChange for floor-draft persistence.
  const [localRows, setLocalRows] = useState<RoomQuantityRow[]>(() => rows.map(r => ({ ...r })));
  const controlled = editedRows !== undefined && onEditedRowsChange !== undefined;

  // A draft reset must discard local overrides, including manually added rows.
  // The parent must increment resetRevision when resetting the selected floor.
  // The first render is excluded to preserve restored draft data.
  const lastResetRevision = React.useRef(resetRevision);
  useEffect(() => {
    if (lastResetRevision.current === resetRevision) return;
    lastResetRevision.current = resetRevision;
    setLocalRows(rows.map(row => ({ ...row })));
  }, [resetRevision, rows]);

  useEffect(() => {
    if (controlled) return;
    setLocalRows(previous => {
      const oldById = new Map(previous.map(r => [r.id, r]));
      const originals = rows.map(r => oldById.get(r.id) ?? { ...r });
      const manual = previous.filter(r => r.id.startsWith('manual-'));
      return [...originals, ...manual.filter(r => !rows.some(base => base.id === r.id))];
    });
  }, [rows, controlled]);

  // Use original rows until this finish item has its own saved edits.
  const activeRows: RoomQuantityRow[] =
    controlled && editedRows!.length > 0
      ? editedRows!
      : controlled
        ? rows
        : localRows;
  const updateRows = (next: RoomQuantityRow[]) => {
    if (controlled) onEditedRowsChange!(next);
    else setLocalRows(next);
  };

  const change = (row: RoomQuantityRow, field: NumericField, value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    updateRows(activeRows.map(r => {
      if (r.id !== row.id) return r;
      if (field === 'length' || field === 'width') {
        const length = field === 'length' ? value : (r.length ?? 0);
        const width = field === 'width' ? value : (r.width ?? 0);
        return kind === 'plaster'
          ? { ...r, length, width, area: length * width } // Keep actual polygon perimeter.
          : { ...r, length, width, area: length * width, perimeter: 2 * (length + width) };
      }
      return { ...r, [field]: value };
    }));
  };

  const plasterDeductionInput = (row: RoomQuantityRow, field: 'plasterWindowDeduction' | 'plasterOpeningDeduction' | 'plasterDoorDeduction', automatic: number) => {
    const shown = isWetArea(row) ? 0 : (row[field] ?? automatic);
    return <input type="number" min="0" step="any" aria-label={`${field} ${row.name}`}
      disabled={isWetArea(row)} key={`${row.id}-${field}-${fmt(shown)}`} defaultValue={fmt(shown)}
      onFocus={e => e.currentTarget.select()}
      onBlur={e => {
        const raw = e.currentTarget.value.trim();
        const value = Number(raw);
        if (raw && Number.isFinite(value) && value >= 0) {
          if (value !== shown) updateRows(activeRows.map(r => r.id === row.id ? { ...r, [field]: value } : r));
        } else e.currentTarget.value = fmt(shown);
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{ width: 72, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'center' }} />;
  };

  const numeric = (row: RoomQuantityRow, field: NumericField) => {
    const value = row[field];
    if ((field === 'length' || field === 'width') && value === undefined) {
      return <span title="المنطقة غير مستطيلة؛ عدّل المساحة والمحيط">—</span>;
    }
    return (
      <input
        aria-label={`${field} ${row.name}`}
        type="number" min="0" step="any"
        key={`${kind}-${row.id}-${field}-${fmt(Number(value ?? 0))}`}
        defaultValue={fmt(Number(value ?? 0))}
        onFocus={e => e.currentTarget.select()}
        onClick={e => e.currentTarget.select()}
        onBlur={e => {
          const input = e.currentTarget;
          const next = Number(input.value);
          if (input.value !== '' && Number.isFinite(next) && next >= 0) {
            change(row, field, next);
            input.value = fmt(next);
          } else {
            input.value = fmt(Number(value ?? 0));
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ width: 72, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'center' }}
      />
    );
  };

  const safeQuantity = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, value) : 0;

  const isWetArea = (r: RoomQuantityRow): boolean =>
    r.type === 'kitchen' || r.type === 'bathroom';

  const isSkirtingArea = (r: RoomQuantityRow): boolean =>
    r.type === 'room' || r.type === 'hall';

  const wallArea = (r: RoomQuantityRow): number =>
    safeQuantity(r.perimeter) * safeQuantity(r.height);

  const wallFinish = (r: RoomQuantityRow): number => {
    if (kind === 'tile') return isWetArea(r) ? wallArea(r) : 0;
    return isWetArea(r) ? 0 : wallArea(r);
  };

  // Floor area for tile; ceiling area for plaster and paint.
  const ceilingFinish = (r: RoomQuantityRow): number => safeQuantity(r.area);

  const skirtingLength = (r: RoomQuantityRow): number =>
    isSkirtingArea(r) ? safeQuantity(r.perimeter) : 0;

  const skirtingDeduction = (r: RoomQuantityRow): number => {
    const gross = skirtingLength(r);
    if (gross <= 0) return 0;
    return Math.min(gross, safeQuantity(skirtingDeductions[r.id] ?? 0));
  };

  const skirtingNetLength = (r: RoomQuantityRow): number =>
    Math.max(0, skirtingLength(r) - skirtingDeduction(r));

  const totals = useMemo(() => ({
    walls: activeRows.reduce((sum, r) => sum + wallFinish(r), 0),
    ceilings: activeRows.reduce((sum, r) => sum + ceilingFinish(r), 0),
    skirting: activeRows.reduce((sum, r) => sum + skirtingLength(r), 0),
    skirtingDeductions: activeRows.reduce((sum, r) => sum + skirtingDeduction(r), 0),
    skirtingNet: activeRows.reduce((sum, r) => sum + skirtingNetLength(r), 0),
  }), [activeRows, kind, skirtingDeductions]);

  const plasterTotals = plasterDetailTotals(activeRows, plasterOpenings);

  // The parent owns the editable stair quantities. No geometry is mutated here.
  // Without a parent callback, show read-only fields rather than pretending to save.
  const updateStairFlight = (id: string, field: 'treadCount' | 'treadDepth' | 'riserHeight', value: number) => {
    if (!onStairQuantitiesChange || !Number.isFinite(value) || value < 0) return;
    const normalized = field === 'treadCount' ? Math.floor(value) : value;
    onStairQuantitiesChange(
      stairFlights.map(flight => flight.id === id ? { ...flight, [field]: normalized } : { ...flight }),
      stairLandings.map(landing => ({ ...landing })),
    );
  };

  const updateStairLanding = (id: string, field: 'length' | 'width', value: number) => {
    if (!onStairQuantitiesChange || !Number.isFinite(value) || value < 0) return;
    onStairQuantitiesChange(
      stairFlights.map(flight => ({ ...flight })),
      stairLandings.map(landing => landing.id === id ? { ...landing, [field]: value } : { ...landing }),
    );
  };

  const stairNumberInput = (
    label: string,
    value: number,
    onCommit: (next: number) => void,
    integer = false,
  ) => (
    <input
      aria-label={label}
      type="number" min="0" step={integer ? '1' : 'any'}
      disabled={!onStairQuantitiesChange}
      key={`${label}-${value}`}
      defaultValue={integer ? String(Math.floor(value)) : fmt(value)}
      onFocus={event => event.currentTarget.select()}
      onBlur={event => {
        const raw = event.currentTarget.value.trim();
        const next = Number(raw);
        if (raw && Number.isFinite(next) && next >= 0 && (!integer || Number.isInteger(next))) {
          onCommit(next);
        } else {
          event.currentTarget.value = integer ? String(Math.floor(value)) : fmt(value);
        }
      }}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      style={{ width: 85, maxWidth: '100%', textAlign: 'center', boxSizing: 'border-box' }}
    />
  );

  // Overrides below affect the displayed detail cells only. Stair geometry,
  // formula results, summary quantities and labor are deliberately untouched.
  const stairCell = (rowId: string, originalLabel: string, originalValue?: number) => {
    const edit = detailCellEdits?.[JSON.stringify(['stairDetails', rowId])];
    return {
      label: edit?.label?.trim() || originalLabel,
      value: typeof edit?.value === 'number' && Number.isFinite(edit.value) && edit.value >= 0
        ? edit.value : originalValue,
    };
  };

  const stairLabelInput = (rowId: string, label: string) => {
    const shown = stairCell(rowId, label).label;
    return onDetailCellEdit ? (
      <input
        type="text" aria-label={`اسم ${label}`}
        key={`${rowId}-${shown}-${resetRevision}`}
        defaultValue={shown}
        onBlur={event => {
          const next = event.currentTarget.value.trim();
          if (next && next !== shown) onDetailCellEdit('stairDetails', rowId, { label: next });
          else event.currentTarget.value = shown;
        }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        style={{ width: 125, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'right' }}
      />
    ) : shown;
  };

  const stairResultInput = (rowId: string, label: string, calculated: number) => {
    const shown = stairCell(rowId, label, calculated).value ?? calculated;
    return onDetailCellEdit ? (
      <input
        type="number" min="0" step="any" aria-label={label}
        key={`${rowId}-${shown}-${resetRevision}`}
        defaultValue={fmt(shown)}
        onFocus={event => event.currentTarget.select()}
        onBlur={event => {
          const raw = event.currentTarget.value.trim();
          const next = Number(raw);
          if (raw && Number.isFinite(next) && next >= 0) {
            if (next !== shown) onDetailCellEdit('stairDetails', rowId, { value: next });
          } else event.currentTarget.value = fmt(shown);
        }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        style={{ width: 85, maxWidth: '100%', textAlign: 'center', boxSizing: 'border-box' }}
      />
    ) : fmt(shown);
  };

  const stairDetails = useMemo(() => {
    const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
    const flights = stairFlights.map((flight, index) => {
      const count = Math.floor(safe(flight.treadCount));
      const depth = safe(flight.treadDepth);
      const rise = safe(flight.riserHeight);
      return { id: flight.id, number: index + 1, count, depth, rise,
        skirting: count * (depth + rise) };
    });
    const landings = stairLandings.map((landing, index) => {
      const length = safe(landing.length);
      const width = safe(landing.width);
      return { id: landing.id, number: index + 1, length, width,
        area: length * width, skirting: 2 * width + length };
    });
    const calculated = calculateStairTileSkirting(stairFlights, stairLandings);
    const totalTreads = calculated.stepTileCount;
    const totalFlightSkirting = calculated.flightSkirtingLength;
    const totalLandingArea = calculated.landingTileArea;
    const totalLandingSkirting = calculated.landingSkirtingLength;
    return { flights, landings, totalTreads, totalFlightSkirting,
      totalLandingArea, totalLandingSkirting,
      totalSkirting: calculated.stairSkirtingLength };
  }, [stairFlights, stairLandings]);

  return (
    <div dir="rtl" style={{ padding: '8px 10px' }}>
      <button
        type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ padding: '10px 12px', border: '1px solid #b9d6df', borderRadius: 8, background: '#ecf8fa', cursor: 'pointer', width: '100%', textAlign: 'right' }}
      >
        {open ? 'إخفاء' : 'إظهار'} الحسابات التفصيلية حسب الغرفة
      </button>
      {open && (
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 790, width: '100%', fontSize: 13 }}>
            <thead><tr>
              <th style={th}>المنطقة</th>
              <th style={th}>الطول م</th>
              <th style={th}>العرض م</th>
              <th style={th}>الارتفاع م</th>
              <th style={th}>المساحة م²</th>
              <th style={th}>المحيط م</th>
              {kind === 'plaster' && <th style={th}>إجمالي مساحة الجدران م²</th>}
              {kind === 'plaster' && <><th style={th}>مساحة النوافذ م²</th><th style={th}>مساحة الفتحات م²</th><th style={th}>مساحة الأبواب م²</th><th style={th}>إجمالي الخصومات م²</th></>}
              <th style={th}>{kind === 'tile' ? 'بلاط الجدران م²' : kind === 'paint' ? 'طلاء الجدران م²' : 'صافي تلييس الجدران م²'}</th>
              <th style={th}>{kind === 'tile' ? 'بلاط الأرضية م²' : kind === 'paint' ? 'طلاء السقف م²' : 'تلييس السقف م²'}</th>
              {kind === 'tile' && (
                <>
                  <th style={th}>النعلة الإجمالية (م ط)</th>
                  <th style={th}>خصومات الأبواب والفتحات (م ط)</th>
                  <th style={th}>النعلة الصافية (م ط)</th>
                </>
              )}
            </tr></thead>
            <tbody>
              {activeRows.map(r => (
                <tr key={r.id}>
                  <td style={td}>
                    <input
                      type="text" aria-label={`اسم المنطقة ${r.id}`}
                      value={r.name}
                      onChange={e => updateRows(activeRows.map(item =>
                        item.id === r.id ? { ...item, name: e.target.value } : item
                      ))}
                      style={{ width: 115, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'right', padding: 5 }}
                    />
                  </td>
                  <td style={td}>{numeric(r, 'length')}</td>
                  <td style={td}>{numeric(r, 'width')}</td>
                  <td style={td}>{numeric(r, 'height')}</td>
                  <td style={td}>{numeric(r, 'area')}</td>
                  <td style={td}>{numeric(r, 'perimeter')}</td>
                  {kind === 'plaster' && <td style={td}>{fmt(plasterRoomQuantity(r, plasterOpenings[r.id]).gross)}</td>}
                  {kind === 'plaster' && (() => {
                    const q = plasterRoomQuantity(r, plasterOpenings[r.id]);
                    return <>
                      <td style={td}>{plasterDeductionInput(r, 'plasterWindowDeduction', plasterOpenings[r.id]?.windows ?? 0)}</td>
                      <td style={td}>{plasterDeductionInput(r, 'plasterOpeningDeduction', plasterOpenings[r.id]?.openings ?? 0)}</td>
                      <td style={td}>{plasterDeductionInput(r, 'plasterDoorDeduction', plasterOpenings[r.id]?.doors ?? 0)}</td>
                      <td style={td}>{fmt(q.deductions)}</td>
                    </>;
                  })()}
                  <td style={td}>{fmt(kind === 'plaster' ? plasterRoomQuantity(r, plasterOpenings[r.id]).net : wallFinish(r))}</td>
                  <td style={td}>{fmt(ceilingFinish(r))}</td>
                  {kind === 'tile' && (
                    <>
                      <td style={td}>{fmt(skirtingLength(r))}</td>
                      <td style={td}>{fmt(skirtingDeduction(r))}</td>
                      <td style={td}>{fmt(skirtingNetLength(r))}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <th style={td} colSpan={6}>إجمالي كميات المناطق</th>
              {kind === 'plaster' && <><th style={td}>{fmt(plasterTotals.gross)}</th><th style={td}>{fmt(plasterTotals.windows)}</th><th style={td}>{fmt(plasterTotals.openings)}</th><th style={td}>{fmt(plasterTotals.doors)}</th><th style={td}>{fmt(plasterTotals.deductions)}</th></>}
              <th style={td}>{fmt(kind === 'plaster' ? plasterTotals.walls : totals.walls)}</th>
              <th style={td}>{fmt(totals.ceilings)}</th>
              {kind === 'tile' && (
                <>
                  <th style={td}>{fmt(totals.skirting)}</th>
                  <th style={td}>{fmt(totals.skirtingDeductions)}</th>
                  <th style={td}>{fmt(totals.skirtingNet)}</th>
                </>
              )}
            </tr></tfoot>
          </table>
          {kind === 'tile' && (
            <section style={{ marginTop: 18 }} aria-label="الحسابات التفصيلية لبلاط السلم">
              <h3 style={{ margin: '8px 0' }}>الحسابات التفصيلية للسلم</h3>
              {!onStairQuantitiesChange && (
                <p style={{ color: '#92400e' }}>التحرير ينتظر ربط الحفظ في صفحة التشطيبات؛ القيم الحالية للعرض فقط.</p>
              )}
              {stairDetails.flights.length === 0 && stairDetails.landings.length === 0 ? (
                <p>لا توجد بيانات سحبات أو بسطات ممررة لهذا الدور.</p>
              ) : (
                <>
                  <h4>بلاط النوائم ونعلة السحبات</h4>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                    <thead><tr>
                      <th style={th}>السحبة</th><th style={th}>عدد النوائم (عدد)</th>
                      <th style={th}>عمق النائمة (م)</th><th style={th}>ارتفاع القائمة (م)</th>
                      <th style={th}>نعلة السحبة (م ط)</th>
                    </tr></thead>
                    <tbody>{stairDetails.flights.map(flight => (
                      <tr key={flight.id}>
                        <td style={td}>{stairLabelInput(`flight:${flight.id}:label`, `السحبة ${flight.number}`)}</td>
                        <td style={td}>{stairNumberInput(`عدد نوائم السحبة ${flight.number}`, flight.count, value => updateStairFlight(flight.id, 'treadCount', value), true)}</td>
                        <td style={td}>{stairNumberInput(`عمق نائمة السحبة ${flight.number}`, flight.depth, value => updateStairFlight(flight.id, 'treadDepth', value))}</td>
                        <td style={td}>{stairNumberInput(`ارتفاع قائمة السحبة ${flight.number}`, flight.rise, value => updateStairFlight(flight.id, 'riserHeight', value))}</td>
                        <td style={td}>{stairResultInput(`flight:${flight.id}:skirting`, `نعلة السحبة ${flight.number}`, flight.skirting)}</td>
                      </tr>
                    ))}</tbody>
                    <tfoot><tr>
                      <th style={td}>الإجمالي</th>
                      <th style={td}>{stairDetails.totalTreads}</th>
                      <th style={td} colSpan={2}>—</th>
                      <th style={td}>{fmt(stairDetails.totalFlightSkirting)}</th>
                    </tr></tfoot>
                  </table>
                  <h4>بلاط البسطات ونعلة البسطات</h4>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                    <thead><tr>
                      <th style={th}>البسطة</th><th style={th}>الطول (م)</th>
                      <th style={th}>العرض (م)</th><th style={th}>بلاط البسطة (م²)</th>
                      <th style={th}>نعلة البسطة (م ط)</th>
                    </tr></thead>
                    <tbody>{stairDetails.landings.map(landing => (
                      <tr key={landing.id}>
                        <td style={td}>{stairLabelInput(`landing:${landing.id}:label`, `البسطة ${landing.number}`)}</td>
                        <td style={td}>{stairNumberInput(`طول البسطة ${landing.number}`, landing.length, value => updateStairLanding(landing.id, 'length', value))}</td>
                        <td style={td}>{stairNumberInput(`عرض البسطة ${landing.number}`, landing.width, value => updateStairLanding(landing.id, 'width', value))}</td>
                        <td style={td}>{stairResultInput(`landing:${landing.id}:area`, `بلاط البسطة ${landing.number}`, landing.area)}</td>
                        <td style={td}>{stairResultInput(`landing:${landing.id}:skirting`, `نعلة البسطة ${landing.number}`, landing.skirting)}</td>
                      </tr>
                    ))}</tbody>
                    <tfoot><tr>
                      <th style={td}>الإجمالي</th><th style={td} colSpan={2}>—</th>
                      <th style={td}>{fmt(stairDetails.totalLandingArea)}</th>
                      <th style={td}>{fmt(stairDetails.totalLandingSkirting)}</th>
                    </tr></tfoot>
                  </table>
                  <p><strong>إجمالي نعلة السلم (م ط): {fmt(stairDetails.totalSkirting)}</strong>
                    {' '}= نعلة السحبات ({fmt(stairDetails.totalFlightSkirting)})
                    {' '}+ نعلة البسطات ({fmt(stairDetails.totalLandingSkirting)})</p>
                </>
              )}
            </section>
          )}
          <button
            type="button" onClick={() => updateRows([...activeRows, createRow()])}
            style={{ marginTop: 10, padding: '9px 14px', background: '#0f4c81', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }}
          >
            + إضافة صف
          </button>
          <div style={{ marginTop: 8 }}>
            <small>
              مساحات الجدران المعروضة إجمالية قبل خصومات الفتحات والأعمدة.
              وتشمل مساحات الأسقف جميع أنواع المناطق، بينما يقتصر تلييس ودهان
              الجدران على الغرف والصالات، ويقتصر بلاط الجدران على المطابخ والحمامات.
              {kind === 'tile' && (
                <> تُحسب النعلة للغرف والصالات فقط، وتُعرض كميتها الإجمالية وخصومات
                  الأبواب والفتحات وكميتها الصافية.</>
              )}
              {' '}تُحفظ تعديلات كل بند بصورة مستقلة، وتُعالج مطابقة الكميات الرئيسية
              والعمالة في الملفات المسؤولة عنها.
            </small>
          </div>
        </div>
      )}
    </div>
  );
};
