import { structureDetailRows } from './workDetailRows';
import { TableDetailsToggle } from './TableDetailsToggle';
import React, { useEffect, useState } from 'react';
import { StructureInputs } from './StructureInputs';
import { StructureTables } from './StructureTables';
import type { Wall, Column } from '../../core/types';
import { distance } from '../../core/geometry';
import { allocateCalculatedStructureByFloor, type StructureRecord } from './structureFloorAllocation';

interface Props {
  walls: Wall[];
  columns: Column[];
  projectId: string;
  floorHeights: number[];
  }

export const StructurePage: React.FC<Props> = ({ walls, columns, projectId, floorHeights }) => {
  const drawnCount = Math.max(1, floorHeights.length);
  const [designFloors, setDesignFloors] = useState(4);
  const [buildOverride, setBuildOverride] = useState<{ projectId: string; value: number } | null>(null);
  const buildFloors = buildOverride?.projectId === projectId ? buildOverride.value : drawnCount;
  const setBuildFloors = (value: number) => setBuildOverride({ projectId, value });
  const [results, setResults] = useState<StructureRecord | null>(null);
  useEffect(() => {
    setBuildOverride(null);
    setDesignFloors(4);
    try {
      const saved = localStorage.getItem(`qty_structure_${projectId}`);
      const record: StructureRecord | null = saved ? JSON.parse(saved) : null;
      setResults(record);
      if (record?.buildFloorsManual === true && Number.isInteger(record.buildFloors) && record.buildFloors! > 0) {
        setBuildOverride({ projectId, value: record.buildFloors! });
      }
      if (Number.isInteger(record?.designFloors) && record!.designFloors! > 0) setDesignFloors(record!.designFloors!);
    } catch { setResults(null); }
  }, [projectId]);

const [error, setError] = useState('');
const calculate = () => {
  setError('');
  const DF = designFloors, BF = buildFloors;
  if (!Number.isInteger(DF) || DF < 1 || !Number.isInteger(BF) || BF < 1) {
    setError('تحقق من عدد أدوار التصميم والتنفيذ.'); return;
  }
  const effectiveDesignFloors = Math.max(DF, BF);
  const colW = effectiveDesignFloors <= 2 ? 0.25 : effectiveDesignFloors <= 4 ? 0.30 : 0.35;
  const colL = effectiveDesignFloors <= 2 ? 0.60 : effectiveDesignFloors <= 4 ? 0.70 : 0.80;
  const geometry = Array.from({length: floorHeights.length}, (_, floor) => {
    const realWalls = walls.filter(w => (w.floor ?? 0) === floor && (!w.kind || w.kind === 'wall'));
    const ext = realWalls.filter(w => w.type === 'exterior');
    const points = ext.flatMap(w => [w.start, w.end]);
    const area = points.length ? (Math.max(...points.map(p => p.x))-Math.min(...points.map(p => p.x))) * (Math.max(...points.map(p => p.y))-Math.min(...points.map(p => p.y))) : 0;
    const drawn = columns.filter(c => (c.floor ?? 0) === floor);
    const height = floorHeights[floor];
    const columnArea = drawn.length ? drawn.reduce((sum,c) => sum + (c.columnShape === 'circle' ? Math.PI*c.width*c.width/4 : c.width*c.length),0) : Math.ceil(area/9)*colW*colL;
    return {floor, area, height, columnArea, wallLength: realWalls.reduce((sum,w)=>sum+distance(w.start,w.end),0)};
  });
  if (!geometry.length || geometry.some(g => !Number.isFinite(g.area) || g.area <= 0 || !Number.isFinite(g.height) || g.height <= 0 || !Number.isFinite(g.columnArea) || g.columnArea <= 0)) {
    setError('لا تتوفر مساحة خارجية أو ارتفاع أو أبعاد أعمدة صحيحة لكل دور مطلوب.'); return;
  }
  const ground = geometry[0];
  const footingConcrete = ground.area * 1.5 * effectiveDesignFloors / 20 * 0.5;
  const neckConcrete = ground.columnArea * 1.5;
  const middConcrete = ground.wallLength * 0.27 * 0.4;
  const foundations = {footingConcrete, footingSteel: footingConcrete * 0.090, neckConcrete, neckSteel: neckConcrete * 0.150, middConcrete, middSteel: ground.wallLength*7/12/52 + ground.wallLength*1.3*6/12/200};
  const quantities = (g: typeof ground, floor = g.floor) => ({floor, columnConcrete:g.columnArea*g.height, columnSteel:g.columnArea*g.height*0.150, slabConcrete:g.area*0.22, slabSteel:g.area/30, slabGrossVolume:g.area*0.3});
  // Allocations are exclusively for drawn floors, independent of the estimate count.
  const floorAllocations = allocateCalculatedStructureByFloor(foundations, geometry.map(g => quantities(g)));
  if (!floorAllocations) { setError('تعذر حساب كميات الأدوار.'); return; }
  // Additional undrawn floors use the last drawn floor as an explicit estimate.
  const estimateGeometry = geometry.slice(0, BF);
  const extra = Math.max(0, BF - geometry.length);
  const last = quantities(geometry[geometry.length - 1]);
  const sum = (key: 'columnConcrete'|'columnSteel'|'slabConcrete'|'slabSteel') => estimateGeometry.reduce((v,g)=>v+quantities(g)[key],0) + extra*last[key];
  const columnConcrete = sum('columnConcrete'), columnSteel = sum('columnSteel');
  const slabConcrete = sum('slabConcrete'), slabSteel = sum('slabSteel');
  const record: StructureRecord = {...foundations, columnConcrete, columnSteel, slabConcrete, slabSteel,
    totalConcrete: footingConcrete + neckConcrete + middConcrete + columnConcrete + slabConcrete,
    totalSteel: foundations.footingSteel + foundations.neckSteel + foundations.middSteel + columnSteel + slabSteel,
    buildFloors:BF, designFloors:DF, buildFloorsManual: buildOverride?.projectId === projectId,
    floorAllocations, allocationMethod:'independent-floor-estimate-v1'};
  setResults(record);
  localStorage.setItem('structure_results', JSON.stringify(record));
  localStorage.setItem(`qty_structure_${projectId}`, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent('qty-approval-changed', { detail: { projectId } }));
};

return (
<div style={{ padding: 12 }}>
<StructureInputs
designFloors={designFloors}
buildFloors={buildFloors}
onDesignFloorsChange={setDesignFloors}
onBuildFloorsChange={setBuildFloors}
onCalculate={calculate}
/>

{error && <p role="alert">{error}</p>}
{results && (
<>
<TableDetailsToggle title="الخرسانة والهيكل" rows={structureDetailRows(results)}><StructureTables results={results} /></TableDetailsToggle>
        <p style={{ fontSize: 12, opacity: 0.8 }}>
          {results.allocationMethod === 'independent-floor-estimate-v1'
 ? 'تم حساب أدوار المسقط مستقلة. الأدوار الإضافية غير المرسومة تقدّر وفق آخر دور مرسوم. يعتمد تقدير الأساسات على الأكبر من عددي التصميم والبناء. مساحة السقف تقديرية.'
 : 'هذه نتائج قديمة؛ أعد الحساب لتحديث كميات كل دور.'}
</p>
</>
)}
</div>
);
};
