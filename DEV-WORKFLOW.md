# Dev & Live workflow — what's separated, what isn't, and how to test new code without it reaching everyone

> **TL;DR**: the **data** sandbox is built-in (env=dev/live column). The **code** sandbox needs a 5-minute one-time Netlify setting and a `dev` git branch. After that, you push code to `dev` and only the dev URL gets it.

---

## 1 · What "Dev mode" inside the app already does

The Dev/Live toggle in the System Admin sidebar separates **data only**:

| | What it does |
| --- | --- |
| **Live mode** | Reads/writes hit `env='live'` rows. This is what every normal user sees. |
| **Dev mode** | Reads return **both** `env='live'` AND `env='dev'` rows (so System Admin can test against real products, real sales, real transfers). Writes always tag with `env='dev'` — they stay invisible to Live users. |
| **Publish dev → live** | Copies the `env='dev'` row to its `env='live'` counterpart. The dev row stays for further testing. |
| **Reset demo data** | Wipes every `env='dev'` row. Live data is never touched. |

This part needs no extra setup — it's all in the Phase 4 migration.

---

## 2 · What Dev mode does NOT do (and why)

It cannot separate **code**. The HTML / JS / CSS bundle that Netlify serves is one file tree shared by everyone. So when you push a code change to GitHub, Netlify builds and **every user gets the new version**.

To test new code privately, you need a second URL serving the unmerged code.

---

## 3 · Free setup: Netlify branch deploys

One-time setup (5 minutes):

1. In **Netlify** → your site → **Site settings** → **Build & deploy** → **Branches & deploy contexts** → set **Branch deploys** to **All** (or specifically list `dev`).
2. In **GitHub**, create a `dev` branch off `main`:
   ```bash
   git checkout -b dev
   git push -u origin dev
   ```
3. Netlify auto-builds a new URL: **`dev--clasikal.netlify.app`** (the exact subdomain depends on your site name).

After setup, your workflow becomes:

| Goal | What to do |
| --- | --- |
| Test a code change privately | `git checkout dev` → make changes → commit → `git push origin dev`. Only the dev URL updates. |
| Publish the tested code to Live | `git checkout main` → `git merge dev` → `git push origin main`. Live URL updates. |
| Two-person workflow | Open a PR from `dev` → `main` on GitHub; merge when ready. |

System Admin signs in at the **dev URL** to test new code + uses the **Dev mode** toggle to test new data. When everything works, merge to `main`.

---

## 4 · Frequently asked

**Q: Can I push the same commit to dev and main at once?**
A: Yes — `git checkout main && git merge dev && git push origin main`. Or use GitHub's merge button.

**Q: Will Supabase data leak between the two URLs?**
A: They share the same Supabase project. The `env` column on every row is what isolates data, *not* the URL. So:
- Live URL + Live mode = sees `env='live'` only ✅
- Live URL + Dev mode = sees both (only System Admin can do this on Live) ⚠️
- Dev URL + Live mode = sees `env='live'` only ✅
- Dev URL + Dev mode = sees both ✅

If you want **complete** isolation (separate database too), you'd need a second Supabase project for dev. That's still free on the Supabase free tier but adds maintenance.

**Q: Do I need to keep `dev` in sync with `main`?**
A: Rebase or merge `main` into `dev` periodically so dev tests against the current Live code state.

---

## 5 · Until branch deploys are enabled

If Netlify branch deploys aren't configured yet, your options are:

1. **Local-only testing** — run `python -m http.server 5500` in this folder and open `http://localhost:5500`. Only you see it. Combine with Dev mode toggle for isolated data.
2. **Vercel preview deploys** — Vercel does branch previews automatically with no setup. Add the same project to Vercel and use its preview URLs.
3. **Push to main and accept the live update** — what we do now. Risky for breaking changes; fine for small fixes.

The recommended path is #1 (local) plus enabling branch deploys when you have a few minutes.
