// Quote success-rate reporting. Reads QuotesModule's already-synced history —
// no separate Firestore query needed — and re-renders whenever that data changes.
(function (global) {
  const Core = global.Core;

  const el = (id) => document.getElementById(id);

  const sentCountEl = el('reportSentCount');
  const wonCountEl = el('reportWonCount');
  const lostCountEl = el('reportLostCount');
  const pendingCountEl = el('reportPendingCount');
  const winRateEl = el('reportWinRate');
  const notSentCountEl = el('reportNotSentCount');
  const valueListEl = el('reportValueList');
  const followUpListEl = el('reportFollowUpList');
  const followUpEmptyEl = el('reportFollowUpEmptyState');

  const cpoValueListEl = el('reportCpoValueList');
  const cpoPdfBtn = el('reportCpoPdfBtn');
  const CPO_STATUS_ORDER = ['received', 'in-progress', 'fulfilled', 'cancelled'];
  const CPO_STATUS_LABELS = { received: 'Received', 'in-progress': 'In Progress', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };

  const poValueListEl = el('reportPoValueList');
  const poPdfBtn = el('reportPoPdfBtn');
  const PO_STATUS_ORDER = ['open', 'in-transit', 'delivered', 'cancelled'];
  const PO_STATUS_LABELS = { open: 'Open', 'in-transit': 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled' };

  function computeStats(items) {
    let sent = 0, won = 0, lost = 0, notSent = 0, pending = 0;
    const wonValue = {};
    const pendingValue = {};
    const followUp = [];

    items.forEach((item) => {
      const status = global.QuotesModule.trackingStatus(item);
      if (status === 'not-sent') { notSent++; return; }
      sent++;
      const currency = item.baseCurrency || 'ZMW';
      if (status === 'won') {
        won++;
        wonValue[currency] = (wonValue[currency] || 0) + (Number(item.grandTotal) || 0);
      } else if (status === 'lost') {
        lost++;
      } else {
        pending++;
        pendingValue[currency] = (pendingValue[currency] || 0) + (Number(item.grandTotal) || 0);
        followUp.push(item);
      }
    });

    const decided = won + lost;
    const winRate = decided ? Math.round((won / decided) * 100) : null;
    followUp.sort((a, b) => (a.sentDate || '').localeCompare(b.sentDate || ''));

    return { sent, won, lost, notSent, pending, winRate, wonValue, pendingValue, followUp };
  }

  function formatValueLines(byCurrency, label) {
    const currencies = Object.keys(byCurrency);
    if (!currencies.length) return `<div class="totals-row"><span>${label}</span><span>—</span></div>`;
    return currencies.map((c) =>
      `<div class="totals-row"><span>${label} (${Core.escapeHtml(c)})</span><span>${c} ${Core.fmt(byCurrency[c])}</span></div>`
    ).join('');
  }

  function render() {
    const items = global.QuotesModule.state.historyItems;
    const stats = computeStats(items);

    sentCountEl.textContent = stats.sent;
    wonCountEl.textContent = stats.won;
    lostCountEl.textContent = stats.lost;
    pendingCountEl.textContent = stats.pending;
    winRateEl.textContent = stats.winRate === null ? '—' : stats.winRate + '%';
    notSentCountEl.textContent = stats.notSent;

    valueListEl.innerHTML =
      formatValueLines(stats.wonValue, 'Won') +
      formatValueLines(stats.pendingValue, 'Pending decision');

    followUpEmptyEl.style.display = stats.followUp.length ? 'none' : 'block';
    followUpListEl.innerHTML = stats.followUp.map((item) => `
      <div class="history-row" data-followup-id="${item.id}">
        <div class="history-main">
          <div class="history-title">${Core.escapeHtml(item.quoteNumber)}</div>
          <div class="history-sub">${Core.escapeHtml((item.client && item.client.name) || 'No client')} · sent ${Core.escapeHtml(item.sentDate || '')}</div>
        </div>
        <div class="history-total">${item.baseCurrency} ${Core.fmt(item.grandTotal)}</div>
        <div class="history-actions">
          <button type="button" class="text-btn" data-open-followup>Edit</button>
        </div>
      </div>`).join('');
  }

  // Groups PO/CPO history items by status and sums their Kwacha value. Older documents
  // saved before per-order exchange rates existed have no kwachaValue field — fall back
  // to their subtotal (those were always entered as ZMW at the time).
  function computeStatusValueReport(items, statusOrder, statusLabels) {
    const byStatus = {};
    statusOrder.forEach((s) => { byStatus[s] = { count: 0, kwachaValue: 0 }; });
    let grandTotal = 0;
    items.forEach((item) => {
      const status = statusOrder.includes(item.status) ? item.status : statusOrder[0];
      const value = item.kwachaValue != null ? Number(item.kwachaValue) : (Number(item.subtotal) || 0);
      byStatus[status].count += 1;
      byStatus[status].kwachaValue += value;
      grandTotal += value;
    });
    const rows = statusOrder.map((s) => ({ label: statusLabels[s], count: byStatus[s].count, kwachaValue: byStatus[s].kwachaValue }));
    return { rows, grandTotal };
  }

  function renderStatusValueReport(container, rows, grandTotal) {
    container.innerHTML = rows.map((r) =>
      `<div class="totals-row"><span>${Core.escapeHtml(r.label)} (${r.count})</span><span>ZMW ${Core.fmt(r.kwachaValue)}</span></div>`
    ).join('') + `<div class="totals-row grand"><span>Total</span><span>ZMW ${Core.fmt(grandTotal)}</span></div>`;
  }

  function renderCpoReport() {
    const { rows, grandTotal } = computeStatusValueReport(global.CustomerPurchaseOrdersModule.state.historyItems, CPO_STATUS_ORDER, CPO_STATUS_LABELS);
    renderStatusValueReport(cpoValueListEl, rows, grandTotal);
    cpoPdfBtn.onclick = () => global.ReportPdf.generateStatusValueReportPdf('Customer PO Value by Status', rows, grandTotal, Core.companyForPdf());
  }

  function renderPoReport() {
    const { rows, grandTotal } = computeStatusValueReport(global.PurchaseOrdersModule.state.historyItems, PO_STATUS_ORDER, PO_STATUS_LABELS);
    renderStatusValueReport(poValueListEl, rows, grandTotal);
    poPdfBtn.onclick = () => global.ReportPdf.generateStatusValueReportPdf('Supplier PO Cost Value by Status', rows, grandTotal, Core.companyForPdf());
  }

  followUpListEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-followup-id]');
    if (!row || !e.target.closest('[data-open-followup]')) return;
    const item = global.QuotesModule.state.historyItems.find((i) => i.id === row.dataset.followupId);
    if (!item) return;
    global.QuotesModule.openQuote(item);
    document.getElementById('navQuotesBtn').click();
  });

  el('navReportsBtn').addEventListener('click', render);
  el('navReportsBtn').addEventListener('click', renderCpoReport);
  el('navReportsBtn').addEventListener('click', renderPoReport);
  global.QuotesModule.onHistoryChange(render);
  global.CustomerPurchaseOrdersModule.onHistoryChange(renderCpoReport);
  global.PurchaseOrdersModule.onHistoryChange(renderPoReport);
  render();
  renderCpoReport();
  renderPoReport();
})(window);
