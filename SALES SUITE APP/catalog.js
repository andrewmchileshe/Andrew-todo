// Product/price catalog. Per-company saved items that Quote and Acknowledgement line
// items can pull from instead of retyping cost build-ups and descriptions every time.
// Exposes CatalogModule.openPicker(onSelect) as the integration point for quotes.js/oa.js.
(function (global) {
  const Core = global.Core;

  const el = (id) => document.getElementById(id);

  const catalogSearchInput = el('catalogSearchInput');
  const catalogList = el('catalogList');
  const catalogEmptyState = el('catalogEmptyState');
  const catalogAddBtn = el('catalogAddBtn');

  const itemModal = el('catalogItemModal');
  const itemModalClose = el('catalogItemModalClose');
  const itemModalTitle = el('catalogItemModalTitle');
  const itemCodeInput = el('catalogItemCodeInput');
  const descriptionInput = el('catalogDescriptionInput');
  const unitInput = el('catalogUnitInput');
  const costPriceInput = el('catalogCostPriceInput');
  const costCurrencyInput = el('catalogCostCurrencyInput');
  const marginToggle = el('catalogMarginToggle');
  const marginValueInput = el('catalogMarginValueInput');
  const suggestedPriceText = el('catalogSuggestedPriceText');
  const useSuggestedBtn = el('catalogUseSuggestedBtn');
  const sellingPriceInput = el('catalogSellingPriceInput');
  const sellingCurrencyInput = el('catalogSellingCurrencyInput');
  const itemSaveBtn = el('catalogItemSaveBtn');
  const itemDeleteBtn = el('catalogItemDeleteBtn');
  const itemStatusText = el('catalogItemStatusText');

  const pickerModal = el('catalogPickerModal');
  const pickerModalClose = el('catalogPickerModalClose');
  const pickerSearchInput = el('catalogPickerSearchInput');
  const pickerList = el('catalogPickerList');
  const pickerEmptyState = el('catalogPickerEmptyState');

  const state = {
    items: [],
    itemsUnsub: null,
    editingId: null,
    editingMarginMethod: 'margin',
    saving: false,
    pickerCallback: null
  };

  function companyCollection() {
    return Core.state.db.collection('companies').doc(Core.state.activeCompanyId).collection('catalog');
  }

  function filterItems(items, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.itemCode || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }

  // ---------- main list ----------
  function renderList() {
    const filtered = filterItems(state.items, catalogSearchInput.value);
    catalogEmptyState.style.display = filtered.length ? 'none' : 'block';
    catalogList.innerHTML = filtered.map((item) => `
      <div class="history-row" data-item-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.itemCode || '—')}</div>
          <div class="history-sub">${Core.escapeHtml(item.description || '')}</div>
        </div>
        <div class="history-total">${Core.escapeHtml(item.sellingCurrency)} ${Core.fmt(item.sellingPrice)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-edit-item>Edit</button>
          <button type="button" class="text-btn danger" data-delete-item>Delete</button>
        </div>
      </div>`).join('');
  }

  catalogList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-item-id]');
    if (!row) return;
    const item = state.items.find((i) => i.id === row.dataset.itemId);
    if (!item) return;
    if (e.target.closest('[data-edit-item]')) {
      openItemModal(item);
    } else if (e.target.closest('[data-delete-item]')) {
      if (!confirm(`Delete catalog item "${item.description}"? This cannot be undone.`)) return;
      companyCollection().doc(item.id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  catalogSearchInput.addEventListener('input', renderList);
  catalogAddBtn.addEventListener('click', () => openItemModal(null));

  // ---------- add/edit modal ----------
  function blankItemForm() {
    return { itemCode: '', description: '', unit: 'Each', costPrice: 0, costCurrency: 'ZMW', marginMethod: 'margin', marginValue: 0, sellingPrice: 0, sellingCurrency: 'ZMW' };
  }

  function openItemModal(item) {
    const data = item ? Object.assign(blankItemForm(), item) : blankItemForm();
    state.editingId = item ? item.id : null;
    state.editingMarginMethod = data.marginMethod === 'markup' ? 'markup' : 'margin';

    itemModalTitle.textContent = item ? 'Edit catalog item' : 'Add catalog item';
    itemCodeInput.value = data.itemCode;
    descriptionInput.value = data.description;
    unitInput.value = data.unit;
    costPriceInput.value = data.costPrice;
    costCurrencyInput.value = data.costCurrency;
    marginValueInput.value = data.marginValue;
    sellingPriceInput.value = data.sellingPrice;
    sellingCurrencyInput.value = data.sellingCurrency;
    renderMarginToggle();
    updateSuggestedPrice();
    itemDeleteBtn.style.display = item ? '' : 'none';
    itemStatusText.textContent = '';
    itemModal.classList.add('open');
  }

  function renderMarginToggle() {
    [...marginToggle.children].forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.marginMethod === state.editingMarginMethod));
  }

  function updateSuggestedPrice() {
    const computed = Pricing.computeLineItem({
      qty: 1,
      costPrice: Number(costPriceInput.value) || 0,
      exchangeRate: 1,
      components: [],
      marginMethod: state.editingMarginMethod,
      marginValue: Number(marginValueInput.value) || 0
    });
    suggestedPriceText.textContent = `Suggested from cost + margin: ${costCurrencyInput.value || ''} ${Core.fmt(computed.unitSellingPrice)}`;
    suggestedPriceText.dataset.suggested = computed.unitSellingPrice;
  }

  [costPriceInput, marginValueInput, costCurrencyInput].forEach((inp) =>
    inp.addEventListener('input', updateSuggestedPrice));

  marginToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-margin-method]');
    if (!btn) return;
    state.editingMarginMethod = btn.dataset.marginMethod;
    renderMarginToggle();
    updateSuggestedPrice();
  });

  useSuggestedBtn.addEventListener('click', () => {
    sellingPriceInput.value = suggestedPriceText.dataset.suggested || 0;
  });

  itemModalClose.addEventListener('click', () => itemModal.classList.remove('open'));
  itemModal.addEventListener('click', (e) => { if (e.target === itemModal) itemModal.classList.remove('open'); });

  itemSaveBtn.addEventListener('click', () => {
    if (state.saving) return;
    if (!descriptionInput.value.trim()) {
      itemStatusText.textContent = 'Description is required.';
      return;
    }
    state.saving = true;
    itemSaveBtn.disabled = true;
    itemStatusText.textContent = 'Saving…';
    const docData = {
      itemCode: itemCodeInput.value.trim(),
      description: descriptionInput.value.trim(),
      unit: unitInput.value.trim() || 'Each',
      costPrice: Number(costPriceInput.value) || 0,
      costCurrency: costCurrencyInput.value.trim().toUpperCase() || 'ZMW',
      marginMethod: state.editingMarginMethod,
      marginValue: Number(marginValueInput.value) || 0,
      sellingPrice: Number(sellingPriceInput.value) || 0,
      sellingCurrency: sellingCurrencyInput.value.trim().toUpperCase() || 'ZMW',
      createdBy: Core.state.user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const colRef = companyCollection();
    const done = (ok, err) => {
      state.saving = false;
      itemSaveBtn.disabled = false;
      if (ok) { itemModal.classList.remove('open'); }
      else { itemStatusText.textContent = 'Save failed: ' + (err && err.message ? err.message : 'check permissions'); }
    };
    if (state.editingId) {
      colRef.doc(state.editingId).set(docData, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      colRef.add(docData).then(() => done(true)).catch((err) => done(false, err));
    }
  });

  itemDeleteBtn.addEventListener('click', () => {
    if (!state.editingId) return;
    if (!confirm('Delete this catalog item? This cannot be undone.')) return;
    companyCollection().doc(state.editingId).delete()
      .then(() => itemModal.classList.remove('open'))
      .catch((err) => { itemStatusText.textContent = 'Delete failed: ' + err.message; });
  });

  // ---------- shared picker ----------
  function renderPickerList() {
    const filtered = filterItems(state.items, pickerSearchInput.value);
    pickerEmptyState.style.display = filtered.length ? 'none' : 'block';
    pickerList.innerHTML = filtered.map((item) => `
      <div class="history-row" data-item-id="${item.id}" role="button" tabindex="0">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.itemCode || '—')}</div>
          <div class="history-sub">${Core.escapeHtml(item.description || '')}</div>
        </div>
        <div class="history-total">${Core.escapeHtml(item.sellingCurrency)} ${Core.fmt(item.sellingPrice)}</div>
      </div>`).join('');
  }

  pickerList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-item-id]');
    if (!row) return;
    const item = state.items.find((i) => i.id === row.dataset.itemId);
    if (!item || !state.pickerCallback) return;
    const cb = state.pickerCallback;
    state.pickerCallback = null;
    pickerModal.classList.remove('open');
    cb(item);
  });

  pickerSearchInput.addEventListener('input', renderPickerList);
  pickerModalClose.addEventListener('click', () => { pickerModal.classList.remove('open'); state.pickerCallback = null; });
  pickerModal.addEventListener('click', (e) => { if (e.target === pickerModal) { pickerModal.classList.remove('open'); state.pickerCallback = null; } });

  function openPicker(onSelect) {
    state.pickerCallback = onSelect;
    pickerSearchInput.value = '';
    renderPickerList();
    pickerModal.classList.add('open');
  }

  // ---------- company-scoped subscription ----------
  Core.onCompanyChange(() => {
    if (state.itemsUnsub) { state.itemsUnsub(); state.itemsUnsub = null; }
    state.items = [];
    renderList();
    state.itemsUnsub = companyCollection()
      .orderBy('description')
      .onSnapshot((snap) => {
        state.items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderList();
        renderPickerList();
      }, () => {});
  });

  renderList();

  global.CatalogModule = { openPicker, state };
})(window);
