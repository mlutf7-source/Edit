
import React from 'react';
import {StudioIcon} from '../Toolbar/StudioIcon';
interface Props{zoom:number;offsetX:number;offsetY:number;showGrid:boolean;mode:string;onZoomIn:()=>void;onZoomOut:()=>void;onReset:()=>void;onToggleGrid:()=>void;}
export const StudioStatusBar:React.FC<Props>=React.memo(p=>{
const percent=Math.round(p.zoom*100);
const modeLabel=p.mode==='edit'?'التعديل':p.mode==='view'?'العرض':'الرسم';
return <div className="studio-status-bar" dir="ltr" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>
<div className="studio-status-zoom">
<span className="studio-zoom-value">{percent}%</span>
<button type="button" onClick={p.onZoomIn} title="تكبير" aria-label="تكبير"><StudioIcon name="plus" size={18}/></button>
<button type="button" onClick={p.onZoomOut} title="تصغير" aria-label="تصغير"><StudioIcon name="minus" size={18}/></button>
<button type="button" onClick={p.onReset} title="إعادة ضبط العرض" aria-label="إعادة ضبط العرض"><StudioIcon name="square" size={17}/></button>
</div>
<div className="studio-status-coordinates" dir="ltr"><span>X: {p.offsetX.toFixed(2)}</span><span>Y: {p.offsetY.toFixed(2)}</span></div>
<div className="studio-status-grid" dir="rtl">
<button type="button" className={'studio-grid-switch'+(p.showGrid?' is-on':'')} onClick={p.onToggleGrid} role="switch" aria-checked={p.showGrid} aria-label="إظهار أو إخفاء الشبكة"><span/></button>
<span>الشبكة</span><StudioIcon name="grid" size={19}/>
</div>
<div className="studio-status-mode" dir="rtl"><StudioIcon name="pencil" size={17}/><span>حالة الرسم: {modeLabel}</span></div>
</div>;
});
