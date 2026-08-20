// Client-facing PDF export. Only reads computed selling-price/total fields —
// never costPrice, components, or marginValue — so internal margins never leak into a quote PDF.
(function (global) {
  function line(doc, text, x, y) {
    if (text) doc.text(String(text), x, y);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function generateQuotationPdf(quotation, totals, company) {
    const jsPDF = global.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    const rightEdge = 555;
    let y = 50;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    line(doc, company.name || 'Your Company', marginX, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    y += 16;
    [company.address, company.phone, company.email].filter(Boolean).forEach(function (l) {
      line(doc, l, marginX, y);
      y += 13;
    });

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('QUOTATION', 400, 50);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    line(doc, 'Quote #: ' + quotation.quoteNumber, 400, 70);
    line(doc, 'Date: ' + quotation.quoteDate, 400, 84);
    if (quotation.validUntil) line(doc, 'Valid until: ' + quotation.validUntil, 400, 98);

    y = Math.max(y, 98) + 24;
    doc.setFont(undefined, 'bold');
    line(doc, 'Prepared for:', marginX, y);
    doc.setFont(undefined, 'normal');
    y += 14;
    const client = quotation.client || {};
    [client.name, client.company, client.email, client.phone, client.address].filter(Boolean).forEach(function (l) {
      line(doc, l, marginX, y);
      y += 13;
    });

    y += 10;

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
      styles: { fontSize: 10, valign: 'middle' },
      headStyles: { fillColor: [0, 122, 255], textColor: 255 },
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
    finalY += 30;

    if (quotation.notes) {
      doc.setFontSize(10);
      line(doc, 'Notes:', marginX, finalY);
      finalY += 14;
      const split = doc.splitTextToSize(quotation.notes, 500);
      doc.text(split, marginX, finalY);
    }

    doc.save('Quotation-' + quotation.quoteNumber + '.pdf');
  }

  global.QuotePdf = { generateQuotationPdf: generateQuotationPdf };
})(window);
