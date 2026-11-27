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

// Logical column positions, including merged cells in totals and headers.
const tableGrid = (table: HTMLTableElement) => {
  const occupied: boolean[][] = [];
  return Array.from(table.rows).flatMap((row, r) => {
    occupied[r] ??= [];
    let column = 0;
    return Array.from(row.cells).map(cell => {
      while (occupied[r][column]) column++;
      const start = column;
      const span = cell.colSpan;
      const height = cell.rowSpan || (row.parentElement instanceof HTMLTableSectionElement
        ? row.parentElement.rows.length - row.sectionRowIndex : 1);
      for (let y = r; y < r + height; y++) {
        occupied[y] ??= [];
        for (let x = start; x < start + span; x++) occupied[y][x] = true;
      }
      column += span;
      return { cell, start, span };
    });
  });
};

export interface DetailPdfColumn {
  key: string;
  label: string;
}

const describeDetailTables = (element: HTMLElement) => {
  const tables = Array.from(element.querySelectorAll<HTMLTableElement>('table'));
  if (element instanceof HTMLTableElement) tables.unshift(element);
  return tables.filter(table => !table.closest('[data-pdf-exclude="true"]')).map(table => {
    const grid = tableGrid(table);
    const headers = grid.filter(entry => entry.cell.closest('thead') === table.tHead && table.tHead !== null);
    const count = Math.max(0, ...grid.map(entry => entry.start + entry.span));
    const columns = Array.from({ length: count }, (_, index) => {
      const covering = headers.filter(entry => index >= entry.start && index < entry.start + entry.span);
      if (covering.some(entry => entry.cell.matches('[data-pdf-exclude="true"]'))) return null;
      const label = covering.map(entry => entry.cell.textContent?.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' / ') || `عمود ${index + 1}`;
      const duplicate = covering.length && covering[covering.length - 1].span > 1;
      return { index, label, key: duplicate ? `${label} (${index + 1})` : label };
    }).filter((column): column is NonNullable<typeof column> => column !== null);
    return { table, grid, columns };
  });
};

// Identical column labels across the tables of one item share one choice.
export const getDetailPdfColumns = (element: HTMLElement): DetailPdfColumn[] => {
  const columns = new Map<string, DetailPdfColumn>();
  describeDetailTables(element).forEach(({ columns: items }) => items.forEach(({ key, label }) => {
    columns.set(key, { key, label: key === label ? label : key });
  }));
  return Array.from(columns.values());
};

const filterDetailPdfColumns = (element: HTMLElement, copies: Map<Element, Element>, keys: string[]) => {
  const selected = new Set(keys);
  const tables = describeDetailTables(element);
  if (!tables.some(({ columns }) => columns.some(column => selected.has(column.key)))) {
    throw new Error('يجب تحديد عمود واحد على الأقل');
  }
  tables.forEach(({ table, grid, columns }) => {
    const copy = copies.get(table) as HTMLTableElement | undefined;
    if (!copy) return;
    const visible = new Set(columns.filter(column => selected.has(column.key)).map(column => column.index));
    if (!visible.size) {
      copy.remove();
      return;
    }
    grid.forEach(({ cell, start, span }) => {
      const target = copies.get(cell) as HTMLTableCellElement | undefined;
      if (!target) return;
      const remaining = Array.from({ length: span }, (_, i) => start + i).filter(index => visible.has(index)).length;
      if (!remaining) target.remove();
      else {
        target.colSpan = remaining;
        target.style.removeProperty('width');
        target.style.removeProperty('min-width');
        target.style.removeProperty('max-width');
        target.style.setProperty('white-space', 'normal', 'important');
      }
    });
    Array.from(copy.children).filter(node => node.tagName === 'COLGROUP').forEach(node => node.remove());
    copy.style.setProperty('width', '100%', 'important');
    copy.style.setProperty('min-width', '0', 'important');
    copy.style.setProperty('table-layout', 'auto', 'important');
  });
};

export interface DetailPdfOptions {
  title: string;
  projectName?: string;
  floorName?: string;
  visibleColumnKeys?: string[];
}

export const createPdfFromElement = async (
  elementId: string | HTMLElement,
  title = 'تقرير المشروع',
  detail?: DetailPdfOptions,
) => {
  const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;

  if (!element) {
    alert('لم يتم العثور على منطقة التقرير');
    return;
  }

  let wrapper: HTMLDivElement | null = null;

  try {
    const clone = element.cloneNode(true) as HTMLElement;
    const isPricesReport = element.classList.contains('prices-report');
    const isSummaryReport = element.id === 'approved-full-report-print-area' || element.id === 'unified-financial-print-area';
    const maxColumns = Math.max(0, ...Array.from(element.querySelectorAll('table')).filter(table => !isSummaryReport || !table.closest('details:not([open])')).map(table => Math.max(0, ...tableGrid(table).map(entry => entry.start + entry.span))));
    const landscape = isSummaryReport && maxColumns > 7;
    const reportWidth = landscape ? Math.max(1080, 260 + maxColumns * 85) : 760;

    // Match the live DOM to its clone before removing anything, so form
    // values in the remaining report cells retain their original indices.
    const liveNodes = [element, ...Array.from(element.querySelectorAll('*'))];
    const copyNodes = [clone, ...Array.from(clone.querySelectorAll('*'))];
    const copies = new Map<Element, Element>(liveNodes.map((node, i) => [node, copyNodes[i]]));
    const excluded = new Set<Element>();
    if (isSummaryReport) {
      element.querySelectorAll('details:not([open])').forEach(node => excluded.add(node));
    }
    if (!detail && elementId === 'finishes-pdf') {
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
    if (detail?.visibleColumnKeys !== undefined) {
      filterDetailPdfColumns(element, copies, detail.visibleColumnKeys);
    }
    excluded.forEach(node => copies.get(node)?.remove());

    // Remove actions from the exported copy, including nested export buttons.
    clone.querySelectorAll('button, [role="button"], [data-pdf-exclude="true"]').forEach(node => node.remove());
    clone.querySelectorAll<HTMLElement>('[data-pdf-only="true"]').forEach(node => {
      node.style.display = 'inline';
    });

    clone.style.width = `${reportWidth}px`;
    clone.style.maxWidth = `${reportWidth}px`;
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
    wrapper.style.width = `${reportWidth + 40}px`;
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

    if (detail) {
      // Only the explicitly supplied detail panel is exported.
      clone.querySelectorAll<HTMLElement>('div, section, table').forEach(node => {
        node.style.setProperty('max-height', 'none', 'important');
        node.style.setProperty('overflow', 'visible', 'important');
      });
      const heading = document.createElement('header');
      heading.style.cssText = 'text-align:center;color:#123348;background:#fff;border-bottom:2px solid #00e0e9;padding:12px;margin-bottom:12px';
      const name = document.createElement('h2');
      name.textContent = detail.title;
      name.style.cssText = 'color:#07364d;font-size:20px;margin:0 0 8px';
      heading.appendChild(name);
      for (const value of [detail.projectName, detail.floorName]) {
        if (!value?.trim()) continue;
        const line = document.createElement('div');
        line.textContent = value;
        heading.appendChild(line);
      }
      if (isSummaryReport) {
        const brand = document.querySelector('.studio-brand svg');
        if (brand) {
          const logo = brand.cloneNode(true) as SVGElement;
          logo.style.color = '#00b7c2';
          logo.style.display = 'inline-block';
          heading.prepend(logo);
        }
      }
      clone.prepend(heading);
    }

    if (isSummaryReport) {
      clone.classList.add('qty-summary-page');
      clone.querySelectorAll<HTMLElement>('tr[data-summary-total] td').forEach(cell => cell.style.setProperty('background-color', 'var(--qty-accent-soft)', 'important'));
      const styles = document.createElement('style');
      styles.textContent = '.qty-summary-page table {direction:rtl;border-collapse:collapse;width:100%} .qty-summary-page :is(td,th){border:1px solid var(--qty-border);padding:6px 4px;text-align:center} .qty-summary-page :is(td,th):first-child{text-align:right} .qty-summary-page summary{list-style:none}';
      clone.prepend(styles);
      clone.querySelectorAll<HTMLElement>('div, section, table').forEach(node => {
        node.style.setProperty('overflow', 'visible', 'important');
        node.style.setProperty('max-height', 'none', 'important');
      });
      clone.querySelectorAll<HTMLTableElement>('table').forEach(table => {
        table.style.setProperty('width', '100%', 'important');
        table.style.setProperty('min-width', '0', 'important');
        table.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
          cell.style.setProperty('white-space', 'normal', 'important');
          cell.style.setProperty('overflow-wrap', 'anywhere', 'important');
        });
      });
    }

    if (isPricesReport) {
      clone.querySelectorAll<HTMLElement>('section, div').forEach(node => {
        node.style.setProperty('max-height', 'none', 'important');
        node.style.setProperty('overflow', 'visible', 'important');
      });
      clone.querySelectorAll<HTMLTableElement>('table').forEach(table => {
        table.style.setProperty('width', '100%', 'important');
        table.style.setProperty('table-layout', 'fixed', 'important');
        table.style.setProperty('border-collapse', 'collapse', 'important');
        table.querySelectorAll<HTMLTableCellElement>('th, td').forEach(cell => {
          const width = [46, 19, 35][cell.cellIndex];
          if (width !== undefined) cell.style.setProperty('width', `${width}%`, 'important');
          cell.style.setProperty('white-space', 'normal', 'important');
          cell.style.setProperty('overflow-wrap', 'anywhere', 'important');
          cell.style.setProperty('border', '1px solid #d3e1e9', 'important');
          cell.style.setProperty('padding', '6px', 'important');
          cell.style.setProperty('text-align', cell.cellIndex === 0 ? 'right' : 'center', 'important');
        });
      });
      clone.querySelectorAll<HTMLElement>('.qty-main-heading').forEach(node => {
        node.style.setProperty('background', '#dcfbfd', 'important');
        node.style.setProperty('border', '1px solid #00b7c2', 'important');
        node.style.setProperty('text-align', 'center', 'important');
        node.style.setProperty('padding', '8px', 'important');
      });
    }

    // Apply report typography to the detached snapshot, independently of
    // screen breakpoints and component-level font utilities.
    const setReportFont = (node: HTMLElement, size: number, weight: number) => {
      node.style.setProperty('font-size', `${size}px`, 'important');
      node.style.setProperty('font-weight', String(weight), 'important');
    };
    clone.querySelectorAll<HTMLElement>('table').forEach(table => {
      setReportFont(table, 14, 600);
      table.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
        const row = cell.closest('tr');
        const isHeader = cell.tagName === 'TH' || !!cell.closest('thead');
        const isTotal = !!cell.closest('tfoot') ||
          !!row?.matches('[data-summary-total], .font-bold, .font-extrabold, [style*="font-weight: 700"], [style*="font-weight: bold"]');
        const emphasized = isHeader || isTotal;
        setReportFont(cell, emphasized ? 15 : 14, emphasized ? 700 : 600);
        cell.querySelectorAll<HTMLElement>('span, div, p, label, strong, b, small').forEach(node => {
          const bold = emphasized || !!node.closest('strong, b, .font-bold, .font-extrabold');
          setReportFont(node, bold ? 15 : 14, bold ? 700 : 600);
        });
      });
    });
    clone.querySelectorAll<HTMLElement>('h1, h2, h3, h4, .qty-main-heading, table caption').forEach(node => {
      setReportFont(node, 18, 700);
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    if (document.fonts) await document.fonts.ready;

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0,
      windowWidth: reportWidth + 40,
      logging: false,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
    const marginX = 6;
    const marginY = 8;
    const usableWidth = pdf.internal.pageSize.getWidth() - marginX * 2;
    const usableHeight = pdf.internal.pageSize.getHeight() - marginY * 2;
    const pixelsPerMm = canvas.width / usableWidth;
    const pagePixels = Math.max(1, Math.floor(usableHeight * pixelsPerMm));
    const bounds = clone.getBoundingClientRect();
    const scaleY = canvas.height / Math.max(1, bounds.height);
    const rowBounds = Array.from(clone.querySelectorAll('tr')).map(row => {
      const rect = row.getBoundingClientRect();
      return { top: Math.floor((rect.top - bounds.top) * scaleY), bottom: Math.ceil((rect.bottom - bounds.top) * scaleY) };
    });
    const headingBounds = isSummaryReport ? Array.from(clone.querySelectorAll('.qty-main-heading')).map(node => {
      const rect = node.getBoundingClientRect();
      const first = node.parentElement?.querySelector('tbody tr');
      return {top: Math.floor((rect.top-bounds.top)*scaleY), bottom: Math.ceil(((first?.getBoundingClientRect().bottom ?? rect.bottom)-bounds.top)*scaleY)};
    }) : [];
    const tableHeaders = isSummaryReport ? Array.from(clone.querySelectorAll('table')).flatMap(table => {
      if (!table.tHead) return [];
      const head = table.tHead.getBoundingClientRect();
      const rect = table.getBoundingClientRect();
      return [{top: Math.floor((head.top-bounds.top)*scaleY), bottom: Math.ceil((head.bottom-bounds.top)*scaleY), end: Math.ceil((rect.bottom-bounds.top)*scaleY)}];
    }) : [];
    let start = 0;
    while (start < canvas.height) {
      const header = tableHeaders.find(h => start >= h.bottom && start < h.end && h.bottom-h.top < pagePixels/3);
      const headerHeight = header ? header.bottom-header.top : 0;
      let end = Math.min(canvas.height, start + pagePixels-headerHeight);
      if (end < canvas.height) {
        for (const row of [...rowBounds, ...headingBounds]) {
          if (row.top < end && row.bottom > end && row.top > start) end = row.top;
        }
      }
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = end - start + headerHeight;
      const context = slice.getContext('2d');
      if (!context) throw new Error('تعذر تجهيز صفحة التقرير');
      if (header) context.drawImage(canvas, 0, header.top, canvas.width, headerHeight, 0, 0, slice.width, headerHeight);
      context.drawImage(canvas, 0, start, canvas.width, end-start, 0, headerHeight, slice.width, end-start);
      if (start > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.98), 'JPEG', marginX, marginY, usableWidth, slice.height / pixelsPerMm, undefined, 'FAST');
      start = end;
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

// The caller supplies the exact detail panel, never the whole results page.
export const shareDetailPdf = async (element: HTMLElement, options: DetailPdfOptions) => {
  const title = [options.title, options.floorName].filter(Boolean).join(' - ');
  await createPdfFromElement(element, title, options);
};
