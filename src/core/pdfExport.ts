
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { CanvasView, ClipFrame } from './types';

export interface PDFRenderRequest {
  stage: HTMLElement;
  clipFrame: ClipFrame;
  width: number;
  height: number;
  zoom: number;
  requestId: string;
}

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + 0x8000, bytes.length))
    );
  }

  return btoa(binary);
};

const nextPaint = (): Promise<void> =>
  new Promise(resolve =>
    requestAnimationFrame(() => resolve())
  );

let exporting = false;

export async function exportToPDF(
  stage: HTMLElement,
  clipFrame: ClipFrame | null,
  _view: CanvasView,
  scale = 8
): Promise<void> {
  if (exporting) return;

  if (!clipFrame) {
    alert('يرجى تفعيل الكليشة أولاً');
    return;
  }

  if (
    !Number.isFinite(clipFrame.width) ||
    !Number.isFinite(clipFrame.height) ||
    clipFrame.width <= 0 ||
    clipFrame.height <= 0 ||
    !Number.isFinite(clipFrame.x) ||
    !Number.isFinite(clipFrame.y)
  ) {
    alert('أبعاد الكليشة غير صالحة');
    return;
  }

  if (!Number.isFinite(scale) || scale <= 0) {
    alert('دقة التصدير غير صالحة');
    return;
  }

  // الكليشة مستقيمة دائماً.
  if (Math.abs(Math.sin(clipFrame.rotation || 0)) > 0.00001) {
    alert('يرجى جعل الكليشة مستقيمة قبل التصدير');
    return;
  }

  exporting = true;

  const requestId =
    `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let exportCanvas: HTMLCanvasElement | null = null;

  try {
    // سقف آمن نسبياً لأبعاد Canvas على الهواتف.
    const maxSide = 4096;
    const pixelsPerMeter = 100;

    const requestedZoom = Math.max(0.01, scale / 4);

    const zoom = Math.min(
      requestedZoom,
      maxSide / (clipFrame.width * pixelsPerMeter),
      maxSide / (clipFrame.height * pixelsPerMeter)
    );

    const width = Math.max(
      1,
      Math.round(clipFrame.width * pixelsPerMeter * zoom)
    );

    const height = Math.max(
      1,
      Math.round(clipFrame.height * pixelsPerMeter * zoom)
    );

    // طلب رسم نسخة مستقلة عن شاشة الهاتف.
    const renderStage = await new Promise<HTMLElement>(
      (resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const onReady = (event: Event) => {
          const detail = (
            event as CustomEvent<{
              requestId: string;
              stage: HTMLElement;
            }>
          ).detail;

          if (detail?.requestId !== requestId) return;

          clearTimeout(timeoutId);
          window.removeEventListener(
            'pdf-export-render-ready',
            onReady
          );

          resolve(detail.stage);
        };

        window.addEventListener(
          'pdf-export-render-ready',
          onReady
        );

        timeoutId = setTimeout(() => {
          window.removeEventListener(
            'pdf-export-render-ready',
            onReady
          );
          reject(new Error('PDF render timed out'));
        }, 15000);

        const detail: PDFRenderRequest = {
          stage,
          clipFrame,
          width,
          height,
          zoom,
          requestId
        };

        window.dispatchEvent(
          new CustomEvent('pdf-export-render-request', {
            detail
          })
        );
      }
    );

    await nextPaint();

    const canvases = Array.from(
      renderStage.querySelectorAll('canvas')
    );

    if (!canvases.length) {
      throw new Error('No export canvases');
    }

    exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Cannot create export context');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // طبقات الرسم المؤقتة كلها بنفس الإحداثيات.
    for (const canvas of canvases) {
      if (canvas.width <= 0 || canvas.height <= 0) continue;

      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        width,
        height
      );
    }

    // إطار واحد فقط، على حدود الكليشة نفسها.
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);

    const inset = 1;

    ctx.strokeRect(
      inset,
      inset,
      Math.max(0, width - inset * 2),
      Math.max(0, height - inset * 2)
    );

    ctx.restore();

    const ratio = clipFrame.width / clipFrame.height;
    const longestSide = 280;

    const pageWidth =
      ratio >= 1 ? longestSide : longestSide * ratio;

    const pageHeight =
      ratio >= 1 ? longestSide / ratio : longestSide;

    const pdf = new jsPDF({
      orientation:
        pageWidth >= pageHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
      compress: true
    });

    pdf.addImage(
      exportCanvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      pageWidth,
      pageHeight,
      undefined,
      'FAST'
    );

    const fileName = 'المسقط_المعماري.pdf';

    if (Capacitor.isNativePlatform()) {
      const base64Data = await blobToBase64(
        pdf.output('blob')
      );

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache
      });

      await Share.share({
        title: 'المسقط المعماري',
        text: 'المسقط المعماري',
        url: fileUri.uri,
        dialogTitle: 'مشاركة المسقط المعماري PDF'
      });
    } else {
      pdf.save(fileName);
    }
  } catch (error) {
    console.error('PDF export error:', error);
    alert('حدث خطأ أثناء تصدير المسقط إلى PDF');
  } finally {
    exportCanvas?.remove();

    window.dispatchEvent(
      new CustomEvent('pdf-export-render-release', {
        detail: { requestId }
      })
    );

    exporting = false;
  }
}
