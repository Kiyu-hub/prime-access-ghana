# The Manual — Clasikal Homes Portal

Everything you need to operate the platform. One page. Read top to bottom.

---

## 1 · Signing in

- **Web address:** open the portal URL on any browser. To install it as an app, tap the browser's "Add to home screen" (mobile) or the install icon in the URL bar (desktop).
- **Login:** company email + your password.
- **Forgot password / locked out:** the Director or System Manager opens **Staff** → your name → set a new password.

---

## 2 · The five roles

| Role | Who they are | What they do |
| --- | --- | --- |
| **Director** | Owner | Runs the business: branches, staff, payment accounts, taxonomy, reports. Does **not** handle Drafts, Excel import, or Extract from image. |
| **System Manager** | Tech / operations lead | Has everything the Director has, **plus** runs Drafts, Excel import, and Extract from image. |
| **Branch Manager** | In charge of a branch (or several) | Full product control over their branch, can view warehouses, approves their branch's drafts. |
| **Warehouse Manager** | Runs a warehouse | Sees products and transfers — **never** sees prices or money. Verifies invoices when customers pick up. |
| **Staff** | Showroom assistant | Records sales, requests transfers, browses the catalog. |

---

## 3 · The main pages

### Products
The branch's catalog. Add, edit, photograph products. Search and filter at the top. Use **Add Product** to enter one at a time. Each product belongs to one branch and one warehouse.

### Showrooms
Customer-facing card view of the catalog. **Global search** at the top searches **every branch** — useful when a customer asks if another branch has an item.

### New Sale
Records a walk-in customer purchase and generates a PDF invoice.
- Type the customer name and phone.
- Pick products and quantity. **Unit price is locked** — it's the product's real price.
- Each item shows its product photo as soon as you pick it.
- Choose payment method (Cash / MoMo / POS / Bank). For non-cash, pick the account the customer paid to.
- **If Cash**, a green box appears asking you to confirm you've physically received the cash. The invoice will not generate until you tick it.
- Enter your staff ID to sign the sale.
- Click **Generate invoice** → the PDF opens with the company brand, customer details, and a code the warehouse will check on pickup.
- **Print or share** the invoice. Hand the printed copy to the customer.

### Sales / Purchases
Your sales history. Filter by date, branch, or status. Open any sale to reprint the invoice.

### Verify Invoice (Warehouse Manager)
When a customer arrives to pick up goods, paste the invoice code here. The system shows what's expected and lets you mark it released.

### Product Transfers
Stock moving between branches.
- **Incoming:** transfers headed to your branch — mark **Received** when the goods arrive.
- **Outgoing:** transfers you sent or requested.
- **All:** the full list.

To **request** stock from another branch, open the product → **Request from another branch**.
- The button only appears when (a) you have 2+ warehouses, (b) your own location is low/out of this item, AND (c) another branch actually has it in stock right now.
- Pick the source warehouse (only branches with stock show up).
- **Payment status — "Not paid yet"**: the payment method/account fields disappear. The button reads "Pay first, then mark as Paid". Submit is blocked until you switch to **Paid**.
- **Payment status — "Paid"**: pick the method, the account you paid to, tick the two confirmations, then submit.
- **Delivery:**
  - **Internal** — our courier brings it to your branch. No address needed.
  - **External** — going to a customer or 3rd party. Enter the **recipient phone** and **delivery address**.

### Move Stock (Director / System Manager only)
Direct stock transfer between warehouses — no payment, no request, no waiting. Use this for internal rebalancing.
- Enter the item code, qty, source warehouse, destination warehouse.
- The system atomically deducts from source, adds to destination.
- A `MV-…` audit record is created in Product Transfers (status: received) and an Activity Log entry captures who moved what, when.
- Movement totals appear on the Reports page as **Stock moved** + a **Top mover** card.

### Messages
Chat between staff and the Director / System Manager. Use it for quick questions instead of WhatsApp.

### Announcements
Broadcast notices visible to all staff (except the super roles). Use for store-wide updates.

### Reports
Live summary: inventory value, stock levels by branch, low stock, drafts pending, staff count, top categories, **Total sales** (count + GHS), **Stock moved** (units + transfers), **Top mover** (staff who's moved the most stock). Warehouse Managers see the same view with money hidden.

### Warehouse Stock  ← *the Warehouse Manager's home page*
A dedicated card-grid view of warehouse inventory — same look-and-feel as the Showroom, but **no prices anywhere**. Quantity is the headline.
- Top of the page shows four counters: total items, total units, low-stock count, out-of-stock count. They update live as you filter.
- A **warehouse picker** appears when you have access to more than one (Director / System Manager / Branch Manager). Warehouse Managers are auto-scoped to the warehouse(s) they manage — no picker if there's only one.
- Filter by **category**, **stock level** (in / low / out), or type to **search** by item code, description, color, supplier.
- Each card shows the photo, item code, description, category/material/color pills, the **quantity** (big, prominent), and a tag for which warehouse it lives in.
- Tap a card to open the full product detail. Money is hidden from Warehouse Managers throughout the app.

### Warehouses (Director / System Manager / Branch Manager)
Storage locations. Each warehouse is linked to one or more branches.
- Click the **View stock** icon on a row to peek at the products inside that warehouse without leaving the page.
- For the full grid view, use **Warehouse Stock** in the sidebar.
- Director / System Manager: add, edit, delete, assign a warehouse manager.
- Branch Manager: view-only.

### Drafts (System Manager + Branch Manager)
Products that came in via Excel import or OCR sit here until reviewed.
- Open a draft → fill in any missing fields → **Publish** to move it into the live catalog.
- Drafts missing required fields are flagged "needs attention".

### Extract from image (System Manager)
Paste or upload an inventory photo. The portal runs OCR locally in your browser, turns each line into a draft product, and drops them into the Drafts queue.

### Import Excel (System Manager)
Upload an `.xlsx` or `.csv` of products. Rows with complete data publish straight to the catalog. Incomplete rows land in Drafts.

### Payment Accounts (Director)
MoMo / Bank / POS accounts the company uses. Mark accounts as **global** (every branch) or scope them to specific branches. These appear in the sale + transfer payment dropdowns.

### Categories & Materials (Director)
Manage the shared lists used in the product form.

### Branches (Director)
Add and rename branches. Assign a Branch Manager.

### Staff (Director)
Create staff, set role, set home branch, reset password. Changing a role forces that user to sign in again.

### Activity logs (Director + System Manager)
Audit feed. Every sale, transfer, role change, product edit/delete, and account change is recorded with who did it and when.

---

## 4 · Common day-to-day flows

**Sell a product**
1. New Sale → fill the form → Generate invoice.
2. Print the PDF. Hand it to the customer.
3. Customer goes to the warehouse → warehouse manager opens **Verify Invoice** → marks it released.

**Move stock between branches**
1. Open the product → **Request from another branch**.
2. Pick the source, pay to the shown account, mark **Paid**.
3. Source branch ships → destination opens **Product Transfers → Incoming → Mark received**. Stock moves automatically.

**Take a stock photo and turn it into products**
1. System Manager → **Extract from image**.
2. Paste / upload the photo. Wait for OCR.
3. Confirm or edit lines → publish to Drafts.
4. Drafts → review each → Publish.

**Add 50 products at once**
1. System Manager → **Import Excel**.
2. Pick the file. Clean rows go straight in; messy rows land in Drafts.

---

## 5 · Things that are intentionally restricted

- **Unit price on a sale** is locked to the product's actual price — staff can't discount on the fly.
- **Warehouse Manager** never sees prices or any money fields.
- **Director** does **not** see Drafts, Excel import, or Extract from image — those belong to the System Manager.
- **Branch Manager** has read-only on Warehouses; only the Director / System Manager can add or edit them.
- **Out-of-stock product transfer button** only appears if another branch actually has the item right now.
- **Internal vs external delivery** — internal goes to your branch, external requires a phone + address before submission.

---

## 6 · When something goes wrong

| Symptom | First thing to try |
| --- | --- |
| Can't sign in | Confirm email is exact; ask the Director to reset your password. |
| "Your role was changed — sign in again" | Sign in again. Your role was updated. |
| Image won't upload | The file is over 5 MB or not a jpg/png/webp. |
| Invoice PDF blank | Refresh the page once and try again. If still blank, change browser. |
| Transfer says "no other branch has stock" | True — every other branch shows 0 of this item. Re-stock first. |
| "Sales not enabled yet" toast | The Director hasn't run the latest database migration. |

---

## 7 · Who to call

- **Day-to-day questions** → Director or System Manager.
- **Technical / login / data issues** → System Manager.
- **Hardware / printer / network** → branch IT contact (out of scope for this portal).

---

That's the whole portal. If you can read this page, you can run it.
