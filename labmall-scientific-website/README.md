# Labmall Scientific Website

Next.js (App Router) website for Labmall Scientific — an independent laboratory
supplies distributor serving Africa's research, industrial, mining, water, and
educational laboratories. Built from `labmall_website_brief.md`.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables (RFQ auto-response email)

Copy `.env.example` to `.env.local` and fill in SMTP credentials for the RFQ
form to send a real acknowledgement email (and notify sales@labmallscientific.com).
Without these set, RFQ submissions still succeed and are logged server-side,
but no email is sent — the form tells the user delivery isn't configured yet.

Recommended: use the Hostinger-hosted mailbox for `sales@labmallscientific.com`
(hPanel → Emails → Connect Apps / SMTP settings).

## Deploying to Hostinger

The `/products`, `/about`, `/brands`, `/industries`, `/legal/*`, and `/rfq`
pages are fully static and export cleanly. **The RFQ form's backend
(`/api/rfq`) is a server route**, which needs a Node.js runtime — it will
not work on a plain static/shared hosting plan. Two options:

1. **Hostinger Node.js Hosting** (recommended) — deploy this project as-is
   (`npm run build && npm run start`, or point Hostinger's Node app manager
   at `next start`). Everything works out of the box, including the RFQ
   email.
2. **Static export** — if you're on shared/static hosting only, run
   `next build` with `output: "export"` in `next.config.ts` and swap the RFQ
   form's `fetch("/api/rfq")` call for a third-party form backend (e.g.
   Web3Forms, Formspree) since there's no server to run `/api/rfq`.

## Visual assets — pending

Every image on the site is currently a labeled placeholder
(`PlaceholderVisual` component) marked "Visual pending — Higgsfield
generation." These need to be generated (product photography, hero/lab
imagery, category banners) and dropped into `/public`, then swapped into the
relevant components. The real logo files (`fulllogo.png`,
`fulllogo_transparent.png`, etc.) also still need to be added to `/public`
and wired into `src/components/Logo.tsx` (currently a placeholder wordmark
built from the brief's color palette).

## Still open (from the brief, section 13)

- Confirm business hours (currently set to Mon–Fri 08:00–17:00 CAT — confirm Saturday hours if any)
- Final hero product selection (currently all 42 launch SKUs are shown)
- Real product photography
- Which of the 36 brands (if any) have granted logo-use permission
- Legal pages (`/legal/terms`, `/legal/trademark-disclaimer`,
  `/legal/listing-disclaimer`) were drafted from the brief's outline —
  have them reviewed by counsel before publishing if a fuller version exists
  elsewhere.

## Project structure

- `src/app` — routes (App Router)
- `src/components` — shared UI (Header, Footer, ProductCard, etc.)
- `src/data` — site content as structured data (products, brands, industries, company info)
