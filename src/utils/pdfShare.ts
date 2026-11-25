import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const safeName = (name: string) =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

const savePdfOnWeb = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

const saveAndSharePdfOnAndroid = async (
  blob: Blob,
  fileName: string,
  title: string,
) => {
  const base64Data = await blobToBase64(blob);

  await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Cache,
  });

  const fileUriResult = await Filesystem.getUri({
    path: fileName,
    directory: Directory.Cache,
  });

  await Share.share({
    title,
    text: title,
    url: fileUriResult.uri,
    dialogTitle: 'مشاركة ملف PDF',
  });
};

export const createPdfFromElement = async (
  elementId: string,
  title = 'تقرير المشروع',
) => {
  const element = document.getElementById(elementId);

  if (!element) {
    alert('لم يتم العثور على منطقة التقرير');
    return;
  }

  let wrapper: HTMLDivElement | null = null;

  try {
    const clone = element.cloneNode(true) as HTMLElement;

    // Match the live DOM to its clone before removing anything, so form
    // values in the remaining report cells retain their original indices.
    const liveNodes = [element, ...Array.from(element.querySelectorAll('*'))];
    const copyNodes = [clone, ...Array.from(clone.querySelectorAll('*'))];
    const copies = new Map<Element, Element>(liveNodes.map((node, i) => [node, copyNodes[i]]));
    const excluded = new Set<Element>();
    if (elementId === 'finishes-pdf') {
      element.querySelectorAll('.qty-floor-controls, [data-pdf-exclude="true"]').forEach(node => excluded.add(node));
      element.querySelectorAll('button[aria-expanded]').forEach(button => {
        if (!button.textContent?.includes('الحسابات التفصيلية')) return;
        excluded.add(button);
        if (button.getAttribute('aria-expanded') !== 'true') return;
        let panel = button.nextElementSibling;
        if (button.closest('[aria-label="إجمالي الكميات النهائي"]')) {
          // The final summary renders one source table per material.
          while (panel && panel.querySelector('thead')?.textContent?.includes('مصدر الكمية')) {
            excluded.add(panel);
            panel = panel.nextElementSibling;
          }
        } else if (panel) {
          excluded.add(panel);
          // RoomQuantityDetails also renders an introductory paragraph.
          if (panel.tagName === 'P' && panel.nextElementSibling) excluded.add(panel.nextElementSibling);
        }
      });
    }

    const originalSelects = element.querySelectorAll('select');
    const clonedSelects = clone.querySelectorAll('select');

    originalSelects.forEach((select, index) => {
      const clonedSelect = clonedSelects[index] as HTMLSelectElement;

      if (clonedSelect) {
        const selectedText =
          (select as HTMLSelectElement).selectedOptions[0]?.textContent || '';

        const span = document.createElement('span');

        span.textContent = selectedText;
        span.style.display = 'inline-block';
        span.style.padding = '6px 10px';

        clonedSelect.replaceWith(span);
      }
    });

    // Build a read-only report snapshot without interactive form controls.
    // Values are read from the live form, not from HTML attributes that may be stale.
    const originalInputs = element.querySelectorAll('input, textarea');
    const clonedInputs = clone.querySelectorAll('input, textarea');
    originalInputs.forEach((input, index) => {
      const cloned = clonedInputs[index];
      if (!cloned) return;
      const live = input as HTMLInputElement | HTMLTextAreaElement;
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.padding = '4px 6px';
      span.style.whiteSpace = 'pre-wrap';
      if (live instanceof HTMLInputElement &&
          (live.type === 'checkbox' || live.type === 'radio')) {
        span.textContent = live.checked ? 'نعم' : 'لا';
      } else {
        span.textContent = live.value || '—';
      }
      cloned.replaceWith(span);
    });

    // Remove whole detail panels, not merely their controls. The live
    // application remains untouched, including its expanded state.
    excluded.forEach(node => copies.get(node)?.remove());

    // Remove actions from the exported copy, including nested export buttons.
    clone.querySelectorAll('button, [role="button"], [data-pdf-exclude="true"]').forEach(node => node.remove());
    clone.querySelectorAll<HTMLElement>('[data-pdf-only="true"]').forEach(node => {
      node.style.display = 'inline';
    });

    clone.style.width = '760px';
    clone.style.maxWidth = '760px';
    clone.style.boxSizing = 'border-box';
    clone.style.margin = '0 auto';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.background = '#ffffff';
    clone.style.padding = '16px';
    clone.style.direction = 'rtl';
    clone.style.fontFamily = 'Cairo, Arial, sans-serif';

    wrapper = document.createElement('div');

    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    wrapper.style.background = '#ffffff';
    wrapper.style.overflow = 'visible';
    wrapper.style.zIndex = '-1';

    // Isolate the exported report from the application's dark theme.
    // Keep the live application and its theme unchanged.
    const reportColors: Record<string, string> = {
      '--qty-bg': '#ffffff',
      '--qty-card': '#ffffff',
      '--qty-text': '#123348',
      '--qty-muted': '#557083',
      '--qty-accent': '#00e0e9',
      '--qty-accent-soft': '#dcfbfd',
      '--qty-navy': '#07364d',
      '--qty-navy-deep': '#082b40',
      '--qty-border': '#d3e1e9',
      '--qty-tab': '#f8fbfd',
      '--qty-danger': '#b42332',
    };
    Object.entries(reportColors).forEach(([name, value]) => {
      clone.style.setProperty(name, value, 'important');
    });
    clone.style.setProperty('color-scheme', 'light');
    clone.style.setProperty('color', '#123348', 'important');
    wrapper.style.setProperty('color', '#123348', 'important');

    // Body cells and section labels must remain readable on white paper.
    // Header cells retain a contrasting navy background and white text.
    clone.querySelectorAll<HTMLElement>('table, td, caption, h1, h2, h3, h4, .qty-main-heading').forEach(node => {
      node.style.setProperty('color', '#123348', 'important');
    });
    clone.querySelectorAll<HTMLElement>('td').forEach(cell => {
      cell.style.setProperty('background-color', '#ffffff', 'important');
      cell.querySelectorAll<HTMLElement>('*').forEach(node => {
        node.style.setProperty('color', '#123348', 'important');
      });
    });
    clone.querySelectorAll<HTMLElement>('th, thead td').forEach(cell => {
      cell.style.setProperty('background-color', '#07364d', 'important');
      cell.style.setProperty('color', '#ffffff', 'important');
      cell.querySelectorAll<HTMLElement>('*').forEach(node => {
        node.style.setProperty('color', '#ffffff', 'important');
      });
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0,
      windowWidth: 800,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const pageWidth = 210;
    const pageHeight = 297;

    const marginX = 6;
    const marginY = 8;

    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginY * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginY;

    pdf.addImage(
      imgData,
      'JPEG',
      marginX,
      position,
      imgWidth,
      imgHeight,
      undefined,
      'FAST',
    );

    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = marginY - (imgHeight - heightLeft);

      pdf.addPage();

      pdf.addImage(
        imgData,
        'JPEG',
        marginX,
        position,
        imgWidth,
        imgHeight,
        undefined,
        'FAST',
      );

      heightLeft -= usableHeight;
    }

    const fileName = `${safeName(title)}.pdf`;

    /*
     * مهم:
     * لا نستخدم pdf.save() داخل APK.
     * نستخدم Capacitor Filesystem + Share.
     */

    const pdfBlob = pdf.output('blob');

    if (isNativeApp()) {
      await saveAndSharePdfOnAndroid(
        pdfBlob,
        fileName,
        title,
      );
    } else {
      /*
       * في المتصفح يبقى السلوك القديم:
       * تنزيل ملف PDF مباشرة.
       */
      savePdfOnWeb(pdfBlob, fileName);

      /*
       * وإذا كان المتصفح يدعم مشاركة الملفات،
       * نحاول فتح المشاركة أيضًا.
       */
      try {
        const file = new File(
          [pdfBlob],
          fileName,
          { type: 'application/pdf' },
        );

        if (
          typeof navigator !== 'undefined' &&
          'share' in navigator &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            title,
            text: title,
            files: [file],
          });
        }
      } catch (shareError) {
        console.log(
          'تعذر فتح نافذة المشاركة في المتصفح:',
          shareError,
        );
      }
    }
  } catch (error) {
    console.error('PDF creation error:', error);

    alert('حدث خطأ أثناء إنشاء ملف PDF');
  } finally {
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
};
