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
        doc.text(BRAND.tagline.toUpperCase(), M + 64, 68);

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

        const cards = [
            { label: 'Total products',  value: totalProducts.toLocaleString(),               accent: BRAND.accent },
            { label: 'Stock units',     value: totalUnits.toLocaleString(),                  accent: BRAND.ink2 },
            { label: 'Inventory value', value: fmtMoney(opts.currency, totalValue),          accent: BRAND.accent },
            { label: 'Low stock',       value: lowStock.toLocaleString(),                    accent: lowStock ? BRAND.warn : BRAND.ink3 },
            { label: 'Out of stock',    value: outOfStock.toLocaleString(),                  accent: outOfStock ? BRAND.danger : BRAND.ink3 },
            { label: 'Branches',        value: opts.branches.length.toLocaleString(),        accent: BRAND.ink2 },
        ];
        const cardCols = 3;
        const cardGap = 10;
        const cardW = (pageW - M * 2 - cardGap * (cardCols - 1)) / cardCols;
        const cardH = 60;
        cards.forEach((c, i) => {
            const col = i % cardCols;
            const row = Math.floor(i / cardCols);
            const x = M + col * (cardW + cardGap);
            const y = cursorY + row * (cardH + cardGap);
            doc.setFillColor(...BRAND.bg);
            doc.setDrawColor(...BRAND.line);
            doc.roundedRect(x, y, cardW, cardH, 4, 4, 'FD');
            doc.setTextColor(...BRAND.ink3);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text(c.label.toUpperCase(), x + 12, y + 18);
            doc.setTextColor(...c.accent);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text(String(c.value), x + 12, y + 42);
        });
        cursorY += Math.ceil(cards.length / cardCols) * (cardH + cardGap) + 14;

        // ---- BRANCH BREAKDOWN ----------------------------------------------
        section('Per-branch breakdown');
        const branchRows = opts.branches.map((b) => {
            const bp = opts.products.filter((p) => p.branch_id === b.id);
            const units = bp.reduce((s, p) => s + (Number(p.stock) || 0), 0);
            const value = bp.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
            const low = bp.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= opts.lowThreshold).length;
            const out = bp.filter((p) => (Number(p.stock) || 0) <= 0).length;
            const staffN = opts.staff.filter((s) => s.branch_id === b.id).length;
            return [b.name, bp.length, units.toLocaleString(), fmtMoney(opts.currency, value), low || '—', out || '—', staffN];
        });
        autoTable({
            startY: cursorY,
            head: [['Branch', 'Products', 'Stock', 'Value', 'Low', 'Out', 'Staff']],
            body: branchRows.length ? branchRows : [['No branches yet', '', '', '', '', '', '']],
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
            .map(([cat, c]) => [cat, c.count, c.units.toLocaleString(), fmtMoney(opts.currency, c.value)]);
        autoTable({
            startY: cursorY,
            head: [['Category', 'Products', 'Stock units', 'Inventory value']],
            body: catRows.length ? catRows : [['No products yet', '', '', '']],
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
