import { SummaryTotalRow, SummaryTablePanel, summaryTableStyle, summaryCurrencyLabel } from './summaryComponents';
import { summaryHeading } from './summaryHeading';
import { formatQuantity } from './quantityFormat';
import React, { useEffect, useMemo, useState } from 'react';
import { getInitial, PRICES_CHANGED_EVENT, getBlockLaborUnit, getBlockLaborPrice, isBlockLaborLabel, BLOCK_LABOR_PRICE_KEY } from './pricesData';
import { plumbingPriceKey, type PricesData } from './pricesTypes';
import type { StructureRecord } from './structureFloorAllocation';
import { UnifiedFinancialSummary } from './UnifiedFinancialSummary';

interface Props { projectId: string; floorHeights: number[]; selectedFloors: number[]; floorAreas: (number | null)[] }
type Approved = { summary?: Record<string, unknown>; approvedAt?: string };
const asNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const electricalMaterialItems = [
  { key: 'lampHolders', title: 'بيوت اللمبات', unit: 'عدد' },
  { key: 'switches', title: 'المفاتيح', unit: 'عدد' },
  { key: 'wireRolls', title: 'لفات السلك الكهربائي', unit: 'لفة' },
  { key: 'conduitRolls', title: 'لفات بيبات التمديدات الكهربائية', unit: 'لفة' },
  { key: 'dynamos', title: 'الديناموهات', unit: 'عدد' },
] as const;
const electricalMaterialQuantity = (record: Approved | null | undefined, key: string): number | null => {
  const materials = record?.summary?.electricalMaterials;
  if (!materials || typeof materials !== 'object') return null;
  const value = (materials as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
};
// الكميات المعتمدة فقط؛ غياب البيانات يختلف عن اعتماد جدول فارغ.
const plumbingMaterialMap = (record: Approved | null | undefined): Map<string, { material: string; diameter: string; quantity: number }> | null => {
  const items = record?.summary?.plumbingMaterials;
  if (!Array.isArray(items)) return null;
  const result = new Map<string, { material: string; diameter: string; quantity: number }>();
  for (const item of items) {
    if (!item || typeof item.material !== 'string' || typeof item.diameter !== 'string' || typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity < 0) return null;
    const material = item.material.trim(), diameter = item.diameter.trim();
    if (!material) continue;
    const key = JSON.stringify([material, diameter]);
    result.set(key, { material, diameter, quantity: (result.get(key)?.quantity ?? 0) + item.quantity });
  }
  return result;
};
const floorName = (i: number) => i === 0 ? 'الدور الأرضي' : `الدور ${i}`;

export const ApprovedFloorsSummary: React.FC<Props> = ({ projectId, floorHeights, selectedFloors, floorAreas }) => {
  const [revision, setRevision] = useState(0);
  // أسعار تقديرية مستقلة للمشروع؛ لا تُستنتج من أسعار غير مرتبطة بالبنود.
  const [prices, setPrices] = useState<PricesData>(() => getInitial(projectId));
  const usePagePrices = true;
  const currencyKey = `qty_summary_currency_${projectId}`;
  const [settings, setSettings] = useState<{source:string; target:string; rate:string}>(() => {
    try { const saved = JSON.parse(localStorage.getItem(currencyKey) || 'null');
      if (saved && ['YER','SAR','USD'].includes(saved.target) && typeof saved.source === 'string' && typeof saved.rate === 'string') return saved;
    } catch { /* default to source currency */ }
    return {source:prices.currency,target:prices.currency,rate:''};
  });
  const [currencySaveError,setCurrencySaveError] = useState(false);
  const target = settings.target;
  const rateText = settings.source === prices.currency ? settings.rate : '';
  const rate = target === prices.currency ? 1 : Number(rateText);
  const conversionValid = Number.isFinite(rate) && rate > 0 && (target === prices.currency || rateText.trim() !== '');
  const updateCurrency = (next: typeof settings) => {
    setSettings(next);
    try { localStorage.setItem(currencyKey,JSON.stringify(next)); setCurrencySaveError(false); }
    catch { setCurrencySaveError(true); }
  };
  const money = (value:number) => conversionValid && Number.isFinite(value/rate) ? formatQuantity(value/rate) : '—';
  useEffect(() => {
    const refreshPrices = () => setPrices(getInitial(projectId));
    refreshPrices();
    window.addEventListener('storage', refreshPrices);
    window.addEventListener('focus', refreshPrices);
    window.addEventListener(PRICES_CHANGED_EVENT, refreshPrices);
    return () => { window.removeEventListener('storage', refreshPrices); window.removeEventListener('focus', refreshPrices); window.removeEventListener(PRICES_CHANGED_EVENT, refreshPrices); };
  }, [projectId]);
  useEffect(() => {
    const refresh = () => setRevision(n => n + 1);
    const onApproval = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (!detail?.projectId || detail.projectId === projectId) refresh();
    };
    window.addEventListener('qty-approval-changed', onApproval);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('qty-approval-changed', onApproval);
      window.removeEventListener('storage', refresh);
    };
  }, [projectId]);
  const approved = useMemo(() => floorHeights.map((_, i) => {
    try {
      const value = localStorage.getItem(`qty_approved_${projectId}_${i}`);
      return value ? JSON.parse(value) as Approved : null;
    } catch { return null; }
  }), [projectId, floorHeights, revision]);
  const preliminary = useMemo(() => {
    try {
      const raw = localStorage.getItem(`qty_preliminary_${projectId}`);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
    } catch { return null; }
  }, [projectId, revision]);
  const structure = useMemo(() => {
    try {
      const raw = localStorage.getItem(`qty_structure_${projectId}`);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return value && typeof value === 'object' && !Array.isArray(value) ? value as StructureRecord : null;
    } catch { return null; }
  }, [projectId, revision]);
  const included = [...new Set(selectedFloors.filter(i => Number.isInteger(i) && i >= 0 && i < floorHeights.length))].sort((a, b) => a - b);
  const ready = included.filter(i => approved[i]?.summary);
  const missing = included.filter(i => !approved[i]?.summary);
  const canExportApproved = included.length > 0 && missing.length === 0;
  const grossSlab = (i: number) => (structure?.floorAllocations?.[i] as { slabGrossVolume?: number } | undefined)?.slabGrossVolume;
  const availableStructureFloors = included.filter(i => structure?.allocationMethod === 'independent-floor-estimate-v1' && (() => { const gross = grossSlab(i); const row = structure.floorAllocations?.[i]; return row?.floor === i && typeof gross === 'number' && Number.isFinite(gross) && gross >= row.slabConcrete && gross >= 0; })());
  const validStructureAllocation = availableStructureFloors.length === included.length;
  const canExportFullReport = canExportApproved && (!included.includes(0) || Boolean(preliminary)) && validStructureAllocation && usePagePrices;
  const fmt = (v: number) => formatQuantity(v);
  // Price only the detailed snapshot, never its overlapping aggregate rows.
  type CostRow = { labor: boolean; key: string; title: string; unit: string; values: number[]; price: number | null };
  let detailedComplete = ready.every(i => Array.isArray(approved[i]?.summary?.finalQuantityRows) && Array.isArray(approved[i]?.summary?.laborRows));
  const blockUnit = getBlockLaborUnit(prices);
  const blockMissing = new Set<number>();
  const detailed = new Map<string, CostRow>();
  const priceItems = [...prices.finishesMaterials, ...prices.doorsAndWindows, ...prices.finishesLabor];
  const addCost = (index: number, key: string, title: string, unit: string, quantity: number, explicitPrice?: number | null) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const identity = JSON.stringify([key, unit]);
    const item = priceItems.find(p => p.quantityKey === key && p.unit === unit);
    const value = item && String(item.price).trim() ? Number(String(item.price).replace(/,/g, '')) : NaN;
    const row = detailed.get(identity) ?? { labor: key.startsWith('labor:') || key.startsWith(`${BLOCK_LABOR_PRICE_KEY}:`), key: identity, title, unit, values: ready.map(() => 0), price: explicitPrice !== undefined ? explicitPrice : (Number.isFinite(value) && value >= 0 ? value : null) };
    row.values[index] += quantity;
    detailed.set(identity, row);
  };
  ready.forEach((floor, index) => {
    const summary = approved[floor]?.summary;
    if (!summary) return;
    if (Array.isArray(summary.finalQuantityRows)) for (const row of summary.finalQuantityRows) {
      if (!row || typeof row.id !== 'string' || typeof row.unit !== 'string') continue;
      if (['putty','primer','paint'].includes(row.id) || row.id.startsWith('plumbing:') || electricalMaterialItems.some(item => item.key === row.id)) continue;
      const key = ['exteriorBlocks', 'interiorBlocks'].includes(row.id) ? 'blocks' : row.id;
      addCost(index, key, row.label, row.unit, row.quantity);
    }
    if (Array.isArray(summary.laborRows)) for (const row of summary.laborRows) {
      if (!row || typeof row.label !== 'string' || typeof row.unit !== 'string') continue;
      const label = row.manual ? row.label : (row.originalLabel || row.label);
      if (!row.manual && isBlockLaborLabel(label)) {
        const q = row.blockLaborQuantities?.[blockUnit === 'بلوكة' ? 'blocks' : 'area'];
        if (typeof q !== 'number' || !Number.isFinite(q) || q < 0) {
          blockMissing.add(floor);
          detailedComplete = false;
          continue;
        }
        addCost(index, `${BLOCK_LABOR_PRICE_KEY}:${label}`, row.label, blockUnit, q, getBlockLaborPrice(prices));
      } else {
        addCost(index, `labor:${JSON.stringify([label, row.unit])}`, row.label, row.unit, row.quantity);
      }
    }
    const paint = summary.paint as Record<string, unknown> | undefined;
    for (const [key, title] of [['putty','المعجون'],['primer','البرايمر'],['paint','الطلاء']]) {
      addCost(index, key, title, 'كجم', asNumber(paint?.[key]));
    }
  });
  const detailedRows = Array.from(detailed.values());
  const rowTotal = (row: CostRow) => row.values.reduce((sum, value) => sum + value, 0);

  const unpricedItems = detailedRows.filter(row => row.price === null);

  const plumbingByFloor = ready.map(i => plumbingMaterialMap(approved[i]));
  const plumbingItems = new Map<string, { material: string; diameter: string }>();
  for (const materials of plumbingByFloor) {
    materials?.forEach((item, key) => plumbingItems.set(key, item));
  }
  const plumbingIncomplete = plumbingByFloor.some(items => items === null);
  const utilityPrice = (section: 'electricalMaterials' | 'plumbingMaterials', key: string): number | null => {
    const row = prices[section]?.find(item => item.quantityKey === key);
    if (!row || !String(row.price).trim()) return null;
    const value = Number(String(row.price).replace(/,/g, ''));
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const electricalCosts = electricalMaterialItems.map(item => {
    const values = ready.map(i => electricalMaterialQuantity(approved[i], item.key));
    return { title: item.title, quantity: values.every(v => v === null) ? null : values.reduce<number>((sum,v)=>sum+(v??0),0), partial: values.some(v => v === null), price: utilityPrice('electricalMaterials', item.key) };
  });
  const plumbingCosts = Array.from(plumbingItems.entries()).map(([key,item]) => ({
    title: `${item.material} ${item.diameter}`.trim(),
    partial: plumbingIncomplete, quantity: plumbingByFloor.reduce((sum,items)=>sum+(items?.get(key)?.quantity??0),0),
    price: utilityPrice('plumbingMaterials', plumbingPriceKey(item.material,item.diameter)),
  }));
  const utilityCosts = [...electricalCosts,...plumbingCosts];
  const utilityIncomplete = plumbingIncomplete || utilityCosts.some(item => item.partial || item.quantity === null || (item.quantity > 0 && item.price === null));
  const detailedCost = (rows: CostRow[]) => rows.reduce((sum,row)=>sum+rowTotal(row)*(row.price??0),0);
  const utilityCost = (rows: typeof utilityCosts) => rows.reduce((sum,item)=>sum+(item.quantity??0)*(item.price??0),0);
  const finishCosts = {
    materials: detailedCost(detailedRows.filter(row=>!row.labor)),
    labor: detailedCost(detailedRows.filter(row=>row.labor)),
    plumbing: utilityCost(plumbingCosts),
    electrical: utilityCost(electricalCosts),
  };
  const pricesComplete = detailedComplete && unpricedItems.length === 0 && !utilityIncomplete;

  const controlStyle: React.CSSProperties = { width:'100%', boxSizing:'border-box', padding:8, borderRadius:8, border:'1px solid #8090a066', background:'transparent', color:'inherit' };
  const tableStyle = summaryTableStyle;
  const panel = (title:string, children:React.ReactNode) => <SummaryTablePanel title={title}>{children}</SummaryTablePanel>;
  const costTable = (rows:CostRow[]) => <table style={tableStyle}><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة ({summaryCurrencyLabel(target)})</th><th>التكلفة ({summaryCurrencyLabel(target)})</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><td>{row.title}</td><td>{fmt(rowTotal(row))} {row.unit}</td><td>{row.price===null?'—':money(row.price)}</td><td>{row.price===null?'—':money(rowTotal(row)*row.price)}</td></tr>)}<SummaryTotalRow currency={target} columns={4} value={money(detailedCost(rows))}/></tbody></table>;
  const structuralTable = (steel:boolean) => {
    const rows = steel ? ([['footingSteel','القواعد'],['neckSteel','الرقاب'],['columnSteel','الأعمدة'],['middSteel','الميدات'],['slabSteel','الأسقف'],['totalSteel','الإجمالي']] as const) : ([['footingConcrete','القواعد'],['neckConcrete','الرقاب'],['columnConcrete','الأعمدة'],['middConcrete','الميدات'],['slabConcrete','الأسقف'],['totalConcrete','الإجمالي']] as const);
    return availableStructureFloors.length > 0 ? <table style={tableStyle}><thead><tr><th>البند</th><th>الكمية ({steel?'طن':'م³'})</th></tr></thead><tbody>{rows.filter(([key])=>included.includes(0)||! /^(footing|neck|midd)/.test(key)).map(([key,label])=>key.startsWith("total") ? <SummaryTotalRow key={key} columns={2} value={fmt(availableStructureFloors.reduce((sum,i)=>sum+asNumber(structure?.floorAllocations?.[i]?.[key]),0))}/> : <tr key={key}><td>{label}</td><td>{fmt(availableStructureFloors.reduce((sum,i)=>sum+asNumber(structure?.floorAllocations?.[i]?.[key]),0))}</td></tr>)}</tbody></table> : <p>أعد حساب الهيكل الخرساني للأدوار المرسومة.</p>;
  };
  return <section dir="rtl" style={{minWidth:0}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 150px),1fr))',gap:8,marginBottom:12}} data-pdf-exclude="true">
      <label>عملة الملخص<select style={controlStyle} value={target} onChange={e=>updateCurrency({source:prices.currency,target:e.target.value,rate:''})}><option value="YER">ريال يمني</option><option value="SAR">ريال سعودي</option><option value="USD">دولار أمريكي</option></select></label>
      {target!==prices.currency&&<label>سعر صرف 1 {target} بوحدة {prices.currency}<input style={controlStyle} type="number" inputMode="decimal" min="0" step="any" value={rateText} onFocus={e=>e.target.select()} onChange={e=>updateCurrency({source:prices.currency,target,rate:e.target.value})}/></label>}
    </div>
    {!conversionValid&&<p role="status">أدخل سعر الصرف لعرض التكاليف.</p>}
    {currencySaveError&&<p role="status">تعذر حفظ إعدادات العملة.</p>}
    {missing.length>0&&<p role="status">أدوار غير معتمدة: {missing.map(floorName).join('، ')}</p>}
    <div id="approved-full-report-print-area" className="summary-pdf-report">
      <UnifiedFinancialSummary quantitySections={<>
      {included.length>0&&<>{panel('كميات الخرسانة',structuralTable(false))}{panel('كميات الحديد',structuralTable(true))}</>}
</>} finishesSections={<>
      {ready.length>0&&<div id="approved-floors-print-area">
        {panel(summaryHeading('تكلفة مواد التشطيبات',target,included.length),costTable(detailedRows.filter(row=>!row.labor)))}
        {panel(summaryHeading('أجور عمالة التشطيبات',target,included.length),costTable(detailedRows.filter(row=>row.labor)))}
        {([['مواد الكهرباء',electricalCosts],['مواد السباكة',plumbingCosts]] as const).map(([title,rows])=><React.Fragment key={title}>{panel(summaryHeading(title,target,included.length),<table style={tableStyle}><thead><tr><th>المادة</th><th>الكمية</th><th>سعر الوحدة ({summaryCurrencyLabel(target)})</th><th>التكلفة ({summaryCurrencyLabel(target)})</th></tr></thead><tbody>{rows.map((item,index)=><tr key={index}><td>{item.title}</td><td>{item.quantity===null?'—':fmt(item.quantity)+(item.partial?' (متاح)':'')}</td><td>{item.price===null?'—':money(item.price)}</td><td>{item.quantity===null||item.price===null?'—':money(item.quantity*item.price)}</td></tr>)}<SummaryTotalRow currency={target} columns={4} value={money(utilityCost(rows))}/></tbody></table>)}</React.Fragment>)}
      </div>}
</>} includedFloors={included} floorAreas={floorAreas} approved={approved} preliminary={preliminary} structure={structure} prices={prices} finishCosts={finishCosts} finishesCurrency={prices.currency} usePagePrices={usePagePrices} pricesComplete={pricesComplete} displayCurrency={target} exchangeRate={conversionValid ? rate : null} fullReportReady={canExportFullReport} projectId={projectId} />
      </div>
    </section>
  ;
};
