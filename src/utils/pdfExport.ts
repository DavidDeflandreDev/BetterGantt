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
  /** CSS px height of a single task row — used so multi-page tile boundaries always land
   * exactly between two rows instead of potentially slicing one in half. */
  rowHeightPx: number;
}

const CSS_PX_PER_MM = 96 / 25.4;
// 2x is already sharper than a typical retina screen for this kind of flat, text-and-shapes
// diagram — 3x was needlessly "4K"-grade and, combined with lossless PNG, produced multi-tens-
// of-MB files even for a handful of tasks. JPEG compresses this flat-color content far better
// than PNG with no visible quality loss at this resolution.
const CAPTURE_SCALE = 2;
// High enough that JPEG's chroma subsampling doesn't blur the edges of small text (which can
// look like overlapping/smeared glyphs at 9-11px) — still far smaller than lossless PNG.
const JPEG_QUALITY = 0.95;

// html2canvas rasterizes text with its own internal canvas-based text engine, not the browser's
// real text-layout engine — it has repeatedly proven unreliable for this app's per-task text
// (task name, resource, duration, date range, progress %), producing glyphs that shift or
// overlap ONLY in the exported raster while looking perfectly fine in the live DOM/preview. Every
// element carrying that per-task text is marked with this attribute in GanttPrintView so it can
// be skipped entirely from the captured raster and instead redrawn as real vector text via
// jsPDF's own text engine — reading each node's live position, size and color straight off the
// DOM, so it always matches the on-screen preview exactly, no measurement guesswork involved.
const NATIVE_TEXT_SELECTOR = '[data-pdf-text]';

interface NativeTextItem {
  text: string;
  /** CSS px, relative to the captured root element's own box. */
  xPx: number;
  /** Vertical center, CSS px, relative to the captured root element's own box. */
  yMidPx: number;
  fontSizePx: number;
  bold: boolean;
  color: [number, number, number];
  align: 'left' | 'right';
  /** Only set for elements that visually clip/ellipsis overflowing text (the label column) —
   * caps how wide the drawn text may be before it gets truncated with an ellipsis, since jsPDF
   * has no built-in equivalent to CSS `text-overflow: ellipsis`. */
  maxWidthPx?: number;
}

function parseRgbColor(css: string): [number, number, number] {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [15, 23, 42];
}

/** Strips characters outside what jsPDF's built-in standard fonts can render (e.g. the 📁
 * folder emoji) — those fonts have no emoji glyphs and would otherwise print as blank boxes or
 * garbage instead of just being left out. */
function stripUnsupportedGlyphs(text: string): string {
  return text
    .replace(/[^\x00-\x7FÀ-ÖØ-öø-ÿ€…]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNativeTextItems(root: HTMLElement): NativeTextItem[] {
  const rootRect = root.getBoundingClientRect();
  const items: NativeTextItem[] = [];
  root.querySelectorAll<HTMLElement>(NATIVE_TEXT_SELECTOR).forEach(node => {
    const text = stripUnsupportedGlyphs(node.textContent ?? '');
    if (!text) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return; // hidden/collapsed node — nothing to draw
    const style = getComputedStyle(node);
    const fontSizePx = parseFloat(style.fontSize) || 10;
    const fontWeight = parseInt(style.fontWeight, 10) || 400;
    const align: 'left' | 'right' = node.getAttribute('data-pdf-align') === 'right' ? 'right' : 'left';
    const paddingRightPx = parseFloat(style.paddingRight) || 0;
    // Elements that CSS-clip overflowing text (ellipsis, in the label column) need their text
    // truncated to the same width jsPDF will actually draw into.
    const clips = style.overflow === 'hidden' && style.textOverflow === 'ellipsis';
    items.push({
      text,
      xPx: align === 'right' ? rect.right - rootRect.left - paddingRightPx : rect.left - rootRect.left,
      yMidPx: rect.top - rootRect.top + rect.height / 2,
      fontSizePx,
      bold: fontWeight >= 700,
      color: parseRgbColor(style.color),
      align,
      maxWidthPx: clips ? rect.width : undefined,
    });
  });
  return items;
}

async function captureElement(el: HTMLElement) {
  // Make sure every @font-face the page uses (e.g. the Inter font loaded for the rest of the
  // app) has actually finished loading before html2canvas measures/rasterizes what's left to
  // rasterize (shapes, bars, grid lines) — capturing mid-load is a well-known way to get
  // mismatched box metrics that never show up in the live DOM, only in the raster snapshot.
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore — worst case we capture without the guarantee, same as before this change.
    }
  }

  return html2canvas(el, {
    scale: CAPTURE_SCALE,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
    // The actual fix for the persistent task-name rendering bug: never let html2canvas rasterize
    // this text at all (see NATIVE_TEXT_SELECTOR above) — it's redrawn natively afterwards.
    ignoreElements: node => node instanceof HTMLElement && node.hasAttribute('data-pdf-text'),
  });
}

/** Binary-searches down to the longest prefix of `text` (plus an ellipsis) that still fits
 * within `maxWidthMm`, measured with the PDF's currently-set font/size. */
function truncateToWidth(pdf: jsPDF, text: string, maxWidthMm: number): string {
  if (pdf.getTextWidth(text) <= maxWidthMm) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}…`;
    if (pdf.getTextWidth(candidate) <= maxWidthMm) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo <= 0 ? '…' : `${text.slice(0, lo).trimEnd()}…`;
}

/** Draws one native text item at an already-computed (x, y) in mm, scaling its font size (and
 * optional max-width, for truncation) by the same px-to-mm factor used to place it. */
function drawNativeTextItem(pdf: jsPDF, item: NativeTextItem, xMm: number, yMm: number, scaleMmPerPx: number) {
  pdf.setFont('helvetica', item.bold ? 'bold' : 'normal');
  // jsPDF's setFontSize always takes points, regardless of the document's configured unit (mm
  // here) — convert the desired rendered mm height back to points (1pt = 25.4/72 mm).
  pdf.setFontSize(Math.max(4, item.fontSizePx * scaleMmPerPx * (72 / 25.4)));
  pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
  let text = item.text;
  if (item.maxWidthPx) {
    text = truncateToWidth(pdf, text, item.maxWidthPx * scaleMmPerPx);
  }
  pdf.text(text, xMm, yMm, { align: item.align, baseline: 'middle' });
}

/**
 * Exports the printable gantt view to a PDF.
 *
 * - "a4-single": the whole diagram is scaled down (if needed) to fit on one A4 page.
 * - "a4-multi": the diagram is tiled at a legible, fixed scale across as many A4 pages
 *   as needed, repeating the task-name column and the date header on every tile so
 *   every page stays readable on its own.
 *
 * All bars/shapes/grid lines are still captured as a raster image via html2canvas. Every piece
 * of per-task text (name, resource, duration, date range, progress %) is instead drawn natively
 * with jsPDF's own text engine — see NATIVE_TEXT_SELECTOR above for why.
 */
export async function exportGanttPdf(opts: ExportGanttPdfOptions): Promise<void> {
  const el = document.getElementById(opts.elementId);
  if (!el) throw new Error("Élément d'export introuvable.");

  const nativeItems = extractNativeTextItems(el);
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
    pdf.addImage(canvas.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG', x, y, w, h);

    // The canvas is CAPTURE_SCALE'd relative to the element's own CSS-px box, so this ratio maps
    // any CSS-px position straight into the same mm space the image was just placed in.
    const scaleMmPerPx = w / (canvas.width / CAPTURE_SCALE);
    for (const item of nativeItems) {
      drawNativeTextItem(pdf, item, x + item.xPx * scaleMmPerPx, y + item.yMidPx * scaleMmPerPx, scaleMmPerPx);
    }

    pdf.save(opts.filename);
    return;
  }

  // --- Multi-page "libre" mode: tile across a grid of pages ---
  const pxPerMm = CAPTURE_SCALE * CSS_PX_PER_MM;
  const scaleMmPerPx = 1 / pxPerMm;
  const labelColPx = Math.min(canvas.width, Math.round(opts.labelColWidthPx * CAPTURE_SCALE));
  const headerPx = Math.min(canvas.height, Math.round(opts.headerHeightPx * CAPTURE_SCALE));

  const usableWPx = Math.round(usableW * pxPerMm);
  const usableHPx = Math.round(usableH * pxPerMm);

  const bodyColPx = Math.max(80, usableWPx - labelColPx);
  // Round down to a whole multiple of one task row's scaled height so a page boundary always
  // lands exactly between two rows — otherwise a row (and the text drawn over it) could get
  // sliced in half across two page tiles.
  const rowPxScaled = Math.max(1, Math.round(opts.rowHeightPx * CAPTURE_SCALE));
  const bodyRowPxRaw = Math.max(rowPxScaled, usableHPx - headerPx);
  const bodyRowPx = Math.max(rowPxScaled, Math.floor(bodyRowPxRaw / rowPxScaled) * rowPxScaled);

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

      pdf.addImage(tile.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG', margin, margin, usableW, usableH);

      // Redraw this tile's share of the per-task text natively, in exactly the same tile-local
      // pixel space the image crop above used, so text lines up precisely with its row/bar.
      for (const item of nativeItems) {
        const fullPxX = item.xPx * CAPTURE_SCALE;
        const fullPxY = item.yMidPx * CAPTURE_SCALE;
        const isLabelColumn = fullPxX < labelColPx;

        // The label column repeats identically across every column-page for a given row-page
        // (same as the image crop above), so it belongs to whichever cp is currently being
        // drawn; body (timeline) text belongs to exactly one (rp, cp) tile.
        const itemCp = isLabelColumn ? cp : Math.floor((fullPxX - labelColPx) / bodyColPx);
        const itemRp = Math.floor((fullPxY - headerPx) / bodyRowPx);
        if (itemRp !== rp || itemCp !== cp) continue;

        const tileXPx = fullPxX - (isLabelColumn ? 0 : cp * bodyColPx);
        const tileYPx = fullPxY - rp * bodyRowPx;
        if (tileYPx < 0 || tileYPx > usableHPx) continue;
        if (tileXPx < -80 || tileXPx > usableWPx + 80) continue; // fully off this tile

        drawNativeTextItem(
          pdf,
          item,
          margin + tileXPx * scaleMmPerPx,
          margin + tileYPx * scaleMmPerPx,
          scaleMmPerPx
        );
      }

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
