/* ============================================================
   Clasikal Homes — Dashboard logic
   • Products: Supabase-backed CRUD, branch-filtered for non-admin
   • Images:   uploaded to Cloudinary, secure_url stored in image_url
   • Branches: admin CRUD
   • Staff:    admin CRUD (uses RPCs create_staff / update_staff)
   • Excel:    import/export per current branch
   ============================================================ */
(function () {
    'use strict';

    /* ---------- bootstrap ---------- */
    const session = window.CH && window.CH.requireSession ? window.CH.requireSession() : null;
    if (!session) return; // requireSession already redirected

    if (session.is_admin) document.body.classList.add('is-admin');

    const LOW_STOCK_THRESHOLD = 5;
    const CURRENCY = 'GHS';
    const money = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const els = {
        // Sidebar / user
        userName: $('#userName'),
        userBranch: $('#userBranch'),
        userAvatar: $('#userAvatar'),
        logoutBtn: $('#logoutBtn'),

        // Products view
        body: $('#productsBody'),
        empty: $('#emptyState'),
        emptyAdd: $('#emptyAddBtn'),
        addBtn: $('#addBtn'),
        exportBtn: $('#exportBtn'),
        importBtn: $('#importBtn'),
        excelInput: $('#excelInput'),
        filterCategory: $('#filterCategory'),
        filterStock: $('#filterStock'),
        sortBy: $('#sortBy'),
        branchHeading: $('#branchHeading'),
        statTotal: $('#statTotal'),
        statIn: $('#statIn'),
        statLow: $('#statLow'),
        statValue: $('#statValue'),
        modal: $('#productModal'),
        modalTitle: $('#modalTitle'),
        modalClose: $('#modalClose'),
        cancelBtn: $('#cancelBtn'),
        saveBtn: $('#saveBtn'),
        form: $('#productForm'),
        toast: $('#toast'),
        previewBox: $('#previewBox'),
        previewImg: $('#previewImg'),
        previewName: $('#previewName'),
        uploadProgress: $('#uploadProgress'),
        uploadProgressBar: $('#uploadProgressBar'),
        image: $('#image'),
        editId: $('#editId'),

        // Branches view
        branchesBody: $('#branchesBody'),
        branchesEmpty: $('#branchesEmpty'),
        addBranchBtn: $('#addBranchBtn'),
        branchModal: $('#branchModal'),
        branchModalTitle: $('#branchModalTitle'),
        branchForm: $('#branchForm'),
        branchEditId: $('#branchEditId'),
        branchName: $('#branchName'),
        branchLocation: $('#branchLocation'),

        // Staff view
        staffBody: $('#staffBody'),
        staffEmpty: $('#staffEmpty'),
        addStaffBtn: $('#addStaffBtn'),
        staffModal: $('#staffModal'),
        staffModalTitle: $('#staffModalTitle'),
        staffForm: $('#staffForm'),
        staffEditId: $('#staffEditId'),
        staffName: $('#staffName'),
        staffEmail: $('#staffEmail'),
        staffPassword: $('#staffPassword'),
        staffPasswordHint: $('#staffPasswordHint'),
        staffPasswordReq: $('#staffPasswordReq'),
        staffBranch: $('#staffBranch'),
        staffRole: $('#staffRole'),
        staffIsAdmin: $('#staffIsAdmin'),

        // Reports view
        reportCards: $('#reportCards'),
        branchReportBody: $('#branchReportBody'),
        categoryReportBody: $('#categoryReportBody'),
        lowStockBody: $('#lowStockBody'),
        reportsHeading: $('#reportsHeading'),
        reportsRefreshBtn: $('#reportsRefreshBtn'),

        // Messages view
        chatWrap: $('#chatWrap'),
        chatList: $('#chatList'),
        chatListItems: $('#chatListItems'),
        chatPaneHead: $('#chatPaneHead'),
        chatPaneAvatar: $('#chatPaneAvatar'),
        chatPaneName: $('#chatPaneName'),
        chatPaneSub: $('#chatPaneSub'),
        chatThread: $('#chatThread'),
        chatInput: $('#chatInput'),
        chatSendBtn: $('#chatSendBtn'),
        chatComposeForm: $('#chatComposeForm'),
        navMsgBadge: $('#navMsgBadge'),
        messagesHeading: $('#messagesHeading'),

        // Global search
        globalSearchInput: $('#globalSearchInput'),
        globalSearchResults: $('#globalSearchResults'),

        // Showroom view
        showroomHeading: $('#showroomHeading'),
        showroomGrid: $('#showroomGrid'),
        showroomEmpty: $('#showroomEmpty'),
        showroomBranchFilter: $('#showroomBranchFilter'),
        showroomCategoryFilter: $('#showroomCategoryFilter'),
        showroomStockFilter: $('#showroomStockFilter'),

        // PDF export
        reportsExportPdfBtn: $('#reportsExportPdfBtn'),

        // Notifications
        bellBtn: $('#bellBtn'),
        bellCount: $('#bellCount'),
        notifPanel: $('#notifPanel'),
        notifPanelBody: $('#notifPanelBody'),
        notifMarkAllRead: $('#notifMarkAllRead'),
        notifToasts: $('#notifToasts'),

        // Product detail modal
        pdetail: $('#pdetail'),
        pdetailMedia: $('#pdetailMedia'),
        pdetailItemNo: $('#pdetailItemNo'),
        pdetailTitle: $('#pdetailTitle'),
        pdetailPrice: $('#pdetailPrice'),
        pdetailMetaPills: $('#pdetailMetaPills'),
        pdetailRows: $('#pdetailRows'),
        pdetailClose: $('#pdetailClose'),

        // OCR / Extract view
        ocrFile: $('#ocrFile'),
        ocrPreview: $('#ocrPreview'),
        ocrPreviewWrap: $('#ocrPreviewWrap'),
        ocrStatus: $('#ocrStatus'),
        ocrRunBtn: $('#ocrRunBtn'),
        ocrEditorWrap: $('#ocrEditorWrap'),
        ocrText: $('#ocrText'),
        ocrBranchSelect: $('#ocrBranchSelect'),
        ocrSaveBtn: $('#ocrSaveBtn'),

        // Drafts view
        draftsBody: $('#draftsBody'),
        draftsEmpty: $('#draftsEmpty'),
        navDraftsBadge: $('#navDraftsBadge'),

        // Logs view
        logsBody: $('#logsBody'),
        logsEmpty: $('#logsEmpty'),
        logsRefreshBtn: $('#logsRefreshBtn'),
        logsExportPdfBtn: $('#logsExportPdfBtn'),
        logsDateFrom: $('#logsDateFrom'),
        logsDateTo: $('#logsDateTo'),
        logsActionFilter: $('#logsActionFilter'),

        // Announcements
        announcementsList: $('#announcementsList'),
        announcementsEmpty: $('#announcementsEmpty'),
        announcementsHeading: $('#announcementsHeading'),
        navAnnBadge: $('#navAnnBadge'),
        chatTabs: $('#chatTabs'),

        // Announcement detail modal
        annDetail: $('#annDetail'),
        annDetailTitle: $('#annDetailTitle'),
        annDetailMeta: $('#annDetailMeta'),
        annDetailBody: $('#annDetailBody'),
        annDetailSender: $('#annDetailSender'),
        annDetailClose: $('#annDetailClose'),

        // Notification detail modal
        notifDetail: $('#notifDetail'),
        notifDetailIcon: $('#notifDetailIcon'),
        notifDetailLabel: $('#notifDetailLabel'),
        notifDetailTitle: $('#notifDetailTitle'),
        notifDetailMeta: $('#notifDetailMeta'),
        notifDetailBody: $('#notifDetailBody'),
        notifDetailGo: $('#notifDetailGo'),
        notifDetailGoLabel: $('#notifDetailGoLabel'),
        notifDetailDismiss: $('#notifDetailDismiss'),
        notifDetailClose: $('#notifDetailClose'),
    };

    let activeNotifContext = null;     // payload of the notification being viewed
    let pendingScrollMsgId = null;     // message id to scroll to after thread loads

    let announcementsCache = [];

    let adminChatTab = 'conversations';     // for admin Messages view
    let allStaffCache = [];
    let lastSeenAnnouncementTs = localStorage.getItem('ch_ann_last_seen') || null;

    let allProductsCache = [];     // ALL products across branches (for global search + showroom for admin)
    let allBranchesCache = [];     // cached branches for tag rendering

    // In-memory notification log (messages + stock alerts) — keyed by id
    const notifLog = [];           // [{ id, kind: 'msg'|'stock', title, sub, time, read, payload }]
    const NOTIF_MAX = 50;
    let activePdetailProduct = null;

    let activeChatThread = null;   // for admin, the staff_id of the currently open conversation
    let chatUnsubscribe = null;

    /* ---------- state ---------- */
    let products = [];   // products visible to this user (already filtered by branch on server for non-admin)
    let branches = [];
    let staffList = [];
    let currentImageUrl = null;  // Cloudinary URL of selected/uploaded image
    let isUploading = false;
    let currentView = 'products';
    let categoriesCache = [];    // [{ id, name, sort_order }]
    let materialsCache = [];     // same shape
    let allDraftsCache = [];     // current drafts shown in the table
    let selectedDraftIds = new Set(); // ids of drafts ticked in the table
    let warehousesCache = [];    // [{ id, name, code, ..., branches: [...] }]
    let allBranchesCacheList = []; // mirrors `allBranchesCache` for the warehouse modal

    /* ---------- user header ---------- */
    els.userName.textContent = session.name || 'Staff';
    els.userBranch.textContent = (session.branch_name || 'Unassigned') + ' · ' + (session.role || '');
    // Avatar always uses the brand logo (single brand identity for every user).
    els.userAvatar.classList.add('avatar--logo');
    els.userAvatar.replaceChildren(); // wipe stale text/children
    const logoImg = new Image();
    logoImg.src = 'assets/logo.png?v=4';
    logoImg.alt = '';
    logoImg.draggable = false;
    els.userAvatar.appendChild(logoImg);
    els.branchHeading.textContent = (session.branch_name || 'Unassigned') + ' · ' + (session.role || 'Staff');

    /* ---------- view switcher (sidebar nav) ---------- */
    $$('.nav a[data-view]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });
    $$('.nav a[data-action]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.dataset.action === 'export') els.exportBtn.click();
            if (link.dataset.action === 'import') els.importBtn.click();
        });
    });

    let previousView = 'products';
    function switchView(view) {
        // Role guard: refuse views the current role isn't allowed to see.
        const role = currentRole();
        if (!viewAllowedForRole(view, role)) {
            toast('You do not have access to that page.', 'error');
            // Fall back to the first allowed view (almost always 'products')
            const fallback = (VIEWS_BY_ROLE[role] || ['products'])[0];
            if (fallback && fallback !== view) switchView(fallback);
            return;
        }
        if (view !== currentView) previousView = currentView || 'products';
        currentView = view;
        $$('.view').forEach((v) => v.classList.remove('is-active'));
        const el = $('#view-' + view);
        if (el) el.classList.add('is-active');

        $$('.nav a[data-view]').forEach((a) => a.classList.toggle('is-active', a.dataset.view === view));

        if (view === 'branches') loadBranches();
        if (view === 'staff')    loadStaff();
        if (view === 'reports')  loadReports();
        if (view === 'messages') openChat();
        if (view === 'showroom') loadShowroom();
        if (view === 'drafts')   loadDrafts();
        if (view === 'logs')     loadLogs();
        if (view === 'extract')  initExtract();
        if (view === 'announcements') loadAnnouncements();
        if (view === 'taxonomy') loadTaxonomy();
        if (view === 'warehouses') loadWarehouses();
    }

    /* ---------- logout ---------- */
    els.logoutBtn.addEventListener('click', () => {
        if (!confirm('Sign out of the staff portal?')) return;
        window.CH.signOut();
        window.location.replace('index.html');
    });

    /* ============================================================
       PRODUCTS
       ============================================================ */

    async function loadProducts() {
        if (!window.CH || !window.CH.supabase) {
            toast('Site not configured. Please ask the Director to complete setup.', 'error');
            return;
        }
        try {
            // Invalidate caches used by global search + showroom
            globalSearchData = null;
            // Visibility rules:
            //   Director       -> all branches
            //   Branch Manager -> their branch
            //   Warehouse Mgr  -> their warehouse only (independent of branch)
            //   Staff          -> their branch
            // Drafts are included; they show with a "Pending approval" badge.
            const role = currentRole();
            const branchFilter = (role === 'admin' || role === 'warehouse_manager') ? null : session.branch_id;
            const all = await window.CH.products.list(branchFilter);
            if (role === 'warehouse_manager' && session.warehouse_id) {
                products = all.filter((p) => p.warehouse_id === session.warehouse_id);
            } else {
                products = all;
            }
            renderProducts();
        } catch (e) {
            console.error(e);
            toast('Could not load products: ' + (e.message || 'unknown error'), 'error');
        }
    }

    function renderProducts() {
        const cat = els.filterCategory.value;
        const stockF = els.filterStock.value;
        const sort = els.sortBy.value;

        const list = products.filter((p) => {
            if (cat && p.category !== cat) return false;
            const stock = Number(p.stock) || 0;
            if (stockF === 'in'  && stock <= 0) return false;
            if (stockF === 'low' && (stock <= 0 || stock > LOW_STOCK_THRESHOLD)) return false;
            if (stockF === 'out' && stock > 0) return false;
            return true;
        });

        list.sort((a, b) => {
            switch (sort) {
                case 'oldest':     return new Date(a.created_at) - new Date(b.created_at);
                case 'itemno':     return (a.item_no || '').localeCompare(b.item_no || '');
                case 'price-desc': return (Number(b.price) || 0) - (Number(a.price) || 0);
                case 'price-asc':  return (Number(a.price) || 0) - (Number(b.price) || 0);
                default:           return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        if (list.length === 0) {
            els.body.innerHTML = '';
            els.empty.style.display = 'block';
        } else {
            els.empty.style.display = 'none';
            els.body.innerHTML = list.map(productRow).join('');
        }

        // Stats based on full branch (not filtered)
        const totalUnits = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
        const lowCount = products.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD).length;
        const totalValue = products.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);

        els.statTotal.textContent = products.length.toLocaleString();
        els.statIn.textContent    = totalUnits.toLocaleString();
        els.statLow.textContent   = lowCount.toLocaleString();
        els.statValue.textContent = CURRENCY + ' ' + money.format(totalValue);
    }

    function productRow(p) {
        const dims = (p.dim_l || p.dim_w || p.dim_h)
            ? [p.dim_l, p.dim_w, p.dim_h].filter(Boolean).join(' × ')
            : '<span style="color:var(--c-ink-5);">—</span>';

        const stock = Number(p.stock) || 0;
        const stockClass = stock <= 0 ? 'pill--stock-out'
            : stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low'
            : 'pill--stock-good';
        const stockLabel = stock <= 0 ? 'Out' : stock + ' units';

        const thumb = p.image_url
            ? `<img src="${escapeAttr(p.image_url)}" alt="" class="thumb" loading="lazy" />`
            : `<div class="thumb thumb--ph"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;

        const draftBadge = p.is_draft
            ? '<span class="pill pill--pending" title="Awaiting Director review">Pending approval</span>'
            : '';
        return `
            <tr${p.is_draft ? ' class="row--draft"' : ''} data-product-id="${p.id}" style="cursor: pointer;">
                <td>${thumb}</td>
                <td><span class="itemno">${p.item_no ? escapeHtml(p.item_no) : '<span style="color:var(--c-ink-5);">—</span>'}</span> ${draftBadge}</td>
                <td style="max-width:280px;">${escapeHtml(p.description || '')}</td>
                <td>${p.category ? '<span class="pill">' + escapeHtml(p.category) + '</span>' : '—'}</td>
                <td>${escapeHtml(p.material || '—')}</td>
                <td>${escapeHtml(p.color || '—')}</td>
                <td>${dims}</td>
                <td><strong>${CURRENCY} ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td><span class="pill ${stockClass}">${stockLabel}</span></td>
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

    els.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit]');
        if (editBtn) { openProductEdit(editBtn.dataset.edit); return; }
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) { deleteProduct(delBtn.dataset.del); return; }
        // Click anywhere else on the row -> open the detail modal (read-only view).
        const row = e.target.closest('tr[data-product-id]');
        if (row) {
            const p = products.find((x) => x.id === row.dataset.productId);
            if (!p) return;
            const branchName = (allBranchesCache.find((b) => b.id === p.branch_id) || {}).name || '';
            openProductDetail(p, branchName);
        }
    });

    /* ---------- taxonomy: cache + dropdown population ---------- */
    async function refreshTaxonomyCache() {
        if (!window.CH || !window.CH.categories) return;
        try {
            const [cats, mats] = await Promise.all([
                window.CH.categories.list().catch(() => []),
                window.CH.materials.list().catch(() => []),
            ]);
            if (cats.length) categoriesCache = cats;
            if (mats.length) materialsCache = mats;
        } catch (_) { /* fall back to whatever's hardcoded */ }
        populateProductFormDropdowns();
        populateProductFilterDropdowns();
    }

    function populateProductFormDropdowns() {
        const catSel = $('#category');
        const matSel = $('#material');
        if (catSel && categoriesCache.length) {
            const current = catSel.value;
            catSel.innerHTML = '<option value="" disabled selected>Select category</option>' +
                categoriesCache.map((c) => `<option value="${escapeAttr(c.name)}">${escapeHtml(c.name)}</option>`).join('');
            if (current) catSel.value = current;
        }
        if (matSel && materialsCache.length) {
            const current = matSel.value;
            matSel.innerHTML = '<option value="">Select material</option>' +
                materialsCache.map((m) => `<option value="${escapeAttr(m.name)}">${escapeHtml(m.name)}</option>`).join('');
            if (current) matSel.value = current;
        }
    }

    function populateProductFilterDropdowns() {
        // Products page category filter
        if (els.filterCategory && categoriesCache.length) {
            const current = els.filterCategory.value;
            els.filterCategory.innerHTML = '<option value="">All categories</option>' +
                categoriesCache.map((c) => `<option value="${escapeAttr(c.name)}">${escapeHtml(c.name)}</option>`).join('');
            if (current) els.filterCategory.value = current;
        }
        // Showroom category filter
        if (els.showroomCategoryFilter && categoriesCache.length) {
            const current = els.showroomCategoryFilter.value;
            els.showroomCategoryFilter.innerHTML = '<option value="">All categories</option>' +
                categoriesCache.map((c) => `<option value="${escapeAttr(c.name)}">${escapeHtml(c.name)}</option>`).join('');
            if (current) els.showroomCategoryFilter.value = current;
        }
    }

    /* ---------- product modal ---------- */
    function openProductAdd() {
        if (!session.branch_id && !session.is_admin) {
            toast('You must be assigned to a branch before adding products.', 'error');
            return;
        }
        els.modalTitle.textContent = 'Add Product';
        els.editId.value = '';
        els.form.reset();
        populateProductFormDropdowns();
        currentImageUrl = null;
        els.previewBox.classList.remove('is-shown');
        els.uploadProgress.classList.remove('is-shown');
        els.modal.classList.add('is-open');
        setTimeout(() => $('#itemNo').focus(), 50);
    }

    function openProductEdit(id) {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        els.modalTitle.textContent = 'Edit Product · ' + (p.item_no || p.description || '');
        els.editId.value = id;
        populateProductFormDropdowns();
        $('#itemNo').value = p.item_no || '';
        $('#category').value = p.category || '';
        $('#description').value = p.description || '';
        $('#material').value = p.material || '';
        $('#color').value = p.color || '';
        $('#dimL').value = p.dim_l ?? '';
        $('#dimW').value = p.dim_w ?? '';
        $('#dimH').value = p.dim_h ?? '';
        $('#price').value = p.price ?? '';
        $('#stock').value = (p.stock ?? p.quantity) ?? '';
        $('#supplier').value = p.supplier || '';
        currentImageUrl = p.image_url || null;
        els.uploadProgress.classList.remove('is-shown');
        if (p.image_url) {
            els.previewImg.src = p.image_url;
            els.previewName.textContent = 'Existing image';
            els.previewBox.classList.add('is-shown');
        } else {
            els.previewBox.classList.remove('is-shown');
        }
        els.modal.classList.add('is-open');
    }

    function closeProductModal() { els.modal.classList.remove('is-open'); }

    els.addBtn.addEventListener('click', openProductAdd);
    els.emptyAdd.addEventListener('click', openProductAdd);
    els.modalClose.addEventListener('click', closeProductModal);
    els.cancelBtn.addEventListener('click', closeProductModal);
    els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeProductModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (els.modal.classList.contains('is-open')) closeProductModal();
        if (els.branchModal.classList.contains('is-open')) els.branchModal.classList.remove('is-open');
        if (els.staffModal.classList.contains('is-open')) els.staffModal.classList.remove('is-open');
    });

    /* ---------- image: upload to Cloudinary ---------- */
    els.image.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            toast('Image too large. Please use a file under 8MB.', 'error');
            els.image.value = '';
            return;
        }
        if (!window.CH.cloudinary.isConfigured()) {
            toast('Image uploads are not set up yet. Please ask the Director.', 'error');
            els.image.value = '';
            return;
        }

        // Preview locally while uploading
        const localUrl = URL.createObjectURL(file);
        els.previewImg.src = localUrl;
        els.previewName.textContent = file.name + ' · uploading…';
        els.previewBox.classList.add('is-shown');
        els.uploadProgress.classList.add('is-shown');
        els.uploadProgressBar.style.width = '0%';
        isUploading = true;
        els.saveBtn.disabled = true;

        try {
            const res = await window.CH.cloudinary.upload(file, (pct) => {
                els.uploadProgressBar.style.width = pct + '%';
            });
            currentImageUrl = res.url;
            els.previewImg.src = res.url;
            els.previewName.textContent = file.name + ' · uploaded';
            els.uploadProgressBar.style.width = '100%';
            setTimeout(() => els.uploadProgress.classList.remove('is-shown'), 600);
        } catch (err) {
            console.error(err);
            toast('Image upload failed: ' + (err.message || 'unknown error'), 'error');
            currentImageUrl = null;
            els.previewBox.classList.remove('is-shown');
            els.uploadProgress.classList.remove('is-shown');
            els.image.value = '';
        } finally {
            isUploading = false;
            els.saveBtn.disabled = false;
            URL.revokeObjectURL(localUrl);
        }
    });

    /* ---------- save product ---------- */
    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isUploading) {
            toast('Please wait — image is still uploading.', 'error');
            return;
        }

        const editId = els.editId.value;
        const branchId = editId
            ? (products.find((p) => p.id === editId)?.branch_id || session.branch_id)
            : session.branch_id;

        if (!branchId) {
            toast('No branch context. Ask the Director to assign you to a branch.', 'error');
            return;
        }

        const data = {
            id: editId || '',
            item_no: $('#itemNo').value.trim().toUpperCase() || null,
            category: $('#category').value,
            description: $('#description').value.trim(),
            material: $('#material').value,
            color: $('#color').value.trim(),
            dim_l: numOrNull($('#dimL').value),
            dim_w: numOrNull($('#dimW').value),
            dim_h: numOrNull($('#dimH').value),
            price: Number($('#price').value) || 0,
            stock: parseInt($('#stock').value, 10) || 0,
            quantity: null,
            supplier: $('#supplier').value.trim() || null,
            image_url: currentImageUrl,
            branch_id: branchId,
            added_by: session.id,
            added_by_name: session.name,
        };

        if (!data.category || !data.description) {
            toast('Category and Description are required.', 'error');
            return;
        }

        try {
            els.saveBtn.disabled = true;
            // If admin/editor is finalising a draft, save with is_draft=false
            // (admin edit + save = approval/publishing). Drafts created via
            // OCR/import stay as drafts until someone reviews them here.
            const isPublishingDraft = !!els.modal.dataset.draftSource;
            if (isPublishingDraft) {
                data.is_draft = false;
            }
            const result = await window.CH.products.upsert(data);
            await window.CH.logs.record({
                product_id: (result && result.id) || data.id,
                item_no: data.item_no,
                action: isPublishingDraft ? 'created' : (editId ? 'updated' : 'created'),
                branch_id: data.branch_id,
                branch_name: (allBranchesCache.find((b) => b.id === data.branch_id) || {}).name,
                staff_id: session.id,
                staff_name: session.name,
                note: isPublishingDraft ? 'published from draft' : null,
            });
            delete els.modal.dataset.draftSource;
            toast(isPublishingDraft ? 'Draft published.' : (editId ? 'Product updated.' : 'Product added.'), 'success');
            closeProductModal();
            await loadProducts();
            await updateDraftsBadge();
            // If the user is on the Drafts admin page, refresh it too so
            // edits land visually (was stale: only Products got refreshed).
            if (currentView === 'drafts') await loadDrafts();
        } catch (err) {
            console.error(err);
            const msg = (err && err.message) || '';
            if (msg.toLowerCase().includes('duplicate') || (err && err.code === '23505')) {
                toast(data.item_no ? ('Item No "' + data.item_no + '" already exists in this branch.') : 'A product with the same code already exists.', 'error');
            } else {
                toast('Could not save product: ' + (msg || 'unknown error'), 'error');
            }
        } finally {
            els.saveBtn.disabled = false;
        }
    });

    /* ---------- delete product ---------- */
    async function deleteProduct(id) {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        const label = p.item_no ? p.item_no + ' — ' + (p.description || '') : (p.description || 'this product');
        if (!confirm('Delete "' + label + '"?\nThis cannot be undone.')) return;
        try {
            await window.CH.products.remove(id);
            await window.CH.logs.record({
                product_id: id,
                item_no: p.item_no,
                action: 'deleted',
                branch_id: p.branch_id,
                branch_name: (allBranchesCache.find((b) => b.id === p.branch_id) || {}).name,
                staff_id: session.id,
                staff_name: session.name,
            });
            toast('Product deleted.', 'success');
            await loadProducts();
        } catch (err) {
            console.error(err);
            toast('Could not delete product: ' + (err.message || 'unknown error'), 'error');
        }
    }

    /* ---------- filters ---------- */
    [els.filterCategory, els.filterStock, els.sortBy].forEach((el) => {
        el.addEventListener('change', renderProducts);
    });

    /* ============================================================
       EXCEL — export current branch + import supplier catalog
       ============================================================ */

    els.exportBtn.addEventListener('click', async () => {
        if (products.length === 0) {
            toast('No products to export yet.', 'error');
            return;
        }

        // Need branches for name resolution (admin export covers multiple)
        if (allBranchesCache.length === 0) {
            try { allBranchesCache = await window.CH.branches.list(); } catch (_) {}
        }
        const branchById = new Map(allBranchesCache.map((b) => [b.id, b.name]));

        const headers = ['ITEM NO. / CODE', 'Description', 'Category', 'Material', 'Color',
            'Dimensions (mm)', 'Price (' + CURRENCY + ')', 'Stock', 'Quantity',
            'Supplier', 'Branch', 'Added By', 'Date Added', 'Image URL'];
        const dataRows = products.map((p) => ([
            p.item_no || '',
            p.description || '',
            p.category || '',
            p.material || '',
            p.color || '',
            [p.dim_l, p.dim_w, p.dim_h].filter(Boolean).join(' × '),
            Number(p.price || 0),
            Number(p.stock || 0),
            p.quantity ?? '',
            p.supplier || '',
            branchById.get(p.branch_id) || '',
            p.added_by_name || '',
            new Date(p.created_at).toLocaleDateString(),
            p.image_url || '',
        ]));

        const ws = {};
        const colCount = headers.length;
        const lastColLetter = XLSX.utils.encode_col(colCount - 1);

        // Row 1: Title (merged across)
        ws['A1'] = {
            v: 'CLASIKAL HOMES — INVENTORY',
            t: 's',
            s: {
                font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: '0B1F3F' } },
            },
        };

        // Row 2: Italic tagline (merged)
        ws['A2'] = {
            v: 'we listen, we create, you enjoy',
            t: 's',
            s: {
                font: { italic: true, sz: 11, color: { rgb: '38BDF8' }, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: '0B1F3F' } },
            },
        };

        // Row 3: Metadata strip (branch + date + generator)
        const metaText = `Branch: ${session.branch_name || 'All branches'}    ·    Date: ${new Date().toLocaleDateString()}    ·    Prepared by: ${session.name || ''}`;
        ws['A3'] = {
            v: metaText,
            t: 's',
            s: {
                font: { sz: 9, color: { rgb: '64748B' }, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: 'F1F5F9' } },
            },
        };

        // Row 4: blank spacer
        // Row 5: Header row (one cell per column, styled)
        const headerRow = 5;
        headers.forEach((h, i) => {
            const addr = XLSX.utils.encode_cell({ r: headerRow - 1, c: i });
            ws[addr] = {
                v: h,
                t: 's',
                s: {
                    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    fill: { fgColor: { rgb: '0369A1' } },
                    border: {
                        top:    { style: 'thin', color: { rgb: '0369A1' } },
                        bottom: { style: 'thin', color: { rgb: '0369A1' } },
                        left:   { style: 'thin', color: { rgb: '0B1F3F' } },
                        right:  { style: 'thin', color: { rgb: '0B1F3F' } },
                    },
                },
            };
        });

        // Data rows starting at row 6
        dataRows.forEach((row, r) => {
            row.forEach((val, c) => {
                const addr = XLSX.utils.encode_cell({ r: headerRow + r, c });
                const isNumber = typeof val === 'number';
                const isOddRow = (r % 2 === 1);
                ws[addr] = {
                    v: val,
                    t: isNumber ? 'n' : 's',
                    z: c === 6 ? '#,##0.00' : undefined, // price col formatting
                    s: {
                        font: { sz: 10, color: { rgb: '0F172A' }, name: 'Calibri' },
                        alignment: { vertical: 'center', wrapText: c === 1 },
                        fill: { fgColor: { rgb: isOddRow ? 'F8FAFC' : 'FFFFFF' } },
                        border: {
                            top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
                            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
                            left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
                            right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
                        },
                    },
                };
            });
        });

        // Footer row (contact info)
        const footerRow = headerRow + dataRows.length + 2;
        ws[XLSX.utils.encode_cell({ r: footerRow - 1, c: 0 })] = {
            v: 'East Legon Hills, Accra · clasikalhomesgh@gmail.com · 054 619 1433 / 050 051 5050',
            t: 's',
            s: {
                font: { italic: true, sz: 9, color: { rgb: '64748B' }, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'center' },
            },
        };

        // Worksheet bounds
        const lastRow = footerRow;
        ws['!ref'] = `A1:${lastColLetter}${lastRow}`;

        // Merges for title / tagline / metadata / footer
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
            { s: { r: footerRow - 1, c: 0 }, e: { r: footerRow - 1, c: colCount - 1 } },
        ];

        // Row heights
        ws['!rows'] = [
            { hpt: 34 }, // title
            { hpt: 18 }, // tagline
            { hpt: 16 }, // metadata
            { hpt: 8 },  // spacer
            { hpt: 24 }, // header
        ];
        // Plus data row heights
        for (let i = 0; i < dataRows.length; i++) ws['!rows'].push({ hpt: 20 });
        // Footer
        ws['!rows'].push({ hpt: 10 }); // spacer
        ws['!rows'].push({ hpt: 18 }); // footer

        // Column widths
        ws['!cols'] = [
            { wch: 16 }, { wch: 44 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
            { wch: 18 }, { wch: 14 }, { wch: 9 },  { wch: 11 }, { wch: 18 },
            { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 44 },
        ];

        const wb = XLSX.utils.book_new();
        const sheetName = (session.branch_name || 'Inventory').substring(0, 28);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const stamp = new Date().toISOString().slice(0, 10);
        const branchSlug = (session.branch_name || 'all').replace(/\s+/g, '-');
        const fname = `Clasikal-Homes_${branchSlug}_${stamp}.xlsx`;
        XLSX.writeFile(wb, fname, { compression: true });
        toast('Exported ' + products.length + ' products to ' + fname, 'success');
    });

    els.importBtn.addEventListener('click', () => els.excelInput.click());

    els.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!session.branch_id) {
            toast('No branch context — ask the Director to assign you to a branch before importing.', 'error');
            els.excelInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                if (rows.length === 0) {
                    toast('Spreadsheet is empty.', 'error');
                    return;
                }

                let added = 0, updated = 0, unchanged = 0, skipped = 0;
                // Build a map of existing products in this branch by item_no for fast lookup
                const existingByItemNo = new Map();
                products.filter((p) => p.branch_id === session.branch_id).forEach((p) => {
                    existingByItemNo.set(String(p.item_no || '').toUpperCase(), p);
                });

                for (const r of rows) {
                    const item_no = String(pick(r, ['ITEM NO.', 'Item No', 'Item Code', 'Code', 'ItemNo', 'Item Number']) || '').trim().toUpperCase();
                    if (!item_no) { skipped++; continue; }

                    const dimsRaw = String(pick(r, ['Dimensions (mm)', 'Dimensions', 'Size']) || '');
                    const [dim_l, dim_w, dim_h] = dimsRaw.split(/[x×*\s,]+/).filter(Boolean).map((n) => Number(n) || null);

                    const incoming = {
                        item_no,
                        description: String(pick(r, ['Description', 'Desc', 'Product']) || ''),
                        category: String(pick(r, ['Category', 'Type']) || ''),
                        material: String(pick(r, ['Material']) || ''),
                        color: String(pick(r, ['Color', 'Colour']) || ''),
                        dim_l: dim_l || null,
                        dim_w: dim_w || null,
                        dim_h: dim_h || null,
                        price: Number(pick(r, ['Price (' + CURRENCY + ')', 'Price', 'Cost', 'Unit Price']) || 0),
                        stock: parseInt(pick(r, ['Stock', 'Stock on hand', 'On Hand']) || 0, 10) || 0,
                        quantity: numOrNull(pick(r, ['Quantity', 'Qty', 'Pack Qty', 'MOQ', 'Units per Pack'])),
                        supplier: String(pick(r, ['Supplier', 'Vendor']) || '') || null,
                        image_url: String(pick(r, ['Image URL', 'Image']) || '') || null,
                        branch_id: session.branch_id,
                    };

                    const existing = existingByItemNo.get(item_no);

                    try {
                        if (!existing) {
                            // New product — insert
                            const r = await window.CH.products.upsert(Object.assign({ id: '', added_by: session.id, added_by_name: session.name }, incoming));
                            added++;
                            window.CH.logs.record({
                                product_id: r && r.id, item_no, action: 'imported',
                                branch_id: session.branch_id, branch_name: session.branch_name,
                                staff_id: session.id, staff_name: session.name,
                                note: 'via Excel import',
                            });
                        } else {
                            // Compare normalized fields to detect a real change
                            const fieldsToCompare = ['description', 'category', 'material', 'color', 'dim_l', 'dim_w', 'dim_h', 'price', 'stock', 'quantity', 'supplier', 'image_url'];
                            let changed = false;
                            for (const f of fieldsToCompare) {
                                if (normalize(existing[f]) !== normalize(incoming[f])) { changed = true; break; }
                            }
                            if (!changed) {
                                unchanged++;
                                continue;
                            }
                            await window.CH.products.upsert(Object.assign({ id: existing.id }, incoming));
                            updated++;
                            window.CH.logs.record({
                                product_id: existing.id, item_no, action: 'updated',
                                branch_id: session.branch_id, branch_name: session.branch_name,
                                staff_id: session.id, staff_name: session.name,
                                note: 'via Excel import',
                            });
                        }
                    } catch (rowErr) {
                        console.warn('row failed:', item_no, rowErr);
                        skipped++;
                    }
                }

                await loadProducts();
                const summary = [
                    added    ? added + ' added'      : null,
                    updated  ? updated + ' updated'  : null,
                    unchanged? unchanged + ' unchanged' : null,
                    skipped  ? skipped + ' skipped'  : null,
                ].filter(Boolean).join(' · ');
                toast('Import complete — ' + (summary || 'no changes') + '.', 'success');

                function normalize(v) {
                    if (v == null || v === '') return '';
                    return String(v).trim().toLowerCase();
                }
            } catch (err) {
                console.error(err);
                toast('Could not read this file. Please check it is a valid .xlsx, .xls or .csv.', 'error');
            } finally {
                els.excelInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    });

    /* ============================================================
       TAXONOMY (admin) — categories + materials master list
       ============================================================ */

    async function loadTaxonomy() {
        if (!window.CH || !window.CH.categories) {
            renderTaxonomyError();
            return;
        }
        try {
            const [cats, mats] = await Promise.all([
                window.CH.categories.list(),
                window.CH.materials.list(),
            ]);
            categoriesCache = cats;
            materialsCache = mats;
            renderTaxonomy();
            populateProductFormDropdowns();
            populateProductFilterDropdowns();
        } catch (err) {
            console.error(err);
            renderTaxonomyError();
        }
    }

    function renderTaxonomyError() {
        const catList = $('#taxonomyCatList');
        const matList = $('#taxonomyMatList');
        const html = '<li class="taxonomy-list__empty">Catalog setup is not enabled yet. Please ask the Director to run the latest setup.</li>';
        if (catList) catList.innerHTML = html;
        if (matList) matList.innerHTML = html;
    }

    function renderTaxonomy() {
        const catList = $('#taxonomyCatList');
        const matList = $('#taxonomyMatList');
        const catCount = $('#taxonomyCatCount');
        const matCount = $('#taxonomyMatCount');
        if (catCount) catCount.textContent = String(categoriesCache.length);
        if (matCount) matCount.textContent = String(materialsCache.length);

        if (catList) {
            catList.innerHTML = categoriesCache.length
                ? categoriesCache.map((c) => `
                    <li class="taxonomy-list__item">
                        <span class="taxonomy-list__name">${escapeHtml(c.name)}</span>
                        <button type="button" class="taxonomy-list__del" data-taxonomy-cat-del="${escapeAttr(c.id)}" aria-label="Delete ${escapeAttr(c.name)}" title="Delete">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </li>`).join('')
                : '<li class="taxonomy-list__empty">No categories yet — add one above.</li>';
        }
        if (matList) {
            matList.innerHTML = materialsCache.length
                ? materialsCache.map((m) => `
                    <li class="taxonomy-list__item">
                        <span class="taxonomy-list__name">${escapeHtml(m.name)}</span>
                        <button type="button" class="taxonomy-list__del" data-taxonomy-mat-del="${escapeAttr(m.id)}" aria-label="Delete ${escapeAttr(m.name)}" title="Delete">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </li>`).join('')
                : '<li class="taxonomy-list__empty">No materials yet — add one above.</li>';
        }
    }

    // Add handlers
    const catForm = $('#taxonomyCatForm');
    if (catForm) catForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = $('#taxonomyCatInput');
        const name = (input.value || '').trim();
        if (!name) return;
        try {
            await window.CH.categories.add(name);
            input.value = '';
            await window.CH.logs.record({ action: 'category_added', staff_id: session.id, staff_name: session.name, branch_id: session.branch_id, branch_name: session.branch_name, note: 'Added category "' + name + '"' });
            await loadTaxonomy();
            toast('Category added.', 'success');
        } catch (err) {
            const msg = (err && err.message) || '';
            if (msg.includes('duplicate') || (err && err.code === '23505')) toast('That category already exists.', 'error');
            else toast('Could not add category: ' + (msg || 'unknown error'), 'error');
        }
    });

    const matForm = $('#taxonomyMatForm');
    if (matForm) matForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = $('#taxonomyMatInput');
        const name = (input.value || '').trim();
        if (!name) return;
        try {
            await window.CH.materials.add(name);
            input.value = '';
            await window.CH.logs.record({ action: 'material_added', staff_id: session.id, staff_name: session.name, branch_id: session.branch_id, branch_name: session.branch_name, note: 'Added material "' + name + '"' });
            await loadTaxonomy();
            toast('Material added.', 'success');
        } catch (err) {
            const msg = (err && err.message) || '';
            if (msg.includes('duplicate') || (err && err.code === '23505')) toast('That material already exists.', 'error');
            else toast('Could not add material: ' + (msg || 'unknown error'), 'error');
        }
    });

    // Delete handlers (event delegation on the list)
    const catListEl = $('#taxonomyCatList');
    if (catListEl) catListEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-taxonomy-cat-del]');
        if (!btn) return;
        const id = btn.dataset.taxonomyCatDel;
        const cat = categoriesCache.find((c) => c.id === id);
        if (!cat) return;
        if (!confirm('Delete category "' + cat.name + '"?\nExisting products keep their category text, but it will no longer appear in dropdowns.')) return;
        try {
            await window.CH.categories.remove(id);
            await window.CH.logs.record({ action: 'category_deleted', staff_id: session.id, staff_name: session.name, branch_id: session.branch_id, branch_name: session.branch_name, note: 'Deleted category "' + cat.name + '"' });
            await loadTaxonomy();
            toast('Category deleted.', 'success');
        } catch (err) {
            toast('Could not delete category: ' + (err.message || 'unknown error'), 'error');
        }
    });

    const matListEl = $('#taxonomyMatList');
    if (matListEl) matListEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-taxonomy-mat-del]');
        if (!btn) return;
        const id = btn.dataset.taxonomyMatDel;
        const mat = materialsCache.find((m) => m.id === id);
        if (!mat) return;
        if (!confirm('Delete material "' + mat.name + '"?\nExisting products keep their material text, but it will no longer appear in dropdowns.')) return;
        try {
            await window.CH.materials.remove(id);
            await window.CH.logs.record({ action: 'material_deleted', staff_id: session.id, staff_name: session.name, branch_id: session.branch_id, branch_name: session.branch_name, note: 'Deleted material "' + mat.name + '"' });
            await loadTaxonomy();
            toast('Material deleted.', 'success');
        } catch (err) {
            toast('Could not delete material: ' + (err.message || 'unknown error'), 'error');
        }
    });

    /* ============================================================
       WAREHOUSES (admin) — storage units linked to branches
       ============================================================ */

    const WAREHOUSE_ELS = {
        body:    $('#warehousesBody'),
        empty:   $('#warehousesEmpty'),
        modal:   $('#warehouseModal'),
        title:   $('#warehouseModalTitle'),
        form:    $('#warehouseForm'),
        editId:  $('#warehouseEditId'),
        name:    $('#warehouseName'),
        code:    $('#warehouseCode'),
        location:$('#warehouseLocation'),
        manager: $('#warehouseManager'),
        links:   $('#warehouseBranchLinks'),
        addBtn:  $('#addWarehouseBtn'),
    };

    async function loadWarehouses() {
        if (!session.is_admin) return;
        try {
            warehousesCache = await window.CH.warehouses.listWithBranches();
            if (allBranchesCache.length === 0) allBranchesCache = await window.CH.branches.list();
            allBranchesCacheList = allBranchesCache;
            renderWarehouses();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                showEmpty(WAREHOUSE_ELS.body, WAREHOUSE_ELS.empty, 'Warehouses not enabled yet', 'Please ask the Director to run the latest setup.');
            } else {
                toast('Could not load warehouses: ' + (err.message || 'unknown error'), 'error');
            }
        }
    }

    function renderWarehouses() {
        if (!WAREHOUSE_ELS.body) return;
        if (warehousesCache.length === 0) {
            WAREHOUSE_ELS.body.innerHTML = '';
            WAREHOUSE_ELS.empty.style.display = 'block';
            return;
        }
        WAREHOUSE_ELS.empty.style.display = 'none';
        const managerById = new Map(staffList.map((s) => [s.id, s.name]));
        WAREHOUSE_ELS.body.innerHTML = warehousesCache.map((w) => {
            const linkedBranches = (w.branches || []).map((b) => `${escapeHtml(b.branch_name || '?')}${b.is_default ? ' <span class="pill" style="font-size:0.62rem;padding:1px 6px;">default</span>' : ''}`).join(', ') || '<span style="color:var(--c-ink-5);">— none —</span>';
            return `<tr>
                <td><strong style="color:var(--c-ink-2);">${escapeHtml(w.name)}</strong></td>
                <td><span class="itemno">${escapeHtml(w.code)}</span></td>
                <td>${escapeHtml(w.location || '—')}</td>
                <td>${escapeHtml(managerById.get(w.manager_staff_id) || '—')}</td>
                <td>${linkedBranches}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-edit-wh="${w.id}" title="Edit" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="icon-btn icon-btn--danger" data-del-wh="${w.id}" title="Delete" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function populateWarehouseManagerSelect() {
        if (!WAREHOUSE_ELS.manager) return;
        const opts = ['<option value="">— No manager assigned —</option>']
            .concat((staffList || []).filter((s) => s.role === 'warehouse_manager' || s.role === 'admin').map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.role)})</option>`))
            .join('');
        WAREHOUSE_ELS.manager.innerHTML = opts;
    }

    function renderWarehouseBranchLinks(warehouseId) {
        if (!WAREHOUSE_ELS.links) return;
        const wh = warehousesCache.find((x) => x.id === warehouseId);
        const linkedMap = new Map((wh && wh.branches) ? wh.branches.map((b) => [b.branch_id, b]) : []);
        WAREHOUSE_ELS.links.innerHTML = (allBranchesCacheList || []).map((b) => {
            const link = linkedMap.get(b.id);
            const checked = link ? 'checked' : '';
            const isDefault = link && link.is_default ? 'checked' : '';
            const radioDisabled = link ? '' : 'disabled';
            return `<label class="wh-branch-link">
                <input type="checkbox" data-wh-link-branch="${b.id}" ${checked} />
                <span class="wh-branch-link__name">${escapeHtml(b.name)}</span>
                <span class="wh-branch-link__default"><input type="radio" name="whDefaultBranch" value="${b.id}" ${isDefault} ${radioDisabled} /> default</span>
            </label>`;
        }).join('');
        // Toggle radio enable/disable when checkbox changes
        WAREHOUSE_ELS.links.querySelectorAll('input[data-wh-link-branch]').forEach((cb) => {
            cb.addEventListener('change', (e) => {
                const branchId = e.target.dataset.whLinkBranch;
                const radio = WAREHOUSE_ELS.links.querySelector(`input[name="whDefaultBranch"][value="${branchId}"]`);
                if (!radio) return;
                radio.disabled = !e.target.checked;
                if (!e.target.checked) radio.checked = false;
            });
        });
    }

    function openWarehouseAdd() {
        WAREHOUSE_ELS.title.textContent = 'Add Warehouse';
        WAREHOUSE_ELS.editId.value = '';
        WAREHOUSE_ELS.form.reset();
        populateWarehouseManagerSelect();
        renderWarehouseBranchLinks(null);
        WAREHOUSE_ELS.modal.classList.add('is-open');
        setTimeout(() => WAREHOUSE_ELS.name.focus(), 40);
    }

    function openWarehouseEdit(id) {
        const w = warehousesCache.find((x) => x.id === id);
        if (!w) return;
        WAREHOUSE_ELS.title.textContent = 'Edit Warehouse · ' + w.name;
        WAREHOUSE_ELS.editId.value = id;
        WAREHOUSE_ELS.name.value = w.name || '';
        WAREHOUSE_ELS.code.value = w.code || '';
        WAREHOUSE_ELS.location.value = w.location || '';
        populateWarehouseManagerSelect();
        WAREHOUSE_ELS.manager.value = w.manager_staff_id || '';
        renderWarehouseBranchLinks(id);
        WAREHOUSE_ELS.modal.classList.add('is-open');
    }

    if (WAREHOUSE_ELS.addBtn) WAREHOUSE_ELS.addBtn.addEventListener('click', openWarehouseAdd);
    if (WAREHOUSE_ELS.body) WAREHOUSE_ELS.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-wh]');
        if (editBtn) { openWarehouseEdit(editBtn.dataset.editWh); return; }
        const delBtn = e.target.closest('[data-del-wh]');
        if (delBtn) deleteWarehouse(delBtn.dataset.delWh);
    });

    if (WAREHOUSE_ELS.form) WAREHOUSE_ELS.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = WAREHOUSE_ELS.editId.value;
        const name = WAREHOUSE_ELS.name.value.trim();
        const code = WAREHOUSE_ELS.code.value.trim();
        if (!name || !code) { toast('Name and code are required.', 'error'); return; }
        // Collect linked branches + default
        const linkInputs = Array.from(WAREHOUSE_ELS.links.querySelectorAll('input[data-wh-link-branch]'));
        const defaultRadio = WAREHOUSE_ELS.links.querySelector('input[name="whDefaultBranch"]:checked');
        const defaultBranchId = defaultRadio ? defaultRadio.value : null;
        const branch_links = linkInputs.filter((cb) => cb.checked).map((cb) => ({
            branch_id: cb.dataset.whLinkBranch,
            is_default: cb.dataset.whLinkBranch === defaultBranchId,
        }));
        try {
            if (id) {
                await window.CH.warehouses.update(id, {
                    name, code,
                    location: WAREHOUSE_ELS.location.value.trim(),
                    manager_staff_id: WAREHOUSE_ELS.manager.value || null,
                });
                await window.CH.warehouses.replaceBranchLinks(id, branch_links);
                await window.CH.logs.record({ action: 'warehouse_updated', staff_id: session.id, staff_name: session.name, note: 'updated warehouse "' + name + '" (' + code + ')' });
                toast('Warehouse updated.', 'success');
            } else {
                await window.CH.warehouses.add({
                    name, code,
                    location: WAREHOUSE_ELS.location.value.trim(),
                    manager_staff_id: WAREHOUSE_ELS.manager.value || null,
                    branch_links,
                });
                await window.CH.logs.record({ action: 'warehouse_created', staff_id: session.id, staff_name: session.name, note: 'created warehouse "' + name + '" (' + code + ')' });
                toast('Warehouse added.', 'success');
            }
            WAREHOUSE_ELS.modal.classList.remove('is-open');
            await loadWarehouses();
        } catch (err) {
            console.error(err);
            const msg = (err && err.message) || '';
            if (msg.toLowerCase().includes('duplicate') || (err && err.code === '23505')) {
                toast('A warehouse with that code already exists.', 'error');
            } else {
                toast('Could not save warehouse: ' + (msg || 'unknown error'), 'error');
            }
        }
    });

    async function deleteWarehouse(id) {
        const w = warehousesCache.find((x) => x.id === id);
        if (!w) return;
        if (!confirm('Delete warehouse "' + w.name + '"?\nProducts linked to it will become unassigned.\nThis cannot be undone.')) return;
        try {
            await window.CH.warehouses.remove(id);
            await window.CH.logs.record({ action: 'warehouse_deleted', staff_id: session.id, staff_name: session.name, note: 'deleted warehouse "' + w.name + '" (' + w.code + ')' });
            toast('Warehouse deleted.', 'success');
            await loadWarehouses();
        } catch (err) {
            toast('Could not delete warehouse: ' + (err.message || 'unknown error'), 'error');
        }
    }

    /* ============================================================
       BRANCHES (admin)
       ============================================================ */

    async function loadBranches() {
        try {
            branches = await window.CH.branches.list();
            renderBranches();
            populateBranchSelect();
        } catch (e) {
            console.error(e);
            toast('Could not load branches: ' + (e.message || 'unknown error'), 'error');
        }
    }

    function renderBranches() {
        if (branches.length === 0) {
            els.branchesBody.innerHTML = '';
            els.branchesEmpty.style.display = 'block';
            return;
        }
        els.branchesEmpty.style.display = 'none';

        els.branchesBody.innerHTML = branches.map((b) => {
            const staffCount = staffList.filter((s) => s.branch_id === b.id).length;
            const productCount = '—'; // could query; left as placeholder for now
            return `
                <tr>
                    <td><strong style="color:var(--c-ink-2);">${escapeHtml(b.name)}</strong></td>
                    <td>${escapeHtml(b.location || '—')}</td>
                    <td>${staffCount}</td>
                    <td>${productCount}</td>
                    <td>${new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="row-actions">
                            <button class="icon-btn" data-edit-branch="${b.id}" title="Edit" aria-label="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="icon-btn icon-btn--danger" data-del-branch="${b.id}" title="Delete" aria-label="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    els.branchesBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-branch]');
        if (editBtn) { openBranchEdit(editBtn.dataset.editBranch); return; }
        const delBtn = e.target.closest('[data-del-branch]');
        if (delBtn) { deleteBranch(delBtn.dataset.delBranch); }
    });

    els.addBranchBtn.addEventListener('click', () => openBranchAdd());

    function openBranchAdd() {
        els.branchModalTitle.textContent = 'Add Branch';
        els.branchEditId.value = '';
        els.branchForm.reset();
        els.branchModal.classList.add('is-open');
        setTimeout(() => els.branchName.focus(), 50);
    }

    function openBranchEdit(id) {
        const b = branches.find((x) => x.id === id);
        if (!b) return;
        els.branchModalTitle.textContent = 'Edit Branch';
        els.branchEditId.value = id;
        els.branchName.value = b.name || '';
        els.branchLocation.value = b.location || '';
        els.branchModal.classList.add('is-open');
    }

    els.branchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = els.branchEditId.value;
        const name = els.branchName.value.trim();
        const location = els.branchLocation.value.trim();
        if (!name) { toast('Branch name is required.', 'error'); return; }
        try {
            if (id) {
                await window.CH.branches.rename(id, name, location);
                window.CH.logs.record({ action: 'branch_updated', branch_id: id, branch_name: name, staff_id: session.id, staff_name: session.name, note: location ? 'location: ' + location : null });
                toast('Branch updated.', 'success');
            } else {
                const created = await window.CH.branches.create(name, location);
                window.CH.logs.record({ action: 'branch_created', branch_id: created && created.id, branch_name: name, staff_id: session.id, staff_name: session.name, note: location ? 'location: ' + location : null });
                toast('Branch added.', 'success');
            }
            els.branchModal.classList.remove('is-open');
            await loadBranches();
        } catch (err) {
            console.error(err);
            toast('Could not save branch: ' + (err.message || 'unknown error'), 'error');
        }
    });

    async function deleteBranch(id) {
        const b = branches.find((x) => x.id === id);
        if (!b) return;
        const assigned = staffList.filter((s) => s.branch_id === id).length;
        const warn = assigned > 0
            ? `\nThere are ${assigned} staff still assigned to this branch — they will be left unassigned.`
            : '';
        if (!confirm(`Delete branch "${b.name}"?${warn}\nAll products in this branch will also be deleted. This cannot be undone.`)) return;
        try {
            await window.CH.branches.remove(id);
            window.CH.logs.record({ action: 'branch_deleted', branch_id: id, branch_name: b.name, staff_id: session.id, staff_name: session.name });
            toast('Branch deleted.', 'success');
            await loadBranches();
            if (currentView === 'staff') await loadStaff();
        } catch (err) {
            console.error(err);
            toast('Could not delete branch: ' + (err.message || 'unknown error'), 'error');
        }
    }

    function populateBranchSelect() {
        const opts = ['<option value="">— No branch —</option>']
            .concat(branches.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`))
            .join('');
        els.staffBranch.innerHTML = opts;
    }

    /* ============================================================
       STAFF (admin)
       ============================================================ */

    async function loadStaff() {
        try {
            staffList = await window.CH.staff.list();
            // Ensure branches loaded for the select
            if (branches.length === 0) branches = await window.CH.branches.list();
            populateBranchSelect();
            renderStaff();
            // Refresh branches view counts if currently shown
            if (currentView === 'branches') renderBranches();
        } catch (e) {
            console.error(e);
            toast('Could not load staff: ' + (e.message || 'unknown error'), 'error');
        }
    }

    function renderStaff() {
        if (staffList.length === 0) {
            els.staffBody.innerHTML = '';
            els.staffEmpty.style.display = 'block';
            return;
        }
        els.staffEmpty.style.display = 'none';

        const roleLabel = (r) => ({ 'staff': 'Staff', 'branch_manager': 'Branch Manager', 'warehouse_manager': 'Warehouse Manager', 'admin': 'Director' })[r] || (r || 'Staff');
        const rolePillClass = (r) => r === 'admin' ? 'pill pill--admin' : 'pill';
        els.staffBody.innerHTML = staffList.map((s) => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="avatar" style="width:32px;height:32px;font-size:0.78rem;">${initials(s.name)}</span>
                        <strong style="color:var(--c-ink-2);">${escapeHtml(s.name)}</strong>
                    </div>
                </td>
                <td><span style="font-family:var(--f-mono);font-size:0.84rem;color:var(--c-ink-3);">${escapeHtml(s.email)}</span></td>
                <td><span class="itemno">${escapeHtml(s.staff_code || '—')}</span></td>
                <td><span class="${rolePillClass(s.role)}">${escapeHtml(roleLabel(s.role))}</span></td>
                <td>${escapeHtml(s.branch_name || '— Unassigned —')}</td>
                <td>${escapeHtml(s.warehouse_name || (s.role === 'warehouse_manager' ? '— Unassigned —' : '—'))}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-edit-staff="${s.id}" title="Edit" aria-label="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="icon-btn icon-btn--danger" data-del-staff="${s.id}" title="Delete" aria-label="Delete" ${s.id === session.id ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    els.staffBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-staff]');
        if (editBtn) { openStaffEdit(editBtn.dataset.editStaff); return; }
        const delBtn = e.target.closest('[data-del-staff]');
        if (delBtn && !delBtn.hasAttribute('disabled')) { deleteStaff(delBtn.dataset.delStaff); }
    });

    els.addStaffBtn.addEventListener('click', () => openStaffAdd());

    function populateStaffWarehouseSelect() {
        const sel = $('#staffWarehouse');
        if (!sel) return;
        const opts = ['<option value="">— Select warehouse —</option>']
            .concat((warehousesCache || []).map((w) => `<option value="${w.id}">${escapeHtml(w.name)} (${escapeHtml(w.code)})</option>`))
            .join('');
        sel.innerHTML = opts;
    }

    function toggleStaffWarehouseField() {
        const wrap = $('#staffWarehouseField');
        if (!wrap) return;
        wrap.style.display = (els.staffRole.value === 'warehouse_manager') ? '' : 'none';
    }

    function openStaffAdd() {
        els.staffModalTitle.textContent = 'Add Staff';
        els.staffEditId.value = '';
        els.staffForm.reset();
        els.staffPasswordHint.textContent = '(min 6 chars)';
        els.staffPasswordReq.style.display = 'inline';
        els.staffPassword.required = true;
        populateBranchSelect();
        populateStaffWarehouseSelect();
        els.staffRole.value = 'staff';
        toggleStaffWarehouseField();
        const codeField = $('#staffCodeDisplay');
        if (codeField) codeField.value = '(generated on save)';
        els.staffModal.classList.add('is-open');
        setTimeout(() => els.staffName.focus(), 50);
    }

    function openStaffEdit(id) {
        const s = staffList.find((x) => x.id === id);
        if (!s) return;
        els.staffModalTitle.textContent = 'Edit Staff';
        els.staffEditId.value = id;
        els.staffName.value = s.name || '';
        els.staffEmail.value = s.email || '';
        els.staffPassword.value = '';
        els.staffPasswordHint.textContent = '(leave blank to keep existing)';
        els.staffPasswordReq.style.display = 'none';
        els.staffPassword.required = false;
        populateBranchSelect();
        populateStaffWarehouseSelect();
        els.staffBranch.value = s.branch_id || '';
        // Normalize legacy free-text role to enum on display
        const enumRole = ['staff', 'branch_manager', 'warehouse_manager', 'admin'].includes(s.role) ? s.role : (s.is_admin ? 'admin' : 'staff');
        els.staffRole.value = enumRole;
        toggleStaffWarehouseField();
        const whSel = $('#staffWarehouse');
        if (whSel) whSel.value = s.warehouse_id || '';
        els.staffIsAdmin.value = s.is_admin ? '1' : '';
        const codeField = $('#staffCodeDisplay');
        if (codeField) codeField.value = s.staff_code || '(not yet generated)';
        els.staffModal.classList.add('is-open');
    }

    if (els.staffRole) els.staffRole.addEventListener('change', toggleStaffWarehouseField);

    els.staffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = els.staffEditId.value;
        const role = els.staffRole.value || 'staff';
        const warehouseSel = $('#staffWarehouse');
        const warehouseId = (role === 'warehouse_manager' && warehouseSel) ? (warehouseSel.value || null) : null;
        const payload = {
            name: els.staffName.value.trim(),
            email: els.staffEmail.value.trim().toLowerCase(),
            password: els.staffPassword.value,
            role,
            branch_id: els.staffBranch.value || null,
            is_admin: role === 'admin',
        };
        if (!payload.name || !payload.email) { toast('Name and email are required.', 'error'); return; }
        if (role === 'warehouse_manager' && !warehouseId) { toast('Warehouse Manager must be assigned to a warehouse.', 'error'); return; }
        if (!id && (!payload.password || payload.password.length < 6)) {
            toast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            toast('Please enter a valid email address.', 'error');
            return;
        }
        try {
            const prev = id ? staffList.find((x) => x.id === id) : null;
            const prevRole = prev ? (prev.role || (prev.is_admin ? 'admin' : 'staff')) : null;
            let staffId = id;
            if (id) {
                await window.CH.staff.update(id, payload);
                window.CH.logs.record({ action: 'staff_updated', staff_id: session.id, staff_name: session.name, note: 'updated ' + payload.name + ' (' + payload.email + ')' });
                // Role changed -> bump session_version via assign_role so the
                // affected staff is forced to sign in again with new permissions.
                if (prevRole && prevRole !== role) {
                    try { await window.CH.roles.assign(id, role, session.id); } catch (e) { console.warn('assign_role failed:', e); }
                }
                toast('Staff updated.', 'success');
            } else {
                staffId = await window.CH.staff.create(payload);
                window.CH.logs.record({ action: 'staff_created', staff_id: session.id, staff_name: session.name, note: 'added ' + payload.name + ' (' + payload.email + ')' });
                toast('Staff added. They can sign in now.', 'success');
            }
            // Warehouse assignment is independent of the create_staff/update_staff RPC
            if (staffId) {
                try { await window.CH.staff.setWarehouse(staffId, warehouseId); } catch (e) { console.warn('setWarehouse failed:', e); }
            }
            els.staffModal.classList.remove('is-open');
            await loadStaff();
        } catch (err) {
            console.error(err);
            const msg = (err && err.message) || '';
            if (msg.toLowerCase().includes('duplicate') || (err && err.code === '23505')) {
                toast('A staff member with this email already exists.', 'error');
            } else {
                toast('Could not save staff: ' + (msg || 'unknown error'), 'error');
            }
        }
    });

    async function deleteStaff(id) {
        const s = staffList.find((x) => x.id === id);
        if (!s) return;
        if (s.id === session.id) {
            toast('You cannot delete your own account.', 'error');
            return;
        }
        if (!confirm(`Delete staff "${s.name}" (${s.email})?\nThis cannot be undone.`)) return;
        try {
            await window.CH.staff.remove(id);
            window.CH.logs.record({ action: 'staff_deleted', staff_id: session.id, staff_name: session.name, note: 'removed ' + s.name + ' (' + s.email + ')' });
            toast('Staff deleted.', 'success');
            await loadStaff();
        } catch (err) {
            console.error(err);
            toast('Could not delete staff: ' + (err.message || 'unknown error'), 'error');
        }
    }

    /* ---------- close handlers for admin modals ---------- */
    $$('[data-close]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.close;
            const m = document.getElementById(id);
            if (m) m.classList.remove('is-open');
        });
    });
    [els.branchModal, els.staffModal, WAREHOUSE_ELS.modal].filter(Boolean).forEach((m) => {
        m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('is-open'); });
    });

    /* ============================================================
       SHOWROOM (visual product grid)
       Admin: sees all products from all showrooms with branch tag
       Staff: sees only their branch's products
       ============================================================ */
    async function loadShowroom() {
        try {
            // For admin: load ALL products (cached). For staff: their branch only.
            if (session.is_admin) {
                allProductsCache = await window.CH.products.list(null);
            } else {
                allProductsCache = await window.CH.products.list(session.branch_id);
            }
            if (allBranchesCache.length === 0) {
                try { allBranchesCache = await window.CH.branches.list(); } catch (_) {}
            }
            populateShowroomBranchFilter();
            renderShowroom();
        } catch (err) {
            console.error(err);
            toast('Could not load showroom: ' + (err.message || 'unknown error'), 'error');
        }
    }

    function populateShowroomBranchFilter() {
        if (!session.is_admin) {
            // Staff only see their branch — hide the branch dropdown
            els.showroomBranchFilter.style.display = 'none';
            return;
        }
        const opts = ['<option value="">All showrooms</option>']
            .concat(allBranchesCache.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`))
            .join('');
        els.showroomBranchFilter.innerHTML = opts;
    }

    function renderShowroom() {
        const branchFilter = session.is_admin ? els.showroomBranchFilter.value : session.branch_id;
        const catFilter = els.showroomCategoryFilter.value;
        const stockFilter = els.showroomStockFilter.value;

        const branchById = new Map(allBranchesCache.map((b) => [b.id, b.name]));

        const list = allProductsCache.filter((p) => {
            if (branchFilter && p.branch_id !== branchFilter) return false;
            if (catFilter && p.category !== catFilter) return false;
            const stock = Number(p.stock) || 0;
            if (stockFilter === 'in'  && stock <= 0) return false;
            if (stockFilter === 'low' && (stock <= 0 || stock > LOW_STOCK_THRESHOLD)) return false;
            if (stockFilter === 'out' && stock > 0) return false;
            return true;
        });

        els.showroomHeading.textContent = session.is_admin
            ? `${list.length} product${list.length === 1 ? '' : 's'} across ${branchFilter ? '1 showroom' : allBranchesCache.length + ' showrooms'}`
            : `${session.branch_name} · ${list.length} product${list.length === 1 ? '' : 's'}`;

        if (list.length === 0) {
            els.showroomGrid.innerHTML = '';
            els.showroomEmpty.style.display = 'block';
            return;
        }
        els.showroomEmpty.style.display = 'none';

        els.showroomGrid.innerHTML = list.map((p) => {
            const stock = Number(p.stock) || 0;
            const stockClass = stock <= 0 ? 'pill--stock-out'
                : stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low'
                : 'pill--stock-good';
            const stockLabel = stock <= 0 ? 'Out' : stock + ' left';

            const media = p.image_url
                ? `<img src="${escapeAttr(p.image_url)}" alt="" loading="lazy" />`
                : `<div class="prod-card__media--ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

            const branchName = branchById.get(p.branch_id) || '—';
            const showBranchTag = session.is_admin;

            const draftTag = p.is_draft
                ? '<span class="pill pill--pending prod-card__pending" title="Awaiting Director review">Pending approval</span>'
                : '';
            return `<article class="prod-card${p.is_draft ? ' prod-card--draft' : ''}" data-product-id="${p.id}">
                <div class="prod-card__media">
                    ${media}
                    <span class="pill ${stockClass} prod-card__stock">${stockLabel}</span>
                    ${showBranchTag ? `<span class="branch-tag prod-card__branch-tag">${escapeHtml(branchName)}</span>` : ''}
                    ${draftTag}
                </div>
                <div class="prod-card__body">
                    <div class="prod-card__itemno">${escapeHtml(p.item_no || '')}</div>
                    <h3 class="prod-card__title">${escapeHtml(p.description || '')}</h3>
                    <div class="prod-card__meta">
                        ${p.category ? '<span class="pill">' + escapeHtml(p.category) + '</span>' : ''}
                        ${p.material ? '<span class="pill">' + escapeHtml(p.material) + '</span>' : ''}
                    </div>
                    <div class="prod-card__price-row">
                        <div class="prod-card__price">${CURRENCY} ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="prod-card__qty">Qty: <strong>${stock}</strong></div>
                    </div>
                </div>
            </article>`;
        }).join('');
    }

    els.showroomGrid.addEventListener('click', (e) => {
        const card = e.target.closest('[data-product-id]');
        if (!card) return;
        const p = allProductsCache.find((x) => x.id === card.dataset.productId);
        if (!p) return;
        const branchName = (allBranchesCache.find((b) => b.id === p.branch_id) || {}).name || '—';
        openProductDetail(p, branchName);
    });

    [els.showroomBranchFilter, els.showroomCategoryFilter, els.showroomStockFilter].forEach((el) => {
        el.addEventListener('change', renderShowroom);
    });

    /* ============================================================
       GLOBAL SEARCH (always searches across ALL showrooms)
       Visible to both admin and staff — shows branch tag + qty
       ============================================================ */
    let globalSearchDebounce = null;
    let globalSearchData = null;

    async function loadGlobalSearchData() {
        if (globalSearchData) return globalSearchData;
        try {
            const [prods, brs] = await Promise.all([
                window.CH.products.list(null),
                allBranchesCache.length ? Promise.resolve(allBranchesCache) : window.CH.branches.list(),
            ]);
            allBranchesCache = brs;
            globalSearchData = { products: prods || [], branchById: new Map(brs.map((b) => [b.id, b.name])) };
            return globalSearchData;
        } catch (err) {
            console.error(err);
            return { products: [], branchById: new Map() };
        }
    }

    els.globalSearchInput.addEventListener('input', () => {
        clearTimeout(globalSearchDebounce);
        const q = els.globalSearchInput.value.trim().toLowerCase();
        if (q.length < 2) {
            els.globalSearchResults.hidden = true;
            return;
        }
        globalSearchDebounce = setTimeout(() => runGlobalSearch(q), 180);
    });

    els.globalSearchInput.addEventListener('focus', async () => {
        // Preload data on first focus
        await loadGlobalSearchData();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.global-search')) {
            els.globalSearchResults.hidden = true;
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') els.globalSearchResults.hidden = true;
    });

    async function runGlobalSearch(q) {
        const data = await loadGlobalSearchData();
        const matches = data.products.filter((p) => {
            const hay = [p.item_no, p.description, p.material, p.color, p.supplier, p.sku, p.category]
                .filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        }).slice(0, 40);

        if (matches.length === 0) {
            els.globalSearchResults.innerHTML = `<div class="global-search__empty">No products match "<strong>${escapeHtml(q)}</strong>" in any showroom.</div>`;
            els.globalSearchResults.hidden = false;
            return;
        }

        els.globalSearchResults.innerHTML = matches.map((p) => {
            const stock = Number(p.stock) || 0;
            const branch = data.branchById.get(p.branch_id) || '—';
            const stockClass = stock <= 0 ? 'pill--stock-out'
                : stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low'
                : 'pill--stock-good';
            const stockLabel = stock <= 0 ? 'Out of stock' : stock + ' left';

            const thumb = p.image_url
                ? `<img class="global-search__thumb" src="${escapeAttr(p.image_url)}" alt="" loading="lazy" />`
                : `<div class="global-search__thumb"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

            return `<div class="global-search__row" data-id="${p.id}">
                ${thumb}
                <div class="global-search__info">
                    <div class="global-search__title">
                        <span style="font-family:var(--f-mono);color:var(--c-accent);font-weight:600;font-size:0.82rem;">${escapeHtml(p.item_no || '')}</span>
                        &nbsp; ${escapeHtml(p.description || '')}
                    </div>
                    <div class="global-search__sub">
                        <span class="branch-tag">${escapeHtml(branch)}</span>
                        ${p.category ? ' · ' + escapeHtml(p.category) : ''}
                        ${p.color ? ' · ' + escapeHtml(p.color) : ''}
                    </div>
                </div>
                <div class="global-search__qty">
                    <strong>${CURRENCY} ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    <span class="pill ${stockClass}" style="font-size:0.68rem;margin-top:4px;">${stockLabel}</span>
                </div>
            </div>`;
        }).join('');
        els.globalSearchResults.hidden = false;
    }

    els.globalSearchResults.addEventListener('click', (e) => {
        const row = e.target.closest('[data-id]');
        if (!row) return;
        const id = row.dataset.id;
        const p = (globalSearchData && globalSearchData.products || []).find((x) => x.id === id);
        if (!p) return;
        const branchName = (globalSearchData && globalSearchData.branchById.get(p.branch_id)) || '—';
        openProductDetail(p, branchName);
        els.globalSearchResults.hidden = true;
        els.globalSearchInput.value = '';
    });

    /* ============================================================
       PRODUCT DETAIL MODAL (blurred backdrop)
       ============================================================ */
    function openProductDetail(p, branchName) {
        activePdetailProduct = p;
        const media = p.image_url
            ? `<img src="${escapeAttr(p.image_url)}" alt="" />`
            : `<div class="pdetail__media--ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
        els.pdetailMedia.innerHTML = media;
        els.pdetailItemNo.textContent = p.item_no || '—';
        els.pdetailTitle.textContent = p.description || 'Product';
        els.pdetailPrice.textContent = CURRENCY + ' ' + Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const stock = Number(p.stock) || 0;
        const stockClass = stock <= 0 ? 'pill--stock-out' : stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low' : 'pill--stock-good';
        const stockLabel = stock <= 0 ? 'Out of stock' : stock + ' available';

        const pills = [];
        if (p.category) pills.push('<span class="pill">' + escapeHtml(p.category) + '</span>');
        if (p.material) pills.push('<span class="pill">' + escapeHtml(p.material) + '</span>');
        if (p.color) pills.push('<span class="pill">' + escapeHtml(p.color) + '</span>');
        pills.push(`<span class="pill ${stockClass}">${stockLabel}</span>`);
        pills.push(`<span class="branch-tag">${escapeHtml(branchName || '—')}</span>`);
        els.pdetailMetaPills.innerHTML = pills.join('');

        const rows = [];
        const dims = [p.dim_l, p.dim_w, p.dim_h].filter(Boolean).join(' × ');
        if (dims) rows.push(['Dimensions', dims + ' mm']);
        if (p.supplier) rows.push(['Supplier', p.supplier]);
        rows.push(['Quantity', stock]);
        if (p.created_at) rows.push(['Added', new Date(p.created_at).toLocaleDateString()]);
        els.pdetailRows.innerHTML = rows.map(([k, v]) => `<div class="pdetail__row"><span>${escapeHtml(k)}</span><b>${escapeHtml(String(v))}</b></div>`).join('');

        els.pdetail.classList.add('is-open');
    }
    function closeProductDetail() {
        els.pdetail.classList.remove('is-open');
        activePdetailProduct = null;
    }
    els.pdetailClose.addEventListener('click', closeProductDetail);
    els.pdetail.addEventListener('click', (e) => { if (e.target === els.pdetail) closeProductDetail(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.pdetail.classList.contains('is-open')) closeProductDetail(); });

    /* ============================================================
       REPORTS
       ============================================================ */
    async function loadReports() {
        try {
            const { branches: br, products: prods, staff: stf } = await window.CH.reports.overview();

            // Filter to user's branch if non-admin — for products, branches AND staff
            const visibleProducts = session.is_admin
                ? prods
                : prods.filter((p) => p.branch_id === session.branch_id);
            const visibleBranches = session.is_admin
                ? br
                : br.filter((b) => b.id === session.branch_id);
            const visibleStaff = session.is_admin
                ? stf
                : stf.filter((s) => s.branch_id === session.branch_id);

            els.reportsHeading.textContent = session.is_admin
                ? `${visibleBranches.length} branch${visibleBranches.length === 1 ? '' : 'es'} · ${stf.length} staff company-wide`
                : `${session.branch_name} · ${visibleStaff.length} staff at your branch`;

            // Top cards
            const totalProducts = visibleProducts.length;
            const totalUnits = visibleProducts.reduce((s, p) => s + (Number(p.stock) || 0), 0);
            const totalValue = visibleProducts.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
            const lowStock = visibleProducts.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD).length;
            const outOfStock = visibleProducts.filter((p) => (Number(p.stock) || 0) <= 0).length;
            const branchesCount = visibleBranches.length;
            const staffCount = visibleStaff.length;
            const adminCount = visibleStaff.filter((s) => s.is_admin).length;

            els.reportCards.innerHTML = [
                card('Total products',  totalProducts.toLocaleString(), 'in inventory', 'accent'),
                card('Stock units',     totalUnits.toLocaleString(),    'units on hand', ''),
                card('Inventory value', CURRENCY + ' ' + money.format(totalValue), 'at retail price', 'accent'),
                card('Low stock',       lowStock.toLocaleString(),      `≤ ${LOW_STOCK_THRESHOLD} units`, lowStock > 0 ? 'alert' : ''),
                card('Out of stock',    outOfStock.toLocaleString(),    'needs restocking', outOfStock > 0 ? 'alert' : ''),
                card('Branches',        branchesCount.toLocaleString(), session.is_admin ? 'showrooms' : 'your branch',     ''),
                card('Staff',           staffCount.toLocaleString(),    session.is_admin
                    ? `${adminCount} Director${adminCount === 1 ? '' : 's'} company-wide`
                    : `at ${session.branch_name || 'your branch'}`,
                    ''),
                card('Avg price',       totalProducts ? CURRENCY + ' ' + money.format(totalValue / Math.max(totalUnits, 1)) : '—', 'per unit', ''),
            ].join('');

            // Per-branch breakdown
            const branchRows = visibleBranches.map((b) => {
                const bp = visibleProducts.filter((p) => p.branch_id === b.id);
                const units = bp.reduce((s, p) => s + (Number(p.stock) || 0), 0);
                const value = bp.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
                const low = bp.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD).length;
                const out = bp.filter((p) => (Number(p.stock) || 0) <= 0).length;
                const branchStaff = stf.filter((s) => s.branch_id === b.id).length;
                return `<tr>
                    <td><strong style="color:var(--c-ink-2);">${escapeHtml(b.name)}</strong>${b.location ? '<br><small style="color:var(--c-ink-5);">' + escapeHtml(b.location) + '</small>' : ''}</td>
                    <td>${bp.length}</td>
                    <td>${units.toLocaleString()}</td>
                    <td><strong>${CURRENCY} ${money.format(value)}</strong></td>
                    <td>${low > 0 ? '<span class="pill pill--stock-low">' + low + '</span>' : '—'}</td>
                    <td>${out > 0 ? '<span class="pill pill--stock-out">' + out + '</span>' : '—'}</td>
                    <td>${branchStaff}</td>
                </tr>`;
            }).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--c-ink-5);">No branches yet.</td></tr>`;
            els.branchReportBody.innerHTML = branchRows;

            // By category
            const catMap = new Map();
            visibleProducts.forEach((p) => {
                const k = p.category || '(Uncategorised)';
                if (!catMap.has(k)) catMap.set(k, { count: 0, units: 0, value: 0 });
                const c = catMap.get(k);
                c.count += 1;
                c.units += Number(p.stock) || 0;
                c.value += (Number(p.price) || 0) * (Number(p.stock) || 0);
            });
            const catRows = Array.from(catMap.entries())
                .sort((a, b) => b[1].value - a[1].value)
                .map(([cat, c]) => `<tr>
                    <td><span class="pill">${escapeHtml(cat)}</span></td>
                    <td>${c.count}</td>
                    <td>${c.units.toLocaleString()}</td>
                    <td><strong>${CURRENCY} ${money.format(c.value)}</strong></td>
                </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--c-ink-5);">No products yet.</td></tr>`;
            els.categoryReportBody.innerHTML = catRows;

            // Low stock list
            const branchNameById = new Map(br.map((b) => [b.id, b.name]));
            const lowItems = visibleProducts
                .filter((p) => (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD)
                .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
                .slice(0, 50);
            const lowRows = lowItems.map((p) => `<tr>
                <td><span class="itemno">${escapeHtml(p.item_no || '')}</span></td>
                <td>${escapeHtml(p.description || '')}</td>
                <td>${escapeHtml(p.category || '—')}</td>
                <td><span class="pill ${(Number(p.stock) || 0) <= 0 ? 'pill--stock-out' : 'pill--stock-low'}">${(Number(p.stock) || 0) <= 0 ? 'Out' : p.stock + ' left'}</span></td>
                <td>${escapeHtml(branchNameById.get(p.branch_id) || '—')}</td>
            </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--c-ink-5);">All products are well-stocked.</td></tr>`;
            els.lowStockBody.innerHTML = lowRows;

        } catch (err) {
            console.error(err);
            toast('Could not load reports: ' + (err.message || 'unknown error'), 'error');
        }

        function card(label, value, hint, kind) {
            return `<div class="report-card ${kind ? 'report-card--' + kind : ''}">
                <div class="report-card__label">${label}</div>
                <div class="report-card__value">${value}</div>
                <div class="report-card__hint">${hint}</div>
            </div>`;
        }
    }

    els.reportsRefreshBtn.addEventListener('click', loadReports);

    /* ---- Export PDF -------------------------------------------------- */
    els.reportsExportPdfBtn.addEventListener('click', async () => {
        if (!window.CH || !window.CH.pdf) {
            toast('PDF library not loaded. Reload the page and try again.', 'error');
            return;
        }
        try {
            els.reportsExportPdfBtn.disabled = true;
            const { branches: br, products: prods, staff: stf } = await window.CH.reports.overview();
            const visibleProducts = session.is_admin ? prods : prods.filter((p) => p.branch_id === session.branch_id);
            const visibleBranches = session.is_admin ? br : br.filter((b) => b.id === session.branch_id);
            await window.CH.pdf.exportReport({
                session,
                currency: CURRENCY,
                branches: visibleBranches,
                products: visibleProducts,
                staff: stf,
                lowThreshold: LOW_STOCK_THRESHOLD,
            });
            toast('Report PDF downloaded.', 'success');
        } catch (err) {
            console.error(err);
            toast('Could not export PDF: ' + (err.message || 'unknown error'), 'error');
        } finally {
            els.reportsExportPdfBtn.disabled = false;
        }
    });

    /* ============================================================
       NOTIFICATIONS — bell, panel, top-right toasts, log
       ============================================================ */
    function addNotif({ kind, title, sub, payload }) {
        const id = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        notifLog.unshift({ id, kind, title, sub, time: new Date().toISOString(), read: false, payload });
        if (notifLog.length > NOTIF_MAX) notifLog.length = NOTIF_MAX;
        updateBellCount();
        renderNotifPanel();
        showTopRightToast({ kind, title, sub });
    }

    function updateBellCount() {
        const n = notifLog.filter((x) => !x.read).length;
        if (n > 0) {
            els.bellCount.textContent = n > 99 ? '99+' : String(n);
            els.bellCount.hidden = false;
        } else {
            els.bellCount.hidden = true;
        }
    }

    function renderNotifPanel() {
        const unread = notifLog.filter((x) => !x.read);
        const read = notifLog.filter((x) => x.read);
        if (notifLog.length === 0) {
            els.notifPanelBody.innerHTML = `<div class="notif-empty">You're all caught up. New messages and stock alerts will show here.</div>`;
            return;
        }
        const renderItem = (n) => {
            const icon = n.kind === 'msg'
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
            return `<div class="notif-item ${n.read ? '' : 'is-unread'}" data-notif-id="${n.id}">
                <div class="notif-item__icon notif-item__icon--${n.kind}">${icon}</div>
                <div class="notif-item__body">
                    <div class="notif-item__title">${escapeHtml(n.title)}</div>
                    <div class="notif-item__sub">${escapeHtml(n.sub || '')}</div>
                    <div class="notif-item__time">${relTime(n.time)}</div>
                </div>
            </div>`;
        };
        let html = '';
        if (unread.length) {
            html += `<div class="notif-section"><div class="notif-section__label">New · ${unread.length}</div>${unread.map(renderItem).join('')}</div>`;
        }
        if (read.length) {
            html += `<div class="notif-section"><div class="notif-section__label">Earlier</div>${read.map(renderItem).join('')}</div>`;
        }
        els.notifPanelBody.innerHTML = html;
    }

    function showTopRightToast({ kind, title, sub }) {
        const el = document.createElement('div');
        el.className = 'notif-toast';
        const iconCls = kind === 'msg' ? 'notif-toast__icon--msg' : 'notif-toast__icon--stock';
        const iconSvg = kind === 'msg'
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`;
        el.innerHTML = `
            <div class="notif-toast__icon ${iconCls}">${iconSvg}</div>
            <div class="notif-toast__body">
                <div class="notif-toast__title">${escapeHtml(title)}</div>
                ${sub ? `<div class="notif-toast__sub">${escapeHtml(sub)}</div>` : ''}
            </div>
            <button class="notif-toast__close" aria-label="Dismiss">✕</button>`;
        els.notifToasts.appendChild(el);
        const remove = () => {
            el.classList.add('is-leaving');
            setTimeout(() => el.remove(), 220);
        };
        el.querySelector('.notif-toast__close').addEventListener('click', remove);
        setTimeout(remove, 5500);
    }

    els.bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        els.notifPanel.classList.toggle('is-open');
        if (els.notifPanel.classList.contains('is-open')) renderNotifPanel();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifPanel') && !e.target.closest('#bellBtn')) {
            els.notifPanel.classList.remove('is-open');
        }
    });
    els.notifPanelBody.addEventListener('click', (e) => {
        const item = e.target.closest('[data-notif-id]');
        if (!item) return;
        const n = notifLog.find((x) => x.id === item.dataset.notifId);
        if (!n) return;
        n.read = true;
        updateBellCount();
        renderNotifPanel();
        els.notifPanel.classList.remove('is-open');
        openNotifDetail(n);
    });

    /* ---- notification detail modal ---- */
    function openNotifDetail(n) {
        activeNotifContext = n;
        const d = new Date(n.time);

        // Icon + label color by kind
        if (n.kind === 'msg') {
            els.notifDetailIcon.style.background = 'linear-gradient(135deg, #0EA5E9, #38BDF8)';
            els.notifDetailIcon.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>`;
            els.notifDetailLabel.textContent = 'Message';
            els.notifDetailGoLabel.textContent = 'View in chat';
            els.notifDetailGo.style.display = 'inline-flex';
        } else if (n.kind === 'stock') {
            els.notifDetailIcon.style.background = 'linear-gradient(135deg, #DC2626, #F87171)';
            els.notifDetailIcon.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
            els.notifDetailLabel.textContent = 'Stock alert';
            els.notifDetailGoLabel.textContent = 'View reports';
            els.notifDetailGo.style.display = 'inline-flex';
        } else {
            els.notifDetailIcon.style.background = 'linear-gradient(135deg, var(--c-navy), var(--c-accent))';
            els.notifDetailLabel.textContent = 'Notification';
            els.notifDetailGo.style.display = 'none';
        }

        els.notifDetailTitle.textContent = n.title || '—';
        els.notifDetailBody.textContent = n.sub || '';
        els.notifDetailMeta.innerHTML = `
            <div><b>Received</b>${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div><b>Time</b>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div><b>Status</b>${n.read ? 'Read' : 'Unread'}</div>
        `;
        els.notifDetail.classList.add('is-open');
    }
    function closeNotifDetail() {
        els.notifDetail.classList.remove('is-open');
        activeNotifContext = null;
    }
    els.notifDetailClose.addEventListener('click', closeNotifDetail);
    els.notifDetailDismiss.addEventListener('click', closeNotifDetail);
    els.notifDetail.addEventListener('click', (e) => { if (e.target === els.notifDetail) closeNotifDetail(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.notifDetail.classList.contains('is-open')) closeNotifDetail(); });

    els.notifDetailGo.addEventListener('click', () => {
        const n = activeNotifContext;
        if (!n) { closeNotifDetail(); return; }
        closeNotifDetail();
        if (n.kind === 'msg' && n.payload) {
            const threadId = session.is_admin
                ? n.payload.thread_staff_id
                : session.id;       // staff thread is always themselves
            pendingScrollMsgId = n.payload.message_id || null;
            switchView('messages');
            // For admin we need to set the active thread + load it (since admin chooses from list)
            if (session.is_admin && threadId) {
                activeChatThread = threadId;
                setTimeout(() => {
                    // Update active highlight in conversation list, then load
                    $$('.chat-item').forEach((el) => el.classList.toggle('is-active', el.dataset.thread === threadId));
                    loadActiveThread();
                }, 150);
            } else {
                // Staff: thread is auto-set by openChat(); just reload to pick up scroll target
                setTimeout(() => loadActiveThread(), 150);
            }
        } else if (n.kind === 'stock') {
            switchView('reports');
        }
    });
    els.notifMarkAllRead.addEventListener('click', () => {
        notifLog.forEach((n) => { n.read = true; });
        updateBellCount();
        renderNotifPanel();
    });

    /* ============================================================
       MESSAGES (staff ↔ admin chat with realtime)
       ============================================================ */
    async function openChat() {
        if (session.is_admin) {
            els.chatList.hidden = false;
            els.chatList.removeAttribute('hidden');
            els.chatWrap.classList.remove('staff-only');
            // Always load fresh staff list + thread metadata
            try { allStaffCache = await window.CH.staff.list(); } catch (_) {}
            if (adminChatTab === 'announcements') {
                // Single composer page on mobile, two-pane on desktop
                els.chatWrap.classList.add('ann-mode');
                els.chatWrap.classList.remove('show-chat');
                renderAnnouncementsCompose();
            } else {
                // Mobile starts in list view; desktop sees both panes
                els.chatWrap.classList.remove('ann-mode');
                els.chatWrap.classList.remove('show-chat');
                await loadAdminConversations();
                // On desktop, auto-open the first thread for convenience
                const isDesktop = window.matchMedia('(min-width: 861px)').matches;
                if (isDesktop) {
                    const firstItem = els.chatListItems.querySelector('.chat-item');
                    if (firstItem && !activeChatThread) firstItem.click();
                    else if (!activeChatThread) showChatPanePlaceholder();
                    else await loadActiveThread();
                }
                // On mobile: leave list visible until user taps a staff
            }
        } else {
            els.chatList.hidden = true;
            els.chatList.setAttribute('hidden', '');     // belt + braces
            if (els.chatTabs) els.chatTabs.style.display = 'none';
            els.chatWrap.classList.add('staff-only');
            // Staff: their own thread (themselves) — header shows Director
            activeChatThread = session.id;
            els.chatPaneName.textContent = 'Director Support';
            els.chatPaneSub.textContent = 'Ask questions, report issues, get help.';
            els.chatPaneAvatar.textContent = 'D';
            await loadActiveThread();
        }
    }

    async function loadAdminConversations() {
        try {
            // Staff list is the priority — load it independently of messages
            if (!allStaffCache.length) {
                try { allStaffCache = await window.CH.staff.list(); } catch (_) {}
            }
            const staffRows = allStaffCache;
            // Try to fetch threads — gracefully degrade if messages table missing
            let threads = [];
            try {
                threads = await window.CH.messages.listAdminThreads();
            } catch (e) {
                console.warn('messages threads unavailable:', e && e.message);
            }
            // Exclude admins (don't chat with yourself / other admins through this UI)
            const nonAdmin = staffRows.filter((s) => !s.is_admin && s.id !== session.id);
            const threadById = new Map(threads.map((t) => [t.thread_staff_id, t]));

            if (nonAdmin.length === 0) {
                els.chatListItems.innerHTML = `<div style="padding:24px;text-align:center;color:var(--c-ink-5);font-size:0.88rem;">No staff to chat with yet. Add staff under <strong>Director → Staff</strong>.</div>`;
                return;
            }

            // Sort: staff with conversations first (by latest message), then alphabetical
            const sorted = nonAdmin.slice().sort((a, b) => {
                const ta = threadById.get(a.id);
                const tb = threadById.get(b.id);
                if (ta && !tb) return -1;
                if (!ta && tb) return 1;
                if (ta && tb) return new Date(tb.last.created_at) - new Date(ta.last.created_at);
                return (a.name || '').localeCompare(b.name || '');
            });

            els.chatListItems.innerHTML = sorted.map((s) => {
                const t = threadById.get(s.id);
                const preview = t
                    ? ((t.last.sender_is_admin ? 'You: ' : '') + (t.last.body || ''))
                    : (s.branch_name || s.role || '—');
                const time = t ? relTime(t.last.created_at) : '';
                const unread = t ? t.unread : 0;
                return `<div class="chat-item ${s.id === activeChatThread ? 'is-active' : ''}" data-thread="${s.id}" data-name="${escapeAttr(s.name || '')}" data-role="${escapeAttr(s.role || '')}" data-branch="${escapeAttr(s.branch_name || '')}">
                    <div class="chat-item__avatar">${initials(s.name)}</div>
                    <div class="chat-item__body">
                        <div class="chat-item__name">${escapeHtml(s.name || 'Staff')}</div>
                        <div class="chat-item__preview">${escapeHtml(preview).slice(0, 80)}</div>
                    </div>
                    <div class="chat-item__meta">
                        ${time ? `<div class="chat-item__time">${time}</div>` : ''}
                        ${unread > 0 ? `<div class="chat-item__unread">${unread}</div>` : ''}
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error(err);
            toast('Could not load conversations: ' + (err.message || 'unknown error'), 'error');
        }
    }

    els.chatListItems.addEventListener('click', async (e) => {
        const item = e.target.closest('[data-thread]');
        if (!item) return;
        activeChatThread = item.dataset.thread;
        els.chatPaneName.textContent = item.dataset.name || 'Staff';
        els.chatPaneSub.textContent = `${item.dataset.role || 'Staff'} · ${item.dataset.branch || 'No branch'}`;
        els.chatPaneAvatar.textContent = initials(item.dataset.name || 'S');
        $$('.chat-item').forEach((el) => el.classList.toggle('is-active', el === item));
        // Mobile: swap to chat view (single-pane navigation)
        els.chatWrap.classList.add('show-chat');
        els.chatWrap.classList.remove('ann-mode');
        await loadActiveThread();
    });

    // Back button in chat header (mobile only) → return to staff list
    const chatBackBtn = document.getElementById('chatBack');
    if (chatBackBtn) {
        chatBackBtn.addEventListener('click', () => {
            els.chatWrap.classList.remove('show-chat');
            activeChatThread = null;
            // Reset active highlight in the list
            $$('.chat-item').forEach((el) => el.classList.remove('is-active'));
        });
    }

    // Admin chat tab switching: Conversations vs Announcements
    els.chatTabs && els.chatTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-chat-tab]');
        if (!btn) return;
        adminChatTab = btn.dataset.chatTab;
        $$('.chat-tab').forEach((el) => el.classList.toggle('is-active', el === btn));
        if (adminChatTab === 'announcements') {
            // Mobile: show only the composer page (no list, no back button)
            els.chatWrap.classList.add('ann-mode');
            els.chatWrap.classList.remove('show-chat');
            renderAnnouncementsCompose();
        } else {
            // Mobile: back to the staff list (single-pane)
            els.chatWrap.classList.remove('ann-mode');
            els.chatWrap.classList.remove('show-chat');
            renderConversationsPane();
            loadAdminConversations();
        }
    });

    function renderConversationsPane() {
        els.chatListItems.innerHTML = '';
        els.chatPaneName.textContent = 'Select a conversation';
        els.chatPaneSub.textContent = '';
        els.chatPaneAvatar.textContent = 'CH';
        showChatPanePlaceholder();
    }

    function renderAnnouncementsCompose() {
        // Switch the right pane into "post an announcement" mode
        els.chatPaneName.textContent = 'Post an announcement';
        els.chatPaneSub.textContent = 'Visible to all staff in their Announcements view.';
        els.chatPaneAvatar.textContent = '📣';
        els.chatThread.innerHTML = `
            <div class="ann-compose" style="max-width:560px;">
                <input id="annTitleInput" placeholder="Title (optional)" />
                <textarea id="annBodyInput" placeholder="Write your announcement…"></textarea>
                <button class="btn btn--primary" id="annPostBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    <span>Send to all staff</span>
                </button>
            </div>
            <div id="annAdminList" style="margin-top:16px;"></div>
        `;
        document.getElementById('annPostBtn').addEventListener('click', postAnnouncement);
        loadAdminAnnouncementHistory();
        // List items: load past announcements as items in left pane
        loadAdminAnnouncementsAsList();
    }

    async function postAnnouncement() {
        const title = document.getElementById('annTitleInput').value.trim();
        const body = document.getElementById('annBodyInput').value.trim();
        if (!body) { toast('Type your announcement first.', 'error'); return; }
        try {
            await window.CH.announcements.post({ title, body, sender_id: session.id, sender_name: session.name });
            // Store full title + body so the activity log can show the complete announcement
            const fullNote = (title ? '[' + title + '] ' : '') + body;
            window.CH.logs.record({ action: 'announcement', staff_id: session.id, staff_name: session.name, note: fullNote });
            toast('Announcement posted to all staff.', 'success');
            document.getElementById('annTitleInput').value = '';
            document.getElementById('annBodyInput').value = '';
            loadAdminAnnouncementHistory();
            loadAdminAnnouncementsAsList();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                toast('Announcements are not enabled yet. Please ask the Director.', 'error');
            } else {
                toast('Could not post announcement: ' + (err.message || 'unknown'), 'error');
            }
        }
    }

    async function loadAdminAnnouncementHistory() {
        try {
            const list = await window.CH.announcements.list(20);
            const wrap = document.getElementById('annAdminList');
            if (!wrap) return;
            if (list.length === 0) {
                wrap.innerHTML = `<div style="color:var(--c-ink-5);font-size:0.86rem;">No announcements yet.</div>`;
                return;
            }
            wrap.innerHTML = '<h3 style="font-size:0.86rem;color:var(--c-ink-4);text-transform:uppercase;letter-spacing:0.1em;margin:8px 0 10px;">Recent announcements</h3>' +
                list.map((a) => `<div class="ann-card">
                    <div class="ann-card__head">
                        <h4 class="ann-card__title">${escapeHtml(a.title || 'Announcement')}</h4>
                        <span class="ann-card__meta">${relTime(a.created_at)} · ${escapeHtml(a.sender_name || '')}</span>
                    </div>
                    <div class="ann-card__body">${escapeHtml(a.body)}</div>
                </div>`).join('');
        } catch (_) {}
    }
    async function loadAdminAnnouncementsAsList() {
        try {
            const list = await window.CH.announcements.list(20);
            if (list.length === 0) {
                els.chatListItems.innerHTML = `<div style="padding:24px;text-align:center;color:var(--c-ink-5);font-size:0.88rem;">No announcements yet — write the first one on the right.</div>`;
                return;
            }
            els.chatListItems.innerHTML = list.map((a) => `<div class="chat-item">
                <div class="chat-item__avatar" style="background:linear-gradient(135deg,#7C3AED,#38BDF8);">📣</div>
                <div class="chat-item__body">
                    <div class="chat-item__name">${escapeHtml(a.title || 'Announcement')}</div>
                    <div class="chat-item__preview">${escapeHtml((a.body || '').slice(0, 80))}</div>
                </div>
                <div class="chat-item__meta">
                    <div class="chat-item__time">${relTime(a.created_at)}</div>
                </div>
            </div>`).join('');
        } catch (_) {}
    }

    function showChatPanePlaceholder() {
        els.chatThread.innerHTML = `<div class="chat-empty">
            <div>
                <div style="font-size:2rem;margin-bottom:8px;">💬</div>
                Select a conversation from the left, or wait for a staff member to message you.
            </div>
        </div>`;
        activeChatThread = null;
    }

    async function loadActiveThread() {
        if (!activeChatThread) return;
        try {
            const msgs = await window.CH.messages.listThread(activeChatThread);
            renderThread(msgs);
            await window.CH.messages.markRead(activeChatThread, !!session.is_admin);
            await updateUnreadBadge();
        } catch (err) {
            console.error(err);
            toast('Could not load messages: ' + (err.message || 'unknown error'), 'error');
        }
    }

    function renderThread(msgs) {
        if (!msgs || msgs.length === 0) {
            els.chatThread.innerHTML = `<div class="chat-empty">
                <div>
                    <div style="font-size:2rem;margin-bottom:8px;">👋</div>
                    ${session.is_admin ? 'No messages in this conversation yet.' : 'Say hi to start the conversation.'}
                </div>
            </div>`;
            return;
        }
        els.chatThread.innerHTML = msgs.map((m) => {
            const mine = m.sender_id === session.id;
            const cls = mine ? 'bubble--mine' : 'bubble--theirs';
            const rowCls = mine ? 'bubble-row--mine' : 'bubble-row--theirs';
            const meta = `${mine ? 'You' : escapeHtml(m.sender_name || 'Them')} · ${relTime(m.created_at)}`;
            return `<div class="bubble-row ${rowCls}" data-message-id="${m.id}"><div class="bubble ${cls}">${escapeHtml(m.body)}<div class="bubble__meta">${meta}</div></div></div>`;
        }).join('');

        // Pending scroll-to-message (from notification click) takes priority
        if (pendingScrollMsgId) {
            const target = els.chatThread.querySelector(`[data-message-id="${pendingScrollMsgId}"]`);
            const bubble = target && target.querySelector('.bubble');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (bubble) {
                    bubble.classList.add('is-highlighted');
                    setTimeout(() => bubble.classList.remove('is-highlighted'), 1700);
                }
            } else {
                els.chatThread.scrollTop = els.chatThread.scrollHeight;
            }
            pendingScrollMsgId = null;
        } else {
            // Default: scroll to bottom
            els.chatThread.scrollTop = els.chatThread.scrollHeight;
        }
    }

    els.chatComposeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = els.chatInput.value.trim();
        if (!body) return;
        if (!activeChatThread) {
            toast('Pick a staff to message first.', 'error');
            return;
        }
        els.chatSendBtn.disabled = true;
        try {
            await window.CH.messages.send({
                thread_staff_id: activeChatThread,
                body,
                sender_id: session.id,
                sender_name: session.name,
                sender_is_admin: !!session.is_admin,
            });
            els.chatInput.value = '';
            els.chatInput.style.height = 'auto';
            try { await loadActiveThread(); } catch (_) {}
            try { if (session.is_admin) await loadAdminConversations(); } catch (_) {}
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                toast('Messaging is not enabled yet. Please ask the Director.', 'error');
            } else {
                toast('Could not send message: ' + (err.message || 'unknown error'), 'error');
            }
        } finally {
            els.chatSendBtn.disabled = false;
            els.chatInput.focus();
        }
    });

    // Send on Enter (Shift+Enter = newline)
    els.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            els.chatComposeForm.requestSubmit();
        }
    });

    // Back button in Announcements view header
    const annBackBtn = document.getElementById('annBackBtn');
    if (annBackBtn) {
        annBackBtn.addEventListener('click', () => {
            switchView(previousView && previousView !== 'announcements' ? previousView : 'products');
        });
    }

    /* ============================================================
       ANNOUNCEMENTS — staff view (read), badge, realtime
       ============================================================ */
    async function loadAnnouncements() {
        try {
            const list = await window.CH.announcements.list(50).catch((e) => { if (isMissingTableError(e)) return []; throw e; });
            announcementsCache = list;
            if (list.length === 0) {
                els.announcementsList.innerHTML = '';
                els.announcementsEmpty.style.display = 'block';
                els.announcementsHeading.textContent = 'Messages from the Director.';
                return;
            }
            els.announcementsEmpty.style.display = 'none';
            const lastSeen = lastSeenAnnouncementTs ? new Date(lastSeenAnnouncementTs) : null;
            const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            els.announcementsList.innerHTML = list.map((a) => {
                const d = new Date(a.created_at);
                const isNew = !lastSeen || d > lastSeen;
                const day = d.getDate();
                const month = months[d.getMonth()];
                const year = d.getFullYear();
                const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `<article class="ann-feed-card ${isNew ? 'is-new' : ''}" data-ann-id="${a.id}" tabindex="0">
                    <div class="ann-feed-card__date">
                        <div class="ann-feed-card__day">${day}</div>
                        <div class="ann-feed-card__month">${month}</div>
                        <div class="ann-feed-card__year">${year}</div>
                        <div class="ann-feed-card__time">${time}</div>
                    </div>
                    <div class="ann-feed-card__body">
                        <h3 class="ann-feed-card__title">${escapeHtml(a.title || 'Announcement')}${isNew ? '<span class="ann-feed-card__new-badge">New</span>' : ''}</h3>
                        <p class="ann-feed-card__text">${escapeHtml((a.body || '').slice(0, 160))}${(a.body && a.body.length > 160) ? '…' : ''}</p>
                        <div class="ann-feed-card__sender">— ${escapeHtml(a.sender_name || 'Director')} <span class="pill pill--admin" style="margin-left:6px;">Director</span></div>
                    </div>
                </article>`;
            }).join('');
            els.announcementsHeading.textContent = `${list.length} announcement${list.length === 1 ? '' : 's'} from the Director`;

            // Mark all read
            lastSeenAnnouncementTs = list[0].created_at;
            localStorage.setItem('ch_ann_last_seen', lastSeenAnnouncementTs);
            updateAnnouncementBadge();
        } catch (err) {
            console.error(err);
            toast('Could not load announcements: ' + (err.message || 'unknown error'), 'error');
        }
    }

    async function updateAnnouncementBadge() {
        try {
            const list = await window.CH.announcements.list(20);
            if (list.length === 0) { els.navAnnBadge.hidden = true; return; }
            const lastSeen = lastSeenAnnouncementTs ? new Date(lastSeenAnnouncementTs) : null;
            const unread = list.filter((a) => !lastSeen || new Date(a.created_at) > lastSeen).length;
            if (unread > 0 && currentView !== 'announcements') {
                els.navAnnBadge.textContent = unread > 99 ? '99+' : String(unread);
                els.navAnnBadge.hidden = false;
            } else {
                els.navAnnBadge.hidden = true;
            }
        } catch (_) {}
    }

    /* ---- announcement detail modal ---- */
    function openAnnouncementDetail(a) {
        if (!a) return;
        const d = new Date(a.created_at);
        els.annDetailTitle.textContent = a.title || 'Announcement';
        els.annDetailBody.textContent = a.body || '';
        els.annDetailMeta.innerHTML = `
            <div><b>Date</b>${d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><b>Time</b>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        els.annDetailSender.innerHTML = `Sent by <strong style="color:var(--c-ink-2);margin-left:4px;">${escapeHtml(a.sender_name || 'Director')}</strong> <span class="pill pill--admin" style="margin-left:6px;font-size:0.62rem;">Director</span>`;
        els.annDetail.classList.add('is-open');
    }
    function closeAnnouncementDetail() {
        els.annDetail.classList.remove('is-open');
    }
    els.announcementsList.addEventListener('click', (e) => {
        const card = e.target.closest('[data-ann-id]');
        if (!card) return;
        const a = announcementsCache.find((x) => x.id === card.dataset.annId);
        if (a) openAnnouncementDetail(a);
    });
    els.announcementsList.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-ann-id]');
        if (!card) return;
        e.preventDefault();
        const a = announcementsCache.find((x) => x.id === card.dataset.annId);
        if (a) openAnnouncementDetail(a);
    });
    els.annDetailClose.addEventListener('click', closeAnnouncementDetail);
    els.annDetail.addEventListener('click', (e) => { if (e.target === els.annDetail) closeAnnouncementDetail(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.annDetail.classList.contains('is-open')) closeAnnouncementDetail(); });

    function setupAnnouncementRealtime() {
        if (!window.CH.announcements || !window.CH.announcements.subscribe) return;
        window.CH.announcements.subscribe(async (payload) => {
            if (payload.eventType !== 'INSERT') return;
            const a = payload.new;
            if (!a) return;
            if (session.is_admin) return; // admins see them in their own UI
            addNotif({
                kind: 'msg',
                title: 'New announcement: ' + (a.title || ''),
                sub: a.body,
                payload: { announcement_id: a.id },
            });
            if (currentView === 'announcements') {
                await loadAnnouncements();
            } else {
                await updateAnnouncementBadge();
            }
        });
    }

    /* ============================================================
       UNREAD BADGE + REALTIME + NOTIFICATIONS
       ============================================================ */
    async function updateUnreadBadge() {
        try {
            const n = await window.CH.messages.unreadCount(session);
            if (n > 0) {
                els.navMsgBadge.textContent = n > 99 ? '99+' : String(n);
                els.navMsgBadge.hidden = false;
            } else {
                els.navMsgBadge.hidden = true;
            }
        } catch (err) {
            console.warn('unread count failed:', err);
        }
    }

    function setupRealtime() {
        if (chatUnsubscribe) chatUnsubscribe();
        chatUnsubscribe = window.CH.messages.subscribe(async (payload) => {
            const msg = payload.new || payload.old;
            if (!msg) return;

            // Ignore my own outgoing message (already rendered locally)
            if (msg.sender_id === session.id) return;

            // If admin and viewing this thread: append + mark read
            // If staff and the message is for them: append
            const isForMe = session.is_admin
                ? !msg.sender_is_admin
                : (msg.thread_staff_id === session.id && msg.sender_is_admin);

            if (!isForMe) return;

            // Refresh visible parts
            if (currentView === 'messages') {
                if (msg.thread_staff_id === activeChatThread) {
                    await loadActiveThread();
                }
                if (session.is_admin) await loadAdminConversations();
            }
            await updateUnreadBadge();

            // Browser notification (if permission granted)
            notifyMessage(msg);
        });
    }

    function notifyMessage(msg) {
        const title = session.is_admin
            ? `New message from ${msg.sender_name || 'Staff'}`
            : 'New message from Director';

        // Always add to in-app notification log + top-right toast
        if (!(currentView === 'messages' && msg.thread_staff_id === activeChatThread && document.visibilityState === 'visible')) {
            addNotif({
                kind: 'msg',
                title,
                sub: msg.body,
                payload: { thread_staff_id: msg.thread_staff_id, message_id: msg.id },
            });
        }

        // Browser OS notification
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        if (currentView === 'messages' && msg.thread_staff_id === activeChatThread && document.visibilityState === 'visible') return;

        try {
            const n = new Notification(title, {
                body: msg.body,
                icon: 'assets/logo.png',
                badge: 'assets/logo.png',
                tag: 'ch-msg-' + msg.thread_staff_id,
            });
            n.onclick = () => { window.focus(); switchView('messages'); n.close(); };
        } catch (_) {}
    }

    async function requestNotificationPermissionOnce() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            // Wait for first user interaction so the browser allows the prompt
            const ask = async () => {
                try { await Notification.requestPermission(); } catch (_) {}
                document.removeEventListener('click', ask);
                document.removeEventListener('keydown', ask);
            };
            document.addEventListener('click', ask, { once: true });
            document.addEventListener('keydown', ask, { once: true });
        }
    }

    function checkStockAlertsLocal() {
        const low = products.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD);
        const out = products.filter((p) => (Number(p.stock) || 0) <= 0);
        const total = low.length + out.length;
        if (total === 0) return;

        const title = 'Stock alert';
        const sub = total === 1
            ? `1 product needs restocking attention.`
            : `${total} products need attention — ${low.length} low, ${out.length} out of stock.`;

        addNotif({ kind: 'stock', title, sub });

        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Clasikal Homes — ' + title, { body: sub, icon: 'assets/logo.png', tag: 'ch-stock-alert' });
            } catch (_) {}
        }
    }

    /* ============================================================
       EXTRACT (OCR) — admin uploads a catalog image, Tesseract reads
       the text, each line becomes a draft product
       ============================================================ */
    let ocrFileBlob = null;

    function initExtract() {
        // Populate branch select once
        if (els.ocrBranchSelect.options.length === 0) {
            if (allBranchesCache.length === 0) {
                window.CH.branches.list().then((b) => {
                    allBranchesCache = b;
                    fillOcrBranchSelect();
                });
            } else {
                fillOcrBranchSelect();
            }
        }
    }
    function fillOcrBranchSelect() {
        const opts = allBranchesCache.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
        els.ocrBranchSelect.innerHTML = opts;
        if (session.branch_id) els.ocrBranchSelect.value = session.branch_id;
    }

    els.ocrFile.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        ocrFileBlob = f;
        els.ocrPreview.src = URL.createObjectURL(f);
        els.ocrPreviewWrap.style.display = 'block';
        els.ocrRunBtn.disabled = false;
        els.ocrStatus.textContent = 'Ready to extract. Click "Extract text".';
        els.ocrEditorWrap.style.display = 'none';
    });

    els.ocrRunBtn.addEventListener('click', async () => {
        if (!ocrFileBlob) return;
        if (!window.Tesseract) {
            toast('OCR library not loaded. Check internet connection.', 'error');
            return;
        }
        els.ocrRunBtn.disabled = true;
        els.ocrStatus.textContent = 'Preprocessing image…';
        try {
            const enhanced = await preprocessForOCR(ocrFileBlob);
            els.ocrStatus.textContent = 'Loading OCR engine…';
            const worker = await window.Tesseract.createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        els.ocrStatus.textContent = 'Reading text… ' + Math.round(m.progress * 100) + '%';
                    } else if (m.status) {
                        els.ocrStatus.textContent = m.status + (m.progress ? ' ' + Math.round(m.progress * 100) + '%' : '');
                    }
                },
            });
            // PSM 6 = uniform block of text. Better for catalog tables than the default auto.
            await worker.setParameters({
                tessedit_pageseg_mode: window.Tesseract.PSM ? window.Tesseract.PSM.SINGLE_BLOCK : '6',
                preserve_interword_spaces: '1',
            });
            const { data } = await worker.recognize(enhanced);
            await worker.terminate();
            const cleaned = smartParseOcrText(data.text || '');
            els.ocrText.value = cleaned;
            els.ocrEditorWrap.style.display = 'block';
            const lineCount = cleaned.split(/\r?\n/).filter(Boolean).length;
            const codeCount = cleaned.split(/\r?\n/).filter(isLikelyItemRow).length;
            els.ocrStatus.textContent = `Extracted ${lineCount} line(s). ${codeCount} look like item rows. Review carefully and click Save.`;
        } catch (err) {
            console.error(err);
            els.ocrStatus.textContent = 'Failed: ' + (err.message || 'unknown error');
            toast('OCR failed: ' + (err.message || 'unknown error'), 'error');
        } finally {
            els.ocrRunBtn.disabled = false;
        }
    });

    /**
     * Preprocess image client-side for better OCR:
     * - Scale up small images (Tesseract works best ~300dpi → ~1500px wide)
     * - Convert to grayscale + contrast boost + binary threshold
     */
    async function preprocessForOCR(blob) {
        const img = await new Promise((res, rej) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = rej;
            i.src = URL.createObjectURL(blob);
        });
        const targetWidth = Math.max(1500, img.naturalWidth);
        const scale = targetWidth / img.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Grayscale + contrast boost
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const contrast = 1.4;
        const intercept = 128 * (1 - contrast);
        for (let i = 0; i < d.length; i += 4) {
            // luminance
            const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // contrast
            let v = y * contrast + intercept;
            v = v < 0 ? 0 : v > 255 ? 255 : v;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    function isLikelyItemRow(line) {
        // A line that starts with a token containing at least one digit OR a dash is probably an item row
        const m = line.match(/^\S+/);
        return !!(m && /[0-9]/.test(m[0]) && m[0].length >= 2);
    }

    function smartParseOcrText(raw) {
        // Strip empty / single-char noise lines
        const lines = raw.split(/\r?\n/)
            .map((l) => l.replace(/[|]+/g, ' ').replace(/\s+/g, ' ').trim())
            .filter((l) => l && l.length >= 3);

        // Try to merge wrapped descriptions: if a line doesn't start with an item code,
        // attach it to the previous line that did.
        const merged = [];
        for (const line of lines) {
            if (isLikelyItemRow(line) || merged.length === 0) {
                merged.push(line);
            } else {
                merged[merged.length - 1] += ' ' + line;
            }
        }
        return merged.join('\n');
    }

    els.ocrSaveBtn.addEventListener('click', async () => {
        const lines = els.ocrText.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) { toast('Nothing to save — paste or extract text first.', 'error'); return; }
        const branch_id = els.ocrBranchSelect.value || session.branch_id;
        if (!branch_id) { toast('Pick a branch first.', 'error'); return; }

        const branch = allBranchesCache.find((b) => b.id === branch_id);
        let saved = 0, incomplete = 0;

        try {
            els.ocrSaveBtn.disabled = true;
            for (const line of lines) {
                // Heuristic: first whitespace-separated token (containing a digit or dash) is the code
                const m = line.match(/^([A-Z0-9][A-Z0-9\-_/]*?)\s+(.+)$/i);
                const item_no = m ? m[1].trim().toUpperCase() : '';
                const description = m ? m[2].trim() : line.trim();
                const isComplete = !!item_no && !!description;
                const payload = {
                    id: '',
                    item_no: item_no || null,
                    description: description || null,
                    branch_id,
                    added_by: session.id,
                    added_by_name: session.name,
                    is_draft: !isComplete,         // incomplete rows are drafts; complete ones still drafts for review
                    stock: 0,
                    price: 0,
                };
                // Per user request: anything from OCR goes to drafts so it's reviewed before publishing
                payload.is_draft = true;

                try {
                    const created = await window.CH.products.upsert(payload);
                    saved++;
                    if (!isComplete) incomplete++;
                    await window.CH.logs.record({
                        product_id: created && created.id,
                        item_no: payload.item_no,
                        action: 'drafted',
                        branch_id,
                        branch_name: branch && branch.name,
                        staff_id: session.id,
                        staff_name: session.name,
                        note: 'via OCR extract' + (isComplete ? '' : ' — needs attention'),
                    });
                } catch (rowErr) {
                    console.warn('skipped row:', line, rowErr);
                }
            }
            toast(`Saved ${saved} draft${saved === 1 ? '' : 's'}${incomplete ? ' · ' + incomplete + ' need attention' : ''}.`, 'success');
            // Reset
            els.ocrFile.value = '';
            els.ocrText.value = '';
            els.ocrPreviewWrap.style.display = 'none';
            els.ocrEditorWrap.style.display = 'none';
            ocrFileBlob = null;
            await updateDraftsBadge();
            switchView('drafts');
        } catch (err) {
            console.error(err);
            toast('Save failed: ' + (err.message || 'unknown error'), 'error');
        } finally {
            els.ocrSaveBtn.disabled = false;
        }
    });

    /* ============================================================
       DRAFTS (admin) — incomplete products
       ============================================================ */
    function isMissingTableError(err) {
        const msg = (err && (err.message || err.hint || '')).toLowerCase();
        return msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('not found');
    }

    function showEmpty(listEl, emptyEl, title, body) {
        if (listEl) listEl.innerHTML = '';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            const h3 = emptyEl.querySelector('h3');
            const p = emptyEl.querySelector('p');
            if (title && h3) h3.textContent = title;
            if (body && p)  p.textContent = body;
        }
    }

    async function loadDrafts() {
        try {
            // Director sees all drafts; Branch Manager only sees their branch.
            const role = currentRole();
            const filter = role === 'admin' ? undefined : session.branch_id;
            const drafts = await window.CH.drafts.list(filter);
            allDraftsCache = drafts;
            // Drop any stale selections (drafts that no longer exist)
            const validIds = new Set(drafts.map((d) => d.id));
            for (const id of [...selectedDraftIds]) {
                if (!validIds.has(id)) selectedDraftIds.delete(id);
            }
            if (allBranchesCache.length === 0) allBranchesCache = await window.CH.branches.list();
            const branchById = new Map(allBranchesCache.map((b) => [b.id, b.name]));

            if (drafts.length === 0) {
                els.draftsBody.innerHTML = '';
                els.draftsEmpty.style.display = 'block';
                refreshDraftsBulkBar();
                return;
            }
            els.draftsEmpty.style.display = 'none';

            els.draftsBody.innerHTML = drafts.map((d) => {
                const missing = [];
                if (!d.item_no)     missing.push('item code');
                if (!d.description) missing.push('description');
                if (!d.price)       missing.push('price');
                if (d.stock == null) missing.push('stock');
                const needsAttention = missing.length > 0;
                const checked = selectedDraftIds.has(d.id) ? 'checked' : '';
                return `<tr>
                    <td style="padding-right:0;"><input type="checkbox" class="drafts-cb" data-draft-cb="${d.id}" ${checked} aria-label="Select draft" /></td>
                    <td>${d.item_no ? '<span class="itemno">' + escapeHtml(d.item_no) + '</span>' : '<span style="color:var(--c-ink-5);font-style:italic;">— no code —</span>'}</td>
                    <td>${escapeHtml(d.description || '— no description —')}</td>
                    <td>${escapeHtml(branchById.get(d.branch_id) || '—')}</td>
                    <td>${relTime(d.created_at)}</td>
                    <td>${needsAttention
                        ? '<span class="pill pill--stock-low">Needs attention · ' + missing.length + '</span>'
                        : '<span class="pill pill--stock-good">Ready</span>'}</td>
                    <td>
                        <div class="row-actions">
                            <button class="icon-btn" data-draft-edit="${d.id}" title="Edit fields">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="icon-btn ${needsAttention ? '' : ''}" data-draft-publish="${d.id}" title="${needsAttention ? 'Fill missing fields first' : 'Publish to Products'}" ${needsAttention ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : 'style="color:var(--c-success);"'}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                            <button class="icon-btn icon-btn--danger" data-draft-del="${d.id}" title="Discard">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
            refreshDraftsBulkBar();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                showEmpty(els.draftsBody, els.draftsEmpty, 'Drafts not enabled yet', 'Please ask the Director to enable this feature.');
            } else {
                toast('Could not load drafts: ' + (err.message || 'unknown error'), 'error');
            }
        }
    }

    function refreshDraftsBulkBar() {
        const bar = document.getElementById('draftsBulkBar');
        const countEl = document.getElementById('draftsBulkCount');
        const selectAll = document.getElementById('draftsSelectAll');
        if (!bar) return;
        const n = selectedDraftIds.size;
        if (countEl) countEl.textContent = String(n);
        bar.hidden = n === 0;
        if (selectAll) {
            const total = allDraftsCache.length;
            selectAll.checked = total > 0 && n === total;
            selectAll.indeterminate = n > 0 && n < total;
        }
    }

    // Row-level checkbox toggles a single draft in/out of selection
    els.draftsBody.addEventListener('change', (e) => {
        const cb = e.target.closest('[data-draft-cb]');
        if (!cb) return;
        const id = cb.dataset.draftCb;
        if (cb.checked) selectedDraftIds.add(id); else selectedDraftIds.delete(id);
        refreshDraftsBulkBar();
    });

    // Header "select all" toggles every visible draft
    const draftsSelectAllEl = document.getElementById('draftsSelectAll');
    if (draftsSelectAllEl) draftsSelectAllEl.addEventListener('change', () => {
        if (draftsSelectAllEl.checked) {
            allDraftsCache.forEach((d) => selectedDraftIds.add(d.id));
        } else {
            selectedDraftIds.clear();
        }
        // Reflect on every row's checkbox
        $$('#draftsBody [data-draft-cb]').forEach((el) => {
            el.checked = selectedDraftIds.has(el.dataset.draftCb);
        });
        refreshDraftsBulkBar();
    });

    // Clear button
    const draftsBulkClearBtn = document.getElementById('draftsBulkClearBtn');
    if (draftsBulkClearBtn) draftsBulkClearBtn.addEventListener('click', () => {
        selectedDraftIds.clear();
        $$('#draftsBody [data-draft-cb]').forEach((el) => { el.checked = false; });
        refreshDraftsBulkBar();
    });

    // Bulk delete
    const draftsBulkDeleteBtn = document.getElementById('draftsBulkDeleteBtn');
    if (draftsBulkDeleteBtn) draftsBulkDeleteBtn.addEventListener('click', async () => {
        if (selectedDraftIds.size === 0) return;
        const ids = [...selectedDraftIds];
        const word = ids.length === 1 ? 'draft' : 'drafts';
        if (!confirm('Discard ' + ids.length + ' ' + word + '? This cannot be undone.')) return;
        try {
            draftsBulkDeleteBtn.disabled = true;
            // Run deletes in parallel, but log each one
            const idToDraft = new Map(allDraftsCache.map((d) => [d.id, d]));
            const results = await Promise.allSettled(ids.map(async (id) => {
                const d = idToDraft.get(id) || {};
                await window.CH.products.remove(id);
                try {
                    await window.CH.logs.record({
                        product_id: id,
                        item_no: d.item_no || null,
                        action: 'deleted',
                        branch_id: d.branch_id || null,
                        staff_id: session.id,
                        staff_name: session.name,
                        note: 'draft discarded (bulk)',
                    });
                } catch (_) {}
            }));
            const ok = results.filter((r) => r.status === 'fulfilled').length;
            const fail = results.length - ok;
            selectedDraftIds.clear();
            await loadDrafts();
            await updateDraftsBadge();
            if (fail > 0) toast('Deleted ' + ok + ', ' + fail + ' failed.', 'error');
            else toast('Discarded ' + ok + ' ' + (ok === 1 ? 'draft' : 'drafts') + '.', 'success');
        } catch (err) {
            toast('Bulk delete failed: ' + (err.message || 'unknown'), 'error');
        } finally {
            draftsBulkDeleteBtn.disabled = false;
        }
    });

    // Bulk publish — only drafts with no missing fields are publishable
    const draftsBulkPublishBtn = document.getElementById('draftsBulkPublishBtn');
    if (draftsBulkPublishBtn) draftsBulkPublishBtn.addEventListener('click', async () => {
        if (selectedDraftIds.size === 0) return;
        const idToDraft = new Map(allDraftsCache.map((d) => [d.id, d]));
        const selectedDrafts = [...selectedDraftIds].map((id) => idToDraft.get(id)).filter(Boolean);
        const ready = selectedDrafts.filter((d) => d.item_no && d.description && d.price && d.stock != null);
        const skip = selectedDrafts.length - ready.length;
        if (ready.length === 0) {
            toast('Selected drafts have missing fields. Edit them first.', 'error');
            return;
        }
        const msg = skip > 0
            ? 'Publish ' + ready.length + ' draft' + (ready.length === 1 ? '' : 's') + '? ' + skip + ' will be skipped (missing fields).'
            : 'Publish ' + ready.length + ' draft' + (ready.length === 1 ? '' : 's') + ' to Products?';
        if (!confirm(msg)) return;
        try {
            draftsBulkPublishBtn.disabled = true;
            const results = await Promise.allSettled(ready.map(async (d) => {
                await window.CH.products.upsert({ id: d.id, is_draft: false });
                try {
                    await window.CH.logs.record({
                        product_id: d.id,
                        item_no: d.item_no || null,
                        action: 'created',
                        branch_id: d.branch_id || null,
                        staff_id: session.id,
                        staff_name: session.name,
                        note: 'published from draft (bulk)',
                    });
                } catch (_) {}
            }));
            const ok = results.filter((r) => r.status === 'fulfilled').length;
            const fail = results.length - ok;
            selectedDraftIds.clear();
            await loadDrafts();
            await updateDraftsBadge();
            const parts = ['Published ' + ok];
            if (skip > 0) parts.push(skip + ' skipped');
            if (fail > 0) parts.push(fail + ' failed');
            toast(parts.join(' · ') + '.', fail > 0 ? 'error' : 'success');
        } catch (err) {
            toast('Bulk publish failed: ' + (err.message || 'unknown'), 'error');
        } finally {
            draftsBulkPublishBtn.disabled = false;
        }
    });

    els.draftsBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('[data-draft-edit]');
        if (editBtn) {
            const id = editBtn.dataset.draftEdit;
            // Pull the draft into the product modal, but mark it for publishing on save
            const drafts = await window.CH.drafts.list();
            const d = drafts.find((x) => x.id === id);
            if (!d) return;
            // Reuse the product edit modal — but we'll patch the modal save to also unset is_draft
            // Simplest: open openProductEdit if we treat drafts as products
            // We need to push the draft into the products array first so openProductEdit can find it
            const idx = products.findIndex((p) => p.id === id);
            if (idx === -1) products.push(d);
            openProductEdit(id);
            // When save runs, payload should also include is_draft: false
            els.modal.dataset.draftSource = id;
            return;
        }
        const pubBtn = e.target.closest('[data-draft-publish]');
        if (pubBtn && !pubBtn.hasAttribute('disabled')) {
            const id = pubBtn.dataset.draftPublish;
            if (!confirm('Publish this draft as a live product?')) return;
            try {
                await window.CH.products.upsert({ id, is_draft: false });
                await window.CH.logs.record({
                    product_id: id, action: 'created',
                    staff_id: session.id, staff_name: session.name,
                    note: 'published from draft',
                });
                toast('Draft published.', 'success');
                await loadDrafts();
                await updateDraftsBadge();
            } catch (err) {
                toast('Could not publish: ' + (err.message || 'unknown'), 'error');
            }
            return;
        }
        const delBtn = e.target.closest('[data-draft-del]');
        if (delBtn) {
            const id = delBtn.dataset.draftDel;
            if (!confirm('Discard this draft? This cannot be undone.')) return;
            try {
                await window.CH.products.remove(id);
                await window.CH.logs.record({
                    product_id: id,
                    action: 'deleted',
                    staff_id: session.id,
                    staff_name: session.name,
                    note: 'draft discarded',
                });
                toast('Draft discarded.', 'success');
                await loadDrafts();
                await updateDraftsBadge();
            } catch (err) {
                toast('Could not delete draft: ' + (err.message || 'unknown'), 'error');
            }
        }
    });

    async function updateDraftsBadge() {
        // Drafts visible to: Director and Branch Manager
        const role = currentRole();
        if (role !== 'admin' && role !== 'branch_manager') return;
        try {
            // For Branch Manager, count only their branch's drafts
            let n;
            if (role === 'branch_manager' && session.branch_id) {
                const list = await window.CH.drafts.list(session.branch_id);
                n = list.length;
            } else {
                n = await window.CH.drafts.count();
            }
            if (n > 0) {
                els.navDraftsBadge.textContent = n > 99 ? '99+' : String(n);
                els.navDraftsBadge.hidden = false;
            } else {
                els.navDraftsBadge.hidden = true;
            }
        } catch (_) {}
    }

    /* ============================================================
       LOGS (admin) — audit feed
       ============================================================ */
    let allLogsCache = [];

    function applyLogsFilter() {
        const from = els.logsDateFrom.value ? new Date(els.logsDateFrom.value) : null;
        const to = els.logsDateTo.value ? new Date(els.logsDateTo.value + 'T23:59:59') : null;
        const action = els.logsActionFilter.value;
        return allLogsCache.filter((l) => {
            const t = new Date(l.created_at);
            if (from && t < from) return false;
            if (to && t > to) return false;
            if (action && l.action !== action) return false;
            return true;
        });
    }

    async function loadLogs() {
        try {
            const all = await window.CH.logs.list(500);
            // Branch Manager sees only logs scoped to their branch.
            // Director sees everything.
            const role = currentRole();
            if (role === 'branch_manager' && session.branch_id) {
                allLogsCache = all.filter((l) => l.branch_id === session.branch_id);
            } else {
                allLogsCache = all;
            }
            renderLogs();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                showEmpty(els.logsBody, els.logsEmpty, 'Activity logs not enabled yet', 'Please ask the Director to enable this feature.');
            } else {
                toast('Could not load logs: ' + (err.message || 'unknown error'), 'error');
            }
        }
    }

    function renderLogs() {
        const logs = applyLogsFilter();
        if (logs.length === 0) {
            els.logsBody.innerHTML = '';
            els.logsEmpty.style.display = 'block';
            return;
        }
        els.logsEmpty.style.display = 'none';

            const actionPill = (a) => {
                const colors = {
                    created:  'background:#DCFCE7;color:#166534;border-color:#BBF7D0;',
                    imported: 'background:rgba(56,189,248,0.12);color:#0369A1;border-color:rgba(56,189,248,0.3);',
                    updated:  'background:#FEF3C7;color:#92400E;border-color:#FDE68A;',
                    drafted:  'background:rgba(124,58,237,0.12);color:#7C3AED;border-color:rgba(124,58,237,0.3);',
                    deleted:  'background:#FEE2E2;color:#991B1B;border-color:#FECACA;',
                };
                return `<span class="pill" style="${colors[a] || ''}">${escapeHtml(a)}</span>`;
            };

            els.logsBody.innerHTML = logs.map((l) => {
                const noteSnippet = (l.note || '').slice(0, 90) + ((l.note || '').length > 90 ? '…' : '');
                return `<tr data-log-id="${l.id}" style="cursor:pointer;">
                    <td><div>${new Date(l.created_at).toLocaleDateString()}</div><small style="color:var(--c-ink-5);">${new Date(l.created_at).toLocaleTimeString()}</small></td>
                    <td>${actionPill(l.action)}</td>
                    <td>${l.item_no ? '<span class="itemno">' + escapeHtml(l.item_no) + '</span>' : '<span style="color:var(--c-ink-5);">—</span>'}</td>
                    <td>${escapeHtml(l.branch_name || '—')}</td>
                    <td>${escapeHtml(l.staff_name || '—')}</td>
                    <td><small style="color:var(--c-ink-4);">${escapeHtml(noteSnippet)}</small></td>
                </tr>`;
            }).join('');
    }
    els.logsRefreshBtn.addEventListener('click', loadLogs);

    // Click any log row → open the announcement / log detail modal with full info
    els.logsBody.addEventListener('click', (e) => {
        const row = e.target.closest('[data-log-id]');
        if (!row) return;
        const l = allLogsCache.find((x) => x.id === row.dataset.logId);
        if (!l) return;
        openLogDetail(l);
    });

    function openLogDetail(l) {
        const d = new Date(l.created_at);
        const isAnnouncement = l.action === 'announcement';
        let title = (l.action || 'Activity').replace(/_/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
        let bodyText = l.note || '—';
        // For announcements, parse "[Title] Body" back into nice formatting
        if (isAnnouncement && l.note) {
            const m = l.note.match(/^\[(.+?)\]\s*([\s\S]*)$/);
            if (m) {
                title = 'Announcement: ' + m[1];
                bodyText = m[2] || '(no body)';
            } else {
                title = 'Announcement';
                bodyText = l.note;
            }
        }
        els.notifDetailTitle.textContent = title;
        els.notifDetailBody.textContent = bodyText;
        els.notifDetailIcon.style.background = isAnnouncement
            ? 'linear-gradient(135deg, #7C3AED, #38BDF8)'
            : 'linear-gradient(135deg, var(--c-navy), var(--c-accent))';
        els.notifDetailIcon.innerHTML = isAnnouncement
            ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8v18L3 13z"/><path d="M11 19a2 2 0 1 0 4 0"/></svg>`
            : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`;
        els.notifDetailLabel.textContent = isAnnouncement ? 'Announcement' : 'Activity entry';
        els.notifDetailMeta.innerHTML = `
            <div><b>When</b>${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div><b>Time</b>${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div><b>By</b>${escapeHtml(l.staff_name || '—')}</div>
            ${l.branch_name ? `<div><b>Branch</b>${escapeHtml(l.branch_name)}</div>` : ''}
            ${l.item_no ? `<div><b>Item</b>${escapeHtml(l.item_no)}</div>` : ''}
        `;
        els.notifDetailGo.style.display = 'none';   // no "View in chat" for log entries
        els.notifDetail.classList.add('is-open');
    }
    [els.logsDateFrom, els.logsDateTo, els.logsActionFilter].forEach((el) => el.addEventListener('change', renderLogs));

    // Quick range chips
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.logs-range');
        if (!chip) return;
        $$('.logs-range').forEach((c) => c.classList.toggle('is-active', c === chip));
        const days = chip.dataset.range;
        if (days === 'all') {
            els.logsDateFrom.value = '';
            els.logsDateTo.value = '';
        } else {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - parseInt(days, 10));
            els.logsDateFrom.value = from.toISOString().slice(0, 10);
            els.logsDateTo.value = to.toISOString().slice(0, 10);
        }
        renderLogs();
    });

    els.logsExportPdfBtn.addEventListener('click', async () => {
        if (!window.CH || !window.CH.pdf || !window.CH.pdf.exportLogs) {
            toast('PDF library not ready. Reload and try again.', 'error');
            return;
        }
        try {
            const logs = applyLogsFilter();
            await window.CH.pdf.exportLogs({
                session,
                logs,
                from: els.logsDateFrom.value || null,
                to: els.logsDateTo.value || null,
                action: els.logsActionFilter.value || null,
            });
            toast('Activity log PDF downloaded.', 'success');
        } catch (err) {
            console.error(err);
            toast('Could not export PDF: ' + (err.message || 'unknown'), 'error');
        }
    });

    /* ============================================================
       HELPERS
       ============================================================ */
    function pick(obj, keys) {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== '') return obj[k];
            const found = Object.keys(obj).find((kk) => kk.toLowerCase() === k.toLowerCase());
            if (found && obj[found] !== '') return obj[found];
        }
        return undefined;
    }

    function numOrNull(v) {
        if (v === '' || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    function escapeAttr(s) {
        return String(s ?? '').replace(/"/g, '&quot;');
    }

    function initials(name) {
        return String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'CH';
    }

    function relTime(iso) {
        const d = new Date(iso);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60)   return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd';
        return d.toLocaleDateString();
    }

    function toast(text, kind) {
        els.toast.textContent = text;
        els.toast.className = 'toast is-shown' + (kind ? ' toast--' + kind : '');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { els.toast.classList.remove('is-shown'); }, 3600);
    }

    /* ---------- silent product sync (background) ---------- */
    function setupProductRealtime() {
        if (!window.CH.products || !window.CH.products.subscribe) return;
        let pending = null;
        window.CH.products.subscribe(() => {
            // Debounce — coalesce bursts of changes
            clearTimeout(pending);
            pending = setTimeout(async () => {
                try { await loadProducts(); }
                catch (_) {}
                if (currentView === 'showroom') {
                    try { await loadShowroom(); } catch (_) {}
                }
                if (session.is_admin) {
                    try { await updateDraftsBadge(); } catch (_) {}
                }
            }, 600);
        });
    }

    /* ---------- role-based access control ----------
       Sets body[data-role] so CSS gating activates, and provides a
       guard used by switchView() to block forbidden views server-free.
       Source of truth for allowed views per role: */
    const VIEWS_BY_ROLE = {
        admin:             ['products','showroom','reports','messages','drafts','logs','warehouses','taxonomy','branches','staff','extract','announcements'],
        branch_manager:    ['products','showroom','reports','messages','announcements','drafts','logs'],
        warehouse_manager: ['products','messages','announcements'],
        staff:             ['products','showroom','reports','messages','announcements'],
    };

    function currentRole() {
        if (!session) return 'staff';
        if (session.is_admin) return 'admin';
        const r = session.role;
        if (['staff','branch_manager','warehouse_manager','admin'].includes(r)) return r;
        return 'staff';
    }

    function viewAllowedForRole(view, role) {
        const allowed = VIEWS_BY_ROLE[role] || VIEWS_BY_ROLE.staff;
        return allowed.includes(view);
    }

    function applyRoleVisibility() {
        const role = currentRole();
        document.body.dataset.role = role;
    }

    /* ---------- session_version check (force re-login on role change) */
    async function verifySessionStillValid() {
        try {
            if (!session || !session.id) return;
            // session.session_version is set on verify_login when the latest
            // SQL migration is in place; bail if absent (older session).
            if (typeof session.session_version !== 'number') return;
            if (!window.CH || !window.CH.roles || !window.CH.roles.checkSession) return;
            const ok = await window.CH.roles.checkSession(session.id, session.session_version);
            if (!ok) {
                toast('Your role was changed. Please sign in again.', 'info');
                window.CH.signOut();
                setTimeout(() => window.location.replace('index.html'), 1500);
            }
        } catch (_) { /* silent */ }
    }

    /* ---------- initial load ---------- */
    (async function init() {
        applyRoleVisibility();
        // Refresh taxonomy first so any modal opened during boot has dropdowns ready
        await refreshTaxonomyCache();
        await loadProducts();
        checkStockAlertsLocal();
        await updateUnreadBadge();
        // Drafts badge shows for Director + Branch Manager
        const r = currentRole();
        if (r === 'admin' || r === 'branch_manager') await updateDraftsBadge();
        // Announcement badge shows for everyone EXCEPT Director
        if (r !== 'admin') await updateAnnouncementBadge();
        setupRealtime();
        setupAnnouncementRealtime();
        setupProductRealtime();
        requestNotificationPermissionOnce();
        // Check periodically whether the server has bumped session_version
        verifySessionStillValid();
        setInterval(verifySessionStillValid, 90 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') verifySessionStillValid();
        });
    })();
})();
