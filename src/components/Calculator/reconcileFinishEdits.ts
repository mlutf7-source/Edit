import type { FinishResults } from '../../core/finishCalculations';

/** Reconcile dependent quantities after an editable detailed input changes. */
export function reconcileFinishEdits(current: FinishResults, key: string, value: number): FinishResults {
  if (!Number.isFinite(value) || value < 0 || !(key in current) || typeof (current as unknown as Record<string, unknown>)[key] !== 'number') return current;
  const next = { ...current, [key]: value } as FinishResults;
  const n = (field: keyof FinishResults) => Number(next[field]) || 0;
  const put = (field: keyof FinishResults, amount: number) => { (next as unknown as Record<string, unknown>)[field] = Math.max(0, amount); };
  for (const prefix of ['exterior', 'interior'] as const) {
    const gross = `${prefix}WallGross` as keyof FinishResults;
    const net = `${prefix}WallNet` as keyof FinishResults;
    const blocks = `${prefix}Blocks` as keyof FinishResults;
    const cement = `${prefix}BlockCement` as keyof FinishResults;
    const sand = `${prefix}BlockSand` as keyof FinishResults;
    const deductions = prefix === 'exterior' ? ['outerColumnArea', 'extWindowArea', 'extDoorArea'] : ['innerColumnArea', 'intWindowArea', 'intDoorArea'];
    if ([gross, ...deductions].includes(key)) put(net, n(gross) - deductions.reduce((sum, k) => sum + n(k as keyof FinishResults), 0));
    if ([gross, net, ...deductions].includes(key)) put(blocks, Math.ceil(n(net) * 12));
    if ([gross, net, blocks, ...deductions].includes(key)) put(cement, Math.ceil(n(blocks) / 50));
    if ([gross, net, blocks, cement, ...deductions].includes(key)) put(sand, Math.ceil(n(cement) * 0.15));
  }
  const tileParts = ['correctedTileFloor', 'tileKitchenFloor', 'tileBathroomFloor', 'correctedTileKitchenWalls', 'correctedTileBathroomWalls'];
  if (tileParts.includes(key)) put('correctedTileTotalArea', tileParts.reduce((sum, field) => sum + n(field as keyof FinishResults), 0));
  if ([...tileParts, 'correctedTileTotalArea'].includes(key)) put('correctedTileCement', Math.ceil(n('correctedTileTotalArea') * 0.3));
  if ([...tileParts, 'correctedTileTotalArea', 'correctedTileCement'].includes(key)) put('correctedTileSand', Math.ceil(n('correctedTileCement') * 0.15));
  if (['correctedPlasterWalls', 'correctedPlasterCeiling'].includes(key)) put('correctedPlasterArea', n('correctedPlasterWalls') + n('correctedPlasterCeiling'));
  if (['correctedPlasterWalls', 'correctedPlasterCeiling', 'correctedPlasterArea'].includes(key)) put('correctedPlasterCement', Math.ceil(n('correctedPlasterArea') * 0.15));
  if (['correctedPlasterWalls', 'correctedPlasterCeiling', 'correctedPlasterArea', 'correctedPlasterCement'].includes(key)) put('correctedPlasterSand', Math.ceil(n('correctedPlasterCement') * 0.15));
  if (['correctedPaintWalls', 'correctedPaintCeiling'].includes(key)) put('correctedPaintTotal', n('correctedPaintWalls') + n('correctedPaintCeiling'));
  if (['correctedPaintWalls', 'correctedPaintCeiling', 'correctedPaintTotal'].includes(key)) {
    put('putty', Math.ceil(n('correctedPaintTotal') * 0.8));
    put('primer', Math.ceil(n('correctedPaintTotal') / 8));
    put('paint', Math.ceil(n('correctedPaintTotal') / 8));
  }
  // Reconcile aggregate quantities after every edit, without replacing the edited value.
  put('totalBlocks', Math.ceil(n('exteriorBlocks') + n('interiorBlocks')));
  put('totalCement', Math.ceil(n('exteriorBlockCement') + n('interiorBlockCement') + n('correctedPlasterCement') + n('correctedTileCement') + n('marbleCement')));
  put('totalSand', Math.ceil(n('exteriorBlockSand') + n('interiorBlockSand') + n('correctedPlasterSand') + n('correctedTileSand') + n('marbleSand')));
  put('totalAggregate', Math.ceil(n('marbleAggregate')));
  return next;
}

export function synchronizeFinishSummary(summary: Record<string, unknown>, r: FinishResults): Record<string, unknown> {
  const n = (key: keyof FinishResults) => Number(r[key]) || 0;
  return {
    ...summary,
    totalBlocks: Math.ceil(n('exteriorBlocks') + n('interiorBlocks')),
    totalCement: Math.ceil(n('totalCement')),
    totalSand: Math.ceil(n('totalSand')),
    totalAggregate: Math.ceil(n('totalAggregate')),
    totalMarbleArea: Math.ceil(n('marbleArea')),
    totalTileArea: Math.ceil(n('correctedTileTotalArea')),
    laborWallTotal: Math.ceil(n('exteriorWallGross') + n('interiorWallGross')),
    laborPlasterTotal: Math.ceil(n('plasterWallsLabor') + n('plasterCeilingLabor') - n('innerWallArea')),
    laborPaintTotal: Math.ceil(n('paintWalls') + n('paintCeiling') - n('innerWallArea')),
    laborTileTotal: Math.ceil(n('tileFloorArea') - n('innerWallArea') + n('tileKitchenFloor') + n('tileBathroomFloor') + n('tileKitchenWalls') + n('tileBathroomWalls')),
    exteriorWallNet: n('exteriorWallNet'), interiorWallNet: n('interiorWallNet'),
    exteriorWallGross: n('exteriorWallGross'), interiorWallGross: n('interiorWallGross'),
    blockOuter: { blocks: n('exteriorBlocks'), cement: n('exteriorBlockCement'), sand: n('exteriorBlockSand') },
    blockInner: { blocks: n('interiorBlocks'), cement: n('interiorBlockCement'), sand: n('interiorBlockSand') },
    plaster: { area: n('correctedPlasterWalls'), cement: n('correctedPlasterCement'), sand: n('correctedPlasterSand') },
    paint: { area: n('correctedPaintWalls'), putty: n('putty'), primer: n('primer'), paint: n('paint') },
    tile: { ...(typeof summary.tile === 'object' && summary.tile !== null ? summary.tile : {}), floor: n('correctedTileFloor'), kitchenWalls: n('correctedTileKitchenWalls'), bathroomWalls: n('correctedTileBathroomWalls'), total: Math.ceil(n('correctedTileTotalArea')) },
    marble: { area: n('marbleArea'), aggregate: n('marbleAggregate'), cement: n('marbleCement'), sand: n('marbleSand') },
    paintWalls: n('correctedPaintWalls'), paintCeiling: n('correctedPaintCeiling'), paintTotal: n('correctedPaintTotal'),
    plasterWallsLabor: n('correctedPlasterWalls'), plasterCeilingLabor: n('correctedPlasterCeiling'),
    tileFloorArea: n('correctedTileFloor'), tileKitchenWalls: n('correctedTileKitchenWalls'), tileBathroomWalls: n('correctedTileBathroomWalls'),
  };
}
