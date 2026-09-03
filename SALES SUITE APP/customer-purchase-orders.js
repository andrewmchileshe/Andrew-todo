// Customer Purchase Order editor + history — a record of a PO a customer sent us,
// entered manually. Separate from Acknowledgements: this tracks the customer's own PO
// document/reference, and can optionally link to the Quote and/or Acknowledgement it
// relates to for traceability, without being tied to either. Company-scoped like
// quotations/acknowledgements. Numbers are assigned per-company (CPO-CL-/CPO-CS-/CPO-LS-
// + running counter, starting at 1001), mirroring Acknowledgement numbering.
(function (global) {
  const Core = global.Core;
  const DRAFT_KEY = 'sales-suite-cpo-draft-v1';
  const DEFAULT_PREFIX = { 'chemsol-limited': 'CPO-CL', 'chemsol-scientific': 'CPO-CS', 'labmall-scientific': 'CPO-LS' };
  const STATUS_LABELS = { received: 'Received', 'in-progress': 'In Progress', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };

  const el = (id) => document.getElementById(id);

  const editorView = el('cpoEditorView');
  const historyView = el('cpoHistoryView');
  const navEditorBtn = el('cpoNavEditorBtn');
  const navHistoryBtn = el('cpoNavHistoryBtn');

  const cpoNumberDisplay = el('cpoNumberDisplay');
  const statusSelect = el('cpoStatusSelect');
  const attributionTextEl = el('cpoAttributionText');

  const customerPoNumberInput = el('cpoCustomerPoNumberInput');
  const poDateInput = el('cpoPoDateInput');
  const receivedDateInput = el('cpoReceivedDateInput');
  const currencyInput = el('cpoCurrencyInput');
  const exchangeRateInput = el('cpoExchangeRateInput');

  const pickCustomerBtn = el('cpoPickCustomerBtn');
  const clientNameInput = el('cpoClientNameInput');
  const clientCompanyInput = el('cpoClientCompanyInput');
  const clientEmailInput = el('cpoClientEmailInput');
  const clientPhoneInput = el('cpoClientPhoneInput');

  const linkedQuoteNumberInput = el('cpoLinkedQuoteNumberInput');
  const linkedOaNumberInput = el('cpoLinkedOaNumberInput');

  const lineItemsContainer = el('cpoLineItemsContainer');
  const addLineItemBtn = el('cpoAddLineItemBtn');

  const subtotalDisplay = el('cpoSubtotalDisplay');
  const kwachaValueDisplay = el('cpoKwachaValueDisplay');
  const notesInput = el('cpoNotesInput');

  const saveBtn = el('cpoSaveBtn');
  const newBtn = el('cpoNewBtn');
  const saveStatusText = el('cpoSaveStatusText');

  const historySearchInput = el('cpoHistorySearchInput');
  const historyStatusTabs = el('cpoHistoryStatusTabs');
  const historyListEl = el('cpoHistoryList');
  const historyEmptyState = el('cpoHistoryEmptyState');

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveDraftLocal() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.cpo));
  }

  function blankLineItem() {
    return { id: Core.uid(), description: '', itemCode: '', qty: 1, unit: 'Each', unitPrice: 0 };
  }

  function blankCpo(cpoNumber) {
    const displayName = (Core.state.profile && Core.state.profile.displayName) || (Core.state.user && Core.state.user.email) || '';
    return {
      id: null,
      cpoNumber: cpoNumber,
      status: 'received',
      customerPoNumber: '',
      poDate: Core.todayIso(),
      receivedDate: Core.todayIso(),
      currency: 'ZMW',
      exchangeRateToKwacha: 1,
      client: { name: '', company: '', email: '', phone: '' },
      linkedQuoteNumber: '',
      linkedOaNumber: '',
      lineItems: [],
      notes: '',
      createdByName: displayName,
      lastEditedByName: displayName
    };
  }

  const state = {
    cpo: loadDraft() || null,
    historyItems: [],
    historyUnsub: null,
    historyStatusFilter: 'all',
    saving: false,
    assigning: false,
    lastSavedJson: null
  };
  if (state.cpo && !state.cpo.id && state.cpo.poDate !== Core.todayIso()) {
    // Only nudges the "date received" side — poDate is whatever's on the customer's own
    // document, so it shouldn't silently move.
    state.cpo.receivedDate = Core.todayIso();
  }
  if (state.cpo && state.cpo.id) state.lastSavedJson = JSON.stringify(state.cpo);

  function isUnsaved() {
    return state.lastSavedJson === null || state.lastSavedJson !== JSON.stringify(state.cpo);
  }
  global.addEventListener('beforeunload', (e) => {
    if (!state.saving) return;
    e.preventDefault();
    e.returnValue = '';
  });

  const historyChangeCallbacks = [];
  function onHistoryChange(cb) { historyChangeCallbacks.push(cb); }

  function defaultPrefix() {
    return DEFAULT_PREFIX[Core.state.activeCompanyId] || 'CPO';
  }

  function assignCpoNumber() {
    const companyRef = Core.state.db.collection('companies').doc(Core.state.activeCompanyId);
    return Core.state.db.runTransaction((tx) => tx.get(companyRef).then((doc) => {
      const data = doc.exists ? doc.data() : {};
      const prefix = data.cpoPrefix || defaultPrefix();
      const next = (Number(data.cpoCounter) || 1000) + 1;
      tx.set(companyRef, { cpoCounter: next, cpoPrefix: prefix }, { merge: true });
      return prefix + '-' + next;
    }));
  }

  function newBlankAndRender() {
    if (state.assigning) return;
    state.assigning = true;
    setSaveStatus('Assigning reference number…');
    newBtn.disabled = true;
    assignCpoNumber()
      .then((number) => {
        state.cpo = blankCpo(number);
        state.lastSavedJson = null;
        saveDraftLocal();
        renderAll();
        setSaveStatus('');
      })
      .catch((err) => setSaveStatus('Could not assign a number: ' + err.message, true))
      .finally(() => { state.assigning = false; newBtn.disabled = false; });
  }

  function ensureLoaded() {
    if (!state.cpo) newBlankAndRender();
  }

  // ---------- rendering ----------
  function renderHeader() {
    const cpo = state.cpo;
    cpoNumberDisplay.textContent = cpo.cpoNumber || 'Not yet issued';
    statusSelect.value = cpo.status || 'received';
    const attribution = attributionText(cpo);
    attributionTextEl.textContent = attribution;
    attributionTextEl.style.display = attribution ? '' : 'none';

    customerPoNumberInput.value = cpo.customerPoNumber || '';
    poDateInput.value = cpo.poDate || '';
    receivedDateInput.value = cpo.receivedDate || '';
    currencyInput.value = cpo.currency || 'ZMW';
    exchangeRateInput.value = cpo.exchangeRateToKwacha != null ? cpo.exchangeRateToKwacha : 1;

    clientNameInput.value = cpo.client.name || '';
    clientCompanyInput.value = cpo.client.company || '';
    clientEmailInput.value = cpo.client.email || '';
    clientPhoneInput.value = cpo.client.phone || '';

    linkedQuoteNumberInput.value = cpo.linkedQuoteNumber || '';
    linkedOaNumberInput.value = cpo.linkedOaNumber || '';

    notesInput.value = cpo.notes || '';
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

        <input type="text" class="li-desc" data-field="description" placeholder="Item description" value="${Core.escapeHtml(item.description)}" />
        <button type="button" class="text-btn" data-pick-catalog>Pick from catalog</button>

        <div class="li-grid oa">
          <label>Item code<input type="text" data-field="itemCode" value="${Core.escapeHtml(item.itemCode)}" /></label>
          <label>Qty<input type="number" min="0" step="1" data-field="qty" value="${item.qty}" /></label>
          <label>Unit<input type="text" data-field="unit" value="${Core.escapeHtml(item.unit)}" /></label>
          <label>Unit price<input type="number" min="0" step="0.01" data-field="unitPrice" value="${item.unitPrice}" /></label>
        </div>

        <div class="li-summary-row total"><span>Line total</span><strong>${Core.escapeHtml(state.cpo.currency)} ${Core.fmt(Pricing.computePoLineTotal(item))}</strong></div>
      </div>`;
  }

  function renderLineItems() {
    const items = state.cpo.lineItems;
    lineItemsContainer.innerHTML = items.length
      ? items.map((item, i) => renderLineItemCard(item, i, items.length)).join('')
      : '<p class="empty-state">No line items yet — add your first one.</p>';
  }

  function updateTotals() {
    const totals = Pricing.computePoTotals(state.cpo);
    subtotalDisplay.textContent = `${state.cpo.currency} ${Core.fmt(totals.subtotal)}`;
    kwachaValueDisplay.textContent = `ZMW ${Core.fmt(totals.kwachaValue)}`;
    return totals;
  }

  function renderAll() {
    renderHeader();
    renderLineItems();
    updateTotals();
  }

  // ---------- header events ----------
  statusSelect.addEventListener('change', () => { state.cpo.status = statusSelect.value; saveDraftLocal(); });

  function bindText(inputEl, field) {
    inputEl.addEventListener('input', () => { state.cpo[field] = inputEl.value; saveDraftLocal(); });
  }
  bindText(customerPoNumberInput, 'customerPoNumber');
  bindText(poDateInput, 'poDate');
  bindText(receivedDateInput, 'receivedDate');
  bindText(linkedQuoteNumberInput, 'linkedQuoteNumber');
  bindText(linkedOaNumberInput, 'linkedOaNumber');
  bindText(notesInput, 'notes');

  currencyInput.addEventListener('input', () => {
    state.cpo.currency = currencyInput.value.toUpperCase();
    renderLineItems();
    updateTotals();
    saveDraftLocal();
  });
  exchangeRateInput.addEventListener('input', () => {
    state.cpo.exchangeRateToKwacha = Number(exchangeRateInput.value) || 1;
    updateTotals();
    saveDraftLocal();
  });

  clientNameInput.addEventListener('input', () => { state.cpo.client.name = clientNameInput.value; saveDraftLocal(); });
  clientCompanyInput.addEventListener('input', () => { state.cpo.client.company = clientCompanyInput.value; saveDraftLocal(); });
  clientEmailInput.addEventListener('input', () => { state.cpo.client.email = clientEmailInput.value; saveDraftLocal(); });
  clientPhoneInput.addEventListener('input', () => { state.cpo.client.phone = clientPhoneInput.value; saveDraftLocal(); });

  pickCustomerBtn.addEventListener('click', () => {
    CustomersModule.openPicker((customer) => {
      state.cpo.client.name = customer.name || '';
      state.cpo.client.company = customer.company || '';
      state.cpo.client.email = customer.email || '';
      state.cpo.client.phone = customer.phone || '';
      renderHeader();
      saveDraftLocal();
    });
  });

  // ---------- line item events ----------
  lineItemsContainer.addEventListener('input', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.cpo.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;
    const fieldTarget = e.target.closest('[data-field]');
    if (!fieldTarget) return;
    const field = fieldTarget.dataset.field;
    item[field] = (field === 'qty' || field === 'unitPrice') ? Number(fieldTarget.value) || 0 : fieldTarget.value;
    const totalEl = card.querySelector('.li-summary-row.total strong');
    if (totalEl) totalEl.textContent = `${state.cpo.currency} ${Core.fmt(Pricing.computePoLineTotal(item))}`;
    updateTotals();
    saveDraftLocal();
  });

  lineItemsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.cpo.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;

    if (e.target.closest('[data-pick-catalog]')) {
      CatalogModule.openPicker((catalogItem) => {
        item.description = catalogItem.description;
        item.itemCode = catalogItem.itemCode || '';
        item.unit = catalogItem.unit || 'Each';
        item.unitPrice = Number(catalogItem.sellingPrice) || 0;
        renderLineItems(); updateTotals(); saveDraftLocal();
      });
      return;
    }
    if (e.target.closest('[data-remove-item]')) {
      state.cpo.lineItems = state.cpo.lineItems.filter((i) => i.id !== item.id);
      renderLineItems(); updateTotals(); saveDraftLocal();
      return;
    }
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      const idx = state.cpo.lineItems.indexOf(item);
      const swapIdx = idx + (moveBtn.dataset.move === 'up' ? -1 : 1);
      if (swapIdx >= 0 && swapIdx < state.cpo.lineItems.length) {
        const items = state.cpo.lineItems;
        [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
        renderLineItems(); updateTotals(); saveDraftLocal();
      }
    }
  });

  addLineItemBtn.addEventListener('click', () => {
    state.cpo.lineItems.push(blankLineItem());
    renderLineItems(); updateTotals(); saveDraftLocal();
  });

  // ---------- save / new ----------
  function setSaveStatus(text, isError) {
    saveStatusText.textContent = text;
    saveStatusText.classList.toggle('error', !!isError);
  }

  function companyCollection() {
    return Core.state.db.collection('companies').doc(Core.state.activeCompanyId).collection('customerPurchaseOrders');
  }

  function buildFirestoreDoc() {
    const totals = Pricing.computePoTotals(state.cpo);
    const cpo = state.cpo;
    return {
      cpoNumber: cpo.cpoNumber,
      status: cpo.status,
      customerPoNumber: cpo.customerPoNumber,
      poDate: cpo.poDate,
      receivedDate: cpo.receivedDate,
      currency: cpo.currency,
      exchangeRateToKwacha: cpo.exchangeRateToKwacha,
      client: cpo.client,
      linkedQuoteNumber: cpo.linkedQuoteNumber || '',
      linkedOaNumber: cpo.linkedOaNumber || '',
      lineItems: cpo.lineItems,
      notes: cpo.notes,
      subtotal: totals.subtotal,
      kwachaValue: totals.kwachaValue,
      lastEditedBy: Core.state.user.uid,
      lastEditedByName: Core.state.profile.displayName || Core.state.user.email,
      lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function saveCpo() {
    if (state.saving) return;
    saveDraftLocal();
    if (!Core.state.db) { setSaveStatus('Not connected — see SETUP.md.', true); return; }
    if (!state.cpo.customerPoNumber) { setSaveStatus('Add the customer\'s PO number before saving.', true); return; }
    state.saving = true;
    saveBtn.disabled = true;
    setSaveStatus('Saving…');
    const docData = buildFirestoreDoc();
    const colRef = companyCollection();
    const done = (ok, err) => {
      state.saving = false;
      saveBtn.disabled = false;
      if (ok) state.lastSavedJson = JSON.stringify(state.cpo);
      setSaveStatus(ok ? 'Saved' : ('Save failed: ' + (err && err.message ? err.message : 'check your connection and permissions')), !ok);
    };
    if (state.cpo.id) {
      colRef.doc(state.cpo.id).set(docData, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      docData.createdBy = Core.state.user.uid;
      docData.createdByName = Core.state.profile.displayName || Core.state.user.email;
      docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const newRef = colRef.doc();
      newRef.set(docData)
        .then(() => { state.cpo.id = newRef.id; saveDraftLocal(); done(true); })
        .catch((err) => done(false, err));
    }
  }
  saveBtn.addEventListener('click', saveCpo);

  newBtn.addEventListener('click', () => {
    if (!confirm('Start a new customer purchase order? Unsaved changes to the current one will be lost.')) return;
    newBlankAndRender();
  });

  // ---------- history ----------
  function normalizeLoaded(doc) {
    return Object.assign(blankCpo(doc.cpoNumber), doc, { id: doc.id,
      client: doc.client || { name: '', company: '', email: '', phone: '' },
      lineItems: (doc.lineItems || []).map((li) => Object.assign({}, li, { id: li.id || Core.uid() }))
    });
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
      if (state.historyStatusFilter !== 'all' && (item.status || 'received') !== state.historyStatusFilter) return false;
      if (!q) return true;
      return (item.cpoNumber || '').toLowerCase().includes(q)
        || (item.customerPoNumber || '').toLowerCase().includes(q)
        || ((item.client && item.client.company) || '').toLowerCase().includes(q);
    });

    historyEmptyState.style.display = filtered.length ? 'none' : 'block';

    historyListEl.innerHTML = filtered.map((item) => `
      <div class="history-row" data-history-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.cpoNumber)} <span class="badge tracking-${item.status === 'fulfilled' ? 'won' : (item.status === 'cancelled' ? 'lost' : 'sent')}">${Core.escapeHtml(STATUS_LABELS[item.status] || item.status)}</span></div>
          <div class="history-sub">${Core.escapeHtml((item.client && item.client.company) || 'No client')} · Their PO ${Core.escapeHtml(item.customerPoNumber || '—')} · ${Core.escapeHtml(item.poDate || '')}${attributionText(item) ? ' · ' + Core.escapeHtml(attributionText(item)) : ''}</div>
        </div>
        <div class="history-total">${item.currency} ${Core.fmt(item.subtotal)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-open-history>Edit</button>
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
      state.cpo = normalizeLoaded(item);
      state.lastSavedJson = JSON.stringify(state.cpo);
      saveDraftLocal();
      renderAll();
      switchView('editor');
      setSaveStatus('');
    } else if (e.target.closest('[data-delete-history]')) {
      if (!confirm(`Delete ${item.cpoNumber}? This cannot be undone.`)) return;
      companyCollection().doc(id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  historySearchInput.addEventListener('input', renderHistory);
  historyStatusTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-status-filter]');
    if (!btn) return;
    state.historyStatusFilter = btn.dataset.statusFilter;
    [...historyStatusTabs.children].forEach((b) => b.classList.toggle('active', b === btn));
    renderHistory();
  });

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
    if (lastCompanyId !== null && lastCompanyId !== companyId) state.cpo = null;
    lastCompanyId = companyId;
    if (state.cpo) renderAll(); else ensureLoaded();
    state.historyUnsub = companyCollection()
      .orderBy('updatedAt', 'desc')
      .onSnapshot((snap) => {
        state.historyItems = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderHistory();
        historyChangeCallbacks.forEach((cb) => cb(state.historyItems));
      }, (err) => setSaveStatus('History sync error: ' + err.message, true));
  });

  switchView('editor');
  renderHistory();

  global.CustomerPurchaseOrdersModule = { onHistoryChange, state };
})(window);
