// Supplier Purchase Order PDF — the document we send to a supplier to place an order.
// Mirrors oa-pdf.js's layout (navy section bars, itemized table, notes, footer), with a
// "Supplier" block in place of Bill To/Ship To, and a Kwacha-equivalent value line when
// the PO's own currency isn't Kwacha.
(function (global) {
  const DEFAULT_NAVY = [39, 55, 108];
  const marginX = 40;
  const rightEdge = 555;
  const pageWidth = 595;
  const pageHeight = 842;

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function line(doc, text, x, y) {
    if (text) doc.text(String(text), x, y);
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Bordered box sized to fit the wrapped text, with a page-break guard so a long notes
  // block doesn't silently run off the bottom of the page.
  function textBox(doc, y, text, opts) {
    opts = opts || {};
    const width = opts.width || (rightEdge - marginX);
    const fontSize = opts.fontSize || 8.5;
    const lineHeight = opts.lineHeight || 11;
    const padding = 8;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, width - padding * 2);
    const boxHeight = Math.max(30, lines.length * lineHeight + padding * 2);

    if (y + boxHeight > pageHeight - 60) {
      doc.addPage();
      y = 40;
    }

    doc.setDrawColor(200, 200, 200);
    doc.rect(marginX, y, width, boxHeight);
    doc.text(lines, marginX + padding, y + padding + 8);
    return y + boxHeight;
  }

  // Builds the jsPDF document without deciding what happens to it — generatePoPdf and
  // viewPoPdf share this and only differ in how they hand off the finished doc.
  function buildPoDoc(po, totals, company) {
    const jsPDF = global.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const NAVY = hexToRgb(company.brandColor) || DEFAULT_NAVY;
    let y = 0;

    function sectionBar(y, label) {
      doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.rect(marginX, y, rightEdge - marginX, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text(label, marginX + 8, y + 12.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      return y + 18;
    }

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
    doc.text('PURCHASE ORDER', rightEdge, 34, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y = 68;

    // ---- company details line ----
    doc.setFontSize(8);
    const flatAddress = (company.address || '').replace(/\s*\n+\s*/g, ', ');
    const companyLine = [flatAddress, company.phone, company.email, company.taxId ? ('Tax ID: ' + company.taxId) : '']
      .filter(Boolean).join('   |   ');
    if (companyLine) { line(doc, companyLine, marginX, y); y += 15; }
    else { y += 6; }

    // ---- info grid ----
    doc.autoTable({
      startY: y,
      body: [
        ['PO No.', po.poNumber || '—', 'Order Date', po.orderDate || ''],
        ['Expected Date', po.expectedDate || '—', 'Currency', po.currency || '']
      ],
      theme: 'plain',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 },
        1: { cellWidth: 170 },
        2: { fontStyle: 'bold', cellWidth: 90 },
        3: { cellWidth: 'auto' }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- supplier ----
    y = sectionBar(y, 'SUPPLIER');
    const supplierLines = [
      po.supplierName,
      po.supplierContactName ? ('Attn: ' + po.supplierContactName) : '',
      po.supplierEmail,
      po.supplierPhone
    ].filter(Boolean).join('\n');
    doc.setDrawColor(200, 200, 200);
    doc.setFontSize(9);
    const supplierTextLines = doc.splitTextToSize(supplierLines || '—', rightEdge - marginX - 16);
    const supplierBoxHeight = Math.max(28, supplierTextLines.length * 12 + 16);
    doc.rect(marginX, y, rightEdge - marginX, supplierBoxHeight);
    doc.text(supplierTextLines, marginX + 8, y + 15);
    y += supplierBoxHeight + 10;

    // ---- order details ----
    y = sectionBar(y, 'ORDER DETAILS');
    const rows = (po.lineItems || []).map(function (item) {
      return [
        item.description || '',
        item.itemCode || '',
        String(item.qty || 0),
        item.unit || '',
        fmt(item.unitPrice),
        fmt(global.Pricing.computePoLineTotal(item)),
        item.leadTime || ''
      ];
    });
    doc.autoTable({
      startY: y,
      head: [['Description', 'Item Code', 'Qty', 'Unit', 'Unit Price (' + po.currency + ')', 'Line Total (' + po.currency + ')', 'Lead Time']],
      body: rows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 8, valign: 'middle', cellPadding: 4, lineColor: [210, 210, 210], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left', cellWidth: 58 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 40 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { cellWidth: 52 }
      }
    });
    let finalY = doc.lastAutoTable.finalY + 18;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    line(doc, 'Subtotal (' + po.currency + ')', 380, finalY);
    doc.text(fmt(totals.subtotal), rightEdge, finalY, { align: 'right' });
    doc.setFont(undefined, 'normal');
    finalY += 15;

    // Only shown when the PO isn't already in Kwacha — otherwise it's just the same
    // number twice.
    if ((po.currency || 'ZMW') !== 'ZMW') {
      doc.setFontSize(8.5);
      line(doc, 'Approx. value (ZMW @ ' + (po.exchangeRateToKwacha || 1) + ')', 380, finalY);
      doc.text('ZMW ' + fmt(totals.kwachaValue), rightEdge, finalY, { align: 'right' });
      finalY += 15;
    }
    y = finalY + 16;

    // ---- notes ----
    if (po.notes) {
      y = sectionBar(y, 'NOTES');
      y = textBox(doc, y, po.notes) + 10;
    }

    // ---- footer bar (on the last page) ----
    const footerLine = [company.name, flatAddress, company.email, company.phone].filter(Boolean).join('  |  ');
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(footerLine, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    return doc;
  }

  function generatePoPdf(po, totals, company) {
    const doc = buildPoDoc(po, totals, company);
    doc.save('PurchaseOrder-' + (po.poNumber || 'draft') + '.pdf');
  }

  // Opens the PDF in a new browser tab for a quick look, without forcing a download.
  function viewPoPdf(po, totals, company) {
    const doc = buildPoDoc(po, totals, company);
    window.open(doc.output('bloburl'), '_blank');
  }

  global.PoPdf = { generatePoPdf: generatePoPdf, viewPoPdf: viewPoPdf };
})(window);
