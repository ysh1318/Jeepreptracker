# Deploying the Edofox sync worker to Cloudflare (free, no card required)

You're doing this instead of Firebase Cloud Functions specifically because
Cloudflare Workers has a real free tier — 100,000 requests/day — that
doesn't need a billing card to turn on. Everything below stays inside that
free tier for an app at this scale.

This assumes you're continuing in the same Google Cloud Shell terminal you
were already using, sitting inside the `dd3` project folder.

## Step 1: Move into the worker folder

```bash
cd cf-worker
```

(If you get "no such file or directory," you're not in the `dd3` folder —
run `cd ~/dd3/cf-worker` instead.)

## Step 2: Create a free Cloudflare account (if you don't have one)

1. Open a new browser tab, go to `dash.cloudflare.com/sign-up`
2. Sign up with just an email + password — **no card required** for this step
3. Verify your email if it asks

## Step 3: Install dependencies

Back in the terminal:

```bash
npm install
```

This downloads Wrangler (Cloudflare's CLI tool, similar to the `firebase`
CLI you used before), plus `cheerio` and `jose` which the worker code uses.

## Step 4: Log in to Cloudflare from the terminal

```bash
npx wrangler login
```

This prints a URL and tries to open a browser tab to confirm the login. In
Cloud Shell, it usually can't open a tab automatically — instead it'll show
something like:

```
Opening a link in your default browser: https://dash.cloudflare.com/oauth2/...
```

**Copy that whole URL**, open it in your phone's Chrome (a new tab is
fine), log in, and click **Allow**. Come back to the terminal — it should
say something like "Successfully logged in."

## Step 5: Set your Firebase project ID in the worker code

Open the file `src/index.ts` in this folder (you can view/edit it with
Cloud Shell's built-in editor — tap **Open Editor** near the top of the
Cloud Shell panel, then navigate to `dd3/cf-worker/src/index.ts` in the file
tree on the left).

Find this line near the top:

```ts
const FIREBASE_PROJECT_ID = "jeetracker-a6c9b";
```

If your Firebase project ID is different, change it to match. (You can
check yours by running `firebase use` back in the `dd3` folder — it prints
the currently active project id.) If it already says `jeetracker-a6c9b`,
leave it as-is.

Save the file (Ctrl+S, or the editor auto-saves).

## Step 6: Set the encryption secret

Switch back to the terminal (or open a new terminal tab in Cloud Shell —
there's a `+` icon near the terminal tabs). Make sure you're in the
`cf-worker` folder (`cd ~/dd3/cf-worker` if needed), then:

```bash
npx wrangler secret put EDOFOX_ENC_KEY
```

It'll ask you to paste a value. **Use the same random key you generated
earlier** (the one you already set for Firebase's Secret Manager — if you
don't have it anymore, generate a new one):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy whatever it prints, then paste it into the `wrangler secret put`
prompt from above and press Enter.

## Step 7: Deploy

```bash
npx wrangler deploy
```

This uploads your worker to Cloudflare's free tier. When it finishes, it'll
print a URL that looks like:

```
https://jee-edofox-sync.YOUR-SUBDOMAIN.workers.dev
```

**Copy that exact URL** — you need it in the next step.

## Step 8: Tell the React app where the worker lives

Go back to the main project folder:

```bash
cd ~/dd3
```

Create (or edit) a file named `.env` in this folder — via Cloud Shell's
editor is easiest (**Open Editor** → right-click the `dd3` folder → New
File → name it `.env`). Put this line in it, using the URL you copied in
Step 7:

```
VITE_EDOFOX_WORKER_URL=https://jee-edofox-sync.YOUR-SUBDOMAIN.workers.dev
```

Save the file. This is what `src/lib/edofoxWorker.ts` reads to know where
to send sync requests.

## Step 9: Rebuild and redeploy your React app

Whatever hosting you're using for the frontend (Vercel/Netlify/Firebase
Hosting/etc.), you need to rebuild it so it picks up the new `.env` value —
just editing `.env` alone doesn't do anything until you rebuild. If you're
not sure how your frontend is currently hosted/deployed, tell me and I'll
walk you through that part specifically.

## Step 10: Test it

1. Open your deployed app, sign in as a test student
2. Try linking an Edofox account (the onboarding flow that asks for
   username/password)
3. If it works, you should see the same "Handshaking..." / "Validating
   credentials..." messages as before, ending in a successful profile
   verification

If something fails, the error message shown in the app (or in your
browser's dev tools → Network tab → the request to `/sync-interactive`)
will tell us where to look. Paste it here and we'll debug together.

## A few things worth knowing

- **This is genuinely free at your scale.** Cloudflare Workers' free tier
  is 100,000 requests/day. Even if every student in a large class synced
  Edofox data multiple times a day, you'd be nowhere close to that limit.
- **Updating the worker later:** if you (or a future Claude session) change
  `cf-worker/src/index.ts`, just re-run `npx wrangler deploy` from inside
  `cf-worker` — no need to redo the secret or login steps.
- **The old `functions/` folder still exists in the project** but is no
  longer called by the app — it's kept only for reference/comparison. It's
  safe to ignore it going forward (or delete it later once you're confident
  the Cloudflare version works).
- **Rotating the encryption key:** same caveat as before — if you ever
  change `EDOFOX_ENC_KEY`, every previously-stored `edofoxPasswordEnc` value
  in Firestore becomes undecryptable, and those students would need to
  re-link their Edofox account.
