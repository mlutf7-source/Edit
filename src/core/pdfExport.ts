
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { worldToScreen } from './geometry';
import type { CanvasView, ClipFrame } from './types';

const blobToBase64 = async (
  blob: Blob
): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = '';
  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export async function exportToPDF(
  stage: HTMLElement,
  clipFrame: ClipFrame | null,
  view: CanvasView,
  scale = 8
): Promise<void> {
  if (!clipFrame) {
    alert('يرجى تفعيل الكليشة أولاً');
    return;
  }

  // إخفاء الشبكة أثناء التصدير.
  window.dispatchEvent(
    new CustomEvent('pdf-export-grid', {
      detail: false,
    })
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100);
  });

  try {
    const canvases = Array.from(
      stage.querySelectorAll('canvas')
    );

    if (!canvases.length) {
      alert('تعذر العثور على عناصر الرسم');
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    if (
      stageWidth <= 0 ||
      stageHeight <= 0
    ) {
      alert('تعذر تحديد مساحة الرسم');
      return;
    }

    if (
      !Number.isFinite(scale) ||
      scale <= 0
    ) {
      alert('دقة التصدير غير صالحة');
      return;
    }

    // -----------------------------------
    // 1. حساب حدود الكليشة في World
    // -----------------------------------

    const left =
      clipFrame.x - clipFrame.width / 2;

    const right =
      clipFrame.x + clipFrame.width / 2;

    const top =
      clipFrame.y - clipFrame.height / 2;

    const bottom =
      clipFrame.y + clipFrame.height / 2;

    const topLeft = worldToScreen(
      left,
      top,
      stageWidth,
      stageHeight,
      view.zoom,
      view.offsetX,
      view.offsetY
    );

    const bottomRight = worldToScreen(
      right,
      bottom,
      stageWidth,
      stageHeight,
      view.zoom,
      view.offsetX,
      view.offsetY
    );

    const frameLeft = Math.min(
      topLeft.x,
      bottomRight.x
    );

    const frameTop = Math.min(
      topLeft.y,
      bottomRight.y
    );

    const frameRight = Math.max(
      topLeft.x,
      bottomRight.x
    );

    const frameBottom = Math.max(
      topLeft.y,
      bottomRight.y
    );

    const frameWidth =
      frameRight - frameLeft;

    const frameHeight =
      frameBottom - frameTop;

    if (
      !Number.isFinite(frameWidth) ||
      !Number.isFinite(frameHeight) ||
      frameWidth <= 0 ||
      frameHeight <= 0
    ) {
      alert('أبعاد الكليشة غير صالحة');
      return;
    }

    // -----------------------------------
    // 2. مساحة الصورة = مساحة الكليشة
    // -----------------------------------

    const exportWidth = Math.max(
      1,
      Math.round(frameWidth * scale)
    );

    const exportHeight = Math.max(
      1,
      Math.round(frameHeight * scale)
    );

    const exportCanvas =
      document.createElement('canvas');

    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      alert('تعذر تجهيز المسقط للتصدير');
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      0,
      0,
      exportWidth,
      exportHeight
    );

    // -----------------------------------
    // 3. دمج طبقات الرسم
    // -----------------------------------

    // تحويل موضع Canvas الأصلي إلى
    // إحداثيات تبدأ من أعلى يسار الكليشة.
    const destX = -frameLeft * scale;
    const destY = -frameTop * scale;

    const destWidth =
      stageWidth * scale;

    const destHeight =
      stageHeight * scale;

    canvases.forEach((canvas) => {
      if (
        canvas.width <= 0 ||
        canvas.height <= 0
      ) {
        return;
      }

      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        destX,
        destY,
        destWidth,
        destHeight
      );
    });

    // -----------------------------------
    // 4. رسم إطار الكليشة على حدود الصورة
    // -----------------------------------

    // نرسم الإطار داخل حدود الصورة
    // حتى لا يُقص نصف سمك الخط.
    const borderWidth = Math.max(
      1,
      2 * scale
    );

    const inset = borderWidth / 2;

    ctx.save();

    ctx.globalCompositeOperation =
      'source-over';

    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = borderWidth;

    ctx.setLineDash([
      8 * scale,
      5 * scale,
    ]);

    ctx.lineDashOffset = 0;
    ctx.lineJoin = 'miter';

    ctx.strokeRect(
      inset,
      inset,
      Math.max(
        0,
        exportWidth - borderWidth
      ),
      Math.max(
        0,
        exportHeight - borderWidth
      )
    );

    ctx.restore();

    // -----------------------------------
    // 5. حساب أبعاد صفحة PDF
    // -----------------------------------

    // نحافظ على نسبة عرض الكليشة
    // إلى ارتفاعها دون إضافة هوامش.
    const contentRatio =
      frameWidth / frameHeight;

    const targetLongestSide = 280;

    let pageWidth: number;
    let pageHeight: number;

    if (contentRatio >= 1) {
      pageWidth = targetLongestSide;
      pageHeight =
        targetLongestSide / contentRatio;
    } else {
      pageHeight = targetLongestSide;
      pageWidth =
        targetLongestSide * contentRatio;
    }

    // -----------------------------------
    // 6. إنشاء PDF
    // -----------------------------------

    const pdf = new jsPDF({
      orientation:
        pageWidth >= pageHeight
          ? 'landscape'
          : 'portrait',
      unit: 'mm',
      format: [
        pageWidth,
        pageHeight,
      ],
      compress: true,
    });

    // -----------------------------------
    // 7. ملء الصفحة بصورة الكليشة
    // -----------------------------------

    const imgData =
      exportCanvas.toDataURL('image/png');

    pdf.addImage(
      imgData,
      'PNG',
      0,
      0,
      pageWidth,
      pageHeight,
      undefined,
      'FAST'
    );

    const fileName =
      'المسقط_المعماري.pdf';

    // -----------------------------------
    // 8. الحفظ والمشاركة
    // -----------------------------------

    if (Capacitor.isNativePlatform()) {
      const pdfBlob =
        pdf.output('blob');

      const base64Data =
        await blobToBase64(pdfBlob);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri =
        await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

      await Share.share({
        title: 'المسقط المعماري',
        text: 'المسقط المعماري',
        url: fileUri.uri,
        dialogTitle:
          'مشاركة المسقط المعماري PDF',
      });
    } else {
      pdf.save(fileName);
    }

    // تحرير الذاكرة.
    exportCanvas.width = 1;
    exportCanvas.height = 1;

  } catch (error) {
    console.error(
      'PDF export error:',
      error
    );

    alert(
      'حدث خطأ أثناء تصدير المسقط إلى PDF'
    );

  } finally {
    // إعادة الشبكة بعد التصدير.
    window.dispatchEvent(
      new CustomEvent('pdf-export-grid', {
        detail: true,
      })
    );
  }
}
