// Status-value report PDF — a simple table of order counts and Kwacha value grouped by
// status, shared by the Customer PO and Supplier PO reports on the Reports tab.
(function (global) {
  const DEFAULT_NAVY = [39, 55, 108];
  const marginX = 40;
  const rightEdge = 555;
  const pageWidth = 595;
  const pageHeight = 842;

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // rows: [{ label, count, kwachaValue }], grandTotal: number
  function generateStatusValueReportPdf(title, rows, grandTotal, company) {
    const jsPDF = global.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const NAVY = hexToRgb(company.brandColor) || DEFAULT_NAVY;

    // ---- header bar ----
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, pageWidth, 56, 'F');
    let nameX = marginX;
    if (company.logoDataUrl) {
      try {
        doc.addImage(company.logoDataUrl, marginX, 12, 32, 32);
        nameX = marginX + 42;
      } catch (e) { /* bad image data — skip the logo rather than fail the PDF */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text((company.name || 'Your Company').toUpperCase(), nameX, 34);
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), rightEdge, 34, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    let y = 68;

    const flatAddress = (company.address || '').replace(/\s*\n+\s*/g, ', ');
    doc.setFontSize(8);
    const companyLine = [flatAddress, company.phone, company.email].filter(Boolean).join('   |   ');
    if (companyLine) { doc.text(companyLine, marginX, y); y += 15; } else { y += 6; }

    doc.setFontSize(9);
    doc.text('Generated ' + new Date().toISOString().slice(0, 10), marginX, y);
    y += 14;

    const body = rows.map(function (r) {
      return [r.label, String(r.count), 'ZMW ' + fmt(r.kwachaValue)];
    });

    doc.autoTable({
      startY: y,
      head: [['Status', 'Orders', 'Value (ZMW)']],
      body: body,
      foot: [['Total', String(rows.reduce(function (s, r) { return s + r.count; }, 0)), 'ZMW ' + fmt(grandTotal)]],
      margin: { left: marginX, right: marginX, bottom: 40 },
      styles: { fontSize: 9, valign: 'middle', cellPadding: 5, lineColor: [210, 210, 210], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 200 },
        1: { cellWidth: 100, halign: 'center' },
        2: { halign: 'right' }
      }
    });

    // ---- footer bar (every page) ----
    const footerLine = [company.name, flatAddress, company.email, company.phone].filter(Boolean).join('  |  ');
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(footerLine, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    doc.save(title.replace(/\s+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.pdf');
  }

  global.ReportPdf = { generateStatusValueReportPdf: generateStatusValueReportPdf };
})(window);
