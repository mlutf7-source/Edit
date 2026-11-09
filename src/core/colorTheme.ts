export interface ColorTheme {
  selection: string;
  wallFill: string;
  wallBorder: string;
  wallHandle: string;
  wallDimensionLabel: string;
  landBoundaryFill: string;
  helperLineFill: string;
  roundCornerFirstFill: string;
  windowFrame: string;
  windowGlass: string;
  windowGlassLines: string;
  doorRegular: string;
  doorMain: string;
  doorShop: string;
  textColor: string;
  columnFill: string;
  stairFill: string;
  stairBorder: string;
  stairLines: string;
  stairLandingFill: string;
  stairLandingBorder: string;
  stepFill: string;
  stepBorder: string;
  stepLines: string;
  landingFill: string;
  landingBorder: string;
  stairArrow: string;
  dimensionLine: string;
  dimensionText: string;
  kitchenFill: string;
  bathroomFill: string;
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
  stairFill: '#c8c8c8',
  stairBorder: '#06f',
  stairLines: '#444444',
  stairLandingFill: '#ffffff',
  stairLandingBorder: '#06f',
  stepFill: '#c8dcff',
  stepBorder: '#06f',
  stepLines: '#444444',
  landingFill: '#ffdc96',
  landingBorder: '#c87f00',
  stairArrow: '#0a7a3a',
  dimensionLine: '#0066cc',
  dimensionText: '#0066cc',
  kitchenFill: '#FFA500',
  bathroomFill: '#00B4F0',
  axisLine: '#d00',
  axisText: '#000000',
};

export interface ColorItemDefinition {
  key: keyof ColorTheme;
  label: string;
}

export const COLOR_ITEMS: ColorItemDefinition[] = [
  { key: 'selection', label: 'لون التحديد (أي عنصر)' },
  { key: 'wallFill', label: 'تعبئة الجدار' },
  { key: 'wallBorder', label: 'حدود الجدار' },
  { key: 'wallHandle', label: 'مقابض التحديد' },
  { key: 'wallDimensionLabel', label: 'نص الطول' },
  { key: 'landBoundaryFill', label: 'حدود الأرض' },
  { key: 'helperLineFill', label: 'الخطوط المساعدة' },
  { key: 'roundCornerFirstFill', label: 'أول جدار (أركان)' },
  { key: 'windowFrame', label: 'إطار النافذة' },
  { key: 'windowGlass', label: 'زجاج النافذة' },
  { key: 'windowGlassLines', label: 'خطوط الزجاج' },
  { key: 'doorRegular', label: 'باب عادي' },
  { key: 'doorMain', label: 'باب رئيسي' },
  { key: 'doorShop', label: 'باب محل' },
  { key: 'textColor', label: 'النصوص' },
  { key: 'columnFill', label: 'الأعمدة' },
  { key: 'stairFill', label: 'تعبئة السلم' },
  { key: 'stairBorder', label: 'حدود السلم' },
  { key: 'stairLines', label: 'خطوط السلم' },
  { key: 'stairLandingFill', label: 'تعبئة البسطة' },
  { key: 'stairLandingBorder', label: 'حدود البسطة' },
  { key: 'stepFill', label: 'تعبئة السحبة' },
  { key: 'stepBorder', label: 'حدود السحبة' },
  { key: 'stepLines', label: 'خطوط السحبة' },
  { key: 'landingFill', label: 'تعبئة بسطة السلم' },
  { key: 'landingBorder', label: 'حدود بسطة السلم' },
  { key: 'stairArrow', label: 'سهم اتجاه السلم' },
  { key: 'dimensionLine', label: 'خطوط الأبعاد' },
  { key: 'dimensionText', label: 'نص الأبعاد' },
  { key: 'kitchenFill', label: 'المطبخ' },
  { key: 'bathroomFill', label: 'الحمام' },
  { key: 'axisLine', label: 'خطوط المحاور' },
  { key: 'axisText', label: 'نص المحاور' },
];
