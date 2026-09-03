// Pure price build-up calculations. No DOM access — safe to call on every keystroke.
(function (global) {
  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // cost (converted to base currency) -> walk components (freight, duty, surcharges...) -> landed cost -> margin/markup -> selling price -> line discount.
  // A line can opt out of the build-up entirely with priceOverride — used when the
  // selling price was already agreed and there's nothing to calculate.
  function computeLineItem(item) {
    const qty = Number(item.qty) || 0;
    let unitSellingPrice;
    let costInBase = 0;
    let landedCost = 0;
    let breakdown;

    if (item.priceOverride) {
      unitSellingPrice = round2(Number(item.overridePrice) || 0);
      breakdown = [{ label: 'Manual price', amount: unitSellingPrice, runningSubtotal: unitSellingPrice }];
    } else {
      const costPrice = Number(item.costPrice) || 0;
      const exchangeRate = Number(item.exchangeRate) || 1;
      costInBase = costPrice * exchangeRate;

      let running = costInBase;
      breakdown = [{ label: 'Cost price', amount: round2(costInBase), runningSubtotal: round2(running) }];

      // Fixed-amount components (freight, duty, surcharges...) can each be in their own
      // currency — e.g. cost in USD but Freight billed in ZMW — so each carries its own
      // exchange rate into the line's base currency. Percent components are already a
      // percentage of the running (base-currency) total, so currency doesn't apply to them.
      (item.components || []).forEach(function (c) {
        const value = Number(c.value) || 0;
        let amount, note;
        if (c.type === 'percent') {
          amount = running * (value / 100);
          note = '';
        } else {
          const compRate = Number(c.exchangeRate) || 1;
          amount = value * compRate;
          note = c.currency ? (c.currency + ' ' + value.toFixed(2) + (compRate !== 1 ? ' × ' + compRate : '')) : '';
        }
        running += amount;
        breakdown.push({ label: c.label || 'Component', note: note, amount: round2(amount), runningSubtotal: round2(running) });
      });

      landedCost = running;
      const marginValue = Number(item.marginValue) || 0;
      if (item.marginMethod === 'markup') {
        unitSellingPrice = landedCost * (1 + marginValue / 100);
      } else {
        const denom = 1 - marginValue / 100;
        unitSellingPrice = denom > 0 ? landedCost / denom : landedCost;
      }
    }

    // Line discount (flat % or fixed amount off this line's total) applies after
    // pricing is worked out, regardless of which mode produced the unit price.
    const lineTotalBeforeDiscount = unitSellingPrice * qty;
    const discountValue = Number(item.discountValue) || 0;
    const discountAmount = discountValue > 0
      ? (item.discountType === 'fixed' ? discountValue : lineTotalBeforeDiscount * (discountValue / 100))
      : 0;
    const lineTotal = Math.max(0, lineTotalBeforeDiscount - discountAmount);

    return {
      costInBase: round2(costInBase),
      landedCost: round2(landedCost),
      unitSellingPrice: round2(unitSellingPrice),
      lineTotalBeforeDiscount: round2(lineTotalBeforeDiscount),
      discountAmount: round2(discountAmount),
      lineTotal: round2(lineTotal),
      breakdown: breakdown
    };
  }

  function computeTotals(quotation) {
    const subtotal = (quotation.lineItems || []).reduce(function (sum, item) {
      return sum + computeLineItem(item).lineTotal;
    }, 0);
    // Transaction-level discount applies to the subtotal before tax, so tax is charged
    // on the discounted amount rather than the pre-discount price.
    const discountValue = Number(quotation.discountValue) || 0;
    const discountAmount = discountValue > 0
      ? (quotation.discountType === 'fixed' ? discountValue : subtotal * (discountValue / 100))
      : 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const outputTaxPercent = Number(quotation.outputTaxPercent) || 0;
    const taxAmount = taxableAmount * (outputTaxPercent / 100);
    const grandTotal = taxableAmount + taxAmount;
    return {
      subtotal: round2(subtotal),
      discountAmount: round2(discountAmount),
      taxableAmount: round2(taxableAmount),
      taxAmount: round2(taxAmount),
      grandTotal: round2(grandTotal)
    };
  }

  // Simple qty * unitPrice line total for Order Acknowledgements, where the
  // unit price is already the customer-facing selling price (no cost/margin build-up).
  function computeOaLineTotal(item) {
    return round2((Number(item.qty) || 0) * (Number(item.unitPrice) || 0));
  }

  function computeOaTotals(oa) {
    const subtotal = (oa.lineItems || []).reduce(function (sum, item) {
      return sum + computeOaLineTotal(item);
    }, 0);
    const vatPercent = Number(oa.vatPercent) || 0;
    const vatAmount = subtotal * (vatPercent / 100);
    const total = subtotal + vatAmount;
    return {
      subtotal: round2(subtotal),
      vatAmount: round2(vatAmount),
      total: round2(total)
    };
  }

  // Simple qty * unitPrice line total, shared by Supplier POs and Customer POs — the
  // unit price is already whatever was agreed/stated (no cost/margin build-up).
  function computePoLineTotal(item) {
    return round2((Number(item.qty) || 0) * (Number(item.unitPrice) || 0));
  }

  function computePoTotals(po) {
    const subtotal = (po.lineItems || []).reduce(function (sum, item) {
      return sum + computePoLineTotal(item);
    }, 0);
    // Outstanding POs are valued in Kwacha regardless of the PO's own transaction
    // currency, using a manually-entered rate — same pattern as line-item exchange
    // rates elsewhere in the app rather than a live FX feed.
    const exchangeRateToKwacha = Number(po.exchangeRateToKwacha) || 1;
    const kwachaValue = subtotal * exchangeRateToKwacha;
    return {
      subtotal: round2(subtotal),
      kwachaValue: round2(kwachaValue)
    };
  }

  global.Pricing = {
    computeLineItem: computeLineItem,
    computeTotals: computeTotals,
    computeOaLineTotal: computeOaLineTotal,
    computeOaTotals: computeOaTotals,
    computePoLineTotal: computePoLineTotal,
    computePoTotals: computePoTotals,
    round2: round2
  };
})(window);
