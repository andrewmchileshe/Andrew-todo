// Product/price catalog. Shared across all three companies (the same products get
// sold under more than one of them) — saved items Quote and Acknowledgement line
// items can pull from instead of retyping cost build-ups and descriptions every time.
// Exposes CatalogModule.openPicker(onSelect) as the integration point for quotes.js/oa.js.
(function (global) {
  const Core = global.Core;

  const el = (id) => document.getElementById(id);

  const catalogSearchInput = el('catalogSearchInput');
  const catalogList = el('catalogList');
  const catalogEmptyState = el('catalogEmptyState');
  const catalogAddBtn = el('catalogAddBtn');
  const catalogBulkUploadBtn = el('catalogBulkUploadBtn');
  const catalogExportPdfBtn = el('catalogExportPdfBtn');
  const catalogExportExcelBtn = el('catalogExportExcelBtn');

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

  const bulkModal = el('catalogBulkUploadModal');
  const bulkModalClose = el('catalogBulkUploadModalClose');
  const bulkDownloadTemplateBtn = el('catalogDownloadTemplateBtn');
  const bulkFileInput = el('catalogBulkFileInput');
  const bulkStatusText = el('catalogBulkStatusText');
  const bulkPreview = el('catalogBulkPreview');
  const bulkPreviewCount = el('catalogBulkPreviewCount');
  const bulkConfirmBtn = el('catalogBulkConfirmBtn');

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

  function catalogCollection() {
    return Core.state.db.collection('catalog');
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
          <button type="button" class="text-btn" data-view-item>View</button>
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
    if (e.target.closest('[data-view-item]')) {
      openItemModal(item, { readOnly: true });
    } else if (e.target.closest('[data-edit-item]')) {
      openItemModal(item);
    } else if (e.target.closest('[data-delete-item]')) {
      if (!confirm(`Delete catalog item "${item.description}"? This cannot be undone.`)) return;
      catalogCollection().doc(item.id).delete().catch((err) => alert('Delete failed: ' + err.message));
    }
  });

  catalogSearchInput.addEventListener('input', renderList);
  catalogAddBtn.addEventListener('click', () => openItemModal(null));

  // ---------- pricelist export (PDF / Excel) ----------
  // Exports whatever the search box is currently showing — the full catalog if it's
  // empty, or just the matching subset if the user has filtered it down.
  catalogExportPdfBtn.addEventListener('click', () => {
    const items = filterItems(state.items, catalogSearchInput.value);
    if (!items.length) { alert('No catalog items to export.'); return; }
    CatalogPdf.generateCatalogPdf(items, Core.companyForPdf());
  });

  catalogExportExcelBtn.addEventListener('click', () => {
    const items = filterItems(state.items, catalogSearchInput.value);
    if (!items.length) { alert('No catalog items to export.'); return; }
    const rows = items.map((item) => ({
      'Item Code': item.itemCode || '',
      'Description': item.description || '',
      'Unit': item.unit || '',
      'Currency': item.sellingCurrency || '',
      'Selling Price': Number(item.sellingPrice) || 0
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 16 }, { wch: 44 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Price List');
    XLSX.writeFile(workbook, 'Pricelist-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  });

  // ---------- add/edit modal ----------
  function blankItemForm() {
    return { itemCode: '', description: '', unit: 'Each', costPrice: 0, costCurrency: 'ZMW', marginMethod: 'margin', marginValue: 0, sellingPrice: 0, sellingCurrency: 'ZMW' };
  }

  const EDITABLE_FIELDS = [itemCodeInput, descriptionInput, unitInput, costPriceInput, costCurrencyInput, marginValueInput, sellingPriceInput, sellingCurrencyInput];

  function openItemModal(item, opts) {
    opts = opts || {};
    const data = item ? Object.assign(blankItemForm(), item) : blankItemForm();
    state.editingId = item ? item.id : null;
    state.editingMarginMethod = data.marginMethod === 'markup' ? 'markup' : 'margin';

    itemModalTitle.textContent = opts.readOnly ? 'View catalog item' : (item ? 'Edit catalog item' : 'Add catalog item');
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
    EDITABLE_FIELDS.forEach((el) => { el.disabled = !!opts.readOnly; });
    [...marginToggle.children].forEach((btn) => { btn.disabled = !!opts.readOnly; });
    useSuggestedBtn.style.display = opts.readOnly ? 'none' : '';
    itemSaveBtn.style.display = opts.readOnly ? 'none' : '';
    itemDeleteBtn.style.display = (item && !opts.readOnly) ? '' : 'none';
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
    const colRef = catalogCollection();
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
    catalogCollection().doc(state.editingId).delete()
      .then(() => itemModal.classList.remove('open'))
      .catch((err) => { itemStatusText.textContent = 'Delete failed: ' + err.message; });
  });

  // ---------- bulk upload (CSV) ----------
  const BULK_COLUMNS = ['itemCode', 'description', 'unit', 'costPrice', 'costCurrency', 'marginMethod', 'marginValue', 'sellingPrice', 'sellingCurrency'];
  let bulkParsedItems = null;

  // Minimal CSV parser: handles quoted fields (with embedded commas/newlines) and "" escaping.
  // No external library needed for data this simple.
  function parseCsv(text) {
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

  function rowsToItems(rows) {
    if (!rows.length) return { items: [], skipped: 0 };
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const colIndex = {};
    BULK_COLUMNS.forEach((name) => { colIndex[name] = header.indexOf(name.toLowerCase()); });

    const items = [];
    let skipped = 0;
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const get = (name) => (colIndex[name] >= 0 ? (cells[colIndex[name]] || '').trim() : '');
      const description = get('description');
      if (!description) { skipped++; continue; }
      const marginMethod = get('marginMethod').toLowerCase() === 'markup' ? 'markup' : 'margin';
      items.push({
        itemCode: get('itemCode'),
        description: description,
        unit: get('unit') || 'Each',
        costPrice: Number(get('costPrice')) || 0,
        costCurrency: (get('costCurrency') || 'ZMW').toUpperCase(),
        marginMethod: marginMethod,
        marginValue: Number(get('marginValue')) || 0,
        sellingPrice: Number(get('sellingPrice')) || 0,
        sellingCurrency: (get('sellingCurrency') || 'ZMW').toUpperCase()
      });
    }
    return { items, skipped };
  }

  catalogBulkUploadBtn.addEventListener('click', () => {
    bulkFileInput.value = '';
    bulkStatusText.textContent = '';
    bulkPreview.style.display = 'none';
    bulkParsedItems = null;
    bulkModal.classList.add('open');
  });
  bulkModalClose.addEventListener('click', () => bulkModal.classList.remove('open'));
  bulkModal.addEventListener('click', (e) => { if (e.target === bulkModal) bulkModal.classList.remove('open'); });

  bulkDownloadTemplateBtn.addEventListener('click', () => {
    const sample = BULK_COLUMNS.join(',') + '\n' +
      'ABC-123,Example Widget 500g,Each,120,USD,margin,30,,ZMW\n';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  bulkFileInput.addEventListener('change', () => {
    const file = bulkFileInput.files && bulkFileInput.files[0];
    bulkPreview.style.display = 'none';
    bulkParsedItems = null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result));
      const { items, skipped } = rowsToItems(rows);
      if (!items.length) {
        bulkStatusText.textContent = 'No valid rows found — check that the file has a header row and a description column.';
        return;
      }
      bulkParsedItems = items;
      bulkStatusText.textContent = skipped ? `${skipped} row(s) skipped (missing description).` : '';
      bulkPreviewCount.textContent = `Ready to import ${items.length} item(s).`;
      bulkPreview.style.display = '';
    };
    reader.onerror = () => { bulkStatusText.textContent = 'Could not read that file.'; };
    reader.readAsText(file);
  });

  bulkConfirmBtn.addEventListener('click', () => {
    if (!bulkParsedItems || !bulkParsedItems.length) return;
    bulkConfirmBtn.disabled = true;
    bulkStatusText.textContent = 'Importing…';
    const colRef = catalogCollection();
    const batch = Core.state.db.batch();
    bulkParsedItems.forEach((item) => {
      const docRef = colRef.doc();
      batch.set(docRef, Object.assign({}, item, {
        createdBy: Core.state.user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    });
    batch.commit()
      .then(() => {
        bulkStatusText.textContent = `Imported ${bulkParsedItems.length} item(s).`;
        bulkPreview.style.display = 'none';
        bulkParsedItems = null;
        setTimeout(() => bulkModal.classList.remove('open'), 900);
      })
      .catch((err) => { bulkStatusText.textContent = 'Import failed: ' + err.message; })
      .finally(() => { bulkConfirmBtn.disabled = false; });
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

  // ---------- subscription ----------
  // Shared across companies, so it's subscribed once (on first login) rather than
  // re-subscribed on every company switch, unlike the quotations/acknowledgements lists.
  Core.onCompanyChange(() => {
    if (state.itemsUnsub) return;
    state.itemsUnsub = catalogCollection()
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
