/** Presentation-only formatting. Never round stored values or intermediate calculations. */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(2));
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('en-US', {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
