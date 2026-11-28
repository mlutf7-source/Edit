import React, { useRef, useState } from 'react';
import { Scene3D, type Scene3DHandle, type CameraPreset } from './Scene3D';
import { View3DSettingsDialog } from './View3DSettingsDialog';
import { StudioIcon, type StudioIconName } from '../Toolbar/StudioIcon';
import type { View3DSettings } from './view3dTypes';
import type { RoundedCorner, Wall, Window as WindowType, Door, Opening, Column, Stair, StairElement } from '../../core/types';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
interface Props {
  walls: Wall[];
  roundedCorners?: RoundedCorner[];
  windows: WindowType[];
  doors: Door[];
  openings: Opening[];
  columns: Column[];
  stairs: Stair[];
  stairElements: StairElement[];
  floorHeights: number[];
  maxFloor: number;
  settings: View3DSettings;
  onChange: (settings: View3DSettings) => void;
  onUpdateFloorOverride: (floor: number, patch: Partial<View3DSettings>) => void;
  onClearFloorOverride: (floor: number) => void;
  onClose: () => void;
}
const CAMERA_BUTTONS: { preset: CameraPreset; label: string; icon: StudioIconName }[] = [
  { preset: 'top', label: 'أعلى', icon: 'eye' },
  { preset: 'front', label: 'أمام', icon: 'home' },
  { preset: 'back', label: 'خلف', icon: 'home' },
  { preset: 'right', label: 'يمين', icon: 'chevron-right' },
  { preset: 'left', label: 'يسار', icon: 'chevron-left' },
  { preset: '3d', label: 'زاوية', icon: 'cube' },
];
const buttonBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 7, minHeight: 38, padding: '8px 12px', borderRadius: 9,
  border: '1px solid rgba(79, 202, 226, .42)', background: '#123149',
  color: '#e7f8ff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};
export const View3DPanel: React.FC<Props> = ({
  roundedCorners = [], walls, windows, doors, openings, columns, stairs, stairElements, floorHeights,
  maxFloor, settings, onChange, onUpdateFloorOverride, onClearFloorOverride, onClose,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [activeCamera, setActiveCamera] = useState<CameraPreset>('3d');
  const [notice, setNotice] = useState('');
  const sceneRef = useRef<Scene3DHandle>(null);
  const handleCameraPreset = (preset: CameraPreset) => {
    sceneRef.current?.setView(preset);
    setActiveCamera(preset);
  };
  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    setNotice('');
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = sceneRef.current?.captureImage(4) ?? '';
      if (!dataUrl.startsWith('data:image/')) throw new Error('تعذر التقاط صورة المنظور.');
      const fileName = `scene3d_${Date.now()}.png`;
      const base64 = dataUrl.split(',')[1];
      if (!base64) throw new Error('تعذر تجهيز الصورة للحفظ.');
      try {
        const result = await Filesystem.writeFile({
          path: fileName, data: base64, directory: Directory.Cache,
        });
        await Share.share({
          title: 'صورة المنظور ثلاثي الأبعاد',
          text: 'صورة عالية الدقة للمنظور',
          url: result.uri,
          dialogTitle: 'حفظ أو مشاركة الصورة',
        });
      } catch (nativeError) {
        // On browsers, use a regular download when native sharing is unavailable.
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setNotice('تم إرسال الصورة إلى تنزيلات المتصفح.');
        console.info('Native share unavailable; browser download used.', nativeError);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر حفظ صورة المنظور.');
    } finally {
      setCapturing(false);
    }
  };
  return (
    <section
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="المنظور ثلاثي الأبعاد"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#061522', display: 'flex', flexDirection: 'column', color: '#e7f8ff', fontFamily: 'inherit' }}
    >
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0b2538', borderBottom: '1px solid #246078', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 800 }}>
          <StudioIcon name="cube" size={21} />
          <span>المنظور ثلاثي الأبعاد</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleCapture} disabled={capturing || walls.length === 0} style={{ ...buttonBase, opacity: capturing || walls.length === 0 ? .5 : 1, cursor: capturing ? 'wait' : 'pointer' }} title="حفظ صورة عالية الدقة">
            <StudioIcon name="download" size={17} /> {capturing ? 'جارٍ التجهيز…' : 'حفظ صورة'}
          </button>
          <button type="button" onClick={() => setShowSettings(true)} style={buttonBase} title="إعدادات المنظور">
            <StudioIcon name="settings" size={17} /> الإعدادات
          </button>
          <button type="button" onClick={onClose} style={{ ...buttonBase, background: '#512532', borderColor: '#a35b68' }} title="إغلاق المنظور">
            <StudioIcon name="close" size={17} /> إغلاق
          </button>
        </div>
      </header>
      {notice && <div role="status" style={{ padding: '9px 14px', background: '#15354b', color: '#b8edff', fontSize: 13, borderBottom: '1px solid #246078' }}>{notice}</div>}
      <main style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {walls.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', height: '100%', textAlign: 'center', gap: 12, padding: 20 }}>
            <StudioIcon name="wall" size={40} />
            <strong>لا توجد جدران لعرضها</strong>
            <span style={{ color: '#9fc2d2' }}>ارسم مخططاً أولاً ثم افتح المنظور.</span>
          </div>
        ) : (
          <>
            <Scene3D
              ref={sceneRef}
              walls={walls}
              roundedCorners={roundedCorners}
              windows={windows}
              doors={doors}
              openings={openings}
              columns={columns}
              stairs={stairs}
              stairElements={stairElements}
              floorHeights={floorHeights}
              settings={settings}
            />
            <nav aria-label="زوايا عرض الكاميرا" style={{ position: 'absolute', bottom: 'max(16px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, padding: 7, borderRadius: 12, border: '1px solid rgba(87, 200, 222, .38)', background: 'rgba(7, 30, 46, .94)', zIndex: 5, maxWidth: 'calc(100vw - 24px)', overflowX: 'auto', scrollbarWidth: 'thin', direction: 'rtl', boxShadow: '0 8px 24px rgba(0, 0, 0, .35)' }}>
              {CAMERA_BUTTONS.map(button => (
                <button
                  type="button"
                  key={button.preset}
                  onClick={() => handleCameraPreset(button.preset)}
                  aria-pressed={activeCamera === button.preset}
                  title={`عرض ${button.label}`}
                  style={{ ...buttonBase, flexDirection: 'column', gap: 3, minWidth: 57, minHeight: 52, padding: '6px 9px', background: activeCamera === button.preset ? '#12617c' : '#123149', borderColor: activeCamera === button.preset ? '#68e9ff' : 'rgba(79, 202, 226, .3)', color: activeCamera === button.preset ? '#fff' : '#c8e6f2', fontSize: 11 }}
                >
                  <StudioIcon name={button.icon} size={18} />
                  {button.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </main>
      {showSettings && (
        <View3DSettingsDialog
          settings={settings}
          onChange={onChange}
          onUpdateFloorOverride={onUpdateFloorOverride}
          onClearFloorOverride={onClearFloorOverride}
          maxFloor={maxFloor}
          onClose={() => setShowSettings(false)}
        />
      )}
    </section>
  );
};
