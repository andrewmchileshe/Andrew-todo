// Client-facing PDF export. Only reads computed selling-price/total fields —
// never costPrice, components, or marginValue — so internal margins never leak into a quote PDF.
(function (global) {
  const NAVY = [39, 55, 108];
  const LIGHT_BAND = [235, 237, 245];
  const marginX = 40;
  const rightEdge = 555;
  const pageWidth = 595;
  const pageHeight = 842;

  function line(doc, text, x, y) {
    if (text) doc.text(String(text), x, y);
  }

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

  // Bordered box sized to fit the wrapped text, with a page-break guard so a long
  // Sale Conditions/Notes block doesn't silently run off the bottom of the page.
  function textBox(doc, y, text, opts) {
    opts = opts || {};
    const width = opts.width || (rightEdge - marginX);
    const fontSize = opts.fontSize || 9;
    const lineHeight = opts.lineHeight || 12;
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

  function generateQuotationPdf(quotation, totals, company) {
    const jsPDF = global.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 0;

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
    doc.setFontSize(16);
    doc.text((company.name || 'Your Company').toUpperCase(), nameX, 34);
    doc.setFontSize(13);
    doc.text('QUOTATION', rightEdge, 34, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y = 68;

    // ---- company details line ----
    doc.setFontSize(8.5);
    const companyLine = [company.address, company.phone, company.email, company.taxId ? ('Tax ID: ' + company.taxId) : '']
      .filter(Boolean).join('   |   ');
    if (companyLine) { line(doc, companyLine, marginX, y); y += 16; }
    else { y += 6; }

    // ---- info grid ----
    doc.autoTable({
      startY: y,
      body: [
        ['Quote No.', quotation.quoteNumber || '—', 'Date Issued', quotation.quoteDate || ''],
        ['Valid Until', quotation.validUntil || '—', 'Currency', quotation.baseCurrency || '']
      ],
      theme: 'plain',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 },
        1: { cellWidth: 170 },
        2: { fontStyle: 'bold', cellWidth: 90 },
        3: { cellWidth: 'auto' }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- prepared for ----
    y = sectionBar(doc, y, 'PREPARED FOR');
    const client = quotation.client || {};
    const clientLines = [client.company || client.name, client.company ? client.name : '', client.address, client.email, client.phone]
      .filter(Boolean).join('\n');
    doc.setDrawColor(200, 200, 200);
    doc.setFontSize(9.5);
    const clientTextLines = doc.splitTextToSize(clientLines || '—', rightEdge - marginX - 16);
    const clientBoxHeight = Math.max(30, clientTextLines.length * 13 + 16);
    doc.rect(marginX, y, rightEdge - marginX, clientBoxHeight);
    doc.text(clientTextLines, marginX + 8, y + 16);
    y += clientBoxHeight + 10;

    // ---- quote details (line items) ----
    y = sectionBar(doc, y, 'QUOTE DETAILS');
    const rows = (quotation.lineItems || []).map(function (item) {
      const computed = global.Pricing.computeLineItem(item);
      return [
        item.description || '',
        String(item.qty || 0),
        quotation.baseCurrency + ' ' + fmt(computed.unitSellingPrice),
        quotation.baseCurrency + ' ' + fmt(computed.lineTotal)
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
      body: rows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9.5, valign: 'middle', cellPadding: 5, lineColor: [210, 210, 210], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right', cellWidth: 45 },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    line(doc, 'Subtotal', 380, finalY);
    doc.text(quotation.baseCurrency + ' ' + fmt(totals.subtotal), rightEdge, finalY, { align: 'right' });
    finalY += 16;
    if (Number(quotation.outputTaxPercent) > 0) {
      line(doc, 'Tax (' + quotation.outputTaxPercent + '%)', 380, finalY);
      doc.text(quotation.baseCurrency + ' ' + fmt(totals.taxAmount), rightEdge, finalY, { align: 'right' });
      finalY += 16;
    }
    doc.setFont(undefined, 'bold');
    line(doc, 'Grand Total', 380, finalY);
    doc.text(quotation.baseCurrency + ' ' + fmt(totals.grandTotal), rightEdge, finalY, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y = finalY + 26;

    // ---- notes (per-quote free text) ----
    if (quotation.notes) {
      y = sectionBar(doc, y, 'NOTES');
      y = textBox(doc, y, quotation.notes) + 10;
    }

    // ---- sale conditions ----
    y = sectionBar(doc, y, 'SALE CONDITIONS');
    const saleConditions = company.saleConditions || global.Core.defaultSaleConditions(company.name);
    y = textBox(doc, y, saleConditions, { lineHeight: 13 });

    // ---- footer bar (on the last page) ----
    const footerLine = [company.name, company.address, company.email, company.phone].filter(Boolean).join('  |  ');
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.text(footerLine, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.save('Quotation-' + quotation.quoteNumber + '.pdf');
  }

  global.QuotePdf = { generateQuotationPdf: generateQuotationPdf };
})(window);
