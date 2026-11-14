
import React,{useState} from 'react';
export interface LayersState{
walls:boolean;landBoundaries:boolean;helperLines:boolean;
dimensions:boolean;columns:boolean;windows:boolean;
doors:boolean;openings:boolean;texts:boolean;
regions:boolean;stairs:boolean;northArrow:boolean;axes:boolean;
}
interface Props{
layers:LayersState;
onToggleLayer:(layer:keyof LayersState)=>void;
onToggleAll:()=>void;
allUnlocked:boolean;
}
type LayerItem={key:keyof LayersState;label:string;icon:string};
const groups:{title:string;icon:string;items:LayerItem[]}[]=[
{title:'الجدران والحدود',icon:'🏗️',items:[
{key:'walls',label:'الجدران',icon:'🧱'},
{key:'landBoundaries',label:'حدود الأرض',icon:'🟢'},
{key:'helperLines',label:'الخطوط المساعدة',icon:'📏'}]},
{title:'العناصر المعمارية',icon:'🏠',items:[
{key:'columns',label:'الأعمدة',icon:'📌'},
{key:'doors',label:'الأبواب',icon:'🚪'},
{key:'windows',label:'النوافذ',icon:'🪟'},
{key:'openings',label:'الفتحات',icon:'⬜'},
{key:'stairs',label:'السلالم',icon:'🪜'}]},
{title:'المناطق',icon:'🗺️',items:[
{key:'regions',label:'الغرف والمناطق',icon:'🏡'}]},
{title:'القياسات والتوضيحات',icon:'📐',items:[
{key:'dimensions',label:'الأبعاد',icon:'📏'},
{key:'axes',label:'المحاور',icon:'⊕'},
{key:'texts',label:'النصوص',icon:'📝'},
{key:'northArrow',label:'سهم الشمال',icon:'🧭'}]}
];
const allItems=groups.flatMap(g=>g.items);
export const LayersPanel:React.FC<Props>=({layers,onToggleLayer,onToggleAll,allUnlocked})=>{
const [open,setOpen]=useState(false);
const [collapsed,setCollapsed]=useState<string[]>([]);
const [search,setSearch]=useState('');
const unlocked=allItems.filter(i=>layers[i.key]).length;
const toggleGroup=(name:string)=>setCollapsed(v=>v.includes(name)?v.filter(x=>x!==name):[...v,name]);
const visibleGroups=groups.map(g=>({...g,items:g.items.filter(i=>i.label.includes(search.trim()))})).filter(g=>g.items.length>0);
return <div className="edit-studio-layers" dir="rtl" style={{position:'relative',width:'100%'}}>
<button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} style={{width:'100%',padding:'8px 6px',border:'1px solid #c5d9ed',borderRadius:8,background:'#f0f8ff',color:'#18395b',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
{allUnlocked?'🔓':'🔒'} الطبقات
</button>
{open&&<div className="edit-studio-layers-menu" style={{position:'absolute',top:'calc(100% + 5px)',left:0,zIndex:1000,width:270,maxWidth:'min(90vw,310px)',maxHeight:'65vh',overflowY:'auto',background:'#fff',border:'1px solid #cbd5e1',borderRadius:11,boxShadow:'0 8px 24px #0002',padding:10,color:'#24364b'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:9}}>
<strong style={{fontSize:14}}>🔐 إدارة الطبقات</strong>
<button type="button" onClick={()=>setOpen(false)} aria-label="إغلاق القائمة" style={{border:0,background:'transparent',fontSize:19,cursor:'pointer',color:'inherit'}}>×</button>
</div>
<div style={{fontSize:11,opacity:.75,marginBottom:8}}>الطبقات المفتوحة: {unlocked} من {allItems.length}</div>
<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث عن طبقة..." style={{boxSizing:'border-box',width:'100%',padding:'8px 10px',border:'1px solid #d4dce7',borderRadius:7,marginBottom:9,fontSize:12}}/>
{visibleGroups.map(g=><section key={g.title} style={{marginBottom:7,border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
<button type="button" onClick={()=>toggleGroup(g.title)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px',border:0,background:'#f1f5f9',color:'inherit',fontSize:12,fontWeight:700,cursor:'pointer'}}>
<span>{g.icon} {g.title}</span><span>{collapsed.includes(g.title)&&!search?'＋':'－'}</span>
</button>
{(!collapsed.includes(g.title)||search)&&g.items.map(i=><div key={i.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 9px',borderTop:'1px solid #edf2f7',gap:8}}>
<span style={{fontSize:12}}>{i.icon} {i.label}</span>
<button type="button" aria-label={`${layers[i.key]?'قفل':'فتح'} ${i.label}`} aria-pressed={layers[i.key]} title={layers[i.key]?'الطبقة مفتوحة':'الطبقة مقفلة'} onClick={()=>onToggleLayer(i.key)} style={{minWidth:55,padding:'5px 7px',borderRadius:6,border:`1px solid ${layers[i.key]?'#bfdbfe':'#fecaca'}`,background:layers[i.key]?'#eff6ff':'#fef2f2',color:layers[i.key]?'#1d4ed8':'#b91c1c',fontSize:11,fontWeight:700,cursor:'pointer'}}>
{layers[i.key]?'🔓 فتح':'🔒 قفل'}
</button>
</div>)}
</section>)}
{visibleGroups.length===0&&<div style={{padding:12,textAlign:'center',fontSize:12}}>لا توجد طبقة بهذا الاسم</div>}
<button type="button" onClick={onToggleAll} style={{width:'100%',padding:'9px',marginTop:4,border:'1px solid #bfdbfe',borderRadius:7,background:'#eaf3ff',color:'#1d4ed8',fontWeight:700,fontSize:12,cursor:'pointer'}}>
{allUnlocked?'🔒 قفل جميع الطبقات':'🔓 فتح جميع الطبقات'}
</button>
</div>}
</div>;
};
