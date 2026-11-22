import { reconcileFinishEdits, synchronizeFinishSummary } from './reconcileFinishEdits';
import React, { useEffect, useState } from 'react';
import {
  calculateFinishes,
  type FinishesInput,
  type FinishResults,
} from '../../core/finishCalculations';
import type {
  Wall,
  Column,
  Window,
  Door,
  Stair,
  StairElement,
} from '../../core/types';
import {
  calculateStairTileSkirting,
  type StairFlightQuantity,
} from '../../core/stairTileSkirting';
import type { RoomRegion } from '../../core/regionTypes';
import { FinishTables } from './FinishTables';
import type { WindowDetailRow, DoorDetailRow, DoorKind } from './tables/OpeningTables';
import { QuantityEditContext } from './TableDetailsToggle';
import { FloorWorkTables } from './FloorWorkTables';
import { EditableQuantityDetails, type QuantityDetail } from './EditableQuantityDetails';
import { RoomQuantityDetails, type RoomQuantityRow } from './RoomQuantityDetails';
import { WallQuantityReconciliation } from './WallQuantityReconciliation';
import { applyRoomQuantityOverrides } from './roomQuantityOverrides';
import { calculateFloorAdditionalFinishes } from './floorAdditionalFinishes';
import { FloorGeometryEditor } from './FloorGeometryEditor';

interface Props {
  walls: Wall[];
  columns: Column[];
  windows: Window[];
  doors: Door[];
  regions: RoomRegion[];
  stairs: Stair[];
  floorHeights: number[];
  activeFloor: number;
  projectId: string;
  stairElements: StairElement[];
}

/** A landing side is counted only when it overlaps a wall on the same floor. */
const landingWallSideLengths = (
  landing: StairElement,
  walls: Wall[],
): [number, number, number] => {
  const a = landing.length / 2;
  const b = landing.width / 2;
  const angle = landing.rotation;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const corners = [
    [-a, -b], [a, -b], [a, b], [-a, b],
  ].map(([x, y]) => ({
    x: landing.position.x + x * c - y * s,
    y: landing.position.y + x * s + y * c,
  }));
  const tolerance = 0.15;
  const lengths = corners.map((start, i) => {
    const end = corners[(i + 1) % 4];
    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const length = Math.hypot(vx, vy);
    if (!length) return 0;
    const touchesWall = walls.some(wall => {
      if (wall.curveRadius) return false;
      const wx = wall.end.x - wall.start.x;
      const wy = wall.end.y - wall.start.y;
      const wl = Math.hypot(wx, wy);
      if (!wl || Math.abs(vx * wy - vy * wx) / (length * wl) > 0.04) return false;
      const dist = (p: { x: number; y: number }) =>
        Math.abs((p.x - wall.start.x) * wy - (p.y - wall.start.y) * wx) / wl;
      if (dist(start) > tolerance || dist(end) > tolerance) return false;
      const dot = (p: { x: number; y: number }) =>
        ((p.x - wall.start.x) * wx + (p.y - wall.start.y) * wy) / wl;
      const lo = Math.max(0, Math.min(dot(start), dot(end)));
      const hi = Math.min(wl, Math.max(dot(start), dot(end)));
      return hi - lo >= length - tolerance;
    });
    return touchesWall ? length : 0;
  });
  // A landing has at most three wall-adjacent skirting sides.
  lengths.sort((x, y) => y - x);
  return [lengths[0], lengths[1], lengths[2]];
};

export const FinishesPage: React.FC<Props> = ({
  walls,
  columns,
  windows,
  doors,
  regions,
  stairs,
  floorHeights,
  activeFloor,
  projectId,
  stairElements,

}) => {
  const [selectedFloor, setSelectedFloor] = useState(activeFloor);
  useEffect(() => { setSelectedFloor(activeFloor); }, [activeFloor, projectId]);
  const floorHeight = floorHeights[selectedFloor] ?? 3;
  const storageKey = `qty_floor_${projectId}_${selectedFloor}`;
  const approvedKey = `qty_approved_${projectId}_${selectedFloor}`;
  const [approvalMessage, setApprovalMessage] = useState('');
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [draftNeedsCalculation, setDraftNeedsCalculation] = useState(false);
  const [hasMarble, setHasMarble] = useState<boolean>(false);
  const [hasExteriorPlaster, setHasExteriorPlaster] = useState(false);
  type ExteriorPlasterField = 'gross' | 'openings' | 'cement' | 'sand';
  const [exteriorPlasterEdits, setExteriorPlasterEdits] = useState<Partial<Record<ExteriorPlasterField, number>>>({});
  const [results, setResults] = useState<FinishResults | null>(null);
  const [detailRows, setDetailRows] = useState<QuantityDetail[]>([]);
  const [roomRows, setRoomRows] = useState<RoomQuantityRow[]>([]);
  
  const [windowDetailRows, setWindowDetailRows] = useState<WindowDetailRow[]>([]);
  const [doorDetailRows, setDoorDetailRows] = useState<DoorDetailRow[]>([]);
  const makeDoorRows = (items: Door[]): DoorDetailRow[] => {
    const groups = new Map<string, DoorDetailRow>();
    items.forEach(d => {
      const kind: DoorKind = d.doorType === 'main' || d.doorType === 'shop' ? d.doorType : 'regular';
      const key = `${kind}:${d.width}:${d.height}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, { name: `باب ${groups.size + 1}`, kind, count: 1, width: d.width, height: d.height });
    });
    return [...groups.values()];
  };
  const changeDoorRows = (next: DoorDetailRow[]) => {
    setDoorDetailRows(next);
    const groups = next.map(r => ({ width: r.width, height: r.height, count: r.count, unitArea: r.width * r.height, totalArea: r.count * r.width * r.height }));
    setResults(current => current ? { ...current, doorGroups: groups } : current);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.doorDetailRows = next;
      if (draft.results) draft.results.doorGroups = groups;
      if (draft.summary) draft.summary.totalDoorsArea = Math.round(groups.reduce((sum: number, g: { totalArea: number }) => sum + g.totalArea, 0) * 100) / 100;
      if (Array.isArray(draft.detailRows)) {
        draft.detailRows = draft.detailRows.map((r: QuantityDetail) => r.id === 'totalDoorsArea' ? { ...r, quantity: draft.summary?.totalDoorsArea ?? 0 } : r);
        setDetailRows(draft.detailRows);
      }
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setApprovalMessage('حُفظت تعديلات الأبواب في مسودة الدور. يلزم إعادة الاعتماد لتحديث الملخص.');
    } catch { setApprovalMessage('تعذر حفظ تعديلات الأبواب في مسودة الدور.'); }
  };

  const changeWindowRows = (next: WindowDetailRow[]) => {
    setWindowDetailRows(next);
    const nextGroups = next.map(r => ({ width: r.width, height: r.height, count: r.count, unitArea: r.width * r.height, totalArea: r.count * r.width * r.height }));
    setResults(current => current ? { ...current, windowGroups: nextGroups } : current);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.windowDetailRows = next;
      if (draft.results) draft.results.windowGroups = nextGroups;
      if (draft.summary) draft.summary.totalWindowsArea = Math.round(nextGroups.reduce((sum: number, g: { totalArea: number }) => sum + g.totalArea, 0) * 100) / 100;
      draft.detailRows = Array.isArray(draft.detailRows) ? draft.detailRows.map((r: QuantityDetail) => r.id === 'totalWindowsArea' ? { ...r, quantity: draft.summary?.totalWindowsArea ?? 0 } : r) : draft.detailRows;
      localStorage.setItem(storageKey, JSON.stringify(draft));
      if (draft.detailRows) setDetailRows(draft.detailRows);
    } catch { setApprovalMessage('تعذر حفظ تعديلات النوافذ في مسودة الدور.'); }
  };
  // Each finish item owns its own editable rows; the original roomRows stay shared only as a baseline.
  const [finishItemRows, setFinishItemRows] = useState<Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>>({ plaster: [], paint: [], tile: [] });
  const updateFinishItemRows = (kind: 'plaster' | 'paint' | 'tile', next: RoomQuantityRow[]) => {
    setFinishItemRows(current => ({ ...current, [kind]: next }));
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.finishItemRows = { ...(draft.finishItemRows || {}), [kind]: next };
      if (kind === 'tile') {
        const additions = calculateAdditionalFinishes(next);
        draft.additionalFinishes = additions;
        if (draft.summary) {
          draft.summary.skirtingLength = additions.skirtingLength;
          draft.detailRows = makeDetailRows(draft.summary);
          setDetailRows(draft.detailRows);
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setApprovalMessage('حُفظت تعديلات البند في مسودة الدور. اعتمد الدور لتحديث الملخص.');
    } catch {
      setApprovalMessage('تعذر حفظ تعديلات البند في مسودة الدور.');
    }
  };
  const [originalRoomRows, setOriginalRoomRows] = useState<RoomQuantityRow[]>([]);
  const [baselineResults, setBaselineResults] = useState<FinishResults | null>(null);
  const [electricalPts, setElectricalPts] = useState(0);
  const [plumbingPts, setPlumbingPts] = useState(0);
  const [geometryEdits, setGeometryEdits] = useState<Record<string, number>>({});

  // ✅ كمية عمالة الرخام المخصصة (قابلة للتعديل من الجدول)
  const [marbleLaborOverride, setMarbleLaborOverride] = useState<number | null>(null);

  useEffect(() => {
    setResults(null);
    setDetailRows([]);
    setRoomRows([]);
    setWindowDetailRows([]);
    setDoorDetailRows([]);
    setFinishItemRows({ plaster: [], paint: [], tile: [] });
    setOriginalRoomRows([]);
    setBaselineResults(null);
    setMarbleLaborOverride(null);
    setApprovalMessage('');
    setDraftNeedsCalculation(false);
    try { const raw = localStorage.getItem(approvedKey); setApprovedAt(raw ? (JSON.parse(raw).approvedAt ?? null) : null); } catch { setApprovedAt(null); }
    setHasMarble(false);
    setHasExteriorPlaster(false);
    setExteriorPlasterEdits({});
    setElectricalPts(0);
    setPlumbingPts(0);
    setGeometryEdits({});
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResults(parsed.results ?? null);
        setDetailRows(Array.isArray(parsed.detailRows) ? parsed.detailRows : makeDetailRows(parsed.summary));
        setRoomRows(Array.isArray(parsed.roomRows) ? parsed.roomRows : []);
        setWindowDetailRows(Array.isArray(parsed.windowDetailRows) ? parsed.windowDetailRows : (parsed.results?.windowGroups ?? []).map((g: { width: number; height: number; count: number }, i: number) => ({ name: `نافذة ${i + 1}`, width: g.width, height: g.height, count: g.count })));
        setDoorDetailRows(Array.isArray(parsed.doorDetailRows) ? parsed.doorDetailRows : makeDoorRows(doors.filter(d => (d.floor ?? 0) === selectedFloor)));
        const baseRows: RoomQuantityRow[] = Array.isArray(parsed.roomRows) ? parsed.roomRows : [];
        const savedFinishRows = parsed.finishItemRows || {};
        setFinishItemRows({
          plaster: Array.isArray(savedFinishRows.plaster) ? savedFinishRows.plaster : baseRows.map(r => ({ ...r })),
          paint: Array.isArray(savedFinishRows.paint) ? savedFinishRows.paint : baseRows.map(r => ({ ...r })),
          tile: Array.isArray(savedFinishRows.tile) ? savedFinishRows.tile : baseRows.map(r => ({ ...r })),
        });
        setOriginalRoomRows(Array.isArray(parsed.originalRoomRows) ? parsed.originalRoomRows : (Array.isArray(parsed.roomRows) ? parsed.roomRows : []));
        setBaselineResults(parsed.baselineResults ?? parsed.results ?? null);
        setHasMarble(Boolean(parsed.hasMarble));
        setHasExteriorPlaster(Boolean(parsed.hasExteriorPlaster));
        setExteriorPlasterEdits(parsed.exteriorPlasterEdits && typeof parsed.exteriorPlasterEdits === 'object' ? parsed.exteriorPlasterEdits : {});
        setElectricalPts(parsed.electricalPts ?? 0);
        setPlumbingPts(parsed.plumbingPts ?? 0);
        setMarbleLaborOverride(parsed.marbleLaborOverride ?? null);
        setGeometryEdits(parsed.geometryEdits && typeof parsed.geometryEdits === 'object' ? parsed.geometryEdits : {});
        setDraftNeedsCalculation(JSON.stringify(parsed.geometryEdits ?? {}) !== JSON.stringify(parsed.calculatedGeometryEdits ?? {}) || Boolean(parsed.needsRecalculation));
      }
    } catch { /* corrupted stored data: keep defaults */ }
  }, [storageKey, approvedKey]);

  const makeDetailRows = (summary: Record<string, unknown> | undefined): QuantityDetail[] => {
    if (!summary) return [];
    const definitions: Array<[string, string, string]> = [
      ['totalBlocks', 'البلوك', 'حبة'], ['totalCement', 'الإسمنت', 'كيس'],
      ['totalSand', 'الرمل', 'م³'], ['totalAggregate', 'الكري', 'م³'],
      ['totalMarbleArea', 'الرخام', 'م²'], ['laborWallTotal', 'عمالة الجدران', 'م²'],
      ['laborPlasterTotal', 'عمالة التلييس', 'م²'], ['laborPaintTotal', 'عمالة الدهان', 'م²'],
      ['laborTileTotal', 'عمالة البلاط', 'م²'], ['marbleLaborArea', 'عمالة الرخام', 'م²'],
      ['electricalPoints', 'نقاط الكهرباء', 'نقطة'], ['plumbingPoints', 'نقاط السباكة', 'نقطة'],
      ['totalDoorsArea', 'مساحة الأبواب', 'م²'], ['totalWindowsArea', 'مساحة النوافذ', 'م²'],
      ['totalTileArea', 'إجمالي البلاط', 'م²'],
      ['exteriorPlasterArea', 'التلييس الخارجي', 'م²'],
      ['skirtingLength', 'النعلة', 'م طولي'],
    ];
    return definitions.map(([id, name, unit]) => ({ id, name, unit, quantity: Number(summary[id]) || 0 }));
  };

  // Only independently editable values may be entered here. Derived quantities
  // must come from the original engine or an explicit geometry/material edit.
  const changeDetailRows = (next: QuantityDetail[]) => {
    const changed = next.find(row => detailRows.find(old => old.id === row.id)?.quantity !== row.quantity);
    if (!changed) return;
    if (!Number.isFinite(changed.quantity) || changed.quantity < 0) return;
    if (changed.id === 'electricalPoints') {
      updateServicePoints('electrical', changed.quantity);
    } else if (changed.id === 'plumbingPoints') {
      updateServicePoints('plumbing', changed.quantity);
    } else if (changed.id === 'totalMarbleArea' && hasMarble) {
      handleMarbleAreaChange(changed.quantity);
    } else if (changed.id === 'marbleLaborArea' && hasMarble) {
      handleMarbleLaborChange(changed.quantity);
    } else {
      setApprovalMessage('هذا البند ناتج من معادلات مترابطة، ولا يمكن تعديل إجماليه مباشرة. عدّل أبعاد الغرف أو المدخلات الهندسية ثم أعد الحساب.');
    }
  };

  const changeRoomRows = (next: RoomQuantityRow[]) => {
    setRoomRows(next);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.roomRows = next;
      const additions = calculateAdditionalFinishes(finishItemRows.tile.length > 0 ? finishItemRows.tile : next);
      draft.additionalFinishes = additions;
      if (draft.summary) { draft.summary.exteriorPlasterArea = additions.exteriorPlasterArea; draft.summary.skirtingLength = additions.skirtingLength; }
      if (baselineResults && originalRoomRows.length) {
        const roomUpdated = applyRoomQuantityOverrides(baselineResults, originalRoomRows, next);
        const updated = Object.entries(draft.quantityEdits || {}).reduce(
          (acc, [field, amount]) => reconcileFinishEdits(acc, field, Number(amount)), roomUpdated
        );
        draft.results = updated;
        setResults(updated);
        if (draft.summary) {
          draft.summary.plaster = { ...draft.summary.plaster, area: updated.correctedPlasterWalls, cement: updated.correctedPlasterCement, sand: updated.correctedPlasterSand };
          draft.summary.paint = { ...draft.summary.paint, area: updated.correctedPaintWalls, putty: Math.ceil(updated.correctedPaintTotal * 0.8), primer: Math.ceil(updated.correctedPaintTotal / 8), paint: Math.ceil(updated.correctedPaintTotal / 8) };
          draft.summary.tile = { ...draft.summary.tile, floor: updated.correctedTileFloor, kitchenWalls: updated.correctedTileKitchenWalls, bathroomWalls: updated.correctedTileBathroomWalls, total: updated.correctedTileTotalArea };
          draft.summary.totalTileArea = Math.ceil(updated.correctedTileTotalArea);
          draft.summary.totalCement = Math.ceil(updated.totalCement);
          draft.summary.totalSand = Math.ceil(updated.totalSand);
          draft.summary.paintTotal = updated.correctedPaintTotal;
          draft.summary.laborPlasterTotal = Math.ceil(
  updated.plasterWallsLabor +
  (updated.plasterCeilingLabor - updated.innerWallArea) +
  (hasExteriorPlaster ? additions.exteriorPlasterGross : 0)
);
          draft.summary.laborPaintTotal = Math.ceil(updated.paintWalls + (updated.paintCeiling - updated.innerWallArea));
          draft.summary.laborTileTotal = Math.ceil((updated.tileFloorArea - updated.innerWallArea) + updated.tileKitchenFloor + updated.tileBathroomFloor + updated.tileKitchenWalls + updated.tileBathroomWalls);
          draft.summary.paintWalls = updated.correctedPaintWalls;
          draft.summary.tileKitchenFloor = updated.tileKitchenFloor;
          draft.summary.tileBathroomFloor = updated.tileBathroomFloor;
          draft.summary.tileKitchenWalls = updated.correctedTileKitchenWalls;
          draft.summary.tileBathroomWalls = updated.correctedTileBathroomWalls;
        }
        draft.summary = synchronizeFinishSummary(draft.summary, updated);
        const rows = makeDetailRows(draft.summary);
        draft.detailRows = rows;
        setDetailRows(rows);
        setApprovalMessage('تم تحديث كميات البلاط والتلييس والدهان والمواد التابعة لها في مسودة الدور. اضغط اعتماد لتحديث الملخص.');
      } else {
        setApprovalMessage('حُفظت تفاصيل الغرف. أعد حساب الدور لتفعيل اشتقاق الكميات.');
      }
      // Keep the additional-finish rows synchronized with the room geometry.
      if (draft.summary && !(baselineResults && originalRoomRows.length)) {
        const rows = makeDetailRows(draft.summary);
        draft.detailRows = rows;
        setDetailRows(rows);
      }
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch { setApprovalMessage('تعذر حفظ تفاصيل الغرف.'); }
  };

  // Overrides affect only this floor's quantity draft, never the drawing or drawWall.ts.
  const effectiveGeometry = (edits: Record<string, number>) => {
    const value = (key: string, original: number) => {
      const candidate = edits[key];
      return Number.isFinite(candidate) && candidate >= 0 ? candidate : original;
    };
    const editedWalls = walls.map(w => {
      if ((w.floor ?? 0) !== selectedFloor) return w;
      const length = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
      const newLength = value(`wall:${w.id}:length`, length);
      const ratio = length > 0 ? newLength / length : 1;
      return { ...w, end: { x: w.start.x + (w.end.x - w.start.x) * ratio, y: w.start.y + (w.end.y - w.start.y) * ratio }, thickness: value(`wall:${w.id}:thickness`, w.thickness) };
    });
    const editedColumns = columns.map(c => (c.floor ?? 0) === selectedFloor ? { ...c, width: value(`column:${c.id}:width`, c.width), length: value(`column:${c.id}:length`, c.length) } : c);
    const editedWindows = windows.map(w => (w.floor ?? 0) === selectedFloor ? { ...w, width: value(`window:${w.id}:width`, w.width), height: value(`window:${w.id}:height`, w.height) } : w);
    const editedDoors = doors.map(d => (d.floor ?? 0) === selectedFloor ? { ...d, width: value(`door:${d.id}:width`, d.width), height: value(`door:${d.id}:height`, d.height) } : d);
    return { walls: editedWalls, columns: editedColumns, windows: editedWindows, doors: editedDoors };
  };

  const changeGeometry = (next: Record<string, number>) => {
    if (Object.values(next).some(v => !Number.isFinite(v) || v < 0)) return;
    setGeometryEdits(next);
    setDraftNeedsCalculation(true);
    // Do not publish edited geometry to the approved floor until approval.
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.geometryEdits = next;
      draft.needsRecalculation = true;
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch { setApprovalMessage('تعذر حفظ تعديلات الأبعاد.'); return; }
    setApprovalMessage('حُفظت الأبعاد المعدلة كمسودة. اضغط «احسب الكميات» لتحديث جميع النتائج التابعة ثم اعتمد الدور.');
  };

  const applyExteriorEdits = (base: ReturnType<typeof calculateFloorAdditionalFinishes>, edits: Partial<Record<ExteriorPlasterField, number>>) => {
    const gross = edits.gross ?? base.exteriorPlasterGross;
    const openings = Math.min(gross, edits.openings ?? base.exteriorPlasterOpenings);
    const area = hasExteriorPlaster ? Math.max(0, gross - openings) : 0;
    const cement = hasExteriorPlaster ? (edits.cement ?? Math.ceil(area * 0.15)) : 0;
    const sand = hasExteriorPlaster ? (edits.sand ?? Math.ceil(cement * 0.15)) : 0;
    return { ...base, exteriorPlasterGross: gross, exteriorPlasterOpenings: openings, exteriorPlasterArea: area, exteriorPlasterCement: cement, exteriorPlasterSand: sand, exteriorPlasterLabor: area };
  };

  // A single calculation source for the displayed skirting and the saved draft.
  // Tile edits are independent of plaster and paint edits.
  const calculateAdditionalFinishes = (tileRows: RoomQuantityRow[]) => {
    const geometry = effectiveGeometry(geometryEdits);
    const onFloor = <T extends { floor?: number }>(items: T[]) =>
      items.filter(item => (item.floor ?? 0) === selectedFloor);
    return applyExteriorEdits(calculateFloorAdditionalFinishes(
      onFloor(geometry.walls), onFloor(geometry.doors),
      onFloor(geometry.windows), onFloor(regions),
      tileRows, hasExteriorPlaster, floorHeight,
    ), exteriorPlasterEdits);
  };

  const stairQuantities = (() => {
    const currentElements = stairElements.filter(item => (item.floor ?? 0) === selectedFloor);
    const floorWalls = effectiveGeometry(geometryEdits).walls.filter(wall => (wall.floor ?? 0) === selectedFloor);
    const flights: StairFlightQuantity[] = currentElements.filter(item => item.type === 'step').map(item => ({
      id: item.id,
      treadCount: item.stepCount ?? (item.treadDepth && item.treadDepth > 0 ? Math.floor(item.length / item.treadDepth) : 0),
      treadDepth: item.treadDepth ?? 0,
      riserHeight: item.riserHeight ?? 0,
    }));
    const landings = currentElements.filter(item => item.type === 'landing').map(item => ({
      id: item.id,
      length: item.length,
      width: item.width,
      wallSides: landingWallSideLengths(item, floorWalls),
    }));
    return calculateStairTileSkirting(flights, landings);
  })();
  const hasStairElements = stairElements.some(item => (item.floor ?? 0) === selectedFloor);

  const calculate = () => {
    const onFloor = <T extends { floor?: number }>(items: T[]) => items.filter(item => (item.floor ?? 0) === selectedFloor);
    const geometry = effectiveGeometry(geometryEdits);
    const marbleEnabled = hasMarble;
    const input: FinishesInput = {
      floorHeight,
      hasMarble: marbleEnabled,
    };

    const res = calculateFinishes(
      onFloor(geometry.walls),
      onFloor(geometry.columns),
      onFloor(geometry.windows),
      onFloor(geometry.doors),
      onFloor(regions),
      onFloor(stairs),
      input
    );

    const regionNames = { room: 'غرفة', hall: 'صالة', kitchen: 'مطبخ', bathroom: 'حمام' } as const;
    const roomCounts: Record<string, number> = {};
    const nextRoomRows: RoomQuantityRow[] = onFloor(regions).map(region => {
      const type = region.type;
      roomCounts[type] = (roomCounts[type] || 0) + 1;
      let perimeter = 0;
      for (let i = 0; i < region.polygon.length; i++) {
        const a = region.polygon[i];
        const b = region.polygon[(i + 1) % region.polygon.length];
        perimeter += Math.hypot(b.x - a.x, b.y - a.y);
      }
      const xs = region.polygon.map(point => point.x);
      const ys = region.polygon.map(point => point.y);
      const length = Math.max(...xs) - Math.min(...xs);
      const width = Math.max(...ys) - Math.min(...ys);
      const rectangular = Math.abs(length * width - region.area) < Math.max(0.01, region.area * 0.01);
      return { id: region.id, length: rectangular ? length : undefined, width: rectangular ? width : undefined, name: `${regionNames[type]} ${roomCounts[type]}`,
        type, area: region.area, perimeter: Math.round(perimeter * 100) / 100, height: floorHeight };
    });
    setRoomRows(nextRoomRows);
    setOriginalRoomRows(nextRoomRows);

    if (hasStairElements) {
      res.stepTileCount = stairQuantities.stepTileCount;
      res.landingTileArea = stairQuantities.landingTileArea;
    }
    const roundedRes = { ...res };

    roundedRes.exteriorBlocks = Math.ceil(res.exteriorBlocks);
    roundedRes.interiorBlocks = Math.ceil(res.interiorBlocks);
    roundedRes.exteriorBlockCement = Math.ceil(res.exteriorBlockCement);
    roundedRes.interiorBlockCement = Math.ceil(res.interiorBlockCement);
    roundedRes.exteriorBlockSand = Math.ceil(res.exteriorBlockSand);
    roundedRes.interiorBlockSand = Math.ceil(res.interiorBlockSand);
    roundedRes.plasterWallsLabor = Math.ceil(res.plasterWallsLabor);
    roundedRes.plasterCeilingLabor = Math.ceil(res.plasterCeilingLabor);
    roundedRes.plasterWallsMaterial = Math.ceil(res.plasterWallsMaterial);
    roundedRes.plasterCement = Math.ceil(res.plasterCement);
    roundedRes.plasterSand = Math.ceil(res.plasterSand);
    roundedRes.paintWalls = Math.ceil(res.paintWalls);
    roundedRes.paintCeiling = Math.ceil(res.paintCeiling);
    roundedRes.putty = Math.ceil(res.putty);
    roundedRes.primer = Math.ceil(res.primer);
    roundedRes.paint = Math.ceil(res.paint);
    roundedRes.tileFloorArea = Math.ceil(res.tileFloorArea);
    roundedRes.tileKitchenFloor = Math.ceil(res.tileKitchenFloor);
    roundedRes.tileBathroomFloor = Math.ceil(res.tileBathroomFloor);
    roundedRes.tileKitchenWalls = Math.ceil(res.tileKitchenWalls);
    roundedRes.tileBathroomWalls = Math.ceil(res.tileBathroomWalls);
    roundedRes.tileCement = Math.ceil(res.tileCement);
    roundedRes.tileSand = Math.ceil(res.tileSand);
    roundedRes.stairFloorArea = Math.ceil(res.stairFloorArea);
    roundedRes.landingTileArea = Math.ceil(res.landingTileArea);
    roundedRes.stepTileCount = Math.ceil(res.stepTileCount);
    roundedRes.marbleArea = Math.ceil(res.marbleArea);
    roundedRes.marbleConcrete = Math.ceil(res.marbleConcrete);
    roundedRes.marbleCement = Math.ceil(res.marbleCement);
    roundedRes.marbleSand = Math.ceil(res.marbleSand);
    roundedRes.marbleAggregate = Math.ceil(res.marbleAggregate);
    roundedRes.electricalPoints = Math.ceil(res.electricalPoints);
    roundedRes.plumbingPoints = Math.ceil(res.plumbingPoints);
    const preservedWindowRows = windowDetailRows.length ? windowDetailRows : res.windowGroups.map((g, i) => ({ name: `نافذة ${i + 1}`, width: g.width, height: g.height, count: g.count }));
    roundedRes.windowGroups = preservedWindowRows.map(r => ({ width: r.width, height: r.height, count: r.count, unitArea: r.width * r.height, totalArea: r.count * r.width * r.height }));
    setWindowDetailRows(preservedWindowRows);
    const preservedDoorRows = doorDetailRows.length ? doorDetailRows : makeDoorRows(onFloor(geometry.doors));
    roundedRes.doorGroups = preservedDoorRows.map(r => ({ width: r.width, height: r.height, count: r.count, unitArea: r.width * r.height, totalArea: r.count * r.width * r.height }));
    setDoorDetailRows(preservedDoorRows);

    roundedRes.correctedPlasterWalls = Math.ceil(res.correctedPlasterWalls);
    roundedRes.correctedPlasterCeiling = Math.ceil(res.correctedPlasterCeiling);
    roundedRes.correctedPlasterArea = Math.ceil(res.correctedPlasterArea);
    roundedRes.correctedPaintWalls = Math.ceil(res.correctedPaintWalls);
    roundedRes.correctedPaintCeiling = Math.ceil(res.correctedPaintCeiling);
    roundedRes.correctedPaintTotal = Math.ceil(res.correctedPaintTotal);
    roundedRes.correctedTileFloor = Math.ceil(res.correctedTileFloor);
    roundedRes.correctedTileKitchenWalls = Math.ceil(res.correctedTileKitchenWalls);
    roundedRes.correctedTileBathroomWalls = Math.ceil(res.correctedTileBathroomWalls);
    roundedRes.correctedTileTotalArea = Math.ceil(res.correctedTileTotalArea);
    roundedRes.correctedTileCement = Math.ceil(res.correctedTileCement);
    roundedRes.correctedTileSand = Math.ceil(res.correctedTileSand);

    const savedEdits = (() => {
      try { return JSON.parse(localStorage.getItem(storageKey) || '{}').quantityEdits as Record<string, number> | undefined; }
      catch { return undefined; }
    })();
    const recalculated = Object.entries(savedEdits || {}).reduce(
      (acc, [field, amount]) => reconcileFinishEdits(acc, field, amount), roundedRes
    );
    setResults(recalculated);
    setBaselineResults(roundedRes);
    setElectricalPts(Math.ceil(res.electricalPoints));
    setPlumbingPts(Math.ceil(res.plumbingPoints));

    // ✅ إعادة تعيين قيمة عمالة الرخام عند إعادة الحساب
    setMarbleLaborOverride(null);

    const totalBlocks = Math.ceil(roundedRes.exteriorBlocks + roundedRes.interiorBlocks);
    const totalDoorsArea = roundedRes.doorGroups.reduce((s, g) => s + g.totalArea, 0);
    const totalWindowsArea = roundedRes.windowGroups.reduce((s, g) => s + g.totalArea, 0);

    // ✅ إجمالي البلاط (أرضيات + مطابخ + حمامات + جدران)
    const totalTileArea = Math.ceil(
      roundedRes.correctedTileFloor +
      roundedRes.tileKitchenFloor +
      roundedRes.tileBathroomFloor +
      roundedRes.correctedTileKitchenWalls +
      roundedRes.correctedTileBathroomWalls
    );

    // ✅ قيمة عمالة الرخام الافتراضية (قبل أي تعديل)
    const defaultMarbleLabor = marbleEnabled
      ? Math.ceil(roundedRes.exteriorWallGross)
      : 0;

    const dataToSave = {
      totalBlocks,
      totalCement: Math.ceil(roundedRes.totalCement),
      totalSand: Math.ceil(roundedRes.totalSand),
      totalAggregate: Math.ceil(roundedRes.totalAggregate),
      totalMarbleArea: Math.ceil(roundedRes.marbleArea),
      totalDoorsArea: Math.ceil(totalDoorsArea * 100) / 100,
      totalWindowsArea: Math.ceil(totalWindowsArea * 100) / 100,
      landingTileArea: roundedRes.landingTileArea,
      stepTileCount: roundedRes.stepTileCount,
      totalTileArea,

// ✅ قيم جدول إجمالي كميات العمالة (مطابقة تماماً للجدول)
laborWallTotal: Math.ceil(roundedRes.exteriorWallGross + roundedRes.interiorWallGross),
laborPlasterTotal: Math.ceil(
  roundedRes.plasterWallsLabor +
  (roundedRes.plasterCeilingLabor - roundedRes.innerWallArea) +
  (hasExteriorPlaster
    ? applyExteriorEdits(
        calculateFloorAdditionalFinishes(
          onFloor(geometry.walls),
          onFloor(geometry.doors),
          onFloor(geometry.windows),
          onFloor(regions),
          roomRows,
          hasExteriorPlaster,
          floorHeight
        ),
        exteriorPlasterEdits
      ).exteriorPlasterGross
    : 0)
),
laborPaintTotal: Math.ceil(roundedRes.paintWalls + (roundedRes.paintCeiling - roundedRes.innerWallArea)),
laborTileTotal: Math.ceil((roundedRes.tileFloorArea - roundedRes.innerWallArea) + roundedRes.tileKitchenFloor + roundedRes.tileBathroomFloor + roundedRes.tileKitchenWalls + roundedRes.tileBathroomWalls),
      // ✅ عمالة الرخام (افتراضية = exteriorWallGross)
      marbleLaborArea: defaultMarbleLabor,

      // ✅ نقاط الكهرباء والسباكة (لحساب عمالتها في الملخص)
      electricalPoints: roundedRes.electricalPoints,
      plumbingPoints: roundedRes.plumbingPoints,

      blockOuter: {
        blocks: roundedRes.exteriorBlocks,
        cement: roundedRes.exteriorBlockCement,
        sand: roundedRes.exteriorBlockSand,
      },
      blockInner: {
        blocks: roundedRes.interiorBlocks,
        cement: roundedRes.interiorBlockCement,
        sand: roundedRes.interiorBlockSand,
      },
      plaster: {
        area: roundedRes.correctedPlasterWalls,
        cement: roundedRes.correctedPlasterCement,
        sand: roundedRes.correctedPlasterSand,
      },
      paint: {
        area: roundedRes.correctedPaintWalls,
        putty: Math.ceil(roundedRes.correctedPaintTotal * 0.8),
        primer: Math.ceil(roundedRes.correctedPaintTotal / 8),
        paint: Math.ceil(roundedRes.correctedPaintTotal / 8),
      },
      tile: {
        floor: roundedRes.correctedTileFloor,
        kitchenWalls: roundedRes.correctedTileKitchenWalls,
        bathroomWalls: roundedRes.correctedTileBathroomWalls,
        landing: roundedRes.landingTileArea,
        steps: roundedRes.stepTileCount,
        total: totalTileArea,
      },
      marble: {
        area: roundedRes.marbleArea,
        aggregate: roundedRes.marbleAggregate,
        cement: roundedRes.marbleCement,
        sand: roundedRes.marbleSand,
      },
      extras: {
        bathrooms: onFloor(regions).filter(r => r.type === 'bathroom').length,
        kitchens: onFloor(regions).filter(r => r.type === 'kitchen').length,
        windows: onFloor(windows).length,
        doors: onFloor(doors).length,
      },
      labor: {
        blockArea: roundedRes.exteriorWallNet + roundedRes.interiorWallNet,
      },
      exteriorWallNet: roundedRes.exteriorWallNet,
      interiorWallNet: roundedRes.interiorWallNet,
      exteriorWallGross: roundedRes.exteriorWallGross,
      interiorWallGross: roundedRes.interiorWallGross,
      paintWalls: roundedRes.correctedPaintWalls,
      paintCeiling: roundedRes.correctedPaintCeiling,
      plasterWallsLabor: roundedRes.correctedPlasterWalls,
      plasterCeilingLabor: roundedRes.correctedPlasterCeiling,
      innerWallArea: roundedRes.innerWallArea,
      tileFloorArea: roundedRes.correctedTileFloor,
      tileKitchenFloor: roundedRes.tileKitchenFloor,
      tileBathroomFloor: roundedRes.tileBathroomFloor,
      tileKitchenWalls: roundedRes.correctedTileKitchenWalls,
      tileBathroomWalls: roundedRes.correctedTileBathroomWalls,
    };
    const additionalFinishes = applyExteriorEdits(calculateFloorAdditionalFinishes(onFloor(geometry.walls), onFloor(geometry.doors), onFloor(geometry.windows), onFloor(regions), nextRoomRows, hasExteriorPlaster, floorHeight), exteriorPlasterEdits);
    Object.assign(dataToSave, { exteriorPlasterArea: additionalFinishes.exteriorPlasterArea, exteriorPlasterCement: additionalFinishes.exteriorPlasterCement, exteriorPlasterSand: additionalFinishes.exteriorPlasterSand, exteriorPlasterLabor: additionalFinishes.exteriorPlasterLabor, skirtingLength: additionalFinishes.skirtingLength });
    const syncedSummary = synchronizeFinishSummary(dataToSave, recalculated);
    const nextDetailRows = makeDetailRows(syncedSummary);
    setDetailRows(nextDetailRows);
    const refreshedFinishRows = (['plaster', 'paint', 'tile'] as const).reduce((acc, kind) => {
      const previous = finishItemRows[kind];
      const oldById = new Map(previous.map(row => [row.id, row]));
      acc[kind] = [
        ...nextRoomRows.map(row => oldById.get(row.id) ?? { ...row }),
        ...previous.filter(row => row.id.startsWith('manual-') && !nextRoomRows.some(base => base.id === row.id)),
      ];
      return acc;
    }, {} as Record<'plaster' | 'paint' | 'tile', RoomQuantityRow[]>);
    setFinishItemRows(refreshedFinishRows);
    const finalAdditions = applyExteriorEdits(calculateFloorAdditionalFinishes(
      onFloor(geometry.walls), onFloor(geometry.doors),
      onFloor(geometry.windows), onFloor(regions),
      refreshedFinishRows.tile.length > 0 ? refreshedFinishRows.tile : nextRoomRows,
      hasExteriorPlaster, floorHeight,
    ), exteriorPlasterEdits);
    syncedSummary.skirtingLength = finalAdditions.skirtingLength;
    const finalDetailRows = makeDetailRows(syncedSummary);
    setDetailRows(finalDetailRows);
    localStorage.setItem(storageKey, JSON.stringify({ exteriorPlasterEdits, geometryEdits, calculatedGeometryEdits: geometryEdits, needsRecalculation: false, hasExteriorPlaster, additionalFinishes: finalAdditions, detailRows: finalDetailRows, finishItemRows: refreshedFinishRows, windowDetailRows: preservedWindowRows, doorDetailRows: preservedDoorRows, roomRows: nextRoomRows, originalRoomRows: nextRoomRows, baselineResults: roundedRes, results: recalculated, summary: syncedSummary, quantityEdits: savedEdits || {}, hasMarble: marbleEnabled, electricalPts: Math.ceil(res.electricalPoints), plumbingPts: Math.ceil(res.plumbingPoints), marbleLaborOverride: null }));
    setDraftNeedsCalculation(false);
    setApprovalMessage('تم حساب كميات الدور وحفظها. لم تُعتمد التعديلات الجديدة في الملخص بعد.');
    // Compatibility with the existing summary until its per-floor aggregation is implemented.
    localStorage.setItem('hasMarble', JSON.stringify(marbleEnabled));
    localStorage.setItem('finishes_results', JSON.stringify(syncedSummary));
  };

  // Keep point edits in the floor draft; approval remains an explicit action.
  const updateServicePoints = (kind: 'electrical' | 'plumbing', value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    if (kind === 'electrical') setElectricalPts(value);
    else setPlumbingPts(value);
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (!draft.summary) return;
      const key = kind === 'electrical' ? 'electricalPoints' : 'plumbingPoints';
      draft.summary[key] = value;
      draft[kind === 'electrical' ? 'electricalPts' : 'plumbingPts'] = value;
      draft.detailRows = Array.isArray(draft.detailRows)
        ? draft.detailRows.map((row: QuantityDetail) => row.id === key ? { ...row, quantity: value } : row)
        : makeDetailRows(draft.summary);
      setDetailRows(draft.detailRows);
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setApprovalMessage('حُفظ تعديل نقاط الخدمات كمسودة؛ يلزم الاعتماد لتحديث الملخص.');
    } catch {
      setApprovalMessage('تعذر حفظ نقاط الخدمات.');
    }
  };

  const updateDetailedQuantity = (key: string, value: number) => {
    if (!results || !Number.isFinite(value) || value < 0 || !(key in results)) return;
    const next = reconcileFinishEdits(results, key, value);
    setResults(next);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.results = next;
      draft.summary = synchronizeFinishSummary(draft.summary || {}, next);
      draft.detailRows = makeDetailRows(draft.summary);
      setDetailRows(draft.detailRows);
      draft.quantityEdits = { ...(draft.quantityEdits || {}), [key]: value };
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setApprovalMessage('حُفظ تعديل الكمية في مسودة الدور. أعد اعتماد الدور لتحديث الملخص المعتمد.');
    } catch { setApprovalMessage('تعذر حفظ تعديل الكمية.'); }
  };

  const approveFloor = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setApprovalMessage('احسب كميات الدور أولاً قبل الاعتماد.');
      return;
    }
    try {
      const draft = JSON.parse(saved);
      if (!draft.results || !draft.summary) throw new Error('Missing quantities');
      if (draft.needsRecalculation || draftNeedsCalculation) { setApprovalMessage('توجد تعديلات هندسية لم يُعَد حسابها؛ احسب الكميات قبل الاعتماد.'); return; }
      if (JSON.stringify(draft.geometryEdits ?? {}) !== JSON.stringify(draft.calculatedGeometryEdits ?? {})) {
        setApprovalMessage('تغيرت الأبعاد. أعد حساب الكميات قبل الاعتماد.'); return;
      }
      // The selected options must match the options used for the stored calculation.
      if (Boolean(draft.hasMarble) !== hasMarble || Boolean(draft.hasExteriorPlaster) !== hasExteriorPlaster) {
        setApprovalMessage('تغيرت خيارات الرخام أو التلييس الخارجي. اضغط «احسب الكميات» قبل الاعتماد.');
        return;
      }
      if (!Array.isArray(draft.detailRows) || draft.detailRows.some((row: QuantityDetail) => !Number.isFinite(row.quantity) || row.quantity < 0)) {
        setApprovalMessage('توجد كميات تفصيلية غير صالحة؛ صححها قبل الاعتماد.');
        return;
      }
      const approvedAtNow = new Date().toISOString();
      localStorage.setItem(approvedKey, JSON.stringify({ ...draft, approvedAt: approvedAtNow }));
      setApprovedAt(approvedAtNow);
      window.dispatchEvent(new CustomEvent('qty-approval-changed', { detail: { projectId, floor: selectedFloor } }));
      setApprovalMessage('تم اعتماد كميات الدور وتحديث بيانات الملخص المعتمد.');
    } catch {
      setApprovalMessage('تعذر اعتماد البيانات المحفوظة؛ أعد حساب الدور.');
    }
  };

  // Reset the selected floor's draft only. Never silently revoke an approved snapshot.
  const resetFloor = () => {
    try {
      localStorage.removeItem(storageKey);
      setResults(null);
      setDetailRows([]);
      setRoomRows([]);
      setOriginalRoomRows([]);
      setBaselineResults(null);
      setGeometryEdits({});
      setDraftNeedsCalculation(false);
      setHasMarble(false);
      setHasExteriorPlaster(false);
      setExteriorPlasterEdits({});
      setElectricalPts(0);
      setPlumbingPts(0);
      setMarbleLaborOverride(null);
      setApprovalMessage('أُعيدت مسودة الدور إلى الحالة الافتراضية. اضغط «احسب الكميات» لإنشاء مسودة جديدة. الاعتماد السابق محفوظ دون تغيير.');
    } catch {
      setApprovalMessage('تعذر إعادة تعيين مسودة الدور.');
    }
  };

  // Explicit revocation is separate from resetting the editable draft.
  const revokeFloorApproval = () => {
    if (!window.confirm('هل تريد إلغاء اعتماد هذا الدور؟ ستُزال كمياته من الملخص المعتمد، مع الاحتفاظ بالمسودة.')) return;
    try {
      localStorage.removeItem(approvedKey);
      setApprovedAt(null);
      window.dispatchEvent(new CustomEvent('qty-approval-changed', { detail: { projectId, floor: selectedFloor } }));
      setApprovalMessage('أُلغي اعتماد الدور. بقيت المسودة محفوظة ويمكن تعديلها أو إعادة اعتمادها.');
    } catch {
      setApprovalMessage('تعذر إلغاء اعتماد الدور.');
    }
  };

  // ✅ دالة تعديل مساحة الرخام يدوياً
  const handleMarbleAreaChange = (newArea: number) => {
    if (!results || newArea < 0) return;

    const newMarbleConcrete = newArea * 0.04;
    const newMarbleCement = newArea * 0.3;
    const newMarbleSand = newMarbleCement * 0.07;
    const newMarbleAggregate = newMarbleCement * 0.075;

    const updatedResults = {
      ...results,
      marbleArea: newArea,
      marbleConcrete: newMarbleConcrete,
      marbleCement: newMarbleCement,
      marbleSand: newMarbleSand,
      marbleAggregate: newMarbleAggregate,
      totalCement: Math.ceil(
        results.exteriorBlockCement + results.interiorBlockCement +
        results.correctedPlasterCement + results.correctedTileCement + newMarbleCement
      ),
      totalSand: Math.ceil(
        results.exteriorBlockSand + results.interiorBlockSand +
        results.correctedPlasterSand + results.correctedTileSand + newMarbleSand
      ),
      totalAggregate: newMarbleAggregate,
    };

    setResults(updatedResults);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (draft.summary) {
        draft.results = updatedResults;
        draft.summary.marble = { area: newArea, aggregate: newMarbleAggregate, cement: newMarbleCement, sand: newMarbleSand };
        draft.summary.totalMarbleArea = newArea;
        draft.summary.totalCement = updatedResults.totalCement;
        draft.summary.totalSand = updatedResults.totalSand;
        draft.summary.totalAggregate = updatedResults.totalAggregate;
        draft.detailRows = Array.isArray(draft.detailRows) ? draft.detailRows.map((row: QuantityDetail) => {
          const updated: Record<string, number> = {
            totalMarbleArea: newArea, totalCement: updatedResults.totalCement,
            totalSand: updatedResults.totalSand, totalAggregate: updatedResults.totalAggregate,
          };
          return Object.prototype.hasOwnProperty.call(updated, row.id) ? { ...row, quantity: updated[row.id] } : row;
        }) : makeDetailRows(draft.summary);
        setDetailRows(draft.detailRows);
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setApprovalMessage('حُفظ تعديل الرخام كمسودة؛ اضغط اعتماد لتحديث الملخص.');
      }
    } catch { /* تجاهل البيانات غير الصالحة */ }

    const currentData = localStorage.getItem('finishes_results');
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData);
        parsed.marble = {
          area: newArea,
          aggregate: newMarbleAggregate,
          cement: newMarbleCement,
          sand: newMarbleSand,
        };
        parsed.totalMarbleArea = newArea;
        parsed.totalCement = updatedResults.totalCement;
        parsed.totalSand = updatedResults.totalSand;
        parsed.totalAggregate = updatedResults.totalAggregate;
        localStorage.setItem('finishes_results', JSON.stringify(parsed));
      } catch (e) {
        // تجاهل
      }
    }
  };

  // ✅ دالة تعديل كمية عمالة الرخام يدوياً
  const handleMarbleLaborChange = (newValue: number) => {
    if (newValue < 0) return;
    setMarbleLaborOverride(newValue);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (draft.summary) {
        draft.marbleLaborOverride = newValue;
        draft.summary.marbleLaborArea = newValue;
        draft.detailRows = Array.isArray(draft.detailRows) ? draft.detailRows.map((row: QuantityDetail) =>
          row.id === 'marbleLaborArea' ? { ...row, quantity: newValue } : row
        ) : makeDetailRows(draft.summary);
        setDetailRows(draft.detailRows);
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setApprovalMessage('حُفظ تعديل عمالة الرخام كمسودة؛ اضغط اعتماد لتحديث الملخص.');
      }
    } catch { /* تجاهل البيانات غير الصالحة */ }

    const currentData = localStorage.getItem('finishes_results');
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData);
        parsed.marbleLaborArea = newValue;
        localStorage.setItem('finishes_results', JSON.stringify(parsed));
      } catch (e) {
        // تجاهل
      }
    }
  };

  const changeExteriorPlaster = (field: ExteriorPlasterField, value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    const next = { ...exteriorPlasterEdits, [field]: value };
    if (field === 'gross' || field === 'openings') { delete next.cement; delete next.sand; }
    if (field === 'cement') delete next.sand;
    setExteriorPlasterEdits(next);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.exteriorPlasterEdits = next;
      const geometry = effectiveGeometry(geometryEdits);
      const onFloor = <T extends { floor?: number }>(items: T[]) => items.filter(item => (item.floor ?? 0) === selectedFloor);
      const base = calculateFloorAdditionalFinishes(onFloor(geometry.walls), onFloor(geometry.doors), onFloor(geometry.windows), onFloor(regions), finishItemRows.tile.length > 0 ? finishItemRows.tile : roomRows, hasExteriorPlaster, floorHeight);
      const updated = applyExteriorEdits(base, next);
      draft.additionalFinishes = updated;
      if (draft.summary) {
        Object.assign(draft.summary, { exteriorPlasterArea: updated.exteriorPlasterArea, exteriorPlasterCement: updated.exteriorPlasterCement, exteriorPlasterSand: updated.exteriorPlasterSand, exteriorPlasterLabor: updated.exteriorPlasterLabor });
        draft.detailRows = makeDetailRows(draft.summary);
        setDetailRows(draft.detailRows);
      }
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setApprovalMessage('حُفظ تعديل التلييس الخارجي في مسودة الدور. أعد اعتماد الدور لتحديث الملخص.');
    } catch { setApprovalMessage('تعذر حفظ تعديل التلييس الخارجي.'); }
  };

  
const additionalExteriorPlaster = calculateAdditionalFinishes(
  finishItemRows.tile.length > 0 ? finishItemRows.tile : roomRows
);

const skirtingDeductions: Record<string, number> =
  Object.fromEntries(
    additionalExteriorPlaster.roomSkirting.map(room => [
      room.id,
      room.doorDeduction,
    ])
  );


  return (
    <div style={{ padding: 12 }}>
      <div className="qty-floor-controls" dir="rtl" style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        <label>الدور المطلوب حساب كمياته
          <select value={selectedFloor} onChange={e => setSelectedFloor(Number(e.target.value))} style={{ display: 'block', width: '100%', padding: 9, marginTop: 5 }}>
            {floorHeights.map((_, index) => <option key={index} value={index}>{index === 0 ? 'الدور الأرضي' : `الدور ${index}`}</option>)}
          </select>
        </label>
        <div>ارتفاع الدور من الرسم: {floorHeight} م</div>
        <label><input type="checkbox" checked={hasExteriorPlaster} onChange={e => setHasExteriorPlaster(e.target.checked)} /> هل يوجد تلييس خارجي؟</label>
        <label><input type="checkbox" checked={hasMarble} onChange={e => setHasMarble(e.target.checked)} /> هل يوجد رخام؟</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          <button type="button" onClick={() => calculate()}>احسب الكميات</button>
          <button type="button" onClick={approveFloor}>اعتماد كميات الدور إلى الملخص</button>
          <button type="button" onClick={resetFloor}>إعادة تعيين مسودة الدور</button>
        </div>
        <div style={{ fontSize: 12, color: '#0b3045' }}>
          حالة الدور: {approvedAt ? `معتمد (${new Date(approvedAt).toLocaleString('ar-YE')})` : 'غير معتمد'}
          {draftNeedsCalculation ? ' — توجد تعديلات هندسية تتطلب إعادة الحساب' : ''}
          {approvedAt ? ' — التعديلات الجديدة تبقى مسودة حتى إعادة الاعتماد' : ''}
        </div>
        {approvedAt && <button type="button" onClick={revokeFloorApproval} style={{ border: '1px solid #b25a5a', borderRadius: 6, padding: 8, background: 'transparent' }}>إلغاء اعتماد هذا الدور</button>}
        {approvalMessage && <div role="status"  style={{ fontSize: 12 }}>{approvalMessage}</div>}
      </div>

      <FloorWorkTables projectId={projectId} floor={selectedFloor} floorCount={floorHeights.length} />

      {results && (
        <div id="finishes-pdf" style={{ background: '#ffffff', width: '100%' }}>
          <QuantityEditContext.Provider value={updateDetailedQuantity}>
          
<FinishTables
  isGroundFloor={selectedFloor === 0}
  windowRows={windowDetailRows}
  doorRows={doorDetailRows}
  onDoorRowsChange={changeDoorRows}
  onWindowRowsChange={changeWindowRows}
  results={results}
  roomRows={roomRows}
  onRoomRowsChange={changeRoomRows}
  
  
skirtingDeductions={skirtingDeductions}
  
  stairStepCount={hasStairElements ? stairQuantities.stepTileCount : results.stepTileCount}
  stairLandingTileArea={hasStairElements ? stairQuantities.landingTileArea : results.landingTileArea}
  stairFlightSkirtingLength={hasStairElements ? stairQuantities.flightSkirtingLength : undefined}
  stairSkirtingLength={hasStairElements ? stairQuantities.stairSkirtingLength : undefined}
  roomSkirtingLength={additionalExteriorPlaster.skirtingLength}
  finishItemRows={finishItemRows}
  onFinishItemRowsChange={updateFinishItemRows}
  hasMarble={hasMarble}
  hasExteriorPlaster={hasExteriorPlaster}
  exteriorPlasterArea={additionalExteriorPlaster.exteriorPlasterArea}
  exteriorPlasterGross={additionalExteriorPlaster.exteriorPlasterGross}
  exteriorPlasterOpenings={additionalExteriorPlaster.exteriorPlasterOpenings}
  exteriorPlasterCement={additionalExteriorPlaster.exteriorPlasterCement}
  exteriorPlasterSand={additionalExteriorPlaster.exteriorPlasterSand}
  exteriorPlasterLabor={additionalExteriorPlaster.exteriorPlasterLabor}
  onExteriorPlasterChange={changeExteriorPlaster}

            electricalPts={electricalPts}
            plumbingPts={plumbingPts}
            onElectricalChange={value => updateServicePoints('electrical', value)}
            onPlumbingChange={value => updateServicePoints('plumbing', value)}
            onMarbleAreaChange={handleMarbleAreaChange}
            marbleLaborOverride={marbleLaborOverride}
            onMarbleLaborChange={handleMarbleLaborChange}
          />
          </QuantityEditContext.Provider>
        </div>
      )}
    </div>
  );
};
