// ═══════════════════════════════════════════════════════════════════
// 🎨 نظام الألوان المركزي — كل عناصر المخطط
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

  // ─── النوافذ ───
  windowFrame: string;
  windowGlass: string;
  windowGlassLines: string;

  // ─── الأبواب ───
  doorRegular: string;
  doorMain: string;
  doorShop: string;

  // ─── النصوص ───
  textColor: string;

  // ─── الأعمدة ───
  columnFill: string;

  // ─── السلالم القديمة ───
  stairFill: string;
  stairBorder: string;
  stairLines: string;
  stairLandingFill: string;
  stairLandingBorder: string;

  // ─── عناصر السلم المتعدد ───
  stepFill: string;
  stepBorder: string;
  stepLines: string;
  landingFill: string;
  landingBorder: string;
  stairArrow: string;

  // ─── الأبعاد ───
  dimensionLine: string;
  dimensionText: string;

  // ─── المناطق ───
  kitchenFill: string;
  bathroomFill: string;

  // ─── المحاور ───
  axisLine: string;
  axisText: string;
}

export const DEFAULT_COLOR_THEME: ColorTheme = {
  selection: '#0a0',

  // الجدران
  wallFill: '#6da4d9',
  wallBorder: '#888888',
  wallHandle: '#06f',
  wallDimensionLabel: '#888',
  landBoundaryFill: '#2e7d32',
  helperLineFill: '#2196f3',
  roundCornerFirstFill: '#ffd54f',

  // النوافذ
  windowFrame: '#06f',
  windowGlass: '#87CEEB',
  windowGlassLines: '#FFD700',

  // الأبواب
  doorRegular: '#f00',
  doorMain: '#f00',
  doorShop: '#06f',

  // النصوص
  textColor: '#000000',

  // الأعمدة
  columnFill: '#999999',

  // السلالم القديمة
  stairFill: '#c8c8c8',
  stairBorder: '#06f',
  stairLines: '#444444',
  stairLandingFill: '#ffffff',
  stairLandingBorder: '#06f',

  // عناصر السلم المتعدد
  stepFill: '#c8dcff',
  stepBorder: '#06f',
  stepLines: '#444444',
  landingFill: '#ffdc96',
  landingBorder: '#c87f00',
  stairArrow: '#0a7a3a',

  // الأبعاد
  dimensionLine: '#888888',
  dimensionText: '#000000',

  // المناطق
  kitchenFill: '#FFA500',
  bathroomFill: '#00B4F0',

  // المحاور
  axisLine: '#d00',
  axisText: '#d00',
};

export interface ColorItemDefinition {
  key: keyof ColorTheme;
  label: string;
}

export const COLOR_ITEMS: ColorItemDefinition[] = [
  // عام
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

  // النصوص
  { key: 'textColor', label: 'النصوص' },

  // الأعمدة
  { key: 'columnFill', label: 'الأعمدة' },

  // السلالم القديمة
  { key: 'stairFill', label: 'تعبئة السلم' },
  { key: 'stairBorder', label: 'حدود السلم' },
  { key: 'stairLines', label: 'خطوط السلم' },
  { key: 'stairLandingFill', label: 'تعبئة البسطة' },
  { key: 'stairLandingBorder', label: 'حدود البسطة' },

  // عناصر السلم المتعدد
  { key: 'stepFill', label: 'تعبئة السحبة' },
  { key: 'stepBorder', label: 'حدود السحبة' },
  { key: 'stepLines', label: 'خطوط السحبة' },
  { key: 'landingFill', label: 'تعبئة بسطة السلم' },
  { key: 'landingBorder', label: 'حدود بسطة السلم' },
  { key: 'stairArrow', label: 'سهم اتجاه السلم' },

  // الأبعاد
  { key: 'dimensionLine', label: 'خطوط الأبعاد' },
  { key: 'dimensionText', label: 'نص الأبعاد' },

  // المناطق
  { key: 'kitchenFill', label: 'المطبخ' },
  { key: 'bathroomFill', label: 'الحمام' },

  // المحاور
  { key: 'axisLine', label: 'خطوط المحاور' },
  { key: 'axisText', label: 'نص/فقاعة المحاور' },
];
