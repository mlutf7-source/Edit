import React from 'react';
import type { LockOptions } from '../../core/types';
import { StudioIcon } from './StudioIcon';
interface Props {
  visible: boolean;
  lock: LockOptions;
  onDelete: () => void;
  onCopy: () => void;
  onToggleDir: () => void;
  onToggleLen: () => void;
  onToggleMove: () => void;
  onDeselect: () => void;
}
const buttonStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '8px 11px', minHeight: 36,
  border: '1px solid #c7d7e8', borderRadius: 9,
  background: '#f4f8fd', color: '#18344e',
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
  whiteSpace: 'nowrap', flexShrink: 0,
};
const activeStyle: React.CSSProperties = {
  ...buttonStyle, background: '#ddecff', borderColor: '#3495dc', color: '#155b99',
};
const groupStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 7px', border: '1px solid #dbe5f0',
  borderRadius: 10, background: '#ffffff', flexShrink: 0,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#52677f',
  paddingInline: 4, whiteSpace: 'nowrap',
};
export const EditToolbar: React.FC<Props> = ({
  visible, lock, onDelete, onCopy, onToggleDir,
  onToggleLen, onToggleMove, onDeselect,
}) => {
  if (!visible) return null;
  return (
    <div
      className="edit-studio-edit-toolbar"
      dir="rtl"
      role="toolbar"
      aria-label="أدوات تعديل العنصر المحدد"
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: 8, flexWrap: 'nowrap', maxWidth: '100%',
        overflowX: 'auto', overflowY: 'hidden',
        scrollbarWidth: 'thin', touchAction: 'pan-x',
        background: '#f8fafc', border: '1px solid #dbe5f0',
        borderRadius: 11, boxShadow: '0 2px 8px #0000000a',
      }}
    >
      <div style={groupStyle} role="group" aria-label="النسخ">
        <span style={labelStyle}>التعديل</span>
        <button
          type="button" className="studio-edit-action studio-edit-copy"
          title="إنشاء نسخة من العنصر المحدد" aria-label="نسخ العنصر المحدد"
          style={buttonStyle} onClick={onCopy}
        >
          <StudioIcon name="copy" size={17} /> <span>نسخ</span>
        </button>
      </div>
      <div style={groupStyle} role="group" aria-label="قيود التعديل">
        <span style={labelStyle}>القيود</span>
        <button
          type="button" className={`studio-edit-action${lock.direction ? ' is-active' : ''}`}
          aria-pressed={lock.direction} title="تفعيل أو إلغاء قفل الاتجاه"
          style={lock.direction ? activeStyle : buttonStyle} onClick={onToggleDir}
        >
          <StudioIcon name="compass" size={17} /> <span>الاتجاه</span>
          {lock.direction && <StudioIcon name="check" size={13} />}
        </button>
        <button
          type="button" className={`studio-edit-action${lock.length ? ' is-active' : ''}`}
          aria-pressed={lock.length} title="تفعيل أو إلغاء قفل الطول"
          style={lock.length ? activeStyle : buttonStyle} onClick={onToggleLen}
        >
          <StudioIcon name="ruler" size={17} /> <span>الطول</span>
          {lock.length && <StudioIcon name="check" size={13} />}
        </button>
        <button
          type="button" className={`studio-edit-action${lock.move ? ' is-active' : ''}`}
          aria-pressed={lock.move} title="تفعيل أو إلغاء قفل التحريك"
          style={lock.move ? activeStyle : buttonStyle} onClick={onToggleMove}
        >
          <StudioIcon name="lock" size={17} /> <span>التحريك</span>
          {lock.move && <StudioIcon name="check" size={13} />}
        </button>
      </div>
      <div style={groupStyle} role="group" aria-label="إدارة التحديد">
        <span style={labelStyle}>التحديد</span>
        <button
          type="button" className="studio-edit-action studio-edit-deselect"
          title="إلغاء تحديد العنصر الحالي" style={buttonStyle} onClick={onDeselect}
        >
          <StudioIcon name="deselect" size={17} /> <span>إلغاء التحديد</span>
        </button>
        <button
          type="button" className="studio-edit-action studio-edit-delete"
          title="حذف العنصر المحدد" style={{ ...buttonStyle, background: '#fff1f2', borderColor: '#fecdd3', color: '#b42338' }}
          onClick={onDelete}
        >
          <StudioIcon name="trash" size={17} /> <span>حذف</span>
        </button>
      </div>
    </div>
  );
};
