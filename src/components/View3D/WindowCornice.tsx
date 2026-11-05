import React from 'react';
import * as THREE from 'three';
import type { Wall, Window as WindowType } from '../../core/types';
import { useSectionPlanes } from './SectionContext';
import { getCurvedWallGeometry, type CurvedWallGeometry } from '../../core/curvedWallGeometry';

interface Props {
  wall: Wall;
  window: WindowType;
  color?: string;
  style?: 'rect' | 'arch';
  visible?: boolean;
  buildingCentroid?: { x: number; y: number };
}

const CORNICE_DEPTH = 0.15;
const CORNICE_WIDTH = 0.10;
const ARCH_STRETCH = 0.35;
const ARCH_SEGMENTS = 48;
const BAL_HEIGHT = 0.18;
const BAL_WIDTH = 0.04;
const BAL_GAP = 0.04;

function getOpeningStart(
  el: { position: number; width: number; center?: { x: number; y: number } },
  wall: Wall,
): number {
  if (!el.center) return el.position;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const centerAlong = (el.center.x - wall.start.x) * ux + (el.center.y - wall.start.y) * uy;
  return centerAlong - el.width / 2;
}

// ✅ حساب الزاوية محلياً لضمان عدم الانهيار
function chordFractionToArcAngle(f: number, geo: CurvedWallGeometry): number {
  let span = geo.endAngle - geo.startAngle;
  while (span > Math.PI) span -= 2 * Math.PI;
  while (span <= -Math.PI) span += 2 * Math.PI;
  
  const dir = span > 0 ? 1 : -1;
  const totalArcSpan = Math.abs(span);
  const chordMidpointAngle = geo.startAngle + span / 2;
  const sinHalfSpan = Math.sin(totalArcSpan / 2);
  const halfArg = (2 * f - 1) * sinHalfSpan;
  const clamped = Math.max(-1, Math.min(1, halfArg));
  return chordMidpointAngle + dir * Math.asin(clamped);
}

export const WindowCornice: React.FC<Props> = ({
  wall,
  window: win,
  color = '#FFFFFF',
  style = 'rect',
  visible = true,
  buildingCentroid,
}) => {
  if (!visible) return null;

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const halfTh = wall.thickness / 2;

  const openingStart = getOpeningStart(win, wall);
  const midDist = openingStart + win.width / 2;
  const geo = getCurvedWallGeometry(wall);

  // ✅ تحديد "الخارج" للمستقيم من مركز المبنى
  let straightSign = wall.normalSign ?? 1;
  if (!geo && buildingCentroid) {
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    const wx = wall.end.x - wall.start.x;
    const wy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wx, wy) || 1;
    const ux2 = -wy / wlen;
    const uy2 = wx / wlen;
    const toCenterX = buildingCentroid.x - midX;
    const toCenterY = buildingCentroid.y - midY;
    straightSign = (ux2 * toCenterX + uy2 * toCenterY) > 0 ? -1 : 1;
  }

  const sillHeight = 1.0;
  const W = win.width;
  const H = win.height;
  const rH = W / 2;
  const rV = rH * ARCH_STRETCH;
  const archBase = H - rV;

  // ✅ إصلاح ابتعاد الكورنيش عن السطح في الجدران المستقيمة
  // (midX/midY أصلاً على السطح الخارجي، لا نضيف halfTh مرة أخرى)
  const corniceLocalZ = geo
    ? (CORNICE_DEPTH / 2 + 0.01)
    : straightSign * (CORNICE_DEPTH / 2 + 0.01);

  const clippingPlanes = useSectionPlanes();
  const isArch = style === 'arch';
  const sideColumnHeight = isArch ? archBase : H;
  const sideColumnCenterY = isArch ? sillHeight + sideColumnHeight / 2 : sillHeight + H / 2;
  const sillWidth = W + CORNICE_WIDTH * 2;
  const balusterAreaWidth = sillWidth - CORNICE_WIDTH * 2;
  const balusterPitch = BAL_WIDTH + BAL_GAP;
  const balusterCount = Math.max(3, Math.floor(balusterAreaWidth / balusterPitch));
  const balusterTotalWidth = balusterCount * BAL_WIDTH + (balusterCount - 1) * BAL_GAP;
  const balusterStartX = -balusterTotalWidth / 2;
  const sillY = sillHeight - CORNICE_WIDTH;
  const balusterCenterY = sillY - BAL_HEIGHT / 2;

  if (geo) {
    const SEG = 12;
    const arcAngleForWin = chordFractionToArcAngle(midDist / len, geo);
    
    let span = geo.endAngle - geo.startAngle;
    while (span > Math.PI) span -= 2 * Math.PI;
    while (span <= -Math.PI) span += 2 * Math.PI;
    const dir = span > 0 ? 1 : -1;

    const localToWorld = (lx: number, ly: number, lz: number) => {
      const angle = arcAngleForWin + dir * (lx / geo.radius);
      const r = geo.radius + halfTh + lz;
      const wx = geo.center.x + r * Math.cos(angle);
      const wz = geo.center.y + r * Math.sin(angle);
      const rotY = Math.atan2(-Math.sin(angle) * dir, Math.cos(angle) * dir);
      return { position: [wx, ly, wz] as [number, number, number], rotY };
    };

    const renderHorizontalBar = (centerY: number, width: number, height: number, depth: number, keyPrefix: string) => {
      const segWidth = width / SEG;
      return Array.from({ length: SEG }).map((_, i) => {
        const lx = -width / 2 + segWidth / 2 + i * segWidth;
        const p = localToWorld(lx, centerY, corniceLocalZ);
        return (
          <mesh key={`${keyPrefix}-${i}`} position={p.position} rotation={[0, p.rotY, 0]}>
            <boxGeometry args={[segWidth * 1.05, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} clippingPlanes={clippingPlanes} />
          </mesh>
        );
      });
    };

    const leftCol = localToWorld(-W / 2 - CORNICE_WIDTH / 2, sideColumnCenterY, corniceLocalZ);
    const rightCol = localToWorld(W / 2 + CORNICE_WIDTH / 2, sideColumnCenterY, corniceLocalZ);

    return (
      <group>
        <mesh position={leftCol.position} rotation={[0, leftCol.rotY, 0]}>
          <boxGeometry args={[CORNICE_WIDTH, sideColumnHeight, CORNICE_DEPTH]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} clippingPlanes={clippingPlanes} />
        </mesh>
        <mesh position={rightCol.position} rotation={[0, rightCol.rotY, 0]}>
          <boxGeometry args={[CORNICE_WIDTH, sideColumnHeight, CORNICE_DEPTH]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} clippingPlanes={clippingPlanes} />
        </mesh>
        {renderHorizontalBar(sillY + CORNICE_WIDTH / 2, sillWidth, CORNICE_WIDTH, CORNICE_DEPTH, 'sill')}
        {renderHorizontalBar(balusterCenterY - BAL_HEIGHT / 2 - CORNICE_WIDTH / 4, sillWidth, CORNICE_WIDTH / 2, CORNICE_DEPTH, 'base')}
        {Array.from({ length: balusterCount }).map((_, i) => {
          const lx = balusterStartX + i * balusterPitch + BAL_WIDTH / 2;
          const p = localToWorld(lx, balusterCenterY, corniceLocalZ);
          return (
            <mesh key={`bal-${i}`} position={p.position} rotation={[0, p.rotY, 0]}>
              <boxGeometry args={[BAL_WIDTH, BAL_HEIGHT, CORNICE_DEPTH * 0.6]} />
              <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} clippingPlanes={clippingPlanes} />
            </mesh>
          );
        })}
        {!isArch && renderHorizontalBar(sillHeight + H + CORNICE_WIDTH / 2, sillWidth, CORNICE_WIDTH, CORNICE_DEPTH, 'top')}
        {isArch && Array.from({ length: ARCH_SEGMENTS }).map((_, i) => {
          const t = ((i + 0.5) / ARCH_SEGMENTS) * Math.PI;
          const lx = (rH + CORNICE_WIDTH / 2) * Math.cos(t);
          const ly = archBase + (rV + CORNICE_WIDTH / 2) * Math.sin(t);
          const p = localToWorld(lx, sillHeight + ly, corniceLocalZ);
          const dxT = -rH * Math.sin(t);
          const dyT = rV * Math.cos(t);
          const tangentAngle = Math.atan2(dyT, dxT);
          const segLen = (Math.PI * (rH + rV) / 2) * 1.3 / ARCH_SEGMENTS;
          return (
            <group key={`arc-${i}`} position={p.position} rotation={[0, p.rotY, 0]}>
              <mesh rotation={[0, 0, tangentAngle]}>
                <boxGeometry args={[segLen, CORNICE_WIDTH, CORNICE_DEPTH]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} clippingPlanes={clippingPlanes} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  // ⬇️ الجدران المستقيمة
  const midX = wall.start.x + ux * midDist + nx * halfTh * straightSign;
  const midY = wall.start.y + uy * midDist + ny * halfTh * straightSign;
  const rotationY = Math.atan2(-uy, ux);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05, clippingPlanes });

  return (
    <group position={[midX, 0, midY]} rotation={[0, rotationY, 0]}>
      <mesh position={[-W / 2 - CORNICE_WIDTH / 2, sideColumnCenterY, corniceLocalZ]} material={material}>
        <boxGeometry args={[CORNICE_WIDTH, sideColumnHeight, CORNICE_DEPTH]} />
      </mesh>
      <mesh position={[W / 2 + CORNICE_WIDTH / 2, sideColumnCenterY, corniceLocalZ]} material={material}>
        <boxGeometry args={[CORNICE_WIDTH, sideColumnHeight, CORNICE_DEPTH]} />
      </mesh>
      <mesh position={[0, sillY + CORNICE_WIDTH / 2, corniceLocalZ]} material={material}>
        <boxGeometry args={[sillWidth, CORNICE_WIDTH, CORNICE_DEPTH]} />
      </mesh>
      <mesh position={[0, balusterCenterY - BAL_HEIGHT / 2 - CORNICE_WIDTH / 4, corniceLocalZ]} material={material}>
        <boxGeometry args={[sillWidth, CORNICE_WIDTH / 2, CORNICE_DEPTH]} />
      </mesh>
      {Array.from({ length: balusterCount }).map((_, i) => {
        const x = balusterStartX + i * balusterPitch + BAL_WIDTH / 2;
        return (
          <mesh key={`bal-${i}`} position={[x, balusterCenterY, corniceLocalZ]} material={material}>
            <boxGeometry args={[BAL_WIDTH, BAL_HEIGHT, CORNICE_DEPTH * 0.6]} />
          </mesh>
        );
      })}
      {!isArch && (
        <mesh position={[0, sillHeight + H + CORNICE_WIDTH / 2, corniceLocalZ]} material={material}>
          <boxGeometry args={[sillWidth, CORNICE_WIDTH, CORNICE_DEPTH]} />
        </mesh>
      )}
      {isArch && (
        <group position={[0, sillHeight + archBase, corniceLocalZ]}>
          {Array.from({ length: ARCH_SEGMENTS }).map((_, i) => {
            const t = ((i + 0.5) / ARCH_SEGMENTS) * Math.PI;
            const xMid = (rH + CORNICE_WIDTH / 2) * Math.cos(t);
            const yMid = (rV + CORNICE_WIDTH / 2) * Math.sin(t);
            const dxT = -rH * Math.sin(t);
            const dyT = rV * Math.cos(t);
            const tangentAngle = Math.atan2(dyT, dxT);
            const segLen = (Math.PI * (rH + rV) / 2) * 1.3 / ARCH_SEGMENTS;
            return (
              <mesh key={`cornice-seg-${i}`} position={[xMid, yMid, 0]} rotation={[0, 0, tangentAngle]} material={material}>
                <boxGeometry args={[segLen, CORNICE_WIDTH, CORNICE_DEPTH]} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};
