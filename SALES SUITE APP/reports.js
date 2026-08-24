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
          <button type="button" class="text-btn" data-open-followup>Open</button>
        </div>
      </div>`).join('');
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
  global.QuotesModule.onHistoryChange(render);
  render();
})(window);
