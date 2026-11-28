import React from 'react';
import {
  ColorPicker,
  FormRow,
  SliderRow,
  ToggleRow,
  ButtonGroup,
} from './View3DSettingsComponents';
import {
  type View3DSettings,
  type WallMaterialType,
  type WindowStyleType,
  type StreetSide,
} from './view3dTypes';
const sectionLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#c5e4f0' };
const numericInputStyle: React.CSSProperties = {
  width: 96, maxWidth: '100%', padding: '8px 10px', boxSizing: 'border-box',
  border: '1px solid #31566c', borderRadius: 8, background: '#10283b',
  color: '#e7f7ff', fontSize: 13, fontWeight: 700, textAlign: 'center', direction: 'ltr',
};
/** Local dark-mode section chrome; keeps settings updates and child controls intact. */
const SectionShell: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> =
  ({ title, defaultOpen = false, children }) => {
    const [open, setOpen] = React.useState(defaultOpen);
    return (
      <section dir="rtl" style={{ background: '#102338', border: '1px solid #29445a', borderRadius: 12, marginBottom: 10, overflow: 'hidden', color: '#e7f7ff' }}>
        <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '12px 14px', border: 0, background: open ? '#17344a' : '#102338',
            color: '#8ee8f5', fontSize: 14, fontWeight: 750, textAlign: 'right', cursor: 'pointer' }}>
          <span>{title}</span><span aria-hidden="true" style={{ fontSize: 11 }}>{open ? '▲' : '▼'}</span>
        </button>
        {open && <div style={{ padding: '8px 12px 12px', minWidth: 0 }}>{children}</div>}
      </section>
    );
  };
interface SectionProps {
  settings: View3DSettings;
  update: (patch: Partial<View3DSettings>) => void;
}
// ============================================================
// قسم الأبعاد
// ============================================================
export const DimensionsSection: React.FC<SectionProps> = ({ settings, update }) => {
  const [floorStr, setFloorStr] = React.useState(String(settings.floorHeight));
  React.useEffect(() => {
    setFloorStr(String(settings.floorHeight));
  }, [settings.floorHeight]);
  const commitFloor = () => {
    const v = parseFloat(floorStr.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0)).replace(/[،,]/g, '.'));
    if (!isNaN(v) && v > 0.5 && v <= 20) {
      update({
        floorHeight: v,
        sectionHeight: settings.sectionHeight > v ? v : settings.sectionHeight,
      });
    } else {
      setFloorStr(String(settings.floorHeight));
    }
  };
  return (
    <SectionShell title="الأبعاد">
      <FormRow label="ارتفاع الدور (م)">
        <input
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={floorStr}
          onChange={(e) => setFloorStr(e.target.value)}
          onBlur={commitFloor}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitFloor();
              (e.target as HTMLInputElement).blur();
            }
          }}
          style={numericInputStyle} onFocus={(e) => e.currentTarget.select()}
        />
      </FormRow>
      <SliderRow
        label="ارتفاع القطاع (م)"
        value={settings.sectionHeight}
        min={0}
        max={settings.floorHeight}
        step={0.1}
        display={
          settings.sectionHeight === 0
            ? 'كامل'
            : settings.sectionHeight.toFixed(2)
        }
        onChange={(v) => update({ sectionHeight: v })}
      />
      <ToggleRow
        label="إظهار الشبكة"
        checked={settings.showGrid}
        onChange={(v) => update({ showGrid: v })}
      />
      <ToggleRow
        label="إظهار الأرضية"
        checked={settings.showFloor}
        onChange={(v) => update({ showFloor: v })}
      />
      <ColorPicker
        label="لون مقطع الجدران (عند القص)"
        value={settings.cutSectionColor}
        onChange={(v) => update({ cutSectionColor: v })}
      />
    </SectionShell>
  );
};
// ============================================================
// قسم الجدران
// ============================================================
export const WallsSection: React.FC<SectionProps> = ({ settings, update }) => (
  <SectionShell title="الجدران">
    <ColorPicker
      label="لون الجدار"
      value={settings.wallColor}
      onChange={(v) => update({ wallColor: v })}
    />
    <ButtonGroup
      label="شكل البناء"
      options={[
        { value: 'plain', label: 'ملس' },
        { value: 'marble', label: 'رخام' },
        { value: 'block', label: 'بلوك' },
        { value: 'stone', label: 'حجر' },
      ]}
      selected={settings.wallMaterial}
      onChange={(v) => update({ wallMaterial: v as WallMaterialType })}
    />
  </SectionShell>
);
// ============================================================
// قسم الأبواب
// ============================================================
export const DoorsSection: React.FC<SectionProps> = ({ settings, update }) => (
  <SectionShell title="الأبواب">
    {/* ✅ الباب العادي */}
    <div style={{ fontSize: 12, fontWeight: 700, color: '#67e8f9', padding: '8px 4px 4px' }}>
      الباب العادي
    </div>
    <ColorPicker
      label="لون الباب"
      value={settings.doorColor}
      onChange={(v) => update({ doorColor: v })}
    />
    <SliderRow
      label="زاوية فتح الباب"
      value={settings.doorOpenAngle}
      min={0}
      max={90}
      step={5}
      display={`${settings.doorOpenAngle}°`}
      onChange={(v) => update({ doorOpenAngle: v })}
    />
    {/* ✅ باب المحل */}
    <div style={{ fontSize: 12, fontWeight: 700, color: '#67e8f9', padding: '12px 4px 4px', borderTop: '1px solid #29445a', marginTop: 8 }}>
      باب المحل (شتر)
    </div>
    <ColorPicker
      label="لون شرائح الشتر"
      value={settings.shopDoorColor}
      onChange={(v) => update({ shopDoorColor: v })}
    />
    <SliderRow
      label="عدد شرائح الشتر"
      value={settings.shopDoorSlatCount}
      min={8}
      max={60}
      step={1}
      display={`${settings.shopDoorSlatCount}`}
      onChange={(v) => update({ shopDoorSlatCount: Math.round(v) })}
    />
    <ColorPicker
      label="لون البناء والأعمدة"
      value={settings.shopBaseColor}
      onChange={(v) => update({ shopBaseColor: v })}
    />
    {/* ✅ الباب الرئيسي (ليزر كت) */}
    <div style={{ fontSize: 12, fontWeight: 700, color: '#67e8f9', padding: '12px 4px 4px', borderTop: '1px solid #29445a', marginTop: 8 }}>
      الباب الرئيسي (ليزر كت)
    </div>
    <ColorPicker
      label="لون الإطار"
      value={settings.mainDoorFrameColor}
      onChange={(v) => update({ mainDoorFrameColor: v })}
    />
    <ColorPicker
      label="لون الصفيحة"
      value={settings.mainDoorSheetColor}
      onChange={(v) => update({ mainDoorSheetColor: v })}
    />
    <ColorPicker
      label="لون النقش"
      value={settings.mainDoorPatternColor}
      onChange={(v) => update({ mainDoorPatternColor: v })}
    />
  </SectionShell>
);
// ============================================================
// قسم النوافذ
// ============================================================
export const WindowsSection: React.FC<SectionProps> = ({ settings, update }) => (
  <SectionShell title="النوافذ">
    <ButtonGroup
      label="شكل النافذة"
      options={[
        { value: 'rect', label: 'مستطيلة' },
        { value: 'arch', label: 'مقوسة' },
      ]}
      selected={settings.windowStyle}
      onChange={(v) => update({ windowStyle: v as WindowStyleType })}
    />
    <ColorPicker
      label="لون الإطار"
      value={settings.windowFrameColor}
      onChange={(v) => update({ windowFrameColor: v })}
    />
    <ColorPicker
      label="لون الزجاج"
      value={settings.windowGlassColor}
      onChange={(v) => update({ windowGlassColor: v })}
    />
    <SliderRow
      label="شفافية الزجاج"
      value={settings.windowGlassOpacity}
      min={0}
      max={1}
      step={0.05}
      display={`${Math.round(settings.windowGlassOpacity * 100)}%`}
      onChange={(v) => update({ windowGlassOpacity: v })}
    />
    <ButtonGroup
      label="عدد الدرفات"
      options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
      selected={settings.windowSashCols}
      onChange={(v) => update({ windowSashCols: v })}
      compact
    />
    <ButtonGroup
      label="عدد الصفوف"
      options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
      selected={settings.windowSashRows}
      onChange={(v) => update({ windowSashRows: v })}
      compact
    />
  </SectionShell>
);
// ============================================================
// قسم الكورنيش
// ============================================================
export const CorniceSection: React.FC<SectionProps> = ({ settings, update }) => (
  <SectionShell title="الكورنيش">
    <ToggleRow
      label="إظهار الكورنيش"
      checked={settings.showCornice}
      onChange={(v) => update({ showCornice: v })}
    />
    <ColorPicker
      label="لون الكورنيش"
      value={settings.corniceColor}
      onChange={(v) => update({ corniceColor: v })}
    />
  </SectionShell>
);
// ============================================================
// قسم سور محيط الأرض
// ============================================================
export const FenceSection: React.FC<SectionProps> = ({ settings, update }) => (
  <SectionShell title="سور محيط الأرض">
    <ToggleRow
      label="إظهار السور"
      checked={settings.showFence}
      onChange={(v) => update({ showFence: v })}
    />
    {settings.showFence && (
      <>
        <SliderRow
          label="ارتفاع السور (م)"
          value={settings.fenceHeight}
          min={0.5}
          max={6}
          step={0.1}
          display={`${settings.fenceHeight.toFixed(1)} م`}
          onChange={(v) => update({ fenceHeight: v })}
        />
        <ButtonGroup
          label="نوع البناء"
          options={[
            { value: 'plain', label: 'ملس' },
            { value: 'marble', label: 'رخام' },
            { value: 'block', label: 'بلوك' },
            { value: 'stone', label: 'حجر' },
          ]}
          selected={settings.fenceMaterial}
          onChange={(v) => update({ fenceMaterial: v as WallMaterialType })}
        />
        <ColorPicker
          label="لون السور"
          value={settings.fenceColor}
          onChange={(v) => update({ fenceColor: v })}
        />
      </>
    )}
  </SectionShell>
);
// ============================================================
// قسم نطاق العرض (كل الأدوار / دور محدد)
// ============================================================
export const ViewScopeSection: React.FC<SectionProps & { maxFloor: number }> = ({
  settings,
  update,
  maxFloor,
}) => {
  const options = [
    { value: 'all', label: '🏢 الكل' },
    ...Array.from({ length: maxFloor + 1 }, (_, i) => ({
      value: i,
      label: i === 0 ? '🏠 الأرضي' : `🏢 ${i}`,
    })),
  ];
  return (
    <SectionShell title="نطاق العرض">
      <ButtonGroup
        label="اعرض (إعداد عام للمشهد)"
        options={options}
        selected={settings.displayFloor ?? 'all'}
        onChange={(v) => update({ displayFloor: v })}
        compact
      />
      {settings.displayFloor !== 'all' && (
        <div style={{ fontSize: 11, color: '#9fb5c8', textAlign: 'center', paddingTop: 6 }}>
          ⚠️ سيظهر الدور {settings.displayFloor} فقط في المنظور
        </div>
      )}
    </SectionShell>
  );
};
// ============================================================
// قسم الأرضية والشوارع
// ============================================================
export const StreetsSection: React.FC<SectionProps> = ({ settings, update }) => {
  const toggleSide = (s: StreetSide) => {
    const arr = settings.streetSides ?? [];
    const next = arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s];
    update({ streetSides: next });
  };
  const sides: { key: StreetSide; label: string }[] = [
    { key: 'north', label: '⬆️ شمال' },
    { key: 'south', label: '⬇️ جنوب' },
    { key: 'east', label: '➡️ شرق' },
    { key: 'west', label: '⬅️ غرب' },
  ];
  return (
    <SectionShell title="الأرضية والشوارع">
      <ColorPicker
        label="لون بلاط الرصيف"
        value={settings.groundTileColor}
        onChange={(v) => update({ groundTileColor: v })}
      />
      <ColorPicker
        label="لون الأسفلت"
        value={settings.streetColor}
        onChange={(v) => update({ streetColor: v })}
      />
      <div style={{ padding: '10px 4px' }}>
        <span style={sectionLabelStyle}>الجهات المطلة على شوارع:</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {sides.map((s) => {
            const active = (settings.streetSides ?? []).includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleSide(s.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: active ? '#00509e' : '#f0f0f0',
                  color: active ? '#fff' : '#333',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <SliderRow
        label="عرض الرصيف (م)"
        value={settings.sidewalkWidth ?? 2}
        min={1}
        max={5}
        step={0.25}
        display={`${(settings.sidewalkWidth ?? 2).toFixed(2)} م`}
        onChange={(v) => update({ sidewalkWidth: v })}
      />
      <SliderRow
        label="ارتفاع الرصيف (م)"
        value={settings.sidewalkRaised ?? 0.15}
        min={0.05}
        max={0.5}
        step={0.01}
        display={`${((settings.sidewalkRaised ?? 0.15) * 100).toFixed(0)} سم`}
        onChange={(v) => update({ sidewalkRaised: v })}
      />
      <SliderRow
        label="عرض الشارع (م)"
        value={settings.streetWidth ?? 6}
        min={3}
        max={20}
        step={0.5}
        display={`${(settings.streetWidth ?? 6).toFixed(1)} م`}
        onChange={(v) => update({ streetWidth: v })}
      />
      <SliderRow
        label="ارتفاع باب المحل عن الشارع"
        value={settings.shopDoorElevation ?? 0.15}
        min={0}
        max={0.6}
        step={0.01}
        display={`${((settings.shopDoorElevation ?? 0.15) * 100).toFixed(0)} سم`}
        onChange={(v) => update({ shopDoorElevation: v })}
      />
      <SliderRow
        label="ارتفاع الباب الرئيسي عن الشارع"
        value={settings.mainDoorElevation ?? 0.15}
        min={0}
        max={0.6}
        step={0.01}
        display={`${((settings.mainDoorElevation ?? 0.15) * 100).toFixed(0)} سم`}
        onChange={(v) => update({ mainDoorElevation: v })}
      />
    </SectionShell>
  );
};
// ============================================================
// قسم إضاءة البلكونات
// ============================================================
export const BalconyLightSection: React.FC<SectionProps> = ({ settings, update }) => (
  <SectionShell title="إضاءة البلكونات">
    <ToggleRow
      label="إظهار شريط الإضاءة تحت السقف"
      checked={settings.showBalconyLight}
      onChange={(v) => update({ showBalconyLight: v })}
    />
    {settings.showBalconyLight && (
      <>
        <ColorPicker
          label="لون الإضاءة"
          value={settings.balconyLightColor}
          onChange={(v) => update({ balconyLightColor: v })}
        />
        <SliderRow
          label="شدة الإضاءة"
          value={settings.balconyLightIntensity}
          min={0.5}
          max={6}
          step={0.1}
          display={settings.balconyLightIntensity.toFixed(1)}
          onChange={(v) => update({ balconyLightIntensity: v })}
        />
      </>
    )}
  </SectionShell>
);

// Existing slab settings, exposed without changing scene geometry logic.
export const SlabsSection: React.FC<SectionProps> = ({settings, update}) => (
  <SectionShell title="الأسقف الخرسانية">
    <ToggleRow label="إظهار الأسقف" checked={settings.showSlab} onChange={v => update({showSlab:v})} />
    <SliderRow label="سماكة السقف (م)" value={settings.slabThickness} min={0.05} max={1} step={0.01} display={String(settings.slabThickness)} onChange={v => update({slabThickness:v})} />
    <ColorPicker label="لون السقف" value={settings.slabColor} onChange={v => update({slabColor:v})} />
  </SectionShell>
);
