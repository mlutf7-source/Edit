import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Column } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
interface Props {
  columns: Column[];
  onRemove: (id: string) => void;
}
const palette = {
  surface: '#0d2235',
  surfaceRaised: '#142e44',
  border: 'rgba(75, 182, 208, 0.26)',
  text: '#e6f5fa',
  muted: '#a4bdcb',
  accent: '#4be1f1',
};
const numberText = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(2)).toLocaleString('en-US') : '—';
export const ColumnList: React.FC<Props> = ({ columns, onRemove }) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingColumn = columns.find(column => column.id === pendingDeleteId);
  useEffect(() => {
    if (!pendingDeleteId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingDeleteId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDeleteId]);
  const confirmDelete = () => {
    if (pendingColumn) onRemove(pendingColumn.id);
    setPendingDeleteId(null);
  };
  return (
    <section dir="rtl" aria-label="قائمة الأعمدة" style={{ marginTop: 12, color: palette.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13 }}>
          <StudioIcon name="column" size={17} />
          <span>الأعمدة المضافة</span>
        </div>
        <span style={{ fontSize: 12, color: palette.accent, background: 'rgba(75,225,241,.1)', padding: '3px 9px', borderRadius: 20 }}>
          {columns.length}
        </span>
      </div>
      {columns.length === 0 ? (
        <div role="status" style={{ textAlign: 'center', padding: '18px 12px', border: `1px dashed ${palette.border}`, borderRadius: 10, color: palette.muted, fontSize: 13, background: palette.surface }}>
          لم تتم إضافة أعمدة بعد.
        </div>
      ) : (
        <div style={{ maxHeight: 290, overflowY: 'auto', overscrollBehavior: 'contain', display: 'grid', gap: 8, paddingInlineEnd: 3 }}>
          {columns.map((column, index) => (
            <div key={column.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: palette.surfaceRaised, border: `1px solid ${palette.border}`, borderRadius: 10, minWidth: 0 }}>
              <div aria-hidden="true" style={{ color: palette.accent, flexShrink: 0 }}><StudioIcon name="column" size={20} /></div>
              <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 5 }}>
                <strong style={{ fontSize: 13 }}>عمود {index + 1}</strong>
                <span style={{ color: palette.muted, fontSize: 12, overflowWrap: 'anywhere' }}>
                  الموقع: X {numberText(column.position.x)}، Y {numberText(column.position.y)}
                </span>
                <span style={{ color: palette.muted, fontSize: 12 }}>
                  الأبعاد: {numberText(column.width)} × {numberText(column.length)} م
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteId(column.id)}
                aria-label={`حذف العمود ${index + 1}`}
                title={`حذف العمود ${index + 1}`}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: '1px solid rgba(248,113,113,.4)', color: '#fca5a5', background: 'rgba(239,68,68,.1)', cursor: 'pointer' }}
              >
                <StudioIcon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pendingColumn && createPortal(
        <div
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setPendingDeleteId(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(2, 10, 20, .75)', backdropFilter: 'blur(4px)' }}
        >
          <div role="alertdialog" aria-modal="true" aria-labelledby="studio-column-delete-title" aria-describedby="studio-column-delete-description" dir="rtl" style={{ width: 'min(100%, 400px)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: 20, borderRadius: 14, background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: '0 24px 60px rgba(0,0,0,.5)', color: palette.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 id="studio-column-delete-title" style={{ margin: 0, fontSize: 17 }}>تأكيد حذف العمود</h3>
              <button type="button" onClick={() => setPendingDeleteId(null)} aria-label="إغلاق" style={{ border: 0, background: 'transparent', color: palette.muted, cursor: 'pointer', padding: 5 }}><StudioIcon name="close" size={19} /></button>
            </div>
            <p id="studio-column-delete-description" style={{ fontSize: 14, lineHeight: 1.8, color: palette.muted, margin: '14px 0 20px' }}>
              هل تريد حذف هذا العمود من المخطط؟ لا يمكن التراجع عن الحذف من هذه النافذة.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 9 }}>
              <button type="button" onClick={() => setPendingDeleteId(null)} style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.surfaceRaised, color: palette.text, cursor: 'pointer' }}>إلغاء</button>
              <button type="button" onClick={confirmDelete} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #ef4444', background: '#b91c1c', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}><StudioIcon name="trash" size={16} /> حذف العمود</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
