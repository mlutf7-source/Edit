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
} from '../../core/types';
import type { RoomRegion } from '../../core/regionTypes';
import { FinishTables } from './FinishTables';
import { EditableQuantityDetails, type QuantityDetail } from './EditableQuantityDetails';
import { RoomQuantityDetails, type RoomQuantityRow } from './RoomQuantityDetails';
import { applyRoomQuantityOverrides } from './roomQuantityOverrides';
import { calculateFloorAdditionalFinishes } from './floorAdditionalFinishes';

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
}

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
}) => {
  const [selectedFloor, setSelectedFloor] = useState(activeFloor);
  const floorHeight = floorHeights[selectedFloor] ?? 3;
  const storageKey = `qty_floor_${projectId}_${selectedFloor}`;
  const approvedKey = `qty_approved_${projectId}_${selectedFloor}`;
  const [approvalMessage, setApprovalMessage] = useState('');
  const [hasMarble, setHasMarble] = useState<boolean>(false);
  const [hasExteriorPlaster, setHasExteriorPlaster] = useState(false);
  const [results, setResults] = useState<FinishResults | null>(null);
  const [detailRows, setDetailRows] = useState<QuantityDetail[]>([]);
  const [roomRows, setRoomRows] = useState<RoomQuantityRow[]>([]);
  const [originalRoomRows, setOriginalRoomRows] = useState<RoomQuantityRow[]>([]);
  const [baselineResults, setBaselineResults] = useState<FinishResults | null>(null);
  const [electricalPts, setElectricalPts] = useState(0);
  const [plumbingPts, setPlumbingPts] = useState(0);

  // ✅ كمية عمالة الرخام المخصصة (قابلة للتعديل من الجدول)
  const [marbleLaborOverride, setMarbleLaborOverride] = useState<number | null>(null);

  useEffect(() => {
    setResults(null);
    setDetailRows([]);
    setRoomRows([]);
    setOriginalRoomRows([]);
    setBaselineResults(null);
    setMarbleLaborOverride(null);
    setApprovalMessage('');
    setHasMarble(false);
    setHasExteriorPlaster(false);
    setElectricalPts(0);
    setPlumbingPts(0);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResults(parsed.results ?? null);
        setDetailRows(Array.isArray(parsed.detailRows) ? parsed.detailRows : makeDetailRows(parsed.summary));
        setRoomRows(Array.isArray(parsed.roomRows) ? parsed.roomRows : []);
        setOriginalRoomRows(Array.isArray(parsed.originalRoomRows) ? parsed.originalRoomRows : (Array.isArray(parsed.roomRows) ? parsed.roomRows : []));
        setBaselineResults(parsed.baselineResults ?? parsed.results ?? null);
        setHasMarble(Boolean(parsed.hasMarble));
        setHasExteriorPlaster(Boolean(parsed.hasExteriorPlaster));
        setElectricalPts(parsed.electricalPts ?? 0);
        setPlumbingPts(parsed.plumbingPts ?? 0);
        setMarbleLaborOverride(parsed.marbleLaborOverride ?? null);
      }
    } catch { /* corrupted stored data: keep defaults */ }
  }, [storageKey]);

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

  const changeDetailRows = (next: QuantityDetail[]) => {
    setDetailRows(next);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!draft.summary) return;
      draft.detailRows = next;
      for (const row of next) draft.summary[row.id] = row.quantity;
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setApprovalMessage('حُفظت تعديلات البنود كمسودة. اضغط اعتماد لتحديث الملخص.');
    } catch { setApprovalMessage('تعذر حفظ التعديلات؛ أعد حساب الدور.'); }
  };

  const changeRoomRows = (next: RoomQuantityRow[]) => {
    setRoomRows(next);
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || '{}');
      draft.roomRows = next;
      const additions = calculateFloorAdditionalFinishes(walls.filter(w => (w.floor ?? 0) === selectedFloor), doors.filter(d => (d.floor ?? 0) === selectedFloor), windows.filter(w => (w.floor ?? 0) === selectedFloor), regions.filter(r => (r.floor ?? 0) === selectedFloor), next, hasExteriorPlaster, floorHeight);
      draft.additionalFinishes = additions;
      if (draft.summary) { draft.summary.exteriorPlasterArea = additions.exteriorPlasterArea; draft.summary.skirtingLength = additions.skirtingLength; }
      if (baselineResults && originalRoomRows.length) {
        const updated = applyRoomQuantityOverrides(baselineResults, originalRoomRows, next);
        draft.results = updated;
        setResults(updated);
        if (draft.summary) {
          draft.summary.plaster = { ...draft.summary.plaster, area: updated.correctedPlasterWalls, cement: updated.correctedPlasterCement, sand: updated.correctedPlasterSand };
          draft.summary.paint = { ...draft.summary.paint, area: updated.correctedPaintWalls, putty: Math.ceil(updated.correctedPaintTotal * 0.8), primer: Math.ceil(updated.correctedPaintTotal / 8), paint: Math.ceil(updated.correctedPaintTotal / 8) };
          draft.summary.tile = { ...draft.summary.tile, floor: updated.correctedTileFloor, kitchenWalls: updated.correctedTileKitchenWalls, bathroomWalls: updated.correctedTileBathroomWalls, total: updated.correctedTileTotalArea };
          draft.summary.totalTileArea = Math.ceil(updated.correctedTileTotalArea);
          draft.summary.totalCement = Math.ceil(updated.totalCement);
          draft.summary.totalSand = Math.ceil(updated.totalSand);
          draft.summary.laborPlasterTotal = Math.ceil(updated.correctedPlasterArea);
          draft.summary.laborPaintTotal = Math.ceil(updated.correctedPaintTotal);
          draft.summary.laborTileTotal = Math.ceil(updated.correctedTileTotalArea);
          draft.summary.paintWalls = updated.correctedPaintWalls;
          draft.summary.tileKitchenFloor = updated.tileKitchenFloor;
          draft.summary.tileBathroomFloor = updated.tileBathroomFloor;
          draft.summary.tileKitchenWalls = updated.correctedTileKitchenWalls;
          draft.summary.tileBathroomWalls = updated.correctedTileBathroomWalls;
        }
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

  const calculate = () => {
    const onFloor = <T extends { floor?: number }>(items: T[]) => items.filter(item => (item.floor ?? 0) === selectedFloor);
    const marbleEnabled = hasMarble;
    const input: FinishesInput = {
      floorHeight,
      hasMarble: marbleEnabled,
    };

    const res = calculateFinishes(
      onFloor(walls),
      onFloor(columns),
      onFloor(windows),
      onFloor(doors),
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
      return { id: region.id, name: `${regionNames[type]} ${roomCounts[type]}`,
        type, area: region.area, perimeter: Math.round(perimeter * 100) / 100, height: floorHeight };
    });
    setRoomRows(nextRoomRows);
    setOriginalRoomRows(nextRoomRows);

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
    roundedRes.windowGroups = res.windowGroups;
    roundedRes.doorGroups = res.doorGroups;

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

    setResults(roundedRes);
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
laborPlasterTotal: Math.ceil(roundedRes.plasterWallsLabor + (roundedRes.plasterCeilingLabor - roundedRes.innerWallArea)),
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

    const additionalFinishes = calculateFloorAdditionalFinishes(onFloor(walls), onFloor(doors), onFloor(windows), onFloor(regions), nextRoomRows, hasExteriorPlaster, floorHeight);
    Object.assign(dataToSave, { exteriorPlasterArea: additionalFinishes.exteriorPlasterArea, skirtingLength: additionalFinishes.skirtingLength });
    const nextDetailRows = makeDetailRows(dataToSave);
    setDetailRows(nextDetailRows);
    localStorage.setItem(storageKey, JSON.stringify({ hasExteriorPlaster, additionalFinishes, detailRows: nextDetailRows, roomRows: nextRoomRows, originalRoomRows: nextRoomRows, baselineResults: roundedRes, results: roundedRes, summary: dataToSave, hasMarble: marbleEnabled, electricalPts: Math.ceil(res.electricalPoints), plumbingPts: Math.ceil(res.plumbingPoints), marbleLaborOverride: null }));
    setApprovalMessage('تم حساب كميات الدور وحفظها. لم تُعتمد التعديلات الجديدة في الملخص بعد.');
    // Compatibility with the existing summary until its per-floor aggregation is implemented.
    localStorage.setItem('hasMarble', JSON.stringify(marbleEnabled));
    localStorage.setItem('finishes_results', JSON.stringify(dataToSave));
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

  const approveFloor = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setApprovalMessage('احسب كميات الدور أولاً قبل الاعتماد.');
      return;
    }
    try {
      const draft = JSON.parse(saved);
      if (!draft.results || !draft.summary) throw new Error('Missing quantities');
      // The selected options must match the options used for the stored calculation.
      if (Boolean(draft.hasMarble) !== hasMarble || Boolean(draft.hasExteriorPlaster) !== hasExteriorPlaster) {
        setApprovalMessage('تغيرت خيارات الرخام أو التلييس الخارجي. اضغط «احسب الكميات» قبل الاعتماد.');
        return;
      }
      if (!Array.isArray(draft.detailRows) || draft.detailRows.some((row: QuantityDetail) => !Number.isFinite(row.quantity) || row.quantity < 0)) {
        setApprovalMessage('توجد كميات تفصيلية غير صالحة؛ صححها قبل الاعتماد.');
        return;
      }
      localStorage.setItem(approvedKey, JSON.stringify({ ...draft, approvedAt: new Date().toISOString() }));
      window.dispatchEvent(new CustomEvent('qty-approval-changed', { detail: { projectId, floor: selectedFloor } }));
      setApprovalMessage('تم اعتماد كميات الدور وتحديث بيانات الملخص المعتمد.');
    } catch {
      setApprovalMessage('تعذر اعتماد البيانات المحفوظة؛ أعد حساب الدور.');
    }
  };

  const resetFloor = () => {
    // إعادة الحساب من الرسم وتحديث اعتماد الدور مباشرة، دون المساس بالأدوار الأخرى.
    calculate();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        localStorage.setItem(approvedKey, JSON.stringify({ ...draft, approvedAt: new Date().toISOString() }));
        window.dispatchEvent(new CustomEvent('qty-approval-changed', { detail: { projectId, floor: selectedFloor } }));
        setApprovalMessage('أُعيدت الحسابات الافتراضية وحُفظ اعتماد الدور في الملخص.');
      } catch {
        setApprovalMessage('تعذر تحديث اعتماد الدور.');
      }
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
          <button type="button" onClick={resetFloor}>إرجاع الحسابات الافتراضية</button>
        </div>
        {approvalMessage && <div role="status" style={{ fontSize: 12 }}>{approvalMessage}</div>}
      </div>

      {results && (() => {
        const extra = calculateFloorAdditionalFinishes(walls.filter(w => (w.floor ?? 0) === selectedFloor), doors.filter(d => (d.floor ?? 0) === selectedFloor), windows.filter(w => (w.floor ?? 0) === selectedFloor), regions.filter(r => (r.floor ?? 0) === selectedFloor), roomRows, hasExteriorPlaster, floorHeight);
        return <section dir="rtl" style={{ marginBottom: 14 }}><strong>بنود التشطيبات الإضافية (مسودة الدور)</strong><div>التلييس الخارجي: {extra.exteriorPlasterArea.toFixed(2)} م²</div><div>النعلة بعد خصم الأبواب المطابقة لحدود الغرف: {extra.skirtingLength.toFixed(2)} م طولي</div><small>لتثبيت تغيير خيار التلييس الخارجي اضغط «احسب الكميات». تدخل الكميتان في الملخص بعد الاعتماد، ويمكن تحديد سعر وحدة مستقل لكل منهما.</small></section>;
      })()}
      {results && <RoomQuantityDetails rows={roomRows} onChange={changeRoomRows} />}
      {results && <EditableQuantityDetails rows={detailRows} onChange={changeDetailRows} />}

      {results && (
        <div id="finishes-pdf" style={{ background: '#ffffff', width: '100%' }}>
          <FinishTables
            results={results}
            hasMarble={hasMarble}
            electricalPts={electricalPts}
            plumbingPts={plumbingPts}
            onElectricalChange={value => updateServicePoints('electrical', value)}
            onPlumbingChange={value => updateServicePoints('plumbing', value)}
            onMarbleAreaChange={handleMarbleAreaChange}
            marbleLaborOverride={marbleLaborOverride}
            onMarbleLaborChange={handleMarbleLaborChange}
          />
        </div>
      )}
    </div>
  );
};
