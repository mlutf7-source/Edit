// ═══════════════════════════════════════════════════════════════════
// 🎨 نظام الألوان المركزي — يشمل الغرف والصالات
// ═══════════════════════════════════════════════════════════════════

export interface ColorTheme {
  selection: string;

  // ─── الجدران ───
  wallFill: string;
  wallBorder: string;
  wallHandle: string;
  wallDimensionLabel: string;
  landBoundaryFill: string;
  helperLineFill: string;
  roundCornerFirstFill: string;

  // ─── النوافذ ───
  windowFrame: string;
  windowGlass: string;
  windowGlassLines: string;

  // ─── الأبواب ───
  doorRegular: string;
  doorMain: string;
  doorShop: string;

  // ─── النصوص والأعمدة ───
  textColor: string;
  columnFill: string;

  // ─── السلالم الموحّدة ───
  stairFill: string;
  stairBorder: string;
  stairLines: string;
  landingFill: string;
  landingBorder: string;
  stairArrow: string;

  // ─── الأبعاد ───
  dimensionLine: string;
  dimensionText: string;

  // ─── المناطق ───
  kitchenFill: string;
  bathroomFill: string;
  roomFill: string;
  hallFill: string;

  // ─── المحاور ───
  axisLine: string;
  axisText: string;
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

  windowFrame: '#06f',
  windowGlass: '#87CEEB',
  windowGlassLines: '#FFD700',

  doorRegular: '#f00',
  doorMain: '#f00',
  doorShop: '#06f',

  textColor: '#000000',
  columnFill: '#999999',

  stairFill: '#c8dcff',
  stairBorder: '#06f',
  stairLines: '#444444',
  landingFill: '#ffdc96',
  landingBorder: '#c87f00',
  stairArrow: '#0a7a3a',

  dimensionLine: '#0066cc',
  dimensionText: '#0066cc',

  kitchenFill: '#FFA500',    // برتقالي
  bathroomFill: '#00B4F0',   // أزرق سماوي
  roomFill: '#9C27B0',       // بنفسجي — جديد
  hallFill: '#4CAF50',       // أخضر — جديد

  axisLine: '#d00',
  axisText: '#000000',
};

export interface ColorItemDefinition {
  key: keyof ColorTheme;
  label: string;
}

export const COLOR_ITEMS: ColorItemDefinition[] = [
  { key: 'selection', label: 'لون التحديد (أي عنصر)' },

  // الجدران
  { key: 'wallFill', label: 'تعبئة الجدار' },
  { key: 'wallBorder', label: 'حدود الجدار' },
  { key: 'wallHandle', label: 'مقابض التحديد' },
  { key: 'wallDimensionLabel', label: 'نص الطول' },
  { key: 'landBoundaryFill', label: 'حدود الأرض' },
  { key: 'helperLineFill', label: 'الخطوط المساعدة' },
  { key: 'roundCornerFirstFill', label: 'أول جدار (أركان)' },

  // النوافذ
  { key: 'windowFrame', label: 'إطار النافذة' },
  { key: 'windowGlass', label: 'زجاج النافذة' },
  { key: 'windowGlassLines', label: 'خطوط الزجاج' },

  // الأبواب
  { key: 'doorRegular', label: 'باب عادي' },
  { key: 'doorMain', label: 'باب رئيسي' },
  { key: 'doorShop', label: 'باب محل' },

  // النصوص والأعمدة
  { key: 'textColor', label: 'النصوص' },
  { key: 'columnFill', label: 'الأعمدة' },

  // السلالم الموحّدة
  { key: 'stairFill', label: 'تعبئة السلم' },
  { key: 'stairBorder', label: 'حدود السلم' },
  { key: 'stairLines', label: 'خطوط الدرجات' },
  { key: 'landingFill', label: 'تعبئة البسطة' },
  { key: 'landingBorder', label: 'حدود البسطة' },
  { key: 'stairArrow', label: 'سهم الصعود' },

  // الأبعاد
  { key: 'dimensionLine', label: 'خطوط الأبعاد' },
  { key: 'dimensionText', label: 'نص الأبعاد' },

  // المناطق
  { key: 'kitchenFill', label: 'المطبخ' },
  { key: 'bathroomFill', label: 'الحمام' },
  { key: 'roomFill', label: 'الغرف' },
  { key: 'hallFill', label: 'الصالات' },

  // المحاور
  { key: 'axisLine', label: 'خطوط المحاور' },
  { key: 'axisText', label: 'نص المحاور' },
];
