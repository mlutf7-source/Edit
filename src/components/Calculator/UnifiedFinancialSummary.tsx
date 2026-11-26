import { getSavedProjectName } from './projectReportName';
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
  const structureReady = Boolean(allocations && structure?.allocationMethod === 'independent-floor-estimate-v1' && includedFloors.every(i => {
    const row = allocations[i];
    const gross = (row as (typeof row & { slabGrossVolume?: number }) | undefined)?.slabGrossVolume;
    return row?.floor === i && typeof gross === 'number' && Number.isFinite(gross) && gross >= row.slabConcrete && gross >= 0;
  }));
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
    if (allocations && structureReady) {
      const concreteKeys = ['footingConcrete', 'neckConcrete', 'middConcrete', 'columnConcrete', 'slabConcrete'] as const;
      const steelKeys = ['footingSteel', 'neckSteel', 'middSteel', 'columnSteel', 'slabSteel'] as const;
      const concrete = includedFloors.reduce((sum, i) => sum + concreteKeys.reduce((s, key) => s + numeric(allocations[i][key]), 0), 0);
      const steel = includedFloors.reduce((sum, i) => sum + steelKeys.reduce((s, key) => s + numeric(allocations[i][key]), 0), 0);
      const roofArea = includedFloors.reduce((sum,i) => sum + numeric((allocations[i] as typeof allocations[number] & {slabGrossVolume?: number}).slabGrossVolume) / 0.3, 0);
      result.push(
        { key: 'concrete', category: 'مواد الهيكل', label: 'الخرسانة', unit: 'م³', quantity: concrete, unitPrice: price(prices.concrete, 2) },
        { key: 'steel', category: 'مواد الهيكل', label: 'حديد التسليح', unit: 'طن', quantity: steel, unitPrice: numeric(prices.steelUnified) },
        { key: 'hordi', category: 'مواد الهيكل', label: 'البلوك الهوردي', unit: 'بلوكة', quantity: Math.ceil(roofArea * 5), unitPrice: price(prices.block, 2) },
      );
      const parts = [['footingConcrete','القواعد'],['neckConcrete','الرقاب'],['middConcrete','الميدات'],['columnConcrete','الأعمدة'],['slabGrossVolume','الأسقف']] as const;
      for (const [key,label] of parts) {
        if (!includedFloors.includes(0) && /^(footing|neck|midd)/.test(key)) continue;
        const quantity = includedFloors.reduce((sum,i) => sum + numeric((allocations[i] as typeof allocations[number] & {slabGrossVolume?: number})[key]),0);
        result.push({key:`contractor:${key}`,category:'أجور المقاول',label,unit:'م³',quantity,unitPrice:price(prices.labor,1)});
      }
      for (const item of prices.other) {
        const fixed = item.costType === 'fixed';
        result.push({key:`extra:${item.id}`,category:'مصاريف إضافية',label:item.name,unit:fixed?'بند':'%',quantity:fixed?1:numeric(item.price),unitPrice:fixed?numeric(item.price):(concrete*price(prices.concrete,2)+steel*numeric(prices.steelUnified))/100});
      }
    }
    return result;
  }, [includedFloors, approved.length, preliminary, structure, prices, structureReady]);
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
  const total = finishesCost + preliminaryCost + structureCost;
  return <section dir="rtl" style={{ border: '1px solid #7795a055', borderRadius: 12, padding: 12, marginTop: 18 }}>
    <h3 className="qty-main-heading">{summaryHeading('الملخص المالي الموحد', displayCurrency, includedFloors.length)}</h3>
    <div id="unified-financial-print-area">
      {['الأعمال التمهيدية','مواد الهيكل','أجور المقاول','مصاريف إضافية'].map(category => {
        const rows = lines.filter(line=>line.category===category);
        if (!rows.length) return null;
        return <details key={category} open><summary className="qty-main-heading">{summaryHeading(category,displayCurrency,includedFloors.length)}</summary><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'right'}}><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>التكلفة</th></tr></thead><tbody>{rows.map(line=><tr key={line.key}><td>{line.label}</td><td>{quantityFormat(line.quantity)} {line.unit}</td><td>{priceAvailability[line.key]?money(line.unitPrice):'—'}</td><td>{priceAvailability[line.key]?money(lineCost(line)):'—'}</td></tr>)}<tr><td colSpan={3}>الإجمالي المتاح</td><td>{money(rows.reduce((sum,line)=>sum+lineCost(line),0))}</td></tr></tbody></table></div></details>;
      })}
      <table style={{width:'100%',textAlign:'right'}}><tbody>
      {includedFloors.includes(0)&&<tr><td>إجمالي الأعمال التمهيدية</td><td>{money(preliminaryCost)}</td></tr>}
      <tr><td>إجمالي الأعمال الإنشائية والمصاريف</td><td>{money(structureCost)}</td></tr>
      <tr><td>إجمالي التشطيبات المعتمدة</td><td>{money(finishesCost)}</td></tr>
      <tr><td>{canTotal ? "الإجمالي المالي الموحد" : "إجمالي التكاليف المتاحة"}</td><td>{sameCurrency && usePagePrices && includedFloors.length > 0 ? money(total) : "—"}</td></tr>
      </tbody></table>
      {!canTotal && <p>التكاليف المتاحة لا تشمل البنود غير المسعّرة أو الكميات غير المتوفرة.</p>}
    </div>
    <div data-pdf-exclude="true">
      <button type="button" disabled={includedFloors.length === 0} style={{ padding: 9, marginTop: 12, borderRadius: 8, cursor: includedFloors.length ? 'pointer' : 'not-allowed' }} onClick={() => {
        if (!includedFloors.length) return;
        const title = summaryHeading('تقرير الكميات والتكاليف', displayCurrency, includedFloors.length);
        const projectName = getSavedProjectName(projectId);
        void createPdfFromElement(fullReportReady === undefined ? 'unified-financial-print-area' : 'approved-full-report-print-area', title, { title, projectName, floorName: includedFloors.map(i => i === 0 ? 'الدور الأرضي' : `الدور ${i}`).join('، ') });
      }}>مشاركة تقرير الكميات والتكاليف PDF</button>
    </div>
  </section>;
};
