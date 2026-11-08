// ═══════════════════════════════════════════════════════════════════
// 🎨 نظام الألوان المركزي — لون تحديد موحّد لكل العناصر
// ═══════════════════════════════════════════════════════════════════

export interface ColorTheme {
  // ─── عام ───
  selection: string;
  // ─── الجدران ───
  wallFill: string;
  wallBorder: string;
  wallHandle: string;
  wallDimensionLabel: string;
  landBoundaryFill: string;
  helperLineFill: string;
  roundCornerFirstFill: string;
}

export const DEFAULT_COLOR_THEME: ColorTheme = {
  selection: '#0a0',
  wallFill: '#6da4d9',
  wallBorder: '#888888',
  wallHandle: '#06f',
  wallDimensionLabel: '#888',
  landBoundaryFill: '#2e7d32',
  helperLineFill: '#2196f3',
  roundCornerFirstFill: '#ffd54f',
};

export interface ColorItemDefinition {
  key: keyof ColorTheme;
  label: string;
}

// ✅ قائمة واحدة مسطحة — بدون مجموعات
export const COLOR_ITEMS: ColorItemDefinition[] = [
  { key: 'selection', label: 'لون التحديد (أي عنصر)' },
  { key: 'wallFill', label: 'تعبئة الجدار' },
  { key: 'wallBorder', label: 'حدود الجدار' },
  { key: 'wallHandle', label: 'مقابض التحديد' },
  { key: 'wallDimensionLabel', label: 'نص الطول' },
  { key: 'landBoundaryFill', label: 'حدود الأرض' },
  { key: 'helperLineFill', label: 'الخطوط المساعدة' },
  { key: 'roundCornerFirstFill', label: 'أول جدار (أركان)' },
];
