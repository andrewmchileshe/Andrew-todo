// Client-facing PDF export. Only reads computed selling-price/total fields —
// never costPrice, components, or marginValue — so internal margins never leak into a quote PDF.
(function (global) {
  const DEFAULT_NAVY = [39, 55, 108];
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

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Bordered box sized to fit the wrapped text, with a page-break guard so a long
  // Sale Conditions/Notes block doesn't silently run off the bottom of the page.
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

  // Builds the jsPDF document without deciding what happens to it — generateQuotationPdf
  // and viewQuotationPdf share this and only differ in how they hand off the finished doc.
  function buildQuotationDoc(quotation, totals, company) {
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
    doc.text('QUOTATION', rightEdge, 34, { align: 'right' });
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
        ['Quote No.', quotation.quoteNumber || '—', 'Date Issued', quotation.quoteDate || ''],
        ['RFQ Ref.', quotation.rfqRef || '—', '', ''],
        ['Valid Until', quotation.validUntil || '—', 'Currency', quotation.baseCurrency || '']
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

    // ---- prepared for ----
    // Company name, then address, then a blank spacer line, then "Attention: <contact>"
    // with the email/phone right under it — matches how staff read a mailing block.
    y = sectionBar(y, 'PREPARED FOR');
    const client = quotation.client || {};
    const clientLineList = [];
    if (client.company) clientLineList.push(client.company);
    if (client.address) clientLineList.push(client.address);
    if (client.name) {
      if (clientLineList.length) clientLineList.push('');
      clientLineList.push('Attention: ' + client.name);
    }
    if (client.email) clientLineList.push(client.email);
    if (client.phone) clientLineList.push(client.phone);
    const clientLines = clientLineList.join('\n');
    doc.setDrawColor(200, 200, 200);
    doc.setFontSize(9);
    const clientTextLines = doc.splitTextToSize(clientLines || '—', rightEdge - marginX - 16);
    const clientBoxHeight = Math.max(28, clientTextLines.length * 12 + 16);
    doc.rect(marginX, y, rightEdge - marginX, clientBoxHeight);
    doc.text(clientTextLines, marginX + 8, y + 15);
    y += clientBoxHeight + 10;

    // ---- quote details (line items) ----
    y = sectionBar(y, 'QUOTE DETAILS');
    const rows = (quotation.lineItems || []).map(function (item) {
      const computed = global.Pricing.computeLineItem(item);
      // Unit Price × Qty won't equal Line Total when a line discount is applied — call
      // that out inline instead of adding another column that would re-narrow this table.
      let description = item.description || '';
      if (computed.discountAmount > 0) {
        const discountNote = item.discountType === 'fixed'
          ? (quotation.baseCurrency + ' ' + fmt(item.discountValue) + ' off')
          : (Number(item.discountValue) || 0) + '% off';
        description += '\n(Discount: ' + discountNote + ')';
      }
      return [
        description,
        item.itemCode || '',
        String(item.qty || 0),
        fmt(computed.unitSellingPrice),
        fmt(computed.lineTotal),
        item.leadTime || ''
      ];
    });

    // Currency is stated once, in the column header — the quote's currency is already
    // shown in the info grid above, so repeating it against every row is just noise.
    // A smaller body font plus wider Item Code/Qty columns keeps real-world values —
    // e.g. "528-028-500" or a 5-digit quantity — from wrapping onto a second line.
    doc.autoTable({
      startY: y,
      head: [['Description', 'Item Code', 'Qty', 'Unit Price (' + quotation.baseCurrency + ')', 'Line Total (' + quotation.baseCurrency + ')', 'Lead Time']],
      body: rows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 8, valign: 'middle', cellPadding: 4, lineColor: [210, 210, 210], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left', cellWidth: 58 },
        2: { halign: 'right', cellWidth: 34 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'left', cellWidth: 52 }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 18;
    doc.setFontSize(10);
    line(doc, 'Subtotal', 380, finalY);
    doc.text(quotation.baseCurrency + ' ' + fmt(totals.subtotal), rightEdge, finalY, { align: 'right' });
    finalY += 15;
    if (totals.discountAmount > 0) {
      line(doc, 'Discount', 380, finalY);
      doc.text('-' + quotation.baseCurrency + ' ' + fmt(totals.discountAmount), rightEdge, finalY, { align: 'right' });
      finalY += 15;
    }
    if (Number(quotation.outputTaxPercent) > 0) {
      line(doc, 'Tax (' + quotation.outputTaxPercent + '%)', 380, finalY);
      doc.text(quotation.baseCurrency + ' ' + fmt(totals.taxAmount), rightEdge, finalY, { align: 'right' });
      finalY += 15;
    }
    doc.setFont(undefined, 'bold');
    line(doc, 'Grand Total', 380, finalY);
    doc.text(quotation.baseCurrency + ' ' + fmt(totals.grandTotal), rightEdge, finalY, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y = finalY + 26;

    // ---- terms (payment terms / incoterms — kept separate from free-text notes) ----
    y = sectionBar(y, 'TERMS');
    doc.autoTable({
      startY: y,
      body: [
        ['Payment Terms', quotation.paymentTerms || '—'],
        ['Incoterms', quotation.incoterms || '—']
      ],
      theme: 'plain',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 130 }, 1: { cellWidth: 'auto' } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ---- notes (per-quote free text) ----
    if (quotation.notes) {
      y = sectionBar(y, 'NOTES');
      y = textBox(doc, y, quotation.notes) + 10;
    }

    // ---- sale conditions ----
    y = sectionBar(y, 'SALE CONDITIONS');
    const saleConditions = company.saleConditions || global.Core.defaultSaleConditions(company.name);
    y = textBox(doc, y, saleConditions, { lineHeight: 12 });

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

  function generateQuotationPdf(quotation, totals, company) {
    const doc = buildQuotationDoc(quotation, totals, company);
    doc.save('Quotation-' + quotation.quoteNumber + '.pdf');
  }

  // Opens the PDF in a new browser tab for a quick look, without forcing a download.
  function viewQuotationPdf(quotation, totals, company) {
    const doc = buildQuotationDoc(quotation, totals, company);
    window.open(doc.output('bloburl'), '_blank');
  }

  global.QuotePdf = { generateQuotationPdf: generateQuotationPdf, viewQuotationPdf: viewQuotationPdf };
})(window);
