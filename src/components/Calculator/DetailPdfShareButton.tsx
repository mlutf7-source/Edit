import React, { useRef, useState } from 'react';
import { shareDetailPdf, type DetailPdfOptions } from '../../utils/pdfShare';

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

  const handleShare = async () => {
    if (disabled || inProgress.current) return;
    const element = getElement();
    if (!element || !element.isConnected) {
      alert('لم يتم العثور على الحسابات التفصيلية للبند');
      return;
    }
    inProgress.current = true;
    setBusy(true);
    try {
      await shareDetailPdf(element, { title, projectName, floorName });
    } catch (error) {
      console.error('Detail PDF sharing error:', error);
      alert('حدث خطأ أثناء مشاركة الحسابات التفصيلية');
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      data-pdf-exclude="true"
      disabled={disabled || busy}
      aria-busy={busy}
      aria-label={`مشاركة PDF — ${title}`}
      onClick={handleShare}
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
  );
};

export default DetailPdfShareButton;
