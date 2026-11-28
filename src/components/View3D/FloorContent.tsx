import { computeCorner } from '../Canvas/canvasRenderer/computeCorner';
import type { RoundedCorner } from '../../core/types';
import type { WallBox } from '../../core/wallSegments3D';
import React from 'react';
import * as THREE from 'three';
import type {
  Wall,
  Window as WindowType,
  Door,
  Opening,
  Column,
  Stair,
  StairElement,
} from '../../core/types';
import { splitWallByOpenings } from '../../core/wallSegments3D';
import { Door3D } from './Door3D';
import { Window3D } from './Window3D';
import { WindowCornice } from './WindowCornice';
import { Column3D } from './Column3D';
import { Stair3D, StairElement3D } from './Stair3D';
import { RoundedCornerMesh } from './RoundedCornerMesh';
import { WallMesh } from './WallMesh';
import { CurvedWallMesh } from './CurvedWallMesh';
import { ArchWallFiller } from './ArchWallFiller';
import { MainDoorWallFiller } from './MainDoorWallFiller';
import { MainDoorCornice } from './MainDoorCornice';
import type { View3DSettings } from './view3dTypes';

interface Props {
  floorIndex: number;
  roundedCorners?: RoundedCorner[];
  normalWalls: Wall[];
  windows: WindowType[];
  doors: Door[];
  openings: Opening[]; // ✅ جديد
  columns: Column[];
  stairs: Stair[];
  stairElements: StairElement[];
  floorHeight: number;
  viewHeight: number;
  settings: View3DSettings;
  matProps: any;
  texture: THREE.Texture | null;
  repeatScale: number;
}

export const FloorContent: React.FC<Props> = ({
  floorIndex,
  roundedCorners = [],
  normalWalls,
  windows,
  doors,
  openings = [], // ✅ قيمة افتراضية لمنع انهيار التطبيق إذا لم تُمرر
  columns,
  stairs,
  stairElements,
  floorHeight,
  viewHeight,
  settings,
  matProps,
  texture,
  repeatScale,
}) => {
  const isCut = viewHeight < floorHeight - 0.001;

  const fWalls = React.useMemo(() => normalWalls.filter(w => (w.floor ?? 0) === floorIndex), [normalWalls, floorIndex]);
  const fWindows = React.useMemo(() => windows.filter(w => (w.floor ?? 0) === floorIndex), [windows, floorIndex]);
  const fDoors = React.useMemo(() => doors.filter(d => (d.floor ?? 0) === floorIndex), [doors, floorIndex]);
  const fOpenings = React.useMemo(() => openings.filter(o => (o.floor ?? 0) === floorIndex), [openings, floorIndex]); // ✅ جديد
  const fColumns = columns.filter(c => (c.floor ?? 0) === floorIndex);
  const fStairs = stairs.filter(s => (s.floor ?? 0) === floorIndex);
  const fStairElements = stairElements.filter(el => (el.floor ?? 0) === floorIndex);
  const corners = React.useMemo(() => roundedCorners.flatMap(rc => {
    const a = fWalls.find(w=>w.id===rc.wallAId), b = fWalls.find(w=>w.id===rc.wallBId);
    if (!a || !b || a.curveRadius || b.curveRadius) return [];
    const g = computeCorner(a,b,rc.radius,p=>p,1,1);
    return g ? [{rc,a,b,g}] : [];
  }), [roundedCorners, fWalls]);
  // Trim only the rendered boxes; original wall and opening coordinates stay unchanged.
  const trimBox = (wall:Wall, box:WallBox):WallBox[] => {
    const len=Math.hypot(wall.end.x-wall.start.x,wall.end.y-wall.start.y);
    if(len<1e-8)return [box];
    const ux=(wall.end.x-wall.start.x)/len, uz=(wall.end.y-wall.start.y)/len;
    const along=(p:{x:number;y:number})=>(p.x-wall.start.x)*ux+(p.y-wall.start.y)*uz;
    let lo=0,hi=len, affected=false;
    for(const c of corners){
      const tangent=c.a.id===wall.id?c.g.tangentA:c.b.id===wall.id?c.g.tangentB:null;
      if(!tangent)continue;
      affected=true;
      if(along(c.g.O)<len/2)lo=Math.max(lo,along(tangent));else hi=Math.min(hi,along(tangent));
    }
    if(!affected)return [box];
    const mid=along({x:box.position[0],y:box.position[2]});
    const l=Math.max(lo,mid-box.size[0]/2),r=Math.min(hi,mid+box.size[0]/2);
    if(r-l<1e-6)return [];
    const shift=(l+r)/2-mid;
    return [{...box,position:[box.position[0]+ux*shift,box.position[1],box.position[2]+uz*shift],size:[r-l,box.size[1],box.size[2]]}];
  };
  const buildingCentroid = React.useMemo(() => {
  if (fWalls.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0, count = 0;
  for (const w of fWalls) {
    sx += w.start.x + w.end.x;
    sy += w.start.y + w.end.y;
    count += 2;
  }
  return { x: sx / count, y: sy / count };
}, [fWalls]);

  const doorElevations = React.useMemo(() => Object.fromEntries(fDoors.map(door=>[door.id, (door.doorType ?? 'regular') === 'shop' ? settings.shopDoorElevation ?? 0.15 : (door.doorType ?? 'regular') === 'main' ? settings.mainDoorElevation ?? 0.15 : 0])), [fDoors,settings.shopDoorElevation,settings.mainDoorElevation]);
  const getDoorElevation = (door:Door):number => doorElevations[door.id] ?? 0;

  return (
    <>
      {/* 1 — الجدران */}
      {(() => {
        return fWalls.flatMap((wall) => {
          if (wall.curveRadius) {
            return [(
              <CurvedWallMesh
                key={`curved-${wall.id}`}
                wall={wall}
                height={viewHeight}
                matProps={matProps}
                texture={texture}
                repeatScale={repeatScale}
                isCut={isCut}
                cutColor={settings.cutSectionColor ?? '#B0B0B0'}
                windows={fWindows}     // ✅ جديد
                openings={fOpenings}   // ✅ جديد
                doors={fDoors}
                doorElevations={doorElevations}
              />
            )];
          }

          // ✅ تمرير fOpenings كمعامل سابع
          const boxes = splitWallByOpenings(
            wall, fWindows, fDoors, floorHeight, viewHeight,
            doorElevations, fOpenings,
          );

          return boxes.flatMap(box=>trimBox(wall,box)).map((box, idx) => (
            <WallMesh
              key={`${wall.id}-${idx}`}
              wall={wall}
box={box}
              matProps={matProps}
              texture={texture}
              repeatScale={repeatScale}
              isCut={isCut}
              cutColor={settings.cutSectionColor ?? '#B0B0B0'}
            />
          ));
        });
      })()}

      {corners.map(({rc,g,a,b})=><RoundedCornerMesh key={rc.id} g={g} height={viewHeight} exterior={a.type==='exterior'||b.type==='exterior'} matProps={matProps} texture={texture} repeatScale={repeatScale} isCut={isCut} cutColor={settings.cutSectionColor ?? '#B0B0B0'}/>)}
      {/* 2 — حشو القوس للنوافذ */}
      {settings.windowStyle === 'arch' && fWindows.map((win) => {
        const wall = fWalls.find((w) => w.id === win.wallId);
        if (!wall) return null;
        return (
          <ArchWallFiller
            key={`arch-filler-${win.id}`}
            wall={wall}
            win={win}
            viewHeight={viewHeight}
            texture={texture}
repeatScale={repeatScale}
matProps={matProps}
            isInterior={wall.type === 'interior'}
          />
        );
      })}

      {/* 3 — الكورنيش للنوافذ */}
      {settings.showCornice && fWindows.map((win) => {
        const wall = fWalls.find((w) => w.id === win.wallId);
        if (!wall) return null;
        return (
          <WindowCornice
            key={`cornice-${win.id}`}
            wall={wall}
            window={win}
            color={settings.corniceColor}
            style={settings.windowStyle}
            visible={settings.showCornice}
            buildingCentroid={buildingCentroid}
          />
        );
      })}

      {/* 4 — النوافذ */}
      {fWindows.map((win) => {
        const wall = fWalls.find((w) => w.id === win.wallId);
        if (!wall) return null;
        return (
          <Window3D
            key={win.id}
            wall={wall}
            window={win}
            frameColor={settings.windowFrameColor}
            glassColor={settings.windowGlassColor}
            glassOpacity={settings.windowGlassOpacity}
            style={settings.windowStyle}
            sashCols={settings.windowSashCols}
            sashRows={settings.windowSashRows}
          />
        );
      })}

      {/* 5 — الأبواب */}
      {fDoors.map((door) => {
        const wall = fWalls.find((w) => w.id === door.wallId);
        if (!wall) return null;
        return (
          <Door3D
            key={door.id}
            wall={wall}
            door={door}
            color={settings.doorColor}
            openAngleDeg={settings.doorOpenAngle}
            mainDoorFrameColor={settings.mainDoorFrameColor}
            mainDoorSheetColor={settings.mainDoorSheetColor}
            mainDoorPatternColor={settings.mainDoorPatternColor}
            shopDoorColor={settings.shopDoorColor}
            shopDoorSlatCount={settings.shopDoorSlatCount}
            shopBaseColor={settings.shopBaseColor}
            windowFrameColor={settings.windowFrameColor}
            windowGlassColor={settings.windowGlassColor}
            windowGlassOpacity={settings.windowGlassOpacity}
            elevation={getDoorElevation(door)}
          />
        );
      })}

      {/* 5b — حشو الجدار حول الأبواب الرئيسية */}
      {fDoors
        .filter(d => (d.doorType ?? 'regular') === 'main')
        .map((door) => {
          const wall = fWalls.find((w) => w.id === door.wallId);
          if (!wall) return null;
          return (
            <MainDoorWallFiller
              key={`main-filler-${door.id}`}
              wall={wall}
              door={door}
              texture={texture}
repeatScale={repeatScale}
matProps={matProps}
              isInterior={wall.type === 'interior'}
              elevation={getDoorElevation(door)}
            />
          );
        })}

      {/* 5c — كورنيش الأبواب الرئيسية */}
      {settings.showCornice && fDoors
        .filter(d => (d.doorType ?? 'regular') === 'main')
        .map((door) => {
          const wall = fWalls.find((w) => w.id === door.wallId);
          if (!wall) return null;
          return (
            <MainDoorCornice
              key={`main-cornice-${door.id}`}
              wall={wall}
              door={door}
              color={settings.corniceColor}
              visible={settings.showCornice}
              elevation={getDoorElevation(door)}
            />
          );
        })}

      {/* 6 — الأعمدة */}
      {fColumns.map((col) => (
        <Column3D
          key={col.id}
          column={col}
          height={viewHeight}
          bodyColor={settings.wallColor}
          cutColor={settings.cutSectionColor ?? '#B0B0B0'}
          isCut={isCut}
        />
      ))}

      {/* 7 — السلالم القديمة */}
      {fStairs.map((s) => (
        <Stair3D key={s.id} stair={s} floorHeight={floorHeight} />
      ))}

      {/* 8 — عناصر السلم المتعدد */}
      {fStairElements.map((el) => (
        <StairElement3D key={el.id} element={el} />
      ))}
    </>
  );
};
