const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const { sendText } = require('./whatsapp');
const { searchCatalog, formatMatches } = require('./catalogLookup');

admin.initializeApp();
const db = admin.firestore();

const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');

const WELCOME =
  'Hi, thanks for reaching Labmall Scientific! \n' +
  'Send a product name or code to check pricing, e.g. "beaker 250ml".\n' +
  'Reply "agent" any time to talk to our team.';

async function handleIncomingMessage(message, token, phoneNumberId) {
  const from = message.from;
  const text = (message.text && message.text.body || '').trim();
  if (!text) return;

  if (/^(hi|hello|hey|start|menu)$/i.test(text)) {
    await sendText(from, WELCOME, token, phoneNumberId);
    return;
  }

  if (/^agent$/i.test(text)) {
    await sendText(from, "Got it — flagging this for our team, they'll message you shortly.", token, phoneNumberId);
    return;
  }

  const matches = await searchCatalog(db, text);
  await sendText(from, formatMatches(matches), token, phoneNumberId);
}

// Single endpoint for both halves of the WhatsApp Cloud API webhook contract:
// Meta issues a GET once to verify ownership, then POSTs every subsequent event here.
exports.whatsappWebhook = onRequest(
  { secrets: [WHATSAPP_TOKEN, WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (req, res) => {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const verifyToken = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && verifyToken === WHATSAPP_VERIFY_TOKEN.value()) {
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
      return;
    }

    if (req.method === 'POST') {
      try {
        const entry = req.body?.entry?.[0];
        const change = entry?.changes?.[0];
        const messages = change?.value?.messages;

        if (messages && messages.length) {
          const token = WHATSAPP_TOKEN.value();
          const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
          for (const message of messages) {
            await handleIncomingMessage(message, token, phoneNumberId);
          }
        }
        // Anything else in the payload (delivery/read status updates) is ignored.
      } catch (err) {
        logger.error('Error handling WhatsApp webhook event', err);
      }
      // Always 200 — WhatsApp retries aggressively on non-2xx, which would just
      // replay the same message and risk duplicate replies.
      res.sendStatus(200);
      return;
    }

    res.sendStatus(405);
  }
);
