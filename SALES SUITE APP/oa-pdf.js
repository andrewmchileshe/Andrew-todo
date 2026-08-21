// Customer-facing Order Acknowledgement PDF, laid out to match the existing paper
// template (Quotation template/CL-KMP-1003 Order Acknowledgement.pdf): navy section
// bars, a Bill To / Ship To block, an itemized table, terms, and notes.
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

  function tint(rgb, amount) {
    return rgb.map((c) => Math.round(c + (255 - c) * amount));
  }

  // Bordered box sized to fit the wrapped text, with a page-break guard so a long
  // notes block doesn't silently run off the bottom of the page.
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

  function generateOaPdf(oa, totals, company) {
    const jsPDF = global.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const NAVY = hexToRgb(company.brandColor) || DEFAULT_NAVY;
    const LIGHT_BAND = tint(NAVY, 0.88);
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
    doc.text('ORDER ACKNOWLEDGEMENT', rightEdge, 34, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y = 68;

    // ---- company details line ----
    // Address is a free-text textarea in Settings and may contain line breaks; flatten it
    // to one line here so this stays a single fixed-height line — a multi-line address
    // previously pushed the info grid below into an overlap with this line.
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
        ['Acknowledgement No.', oa.oaNumber || '—', 'Date Issued', oa.dateIssued || ''],
        ['Customer PO Ref.', oa.customerPoRef || '—', 'Acknowledgement By', oa.acknowledgedBy || ''],
        ['Sales Representative', oa.salesRep || '', 'Contact', oa.contact || '']
      ],
      theme: 'plain',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { cellWidth: 150 },
        2: { fontStyle: 'bold', cellWidth: 120 },
        3: { cellWidth: 'auto' }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- customer & delivery details ----
    y = sectionBar(y, 'CUSTOMER & DELIVERY DETAILS');
    const billLines = [oa.billTo.name, oa.billTo.address, oa.billTo.phone ? ('Tel: ' + oa.billTo.phone) : ''].filter(Boolean).join('\n');
    const shipLines = [oa.shipTo.name, oa.shipTo.address, oa.shipTo.attn ? ('Attn: ' + oa.shipTo.attn) : ''].filter(Boolean).join('\n');
    doc.autoTable({
      startY: y,
      head: [['Bill To', 'Ship To / Delivery Address']],
      body: [[billLines || '—', shipLines || '—']],
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, valign: 'top', cellPadding: 5 },
      headStyles: { fillColor: LIGHT_BAND, textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 0: { cellWidth: (rightEdge - marginX) / 2 }, 1: { cellWidth: (rightEdge - marginX) / 2 } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- order details ----
    y = sectionBar(y, 'ORDER DETAILS');
    const rows = (oa.lineItems || []).map(function (item, i) {
      return [
        String(i + 1),
        item.description || '',
        item.itemCode || '',
        String(item.qty || 0),
        item.unit || '',
        fmt(item.unitPrice),
        fmt(global.Pricing.computeOaLineTotal(item)),
        item.leadTime || ''
      ];
    });
    doc.autoTable({
      startY: y,
      head: [['Item', 'Product Description', 'Item Code', 'Qty', 'Unit', 'Unit Price (' + oa.currency + ')', 'Line Total (' + oa.currency + ')', 'Lead Time']],
      body: rows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 8, valign: 'middle', cellPadding: 3.5, lineColor: [210, 210, 210], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 38 },
        5: { halign: 'right', cellWidth: 65 },
        6: { halign: 'right', cellWidth: 68 },
        7: { cellWidth: 60 }
      }
    });
    y = doc.lastAutoTable.finalY + 16;

    doc.setFontSize(9.5);
    line(doc, 'Sub-Total (' + oa.currency + ')', 380, y);
    doc.text(fmt(totals.subtotal), rightEdge, y, { align: 'right' });
    y += 14;
    line(doc, 'VAT (' + (oa.vatPercent || 0) + '%)', 380, y);
    doc.text(fmt(totals.vatAmount), rightEdge, y, { align: 'right' });
    y += 14;
    doc.setFont(undefined, 'bold');
    line(doc, 'TOTAL DUE (' + oa.currency + ')', 380, y);
    doc.text(fmt(totals.total), rightEdge, y, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y += 24;

    // ---- terms & conditions ----
    y = sectionBar(y, 'TERMS & CONDITIONS');
    doc.autoTable({
      startY: y,
      body: [
        ['Payment Terms', oa.paymentTerms || '—'],
        ['Incoterms', oa.incoterms || '—'],
        ['Currency', oa.currency || '—'],
        ['Special Instructions', oa.specialInstructions || '—']
      ],
      theme: 'plain',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 130 }, 1: { cellWidth: 'auto' } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- notes / remarks: order-specific remarks (if any) + the company's standard
    // acknowledgement notes (48hr confirmation, non-cancellable special-import items, etc.),
    // so the latter always appears even if a document's free-text notes are left blank ----
    y = sectionBar(y, 'NOTES / REMARKS');
    const standardNotes = company.oaStandardNotes || global.Core.defaultOaNotes();
    const notesText = oa.notes ? (oa.notes + '\n\n' + standardNotes) : standardNotes;
    y = textBox(doc, y, notesText, { lineHeight: 11.5 });

    // ---- footer bar (on the last page) ----
    const footerLine = [company.name, flatAddress, company.email, company.phone].filter(Boolean).join('  |  ');
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(footerLine, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.save('Acknowledgement-' + (oa.oaNumber || 'draft') + '.pdf');
  }

  global.OaPdf = { generateOaPdf: generateOaPdf };
})(window);
