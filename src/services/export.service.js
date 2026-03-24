// src/services/export.service.js
'use strict';

const PDFDocument = require('pdfkit');
const AppError = require('../utils/AppError');

const HEADERS = [
  'companyName',
  'companyType',
  'careersPageURL',
  'careerEmail',
  'hiringManagerEmail',
  'HREmails',
  'city',
];

/**
 * Convert records to CSV string.
 * @param {object[]} records
 * @returns {string}
 */
function toCSV(records) {
  const escape = (val) => {
    if (val == null) return '';
    const str = Array.isArray(val) ? val.join('; ') : String(val);
    // Wrap in quotes if contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = HEADERS.join(',');
  const rows = records.map((r) => HEADERS.map((h) => escape(r[h])).join(','));
  return [header, ...rows].join('\r\n');
}

/**
 * Convert records to sanitised JSON string.
 * @param {object[]} records
 * @returns {string}
 */
function toJSON(records) {
  const clean = records.map((r) => {
    const obj = {};
    for (const h of HEADERS) obj[h] = r[h] ?? null;
    return obj;
  });
  return JSON.stringify(clean, null, 2);
}

/**
 * Build a PDF document (as a Buffer) from the records.
 * Returns a Promise<Buffer>.
 * @param {object[]} records
 * @param {string} city
 * @returns {Promise<Buffer>}
 */
function toPDF(records, city) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Title ──────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(18).text(`Company Records — ${city}`, { align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#555555')
      .text(`Exported: ${new Date().toUTCString()}  |  Total: ${records.length} record(s)`, {
        align: 'center',
      });

    doc.moveDown(1);

    // ── Column layout ──────────────────────────────────────────────────────
    const colWidths = [120, 40, 150, 150, 150, 220];
    const colHeaders = [
      'Company Name',
      'Type',
      'Careers URL',
      'Career Email',
      'Hiring Mgr Email',
      'HR Emails',
    ];
    const tableLeft = doc.page.margins.left;
    const rowHeight = 22;

    const drawRow = (values, isHeader) => {
      const y = doc.y;

      if (isHeader) {
        doc
          .rect(
            tableLeft,
            y,
            colWidths.reduce((a, b) => a + b, 0),
            rowHeight,
          )
          .fill('#1a1a2e');
      } else {
        // Zebra stripe — alternating rows
        const idx = records.indexOf(values.__record);
        if (idx % 2 === 0) {
          doc
            .rect(
              tableLeft,
              y,
              colWidths.reduce((a, b) => a + b, 0),
              rowHeight,
            )
            .fill('#f0f4ff');
        }
      }

      let x = tableLeft;
      values.cells.forEach((cell, i) => {
        doc
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHeader ? 8 : 7.5)
          .fillColor(isHeader ? '#ffffff' : '#1a1a2e')
          .text(String(cell ?? ''), x + 3, y + 6, {
            width: colWidths[i] - 6,
            height: rowHeight - 6,
            ellipsis: true,
            lineBreak: false,
          });
        x += colWidths[i];
      });

      // Move cursor down
      doc.y = y + rowHeight;

      // Draw border
      doc
        .moveTo(tableLeft, doc.y)
        .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), doc.y)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .stroke();
    };

    // Header row
    drawRow({ cells: colHeaders }, true);

    // Data rows
    for (const rec of records) {
      // Page break check
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawRow({ cells: colHeaders }, true);
      }

      const hrDisplay = Array.isArray(rec.HREmails) ? rec.HREmails.join(', ') : '';

      const row = {
        cells: [
          rec.companyName,
          rec.companyType,
          rec.careersPageURL,
          rec.careerEmail,
          rec.hiringManagerEmail,
          hrDisplay,
        ],
        __record: rec,
      };
      drawRow(row, false);
    }

    doc.end();
  });
}

module.exports = { toCSV, toJSON, toPDF };
