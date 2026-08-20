// Customer-facing Order Acknowledgement PDF, laid out to match the existing paper
// template (Quotation template/CL-KMP-1003 Order Acknowledgement.pdf): navy section
// bars, a Bill To / Ship To block, an itemized table, terms, and notes.
(function (global) {
  const NAVY = [39, 55, 108];
  const LIGHT_BAND = [235, 237, 245];
  const marginX = 40;
  const rightEdge = 555;
  const pageWidth = 595;

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function sectionBar(doc, y, label) {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(marginX, y, rightEdge - marginX, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9.5);
    doc.text(label, marginX + 8, y + 12.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    return y + 18;
  }

  function generateOaPdf(oa, totals, company) {
    const jsPDF = global.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 0;

    // ---- header bar ----
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, pageWidth, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(16);
    doc.text((company.name || 'Your Company').toUpperCase(), marginX, 34);
    doc.setFontSize(13);
    doc.text('ORDER ACKNOWLEDGEMENT', rightEdge, 34, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y = 76;

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
      styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { cellWidth: 150 },
        2: { fontStyle: 'bold', cellWidth: 120 },
        3: { cellWidth: 'auto' }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- customer & delivery details ----
    y = sectionBar(doc, y, 'CUSTOMER & DELIVERY DETAILS');
    const billLines = [oa.billTo.name, oa.billTo.address, oa.billTo.phone ? ('Tel: ' + oa.billTo.phone) : ''].filter(Boolean).join('\n');
    const shipLines = [oa.shipTo.name, oa.shipTo.address, oa.shipTo.attn ? ('Attn: ' + oa.shipTo.attn) : ''].filter(Boolean).join('\n');
    doc.autoTable({
      startY: y,
      head: [['Bill To', 'Ship To / Delivery Address']],
      body: [[billLines || '—', shipLines || '—']],
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9.5, valign: 'top', cellPadding: 5 },
      headStyles: { fillColor: LIGHT_BAND, textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: (rightEdge - marginX) / 2 }, 1: { cellWidth: (rightEdge - marginX) / 2 } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- order details ----
    y = sectionBar(doc, y, 'ORDER DETAILS');
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
      styles: { fontSize: 8.5, valign: 'middle', cellPadding: 4 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
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

    doc.setFontSize(10);
    line(doc, 'Sub-Total (' + oa.currency + ')', 380, y);
    doc.text(fmt(totals.subtotal), rightEdge, y, { align: 'right' });
    y += 15;
    line(doc, 'VAT (' + (oa.vatPercent || 0) + '%)', 380, y);
    doc.text(fmt(totals.vatAmount), rightEdge, y, { align: 'right' });
    y += 15;
    doc.setFont(undefined, 'bold');
    line(doc, 'TOTAL DUE (' + oa.currency + ')', 380, y);
    doc.text(fmt(totals.total), rightEdge, y, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y += 24;

    // ---- terms & conditions ----
    y = sectionBar(doc, y, 'TERMS & CONDITIONS');
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
      styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 130 }, 1: { cellWidth: 'auto' } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- notes ----
    y = sectionBar(doc, y, 'NOTES / REMARKS');
    doc.setDrawColor(200, 200, 200);
    const notesBoxHeight = 50;
    doc.rect(marginX, y, rightEdge - marginX, notesBoxHeight);
    if (oa.notes) {
      doc.setFontSize(9.5);
      const split = doc.splitTextToSize(oa.notes, rightEdge - marginX - 16);
      doc.text(split, marginX + 8, y + 14);
    }
    y += notesBoxHeight + 20;

    // ---- footer bar ----
    const footerY = Math.max(y, 780);
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, footerY, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    const footerLine = [company.name, company.address, company.email, company.phone].filter(Boolean).join('  |  ');
    doc.text(footerLine, pageWidth / 2, footerY + 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.save('Acknowledgement-' + (oa.oaNumber || 'draft') + '.pdf');
  }

  function line(doc, text, x, y) {
    if (text) doc.text(String(text), x, y);
  }

  global.OaPdf = { generateOaPdf: generateOaPdf };
})(window);
