
import React,{useEffect,useRef,useState} from 'react';
import type {ColorTheme} from '../../core/colorTheme';
import {COLOR_ITEMS} from '../../core/colorTheme';
interface Props{theme:ColorTheme;onColorChange:(key:keyof ColorTheme,value:string)=>void;onReset:()=>void;}
const groups:{title:string;icon:string;keys:(keyof ColorTheme)[]}[]=[
{title:'الجدران والحدود',icon:'🧱',keys:['wallFill','wallBorder','wallHandle','wallDimensionLabel','landBoundaryFill','helperLineFill','roundCornerFirstFill']},
{title:'الأبواب والنوافذ',icon:'🚪',keys:['windowFrame','windowGlass','windowGlassLines','doorRegular','doorMain','doorShop']},
{title:'الأعمدة والسلالم',icon:'🪜',keys:['columnFill','stairFill','stairBorder','stairLines','landingFill','landingBorder','stairArrow']},
{title:'الغرف والمناطق',icon:'🏠',keys:['kitchenFill','bathroomFill','roomFill','hallFill']},
{title:'القياسات والمحاور',icon:'📐',keys:['dimensionLine','dimensionText','axisLine','axisText']},
{title:'ألوان عامة',icon:'🎨',keys:['selection','textColor']}
];
const button:React.CSSProperties={border:'1px solid #cbd5e1',borderRadius:7,background:'#f8fafc',color:'#334155',padding:'7px 9px',fontSize:12,fontWeight:700,cursor:'pointer'};
export const ColorPickerMenu:React.FC<Props>=({theme,onColorChange,onReset})=>{
const [open,setOpen]=useState(false);
const [search,setSearch]=useState('');
const [collapsed,setCollapsed]=useState<string[]>([]);
const ref=useRef<HTMLDivElement>(null);
useEffect(()=>{if(!open)return;const outside=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};},[open]);
const toggle=(name:string)=>setCollapsed(v=>v.includes(name)?v.filter(x=>x!==name):[...v,name]);
const used=new Set(groups.flatMap(g=>g.keys));
const extra=COLOR_ITEMS.filter(i=>!used.has(i.key));
const allGroups=[...groups,...(extra.length?[{title:'ألوان إضافية',icon:'🎨',keys:extra.map(i=>i.key)}]:[])];
const filter=search.trim().toLowerCase();
const visible=allGroups.map(g=>({...g,items:COLOR_ITEMS.filter(i=>g.keys.includes(i.key)&&(!filter||i.label.toLowerCase().includes(filter)||String(i.key).toLowerCase().includes(filter)))})).filter(g=>g.items.length);
return <div ref={ref} className="edit-studio-colors" dir="rtl" style={{position:'relative',flex:'0 0 auto'}}>
<button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} style={{...button,background:'#f3e8ff',borderColor:'#d0c0f0',color:'#6b21a8'}}>🎨 الألوان</button>
{open&&<div className="edit-studio-colors-menu" style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:99999,width:285,maxWidth:'min(90vw,320px)',maxHeight:'65vh',overflowY:'auto',boxSizing:'border-box',padding:10,border:'1px solid #cbd5e1',borderRadius:11,background:'#fff',color:'#334155',boxShadow:'0 8px 24px #0002'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,marginBottom:9}}>
<strong style={{fontSize:13}}>🎨 تخصيص ألوان المخطط</strong>
<button type="button" aria-label="إغلاق" onClick={()=>setOpen(false)} style={{...button,padding:'3px 8px'}}>✕</button>
</div>
<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="البحث عن لون..." style={{boxSizing:'border-box',width:'100%',padding:'8px',border:'1px solid #cbd5e1',borderRadius:7,marginBottom:9,fontSize:12,background:'#fff',color:'#334155'}}/>
{visible.map(g=><section key={g.title} style={{border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',marginBottom:7}}>
<button type="button" onClick={()=>toggle(g.title)} style={{...button,width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',border:0,borderRadius:0,background:'#f1f5f9',textAlign:'right'}}>
<span>{g.icon} {g.title}</span><span>{collapsed.includes(g.title)&&!filter?'＋':'－'}</span>
</button>
{(!collapsed.includes(g.title)||filter)&&g.items.map(i=><label key={i.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'7px 9px',borderTop:'1px solid #edf2f7',fontSize:12,cursor:'pointer'}}>
<span>{i.label}</span>
<span style={{position:'relative',width:43,height:27,flexShrink:0,borderRadius:6,border:'1px solid #cbd5e1',background:theme[i.key],boxShadow:'inset 0 0 0 2px #fff'}}>
<input type="color" aria-label={`تغيير ${i.label}`} value={theme[i.key]} onChange={e=>onColorChange(i.key,e.target.value)} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}/>
</span>
</label>)}
</section>)}
{visible.length===0&&<div style={{padding:12,textAlign:'center',fontSize:12}}>لا توجد ألوان مطابقة للبحث</div>}
<button type="button" onClick={()=>{if(window.confirm('هل تريد استعادة الألوان الافتراضية؟'))onReset();}} style={{...button,width:'100%',marginTop:4,background:'#eff6ff',color:'#1d4ed8',borderColor:'#bfdbfe'}}>↺ استعادة الألوان الافتراضية</button>
</div>}
</div>;
};
