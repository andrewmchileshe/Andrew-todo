// Customer directory. Shared across all three companies (same pattern as the product
// catalog) — saved contacts that Quote and Acknowledgement editors can pull from instead
// of retyping name/company/email/phone/address for repeat customers.
// Exposes CustomersModule.openPicker(onSelect) as the integration point for quotes.js/oa.js.
(function (global) {
  const Core = global.Core;

  const el = (id) => document.getElementById(id);

  const searchInput = el('customerSearchInput');
  const listEl = el('customerList');
  const emptyState = el('customerEmptyState');
  const addBtn = el('customerAddBtn');

  const itemModal = el('customerItemModal');
  const itemModalClose = el('customerItemModalClose');
  const itemModalTitle = el('customerItemModalTitle');
  const nameInput = el('customerNameInput');
  const companyInput = el('customerCompanyInput');
  const emailInput = el('customerEmailInput');
  const phoneInput = el('customerPhoneInput');
  const addressInput = el('customerAddressInput');
  const itemSaveBtn = el('customerItemSaveBtn');
  const itemDeleteBtn = el('customerItemDeleteBtn');
  const itemStatusText = el('customerItemStatusText');

  const pickerModal = el('customerPickerModal');
  const pickerModalClose = el('customerPickerModalClose');
  const pickerSearchInput = el('customerPickerSearchInput');
  const pickerList = el('customerPickerList');
  const pickerEmptyState = el('customerPickerEmptyState');

  const state = {
    items: [],
    itemsUnsub: null,
    editingId: null,
    saving: false,
    pickerCallback: null
  };

  function customersCollection() {
    return Core.state.db.collection('customers');
  }

  function filterItems(items, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q));
  }

  function rowHtml(c) {
    const title = c.company || c.name || 'Unnamed customer';
    const subParts = [];
    if (c.company && c.name) subParts.push(c.name);
    if (c.email) subParts.push(c.email);
    if (c.phone) subParts.push(c.phone);
    return { title, sub: subParts.join(' · ') };
  }

  // ---------- main list ----------
  function renderList() {
    const filtered = filterItems(state.items, searchInput.value);
    emptyState.style.display = filtered.length ? 'none' : 'block';
    listEl.innerHTML = filtered.map((c) => {
      const r = rowHtml(c);
      return `
      <div class="history-row" data-item-id="${c.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(r.title)}</div>
          <div class="history-sub">${Core.escapeHtml(r.sub)}</div>
        </div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-view-item>View</button>
          <button type="button" class="text-btn" data-edit-item>Edit</button>
          <button type="button" class="text-btn danger" data-delete-item>Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-item-id]');
    if (!row) return;
    const item = state.items.find((c) => c.id === row.dataset.itemId);
    if (!item) return;
    if (e.target.closest('[data-view-item]')) {
      openItemModal(item, { readOnly: true });
    } else if (e.target.closest('[data-edit-item]')) {
      openItemModal(item);
    } else if (e.target.closest('[data-delete-item]')) {
      if (!confirm(`Delete customer "${item.company || item.name}"? This cannot be undone.`)) return;
      customersCollection().doc(item.id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  searchInput.addEventListener('input', renderList);
  addBtn.addEventListener('click', () => openItemModal(null));

  // ---------- add/edit modal ----------
  function blankForm() {
    return { name: '', company: '', email: '', phone: '', address: '' };
  }

  const EDITABLE_FIELDS = [nameInput, companyInput, emailInput, phoneInput, addressInput];

  function openItemModal(item, opts) {
    opts = opts || {};
    const data = item ? Object.assign(blankForm(), item) : blankForm();
    state.editingId = item ? item.id : null;
    itemModalTitle.textContent = opts.readOnly ? 'View customer' : (item ? 'Edit customer' : 'Add customer');
    nameInput.value = data.name;
    companyInput.value = data.company;
    emailInput.value = data.email;
    phoneInput.value = data.phone;
    addressInput.value = data.address;
    EDITABLE_FIELDS.forEach((el) => { el.disabled = !!opts.readOnly; });
    itemSaveBtn.style.display = opts.readOnly ? 'none' : '';
    itemDeleteBtn.style.display = (item && !opts.readOnly) ? '' : 'none';
    itemStatusText.textContent = '';
    itemModal.classList.add('open');
  }

  itemModalClose.addEventListener('click', () => itemModal.classList.remove('open'));
  itemModal.addEventListener('click', (e) => { if (e.target === itemModal) itemModal.classList.remove('open'); });

  function currentForm() {
    return {
      name: nameInput.value.trim(),
      company: companyInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim()
    };
  }

  itemSaveBtn.addEventListener('click', () => {
    if (state.saving) return;
    const data = currentForm();
    if (!data.name && !data.company) {
      itemStatusText.textContent = 'Enter at least a name or company.';
      return;
    }
    state.saving = true;
    itemSaveBtn.disabled = true;
    itemStatusText.textContent = 'Saving…';
    data.createdBy = Core.state.user.uid;
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    const colRef = customersCollection();
    const done = (ok, err) => {
      state.saving = false;
      itemSaveBtn.disabled = false;
      if (ok) { itemModal.classList.remove('open'); }
      else { itemStatusText.textContent = 'Save failed: ' + (err && err.message ? err.message : 'check permissions'); }
    };
    if (state.editingId) {
      colRef.doc(state.editingId).set(data, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      colRef.add(data).then(() => done(true)).catch((err) => done(false, err));
    }
  });

  itemDeleteBtn.addEventListener('click', () => {
    if (!state.editingId) return;
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    customersCollection().doc(state.editingId).delete()
      .then(() => itemModal.classList.remove('open'))
      .catch((err) => { itemStatusText.textContent = 'Delete failed: ' + err.message; });
  });

  // Lets quotes.js/oa.js offer a one-click "save the details I just typed as a new
  // customer" without staff needing to pre-populate the directory first.
  function saveQuick(data, onDone) {
    if (!data.name && !data.company) { onDone && onDone(false, new Error('Nothing to save')); return; }
    customersCollection().add(Object.assign({}, data, {
      createdBy: Core.state.user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })).then(() => onDone && onDone(true)).catch((err) => onDone && onDone(false, err));
  }

  // ---------- shared picker ----------
  function renderPickerList() {
    const filtered = filterItems(state.items, pickerSearchInput.value);
    pickerEmptyState.style.display = filtered.length ? 'none' : 'block';
    pickerList.innerHTML = filtered.map((c) => {
      const r = rowHtml(c);
      return `
      <div class="history-row" data-item-id="${c.id}" role="button" tabindex="0">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(r.title)}</div>
          <div class="history-sub">${Core.escapeHtml(r.sub)}</div>
        </div>
      </div>`;
    }).join('');
  }

  pickerList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-item-id]');
    if (!row) return;
    const item = state.items.find((c) => c.id === row.dataset.itemId);
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

  // ---------- subscription ----------
  // Shared across companies, so it's subscribed once (on first login), like the catalog.
  Core.onCompanyChange(() => {
    if (state.itemsUnsub) return;
    state.itemsUnsub = customersCollection()
      .orderBy('company')
      .onSnapshot((snap) => {
        state.items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderList();
        renderPickerList();
      }, () => {});
  });

  renderList();

  global.CustomersModule = { openPicker, saveQuick, state };
})(window);
