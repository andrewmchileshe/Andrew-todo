// Thin wrapper around the WhatsApp Cloud API's send-message endpoint.
const logger = require('firebase-functions/logger');

const GRAPH_API_VERSION = 'v21.0';

async function sendText(to, body, token, phoneNumberId) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('WhatsApp send failed', { status: res.status, to, errText });
  }
}

module.exports = { sendText };
