import { formatQuantity } from './quantityFormat';
import { summaryHeading } from './summaryHeading';
import React, { useMemo } from 'react';
import type { PricesData, PriceItem } from './pricesTypes';
import type { StructureRecord } from './structureFloorAllocation';
import { createPdfFromElement } from '../../utils/pdfShare';

type Approved = { summary?: Record<string, unknown> } | null;
type Props = {
  includedFloors: number[];
  approved: Approved[];
  preliminary: Record<string, unknown> | null;
  structure: StructureRecord | null;
  prices: PricesData;
  finishesCost: number;
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
  includedFloors, approved, preliminary, structure, prices, finishesCost, finishesCurrency, usePagePrices, pricesComplete, displayCurrency, exchangeRate, fullReportReady, projectId,
}) => {
  const conversionValid = exchangeRate !== null && Number.isFinite(exchangeRate) && exchangeRate > 0;
  const money = (value:number) => conversionValid && exchangeRate !== null && Number.isFinite(value/exchangeRate) ? quantityFormat(value/exchangeRate) : "—";
  const allocations = structure?.floorAllocations;
  const structureReady = Boolean(allocations && structure?.allocationMethod === 'independent-floor-estimate-v1' && allocations.length === approved.length && includedFloors.every(i => {
    const row = allocations[i];
    const gross = (row as (typeof row & { slabGrossVolume?: number }) | undefined)?.slabGrossVolume;
    return row?.floor === i && typeof gross === 'number' && Number.isFinite(gross) && gross >= row.slabConcrete && gross >= 0;
  }));
  const lines = useMemo<Line[]>(() => {
    const result: Line[] = [];
    if (includedFloors.includes(0) && preliminary) {
      result.push(
        { key: 'excavation', category: 'الأعمال التمهيدية', label: 'الحفر', unit: 'م³', quantity: numeric(preliminary.excavationVolume), unitPrice: price(prices.preliminary, 1) },
        { key: 'backfill', category: 'الأعمال التمهيدية', label: 'الردم', unit: 'م³', quantity: numeric(preliminary.backfillVolume), unitPrice: price(prices.preliminary, 2) },
      );
    }
    const allocations = structure?.floorAllocations;
    if (allocations && structureReady) {
      const concreteKeys = ['footingConcrete', 'neckConcrete', 'middConcrete', 'columnConcrete', 'slabConcrete'] as const;
      const steelKeys = ['footingSteel', 'neckSteel', 'middSteel', 'columnSteel', 'slabSteel'] as const;
      const concrete = includedFloors.reduce((sum, i) => sum + concreteKeys.reduce((s, key) => s + numeric(allocations[i][key]), 0), 0);
      const steel = includedFloors.reduce((sum, i) => sum + steelKeys.reduce((s, key) => s + numeric(allocations[i][key]), 0), 0);
      const contractorVolume = includedFloors.reduce((sum, i) => {
        const row = allocations[i] as typeof allocations[number] & { slabGrossVolume: number };
        return sum + concreteKeys.filter(key => key !== 'slabConcrete').reduce((subtotal, key) => subtotal + numeric(row[key]), 0) + row.slabGrossVolume;
      }, 0);
      result.push(
        { key: 'concrete', category: 'الأعمال الإنشائية', label: 'خرسانة الهيكل (القواعد والرقاب والميدات والأعمدة والأسقف)', unit: 'م³', quantity: concrete, unitPrice: price(prices.concrete, 2) },
        { key: 'steel', category: 'الأعمال الإنشائية', label: 'حديد التسليح', unit: 'طن', quantity: steel, unitPrice: numeric(prices.steelUnified) },
        { key: 'contractor', category: 'الأعمال الإنشائية', label: 'عمالة مقاول الهيكل الخرساني (السقف بالمكعب الإجمالي)', unit: 'م³', quantity: contractorVolume, unitPrice: price(prices.labor, 1) },
      );
    }
    return result;
  }, [includedFloors, approved.length, preliminary, structure, prices, structureReady]);
  const preliminaryCost = lines.filter(x => x.category === 'الأعمال التمهيدية').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0);
  const structureCost = lines.filter(x => x.category === 'الأعمال الإنشائية').reduce((sum, x) => sum + x.quantity * x.unitPrice, 0);
  const hasApprovedFinishes = includedFloors.some(i => Boolean(approved[i]?.summary));
  const missingFinishes = includedFloors.filter(i => !approved[i]?.summary);
  const preliminaryReady = !includedFloors.includes(0) || Boolean(preliminary);
  const priceAvailability: Record<string, boolean> = {
    excavation: hasPrice(prices.preliminary, 1),
    backfill: hasPrice(prices.preliminary, 2),
    concrete: hasPrice(prices.concrete, 2),
    steel: validPrice(prices.steelUnified),
    contractor: hasPrice(prices.labor, 1),
  };
  const missingBasePrices = lines.filter(line => line.quantity > 0 && !priceAvailability[line.key]);
  const sameCurrency = finishesCurrency === prices.currency;
  const canTotal = includedFloors.length > 0 && hasApprovedFinishes && missingFinishes.length === 0 && structureReady && preliminaryReady && usePagePrices && pricesComplete && missingBasePrices.length === 0 && sameCurrency && conversionValid;
  const total = finishesCost + preliminaryCost + structureCost;
  return <section dir="rtl" style={{ border: '1px solid #7795a055', borderRadius: 12, padding: 12, marginTop: 18 }}>
    <h3 className="qty-main-heading">{summaryHeading('الملخص المالي الموحد', displayCurrency, includedFloors.length)}</h3>
    <p style={{ fontSize: 12, opacity: .85 }}>يُحتسب كل بند مرة واحدة: التشطيبات من الاعتمادات، والأعمال التمهيدية للأرضي فقط، والهيكل من التوزيع التقديري للأدوار. الأسعار من صفحة «الأسعار» بعملة {prices.currency}.</p>
    {!pricesComplete && <p role="status" style={{ color: '#b45309' }}>بعض بنود التشطيبات لها كميات أو أسعار غير مكتملة؛ لا يُسمح بإظهار إجمالي مالي نهائي.</p>}
    {missingBasePrices.length > 0 && <p role="status" style={{ color: '#b45309' }}>أسعار غير مكتملة: {missingBasePrices.map(line => line.label).join('، ')}.</p>}
    {!sameCurrency && <p role="status" style={{ color: '#b45309' }}>عملة التشطيبات لا تطابق عملة أسعار المشروع.</p>}
    {!usePagePrices && <p role="status" style={{ color: '#d08a26' }}>فعّل «استخدام الأسعار المطابقة من تبويب الأسعار» لتوحيد مصدر أسعار الأقسام الثلاثة؛ لا يمكن اعتماد إجمالي موحد عند خلط الأسعار اليدوية بعملة غير محددة.</p>}
    {missingFinishes.length > 0 && <p role="status" style={{ color: '#d08a26' }}>توجد أدوار بلا تشطيبات معتمدة؛ الإجمالي الموحد غير مكتمل.</p>}
    {!preliminaryReady && <p role="status" style={{ color: '#d08a26' }}>احسب الأعمال التمهيدية أولاً لإدراج تكلفتها.</p>}
    {!structureReady && <p role="status" style={{ color: '#d08a26' }}>لا توجد كميات إنشائية مستقلة صالحة تتضمن مكعب السقف الإجمالي؛ أعد حساب الأعمال الإنشائية.</p>}
    <div id="unified-financial-print-area">
      <p>الأدوار المختارة: {includedFloors.map(i => i === 0 ? 'الأرضي' : `الدور ${i}`).join('، ') || 'لا توجد أدوار'}</p>
      <p>العملة: {displayCurrency} — عملة المصدر: {prices.currency} — سعر الصرف: {conversionValid ? exchangeRate : "غير محدد"} — المصدر: أسعار صفحة «الأسعار» — نوع التوزيع الإنشائي: تقديري</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
        <thead><tr><th>القسم</th><th>البند</th><th>الوحدة</th><th>الكمية</th><th>سعر الوحدة</th><th>التكلفة</th></tr></thead>
        <tbody>{lines.map(line => <tr key={line.key} style={{ borderTop: '1px solid #8090a044' }}><td>{line.category}</td><td>{line.label}</td><td>{line.unit}</td><td>{quantityFormat(line.quantity)}</td><td>{priceAvailability[line.key] ? money(line.unitPrice) : 'غير مسعر'}</td><td>{priceAvailability[line.key] || line.quantity === 0 ? money(line.quantity * line.unitPrice) : '—'}</td></tr>)}
          <tr style={{ borderTop: '2px solid #8090a0' }}><td colSpan={5}>إجمالي الأعمال التمهيدية</td><td>{money(preliminaryCost)}</td></tr>
          <tr><td colSpan={5}>إجمالي الأعمال الإنشائية</td><td>{money(structureCost)}</td></tr>
          <tr><td colSpan={5}>إجمالي التشطيبات المعتمدة ({displayCurrency})</td><td>{money(finishesCost)}</td></tr>
          {canTotal && <tr style={{ fontWeight: 700, borderTop: '2px solid #8090a0' }}><td colSpan={5}>الإجمالي المالي الموحد ({displayCurrency})</td><td>{money(total)}</td></tr>}
        </tbody>
      </table></div>
      {!canTotal && <p>الإجمالي النهائي غير متاح حتى اكتمال البيانات وتوحيد الأسعار. القيم الظاهرة جزئية ولا تُعد إجمالياً معتمداً.</p>}
    </div>
    <div data-pdf-exclude="true">
      <button type="button" disabled={!canTotal || fullReportReady === false} style={{ padding: 9, marginTop: 12, borderRadius: 8, cursor: canTotal && fullReportReady !== false ? 'pointer' : 'not-allowed' }} onClick={() => {
        if (!canTotal || fullReportReady === false) return;
        const title = summaryHeading('تقرير الكميات والتكاليف', displayCurrency, includedFloors.length);
        let projectName = '';
        try { if (projectId) projectName = localStorage.getItem(`qty_summary_${projectId}_name`) || ''; } catch { /* report remains available */ }
        void createPdfFromElement(fullReportReady === undefined ? 'unified-financial-print-area' : 'approved-full-report-print-area', title, { title, projectName, floorName: includedFloors.map(i => i === 0 ? 'الدور الأرضي' : `الدور ${i}`).join('، ') });
      }}>مشاركة تقرير الكميات والتكاليف PDF</button>
    </div>
    <p style={{ fontSize: 12, opacity: .8 }}>لا تشمل هذه المرحلة تكلفة مساحة الأرض أو مساحة المبنى أو الوزرة، ولا الأعمال الإضافية أو الضرائب أو البنود غير المسعّرة. لا تُجمع هذه النتائج مع جداول الملخص القديم.</p>
  </section>;
};
