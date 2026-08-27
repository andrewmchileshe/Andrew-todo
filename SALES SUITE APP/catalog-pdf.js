// Product pricelist PDF export. The catalog is shared across companies, so this isn't
// tied to a single customer/document number — it's branded with whichever company is
// active when the export is triggered. Only ever reads sellingPrice/sellingCurrency,
// the same "never leak internal margins" rule quote-pdf.js follows for cost/margin data.
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

  function generateCatalogPdf(items, company) {
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
    doc.text('PRICE LIST', rightEdge, 34, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    let y = 68;

    const flatAddress = (company.address || '').replace(/\s*\n+\s*/g, ', ');
    doc.setFontSize(8);
    const companyLine = [flatAddress, company.phone, company.email].filter(Boolean).join('   |   ');
    if (companyLine) { doc.text(companyLine, marginX, y); y += 15; } else { y += 6; }

    doc.setFontSize(9);
    doc.text('Generated ' + new Date().toISOString().slice(0, 10) + '  ·  ' + items.length + ' item(s)', marginX, y);
    y += 14;

    const rows = items.map(function (item) {
      return [
        item.itemCode || '',
        item.description || '',
        item.unit || '',
        item.sellingCurrency || '',
        fmt(item.sellingPrice)
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Item Code', 'Description', 'Unit', 'Currency', 'Selling Price']],
      body: rows,
      margin: { left: marginX, right: marginX, bottom: 40 },
      styles: { fontSize: 8.5, valign: 'middle', cellPadding: 4, lineColor: [210, 210, 210], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { halign: 'left' },
        2: { cellWidth: 55 },
        3: { cellWidth: 55, halign: 'center' },
        4: { cellWidth: 80, halign: 'right' }
      }
    });

    // ---- footer bar (every page, since a long pricelist can span several) ----
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

    doc.save('Pricelist-' + new Date().toISOString().slice(0, 10) + '.pdf');
  }

  global.CatalogPdf = { generateCatalogPdf: generateCatalogPdf };
})(window);
