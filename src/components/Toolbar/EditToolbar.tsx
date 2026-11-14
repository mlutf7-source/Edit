
import React from 'react';
import type {LockOptions} from '../../core/types';
interface Props{
visible:boolean;lock:LockOptions;
onDelete:()=>void;onCopy:()=>void;
onToggleDir:()=>void;onToggleLen:()=>void;
onToggleMove:()=>void;onDeselect:()=>void;
}
const button:React.CSSProperties={display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px 11px',border:'1px solid #cbd5e1',borderRadius:8,background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',minHeight:36};
const active:React.CSSProperties={...button,background:'#dbeafe',borderColor:'#60a5fa',color:'#1d4ed8'};
const label:React.CSSProperties={fontSize:11,fontWeight:700,color:'#64748b',padding:'0 4px',whiteSpace:'nowrap'};
const group:React.CSSProperties={display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',padding:'5px 7px',border:'1px solid #e2e8f0',borderRadius:10,background:'#fff'};
export const EditToolbar:React.FC<Props>=({visible,lock,onDelete,onCopy,onToggleDir,onToggleLen,onToggleMove,onDeselect})=>{
if(!visible)return null;
return(
<div className="edit-studio-edit-toolbar" dir="rtl" style={{display:'flex',alignItems:'center',gap:7,padding:'8px',flexWrap:'wrap',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:11,boxShadow:'0 2px 8px #0000000a'}}>
<div style={group}>
<span style={label}>التعديل</span>
<button type="button" title="إنشاء نسخة من العنصر المحدد" style={{...button,background:'#eff6ff',borderColor:'#bfdbfe',color:'#1d4ed8'}} onClick={onCopy}>📋 نسخ</button>
</div>
<div style={group}>
<span style={label}>القيود</span>
<button type="button" aria-pressed={lock.direction} title="تفعيل أو إلغاء قفل الاتجاه" style={lock.direction?active:button} onClick={onToggleDir}>📐 الاتجاه {lock.direction?'✓':''}</button>
<button type="button" aria-pressed={lock.length} title="تفعيل أو إلغاء قفل الطول" style={lock.length?active:button} onClick={onToggleLen}>📏 الطول {lock.length?'✓':''}</button>
<button type="button" aria-pressed={lock.move} title="تفعيل أو إلغاء قفل التحريك" style={lock.move?active:button} onClick={onToggleMove}>🔒 التحريك {lock.move?'✓':''}</button>
</div>
<div style={{...group,marginInlineStart:'auto'}}>
<span style={label}>التحديد</span>
<button type="button" title="إلغاء تحديد العنصر الحالي" style={{...button,background:'#f1f5f9'}} onClick={onDeselect}>✕ إلغاء التحديد</button>
<button type="button" title="حذف العنصر المحدد" style={{...button,background:'#fef2f2',borderColor:'#fecaca',color:'#b91c1c'}} onClick={onDelete}>🗑 حذف</button>
</div>
</div>
);
};
