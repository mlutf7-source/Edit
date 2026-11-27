import { SummaryTotalRow, SummaryTablePanel, summaryTableStyle } from './summaryComponents';
import { getSavedProjectName } from './projectReportName';
import { formatQuantity } from './quantityFormat';
import { summaryHeading } from './summaryHeading';
import React, { useMemo, useState } from 'react';
import type { PricesData, PriceItem } from './pricesTypes';
import type { StructureRecord } from './structureFloorAllocation';
import { createPdfFromElement } from '../../utils/pdfShare';

type Approved = { summary?: Record<string, unknown> } | null;
type Props = {
  preliminarySection?: React.ReactNode;
  quantitySections?: React.ReactNode;
  finishesSections?: React.ReactNode;
  includedFloors: number[];
  floorAreas: (number | null)[];
  approved: Approved[];
  preliminary: Record<string, unknown> | null;
  structure: StructureRecord | null;
  prices: PricesData;
  finishCosts: { materials: number; labor: number; plumbing: number; electrical: number };
  finishesCurrency: string;
  usePagePrices: boolean;
  pricesComplete: boolean;
  displayCurrency: string;
  exchangeRate: number | null;
  fullReportReady?: boolean;
  projectId?: string;
};
const numeric = (value: unknown): number => {
  const n = Number(String(value ?? '0').replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const validPrice = (value: unknown): boolean => {
  if (value == null || !String(value).trim()) return false;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0;
};
const price = (items: PriceItem[], id: number) => numeric(items.find(item => item.id === id)?.price);
const hasPrice = (items: PriceItem[], id: number) => validPrice(items.find(item => item.id === id)?.price);
const quantityFormat = formatQuantity;

type Line = { key: string; category: string; label: string; unit: string; quantity: number; unitPrice: number };

/** Financial totals use the allocated structure only; never sum the building reference again. */
export const UnifiedFinancialSummary: React.FC<Props> = ({
  quantitySections, finishesSections, includedFloors, floorAreas, approved, preliminary, structure, prices, finishCosts, finishesCurrency, usePagePrices, pricesComplete, displayCurrency, exchangeRate, fullReportReady, projectId,
}) => {
  const conversionValid = exchangeRate !== null && Number.isFinite(exchangeRate) && exchangeRate > 0;
  const money = (value:number) => conversionValid && exchangeRate !== null && Number.isFinite(value/exchangeRate) ? quantityFormat(value/exchangeRate) : "—";
  const allocations = structure?.floorAllocations;
  const availableFloors = includedFloors.filter(i => {
    if (!allocations || structure?.allocationMethod !== 'independent-floor-estimate-v1') return false;
    const row = allocations[i];
    const gross = (row as (typeof row & { slabGrossVolume?: number }) | undefined)?.slabGrossVolume;
    return row?.floor === i && typeof gross === 'number' && Number.isFinite(gross) && gross >= row.slabConcrete && gross >= 0;
  });
  const structureReady = availableFloors.length === includedFloors.length;
  const lines = useMemo<Line[]>(() => {
    const result: Line[] = [];
    if (includedFloors.includes(0) && preliminary) {
      result.push(
        { key: 'excavation', category: 'الأعمال التمهيدية', label: 'الحفر', unit: 'م³', quantity: numeric(preliminary.excavationVolume), unitPrice: price(prices.preliminary, 1) },
        { key: 'stone', category: 'الأعمال التمهيدية', label: 'الكرسي الحجري', unit: 'م²', quantity: numeric(preliminary.plinthArea), unitPrice: price(prices.preliminary, 3) },
        { key: 'backfill', category: 'الأعمال التمهيدية', label: 'الردم', unit: 'م³', quantity: numeric(preliminary.backfillVolume), unitPrice: price(prices.preliminary, 2) },
      );
    }
    const allocations = structure?.floorAllocations;
    if (allocations && availableFloors.length) {
      const concreteKeys = ['footingConcrete', 'neckConcrete', 'middConcrete', 'columnConcrete', 'slabConcrete'] as const;
      const steelKeys = ['footingSteel', 'neckSteel', 'middSteel', 'columnSteel', 'slabSteel'] as const;
      const concrete = availableFloors.reduce((sum, i) => sum + concreteKeys.reduce((s, key) => s + numeric(allocations[i][key]), 0), 0);
      const steel = availableFloors.reduce((sum, i) => sum + steelKeys.reduce((s, key) => s + numeric(allocations[i][key]), 0), 0);
      const roofArea = availableFloors.reduce((sum,i) => sum + numeric((allocations[i] as typeof allocations[number] & {slabGrossVolume?: number}).slabGrossVolume) / 0.3, 0);
      result.push(
        { key: 'concrete', category: 'مواد الهيكل', label: 'الخرسانة', unit: 'م³', quantity: concrete, unitPrice: price(prices.concrete, 2) },
        { key: 'steel', category: 'مواد الهيكل', label: 'حديد التسليح', unit: 'طن', quantity: steel, unitPrice: numeric(prices.steelUnified) },
        { key: 'hordi', category: 'مواد الهيكل', label: 'البلوك الهوردي', unit: 'بلوكة', quantity: Math.ceil(roofArea * 5), unitPrice: price(prices.block, 2) },
      );
      const parts = [['footingConcrete','القواعد'],['neckConcrete','الرقاب'],['middConcrete','الميدات'],['columnConcrete','الأعمدة'],['slabGrossVolume','الأسقف']] as const;
      for (const [key,label] of parts) {
        if (!availableFloors.includes(0) && /^(footing|neck|midd)/.test(key)) continue;
        const quantity = availableFloors.reduce((sum,i) => sum + numeric((allocations[i] as typeof allocations[number] & {slabGrossVolume?: number})[key]),0);
        result.push({key:`contractor:${key}`,category:'أجور المقاول',label,unit:'م³',quantity,unitPrice:price(prices.labor,1)});
      }
      for (const item of prices.other) {
        const fixed = item.costType === 'fixed';
        result.push({key:`extra:${item.id}`,category:'مصاريف إضافية',label:item.name,unit:fixed?'بند':'%',quantity:fixed?1:numeric(item.price),unitPrice:fixed?numeric(item.price):(concrete*price(prices.concrete,2)+steel*numeric(prices.steelUnified))/100});
      }
    }
    return result;
  }, [includedFloors, approved.length, preliminary, structure, prices, structureReady, availableFloors]);
  const hasApprovedFinishes = includedFloors.some(i => Boolean(approved[i]?.summary));
  const missingFinishes = includedFloors.filter(i => !approved[i]?.summary);
  const preliminaryReady = !includedFloors.includes(0) || Boolean(preliminary);
  const priceAvailability: Record<string, boolean> = {
    excavation: hasPrice(prices.preliminary, 1),
    backfill: hasPrice(prices.preliminary, 2),
    concrete: hasPrice(prices.concrete, 2),
    steel: validPrice(prices.steelUnified),
    stone: hasPrice(prices.preliminary, 3),
    hordi: hasPrice(prices.block, 2),
    ...Object.fromEntries(lines.filter(x=>x.key.startsWith("contractor:")).map(x=>[x.key,hasPrice(prices.labor,1)])),
    ...Object.fromEntries(prices.other.map(x=>[`extra:${x.id}`,validPrice(x.price) && (x.costType === "fixed" || (hasPrice(prices.concrete,2) && validPrice(prices.steelUnified)))])),
  };
  const lineCost = (line:Line) => priceAvailability[line.key] ? line.quantity * line.unitPrice : 0;
  const preliminaryCost = lines.filter(x=>x.category==='الأعمال التمهيدية').reduce((sum,x)=>sum+lineCost(x),0);
  const structureCost = lines.filter(x=>x.category!=='الأعمال التمهيدية').reduce((sum,x)=>sum+lineCost(x),0);
  const missingBasePrices = lines.filter(line => line.quantity > 0 && !priceAvailability[line.key]);
  const sameCurrency = finishesCurrency === prices.currency;
  const canTotal = includedFloors.length > 0 && hasApprovedFinishes && missingFinishes.length === 0 && structureReady && preliminaryReady && usePagePrices && pricesComplete && missingBasePrices.length === 0 && sameCurrency && conversionValid;
  const finishesCost = finishCosts.materials + finishCosts.labor + finishCosts.plumbing + finishCosts.electrical;
  const total = finishesCost + preliminaryCost + structureCost;
  const concreteQuantity = lines.find(x=>x.key==='concrete')?.quantity;
  const steelQuantity = lines.find(x=>x.key==='steel')?.quantity;
  const areasReady = includedFloors.length > 0 && includedFloors.every(i => typeof floorAreas[i] === 'number' && Number.isFinite(floorAreas[i]) && (floorAreas[i] ?? 0) > 0);
  const totalArea = areasReady ? includedFloors.reduce((sum, i) => sum + (floorAreas[i] ?? 0), 0) : 0;
  const area = areasReady ? totalArea / includedFloors.length : 0;
  const categoryCost = (category:string) => lines.filter(x=>x.category===category).reduce((sum,x)=>sum+lineCost(x),0);
  const indicatorCosts = [['نسبة الأعمال التمهيدية',preliminaryCost],['نسبة الخرسانة',lines.filter(x=>x.key==='concrete').reduce((s,x)=>s+lineCost(x),0)],['نسبة الحديد',lines.filter(x=>x.key==='steel').reduce((s,x)=>s+lineCost(x),0)],['نسبة البلوك الهوردي',lines.filter(x=>x.key==='hordi').reduce((s,x)=>s+lineCost(x),0)],['نسبة أجور المقاول',categoryCost('أجور المقاول')],['نسبة المصاريف الإضافية',categoryCost('مصاريف إضافية')],['نسبة التشطيبات',finishesCost]] as const;
  const [sharing, setSharing] = useState(false);
  return <section dir="rtl" style={{ border: '1px solid #7795a055', borderRadius: 12, padding: 12, marginTop: 18 }}>
    <div id="unified-financial-print-area">
      {['الأعمال التمهيدية','مواد الهيكل','أجور المقاول','مصاريف إضافية'].map(category => {
        const rows = lines.filter(line=>line.category===category);
        const after = category === 'الأعمال التمهيدية' ? quantitySections : null;
        if (!rows.length) return <React.Fragment key={category}>{category === 'الأعمال التمهيدية' && includedFloors.includes(0) && <SummaryTablePanel title='كميات وتكلفة الأعمال التمهيدية'><p>لم تُحسب الأعمال التمهيدية.</p></SummaryTablePanel>}{after}</React.Fragment>;
        const extras = category === 'مصاريف إضافية';
        const title = summaryHeading(category === 'الأعمال التمهيدية' ? 'كميات وتكلفة الأعمال التمهيدية' : category === 'مواد الهيكل' ? 'تكلفة المواد' : category, displayCurrency, includedFloors.length);
        return <React.Fragment key={category}><SummaryTablePanel title={title}><table style={summaryTableStyle}><thead><tr><th>البند</th>{!extras && <><th>الكمية</th><th>سعر الوحدة</th></>}<th>الإجمالي</th></tr></thead><tbody>
          {category === 'الأعمال التمهيدية' && preliminary && ([['landBoundaryArea','مساحة حدود الأرض'],['buildingArea','مساحة المبنى']] as const).map(([key,label])=><tr key={key}><td>{label}</td><td>{quantityFormat(numeric(preliminary[key]))} م²</td><td>—</td><td>—</td></tr>)}
          {rows.map(line=><tr key={line.key}><td>{line.label}</td>{!extras && <><td>{quantityFormat(line.quantity)} {line.unit}</td><td>{priceAvailability[line.key]?money(line.unitPrice):'—'}</td></>}<td>{priceAvailability[line.key]?money(lineCost(line)):'—'}</td></tr>)}
          <SummaryTotalRow columns={extras?2:4} value={money(rows.reduce((sum,line)=>sum+lineCost(line),0))}/></tbody></table></SummaryTablePanel>{after}</React.Fragment>;
      })}
      {finishesSections}
      <details open><summary className="qty-main-heading">{summaryHeading('الملخص المالي النهائي', displayCurrency, includedFloors.length)}</summary>
      <table style={{width:'100%',textAlign:'right'}}><tbody>
      {includedFloors.includes(0)&&<tr><td>إجمالي الأعمال التمهيدية</td><td>{money(preliminaryCost)}</td></tr>}
      {lines.filter(x=>x.category==='مواد الهيكل').map(line=><tr key={line.key}><td>{line.label}</td><td>{priceAvailability[line.key]?money(lineCost(line)):'—'}</td></tr>)}
      {['أجور المقاول','مصاريف إضافية'].map(category=><tr key={category}><td>{category}</td><td>{money(lines.filter(x=>x.category===category).reduce((sum,x)=>sum+lineCost(x),0))}</td></tr>)}
      {([['مواد التشطيبات',finishCosts.materials],['عمالة التشطيبات',finishCosts.labor],['مواد السباكة',finishCosts.plumbing],['مواد الكهرباء',finishCosts.electrical]] as const).map(([label,value])=><tr key={label}><td>{label}</td><td>{sameCurrency && usePagePrices && hasApprovedFinishes ? money(value) : '—'}</td></tr>)}
      <SummaryTotalRow columns={2} label="الإجمالي المالي الكلي" value={sameCurrency && usePagePrices && includedFloors.length > 0 ? money(total) : "—"}/>
      </tbody></table>
      {!canTotal && <p>التكاليف المتاحة لا تشمل البنود غير المسعّرة أو الكميات غير المتوفرة.</p>}
      </details>
      <SummaryTablePanel title="مؤشرات هندسية">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8}}>
          {([['إجمالي مسطحات البناء',areasReady?quantityFormat(totalArea)+' م²':'—'],['متوسط مساحة الدور',areasReady?quantityFormat(area)+' م²':'—'],['إجمالي الخرسانة',concreteQuantity===undefined?'—':quantityFormat(concreteQuantity)+' م³'],['إجمالي الحديد',steelQuantity===undefined?'—':quantityFormat(steelQuantity)+' طن'],['تكلفة المتر المربع',canTotal&&area>0?money(total/area)+' '+displayCurrency:'—'],['الحديد / م²',structureReady&&area>0&&steelQuantity!==undefined?quantityFormat(steelQuantity*1000/area)+' كجم/م²':'—'],['الخرسانة / م²',structureReady&&area>0&&concreteQuantity!==undefined?quantityFormat(concreteQuantity/area)+' م³/م²':'—']] as const).map(([label,value])=><div key={label} style={{border:'1px solid #00e0e955',borderRadius:8,padding:8,textAlign:'center'}}><span>{label}</span><strong style={{display:'block'}}>{value}</strong></div>)}
        </div>
        {indicatorCosts.map(([label,value])=>{const percent=canTotal&&total>0?value/total*100:null;return <div key={label} style={{marginTop:8}}><div style={{display:'flex',justifyContent:'space-between'}}><span>{label}</span><span>{percent===null?'—':quantityFormat(percent)+'%'}</span></div><div style={{height:6,background:'#8090a033',borderRadius:3}}><div style={{height:6,width:`${percent??0}%`,background:'#00e0e9',borderRadius:3}}/></div></div>})}
      </SummaryTablePanel>
    </div>
    <div data-pdf-exclude="true">
      <button type="button" disabled={sharing || includedFloors.length === 0} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:12, marginTop:12, borderRadius:8, border:"1px solid var(--qty-accent)", background:"var(--qty-navy)", color:"#fff", fontFamily:"inherit", fontWeight:700, cursor: includedFloors.length && !sharing ? "pointer" : "not-allowed" }} onClick={async () => {
        if (!includedFloors.length || sharing) return;
        setSharing(true);
        const title = summaryHeading('تقرير الكميات والتكاليف', displayCurrency, includedFloors.length);
        const projectName = getSavedProjectName(projectId);
        try { await createPdfFromElement(fullReportReady === undefined ? 'unified-financial-print-area' : 'approved-full-report-print-area', title, { title, projectName, floorName: includedFloors.map(i => i === 0 ? 'الدور الأرضي' : `الدور ${i}`).join('، ') }); } finally { setSharing(false); }
      }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qty-accent)" strokeWidth="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4M9 13l6 4"/></svg>{sharing ? "جارٍ تجهيز التقرير…" : "مشاركة تقرير الكميات والتكاليف PDF"}</button>
    </div>
  </section>;
};
