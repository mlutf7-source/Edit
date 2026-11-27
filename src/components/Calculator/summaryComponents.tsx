import React from 'react';

// Summary-only presentation; reuse the existing quantities theme.
export const S = {
  card: { minWidth: 0, marginBottom: 10, color: 'var(--qty-text)' } as React.CSSProperties,
  head: { cursor: 'pointer', justifyContent: 'space-between' } as React.CSSProperties,
  body: { overflowX: 'auto', minWidth: 0 } as React.CSSProperties,
  th: { padding: '6px 4px', textAlign: 'center', border: '1px solid var(--qty-border)' } as React.CSSProperties,
  td: { padding: '6px 4px', textAlign: 'center', border: '1px solid var(--qty-border)' } as React.CSSProperties,
  total: { background: 'var(--qty-accent-soft)', fontWeight: 700 } as React.CSSProperties,
};
export const summaryTableStyle: React.CSSProperties = { direction: 'rtl', width: '100%', borderCollapse: 'collapse', textAlign: 'center' };
export const SectionTitle = ({ children }: { children: React.ReactNode }) => <div dir="rtl" className="qty-main-heading">{children}</div>;
export const SummaryTablePanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <details dir="rtl" open style={S.card}>
    <summary className="qty-main-heading" style={{cursor:'pointer', display:'list-item'}}>{title}</summary>
    <div style={S.body}>{children}</div>
  </details>
);
export const Card = ({ title, open, setOpen, children, currency }: any) => (
  <div dir="rtl" style={S.card}>
    <button type="button" className="qty-main-heading" style={{...S.head,width:'100%'}} aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{title}{currency ? ` (${currency})` : ''}</span><span aria-hidden="true">{open ? '▲' : '▼'}</span>
    </button>
    {open && <div style={S.body}>{children}</div>}
  </div>
);
export const Tr = ({ label, value, bold, total }: any) => (
  <tr style={total ? S.total : undefined}><td style={{...S.td,textAlign:'right',fontWeight:bold||total?700:600}}>{label}</td><td style={S.td}>{value}</td></tr>
);
export const Tr4 = ({ label, qty, price, total, bold, totalRow }: any) => (
  <tr style={totalRow ? S.total : undefined}>
    <td style={{...S.td,textAlign:'right',fontWeight:bold||totalRow?700:600}}>{label}</td>
    {totalRow ? <td style={S.td} colSpan={3}>{total}</td> : <><td style={S.td}>{qty}</td><td style={S.td}>{price}</td><td style={S.td}>{total}</td></>}
  </tr>
);

export const summaryCurrencyLabel = (currency: string): string => ({ YER: 'ر.ي', SAR: 'ر.س', USD: 'دولار' } as Record<string, string>)[currency] ?? currency;

export const summaryCurrencyFullName = (currency: string): string => ({ YER: 'ريال يمني', SAR: 'ريال سعودي', USD: 'دولار أمريكي' } as Record<string, string>)[currency] ?? currency;

export const SummaryTotalRow = ({ value, columns, currency, label = 'الإجمالي' }: { value: React.ReactNode; columns: number; currency?: string; label?: string }) => (
  <tr data-summary-total style={S.total}><td colSpan={columns} style={{...S.td, textAlign:'right'}}><div dir="rtl" style={{display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:8, width:'100%'}}><span>{label}{currency ? ` ( ${summaryCurrencyFullName(currency)} )` : ''}</span><strong dir="ltr" style={{whiteSpace:'normal', overflowWrap:'anywhere', fontSize:'1.1em', textAlign:'left'}}>{value}</strong></div></td></tr>
);
