import React from 'react';
import * as THREE from 'three';
function OwnedBentGeometry({geometry}:{geometry:THREE.BufferGeometry}) {
  React.useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <primitive object={geometry} attach="geometry"/>;
}
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
texture?: THREE.Texture | null;
repeatScale?: number;
          isInterior: boolean;
          }

          export const ArchWallFiller: React.FC<Props> = ({
            wall,
              win,
                viewHeight,
                  matProps,
texture = null,
repeatScale = 1,
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

                                                                                                                const textured = React.useMemo(() => {
 const dx=wall.end.x-wall.start.x, dz=wall.end.y-wall.start.y;
 const len=Math.hypot(dx,dz)||1;
 const mid=((midX-wall.start.x)*dx+(midY-wall.start.y)*dz)/len;
 return geometries.map(source=>{
 const g=source.clone(), pos=g.attributes.position, uv=g.attributes.uv;
 for(let i=0;i<pos.count;i++) uv.setXY(i,(mid+pos.getX(i))*repeatScale,(sillHeight+pos.getY(i))*repeatScale);
 uv.needsUpdate=true;
 return g;
 });
},[geometries,wall,midX,midY,repeatScale,sillHeight]);
React.useEffect(()=>()=>textured.forEach(g=>g.dispose()),[textured]);
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
map: texture,
                                                                                                                                                                    roughness: matProps.roughness,
                                                                                                                                                                        metalness: matProps.metalness,
                                                                                                                                                                            side: THREE.DoubleSide,
                                                                                                                                                                                clippingPlanes,
                                                                                                                                                                                  });
                                                                                                                                                                                  }, [matProps, isInterior, clippingPlanes, texture]);                                                
          
                                                               React.useEffect(()=>()=>mat.dispose(),[mat]);
  React.useEffect(()=>()=>geometries.forEach(g=>g.dispose()),[geometries]);
  if (sillHeight + archBase >= viewHeight) return null;

                                                               const geo = getCurvedWallGeometry(wall);

                                                               if (geo) {
                                                                 // ✅ نفس الصيغة المستخدمة في Window3D — لتطابق الحشو مع النافذة
const dir = geo.arcSpan > 0 ? 1 : -1;
const totalArcSpan = Math.abs(geo.arcSpan);
const chordMidpointAngle = geo.startAngle + geo.arcSpan / 2;
const sinHalfSpan = Math.sin(totalArcSpan / 2);

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

const halfArg = (2 * chordFraction - 1) * sinHalfSpan;
const clamped = Math.max(-1, Math.min(1, halfArg));
const arcAngleCenter = chordMidpointAngle + dir * Math.asin(clamped);

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
const uv = newGeo.attributes.uv;
uv.setXY(i,Math.abs(angle-geo.startAngle)*geo.outerRadius*repeatScale,(sillHeight+y)*repeatScale);
                                                                                                                                                             
                                                                                                                                                                   pos.setXYZ(i, Math.cos(angle) * r, y, Math.sin(angle) * r);
                                                                                                                                                                       }
                                                                                                                                                                           pos.needsUpdate = true;
newGeo.attributes.uv.needsUpdate = true;
                                                                                                                                                                               newGeo.computeVertexNormals();
                                                                                                                                                                                   return newGeo;
                                                                                                                                                                                     };

                                                                                                                                                                                       const bentLeft = bendGeo(textured[0]);
                                                                                                                                                                                         const bentRight = bendGeo(textured[1]);

                                                                                                                                                                                           return (
                                                                                                                                                                                               <group position={[geo.center.x, sillHeight, geo.center.y]}>
                                                                                                                                                                                                     <mesh>
                                                                                                                                                                                                             <OwnedBentGeometry geometry={bentLeft}/>
                                                                                                                                                                                                                     <primitive object={mat} attach="material" />
                                                                                                                                                                                                                           </mesh>
                                                                                                                                                                                                                                 <mesh>
                                                                                                                                                                                                                                         <OwnedBentGeometry geometry={bentRight}/>
                                                                                                                                                                                                                                                 <primitive object={mat} attach="material" />
                                                                                                                                                                                                                                                       </mesh>
                                                                                                                                                                                                                                                           </group>
                                                                                                                                                                                                                                                             );
                                                                                                                                                                                                                                                             }

                                                                                                                                                                                                                                                             // ⬇️ الكود الأصلي للجدران المستقيمة (لا تغيير إطلاقاً)
                                                                                                                                                                                                                                                             return (
                                                                                                                                                                                                                                                               <group position={[midX, sillHeight, midY]} rotation={[0, rotationY, 0]}>
                                                                                                                                                                                                                                                                   <mesh>
                                                                                                                                                                                                                                                                         <primitive object={textured[0]} attach="geometry" />
                                                                                                                                                                                                                                                                               <primitive object={mat} attach="material" />
                                                                                                                                                                                                                                                                                   </mesh>
                                                                                                                                                                                                                                                                                       <mesh>
                                                                                                                                                                                                                                                                                             <primitive object={textured[1]} attach="geometry" />
                                                                                                                                                                                                                                                                                                   <primitive object={mat} attach="material" />
                                                                                                                                                                                                                                                                                                       </mesh>
                                                                                                                                                                                                                                                                                                         </group>
                                                                                                                                                                                                                                                                                                         );
                                                                                                                                                                                };
