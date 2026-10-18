import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PassThrough, type Readable } from 'node:stream';

export interface SheetLabel {
  serial: string;
  payload: string;
}

export interface SheetHeader {
  productName: string;
  modelCode: string;
  batchId: string;
}

const MM = 72 / 25.4;
// A4 sheet of 3 × 8 labels, 63.5 × 33.9 mm (standard 24-up label stock).
const LAYOUT = { cols: 3, rows: 8, width: 63.5 * MM, height: 33.9 * MM, marginX: 7.2 * MM, marginY: 13 * MM, gapX: 2.5 * MM };

/** Renders printable A4 label sheets: QR + brand + model + human-readable serial. */
@Injectable()
export class LabelSheetService {
  async render(header: SheetHeader, labels: SheetLabel[]): Promise<Readable> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Levik labels ${header.batchId}`, Author: 'Levik' } });
    const out = new PassThrough();
    doc.pipe(out);

    const perPage = LAYOUT.cols * LAYOUT.rows;
    for (let i = 0; i < labels.length; i++) {
      if (i > 0 && i % perPage === 0) doc.addPage();
      const slot = i % perPage;
      const x = LAYOUT.marginX + (slot % LAYOUT.cols) * (LAYOUT.width + LAYOUT.gapX);
      const y = LAYOUT.marginY + Math.floor(slot / LAYOUT.cols) * LAYOUT.height;
      await this.drawLabel(doc, x, y, header, labels[i]);
    }
    doc.end();
    return out;
  }

  private async drawLabel(doc: PDFKit.PDFDocument, x: number, y: number, header: SheetHeader, label: SheetLabel): Promise<void> {
    const qrSize = 27 * MM;
    const pad = 2.5 * MM;
    const png = await QRCode.toBuffer(label.payload, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
    doc.image(png, x + pad, y + (LAYOUT.height - qrSize) / 2, { width: qrSize, height: qrSize });

    const textX = x + pad + qrSize + 2 * MM;
    const textWidth = LAYOUT.width - (textX - x) - pad;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#173550').text('LEVIK', textX, y + 4 * MM, { width: textWidth, characterSpacing: 1.5 });
    doc.font('Helvetica').fontSize(6.5).fillColor('#444').text(header.productName, textX, y + 9.5 * MM, { width: textWidth, height: 8 * MM, ellipsis: true });
    doc.font('Helvetica').fontSize(6.5).text(`Model ${header.modelCode}`, textX, y + 17 * MM, { width: textWidth });
    doc.font('Courier-Bold').fontSize(7).fillColor('#000').text(label.serial, textX, y + 22 * MM, { width: textWidth });
    doc.font('Helvetica').fontSize(5).fillColor('#666').text('Scan in the Levik app to earn points', textX, y + 27 * MM, { width: textWidth });
  }
}
