
import React,{useEffect,useState} from 'react';
import './editStudio.css';
import {DrawToolbar} from './DrawToolbar';
import {LayersPanel} from './LayersPanel';
import type {LayersState} from './LayersPanel';
import type {AppMode,DrawingType,Axis,Wall} from '../../core/types';
import {AxisDialog} from '../Axis/AxisDialog';
import {ColorPickerMenu} from './ColorPickerMenu';
import type {ColorTheme} from '../../core/colorTheme';
interface Props{
mode:AppMode;drawingType:DrawingType;onStartDrawing:(t:DrawingType)=>void;
onUndo:()=>void;onRedo:()=>void;historyLength:number;futureLength:number;
onAddAllDimensions:()=>void;onModeChange:(m:AppMode)=>void;
layers:LayersState;onToggleLayer:(l:keyof LayersState)=>void;
onToggleAllLayers:()=>void;allUnlocked:boolean;
dimensionFontSize:number;onDimensionFontSizeChange:(n:number)=>void;
onAddNorthArrow:()=>void;onAddAxes:(a:Axis[])=>void;
onAddAxesFromWalls:()=>void;onDeleteAllAxes:()=>void;axes:Axis[];
showGrid:boolean;onToggleGrid:()=>void;onDeleteAllDimensions:()=>void;
globalTextSize:number;onGlobalTextSizeChange:(n:number)=>void;
globalFontFamily:string;onGlobalFontFamilyChange:(s:string)=>void;
axisBubbleSize:number;onAxisBubbleSizeChange:(n:number)=>void;
onOpenMultiStairDialog:()=>void;
onSetDoorType:(t:'regular'|'main'|'shop')=>void;
onSetColumnShape:(s:'rect'|'circle')=>void;
onStartCurvedWall:()=>void;onStartDrawingBoundary:()=>void;
onStartDrawingHelperLine:()=>void;onBuildFenceOnBoundaries:()=>void;
onDeleteAllHelperLines:()=>void;onStartRoundCornerMode:()=>void;
onStartJoinWallsMode:()=>void;joinWallsMode?:boolean;
joinWallsCount?:number;onConfirmJoinWalls?:()=>void;
onCancelJoinWalls?:()=>void;onCurvedDimWallClick?:(w:Wall)=>void;
theme:ColorTheme;onColorChange:(k:keyof ColorTheme,v:string)=>void;
onResetColors:()=>void;
}
const btn:React.CSSProperties={padding:'8px 9px',border:'1px solid #c5d9ed',borderRadius:8,background:'#f4f8fd',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'};
const menu:React.CSSProperties={position:'absolute',top:'100%',right:0,zIndex:99999,minWidth:190,maxHeight:'65vh',overflowY:'auto',background:'#fff',border:'1px solid #ccd8e5',borderRadius:9,padding:6,boxShadow:'0 5px 15px #0002'};
const item:React.CSSProperties={padding:'8px',cursor:'pointer',fontSize:14,borderRadius:5};
const parse=(s:string,f:number)=>{const n=parseFloat(s.replace(',','.'));return Number.isFinite(n)?n:f;};
type MenuItem={label:string;run:()=>void;danger?:boolean};
export const TopToolbar:React.FC<Props>=(p)=>{
const [open,setOpen]=useState<string|null>(null);
const [axisDialog,setAxisDialog]=useState(false);
const [appearance,setAppearance]=useState<'light'|'dark'>(()=>{
try{return localStorage.getItem('edit-studio-appearance')==='dark'?'dark':'light';}catch{return 'light';}
});
useEffect(()=>{document.documentElement.dataset.editStudioTheme=appearance;try{localStorage.setItem('edit-studio-appearance',appearance);}catch{}},[appearance]);
const toggle=(s:string)=>setOpen(v=>v===s?null:s);
const run=(fn:()=>void)=>{fn();setOpen(null);};
const mode=(m:AppMode)=>run(()=>p.onModeChange(m));
const numberField=(label:string,value:number,change:(n:number)=>void,min=0,max=Infinity)=>(
<div style={{...item,display:'flex',alignItems:'center',gap:6}}>
<span>{label}</span>
<input type="text" inputMode="decimal" dir="ltr" key={`${label}-${value}`} defaultValue={String(value)}
onFocus={e=>e.target.select()} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
onBlur={e=>{const n=Math.min(max,Math.max(min,parse(e.target.value,value)));change(n);e.target.value=String(n);}}
style={{width:55,padding:4,border:'1px solid #ccd8e5',borderRadius:5}}/>
</div>);
const menuItems=(items:MenuItem[])=>items.map((x,i)=>(
<div key={i} role="button" tabIndex={0} style={{...item,color:x.danger?'#c62828':undefined}}
onClick={()=>run(x.run)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run(x.run);}}}>{x.label}</div>
));
const group=(id:string,label:string,items:React.ReactNode,bg='#f0f8ff')=>(
<div className="edit-studio-menu-group" style={{position:'relative',flex:'1 1 0',minWidth:0}}>
<button type="button" onClick={()=>toggle(id)} style={{...btn,background:bg,width:'100%'}}>{label}</button>
{open===id&&<div style={menu}>{items}</div>}
</div>);
const lines:MenuItem[]=[
{label:'↪ رسم جدار منحني',run:p.onStartCurvedWall},
{label:'🟢 رسم حدود الأرض',run:p.onStartDrawingBoundary},
{label:'🔵 رسم خط مساعد',run:p.onStartDrawingHelperLine},
{label:'🧱 رسم سور حدود الأرض',run:p.onBuildFenceOnBoundaries},
{label:'🗑️ حذف جميع الخطوط المساعدة',danger:true,run:()=>{if(window.confirm('حذف جميع الخطوط المساعدة؟'))p.onDeleteAllHelperLines();}}
];
const elements:MenuItem[]=[
{label:'📌 عمود مستطيل',run:()=>p.onSetColumnShape('rect')},
{label:'⚫ عمود دائري',run:()=>p.onSetColumnShape('circle')},
{label:'🪟 نافذة',run:()=>p.onModeChange('window')},
{label:'🕳️ فتحة',run:()=>p.onModeChange('opening')},
{label:'🚪 باب عادي',run:()=>p.onSetDoorType('regular')},
{label:'🚪 باب رئيسي',run:()=>p.onSetDoorType('main')},
{label:'🏪 باب محل',run:()=>p.onSetDoorType('shop')}
];
const regions:MenuItem[]=[
{label:'🍳 مطبخ',run:()=>p.onModeChange('kitchen')},
{label:'🛁 حمام',run:()=>p.onModeChange('bathroom')},
{label:'🛏️ غرفة',run:()=>p.onModeChange('room')},
{label:'🛋️ صالة',run:()=>p.onModeChange('hall')},
{label:'🪜 سلم سحبتين',run:()=>p.onModeChange('stair')},
{label:'🪜 سلم متعدد',run:p.onOpenMultiStairDialog}
];
const details:MenuItem[]=[
{label:'📏 إضافة الأبعاد',run:p.onAddAllDimensions},
{label:'📐 بعد يدوي',run:()=>p.onModeChange('dimension')},
{label:'📐 أبعاد جدار منحني',run:()=>p.onModeChange('curved-dimension')},
{label:'📝 نص',run:()=>p.onModeChange('text')},
{label:'🧭 سهم الشمال',run:p.onAddNorthArrow},
{label:'🔘 أركان مقوسة',run:p.onStartRoundCornerMode},
{label:'🗑️ حذف جميع الأبعاد',danger:true,run:p.onDeleteAllDimensions},
{label:p.showGrid?'🔲 إخفاء الشبكة':'🔳 إظهار الشبكة',run:p.onToggleGrid}
];
const axes:MenuItem[]=[
{label:'📐 المحاور يدوي',run:()=>setAxisDialog(true)},
{label:'🔄 المحاور تلقائي',run:p.onAddAxesFromWalls},
{label:'🗑️ حذف المحاور',danger:true,run:p.onDeleteAllAxes}
];
return <div className="edit-studio-toolbar" dir="rtl" style={{border:'1px solid #d7e2ed',boxShadow:'0 2px 10px #0001',borderRadius:12,padding:6,background:'linear-gradient(#fff,#f8fafc)',width:'100%',boxSizing:'border-box',position:'relative',zIndex:500}}>
<div className="edit-studio-header">
<div className="edit-studio-brand"><span className="edit-studio-mark">◈</span><span>EDIT STUDIO</span></div>
<span className="edit-studio-header-label">أدوات التصميم</span>
<button type="button" className="edit-studio-theme-toggle" onClick={()=>setAppearance(v=>v==='light'?'dark':'light')}>
{appearance==='light'?'☾ الوضع الليلي':'☀ الوضع النهاري'}
</button>
</div>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,width:'100%'}}>
<DrawToolbar mode={p.mode} drawingType={p.drawingType} onStartDrawing={p.onStartDrawing}/>
<div style={{position:'relative',display:'flex',alignItems:'center',gap:6}}>
<button type="button" style={{...btn,background:'#e8f5e9'}} onClick={()=>toggle('lines')}>📏 رسم خط</button>
<ColorPickerMenu theme={p.theme} onColorChange={p.onColorChange} onReset={p.onResetColors}/>
{open==='lines'&&<div style={menu}>{menuItems(lines)}</div>}
</div>
<div style={{flex:1}}/>
<button type="button" title="تراجع" style={btn} disabled={!p.historyLength} onClick={p.onUndo}>↩️</button>
<button type="button" title="إعادة" style={btn} disabled={!p.futureLength} onClick={p.onRedo}>↪️</button>
</div>
{p.joinWallsMode?
<div style={{display:'flex',alignItems:'center',gap:8,padding:6,marginBottom:6,background:'#e8f5e9',borderRadius:8}}>
<strong>🔗 اختر الجدران ({p.joinWallsCount||0})</strong><div style={{flex:1}}/>
<button type="button" style={btn} disabled={(p.joinWallsCount||0)<2} onClick={p.onConfirmJoinWalls}>✅ تم</button>
<button type="button" style={btn} onClick={p.onCancelJoinWalls}>✖ إلغاء</button>
</div>:
<div style={{marginBottom:6}}><button type="button" style={{...btn,background:'#e8f5e9'}} onClick={p.onStartJoinWallsMode}>🔗 ربط الجدران</button></div>}
<div style={{display:'flex',alignItems:'center',gap:4,width:'100%'}}>
{group('elements','➕ عناصر',menuItems(elements))}
{group('details','📋 تفاصيل',<>
{menuItems(details.slice(0,4))}
{numberField('حجم الأبعاد:',p.dimensionFontSize,p.onDimensionFontSizeChange)}
{menuItems(details.slice(4,5))}
{numberField('حجم النصوص:',p.globalTextSize,p.onGlobalTextSizeChange,0.01)}
<div style={item}>نوع الخط:
<select value={p.globalFontFamily} onChange={e=>p.onGlobalFontFamilyChange(e.target.value)} style={{display:'block',width:'100%',padding:5,borderRadius:5}}>
<option value={'"Traditional Arabic", "Noto Naskh Arabic", serif'}>Traditional Arabic</option>
<option value={'"Cairo", sans-serif'}>Cairo</option>
<option value={'"Tajawal", sans-serif'}>Tajawal</option>
<option value={'"Amiri", serif'}>Amiri</option>
<option value={'"Arial", sans-serif'}>Arial</option>
<option value={'"Times New Roman", serif'}>Times New Roman</option>
</select></div>
{menuItems(details.slice(5))}
</>)}
{group('regions','🎨 مناطق',menuItems(regions),'#fff8e1')}
{group('axes','📐 المحاور',<>{menuItems(axes)}{numberField('حجم الفقاعات:',p.axisBubbleSize,p.onAxisBubbleSizeChange,5,30)}</>,'#f0fff0')}
<div className="edit-studio-menu-group" style={{flex:'1 1 0',minWidth:0,position:'relative'}}>
<LayersPanel layers={p.layers} onToggleLayer={p.onToggleLayer} onToggleAll={p.onToggleAllLayers} allUnlocked={p.allUnlocked}/>
</div>
</div>
{axisDialog&&<AxisDialog onClose={()=>setAxisDialog(false)} onCreateAxes={p.onAddAxes} existingAxes={p.axes}/>}
</div>;
};
