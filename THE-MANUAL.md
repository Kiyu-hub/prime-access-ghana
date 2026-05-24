# The Manual — Clasikal Homes Portal

Everything you need to operate the platform. One page. Read top to bottom.

---

## 1 · Signing in

- **Web address:** open the portal URL on any browser. To install it as an app, tap the browser's "Add to home screen" (mobile) or the install icon in the URL bar (desktop).
- **Login:** company email + your password.
- **Forgot password / locked out:** ask the Director to open **Staff** → your name → set a new password.

---

## 2 · The roles

| Role | Who they are | What they do |
| --- | --- | --- |
| **Director** | Owner | Runs the business: branches, staff, payment accounts, taxonomy, reports. |
| **Branch Manager** | In charge of a branch (or several) | Full product control over their branch, can view warehouses. |
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
- The button only appears when (a) your own location is low/out of this item, AND (b) another branch actually has it in stock right now.
- Pick the source warehouse (only branches with stock show up).
- **Payment status — "Not paid yet"**: the payment method/account fields disappear. The button reads "Pay first, then mark as Paid". Submit is blocked until you switch to **Paid**.
- **Payment status — "Paid"**: pick the method, the account you paid to, tick the two confirmations, then submit.
- **Delivery:**
  - **Internal** — our courier brings it to your branch. No address needed.
  - **External** — going to a customer or 3rd party. Enter the **recipient phone** and **delivery address**.

### Messages
Chat between staff and the Director. Use it for quick questions instead of WhatsApp.

### Announcements
Broadcast notices visible to all staff. Use for store-wide updates.

### Reports
Live summary of your scope: products, stock units, low stock, out of stock, your sales (or total sales if Director), top categories, top mover. Warehouse Managers see the same view with money hidden.

### Warehouse Stock  ← *the Warehouse Manager's home page*
A dedicated card-grid view of warehouse inventory — same look-and-feel as the Showroom, but **no prices anywhere**. Quantity is the headline.
- Top of the page shows four counters: total items, total units, low-stock count, out-of-stock count. They update live as you filter.
- A **warehouse picker** appears when you have access to more than one. Warehouse Managers are auto-scoped to the warehouse(s) they manage — no picker if there's only one.
- Filter by **category**, **stock level** (in / low / out), or type to **search** by item code, description, color, supplier.
- Each card shows the photo, item code, description, category/material/color pills, the **quantity** (big, prominent), and a tag for which warehouse it lives in.
- Tap a card to open the full product detail. Money is hidden from Warehouse Managers throughout the app.

### Warehouses (Director / Branch Manager)
The warehouses your branches use and their assigned managers.
- Click the **View stock** icon on a row to peek at the products inside that warehouse without leaving the page.
- For the full grid view, use **Warehouse Stock** in the sidebar.
- Director: add, edit, delete, assign a warehouse manager. **A warehouse cannot be created without a manager** — create a Warehouse Manager staff first if none exist.
- Branch Manager: view-only.

### Payment Accounts (Director)
MoMo / Bank / POS accounts the company uses. Mark accounts as **global** (every branch) or scope them to specific branches. These appear in the sale + transfer payment dropdowns.

### Categories & Materials (Director)
Manage the shared lists used in the product form.

### Branches (Director)
Add and rename branches. Assign a Branch Manager.

### Staff (Director)
Create staff, set role, set home branch, reset password. Each staff record can include an **optional profile photo** and a **start date** (used on the printed ID card if enabled). The account creation time is filled in automatically.

Assignable roles: **Staff**, **Branch Manager**, **Warehouse Manager**. The Director account is the only one of its kind and isn't assignable from this form.

### Activity logs (Director)
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

**Print a staff ID card** *(when Director access is enabled)*
1. Open **Staff ID Cards** in the Director sidebar.
2. Preview shows what the card will look like.
3. Click **Print all staff** → printer-ready sheet with one card per staff member.

---

## 5 · Things that are intentionally restricted

- **Unit price on a sale** is locked to the product's actual price — staff can't discount on the fly.
- **Cash sales** require the cashier to tick "I have physically received the cash" before the invoice generates.
- **Warehouse Manager** never sees prices or any money fields, anywhere in the portal.
- **Inventory Value** card is visible only to the Director.
- **Branch Manager** has read-only on Warehouses; only the Director can add or edit them.
- **A warehouse cannot exist without a warehouse manager** — the manager dropdown lists every staff with the Warehouse Manager role.
- **Out-of-stock product transfer button** strictly checks: 2+ warehouses exist, another warehouse (different branch) actually holds the item with stock > 0, AND that warehouse isn't otherwise empty.
- **Transfer "Not paid"**: payment method/account fields hide entirely. The form can't be submitted until you've actually paid and switched to "Paid".
- **Internal vs external delivery** — internal goes to your branch, external requires a phone + address before submission.

---

## 6 · When something goes wrong

| Symptom | First thing to try |
| --- | --- |
| Can't sign in | Confirm email is exact; ask the Director to reset your password. |
| "Your role was changed — sign in again" | Sign in again. Your role was updated. |
| Image won't upload | The file is over 5 MB or not a jpg / png / webp. |
| Invoice PDF blank | Refresh the page once and try again. If still blank, change browser. |
| Transfer says "no other branch has stock" | True — every other branch shows 0 of this item. Re-stock first. |
| Can't create a warehouse | You need at least one staff with the Warehouse Manager role first. Create them in Staff. |

---

## 7 · Who to call

- **Day-to-day questions** → Director.
- **Hardware / printer / network** → branch IT contact (out of scope for this portal).

---

That's the whole portal. If you can read this page, you can run it.
