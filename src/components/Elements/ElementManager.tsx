import React, { useEffect, useState } from 'react';
import type { Wall, Column, Window, Door, Point } from '../../core/types';
import { StudioIcon } from '../Toolbar/StudioIcon';
import { ColumnForm } from './ColumnForm';
import { ColumnList } from './ColumnList';
import { WindowForm } from './WindowForm';
import { DoorForm } from './DoorForm';
interface Props {
  walls: Wall[];
  columns: Column[];
  windows: Window[];
  doors: Door[];
  onAddColumn: (c: { position: Point; width: number; length: number }) => void;
  onRemoveColumn: (id: string) => void;
  onAddWindow: (w: { wallId: string; position: number; width: number; height: number }) => void;
  onRemoveWindow: (id: string) => void;
  onAddDoor: (d: { wallId: string; position: number; width: number; height: number }) => void;
  onRemoveDoor: (id: string) => void;
}
type Section = 'columns' | 'windows' | 'doors';
type PendingDelete = { kind: 'window' | 'door'; id: string } | null;
const sectionStyle: React.CSSProperties = {
  border: '1px solid rgba(68, 179, 210, 0.26)',
  background: 'rgba(9, 25, 43, 0.76)',
  borderRadius: 12,
  padding: 12,
  minWidth: 0,
};
const headingStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, margin: 0,
  fontSize: 14, fontWeight: 700, color: '#d9f8ff',
};
const actionStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 5, border: '1px solid rgba(105, 197, 221, .32)',
  background: '#112b42', color: '#e5f8ff', borderRadius: 8,
  padding: '7px 10px', cursor: 'pointer', fontSize: 12,
};
const listStyle: React.CSSProperties = {
  display: 'grid', gap: 7, marginTop: 10, maxHeight: 220, overflowY: 'auto',
};
export const ElementManager: React.FC<Props> = ({
  walls, columns, windows, doors,
  onAddColumn, onRemoveColumn, onAddWindow, onRemoveWindow, onAddDoor, onRemoveDoor,
}) => {
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    columns: true, windows: true, doors: true,
  });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDelete]);
  const toggle = (section: Section) => {
    setExpanded(previous => ({ ...previous, [section]: !previous[section] }));
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'window') onRemoveWindow(pendingDelete.id);
    else onRemoveDoor(pendingDelete.id);
    setPendingDelete(null);
  };
  const sectionHeader = (section: Section, label: string, count: number, icon: 'column' | 'window' | 'door') => (
    <button type="button" onClick={() => toggle(section)} aria-expanded={expanded[section]}
      style={{ ...actionStyle, width: '100%', justifyContent: 'space-between', padding: '10px 12px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <StudioIcon name={icon} size={17} />
        <strong>{label}</strong>
        <span style={{ color: '#83cde2' }}>({count})</span>
      </span>
      <StudioIcon name={expanded[section] ? 'chevron-up' : 'chevron'} size={16} />
    </button>
  );
  const itemRow = (kind: 'window' | 'door', id: string, width: number, height: number, index: number) => (
    <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, border: '1px solid rgba(98, 176, 201, .18)', background: '#10263b',
      borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
      <span style={{ minWidth: 0, color: '#dceef6' }}>
        {kind === 'window' ? 'نافذة' : 'باب'} {index + 1}
        <span style={{ color: '#95b8c8', marginInlineStart: 8 }} dir="ltr">{width} × {height} م</span>
      </span>
      <button type="button" onClick={() => setPendingDelete({ kind, id })}
        title={kind === 'window' ? 'حذف النافذة' : 'حذف الباب'}
        aria-label={kind === 'window' ? `حذف النافذة ${index + 1}` : `حذف الباب ${index + 1}`}
        style={{ ...actionStyle, color: '#ffacb0', borderColor: 'rgba(255, 120, 130, .3)', padding: 7 }}>
        <StudioIcon name="trash" size={15} />
      </button>
    </div>
  );
  return (
    <section dir="rtl" aria-label="إدارة العناصر المعمارية" style={{
      display: 'grid', gap: 12, padding: 12, color: '#e9f7ff', minWidth: 0,
      background: 'linear-gradient(160deg, #0a1b30, #102b42)',
      borderRadius: 12,
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 8,
        borderBottom: '1px solid rgba(94, 191, 218, .25)' }}>
        <StudioIcon name="layers" size={20} />
        <div>
          <h3 style={{ ...headingStyle, fontSize: 16 }}>العناصر المعمارية والإنشائية</h3>
          <div style={{ fontSize: 11, color: '#8eb6c8', marginTop: 4 }}>إضافة العناصر ومراجعة العناصر المدرجة</div>
        </div>
      </header>
      <div style={sectionStyle}>
        {sectionHeader('columns', 'الأعمدة', columns.length, 'column')}
        {expanded.columns && <div style={{ marginTop: 10 }}>
          <ColumnForm onAdd={onAddColumn} />
          <ColumnList columns={columns} onRemove={onRemoveColumn} />
        </div>}
      </div>
      <div style={sectionStyle}>
        {sectionHeader('windows', 'النوافذ', windows.length, 'window')}
        {expanded.windows && <div style={{ marginTop: 10 }}>
          <WindowForm walls={walls} onAdd={onAddWindow} />
          {windows.length ? <div style={listStyle} aria-label="النوافذ المدرجة">
            {windows.map((item, index) => itemRow('window', item.id, item.width, item.height, index))}
          </div> : <p style={{ color: '#91b4c6', fontSize: 12, marginBottom: 0 }}>لا توجد نوافذ مدرجة بعد.</p>}
        </div>}
      </div>
      <div style={sectionStyle}>
        {sectionHeader('doors', 'الأبواب', doors.length, 'door')}
        {expanded.doors && <div style={{ marginTop: 10 }}>
          <DoorForm walls={walls} onAdd={onAddDoor} />
          {doors.length ? <div style={listStyle} aria-label="الأبواب المدرجة">
            {doors.map((item, index) => itemRow('door', item.id, item.width, item.height, index))}
          </div> : <p style={{ color: '#91b4c6', fontSize: 12, marginBottom: 0 }}>لا توجد أبواب مدرجة بعد.</p>}
        </div>}
      </div>
      {pendingDelete && <div role="presentation" onMouseDown={event => {
        if (event.target === event.currentTarget) setPendingDelete(null);
      }} style={{ position: 'fixed', inset: 0, background: 'rgba(2, 8, 19, .78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="element-delete-title"
          aria-describedby="element-delete-description" style={{ width: 'min(100%, 380px)',
            background: '#10263b', border: '1px solid #36758d', borderRadius: 14,
            padding: 20, boxShadow: '0 20px 55px rgba(0,0,0,.45)' }}>
          <h3 id="element-delete-title" style={{ ...headingStyle, fontSize: 17 }}>
            <StudioIcon name="warning" size={20} /> تأكيد الحذف
          </h3>
          <p id="element-delete-description" style={{ fontSize: 13, color: '#bed6e2', lineHeight: 1.8 }}>
            هل تريد حذف {pendingDelete.kind === 'window' ? 'هذه النافذة' : 'هذا الباب'} من المشروع؟
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={actionStyle} onClick={() => setPendingDelete(null)}>إلغاء</button>
            <button type="button" style={{ ...actionStyle, background: '#802b38', borderColor: '#bd5363' }}
              onClick={confirmDelete}><StudioIcon name="trash" size={15} /> حذف العنصر</button>
          </div>
        </div>
      </div>}
    </section>
  );
};
