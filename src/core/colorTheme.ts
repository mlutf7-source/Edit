// ═══════════════════════════════════════════════════════════════════
// 🎨 نظام الألوان المركزي — المرحلة 1 (الجدران)
// ═══════════════════════════════════════════════════════════════════

export interface ColorTheme {
  // ─── الجدران ───
  wallFill: string;
  wallSelectedFill: string;
  wallBorder: string;
  wallHandle: string;
  wallDimensionLabel: string;
  landBoundaryFill: string;
  landBoundarySelectedFill: string;
  helperLineFill: string;
  helperLineSelectedFill: string;
  roundCornerFirstFill: string;
}

export const DEFAULT_COLOR_THEME: ColorTheme = {
  wallFill: '#6da4d9',
  wallSelectedFill: '#0a0',
  wallBorder: '#888888',
  wallHandle: '#06f',
  wallDimensionLabel: '#888',
  landBoundaryFill: '#2e7d32',
  landBoundarySelectedFill: '#4caf50',
  helperLineFill: '#2196f3',
  helperLineSelectedFill: '#64b5f6',
  roundCornerFirstFill: '#ffd54f',
};

// ─── تعريف المجموعات والعناصر (للـ ColorPickerMenu) ───
export interface ColorItemDefinition {
  key: keyof ColorTheme;
  label: string;
}

export interface ColorGroupDefinition {
  id: string;
  label: string;
  icon: string;
  items: ColorItemDefinition[];
}

export const COLOR_GROUPS: ColorGroupDefinition[] = [
  {
    id: 'walls',
    label: 'الجدران',
    icon: '🧱',
    items: [
      { key: 'wallFill', label: 'تعبئة الجدار' },
      { key: 'wallSelectedFill', label: 'لون التحديد' },
      { key: 'wallBorder', label: 'حدود الجدار' },
      { key: 'wallHandle', label: 'مقابض التحديد' },
      { key: 'wallDimensionLabel', label: 'نص الطول' },
      { key: 'landBoundaryFill', label: 'حدود الأرض' },
      { key: 'landBoundarySelectedFill', label: 'حدود الأرض (محددة)' },
      { key: 'helperLineFill', label: 'الخطوط المساعدة' },
      { key: 'helperLineSelectedFill', label: 'الخطوط المساعدة (محددة)' },
      { key: 'roundCornerFirstFill', label: 'أول جدار (أركان)' },
    ],
  },
  // (المرحلة 2+) ستُضاف مجموعات النوافذ والأبواب والسلالم...
];
