# WhatsApp chatbot — one-time setup

The webhook code lives in `functions/`. These steps connect it to a real
WhatsApp Business number — they need your own Meta/Facebook account and
can't be done from here.

## 1. Put the Firebase project on the Blaze (pay-as-you-go) plan

The function calls out to Meta's API, which the free Spark plan blocks.
Blaze needs a card on file but has a large free tier — a single WhatsApp
line won't come close to it. In the Firebase console: **⚙️ → Usage and
billing → Modify plan → Blaze**.

## 2. Create a Meta app and add WhatsApp

1. Go to https://developers.facebook.com/apps and click **Create App** →
   type **Business**.
2. In the app dashboard, **Add product** → **WhatsApp** → **Set up**.
3. Under **API Setup** you'll see a test phone number, a **temporary
   access token**, and a **Phone number ID** — copy the Phone number ID.
4. To use your real Labmall Scientific WhatsApp number instead of the test
   one: **WhatsApp → API Setup → Add phone number**, and verify it there.
5. For a token that doesn't expire in 24 hours: **Business Settings →
   Users → System Users → Add**, give it the WhatsApp app with `whatsapp_business_messaging`
   permission, then **Generate token** (choose "Never" for expiration).

## 3. Pick a verify token

Make up any random string yourself, e.g. `labmall-wa-9f2c1d`. You'll enter
it in two places (Meta's webhook config and a Firebase secret below) —
Meta echoes it back on setup so both sides can confirm they agree.

## 4. Store the three secrets

From the `SALES SUITE APP/functions` folder:
```
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
```
Paste the matching value at each prompt (the System User token, the verify
token you made up, and the Phone number ID from step 2).

## 5. Deploy the function

```
cd "SALES SUITE APP"
firebase deploy --only functions
```
This prints a URL like:
```
https://us-central1-labmall-sales-suite.cloudfunctions.net/whatsappWebhook
```
Copy it.

## 6. Point Meta's webhook at it

1. In the Meta app: **WhatsApp → Configuration → Webhook → Edit**.
2. Callback URL: the function URL from step 5.
3. Verify token: the same string you chose in step 3.
4. Click **Verify and save** — Meta calls the URL with a GET request; the
   function checks the token and echoes back the challenge.
5. Under **Webhook fields**, click **Manage** and subscribe to `messages`.

## 7. Try it

Send a WhatsApp message to the number from step 2 (from a different
phone). Try:
- `hi` — get the welcome message
- a product code or name from your catalog, e.g. `beaker 250ml` — get up
  to 5 matching items with price
- `agent` — get the human-handoff acknowledgement

Check `firebase functions:log` if a reply doesn't arrive — most issues at
this stage are a mismatched verify token or a stale/expired access token.

## What this bot does today

- Answers with catalog matches (item code, description, price) for
  whatever text a customer sends, reusing the same `catalog` collection
  the Sales Suite app already maintains.
- Replies to "hi"/"hello" with a short welcome/menu message.
- Replies to "agent" with a placeholder handoff message — it doesn't yet
  notify your team. Extend `functions/index.js` (e.g. write to a Firestore
  collection your team monitors, or call another API) to make that real.

## Costs

Customer-initiated replies (this bot only replies, never messages first)
are free under Meta's current WhatsApp pricing. The only real cost risk is
if you later add code that messages a customer *first* outside a reply —
that's billed per conversation. Firebase Functions/Firestore usage for one
WhatsApp line will stay well inside the Blaze free tier.
