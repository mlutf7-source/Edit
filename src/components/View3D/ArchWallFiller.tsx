import React from 'react';
import * as THREE from 'three';
import type { Wall, Window as WindowType } from '../../core/types';
import { getArchWindowGeometry } from '../../core/wallSegments3D';
import { INTERIOR_PAINT_COLOR } from './helpers/wallHelpers';
import { useSectionPlanes } from './SectionContext';
import { getCurvedWallGeometry } from '../../core/curvedWallGeometry';
interface Props {
  wall: Wall;
    win: WindowType;
      viewHeight: number;
        matProps: any;
          isInterior: boolean;
          }

          export const ArchWallFiller: React.FC<Props> = ({
            wall,
              win,
                viewHeight,
                  matProps,
                    isInterior,
                    }) => {
                      const data = React.useMemo(
                          () => getArchWindowGeometry(wall, win),
                              [wall, win],
                                );

                                  const { midX, midY, rotationY, W, H, rH, rV, archBase, sillHeight } = data;

                                    const geometries = React.useMemo(() => {
                                        const rH_hole = rH - 0.001;
                                            const rV_hole = rV - 0.001;

                                                const left = new THREE.Shape();
                                                    left.moveTo(-rH, archBase);
                                                        left.lineTo(-rH, H);
                                                            left.lineTo(0, H);
                                                                left.absellipse(0, archBase, rH_hole, rV_hole, Math.PI / 2, Math.PI, false);
                                                                    left.closePath();

                                                                        const right = new THREE.Shape();
                                                                            right.moveTo(rH, archBase);
                                                                                right.lineTo(rH, H);
                                                                                    right.lineTo(0, H);
                                                                                        right.absellipse(0, archBase, rH_hole, rV_hole, Math.PI / 2, 0, true);
                                                                                            right.closePath();

                                                                                                const leftGeom = new THREE.ExtrudeGeometry(left, {
                                                                                                      depth: wall.thickness,
                                                                                                            bevelEnabled: false,
                                                                                                                  curveSegments: 64,
                                                                                                                      });
                                                                                                                          leftGeom.translate(0, 0, -wall.thickness / 2);

                                                                                                                              const rightGeom = new THREE.ExtrudeGeometry(right, {
                                                                                                                                    depth: wall.thickness,
                                                                                                                                          bevelEnabled: false,
                                                                                                                                                curveSegments: 64,
                                                                                                                                                    });
                                                                                                                                                        rightGeom.translate(0, 0, -wall.thickness / 2);

                                                                                                                                                            return [leftGeom, rightGeom];
                                                                                                                                                              }, [rH, rV, archBase, H, wall.thickness]);

                                                                                                                const clippingPlanes = useSectionPlanes();
                                                                                                                const mat = React.useMemo(() => {
                                                                                                                  if (isInterior) {
                                                                                                                      return new THREE.MeshStandardMaterial({
                                                                                                                            color: INTERIOR_PAINT_COLOR,
                                                                                                                                  roughness: 0.9,
                                                                                                                                        metalness: 0.0,
                                                                                                                                              side: THREE.DoubleSide,
                                                                                                                                                    clippingPlanes,
                                                                                                                                                        });
                                                                                                                                                          }
                                                                                                                                                            return new THREE.MeshStandardMaterial({
                                                                                                                                                                color: matProps.color || '#FFFFFF',
                                                                                                                                                                    roughness: matProps.roughness,
                                                                                                                                                                        metalness: matProps.metalness,
                                                                                                                                                                            side: THREE.DoubleSide,
                                                                                                                                                                                clippingPlanes,
                                                                                                                                                                                  });
                                                                                                                                                                                  }, [matProps, isInterior, clippingPlanes]);                                                
          
                                                               if (sillHeight + H > viewHeight) return null;

                                                               const geo = getCurvedWallGeometry(wall);

                                                               if (geo) {
                                                                 // ✅ للجدران المنحنية: نلوي (Bend) هندسة الحشو لتتبع القوس
                                                                   const span = geo.anticlockwise ? geo.startAngle - geo.endAngle : geo.endAngle - geo.startAngle;
                                                                     const dir = geo.anticlockwise ? -1 : 1;
                                                                       
                                                                         const dx = wall.end.x - wall.start.x;
                                                                           const dy = wall.end.y - wall.start.y;
                                                                             const len = Math.hypot(dx, dy) || 1;
                                                                               const ux = dx / len;
                                                                                 const uy = dy / len;
                                                                                   const openingStart = win.center
                                                                                       ? ((win.center.x - wall.start.x) * ux + (win.center.y - wall.start.y) * uy) - win.width / 2
                                                                                           : win.position;
                                                                                             const midDist = openingStart + win.width / 2;
                                                                                               const chordFraction = midDist / len;
                                                                                                 const arcAngleCenter = geo.startAngle + dir * span * chordFraction;
                                                                                                   
                                                                                                     const anglePerUnit = dir / geo.radius;

                                                                                                       const bendGeo = (flatGeo: THREE.BufferGeometry) => {
                                                                                                           const newGeo = flatGeo.clone();
                                                                                                               const pos = newGeo.attributes.position;
                                                                                                                   for (let i = 0; i < pos.count; i++) {
                                                                                                                         const x = pos.getX(i);
                                                                                                                               const y = pos.getY(i);
                                                                                                                                     const z = pos.getZ(i);
                                                                                                                                           
                                                                                                                                                 const angle = arcAngleCenter + x * anglePerUnit;
                                                                                                                                                       const r = geo.radius + z;
                                                                                                                                                             
                                                                                                                                                                   pos.setXYZ(i, Math.cos(angle) * r, y, Math.sin(angle) * r);
                                                                                                                                                                       }
                                                                                                                                                                           pos.needsUpdate = true;
                                                                                                                                                                               newGeo.computeVertexNormals();
                                                                                                                                                                                   return newGeo;
                                                                                                                                                                                     };

                                                                                                                                                                                       const bentLeft = bendGeo(geometries[0]);
                                                                                                                                                                                         const bentRight = bendGeo(geometries[1]);

                                                                                                                                                                                           return (
                                                                                                                                                                                               <group position={[geo.center.x, sillHeight, geo.center.y]}>
                                                                                                                                                                                                     <mesh>
                                                                                                                                                                                                             <primitive object={bentLeft} attach="geometry" />
                                                                                                                                                                                                                     <primitive object={mat} attach="material" />
                                                                                                                                                                                                                           </mesh>
                                                                                                                                                                                                                                 <mesh>
                                                                                                                                                                                                                                         <primitive object={bentRight} attach="geometry" />
                                                                                                                                                                                                                                                 <primitive object={mat} attach="material" />
                                                                                                                                                                                                                                                       </mesh>
                                                                                                                                                                                                                                                           </group>
                                                                                                                                                                                                                                                             );
                                                                                                                                                                                                                                                             }

                                                                                                                                                                                                                                                             // ⬇️ الكود الأصلي للجدران المستقيمة (لا تغيير إطلاقاً)
                                                                                                                                                                                                                                                             return (
                                                                                                                                                                                                                                                               <group position={[midX, sillHeight, midY]} rotation={[0, rotationY, 0]}>
                                                                                                                                                                                                                                                                   <mesh>
                                                                                                                                                                                                                                                                         <primitive object={geometries[0]} attach="geometry" />
                                                                                                                                                                                                                                                                               <primitive object={mat} attach="material" />
                                                                                                                                                                                                                                                                                   </mesh>
                                                                                                                                                                                                                                                                                       <mesh>
                                                                                                                                                                                                                                                                                             <primitive object={geometries[1]} attach="geometry" />
                                                                                                                                                                                                                                                                                                   <primitive object={mat} attach="material" />
                                                                                                                                                                                                                                                                                                       </mesh>
                                                                                                                                                                                                                                                                                                         </group>
                                                                                                                                                                                                                                                                                                         );
                                                                                                                                                                                };