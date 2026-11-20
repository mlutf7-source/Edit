import { useState, useEffect, useRef } from 'react';
import { useAppState } from './hooks/useAppState';
import { CanvasContainer } from './components/Canvas/CanvasContainer';
import {StudioDrawingRail} from './components/Canvas/StudioDrawingRail';
import { TopToolbar } from './components/Toolbar/TopToolbar';
import {StudioIcon} from './components/Toolbar/StudioIcon';
import { QuantitiesPanel } from './components/Calculator/QuantitiesPanel';
import { exportToPDF } from './core/pdfExport';
// ✅ تم تعليق استيرادات Capacitor مؤقتاً لكي يعمل التطبيق في المتصفح
// import { App as CapApp } from '@capacitor/app';
// import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
// import { Share } from '@capacitor/share';
import './App.css';
import { StairSettingsDialog } from './components/Stair/StairSettingsDialog';
import { RoundedCornerDialog } from './components/Canvas/RoundedCornerDialog';
import { View3DPanel } from './components/View3D/View3DPanel';
// ✅ بدائل وهمية (Mock) لمنع انهيار التطبيق في المتصفح
const CapApp = { addListener: async (_event: string, _callback: () => void | Promise<void>) => ({ remove: async () => {} }), exitApp: async () => {} };
const Filesystem = { writeFile: async (_options: { path: string; data: string; directory: string; encoding: string }) => ({ uri: '' }) };
const Directory = { Cache: 'CACHE' };
const Encoding = { UTF8: 'utf8' };
const Share = { share: async (_options: { title: string; text: string; url: string; dialogTitle: string }) => {} };
const handleError = (msg: string) => alert(msg);

export default function App() {
  const state = useAppState();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFloorsPanel, setShowFloorsPanel] = useState(false);
  const [showStudioSettings,setShowStudioSettings]=useState(false);
  const [studioDark,setStudioDark]=useState(()=>{try{return localStorage.getItem('edit-studio-appearance')==='dark';}catch{return false;}});
  const changeStudioAppearance=()=>{const next=!studioDark;setStudioDark(next);document.documentElement.dataset.editStudioTheme=next?'dark':'light';try{localStorage.setItem('edit-studio-appearance',next?'dark':'light');}catch{}window.dispatchEvent(new CustomEvent('edit-studio-appearance-change',{detail:next?'dark':'light'}));};
  const [showGrid, setShowGrid] = useState(true);
  const [exitPromptVisible, setExitPromptVisible] = useState(false);
  const [exitProjectName, setExitProjectName] = useState('');
  const [showView3D, setShowView3D] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const headerActionsRef = useRef<HTMLElement>(null);
  const [headerScrollEdges, setHeaderScrollEdges] = useState({
    left: false,
    right: false,
  });

  useEffect(() => {
    const nav = headerActionsRef.current;
    if (!nav) return;
    const updateEdges = () => {
      const bounds = nav.getBoundingClientRect();
      const children = Array.from(nav.children) as HTMLElement[];
      const tolerance = 2;
      const left = children.some(
        child =>
          child.getBoundingClientRect().left <
          bounds.left - tolerance
      );
      const right = children.some(
        child =>
          child.getBoundingClientRect().right >
          bounds.right + tolerance
      );
      setHeaderScrollEdges(previous =>
        previous.left === left && previous.right === right
          ? previous
          : { left, right }
      );
    };
    const observer = new ResizeObserver(updateEdges);
    observer.observe(nav);
    Array.from(nav.children).forEach(child => {
      observer.observe(child);
    });
    window.addEventListener('resize', updateEdges);
    nav.addEventListener('scroll', updateEdges, { passive: true });
    updateEdges();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateEdges);
      nav.removeEventListener('scroll', updateEdges);
    };
  }, []);

  const [savePromptVisible, setSavePromptVisible] = useState(false);
  const [savePromptValue, setSavePromptValue] = useState('');
  const saveResolverRef = useRef<((v: string | null) => void) | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setShowGrid(detail !== false);
    };
    window.addEventListener('pdf-export-grid', handler);
    return () => window.removeEventListener('pdf-export-grid', handler);
  }, []);

  const fitViewToWalls = () => {
    const extWalls = state.walls.filter(w =>
      w.type === 'exterior' && (w.floor ?? 0) === state.activeFloor
    );
    if (!extWalls.length) { state.setView({ zoom: 0.55, offsetX: 0, offsetY: 0 }); return; }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    extWalls.forEach(w => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minY = Math.min(minY, w.start.y, w.end.y);
      maxY = Math.max(maxY, w.start.y, w.end.y);
    });
    const width = maxX - minX, height = maxY - minY;
    if (width <= 0 || height <= 0) return;
    const container = canvasRef.current;
    if (!container) return;
    const zoom = Math.min(
      container.clientWidth / (width * 100),
      container.clientHeight / (height * 100)
    ) * 0.55;
    state.setView({
      zoom: Math.max(0.35, Math.min(zoom, 1)),
      offsetX: -(minX + maxX) / 2,
      offsetY: -(minY + maxY) / 2,
    });
  };

  // All project decisions use an in-app dialog instead of browser prompts.
  type StudioDecision = 'confirm' | 'input';
  const [studioDialog, setStudioDialog] = useState<{
    kind: StudioDecision; title: string; message: string; value: string;
    confirmLabel: string; destructive: boolean;
  } | null>(null);
  const studioDialogResolver = useRef<((value: string | boolean | null) => void) | null>(null);

  const requestStudioDialog = (options: {
    kind: StudioDecision; title: string; message: string;
    value?: string; confirmLabel?: string; destructive?: boolean;
  }): Promise<string | boolean | null> => new Promise(resolve => {
    studioDialogResolver.current = resolve;
    setStudioDialog({ ...options, value: options.value ?? '',
      confirmLabel: options.confirmLabel ?? 'تأكيد',
      destructive: options.destructive ?? false });
  });

  const closeStudioDialog = (result: string | boolean | null) => {
    studioDialogResolver.current?.(result);
    studioDialogResolver.current = null;
    setStudioDialog(null);
  };

  const askName = (title: string, initial: string) =>
    requestStudioDialog({ kind: 'input', title, message: '', value: initial, confirmLabel: 'متابعة' }) as Promise<string | null>;

  const askConfirm = (title: string, message: string, destructive = false) =>
    requestStudioDialog({ kind: 'confirm', title, message,
      confirmLabel: destructive ? 'حذف' : 'متابعة', destructive }) as Promise<boolean>;

  const askNameAsync = (title: string, initial: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setSavePromptValue(initial);
      saveResolverRef.current = resolve;
      setSavePromptVisible(true);
    });
  };

  const handleSavePromptConfirm = () => {
    const val = savePromptValue.trim();
    saveResolverRef.current?.(val || null);
    saveResolverRef.current = null;
    setSavePromptVisible(false);
  };

  const handleSavePromptCancel = () => {
    saveResolverRef.current?.(null);
    saveResolverRef.current = null;
    setSavePromptVisible(false);
  };

  // الحفظ داخل قائمة المشاريع فقط؛ لا تُفتح نافذة مشاركة الملفات.
  const saveLocally = (name: string): boolean => {
    const finalName = name.trim();
    if (!finalName) return false;
    try {
      state.handleSaveProject(finalName);
      return true;
    } catch (error) {
      console.error('فشل حفظ المشروع:', error);
      alert('تعذر حفظ المشروع.');
      return false;
    }
  };

  const save = async (): Promise<boolean> => {
    const name = await askNameAsync('أدخل اسم المشروع:',
      state.currentProjectName || state.projectManager.getNextProjectName());
    return name ? saveLocally(name) : false;
  };

  const handleSaveClick = async () => {
    const saved = await save();
    if (saved) alert('تم الحفظ بنجاح!');
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    const setup = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', async () => {
          if (isSidebarOpen) { setIsSidebarOpen(false); return; }
          if (state.isDirty) {
            setExitProjectName(state.currentProjectName || state.projectManager.getNextProjectName());
            setExitPromptVisible(true);
          } else {
            await CapApp.exitApp();
          }
        });
      } catch (e) {
        console.log("Capacitor not available in web");
      }
    };
    setup();
    return () => {
      if (listenerHandle) listenerHandle.remove();
    };
  }, [isSidebarOpen, state.isDirty]);

  const handleExitWithSave = async () => {
    if (!saveLocally(exitProjectName)) return;
    setExitPromptVisible(false);
    await CapApp.exitApp();
  };

  const handleExitWithoutSave = async () => {
    setExitPromptVisible(false);
    await CapApp.exitApp();
  };

  const handleCancelExit = () => {
    setExitPromptVisible(false);
  };

  const load = async (id: string) => {
    if (state.isDirty) {
      const proceed = await askConfirm('فتح مشروع', 'توجد تعديلات غير محفوظة. هل تريد حفظها قبل فتح المشروع؟');
      if (!proceed) return;
      const name = await askName('حفظ التعديلات', state.currentProjectName || 'مشروع جديد');
      if (!name?.trim()) return;
      state.handleSaveProject(name.trim());
    }
    state.handleLoadProject(id);
    state.setAllLayersLocked(true);
    setIsSidebarOpen(false);
    setTimeout(() => fitViewToWalls(), 150);
  };

  const del = async (id: string) => {
    if (await askConfirm('حذف المشروع', 'هل تريد حذف المشروع المحدد نهائياً؟', true)) {
      state.handleDeleteProject(id);
      setIsSidebarOpen(false);
    }
  };

  const newProject = async () => {
    if (state.isDirty) {
      const proceed = await askConfirm('مشروع جديد', 'توجد تعديلات غير محفوظة. هل تريد حفظها قبل إنشاء مشروع جديد؟');
      if (!proceed) return;
      const name = await askName('حفظ التعديلات', state.currentProjectName || 'مشروع جديد');
      if (!name?.trim()) return;
      state.handleSaveProject(name.trim());
    }
    state.handleNewProject();
    setIsSidebarOpen(false);
    setTimeout(() => fitViewToWalls(), 150);
  };

  const toggleClip = () => {
    state.setClipFrame(state.clipFrame ? null : {
      id: 'clip-main',
      x: state.walls[0] ? (state.walls[0].start.x + state.walls[0].end.x) / 2 : 5,
      y: state.walls[0] ? (state.walls[0].start.y + state.walls[0].end.y) / 2 : 5,
      width: 6,
      height: 6 * 1.414,
      rotation: 0,
    });
    setIsSidebarOpen(false);
  };

  const pdf = async () => {
    if (!state.clipFrame) return handleError('يرجى تفعيل الكليشة أولاً');
    const stage = document.querySelector('[data-floor-plan-stage="true"]') as HTMLElement;
    if (!stage) return handleError('تعذر العثور على منطقة الرسم');
    await exportToPDF(stage, state.clipFrame, state.view);
    setIsSidebarOpen(false);
  };

 
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const input = e.currentTarget;
  const file = input.files?.[0];

  // السماح باختيار الملف نفسه مرة أخرى
  input.value = '';

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    handleError('يرجى اختيار ملف صورة صالح');
    return;
  }

  const reader = new FileReader();

  reader.onerror = () => {
    handleError('تعذر قراءة ملف الصورة');
  };

  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      handleError('تعذر فتح الصورة');
      return;
    }

    const dataUrl = reader.result;
    const img = new Image();

    img.onerror = () => {
      handleError('الصورة غير صالحة أو غير مدعومة');
    };

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        handleError('تعذر معرفة أبعاد الصورة');
        return;
      }

      const baseWidth = 10;
      const baseHeight =
        baseWidth * img.naturalHeight / img.naturalWidth;

      state.setPlanImage({
        id: 'image-1',
        url: dataUrl,
        x: 0,
        y: 0,
        width: baseWidth,
        height: baseHeight,
        opacity: 0.5,
        locked: false,
        isSelected: true,
        rotation: 0,
      });

      // إغلاق نافذة إدارة المشاريع بعد الاستيراد
      setIsSidebarOpen(false);
    };

    img.src = dataUrl;
  };

  reader.readAsDataURL(file);
};


  const handleScaleImage = async () => {
    if (!state.planImage) return alert('لا توجد صورة مستوردة!');
    if (state.walls.length === 0) return alert('ارسم جداراً فوق الجدار الموجود في الصورة أولاً!');
    const drawnWall = state.walls[state.walls.length - 1];
    const drawnLengthAuto = Math.hypot(
      drawnWall.end.x - drawnWall.start.x,
      drawnWall.end.y - drawnWall.start.y
    );
    if (drawnLengthAuto <= 0.01) {
      return alert('الجدار المرسوم قصير جداً. ارسم جداراً أطول فوق الجدار الموجود على الصورة.');
    }
    const drawnLengthStr = await askName(
      'طول الجدار المرسوم (متر)', drawnLengthAuto.toFixed(2)
    );
    if (drawnLengthStr === null) return;
    const drawnValue = parseFloat(drawnLengthStr.replace(',', '.'));
    if (isNaN(drawnValue) || drawnValue <= 0) return alert('قيمة طول الجدار المرسوم غير صالحة');
    const imageLengthStr = await askName('الطول الحقيقي للجدار على الصورة (متر)', '3');
    if (imageLengthStr === null) return;
    const imageValue = parseFloat(imageLengthStr.replace(',', '.'));
    if (isNaN(imageValue) || imageValue <= 0) return alert('قيمة الطول الحقيقي غير صالحة');
    const factor = imageValue / drawnValue;
    const anchorX = (drawnWall.start.x + drawnWall.end.x) / 2;
    const anchorY = (drawnWall.start.y + drawnWall.end.y) / 2;
    const newWidth = state.planImage.width * factor;
    const newHeight = state.planImage.height * factor;
    const relX = (anchorX - state.planImage.x) / state.planImage.width;
    const relY = (anchorY - state.planImage.y) / state.planImage.height;
    const newX = anchorX - relX * newWidth;
    const newY = anchorY - relY * newHeight;
    state.setPlanImage({
      ...state.planImage,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
    alert('تم ضبط مقياس الصورة بنجاح!\nمعامل التحجيم = ' + factor.toFixed(3));
  };

  const handleLockImage = () => {
    if (state.planImage) state.setPlanImage({ ...state.planImage, locked: !state.planImage.locked });
  };

  const handleDeleteImage = () => { state.setPlanImage(null); };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        state.handleLoadProject(String(data.name || 'مشروع مستورد'));
        state.setWalls(data.walls || []);
        state.setDimensions(data.dimensions || []);
        state.elements.setAllElements(
          data.columns || [],
          data.windows || [],
          data.doors || [],
          data.northArrows || [],
          data.openings || []
        );
        state.textManager.setAllTexts(data.texts || []);
        state.regionsManager.setRegions(data.regions || []);
        state.stairManager.setAllStairs(data.stairs || []);
        state.stairElementManager.setAllElements(data.stairElements || []);
        state.setRoundedCorners((data as any).roundedCorners || []);
        if (data.planImage) state.setPlanImage(data.planImage);
        if (data.axes) state.setAxes(data.axes);
        if (data.view3dSettings && typeof data.view3dSettings === 'object') {
          state.handleUpdate3DSettings(data.view3dSettings);
        }
        alert('تم استيراد المشروع بنجاح!');      
      } catch {
        alert('ملف غير صالح!');
      }
    };
    reader.readAsText(file);
  };
    const canvas = (
    <CanvasContainer
      
      onUndo={state.handleUndo}
      onRedo={state.handleRedo}
      canUndo={state.history.length > 0}
      canRedo={state.future.length > 0}
      
      walls={state.walls}
      onWallsChange={state.handleWallsChange}
      onBeginWallDragHistory={state.beginWallDragHistory}
      onEndWallDragHistory={state.endWallDragHistory}
      mode={state.mode}
      showFloorsPanel={showFloorsPanel}
      drawingType={state.drawingType}
      onModeChange={state.setMode}
      onCancelTool={() => { state.setMode('view'); state.setDrawingType(null); }}
      dimensions={state.dimensions}
      onAddDimension={state.handleAddDimension}
      onDimensionsChange={state.handleDimensionsChange}
      dimensionFontSize={state.dimensionFontSize}
      layers={state.layers}
      columns={state.elements.columns}
      windows={state.elements.windows}
      doors={state.elements.doors}
      texts={state.textManager.texts}
      regions={state.regionsManager.regions}
      stairs={state.stairManager.stairs}
      northArrows={state.elements.northArrows}
      updateNorthArrow={state.handleUpdateNorthArrow}
      frozen={false}
      onAddStairAtPoint={state.handleAddStairAtPoint}
      onUpdateStair={state.handleUpdateStair}
      onDeleteStair={state.handleDeleteStair}
      onPlaceColumn={state.handlePlaceColumn}
      onPlaceWindow={state.handlePlaceWindow}
      onPlaceDoor={state.handlePlaceDoor}
      onPlaceOpening={state.handlePlaceOpening}
      onDeleteOpening={state.handleDeleteOpening}
      updateOpening={state.handleUpdateOpening}
      onPlaceRegion={state.handlePlaceRegion}
      onDeleteRegion={state.handleDeleteRegion}
      updateColumn={state.handleUpdateColumn}
      updateWindow={state.handleUpdateWindow}
      updateDoor={state.handleUpdateDoor}
      onDeleteColumn={state.handleDeleteColumn}
      onDeleteWindow={state.handleDeleteWindow}
      onDeleteDoor={state.handleDeleteDoor}
      onAddText={state.handleAddText}
      onUpdateText={state.handleUpdateText}
      onDeleteText={state.handleDeleteText}
      onCopyText={state.handleCopyText}
      onOffsetHostedElement={state.handleOffsetHostedElement}
      onCopyElementByOffset={state.handleCopyElementByOffset}
      clipFrame={state.clipFrame}
      setClipFrame={state.setClipFrame}
      planImage={state.planImage}
      setPlanImage={state.setPlanImage}
      axes={state.axes}
      selectedAxisId={null}
      onUpdateAxis={state.handleUpdateAxis}
      onDeleteAxis={state.handleDeleteAxis}
      showGrid={showGrid}
      onToggleGrid={()=>setShowGrid(v=>!v)}
      axisBubbleSize={state.axisBubbleSize}
      onCopyAxis={state.handleCopyAxis}
      stairElements={state.stairElementManager.stairElements}
      selectedStairElementId={state.stairElementEdit.selectedId}
      onUpdateStairElement={state.stairElementManager.updateElement}
      onRotateStairElement={state.stairElementManager.rotateElementById}
      onDeleteStairElement={state.stairElementManager.removeElement}
      onCopyStairElement={state.handleCopyStairElement}
      stairElementEdit={state.stairElementEdit}
      orthogonalMode={state.orthogonalMode}
      onToggleOrthogonal={state.handleToggleOrthogonal}
      openings={state.elements.openings}
      activeFloor={state.activeFloor}
      maxFloor={state.maxFloor}
      showPreviousFloor={state.showPreviousFloor}
      onSetActiveFloor={state.handleSetActiveFloor}
      onAddFloor={state.handleAddFloor}
      onCopyFloor={state.handleCopyFloor}
      onDeleteFloor={state.handleDeleteFloor}
      onTogglePreviousFloor={state.handleTogglePreviousFloor}
      floorHeights={state.floorHeights}
      onSetFloorHeight={state.handleSetFloorHeight}
      roundCornerFirstWallId={state.roundCornerFirstWallId}
      roundedCorners={state.roundedCorners}
      pendingRoundedCorner={state.pendingRoundedCorner}
      onRoundCornerWallClick={state.handleRoundCornerWallClick}
      selectedRoundedCornerId={state.selectedRoundedCornerId}
      onSelectRoundedCorner={state.handleSelectRoundedCorner}
      onUpdateRoundedCorner={state.handleUpdateRoundedCorner}
      onCommitRoundedCorner={state.handleCommitRoundedCorner}
      onDeleteRoundedCorner={state.handleRemoveRoundedCorner}
      joinWallsPending={state.joinWallsPending}
      onJoinWallClick={state.handleJoinWallClick}
      onContourSelect={state.handleSelectContour}
      selectedContourId={state.selectedContourId}
      selectedContourWalls={state.selectedContourWalls}
      selectedContourProps={state.selectedContourProps}
      onUnlinkContour={state.handleUnlinkContour}
      contours={state.allContours}
      snapIndicators={state.snapIndicators}
      onCurvedDimWallClick={state.handleCurvedDimWallClick}
      setSnapIndicators={state.setSnapIndicators}
      theme={state.colorTheme}
    />
  );

  const quantities = {
    showQuantities: state.showQuantities,
    onToggle: () => state.setShowQuantities(prev => !prev),
    activeTab: state.activeTab,
    onTabChange: state.setActiveTab,
    walls: state.walls,
    columns: state.elements.columns,
    windows: state.elements.windows,
    doors: state.elements.doors,
    regions: state.regionsManager.regions,
    stairs: state.stairManager.stairs,
    results: state.results,
    canShowQuantities: !!state.projectManager.currentProjectId,
    floorHeights: state.floorHeights,
    activeFloor: state.activeFloor,
    projectId: String(state.projectManager.currentProjectId ?? ""),
  };

  const topbar = (
    <TopToolbar
      mode={state.mode}
      drawingType={state.drawingType}
      onStartDrawing={t => { state.setDrawingType(t); state.setMode('drawing'); }}
      onUndo={state.handleUndo}
      onRedo={state.handleRedo}
      historyLength={state.history.length}
      futureLength={state.future.length}
      onAddAllDimensions={state.handleAddAllDimensions}
      onModeChange={state.setMode}
      layers={state.layers}
      onToggleLayer={state.toggleLayer}
      onToggleAllLayers={state.toggleAllLayers}
      allUnlocked={state.allUnlocked}
      dimensionFontSize={state.dimensionFontSize}
      onDimensionFontSizeChange={state.setDimensionFontSize}
      onAddNorthArrow={state.handleAddNorthArrow}
      onAddAxes={state.handleAddAxes}
      axes={state.axes}
      onAddAxesFromWalls={state.handleAddAxesFromWalls}
      onDeleteAllAxes={state.handleDeleteAllAxes}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid(prev => !prev)}
      onDeleteAllDimensions={state.handleDeleteAllDimensions}
      globalTextSize={state.globalTextSize}
      onGlobalTextSizeChange={state.handleApplyGlobalTextSize}
      globalFontFamily={state.globalFontFamily}
      onGlobalFontFamilyChange={state.handleApplyGlobalFontFamily}
      axisBubbleSize={state.axisBubbleSize}
      onAxisBubbleSizeChange={state.setAxisBubbleSize}
      onOpenMultiStairDialog={state.handleOpenMultiStairDialog}
      onSetDoorType={state.handleSetDoorType}
      onSetColumnShape={state.handleSetColumnShape}
      onStartCurvedWall={state.handleStartCurvedWall}
      onStartDrawingBoundary={state.handleStartDrawingBoundary}
      onStartDrawingHelperLine={state.handleStartDrawingHelperLine}
      onBuildFenceOnBoundaries={state.handleBuildFenceOnBoundaries}
      onDeleteAllHelperLines={state.handleDeleteAllHelperLines}
      onStartRoundCornerMode={state.handleStartRoundCornerMode}
      onStartJoinWallsMode={state.handleStartJoinWallsMode}
      joinWallsMode={state.mode === 'join-walls'}
      joinWallsCount={state.joinWallsPending.length}
      onConfirmJoinWalls={state.handleConfirmJoinWalls}
      onCancelJoinWalls={state.handleCancelJoinWallsMode}
      theme={state.colorTheme}
      onColorChange={state.updateColor}
      onResetColors={state.resetColorTheme}
    />
  );

  

const sidebar = isSidebarOpen && (
  <div
    className="studio-project-modal-backdrop"
    onClick={() => setIsSidebarOpen(false)}
  >
    <section
      className="studio-project-modal"
      role="dialog"
      aria-modal="true"
      aria-label="إدارة المشاريع"
      dir="rtl"
      onClick={e => e.stopPropagation()}
    >
      <header className="studio-project-modal-header">
        <h3>📁 إدارة المشاريع</h3>

        <button
          type="button"
          aria-label="إغلاق"
          onClick={() => setIsSidebarOpen(false)}
        >
          ✕
        </button>
      </header>

      <div className="studio-project-modal-body">
        <div className="studio-project-actions">
          <button type="button" onClick={newProject}>
            ➕ مشروع جديد
          </button>

          <button type="button" onClick={handleSaveClick}>
            💾 حفظ في الهاتف
          </button>

          <label className="studio-project-file-label">
            📂 استيراد مشروع من الهاتف
            <input
              type="file"
              accept=".json,application/json"
              onChange={importProject}
            />
          </label>

          <select
            aria-label="اختر مشروعاً"
            defaultValue=""
            onChange={e =>
              e.target.value && load(e.target.value)
            }
          >
            <option value="">📂 اختر مشروعاً محفوظاً</option>
            {state.projectManager.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {state.projectManager.currentProjectId && (
            <button
              type="button"
              className="studio-project-danger"
              onClick={() =>
                del(state.projectManager.currentProjectId!)
              }
            >
              🗑️ حذف المشروع المحدد
            </button>
          )}
        </div>

        <div className="studio-project-image-section">
          <h4>الصورة المستوردة</h4>

          <label className="studio-project-file-label">
            🖼️ استيراد صورة من الهاتف
            <input
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp"
              onChange={handleImageUpload}
            />
          </label>

          {state.planImage && (
            <div className="studio-project-image-actions">
              <button
                type="button"
                onClick={handleScaleImage}
              >
                📏 ضبط مقياس الرسم
              </button>

              <button
                type="button"
                onClick={handleLockImage}
              >
                {state.planImage.locked
                  ? '🔓 فك قفل الصورة'
                  : '🔒 قفل الصورة'}
              </button>

              <button
                type="button"
                className="studio-project-danger"
                onClick={handleDeleteImage}
              >
                🗑️ حذف الصورة
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="studio-project-modal-footer">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
        >
          إغلاق
        </button>
      </footer>
    </section>
  </div>
);


  return (
    <div className="app edit-studio-app" style={{height:'100dvh',overflow:'hidden',display:'flex',flexDirection:'column',minWidth:0,position:'relative'}}>

      <header className="header edit-studio-app-header" dir="ltr">
        
<div className="studio-brand" dir="rtl">
  
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M3 44h42M9 44V18L24 5l15 13v26M16 44V12M32 44V12M21 44V30h6v14M9 26l7-5m16 0 7 5M12 33h4m16 0h4M12 39h4m16 0h4"/>
          </svg>
          
<div dir="rtl">
  <strong>البرنامج الشامل</strong>
  <small>المسقط - المنظور - حساب الكميات</small>
</div>
          
        </div>
        <div
          className={
            'studio-header-scroll-shell' +
            (headerScrollEdges.left ? ' has-scroll-left' : '') +
            (headerScrollEdges.right ? ' has-scroll-right' : '')
          }
        >
          <nav
            ref={headerActionsRef}
            className="studio-header-actions"
            dir="rtl"
            aria-label="أوامر المشروع"
          >
            <button type="button" onClick={()=>setIsSidebarOpen(true)}><StudioIcon name="file"/>جديد</button>
            <button type="button" onClick={()=>setIsSidebarOpen(true)}><StudioIcon name="folder"/>فتح</button>
            <button type="button" onClick={handleSaveClick}><StudioIcon name="save"/>حفظ</button>
            <div
              title="اسم المشروع الجاري العمل عليه"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px',
                border: '1px solid #20b8c0', borderRadius: 7, whiteSpace: 'nowrap',
                background: 'rgba(32,184,192,0.08)', fontSize: 12 }}
            >
              <span>{state.currentProjectName || 'لا يوجد مشروع حالي'}</span>
              <span style={{ color: state.isDirty ? '#b45309' : '#16804a' }}>
                {state.isDirty ? 'غير محفوظ' : state.currentProjectName ? 'محفوظ' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleClip}
              title="إضافة الكليشة أو إزالتها"
              aria-pressed={!!state.clipFrame}
            >
              <StudioIcon name="square" />
              الكليشة
            </button>

            <button
              type="button"
              onClick={pdf}
              title="تصدير المخطط إلى PDF"
              disabled={!state.clipFrame}
            >
              <StudioIcon name="print" />
              PDF
            </button>

            <button type="button" onClick={()=>setShowView3D(true)}><StudioIcon name="cube"/>عرض 3D</button>
            <button type="button" aria-expanded={showStudioSettings} onClick={()=>setShowStudioSettings(v=>!v)}><StudioIcon name="settings"/>الإعدادات</button>
          </nav>
        </div>
      </header>

      {sidebar}

      {showStudioSettings&&<div className="studio-settings-overlay" onClick={()=>setShowStudioSettings(false)}>
        <div className="studio-settings-panel" dir="rtl" role="dialog" aria-label="إعدادات التطبيق" onClick={e=>e.stopPropagation()}>
          <div className="studio-settings-heading"><strong><StudioIcon name="settings" size={20}/> إعدادات التطبيق</strong><button type="button" onClick={()=>setShowStudioSettings(false)} aria-label="إغلاق">×</button></div>
          <div className="studio-settings-row"><div><strong>الوضع الليلي</strong><small>تغيير مظهر الواجهة وشاشة الرسم</small></div><button type="button" className={'studio-settings-switch'+(studioDark?' is-on':'')} role="switch" aria-checked={studioDark} onClick={changeStudioAppearance}><span/></button></div>
          <div className="studio-settings-row"><div><strong>المظهر الحالي</strong><small>{studioDark?'داكن':'فاتح'}</small></div><StudioIcon name={studioDark?'moon':'sun'} size={21}/></div>
        </div>
      </div>}

      <div className="edit-studio-topbar-area" style={{flexShrink:0,minWidth:0,position:'relative',zIndex:100}}>{topbar}</div>

      <div ref={canvasRef} className="edit-studio-canvas-area" style={{flex:1,minHeight:0,minWidth:0,position:'relative',overflow:'hidden'}}>
        <div className="studio-canvas-host">{canvas}</div>
        {!state.showQuantities && <QuantitiesPanel {...quantities} display="all" />}
        <StudioDrawingRail
          mode={state.mode}
          drawingType={state.drawingType}
          onStartDrawing={type=>{state.setDrawingType(type);state.setMode('drawing');}}
          onCurvedWall={state.handleStartCurvedWall}
          onBoundary={state.handleStartDrawingBoundary}
          onHelperLine={state.handleStartDrawingHelperLine}
          onFence={state.handleBuildFenceOnBoundaries}
          onStairs={state.handleOpenMultiStairDialog}
          onDimensions={state.handleAddAllDimensions}
          onAxes={state.handleAddAxesFromWalls}
          showFloorsPanel={showFloorsPanel}
          onToggleFloorsPanel={() => setShowFloorsPanel(v => !v)}
          onCancel={()=>{state.setMode('view');state.setDrawingType(null);}}
        />
      </div>

      {state.showQuantities && <QuantitiesPanel {...quantities} display="all" />}

      {studioDialog && (
        
<div
  className="studio-ui-modal-backdrop"
  role="presentation"
  style={{
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box',
    background: 'rgba(0, 0, 0, 0.65)',
  }}
  onMouseDown={e => {
    if (e.target === e.currentTarget) {
      closeStudioDialog(null);
    }
  }}
>
  
        
          
<div
  className="studio-ui-modal"
  role="dialog"
  aria-modal="true"
  aria-label={studioDialog.title}
  dir="rtl"
  style={{
    position: 'relative',
    width: 'min(400px, 100%)',
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#173247',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)',
  }}
>
  
          
            <div className="studio-ui-modal-header">
              <strong>{studioDialog.title}</strong>
              <button type="button" aria-label="إغلاق النافذة" onClick={() => closeStudioDialog(null)}>×</button>
            </div>
            {studioDialog.message && <p className="studio-ui-modal-description">{studioDialog.message}</p>}
            {studioDialog.kind === 'input' && (
              <input className="studio-ui-modal-input" autoFocus
                value={studioDialog.value}
                onFocus={e => e.currentTarget.select()}
                onChange={e => setStudioDialog(d => d ? {...d, value: e.target.value} : d)}
                onKeyDown={e => {
                  if (e.key === 'Escape') closeStudioDialog(null);
                  if (e.key === 'Enter' && studioDialog.value.trim()) closeStudioDialog(studioDialog.value.trim());
                }} />
            )}
            <div className="studio-ui-modal-actions">
              <button type="button" className={studioDialog.destructive ? 'is-danger' : 'is-primary'}
                disabled={studioDialog.kind === 'input' && !studioDialog.value.trim()}
                onClick={() => closeStudioDialog(studioDialog.kind === 'input' ? studioDialog.value.trim() : true)}>
                {studioDialog.confirmLabel}
              </button>
              <button type="button" onClick={() => closeStudioDialog(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {savePromptVisible && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#003366', fontSize: 17, textAlign: 'center' }}>
              💾 حفظ المشروع
            </h3>
            <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 13, textAlign: 'center' }}>
              أدخل اسم المشروع (نفس الاسم = تحديث، اسم جديد = إنشاء جديد)
            </p>
            <input
              type="text"
              value={savePromptValue}
              onChange={e => setSavePromptValue(e.target.value)}
              onFocus={e => e.target.select()}
              autoFocus
              dir="rtl"
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: '2px solid #00509e',
                fontSize: 15, fontFamily: 'Cairo, sans-serif', textAlign: 'right',
                boxSizing: 'border-box', marginBottom: 16,
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSavePromptConfirm();
                if (e.key === 'Escape') handleSavePromptCancel();
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSavePromptConfirm}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: '#00509e', color: '#fff', fontWeight: 700,
                  fontSize: 15, cursor: 'pointer',
                }}
              >
                💾 حفظ
              </button>
              <button
                onClick={handleSavePromptCancel}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: '2px solid #ccc', background: '#f0f0f0',
                  color: '#333', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >
                ✖ إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {exitPromptVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#003366', fontSize: 18 }}>
              لديك تغييرات غير محفوظة
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: 14, lineHeight: 1.6 }}>
              هل تريد حفظ التعديلات قبل الخروج من التطبيق؟
            </p>
            <label style={{ display: 'block', marginBottom: 12, textAlign: 'right', color: '#003366', fontSize: 14 }}>
              اسم المشروع
              <input
                type="text"
                value={exitProjectName}
                onChange={e => setExitProjectName(e.target.value)}
                dir="rtl"
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6,
                  padding: 10, borderRadius: 8, border: '1px solid #8ba6bf', fontSize: 15 }}
              />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                disabled={!exitProjectName.trim()}
                onClick={handleExitWithSave}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#00509e',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                💾 حفظ وخروج
              </button>
              <button
                onClick={handleExitWithoutSave}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#dc3545',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                🚪 خروج بدون حفظ
              </button>
              <button
                onClick={handleCancelExit}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: '2px solid #ccc',
                  background: '#f0f0f0',
                  color: '#333',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                ✖ إلغاء الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {state.showStairDialog && (
        <StairSettingsDialog
          onClose={state.handleCloseStairDialog}
          onInsertStep={(config) => {
            state.handleInsertStepMode(config);
          }}
          onInsertLanding={(config) => {
            state.handleInsertLandingMode(config);
          }}
        />
      )}

      {state.pendingRoundedCorner && (() => {
        const wallA = state.walls.find(w => w.id === state.pendingRoundedCorner!.wallAId);
        const wallB = state.walls.find(w => w.id === state.pendingRoundedCorner!.wallBId);
        if (!wallA || !wallB) return null;
        const lenA = Math.hypot(wallA.end.x - wallA.start.x, wallA.end.y - wallA.start.y);
        const lenB = Math.hypot(wallB.end.x - wallB.start.x, wallB.end.y - wallB.start.y);
        const maxRadius = Math.min(lenA, lenB) / 2;
        return (
          <RoundedCornerDialog
            initialRadius={state.pendingRoundedCorner!.radius}
            maxRadius={maxRadius}
            onRadiusChange={state.handleUpdatePendingRadius}
            onConfirm={state.handleConfirmPendingRoundedCorner}
            onCancel={state.handleCancelPendingRoundedCorner}
          />
        );
      })()}

      {showView3D && (
        <View3DPanel
          walls={state.walls}
          windows={state.elements.windows}
          doors={state.elements.doors}
          openings={state.elements.openings}
          columns={state.elements.columns}
          stairs={state.stairManager.stairs}
          stairElements={state.stairElementManager.stairElements}
          floorHeights={state.floorHeights}
          maxFloor={state.maxFloor}
          settings={state.view3dSettings}
          onChange={state.handleUpdate3DSettings}
          onUpdateFloorOverride={state.handleUpdateFloorOverride}
          onClearFloorOverride={state.handleClearFloorOverride}  
          onClose={() => setShowView3D(false)}
        />
      )}
    </div>
  );
}

const btnStyles = {
  btn: {
    padding: '10px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#f0f0f0',
    cursor: 'pointer',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  btnPrimary: {
    padding: '10px',
    borderRadius: 6,
    border: '1px solid #00509e',
    background: '#00509e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
  btnDanger: {
    padding: '10px',
    borderRadius: 6,
    border: '1px solid #dc3545',
    background: '#dc3545',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
};
