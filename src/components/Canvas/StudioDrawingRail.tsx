
import React,{useState} from 'react';
import {StudioIcon} from '../Toolbar/StudioIcon';
import type {StudioIconName} from '../Toolbar/StudioIcon';
import type {AppMode,DrawingType} from '../../core/types';
interface Props{mode:AppMode;drawingType:DrawingType;onStartDrawing:(type:DrawingType)=>void;onCurvedWall:()=>void;onBoundary:()=>void;onHelperLine:()=>void;onFence:()=>void;onStairs:()=>void;onDimensions:()=>void;onAxes:()=>void;onCancel:()=>void;
               showFloorsPanel: boolean;
onToggleFloorsPanel: () => void;}
type Tool={id:string;label:string;icon:StudioIconName;action:()=>void;active?:boolean};
export const StudioDrawingRail:React.FC<Props>=p=>{
const [expanded,setExpanded]=useState(true);
const drawing=(type:DrawingType)=>p.mode==='drawing'&&p.drawingType===type;
const tools:Tool[]=[
{id:'select',label:'تحديد',icon:'square',action:p.onCancel,active:p.mode==='view'},
{id:'exterior',label:'جدار خارجي',icon:'wall',action:()=>p.onStartDrawing('exterior'),active:drawing('exterior')},
{id:'interior',label:'جدار داخلي',icon:'wall',action:()=>p.onStartDrawing('interior'),active:drawing('interior')},
{id:'curved',label:'جدار منحني',icon:'arc',action:p.onCurvedWall,active:drawing('curved-wall')},
{id:'boundary',label:'حدود الأرض',icon:'square',action:p.onBoundary,active:drawing('land-boundary')},
{id:'helper',label:'خط مساعد',icon:'pencil',action:p.onHelperLine,active:drawing('helper-line')},
{id:'fence',label:'سور الحدود',icon:'layers',action:p.onFence},
{id:'stairs',label:'السلالم',icon:'stairs',action:p.onStairs},
{id:'dimensions',label:'الأبعاد',icon:'ruler',action:p.onDimensions},
{id:'axes',label:'المحاور',icon:'grid',action:p.onAxes},
  {
  id: 'floors',
  label: 'الأدوار',
  icon: 'layers',
  action: p.onToggleFloorsPanel,
  active: p.showFloorsPanel
  }
];

return <aside className={'studio-drawing-rail'+(expanded?'':' is-collapsed')} dir="rtl" aria-label="أدوات الرسم السريعة" onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onPointerCancel={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
  
<button type="button" className="studio-rail-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} title={expanded?'طي أدوات الرسم':'إظهار أدوات الرسم'}><StudioIcon name="pencil" size={18}/><span>رسم</span><StudioIcon name="chevron" size={13}/></button>
{expanded&&<div className="studio-rail-tools" role="group" aria-label="أوامر الرسم" >{tools.map(t=><button key={t.id} type="button" title={t.label} aria-label={t.label} aria-pressed={t.active===undefined?undefined:t.active} className={'studio-rail-tool'+(t.active?' is-active':'')} onClick={t.action}><StudioIcon name={t.icon} size={20}/><span>{t.label}</span></button>)}</div>}
</aside>;
};
