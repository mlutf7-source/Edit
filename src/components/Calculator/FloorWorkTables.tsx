import { preliminaryDetailRows, floorStructureDetailRows } from './workDetailRows';
import { TableDetailsToggle } from './TableDetailsToggle';
import React, { useEffect, useState } from 'react';
import { PreliminaryTables } from './PreliminaryTables';
import { StructureTables } from './StructureTables';
import type { StructureRecord } from './structureFloorAllocation';

type PreliminaryRecord = React.ComponentProps<typeof PreliminaryTables>['results'];

interface Props {
  projectId: string;
  floor: number;
  floorCount: number;
}

/** عرض فقط: لا يحسب ولا يعتمد أي كمية، ولا يكتب في التخزين أو الملخص. */
export const FloorWorkTables: React.FC<Props> = ({ projectId, floor, floorCount }) => {
  const [preliminary, setPreliminary] = useState<PreliminaryRecord | null>(null);
  const [structure, setStructure] = useState<StructureRecord | null>(null);

  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem(`qty_preliminary_${projectId}`);
        setPreliminary(raw ? JSON.parse(raw) as PreliminaryRecord : null);
      } catch { setPreliminary(null); }
      try {
        const raw = localStorage.getItem(`qty_structure_${projectId}`);
        setStructure(raw ? JSON.parse(raw) as StructureRecord : null);
      } catch { setStructure(null); }
    };
    refresh();
    window.addEventListener('qty-approval-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('qty-approval-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [projectId]);

  const allocations = structure?.floorAllocations;
  const allocationValid = Boolean(
    allocations && allocations.length === floorCount &&
    allocations.every((item, index) => item.floor === index) &&
    allocations.every(item => Number.isFinite(item.totalConcrete) && Number.isFinite(item.totalSteel)),
  );
  const currentStructure = allocationValid ? allocations?.[floor] : undefined;

  return (
    <div dir="rtl" className="qty-floor-work-tables" style={{ marginBottom: 18 }}>
      {floor === 0 && (
        <section aria-label="الأعمال التمهيدية للدور الأرضي" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '8px 0' }}>الأعمال التمهيدية — الدور الأرضي</h3>
          {preliminary ? <TableDetailsToggle title="الأعمال التمهيدية" rows={preliminaryDetailRows(preliminary)}><PreliminaryTables results={preliminary} /></TableDetailsToggle> : (
            <p role="status">لم تُحسب الأعمال التمهيدية بعد. احسبها من تبويب «الأعمال التمهيدية» لعرض جدولها هنا.</p>
          )}
        </section>
      )}
      <section aria-label="الخرسانة والهيكل للدور المحدد" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: '8px 0' }}>كميات الخرسانة والهيكل — {floor === 0 ? 'الدور الأرضي' : `الدور ${floor}`}</h3>
        {currentStructure ? (
          <>
            <TableDetailsToggle title="الخرسانة والهيكل" rows={floorStructureDetailRows(currentStructure)}><StructureTables results={currentStructure} /></TableDetailsToggle>
            <small>الكميات المعروضة حصة هذا الدور من نتائج الهيكل المحسوبة؛ توزيع الأعمدة حسب ارتفاع الدور والأسقف بالتساوي، والقواعد والرقاب والميدات للأرضي. هذا عرض مرجعي وليس اعتماداً إضافياً.</small>
          </>
        ) : (
          <p role="status">لا يوجد توزيع إنشائي صالح لهذا الدور. احسب الهيكل من تبويب «الخرسانة والهيكل» مع مطابقة عدد أدوار التنفيذ للرسم.</p>
        )}
      </section>
    </div>
  );
};
