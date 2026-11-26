export function summaryHeading(title: string, currency: string, count: number): string {
  const symbol = ({ YER: 'ر.ي', SAR: 'ر.س', USD: '$' } as Record<string, string>)[currency] ?? currency;
  const scope = count === 0 ? 'دون أدوار محددة' : count === 1 ? 'لدور واحد' : count === 2 ? 'لدورين' : count <= 10 ? `لـ ${count} أدوار` : `لـ ${count} دوراً`;
  return `${title} (${symbol}) ${scope}`;
}
