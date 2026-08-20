// Quotation editor + history. Scoped to Core.state.activeCompanyId — re-subscribes
// whenever the admin switches company. Ports app.js from the old Quotation Builder App,
// with two fixes: a save-in-flight guard (prevents the old double-save race) and a
// visible error on save failure instead of a silently-stuck button.
(function (global) {
  const Core = global.Core;
  const NUMERIC_FIELDS = ['qty', 'exchangeRate', 'costPrice', 'marginValue'];
  const DRAFT_KEY = 'sales-suite-quote-draft-v1';

  const el = (id) => document.getElementById(id);

  const editorView = el('quoteEditorView');
  const historyView = el('quoteHistoryView');
  const navEditorBtn = el('quoteNavEditorBtn');
  const navHistoryBtn = el('quoteNavHistoryBtn');

  const quoteNumberDisplay = el('quoteNumberDisplay');
  const statusToggle = el('quoteStatusToggle');
  const quoteDateInput = el('quoteDateInput');
  const validUntilInput = el('quoteValidUntilInput');
  const baseCurrencySelect = el('quoteBaseCurrencySelect');
  const clientNameInput = el('quoteClientNameInput');
  const clientCompanyInput = el('quoteClientCompanyInput');
  const clientEmailInput = el('quoteClientEmailInput');
  const clientPhoneInput = el('quoteClientPhoneInput');
  const clientAddressInput = el('quoteClientAddressInput');
  const notesInput = el('quoteNotesInput');

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
      notes: '',
      outputTaxPercent: 0,
      lineItems: []
    };
  }

  function blankLineItem() {
    return {
      id: Core.uid(),
      description: '',
      qty: 1,
      sourceCurrency: state.quotation.baseCurrency || 'ZMW',
      exchangeRate: 1,
      costPrice: 0,
      components: [],
      marginMethod: 'margin',
      marginValue: 0
    };
  }

  function blankComponent() {
    return { id: Core.uid(), label: '', type: 'fixed', value: 0 };
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
    quoteDateInput.value = state.quotation.quoteDate || '';
    validUntilInput.value = state.quotation.validUntil || '';
    baseCurrencySelect.value = state.quotation.baseCurrency || 'ZMW';
    clientNameInput.value = state.quotation.client.name || '';
    clientCompanyInput.value = state.quotation.client.company || '';
    clientEmailInput.value = state.quotation.client.email || '';
    clientPhoneInput.value = state.quotation.client.phone || '';
    clientAddressInput.value = state.quotation.client.address || '';
    notesInput.value = state.quotation.notes || '';
    outputTaxInput.value = state.quotation.outputTaxPercent || 0;
  }

  // ---------- rendering: line items ----------
  function renderComputedHtml(item) {
    const c = Pricing.computeLineItem(item);
    const currency = state.quotation.baseCurrency;
    const rows = c.breakdown.map((b) => `
      <div class="li-breakdown-row">
        <span>${Core.escapeHtml(b.label)}</span>
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
    const comps = (item.components || []).map((c) => `
      <div class="comp-row" data-comp-id="${c.id}">
        <input type="text" data-comp-field="label" value="${Core.escapeHtml(c.label)}" placeholder="Freight, import duty, DG surcharge..." />
        <select data-comp-field="type">
          <option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>Fixed amount</option>
          <option value="percent" ${c.type === 'percent' ? 'selected' : ''}>% of running cost</option>
        </select>
        <input type="number" step="0.01" data-comp-field="value" value="${c.value}" />
        <button type="button" class="icon-btn" data-remove-comp aria-label="Remove component">✕</button>
      </div>`).join('');

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
  notesInput.addEventListener('input', () => { state.quotation.notes = notesInput.value; saveDraftLocal(); });
  outputTaxInput.addEventListener('input', () => {
    state.quotation.outputTaxPercent = Number(outputTaxInput.value) || 0;
    updateTotals();
    saveDraftLocal();
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
      comp[field] = field === 'value' ? Number(compFieldTarget.value) || 0 : compFieldTarget.value;
      updateComputedOnly(item.id);
      updateTotals();
      saveDraftLocal();
    }
  });

  lineItemsContainer.addEventListener('change', (e) => {
    const typeSelect = e.target.closest('[data-comp-field="type"]');
    if (!typeSelect) return;
    const card = e.target.closest('[data-item-id]');
    const compRow = e.target.closest('[data-comp-id]');
    const item = state.quotation.lineItems.find((i) => i.id === card.dataset.itemId);
    const comp = item && item.components.find((c) => c.id === compRow.dataset.compId);
    if (!comp) return;
    comp.type = typeSelect.value;
    updateComputedOnly(item.id);
    updateTotals();
    saveDraftLocal();
  });

  lineItemsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.quotation.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;

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
      notes: state.quotation.notes,
      outputTaxPercent: state.quotation.outputTaxPercent,
      lineItems: state.quotation.lineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      createdBy: Core.state.user.uid,
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
    QuotePdf.generateQuotationPdf(state.quotation, totals, Core.state.company || {});
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
      notes: doc.notes || '',
      outputTaxPercent: doc.outputTaxPercent || 0,
      lineItems: (doc.lineItems || []).map((li) => Object.assign({}, li, {
        id: li.id || Core.uid(),
        components: (li.components || []).map((c) => Object.assign({}, c, { id: c.id || Core.uid() }))
      }))
    };
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

    historyListEl.innerHTML = filtered.map((item) => `
      <div class="history-row" data-history-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.quoteNumber)} <span class="badge ${item.status}">${item.status}</span></div>
          <div class="history-sub">${Core.escapeHtml((item.client && item.client.name) || 'No client')} · ${Core.escapeHtml(item.quoteDate || '')}</div>
        </div>
        <div class="history-total">${item.baseCurrency} ${Core.fmt(item.grandTotal)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-open-history>Open</button>
          <button type="button" class="text-btn" data-convert-history>To OA</button>
          <button type="button" class="text-btn" data-duplicate-history>Duplicate</button>
          <button type="button" class="text-btn danger" data-delete-history>Delete</button>
        </div>
      </div>`).join('');
  }

  historyListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-history-id]');
    if (!row) return;
    const id = row.dataset.historyId;
    const item = state.historyItems.find((i) => i.id === id);
    if (!item) return;

    if (e.target.closest('[data-open-history]')) {
      state.quotation = normalizeLoadedQuotation(item);
      renderAll();
      switchView('editor');
      setSaveStatus('');
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
  Core.onCompanyChange(() => {
    if (state.historyUnsub) { state.historyUnsub(); state.historyUnsub = null; }
    state.historyItems = [];
    renderHistory();
    state.historyUnsub = companyCollection()
      .orderBy('updatedAt', 'desc')
      .onSnapshot((snap) => {
        state.historyItems = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderHistory();
      }, (err) => {
        setSaveStatus('History sync error: ' + err.message, true);
      });
  });

  // ---------- boot ----------
  renderAll();
  renderHistory();
  switchView('editor');

  global.QuotesModule = { blankQuotation, renderAll, saveDraftLocal, state };
})(window);
