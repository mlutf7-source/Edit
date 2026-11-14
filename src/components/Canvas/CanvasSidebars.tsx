
import React from 'react';
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
}
const base:React.CSSProperties={width:39,height:39,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #d4dfeb',borderRadius:9,background:'#fff',color:'#334155',fontSize:18,cursor:'pointer',boxShadow:'0 1px 3px #0000000d'};
const active:React.CSSProperties={...base,background:'#dbeafe',borderColor:'#60a5fa',color:'#1d4ed8'};
const danger:React.CSSProperties={...base,background:'#fef2f2',borderColor:'#fecaca',color:'#b91c1c'};
const panel:React.CSSProperties={position:'absolute',top:8,display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:6,zIndex:20,border:'1px solid #dce5ef',borderRadius:12,background:'rgba(255,255,255,.96)',boxShadow:'0 4px 15px #00000012'};
const separator:React.CSSProperties={width:27,height:1,background:'#dce5ef',margin:'3px 0'};
const copyTypes=['wall','column','window','door','opening','text','stair','stairElement','dimension','axis'];
export const CanvasSidebars:React.FC<Props>=React.memo(p=>{
const selected=p.selectedType;
const canCopy=selected!==null&&copyTypes.includes(selected);
const deletes:Partial<Record<NonNullable<Props['selectedType']>,()=>void>>={
wall:p.onDeleteWall,column:p.onDeleteColumn,window:p.onDeleteWindow,
door:p.onDeleteDoor,opening:p.onDeleteOpening,dimension:p.onDeleteDimension,
text:p.onDeleteText,region:p.onDeleteRegion,stair:p.onDeleteStair,
stairElement:p.onDeleteStairElement,axis:p.onDeleteAxis
};
const button=(title:string,icon:string,action:()=>void,style:React.CSSProperties=base,pressed?:boolean)=>(
<button type="button" title={title} aria-label={title} aria-pressed={pressed} onClick={action} style={style}>{icon}</button>
);
const stop=(e:React.PointerEvent)=>e.stopPropagation();
return <>
{p.showRightSidebar&&<div className="edit-studio-canvas-panel" dir="rtl" style={{...panel,right:8}} onPointerDown={stop} onPointerUp={stop}>
<span className="edit-studio-panel-label" style={{fontSize:10,fontWeight:700,color:'#64748b'}}>القيود</span>
{button('قفل الاتجاه','📐',p.onToggleLockDirection,p.lockOptions.direction?active:base,p.lockOptions.direction)}
{button('قفل الطول','📏',p.onToggleLockLength,p.lockOptions.length?active:base,p.lockOptions.length)}
{button('قفل التحريك','🔒',p.onToggleLockMove,p.lockOptions.move?active:base,p.lockOptions.move)}
</div>}
{p.showLeftSidebar&&<div className="edit-studio-canvas-panel" dir="rtl" style={{...panel,left:8}} onPointerDown={stop} onPointerUp={stop}>
<span className="edit-studio-panel-label" style={{fontSize:10,fontWeight:700,color:'#64748b'}}>التعديل</span>
{canCopy&&button('نسخ العنصر بمسافة واتجاه','📋',p.onCopySelected,{...active,background:'#eff6ff'})}
{canCopy&&button('تحريك العنصر بمسافة واتجاه','✥',p.onMoveSelected,{...active,background:'#e0f2fe',color:'#0369a1'})}
{selected!==null&&<div style={separator}/>}
{selected!==null&&deletes[selected]&&button('حذف العنصر المحدد','🗑',deletes[selected]!,danger)}
{button('إلغاء التحديد','✕',p.onDeselectAll,{...base,background:'#f1f5f9'})}
</div>}
</>;
});
                                                                                
