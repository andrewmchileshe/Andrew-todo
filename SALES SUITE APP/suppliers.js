// Supplier directory. Shared across all three companies (same pattern as the product
// catalog and customer directory) — each supplier has its own contact info and its own
// product/price list, in whatever currency that supplier bills in. Exposes
// SuppliersModule.openPicker(onSelect) and openItemPicker(supplierId, onSelect) as the
// integration points for the Supplier Purchase Order module.
(function (global) {
  const Core = global.Core;

  const el = (id) => document.getElementById(id);

  const searchInput = el('supplierSearchInput');
  const listEl = el('supplierList');
  const emptyState = el('supplierEmptyState');
  const addBtn = el('supplierAddBtn');

  const supplierModal = el('supplierModal');
  const supplierModalClose = el('supplierModalClose');
  const supplierModalTitle = el('supplierModalTitle');
  const nameInput = el('supplierNameInput');
  const contactNameInput = el('supplierContactNameInput');
  const emailInput = el('supplierEmailInput');
  const phoneInput = el('supplierPhoneInput');
  const addressInput = el('supplierAddressInput');
  const supplierSaveBtn = el('supplierSaveBtn');
  const supplierDeleteBtn = el('supplierDeleteBtn');
  const supplierStatusText = el('supplierStatusText');
  const supplierItemsSection = el('supplierItemsSection');
  const supplierItemsList = el('supplierItemsList');
  const supplierItemsEmptyState = el('supplierItemsEmptyState');
  const supplierAddItemBtn = el('supplierAddItemBtn');

  const itemModal = el('supplierItemModal');
  const itemModalClose = el('supplierItemModalClose');
  const itemModalTitle = el('supplierItemModalTitle');
  const itemPickCatalogBtn = el('supplierItemPickCatalogBtn');
  const itemCodeInput = el('supplierItemCodeInput');
  const itemDescriptionInput = el('supplierItemDescriptionInput');
  const itemUnitInput = el('supplierItemUnitInput');
  const itemPriceInput = el('supplierItemPriceInput');
  const itemCurrencyInput = el('supplierItemCurrencyInput');
  const itemSaveBtn = el('supplierItemSaveBtn');
  const itemDeleteBtn = el('supplierItemDeleteBtn');
  const itemStatusText = el('supplierItemStatusText');

  const bulkUploadItemsBtn = el('supplierBulkUploadItemsBtn');
  const itemBulkModal = el('supplierItemBulkUploadModal');
  const itemBulkModalClose = el('supplierItemBulkUploadModalClose');
  const itemBulkDownloadTemplateBtn = el('supplierItemDownloadTemplateBtn');
  const itemBulkFileInput = el('supplierItemBulkFileInput');
  const itemBulkStatusText = el('supplierItemBulkStatusText');
  const itemBulkPreview = el('supplierItemBulkPreview');
  const itemBulkPreviewCount = el('supplierItemBulkPreviewCount');
  const itemBulkConfirmBtn = el('supplierItemBulkConfirmBtn');

  const pickerModal = el('supplierPickerModal');
  const pickerModalClose = el('supplierPickerModalClose');
  const pickerSearchInput = el('supplierPickerSearchInput');
  const pickerList = el('supplierPickerList');
  const pickerEmptyState = el('supplierPickerEmptyState');

  const itemPickerModal = el('supplierItemPickerModal');
  const itemPickerModalClose = el('supplierItemPickerModalClose');
  const itemPickerTitle = el('supplierItemPickerTitle');
  const itemPickerSearchInput = el('supplierItemPickerSearchInput');
  const itemPickerList = el('supplierItemPickerList');
  const itemPickerEmptyState = el('supplierItemPickerEmptyState');

  const state = {
    suppliers: [],
    suppliersUnsub: null,
    editingId: null,
    saving: false,
    pickerCallback: null,
    // items of whichever supplier is currently open in the edit modal
    items: [],
    itemsUnsub: null,
    editingItemId: null,
    itemSaving: false,
    // items of whichever supplier is currently open in the item picker
    itemPickerSupplierId: null,
    itemPickerItems: [],
    itemPickerUnsub: null,
    itemPickerCallback: null
  };

  function suppliersCollection() {
    return Core.state.db.collection('suppliers');
  }
  function supplierItemsCollection(supplierId) {
    return suppliersCollection().doc(supplierId).collection('items');
  }

  function filterSuppliers(list, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.contactName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q));
  }
  function filterItems(list, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) =>
      (i.itemCode || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }

  // ---------- main supplier list ----------
  function renderList() {
    const filtered = filterSuppliers(state.suppliers, searchInput.value);
    emptyState.style.display = filtered.length ? 'none' : 'block';
    listEl.innerHTML = filtered.map((s) => `
      <div class="history-row" data-supplier-id="${s.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(s.name || 'Unnamed supplier')}</div>
          <div class="history-sub">${Core.escapeHtml([s.contactName, s.email, s.phone].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-view-supplier>View</button>
          <button type="button" class="text-btn" data-edit-supplier>Edit</button>
          <button type="button" class="text-btn danger" data-delete-supplier>Delete</button>
        </div>
      </div>`).join('');
  }

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-supplier-id]');
    if (!row) return;
    const supplier = state.suppliers.find((s) => s.id === row.dataset.supplierId);
    if (!supplier) return;
    if (e.target.closest('[data-view-supplier]')) {
      openSupplierModal(supplier, { readOnly: true });
    } else if (e.target.closest('[data-edit-supplier]')) {
      openSupplierModal(supplier);
    } else if (e.target.closest('[data-delete-supplier]')) {
      if (!confirm(`Delete supplier "${supplier.name}"? This also removes their saved items. This cannot be undone.`)) return;
      suppliersCollection().doc(supplier.id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  searchInput.addEventListener('input', renderList);
  addBtn.addEventListener('click', () => openSupplierModal(null));

  // ---------- add/edit supplier modal ----------
  function blankSupplierForm() {
    return { name: '', contactName: '', email: '', phone: '', address: '' };
  }
  const SUPPLIER_EDITABLE_FIELDS = [nameInput, contactNameInput, emailInput, phoneInput, addressInput];

  function openSupplierModal(supplier, opts) {
    opts = opts || {};
    const data = supplier ? Object.assign(blankSupplierForm(), supplier) : blankSupplierForm();
    state.editingId = supplier ? supplier.id : null;
    supplierModalTitle.textContent = opts.readOnly ? 'View supplier' : (supplier ? 'Edit supplier' : 'Add supplier');
    nameInput.value = data.name;
    contactNameInput.value = data.contactName;
    emailInput.value = data.email;
    phoneInput.value = data.phone;
    addressInput.value = data.address;
    SUPPLIER_EDITABLE_FIELDS.forEach((f) => { f.disabled = !!opts.readOnly; });
    supplierSaveBtn.style.display = opts.readOnly ? 'none' : '';
    supplierDeleteBtn.style.display = (supplier && !opts.readOnly) ? '' : 'none';
    supplierAddItemBtn.style.display = opts.readOnly ? 'none' : '';
    supplierStatusText.textContent = '';

    // A brand-new supplier has nowhere to attach items until it's saved once.
    if (state.itemsUnsub) { state.itemsUnsub(); state.itemsUnsub = null; }
    state.items = [];
    if (supplier) {
      supplierItemsSection.style.display = '';
      subscribeItems(supplier.id);
    } else {
      supplierItemsSection.style.display = 'none';
    }
    renderSupplierItems();

    supplierModal.classList.add('open');
  }

  function subscribeItems(supplierId) {
    state.itemsUnsub = supplierItemsCollection(supplierId)
      .orderBy('description')
      .onSnapshot((snap) => {
        state.items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderSupplierItems();
      }, () => {});
  }

  function renderSupplierItems() {
    supplierItemsEmptyState.style.display = state.items.length ? 'none' : 'block';
    supplierItemsList.innerHTML = state.items.map((i) => `
      <div class="history-row" data-item-id="${i.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(i.itemCode || '—')}</div>
          <div class="history-sub">${Core.escapeHtml(i.description || '')}</div>
        </div>
        <div class="history-total">${Core.escapeHtml(i.currency || '')} ${Core.fmt(i.price)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-edit-supplier-item>Edit</button>
          <button type="button" class="text-btn danger" data-delete-supplier-item>Delete</button>
        </div>
      </div>`).join('');
  }

  supplierItemsList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-item-id]');
    if (!row) return;
    const item = state.items.find((i) => i.id === row.dataset.itemId);
    if (!item) return;
    if (e.target.closest('[data-edit-supplier-item]')) {
      openItemModal(item);
    } else if (e.target.closest('[data-delete-supplier-item]')) {
      if (!confirm(`Delete "${item.description}" from this supplier's items?`)) return;
      supplierItemsCollection(state.editingId).doc(item.id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  supplierModalClose.addEventListener('click', () => supplierModal.classList.remove('open'));

  function currentSupplierForm() {
    return {
      name: nameInput.value.trim(),
      contactName: contactNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim()
    };
  }

  supplierSaveBtn.addEventListener('click', () => {
    if (state.saving) return;
    const data = currentSupplierForm();
    if (!data.name) { supplierStatusText.textContent = 'Enter a supplier name.'; return; }
    state.saving = true;
    supplierSaveBtn.disabled = true;
    supplierStatusText.textContent = 'Saving…';
    data.createdBy = Core.state.user.uid;
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    const colRef = suppliersCollection();
    const done = (ok, err, newId) => {
      state.saving = false;
      supplierSaveBtn.disabled = false;
      if (ok) {
        supplierStatusText.textContent = 'Saved.';
        // Newly created — switch the modal into "editing" mode so items can now be added
        // without closing and reopening.
        if (newId) {
          state.editingId = newId;
          supplierModalTitle.textContent = 'Edit supplier';
          supplierDeleteBtn.style.display = '';
          supplierItemsSection.style.display = '';
          subscribeItems(newId);
        }
      } else {
        supplierStatusText.textContent = 'Save failed: ' + (err && err.message ? err.message : 'check permissions');
      }
    };
    if (state.editingId) {
      colRef.doc(state.editingId).set(data, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      colRef.add(data).then((ref) => done(true, null, ref.id)).catch((err) => done(false, err));
    }
  });

  supplierDeleteBtn.addEventListener('click', () => {
    if (!state.editingId) return;
    if (!confirm('Delete this supplier? This also removes their saved items. This cannot be undone.')) return;
    suppliersCollection().doc(state.editingId).delete()
      .then(() => supplierModal.classList.remove('open'))
      .catch((err) => { supplierStatusText.textContent = 'Delete failed: ' + err.message; });
  });

  // ---------- add/edit supplier item modal ----------
  function blankItemForm() {
    return { itemCode: '', description: '', unit: 'Each', price: 0, currency: 'ZMW' };
  }
  const ITEM_EDITABLE_FIELDS = [itemCodeInput, itemDescriptionInput, itemUnitInput, itemPriceInput, itemCurrencyInput];

  function openItemModal(item) {
    const data = item ? Object.assign(blankItemForm(), item) : blankItemForm();
    state.editingItemId = item ? item.id : null;
    itemModalTitle.textContent = item ? 'Edit item' : 'Add item';
    itemCodeInput.value = data.itemCode;
    itemDescriptionInput.value = data.description;
    itemUnitInput.value = data.unit;
    itemPriceInput.value = data.price;
    itemCurrencyInput.value = data.currency;
    ITEM_EDITABLE_FIELDS.forEach((f) => { f.disabled = false; });
    itemDeleteBtn.style.display = item ? '' : 'none';
    itemStatusText.textContent = '';
    itemModal.classList.add('open');
  }

  supplierAddItemBtn.addEventListener('click', () => {
    if (!state.editingId) return;
    openItemModal(null);
  });

  itemModalClose.addEventListener('click', () => itemModal.classList.remove('open'));

  // Pulls item code/description/unit from the shared catalog, with the catalog's cost
  // side as a starting price reference — the actual supplier-quoted price still needs
  // confirming, same as when picking a catalog item into a Supplier PO line.
  itemPickCatalogBtn.addEventListener('click', () => {
    CatalogModule.openPicker((catalogItem) => {
      itemCodeInput.value = catalogItem.itemCode || '';
      itemDescriptionInput.value = catalogItem.description || '';
      itemUnitInput.value = catalogItem.unit || 'Each';
      itemPriceInput.value = Number(catalogItem.costPrice) || 0;
      itemCurrencyInput.value = catalogItem.costCurrency || 'ZMW';
    });
  });

  itemSaveBtn.addEventListener('click', () => {
    if (state.itemSaving || !state.editingId) return;
    if (!itemDescriptionInput.value.trim()) { itemStatusText.textContent = 'Description is required.'; return; }
    state.itemSaving = true;
    itemSaveBtn.disabled = true;
    itemStatusText.textContent = 'Saving…';
    const data = {
      itemCode: itemCodeInput.value.trim(),
      description: itemDescriptionInput.value.trim(),
      unit: itemUnitInput.value.trim() || 'Each',
      price: Number(itemPriceInput.value) || 0,
      currency: itemCurrencyInput.value.trim().toUpperCase() || 'ZMW',
      createdBy: Core.state.user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const colRef = supplierItemsCollection(state.editingId);
    const done = (ok, err) => {
      state.itemSaving = false;
      itemSaveBtn.disabled = false;
      if (ok) { itemModal.classList.remove('open'); }
      else { itemStatusText.textContent = 'Save failed: ' + (err && err.message ? err.message : 'check permissions'); }
    };
    if (state.editingItemId) {
      colRef.doc(state.editingItemId).set(data, { merge: true }).then(() => done(true)).catch((err) => done(false, err));
    } else {
      colRef.add(data).then(() => done(true)).catch((err) => done(false, err));
    }
  });

  itemDeleteBtn.addEventListener('click', () => {
    if (!state.editingItemId || !state.editingId) return;
    if (!confirm('Delete this item? This cannot be undone.')) return;
    supplierItemsCollection(state.editingId).doc(state.editingItemId).delete()
      .then(() => itemModal.classList.remove('open'))
      .catch((err) => { itemStatusText.textContent = 'Delete failed: ' + err.message; });
  });

  // ---------- bulk upload items (CSV, scoped to whichever supplier is open) ----------
  const ITEM_BULK_COLUMNS = ['itemCode', 'description', 'unit', 'price', 'currency'];
  let itemBulkParsedItems = null;

  // Minimal CSV parser: handles quoted fields (with embedded commas/newlines) and "" escaping.
  function parseItemCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else { field += c; }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function itemRowsToItems(rows) {
    if (!rows.length) return { items: [], skipped: 0 };
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const colIndex = {};
    ITEM_BULK_COLUMNS.forEach((name) => { colIndex[name] = header.indexOf(name.toLowerCase()); });

    const items = [];
    let skipped = 0;
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const get = (name) => (colIndex[name] >= 0 ? (cells[colIndex[name]] || '').trim() : '');
      const description = get('description');
      if (!description) { skipped++; continue; }
      items.push({
        itemCode: get('itemCode'),
        description: description,
        unit: get('unit') || 'Each',
        price: Number(get('price')) || 0,
        currency: (get('currency') || 'ZMW').toUpperCase()
      });
    }
    return { items, skipped };
  }

  bulkUploadItemsBtn.addEventListener('click', () => {
    if (!state.editingId) return;
    itemBulkFileInput.value = '';
    itemBulkStatusText.textContent = '';
    itemBulkPreview.style.display = 'none';
    itemBulkParsedItems = null;
    itemBulkModal.classList.add('open');
  });
  itemBulkModalClose.addEventListener('click', () => itemBulkModal.classList.remove('open'));

  itemBulkDownloadTemplateBtn.addEventListener('click', () => {
    const sample = ITEM_BULK_COLUMNS.join(',') + '\n' +
      'ACM-100,Sodium Hypochlorite 12.5% 25L,Drum,850,ZAR\n';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier-items-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  itemBulkFileInput.addEventListener('change', () => {
    const file = itemBulkFileInput.files && itemBulkFileInput.files[0];
    itemBulkPreview.style.display = 'none';
    itemBulkParsedItems = null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseItemCsv(String(reader.result));
      const { items, skipped } = itemRowsToItems(rows);
      if (!items.length) {
        itemBulkStatusText.textContent = 'No valid rows found — check that the file has a header row and a description column.';
        return;
      }
      itemBulkParsedItems = items;
      itemBulkStatusText.textContent = skipped ? `${skipped} row(s) skipped (missing description).` : '';
      itemBulkPreviewCount.textContent = `Ready to import ${items.length} item(s).`;
      itemBulkPreview.style.display = '';
    };
    reader.onerror = () => { itemBulkStatusText.textContent = 'Could not read that file.'; };
    reader.readAsText(file);
  });

  itemBulkConfirmBtn.addEventListener('click', () => {
    if (!itemBulkParsedItems || !itemBulkParsedItems.length || !state.editingId) return;
    itemBulkConfirmBtn.disabled = true;
    itemBulkStatusText.textContent = 'Importing…';
    const colRef = supplierItemsCollection(state.editingId);
    const batch = Core.state.db.batch();
    itemBulkParsedItems.forEach((item) => {
      const docRef = colRef.doc();
      batch.set(docRef, Object.assign({}, item, {
        createdBy: Core.state.user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    });
    batch.commit()
      .then(() => {
        itemBulkStatusText.textContent = `Imported ${itemBulkParsedItems.length} item(s).`;
        itemBulkPreview.style.display = 'none';
        itemBulkParsedItems = null;
        setTimeout(() => itemBulkModal.classList.remove('open'), 900);
      })
      .catch((err) => { itemBulkStatusText.textContent = 'Import failed: ' + err.message; })
      .finally(() => { itemBulkConfirmBtn.disabled = false; });
  });

  // ---------- shared supplier picker (used by Supplier POs) ----------
  function renderPickerList() {
    const filtered = filterSuppliers(state.suppliers, pickerSearchInput.value);
    pickerEmptyState.style.display = filtered.length ? 'none' : 'block';
    pickerList.innerHTML = filtered.map((s) => `
      <div class="history-row" data-supplier-id="${s.id}" role="button" tabindex="0">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(s.name || 'Unnamed supplier')}</div>
          <div class="history-sub">${Core.escapeHtml([s.contactName, s.email, s.phone].filter(Boolean).join(' · '))}</div>
        </div>
      </div>`).join('');
  }

  pickerList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-supplier-id]');
    if (!row) return;
    const supplier = state.suppliers.find((s) => s.id === row.dataset.supplierId);
    if (!supplier || !state.pickerCallback) return;
    const cb = state.pickerCallback;
    state.pickerCallback = null;
    pickerModal.classList.remove('open');
    cb(supplier);
  });
  pickerSearchInput.addEventListener('input', renderPickerList);
  pickerModalClose.addEventListener('click', () => { pickerModal.classList.remove('open'); state.pickerCallback = null; });

  function openPicker(onSelect) {
    state.pickerCallback = onSelect;
    pickerSearchInput.value = '';
    renderPickerList();
    pickerModal.classList.add('open');
  }

  // ---------- shared supplier-item picker (used by Supplier POs, once a supplier is chosen) ----------
  function renderItemPickerList() {
    const filtered = filterItems(state.itemPickerItems, itemPickerSearchInput.value);
    itemPickerEmptyState.style.display = filtered.length ? 'none' : 'block';
    itemPickerList.innerHTML = filtered.map((i) => `
      <div class="history-row" data-item-id="${i.id}" role="button" tabindex="0">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(i.itemCode || '—')}</div>
          <div class="history-sub">${Core.escapeHtml(i.description || '')}</div>
        </div>
        <div class="history-total">${Core.escapeHtml(i.currency || '')} ${Core.fmt(i.price)}</div>
      </div>`).join('');
  }

  itemPickerList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-item-id]');
    if (!row) return;
    const item = state.itemPickerItems.find((i) => i.id === row.dataset.itemId);
    if (!item || !state.itemPickerCallback) return;
    const cb = state.itemPickerCallback;
    state.itemPickerCallback = null;
    itemPickerModal.classList.remove('open');
    cb(item);
  });
  itemPickerSearchInput.addEventListener('input', renderItemPickerList);
  itemPickerModalClose.addEventListener('click', () => {
    itemPickerModal.classList.remove('open');
    state.itemPickerCallback = null;
    if (state.itemPickerUnsub) { state.itemPickerUnsub(); state.itemPickerUnsub = null; }
  });

  function openItemPicker(supplierId, supplierName, onSelect) {
    state.itemPickerCallback = onSelect;
    state.itemPickerItems = [];
    itemPickerSearchInput.value = '';
    itemPickerTitle.textContent = 'Pick an item from ' + (supplierName || 'this supplier');
    renderItemPickerList();
    itemPickerModal.classList.add('open');
    if (state.itemPickerUnsub) { state.itemPickerUnsub(); state.itemPickerUnsub = null; }
    state.itemPickerUnsub = supplierItemsCollection(supplierId)
      .orderBy('description')
      .onSnapshot((snap) => {
        state.itemPickerItems = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderItemPickerList();
      }, () => {});
  }

  // ---------- subscription ----------
  // Shared across companies, so it's subscribed once (on first login), like the catalog.
  Core.onCompanyChange(() => {
    if (state.suppliersUnsub) return;
    state.suppliersUnsub = suppliersCollection()
      .orderBy('name')
      .onSnapshot((snap) => {
        state.suppliers = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        renderList();
        renderPickerList();
      }, () => {});
  });

  renderList();

  global.SuppliersModule = { openPicker, openItemPicker, state };
})(window);
