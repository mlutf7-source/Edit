import React, { useState } from 'react';
import type { Wall } from '../../core/types';
import { ApprovedFloorsSummary } from './ApprovedFloorsSummary';
import { SectionTitle } from './summaryComponents';
import { formatQuantity } from './quantityFormat';

type Props = { walls: Wall[]; floorHeights: number[]; projectId: string };
const floorName = (i: number) => i === 0 ? 'الدور الأرضي' : `الدور ${i}`;
const allFloors = (count: number) => Array.from({ length: count }, (_, i) => i);
const storageKey = (id: string) => `qty_summary_floors_${id}`;
function readSelection(id: string, count: number): number[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (raw === null) return allFloors(count);
    const value: unknown = JSON.parse(raw);
    if (value === 'all') return allFloors(count);
    if (Array.isArray(value)) return [...new Set(value.filter((i): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < count))].sort((a,b)=>a-b);
  } catch { /* use default */ }
  return allFloors(count);
}
const SummaryContent: React.FC<Props> = ({ walls, floorHeights, projectId }) => {
  const count = floorHeights.length;
  const [selected, setSelected] = useState(() => readSelection(projectId, count));
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const update = (next: number[]) => {
    const sorted = [...new Set(next)].sort((a,b)=>a-b);
    setSelected(sorted);
    try { localStorage.setItem(storageKey(projectId), JSON.stringify(sorted.length === count ? 'all' : sorted)); setSaveError(false); }
    catch { setSaveError(true); }
  };
  const all = count > 0 && selected.length === count;
  const ext = (walls || []).filter(w => (!w.kind || w.kind === 'wall') && w.type === 'exterior');
  const points = ext.flatMap(w => [w.start,w.end]);
  const area = points.length ? (Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))) : 0;
  const fieldStyle: React.CSSProperties = { width:'100%', boxSizing:'border-box', padding:8, border:'1px solid #8090a066', borderRadius:8, background:'transparent', color:'inherit', fontFamily:'inherit' };
  return <div dir="rtl" style={{display:'flex',flexDirection:'column',gap:12}}>
    <SectionTitle>بيانات المشروع</SectionTitle>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
      {([['name','اسم المشروع'],['owner','المالك'],['engineer','المهندس']] as const).map(([key,label])=><label key={key}>{label}<input style={fieldStyle} defaultValue={localStorage.getItem(`qty_summary_${projectId}_${key}`) ?? ''} onBlur={e=>{try{localStorage.setItem(`qty_summary_${projectId}_${key}`,e.target.value);}catch{setSaveError(true);}}}/></label>)}
      <label>مساحة المشروع (تقديرية)<input style={fieldStyle} readOnly value={`${formatQuantity(area)} م²`}/></label>
    </div>
    <div style={{position:'relative'}}>
      <label>الأدوار المطلوبة</label>
      <button type="button" style={{...fieldStyle,textAlign:'right'}} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{all?'كل الأدوار':selected.length===1?floorName(selected[0]):selected.length?`${selected.length} أدوار محددة`:'اختر الأدوار'} ▾</button>
      {open && <div style={{...fieldStyle,display:'grid',gap:8}}>
        <label><input type="checkbox" checked={all} disabled={!count} onChange={e=>update(e.target.checked?allFloors(count):[])}/> كل الأدوار</label>
        {allFloors(count).map(i=><label key={i}><input type="checkbox" checked={selected.includes(i)} onChange={e=>update(e.target.checked?[...selected,i]:selected.filter(x=>x!==i))}/> {floorName(i)}</label>)}
        <button type="button" style={fieldStyle} onClick={()=>setOpen(false)}>تم الاختيار</button>
      </div>}
    </div>
    {saveError && <p role="status">تعذر حفظ بعض إعدادات الملخص على الجهاز.</p>}
    <ApprovedFloorsSummary projectId={projectId} floorHeights={floorHeights} selectedFloors={selected}/>
  </div>;
};
export const SummaryPage: React.FC<Props> = props => <SummaryContent key={`${props.projectId}:${props.floorHeights.length}`} {...props}/>;
