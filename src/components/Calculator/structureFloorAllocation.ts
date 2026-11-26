// توزيع حسابات الهيكل الحالية على الأدوار، دون تغيير معادلات حساب الهيكل الأصلية.
// التوزيع تقديري: الأعمدة بنسبة الارتفاع، والأسقف بالتساوي.
export interface StructuralQuantities {
  footingConcrete: number; footingSteel: number;
  neckConcrete: number; neckSteel: number;
  columnConcrete: number; columnSteel: number;
  middConcrete: number; middSteel: number;
  slabConcrete: number; slabSteel: number;
  totalConcrete: number; totalSteel: number;
}
export interface FloorStructureAllocation {
  floor: number;
  footingConcrete: number; footingSteel: number;
  neckConcrete: number; neckSteel: number;
  columnConcrete: number; columnSteel: number;
  middConcrete: number; middSteel: number;
  slabConcrete: number; slabSteel: number;
  totalConcrete: number; totalSteel: number;
}
export interface StructureRecord extends StructuralQuantities {
  buildFloors?: number;
  buildFloorsManual?: boolean;
  designFloors?: number;
  floorAllocations?: FloorStructureAllocation[];
  allocationMethod?: string;
}
export const allocateStructureByFloor = (
  results: StructuralQuantities, floorHeights: number[], buildFloors: number,
): FloorStructureAllocation[] | null => {
  if (!Number.isInteger(buildFloors) || buildFloors < 1 || buildFloors !== floorHeights.length ||
      floorHeights.some(h => !Number.isFinite(h) || h <= 0)) return null;
  const sumHeights = floorHeights.reduce((sum, h) => sum + h, 0);
  return floorHeights.map((height, floor) => {
    const ground = floor === 0 ? 1 : 0;
    const columnFraction = height / sumHeights;
    const slabFraction = 1 / buildFloors;
    const values = {
      floor,
      footingConcrete: results.footingConcrete * ground,
      footingSteel: results.footingSteel * ground,
      neckConcrete: results.neckConcrete * ground,
      neckSteel: results.neckSteel * ground,
      columnConcrete: results.columnConcrete * columnFraction,
      columnSteel: results.columnSteel * columnFraction,
      middConcrete: results.middConcrete * ground,
      middSteel: results.middSteel * ground,
      slabConcrete: results.slabConcrete * slabFraction,
      slabSteel: results.slabSteel * slabFraction,
    };
    return {
      ...values,
      totalConcrete: values.footingConcrete + values.neckConcrete + values.columnConcrete + values.middConcrete + values.slabConcrete,
      totalSteel: values.footingSteel + values.neckSteel + values.columnSteel + values.middSteel + values.slabSteel,
    };
  });
};

// Independent per-floor quantities supplied by the geometry/calculation page.
// No proportional redistribution or equal division is performed here.
export interface FloorCalculatedStructure {
  floor: number;
  columnConcrete: number;
  columnSteel: number;
  slabConcrete: number;
  slabSteel: number;
  slabGrossVolume: number;
}
export type IndependentFloorAllocation = FloorStructureAllocation & { slabGrossVolume: number };
export const allocateCalculatedStructureByFloor = (
  foundations: Pick<StructuralQuantities, 'footingConcrete' | 'footingSteel' | 'neckConcrete' | 'neckSteel' | 'middConcrete' | 'middSteel'>,
  floors: readonly FloorCalculatedStructure[],
): IndependentFloorAllocation[] | null => {
  const valid = (n: number) => Number.isFinite(n) && n >= 0;
  if (!floors.length || !floors.some(f => f.floor === 0) ||
      new Set(floors.map(f => f.floor)).size !== floors.length ||
      !Object.values(foundations).every(valid) ||
      floors.some(f => !Number.isInteger(f.floor) || f.floor < 0 ||
        ![f.columnConcrete, f.columnSteel, f.slabConcrete, f.slabSteel, f.slabGrossVolume].every(valid) ||
        f.slabConcrete > f.slabGrossVolume)) return null;
  return [...floors].sort((a,b) => a.floor-b.floor).map(f => {
    const ground = f.floor === 0 ? 1 : 0;
    const values = {
      ...f,
      footingConcrete: foundations.footingConcrete * ground,
      footingSteel: foundations.footingSteel * ground,
      neckConcrete: foundations.neckConcrete * ground,
      neckSteel: foundations.neckSteel * ground,
      middConcrete: foundations.middConcrete * ground,
      middSteel: foundations.middSteel * ground,
    };
    return { ...values,
      totalConcrete: values.footingConcrete + values.neckConcrete + values.middConcrete + f.columnConcrete + f.slabConcrete,
      totalSteel: values.footingSteel + values.neckSteel + values.middSteel + f.columnSteel + f.slabSteel,
    };
  });
};
