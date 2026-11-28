import React from 'react';
import type { Wall } from '../../core/types';
import { WallAppearanceSection } from './WallAppearanceSection';
import { StudioIcon } from '../Toolbar/StudioIcon';
import { DEFAULT_VIEW3D_SETTINGS, type View3DSettings } from './view3dTypes';
import {
  DimensionsSection, SlabsSection, WallsSection, DoorsSection, WindowsSection,
  CorniceSection, FenceSection, ViewScopeSection, StreetsSection,
  BalconyLightSection,
} from './View3DSettingsSections';
interface Props {
  walls?: Wall[];
  settings: View3DSettings;
  onChange: (settings: View3DSettings) => void;
  onUpdateFloorOverride?: (floor: number, patch: Partial<View3DSettings>) => void;
  onClearFloorOverride?: (floor: number) => void;
  maxFloor?: number;
  onClose: () => void;
}
const palette = {
  surface: '#0c1b2d', panel: '#132940', border: '#2b5068',
  accent: '#4bd5ed', text: '#e7f4fb', muted: '#a8c2d2',
};
export const View3DSettingsDialog: React.FC<Props> = ({
  settings, onChange, onUpdateFloorOverride, onClearFloorOverride,
  maxFloor = 0, onClose, walls = [],
}) => {
  const [editingTarget, setEditingTarget] = React.useState<'global' | number>('global');
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [category, setCategory] = React.useState('all');
  const safeMax = Number.isFinite(maxFloor) ? Math.max(0, Math.floor(maxFloor)) : 0;
  React.useEffect(() => { if (editingTarget !== 'global' && editingTarget > safeMax) setEditingTarget('global'); }, [editingTarget, safeMax]);
  const hasOverride = (floor: number) => {
    const override = settings.floorOverrides?.[floor];
    return !!override && Object.keys(override).length > 0;
  };
  const displayedSettings = React.useMemo<View3DSettings>(() => {
    if (editingTarget === 'global') return settings;
    const override = settings.floorOverrides?.[editingTarget];
    return override ? { ...settings, ...override, floorOverrides: settings.floorOverrides } : settings;
  }, [settings, editingTarget]);
  const update = (patch: Partial<View3DSettings>) => {
    if (editingTarget === 'global') onChange({ ...settings, ...patch });
    else onUpdateFloorOverride?.(editingTarget, patch);
  };
  const reset = () => {
    if (editingTarget === 'global') {
      onChange({ ...DEFAULT_VIEW3D_SETTINGS, floorOverrides: settings.floorOverrides });
    } else {
      onClearFloorOverride?.(editingTarget);
    }
    setConfirmReset(false);
  };
  const resetAvailable = editingTarget === 'global' || !!onClearFloorOverride;
  const sectionProps = { settings: displayedSettings, update };
  return (
    <div role="presentation" style={overlayStyle}>
      <div role="dialog" aria-modal="true" aria-label="إعدادات المنظور ثلاثي الأبعاد" dir="rtl" style={dialogStyle}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <StudioIcon name="settings" size={21} />
            <strong style={{ fontSize: 16 }}>إعدادات المنظور ثلاثي الأبعاد</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" disabled={!resetAvailable} onClick={() => setConfirmReset(true)} style={secondaryButton} title="استعادة الإعدادات الافتراضية">
              <StudioIcon name="rotate" size={16} /> <span>افتراضي</span>
            </button>
            <button type="button" onClick={onClose} style={iconButton} aria-label="إغلاق الإعدادات" title="إغلاق">
              <StudioIcon name="close" size={19} />
            </button>
          </div>
        </header>
        <main style={{ padding: 10, overflowY: 'auto', minHeight: 0, flex: 1, overscrollBehavior: 'contain' }}>
          <section style={selectorPanel}>
            <label htmlFor="view3d-edit-target" style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>نطاق تطبيق الإعدادات</label>
            <select id="view3d-edit-target" value={editingTarget === 'global' ? 'global' : String(editingTarget)}
              onChange={(e) => { const value = e.target.value; setEditingTarget(value === 'global' ? 'global' : Number(value)); setConfirmReset(false); }}
              style={selectStyle}>
              <option value="global">الإعدادات العامة (جميع الأدوار)</option>
              {Array.from({ length: safeMax + 1 }, (_, floor) => (
                <option key={floor} value={String(floor)}>{floor === 0 ? 'الدور الأرضي' : `الدور ${floor}`}{hasOverride(floor) ? ' — إعدادات خاصة' : ''}</option>
              ))}
            </select>
            {editingTarget !== 'global' && (
              <div style={{ color: palette.muted, fontSize: 12, lineHeight: 1.7 }}>
                {hasOverride(editingTarget)
                  ? 'لهذا الدور إعدادات خاصة تتجاوز الإعدادات العامة.'
                  : 'هذا الدور يرث الإعدادات العامة. تعديل أي قيمة ينشئ إعداداً خاصاً به.'}
                {!onUpdateFloorOverride && <div>تعديل إعدادات الدور غير متاح في هذه الشاشة.</div>}
              </div>
            )}
          </section>
          {confirmReset && (
            <section role="alertdialog" aria-label="تأكيد استعادة الإعدادات" style={confirmPanel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700 }}><StudioIcon name="warning" size={17} /> تأكيد الاستعادة</div>
              <p style={{ margin: '8px 0 12px', lineHeight: 1.7, fontSize: 13 }}>
                {editingTarget === 'global'
                  ? 'هل تريد إعادة الإعدادات العامة إلى القيم الافتراضية؟ ستبقى إعدادات الأدوار الخاصة دون تغيير.'
                  : `هل تريد إزالة إعدادات الدور ${editingTarget} الخاصة ليعود إلى وراثة الإعدادات العامة؟`}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={reset} style={confirmButton}>نعم، استعادة</button>
                <button type="button" onClick={() => setConfirmReset(false)} style={secondaryButton}>إلغاء</button>
              </div>
            </section>
          )}
          <nav aria-label="أقسام الإعدادات" style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:10}}>
            {([['all','الكل'],['view','العرض والأبعاد'],['building','المبنى'],['outside','المحيط والإضاءة']] as const).map(([id,label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)} style={{...secondaryButton, flex:'1 1 auto', justifyContent:'center', borderColor:category === id ? palette.accent : palette.border, color:category === id ? palette.accent : palette.text}}>{label}</button>)}
          </nav>
          <div style={{ display: 'grid', gap: 6 }}>
            <div hidden={category !== 'all' && category !== 'view'}>
              <ViewScopeSection settings={settings} update={patch => onChange({...settings,...patch})} maxFloor={safeMax} />
              <DimensionsSection {...sectionProps} />
            </div>
            <div hidden={category !== 'all' && category !== 'building'}>
              <WallsSection {...sectionProps} />
<WallAppearanceSection walls={walls} settings={settings} onChange={onChange} floor={editingTarget} />
              <SlabsSection {...sectionProps} />
              <DoorsSection {...sectionProps} />
              <WindowsSection {...sectionProps} />
              <CorniceSection {...sectionProps} />
            </div>
            <div hidden={category !== 'all' && category !== 'outside'}>
              <FenceSection {...sectionProps} />
              <StreetsSection {...sectionProps} />
              <BalconyLightSection {...sectionProps} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(2, 8, 18, .78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxSizing: 'border-box' };
const dialogStyle: React.CSSProperties = { background: palette.surface, color: palette.text, border: `1px solid ${palette.border}`, boxShadow: '0 24px 70px rgba(0,0,0,.45)', borderRadius: 16, width: '100%', maxWidth: 420, boxSizing: 'border-box', maxHeight: 'min(92dvh, 900px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit' };
const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: `1px solid ${palette.border}`, background: palette.panel, color: palette.accent };
const iconButton: React.CSSProperties = { background: 'transparent', border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { background: '#19364e', border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text, padding: '8px 11px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 };
const selectorPanel: React.CSSProperties = { background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 };
const selectStyle: React.CSSProperties = { width: '100%', background: '#0a1a2b', color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outlineColor: palette.accent, direction: 'rtl' };
const confirmPanel: React.CSSProperties = { background: '#352a23', color: '#ffe5c4', border: '1px solid #9c7548', borderRadius: 10, padding: 12, marginBottom: 14 };
const confirmButton: React.CSSProperties = { background: '#a7652e', border: '1px solid #cf8b4f', borderRadius: 8, color: '#fff', padding: '8px 12px', cursor: 'pointer', fontWeight: 700 };
