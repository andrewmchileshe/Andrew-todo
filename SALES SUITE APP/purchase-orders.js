// Supplier Purchase Order editor + history — orders WE place with suppliers to procure
// goods. Company-scoped like quotations/acknowledgements. Numbers are assigned per-company
// (PO-CL-/PO-CS-/PO-LS- + running counter, starting at 1001) via a Firestore transaction on
// companies/{companyId}.poCounter, mirroring how Acknowledgement numbers are assigned.
(function (global) {
  const Core = global.Core;
  const DRAFT_KEY = 'sales-suite-po-draft-v1';
  const DEFAULT_PREFIX = { 'chemsol-limited': 'PO-CL', 'chemsol-scientific': 'PO-CS', 'labmall-scientific': 'PO-LS' };
  const STATUS_LABELS = { open: 'Open', 'in-transit': 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled' };

  const el = (id) => document.getElementById(id);

  const editorView = el('poEditorView');
  const historyView = el('poHistoryView');
  const navEditorBtn = el('poNavEditorBtn');
  const navHistoryBtn = el('poNavHistoryBtn');

  const poNumberDisplay = el('poNumberDisplay');
  const statusSelect = el('poStatusSelect');
  const sourceOaLine = el('poSourceOaLine');
  const attributionTextEl = el('poAttributionText');

  const supplierNameDisplay = el('poSupplierNameDisplay');
  const pickSupplierBtn = el('poPickSupplierBtn');
  const orderDateInput = el('poOrderDateInput');
  const expectedDateInput = el('poExpectedDateInput');
  const currencyInput = el('poCurrencyInput');
  const exchangeRateInput = el('poExchangeRateInput');

  const lineItemsContainer = el('poLineItemsContainer');
  const addLineItemBtn = el('poAddLineItemBtn');

  const subtotalDisplay = el('poSubtotalDisplay');
  const kwachaValueDisplay = el('poKwachaValueDisplay');
  const notesInput = el('poNotesInput');

  const saveBtn = el('poSaveBtn');
  const downloadPdfBtn = el('poDownloadPdfBtn');
  const newBtn = el('poNewBtn');
  const saveStatusText = el('poSaveStatusText');

  const historySearchInput = el('poHistorySearchInput');
  const historyStatusTabs = el('poHistoryStatusTabs');
  const historyListEl = el('poHistoryList');
  const historyEmptyState = el('poHistoryEmptyState');

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveDraftLocal() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.po));
  }

  function blankLineItem() {
    return { id: Core.uid(), description: '', itemCode: '', qty: 1, unit: 'Each', unitPrice: 0, leadTime: '' };
  }

  function blankPo(poNumber) {
    const displayName = (Core.state.profile && Core.state.profile.displayName) || (Core.state.user && Core.state.user.email) || '';
    return {
      id: null,
      poNumber: poNumber,
      status: 'open',
      sourceOaId: null,
      sourceOaNumber: null,
      supplierId: null,
      supplierName: '',
      supplierContactName: '',
      supplierEmail: '',
      supplierPhone: '',
      orderDate: Core.todayIso(),
      expectedDate: '',
      currency: 'ZMW',
      exchangeRateToKwacha: 1,
      lineItems: [],
      notes: '',
      createdByName: displayName,
      lastEditedByName: displayName
    };
  }

  const state = {
    po: loadDraft() || null, // resolved to a real (numbered) PO on first render via ensureLoaded()
    historyItems: [],
    historyUnsub: null,
    historyStatusFilter: 'all',
    saving: false,
    assigning: false,
    lastSavedJson: null
  };
  if (state.po && !state.po.id && state.po.orderDate !== Core.todayIso()) {
    state.po.orderDate = Core.todayIso();
  }
  if (state.po && state.po.id) state.lastSavedJson = JSON.stringify(state.po);

  function isUnsaved() {
    return state.lastSavedJson === null || state.lastSavedJson !== JSON.stringify(state.po);
  }
  function confirmUnsavedExport(actionLabel) {
    if (!isUnsaved()) return true;
    return confirm('This purchase order hasn\'t been saved yet, or has changes since it was last saved. ' +
      'If you don\'t save it, those changes could be lost later. ' + actionLabel + ' anyway?');
  }
  // Closing the tab while a save is genuinely in flight is now queued and retried by
  // Firestore's offline persistence, but this stops you walking away mid-save regardless.
  global.addEventListener('beforeunload', (e) => {
    if (!state.saving) return;
    e.preventDefault();
    e.returnValue = '';
  });

  const historyChangeCallbacks = [];
  function onHistoryChange(cb) { historyChangeCallbacks.push(cb); }

  function defaultPrefix() {
    return DEFAULT_PREFIX[Core.state.activeCompanyId] || 'PO';
  }

  // Atomically increments companies/{companyId}.poCounter and returns "PREFIX-<n>".
  function assignPoNumber() {
    const companyRef = Core.state.db.collection('companies').doc(Core.state.activeCompanyId);
    return Core.state.db.runTransaction((tx) => tx.get(companyRef).then((doc) => {
      const data = doc.exists ? doc.data() : {};
      const prefix = data.poPrefix || defaultPrefix();
      const next = (Number(data.poCounter) || 1000) + 1;
      tx.set(companyRef, { poCounter: next, poPrefix: prefix }, { merge: true });
      return prefix + '-' + next;
    }));
  }

  function newBlankAndRender() {
    if (state.assigning) return;
    state.assigning = true;
    setSaveStatus('Assigning purchase order number…');
    newBtn.disabled = true;
    assignPoNumber()
      .then((number) => {
        state.po = blankPo(number);
        state.lastSavedJson = null;
        saveDraftLocal();
        renderAll();
        setSaveStatus('');
      })
      .catch((err) => setSaveStatus('Could not assign a number: ' + err.message, true))
      .finally(() => { state.assigning = false; newBtn.disabled = false; });
  }

  function ensureLoaded() {
    if (!state.po) newBlankAndRender();
  }

  // Called from oa.js when the user picks line items to source. Pre-fills a fresh PO
  // (a real number is assigned first) with those items — description/qty carried over,
  // price left blank since it's the supplier's cost, not the customer's selling price.
  function startFromOa(oa, selectedLineItems) {
    if (state.assigning) return;
    state.assigning = true;
    setSaveStatus('Assigning purchase order number…');
    assignPoNumber()
      .then((number) => {
        const po = blankPo(number);
        po.sourceOaId = oa.id;
        po.sourceOaNumber = oa.oaNumber;
        po.notes = oa.customerPoRef ? ('For customer PO ref: ' + oa.customerPoRef) : '';
        po.lineItems = (selectedLineItems || []).map((li) => ({
          id: Core.uid(),
          description: li.description || '',
          itemCode: li.itemCode || '',
          qty: Number(li.qty) || 0,
          unit: li.unit || 'Each',
          unitPrice: 0,
          leadTime: ''
        }));
        state.po = po;
        state.lastSavedJson = null;
        saveDraftLocal();
        renderAll();
        switchView('editor');
        setSaveStatus('Sourced from ' + oa.oaNumber + ' — pick a supplier and confirm prices, then Save.');
      })
      .catch((err) => setSaveStatus('Could not assign a number: ' + err.message, true))
      .finally(() => { state.assigning = false; });
  }

  // ---------- rendering ----------
  function renderHeader() {
    const po = state.po;
    poNumberDisplay.textContent = po.poNumber || 'Not yet issued';
    statusSelect.value = po.status || 'open';
    sourceOaLine.textContent = po.sourceOaNumber ? ('Sourced from acknowledgement ' + po.sourceOaNumber) : '';
    sourceOaLine.style.display = po.sourceOaNumber ? '' : 'none';
    const attribution = attributionText(po);
    attributionTextEl.textContent = attribution;
    attributionTextEl.style.display = attribution ? '' : 'none';

    supplierNameDisplay.textContent = po.supplierName || 'No supplier picked yet';
    orderDateInput.value = po.orderDate || '';
    expectedDateInput.value = po.expectedDate || '';
    currencyInput.value = po.currency || 'ZMW';
    exchangeRateInput.value = po.exchangeRateToKwacha != null ? po.exchangeRateToKwacha : 1;
    notesInput.value = po.notes || '';
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
        <div class="action-row" style="gap:8px;">
          <button type="button" class="text-btn" data-pick-supplier-item>Pick from supplier's items</button>
          <button type="button" class="text-btn" data-pick-catalog>Pick from catalog</button>
        </div>

        <div class="li-grid oa">
          <label>Item code<input type="text" data-field="itemCode" value="${Core.escapeHtml(item.itemCode)}" /></label>
          <label>Qty<input type="number" min="0" step="1" data-field="qty" value="${item.qty}" /></label>
          <label>Unit<input type="text" data-field="unit" value="${Core.escapeHtml(item.unit)}" /></label>
          <label>Unit price<input type="number" min="0" step="0.01" data-field="unitPrice" value="${item.unitPrice}" /></label>
          <label>Lead time<input type="text" data-field="leadTime" placeholder="3-4 weeks" value="${Core.escapeHtml(item.leadTime)}" /></label>
        </div>

        <div class="li-summary-row total"><span>Line total</span><strong>${Core.escapeHtml(state.po.currency)} ${Core.fmt(Pricing.computePoLineTotal(item))}</strong></div>
      </div>`;
  }

  function renderLineItems() {
    const items = state.po.lineItems;
    lineItemsContainer.innerHTML = items.length
      ? items.map((item, i) => renderLineItemCard(item, i, items.length)).join('')
      : '<p class="empty-state">No line items yet — add your first one.</p>';
  }

  function updateTotals() {
    const totals = Pricing.computePoTotals(state.po);
    subtotalDisplay.textContent = `${state.po.currency} ${Core.fmt(totals.subtotal)}`;
    kwachaValueDisplay.textContent = `ZMW ${Core.fmt(totals.kwachaValue)}`;
    return totals;
  }

  function renderAll() {
    renderHeader();
    renderLineItems();
    updateTotals();
  }

  // ---------- header events ----------
  statusSelect.addEventListener('change', () => {
    state.po.status = statusSelect.value;
    saveDraftLocal();
  });

  pickSupplierBtn.addEventListener('click', () => {
    SuppliersModule.openPicker((supplier) => {
      state.po.supplierId = supplier.id;
      state.po.supplierName = supplier.name || '';
      state.po.supplierContactName = supplier.contactName || '';
      state.po.supplierEmail = supplier.email || '';
      state.po.supplierPhone = supplier.phone || '';
      renderHeader();
      saveDraftLocal();
    });
  });

  function bindText(inputEl, field) {
    inputEl.addEventListener('input', () => { state.po[field] = inputEl.value; saveDraftLocal(); });
  }
  bindText(orderDateInput, 'orderDate');
  bindText(expectedDateInput, 'expectedDate');
  bindText(notesInput, 'notes');

  currencyInput.addEventListener('input', () => {
    state.po.currency = currencyInput.value.toUpperCase();
    renderLineItems();
    updateTotals();
    saveDraftLocal();
  });
  exchangeRateInput.addEventListener('input', () => {
    state.po.exchangeRateToKwacha = Number(exchangeRateInput.value) || 1;
    updateTotals();
    saveDraftLocal();
  });

  // ---------- line item events ----------
  lineItemsContainer.addEventListener('input', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.po.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;
    const fieldTarget = e.target.closest('[data-field]');
    if (!fieldTarget) return;
    const field = fieldTarget.dataset.field;
    item[field] = (field === 'qty' || field === 'unitPrice') ? Number(fieldTarget.value) || 0 : fieldTarget.value;
    const totalEl = card.querySelector('.li-summary-row.total strong');
    if (totalEl) totalEl.textContent = `${state.po.currency} ${Core.fmt(Pricing.computePoLineTotal(item))}`;
    updateTotals();
    saveDraftLocal();
  });

  lineItemsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('[data-item-id]');
    if (!card) return;
    const item = state.po.lineItems.find((i) => i.id === card.dataset.itemId);
    if (!item) return;

    if (e.target.closest('[data-pick-supplier-item]')) {
      if (!state.po.supplierId) { setSaveStatus('Pick a supplier first.', true); return; }
      SuppliersModule.openItemPicker(state.po.supplierId, state.po.supplierName, (supplierItem) => {
        item.description = supplierItem.description;
        item.itemCode = supplierItem.itemCode || '';
        item.unit = supplierItem.unit || 'Each';
        item.unitPrice = Number(supplierItem.price) || 0;
        if (supplierItem.currency && supplierItem.currency !== state.po.currency) {
          setSaveStatus('Pulled ' + supplierItem.currency + ' ' + Core.fmt(supplierItem.price) +
            ' as-is — PO currency is ' + state.po.currency + ', so double-check this price.', true);
        }
        renderLineItems(); updateTotals(); saveDraftLocal();
      });
      return;
    }
    if (e.target.closest('[data-pick-catalog]')) {
      CatalogModule.openPicker((catalogItem) => {
        item.description = catalogItem.description;
        item.itemCode = catalogItem.itemCode || '';
        item.unit = catalogItem.unit || 'Each';
        // The catalog's cost side (not selling price) is the relevant reference for a
        // purchase order — a starting point to confirm against the actual supplier price.
        item.unitPrice = Number(catalogItem.costPrice) || 0;
        renderLineItems(); updateTotals(); saveDraftLocal();
      });
      return;
    }
    if (e.target.closest('[data-remove-item]')) {
      state.po.lineItems = state.po.lineItems.filter((i) => i.id !== item.id);
      renderLineItems(); updateTotals(); saveDraftLocal();
      return;
    }
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      const idx = state.po.lineItems.indexOf(item);
      const swapIdx = idx + (moveBtn.dataset.move === 'up' ? -1 : 1);
      if (swapIdx >= 0 && swapIdx < state.po.lineItems.length) {
        const items = state.po.lineItems;
        [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
        renderLineItems(); updateTotals(); saveDraftLocal();
      }
    }
  });

  addLineItemBtn.addEventListener('click', () => {
    state.po.lineItems.push(blankLineItem());
    renderLineItems(); updateTotals(); saveDraftLocal();
  });

  // ---------- save / pdf / new ----------
  function setSaveStatus(text, isError) {
    saveStatusText.textContent = text;
    saveStatusText.classList.toggle('error', !!isError);
  }

  function companyCollection() {
    return Core.state.db.collection('companies').doc(Core.state.activeCompanyId).collection('purchaseOrders');
  }

  function buildFirestoreDoc() {
    const totals = Pricing.computePoTotals(state.po);
    const po = state.po;
    return {
      poNumber: po.poNumber,
      status: po.status,
      sourceOaId: po.sourceOaId,
      sourceOaNumber: po.sourceOaNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      supplierContactName: po.supplierContactName,
      supplierEmail: po.supplierEmail,
      supplierPhone: po.supplierPhone,
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      currency: po.currency,
      exchangeRateToKwacha: po.exchangeRateToKwacha,
      lineItems: po.lineItems,
      notes: po.notes,
      subtotal: totals.subtotal,
      kwachaValue: totals.kwachaValue,
      // createdBy/createdAt are set once at creation (below) and never overwritten on
      // later saves, so "who started this" survives someone else editing and saving it.
      lastEditedBy: Core.state.user.uid,
      lastEditedByName: Core.state.profile.displayName || Core.state.user.email,
      lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function savePo() {
    if (state.saving) return;
    saveDraftLocal();
    if (!Core.state.db) { setSaveStatus('Not connected — see SETUP.md.', true); return; }
    if (!state.po.supplierId) { setSaveStatus('Pick a supplier before saving.', true); return; }
    state.saving = true;
    saveBtn.disabled = true;
    setSaveStatus('Saving…');
    const docData = buildFirestoreDoc();
    const colRef = companyCollection();
    const done = (ok, err) => {
      state.saving = false;
      saveBtn.disabled = false;
      if (ok) state.lastSavedJson = JSON.stringify(state.po);
      setSaveStatus(ok ? 'Saved' : ('Save failed: ' + (err && err.message ? err.message : 'check your connection and permissions')), !ok);
    };
    if (state.po.id) {
      colRef.doc(state.po.id).set(docData, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      docData.createdBy = Core.state.user.uid;
      docData.createdByName = Core.state.profile.displayName || Core.state.user.email;
      docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const newRef = colRef.doc();
      newRef.set(docData)
        .then(() => { state.po.id = newRef.id; saveDraftLocal(); done(true); })
        .catch((err) => done(false, err));
    }
  }
  saveBtn.addEventListener('click', savePo);

  downloadPdfBtn.addEventListener('click', () => {
    if (!confirmUnsavedExport('Download')) return;
    const totals = Pricing.computePoTotals(state.po);
    PoPdf.generatePoPdf(state.po, totals, Core.companyForPdf());
  });

  newBtn.addEventListener('click', () => {
    if (!confirm('Start a new purchase order? Unsaved changes to the current one will be lost.')) return;
    newBlankAndRender();
  });

  // ---------- history ----------
  function normalizeLoaded(doc) {
    return Object.assign(blankPo(doc.poNumber), doc, { id: doc.id,
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
      if (state.historyStatusFilter !== 'all' && (item.status || 'open') !== state.historyStatusFilter) return false;
      if (!q) return true;
      return (item.poNumber || '').toLowerCase().includes(q)
        || (item.supplierName || '').toLowerCase().includes(q);
    });

    historyEmptyState.style.display = filtered.length ? 'none' : 'block';

    historyListEl.innerHTML = filtered.map((item) => `
      <div class="history-row" data-history-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.poNumber)} <span class="badge tracking-${item.status === 'delivered' ? 'won' : (item.status === 'cancelled' ? 'lost' : 'sent')}">${Core.escapeHtml(STATUS_LABELS[item.status] || item.status)}</span></div>
          <div class="history-sub">${Core.escapeHtml(item.supplierName || 'No supplier')} · ${Core.escapeHtml(item.orderDate || '')}${attributionText(item) ? ' · ' + Core.escapeHtml(attributionText(item)) : ''}</div>
        </div>
        <div class="history-total">${item.currency} ${Core.fmt(item.subtotal)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-view-history>View</button>
          <button type="button" class="text-btn" data-download-history>Download</button>
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

    if (e.target.closest('[data-view-history]')) {
      const loaded = normalizeLoaded(item);
      PoPdf.viewPoPdf(loaded, Pricing.computePoTotals(loaded), Core.companyForPdf());
    } else if (e.target.closest('[data-download-history]')) {
      const loaded = normalizeLoaded(item);
      PoPdf.generatePoPdf(loaded, Pricing.computePoTotals(loaded), Core.companyForPdf());
    } else if (e.target.closest('[data-open-history]')) {
      state.po = normalizeLoaded(item);
      state.lastSavedJson = JSON.stringify(state.po);
      saveDraftLocal();
      renderAll();
      switchView('editor');
      setSaveStatus('');
    } else if (e.target.closest('[data-delete-history]')) {
      if (!confirm(`Delete purchase order ${item.poNumber}? This cannot be undone.`)) return;
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
    if (lastCompanyId !== null && lastCompanyId !== companyId) state.po = null;
    lastCompanyId = companyId;
    if (state.po) renderAll(); else ensureLoaded();
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

  global.PurchaseOrdersModule = { startFromOa, onHistoryChange, state };
})(window);
