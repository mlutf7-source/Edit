import { formatQuantity } from './quantityFormat';
import React, { useEffect, useMemo, useState } from 'react';
import { createPdfFromElement } from '../../utils/pdfShare';
import { getInitial } from './pricesData';
import type { PricesData, PriceItem } from './pricesTypes';
import type { StructureRecord } from './structureFloorAllocation';
import { UnifiedFinancialSummary } from './UnifiedFinancialSummary';

interface Props { projectId: string; floorHeights: number[] }
type Approved = { summary?: Record<string, unknown>; approvedAt?: string };
const quantities: { key: string; title: string; unit: string }[] = [
  { key: 'totalBlocks', title: 'إجمالي البلوك', unit: 'حبة' },
  { key: 'totalCement', title: 'الإسمنت', unit: 'كيس' },
  { key: 'totalSand', title: 'الرمل', unit: 'م³' },
  { key: 'totalAggregate', title: 'الكري', unit: 'م³' },
  { key: 'totalMarbleArea', title: 'الرخام', unit: 'م²' },
  { key: 'laborWallTotal', title: 'عمالة الجدران', unit: 'م²' },
  { key: 'laborPlasterTotal', title: 'عمالة التلييس', unit: 'م²' },
  { key: 'laborPaintTotal', title: 'عمالة الدهان', unit: 'م²' },
  { key: 'laborTileTotal', title: 'عمالة البلاط', unit: 'م²' },
  { key: 'marbleLaborArea', title: 'عمالة الرخام', unit: 'م²' },
  { key: 'electricalPoints', title: 'نقاط الكهرباء', unit: 'نقطة' },
  { key: 'plumbingPoints', title: 'نقاط السباكة', unit: 'نقطة' },
  { key: 'totalDoorsArea', title: 'مساحة الأبواب', unit: 'م²' },
  { key: 'totalWindowsArea', title: 'مساحة النوافذ', unit: 'م²' },
  { key: 'totalTileArea', title: 'إجمالي البلاط', unit: 'م²' },
  { key: 'exteriorPlasterArea', title: 'التلييس الخارجي', unit: 'م²' },
  { key: 'skirtingLength', title: 'النعلة', unit: 'م طولي' },
];
// ربط صريح ببنود صفحة الأسعار؛ البنود غير المتطابقة تبقى بسعر يدوي مستقل.
const priceLinks: Partial<Record<string, { section: keyof Pick<PricesData, 'finishesMaterials' | 'finishesLabor' | 'doorsAndWindows'>; id: number }>> = {
  totalBlocks: { section: 'finishesMaterials', id: 1 },
  totalCement: { section: 'finishesMaterials', id: 3 },
  totalSand: { section: 'finishesMaterials', id: 4 },
  totalAggregate: { section: 'finishesMaterials', id: 5 },
  totalMarbleArea: { section: 'finishesMaterials', id: 2 },
  laborPlasterTotal: { section: 'finishesLabor', id: 3 },
  laborPaintTotal: { section: 'finishesLabor', id: 4 },
  laborTileTotal: { section: 'finishesLabor', id: 5 },
  marbleLaborArea: { section: 'finishesLabor', id: 2 },
  electricalPoints: { section: 'finishesLabor', id: 6 },
  plumbingPoints: { section: 'finishesLabor', id: 7 },
  totalDoorsArea: { section: 'doorsAndWindows', id: 3 },
  totalWindowsArea: { section: 'doorsAndWindows', id: 2 },
};
const linkedPrice = (prices: PricesData, key: string): number | null => {
  const link = priceLinks[key];
  if (!link) return null;
  const item: PriceItem | undefined = prices[link.section].find(row => row.id === link.id);
  if (!item) return null;
  const value = Number(String(item.price).replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
};
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
const floorName = (i: number) => i === 0 ? 'الدور الأرضي' : `الدور ${i}`;

export const ApprovedFloorsSummary: React.FC<Props> = ({ projectId, floorHeights }) => {
  const [selected, setSelected] = useState<number[]>(() => floorHeights.map((_, i) => i));
  const [mode, setMode] = useState<'all' | 'one' | 'multiple'>('all');
  const [single, setSingle] = useState(0);
  const [revision, setRevision] = useState(0);
  // أسعار تقديرية مستقلة للمشروع؛ لا تُستنتج من أسعار غير مرتبطة بالبنود.
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<PricesData>(getInitial);
  const [usePagePrices, setUsePagePrices] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`qty_unit_prices_${projectId}`);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      setUnitPrices(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, number> : {});
      setUsePagePrices(localStorage.getItem(`qty_use_page_prices_${projectId}`) === 'true');
    } catch { setUnitPrices({}); }
  }, [projectId]);
  useEffect(() => {
    const refreshPrices = () => setPrices(getInitial());
    refreshPrices();
    window.addEventListener('storage', refreshPrices);
    window.addEventListener('focus', refreshPrices);
    return () => { window.removeEventListener('storage', refreshPrices); window.removeEventListener('focus', refreshPrices); };
  }, []);
  const changePrice = (key: string, value: string) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue < 0) return;
    setUnitPrices(old => {
      const next = { ...old, [key]: nextValue };
      localStorage.setItem(`qty_unit_prices_${projectId}`, JSON.stringify(next));
      return next;
    });
  };
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
  useEffect(() => {
    setSelected(floorHeights.map((_, i) => i));
    setSingle(0);
    setMode('all');
  }, [projectId, floorHeights.length]);
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
  const included = mode === 'all' ? floorHeights.map((_, i) => i) : mode === 'one' ? (single >= 0 && single < floorHeights.length ? [single] : []) : [...new Set(selected.filter(i => i >= 0 && i < floorHeights.length))].sort((a, b) => a - b);
  const ready = included.filter(i => approved[i]?.summary);
  const missing = included.filter(i => !approved[i]?.summary);
  const canExportApproved = included.length > 0 && missing.length === 0;
  const validStructureAllocation = Boolean(structure?.floorAllocations && structure.floorAllocations.length === floorHeights.length && included.every(i => structure.floorAllocations?.[i]?.floor === i));
  const canExportFullReport = canExportApproved && (!included.includes(0) || Boolean(preliminary)) && validStructureAllocation && usePagePrices;
  const fmt = (v: number) => formatQuantity(v);
  const totalQuantity = (key: string) => ready.reduce((sum, i) => sum + asNumber(approved[i]?.summary?.[key]), 0);
  const priceFor = (key: string): number => usePagePrices ? (linkedPrice(prices, key) ?? asNumber(unitPrices[key])) : asNumber(unitPrices[key]);
  const estimatedCost = (key: string) => totalQuantity(key) * priceFor(key);
  const totalEstimatedCost = quantities.reduce((sum, item) => sum + estimatedCost(item.key), 0);
  // A missing unit price is not a zero-cost item: block final totals and PDF until priced.
  const unpricedItems = quantities.filter(item => totalQuantity(item.key) > 0 && !(priceFor(item.key) > 0));
  const pricesComplete = unpricedItems.length === 0;
  const controlStyle: React.CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid #8b9baa', background: 'transparent', color: 'inherit' };
  return (
    <section dir="rtl" style={{ padding: 12, border: '1px solid #7795a055', borderRadius: 12, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>ملخص الكميات المعتمدة حسب الأدوار</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label>نطاق العرض: <select style={controlStyle} value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
          <option value="all">جميع الأدوار</option><option value="one">دور محدد</option><option value="multiple">عدة أدوار</option>
        </select></label>
        {mode === 'one' && <select aria-label="اختيار الدور" style={controlStyle} value={single} onChange={e => setSingle(Number(e.target.value))}>
          {floorHeights.map((_, i) => <option key={i} value={i}>{floorName(i)}</option>)}
        </select>}
      </div>
      {mode === 'multiple' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 0' }}>
        {floorHeights.map((_, i) => <label key={i}><input type="checkbox" checked={selected.includes(i)} onChange={e => setSelected(old => e.target.checked ? [...old, i] : old.filter(x => x !== i))} /> {floorName(i)}</label>)}
      </div>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}><input type="checkbox" checked={usePagePrices} onChange={e => { setUsePagePrices(e.target.checked); localStorage.setItem(`qty_use_page_prices_${projectId}`, String(e.target.checked)); setPrices(getInitial()); }} />استخدام الأسعار المطابقة من تبويب «الأسعار» (العملة: {prices.currency})</label>
      {usePagePrices && <button type="button" style={controlStyle} onClick={() => setPrices(getInitial())}>تحديث الأسعار من صفحة الأسعار</button>}
      {included.length === 0 && <p role="status">حدد دوراً واحداً على الأقل لعرض الكميات أو تصديرها.</p>}
      {missing.length > 0 && <p role="status" style={{ color: '#d08a26' }}>أدوار لم تُعتمد بعد: {missing.map(floorName).join('، ')}. لا تدخل في الإجمالي.</p>}
      {unpricedItems.length > 0 && <p role="status" style={{ color: '#b45309' }}>بنود ذات كميات بلا أسعار موجبة: {unpricedItems.map(x => x.title).join('، ')}. لا يُتاح التقرير المالي النهائي قبل تسعيرها.</p>}
      <div id="approved-full-report-print-area">
        <h3>تقرير الكميات والتكاليف للأدوار المختارة</h3>
        <p>نطاق التقرير: {included.map(floorName).join('، ') || 'لم يتم اختيار أدوار'}</p>
        <p>العملة: {prices.currency} — الأسعار: {usePagePrices ? 'مرتبطة بصفحة الأسعار للبنود المطابقة' : 'يدوية أو مختلطة'}</p>
      {ready.length === 0 ? <p>لا توجد كميات معتمدة ضمن الأدوار المختارة. احسب كميات الدور ثم اضغط «اعتماد كميات الدور إلى الملخص».</p> : <>
        <div id="approved-floors-print-area">
          <p>الأدوار الداخلة في الإجمالي: {ready.map(floorName).join('، ')}</p>
          <p style={{ fontSize: 12 }}>حالة الاعتماد: {ready.map(i => `${floorName(i)} (${approved[i]?.approvedAt ? new Date(approved[i]!.approvedAt!).toLocaleString('ar-YE') : 'تاريخ غير متوفر'})`).join('، ')}</p>
          <p style={{ fontSize: 12, opacity: .8 }}>التلييس الخارجي والنعلة بندان مستقلان بأسعار يدوية؛ لا تُضاف مساحتهما إلى بنود التلييس والبلاط الحالية منعاً للازدواجية.</p>
          <p style={{ fontSize: 12, opacity: .8 }}>الأسعار تقديرية. عند تفعيل الربط تُستخدم أسعار البنود المطابقة من صفحة الأسعار؛ البنود غير المطابقة تستخدم السعر اليدوي. لا يوجد تحويل عملات تلقائي.</p>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead><tr><th>البند</th><th>الوحدة</th>{ready.map(i => <th key={i}>{floorName(i)}</th>)}<th>الإجمالي</th><th>سعر الوحدة</th><th>التكلفة التقديرية</th></tr></thead>
            <tbody>{quantities.map(item => <tr key={item.key} style={{ borderTop: '1px solid #8090a044' }}>
              <td style={{ padding: 7 }}>{item.title}</td><td>{item.unit}</td>
              {ready.map(i => <td key={i}>{fmt(asNumber(approved[i]?.summary?.[item.key]))}</td>)}
              <td style={{ fontWeight: 700 }}>{fmt(totalQuantity(item.key))}</td>
              <td><span data-pdf-only="true" style={{ display: 'none' }}>{fmt(priceFor(item.key))}</span><input data-pdf-exclude="true" aria-label={`سعر وحدة ${item.title}`} type="number" min="0" step="any" value={priceFor(item.key)} disabled={usePagePrices && linkedPrice(prices, item.key) !== null} title={usePagePrices && linkedPrice(prices, item.key) !== null ? 'السعر مرتبط بصفحة الأسعار' : 'سعر يدوي'} onChange={e => changePrice(item.key, e.target.value)} style={{ width: 92, maxWidth: '100%', padding: 5, background: 'transparent', color: 'inherit', border: '1px solid #8b9baa', borderRadius: 5 }} /></td>
              <td>{fmt(estimatedCost(item.key))}</td>
            </tr>)}<tr style={{ borderTop: '2px solid #8090a0', fontWeight: 700 }}><td colSpan={ready.length + 4}>إجمالي التشطيبات فقط (يدخل مرة واحدة في الملخص الموحد)</td><td>{fmt(totalEstimatedCost)}</td></tr></tbody>
          </table></div>
          <section style={{ marginTop: 16 }}>
            <h4>كميات مواد الكهرباء المعتمدة</h4>
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
        </div>
        <button type="button" disabled={!canExportApproved} title={!canExportApproved ? 'اعتمد كميات جميع الأدوار المختارة قبل التصدير' : undefined} style={{ ...controlStyle, marginTop: 12, background: '#00509e', color: 'white', cursor: canExportApproved ? 'pointer' : 'not-allowed', opacity: canExportApproved ? 1 : 0.55 }} onClick={() => { if (canExportApproved) createPdfFromElement('approved-floors-print-area', 'ملخص كميات الأدوار المعتمدة'); }}>📄 تصدير كميات الأدوار المحددة PDF</button>
      </>}
      {included.includes(0) && <section style={{ marginTop: 16 }}>
        <h4>الأعمال التمهيدية — الدور الأرضي فقط</h4>
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
        <h4>توزيع كميات الهيكل على الأدوار المختارة (تقديري)</h4>
        {structure?.floorAllocations && structure.floorAllocations.length === floorHeights.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'right' }}>
              <thead><tr><th>البند</th><th>الوحدة</th>{included.map(i => <th key={i}>{floorName(i)}</th>)}<th>مجموع الأدوار المختارة</th></tr></thead>
              <tbody>{([
                ['footingConcrete', 'خرسانة القواعد', 'م³'], ['footingSteel', 'حديد القواعد', 'طن'],
                ['neckConcrete', 'خرسانة الرقاب', 'م³'], ['neckSteel', 'حديد الرقاب', 'طن'],
                ['middConcrete', 'خرسانة الميدات', 'م³'], ['middSteel', 'حديد الميدات', 'طن'],
                ['columnConcrete', 'خرسانة الأعمدة', 'م³'], ['columnSteel', 'حديد الأعمدة', 'طن'],
                ['slabConcrete', 'خرسانة السقف', 'م³'], ['slabSteel', 'حديد السقف', 'طن'],
                ['totalConcrete', 'إجمالي الخرسانة', 'م³'], ['totalSteel', 'إجمالي الحديد', 'طن'],
              ] as const).map(([key, label, unit]) => <tr key={key}>
                <td>{label}</td><td>{unit}</td>
                {included.map(i => <td key={i}>{fmt(asNumber(structure.floorAllocations?.[i]?.[key]))}</td>)}
                <td>{fmt(included.reduce((sum, i) => sum + asNumber(structure.floorAllocations?.[i]?.[key]), 0))}</td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : <p>لا يوجد توزيع معتمد من الحساب الإنشائي الحالي. افتح الأعمال الإنشائية واجعل عدد أدوار التنفيذ مطابقاً لأدوار الرسم، ثم أعد الحساب.</p>}
        <p style={{ fontSize: 12, opacity: .8 }}>التوزيع مشتق من إجمالي الحساب الإنشائي الأصلي؛ لا يُضاف إلى تكلفة التشطيبات ولا يُجمع مرة ثانية مع جدول مرجع المبنى أدناه. لم تُحسب أحمال أو عناصر إنشائية مستقلة لكل دور.</p>
      </section>
      <section style={{ marginTop: 16 }}>
        <h4>الأعمال الإنشائية — مرجع حساب المبنى</h4>
        {structure ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'right' }}>
          <thead><tr><th>البند</th><th>الكمية</th><th>الوحدة</th></tr></thead>
          <tbody>{([
            ['footingConcrete', 'خرسانة القواعد', 'م³'], ['footingSteel', 'حديد القواعد', 'طن'],
            ['neckConcrete', 'خرسانة الرقاب', 'م³'], ['neckSteel', 'حديد الرقاب', 'طن'],
            ['columnConcrete', 'خرسانة الأعمدة', 'م³'], ['columnSteel', 'حديد الأعمدة', 'طن'],
            ['middConcrete', 'خرسانة الميدات', 'م³'], ['middSteel', 'حديد الميدات', 'طن'],
            ['slabConcrete', 'خرسانة السقف', 'م³'], ['slabSteel', 'حديد السقف', 'طن'],
          ] as const).map(([key, label, unit]) => <tr key={key}><td>{label}</td><td>{fmt(asNumber(structure[key]))}</td><td>{unit}</td></tr>)}</tbody>
        </table></div> : <p>لم تُحسب الأعمال الإنشائية لهذا المشروع بعد.</p>}
        <p style={{ fontSize: 12, opacity: .8 }}>الحساب الإنشائي الحالي يخص المبنى وفق عدد الأدوار المُدخل في تبويب الإنشاءات؛ لا يوزع الكميات على أدوار محددة. لذلك يُعرض مرجعياً فقط ولا يدخل في إجمالي الأدوار المختارة، تجنباً للتكرار.</p>
      </section>
      <UnifiedFinancialSummary includedFloors={included} approved={approved} preliminary={preliminary} structure={structure} prices={prices} finishesCost={totalEstimatedCost} finishesCurrency={prices.currency} usePagePrices={usePagePrices} pricesComplete={pricesComplete} />
      </div>
      <button type="button" disabled={!canExportFullReport || !pricesComplete} style={{ ...controlStyle, marginTop: 12, background: '#00509e', color: 'white', opacity: canExportFullReport && pricesComplete ? 1 : .55 }} onClick={() => { if (canExportFullReport && pricesComplete) createPdfFromElement('approved-full-report-print-area', 'تقرير الكميات والتكاليف للأدوار المختارة'); }}>📄 تصدير تقرير شامل للأدوار المختارة PDF</button>
      {(!canExportFullReport || !pricesComplete) && <p role="status" style={{ fontSize: 12, color: '#d08a26' }}>يتطلب التقرير الشامل اعتماد جميع الأدوار المختارة، وحساب الأعمال التمهيدية للأرضي، وتوزيعاً إنشائياً صالحاً، وتفعيل الأسعار المرتبطة وتسعير جميع البنود ذات الكميات.</p>}
      <p style={{ fontSize: 12, opacity: .8 }}>إجمالي التشطيبات أعلاه جزء من الملخص المالي الموحد أدناه، وليس مبلغاً إضافياً يُجمع معه. يمكن ربط أسعار البنود المتطابقة بصفحة الأسعار اختيارياً. جداول الملخص القديم أدناه لا تتبع مرشح الأدوار. تجنب جمع التقدير هنا مع إجمالي الجداول القديمة لأنه قد يكرر تكاليف التشطيبات.</p>
    </section>
  );
};
