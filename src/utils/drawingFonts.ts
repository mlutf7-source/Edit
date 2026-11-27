// Drawing-only font catalog. The browser fetches fonts on demand.
export const drawingFonts = [
['القاهرة','Cairo'],['تجوال','Tajawal'],['المراعي','Almarai'],['الإسكندرية','Alexandria'],['شانجا','Changa'],['مدى','Mada'],['زين','Zain'],['نوتو عربي','Noto Sans Arabic'],['آي بي إم','IBM Plex Sans Arabic'],['وزير','Vazirmatn'],['ريديكس','Readex Pro'],['بيروتي','Beiruti'],['فسطاط','Fustat'],['استعداد','Estedad'],['بالو','Baloo Bhaijaan 2'],['الأميري','Amiri'],['عارف رقعة','Aref Ruqaa'],['ريم كوفي','Reem Kufi'],['شهرزاد','Scheherazade New'],['لطيف','Lateef'],['مركزي','Markazi Text'],['رقاص','Rakkas'],['نوتو نسخ','Noto Naskh Arabic'],['نوتو كوفي','Noto Kufi Arabic'],['لاله زار','Lalezar'],['قاهري','Qahiri'],['المسيري','El Messiri'],['كوفام','Kufam'],['كتيبة','Katibeh'],['ليمونادة','Lemonada']
];
const pending = new Map<string, Promise<void>>();
export function loadDrawingFont(family: string): Promise<void> {
 const name = drawingFonts.find(([,n]) => family.includes(`"${n}"`))?.[1];
 if (!name) return Promise.resolve();
 const existing = pending.get(name); if (existing) return existing;
 const task = new Promise<void>(resolve => {
  const link = document.createElement('link'); link.rel='stylesheet';
  link.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}&display=swap`;
  link.onload=()=>{ void document.fonts.load(`500 24px "${name}"`, 'المخطط المعماري').then(()=>resolve(),()=>resolve()); };
  link.onerror=()=>{pending.delete(name); link.remove(); resolve();};
  document.head.append(link);
 }); pending.set(name,task); return task;
}
