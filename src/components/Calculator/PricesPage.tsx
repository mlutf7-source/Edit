import React, { useRef, useState } from 'react';
import type { PricesData, PriceItem, PriceSection } from './pricesTypes';
import { getInitial, savePrices, getLatestPrices, formatNum, unformat, ensurePlumbingPrices, ensureLaborPrices, defaults } from './pricesData';
import { createPdfFromElement } from '../../utils/pdfShare';

const sections: [PriceSection, string][] = [
  ['preliminary','الأعمال التمهيدية'], ['concrete','الخرسانة'], ['block','البلوك'],
  ['labor','عمالة الهيكل'], ['finishesMaterials','مواد التشطيبات'],
  ['doorsAndWindows','الأبواب والنوافذ'], ['electricalMaterials','مواد الكهرباء'],
  ['plumbingMaterials','مواد السباكة'], ['finishesLabor','عمالة التشطيبات'],
  ['finishesExtra','الأسعار المجمعة السابقة'], ['other','تكاليف أخرى'],
];
// Discover materials from this project's saved floor drafts and approvals only.
function withFloorMaterials(data: PricesData, projectId?: string): PricesData {
  if (!projectId) return data;
  const items: {material:string; diameter:string; unit:string}[] = [];
  const labor: {label:string; unit:string; originalLabel?:string; manual?:boolean}[] = [];
  const prefixes = [`qty_floor_${projectId}_`, `qty_approved_${projectId}_`];
  try {
    for (let i=0; i<localStorage.length; i++) {
      const key=localStorage.key(i);
      if (!key || !prefixes.some(prefix=>key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length)))) continue;
      try {
        const record=JSON.parse(localStorage.getItem(key) ?? '{}');
        for (const row of Array.isArray(record?.summary?.laborRows) ? record.summary.laborRows : []) {
          if (typeof row?.label === 'string' && typeof row.unit === 'string') labor.push(row);
        }
        for (const rows of [record?.summary?.plumbingMaterials, record?.plumbingDraft?.rows]) {
          if (!Array.isArray(rows)) continue;
          for (const row of rows) if (typeof row?.material==='string' && row.material.trim() && typeof row.diameter==='string') {
            items.push({material:row.material, diameter:row.diameter, unit:typeof row.unit==='string' ? row.unit : 'عدد'});
          }
        }
      } catch { /* Ignore malformed individual floor records. */ }
    }
  } catch { /* Storage may be unavailable. */ }
  return ensureLaborPrices(ensurePlumbingPrices(data,items),labor);
}
const PriceInput = ({value, onCommit, label}: {value:string; onCommit:(v:string)=>void; label:string}) => {
  const [draft,setDraft] = useState<string|null>(null);
  return <input aria-label={label} inputMode="decimal" type="text" placeholder="غير مسعر" value={draft ?? formatNum(value)}
    onFocus={e=>e.currentTarget.select()} onChange={e=>setDraft(e.target.value)}
    onBlur={()=>{ if(draft!==null){const raw=unformat(draft).trim(); if(raw==='' || (Number.isFinite(Number(raw)) && Number(raw)>=0)) onCommit(raw); setDraft(null);}}}
    onKeyDown={e=>{if(e.key==='Enter') e.currentTarget.blur();}} style={{width:'100%',minWidth:0,boxSizing:'border-box',textAlign:'center'}} />;
};
export const PricesPage: React.FC<{projectId?:string}> = ({projectId}) => {
  const [data,setData] = useState<PricesData>(()=>withFloorMaterials(getInitial(projectId),projectId));
  const current = useRef(data);
  const [search,setSearch] = useState('');
  const [busy,setBusy] = useState(false);
  const report = useRef<HTMLDivElement>(null);
  const commit = (next:PricesData) => {
    try { const enriched=withFloorMaterials(next,projectId); savePrices(enriched,projectId); current.current=enriched; setData(enriched); }
    catch { alert('تعذر حفظ الأسعار. يرجى التحقق من مساحة التخزين.'); }
  };
  const patch = (section:PriceSection,id:number,change:Partial<PriceItem>) => {
    const prev=current.current;
    commit({...prev,[section]:(prev[section]??[]).map(r=>r.id===id?{...r,...change}:r)});
  };
  const matches = (name:string)=>name.includes(search.trim());
  const currency = data.currency==='YER'?'ر.ي':data.currency==='SAR'?'ر.س':'$';
  const share = async()=>{if(!report.current||busy)return;setBusy(true);try{await createPdfFromElement(report.current,'تقرير الأسعار');}finally{setBusy(false);}};
  return <div className="prices-page" dir="rtl" style={{display:'flex',flexDirection:'column',gap:12}}>
    <div className="prices-toolbar" data-pdf-exclude="true">
      <label>العملة <select value={data.currency} onChange={e=>commit({...current.current,currency:e.target.value})}><option value="YER">ريال يمني</option><option value="SAR">ريال سعودي</option><option value="USD">دولار</option></select></label>
      <label>وحدة عمالة البلوك <select value={data.blockMode} onChange={e=>commit({...current.current,blockMode:e.target.value as PricesData['blockMode']})}><option value="m2">م²</option><option value="unit">بلوكة</option></select></label>
      <input aria-label="بحث عن مادة" placeholder="بحث عن مادة أو بند" value={search} onChange={e=>setSearch(e.target.value)}/>
      <button type="button" onClick={()=>{if(confirm('استبدال أسعار المشروع بآخر قائمة أسعار معدلة؟'))commit(getLatestPrices());}}>استيراد آخر الأسعار</button>
      <button type="button" onClick={()=>{if(confirm('استعادة الأسعار الافتراضية لهذا المشروع؟'))commit(withFloorMaterials(defaults,projectId));}}>استعادة الأسعار الافتراضية</button>
    </div>
    <div ref={report} className="prices-report">
      <div className="qty-main-heading">قائمة الأسعار — {currency}</div>
      {matches('الحديد')&&<section><div className="qty-main-heading">أسعار الحديد</div><table><thead><tr><th>المادة</th><th>الوحدة</th><th>السعر ({currency})</th></tr></thead><tbody><tr><td>الحديد</td><td>طن</td><td><PriceInput label="سعر الحديد" value={data.steelUnified} onCommit={v=>commit({...current.current,steelUnified:v})}/></td></tr></tbody></table></section>}
      {sections.map(([section,title])=>{const rows=(data[section]??[]).filter(r=>matches(r.name)); if(search.trim()&&!rows.length)return null;return <section key={section} className="prices-section">
        <div className="qty-main-heading">{title}</div>
        <table><thead><tr><th>اسم المادة أو البند</th><th>الوحدة</th><th>سعر الوحدة ({currency})</th></tr></thead><tbody>
          {rows.map(row=><tr key={row.id}><td>{row.name}</td><td>{section==='other'?<select aria-label={'نوع '+row.name} value={row.costType??'percent'} onChange={e=>patch(section,row.id,{costType:e.target.value as PriceItem['costType'],unit:e.target.value==='fixed'?currency:'%'})}><option value="percent">%</option><option value="fixed">{currency}</option></select>:section==='finishesLabor'&&row.name==='بناء البلوك'?(data.blockMode==='m2'?'م²':'بلوكة'):(row.unit??'عدد')}</td><td><PriceInput label={'سعر '+row.name} value={row.price} onCommit={v=>patch(section,row.id,{price:v})}/>{!row.quantityKey && !(defaults[section]??[]).some(r=>r.id===row.id) && <button type="button" data-pdf-exclude="true" onClick={()=>{if(confirm('حذف البند الإضافي؟')){const prev=current.current;commit({...prev,[section]:(prev[section]??[]).filter(r=>r.id!==row.id)});}}}>حذف</button>}</td></tr>)}
        </tbody></table>
        <div data-pdf-exclude="true"><button type="button" onClick={()=>{const name=prompt('اسم البند الجديد');if(!name?.trim())return;const unit=prompt('وحدة البند','عدد');if(!unit?.trim())return;const prev=current.current;const all=prev[section]??[];commit({...prev,[section]:[...all,{id:Math.max(0,...all.map(r=>r.id))+1,name:name.trim(),unit:unit.trim(),price:'',...(section==='other'?{costType:'fixed'}:{})}]});}}>+ إضافة بند</button></div>
      </section>;})}
    </div>
    <button type="button" disabled={busy} onClick={share}>{busy?'جارٍ إعداد التقرير…':'مشاركة تقرير الأسعار PDF'}</button>
  </div>;
};
