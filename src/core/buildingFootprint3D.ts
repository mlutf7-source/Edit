import * as THREE from 'three';
import type { Wall, Point } from './types';
import { buildContourPolygon, polygonArea } from './contourUtils';

// ✅ بروز صفر (السقف على الحافة الخارجية تماماً)
const SLAB_BORDER_PROTRUSION = 0.00;

function signedArea(polygon: Point[]): number {
  let area = 0;
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
            area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
              }
                return area / 2;
                }

                function ensureCCW(polygon: Point[]): Point[] {
                  return signedArea(polygon) < 0 ? [...polygon].reverse() : polygon;
                  }

                  export function polygonCentroid(polygon: Point[]): Point {
                    if (polygon.length === 0) return { x: 0, y: 0 };
                      let sx = 0, sy = 0;
                        polygon.forEach(p => { sx += p.x; sy += p.y; });
                          return { x: sx / polygon.length, y: sy / polygon.length };
                          }

                          export interface FootprintResult {
                            polygon: Point[];
                              loops: Point[][];
                                valid: boolean;
                                }

                                export function extractBuildingFootprint(
                                  walls: Wall[],
                                  ): FootprintResult {
                                    const exteriorWalls = walls.filter(
                                        w =>
                                              w.type === 'exterior' &&
                                                    (w.kind === undefined || w.kind === 'wall'),
                                                      );

                                                        if (exteriorWalls.length < 3) {
                                                            return {
                                                                  polygon: [],
                                                                        loops: [],
                                                                              valid: false,
                                                                                  };
                                                                                    }

                                                                                      // اختيار أكبر مجموعة جدران تحمل contourId نفسه
                                                                                        const contourGroups = new Map<string, Wall[]>();

                                                                                          for (const wall of exteriorWalls) {
                                                                                              if (!wall.contourId) continue;

                                                                                                  if (!contourGroups.has(wall.contourId)) {
                                                                                                        contourGroups.set(wall.contourId, []);
                                                                                                            }

                                                                                                                contourGroups.get(wall.contourId)!.push(wall);
                                                                                                                  }

                                                                                                                    let largestGroup: Wall[] | null = null;

                                                                                                                      for (const group of contourGroups.values()) {
                                                                                                                          if (!largestGroup || group.length > largestGroup.length) {
                                                                                                                                largestGroup = group;
                                                                                                                                    }
                                                                                                                                      }

                                                                                                                                        const wallSource =
                                                                                                                                            largestGroup && largestGroup.length >= 3
                                                                                                                                                  ? largestGroup
                                                                                                                                                        : exteriorWalls;

                                                                                                                                                          // بناء محيط المبنى الفعلي
                                                                                                                                                            const polygon = buildContourPolygon(
                                                                                                                                                                wallSource,
                                                                                                                                                                    SLAB_BORDER_PROTRUSION,
                                                                                                                                                                      );

                                                                                                                                                                        const area = polygonArea(polygon);

                                                                                                                                                                          // فشل واضح بدل رسم مستطيل تقريبي
                                                                                                                                                                            if (
                                                                                                                                                                                polygon.length < 3 ||
                                                                                                                                                                                    !Number.isFinite(area) ||
                                                                                                                                                                                        area <= 0.5
                                                                                                                                                                                          ) {
                                                                                                                                                                                              return {
                                                                                                                                                                                                    polygon: [],
                                                                                                                                                                                                          loops: [],
                                                                                                                                                                                                                valid: false,
                                                                                                                                                                                                                    };
                                                                                                                                                                                                                      }

                                                                                                                                                                                                                        const finalPoly = ensureCCW(polygon);

                                                                                                                                                                                                                          return {
                                                                                                                                                                                                                              polygon: finalPoly,
                                                                                                                                                                                                                                  loops: [finalPoly],
                                                                                                                                                                                                                                      valid: true,
                                                                                                                                                                                                                                        };
                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                        export function polygonToShape(polygon: Point[]): THREE.Shape | null {
                                                                                                                                                                                                                                          if (polygon.length < 3) return null;
                                                                                                                                                                                                                                            const shape = new THREE.Shape();
                                                                                                                                                                                                                                              shape.moveTo(polygon[0].x, polygon[0].y);
                                                                                                                                                                                                                                                for (let i = 1; i < polygon.length; i++) {
                                                                                                                                                                                                                                                    shape.lineTo(polygon[i].x, polygon[i].y);
                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                        shape.closePath();
                                                                                                                                                                                                                                                          return shape;
                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                          export interface EdgeInfo {
                                                                                                                                                                                                                                                            midX: number;
                                                                                                                                                                                                                                                              midZ: number;
                                                                                                                                                                                                                                                                angle: number;
                                                                                                                                                                                                                                                                  len: number;
                                                                                                                                                                                                                                                                    outX: number;
                                                                                                                                                                                                                                                                      outZ: number;
                                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                                      export function getEdgeInfos(polygon: Point[]): EdgeInfo[] {
                                                                                                                                                                                                                                                                        if (polygon.length < 3) return [];
                                                                                                                                                                                                                                                                          const edges: EdgeInfo[] = [];

                                                                                                                                                                                                                                                                            for (let i = 0; i < polygon.length; i++) {
                                                                                                                                                                                                                                                                                const p1 = polygon[i];
                                                                                                                                                                                                                                                                                    const p2 = polygon[(i + 1) % polygon.length];
                                                                                                                                                                                                                                                                                        const dx = p2.x - p1.x;
                                                                                                                                                                                                                                                                                            const dz = p2.y - p1.y;
                                                                                                                                                                                                                                                                                                const len = Math.hypot(dx, dz);
                                                                                                                                                                                                                                                                                                    if (len < 0.01) continue;

                                                                                                                                                                                                                                                                                                        const midX = (p1.x + p2.x) / 2;
                                                                                                                                                                                                                                                                                                            const midZ = (p1.y + p2.y) / 2;
                                                                                                                                                                                                                                                                                                                const angle = Math.atan2(-dz, dx);

                                                                                                                                                                                                                                                                                                                    const outX = dz / len;
                                                                                                                                                                                                                                                                                                                        const outZ = -dx / len;

                                                                                                                                                                                                                                                                                                                            edges.push({ midX, midZ, angle, len, outX, outZ });
                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                return edges;
                                                                                                                                                                                                                                                                                                                                }