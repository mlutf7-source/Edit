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
