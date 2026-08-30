// Product lookups for the WhatsApp bot, against the same shared `catalog`
// collection the Sales Suite app itself reads (see ../catalog.js filterItems).

async function searchCatalog(db, query, limit = 5) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  const snap = await db.collection('catalog').get();
  const matches = [];
  snap.forEach((doc) => {
    const item = doc.data();
    const code = (item.itemCode || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    if (code.includes(q) || desc.includes(q)) matches.push(item);
  });
  return matches.slice(0, limit);
}

function formatMatches(matches) {
  if (!matches.length) {
    return "Sorry, I couldn't find that product. Try a different item code or name, or reply \"agent\" to talk to our team.";
  }
  return matches
    .map((item) => {
      const price = Number(item.sellingPrice || 0).toFixed(2);
      return `*${item.itemCode || '—'}* — ${item.description || ''}\n${item.sellingCurrency || ''} ${price} / ${item.unit || 'each'}`;
    })
    .join('\n\n');
}

module.exports = { searchCatalog, formatMatches };
