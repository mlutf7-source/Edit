import type { RoomQuantityRow } from './RoomQuantityDetails';
import type { FinishResults } from '../../core/finishCalculations';

/** Applies editable kitchen/bathroom geometry as a delta to the original engine result.
 * Other room types remain descriptive until a room-by-room allocation is available.
 * Never mutates the baseline result.
 */
export function applyRoomQuantityOverrides(
  baseline: FinishResults,
  original: RoomQuantityRow[],
  edited: RoomQuantityRow[],
): FinishResults {
  const editedById = new Map(edited.map(row => [row.id, row]));
  const delta = (type: 'kitchen' | 'bathroom', key: 'area' | 'walls') =>
    original.filter(row => row.type === type).reduce((sum, row) => {
      const replacement = editedById.get(row.id);
      if (!replacement || replacement.type !== row.type) return sum;
      const previous = key === 'area' ? row.area : row.perimeter * row.height;
      const current = key === 'area' ? replacement.area : replacement.perimeter * replacement.height;
      return sum + (Number.isFinite(current) && current >= 0 ? current - previous : 0);
    }, 0);

  const kitchenAreaDelta = delta('kitchen', 'area');
  const bathroomAreaDelta = delta('bathroom', 'area');
  const kitchenWallDelta = delta('kitchen', 'walls');
  const bathroomWallDelta = delta('bathroom', 'walls');
  const wallDelta = kitchenWallDelta + bathroomWallDelta;

  const regularDelta = (field: 'area' | 'walls') => original.filter(row => row.type === 'room' || row.type === 'hall').reduce((sum, row) => {
    const replacement = editedById.get(row.id);
    if (!replacement) return sum;
    const previous = field === 'area' ? row.area : row.perimeter * row.height;
    const current = field === 'area' ? replacement.area : replacement.perimeter * replacement.height;
    return sum + (Number.isFinite(current) && current >= 0 ? current - previous : 0);
  }, 0);

  const regularAreaDelta = regularDelta('area');
  const regularWallDelta = regularDelta('walls');
  const next: FinishResults = { ...baseline };
  const positive = (n: number) => Math.max(0, n);

  next.kitchenArea = positive(baseline.kitchenArea + kitchenAreaDelta);
  next.bathroomArea = positive(baseline.bathroomArea + bathroomAreaDelta);
  next.kitchenWallArea = positive(baseline.kitchenWallArea + kitchenWallDelta);
  next.bathroomWallArea = positive(baseline.bathroomWallArea + bathroomWallDelta);
  next.tileKitchenFloor = positive(baseline.tileKitchenFloor + kitchenAreaDelta);
  next.tileBathroomFloor = positive(baseline.tileBathroomFloor + bathroomAreaDelta);
  next.tileFloorArea = positive(baseline.tileFloorArea + regularAreaDelta - kitchenAreaDelta - bathroomAreaDelta);
  next.correctedTileFloor = positive(baseline.correctedTileFloor + regularAreaDelta - kitchenAreaDelta - bathroomAreaDelta);
  next.tileKitchenWalls = positive(baseline.tileKitchenWalls + kitchenWallDelta);
  next.tileBathroomWalls = positive(baseline.tileBathroomWalls + bathroomWallDelta);
  next.correctedTileKitchenWalls = positive(baseline.correctedTileKitchenWalls + kitchenWallDelta);
  next.correctedTileBathroomWalls = positive(baseline.correctedTileBathroomWalls + bathroomWallDelta);
  next.correctedTileTotalArea = next.correctedTileFloor + next.tileKitchenFloor + next.tileBathroomFloor + next.correctedTileKitchenWalls + next.correctedTileBathroomWalls;
  next.tileCement = next.correctedTileTotalArea * 0.3;
  next.tileSand = next.tileCement * 0.15;
  next.correctedTileCement = Math.ceil(next.correctedTileTotalArea * 0.3);
  next.correctedTileSand = Math.ceil(next.correctedTileCement * 0.15);

  // Preserve the existing calculation engine's deduction conventions.
  // Its corrected plaster formula deducts tiled wall areas twice.
  next.correctedPlasterWalls = positive(baseline.correctedPlasterWalls + regularWallDelta - 2 * wallDelta);
  next.correctedPlasterCeiling = positive(
  baseline.correctedPlasterCeiling +
  regularAreaDelta +
  kitchenAreaDelta +
  bathroomAreaDelta
);
  next.correctedPlasterArea = next.correctedPlasterWalls + next.correctedPlasterCeiling;
  next.correctedPlasterCement = Math.ceil(next.correctedPlasterArea * 0.15);
  next.correctedPlasterSand = Math.ceil(next.correctedPlasterCement * 0.15);
  next.plasterWallsLabor = positive(baseline.plasterWallsLabor + regularWallDelta - wallDelta);
  next.plasterWallsMaterial = positive(baseline.plasterWallsMaterial + regularWallDelta - wallDelta);
  next.correctedPaintWalls = next.correctedPlasterWalls;
  next.correctedPaintCeiling = positive(baseline.correctedPaintCeiling + regularAreaDelta);
  next.correctedPaintTotal = next.correctedPaintWalls + next.correctedPaintCeiling;
  next.paintWalls = positive(baseline.paintWalls + regularWallDelta - wallDelta);
  next.putty = next.correctedPaintTotal * 0.8;
  next.primer = next.correctedPaintTotal / 8;
  next.paint = next.correctedPaintTotal / 8;

  next.totalCement = Math.ceil(baseline.exteriorBlockCement + baseline.interiorBlockCement + next.correctedPlasterCement + next.correctedTileCement + baseline.marbleCement);
  next.totalSand = Math.ceil(baseline.exteriorBlockSand + baseline.interiorBlockSand + next.correctedPlasterSand + next.correctedTileSand + baseline.marbleSand);

  return next;
}
