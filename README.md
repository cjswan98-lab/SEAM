# Seam

A daily brief on mining, solar and hydropower, trading and logistics, and inbound
capital across Central and Southern Africa — plus copper, thermal coal, coking coal
and coke prices. Runs in any browser.

```
public/index.html         the whole app
public/manifest.json      lets it install to a phone home screen
netlify/functions/        the server side, where the API keys live
netlify/lib/util.mjs      shared passcode check
netlify.toml              build config
```

## Why there is a server side

An API key cannot live in a web page — anyone who opens the page can read it. The
three functions hold the keys and forward requests, so the browser only ever talks
to your own domain. The `public/` folder is the only thing published; function
source never ships to visitors.

---

## Step 1 — Put it on GitHub

Install git if you don't have it, then from inside this `seam` folder:

```bash
git init
git add .
git commit -m "Seam: initial commit"
```

Create an empty repo at github.com/new. **Don't** tick "Add a README" — you already
have one. Name it `seam`, keep it private if you like; Netlify can read private repos.

GitHub shows you the push commands on the next screen. They'll look like:

```bash
git remote add origin https://github.com/YOUR-USERNAME/seam.git
git branch -M main
git push -u origin main
```

If you'd rather not touch the command line, GitHub Desktop does the same thing:
**File → Add local repository**, point it at this folder, then **Publish repository**.

## Step 2 — Connect Netlify

1. Sign in at netlify.com with your GitHub account.
2. **Add new site → Import an existing project → GitHub**, authorise, pick `seam`.
3. Netlify reads `netlify.toml`, so the build settings should already be right:
   - Build command: *(empty)*
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Click **Deploy**.

The first deploy will succeed but the app won't fetch anything yet — no keys.

## Step 3 — Add the keys

**Site configuration → Environment variables → Add a variable.**

| Name | Required | What it is |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | console.anthropic.com → API keys |
| `SEAM_PASSCODE` | yes | Any phrase you choose. Guards your credits. |
| `CLAUDE_MODEL` | no | Defaults to `claude-sonnet-5` |
| `X_BEARER_TOKEN` | no | See the X section below |

Then **Deploys → Trigger deploy → Deploy site** so the variables take effect.
Environment variables are not picked up by an existing build.

Open the URL, enter your passcode. On a phone use **Share → Add to Home Screen** and
it opens full-screen like an app.

**Set `SEAM_PASSCODE` before you share the link.** Without it the endpoints are open
to anyone who finds the URL, spending your API credits.

## Step 4 — Optional, a proper domain

**Domain management → Add a domain.** Netlify handles the HTTPS certificate. A
`seam.yourdomain.com` subdomain takes about five minutes once DNS points at it.

---

## Updating it later

```bash
git add .
git commit -m "tweak the X account list"
git push
```

Netlify rebuilds on every push to `main`. Pull requests get their own preview URL.

## Running cost

Netlify's free tier covers this comfortably: static hosting plus roughly 150 function
calls a day against a 125,000/month allowance. The real cost is Anthropic API usage —
six web-search calls per refresh, once a day. Low tens of US cents daily for one user,
so a few dollars a month. Web search bills per search on top of tokens; current rates
at anthropic.com/pricing.

## X — read this before you budget for it

X is the one source here that can't be done cheaply or legitimately scraped.

- The **free X API tier has no search access.** It is write-only. There is no way to
  pull posts with it.
- **Basic is around $200/month** for roughly 10,000 posts. That's the entry point for
  `/2/tweets/search/recent`, which `netlify/functions/x.mjs` calls. Pro runs into four
  figures.
- Scraping x.com or using a Nitter mirror breaches X's terms and gets blocked in
  practice. Neither is built here.

**Without a token** the X tab still works but weakly — it falls back to web search over
indexed x.com pages, and X blocks most crawlers, so results are thin and stale. Treat
it as a placeholder.

**With a token** (developer.x.com → your project → Keys and tokens → Bearer Token) the
flow is: five targeted searches per refresh, deduplicated and ranked by engagement, top
60 passed to Claude to discard promotion, shilling and unsourced rumour, keeping only
posts tied to a named party or event.

### The knob that matters

The `ACCOUNTS` array in `netlify/functions/x.mjs` is the highest-leverage thing in this
repo. Keyword searches on X return mostly noise; twenty handles who actually break
Copperbelt, corridor and Transnet news return signal. The defaults are a starting
point — swap in whoever you already follow, push, and Netlify redeploys.

Worth testing Basic for a single month before committing to it.

## Local development

```bash
npm install -g netlify-cli
netlify dev
```

Serves `public/` and the functions together at localhost:8888. Put your keys in a
`.env` file in this folder — it's gitignored, so it won't reach GitHub.

## What it still doesn't do

No scheduled delivery. It fetches when you open it and caches for the day. A 6am email
or push would need a Netlify scheduled function plus somewhere to store the result —
a straightforward addition, but not built here.
