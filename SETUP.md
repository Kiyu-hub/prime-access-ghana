# Clasikal Homes — Setup Guide

Five tasks. ~15 minutes total. Do them in this order.

---

## 1. Create the Supabase project (5 min)

1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. Click **New project**.
3. Fill in:
   - **Name**: `clasikal-homes`
   - **Database password**: pick a strong one and save it (you won't need it day-to-day, but keep it)
   - **Region**: pick the closest to Ghana — `West EU (Ireland)` works well, or `US East`
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## 2. Get the URL + anon key (1 min)

1. Once the project is ready, in the left sidebar click ⚙️ **Project Settings → API**.
2. Copy two values:
   - **Project URL** → looks like `https://abcdxyz.supabase.co`
   - **Project API keys → `anon` `public`** → long string starting with `eyJ...`
3. Open `scripts/config.js` in this folder and paste them:
   ```js
   SUPABASE_URL:      'https://abcdxyz.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...your-anon-key-here...',
   ```

**Important:** the `anon` key is safe to put in browser code. The `service_role` key (right below it on the same page) is NOT — leave it alone.

---

## 3. Run the database schema (2 min)

1. In Supabase sidebar → 🗄️ **SQL Editor** → **+ New query**.
2. Open `db/schema.sql` from this folder.
3. Copy the entire contents and paste them into the editor.
4. Click **Run** (or press Ctrl+Enter).
5. You should see `Success. No rows returned.` plus a few notices. That's expected.
6. To verify, paste this and run:
   ```sql
   select * from verify_login('director@clasikalhomes.com', 'clasikal@2026');
   ```
   You should get back one row with `is_admin = true`.

**Default Director login (CHANGE THE PASSWORD after first sign-in from Admin → Staff):**
- Email: `Director@clasikalhomes.com`
- Password: `clasikal@2026`

---

## 4. Set up Cloudinary unsigned upload preset (3 min)

Your cloud name `dnoji4yat` is already in `config.js`. You just need to create a preset.

1. Sign in at **https://cloudinary.com/console**.
2. Click ⚙️ in the top-right → **Settings**.
3. Open the **Upload** tab.
4. Scroll to **Upload presets** → click **Add upload preset**.
5. Fill in:
   - **Preset name**: `clasikal_products` (or anything you like — write it down)
   - **Signing Mode**: **Unsigned** ← *this is the important one*
   - **Folder**: `clasikal-products` (optional — keeps uploads tidy)
6. (Recommended) Scroll down to **Upload Control**:
   - **Max image file size**: `5000000` (5 MB)
   - **Allowed formats**: `jpg, jpeg, png, webp`
7. Click **Save** at the top.
8. Open `scripts/config.js` and paste the preset name:
   ```js
   CLOUDINARY_UPLOAD_PRESET: 'clasikal_products',
   ```

### ⚠️ One more thing about Cloudinary

The API **secret** I asked you not to share again (`KtBB...`) — it's now sitting in our chat history and can give anyone who reads it full admin access to your account. You said you're okay with that risk for now. If you change your mind, rotate it: **Settings → Security → API Keys → ⋯ → Regenerate**. Don't share the new one with me.

---

## 5. Run the site (1 min)

The site is plain HTML/CSS/JS — no build step. Two ways to run it:

### Option A — Open `index.html` directly

Double-click `index.html`. Works but the service worker (offline / PWA install) won't register on `file://` URLs.

### Option B — Run a tiny local server (recommended)

If you have Python:
```powershell
python -m http.server 5500
```
Then open **http://localhost:5500**. The PWA install prompt should appear after a few seconds.

If you have Node:
```powershell
npx serve .
```

### Deploying to production

Push to GitHub and connect to **Vercel** (https://vercel.com/new) or **Netlify** — both deploy static sites in 30 seconds for free. The Supabase URL + anon key are already in `config.js` so it'll just work. Your Supabase project will need to allow the production URL: **Supabase → Authentication → URL Configuration** (only needed if you later switch to Supabase Auth; the current custom auth doesn't require this).

---

## Troubleshooting

**"Login failed" with the seeded credentials:**
- The schema seed inserts the email in lowercase. Make sure step 3 finished without errors.
- Re-run `select * from verify_login('director@clasikalhomes.com', 'clasikal@2026');` in SQL Editor. If it returns 0 rows, the seed didn't run — re-run `db/schema.sql`.

**Cloudinary upload fails with `Upload preset must be in whitelist`:**
- Your preset is still set to **Signed**. Edit it → Signing Mode → **Unsigned** → Save.

**Service worker doesn't register:**
- You're opening the file via `file://`. Use the local server (Option B above) or deploy.

**Browser console: "Missing config values":**
- Open `scripts/config.js` and fill in any empty strings.

---

That's it. Tell the assistant when you're ready and we'll keep going.
