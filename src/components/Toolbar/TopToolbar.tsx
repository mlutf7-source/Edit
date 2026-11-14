
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
mode:AppMode;drawingType:DrawingType;onStartDrawing:(type:DrawingType)=>void;
onUndo:()=>void;onRedo:()=>void;historyLength:number;futureLength:number;
onAddAllDimensions:()=>void;onModeChange:(mode:AppMode)=>void;
layers:LayersState;onToggleLayer:(layer:keyof LayersState)=>void;
onToggleAllLayers:()=>void;allUnlocked:boolean;
dimensionFontSize:number;onDimensionFontSizeChange:(size:number)=>void;
onAddNorthArrow:()=>void;onAddAxes:(axes:Axis[])=>void;
onAddAxesFromWalls:()=>void;onDeleteAllAxes:()=>void;axes:Axis[];
showGrid:boolean;onToggleGrid:()=>void;onDeleteAllDimensions:()=>void;
globalTextSize:number;onGlobalTextSizeChange:(v:number)=>void;
globalFontFamily:string;onGlobalFontFamilyChange:(v:string)=>void;
axisBubbleSize:number;onAxisBubbleSizeChange:(v:number)=>void;
onOpenMultiStairDialog:()=>void;
onSetDoorType:(type:'regular'|'main'|'shop')=>void;
onSetColumnShape:(shape:'rect'|'circle')=>void;
onStartCurvedWall:()=>void;onStartDrawingBoundary:()=>void;
onStartDrawingHelperLine:()=>void;onBuildFenceOnBoundaries:()=>void;
onDeleteAllHelperLines:()=>void;onStartRoundCornerMode:()=>void;
onStartJoinWallsMode:()=>void;joinWallsMode?:boolean;joinWallsCount?:number;
onConfirmJoinWalls?:()=>void;onCancelJoinWalls?:()=>void;
onCurvedDimWallClick?:(wall:Wall)=>void;
theme:ColorTheme;onColorChange:(key:keyof ColorTheme,value:string)=>void;
onResetColors:()=>void;
}
type MenuItem={label:string;action:()=>void;danger?:boolean};
const btn:React.CSSProperties={padding:'8px 7px',border:'1px solid #c5d9ed',borderRadius:8,background:'#f0f8ff',color:'#18395b',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',minWidth:0};
const menu:React.CSSProperties={position:'absolute',top:'calc(100% + 5px)',right:0,zIndex:99999,minWidth:210,maxWidth:'min(90vw,300px)',maxHeight:'65vh',overflowY:'auto',padding:6,border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',boxShadow:'0 8px 24px #0002'};
const item:React.CSSProperties={width:'100%',display:'block',padding:'9px 10px',border:0,borderRadius:6,background:'transparent',color:'#334155',fontSize:12,textAlign:'right',cursor:'pointer'};
const field:React.CSSProperties={width:65,padding:'5px',border:'1px solid #cbd5e1',borderRadius:6,fontSize:12,textAlign:'center',background:'#fff',color:'#334155'};
const parseNumber=(value:string,fallback:number)=>{const n=parseFloat(value.replace(',','.'));return Number.isFinite(n)?n:fallback;};
export const TopToolbar:React.FC<Props>=p=>{
const [openMenu,setOpenMenu]=useState<string|null>(null);
const [showAxisDialog,setShowAxisDialog]=useState(false);
const [appearance,setAppearance]=useState<'light'|'dark'>(()=>{try{return localStorage.getItem('edit-studio-appearance')==='dark'?'dark':'light';}catch{return'light';}});
useEffect(()=>{document.documentElement.dataset.editStudioTheme=appearance;try{localStorage.setItem('edit-studio-appearance',appearance);}catch{}},[appearance]);
const toggle=(id:string)=>setOpenMenu(v=>v===id?null:id);
const run=(action:()=>void)=>()=>{action();setOpenMenu(null);};
const confirmRun=(message:string,action:()=>void)=>()=>{if(window.confirm(message))action();setOpenMenu(null);};
const menuItems=(items:MenuItem[])=>items.map((x,i)=><button key={i} type="button" onClick={run(x.action)} style={{...item,color:x.danger?'#b91c1c':'#334155'}}>{x.label}</button>);
const group=(id:string,title:string,items:MenuItem[],background='#f0f8ff')=><div className="edit-studio-menu-group" style={{position:'relative',flex:'1 1 0',minWidth:0}}>
<button type="button" aria-expanded={openMenu===id} onClick={()=>toggle(id)} style={{...btn,width:'100%',background}}>{title}</button>
{openMenu===id&&<div style={menu}>{menuItems(items)}</div>}
</div>;
const numberField=(label:string,value:number,onChange:(n:number)=>void,min?:number,max?:number)=><label style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'7px 9px',fontSize:12,color:'#334155'}}>
<span>{label}</span>
<input type="text" inputMode="decimal" dir="ltr" key={`${label}-${value}`} defaultValue={String(value)} onFocus={e=>e.target.select()} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={e=>{let n=parseNumber(e.target.value,value);if(min!==undefined)n=Math.max(min,n);if(max!==undefined)n=Math.min(max,n);onChange(n);e.target.value=String(n);}} style={field}/>
</label>;
const lines:MenuItem[]=[
{label:'↪ رسم جدار منحني',action:p.onStartCurvedWall},
{label:'🟢 رسم حدود الأرض',action:p.onStartDrawingBoundary},
{label:'🔵 رسم خط مساعد',action:p.onStartDrawingHelperLine},
{label:'🧱 إنشاء سور على حدود الأرض',action:p.onBuildFenceOnBoundaries},
{label:'🗑 حذف جميع الخطوط المساعدة',action:()=>{if(window.confirm('حذف جميع الخطوط المساعدة؟'))p.onDeleteAllHelperLines();},danger:true}
];
const elements:MenuItem[]=[
{label:'📌 عمود مستطيل',action:()=>p.onSetColumnShape('rect')},
{label:'⚫ عمود دائري',action:()=>p.onSetColumnShape('circle')},
{label:'🪟 نافذة',action:()=>p.onModeChange('window')},
{label:'🕳 فتحة',action:()=>p.onModeChange('opening')},
{label:'🚪 باب عادي',action:()=>p.onSetDoorType('regular')},
{label:'🚪 باب رئيسي',action:()=>p.onSetDoorType('main')},
{label:'🏪 باب محل',action:()=>p.onSetDoorType('shop')},
{label:'🪜 سلم سحبتين',action:()=>p.onModeChange('stair')},
{label:'🪜 سلم متعدد',action:p.onOpenMultiStairDialog}
];
const regions:MenuItem[]=[
{label:'🍳 مطبخ',action:()=>p.onModeChange('kitchen')},
{label:'🛁 حمام',action:()=>p.onModeChange('bathroom')},
{label:'🛏 غرفة',action:()=>p.onModeChange('room')},
{label:'🛋 صالة',action:()=>p.onModeChange('hall')}
];
const dimensions:MenuItem[]=[
{label:'📏 إضافة جميع الأبعاد',action:p.onAddAllDimensions},
{label:'📐 إضافة بعد يدوي',action:()=>p.onModeChange('dimension')},
{label:'↪ أبعاد جدار منحني',action:()=>p.onModeChange('curved-dimension')},
{label:'📝 إضافة نص',action:()=>p.onModeChange('text')},
{label:'🧭 إضافة سهم الشمال',action:p.onAddNorthArrow},
{label:'🗑 حذف جميع الأبعاد',action:()=>{if(window.confirm('حذف جميع الأبعاد؟'))p.onDeleteAllDimensions();},danger:true}
];
const axes:MenuItem[]=[
{label:'📐 إنشاء المحاور يدوياً',action:()=>setShowAxisDialog(true)},
{label:'🔄 إنشاء المحاور تلقائياً',action:p.onAddAxesFromWalls},
{label:'🗑 حذف جميع المحاور',action:()=>{if(window.confirm('حذف جميع المحاور؟'))p.onDeleteAllAxes();},danger:true}
];
return <div className="edit-studio-toolbar" dir="rtl" style={{width:'100%',boxSizing:'border-box',position:'relative',zIndex:500,padding:6,border:'1px solid #dce5ef',borderRadius:12,background:'#f8fafc',boxShadow:'0 2px 10px #00000012'}}>
<div className="edit-studio-header">
<div className="edit-studio-brand"><span className="edit-studio-mark">◈</span><span>EDIT STUDIO</span></div>
<span className="edit-studio-header-label">أدوات التصميم</span>
<button type="button" className="edit-studio-theme-toggle" onClick={()=>setAppearance(v=>v==='light'?'dark':'light')} title={appearance==='light'?'تفعيل الوضع الليلي':'تفعيل الوضع النهاري'}>{appearance==='light'?'☾ الوضع الليلي':'☀ الوضع النهاري'}</button>
</div>
<div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',marginBottom:6}}>
<DrawToolbar mode={p.mode} drawingType={p.drawingType} onStartDrawing={p.onStartDrawing}/>
<div style={{position:'relative',display:'flex',alignItems:'center',gap:5}}>
<button type="button" onClick={()=>toggle('lines')} style={{...btn,background:'#e8f5e9',borderColor:'#a5d6a7'}}>📏 رسم خط</button>
{openMenu==='lines'&&<div style={menu}>{menuItems(lines)}</div>}
</div>
<ColorPickerMenu theme={p.theme} onColorChange={p.onColorChange} onReset={p.onResetColors}/>
<div style={{flex:1}}/>
<button type="button" title="تراجع" aria-label="تراجع" disabled={p.historyLength===0} onClick={p.onUndo} style={{...btn,opacity:p.historyLength===0?.45:1}}>↩️</button>
<button type="button" title="إعادة" aria-label="إعادة" disabled={p.futureLength===0} onClick={p.onRedo} style={{...btn,opacity:p.futureLength===0?.45:1}}>↪️</button>
</div>
{p.joinWallsMode&&<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:6,padding:7,border:'1px solid #86c991',borderRadius:8,background:'#e8f5e9'}}>
<strong style={{fontSize:12,color:'#166534'}}>🔗 اختر الجدران ({p.joinWallsCount??0})</strong>
<div style={{flex:1}}/>
<button type="button" disabled={(p.joinWallsCount??0)<2} onClick={p.onConfirmJoinWalls} style={{...btn,background:'#dcfce7',opacity:(p.joinWallsCount??0)<2?.5:1}}>✓ تم</button>
<button type="button" onClick={p.onCancelJoinWalls} style={{...btn,background:'#fee2e2',color:'#b91c1c'}}>✕ إلغاء</button>
</div>}
<div style={{display:'flex',alignItems:'stretch',gap:5,width:'100%',flexWrap:'wrap'}}>
{group('elements','➕ عناصر',elements)}
{group('regions','🏠 الغرف والمناطق',regions,'#fff8e1')}
<div className="edit-studio-menu-group" style={{position:'relative',flex:'1 1 0',minWidth:0}}>
<button type="button" aria-expanded={openMenu==='dimensions'} onClick={()=>toggle('dimensions')} style={{...btn,width:'100%'}}>📏 قياسات وتوضيحات</button>
{openMenu==='dimensions'&&<div style={menu}>
{menuItems(dimensions)}
<div style={{borderTop:'1px solid #e2e8f0',marginTop:5,paddingTop:5}}>
{numberField('حجم الأبعاد',p.dimensionFontSize,p.onDimensionFontSizeChange,1)}
{numberField('حجم النصوص',p.globalTextSize,p.onGlobalTextSizeChange,1)}
<label style={{display:'flex',flexDirection:'column',gap:5,padding:'7px 9px',fontSize:12,color:'#334155'}}>نوع الخط
<select value={p.globalFontFamily} onChange={e=>p.onGlobalFontFamilyChange(e.target.value)} style={{...field,width:'100%',textAlign:'right'}}>
<option value={'"Traditional Arabic", "Noto Naskh Arabic", serif'}>Traditional Arabic</option>
<option value={'"Cairo", sans-serif'}>Cairo</option>
<option value={'"Tajawal", sans-serif'}>Tajawal</option>
<option value={'"Amiri", serif'}>Amiri</option>
<option value={'"Arial", sans-serif'}>Arial</option>
<option value={'"Times New Roman", serif'}>Times New Roman</option>
</select>
</label>
</div>
</div>}
</div>
<div className="edit-studio-menu-group" style={{position:'relative',flex:'1 1 0',minWidth:0}}>
<button type="button" aria-expanded={openMenu==='axes'} onClick={()=>toggle('axes')} style={{...btn,width:'100%',background:'#f0fff0'}}>📐 المحاور</button>
{openMenu==='axes'&&<div style={menu}>
{menuItems(axes)}
{numberField('حجم الفقاعات',p.axisBubbleSize,p.onAxisBubbleSizeChange,5,30)}
</div>}
</div>
<div className="edit-studio-menu-group" style={{position:'relative',flex:'1 1 0',minWidth:0}}>
<button type="button" aria-expanded={openMenu==='edit'} onClick={()=>toggle('edit')} style={{...btn,width:'100%',background:'#f1f5f9'}}>🛠 تعديل</button>
{openMenu==='edit'&&<div style={menu}>
{menuItems([
{label:'🔗 ربط الجدران',action:p.onStartJoinWallsMode},
{label:'🔘 تقويس الأركان',action:p.onStartRoundCornerMode}
])}
</div>}
</div>
<div className="edit-studio-menu-group" style={{position:'relative',flex:'1 1 0',minWidth:0}}>
<button type="button" aria-expanded={openMenu==='view'} onClick={()=>toggle('view')} style={{...btn,width:'100%',background:'#f1f5f9'}}>👁 العرض</button>
{openMenu==='view'&&<div style={menu}>
<button type="button" onClick={run(p.onToggleGrid)} style={item}>{p.showGrid?'🔲 إخفاء الشبكة':'🔳 إظهار الشبكة'}</button>
</div>}
</div>
<div className="edit-studio-menu-group" style={{flex:'1 1 0',minWidth:0,position:'relative'}}>
<LayersPanel layers={p.layers} onToggleLayer={p.onToggleLayer} onToggleAll={p.onToggleAllLayers} allUnlocked={p.allUnlocked}/>
</div>
</div>
{showAxisDialog&&<AxisDialog onClose={()=>setShowAxisDialog(false)} onCreateAxes={p.onAddAxes} existingAxes={p.axes}/>}
</div>;
};
  
