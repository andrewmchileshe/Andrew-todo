# Sales Suite — one-time setup

Everything in this folder is done. These steps are the parts only you can do,
since they require your own Google/Firebase account. Do them in order.

## 1. Install the tools (once, on your machine)

- Install Node.js (LTS) from https://nodejs.org if you don't have it.
- Install the Firebase CLI:
  ```
  npm install -g firebase-tools
  ```
- Log in (opens a browser window):
  ```
  firebase login
  ```

## 2. Create a new Firebase project

Don't reuse the personal `andrew-todo-4d4ac` project — this app gets its own.

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it something like `chemsol-sales-suite`. Google Analytics is optional — skip it.
3. Once created, click the **web (`</>`)** icon to register a web app (any nickname).
4. Copy the `firebaseConfig` object it shows you into **`firebase-config.js`** in this
   folder, replacing the placeholder values.

## 3. Turn on Authentication and Firestore

1. In the Firebase console, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to **Build → Firestore Database → Create database**. Choose **production mode**
   and a region close to Zambia (e.g. `europe-west1` or `europe-west4`).

## 4. Link this folder to the project and deploy the security rules

From this folder (`SALES SUITE APP/`):
```
firebase use --add
```
Pick the project you just created, alias it `default` (this updates `.firebaserc`).
Then deploy the rules:
```
firebase deploy --only firestore:rules
```

## 5. Create the three company documents

In the Firebase console, go to **Firestore Database → Start collection**, name it
`companies`, and create three documents (use these exact IDs):

| Document ID | `name` | `oaPrefix` | `oaCounter` |
|---|---|---|---|
| `chemsol-limited` | Chemsol Limited | CL | 1000 |
| `chemsol-scientific` | Chemsol Scientific | CS | 1000 |
| `labmall-scientific` | Labmall Scientific | LS | 1000 |

Add `address`, `phone`, `email` too if you want the PDF letterhead filled in right away
— otherwise any signed-in staff member can fill these in later from the app's Settings
(gear icon), which writes to the same fields.

`oaCounter: 1000` means the *first* Acknowledgement issued will be numbered `1001`,
matching what you asked for.

## 6. Create your own account (admin)

1. **Authentication → Users → Add user.** Enter your email and a password.
2. Copy the new user's **UID** from the users list.
3. **Firestore Database → `users` collection → Add document.** Use that UID as the
   document ID, with fields:
   - `email` (string) — your email
   - `displayName` (string) — your name, e.g. `Andrew Chileshe`
   - `role` (string) — `admin`

   (Admins don't need a `companyId` field — the app's company switcher lets you pick
   any of the three.)

## 7. Create each team member's account

For every staff member, repeat:

1. **Authentication → Users → Add user** — their email + a temporary password (tell
   them to change it after first login; Firebase's "forgot password" flow works once
   you also enable it in step 3, or you can just set a password directly here).
2. Copy their UID.
3. **Firestore → `users` collection → Add document**, ID = their UID, fields:
   - `email` — their email
   - `displayName` — their name
   - `companyId` — one of `chemsol-limited`, `chemsol-scientific`, `labmall-scientific`
   - `role` — `member`

They'll only ever see and edit that one company's quotes and acknowledgements.

## 8. Deploy the app so the team can reach it

```
firebase deploy --only hosting
```
This prints a URL like `https://chemsol-sales-suite.web.app` — that's what you share
with the team. Re-run this command any time the app's files change.

## 9. Try it

Open the hosting URL, sign in with your admin account, switch between companies with
the dropdown, create a quotation, and use the **"To OA"** button on a saved quotation
in Quotes → History to convert it into an Acknowledgement.

---

### Adding more team members later

Repeat step 7 whenever someone new joins — there's no self-serve invite flow yet.
