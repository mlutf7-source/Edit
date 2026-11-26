import { plumbingPriceKey, type PricesData, type PriceItem, type PriceSection, type ProjectPricesStore } from './pricesTypes';

const STORAGE_KEY = 'prices_v2';

export const n = (v: any): number => { const num = Number(typeof v === 'string' ? v.replace(/,/g, '') : v); return Number.isFinite(num) ? num : 0; };
export const unformat = (v: string): string => v.replace(/,/g, '');
export const formatNum = (val: string): string => {
if (!val && val !== '0') return '';
const num = parseFloat(val.replace(/,/g, ''));
if (isNaN(num)) return val;
return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const legacyDefaults: PricesData = {
currency: 'YER',
steelUnified: '3500',
concrete: [
{ id: 1, name: 'خرسانة النظافة', price: '350', unit: 'م³' },
{ id: 2, name: 'خرسانة الهيكل', price: '450', unit: 'م³' },
{ id: 3, name: 'خرسانة الخزان', price: '500', unit: 'م³' },
],
preliminary: [
{ id: 1, name: 'الحفر', price: '50', unit: 'م³' },
{ id: 2, name: 'الردم', price: '40', unit: 'م³' },
{ id: 3, name: 'الكرسي الحجري', price: '60', unit: 'م²' },
],
block: [
{ id: 1, name: 'البلوك العادي', price: '5', unit: 'بلوكة' },
{ id: 2, name: 'بلوك السقف / الهوردي', price: '8', unit: 'بلوكة' },
],
labor: [
{ id: 1, name: 'أجر المقاول للمتر المكعب للهيكل الخرساني', price: '120', unit: 'م³' },
{ id: 2, name: 'أجر المقاول للمتر المكعب للخزان', price: '150', unit: 'م³' },
{ id: 3, name: 'أجر الحدادة للمتر المكعب', price: '80', unit: 'م³' },
{ id: 4, name: 'أجر النجارة للمتر المكعب', price: '70', unit: 'م³' },
],
other: [
{ id: 1, name: 'المخططات والإشراف الهندسي', price: '5', unit: '%', costType: 'percent' },
{ id: 2, name: 'التراخيص', price: '2', unit: '%', costType: 'percent' },
{ id: 3, name: 'الحراسة', price: '1', unit: '%', costType: 'percent' },
{ id: 4, name: 'نقل وترتيب المواد', price: '3', unit: '%', costType: 'percent' },
],
finishesMaterials: [
{ id: 1, name: 'البلوك', price: '5', unit: 'بلوكة' },
{ id: 2, name: 'الرخام', price: '80', unit: 'م²' },
{ id: 3, name: 'الأسمنت', price: '1200', unit: 'كيس' },
{ id: 4, name: 'الرمل', price: '150', unit: 'م³' },
{ id: 5, name: 'الركام', price: '200', unit: 'م³' },
{ id: 6, name: 'المعجون', price: '5', unit: 'كجم' },
{ id: 7, name: 'البرايمر', price: '20', unit: 'كجم' },
{ id: 8, name: 'الطلاء', price: '120', unit: 'كجم' },
{ id: 9, name: 'البلاط', price: '35', unit: 'م²' },
{ id: 10, name: 'بلاط السلم', price: '50', unit: 'درجة' },
],
finishesLabor: [
{ id: 1, name: 'بناء البلوك', price: '25', unit: 'م²' },
{ id: 2, name: 'تركيب الرخام', price: '40', unit: 'م²' },
{ id: 3, name: 'التلييس', price: '20', unit: 'م²' },
{ id: 4, name: 'الطلاء', price: '15', unit: 'م²' },
{ id: 5, name: 'تركيب البلاط', price: '30', unit: 'م²' },
{ id: 6, name: 'عمالة كهرباء بالنقطة', price: '50', unit: 'نقطة' },
{ id: 7, name: 'عمالة سباكة بالنقطة', price: '60', unit: 'نقطة' },
],
finishesExtra: [
{ id: 1, name: 'مواد سباكة الحمام', price: '800', unit: 'حمام' },
{ id: 2, name: 'مواد سباكة المطبخ', price: '1200', unit: 'مطبخ' },
{ id: 3, name: 'مواد كهرباء المتر المربع', price: '50', unit: 'م²' },
],
doorsAndWindows: [
{ id: 1, name: 'شباك حماية', price: '150', unit: 'م²' },
{ id: 2, name: 'نوافذ ألمنيوم', price: '300', unit: 'م²' },
{ id: 3, name: 'أبواب', price: '500', unit: 'م²' },
],
blockMode: 'm2',
};


const item = (id: number, quantityKey: string, name: string, unit: string, price = ''): PriceItem => ({ id, quantityKey, name, unit, price });
const materials = legacyDefaults.finishesMaterials;
const doors = legacyDefaults.doorsAndWindows;
const labor = legacyDefaults.finishesLabor;
export const defaults: PricesData = {
  ...legacyDefaults,
  finishesMaterials: [
    ...materials.map((r,i) => ({...r, quantityKey: ['blocks','marble','cement','sand','aggregate','putty','primer','paint','floorTiles','stepTiles'][i]})),
    item(11,'wallTiles','بلاط الجدران','م²',materials[8].price),
    item(12,'landingTiles','بلاط بسطات السلم','م²',materials[8].price),
    item(13,'skirting','النعلة','م طولي'),
  ],
  doorsAndWindows: [
    ...doors.map((r,i)=>({...r, quantityKey:['protection','aluminum','internalDoors'][i]})),
    item(4,'externalDoors','الأبواب الخارجية','م²',doors[2].price),
    item(5,'shopDoors','أبواب المحلات','م²',doors[2].price),
  ],
  electricalMaterials: [item(1,'wireRolls','لفات السلك الكهربائي','لفة'),item(2,'conduitRolls','لفات بيبات التمديدات الكهربائية','لفة'),item(3,'lampHolders','بيوت اللمبات','عدد'),item(4,'switches','المفاتيح','عدد'),item(5,'dynamos','الديناموهات','عدد')],
  plumbingMaterials: ['مغسلة أواني','مغسلة','سخان','حوض أو بانيو','شطاف','محبس','شاور','خلاط','صنبور','صفاية','كوع ريحة','غرف تفتيش','مواصير','سنجل واي','أكواع','مثلثات'].map((name,i)=>item(i+1,plumbingPriceKey(name,''),name,'عدد')),
  finishesLabor: [...labor, ...[
    ['بناء الجدران الخارجية','م²',0],['بناء الجدران الداخلية','م²',0],['بناء الرخام','م²',1],['تلييس الجدران الخارجية','م²',2],['تلييس الجدران الداخلية','م²',2],['تلييس الأسقف','م²',2],['طلاء الجدران','م²',3],['طلاء الأسقف','م²',3],['بلاط الأرضيات','م²',4],['بلاط أرضيات المطابخ','م²',4],['بلاط جدران المطابخ','م²',4],['بلاط أرضيات الحمامات','م²',4],['بلاط جدران الحمامات','م²',4],['بلاط بسطات السلالم','م²',4],['بلاط درجات السلالم (النوائم)','درجة',-1],['نعلة السلم','م طولي',-1],['بناء الجدران الخارجية','بلوكة',-1],['بناء الجدران الداخلية','بلوكة',-1],['نقاط الكهرباء','نقطة',5],['نقاط السباكة','نقطة',6]
  ].map(([name,unit,index],i)=>item(i+8,`labor:${JSON.stringify([name,unit])}`,String(name),String(unit),labor[Number(index)]?.price ?? ''))],
};
const sections: PriceSection[] = ['concrete','preliminary','block','labor','other','finishesMaterials','finishesLabor','finishesExtra','doorsAndWindows','electricalMaterials','plumbingMaterials'];
export function normalizePrices(data?: Partial<PricesData> | null): PricesData {
  const result = {...defaults,...data};
  if (typeof result.steelUnified !== 'string') result.steelUnified = defaults.steelUnified;
  if (result.blockMode !== 'm2' && result.blockMode !== 'unit') result.blockMode = defaults.blockMode;
  for (const section of sections) {
    const saved = Array.isArray(data?.[section]) ? data![section]!.filter(r => r && typeof r.name === 'string' && typeof r.price === 'string' && Number.isFinite(r.id)) : [];
    const base = defaults[section] ?? [];
    const used = new Set<PriceItem>();
    const rows: PriceItem[] = base.map(row => {
      const match = saved.find(s => !used.has(s) && row.quantityKey && s.quantityKey === row.quantityKey)
        ?? saved.find(s => !used.has(s) && !s.quantityKey && row.id === s.id && (s.name === row.name || (section === 'doorsAndWindows' && row.quantityKey === 'internalDoors' && s.name === 'أبواب')));
      if (match) used.add(match);
      return {...row,...match,id:row.id,quantityKey:row.quantityKey ?? match?.quantityKey};
    });
    for (const row of saved) if (!used.has(row) && (!row.quantityKey || !rows.some(r => r.quantityKey === row.quantityKey))) rows.push({...row, id: rows.some(r=>r.id===row.id) ? Math.max(0,...rows.map(r=>r.id))+1 : row.id});
    result[section] = rows;
  }
  return result;
}
const PROJECT_STORAGE_KEY = 'project_prices_v1';
function readStore(): ProjectPricesStore {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s.version === 1 && s.projects && s.latest) return s; }
  } catch {}
  let legacy: Partial<PricesData> | undefined;
  try { legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'); } catch {}
  return {version:1, latest:normalizePrices(legacy), projects:{}};
}
function writeStore(store: ProjectPricesStore): void { localStorage.setItem(PROJECT_STORAGE_KEY,JSON.stringify(store)); }
export const getInitial = (projectId?: string | null): PricesData => {
  const store = readStore();
  return normalizePrices(projectId && Object.prototype.hasOwnProperty.call(store.projects,projectId) ? store.projects[projectId] : store.latest);
};
export const getLatestPrices = (): PricesData => normalizePrices(readStore().latest);
export function initializeProjectPrices(projectId: string): PricesData {
  const store = readStore();
  if (!Object.prototype.hasOwnProperty.call(store.projects,projectId)) {
    store.projects = {...store.projects,[projectId]:normalizePrices(store.latest)};
    writeStore(store);
  }
  return normalizePrices(store.projects[projectId]);
}
export function savePrices(data: PricesData, projectId?: string | null): void {
  const store = readStore();
  const snapshot = normalizePrices(data);
  store.latest = snapshot;
  if (projectId) store.projects = {...store.projects,[projectId]:snapshot};
  writeStore(store);
}
export function importLatestPrices(projectId: string): PricesData {
  const store = readStore();
  const snapshot = normalizePrices(store.latest);
  store.projects = {...store.projects,[projectId]:snapshot};
  writeStore(store);
  return normalizePrices(snapshot);
}
export function ensurePlumbingPrices(data: PricesData, quantities: readonly {material:string;diameter:string;unit:string}[]): PricesData {
  const rows = [...(data.plumbingMaterials ?? [])];
  for (const q of quantities) {
    if (!q.material.trim()) continue;
    const key = plumbingPriceKey(q.material,q.diameter);
    if (!rows.some(r=>r.quantityKey===key)) rows.push(item(Math.max(0,...rows.map(r=>r.id))+1,key,q.diameter.trim()?`${q.material.trim()} قطر ${q.diameter.trim()} إنش`:q.material.trim(),q.unit));
  }
  return {...data,plumbingMaterials:rows};
}

/** Match the exact labor identity used by ApprovedFloorsSummary. */
export function ensureLaborPrices(data: PricesData, quantities: readonly {label:string; unit:string; originalLabel?:string; manual?:boolean}[]): PricesData {
  const rows = [...data.finishesLabor];
  for (const q of quantities) {
    const label = q.manual ? q.label : (q.originalLabel || q.label);
    if (!label.trim() || !q.unit.trim()) continue;
    const key = `labor:${JSON.stringify([label,q.unit])}`;
    if (!rows.some(r => r.quantityKey === key && r.unit === q.unit))
      rows.push(item(Math.max(0,...rows.map(r=>r.id))+1,key,label,q.unit));
  }
  return {...data,finishesLabor:rows};
}
