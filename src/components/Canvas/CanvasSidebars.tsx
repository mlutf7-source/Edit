
import React from 'react';
import {StudioIcon} from '../Toolbar/StudioIcon';
import type {StudioIconName} from '../Toolbar/StudioIcon';
import { FloorControls } from './FloorControls';
interface Props{
showRightSidebar:boolean;showLeftSidebar:boolean;
lockOptions:{direction:boolean;length:boolean;move:boolean};
onToggleLockDirection:()=>void;onToggleLockLength:()=>void;onToggleLockMove:()=>void;
onDeleteWall:()=>void;onCopyWall:()=>void;onMoveWall:()=>void;
onCopySelected:()=>void;onMoveSelected:()=>void;
onDeleteColumn:()=>void;onDeleteWindow:()=>void;onDeleteDoor:()=>void;
onDeleteOpening:()=>void;onDeleteDimension:()=>void;
onCopyText:()=>void;onDeleteText:()=>void;onDeleteRegion:()=>void;
onDeleteStair:()=>void;onDeleteStairElement:()=>void;onCopyStairElement:()=>void;
onDeleteAxis:()=>void;onDeselectAll:()=>void;
selectedType:'wall'|'column'|'window'|'door'|'opening'|'dimension'|'text'|'region'|'stair'|'stairElement'|'axis'|null;
onCopyAxis?:()=>void;
  activeFloor:number;
maxFloor:number;
  showFloorsPanel: boolean;
showPreviousFloor:boolean;
onSetActiveFloor:(floor:number)=>void;
onAddFloor:()=>void;
onCopyFloor:()=>void;
onDeleteFloor:(floor:number)=>void;
onTogglePreviousFloor:()=>void;
floorHeights:number[];
onSetFloorHeight:(floor:number,height:number)=>void;
}
type Action={label:string;icon:StudioIconName;onClick:()=>void;active?:boolean;danger?:boolean};
const names:Record<NonNullable<Props['selectedType']>,string>={wall:'جدار',column:'عمود',window:'نافذة',door:'باب',opening:'فتحة',dimension:'بعد',text:'نص',region:'منطقة',stair:'سلم',stairElement:'عنصر سلم',axis:'محور'};
export const CanvasSidebars:React.FC<Props>=React.memo(p=>{
const selected=p.selectedType;
const deletes:Partial<Record<NonNullable<Props['selectedType']>,()=>void>>={wall:p.onDeleteWall,column:p.onDeleteColumn,window:p.onDeleteWindow,door:p.onDeleteDoor,opening:p.onDeleteOpening,dimension:p.onDeleteDimension,text:p.onDeleteText,region:p.onDeleteRegion,stair:p.onDeleteStair,stairElement:p.onDeleteStairElement,axis:p.onDeleteAxis};
const copyable=selected!==null&&['wall','column','window','door','opening','text','stair','stairElement','dimension','axis'].includes(selected);
const editable=selected!==null&&['wall','column','window','door','opening','text','stair','stairElement','dimension','axis'].includes(selected);
const editActions:Action[]=[
...(copyable?[{label:'نسخ',icon:'copy' as const,onClick:p.onCopySelected}]:[]),
...(editable?[{label:'تحريك',icon:'move' as const,onClick:p.onMoveSelected}]:[]),
...(selected&&deletes[selected]?[{label:'حذف',icon:'trash' as const,onClick:deletes[selected]!,danger:true}]:[]),
{label:'إلغاء التحديد',icon:'deselect',onClick:p.onDeselectAll}
];
const lockActions:Action[]=[
{label:'قفل الاتجاه',icon:'compass',onClick:p.onToggleLockDirection,active:p.lockOptions.direction},
{label:'قفل الطول',icon:'ruler',onClick:p.onToggleLockLength,active:p.lockOptions.length},
{label:'قفل التحريك',icon:'lock',onClick:p.onToggleLockMove,active:p.lockOptions.move}
];
const renderButton=(a:Action)=><button key={a.label} type="button" title={a.label} aria-label={a.label} aria-pressed={a.active===undefined?undefined:a.active} className={'studio-side-action'+(a.active?' is-active':'')+(a.danger?' is-danger':'')} onClick={a.onClick}><StudioIcon name={a.icon} size={20}/><span>{a.label}</span></button>;
const stop=(e:React.PointerEvent)=>e.stopPropagation();

return <>
{selected && p.showLeftSidebar&&<aside className="studio-floating-side studio-floating-edit" aria-label="أدوات التعديل" onPointerDown={stop} onPointerUp={stop}>
<div className="studio-side-heading">تعديل</div>
{editActions.map(renderButton)}
</aside>}
{selected && p.showRightSidebar&&<aside className="studio-floating-side studio-floating-properties" aria-label="قيود العنصر" onPointerDown={stop} onPointerUp={stop}>
<div className="studio-side-heading">خصائص</div>
<div className="studio-side-selected" title={selected ? names[selected] : ''}>{selected ? names[selected] : ''}</div>
{lockActions.map(renderButton)}
</aside>}
  
{p.showFloorsPanel && (
  <aside
    className="studio-floating-side studio-floating-floors"
    aria-label="إدارة الأدوار"
    onPointerDown={stop}
    onPointerMove={stop}
    onPointerUp={stop}
    onWheel={e => e.stopPropagation()}
  >
    <div className="studio-side-heading">
      <StudioIcon name="layers" size={20}/>
      <span>إدارة الأدوار</span>
    </div>

    <div className="studio-floors-content">
      <FloorControls
        activeFloor={p.activeFloor}
        maxFloor={p.maxFloor}
        showPreviousFloor={p.showPreviousFloor}
        onSetActiveFloor={p.onSetActiveFloor}
        onAddFloor={p.onAddFloor}
        onCopyFloor={p.onCopyFloor}
        onDeleteFloor={p.onDeleteFloor}
        onTogglePreviousFloor={p.onTogglePreviousFloor}
        floorHeights={p.floorHeights}
        onSetFloorHeight={p.onSetFloorHeight}
      />
    </div>
  </aside>
)}
  
</>;
});
