/* ============================================================
   Clasikal Homes — PDF Report Export
   Uses jsPDF + jspdf-autotable (loaded as UMD before this script).

   Branded multi-page PDF: cover header with logo, sections of tables,
   centered footer on every page with company contact details.
   ============================================================ */
(function () {
    'use strict';

    const BRAND = {
        name:     'CLASIKAL HOMES',
        tagline:  'Inventory Report',
        email:    'clasikalhomesgh@gmail.com',
        location: 'East Legon Hills, Accra · Ghana',
        phone:    '054 619 1433  /  050 051 5050',
        tagline2: 'we listen, we create, you enjoy',
        logoUrl:  'assets/logo.png',
        navy:     [11, 31, 63],
        accent:   [3, 105, 161],
        sky:      [56, 189, 248],
        ink:      [15, 23, 42],
        ink2:     [51, 65, 85],
        ink3:     [100, 116, 139],
        muted:    [232, 236, 241],
        line:     [226, 232, 240],
        bg:       [248, 250, 252],
        danger:   [220, 38, 38],
        success:  [21, 128, 61],
        warn:     [180, 83, 9],
    };

    async function loadLogoDataURL() {
        try {
            const res = await fetch(BRAND.logoUrl);
            const blob = await res.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (_) { return null; }
    }

    function fmtMoney(currency, n) {
        return currency + ' ' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Generate the report PDF and trigger download.
     * @param {object} opts
     *   opts.session    — current user (for "Prepared by")
     *   opts.currency   — e.g. 'GHS'
     *   opts.branches   — list of branch rows
     *   opts.products   — list of product rows (already scoped if non-admin)
     *   opts.staff      — list of staff rows (for branch counts)
     *   opts.lowThreshold — number (low-stock threshold)
     */
    async function exportReport(opts) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF library failed to load. Check your internet connection and reload.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const M = 40; // margin

        const logoDataUrl = await loadLogoDataURL();

        // ---- HEADER ---------------------------------------------------------
        // Navy band
        doc.setFillColor(...BRAND.navy);
        doc.rect(0, 0, pageW, 100, 'F');
        // Subtle accent stripe
        doc.setFillColor(...BRAND.sky);
        doc.rect(0, 100, pageW, 3, 'F');

        if (logoDataUrl) {
            try { doc.addImage(logoDataUrl, 'PNG', M, 24, 52, 52); } catch (_) {}
        }
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(BRAND.name, M + 64, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(180, 220, 255);
        const reportTitle = opts.sales ? 'Business Report' : 'Inventory Report';
        doc.text(reportTitle.toUpperCase(), M + 64, 68);

        // Right-aligned metadata
        const today = new Date();
        const dateStr = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(220, 230, 245);
        doc.text('Generated', pageW - M, 38, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(dateStr, pageW - M, 54, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(220, 230, 245);
        doc.text('Prepared by ' + (opts.session.name || 'Staff'), pageW - M, 70, { align: 'right' });

        let cursorY = 130;

        // ---- AT-A-GLANCE CARDS ---------------------------------------------
        const totalProducts = opts.products.length;
        const totalUnits = opts.products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
        const totalValue = opts.products.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
        const lowStock = opts.products.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= opts.lowThreshold).length;
        const outOfStock = opts.products.filter((p) => (Number(p.stock) || 0) <= 0).length;

        // Role-aware money visibility: Warehouse Managers never see money;
        // Inventory value is for super-roles (Director / System Admin) only.
        const isSuper = opts.role === 'admin' || opts.role === 'system_manager';
        const hideMoney = opts.role === 'warehouse_manager';
        const cards = [
            { label: 'Total products',  value: totalProducts.toLocaleString(),               accent: BRAND.accent },
            { label: 'Stock units',     value: totalUnits.toLocaleString(),                  accent: BRAND.ink2 },
        ];
        if (!hideMoney && isSuper) {
            cards.push({ label: 'Inventory value', value: fmtMoney(opts.currency, totalValue), accent: BRAND.accent });
        }
        cards.push(
            { label: 'Low stock',       value: lowStock.toLocaleString(),                    accent: lowStock ? BRAND.warn : BRAND.ink3 },
            { label: 'Out of stock',    value: outOfStock.toLocaleString(),                  accent: outOfStock ? BRAND.danger : BRAND.ink3 },
            { label: 'Branches',        value: opts.branches.length.toLocaleString(),        accent: BRAND.ink2 },
        );
        drawCardGrid(cards);

        // ---- SALES & PAYMENTS (date-scoped, role-tailored) -----------------
        // Only when sales data is supplied and the role may see money.
        if (opts.sales && opts.sales.role !== 'warehouse_manager') {
            renderSalesSections(opts.sales);
        }

        // ---- BRANCH BREAKDOWN (inventory) ----------------------------------
        if (cursorY > pageH - 180) { doc.addPage(); cursorY = M + 20; }
        section('Inventory by branch');
        const branchRows = opts.branches.map((b) => {
            const bp = opts.products.filter((p) => p.branch_id === b.id);
            const units = bp.reduce((s, p) => s + (Number(p.stock) || 0), 0);
            const value = bp.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
            const low = bp.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= opts.lowThreshold).length;
            const out = bp.filter((p) => (Number(p.stock) || 0) <= 0).length;
            const staffN = opts.staff.filter((s) => s.branch_id === b.id).length;
            const base = [b.name, bp.length, units.toLocaleString()];
            if (!hideMoney) base.push(fmtMoney(opts.currency, value));
            base.push(low || '—', out || '—', staffN);
            return base;
        });
        const branchHead = hideMoney
            ? ['Branch', 'Products', 'Stock', 'Low', 'Out', 'Staff']
            : ['Branch', 'Products', 'Stock', 'Value', 'Low', 'Out', 'Staff'];
        autoTable({
            startY: cursorY,
            head: [branchHead],
            body: branchRows.length ? branchRows : [Array(branchHead.length).fill('')],
        });
        cursorY = doc.lastAutoTable.finalY + 18;

        // ---- BY CATEGORY ---------------------------------------------------
        if (cursorY > pageH - 180) { doc.addPage(); cursorY = M + 20; }
        section('By category');
        const catMap = new Map();
        opts.products.forEach((p) => {
            const k = p.category || '(Uncategorised)';
            if (!catMap.has(k)) catMap.set(k, { count: 0, units: 0, value: 0 });
            const c = catMap.get(k);
            c.count += 1;
            c.units += Number(p.stock) || 0;
            c.value += (Number(p.price) || 0) * (Number(p.stock) || 0);
        });
        const catRows = Array.from(catMap.entries())
            .sort((a, b) => b[1].value - a[1].value)
            .map(([cat, c]) => {
                const row = [cat, c.count, c.units.toLocaleString()];
                if (!hideMoney) row.push(fmtMoney(opts.currency, c.value));
                return row;
            });
        const catHead = hideMoney
            ? ['Category', 'Products', 'Stock units']
            : ['Category', 'Products', 'Stock units', 'Inventory value'];
        autoTable({
            startY: cursorY,
            head: [catHead],
            body: catRows.length ? catRows : [Array(catHead.length).fill('')],
        });
        cursorY = doc.lastAutoTable.finalY + 18;

        // ---- LOW-STOCK LIST ------------------------------------------------
        if (cursorY > pageH - 180) { doc.addPage(); cursorY = M + 20; }
        section('Low-stock products (≤ ' + opts.lowThreshold + ' units)');
        const branchById = new Map(opts.branches.map((b) => [b.id, b.name]));
        const lowItems = opts.products
            .filter((p) => (Number(p.stock) || 0) <= opts.lowThreshold)
            .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
            .slice(0, 80);
        const lowRows = lowItems.map((p) => [
            p.item_no || '',
            p.description || '',
            p.category || '—',
            (Number(p.stock) || 0) <= 0 ? 'OUT' : (p.stock + ' left'),
            branchById.get(p.branch_id) || '—',
        ]);
        autoTable({
            startY: cursorY,
            head: [['Item No', 'Description', 'Category', 'Stock', 'Branch']],
            body: lowRows.length ? lowRows : [['All products well-stocked', '', '', '', '']],
        });

        // ---- FOOTER ON EVERY PAGE ------------------------------------------
        const total = doc.internal.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            const fy = pageH - 50;
            doc.setDrawColor(...BRAND.line);
            doc.setLineWidth(0.5);
            doc.line(M, fy, pageW - M, fy);

            doc.setTextColor(...BRAND.ink2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(BRAND.name, pageW / 2, fy + 14, { align: 'center' });

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(...BRAND.accent);
            doc.text(BRAND.tagline2, pageW / 2, fy + 24, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...BRAND.ink3);
            const contactParts = [BRAND.location, BRAND.email, BRAND.phone].filter(Boolean);
            doc.text(contactParts.join('  ·  '), pageW / 2, fy + 36, { align: 'center' });
            doc.text('Page ' + i + ' of ' + total, pageW / 2, fy + 47, { align: 'center' });
        }

        const fname = 'Clasikal-Homes_Report_' + today.toISOString().slice(0, 10) + '.pdf';
        doc.save(fname);

        // helpers ------------------------------------------------------------
        function section(title) {
            doc.setTextColor(...BRAND.ink);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(title, M, cursorY);
            doc.setDrawColor(...BRAND.sky);
            doc.setLineWidth(1.4);
            doc.line(M, cursorY + 4, M + 36, cursorY + 4);
            cursorY += 14;
        }

        function autoTable(config) {
            doc.autoTable(Object.assign({
                margin: { left: M, right: M, bottom: 60 },
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    cellPadding: 6,
                    overflow: 'linebreak',
                    textColor: BRAND.ink2,
                    lineColor: BRAND.line,
                    lineWidth: 0.4,
                },
                headStyles: {
                    fillColor: BRAND.navy,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                    cellPadding: 7,
                },
                alternateRowStyles: { fillColor: BRAND.bg },
                theme: 'grid',
            }, config));
        }

        // Draw a 3-column grid of summary cards starting at cursorY and
        // advance cursorY past them. Adds a page break if they won't fit.
        function drawCardGrid(cards) {
            if (!cards || !cards.length) return;
            const cols = 3, gap = 10;
            const w = (pageW - M * 2 - gap * (cols - 1)) / cols;
            const h = 60;
            const rows = Math.ceil(cards.length / cols);
            if (cursorY + rows * (h + gap) > pageH - 70) { doc.addPage(); cursorY = M + 20; }
            cards.forEach((c, i) => {
                const col = i % cols, row = Math.floor(i / cols);
                const x = M + col * (w + gap);
                const y = cursorY + row * (h + gap);
                doc.setFillColor(...BRAND.bg);
                doc.setDrawColor(...BRAND.line);
                doc.roundedRect(x, y, w, h, 4, 4, 'FD');
                doc.setTextColor(...BRAND.ink3);
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
                doc.text(String(c.label).toUpperCase(), x + 12, y + 18);
                doc.setTextColor(...(c.accent || BRAND.ink2));
                doc.setFontSize(15); doc.setFont('helvetica', 'bold');
                doc.text(String(c.value), x + 12, y + 42);
            });
            cursorY += rows * (h + gap) + 14;
        }

        // Sales summary + per-branch sales + payments received + full ledger.
        // Mirrors the on-screen report; date-scoped & role-scoped by the caller.
        function renderSalesSections(sales) {
            const orders = sales.orders || [];
            const rangeLabel = sales.rangeLabel || 'All time';
            const isSuper = sales.role === 'admin' || sales.role === 'system_manager';
            const cur = opts.currency;

            const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
            const fulfilled = orders.filter((o) => o.status === 'fulfilled');
            const pending = orders.filter((o) => o.status === 'pending');
            const cancelled = orders.filter((o) => o.status === 'cancelled');
            const grossSales = nonCancelled.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const received = nonCancelled.filter((o) => o.payment_confirmed).reduce((s, o) => s + (Number(o.total) || 0), 0);
            const fulfilledValue = fulfilled.reduce((s, o) => s + (Number(o.total) || 0), 0);

            // --- Sales summary cards ---
            if (cursorY > pageH - 200) { doc.addPage(); cursorY = M + 20; }
            section('Sales summary  ·  ' + rangeLabel);
            drawCardGrid([
                { label: 'Total sales',      value: fmtMoney(cur, grossSales),            accent: BRAND.accent },
                { label: 'Payment received', value: fmtMoney(cur, received),              accent: BRAND.success },
                { label: 'Fulfilled',        value: fmtMoney(cur, fulfilledValue),        accent: BRAND.ink2 },
                { label: 'Invoices',         value: nonCancelled.length.toLocaleString(), accent: BRAND.ink2 },
                { label: 'Pending',          value: pending.length.toLocaleString(),      accent: pending.length ? BRAND.warn : BRAND.ink3 },
                { label: 'Cancelled',        value: cancelled.length.toLocaleString(),    accent: cancelled.length ? BRAND.danger : BRAND.ink3 },
            ]);

            // --- Sales by branch (super-roles only) ---
            if (isSuper) {
                const byBranch = new Map();
                (opts.branches || []).forEach((b) => byBranch.set(b.id, { name: b.name, count: 0, gross: 0, received: 0, fulfilled: 0, pending: 0 }));
                nonCancelled.forEach((o) => {
                    const k = o.branch_id || '_none';
                    if (!byBranch.has(k)) byBranch.set(k, { name: (o.branch && o.branch.name) || '— Unassigned —', count: 0, gross: 0, received: 0, fulfilled: 0, pending: 0 });
                    const r = byBranch.get(k);
                    r.count += 1; r.gross += Number(o.total) || 0;
                    if (o.payment_confirmed) r.received += Number(o.total) || 0;
                    if (o.status === 'fulfilled') r.fulfilled += 1;
                    if (o.status === 'pending') r.pending += 1;
                });
                const rows = Array.from(byBranch.values()).filter((r) => r.count > 0).sort((a, b) => b.gross - a.gross)
                    .map((r) => [r.name, r.count, fmtMoney(cur, r.gross), fmtMoney(cur, r.received), r.fulfilled, r.pending || '—']);
                if (cursorY > pageH - 160) { doc.addPage(); cursorY = M + 20; }
                section('Sales by branch');
                autoTable({ startY: cursorY, head: [['Branch', 'Invoices', 'Total sales', 'Received', 'Fulfilled', 'Pending']], body: rows.length ? rows : [['No sales in this period', '', '', '', '', '']] });
                cursorY = doc.lastAutoTable.finalY + 18;
            }

            // --- Payments received: by method + by account ---
            const byMethod = new Map();
            const byAccount = new Map();
            nonCancelled.forEach((o) => {
                const amt = Number(o.total) || 0; const confirmed = !!o.payment_confirmed;
                const m = o.payment_method || 'unknown';
                if (!byMethod.has(m)) byMethod.set(m, { count: 0, total: 0, received: 0 });
                const mr = byMethod.get(m); mr.count += 1; mr.total += amt; if (confirmed) mr.received += amt;
                const acc = o.payment_account;
                const key = o.payment_account_id || ('method:' + m);
                const label = acc ? (acc.provider + ' — ' + acc.account_name) : ('No account (' + m + ')');
                if (!byAccount.has(key)) byAccount.set(key, { label, method: acc ? acc.method : m, number: acc ? acc.account_number : '', count: 0, total: 0, received: 0 });
                const ar = byAccount.get(key); ar.count += 1; ar.total += amt; if (confirmed) ar.received += amt;
            });
            if (cursorY > pageH - 160) { doc.addPage(); cursorY = M + 20; }
            section('Payments received  ·  by method');
            const methodOrder = ['cash', 'momo', 'pos', 'bank', 'unknown'];
            const methodRows = methodOrder.filter((m) => byMethod.has(m)).map((m) => { const r = byMethod.get(m); return [m.toUpperCase(), r.count, fmtMoney(cur, r.total), fmtMoney(cur, r.received)]; });
            autoTable({ startY: cursorY, head: [['Method', 'Txns', 'Total billed', 'Confirmed received']], body: methodRows.length ? methodRows : [['No payments in this period', '', '', '']] });
            cursorY = doc.lastAutoTable.finalY + 14;
            const accRows = Array.from(byAccount.values()).sort((a, b) => b.total - a.total).map((a) => [a.label + (a.number ? '\n' + a.number : ''), a.method, a.count, fmtMoney(cur, a.total), fmtMoney(cur, a.received)]);
            if (accRows.length) {
                if (cursorY > pageH - 140) { doc.addPage(); cursorY = M + 20; }
                section('Payments received  ·  by account');
                autoTable({ startY: cursorY, head: [['Account', 'Method', 'Txns', 'Total billed', 'Confirmed received']], body: accRows });
                cursorY = doc.lastAutoTable.finalY + 18;
            }

            // --- Full sales ledger (every transaction, date + time) ---
            if (cursorY > pageH - 160) { doc.addPage(); cursorY = M + 20; }
            const LEDGER_CAP = 400;
            section('Sales ledger  ·  ' + (orders.length > LEDGER_CAP ? ('latest ' + LEDGER_CAP + ' of ' + orders.length) : (orders.length + ' transaction' + (orders.length === 1 ? '' : 's'))));
            const ledgerRows = orders.slice(0, LEDGER_CAP).map((o) => {
                const acc = o.payment_account;
                return [
                    fmtDT(o.created_at),
                    o.invoice_code || o.code || '—',
                    (o.branch && o.branch.name) || '—',
                    (o.initiator && o.initiator.name) || '—',
                    o.client_name || '—',
                    fmtMoney(cur, o.total),
                    (o.payment_method || '—') + (o.payment_confirmed ? ' ✓' : ''),
                    acc ? (acc.provider + ' — ' + acc.account_name) : '—',
                    (o.status || '').toUpperCase(),
                ];
            });
            autoTable({
                startY: cursorY,
                head: [['Date & time', 'Invoice', 'Branch', 'Staff', 'Client', 'Amount', 'Method', 'Account', 'Status']],
                body: ledgerRows.length ? ledgerRows : [['No transactions in this period', '', '', '', '', '', '', '', '']],
                styles: { font: 'helvetica', fontSize: 7.2, cellPadding: 4, overflow: 'linebreak', textColor: BRAND.ink2, lineColor: BRAND.line, lineWidth: 0.4 },
                headStyles: { fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2, cellPadding: 5 },
                columnStyles: { 0: { cellWidth: 70 }, 5: { halign: 'right' } },
            });
            cursorY = doc.lastAutoTable.finalY + 18;

            function fmtDT(ts) {
                if (!ts) return '—';
                const d = new Date(ts);
                if (isNaN(d.getTime())) return '—';
                return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
            }
        }
    }

    /**
     * Generate an Activity Logs PDF with the same brand chrome.
     * @param {object} opts
     *   opts.session   — current user
     *   opts.logs      — already filtered list of log rows
     *   opts.from/to   — optional date filter labels
     *   opts.action    — optional action filter label
     */
    async function exportLogs(opts) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF library failed to load.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const M = 40;
        const logoDataUrl = await loadLogoDataURL();

        // Header band
        doc.setFillColor(...BRAND.navy);
        doc.rect(0, 0, pageW, 100, 'F');
        doc.setFillColor(...BRAND.sky);
        doc.rect(0, 100, pageW, 3, 'F');
        if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'PNG', M, 24, 52, 52); } catch (_) {} }
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(BRAND.name, M + 64, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(180, 220, 255);
        doc.text('ACTIVITY LOG', M + 64, 68);

        const today = new Date();
        doc.setFontSize(9);
        doc.setTextColor(220, 230, 245);
        doc.text('Generated', pageW - M, 38, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(today.toLocaleString(), pageW - M, 54, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(220, 230, 245);
        doc.text('Prepared by ' + (opts.session.name || 'Staff'), pageW - M, 70, { align: 'right' });

        let cursorY = 128;

        // Filter summary
        const filterBits = [];
        if (opts.from) filterBits.push('From ' + opts.from);
        if (opts.to)   filterBits.push('To ' + opts.to);
        if (opts.action) filterBits.push('Action: ' + opts.action);
        const filterLine = filterBits.length ? filterBits.join('  ·  ') : 'No filter — full activity feed';

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(...BRAND.ink3);
        doc.text(filterLine + '   ·   ' + opts.logs.length + ' entr' + (opts.logs.length === 1 ? 'y' : 'ies'), M, cursorY);
        cursorY += 16;

        const rows = opts.logs.map((l) => [
            new Date(l.created_at).toLocaleString(),
            (l.action || '').toUpperCase(),
            l.item_no || '—',
            l.branch_name || '—',
            l.staff_name || '—',
            l.note || '',
        ]);

        doc.autoTable({
            startY: cursorY,
            head: [['When', 'Action', 'Item', 'Branch', 'By', 'Note']],
            body: rows.length ? rows : [['No activity', '', '', '', '', '']],
            margin: { left: M, right: M, bottom: 70 },
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, overflow: 'linebreak', textColor: BRAND.ink2, lineColor: BRAND.line, lineWidth: 0.4 },
            headStyles: { fillColor: BRAND.navy, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, cellPadding: 6 },
            alternateRowStyles: { fillColor: BRAND.bg },
            theme: 'grid',
            columnStyles: {
                0: { cellWidth: 96 },
                1: { cellWidth: 64 },
                2: { cellWidth: 70 },
                3: { cellWidth: 80 },
                4: { cellWidth: 80 },
            },
        });

        // Footer on every page
        const total = doc.internal.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            const fy = pageH - 50;
            doc.setDrawColor(...BRAND.line);
            doc.setLineWidth(0.5);
            doc.line(M, fy, pageW - M, fy);
            doc.setTextColor(...BRAND.ink2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(BRAND.name, pageW / 2, fy + 14, { align: 'center' });
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(...BRAND.accent);
            doc.text(BRAND.tagline2, pageW / 2, fy + 24, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...BRAND.ink3);
            doc.text([BRAND.location, BRAND.email, BRAND.phone].filter(Boolean).join('  ·  '), pageW / 2, fy + 36, { align: 'center' });
            doc.text('Page ' + i + ' of ' + total, pageW / 2, fy + 47, { align: 'center' });
        }

        doc.save('Clasikal-Homes_Activity-Log_' + today.toISOString().slice(0, 10) + '.pdf');
    }

    window.CH = Object.assign(window.CH || {}, {
        pdf: { exportReport, exportLogs },
    });
})();
