/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export type PdfLayout = 'a4-single' | 'a4-multi';
export type PdfOrientation = 'portrait' | 'landscape';

export interface ExportGanttPdfOptions {
  /** DOM id of the printable gantt element to capture. */
  elementId: string;
  layout: PdfLayout;
  orientation: PdfOrientation;
  filename: string;
  /** CSS px width of the left label column inside the printable element. */
  labelColWidthPx: number;
  /** CSS px height of the header band (month + day rows) inside the printable element. */
  headerHeightPx: number;
}

const CSS_PX_PER_MM = 96 / 25.4;
const CAPTURE_SCALE = 3; // renders at 3x for crisp text/lines in the PDF

async function captureElement(el: HTMLElement) {
  return html2canvas(el, {
    scale: CAPTURE_SCALE,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });
}

/**
 * Exports the printable gantt view to a PDF.
 *
 * - "a4-single": the whole diagram is scaled down (if needed) to fit on one A4 page.
 * - "a4-multi": the diagram is tiled at a legible, fixed scale across as many A4 pages
 *   as needed, repeating the task-name column and the date header on every tile so
 *   every page stays readable on its own.
 */
export async function exportGanttPdf(opts: ExportGanttPdfOptions): Promise<void> {
  const el = document.getElementById(opts.elementId);
  if (!el) throw new Error("Élément d'export introuvable.");

  const canvas = await captureElement(el);
  const pdf = new jsPDF({ orientation: opts.orientation, unit: 'mm', format: 'a4' });

  const pageW = opts.orientation === 'landscape' ? 297 : 210;
  const pageH = opts.orientation === 'landscape' ? 210 : 297;
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  if (opts.layout === 'a4-single') {
    const ratio = canvas.width / canvas.height;
    let w = usableW;
    let h = w / ratio;
    if (h > usableH) {
      h = usableH;
      w = h * ratio;
    }
    const x = margin + (usableW - w) / 2;
    const y = margin;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
    pdf.save(opts.filename);
    return;
  }

  // --- Multi-page "libre" mode: tile across a grid of pages ---
  const pxPerMm = CAPTURE_SCALE * CSS_PX_PER_MM;
  const labelColPx = Math.min(canvas.width, Math.round(opts.labelColWidthPx * CAPTURE_SCALE));
  const headerPx = Math.min(canvas.height, Math.round(opts.headerHeightPx * CAPTURE_SCALE));

  const usableWPx = Math.round(usableW * pxPerMm);
  const usableHPx = Math.round(usableH * pxPerMm);

  const bodyColPx = Math.max(80, usableWPx - labelColPx);
  const bodyRowPx = Math.max(80, usableHPx - headerPx);

  const totalBodyWidthPx = Math.max(0, canvas.width - labelColPx);
  const totalBodyHeightPx = Math.max(0, canvas.height - headerPx);

  const colPages = Math.max(1, Math.ceil(totalBodyWidthPx / bodyColPx));
  const rowPages = Math.max(1, Math.ceil(totalBodyHeightPx / bodyRowPx));

  const tile = document.createElement('canvas');
  tile.width = usableWPx;
  tile.height = usableHPx;
  const ctx = tile.getContext('2d');
  if (!ctx) throw new Error('Impossible de préparer le rendu PDF.');

  let firstPage = true;
  const totalPages = rowPages * colPages;

  for (let rp = 0; rp < rowPages; rp++) {
    for (let cp = 0; cp < colPages; cp++) {
      if (!firstPage) pdf.addPage();
      firstPage = false;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tile.width, tile.height);

      // Corner: label column header (e.g. "Tâche")
      ctx.drawImage(canvas, 0, 0, labelColPx, headerPx, 0, 0, labelColPx, headerPx);

      // Top band: date header for this column tile
      const headerSrcX = labelColPx + cp * bodyColPx;
      const headerSrcW = Math.min(bodyColPx, canvas.width - headerSrcX);
      if (headerSrcW > 0) {
        ctx.drawImage(canvas, headerSrcX, 0, headerSrcW, headerPx, labelColPx, 0, headerSrcW, headerPx);
      }

      // Left band: task label column for this row tile
      const rowSrcY = headerPx + rp * bodyRowPx;
      const rowSrcH = Math.min(bodyRowPx, canvas.height - rowSrcY);
      if (rowSrcH > 0) {
        ctx.drawImage(canvas, 0, rowSrcY, labelColPx, rowSrcH, 0, headerPx, labelColPx, rowSrcH);
      }

      // Body tile
      if (headerSrcW > 0 && rowSrcH > 0) {
        ctx.drawImage(canvas, headerSrcX, rowSrcY, headerSrcW, rowSrcH, labelColPx, headerPx, headerSrcW, rowSrcH);
      }

      pdf.addImage(tile.toDataURL('image/png'), 'PNG', margin, margin, usableW, usableH);

      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text(
        `Page ${rp * colPages + cp + 1} / ${totalPages}`,
        pageW - margin,
        pageH - 3,
        { align: 'right' }
      );
    }
  }

  pdf.save(opts.filename);
}
