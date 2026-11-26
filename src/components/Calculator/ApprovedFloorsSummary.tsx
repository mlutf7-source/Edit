import { summaryHeading } from './summaryHeading';
import { formatQuantity } from './quantityFormat';
import React, { useEffect, useMemo, useState } from 'react';
import { getInitial, getBlockLaborUnit, getBlockLaborPrice, isBlockLaborLabel, BLOCK_LABOR_PRICE_KEY } from './pricesData';
import { plumbingPriceKey, type PricesData } from './pricesTypes';
import type { StructureRecord } from './structureFloorAllocation';
import { UnifiedFinancialSummary } from './UnifiedFinancialSummary';

interface Props { projectId: string; floorHeights: number[]; selectedFloors: number[] }
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

export const ApprovedFloorsSummary: React.FC<Props> = ({ projectId, floorHeights, selectedFloors }) => {
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
    return () => { window.removeEventListener('storage', refreshPrices); window.removeEventListener('focus', refreshPrices); };
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
  const validStructureAllocation = Boolean(structure?.allocationMethod === 'independent-floor-estimate-v1' && structure.floorAllocations?.length === floorHeights.length && included.every(i => { const gross = grossSlab(i); const row = structure.floorAllocations?.[i]; return row?.floor === i && typeof gross === 'number' && Number.isFinite(gross) && gross >= row.slabConcrete && gross >= 0; }));
  const canExportFullReport = canExportApproved && (!included.includes(0) || Boolean(preliminary)) && validStructureAllocation && usePagePrices;
  const fmt = (v: number) => formatQuantity(v);
  // Price only the detailed snapshot, never its overlapping aggregate rows.
  type CostRow = { key: string; title: string; unit: string; values: number[]; price: number | null };
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
    const row = detailed.get(identity) ?? { key: identity, title, unit, values: ready.map(() => 0), price: explicitPrice !== undefined ? explicitPrice : (Number.isFinite(value) && value >= 0 ? value : null) };
    row.values[index] += quantity;
    detailed.set(identity, row);
  };
  ready.forEach((floor, index) => {
    const summary = approved[floor]?.summary;
    if (!summary) return;
    if (Array.isArray(summary.finalQuantityRows)) for (const row of summary.finalQuantityRows) {
      if (!row || typeof row.id !== 'string' || typeof row.unit !== 'string') continue;
      if (row.id.startsWith('plumbing:') || electricalMaterialItems.some(item => item.key === row.id)) continue;
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
  const baseEstimatedCost = detailedRows.reduce((sum, row) => sum + rowTotal(row) * (row.price ?? 0), 0);
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
    return { title: item.title, quantity: values.some(v => v === null) ? null : values.reduce<number>((sum,v)=>sum+(v??0),0), price: utilityPrice('electricalMaterials', item.key) };
  });
  const plumbingCosts = Array.from(plumbingItems.entries()).map(([key,item]) => ({
    title: `${item.material} ${item.diameter}`.trim(),
    quantity: plumbingIncomplete ? null : plumbingByFloor.reduce((sum,items)=>sum+(items?.get(key)?.quantity??0),0),
    price: utilityPrice('plumbingMaterials', plumbingPriceKey(item.material,item.diameter)),
  }));
  const utilityCosts = [...electricalCosts,...plumbingCosts];
  const utilityIncomplete = plumbingIncomplete || utilityCosts.some(item => item.quantity === null || (item.quantity > 0 && item.price === null));
  const totalEstimatedCost = baseEstimatedCost + utilityCosts.reduce((sum,item)=>sum+(item.quantity??0)*(item.price??0),0);
  const pricesComplete = detailedComplete && unpricedItems.length === 0 && !utilityIncomplete;

  const controlStyle: React.CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid #8b9baa', background: 'transparent', color: 'inherit' };
  return (
    <section dir="rtl" style={{ padding: 12, border: '1px solid #7795a055', borderRadius: 12, marginBottom: 16 }}>
      <h3 className="qty-main-heading">{summaryHeading('ملخص الكميات المعتمدة', target, included.length)}</h3>
      <p>عملة الأسعار الأصلية: {prices.currency}</p>
      <label>عملة الملخص <select value={target} onChange={e=>updateCurrency({source:prices.currency,target:e.target.value,rate:''})}><option value="YER">ريال يمني</option><option value="SAR">ريال سعودي</option><option value="USD">دولار أمريكي</option></select></label>
      {target !== prices.currency && <label>سعر صرف 1 {target} بوحدة {prices.currency} <input type="number" inputMode="decimal" min="0" step="any" value={rateText} onFocus={e=>e.target.select()} onChange={e=>updateCurrency({source:prices.currency,target,rate:e.target.value})}/></label>}
      {!conversionValid && <p role="status">أدخل سعر صرف موجباً وصحيحاً لإظهار التكاليف.</p>}
      {currencySaveError && <p role="status">تعذر حفظ إعدادات العملة.</p>}
      {usePagePrices && <button type="button" style={controlStyle} onClick={() => setPrices(getInitial(projectId))}>تحديث الأسعار من صفحة الأسعار</button>}
      {included.length === 0 && <p role="status">حدد دوراً واحداً على الأقل لعرض الكميات أو تصديرها.</p>}
      {missing.length > 0 && <p role="status" style={{ color: '#d08a26' }}>أدوار لم تُعتمد بعد: {missing.map(floorName).join('، ')}. لا تدخل في الإجمالي.</p>}
      {unpricedItems.length > 0 && <p role="status" style={{ color: '#b45309' }}>بنود ذات كميات بلا أسعار محددة: {unpricedItems.map(x => x.title).join('، ')}. لا يُتاح التقرير المالي النهائي قبل تسعيرها.</p>}
      <div id="approved-full-report-print-area" className="summary-pdf-report">
        <h3 className="qty-main-heading">{summaryHeading('تقرير الكميات والتكاليف', target, included.length)}</h3>
        <p>نطاق التقرير: {included.map(floorName).join('، ') || 'لم يتم اختيار أدوار'}</p>
        <p>العملة: {target} — الأسعار: {usePagePrices ? 'مرتبطة بصفحة الأسعار للبنود المطابقة' : 'يدوية أو مختلطة'}</p>
      {ready.length === 0 ? <p>لا توجد كميات معتمدة ضمن الأدوار المختارة. احسب كميات الدور ثم اضغط «اعتماد كميات الدور إلى الملخص».</p> : <>
        <div id="approved-floors-print-area"><p>عملة العرض: {target} — عملة المصدر: {prices.currency}{target !== prices.currency && conversionValid ? ` — سعر الصرف: ${rate}` : ""}</p>
          <p>الأدوار الداخلة في الإجمالي: {ready.map(floorName).join('، ')}</p>
          <p style={{ fontSize: 12 }}>حالة الاعتماد: {ready.map(i => `${floorName(i)} (${approved[i]?.approvedAt ? new Date(approved[i]!.approvedAt!).toLocaleString('ar-YE') : 'تاريخ غير متوفر'})`).join('، ')}</p>
          {blockMissing.size > 0 && <p role="status">أعد اعتماد كميات عمالة البلوك للأدوار: {[...blockMissing].map(floorName).join('، ')}. الكميات بالوحدة المختارة غير متوفرة، والإجمالي غير مكتمل.</p>}
          {!detailedComplete && <p role="status">أعد اعتماد الأدوار القديمة لاستكمال بيانات التسعير التفصيلي. الإجمالي المالي غير مكتمل.</p>}
          <h4 className="qty-main-heading">{summaryHeading('ملخص التشطيبات والعمالة', target, ready.length)}</h4>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead><tr><th>البند</th><th>الوحدة</th>{ready.map(i => <th key={i}>{floorName(i)}</th>)}<th>الإجمالي</th><th>سعر الوحدة</th><th>التكلفة</th></tr></thead>
            <tbody>{detailedRows.map(row => <tr key={row.key}>
              <td>{row.title}</td><td>{row.unit}</td>{row.values.map((value,index) => <td key={ready[index]}>{fmt(value)}</td>)}
              <td>{fmt(rowTotal(row))}</td><td>{row.price === null ? 'غير مسعر' : money(row.price)}</td><td>{row.price === null ? '—' : money(rowTotal(row)*row.price)}</td>
            </tr>)}<tr><td colSpan={ready.length+4}>إجمالي المواد والعمالة دون مواد الكهرباء والسباكة</td><td>{money(baseEstimatedCost)}</td></tr></tbody>
          </table></div>
          <section style={{ marginTop: 16 }}>
            <h4 className="qty-main-heading">{summaryHeading('كميات مواد الكهرباء المعتمدة', target, ready.length)}</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead><tr><th>البند</th><th>الوحدة</th>{ready.map(i => <th key={i}>{floorName(i)}</th>)}<th>الإجمالي</th></tr></thead>
                <tbody>{electricalMaterialItems.map(item => {
                  const values = ready.map(i => electricalMaterialQuantity(approved[i], item.key));
                  return <tr key={item.key} style={{ borderTop: '1px solid #8090a044' }}>
                    <td style={{ padding: 7 }}>{item.title}</td><td>{item.unit}</td>
                    {values.map((value, index) => <td key={ready[index]}>{value === null ? '—' : fmt(value)}</td>)}
                    <td style={{ fontWeight: 700 }}>{values.some(value => value === null) ? '—' : fmt(values.reduce<number>((sum, value) => sum + (value ?? 0), 0))}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {ready.some(i => electricalMaterialItems.some(item => electricalMaterialQuantity(approved[i], item.key) === null)) && <p role="status">بعض الأدوار لا تحتوي على كميات مواد كهرباء معتمدة. أعد حسابها واعتمادها لإظهار الإجمالي الكامل.</p>}
          </section>
          <section style={{ marginTop: 16 }}>
            <h4 className="qty-main-heading">{summaryHeading('كميات مواد السباكة المعتمدة', target, ready.length)}</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead><tr><th>المادة</th><th>القطر (إنش)</th><th>الوحدة</th>{ready.map(i => <th key={i}>{floorName(i)}</th>)}<th>الإجمالي</th></tr></thead>
                <tbody>{Array.from(plumbingItems.entries()).map(([key, item]) => {
                  const values = plumbingByFloor.map(items => items === null ? null : (items.get(key)?.quantity ?? 0));
                  return <tr key={key} style={{ borderTop: '1px solid #8090a044' }}>
                    <td style={{ padding: 7 }}>{item.material}</td><td>{item.diameter || '—'}</td><td>عدد</td>
                    {values.map((value, index) => <td key={ready[index]}>{value === null ? '—' : fmt(value)}</td>)}
                    <td style={{ fontWeight: 700 }}>{plumbingIncomplete ? '—' : fmt(values.reduce<number>((sum, value) => sum + (value ?? 0), 0))}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {plumbingItems.size === 0 && !plumbingIncomplete && <p>لا توجد مواد سباكة معتمدة للأدوار المختارة.</p>}
            {plumbingIncomplete && <p role="status">بعض الأدوار لا تحتوي على كميات مواد سباكة معتمدة. أعد حسابها واعتمادها لإظهار الإجمالي الكامل.</p>}
          </section>
          <section style={{marginTop:16}}><h4 className="qty-main-heading">{summaryHeading('تكلفة مواد الكهرباء والسباكة', target, ready.length)}</h4>
            <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'right'}}><thead><tr><th>المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>التكلفة</th></tr></thead><tbody>
              {utilityCosts.map((item,index)=><tr key={index}><td>{item.title}</td><td>{item.quantity===null?'—':fmt(item.quantity)}</td><td>{item.price===null?'غير مسعر':money(item.price)}</td><td>{item.quantity===null||item.price===null?'—':money(item.quantity*item.price)}</td></tr>)}
              <tr><td colSpan={3}>إجمالي التشطيبات مع مواد الكهرباء والسباكة (تقديري)</td><td>{money(totalEstimatedCost)}</td></tr>
            </tbody></table></div>{utilityIncomplete&&<p role="status">توجد كميات أو أسعار مواد غير مكتملة؛ لا يعتمد الإجمالي المالي النهائي.</p>}
          </section>
        </div>
      </>}
      {included.includes(0) && <section style={{ marginTop: 16 }}>
        <h4 className="qty-main-heading">{summaryHeading('الأعمال التمهيدية — الدور الأرضي فقط', target, 1)}</h4>
        {preliminary ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'right' }}>
          <thead><tr><th>البند</th><th>الكمية</th><th>الوحدة</th></tr></thead>
          <tbody>{([
            ['landBoundaryArea', 'مساحة حدود الأرض', 'م²'],
            ['buildingArea', 'مساحة المبنى', 'م²'],
            ['excavationVolume', 'الحفر', 'م³'],
            ['backfillVolume', 'الردم', 'م³'],
            ['plinthArea', 'مساحة الوزرة الخارجية', 'م²'],
          ] as const).map(([key, label, unit]) => <tr key={key}><td>{label}</td><td>{fmt(asNumber(preliminary[key]))}</td><td>{unit}</td></tr>)}</tbody>
        </table></div> : <p>لم تُحسب الأعمال التمهيدية لهذا المشروع بعد.</p>}
        <p style={{ fontSize: 12, opacity: .8 }}>تُعرض الكميات التمهيدية مرة واحدة عند اختيار الدور الأرضي، ولا تُضاف إلى إجمالي تكلفة التشطيبات لعدم تحديد أسعار مستقلة لها.</p>
      </section>}
      <section style={{ marginTop: 16 }}>
        <h4 className="qty-main-heading">{summaryHeading('ملخص الهيكل الخرساني (تقديري)', target, included.length)}</h4>
        {validStructureAllocation && structure?.floorAllocations ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'right' }}>
              <thead><tr><th>البند</th><th>الوحدة</th>{included.map(i => <th key={i}>{floorName(i)}</th>)}<th>مجموع الأدوار المختارة</th></tr></thead>
              <tbody>{([
                ['footingConcrete', 'خرسانة القواعد', 'م³'], ['footingSteel', 'حديد القواعد', 'طن'],
                ['neckConcrete', 'خرسانة الرقاب', 'م³'], ['neckSteel', 'حديد الرقاب', 'طن'],
                ['middConcrete', 'خرسانة الميدات', 'م³'], ['middSteel', 'حديد الميدات', 'طن'],
                ['columnConcrete', 'خرسانة الأعمدة', 'م³'], ['columnSteel', 'حديد الأعمدة', 'طن'],
                ['slabConcrete', 'خرسانة السقف الصافية', 'م³'], ['slabSteel', 'حديد السقف', 'طن'],
                ['totalConcrete', 'إجمالي الخرسانة', 'م³'], ['totalSteel', 'إجمالي الحديد', 'طن'],
              ] as const).map(([key, label, unit]) => <tr key={key}>
                <td>{label}</td><td>{unit}</td>
                {included.map(i => <td key={i}>{fmt(asNumber(structure.floorAllocations?.[i]?.[key]))}</td>)}
                <td>{fmt(included.reduce((sum, i) => sum + asNumber(structure.floorAllocations?.[i]?.[key]), 0))}</td>
              </tr>)}<tr><td>مكعب السقف الإجمالي للأجور</td><td>م³</td>{included.map(i => <td key={i}>{fmt(grossSlab(i) ?? 0)}</td>)}<td>{fmt(included.reduce((sum,i) => sum + (grossSlab(i) ?? 0),0))}</td></tr></tbody>
            </table>
          </div>
        ) : <p>لا يوجد توزيع معتمد من الحساب الإنشائي الحالي. افتح الأعمال الإنشائية واجعل عدد أدوار التنفيذ مطابقاً لأدوار الرسم، ثم أعد الحساب.</p>}
        <p style={{ fontSize: 12, opacity: .8 }}>الكميات تقديرية محسوبة لكل دور؛ مكعب السقف الإجمالي مخصص للأجور ولا يضاف إلى كمية الخرسانة الصافية.</p>
      </section>
      <UnifiedFinancialSummary includedFloors={included} approved={approved} preliminary={preliminary} structure={structure} prices={prices} finishesCost={totalEstimatedCost} finishesCurrency={prices.currency} usePagePrices={usePagePrices} pricesComplete={pricesComplete} displayCurrency={target} exchangeRate={conversionValid ? rate : null} fullReportReady={canExportFullReport} projectId={projectId} />
      </div>
      {(!canExportFullReport || !pricesComplete) && <p role="status" style={{ fontSize: 12, color: '#d08a26' }}>يتطلب التقرير الشامل اعتماد جميع الأدوار المختارة، وحساب الأعمال التمهيدية للأرضي، وتوزيعاً إنشائياً صالحاً، وتفعيل الأسعار المرتبطة وتسعير جميع البنود ذات الكميات.</p>}
      <p style={{ fontSize: 12, opacity: .8 }}>إجمالي التشطيبات أعلاه جزء من الملخص المالي الموحد أدناه، وليس مبلغاً إضافياً يُجمع معه. يمكن ربط أسعار البنود المتطابقة بصفحة الأسعار اختيارياً. </p>
    </section>
  );
};
