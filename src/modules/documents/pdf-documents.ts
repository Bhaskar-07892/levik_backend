import PDFDocument from 'pdfkit';
import { PassThrough, type Readable } from 'node:stream';

/** Brand colours from the Levik Luxury design system. */
const NAVY = '#0B1E3D';
const GOLD = '#C5A059';
const INK = '#1E293B';
const MUTED = '#64748B';
const RULE = '#E2E8F0';

const PAGE = { width: 595.28, margin: 48 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

export interface PartyBlock {
  title: string;
  name: string;
  lines: string[];
}

export interface DocumentLine {
  name: string;
  detail: string;
  quantity: number;
  unitPrice: number;
}

export interface PdfDocumentData {
  /** e.g. "PURCHASE INVOICE" or "BILL". */
  heading: string;
  number: string;
  date: Date;
  /** Issuer (top left): Levik for purchase invoices, the retailer's store for customer bills. */
  issuer: PartyBlock;
  recipient: PartyBlock;
  /** Extra key/value rows under the number (order id, linked scan…). */
  meta: Array<[string, string]>;
  lines: DocumentLine[];
  footnote: string;
  /** Customer bills are issued by the store; Levik appears as a small "powered by" mark. */
  poweredByLevik: boolean;
}

/** Indian digit grouping (1,23,456) with "Rs." because the built-in PDF fonts have no ₹ glyph. */
export function rupees(value: number): string {
  return `Rs. ${new Intl.NumberFormat('en-IN').format(value)}`;
}

/** The Levik monogram tile and wordmark, drawn as vectors (no image asset needed). */
function levikMark(doc: PDFKit.PDFDocument, x: number, y: number, size: number, withWordmark = true): void {
  doc.save();
  doc.roundedRect(x, y, size, size, size * 0.22).fill(NAVY);
  doc
    .fillColor(GOLD)
    .font('Helvetica-Bold')
    .fontSize(size * 0.58)
    .text('L', x, y + size * 0.2, { width: size, align: 'center' });
  if (withWordmark) {
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(size * 0.42).text('LEVIK', x + size + 8, y + size * 0.12, { characterSpacing: 2 });
    doc.fillColor(GOLD).font('Helvetica').fontSize(size * 0.2).text('LUXURY SANITARYWARE', x + size + 8, y + size * 0.62, { characterSpacing: 1.2 });
  }
  doc.restore();
}

function party(doc: PDFKit.PDFDocument, block: PartyBlock, x: number, y: number, width: number): number {
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text(block.title.toUpperCase(), x, y, { width, characterSpacing: 1 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(block.name, x, doc.y + 4, { width });
  doc.font('Helvetica').fontSize(9).fillColor(INK);
  for (const line of block.lines) doc.text(line, x, doc.y + 2, { width });
  return doc.y;
}

/** Renders an A4 purchase invoice or customer bill. */
export function renderDocument(data: PdfDocumentData): Readable {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, info: { Title: `${data.heading} ${data.number}`, Author: data.issuer.name } });
  const out = new PassThrough();
  doc.pipe(out);
  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;

  // Header: issuer on the left, document title and number on the right.
  let top = PAGE.margin;
  if (data.poweredByLevik) {
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text(data.issuer.name, left, top, { width: CONTENT_WIDTH * 0.6 });
    levikMark(doc, right - 30, top, 30, false);
    doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text('Powered by Levik', right - 80, top + 34, { width: 80, align: 'right' });
  } else {
    levikMark(doc, left, top, 38);
  }
  doc
    .fillColor(GOLD)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(data.heading, left, top + (data.poweredByLevik ? 48 : 50), { width: CONTENT_WIDTH, characterSpacing: 2 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text(data.number, left, doc.y + 2);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(`Date: ${data.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`, left, doc.y + 2);
  for (const [k, v] of data.meta) doc.text(`${k}: ${v}`, left, doc.y + 1);

  top = doc.y + 18;
  doc.moveTo(left, top - 8).lineTo(right, top - 8).lineWidth(0.6).strokeColor(RULE).stroke();
  const colWidth = (CONTENT_WIDTH - 24) / 2;
  const issuerBottom = data.poweredByLevik
    ? party(doc, { ...data.issuer, title: 'Sold by' }, left, top, colWidth)
    : party(doc, data.issuer, left, top, colWidth);
  const recipientBottom = party(doc, data.recipient, left + colWidth + 24, top, colWidth);

  // Items table.
  let y = Math.max(issuerBottom, recipientBottom) + 22;
  const cols = { item: left, qty: left + CONTENT_WIDTH * 0.58, rate: left + CONTENT_WIDTH * 0.7, amount: left + CONTENT_WIDTH * 0.84 };
  doc.rect(left, y, CONTENT_WIDTH, 22).fill(NAVY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
  doc.text('ITEM', cols.item + 8, y + 7);
  doc.text('QTY', cols.qty, y + 7, { width: cols.rate - cols.qty - 8, align: 'right' });
  doc.text('RATE', cols.rate, y + 7, { width: cols.amount - cols.rate - 8, align: 'right' });
  doc.text('AMOUNT', cols.amount, y + 7, { width: right - cols.amount - 8, align: 'right' });
  y += 22;

  let total = 0;
  for (const line of data.lines) {
    const amount = line.quantity * line.unitPrice;
    total += amount;
    if (y > 740) {
      doc.addPage();
      y = PAGE.margin;
    }
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5).text(line.name, cols.item + 8, y + 7, { width: cols.qty - cols.item - 16 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(line.detail, cols.item + 8, doc.y + 1, { width: cols.qty - cols.item - 16 });
    const rowBottom = doc.y + 7;
    doc.fillColor(INK).font('Helvetica').fontSize(9.5);
    doc.text(String(line.quantity), cols.qty, y + 7, { width: cols.rate - cols.qty - 8, align: 'right' });
    doc.text(rupees(line.unitPrice), cols.rate, y + 7, { width: cols.amount - cols.rate - 8, align: 'right' });
    doc.text(rupees(amount), cols.amount, y + 7, { width: right - cols.amount - 8, align: 'right' });
    y = rowBottom;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(RULE).stroke();
  }

  y += 10;
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Total', cols.rate, y, { width: cols.amount - cols.rate - 8, align: 'right' });
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(rupees(total), cols.amount - 40, y - 2, { width: right - cols.amount + 32, align: 'right' });

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7.5)
    .text(data.footnote, left, Math.max(doc.y + 40, 760), { width: CONTENT_WIDTH, align: 'center' });
  doc.end();
  return out;
}
