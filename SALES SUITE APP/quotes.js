// Quotation editor + history. Scoped to Core.state.activeCompanyId — re-subscribes
// whenever the admin switches company. Ports app.js from the old Quotation Builder App,
// with two fixes: a save-in-flight guard (prevents the old double-save race) and a
// visible error on save failure instead of a silently-stuck button.
(function (global) {
  const Core = global.Core;
  const NUMERIC_FIELDS = ['qty', 'exchangeRate', 'costPrice', 'marginValue', 'overridePrice'];
  const DRAFT_KEY = 'sales-suite-quote-draft-v1';

  const el = (id) => document.getElementById(id);

  const editorView = el('quoteEditorView');
  const historyView = el('quoteHistoryView');
  const navEditorBtn = el('quoteNavEditorBtn');
  const navHistoryBtn = el('quoteNavHistoryBtn');

  const quoteNumberDisplay = el('quoteNumberDisplay');
  const attributionTextEl = el('quoteAttributionText');
  const statusToggle = el('quoteStatusToggle');
  const quoteDateInput = el('quoteDateInput');
  const validUntilInput = el('quoteValidUntilInput');
  const baseCurrencySelect = el('quoteBaseCurrencySelect');
  const rfqRefInput = el('quoteRfqRefInput');
  const clientNameInput = el('quoteClientNameInput');
  const clientCompanyInput = el('quoteClientCompanyInput');
  const clientEmailInput = el('quoteClientEmailInput');
  const clientPhoneInput = el('quoteClientPhoneInput');
  const clientAddressInput = el('quoteClientAddressInput');
  const paymentTermsInput = el('quotePaymentTermsInput');
  const incotermsInput = el('quoteIncotermsInput');
  const notesInput = el('quoteNotesInput');
  const pickCustomerBtn = el('quotePickCustomerBtn');
  const saveCustomerBtn = el('quoteSaveCustomerBtn');

  const trackingBadge = el('quoteTrackingBadge');
  const sentDateInput = el('quoteSentDateInput');
  const outcomeDateInput = el('quoteOutcomeDateInput');
  const markSentBtn = el('quoteMarkSentBtn');
  const markWonBtn = el('quoteMarkWonBtn');
  const markLostBtn = el('quoteMarkLostBtn');
  const clearOutcomeBtn = el('quoteClearOutcomeBtn');

  const lineItemsContainer = el('quoteLineItemsContainer');
  const addLineItemBtn = el('quoteAddLineItemBtn');

  const outputTaxInput = el('quoteOutputTaxInput');
  const subtotalDisplay = el('quoteSubtotalDisplay');
  const taxAmountDisplay = el('quoteTaxAmountDisplay');
  const grandTotalDisplay = el('quoteGrandTotalDisplay');

  const saveBtn = el('quoteSaveBtn');
  const downloadPdfBtn = el('quoteDownloadPdfBtn');
  const newQuoteBtn = el('quoteNewBtn');
  const saveStatusText = el('quoteSaveStatusText');

  const historySearchInput = el('quoteHistorySearchInput');
  const historyListEl = el('quoteHistoryList');
  const historyEmptyState = el('quoteHistoryEmptyState');

  function generateQuoteNumber() {
    const d = new Date();
    const ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `Q-${ymd}-${suffix}`;
  }

  function blankQuotation() {
    return {
      id: null,
      quoteNumber: generateQuoteNumber(),
      status: 'draft',
      client: { name: '', company: '', email: '', phone: '', address: '' },
      baseCurrency: 'ZMW',
      quoteDate: Core.todayIso(),
      validUntil: '',
      rfqRef: '',
      paymentTerms: '',
      incoterms: '',
      notes: '',
      outputTaxPercent: 0,
      lineItems: [],
      sentDate: '',
      outcome: '',
      outcomeDate: '',
      createdByName: '',
      lastEditedByName: ''
    };
  }

  // 'won' / 'lost' only mean anything once sentDate is set; a quote can't be won or
  // lost before it's actually been sent to the customer.
  function trackingStatus(q) {
    if (q.outcome === 'won') return 'won';
    if (q.outcome === 'lost') return 'lost';
    if (q.sentDate) return 'sent';
    return 'not-sent';
  }

  function blankLineItem() {
    return {
      id: Core.uid(),
      description: '',
      itemCode: '',
      leadTime: '',
      qty: 1,
      sourceCurrency: state.quotation.baseCurrency || 'ZMW',
      exchangeRate: 1,
      costPrice: 0,
      components: [],
      marginMethod: 'margin',
      marginValue: 0,
      priceOverride: false,
      overridePrice: 0
    };
  }

  function blankComponent() {
    return { id: Core.uid(), label: '', type: 'fixed', value: 0, currency: state.quotation.baseCurrency || 'ZMW', exchangeRate: 1 };
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveDraftLocal() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.quotation));
  }

  const state = {
    quotation: loadDraft() || blankQuotation(),
    historyItems: [],
    historyUnsub: null,
    saving: false
  };
  if (!state.quotation) state.quotation = blankQuotation();

  // ---------- rendering: header ----------
  function renderHeader() {
    quoteNumberDisplay.textContent = state.quotation.quoteNumber;
    [...statusToggle.children].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.status === state.quotation.status);
    });
    const attribution = attributionText(state.quotation);
    attributionTextEl.textContent = attribution;
    attributionTextEl.style.display = attribution ? '' : 'none';
    quoteDateInput.value = state.quotation.quoteDate || '';
    validUntilInput.value = state.quotation.validUntil || '';
    baseCurrencySelect.value = state.quotation.baseCurrency || 'ZMW';
    rfqRefInput.value = state.quotation.rfqRef || '';
    clientNameInput.value = state.quotation.client.name || '';
    clientCompanyInput.value = state.quotation.client.company || '';
    clientEmailInput.value = state.quotation.client.email || '';
    clientPhoneInput.value = state.quotation.client.phone || '';
    clientAddressInput.value = state.quotation.client.address || '';
    paymentTermsInput.value = state.quotation.paymentTerms || '';
    incotermsInput.value = state.quotation.incoterms || '';
    notesInput.value = state.quotation.notes || '';
    outputTaxInput.value = state.quotation.outputTaxPercent || 0;
    renderTracking();
  }

  const TRACKING_LABELS = { 'not-sent': 'Not sent', sent: 'Sent — awaiting decision', won: 'Won', lost: 'Lost' };
  function renderTracking() {
    const status = trackingStatus(state.quotation);
    trackingBadge.textContent = TRACKING_LABELS[status];
    trackingBadge.className = 'badge tracking-' + status;
    sentDateInput.value = state.quotation.sentDate || '';
    outcomeDateInput.value = state.quotation.outcomeDate || '';
    markSentBtn.style.display = status === 'not-sent' ? '' : 'none';
    markWonBtn.style.display = status === 'sent' ? '' : 'none';
    markLostBtn.style.display = status === 'sent' ? '' : 'none';
    clearOutcomeBtn.style.display = (status === 'won' || status === 'lost') ? '' : 'none';
  }

  // ---------- rendering: line items ----------
  function renderComputedHtml(item) {
    const c = Pricing.computeLineItem(item);
    const currency = state.quotation.baseCurrency;
    if (item.priceOverride) {
      return `
        <div class="li-summary-row"><span>Unit selling price (manual)</span><strong>${currency} ${Core.fmt(c.unitSellingPrice)}</strong></div>
        <div class="li-summary-row total"><span>Line total (×${Number(item.qty) || 0})</span><strong>${currency} ${Core.fmt(c.lineTotal)}</strong></div>
      `;
    }
    const rows = c.breakdown.map((b) => `
      <div class="li-breakdown-row">
        <span>${Core.escapeHtml(b.label)}${b.note ? ' <span class="li-note">(' + Core.escapeHtml(b.note) + ')</span>' : ''}</span>
        <span>${b.amount >= 0 ? '+' : ''}${Core.fmt(b.amount)}</span>
        <span class="li-running">${currency} ${Core.fmt(b.runningSubtotal)}</span>
      </div>`).join('');
    return `
      <div class="li-breakdown">${rows}</div>
      <div class="li-summary-row"><span>Landed cost</span><strong>${currency} ${Core.fmt(c.landedCost)}</strong></div>
      <div class="li-summary-row"><span>Unit selling price</span><strong>${currency} ${Core.fmt(c.unitSellingPrice)}</strong></div>
      <div class="li-summary-row total"><span>Line total (×${Number(item.qty) || 0})</span><strong>${currency} ${Core.fmt(c.lineTotal)}</strong></div>
    `;
  }

  function renderLineItemCard(item, index, total) {
    const comps = (item.components || []).map((c) => {
      const isFixed = c.type !== 'percent';
      return `
      <div class="comp-block" data-comp-id="${c.id}">
        <div class="comp-row-top">
          <input type="text" data-comp-field="label" value="${Core.escapeHtml(c.label)}" placeholder="Freight, import duty, DG surcharge..." />
          <select data-comp-field="type">
            <option value="fixed" ${isFixed ? 'selected' : ''}>Fixed amount</option>
            <option value="percent" ${!isFixed ? 'selected' : ''}>% of running cost</option>
          </select>
          <button type="button" class="icon-btn" data-remove-comp aria-label="Remove component">✕</button>
        </div>
        <div class="comp-row-fields${isFixed ? '' : ' percent-only'}">
          <input type="number" step="0.01" data-comp-field="value" value="${c.value}" placeholder="${isFixed ? 'Amount' : '%'}" />
          ${isFixed ? `
          <input type="text" data-comp-field="currency" value="${Core.escapeHtml(c.currency || state.quotation.baseCurrency)}" placeholder="Currency" />
          <input type="number" step="0.0001" min="0" data-comp-field="exchangeRate" value="${c.exchangeRate != null ? c.exchangeRate : 1}" placeholder="Exch. rate" />
          ` : ''}
        </div>
      </div>`;
    }).join('');

    return `
      <div class="li-card card" data-item-id="${item.id}">
        <div class="li-top-row">
          <span class="li-index">Item ${index + 1}</span>
          <div class="li-move-actions">
            <button type="button" class="icon-btn" data-move="up" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button type="button" class="icon-btn" data-move="down" ${index === total - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            <button type="button" class="icon-btn danger" data-remove-item aria-label="Remove item">✕</button>
          </div>
        </div>

        <input type="text" class="li-desc" data-field="description" placeholder="Item description" value="${Core.escapeHtml(item.description)}" />
        <button type="button" class="text-btn" data-pick-catalog>Pick from catalog</button>

        <div class="li-grid" style="grid-template-columns: 1fr 1fr;">
          <label>Product code<input type="text" data-field="itemCode" value="${Core.escapeHtml(item.itemCode)}" /></label>
          <label>Lead time<input type="text" data-field="leadTime" placeholder="3-4 weeks" value="${Core.escapeHtml(item.leadTime)}" /></label>
        </div>

        <label class="checkbox-row">
          <input type="checkbox" data-field-checkbox="priceOverride" ${item.priceOverride ? 'checked' : ''} />
          Manual price — skip the cost build-up and type the selling price directly
        </label>

        ${item.priceOverride ? `
        <div class="li-grid" style="grid-template-columns: 1fr 1fr;">
          <label>Qty<input type="number" min="0" step="1" data-field="qty" value="${item.qty}" /></label>
          <label>Selling price<input type="number" min="0" step="0.01" data-field="overridePrice" value="${item.overridePrice}" /></label>
        </div>
        ` : `
        <div class="li-grid">
          <label>Qty<input type="number" min="0" step="1" data-field="qty" value="${item.qty}" /></label>
          <label>Source currency<input type="text" data-field="sourceCurrency" value="${Core.escapeHtml(item.sourceCurrency)}" /></label>
          <label>Exchange rate<input type="number" min="0" step="0.0001" data-field="exchangeRate" value="${item.exchangeRate}" /></label>
          <label>Cost price<input type="number" min="0" step="0.01" data-field="costPrice" value="${item.costPrice}" /></label>
        </div>

        <p class="field-label">Landed cost build-up</p>
        <div class="comp-list">${comps}</div>
        <button type="button" class="text-btn" data-add-comp>+ Add cost component</button>

        <p class="field-label">Margin</p>
        <div class="margin-row">
          <div class="toggle-group" data-margin-toggle>
            <button type="button" data-margin-method="margin" class="${item.marginMethod === 'markup' ? '' : 'active'}">Margin % of price</button>
            <button type="button" data-margin-method="markup" class="${item.marginMethod === 'markup' ? 'active' : ''}">Markup % of cost</button>
          </div>
          <input type="number" min="0" step="0.01" data-field="marginValue" value="${item.marginValue}" />
        </div>
        `}

        <div class="li-computed" data-computed>${renderComputedHtml(item)}</div>
      </div>`;
  }

  function renderLineItems() {
    const items = state.quotation.lineItems;
    lineItemsContainer.innerHTML = items.length
      ? items.map((item, i) => renderLineItemCard(item, i, items.length)).join('')
      : '<p class="empty-state">No line items yet — add your first one.</p>';
  }

  function updateComputedOnly(itemId) {
    const item = state.quotation.lineItems.find((i) => i.id === itemId);
    if (!item) return;
    const target = lineItemsContainer.querySelector(`[data-item-id="${itemId}"] [data-computed]`);
    if (target) target.innerHTML = renderComputedHtml(item);
  }

  function updateTotals() {
    const totals = Pricing.computeTotals(state.quotation);
    subtotalDisplay.textContent = `${state.quotation.baseCurrency} ${Core.fmt(totals.subtotal)}`;
    taxAmountDisplay.textContent = `${state.quotation.baseCurrency} ${Core.fmt(totals.taxAmount)}`;
    grandTotalDisplay.textContent = `${state.quotation.baseCurrency} ${Core.fmt(totals.grandTotal)}`;
    return totals;
  }

  function renderAll() {
    renderHeader();
    renderLineItems();
    updateTotals();
  }

  // ---------- header events ----------
  statusToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status]');
    if (!btn) return;
    state.quotation.status = btn.dataset.status;
    renderHeader();
    saveDraftLocal();
  });

  quoteDateInput.addEventListener('input', () => { state.quotation.quoteDate = quoteDateInput.value; saveDraftLocal(); });
  validUntilInput.addEventListener('input', () => { state.quotation.validUntil = validUntilInput.value; saveDraftLocal(); });
  baseCurrencySelect.addEventListener('input', () => {
    state.quotation.baseCurrency = baseCurrencySelect.value.toUpperCase();
    renderLineItems();
    updateTotals();
    saveDraftLocal();
  });
  clientNameInput.addEventListener('input', () => { state.quotation.client.name = clientNameInput.value; saveDraftLocal(); });
  clientCompanyInput.addEventListener('input', () => { state.quotation.client.company = clientCompanyInput.value; saveDraftLocal(); });
  clientEmailInput.addEventListener('input', () => { state.quotation.client.email = clientEmailInput.value; saveDraftLocal(); });
  clientPhoneInput.addEventListener('input', () => { state.quotation.client.phone = clientPhoneInput.value; saveDraftLocal(); });
  clientAddressInput.addEventListener('input', () => { state.quotation.client.address = clientAddressInput.value; saveDraftLocal(); });
  rfqRefInput.addEventListener('input', () => { state.quotation.rfqRef = rfqRefInput.value; saveDraftLocal(); });
  paymentTermsInput.addEventListener('input', () => { state.quotation.paymentTerms = paymentTermsInput.value; saveDraftLocal(); });
  incotermsInput.addEventListener('input', () => { state.quotation.incoterms = incotermsInput.value; saveDraftLocal(); });
  notesInput.addEventListener('input', () => { state.quotation.notes = notesInput.value; saveDraftLocal(); });

  pickCustomerBtn.addEventListener('click', () => {
    CustomersModule.openPicker((customer) => {
      state.quotation.client.name = customer.name || '';
      state.quotation.client.company = customer.company || '';
      state.quotation.client.email = customer.email || '';
      state.quotation.client.phone = customer.phone || '';
      state.quotation.client.address = customer.address || '';
      renderHeader();
      saveDraftLocal();
    });
  });
  saveCustomerBtn.addEventListener('click', () => {
    const c = state.quotation.client;
    if (!c.name && !c.company) { setSaveStatus('Enter a client name or company before saving as a customer.', true); return; }
    CustomersModule.saveQuick(c, (ok, err) => {
      setSaveStatus(ok ? 'Saved to Customers' : ('Save failed: ' + (err && err.message ? err.message : '')), !ok);
    });
  });
  outputTaxInput.addEventListener('input', () => {
    state.quotation.outputTaxPercent = Number(outputTaxInput.value) || 0;
    updateTotals();
    saveDraftLocal();
  });

  // ---------- tracking (sent / won / lost) ----------
  sentDateInput.addEventListener('input', () => { state.quotation.sentDate = sentDateInput.value; renderTracking(); saveDraftLocal(); });
  outcomeDateInput.addEventListener('input', () => { state.quotation.outcomeDate = outcomeDateInput.value; saveDraftLocal(); });

  markSentBtn.addEventListener('click', () => {
    state.quotation.sentDate = state.quotation.sentDate || Core.todayIso();
    renderTracking();
    saveQuotation();
  });
  markWonBtn.addEventListener('click', () => {
    state.quotation.outcome = 'won';
    state.quotation.outcomeDate = state.quotation.outcomeDate || Core.todayIso();
    renderTracking();
    saveQuotation();
  });
  markLostBtn.addEventListener('click', () => {
    state.quotation.outcome = 'lost';
    state.quotation.outcomeDate = state.quotation.outcomeDate || Core.todayIso();
    renderTracking();
    saveQuotation();
  });
  clearOutcomeBtn.addEventListener('click', () => {
    state.quotation.outcome = '';
    state.quotation.outcomeDate = '';
    renderTracking();
    saveQuotation();
  });

  // ---------- line item events (delegated so typing never loses focus) ----------
  lineItemsContainer.addEventListener('input', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.quotation.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;

    const fieldTarget = e.target.closest('[data-field]');
    const compFieldTarget = e.target.closest('[data-comp-field]');

    if (fieldTarget) {
      const field = fieldTarget.dataset.field;
      item[field] = NUMERIC_FIELDS.includes(field) ? Number(fieldTarget.value) || 0 : fieldTarget.value;
      updateComputedOnly(item.id);
      updateTotals();
      saveDraftLocal();
    } else if (compFieldTarget) {
      const compRow = e.target.closest('[data-comp-id]');
      const comp = item.components.find((c) => c.id === compRow.dataset.compId);
      if (!comp) return;
      const field = compFieldTarget.dataset.compField;
      comp[field] = (field === 'value' || field === 'exchangeRate') ? Number(compFieldTarget.value) || 0 : compFieldTarget.value;
      updateComputedOnly(item.id);
      updateTotals();
      saveDraftLocal();
    }
  });

  lineItemsContainer.addEventListener('change', (e) => {
    const overrideCheckbox = e.target.closest('[data-field-checkbox="priceOverride"]');
    if (overrideCheckbox) {
      const card = e.target.closest('[data-item-id]');
      const item = state.quotation.lineItems.find((i) => i.id === card.dataset.itemId);
      if (!item) return;
      item.priceOverride = overrideCheckbox.checked;
      renderLineItems(); // structure changes (calculator vs. manual field) — needs a full re-render
      updateTotals();
      saveDraftLocal();
      return;
    }
    const typeSelect = e.target.closest('[data-comp-field="type"]');
    if (!typeSelect) return;
    const card = e.target.closest('[data-item-id]');
    const compRow = e.target.closest('[data-comp-id]');
    const item = state.quotation.lineItems.find((i) => i.id === card.dataset.itemId);
    const comp = item && item.components.find((c) => c.id === compRow.dataset.compId);
    if (!comp) return;
    comp.type = typeSelect.value;
    renderLineItems(); // fixed vs. percent shows different fields (currency/rate) — needs a full re-render
    updateTotals();
    saveDraftLocal();
  });

  lineItemsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.quotation.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;

    if (e.target.closest('[data-pick-catalog]')) {
      // Manual-price mode pulls the catalog's selling price directly (the "price list"
      // use case for repeat items) instead of the cost build-up — whichever mode the
      // line is already in when you pick decides which one gets filled.
      CatalogModule.openPicker((catalogItem) => {
        item.description = catalogItem.description;
        item.itemCode = catalogItem.itemCode || '';
        if (item.priceOverride) {
          if (catalogItem.sellingPrice) {
            item.overridePrice = catalogItem.sellingPrice;
            if (catalogItem.sellingCurrency && catalogItem.sellingCurrency !== state.quotation.baseCurrency) {
              setSaveStatus('Pulled ' + catalogItem.sellingCurrency + ' ' + Core.fmt(catalogItem.sellingPrice) +
                ' as-is — quote currency is ' + state.quotation.baseCurrency + ', so double-check this price.', true);
            }
          } else {
            // This catalog item has no standalone selling price set — falling back to a
            // hard 0 would silently wipe out whatever price was already on the line, so
            // compute a stand-in from its cost + margin instead and flag it for review.
            const suggested = Pricing.computeLineItem({
              qty: 1, costPrice: catalogItem.costPrice, exchangeRate: 1, components: [],
              marginMethod: catalogItem.marginMethod, marginValue: catalogItem.marginValue
            }).unitSellingPrice;
            item.overridePrice = suggested;
            setSaveStatus('This catalog item has no default selling price set — used ' +
              (catalogItem.costCurrency || state.quotation.baseCurrency) + ' ' + Core.fmt(suggested) +
              ' computed from its cost + margin instead. Please double-check.', true);
          }
        } else {
          item.sourceCurrency = catalogItem.costCurrency;
          item.costPrice = catalogItem.costPrice;
          item.marginMethod = catalogItem.marginMethod;
          item.marginValue = catalogItem.marginValue;
        }
        renderLineItems(); updateTotals(); saveDraftLocal();
      });
      return;
    }
    if (e.target.closest('[data-add-comp]')) {
      item.components.push(blankComponent());
      renderLineItems(); updateTotals(); saveDraftLocal();
      return;
    }
    const removeComp = e.target.closest('[data-remove-comp]');
    if (removeComp) {
      const compRow = removeComp.closest('[data-comp-id]');
      item.components = item.components.filter((c) => c.id !== compRow.dataset.compId);
      renderLineItems(); updateTotals(); saveDraftLocal();
      return;
    }
    if (e.target.closest('[data-remove-item]')) {
      state.quotation.lineItems = state.quotation.lineItems.filter((i) => i.id !== item.id);
      renderLineItems(); updateTotals(); saveDraftLocal();
      return;
    }
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      const idx = state.quotation.lineItems.indexOf(item);
      const swapIdx = idx + (moveBtn.dataset.move === 'up' ? -1 : 1);
      if (swapIdx >= 0 && swapIdx < state.quotation.lineItems.length) {
        const items = state.quotation.lineItems;
        [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
        renderLineItems(); updateTotals(); saveDraftLocal();
      }
      return;
    }
    const marginBtn = e.target.closest('[data-margin-method]');
    if (marginBtn) {
      item.marginMethod = marginBtn.dataset.marginMethod;
      renderLineItems(); updateTotals(); saveDraftLocal();
    }
  });

  addLineItemBtn.addEventListener('click', () => {
    state.quotation.lineItems.push(blankLineItem());
    renderLineItems(); updateTotals(); saveDraftLocal();
  });

  // ---------- save / pdf / new ----------
  function setSaveStatus(text, isError) {
    saveStatusText.textContent = text;
    saveStatusText.classList.toggle('error', !!isError);
  }

  function companyCollection() {
    return Core.state.db.collection('companies').doc(Core.state.activeCompanyId).collection('quotations');
  }

  function buildFirestoreDoc() {
    const totals = Pricing.computeTotals(state.quotation);
    return {
      quoteNumber: state.quotation.quoteNumber,
      status: state.quotation.status,
      client: state.quotation.client,
      baseCurrency: state.quotation.baseCurrency,
      quoteDate: state.quotation.quoteDate,
      validUntil: state.quotation.validUntil,
      rfqRef: state.quotation.rfqRef || '',
      paymentTerms: state.quotation.paymentTerms || '',
      incoterms: state.quotation.incoterms || '',
      notes: state.quotation.notes,
      outputTaxPercent: state.quotation.outputTaxPercent,
      lineItems: state.quotation.lineItems,
      sentDate: state.quotation.sentDate || '',
      outcome: state.quotation.outcome || '',
      outcomeDate: state.quotation.outcomeDate || '',
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      // createdBy/createdAt are set once at creation (below) and never overwritten on
      // later saves, so "who started this" survives someone else editing and saving it.
      lastEditedBy: Core.state.user.uid,
      lastEditedByName: Core.state.profile.displayName || Core.state.user.email,
      lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  // Fixes the old app's double-save race: while a save is in flight the button is
  // disabled and re-clicks are ignored, so a slow connection can't fire two "create"
  // writes before the first one's response sets state.quotation.id.
  function saveQuotation() {
    if (state.saving) return;
    saveDraftLocal();
    if (!Core.state.db) {
      setSaveStatus('Not connected — see SETUP.md.', true);
      return;
    }
    state.saving = true;
    saveBtn.disabled = true;
    setSaveStatus('Saving…');
    const docData = buildFirestoreDoc();
    const colRef = companyCollection();
    const done = (ok, err) => {
      state.saving = false;
      saveBtn.disabled = false;
      setSaveStatus(ok ? 'Saved' : ('Save failed: ' + (err && err.message ? err.message : 'check your connection and permissions')), !ok);
    };
    if (state.quotation.id) {
      colRef.doc(state.quotation.id).set(docData, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      docData.createdBy = Core.state.user.uid;
      docData.createdByName = Core.state.profile.displayName || Core.state.user.email;
      docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const newRef = colRef.doc();
      newRef.set(docData)
        .then(() => { state.quotation.id = newRef.id; saveDraftLocal(); done(true); })
        .catch((err) => done(false, err));
    }
  }

  saveBtn.addEventListener('click', saveQuotation);

  downloadPdfBtn.addEventListener('click', () => {
    const totals = Pricing.computeTotals(state.quotation);
    QuotePdf.generateQuotationPdf(state.quotation, totals, Core.companyForPdf());
  });

  newQuoteBtn.addEventListener('click', () => {
    if (!confirm('Start a new quotation? Unsaved changes to the current one will be lost.')) return;
    state.quotation = blankQuotation();
    renderAll();
    saveDraftLocal();
    setSaveStatus('');
  });

  // ---------- history ----------
  function normalizeLoadedQuotation(doc) {
    return {
      id: doc.id,
      quoteNumber: doc.quoteNumber || generateQuoteNumber(),
      status: doc.status || 'draft',
      client: doc.client || { name: '', company: '', email: '', phone: '', address: '' },
      baseCurrency: doc.baseCurrency || 'ZMW',
      quoteDate: doc.quoteDate || Core.todayIso(),
      validUntil: doc.validUntil || '',
      rfqRef: doc.rfqRef || '',
      paymentTerms: doc.paymentTerms || '',
      incoterms: doc.incoterms || '',
      notes: doc.notes || '',
      outputTaxPercent: doc.outputTaxPercent || 0,
      sentDate: doc.sentDate || '',
      outcome: doc.outcome || '',
      outcomeDate: doc.outcomeDate || '',
      createdByName: doc.createdByName || '',
      lastEditedByName: doc.lastEditedByName || '',
      lineItems: (doc.lineItems || []).map((li) => Object.assign({}, li, {
        id: li.id || Core.uid(),
        components: (li.components || []).map((c) => Object.assign({}, c, { id: c.id || Core.uid() }))
      }))
    };
  }

  function attributionText(item) {
    const creator = item.createdByName || '';
    const editor = item.lastEditedByName || '';
    if (editor && editor !== creator) return 'by ' + (creator || '—') + ' · edited by ' + editor;
    return creator ? 'by ' + creator : '';
  }

  function renderHistory() {
    const q = (historySearchInput.value || '').trim().toLowerCase();
    const filtered = state.historyItems.filter((item) => {
      if (!q) return true;
      return (item.quoteNumber || '').toLowerCase().includes(q)
        || ((item.client && item.client.name) || '').toLowerCase().includes(q)
        || ((item.client && item.client.company) || '').toLowerCase().includes(q);
    });

    historyEmptyState.style.display = filtered.length ? 'none' : 'block';

    historyListEl.innerHTML = filtered.map((item) => {
      const tracking = trackingStatus(item);
      return `
      <div class="history-row" data-history-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.quoteNumber)} <span class="badge ${item.status}">${item.status}</span> <span class="badge tracking-${tracking}">${Core.escapeHtml(TRACKING_LABELS[tracking])}</span></div>
          <div class="history-sub">${Core.escapeHtml((item.client && item.client.name) || 'No client')} · ${Core.escapeHtml(item.quoteDate || '')}${attributionText(item) ? ' · ' + Core.escapeHtml(attributionText(item)) : ''}</div>
        </div>
        <div class="history-total">${item.baseCurrency} ${Core.fmt(item.grandTotal)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-view-history>View</button>
          <button type="button" class="text-btn" data-download-history>Download</button>
          <button type="button" class="text-btn" data-open-history>Edit</button>
          <button type="button" class="text-btn" data-convert-history>Convert to OA</button>
          <button type="button" class="text-btn" data-duplicate-history>Duplicate quote</button>
          <button type="button" class="text-btn danger" data-delete-history>Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  // Called by oa.js once a quote→OA conversion actually completes (not just attempted —
  // the confirm() may have been cancelled, or number assignment may have failed), since
  // converting to an order is the strongest signal a quote succeeded.
  function markQuoteWonIfUndecided(quoteId) {
    const item = state.historyItems.find((i) => i.id === quoteId);
    if (item && item.outcome) return; // already decided — don't overwrite Lost, etc.
    companyCollection().doc(quoteId).set({
      outcome: 'won',
      outcomeDate: Core.todayIso(),
      sentDate: (item && item.sentDate) || Core.todayIso(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
  }

  // Shared by the history "Open" button and Reports' follow-up list, so both land in
  // the same place with the same behavior.
  function openQuote(item) {
    state.quotation = normalizeLoadedQuotation(item);
    renderAll();
    switchView('editor');
    setSaveStatus('');
  }

  historyListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-history-id]');
    if (!row) return;
    const id = row.dataset.historyId;
    const item = state.historyItems.find((i) => i.id === id);
    if (!item) return;

    if (e.target.closest('[data-view-history]')) {
      const loaded = normalizeLoadedQuotation(item);
      QuotePdf.viewQuotationPdf(loaded, Pricing.computeTotals(loaded), Core.companyForPdf());
    } else if (e.target.closest('[data-download-history]')) {
      const loaded = normalizeLoadedQuotation(item);
      QuotePdf.generateQuotationPdf(loaded, Pricing.computeTotals(loaded), Core.companyForPdf());
    } else if (e.target.closest('[data-open-history]')) {
      openQuote(item);
    } else if (e.target.closest('[data-convert-history]')) {
      global.OAModule.startFromQuote(normalizeLoadedQuotation(item));
      document.getElementById('navAcknowledgementsBtn').click();
    } else if (e.target.closest('[data-duplicate-history]')) {
      const copy = normalizeLoadedQuotation(item);
      copy.id = null;
      copy.quoteNumber = generateQuoteNumber();
      copy.status = 'draft';
      state.quotation = copy;
      renderAll();
      switchView('editor');
      saveDraftLocal();
      setSaveStatus('Duplicated — not yet saved');
    } else if (e.target.closest('[data-delete-history]')) {
      if (!confirm(`Delete quotation ${item.quoteNumber}? This cannot be undone.`)) return;
      companyCollection().doc(id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  historySearchInput.addEventListener('input', renderHistory);

  // ---------- view switching (editor / history sub-nav) ----------
  function switchView(view) {
    editorView.style.display = view === 'editor' ? '' : 'none';
    historyView.style.display = view === 'history' ? '' : 'none';
    navEditorBtn.classList.toggle('active', view === 'editor');
    navHistoryBtn.classList.toggle('active', view === 'history');
  }
  navEditorBtn.addEventListener('click', () => switchView('editor'));
  navHistoryBtn.addEventListener('click', () => switchView('history'));

  // ---------- company-scoped Firestore subscription ----------
  const historyChangeCallbacks = [];
  function onHistoryChange(cb) { historyChangeCallbacks.push(cb); }

  Core.onCompanyChange(() => {
    if (state.historyUnsub) { state.historyUnsub(); state.historyUnsub = null; }
    state.historyItems = [];
    renderHistory();
    state.historyUnsub = companyCollection()
      .orderBy('updatedAt', 'desc')
      .onSnapshot((snap) => {
        state.historyItems = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderHistory();
        historyChangeCallbacks.forEach((cb) => cb(state.historyItems));
      }, (err) => {
        setSaveStatus('History sync error: ' + err.message, true);
      });
  });

  // ---------- boot ----------
  renderAll();
  renderHistory();
  switchView('editor');

  global.QuotesModule = { blankQuotation, renderAll, saveDraftLocal, openQuote, onHistoryChange, trackingStatus, markQuoteWonIfUndecided, state };
})(window);
