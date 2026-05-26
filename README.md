# Clasikal Homes — Inventory & Sales Portal

A modern, multi-branch inventory & sales platform built for Clasikal Homes (Ghana). It runs in any browser, installs as a PWA on phones and laptops, and is operated end-to-end from a single dashboard.

---

## What it does

| Area | Capabilities |
| --- | --- |
| **Product inventory** | Per-branch catalog with photos, item codes, prices, stock, categories, materials, colors, dimensions, suppliers |
| **Showrooms** | A polished, customer-facing catalog view per branch + a global search across every branch |
| **Warehouse Stock** | Dedicated showroom-style card grid for warehouse inventory — quantity-led, no money. Warehouse Manager is auto-scoped to their warehouse(s). |
| **Sales** | Walk-in sale capture → branded PDF invoice with QR/code + warehouse verification |
| **Inter-branch transfers** | Request product from another branch with payment + delivery info (internal courier or external/3rd-party) |
| **Multi-warehouse** | Branches can share or own warehouses; one manager can own multiple branches or warehouses |
| **Drafts & approvals** | Imported / OCR-extracted products land in Drafts until reviewed by a System Manager / Branch Manager |
| **Excel import / export** | Bulk upload products from `.xlsx`/`.csv`; export the whole catalog any time |
| **OCR ("Extract from image")** | Paste an inventory photo, run Tesseract.js OCR, turn the text into draft products |
| **Activity log** | Every meaningful action (sale, transfer, role change, edit, delete) is recorded |
| **Reports & analytics** | Date-filtered (Today / week / month / year / All time / custom range) sales summary, sales by branch, payments received broken down by account **and** method, and a full transaction ledger (date+time, branch, staff, client, amount, method, account, paid/unpaid, status). All role-scoped and exportable as a branded PDF "Business Report". |
| **Messages** | Built-in chat between staff and Director / System Manager |
| **Announcements** | One-to-many broadcasts visible to all staff except the super roles |
| **Taxonomy** | Maintain shared category and material lists |
| **Payment accounts** | Per-branch MoMo / bank / POS accounts shown to customers and transfer requesters |
| **Branded PDF invoices** | Auto-generated, on-brand invoices with the company logo, contact, payment account |
| **Move Stock (direct)** | Director / System Manager moves stock between warehouses without the request/receive ceremony — atomic, logged, captured in Reports |
| **Cash receipt confirmation** | New Sale form requires the cashier to tick a "cash physically received" affirmation before the invoice is issued |
| **Media Library** | System Manager bulk-uploads images to Cloudinary, search/copy/delete from a gallery |
| **Staff ID Cards** | Branded ID cards with photo + QR; pick a template (Classic / Modern / Minimal), accent colour, fields; print all staff in one go |
| **Dev / Live mode** | System Manager toggles a sandbox mode at the sidebar — products, transfers, orders, logs, media are isolated until reset |
| **PWA / offline shell** | Installable, with a service worker that caches the shell for offline use |

---

## Roles & permissions

There are five roles. Two are "super" roles (`is_admin = true` in the database):

| Role | Scope | Visible navigation |
| --- | --- | --- |
| **Director** (`admin`) | Owns the business. Full access **except** data-ops pages (Drafts, Extract from image, Import Excel) which belong to the System Admin. System Admin accounts are invisible to the Director (not listed in Staff, dropdowns, or report counts). | Products · Showrooms · Warehouse Stock · Reports · Messages · Product Transfers · New Sale · Sales/Purchases · Verify Invoice · Warehouses · Payment Accounts · Categories/Materials · Branches · Staff · Activity logs |
| **System Admin** (`system_manager`, labelled "System Admin" in the UI) | The **overall manager, above the Director**. Absolute capability over everything, needs **no branch assignment**, and is **hidden from every staff listing, dropdown and report** — for all viewers, including other admins. Also owns Drafts / Extract / Import Excel and the Dev/Live toggle. | Everything in the system |
| **Branch Manager** (`branch_manager`) | Runs one or more branches. Read-only on Warehouses, full on their branch's products. | Products · Showrooms · Warehouse Stock · Reports · Messages · Announcements · Drafts · Activity logs · Warehouses (RO) · Product Transfers · New Sale · Sales/Purchases |
| **Warehouse Manager** (`warehouse_manager`) | Operates a warehouse. Money is hidden everywhere. | Warehouse Stock (home) · Products (no money) · Reports (no money) · Messages · Announcements · Product Transfers · Verify Invoice |
| **Staff** (`staff`) | Showroom/sales assistant. | Products · Showrooms · Reports · Messages · Announcements · Product Transfers · New Sale · Sales/Purchases |

Role assignment lives in the `staff.role` column. Changing a role bumps `session_version`, which forces the user to sign in again so the new permissions take effect.

> **System Admin is an infrastructure account.** It is identified by `role = 'system_manager'` (the app also defensively recognises an account literally named "System Admin"). It is deliberately kept out of the Staff directory, the "assign manager" pickers, the ID-card print lists, and every report staff/Director count — so the Director never sees its name, email, or any detail. The migration `db/add-phase5-system-admin.sql` promotes the seeded super account to this role and clears its branch.

---

## Tech stack

- **Frontend:** Vanilla HTML / CSS / JavaScript. No build step, no framework, no bundler. The whole app loads from `dashboard.html` + `scripts/dashboard.js` + `scripts/ui.js`.
- **Database & realtime:** [Supabase](https://supabase.com) (Postgres + Realtime + RPC). Custom auth via the `staff` table and the `verify_login` RPC (pgcrypto). Supabase Auth is **not** used.
- **Image hosting:** [Cloudinary](https://cloudinary.com) unsigned upload preset; the `secure_url` is stored in `products.image_url`.
- **PDF generation:** `jsPDF` + `jspdf-autotable` (CDN).
- **OCR:** `tesseract.js` (CDN), used by the "Extract from image" workflow.
- **PWA:** `manifest.webmanifest` + `scripts/sw.js`; installable on Android, iOS (16.4+), Windows, macOS.

There is no Node project, no `package.json`, no compile step. Anything you can serve as a static site can host it.

---

## Repository layout

```
.
├── index.html                  # Sign-in page (no chrome)
├── dashboard.html              # The whole app: every view, every modal
├── manifest.webmanifest        # PWA manifest (icons, name, theme)
├── netlify.toml                # Netlify deploy hints (works on Vercel too)
├── SETUP.md                    # 15-minute Supabase + Cloudinary setup walkthrough
├── README.md                   # This file
├── THE-MANUAL.md               # Concise client-facing operating manual
│
├── assets/
│   ├── logo.png                # Brand logo used in invoices and UI
│   ├── icon-{180,192,384,512}.png   # PWA icons
│   └── products/               # (optional) seed product images
│
├── scripts/
│   ├── config.js               # Supabase URL + anon key, Cloudinary cloud + preset
│   ├── version.js              # App version string (bump on release)
│   ├── supabase-client.js      # Thin Supabase wrapper — `window.CH.<feature>`
│   ├── auth.js                 # Sign-in form on index.html
│   ├── dashboard.js            # The entire dashboard (views, modals, role gating)
│   ├── cloudinary.js           # Unsigned upload helper
│   ├── pdf-export.js           # Invoice + branded Business Report (inventory + sales/payments) PDF builders
│   ├── ui.js                   # Reveal/scroll/install/SW registration
│   ├── install.js              # PWA install prompt UI
│   ├── sw.js                   # Service worker (app-shell + image cache)
│   └── deploy.ps1              # Optional: quick local-to-Vercel deploy script
│
└── db/
    ├── schema.sql                       # Base tables, RPCs, RLS, seed Director
    ├── add-taxonomy.sql                 # Category & material catalog
    ├── add-drafts-and-logs.sql          # Drafts column + activity log table
    ├── add-phase1-foundations.sql       # Warehouses, branch_warehouses
    ├── add-phase2-multi-mgr.sql         # `manages_all_branches` / `_warehouses`
    ├── add-phase2-payment-accounts.sql  # MoMo / bank / POS accounts
    ├── add-phase2-product-transfers.sql # `product_transfer_requests` + RPCs
    ├── add-phase3-orders.sql            # `customer_orders` + invoice flow
    ├── add-phase3-system-manager.sql    # 5th role + super-role helpers
    ├── add-phase3-delivery-info.sql     # Transfer delivery address/phone columns
    ├── add-phase4-foundations.sql       # Dev/Live mode, Move Stock RPC, staff photo/start date, Media library, ID card settings
    ├── add-phase4-fix*.sql              # `env` column + staff_view/RPC refreshes for Dev/Live mode
    ├── add-phase5-system-admin.sql      # Promote the super account to System Admin (system_manager), clear its branch
    └── clear-products.sql               # Dev helper: wipe products + drafts
```

---

## Database model (high level)

- **`staff`** — login + role + branch home + `is_admin` (true for the two super roles). Auth uses `verify_login(email, password)` (pgcrypto `crypt`).
- **`branches`** — physical locations (showrooms). One manager (`manager_staff_id`) per branch.
- **`warehouses`** + **`branch_warehouses`** — storage units linked to one or more branches; one branch can have a default warehouse. Inventory lives at the warehouse level.
- **`products`** — one row per item per branch. `warehouse_id` points to where the stock physically sits. `is_draft = true` for OCR/Excel rows that need review.
- **`product_logs`** — append-only audit feed (sales, transfers, role changes, edits, deletes).
- **`payment_accounts`** + **`payment_account_branches`** — MoMo/bank/POS accounts; either global or scoped to specific branches.
- **`product_transfer_requests`** — inter-branch transfer with payment + delivery details; status flows `pending → received | cancelled`.
- **`customer_orders`** + **`customer_order_items`** — sales recorded at the till; warehouse staff verify the invoice on pickup.
- **`messages`** — staff ↔ admin chat threads.
- **`announcements`** — broadcasts.
- **`product_drafts_meta`** — supporting metadata for the drafts review queue.

Every state-changing operation is a SQL function (`security definer`) — the client never writes the raw table directly. This keeps business rules (stock decrement, role bumps, transfer atomicity) inside the database.

---

## Setup (first-time)

See **`SETUP.md`** for the click-by-click walkthrough. Headlines:

1. Create a Supabase project → copy `SUPABASE_URL` + anon key into `scripts/config.js`.
2. Run **`db/schema.sql`** in the Supabase SQL editor.
3. Run every other `db/add-phase*.sql` migration in order (top to bottom alphabetically). Each file is idempotent — safe to re-run.
4. Create a Cloudinary **unsigned** upload preset and paste its name into `config.js`.
5. Serve the folder — any static host works (`python -m http.server`, `npx serve`, Netlify drag-and-drop, Vercel, GitHub Pages).

Default Director login (change immediately):

```
email:    director@clasikalhomes.com
password: clasikal@2026
```

---

## Deployment

The repo is wired for both Netlify (via `netlify.toml`) and Vercel. There is no build step, so deploys take seconds:

- **Netlify:** drag the folder onto https://app.netlify.com/drop, or connect the GitHub repo.
- **Vercel:** `vercel` from this directory, or import the repo at https://vercel.com/new.
- **GitHub Pages / S3 / Cloudflare Pages:** any static host works.

A version bump is just editing `scripts/version.js`. The service worker uses that string as its cache key and forces a refresh on update.

---

## Day-to-day operations

- **Add a product:** Products → Add Product. Image upload goes through Cloudinary; everything else writes straight to Postgres.
- **Record a sale:** New Sale → fill customer + items → Generate invoice. Unit price is locked to the product's actual price; quantity is editable. The invoice PDF can be printed or sent to the customer; the warehouse staff scan / verify it on pickup.
- **Request stock from another branch:** open the product → "Request from another branch" → pick the source warehouse, payment method, and delivery type.
  - **Internal delivery:** the company courier moves stock to the requester's branch — no extra fields needed.
  - **External delivery:** the form asks for recipient phone and delivery address (e.g., direct-to-customer or 3rd-party pickup).
- **Receive a transfer:** Product Transfers → Incoming → "Mark received". The destination warehouse verifies the qty and payment; stock moves atomically inside one SQL function.
- **Bulk add products:** Import Excel (System Manager only). Rows missing required fields land in Drafts marked "needs attention" for review.
- **Approve drafts:** Drafts (System Manager / Branch Manager) → review → Publish.
- **Audit anything:** Activity logs (System Manager + Director).
- **Run reports:** Reports → pick a date range (Today / This week / This month / This year / All time, or a custom From–To). The page shows a sales summary, sales by branch, payments received per account & method, and a full transaction ledger. What you see is scoped to your role (a Director/System Admin sees every branch; a Branch Manager sees their branch; Staff see their own sales; Warehouse Managers see no money). **Export PDF** produces the same content as a branded Business Report.

---

## Security model

- **Auth:** `verify_login` returns the staff row with a bumpable `session_version`. The session is stored in `localStorage`; if the server-side version moves ahead (role change, force-logout), the client kicks the user back to sign-in.
- **Authorization in the DB:** every mutating RPC is `security definer` and validates the actor's `staff_code` / id. RLS is enabled but the client never writes directly — all writes go through RPCs.
- **Authorization in the UI:** `VIEWS_BY_ROLE` in `dashboard.js` plus CSS rules keyed off `body[data-role="…"]` decide what each role sees. The UI is the convenience layer; the database is the gate.
- **Cloudinary uploads:** unsigned preset, max 5 MB, whitelisted formats. The cloud `secure_url` is the only thing stored in Postgres.
- **No service-role keys** ever ship in the browser. `config.js` holds the anon key only.

---

## Phase history

| Phase | What landed |
| --- | --- |
| **Phase 0** | Single-branch inventory, Cloudinary upload, custom auth, Excel import |
| **Phase 1** | Multi-branch + warehouses, branch heading, role gating |
| **Phase 2** | Inter-branch transfers, payment accounts, multi-branch managers |
| **Phase 3** | Customer orders + branded invoices, warehouse verification, System Manager role, transfer delivery info (internal vs external) |
| **Phase 4** | Move Stock (direct, super-roles), cash receipt affirmation, Media Library, branded Staff ID Cards (QR + templates), Dev/Live mode for System Manager, optional staff photo + start date, stricter transfer-button gating, hidden payment fields when "Not paid", sales + stock-moved cards in Reports |
| **Phase 5** | System Admin hardening — overall manager above the Director, no branch assignment, hidden from every staff listing / dropdown / report. Reports overhaul — date-range filter (presets + custom), sales summary, sales by branch, payments received by account & method, and a full date+time transaction ledger, all role-tailored and exported to the branded Business Report PDF |

---

## License & credits

Internal project for Clasikal Homes — not open-source. Contact the Director for licensing questions.

Built with vanilla web + Supabase + Cloudinary. Logo and brand assets © Clasikal Homes.
