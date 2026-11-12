
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { worldToScreen } from './geometry';
import type { CanvasView, ClipFrame } from './types';

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
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
) {
  if (!clipFrame) {
    alert('يرجى تفعيل الكليشة أولاً');
    return;
  }

  window.dispatchEvent(
    new CustomEvent('pdf-export-grid', {
      detail: false,
    })
  );

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => resolve())
  );

  await new Promise<void>((resolve) =>
    setTimeout(resolve, 100)
  );

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

    if (stageWidth <= 0 || stageHeight <= 0) {
      alert('تعذر تحديد مساحة الرسم');
      return;
    }

    // 1. تحديد حدود الكليشة في إحداثيات العالم.
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

    // 2. استخدام أبعاد الكليشة الكاملة.
    // لا نقلص الصورة إلى الجزء الظاهر من الشاشة.
    const exportWidth = Math.max(
      1,
      Math.round(frameWidth * scale)
    );

    const exportHeight = Math.max(
      1,
      Math.round(frameHeight * scale)
    );

    // 3. إنشاء Canvas للتصدير.
    const exportCanvas =
      document.createElement('canvas');

    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      alert('تعذر تجهيز المسقط للتصدير');
      return;
    }

    // تحسين جودة الصورة عند تغيير حجمها.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // خلفية بيضاء لصفحة المسقط.
    ctx.fillStyle = '#ffffff';

    ctx.fillRect(
      0,
      0,
      exportWidth,
      exportHeight
    );

    // 4. دمج طبقات Canvas في مواقعها الأصلية
    // بالنسبة إلى حدود الكليشة الكاملة.
    canvases.forEach((canvas) => {
      if (
        canvas.width <= 0 ||
        canvas.height <= 0
      ) {
        return;
      }

      const destX =
        -frameLeft * scale;

      const destY =
        -frameTop * scale;

      const destWidth =
        stageWidth * scale;

      const destHeight =
        stageHeight * scale;

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

    // 5. تحديد أبعاد صفحة PDF
    // مع الحفاظ على نسبة أبعاد الكليشة.
    const contentRatio =
      exportWidth / exportHeight;

    const targetLongestSide = 280;

    let contentWidthMM: number;
    let contentHeightMM: number;

    if (contentRatio >= 1) {
      contentWidthMM = targetLongestSide;

      contentHeightMM =
        targetLongestSide / contentRatio;
    } else {
      contentHeightMM = targetLongestSide;

      contentWidthMM =
        targetLongestSide * contentRatio;
    }

    // 6. إضافة هامش 4%.
    const marginRatio = 0.04;

    const marginX =
      contentWidthMM * marginRatio;

    const marginY =
      contentHeightMM * marginRatio;

    const pageWidth =
      contentWidthMM + marginX * 2;

    const pageHeight =
      contentHeightMM + marginY * 2;

    // 7. إنشاء ملف PDF.
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

    // 8. إدراج المسقط داخل الصفحة.
    const imgData =
      exportCanvas.toDataURL('image/png');

    pdf.addImage(
      imgData,
      'PNG',
      marginX,
      marginY,
      contentWidthMM,
      contentHeightMM,
      undefined,
      'FAST'
    );

    const fileName =
      'المسقط_المعماري.pdf';

    // 9. الحفظ والمشاركة في تطبيق Android.
    if (Capacitor.isNativePlatform()) {
      const pdfBlob = pdf.output('blob');

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
    window.dispatchEvent(
      new CustomEvent('pdf-export-grid', {
        detail: true,
      })
    );
  }
}
