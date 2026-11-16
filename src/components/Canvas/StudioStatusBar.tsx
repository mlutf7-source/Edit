import React from 'react';
import {StudioIcon} from '../Toolbar/StudioIcon';
interface Props{zoom:number;offsetX:number;offsetY:number;showGrid:boolean;mode:string;onZoomIn:()=>void;onZoomOut:()=>void;onReset:()=>void;onToggleGrid:()=>void;}
export const StudioStatusBar:React.FC<Props>=React.memo(p=>{
const percent=Number.isFinite(p.zoom)?Math.round(p.zoom*100):100;
const coordinate=(value:number)=>Number.isFinite(value)?value.toFixed(2):'—';
const modeLabel=p.mode==='edit'?'التعديل':p.mode==='view'?'العرض':'الرسم';
return <div className="studio-status-bar" dir="ltr" role="toolbar" aria-label="شريط حالة مساحة الرسم" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>
<div className="studio-status-zoom" role="group" aria-label="التحكم بالتكبير والتصغير">
<output className="studio-zoom-value" aria-label="نسبة التكبير الحالية" aria-live="off">{percent}%</output>
<button type="button" onClick={p.onZoomIn} title="تكبير" aria-label="تكبير"><StudioIcon name="plus" size={18}/></button>
<button type="button" onClick={p.onZoomOut} title="تصغير" aria-label="تصغير"><StudioIcon name="minus" size={18}/></button>
<button type="button" onClick={p.onReset} title="إعادة ضبط العرض" aria-label="إعادة ضبط العرض"><StudioIcon name="square" size={17}/></button>
</div>
<div className="studio-status-coordinates" dir="ltr" aria-label="إحداثيات إزاحة العرض"><span>X: {coordinate(p.offsetX)}</span><span>Y: {coordinate(p.offsetY)}</span></div>
<div className="studio-status-grid" dir="rtl" role="group" aria-label="إعدادات الشبكة">
<button type="button" className={'studio-grid-switch'+(p.showGrid?' is-on':'')} onClick={p.onToggleGrid} role="switch" aria-checked={p.showGrid} aria-label="إظهار أو إخفاء الشبكة" title={p.showGrid?"إخفاء الشبكة":"إظهار الشبكة"}><span/></button>
<span>الشبكة</span><StudioIcon name="grid" size={19}/>
</div>
<div className="studio-status-mode" dir="rtl" role="status" aria-label="وضع العمل الحالي"><StudioIcon name="pencil" size={17}/><span>حالة الرسم: {modeLabel}</span></div>
</div>;
});
