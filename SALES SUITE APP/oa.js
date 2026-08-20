// Order Acknowledgement editor + history. Numbers are assigned per-company
// (CL-/CS-/LS- + running counter, starting at 1001) via a Firestore transaction on
// companies/{companyId}.oaCounter, so two people issuing OAs at once never collide.
(function (global) {
  const Core = global.Core;
  const DRAFT_KEY = 'sales-suite-oa-draft-v1';
  const DEFAULT_PREFIX = { 'chemsol-limited': 'CL', 'chemsol-scientific': 'CS', 'labmall-scientific': 'LS' };

  const el = (id) => document.getElementById(id);

  const editorView = el('oaEditorView');
  const historyView = el('oaHistoryView');
  const navEditorBtn = el('oaNavEditorBtn');
  const navHistoryBtn = el('oaNavHistoryBtn');

  const oaNumberDisplay = el('oaNumberDisplay');
  const statusToggle = el('oaStatusToggle');
  const sourceQuoteLine = el('oaSourceQuoteLine');

  const dateIssuedInput = el('oaDateIssuedInput');
  const customerPoRefInput = el('oaCustomerPoRefInput');
  const salesRepInput = el('oaSalesRepInput');
  const acknowledgedByInput = el('oaAcknowledgedByInput');
  const contactInput = el('oaContactInput');

  const billToNameInput = el('oaBillToNameInput');
  const billToAddressInput = el('oaBillToAddressInput');
  const billToPhoneInput = el('oaBillToPhoneInput');
  const shipToNameInput = el('oaShipToNameInput');
  const shipToAddressInput = el('oaShipToAddressInput');
  const shipToAttnInput = el('oaShipToAttnInput');
  const sameAsBillToBtn = el('oaSameAsBillToBtn');

  const lineItemsContainer = el('oaLineItemsContainer');
  const addLineItemBtn = el('oaAddLineItemBtn');

  const paymentTermsInput = el('oaPaymentTermsInput');
  const incotermsInput = el('oaIncotermsInput');
  const currencyInput = el('oaCurrencyInput');
  const specialInstructionsInput = el('oaSpecialInstructionsInput');
  const notesInput = el('oaNotesInput');

  const vatInput = el('oaVatInput');
  const subtotalDisplay = el('oaSubtotalDisplay');
  const vatAmountDisplay = el('oaVatAmountDisplay');
  const totalDisplay = el('oaTotalDisplay');

  const saveBtn = el('oaSaveBtn');
  const downloadPdfBtn = el('oaDownloadPdfBtn');
  const newBtn = el('oaNewBtn');
  const saveStatusText = el('oaSaveStatusText');

  const historySearchInput = el('oaHistorySearchInput');
  const historyListEl = el('oaHistoryList');
  const historyEmptyState = el('oaHistoryEmptyState');

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveDraftLocal() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.oa));
  }

  function blankLineItem() {
    return { id: Core.uid(), description: '', itemCode: '', qty: 1, unit: 'Each', unitPrice: 0, leadTime: '' };
  }

  function blankOa(oaNumber) {
    const displayName = (Core.state.profile && Core.state.profile.displayName) || (Core.state.user && Core.state.user.email) || '';
    return {
      id: null,
      oaNumber: oaNumber,
      status: 'draft',
      sourceQuoteId: null,
      sourceQuoteNumber: null,
      customerPoRef: '',
      salesRep: displayName,
      dateIssued: Core.todayIso(),
      acknowledgedBy: displayName,
      contact: (Core.state.user && Core.state.user.email) || '',
      billTo: { name: '', address: '', phone: '' },
      shipTo: { name: '', address: '', attn: '' },
      lineItems: [],
      paymentTerms: '',
      incoterms: '',
      currency: 'ZMW',
      specialInstructions: '',
      notes: '',
      vatPercent: 0
    };
  }

  const state = {
    oa: loadDraft() || null, // resolved to a real (numbered) OA on first render via ensureLoaded()
    historyItems: [],
    historyUnsub: null,
    saving: false,
    assigning: false
  };

  function defaultPrefix() {
    return DEFAULT_PREFIX[Core.state.activeCompanyId] || 'OA';
  }

  // Atomically increments companies/{companyId}.oaCounter and returns "PREFIX-<n>".
  function assignOaNumber() {
    const companyRef = Core.state.db.collection('companies').doc(Core.state.activeCompanyId);
    return Core.state.db.runTransaction((tx) => tx.get(companyRef).then((doc) => {
      const data = doc.exists ? doc.data() : {};
      const prefix = data.oaPrefix || defaultPrefix();
      const next = (Number(data.oaCounter) || 1000) + 1;
      tx.set(companyRef, { oaCounter: next, oaPrefix: prefix }, { merge: true });
      return prefix + '-' + next;
    }));
  }

  function newBlankAndRender() {
    if (state.assigning) return;
    state.assigning = true;
    setSaveStatus('Assigning acknowledgement number…');
    newBtn.disabled = true;
    assignOaNumber()
      .then((number) => {
        state.oa = blankOa(number);
        saveDraftLocal();
        renderAll();
        setSaveStatus('');
      })
      .catch((err) => setSaveStatus('Could not assign a number: ' + err.message, true))
      .finally(() => { state.assigning = false; newBtn.disabled = false; });
  }

  // Called from quotes.js when the user hits "To OA" on a saved quotation.
  function startFromQuote(quote) {
    if (state.assigning) return;
    if (!confirm('Convert quotation ' + quote.quoteNumber + ' into a new Acknowledgement? Any unsaved Acknowledgement changes will be lost.')) return;
    state.assigning = true;
    setSaveStatus('Assigning acknowledgement number…');
    assignOaNumber()
      .then((number) => {
        const oa = blankOa(number);
        oa.sourceQuoteId = quote.id;
        oa.sourceQuoteNumber = quote.quoteNumber;
        oa.currency = quote.baseCurrency || 'ZMW';
        oa.notes = quote.notes || '';
        oa.billTo = {
          name: quote.client.company || quote.client.name || '',
          address: quote.client.address || '',
          phone: quote.client.phone || ''
        };
        oa.shipTo = Object.assign({}, oa.billTo, { attn: '' });
        oa.lineItems = (quote.lineItems || []).map((li) => {
          const computed = Pricing.computeLineItem(li);
          return {
            id: Core.uid(),
            description: li.description || '',
            itemCode: '',
            qty: Number(li.qty) || 0,
            unit: 'Each',
            unitPrice: computed.unitSellingPrice,
            leadTime: ''
          };
        });
        state.oa = oa;
        saveDraftLocal();
        renderAll();
        switchView('editor');
        setSaveStatus('Converted from ' + quote.quoteNumber + ' — review line items, then Save.');
      })
      .catch((err) => setSaveStatus('Could not assign a number: ' + err.message, true))
      .finally(() => { state.assigning = false; });
  }

  function ensureLoaded() {
    if (!state.oa) newBlankAndRender();
  }

  // ---------- rendering ----------
  function renderHeader() {
    const oa = state.oa;
    oaNumberDisplay.textContent = oa.oaNumber || 'Not yet issued';
    [...statusToggle.children].forEach((btn) => btn.classList.toggle('active', btn.dataset.status === oa.status));
    sourceQuoteLine.textContent = oa.sourceQuoteNumber ? ('Converted from quotation ' + oa.sourceQuoteNumber) : '';
    sourceQuoteLine.style.display = oa.sourceQuoteNumber ? '' : 'none';

    dateIssuedInput.value = oa.dateIssued || '';
    customerPoRefInput.value = oa.customerPoRef || '';
    salesRepInput.value = oa.salesRep || '';
    acknowledgedByInput.value = oa.acknowledgedBy || '';
    contactInput.value = oa.contact || '';

    billToNameInput.value = oa.billTo.name || '';
    billToAddressInput.value = oa.billTo.address || '';
    billToPhoneInput.value = oa.billTo.phone || '';
    shipToNameInput.value = oa.shipTo.name || '';
    shipToAddressInput.value = oa.shipTo.address || '';
    shipToAttnInput.value = oa.shipTo.attn || '';

    paymentTermsInput.value = oa.paymentTerms || '';
    incotermsInput.value = oa.incoterms || '';
    currencyInput.value = oa.currency || '';
    specialInstructionsInput.value = oa.specialInstructions || '';
    notesInput.value = oa.notes || '';
    vatInput.value = oa.vatPercent || 0;
  }

  function renderLineItemCard(item, index, total) {
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

        <input type="text" class="li-desc" data-field="description" placeholder="Product description" value="${Core.escapeHtml(item.description)}" />

        <div class="li-grid oa">
          <label>Item code<input type="text" data-field="itemCode" value="${Core.escapeHtml(item.itemCode)}" /></label>
          <label>Qty<input type="number" min="0" step="1" data-field="qty" value="${item.qty}" /></label>
          <label>Unit<input type="text" data-field="unit" value="${Core.escapeHtml(item.unit)}" /></label>
          <label>Unit price<input type="number" min="0" step="0.01" data-field="unitPrice" value="${item.unitPrice}" /></label>
          <label>Lead time<input type="text" data-field="leadTime" placeholder="3-4 weeks" value="${Core.escapeHtml(item.leadTime)}" /></label>
        </div>

        <div class="li-summary-row total"><span>Line total</span><strong>${Core.escapeHtml(state.oa.currency)} ${Core.fmt(Pricing.computeOaLineTotal(item))}</strong></div>
      </div>`;
  }

  function renderLineItems() {
    const items = state.oa.lineItems;
    lineItemsContainer.innerHTML = items.length
      ? items.map((item, i) => renderLineItemCard(item, i, items.length)).join('')
      : '<p class="empty-state">No line items yet — add your first one.</p>';
  }

  function updateTotals() {
    const totals = Pricing.computeOaTotals(state.oa);
    subtotalDisplay.textContent = `${state.oa.currency} ${Core.fmt(totals.subtotal)}`;
    vatAmountDisplay.textContent = `${state.oa.currency} ${Core.fmt(totals.vatAmount)}`;
    totalDisplay.textContent = `${state.oa.currency} ${Core.fmt(totals.total)}`;
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
    state.oa.status = btn.dataset.status;
    renderHeader();
    saveDraftLocal();
  });

  function bindText(inputEl, path) {
    inputEl.addEventListener('input', () => {
      const keys = path.split('.');
      let obj = state.oa;
      while (keys.length > 1) { obj = obj[keys.shift()]; }
      obj[keys[0]] = inputEl.value;
      saveDraftLocal();
    });
  }
  bindText(dateIssuedInput, 'dateIssued');
  bindText(customerPoRefInput, 'customerPoRef');
  bindText(salesRepInput, 'salesRep');
  bindText(acknowledgedByInput, 'acknowledgedBy');
  bindText(contactInput, 'contact');
  bindText(billToNameInput, 'billTo.name');
  bindText(billToAddressInput, 'billTo.address');
  bindText(billToPhoneInput, 'billTo.phone');
  bindText(shipToNameInput, 'shipTo.name');
  bindText(shipToAddressInput, 'shipTo.address');
  bindText(shipToAttnInput, 'shipTo.attn');
  bindText(paymentTermsInput, 'paymentTerms');
  bindText(incotermsInput, 'incoterms');
  bindText(specialInstructionsInput, 'specialInstructions');
  bindText(notesInput, 'notes');

  currencyInput.addEventListener('input', () => {
    state.oa.currency = currencyInput.value.toUpperCase();
    updateTotals();
    saveDraftLocal();
  });
  vatInput.addEventListener('input', () => {
    state.oa.vatPercent = Number(vatInput.value) || 0;
    updateTotals();
    saveDraftLocal();
  });

  sameAsBillToBtn.addEventListener('click', () => {
    state.oa.shipTo = { name: state.oa.billTo.name, address: state.oa.billTo.address, attn: state.oa.shipTo.attn || '' };
    renderHeader();
    saveDraftLocal();
  });

  // ---------- line item events ----------
  lineItemsContainer.addEventListener('input', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.oa.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;
    const fieldTarget = e.target.closest('[data-field]');
    if (!fieldTarget) return;
    const field = fieldTarget.dataset.field;
    item[field] = (field === 'qty' || field === 'unitPrice') ? Number(fieldTarget.value) || 0 : fieldTarget.value;
    const totalEl = card.querySelector('.li-summary-row.total strong');
    if (totalEl) totalEl.textContent = `${state.oa.currency} ${Core.fmt(Pricing.computeOaLineTotal(item))}`;
    updateTotals();
    saveDraftLocal();
  });

  lineItemsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.oa.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;

    if (e.target.closest('[data-remove-item]')) {
      state.oa.lineItems = state.oa.lineItems.filter((i) => i.id !== item.id);
      renderLineItems(); updateTotals(); saveDraftLocal();
      return;
    }
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      const idx = state.oa.lineItems.indexOf(item);
      const swapIdx = idx + (moveBtn.dataset.move === 'up' ? -1 : 1);
      if (swapIdx >= 0 && swapIdx < state.oa.lineItems.length) {
        const items = state.oa.lineItems;
        [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
        renderLineItems(); updateTotals(); saveDraftLocal();
      }
    }
  });

  addLineItemBtn.addEventListener('click', () => {
    state.oa.lineItems.push(blankLineItem());
    renderLineItems(); updateTotals(); saveDraftLocal();
  });

  // ---------- save / pdf / new ----------
  function setSaveStatus(text, isError) {
    saveStatusText.textContent = text;
    saveStatusText.classList.toggle('error', !!isError);
  }

  function companyCollection() {
    return Core.state.db.collection('companies').doc(Core.state.activeCompanyId).collection('acknowledgements');
  }

  function buildFirestoreDoc() {
    const totals = Pricing.computeOaTotals(state.oa);
    const oa = state.oa;
    return {
      oaNumber: oa.oaNumber,
      status: oa.status,
      sourceQuoteId: oa.sourceQuoteId,
      sourceQuoteNumber: oa.sourceQuoteNumber,
      customerPoRef: oa.customerPoRef,
      salesRep: oa.salesRep,
      dateIssued: oa.dateIssued,
      acknowledgedBy: oa.acknowledgedBy,
      contact: oa.contact,
      billTo: oa.billTo,
      shipTo: oa.shipTo,
      lineItems: oa.lineItems,
      paymentTerms: oa.paymentTerms,
      incoterms: oa.incoterms,
      currency: oa.currency,
      specialInstructions: oa.specialInstructions,
      notes: oa.notes,
      vatPercent: oa.vatPercent,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      createdBy: Core.state.user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function saveOa() {
    if (state.saving) return;
    saveDraftLocal();
    if (!Core.state.db) {
      setSaveStatus('Not connected — see SETUP.md.', true);
      return;
    }
    if (!state.oa.customerPoRef) {
      setSaveStatus('Add the customer PO reference before saving.', true);
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
    if (state.oa.id) {
      colRef.doc(state.oa.id).set(docData, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const newRef = colRef.doc();
      newRef.set(docData)
        .then(() => { state.oa.id = newRef.id; saveDraftLocal(); done(true); })
        .catch((err) => done(false, err));
    }
  }
  saveBtn.addEventListener('click', saveOa);

  downloadPdfBtn.addEventListener('click', () => {
    const totals = Pricing.computeOaTotals(state.oa);
    OaPdf.generateOaPdf(state.oa, totals, Core.state.company || {});
  });

  newBtn.addEventListener('click', () => {
    if (!confirm('Start a new Acknowledgement? Unsaved changes to the current one will be lost.')) return;
    newBlankAndRender();
  });

  // ---------- history ----------
  function normalizeLoaded(doc) {
    return Object.assign(blankOa(doc.oaNumber), doc, {
      id: doc.id,
      billTo: doc.billTo || { name: '', address: '', phone: '' },
      shipTo: doc.shipTo || { name: '', address: '', attn: '' },
      lineItems: (doc.lineItems || []).map((li) => Object.assign({}, li, { id: li.id || Core.uid() }))
    });
  }

  function renderHistory() {
    const q = (historySearchInput.value || '').trim().toLowerCase();
    const filtered = state.historyItems.filter((item) => {
      if (!q) return true;
      return (item.oaNumber || '').toLowerCase().includes(q)
        || (item.customerPoRef || '').toLowerCase().includes(q)
        || ((item.billTo && item.billTo.name) || '').toLowerCase().includes(q);
    });

    historyEmptyState.style.display = filtered.length ? 'none' : 'block';

    historyListEl.innerHTML = filtered.map((item) => `
      <div class="history-row" data-history-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.oaNumber)} <span class="badge ${item.status}">${item.status}</span></div>
          <div class="history-sub">${Core.escapeHtml((item.billTo && item.billTo.name) || 'No customer')} · PO ${Core.escapeHtml(item.customerPoRef || '—')} · ${Core.escapeHtml(item.dateIssued || '')}</div>
        </div>
        <div class="history-total">${item.currency} ${Core.fmt(item.total)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-open-history>Open</button>
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
      state.oa = normalizeLoaded(item);
      saveDraftLocal();
      renderAll();
      switchView('editor');
      setSaveStatus('');
    } else if (e.target.closest('[data-delete-history]')) {
      if (!confirm(`Delete acknowledgement ${item.oaNumber}? This cannot be undone.`)) return;
      companyCollection().doc(id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  historySearchInput.addEventListener('input', renderHistory);

  // ---------- view switching ----------
  function switchView(view) {
    editorView.style.display = view === 'editor' ? '' : 'none';
    historyView.style.display = view === 'history' ? '' : 'none';
    navEditorBtn.classList.toggle('active', view === 'editor');
    navHistoryBtn.classList.toggle('active', view === 'history');
  }
  navEditorBtn.addEventListener('click', () => switchView('editor'));
  navHistoryBtn.addEventListener('click', () => switchView('history'));

  // ---------- company-scoped Firestore subscription ----------
  let lastCompanyId = null;
  Core.onCompanyChange((companyId) => {
    if (state.historyUnsub) { state.historyUnsub(); state.historyUnsub = null; }
    state.historyItems = [];
    renderHistory();
    // Switching to a *different* company mid-edit doesn't make sense (OA numbers/prefixes
    // are per-company) — but don't discard a locally-saved draft on the very first load.
    if (lastCompanyId !== null && lastCompanyId !== companyId) state.oa = null;
    lastCompanyId = companyId;
    if (state.oa) renderAll(); else ensureLoaded(); // ensureLoaded renders once a number is assigned
    state.historyUnsub = companyCollection()
      .orderBy('updatedAt', 'desc')
      .onSnapshot((snap) => {
        state.historyItems = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderHistory();
      }, (err) => setSaveStatus('History sync error: ' + err.message, true));
  });

  switchView('editor');
  renderHistory();

  global.OAModule = { startFromQuote, state };
})(window);
