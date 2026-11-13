import { useState, useCallback } from 'react';
import type { Point, Wall } from '../core/types';
import type { RoomRegion, RegionType } from '../core/regionTypes';
import { detectRoomRegion } from '../core/roomDetection';

function pointInRegion(pt: Point, polygon: Point[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];

    if (
      (a.y > pt.y) !== (b.y > pt.y) &&
      pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }

  return inside;
}
export function useRegionManager(walls: Wall[]) {
  const [regions, setRegions] = useState<RoomRegion[]>([]);

  const addRegion = useCallback((pt: Point, type: RegionType) => {
    const region = detectRoomRegion(pt, walls, type);
    if (region) {
  const floor = walls.find(w => region.wallIds.includes(w.id))?.floor ?? 0;

  setRegions(prev => {
    const alreadyExists = prev.some(r =>
      (r.floor ?? 0) === floor &&
      r.polygon.length >= 3 &&
      pointInRegion(pt, r.polygon)
    );

    return alreadyExists
      ? prev
      : [...prev, { ...region, floor }];
  });
    }
  }, [walls]);

  const removeRegion = useCallback((id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearRegions = useCallback(() => {
    setRegions([]);
  }, []);

  // ✅ إضافة setRegions لاستعادة الحالة عند التراجع
  const setAllRegions = useCallback((newRegions: RoomRegion[]) => {
    setRegions(newRegions);
  }, []);

  return {
    regions,
    addRegion,
    removeRegion,
    clearRegions,
    setRegions: setAllRegions,
  };
}
