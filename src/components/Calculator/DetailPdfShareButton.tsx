import { studioNotify } from '../../utils/studioDialogs';
import React, { useRef, useState, useEffect, useId } from 'react';
import { shareDetailPdf, getDetailPdfColumns, type DetailPdfColumn, type DetailPdfOptions } from '../../utils/pdfShare';

export interface DetailPdfShareButtonProps extends DetailPdfOptions {
  /** Return only the detail panel for this particular item. */
  getElement: () => HTMLElement | null;
  disabled?: boolean;
}

export const DetailPdfShareButton: React.FC<DetailPdfShareButtonProps> = ({
  getElement, title, projectName, floorName, disabled = false,
}) => {
  const [busy, setBusy] = useState(false);
  const inProgress = useRef(false);

  const [columns, setColumns] = useState<DetailPdfColumn[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const storageKey = `detail-pdf-columns:v1:${title}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => { setOpen(false); }, [title]);

  const openSettings = () => {
    if (disabled || inProgress.current) return;
    const element = getElement();
    if (!element?.isConnected) {
      studioNotify('لم يتم العثور على الحسابات التفصيلية للبند');
      return;
    }
    const available = getDetailPdfColumns(element);
    if (!available.length) {
      studioNotify('لا توجد أعمدة متاحة للتقرير');
      return;
    }
    setColumns(available);
    let hidden: string[] = [];
    setStorageError(false);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) hidden = saved.filter(v => typeof v === 'string');
    } catch { setStorageError(true); }
    setSelected(available.filter(c => !hidden.includes(c.key)).map(c => c.key));
    setOpen(true);
  };

  const updateSelection = (keys: string[]) => {
    setSelected(keys);
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns.filter(c => !keys.includes(c.key)).map(c => c.key)));
      setStorageError(false);
    } catch { setStorageError(true); }
  };

  const handleShare = async () => {
    if (disabled || inProgress.current || !selected.length) return;
    const element = getElement();
    if (!element?.isConnected) {
      studioNotify('لم يتم العثور على الحسابات التفصيلية للبند');
      return;
    }
    const visibleColumnKeys = getDetailPdfColumns(element).filter(c => selected.includes(c.key)).map(c => c.key);
    if (!visibleColumnKeys.length) {
      studioNotify('يجب تحديد عمود واحد على الأقل');
      return;
    }
    setOpen(false);
    inProgress.current = true;
    setBusy(true);
    try {
      await shareDetailPdf(element, { title, projectName, floorName, visibleColumnKeys });
    } catch (error) {
      console.error('Detail PDF sharing error:', error);
      studioNotify('حدث خطأ أثناء مشاركة الحسابات التفصيلية');
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  return (
    <>
    <button
      type="button"
      data-pdf-exclude="true"
      disabled={disabled || busy}
      aria-busy={busy}
      aria-label={`مشاركة PDF — ${title}`}
      onClick={openSettings}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '8px 12px', border: '1px solid #159a9c',
        borderRadius: 7, background: '#103c61', color: '#ffffff',
        fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
        cursor: disabled || busy ? 'default' : 'pointer',
        opacity: disabled || busy ? 0.65 : 1, whiteSpace: 'nowrap',
      }}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </svg>
      {busy ? 'جاري إعداد PDF…' : 'مشاركة PDF'}
    </button>
    <dialog ref={dialogRef} className="detail-pdf-columns-dialog" dir="rtl"
      data-pdf-exclude="true" aria-labelledby={headingId}
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <h3 id={headingId}>اختيار أعمدة التقرير</h3>
      <p>{title}</p>
      <p>حدد الأعمدة المطلوبة في PDF فقط. لا تتغير الحسابات الأصلية.</p>
      <div className="detail-pdf-columns-actions">
        <button type="button" onClick={() => updateSelection(columns.map(c => c.key))}>تحديد الكل / استعادة الافتراضي</button>
        <button type="button" onClick={() => updateSelection([])}>إلغاء تحديد الكل</button>
      </div>
      <div className="detail-pdf-columns-list">
        {columns.map(column => (
          <label key={column.key} className="detail-pdf-column-option">
            <input type="checkbox" checked={selected.includes(column.key)}
              onChange={event => updateSelection(event.target.checked
                ? [...selected, column.key] : selected.filter(key => key !== column.key))} />
            <span>{column.label}</span>
          </label>
        ))}
      </div>
      <p aria-live="polite">الأعمدة المحددة: {selected.length} من {columns.length}</p>
      {!selected.length && <p role="alert">يجب تحديد عمود واحد على الأقل.</p>}
      {storageError && <p role="alert">تعذر حفظ الاختيارات محلياً.</p>}
      <div className="detail-pdf-columns-actions">
        <button type="button" onClick={() => setOpen(false)}>إغلاق</button>
        <button type="button" className="detail-pdf-columns-confirm" disabled={!selected.length || busy || disabled} onClick={handleShare}>مشاركة PDF</button>
      </div>
    </dialog>
    </>
  );
};

export default DetailPdfShareButton;
