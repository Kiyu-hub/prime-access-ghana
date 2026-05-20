const session = JSON.parse(sessionStorage.getItem('ch_session') || 'null');
if (!session) {
    window.location.replace('index.html');
} else {

const STORAGE_KEY = 'ch_products';
const LOW_STOCK_THRESHOLD = 5;
const CURRENCY = 'GHS';
const money = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const $ = (sel) => document.querySelector(sel);

    const els = {
        body: $('#productsBody'),
        empty: $('#emptyState'),
        emptyAdd: $('#emptyAddBtn'),
        addBtn: $('#addBtn'),
        exportBtn: $('#exportBtn'),
        importBtn: $('#importBtn'),
        excelInput: $('#excelInput'),
        searchInput: $('#searchInput'),
        filterCategory: $('#filterCategory'),
        filterStock: $('#filterStock'),
        sortBy: $('#sortBy'),
        logoutBtn: $('#logoutBtn'),
        userName: $('#userName'),
        userBranch: $('#userBranch'),
        userAvatar: $('#userAvatar'),
        branchHeading: $('#branchHeading'),
        statTotal: $('#statTotal'),
        statIn: $('#statIn'),
        statLow: $('#statLow'),
        statValue: $('#statValue'),
        modal: $('#productModal'),
        modalTitle: $('#modalTitle'),
        modalClose: $('#modalClose'),
        cancelBtn: $('#cancelBtn'),
        form: $('#productForm'),
        toast: $('#toast'),
        previewBox: $('#previewBox'),
        previewImg: $('#previewImg'),
        previewName: $('#previewName'),
        image: $('#image'),
        editId: $('#editId'),
    };

    /* ---------- Bootstrap user ---------- */
    els.userName.textContent = session.name;
    els.userBranch.textContent = session.branch + ' · ' + session.role;
    els.userAvatar.textContent = initials(session.name);
    els.branchHeading.textContent = session.branch + ' · ' + session.role;

    /* ---------- State ---------- */
    let products = loadProducts();
    let currentImageDataUrl = null;

    if (products.length === 0) seedDemoProducts();

    function render() {
        const q = els.searchInput.value.trim().toLowerCase();
        const cat = els.filterCategory.value;
        const stockF = els.filterStock.value;
        const sort = els.sortBy.value;

        const branchProducts = products.filter((p) => p.branch === session.branch);

        const filtered = branchProducts.filter((p) => {
            if (cat && p.category !== cat) return false;
            if (stockF === 'in' && p.stock <= 0) return false;
            if (stockF === 'low' && (p.stock <= 0 || p.stock > LOW_STOCK_THRESHOLD)) return false;
            if (stockF === 'out' && p.stock > 0) return false;
            if (q) {
                const hay = [p.itemNo, p.description, p.material, p.color, p.supplier, p.sku]
                    .filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            switch (sort) {
                case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
                case 'itemno': return (a.itemNo || '').localeCompare(b.itemNo || '');
                case 'price-desc': return (b.price || 0) - (a.price || 0);
                case 'price-asc': return (a.price || 0) - (b.price || 0);
                default: return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        if (filtered.length === 0) {
            els.body.innerHTML = '';
            els.empty.style.display = 'block';
        } else {
            els.empty.style.display = 'none';
            els.body.innerHTML = filtered.map(rowHtml).join('');
        }

        const totalUnits = branchProducts.reduce((s, p) => s + (Number(p.stock) || 0), 0);
        const lowCount = branchProducts.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
        const totalValue = branchProducts.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);

        els.statTotal.textContent = branchProducts.length.toLocaleString();
        els.statIn.textContent = totalUnits.toLocaleString();
        els.statLow.textContent = lowCount.toLocaleString();
        els.statValue.textContent = CURRENCY + ' ' + money.format(totalValue);
    }

    els.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit]');
        if (editBtn) { openEdit(editBtn.dataset.edit); return; }
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) { del(delBtn.dataset.del); }
    });

    function rowHtml(p) {
        const dims = (p.dimL || p.dimW || p.dimH)
            ? [p.dimL, p.dimW, p.dimH].filter(Boolean).join(' × ')
            : '<span style="color:var(--c-ink-300);">—</span>';

        const stockClass = p.stock <= 0 ? 'pill--stock-out'
            : p.stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low'
            : 'pill--stock-good';
        const stockLabel = p.stock <= 0 ? 'Out' : p.stock + ' units';

        const thumb = p.image
            ? `<img src="${p.image}" alt="" class="thumb" />`
            : `<div class="thumb thumb--ph"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;

        return `
            <tr>
                <td>${thumb}</td>
                <td><span class="itemno">${escapeHtml(p.itemNo)}</span></td>
                <td style="max-width:280px;">${escapeHtml(p.description || '')}</td>
                <td>${p.category ? '<span class="pill">' + escapeHtml(p.category) + '</span>' : '—'}</td>
                <td>${escapeHtml(p.material || '—')}</td>
                <td>${escapeHtml(p.color || '—')}</td>
                <td>${dims}</td>
                <td><strong>${CURRENCY} ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td><span class="pill ${stockClass}">${stockLabel}</span></td>
                <td>${p.quantity ? escapeHtml(String(p.quantity)) : '<span style="color:var(--c-ink-300);">—</span>'}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-edit="${p.id}" title="Edit" aria-label="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="icon-btn icon-btn--danger" data-del="${p.id}" title="Delete" aria-label="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /* ---------- Modal ---------- */
    function openAdd() {
        els.modalTitle.textContent = 'Add Product';
        els.editId.value = '';
        els.form.reset();
        currentImageDataUrl = null;
        els.previewBox.classList.remove('is-shown');
        els.modal.classList.add('is-open');
        setTimeout(() => $('#itemNo').focus(), 50);
    }

    function openEdit(id) {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        els.modalTitle.textContent = 'Edit Product · ' + p.itemNo;
        els.editId.value = id;
        $('#itemNo').value = p.itemNo || '';
        $('#category').value = p.category || '';
        $('#description').value = p.description || '';
        $('#material').value = p.material || '';
        $('#color').value = p.color || '';
        $('#dimL').value = p.dimL || '';
        $('#dimW').value = p.dimW || '';
        $('#dimH').value = p.dimH || '';
        $('#price').value = p.price ?? '';
        $('#stock').value = p.stock ?? '';
        $('#quantity').value = p.quantity ?? '';
        $('#supplier').value = p.supplier || '';
        $('#sku').value = p.sku || '';
        currentImageDataUrl = p.image || null;
        if (p.image) {
            els.previewImg.src = p.image;
            els.previewName.textContent = 'Existing image';
            els.previewBox.classList.add('is-shown');
        } else {
            els.previewBox.classList.remove('is-shown');
        }
        els.modal.classList.add('is-open');
    }

    function closeModal() {
        els.modal.classList.remove('is-open');
    }

    els.addBtn.addEventListener('click', openAdd);
    els.emptyAdd.addEventListener('click', openAdd);
    els.modalClose.addEventListener('click', closeModal);
    els.cancelBtn.addEventListener('click', closeModal);
    els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.modal.classList.contains('is-open')) closeModal();
    });

    /* Image preview */
    els.image.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast('Image too large. Please use a file under 2MB.', 'error');
            els.image.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentImageDataUrl = ev.target.result;
            els.previewImg.src = currentImageDataUrl;
            els.previewName.textContent = file.name;
            els.previewBox.classList.add('is-shown');
        };
        reader.readAsDataURL(file);
    });

    /* Save */
    els.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = els.editId.value;
        const data = {
            id: editId || cryptoId(),
            itemNo: $('#itemNo').value.trim().toUpperCase(),
            category: $('#category').value,
            description: $('#description').value.trim(),
            material: $('#material').value,
            color: $('#color').value.trim(),
            dimL: numOrNull($('#dimL').value),
            dimW: numOrNull($('#dimW').value),
            dimH: numOrNull($('#dimH').value),
            price: Number($('#price').value) || 0,
            stock: Number($('#stock').value) || 0,
            quantity: numOrNull($('#quantity').value),
            supplier: $('#supplier').value.trim(),
            sku: $('#sku').value.trim(),
            image: currentImageDataUrl,
            branch: session.branch,
            addedBy: session.name,
            staffId: session.id,
            createdAt: editId ? (products.find((p) => p.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (!data.itemNo || !data.category || !data.description) {
            toast('Item No, Category and Description are required.', 'error');
            return;
        }

        if (editId) {
            const idx = products.findIndex((p) => p.id === editId);
            if (idx >= 0) products[idx] = data;
            toast('Product updated.', 'success');
        } else {
            const dupe = products.find((p) => p.itemNo === data.itemNo && p.branch === session.branch);
            if (dupe) {
                toast('Item No "' + data.itemNo + '" already exists in this branch.', 'error');
                return;
            }
            products.push(data);
            toast('Product added.', 'success');
        }

        saveProducts();
        render();
        closeModal();
    });

    /* Delete */
    function del(id) {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        if (!confirm('Delete "' + p.itemNo + ' — ' + (p.description || '') + '"?\nThis cannot be undone.')) return;
        products = products.filter((x) => x.id !== id);
        saveProducts();
        render();
        toast('Product deleted.', 'success');
    }

    /* ---------- Filters ---------- */
    [els.searchInput, els.filterCategory, els.filterStock, els.sortBy].forEach((el) => {
        el.addEventListener('input', render);
        el.addEventListener('change', render);
    });

    /* ---------- Logout ---------- */
    els.logoutBtn.addEventListener('click', () => {
        if (!confirm('Sign out of the staff portal?')) return;
        sessionStorage.removeItem('ch_session');
        window.location.replace('index.html');
    });

    /* ============================================================
       Excel Export — supplier-ready layout
       Mirrors columns from the supplier catalog reference:
       Item No | Picture | Description | Dimensions | etc.
       ============================================================ */
    els.exportBtn.addEventListener('click', () => {
        const branchProducts = products.filter((p) => p.branch === session.branch);
        if (branchProducts.length === 0) {
            toast('No products to export yet.', 'error');
            return;
        }

        const rows = branchProducts.map((p) => {
            const dims = [p.dimL, p.dimW, p.dimH].filter(Boolean).join('*');
            return {
                'ITEM NO.': p.itemNo,
                'Description': p.description,
                'Category': p.category,
                'Material': p.material,
                'Color': p.color,
                'Dimensions (mm)': dims,
                'Price (' + CURRENCY + ')': Number(p.price || 0).toFixed(2),
                'Stock': p.stock,
                'Quantity': p.quantity ?? '',
                'Supplier': p.supplier,
                'Internal SKU': p.sku,
                'Branch': p.branch,
                'Added By': p.addedBy,
                'Date Added': new Date(p.createdAt).toLocaleDateString(),
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);

        /* Column widths */
        ws['!cols'] = [
            { wch: 14 }, // item no
            { wch: 42 }, // description
            { wch: 14 }, // category
            { wch: 18 }, // material
            { wch: 16 }, // color
            { wch: 20 }, // dims
            { wch: 12 }, // price
            { wch: 8 },  // stock
            { wch: 10 }, // quantity
            { wch: 18 }, // supplier
            { wch: 14 }, // sku
            { wch: 18 }, // branch
            { wch: 18 }, // added by
            { wch: 14 }, // date
        ];

        /* Header styling — set row height; XLSX (community) supports limited styling */
        ws['!rows'] = [{ hpt: 26 }];

        const wb = XLSX.utils.book_new();
        const sheetName = (session.branch || 'Inventory').substring(0, 28);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const stamp = new Date().toISOString().slice(0, 10);
        const fname = `Clasikal-Homes_${session.branch.replace(/\s+/g, '-')}_${stamp}.xlsx`;
        XLSX.writeFile(wb, fname);
        toast('Exported ' + branchProducts.length + ' products to ' + fname, 'success');
    });

    /* ============================================================
       Excel Import — accept supplier catalogs
       Maps common column header aliases.
       ============================================================ */
    els.importBtn.addEventListener('click', () => els.excelInput.click());

    els.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (rows.length === 0) {
                    toast('Spreadsheet is empty.', 'error');
                    return;
                }

                let added = 0, skipped = 0;
                rows.forEach((r) => {
                    const itemNo = String(pick(r, ['ITEM NO.', 'Item No', 'ItemNo', 'Item Number', 'Code']) || '').trim().toUpperCase();
                    if (!itemNo) { skipped++; return; }

                    /* duplicate within branch? */
                    if (products.some((p) => p.itemNo === itemNo && p.branch === session.branch)) {
                        skipped++;
                        return;
                    }

                    const dimsRaw = String(pick(r, ['Dimensions (mm)', 'Dimensions', 'Size']) || '');
                    const [dimL, dimW, dimH] = dimsRaw.split(/[x×*\s,]+/).filter(Boolean).map((n) => Number(n) || null);

                    products.push({
                        id: cryptoId(),
                        itemNo,
                        description: String(pick(r, ['Description', 'Desc', 'Product']) || ''),
                        category: String(pick(r, ['Category', 'Type']) || ''),
                        material: String(pick(r, ['Material']) || ''),
                        color: String(pick(r, ['Color', 'Colour']) || ''),
                        dimL: dimL || null, dimW: dimW || null, dimH: dimH || null,
                        price: Number(pick(r, ['Price (' + CURRENCY + ')', 'Price', 'Cost', 'Unit Price']) || 0),
                        stock: Number(pick(r, ['Stock', 'Stock on hand', 'On Hand']) || 0),
                        quantity: numOrNull(pick(r, ['Quantity', 'Qty', 'Pack Qty', 'MOQ', 'Units per Pack'])),
                        supplier: String(pick(r, ['Supplier', 'Vendor']) || ''),
                        sku: String(pick(r, ['Internal SKU', 'SKU']) || ''),
                        image: null,
                        branch: session.branch,
                        addedBy: session.name,
                        staffId: session.id,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                    added++;
                });

                saveProducts();
                render();
                toast('Imported ' + added + ' products' + (skipped ? ', skipped ' + skipped + ' (duplicate or missing item no)' : '') + '.', 'success');
            } catch (err) {
                console.error(err);
                toast('Could not read this file. Please check it is a valid .xlsx, .xls or .csv.', 'error');
            } finally {
                els.excelInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    });

    /* ---------- Helpers ---------- */
    function pick(obj, keys) {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== '') return obj[k];
            /* case-insensitive fallback */
            const found = Object.keys(obj).find((kk) => kk.toLowerCase() === k.toLowerCase());
            if (found && obj[found] !== '') return obj[found];
        }
        return undefined;
    }

    function numOrNull(v) {
        const n = Number(v);
        return Number.isFinite(n) && v !== '' ? n : null;
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function cryptoId() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    function initials(name) {
        return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    }

    function loadProducts() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (_) { return []; }
    }

    function saveProducts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }

    function toast(text, kind) {
        els.toast.textContent = text;
        els.toast.className = 'toast is-shown' + (kind ? ' toast--' + kind : '');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { els.toast.classList.remove('is-shown'); }, 3200);
    }

    function seedDemoProducts() {
        const demo = [
            { itemNo: 'NS-5003', description: 'Acrylic bathtub, white, freestanding', category: 'Bathtub', material: 'Acrylic', color: 'White', dimL: 1700, dimW: 800, dimH: 660, price: 4500, stock: 8, quantity: 1, supplier: 'Foshan Taojue' },
            { itemNo: 'NS-1111', description: 'Acrylic bathtub, white, corner unit', category: 'Bathtub', material: 'Acrylic', color: 'White', dimL: 1500, dimW: 1500, dimH: 700, price: 5200, stock: 3, quantity: 1, supplier: 'Foshan Taojue' },
            { itemNo: 'BW-1037', description: 'Artificial stone bathtub, oval', category: 'Bathtub', material: 'Artificial stone', color: 'White', dimL: 1650, dimW: 950, dimH: 610, price: 7800, stock: 5, quantity: 1, supplier: 'BluWave' },
            { itemNo: 'BW-2007-2', description: 'Transparent resin basin, desert color', category: 'Basin', material: 'Transparent resin', color: 'Desert', dimL: 600, dimW: 400, dimH: 150, price: 1800, stock: 12, quantity: 6, supplier: 'BluWave' },
            { itemNo: 'BW-1010', description: 'Transparent resin tub, black ash', category: 'Bathtub', material: 'Transparent resin', color: 'Black ash', dimL: 1650, dimW: 750, dimH: 540, price: 6900, stock: 2, quantity: 1, supplier: 'BluWave' },
            { itemNo: 'BW-3001', description: 'Transparent resin floor lamp, black ash', category: 'Lighting', material: 'Transparent resin', color: 'Black ash', dimL: 400, dimW: 400, dimH: 900, price: 2400, stock: 0, quantity: 2, supplier: 'BluWave' },
            { itemNo: 'BW-1054', description: 'Artificial stone bathtub, red', category: 'Bathtub', material: 'Artificial stone', color: 'Red', dimL: 1700, dimW: 750, dimH: 570, price: 8400, stock: 4, quantity: 1, supplier: 'BluWave' },
        ];
        const now = new Date().toISOString();
        products = demo.map((d) => Object.assign({}, d, {
            id: cryptoId(),
            sku: '', image: null,
            branch: session.branch,
            addedBy: session.name,
            staffId: session.id,
            createdAt: now,
            updatedAt: now,
        }));
        saveProducts();
    }

render();
}
