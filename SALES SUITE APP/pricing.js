// Pure price build-up calculations. No DOM access — safe to call on every keystroke.
(function (global) {
  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // cost (converted to base currency) -> walk components (freight, duty, surcharges...) -> landed cost -> margin/markup -> selling price.
  // A line can opt out of the build-up entirely with priceOverride — used when the
  // selling price was already agreed and there's nothing to calculate.
  function computeLineItem(item) {
    const qty = Number(item.qty) || 0;

    if (item.priceOverride) {
      const unitSellingPrice = round2(Number(item.overridePrice) || 0);
      return {
        costInBase: 0,
        landedCost: 0,
        unitSellingPrice: unitSellingPrice,
        lineTotal: round2(unitSellingPrice * qty),
        breakdown: [{ label: 'Manual price', amount: unitSellingPrice, runningSubtotal: unitSellingPrice }]
      };
    }

    const costPrice = Number(item.costPrice) || 0;
    const exchangeRate = Number(item.exchangeRate) || 1;
    const costInBase = costPrice * exchangeRate;

    let running = costInBase;
    const breakdown = [{ label: 'Cost price', amount: round2(costInBase), runningSubtotal: round2(running) }];

    (item.components || []).forEach(function (c) {
      const value = Number(c.value) || 0;
      const amount = c.type === 'percent' ? running * (value / 100) : value;
      running += amount;
      breakdown.push({ label: c.label || 'Component', amount: round2(amount), runningSubtotal: round2(running) });
    });

    const landedCost = running;
    const marginValue = Number(item.marginValue) || 0;
    let unitSellingPrice;
    if (item.marginMethod === 'markup') {
      unitSellingPrice = landedCost * (1 + marginValue / 100);
    } else {
      const denom = 1 - marginValue / 100;
      unitSellingPrice = denom > 0 ? landedCost / denom : landedCost;
    }

    const lineTotal = unitSellingPrice * qty;

    return {
      costInBase: round2(costInBase),
      landedCost: round2(landedCost),
      unitSellingPrice: round2(unitSellingPrice),
      lineTotal: round2(lineTotal),
      breakdown: breakdown
    };
  }

  function computeTotals(quotation) {
    const subtotal = (quotation.lineItems || []).reduce(function (sum, item) {
      return sum + computeLineItem(item).lineTotal;
    }, 0);
    const outputTaxPercent = Number(quotation.outputTaxPercent) || 0;
    const taxAmount = subtotal * (outputTaxPercent / 100);
    const grandTotal = subtotal + taxAmount;
    return {
      subtotal: round2(subtotal),
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

  global.Pricing = {
    computeLineItem: computeLineItem,
    computeTotals: computeTotals,
    computeOaLineTotal: computeOaLineTotal,
    computeOaTotals: computeOaTotals,
    round2: round2
  };
})(window);
