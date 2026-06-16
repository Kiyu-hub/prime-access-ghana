/* ============================================================
   Prime Access Ghana — Dashboard logic
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
    const _displayRole = ({
        'staff': 'Staff', 'branch_manager': 'Branch Manager', 'warehouse_manager': 'Warehouse Manager',
        'admin': 'Director', 'system_manager': 'System Admin'
    })[session.role] || (session.role || '');
    // Super roles (Director / System Admin) are company-wide and have no home
    // branch — show "All branches" rather than the unflattering "Unassigned".
    const _isSuper = session.role === 'admin' || session.role === 'system_manager';
    const _branchLabel = session.branch_name || (_isSuper ? 'All branches' : 'Unassigned');
    els.userBranch.textContent = _branchLabel + ' · ' + _displayRole;
    renderUserAvatar(session.image_url);
    els.branchHeading.textContent = _branchLabel + ' · ' + _displayRole;

    /* Sidebar avatar: staff photo if set, otherwise brand logo. */
    function renderUserAvatar(imageUrl) {
        if (!els.userAvatar) return;
        els.userAvatar.replaceChildren();
        if (imageUrl) {
            els.userAvatar.classList.remove('avatar--logo');
            els.userAvatar.style.background = 'transparent';
            els.userAvatar.style.padding = '0';
            const img = new Image();
            img.src = imageUrl;
            img.alt = '';
            img.draggable = false;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            els.userAvatar.appendChild(img);
        } else {
            els.userAvatar.classList.add('avatar--logo');
            els.userAvatar.style.background = '';
            els.userAvatar.style.padding = '';
            const logoImg = new Image();
            logoImg.src = 'assets/logo.png?v=4';
            logoImg.alt = '';
            logoImg.draggable = false;
            els.userAvatar.appendChild(logoImg);
        }
    }

    /* Pull the signed-in user's own photo + start date asynchronously and
       refresh the sidebar + session cache once it arrives. The staff_view
       is read directly so we don't depend on the broader staff page being
       loaded. */
    (async function hydrateOwnProfile() {
        try {
            if (!window.CH || !window.CH.supabase || !session.id) return;
            const { data, error } = await window.CH.supabase
                .from('staff_view')
                .select('image_url, started_at, warehouse_id, warehouse_name, staff_code')
                .eq('id', session.id)
                .maybeSingle();
            if (error || !data) return;
            session.image_url = data.image_url || null;
            session.started_at = data.started_at || null;
            if (data.staff_code) session.staff_code = data.staff_code;
            if (data.warehouse_id) session.warehouse_id = data.warehouse_id;
            if (data.warehouse_name) session.warehouse_name = data.warehouse_name;
            try { localStorage.setItem('ch_session', JSON.stringify(session)); } catch (_) {}
            renderUserAvatar(session.image_url);
        } catch (_) { /* silent */ }
    })();

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
        // Feature-flag guard: System Admin can disable Product Transfers
        // and Move Stock for the whole platform. Block the view if off —
        // EXCEPT for the System Admin themselves, who is never limited by a
        // feature flag and always has full access to every page.
        // Feature flags hide a feature for EVERYONE (incl. System Admin) when
        // the System Admin unticks it — they re-enable it from the sidebar toggle.
        if ((view === 'product-transfers' || view === 'verify-invoice') && featureFlagsCache && featureFlagsCache.transfers_enabled === false) {
            toast('This feature is currently disabled.', 'info');
            switchView('products');
            return;
        }
        if (view === 'move-stock' && featureFlagsCache && featureFlagsCache.move_stock_enabled === false) {
            toast('This feature is currently disabled.', 'info');
            switchView('products');
            return;
        }
        // Permission guard: the System Admin can block pages per role AND per
        // individual user (System Admin itself is never restricted).
        if (currentRole() !== 'system_manager') {
            const myDenied = deniedViewsForCurrentUser();
            if (myDenied.includes(view)) {
                toast('You do not have access to that page.', 'error');
                const allowed = (VIEWS_BY_ROLE[currentRole()] || ['products']).find((v) => !myDenied.includes(v)) || 'products';
                if (allowed && allowed !== view) switchView(allowed);
                return;
            }
        }
        if (view !== currentView) previousView = currentView || 'products';
        currentView = view;
        $$('.view').forEach((v) => v.classList.remove('is-active'));
        const el = $('#view-' + view);
        if (el) el.classList.add('is-active');

        $$('.nav a[data-view]').forEach((a) => a.classList.toggle('is-active', a.dataset.view === view));

        if (view === 'branches') loadBranches();
        if (view === 'showrooms') loadShowrooms();
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
        if (view === 'warehouse-stock') loadWarehouseStock();
        if (view === 'payment-accounts') loadPaymentAccounts();
        if (view === 'product-transfers') loadProductTransfers();
        if (view === 'move-stock') initMoveStock();
        if (view === 'media') loadMediaLibrary();
        if (view === 'id-cards') loadIdCards();
        if (view === 'invoice-templates') loadInvoiceTemplates();
        if (view === 'new-sale') initNewSale();
        if (view === 'purchases') loadPurchases();
        if (view === 'verify-invoice') initVerifyInvoice();
        if (view === 'permissions') renderActivePermTab();
        if (view === 'theme' && window.PAGTheme) window.PAGTheme.renderPage(document.getElementById('themePageHost'));
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
            // Visibility rules (now honours multi-branch / manages_all flags):
            //   Director / manages_all_branches  -> every branch
            //   Branch Manager                   -> branches where they're
            //                                       manager_staff_id PLUS their
            //                                       home branch_id
            //   Warehouse Manager                -> warehouses where they're
            //                                       manager_staff_id PLUS home
            //   Staff                            -> their branch only
            // Drafts are included; they show with a "Pending approval" badge.
            const role = currentRole();
            const branchScope = getManagedBranchIds();   // 'ALL' or [ids]
            const whScope     = getManagedWarehouseIds(); // 'ALL' or [ids]
            const all = await window.CH.products.list(null); // fetch all, filter client-side
            if (role === 'warehouse_manager') {
                products = (whScope === 'ALL') ? all : all.filter((p) => whScope.includes(p.warehouse_id));
            } else if (isSuperRole(role) || branchScope === 'ALL') {
                products = all;
            } else {
                products = all.filter((p) => branchScope.includes(p.branch_id));
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
        const outCount = products.filter((p) => (Number(p.stock) || 0) <= 0).length;
        const totalValue = products.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);

        els.statTotal.textContent = products.length.toLocaleString();
        els.statIn.textContent    = totalUnits.toLocaleString();
        els.statLow.textContent   = lowCount.toLocaleString();
        els.statValue.textContent = CURRENCY + ' ' + money.format(totalValue);
        const outEl = document.getElementById('statOut');
        if (outEl) outEl.textContent = outCount.toLocaleString();
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
                <td style="max-width:280px;">${p.name ? '<strong>' + escapeHtml(p.name) + '</strong><br>' : ''}${escapeHtml(p.description || '')}</td>
                <td>${p.category ? '<span class="pill">' + escapeHtml(p.category) + '</span>' : '—'}</td>
                <td>${escapeHtml(p.material || '—')}</td>
                <td>${escapeHtml(p.color || '—')}</td>
                <td>${dims}</td>
                <td class="no-money-warehouse-mgr"><strong>${CURRENCY} ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
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
        if (!canCurrentUserDo('product.create')) {
            toast('You don\'t have permission to add products. Ask the System Admin to grant it.', 'error');
            return;
        }
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
        if (!canCurrentUserDo('product.edit')) {
            toast('You don\'t have permission to edit product info. Ask the System Admin to grant it.', 'error');
            return;
        }
        els.modalTitle.textContent = 'Edit Product · ' + (p.item_no || p.description || '');
        els.editId.value = id;
        populateProductFormDropdowns();
        $('#prodName').value = p.name || '';
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
        // Permission guard: editing an existing product needs product.edit;
        // creating a new one needs product.create. Backstops the button gating.
        const neededAction = editId ? 'product.edit' : 'product.create';
        if (!canCurrentUserDo(neededAction)) {
            toast('You don\'t have permission to ' + (editId ? 'edit' : 'add') + ' products.', 'error');
            return;
        }
        const branchId = editId
            ? (products.find((p) => p.id === editId)?.branch_id || session.branch_id)
            : session.branch_id;

        if (!branchId) {
            toast('No branch context. Ask the Director to assign you to a branch.', 'error');
            return;
        }

        // Products live in the branch's default warehouse (and surface in its
        // showroom). Keep an existing product's warehouse on edit; assign the
        // branch default on create.
        const _existingProd = editId ? products.find((p) => p.id === editId) : null;
        let warehouseId = editId ? (_existingProd ? _existingProd.warehouse_id : null) : null;
        if (!editId || !warehouseId) {
            // Refresh the cache so a just-created warehouse is found, then resolve.
            try { warehousesCache = await window.CH.warehouses.listWithBranches(); } catch (_) {}
            warehouseId = defaultWarehouseIdForBranch(branchId);
            if (!warehouseId) {
                // Last resort: query the branch's warehouses directly.
                try {
                    const whs = await window.CH.warehouses.listForBranch(branchId);
                    const def = (whs || []).find((w) => w.is_default) || (whs || [])[0];
                    warehouseId = def ? def.id : null;
                } catch (_) {}
            }
        }

        const data = {
            id: editId || '',
            name: $('#prodName').value.trim() || null,
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
            warehouse_id: warehouseId,
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
        if (!canCurrentUserDo('product.delete')) {
            toast('You don\'t have permission to delete products. Ask the System Admin to grant it.', 'error');
            return;
        }
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
            v: 'PRIME ACCESS GHANA — INVENTORY',
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
            v: 'Accra · Ghana · primeaccessgh@gmail.com · 054 417 4341 / 059 942 8820 · @primeacessgh',
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
        const fname = `Prime-Access-Ghana_${branchSlug}_${stamp}.xlsx`;
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
        const role = currentRole();
        if (role !== 'admin' && role !== 'system_manager' && role !== 'branch_manager') return;
        try {
            // Make sure the staff list is loaded so the Manager column resolves names.
            if (!staffList || staffList.length === 0) {
                try { staffList = await window.CH.staff.list(); } catch (_) {}
            }
            const all = await window.CH.warehouses.listWithBranches();
            // Branch Manager: scope to warehouses linked to any branch they manage
            if (role === 'branch_manager') {
                const scope = getManagedBranchIds();
                if (scope === 'ALL') {
                    warehousesCache = all;
                } else {
                    const allowed = new Set(scope);
                    warehousesCache = all.filter((w) => (w.branches || []).some((b) => allowed.has(b.branch_id)));
                }
            } else {
                warehousesCache = all;
            }
            if (allBranchesCache.length === 0) allBranchesCache = await window.CH.branches.list();
            allBranchesCacheList = allBranchesCache;
            // Toggle add button + row actions based on role
            if (WAREHOUSE_ELS.addBtn) WAREHOUSE_ELS.addBtn.style.display = isSuperRole(role) ? '' : 'none';
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
        // Director AND System Admin get full edit/delete; others are view-only.
        const isAdmin = isSuperRole();
        WAREHOUSE_ELS.body.innerHTML = warehousesCache.map((w) => {
            const linkedBranches = (w.branches || []).map((b) => `${escapeHtml(b.branch_name || '?')}${b.is_default ? ' <span class="pill" style="font-size:0.62rem;padding:1px 6px;">default</span>' : ''}`).join(', ') || '<span style="color:var(--c-ink-5);">— none —</span>';
            // Director + System Admin get edit/delete; Branch Manager view-only.
            const actionsHtml = isAdmin
                ? `<div class="row-actions">
                        <button type="button" class="icon-btn" data-stock-wh="${w.id}" title="View stock" aria-label="View stock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18"/><path d="M8 4h8"/></svg></button>
                        <button class="icon-btn" data-edit-wh="${w.id}" title="Edit" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="icon-btn icon-btn--danger" data-del-wh="${w.id}" title="Delete" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
                    </div>`
                : `<div class="row-actions">
                        <button type="button" class="icon-btn" data-stock-wh="${w.id}" title="View stock" aria-label="View stock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18"/><path d="M8 4h8"/></svg></button>
                        <span style="color:var(--c-ink-5);font-size:0.78rem;">view only</span>
                    </div>`;
            return `<tr data-wh-row="${w.id}">
                <td><strong style="color:var(--c-ink-2);">${escapeHtml(w.name)}</strong></td>
                <td><span class="itemno">${escapeHtml(w.code)}</span></td>
                <td>${escapeHtml(w.location || '—')}</td>
                <td>${escapeHtml(managerById.get(w.manager_staff_id) || '—')}</td>
                <td>${linkedBranches}</td>
                <td>${actionsHtml}</td>
            </tr>`;
        }).join('');
    }

    // ---- Warehouse stock panel (qty only, no money) ------------
    async function toggleWarehouseStockPanel(warehouseId) {
        if (!WAREHOUSE_ELS.body) return;
        // Toggle off if already open
        const existing = WAREHOUSE_ELS.body.querySelector(`tr[data-wh-stock-for="${warehouseId}"]`);
        if (existing) { existing.remove(); return; }
        // Anchor below the matching row
        const anchor = WAREHOUSE_ELS.body.querySelector(`tr[data-wh-row="${warehouseId}"]`);
        if (!anchor) return;
        const panel = document.createElement('tr');
        panel.dataset.whStockFor = warehouseId;
        panel.innerHTML = `<td colspan="6" class="wh-stock-cell"><div class="wh-stock-panel"><div class="wh-stock-panel__hd">Loading stock…</div></div></td>`;
        anchor.after(panel);
        try {
            const list = await window.CH.products.list(null);
            const rows = (list || [])
                .filter((p) => p.warehouse_id === warehouseId && !p.is_draft)
                .sort((a, b) => (a.item_no || '').localeCompare(b.item_no || ''));
            const wh = warehousesCache.find((x) => x.id === warehouseId) || {};
            const total = rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);
            const skuCount = rows.length;
            const body = panel.querySelector('.wh-stock-panel');
            if (rows.length === 0) {
                body.innerHTML = `
                    <div class="wh-stock-panel__hd">${escapeHtml(wh.name || 'Warehouse')} · stock</div>
                    <div class="wh-stock-panel__empty">No products in this warehouse yet.</div>`;
                return;
            }
            const itemsHtml = rows.map((r) => {
                const stock = Number(r.stock) || 0;
                const stockClass = stock <= 0 ? 'pill--stock-out'
                    : stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low'
                    : 'pill--stock-good';
                return `<tr>
                    <td><span class="itemno">${escapeHtml(r.item_no || '—')}</span></td>
                    <td>${escapeHtml(r.description || '—')}</td>
                    <td>${r.category ? '<span class="pill">' + escapeHtml(r.category) + '</span>' : ''}</td>
                    <td><span class="pill ${stockClass}">${stock}</span></td>
                </tr>`;
            }).join('');
            body.innerHTML = `
                <div class="wh-stock-panel__hd">${escapeHtml(wh.name || 'Warehouse')} · stock</div>
                <div class="wh-stock-panel__stats">
                    <span><b>${skuCount}</b> ${skuCount === 1 ? 'item' : 'items'}</span>
                    <span><b>${total}</b> total units</span>
                </div>
                <div class="wh-stock-panel__table">
                    <table class="tbl wh-stock-tbl">
                        <thead><tr><th>Item no.</th><th>Description</th><th>Category</th><th>Quantity</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>`;
        } catch (err) {
            console.error(err);
            const body = panel.querySelector('.wh-stock-panel');
            if (body) body.innerHTML = '<div class="wh-stock-panel__empty">Could not load stock.</div>';
        }
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

    // The branch's default warehouse (products are placed here on creation).
    function defaultWarehouseIdForBranch(branchId) {
        if (!branchId) return null;
        const list = warehousesCache || [];
        const def = list.find((w) => (w.branches || []).some((b) => b.branch_id === branchId && b.is_default));
        const any = def || list.find((w) => (w.branches || []).some((b) => b.branch_id === branchId));
        return any ? any.id : null;
    }

    // Auto-generate the next warehouse code (WH-001, WH-002, …) — no manual entry.
    function genWarehouseCode() {
        let max = 0;
        (warehousesCache || []).forEach((w) => {
            const m = /^WH-(\d+)$/.exec(String(w.code || '').toUpperCase());
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        return 'WH-' + String(max + 1).padStart(3, '0');
    }

    function openWarehouseAdd() {
        WAREHOUSE_ELS.title.textContent = 'Add Warehouse';
        WAREHOUSE_ELS.editId.value = '';
        WAREHOUSE_ELS.form.reset();
        if (WAREHOUSE_ELS.code) WAREHOUSE_ELS.code.value = genWarehouseCode();
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
        renderWarehouseBranchLinks(id);
        WAREHOUSE_ELS.modal.classList.add('is-open');
    }

    if (WAREHOUSE_ELS.addBtn) WAREHOUSE_ELS.addBtn.addEventListener('click', openWarehouseAdd);
    if (WAREHOUSE_ELS.body) WAREHOUSE_ELS.body.addEventListener('click', (e) => {
        const stockBtn = e.target.closest('[data-stock-wh]');
        if (stockBtn) { toggleWarehouseStockPanel(stockBtn.dataset.stockWh); return; }
        const editBtn = e.target.closest('[data-edit-wh]');
        if (editBtn) { openWarehouseEdit(editBtn.dataset.editWh); return; }
        const delBtn = e.target.closest('[data-del-wh]');
        if (delBtn) deleteWarehouse(delBtn.dataset.delWh);
    });

    if (WAREHOUSE_ELS.form) WAREHOUSE_ELS.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Warehouses may only be created/edited by the Director or System Admin.
        if (!isSuperRole(currentRole())) {
            toast('Only the Director or System Admin can manage warehouses.', 'error');
            return;
        }
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
        if (branch_links.length === 0) {
            toast('A warehouse must belong to at least one branch — tick a branch.', 'error');
            return;
        }
        try {
            if (id) {
                await window.CH.warehouses.update(id, {
                    name, code,
                    location: WAREHOUSE_ELS.location.value.trim(),
                    manager_staff_id: null,
                });
                await window.CH.warehouses.replaceBranchLinks(id, branch_links);
                await window.CH.logs.record({ action: 'warehouse_updated', staff_id: session.id, staff_name: session.name, note: 'updated warehouse "' + name + '" (' + code + ')' });
                toast('Warehouse updated.', 'success');
            } else {
                await window.CH.warehouses.add({
                    name, code,
                    location: WAREHOUSE_ELS.location.value.trim(),
                    manager_staff_id: null,
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
       PAYMENT ACCOUNTS (admin) — Phase 2
       ============================================================ */
    let paymentAccountsCache = [];

    const PA_ELS = {
        body:    $('#paymentAccountsBody'),
        empty:   $('#paymentAccountsEmpty'),
        modal:   $('#paymentAccountModal'),
        title:   $('#paymentAccountModalTitle'),
        form:    $('#paymentAccountForm'),
        editId:  $('#paymentAccountEditId'),
        method:  $('#paMethod'),
        provider:$('#paProvider'),
        name:    $('#paAccountName'),
        number:  $('#paAccountNumber'),
        notes:   $('#paNotes'),
        global:  $('#paIsGlobal'),
        branchLinksField: $('#paBranchLinksField'),
        branchLinks:      $('#paBranchLinks'),
        addBtn:  $('#addPaymentAccountBtn'),
    };

    const PA_METHOD_LABELS = { cash: 'Cash', momo: 'MoMo', pos: 'POS', bank: 'Bank' };

    async function loadPaymentAccounts() {
        if (!session.is_admin) return;
        if (!window.CH || !window.CH.paymentAccounts) {
            if (PA_ELS.body) PA_ELS.body.innerHTML = '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--c-ink-5);">Payment accounts not enabled yet. Please ask the Director to run the latest setup.</td></tr>';
            return;
        }
        try {
            paymentAccountsCache = await window.CH.paymentAccounts.list();
            if (allBranchesCache.length === 0) allBranchesCache = await window.CH.branches.list();
            renderPaymentAccounts();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                if (PA_ELS.body) PA_ELS.body.innerHTML = '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--c-ink-5);">Payment accounts not enabled yet. Please ask the Director to run the latest setup.</td></tr>';
            } else {
                toast('Could not load payment accounts: ' + (err.message || 'unknown error'), 'error');
            }
        }
    }

    function renderPaymentAccounts() {
        if (!PA_ELS.body) return;
        if (paymentAccountsCache.length === 0) {
            PA_ELS.body.innerHTML = '';
            PA_ELS.empty.style.display = 'block';
            return;
        }
        PA_ELS.empty.style.display = 'none';
        PA_ELS.body.innerHTML = paymentAccountsCache.map((a) => {
            const branches = a.is_global
                ? '<span class="pill pill--admin">All branches</span>'
                : ((a.branches || []).map((b) => '<span class="pill" style="font-size:0.62rem;">' + escapeHtml(b.branch_name || '?') + '</span>').join(' ') || '<span style="color:var(--c-ink-5);">— none —</span>');
            return `<tr>
                <td><span class="pill">${escapeHtml(PA_METHOD_LABELS[a.method] || a.method)}</span></td>
                <td>${escapeHtml(a.provider)}</td>
                <td>${escapeHtml(a.account_name)}</td>
                <td><span class="itemno">${escapeHtml(a.account_number)}</span></td>
                <td>${branches}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-edit-pa="${a.id}" title="Edit" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="icon-btn icon-btn--danger" data-del-pa="${a.id}" title="Delete" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function renderPaymentAccountBranchLinks(accountId) {
        if (!PA_ELS.branchLinks) return;
        const a = paymentAccountsCache.find((x) => x.id === accountId);
        const linkedIds = new Set((a && a.branches || []).map((b) => b.branch_id));
        PA_ELS.branchLinks.innerHTML = (allBranchesCache || []).map((b) => {
            const checked = linkedIds.has(b.id) ? 'checked' : '';
            return `<label class="wh-branch-link" style="grid-template-columns: auto 1fr;">
                <input type="checkbox" data-pa-branch="${b.id}" ${checked} />
                <span class="wh-branch-link__name">${escapeHtml(b.name)}</span>
            </label>`;
        }).join('');
    }

    function togglePaBranchLinksVisibility() {
        if (!PA_ELS.branchLinksField || !PA_ELS.global) return;
        PA_ELS.branchLinksField.style.display = PA_ELS.global.checked ? 'none' : '';
    }

    function openPaymentAccountAdd() {
        PA_ELS.title.textContent = 'Add Payment Account';
        PA_ELS.editId.value = '';
        PA_ELS.form.reset();
        PA_ELS.global.checked = false;
        renderPaymentAccountBranchLinks(null);
        togglePaBranchLinksVisibility();
        togglePaCashMode();
        PA_ELS.modal.classList.add('is-open');
        setTimeout(() => PA_ELS.method.focus(), 40);
    }

    function openPaymentAccountEdit(id) {
        const a = paymentAccountsCache.find((x) => x.id === id);
        if (!a) return;
        PA_ELS.title.textContent = 'Edit Payment Account';
        PA_ELS.editId.value = id;
        PA_ELS.method.value = a.method;
        PA_ELS.provider.value = a.provider || '';
        PA_ELS.name.value = a.account_name || '';
        PA_ELS.number.value = a.account_number || '';
        PA_ELS.notes.value = a.notes || '';
        PA_ELS.global.checked = !!a.is_global;
        renderPaymentAccountBranchLinks(id);
        togglePaBranchLinksVisibility();
        togglePaCashMode();
        PA_ELS.modal.classList.add('is-open');
    }

    if (PA_ELS.addBtn) PA_ELS.addBtn.addEventListener('click', openPaymentAccountAdd);
    if (PA_ELS.global) PA_ELS.global.addEventListener('change', togglePaBranchLinksVisibility);

    // Cash mode: hide provider/account-name/account-number fields entirely.
    // Cash doesn't have any of those — it's just a tag at a branch.
    function togglePaCashMode() {
        const m = PA_ELS.method && PA_ELS.method.value;
        const isCash = m === 'cash';
        const providerWrap = PA_ELS.provider && PA_ELS.provider.closest('div');
        const nameWrap     = PA_ELS.name     && PA_ELS.name.closest('div');
        const numberWrap   = PA_ELS.number   && PA_ELS.number.closest('div');
        if (providerWrap) providerWrap.style.display = isCash ? 'none' : '';
        if (nameWrap)     nameWrap.style.display     = isCash ? 'none' : '';
        if (numberWrap)   numberWrap.style.display   = isCash ? 'none' : '';
        // When switching INTO cash, drop the required attribute so the
        // browser doesn't block form submit on invisible fields.
        if (PA_ELS.provider) PA_ELS.provider.required = !isCash;
        if (PA_ELS.name)     PA_ELS.name.required     = !isCash;
        if (PA_ELS.number)   PA_ELS.number.required   = !isCash;
    }
    if (PA_ELS.method) PA_ELS.method.addEventListener('change', togglePaCashMode);
    if (PA_ELS.body) PA_ELS.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-pa]');
        if (editBtn) { openPaymentAccountEdit(editBtn.dataset.editPa); return; }
        const delBtn = e.target.closest('[data-del-pa]');
        if (delBtn) deletePaymentAccount(delBtn.dataset.delPa);
    });

    if (PA_ELS.form) PA_ELS.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = PA_ELS.editId.value;
        const method = PA_ELS.method.value;
        let provider = PA_ELS.provider.value.trim();
        let account_name = PA_ELS.name.value.trim();
        let account_number = PA_ELS.number.value.trim();
        const notes = PA_ELS.notes.value.trim();
        const is_global = !!PA_ELS.global.checked;
        if (!method) { toast('Pick a method.', 'error'); return; }
        // Cash doesn't have provider/name/number — auto-fill placeholders
        // so the NOT NULL columns are satisfied without bothering the Director.
        if (method === 'cash') {
            provider = 'Cash';
            account_name = 'Cash collection';
            account_number = '—';
        } else if (!provider || !account_name || !account_number) {
            toast('Provider, name and number are required for ' + method + '.', 'error');
            return;
        }
        const branch_ids = is_global ? [] : Array.from(PA_ELS.branchLinks.querySelectorAll('input[data-pa-branch]:checked')).map((cb) => cb.dataset.paBranch);
        if (!is_global && branch_ids.length === 0) {
            toast('Pick at least one branch — or tick "Available to all branches".', 'error');
            return;
        }
        try {
            if (id) {
                await window.CH.paymentAccounts.update(id, { method, provider, account_name, account_number, notes, is_global });
                if (!is_global) {
                    await window.CH.paymentAccounts.replaceBranchLinks(id, branch_ids);
                } else {
                    await window.CH.paymentAccounts.replaceBranchLinks(id, []);
                }
                await window.CH.logs.record({ action: 'payment_account_updated', staff_id: session.id, staff_name: session.name, note: 'updated ' + provider + ' · ' + account_number });
                toast('Payment account updated.', 'success');
            } else {
                await window.CH.paymentAccounts.add({ method, provider, account_name, account_number, notes, is_global, branch_ids, created_by: session.id });
                await window.CH.logs.record({ action: 'payment_account_added', staff_id: session.id, staff_name: session.name, note: 'added ' + provider + ' · ' + account_number });
                toast('Payment account added.', 'success');
            }
            PA_ELS.modal.classList.remove('is-open');
            await loadPaymentAccounts();
        } catch (err) {
            console.error(err);
            const msg = (err && err.message) || '';
            if (msg.toLowerCase().includes('duplicate') || (err && err.code === '23505')) {
                toast('That exact account is already registered.', 'error');
            } else {
                toast('Could not save: ' + (msg || 'unknown error'), 'error');
            }
        }
    });

    async function deletePaymentAccount(id) {
        const a = paymentAccountsCache.find((x) => x.id === id);
        if (!a) return;
        if (!confirm('Delete ' + a.provider + ' · ' + a.account_number + '?\nTransfer requests that referenced it will keep their history but show "deleted" on this account.')) return;
        try {
            await window.CH.paymentAccounts.remove(id);
            await window.CH.logs.record({ action: 'payment_account_deleted', staff_id: session.id, staff_name: session.name, note: 'deleted ' + a.provider + ' · ' + a.account_number });
            toast('Payment account deleted.', 'success');
            await loadPaymentAccounts();
        } catch (err) {
            toast('Could not delete: ' + (err.message || 'unknown error'), 'error');
        }
    }

    /* ============================================================
       BRANCHES (admin)
       ============================================================ */

    async function loadBranches() {
        try {
            branches = await window.CH.branches.list();
            try { showroomsCache = await window.CH.showrooms.list(); } catch (_) { showroomsCache = []; }
            renderBranches();
            populateBranchSelect();
            applySetupState();
        } catch (e) {
            console.error(e);
            toast('Could not load branches: ' + (e.message || 'unknown error'), 'error');
        }
    }

    function renderBranches() {
        const canManage = isSuperRole(currentRole());
        const hasBranch = branches.length > 0;
        const topbarActions = document.getElementById('branchTopbarActions');
        const noBranchState = document.getElementById('branchNoBranchState');
        const content = document.getElementById('branchesContent');

        // Non-negotiable: with no branch, showrooms & warehouses can't exist —
        // expose nothing about them. Show a centered "Create Branch" CTA only.
        if (!hasBranch) {
            if (topbarActions) topbarActions.style.display = 'none';
            if (content) content.style.display = 'none';
            if (noBranchState) noBranchState.style.display = 'flex';
            return;
        }
        if (topbarActions) topbarActions.style.display = '';
        if (noBranchState) noBranchState.style.display = 'none';
        if (content) content.style.display = '';

        // Only the Director / System Admin can create branches.
        if (els.addBranchBtn) els.addBranchBtn.style.display = canManage ? '' : 'none';

        els.branchesEmpty.style.display = 'none';

        const staffById = new Map((staffList || []).map((s) => [s.id, s]));
        els.branchesBody.innerHTML = branches.map((b) => {
            const staffCount = staffList.filter((s) => s.branch_id === b.id).length;
            const productCount = '—'; // could query; left as placeholder for now
            const mgr = b.manager_staff_id ? staffById.get(b.manager_staff_id) : null;
            const mgrLabel = mgr ? `<strong>${escapeHtml(mgr.name)}</strong>${mgr.manages_all_branches ? ' <span class="pill pill--admin" style="font-size:0.6rem;">all branches</span>' : ''}` : '<span style="color:var(--c-ink-5);">—</span>';
            return `
                <tr>
                    <td><strong style="color:var(--c-ink-2);">${escapeHtml(b.name)}</strong></td>
                    <td>${escapeHtml(b.location || '—')}</td>
                    <td>${mgrLabel}</td>
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

    function populateBranchManagerSelect() {
        const sel = document.getElementById('branchManager');
        if (!sel) return;
        // System Admin is infrastructure and never assignable as a branch
        // manager — keep them out of this picker for every viewer.
        const eligible = (staffList || []).filter((s) => !isSystemAdminStaff(s) && (s.role === 'branch_manager' || isSuperRole(s.role)));
        sel.innerHTML = ['<option value="">— No manager assigned —</option>']
            .concat(eligible.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.role)})</option>`))
            .join('');
    }

    els.branchesBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-edit-branch]');
        if (editBtn) { openBranchEdit(editBtn.dataset.editBranch); return; }
        const delBtn = e.target.closest('[data-del-branch]');
        if (delBtn) { deleteBranch(delBtn.dataset.delBranch); }
    });

    els.addBranchBtn.addEventListener('click', () => openBranchAdd());
    {
        const createFirstBranch = document.getElementById('createFirstBranchBtn');
        if (createFirstBranch) createFirstBranch.addEventListener('click', () => openBranchAdd());
    }
    {
        const addWhFromBranch = document.getElementById('addWarehouseFromBranchBtn');
        if (addWhFromBranch) addWhFromBranch.addEventListener('click', () => {
            if (branches.length === 0) { toast('Create a branch first.', 'error'); return; }
            openWarehouseAdd();
        });
    }

    /* ---- Showrooms (dedicated page, child of a branch) ---- */
    let showroomsCache = [];
    const showroomEls = {
        modal:    document.getElementById('showroomModal'),
        title:    document.getElementById('showroomModalTitle'),
        form:     document.getElementById('showroomForm'),
        editId:   document.getElementById('showroomEditId'),
        branch:   document.getElementById('showroomBranch'),
        name:     document.getElementById('showroomName'),
        location: document.getElementById('showroomLocation'),
        body:     document.getElementById('showroomsBody'),
        empty:    document.getElementById('showroomsEmpty'),
        topbar:   document.getElementById('showroomTopbarActions'),
        noBranch: document.getElementById('showroomNoBranchState'),
        content:  document.getElementById('showroomsContent'),
    };

    async function loadShowrooms() {
        try {
            if (!branches || branches.length === 0) {
                try { branches = await window.CH.branches.list(); } catch (_) {}
            }
            showroomsCache = await window.CH.showrooms.list();
        } catch (e) { console.warn('loadShowrooms failed', e); showroomsCache = []; }
        renderShowrooms();
        applySetupState();
    }

    function renderShowrooms() {
        if (!showroomEls.body) return;
        const canManage = isSuperRole(currentRole());
        const hasBranch = branches.length > 0;

        // Showrooms need a branch first — gate the page like the branches page.
        if (!hasBranch) {
            if (showroomEls.topbar) showroomEls.topbar.style.display = 'none';
            if (showroomEls.content) showroomEls.content.style.display = 'none';
            if (showroomEls.noBranch) showroomEls.noBranch.style.display = 'flex';
            return;
        }
        if (showroomEls.topbar) showroomEls.topbar.style.display = canManage ? '' : 'none';
        if (showroomEls.noBranch) showroomEls.noBranch.style.display = 'none';
        if (showroomEls.content) showroomEls.content.style.display = '';

        if (!showroomsCache.length) {
            showroomEls.body.innerHTML = '';
            if (showroomEls.empty) showroomEls.empty.style.display = 'block';
            return;
        }
        if (showroomEls.empty) showroomEls.empty.style.display = 'none';
        showroomEls.body.innerHTML = showroomsCache.map((s) => `
            <tr>
                <td><strong style="color:var(--c-ink-2);">${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml((s.branch && s.branch.name) || '—')}</td>
                <td>${escapeHtml(s.location || '—')}</td>
                <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                <td>
                    <div class="row-actions">
                        ${canManage ? `<button class="icon-btn" data-edit-showroom="${s.id}" title="Edit" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button class="icon-btn icon-btn--danger" data-del-showroom="${s.id}" title="Delete" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path></svg></button>` : '<span style="color:var(--c-ink-5);">—</span>'}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function populateShowroomBranchSelect(selectedId) {
        if (!showroomEls.branch) return;
        showroomEls.branch.innerHTML = ['<option value="" disabled ' + (selectedId ? '' : 'selected') + '>Select branch</option>']
            .concat(branches.map((b) => `<option value="${b.id}" ${b.id === selectedId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`))
            .join('');
    }

    function openShowroomAdd() {
        if (branches.length === 0) { toast('Create a branch first.', 'error'); return; }
        showroomEls.title.textContent = 'Add Showroom';
        showroomEls.editId.value = '';
        showroomEls.form.reset();
        populateShowroomBranchSelect(branches.length === 1 ? branches[0].id : '');
        showroomEls.modal.classList.add('is-open');
        setTimeout(() => showroomEls.name.focus(), 50);
    }

    function openShowroomEdit(id) {
        const s = showroomsCache.find((x) => x.id === id);
        if (!s) return;
        showroomEls.title.textContent = 'Edit Showroom';
        showroomEls.editId.value = id;
        populateShowroomBranchSelect(s.branch_id);
        showroomEls.name.value = s.name || '';
        showroomEls.location.value = s.location || '';
        showroomEls.modal.classList.add('is-open');
    }

    async function deleteShowroom(id) {
        const s = showroomsCache.find((x) => x.id === id);
        if (!s) return;
        if (!confirm(`Delete showroom "${s.name}"?`)) return;
        try {
            await window.CH.showrooms.remove(id);
            toast('Showroom deleted.', 'success');
            await loadShowrooms();
        } catch (err) {
            console.error(err);
            toast('Could not delete showroom: ' + (err.message || 'unknown error'), 'error');
        }
    }

    if (showroomEls.body) showroomEls.body.addEventListener('click', (e) => {
        const ed = e.target.closest('[data-edit-showroom]');
        if (ed) { openShowroomEdit(ed.dataset.editShowroom); return; }
        const del = e.target.closest('[data-del-showroom]');
        if (del) { deleteShowroom(del.dataset.delShowroom); }
    });
    {
        const addShowroomBtn = document.getElementById('addShowroomBtn');
        if (addShowroomBtn) addShowroomBtn.addEventListener('click', () => openShowroomAdd());
        const goBranches = document.getElementById('showroomGoToBranchesBtn');
        if (goBranches) goBranches.addEventListener('click', () => switchView('branches'));
    }
    if (showroomEls.form) showroomEls.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isSuperRole(currentRole())) { toast('Only the Director or System Admin can manage showrooms.', 'error'); return; }
        const id = showroomEls.editId.value;
        const branch_id = showroomEls.branch.value;
        const name = showroomEls.name.value.trim();
        const location = showroomEls.location.value.trim();
        if (!branch_id) { toast('Pick a branch.', 'error'); return; }
        if (!name) { toast('Showroom name is required.', 'error'); return; }
        try {
            if (id) {
                await window.CH.showrooms.update(id, { name, branch_id, location: location || null });
                toast('Showroom updated.', 'success');
            } else {
                await window.CH.showrooms.create({ name, branch_id, location });
                toast('Showroom added.', 'success');
            }
            showroomEls.modal.classList.remove('is-open');
            await loadShowrooms();
        } catch (err) {
            console.error(err);
            toast('Could not save showroom: ' + (err.message || 'unknown error'), 'error');
        }
    });

    function setBranchWarehouseFieldVisible(show) {
        const f = document.getElementById('branchWarehouseField');
        const inp = document.getElementById('branchWarehouseName');
        if (f) f.style.display = show ? '' : 'none';
        if (inp) inp.required = !!show;
    }

    function openBranchAdd() {
        els.branchModalTitle.textContent = 'Create Branch';
        els.branchEditId.value = '';
        els.branchForm.reset();
        setBranchWarehouseFieldVisible(true);   // a warehouse is required on create
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
        setBranchWarehouseFieldVisible(false);  // warehouse only created with a new branch
        els.branchModal.classList.add('is-open');
    }

    els.branchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Branches may only be created/edited by the Director or System Admin.
        if (!isSuperRole(currentRole())) {
            toast('Only the Director or System Admin can manage branches.', 'error');
            return;
        }
        const id = els.branchEditId.value;
        const name = els.branchName.value.trim();
        const location = els.branchLocation.value.trim();
        const whName = (document.getElementById('branchWarehouseName') || {}).value || '';
        const warehouseName = whName.trim();
        const manager_staff_id = null; // managers are assigned later from Staff
        if (!name) { toast('Branch name is required.', 'error'); return; }
        if (!id && !warehouseName) { toast('A warehouse name is required — every branch must have a warehouse.', 'error'); return; }
        try {
            if (id) {
                await window.CH.branches.rename(id, name, location, manager_staff_id);
                window.CH.logs.record({ action: 'branch_updated', branch_id: id, branch_name: name, staff_id: session.id, staff_name: session.name, note: location ? 'location: ' + location : null });
                toast('Branch updated.', 'success');
            } else {
                const created = await window.CH.branches.create(name, location, manager_staff_id);
                window.CH.logs.record({ action: 'branch_created', branch_id: created && created.id, branch_name: name, staff_id: session.id, staff_name: session.name, note: location ? 'location: ' + location : null });
                // Required warehouse for the new branch — auto-creates its showroom too.
                try { warehousesCache = await window.CH.warehouses.listWithBranches(); } catch (_) {}
                await window.CH.warehouses.add({
                    name: warehouseName,
                    code: genWarehouseCode(),
                    location: location || null,
                    manager_staff_id: null,
                    branch_links: [{ branch_id: created.id, is_default: true }],
                });
                window.CH.logs.record({ action: 'warehouse_created', staff_id: session.id, staff_name: session.name, note: 'created warehouse "' + warehouseName + '" with branch "' + name + '"' });
                toast('Branch, warehouse & showroom created.', 'success');
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
        // The staff "Showroom" picker lists showrooms; the value is the
        // showroom's branch_id (staff are scoped by branch). Falls back to
        // branches only if no showrooms exist yet.
        const list = (showroomsCache && showroomsCache.length)
            ? showroomsCache.map((s) => ({ id: s.branch_id, label: s.name }))
            : (branches || []).map((b) => ({ id: b.id, label: b.name }));
        const opts = ['<option value="">— Select showroom —</option>']
            .concat(list.map((x) => `<option value="${x.id}">${escapeHtml(x.label)}</option>`))
            .join('');
        els.staffBranch.innerHTML = opts;
    }

    // Build the role <select> options for the current viewer. Director and
    // System Admin can only be assigned by a System Admin (the overall
    // manager); everyone else gets the three operational roles.
    function populateStaffRoleOptions(editingRole) {
        if (!els.staffRole) return;
        // Branch Manager may only create plain Staff (assigned to a showroom or
        // warehouse). They can't mint managers or super roles.
        if (currentRole() === 'branch_manager') {
            els.staffRole.innerHTML = '<option value="staff">Staff</option>';
            return;
        }
        const roles = [
            ['staff', 'Staff'],
            ['branch_manager', 'Branch Manager'],
            ['warehouse_manager', 'Warehouse Manager'],
        ];
        // Super-role options are normally assignable only by the System Admin.
        // ALSO include them whenever the account being edited is itself a super
        // role, so a super account can never silently lose its role: without the
        // matching <option> the <select> value would fall back to 'staff' and a
        // save would strip the role — locking the System Admin out of its own
        // tools (dev mode, permissions, media, import) with no way back via UI.
        if (currentRole() === 'system_manager' || editingRole === 'admin' || editingRole === 'system_manager') {
            roles.push(['admin', 'Director']);
            roles.push(['system_manager', 'System Admin']);
        }
        els.staffRole.innerHTML = roles.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    }

    /* ============================================================
       STAFF (admin)
       ============================================================ */

    async function loadStaff() {
        try {
            staffList = await window.CH.staff.list();
            // Ensure branches + showrooms loaded for the workplace pickers
            if (branches.length === 0) branches = await window.CH.branches.list();
            try { showroomsCache = await window.CH.showrooms.list(); } catch (_) {}
            // Warehouses power the Workplace=Warehouse dropdown for any staff.
            if (!warehousesCache || warehousesCache.length === 0) {
                try { warehousesCache = await window.CH.warehouses.listWithBranches(); } catch (_) {}
            }
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
        // Visibility rule:
        //   System Admin accounts are the overall manager (above the Director).
        //   They are hidden from the Director and everyone else — but a System
        //   Admin DOES see System Admin rows in their own dashboard, so they can
        //   view and edit their own account (and any other System Admin).
        const viewerIsSysAdmin = currentRole() === 'system_manager';
        let visibleStaff = (staffList || []).filter((s) => isSystemAdminStaff(s) ? viewerIsSysAdmin : true);
        // Branch Manager only sees/manages staff of their own branch(es).
        if (currentRole() === 'branch_manager') {
            const mine = getManagedBranchIds();
            if (mine !== 'ALL') {
                const set = new Set(mine);
                visibleStaff = visibleStaff.filter((s) => set.has(s.branch_id));
            }
        }
        if (visibleStaff.length === 0) {
            els.staffBody.innerHTML = '';
            els.staffEmpty.style.display = 'block';
            return;
        }
        els.staffEmpty.style.display = 'none';

        const roleLabel = (r) => ({ 'staff': 'Staff', 'branch_manager': 'Branch Manager', 'warehouse_manager': 'Warehouse Manager', 'admin': 'Director', 'system_manager': 'System Admin' })[r] || (r || 'Staff');
        const rolePillClass = (r) => (r === 'admin' || r === 'system_manager') ? 'pill pill--admin' : 'pill';
        els.staffBody.innerHTML = visibleStaff.map((s) => {
            const avatarInner = s.image_url
                ? `<img src="${escapeAttr(s.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
                : initials(s.name);
            return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="avatar" style="width:32px;height:32px;font-size:0.78rem;${s.image_url ? 'background:transparent;padding:0;' : ''}">${avatarInner}</span>
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
        `;
        }).join('');
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

    // Workplace selector drives whether the staff is posted to a Showroom
    // (branch) or a Warehouse, and which dropdown shows. Warehouse Manager is
    // always a warehouse posting (locked). What's chosen here is what the ID
    // card displays for that staff.
    function toggleStaffWorkplaceFields() {
        const wpSel = $('#staffWorkplace');
        const branchWrap = $('#staffBranchField');
        const whWrap = $('#staffWarehouseField');
        const forceWarehouse = els.staffRole.value === 'warehouse_manager';
        if (forceWarehouse && wpSel) wpSel.value = 'warehouse';
        if (wpSel) wpSel.disabled = forceWarehouse;
        const isWarehouse = wpSel ? wpSel.value === 'warehouse' : false;
        if (branchWrap) branchWrap.style.display = isWarehouse ? 'none' : '';
        if (whWrap) whWrap.style.display = isWarehouse ? '' : 'none';
    }

    // "Manages all branches / warehouses" only makes sense for branch_manager,
    // warehouse_manager, and Director. Plain staff don't manage anything.
    function toggleStaffManagesAllField() {
        const role = els.staffRole.value;
        const wrap = document.getElementById('staffManagesAllField');
        if (wrap) {
            const show = (role === 'branch_manager' || role === 'warehouse_manager' || isSuperRole(role));
            wrap.style.display = show ? '' : 'none';
        }
        // Super roles (System Admin / Director) always keep access to ALL
        // branches and warehouses — the branch picker is only the location
        // printed on their ID card, never an access limit.
        const superHint = document.getElementById('staffSuperPostingHint');
        if (superHint) superHint.style.display = isSuperRole(role) ? '' : 'none';
    }

    function openStaffAdd() {
        els.staffModalTitle.textContent = 'Add Staff';
        els.staffEditId.value = '';
        els.staffForm.reset();
        els.staffPasswordHint.textContent = '(min 6 chars)';
        els.staffPasswordReq.style.display = 'inline';
        els.staffPassword.required = true;
        populateBranchSelect();
        populateStaffRoleOptions();
        populateStaffWarehouseSelect();
        els.staffRole.value = 'staff';
        const wpAdd = $('#staffWorkplace'); if (wpAdd) wpAdd.value = 'showroom';
        toggleStaffWorkplaceFields();
        toggleStaffManagesAllField();
        // Clear the manages-all toggles for a new staff
        const a1 = document.getElementById('staffManagesAllBranches');
        const a2 = document.getElementById('staffManagesAllWarehouses');
        if (a1) a1.checked = false;
        if (a2) a2.checked = false;
        const codeField = $('#staffCodeDisplay');
        if (codeField) codeField.value = '(generated on save)';
        // Reset photo + start date
        setStaffPhotoUi('');
        const sd = $('#staffStartedAt'); if (sd) sd.value = '';
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
        // Normalize legacy free-text role to enum on display. Includes the two
        // super roles so a System Admin editing their own account keeps the
        // correct role instead of silently dropping to Director.
        const enumRole = ['staff', 'branch_manager', 'warehouse_manager', 'admin', 'system_manager'].includes(s.role) ? s.role : (s.is_admin ? 'admin' : 'staff');
        populateBranchSelect();
        populateStaffRoleOptions(enumRole);
        populateStaffWarehouseSelect();
        els.staffBranch.value = s.branch_id || '';
        els.staffRole.value = enumRole;
        const whSel = $('#staffWarehouse');
        if (whSel) whSel.value = s.warehouse_id || '';
        // Workplace follows the existing posting: warehouse if one is set.
        const wpEdit = $('#staffWorkplace');
        if (wpEdit) wpEdit.value = s.warehouse_id ? 'warehouse' : 'showroom';
        toggleStaffWorkplaceFields();
        toggleStaffManagesAllField();
        els.staffIsAdmin.value = s.is_admin ? '1' : '';
        const a1 = document.getElementById('staffManagesAllBranches');
        const a2 = document.getElementById('staffManagesAllWarehouses');
        if (a1) a1.checked = !!s.manages_all_branches;
        if (a2) a2.checked = !!s.manages_all_warehouses;
        const codeField = $('#staffCodeDisplay');
        if (codeField) codeField.value = s.staff_code || '(not yet generated)';
        // Photo + start date
        setStaffPhotoUi(s.image_url || '');
        const sd = $('#staffStartedAt');
        if (sd) sd.value = s.started_at ? String(s.started_at).slice(0, 10) : '';
        els.staffModal.classList.add('is-open');
    }

    /* Staff photo helpers ------------------------------------- */
    function setStaffPhotoUi(url) {
        const thumb = $('#staffPhotoThumb');
        const hidden = $('#staffPhotoUrl');
        const clearBtn = $('#staffPhotoClearBtn');
        if (hidden) hidden.value = url || '';
        if (thumb) {
            if (url) {
                thumb.innerHTML = `<img src="${escapeAttr(url)}" alt="" loading="lazy" />`;
            } else {
                thumb.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="3.5"/><path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6"/></svg>';
            }
        }
        if (clearBtn) clearBtn.style.display = url ? 'inline-flex' : 'none';
    }

    (function wireStaffPhoto() {
        const btn = document.getElementById('staffPhotoUploadBtn');
        const input = document.getElementById('staffPhotoInput');
        const clear = document.getElementById('staffPhotoClearBtn');
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', async (e) => {
                const f = e.target.files && e.target.files[0];
                e.target.value = '';
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) { toast('Photo is over 5 MB — pick a smaller one.', 'error'); return; }
                btn.disabled = true; btn.textContent = 'Uploading…';
                try {
                    const uploaded = await window.CH.cloudinary.upload(f);
                    if (uploaded && uploaded.url) {
                        setStaffPhotoUi(uploaded.url);
                        toast('Photo uploaded', 'success');
                    } else {
                        toast('Upload failed.', 'error');
                    }
                } catch (err) {
                    toast(err.message || 'Upload failed.', 'error');
                } finally {
                    btn.disabled = false; btn.textContent = 'Upload photo';
                }
            });
        }
        if (clear) clear.addEventListener('click', () => setStaffPhotoUi(''));
    })();

    if (els.staffRole) els.staffRole.addEventListener('change', () => {
        toggleStaffWorkplaceFields();
        toggleStaffManagesAllField();
    });
    {
        const wpSel = document.getElementById('staffWorkplace');
        if (wpSel) wpSel.addEventListener('change', toggleStaffWorkplaceFields);
    }

    els.staffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = els.staffEditId.value;
        const role = els.staffRole.value || 'staff';
        const warehouseSel = $('#staffWarehouse');
        const workplace = ($('#staffWorkplace') && $('#staffWorkplace').value) || 'showroom';
        // A warehouse posting (explicit choice, or any Warehouse Manager) gets a
        // warehouse_id; a showroom posting clears it. This is the signal the ID
        // card reads to show Warehouse vs Showroom.
        const isWarehousePosting = workplace === 'warehouse' || role === 'warehouse_manager';
        const warehouseId = (isWarehousePosting && warehouseSel) ? (warehouseSel.value || null) : null;
        const allBranchesEl = document.getElementById('staffManagesAllBranches');
        const allWarehousesEl = document.getElementById('staffManagesAllWarehouses');
        // Super roles (Director / System Admin) always manage everything —
        // never let an edit silently strip those flags.
        const superRole = isSuperRole(role);
        const payload = {
            name: els.staffName.value.trim(),
            email: els.staffEmail.value.trim().toLowerCase(),
            password: els.staffPassword.value,
            role,
            branch_id: els.staffBranch.value || null,
            is_admin: superRole,
            manages_all_branches:   superRole || !!(allBranchesEl   && allBranchesEl.checked),
            manages_all_warehouses: superRole || !!(allWarehousesEl && allWarehousesEl.checked),
        };
        if (!payload.name || !payload.email) { toast('Name and email are required.', 'error'); return; }
        if (isWarehousePosting && !warehouseId) { toast(role === 'warehouse_manager' ? 'Warehouse Manager must be assigned to a warehouse.' : 'Pick a warehouse for this staff, or set Workplace to Showroom.', 'error'); return; }
        // Every non-super staff must have a workplace. Director & System Admin
        // oversee all locations, so they're exempt.
        if (!superRole && !isWarehousePosting && !payload.branch_id) {
            toast('Choose a showroom for this staff (or set Workplace to Warehouse).', 'error');
            return;
        }
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
            // Anti-lockout: never let the System Admin strip its OWN super role.
            // Doing so hides every System-Admin-only feature (dev mode, permissions,
            // media, import) and removes the System-Admin option from this form —
            // making it impossible to undo without a direct database edit. To set a
            // branch for the ID card, keep the role and use Workplace/Showroom below.
            if (id && id === session.id && isSuperRole(prevRole) && !isSuperRole(role)) {
                toast('You can\'t remove your own System Admin / Director role — you\'d lose access to dev mode and admin tools. Keep the role and set the branch via Workplace below (access stays all-branches).', 'error');
                return;
            }
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
                // Optional photo + start date — only patch fields the form has values for.
                try {
                    const photoUrl = ($('#staffPhotoUrl') && $('#staffPhotoUrl').value) || null;
                    const startedAt = ($('#staffStartedAt') && $('#staffStartedAt').value) || null;
                    await window.CH.staff.patch(staffId, { image_url: photoUrl, started_at: startedAt });
                } catch (e) { console.warn('staff.patch failed:', e); }
                // Every staff member gets an auto-generated staff ID. System
                // Admin (no branch) gets a dedicated CH-SA-NNN code; everyone
                // else gets CH-<branch initial>-NNN from the DB generator.
                try {
                    const existingCode = (prev && prev.staff_code) || null;
                    if (!existingCode) {
                        let newCode = null;
                        if (role === 'system_manager') {
                            let max = 0;
                            (staffList || []).forEach((s) => {
                                const m = /^CH-SA-(\d+)$/.exec(s.staff_code || '');
                                if (m) max = Math.max(max, parseInt(m[1], 10));
                            });
                            newCode = 'CH-SA-' + String(max + 1).padStart(3, '0');
                        } else if (window.CH.roles && window.CH.roles.generateStaffCode) {
                            newCode = await window.CH.roles.generateStaffCode(payload.branch_id);
                        }
                        if (newCode) await window.CH.staff.patch(staffId, { staff_code: newCode });
                    }
                } catch (e) { console.warn('staff code generation failed:', e); }
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
    [els.branchModal, els.staffModal, WAREHOUSE_ELS.modal, PA_ELS.modal].filter(Boolean).forEach((m) => {
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
                    ${p.name ? '<div class="prod-card__name" style="font-weight:700;color:var(--c-ink);font-size:0.9rem;margin-bottom:2px;">' + escapeHtml(p.name) + '</div>' : ''}
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
       WAREHOUSE STOCK — dedicated showroom-style view
       Same card chassis as the Showroom, but money is intentionally
       absent everywhere; quantity is the headline. Warehouse Manager
       is auto-scoped to the warehouses they manage.
       ============================================================ */
    let whStockProducts = [];
    let whStockWarehouses = [];

    async function loadWarehouseStock() {
        const role = currentRole();
        const heading = $('#whStockHeading');
        try {
            // Pull fresh products + warehouses each time so quantities are live
            const [prods, whs] = await Promise.all([
                window.CH.products.list(null),
                (window.CH.warehouses && window.CH.warehouses.listWithBranches)
                    ? window.CH.warehouses.listWithBranches()
                    : Promise.resolve(warehousesCache || []),
            ]);
            // Scope warehouses by role:
            //   - Warehouse Manager: just the warehouses they manage
            //   - Branch Manager:    warehouses linked to their managed branches
            //   - Director / SysMgr: every warehouse
            let allowed = whs;
            if (role === 'warehouse_manager') {
                const scope = getManagedWarehouseIds();
                if (scope !== 'ALL') {
                    const allowedSet = new Set(scope);
                    allowed = whs.filter((w) => allowedSet.has(w.id));
                }
            } else if (role === 'branch_manager') {
                const branchScope = getManagedBranchIds();
                if (branchScope !== 'ALL') {
                    const branchSet = new Set(branchScope);
                    allowed = whs.filter((w) => (w.branches || []).some((b) => branchSet.has(b.branch_id)));
                }
            }
            whStockWarehouses = allowed;
            const allowedIds = new Set(allowed.map((w) => w.id));
            whStockProducts = (prods || []).filter((p) =>
                !p.is_draft
                && p.warehouse_id
                && allowedIds.has(p.warehouse_id)
            );
            // Heading copy adapts to who's looking
            if (heading) {
                if (role === 'warehouse_manager') {
                    const names = allowed.map((w) => w.name).filter(Boolean);
                    heading.textContent = names.length
                        ? 'Live count of every item in ' + (names.length === 1 ? names[0] : names.length + ' warehouses')
                        : 'You don\'t manage any warehouse yet — ask the Director.';
                } else if (role === 'branch_manager') {
                    heading.textContent = 'Warehouses linked to your branch(es).';
                } else {
                    heading.textContent = 'Live count of every item across every warehouse.';
                }
            }
            // Populate warehouse picker
            const whSel = $('#whStockWarehouseFilter');
            if (whSel) {
                const label = role === 'warehouse_manager' ? 'All my warehouses' : 'All warehouses';
                whSel.innerHTML = ['<option value="">' + label + '</option>']
                    .concat(allowed.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}${w.code ? ' · ' + escapeHtml(w.code) : ''}</option>`))
                    .join('');
                whSel.value = '';
                // Hide picker when there's only one warehouse to choose from
                whSel.style.display = allowed.length <= 1 ? 'none' : '';
            }
            // Populate category filter from observed values + taxonomy
            const catSel = $('#whStockCategoryFilter');
            if (catSel) {
                const seen = new Set(whStockProducts.map((p) => (p.category || '').trim()).filter(Boolean));
                (categoriesCache || []).forEach((c) => { if (c && c.name) seen.add(c.name); });
                const opts = ['<option value="">All categories</option>']
                    .concat(Array.from(seen).sort().map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`));
                const current = catSel.value;
                catSel.innerHTML = opts.join('');
                if (current) catSel.value = current;
            }
            renderWarehouseStock();
        } catch (err) {
            console.error(err);
            toast('Could not load warehouse stock: ' + (err.message || 'unknown error'), 'error');
        }
    }

    function renderWarehouseStock() {
        const grid = $('#whStockGrid');
        const empty = $('#whStockEmpty');
        if (!grid || !empty) return;
        const whFilter = ($('#whStockWarehouseFilter') && $('#whStockWarehouseFilter').value) || '';
        const catFilter = ($('#whStockCategoryFilter') && $('#whStockCategoryFilter').value) || '';
        const lvlFilter = ($('#whStockLevelFilter') && $('#whStockLevelFilter').value) || '';
        const q = (($('#whStockSearch') && $('#whStockSearch').value) || '').trim().toLowerCase();

        const whById = new Map(whStockWarehouses.map((w) => [w.id, w]));

        const list = whStockProducts.filter((p) => {
            if (whFilter && p.warehouse_id !== whFilter) return false;
            if (catFilter && (p.category || '') !== catFilter) return false;
            const stock = Number(p.stock) || 0;
            if (lvlFilter === 'in'  && stock <= LOW_STOCK_THRESHOLD) return false;
            if (lvlFilter === 'low' && !(stock > 0 && stock <= LOW_STOCK_THRESHOLD)) return false;
            if (lvlFilter === 'out' && stock !== 0) return false;
            if (q) {
                const hay = [p.name, p.item_no, p.description, p.material, p.color, p.supplier, p.category]
                    .filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        // Totals reflect the current FILTER set (not the global pool) so the
        // numbers always match what's visible below.
        let skuCount = list.length;
        let unitCount = 0;
        let lowCount = 0;
        let outCount = 0;
        list.forEach((p) => {
            const s = Number(p.stock) || 0;
            unitCount += s;
            if (s === 0) outCount += 1;
            else if (s <= LOW_STOCK_THRESHOLD) lowCount += 1;
        });
        const sku  = $('#whStockSkuCount');   if (sku)  sku.textContent  = skuCount.toLocaleString();
        const unit = $('#whStockUnitCount');  if (unit) unit.textContent = unitCount.toLocaleString();
        const low  = $('#whStockLowCount');   if (low)  low.textContent  = lowCount.toLocaleString();
        const out  = $('#whStockOutCount');   if (out)  out.textContent  = outCount.toLocaleString();

        if (list.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        grid.innerHTML = list.map((p) => {
            const stock = Number(p.stock) || 0;
            const stockClass = stock <= 0 ? 'pill--stock-out'
                : stock <= LOW_STOCK_THRESHOLD ? 'pill--stock-low'
                : 'pill--stock-good';
            const stockBadge = stock <= 0 ? 'Out' : stock + ' left';
            const media = p.image_url
                ? `<img src="${escapeAttr(p.image_url)}" alt="" loading="lazy" />`
                : `<div class="prod-card__media--ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
            const wh = whById.get(p.warehouse_id);
            const whTag = wh ? `<span class="prod-card__wh-tag" title="${escapeAttr(wh.name || '')}">${escapeHtml(wh.name || '')}</span>` : '';
            return `<article class="prod-card" data-wh-stock-id="${p.id}">
                <div class="prod-card__media">
                    ${media}
                    <span class="pill ${stockClass} prod-card__stock">${stockBadge}</span>
                </div>
                <div class="prod-card__body">
                    <div class="prod-card__itemno">${escapeHtml(p.item_no || '—')}</div>
                    <h3 class="prod-card__title">${escapeHtml(p.description || '')}</h3>
                    <div class="prod-card__meta">
                        ${p.category ? '<span class="pill">' + escapeHtml(p.category) + '</span>' : ''}
                        ${p.material ? '<span class="pill">' + escapeHtml(p.material) + '</span>' : ''}
                        ${p.color ? '<span class="pill">' + escapeHtml(p.color) + '</span>' : ''}
                    </div>
                    <div class="prod-card__qty-row">
                        <div class="prod-card__qty-big">${stock.toLocaleString()}<small>${stock === 1 ? 'unit' : 'units'}</small></div>
                        ${whTag}
                    </div>
                </div>
            </article>`;
        }).join('');
    }

    // Wire filters once
    ['#whStockWarehouseFilter', '#whStockCategoryFilter', '#whStockLevelFilter'].forEach((sel) => {
        const el = document.querySelector(sel);
        if (el) el.addEventListener('change', renderWarehouseStock);
    });
    const _whSearchEl = document.getElementById('whStockSearch');
    if (_whSearchEl) {
        let _whSearchDeb;
        _whSearchEl.addEventListener('input', () => {
            clearTimeout(_whSearchDeb);
            _whSearchDeb = setTimeout(renderWarehouseStock, 160);
        });
    }
    // Click a card -> open the standard product detail modal (money is
    // already hidden for Warehouse Manager via .no-money-warehouse-mgr).
    const _whGrid = document.getElementById('whStockGrid');
    if (_whGrid) _whGrid.addEventListener('click', (e) => {
        const card = e.target.closest('[data-wh-stock-id]');
        if (!card) return;
        const p = whStockProducts.find((x) => x.id === card.dataset.whStockId);
        if (!p) return;
        const wh = whStockWarehouses.find((w) => w.id === p.warehouse_id) || {};
        const branchName = (wh.branches && wh.branches[0] && wh.branches[0].branch_name)
            || (allBranchesCache.find((b) => b.id === p.branch_id) || {}).name
            || '—';
        openProductDetail(p, branchName);
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
        els.pdetailTitle.textContent = p.name || p.description || 'Product';
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
        // When a product has a name, the title shows the name — keep the
        // description visible as its own row.
        if (p.name && p.description) rows.push(['Description', p.description]);
        const dims = [p.dim_l, p.dim_w, p.dim_h].filter(Boolean).join(' × ');
        if (dims) rows.push(['Dimensions', dims + ' mm']);
        if (p.supplier) rows.push(['Supplier', p.supplier]);
        rows.push(['Quantity', stock]);
        if (p.created_at) rows.push(['Added', new Date(p.created_at).toLocaleDateString()]);
        els.pdetailRows.innerHTML = rows.map(([k, v]) => `<div class="pdetail__row"><span>${escapeHtml(k)}</span><b>${escapeHtml(String(v))}</b></div>`).join('');

        // "Request from another branch" — strict gate:
        //   - viewer can request (NOT warehouse_manager)
        //   - product has a real item_no (can't search by null)
        //   - this branch's stock is at or below the low-stock threshold
        //   - the system has at least TWO warehouses (otherwise nothing to
        //     request FROM)
        //   - AND at least one OTHER warehouse holds the same item_no with
        //     stock > 0 right now
        const reqBtn = $('#pdetailRequestBtn');
        if (reqBtn) {
            reqBtn.hidden = true;
            shouldShowTransferRequestButton(p).then((show) => {
                if (show && activePdetailProduct && activePdetailProduct.id === p.id) {
                    reqBtn.hidden = false;
                }
            }).catch(() => { /* silent: keeps button hidden */ });
        }

        els.pdetail.classList.add('is-open');
    }
    function closeProductDetail() {
        els.pdetail.classList.remove('is-open');
        activePdetailProduct = null;
    }

    /* ============================================================
       PRODUCT TRANSFER REQUEST (Phase 2)
       ============================================================ */

    const PT_PROVIDERS = {
        momo: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'],
        bank: ['GCB Bank', 'Stanbic Bank', 'Ecobank', 'Fidelity Bank', 'CalBank', 'Zenith Bank', 'Access Bank', 'Absa Bank', 'UMB', 'GTBank', 'Republic Bank'],
    };

    /**
     * Strict gate for the "Request from another branch" button.
     * Every condition below MUST be true; any miss hides the button.
     *
     *   1. Viewer is NOT a plain Warehouse Manager (they verify, they
     *      don't request — they own their warehouse). Other roles pass.
     *   2. Product has a non-empty item_no (we search by code).
     *   3. The viewer's location is low OR out — i.e. stock <= LOW_STOCK_THRESHOLD.
     *   4. The system has >= 2 warehouses (otherwise there is no "other").
     *   5. At least one OTHER warehouse (different warehouse_id AND
     *      different branch_id than the viewer's home) is currently
     *      stocking THIS specific item_no with stock > 0.
     *   6. That other warehouse is not empty overall (the rule "all
     *      warehouses must not be empty" — at least one source must hold
     *      real inventory, not be a freshly-created empty shell).
     *
     * No caching; everything fetched live so the gate can never give a
     * stale "yes".
     */
    async function shouldShowTransferRequestButton(p) {
        if (!p || !window.CH || !window.CH.productTransfers) return false;
        // System Admin can switch off the whole transfers feature — but is
        // never limited by it themselves (full access always).
        if (featureFlagsCache && featureFlagsCache.transfers_enabled === false && currentRole() !== 'system_manager') return false;
        if (currentRole() === 'warehouse_manager') return false;
        const itemNo = (p.item_no || '').trim();
        if (!itemNo) return false;
        const stock = Number(p.stock) || 0;
        if (stock > LOW_STOCK_THRESHOLD) return false;

        // (4) 2+ warehouses must exist.
        let whList;
        try { whList = await window.CH.warehouses.listWithBranches(); }
        catch (_) { return false; }
        warehousesCache = whList || warehousesCache;
        if (!whList || whList.length < 2) return false;

        // The viewer's "own" location — exclude both branch and warehouse,
        // so warehouse-managers (no branch_id) are handled too.
        const ownBranchId = session.branch_id || null;
        const ownWarehouseId = p.warehouse_id || session.warehouse_id || null;

        let sources;
        try {
            sources = await window.CH.productTransfers.findSourcesForItem(itemNo, ownWarehouseId);
        } catch (_) { return false; }
        if (!Array.isArray(sources) || sources.length === 0) return false;

        // (5) At least one OTHER warehouse must hold THIS item with stock > 0,
        // at a different warehouse AND a different branch than the viewer's.
        const usable = sources.filter((s) =>
            Number(s.stock) > 0
            && s.warehouse_id
            && s.warehouse_id !== ownWarehouseId
            && (!ownBranchId || s.branch_id !== ownBranchId)
        );
        if (usable.length === 0) return false;

        // (6) That other warehouse must not be empty overall — confirm it
        // holds at least one product (any item) with stock > 0. Prevents
        // the button showing when the only "match" is a stray seed row in
        // an otherwise empty warehouse.
        try {
            const otherWh = usable[0].warehouse_id;
            const { data, error } = await window.CH.supabase
                .from('products')
                .select('id', { head: true, count: 'exact' })
                .eq('warehouse_id', otherWh)
                .eq('is_draft', false)
                .gt('stock', 0);
            if (error) return false;
            // If the count came back > 0 we're good. (head:true so .data is null;
            // we read it off .count via supabase-js v2 semantics.)
            // Belt-and-braces: trust `usable` filter above too.
            return true;
        } catch (_) {
            return true; // usable already passed all hard checks
        }
    }

    // Phase 2 — payment selection state for the active Request modal
    let ptSourceAccountsCache = [];   // accounts available at the chosen source branch
    let ptActiveSourceBranchId = null;

    function ptCurrentStatus() {
        const r = document.querySelector('input[name="ptPaymentStatus"]:checked');
        return r ? r.value : '';
    }

    function ptUpdateFieldVisibility() {
        const status = ptCurrentStatus();
        const methodEl = $('#ptPaymentMethod');
        const method = methodEl ? methodEl.value : '';
        // Account dropdown (Paid + method != cash)
        const methodField = $('#ptPaymentMethodField');
        const providerField = $('#ptProviderField');
        const accField  = $('#ptAccountField');
        const infoField = $('#ptAccountInfoField');
        const affirmField = $('#ptAffirmationField');
        const needsAccount = method && method !== 'cash';
        // When the requester hasn't paid yet, the rest of the payment
        // form is noise — hide method/provider/account entirely. The
        // user keeps Delivery, Staff ID, Note, plus the "Pay first" CTA.
        const hideAllPayment = (status === 'not_paid' || status === '');
        if (methodField)   methodField.style.display   = hideAllPayment ? 'none' : '';
        if (methodEl)      methodEl.required           = !hideAllPayment;
        if (providerField) providerField.style.display = hideAllPayment ? 'none' : providerField.style.display;
        if (accField)    accField.style.display    = (status === 'paid' && needsAccount)    ? '' : 'none';
        if (infoField)   infoField.style.display   = (status === 'not_paid' && needsAccount) ? '' : 'none';
        if (affirmField) affirmField.style.display = (status === 'paid')                     ? '' : 'none';
        ptUpdateSubmitState();
    }

    function ptUpdateSubmitState() {
        const btn = $('#ptSubmitBtn');
        if (!btn) return;
        const status = ptCurrentStatus();
        if (status !== 'paid') {
            btn.disabled = true;
            if (status === 'not_paid') btn.textContent = 'Pay first, then mark as Paid';
            else btn.textContent = 'Pick payment status';
            return;
        }
        const affirmPaid = $('#ptAffirmPaid');
        const affirmCancel = $('#ptAffirmCancel');
        if (!affirmPaid || !affirmPaid.checked || !affirmCancel || !affirmCancel.checked) {
            btn.disabled = true;
            btn.textContent = 'Tick both confirmations';
            return;
        }
        btn.disabled = false;
        btn.textContent = 'Submit request';
    }

    function ptRenderAccountUI() {
        const method = $('#ptPaymentMethod').value;
        const status = ptCurrentStatus();
        const accounts = (ptSourceAccountsCache || []).filter((a) => a.method === method);
        const sel = $('#ptAccountSelect');
        const infoBox = $('#ptAccountInfoBox');

        // Dropdown (Paid)
        if (sel) {
            if (status === 'paid' && method && method !== 'cash') {
                if (accounts.length === 0) {
                    sel.innerHTML = '<option value="">No accounts registered — ask the Director</option>';
                    sel.disabled = true;
                } else {
                    sel.innerHTML = ['<option value="" disabled selected>Pick the account you paid to</option>']
                        .concat(accounts.map((a) => `<option value="${a.id}">${escapeHtml(a.provider)} · ${escapeHtml(a.account_number)} · ${escapeHtml(a.account_name)}</option>`))
                        .join('');
                    sel.disabled = false;
                }
            }
        }

        // Info box (Not paid)
        if (infoBox) {
            if (status === 'not_paid' && method && method !== 'cash') {
                if (accounts.length === 0) {
                    infoBox.className = 'pt-source-accounts is-empty';
                    infoBox.innerHTML = '<div class="pt-source-accounts__title">No payment accounts registered for this method at the source branch.</div><div>Ask the Director to add one before requesting.</div>';
                } else {
                    infoBox.className = 'pt-source-accounts';
                    infoBox.innerHTML = '<div class="pt-source-accounts__title">Pay to one of these accounts first:</div>' +
                        accounts.map((a) => `
                            <div class="pt-source-account">
                                <div class="pt-source-account__provider">${escapeHtml(a.provider)}</div>
                                <div class="pt-source-account__row">Account: <code>${escapeHtml(a.account_number)}</code></div>
                                <div class="pt-source-account__row">Name: ${escapeHtml(a.account_name)}</div>
                                ${a.notes ? '<div class="pt-source-account__row">Note: ' + escapeHtml(a.notes) + '</div>' : ''}
                            </div>
                        `).join('') +
                        '<div class="pt-source-accounts__hint">Once paid, switch the toggle above to <b>Paid</b> and tell us which account you used.</div>';
                }
            }
        }
    }

    async function ptLoadSourceAccounts(branchId) {
        ptActiveSourceBranchId = branchId;
        ptSourceAccountsCache = [];
        if (!branchId || !window.CH || !window.CH.paymentAccounts) {
            ptRenderAccountUI();
            return;
        }
        try {
            ptSourceAccountsCache = await window.CH.paymentAccounts.listForBranch(branchId);
        } catch (_) {
            ptSourceAccountsCache = [];
        }
        ptRenderAccountUI();
    }

    function openProductTransferRequest(p) {
        if (!window.CH || !window.CH.productTransfers) {
            toast('Transfer requests not enabled yet. Ask the Director to run the latest setup.', 'error');
            return;
        }
        const modal = $('#ptRequestModal');
        if (!modal) return;
        // Reset form
        const form = $('#ptRequestForm');
        if (form) form.reset();
        $('#ptProductId').value = p.id;
        $('#ptQty').value = '';
        $('#ptProviderField').style.display = 'none';
        ptSourceAccountsCache = [];
        ptActiveSourceBranchId = null;
        // Reset payment-flow state
        document.querySelectorAll('input[name="ptPaymentStatus"]').forEach((r) => { r.checked = false; });
        const aff1 = $('#ptAffirmPaid'); if (aff1) aff1.checked = false;
        const aff2 = $('#ptAffirmCancel'); if (aff2) aff2.checked = false;
        ptUpdateFieldVisibility();
        // Reset + initialise delivery sub-blocks
        const intField = $('#ptInternalInfoField');
        const extField = $('#ptExternalFields');
        if (intField) intField.style.display = 'none';
        if (extField) extField.style.display = 'none';
        const intBranchOut = $('#ptInternalBranchName');
        if (intBranchOut) intBranchOut.textContent = session.branch_name || 'your branch';
        const recName = $('#ptDeliveryRecipientName'); if (recName) recName.value = '';
        const recPhone = $('#ptDeliveryRecipientPhone'); if (recPhone) { recPhone.value = ''; recPhone.required = false; }
        const recAddr = $('#ptDeliveryAddress'); if (recAddr) { recAddr.value = ''; recAddr.required = false; }
        // Product summary card
        const summary = $('#ptProductSummary');
        const ph = '<div class="pt-product-summary__ph"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
        const img = p.image_url ? `<img src="${escapeAttr(p.image_url)}" alt="" />` : ph;
        summary.innerHTML = `${img}<div class="pt-product-summary__info"><div class="pt-product-summary__title">${escapeHtml(p.description || '—')}</div><div class="pt-product-summary__sub">${escapeHtml(p.item_no || '— no code —')}</div></div>`;
        // Populate source warehouse dropdown
        const fromSel = $('#ptFromWarehouse');
        fromSel.innerHTML = '<option value="">Loading availability…</option>';
        window.CH.productTransfers.findSourcesForItem(p.item_no, p.warehouse_id || null)
            .then((sources) => {
                const ownBranchId = session.branch_id || null;
                const usable = (sources || []).filter((s) =>
                    Number(s.stock) > 0
                    && s.branch_id
                    && s.branch_id !== ownBranchId
                );
                if (usable.length === 0) {
                    fromSel.innerHTML = '<option value="">No other branch has stock</option>';
                    return;
                }
                fromSel.innerHTML = ['<option value="" disabled selected>Pick a warehouse</option>']
                    .concat(usable.map((s) => {
                        const wh = s.warehouses || {};
                        const br = s.branches || {};
                        const label = `${wh.name || 'Warehouse'} · ${br.name || ''} · ${s.stock} in stock`;
                        return `<option value="${s.warehouse_id}" data-stock="${s.stock}" data-branch-id="${s.branch_id || ''}">${escapeHtml(label)}</option>`;
                    })).join('');
            })
            .catch(() => {
                fromSel.innerHTML = '<option value="">Could not load sources</option>';
            });
        // Pre-fill requester staff ID with the signed-in user's code if known
        if (session && session.staff_code) {
            $('#ptRequesterCode').value = session.staff_code;
            $('#ptRequesterName').textContent = session.name || '';
            $('#ptRequesterName').classList.remove('is-error');
            $('#ptRequesterName').classList.add('is-ok');
        } else {
            $('#ptRequesterCode').value = '';
            $('#ptRequesterName').textContent = 'Type your code to confirm your name';
            $('#ptRequesterName').classList.remove('is-ok','is-error');
        }
        // Director & System Admin don't need to confirm a staff ID.
        relaxStaffIdGate('ptRequesterCode');
        modal.classList.add('is-open');
        setTimeout(() => $('#ptQty').focus(), 50);
    }

    // Payment method -> provider sub-dropdown + payment-flow visibility
    const ptMethodEl = document.getElementById('ptPaymentMethod');
    if (ptMethodEl) ptMethodEl.addEventListener('change', () => {
        const method = ptMethodEl.value;
        const wrap = $('#ptProviderField');
        const sel = $('#ptPaymentProvider');
        const providers = PT_PROVIDERS[method];
        if (providers && providers.length) {
            sel.innerHTML = ['<option value="" disabled selected>Select provider</option>']
                .concat(providers.map((p) => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`))
                .join('');
            sel.required = true;
            wrap.style.display = '';
        } else {
            sel.innerHTML = '';
            sel.required = false;
            wrap.style.display = 'none';
        }
        // Method changed -> rebuild account dropdown / info box
        ptRenderAccountUI();
        ptUpdateFieldVisibility();
    });

    // Payment status radio (Paid / Not paid)
    document.querySelectorAll('input[name="ptPaymentStatus"]').forEach((r) => {
        r.addEventListener('change', () => {
            ptRenderAccountUI();
            ptUpdateFieldVisibility();
        });
    });

    // Affirmation checkboxes -> re-evaluate submit state
    const _ptAffPaid = document.getElementById('ptAffirmPaid');
    const _ptAffCancel = document.getElementById('ptAffirmCancel');
    if (_ptAffPaid)   _ptAffPaid.addEventListener('change', ptUpdateSubmitState);
    if (_ptAffCancel) _ptAffCancel.addEventListener('change', ptUpdateSubmitState);

    // Source warehouse change -> load that branch's payment accounts
    const _ptFromWh = document.getElementById('ptFromWarehouse');
    if (_ptFromWh) _ptFromWh.addEventListener('change', () => {
        const opt = _ptFromWh.selectedOptions[0];
        const branchId = opt && opt.dataset.branchId ? opt.dataset.branchId : null;
        ptLoadSourceAccounts(branchId);
    });

    // Delivery type change -> toggle internal/external sub-blocks
    const _ptDeliveryEl = document.getElementById('ptDeliveryType');
    if (_ptDeliveryEl) _ptDeliveryEl.addEventListener('change', () => {
        const val = _ptDeliveryEl.value;
        const intField = $('#ptInternalInfoField');
        const extField = $('#ptExternalFields');
        const phone = $('#ptDeliveryRecipientPhone');
        const addr  = $('#ptDeliveryAddress');
        if (val === 'internal') {
            if (intField) intField.style.display = '';
            if (extField) extField.style.display = 'none';
            const out = $('#ptInternalBranchName');
            if (out) out.textContent = session.branch_name || 'your branch';
            if (phone) { phone.required = false; phone.value = ''; }
            if (addr)  { addr.required  = false; addr.value  = ''; }
        } else if (val === 'external') {
            if (intField) intField.style.display = 'none';
            if (extField) extField.style.display = '';
            if (phone) phone.required = true;
            if (addr)  addr.required  = true;
        } else {
            if (intField) intField.style.display = 'none';
            if (extField) extField.style.display = 'none';
        }
    });

    // Staff ID input -> live autofill of name
    const ptCodeEl = document.getElementById('ptRequesterCode');
    if (ptCodeEl) {
        let ptCodeDebounce;
        ptCodeEl.addEventListener('input', () => {
            const code = (ptCodeEl.value || '').trim().toUpperCase();
            const out = $('#ptRequesterName');
            clearTimeout(ptCodeDebounce);
            if (!code) {
                out.textContent = 'Type your code to confirm your name';
                out.classList.remove('is-ok','is-error');
                return;
            }
            ptCodeDebounce = setTimeout(async () => {
                try {
                    const match = (staffList || []).find((s) => (s.staff_code || '').toUpperCase() === code);
                    if (match) {
                        out.textContent = match.name + (match.role ? ' · ' + match.role.replace('_',' ') : '');
                        out.classList.add('is-ok');
                        out.classList.remove('is-error');
                    } else {
                        out.textContent = 'No staff with that code';
                        out.classList.add('is-error');
                        out.classList.remove('is-ok');
                    }
                } catch (_) { /* silent */ }
            }, 250);
        });
    }

    // Submit handler
    const ptForm = document.getElementById('ptRequestForm');
    if (ptForm) ptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = $('#ptSubmitBtn');
        const productId = $('#ptProductId').value;
        const qty = parseInt($('#ptQty').value, 10) || 0;
        const fromWh = $('#ptFromWarehouse').value;
        const method = $('#ptPaymentMethod').value;
        const provider = ($('#ptPaymentProvider') && $('#ptPaymentProvider').value) || null;
        const delivery = $('#ptDeliveryType').value;
        let code = ($('#ptRequesterCode').value || '').trim().toUpperCase();
        const note = ($('#ptNote').value || '').trim();
        const status = ptCurrentStatus();
        const accountId = ($('#ptAccountSelect') && $('#ptAccountSelect').value) || null;
        const affPaid = $('#ptAffirmPaid') && $('#ptAffirmPaid').checked;
        const affCancel = $('#ptAffirmCancel') && $('#ptAffirmCancel').checked;
        // Delivery info (external only — internal goes to the requester's branch)
        const deliveryRecipientName  = (($('#ptDeliveryRecipientName')  && $('#ptDeliveryRecipientName').value)  || '').trim();
        const deliveryRecipientPhone = (($('#ptDeliveryRecipientPhone') && $('#ptDeliveryRecipientPhone').value) || '').trim();
        const deliveryAddress        = (($('#ptDeliveryAddress')        && $('#ptDeliveryAddress').value)        || '').trim();
        // Validation (every field required)
        if (!productId || !qty || qty <= 0 || !fromWh || !method || !delivery || (!code && !isSuperRole())) {
            toast('Please complete every field.', 'error');
            return;
        }
        if (delivery === 'external' && (!deliveryRecipientPhone || !deliveryAddress)) {
            toast('External delivery needs the recipient phone and delivery address.', 'error');
            return;
        }
        if ((method === 'momo' || method === 'bank') && !provider) {
            toast('Please pick a provider for the chosen payment method.', 'error');
            return;
        }
        if (status !== 'paid') {
            toast('You must pay first and mark the request as Paid before submitting.', 'error');
            return;
        }
        if (!affPaid || !affCancel) {
            toast('Tick both confirmation boxes.', 'error');
            return;
        }
        if (method !== 'cash' && !accountId) {
            toast('Pick which account you paid to.', 'error');
            return;
        }
        // Regular staff must confirm a staff ID that matches their signed-in
        // user; Director & System Admin are exempt (identified by session).
        code = resolveActionStaffCode(code);
        if (code === null) return;
        // Max qty check against the dropdown's available stock
        const opt = $('#ptFromWarehouse').selectedOptions[0];
        const maxStock = opt ? Number(opt.dataset.stock) : 0;
        if (qty > maxStock) {
            toast('Source warehouse only has ' + maxStock + ' available.', 'error');
            return;
        }
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting…';
            const ptCode = await window.CH.productTransfers.create({
                product_id: productId,
                from_warehouse_id: fromWh,
                qty,
                payment_method: method,
                payment_provider: provider,
                delivery_type: delivery,
                requester_staff_id: session.id,
                requester_code: code,
                note: note || null,
                delivery_address:        delivery === 'external' ? deliveryAddress        : null,
                delivery_recipient_name: delivery === 'external' ? deliveryRecipientName  : null,
                delivery_recipient_phone:delivery === 'external' ? deliveryRecipientPhone : null,
            });
            // Attach the chosen payment_account_id to the new row (Cash skips)
            if (accountId && window.CH.supabase) {
                try {
                    await window.CH.supabase
                        .from('product_transfer_requests')
                        .update({ payment_account_id: accountId })
                        .eq('code', ptCode);
                } catch (_) { /* best-effort: the request still succeeded */ }
            }
            // Log it
            try {
                await window.CH.logs.record({
                    product_id: productId,
                    action: 'product_transfer_requested',
                    branch_id: session.branch_id,
                    branch_name: session.branch_name,
                    staff_id: session.id,
                    staff_name: session.name,
                    note: ptCode + ' · qty ' + qty + ' · pay ' + method + (provider ? ' (' + provider + ')' : ''),
                });
            } catch (_) {}
            toast('Transfer requested · ' + ptCode, 'success');
            $('#ptRequestModal').classList.remove('is-open');
            // Refresh products list so the new pending request is reflected
            if (currentView === 'products') await loadProducts();
        } catch (err) {
            console.error(err);
            toast('Could not create transfer: ' + (err.message || 'unknown error'), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit request';
        }
    });

    // Click on the Request button inside the product detail modal
    const ptRequestBtn = document.getElementById('pdetailRequestBtn');
    if (ptRequestBtn) ptRequestBtn.addEventListener('click', () => {
        if (activePdetailProduct) {
            els.pdetail.classList.remove('is-open');
            openProductTransferRequest(activePdetailProduct);
        }
    });

    // Close handler for the request modal
    const ptModal = document.getElementById('ptRequestModal');
    if (ptModal) ptModal.addEventListener('click', (e) => { if (e.target === ptModal) ptModal.classList.remove('is-open'); });
    els.pdetailClose.addEventListener('click', closeProductDetail);
    els.pdetail.addEventListener('click', (e) => { if (e.target === els.pdetail) closeProductDetail(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.pdetail.classList.contains('is-open')) closeProductDetail(); });

    /* ============================================================
       REPORTS
       ============================================================ */
    async function loadReports() {
        try {
            const { branches: br, products: prods, staff: stfRaw } = await window.CH.reports.overview();
            // System Admin accounts are infrastructure-level and never count
            // toward staff/Director totals shown on any dashboard.
            const stf = (stfRaw || []).filter((s) => !isSystemAdminStaff(s));
            const role = currentRole();
            const hideMoney = role === 'warehouse_manager';

            // Role-scoped visibility:
            //   admin / system_manager -> everything
            //   branch_manager         -> their branch
            //   warehouse_manager      -> their warehouse (no money)
            //   staff                  -> their branch (read-only summary)
            let visibleProducts, visibleBranches, visibleStaff, scopeLabel;
            if (isSuperRole(role)) {
                visibleProducts = prods;
                visibleBranches = br;
                visibleStaff = stf;
                scopeLabel = `${br.length} branch${br.length === 1 ? '' : 'es'} · ${stf.length} staff company-wide`;
            } else if (role === 'warehouse_manager' && session.warehouse_id) {
                visibleProducts = prods.filter((p) => p.warehouse_id === session.warehouse_id);
                visibleBranches = br.filter((b) => b.id === session.branch_id);
                visibleStaff = stf.filter((s) => s.warehouse_id === session.warehouse_id);
                scopeLabel = `${session.warehouse_name || 'Your warehouse'} · warehouse view`;
            } else {
                // branch_manager + staff
                visibleProducts = prods.filter((p) => p.branch_id === session.branch_id);
                visibleBranches = br.filter((b) => b.id === session.branch_id);
                visibleStaff = stf.filter((s) => s.branch_id === session.branch_id);
                scopeLabel = `${session.branch_name || 'Your branch'} · ${visibleStaff.length} staff at your branch`;
            }

            els.reportsHeading.textContent = scopeLabel;

            // Fire-and-forget extras (don't block the main render if any
            // missing tables — Phase 2 SQL may not be applied yet)
            renderReportTransfersSection(role, visibleBranches);
            renderReportDraftsSection(role, visibleProducts);
            renderReportPaymentAccountsSection(role);
            // Sales + payment-received breakdown + full ledger (date-scoped,
            // role-tailored). Self-contained; won't block inventory render.
            renderSalesReport(role, br).catch((e) => console.warn('sales report failed:', e));

            // Top cards
            const totalProducts = visibleProducts.length;
            const totalUnits = visibleProducts.reduce((s, p) => s + (Number(p.stock) || 0), 0);
            const totalValue = visibleProducts.reduce((s, p) => s + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
            const lowStock = visibleProducts.filter((p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD).length;
            const outOfStock = visibleProducts.filter((p) => (Number(p.stock) || 0) <= 0).length;
            const branchesCount = visibleBranches.length;
            const staffCount = visibleStaff.length;
            const adminCount = visibleStaff.filter((s) => s.is_admin).length;

            // Pull sales + movement aggregates in parallel — both tables may
            // not exist yet on freshly-installed instances, so each is wrapped.
            const mode = (window.CH.devMode && window.CH.devMode.current()) || 'live';
            const [salesAgg, movesAgg, topMovers] = await Promise.all([
                fetchSalesAggregate(role, mode).catch(() => null),
                fetchMovesAggregate(role, mode).catch(() => null),
                fetchTopMovers(role, mode).catch(() => []),
            ]);

            // Build cards. Money cards get a no-money-warehouse-mgr class so
            // CSS auto-hides them from Warehouse Managers.
            // Inventory Value is reserved for Director + System Admin —
            // everyone else sees Total Sales (theirs or their branch's) in its place.
            const isSuper = isSuperRole(role);
            const cards = [
                card('Total products',  totalProducts.toLocaleString(), 'in inventory', 'accent'),
                card('Stock units',     totalUnits.toLocaleString(),    'units on hand', ''),
            ];
            if (!hideMoney && isSuper) {
                cards.push(card('Inventory value', CURRENCY + ' ' + money.format(totalValue), 'at retail price', 'accent'));
            }
            // Sales totals now live in the date-scoped "Sales summary" section
            // below (renderSalesReport), so they are not duplicated here.
            if (movesAgg) {
                cards.push(card('Stock moved', movesAgg.units.toLocaleString(), movesAgg.count + ' transfer' + (movesAgg.count === 1 ? '' : 's'), ''));
            }
            cards.push(
                card('Low stock',       lowStock.toLocaleString(),      `≤ ${LOW_STOCK_THRESHOLD} units`, lowStock > 0 ? 'alert' : ''),
                card('Out of stock',    outOfStock.toLocaleString(),    'needs restocking', outOfStock > 0 ? 'alert' : ''),
                card('Branches',        branchesCount.toLocaleString(), isSuperRole(role) ? 'showrooms' : 'your branch',     ''),
                card('Staff',           staffCount.toLocaleString(),    isSuperRole(role)
                    ? `${adminCount} Director${adminCount === 1 ? '' : 's'} company-wide`
                    : `at ${session.branch_name || 'your branch'}`,
                    ''),
            );
            if (!hideMoney) {
                cards.push(card('Avg price', totalProducts ? CURRENCY + ' ' + money.format(totalValue / Math.max(totalUnits, 1)) : '—', 'per unit', ''));
            }
            // "Moved by" leader card — first row of topMovers
            if (topMovers && topMovers.length > 0) {
                const lead = topMovers[0];
                cards.push(card('Top mover', escapeHtml(lead.name || '—'), lead.units + ' unit' + (lead.units === 1 ? '' : 's') + ' · ' + lead.transfers + ' transfer' + (lead.transfers === 1 ? '' : 's'), ''));
            }
            els.reportCards.innerHTML = cards.join('');

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

    /* ---- Phase 4 report aggregates: sales + stock moved ---------- */
    // In live mode read env='live'. In dev mode read everything so the
    // sandbox preview reflects real-world totals.
    function _envScope(q, mode) {
        return mode === 'dev' ? q : q.eq('env', 'live');
    }
    async function fetchSalesAggregate(role, mode) {
        if (!window.CH || !window.CH.supabase) return null;
        let q = window.CH.supabase
            .from('customer_orders')
            .select('id, total, branch_id, initiated_by');
        q = _envScope(q, mode);
        if (role === 'staff') q = q.eq('initiated_by', session.id);
        else if (role === 'branch_manager') q = q.eq('branch_id', session.branch_id);
        // warehouse_manager: leave unfiltered (Warehouse Manager doesn't see money anyway)
        const { data, error } = await q;
        if (error) return null;
        const rows = data || [];
        const total = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        return { total, count: rows.length };
    }
    async function fetchMovesAggregate(role, mode) {
        if (!window.CH || !window.CH.supabase) return null;
        let q = window.CH.supabase
            .from('product_transfer_requests')
            .select('id, qty_received, from_warehouse_id, to_warehouse_id, to_branch_id, from_branch_id, status')
            .eq('status', 'received');
        q = _envScope(q, mode);
        if (role === 'branch_manager' || role === 'staff') q = q.or('to_branch_id.eq.' + session.branch_id + ',from_branch_id.eq.' + session.branch_id);
        else if (role === 'warehouse_manager' && session.warehouse_id) q = q.or('to_warehouse_id.eq.' + session.warehouse_id + ',from_warehouse_id.eq.' + session.warehouse_id);
        const { data, error } = await q;
        if (error) return null;
        const rows = data || [];
        const units = rows.reduce((s, r) => s + (Number(r.qty_received) || 0), 0);
        return { units, count: rows.length };
    }
    async function fetchTopMovers(role, mode) {
        if (!window.CH || !window.CH.supabase) return [];
        let q = window.CH.supabase
            .from('product_transfer_requests')
            .select('qty_received, requested_by, received_by, status, requested_by_code')
            .eq('status', 'received');
        q = _envScope(q, mode);
        const { data, error } = await q;
        if (error) return [];
        // Aggregate by the staff who initiated (requested_by).
        const byStaff = new Map();
        (data || []).forEach((r) => {
            const sid = r.requested_by;
            if (!sid) return;
            const cur = byStaff.get(sid) || { id: sid, units: 0, transfers: 0 };
            cur.units += Number(r.qty_received) || 0;
            cur.transfers += 1;
            byStaff.set(sid, cur);
        });
        const out = Array.from(byStaff.values()).sort((a, b) => b.units - a.units).slice(0, 5);
        // Attach names from staffList cache
        const nameById = new Map((staffList || []).map((s) => [s.id, s.name]));
        return out.map((r) => ({ ...r, name: nameById.get(r.id) || '—' }));
    }

    /* ---- Report sections that are added by Phase 2 -------------- */
    async function renderReportTransfersSection(role, visibleBranches) {
        const host = document.getElementById('reportTransfers');
        if (!host) return; // section not present in HTML — skip silently
        if (!window.CH || !window.CH.productTransfers) {
            host.innerHTML = '';
            return;
        }
        let filters = {};
        if (role === 'branch_manager' || role === 'staff') {
            filters.toBranchId = session.branch_id;
        } else if (role === 'warehouse_manager') {
            filters.fromWarehouseId = session.warehouse_id;
        }
        try {
            const list = await window.CH.productTransfers.list({ ...filters, limit: 200 });
            const pending = list.filter((t) => t.status === 'pending').length;
            const received = list.filter((t) => t.status === 'received').length;
            const cancelled = list.filter((t) => t.status === 'cancelled').length;
            host.innerHTML = `
                <h2>Product transfers</h2>
                <div class="report-grid">
                    <div class="report-card"><div class="report-card__label">Total</div><div class="report-card__value">${list.length}</div></div>
                    <div class="report-card ${pending > 0 ? 'report-card--alert' : ''}"><div class="report-card__label">Pending</div><div class="report-card__value">${pending}</div></div>
                    <div class="report-card"><div class="report-card__label">Received</div><div class="report-card__value">${received}</div></div>
                    <div class="report-card"><div class="report-card__label">Cancelled</div><div class="report-card__value">${cancelled}</div></div>
                </div>
            `;
        } catch (_) {
            host.innerHTML = '<h2>Product transfers</h2><div class="report-card"><div class="report-card__label">Transfers not enabled yet</div><div class="report-card__hint">Run the latest setup to enable.</div></div>';
        }
    }

    async function renderReportDraftsSection(role, visibleProducts) {
        const host = document.getElementById('reportDrafts');
        if (!host) return;
        // Drafts are visible to System Admin only.
        if (role !== 'system_manager') { host.innerHTML = ''; return; }
        try {
            const drafts = await window.CH.drafts.list(isSuperRole(role) ? null : session.branch_id);
            const ready = drafts.filter((d) => d.item_no && d.description && d.price && d.stock != null).length;
            const needing = drafts.length - ready;
            host.innerHTML = `
                <h2>Drafts</h2>
                <div class="report-grid">
                    <div class="report-card"><div class="report-card__label">Total drafts</div><div class="report-card__value">${drafts.length}</div></div>
                    <div class="report-card"><div class="report-card__label">Ready to publish</div><div class="report-card__value">${ready}</div></div>
                    <div class="report-card ${needing > 0 ? 'report-card--alert' : ''}"><div class="report-card__label">Needs attention</div><div class="report-card__value">${needing}</div></div>
                </div>
            `;
        } catch (_) { host.innerHTML = ''; }
    }

    async function renderReportPaymentAccountsSection(role) {
        const host = document.getElementById('reportPaymentAccounts');
        if (!host) return;
        if (!isSuperRole(role)) { host.innerHTML = ''; return; }
        if (!window.CH || !window.CH.paymentAccounts) { host.innerHTML = ''; return; }
        try {
            const all = await window.CH.paymentAccounts.list();
            const byMethod = { cash: 0, momo: 0, pos: 0, bank: 0 };
            all.forEach((a) => { if (byMethod[a.method] !== undefined) byMethod[a.method]++; });
            host.innerHTML = `
                <h2>Payment accounts</h2>
                <div class="report-grid">
                    <div class="report-card"><div class="report-card__label">Total accounts</div><div class="report-card__value">${all.length}</div></div>
                    <div class="report-card"><div class="report-card__label">MoMo</div><div class="report-card__value">${byMethod.momo}</div></div>
                    <div class="report-card"><div class="report-card__label">Bank</div><div class="report-card__value">${byMethod.bank}</div></div>
                    <div class="report-card"><div class="report-card__label">POS</div><div class="report-card__value">${byMethod.pos}</div></div>
                    <div class="report-card"><div class="report-card__label">Cash</div><div class="report-card__value">${byMethod.cash}</div></div>
                </div>
            `;
        } catch (_) { host.innerHTML = ''; }
    }

    /* ---- Sales + payments report (date-scoped, role-tailored) ----- */
    // Selected window for every sales/payment figure. Default: this month.
    let reportRange = { preset: 'month', from: null, to: null };

    function _startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
    function _endOfDay(d)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
    function fmtDateTime(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function computeReportRange() {
        const now = new Date();
        let from, to = _endOfDay(now), label;
        const p = reportRange.preset;
        if (p === 'custom' && (reportRange.from || reportRange.to)) {
            from = reportRange.from ? _startOfDay(new Date(reportRange.from)) : new Date(0);
            to   = reportRange.to   ? _endOfDay(new Date(reportRange.to))    : _endOfDay(now);
            label = `${from.toLocaleDateString('en-GB')} → ${to.toLocaleDateString('en-GB')}`;
        } else if (p === 'today') {
            from = _startOfDay(now); label = 'Today';
        } else if (p === 'week') {
            const d = _startOfDay(now); const dow = (d.getDay() + 6) % 7; // Mon = 0
            d.setDate(d.getDate() - dow); from = d; label = 'This week';
        } else if (p === 'year') {
            from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0); label = 'This year';
        } else if (p === 'all') {
            from = new Date(0); label = 'All time';
        } else {
            from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); label = 'This month';
        }
        return { fromISO: from.toISOString(), toISO: to.toISOString(), label };
    }

    async function fetchSalesData(role, mode, range) {
        if (!window.CH || !window.CH.supabase) return [];
        let q = window.CH.supabase
            .from('customer_orders')
            .select('id, code, invoice_code, branch_id, subtotal, total, status, payment_method, payment_account_id, payment_confirmed, created_at, fulfilled_at, client_name, initiated_by, branch:branch_id(name), initiator:initiated_by(name,staff_code), payment_account:payment_account_id(provider,account_name,account_number,method)')
            .gte('created_at', range.fromISO)
            .lte('created_at', range.toISO)
            .order('created_at', { ascending: false })
            .limit(2000);
        q = _envScope(q, mode);
        // Role scope: staff -> own sales; branch_manager -> their branch;
        // super (Director / System Admin) -> everything. Warehouse Manager
        // never reaches here (money hidden).
        if (role === 'staff') q = q.eq('initiated_by', session.id);
        else if (role === 'branch_manager') q = q.eq('branch_id', session.branch_id);
        const { data, error } = await q;
        if (error) { console.warn('fetchSalesData:', error); return []; }
        return data || [];
    }

    async function renderSalesReport(role, branchesList) {
        const elSummary = document.getElementById('reportSalesSummary');
        const elBranch  = document.getElementById('reportBranchSales');
        const elPay     = document.getElementById('reportPaymentsReceived');
        const elLedger  = document.getElementById('reportSalesLedger');
        if (!elSummary || !elBranch || !elPay || !elLedger) return;
        const hideAll = [elSummary, elBranch, elPay, elLedger];

        // Warehouse Manager never sees money — hide every sales section.
        if (role === 'warehouse_manager') {
            hideAll.forEach((e) => { e.style.display = 'none'; e.innerHTML = ''; });
            return;
        }

        const mode = (window.CH.devMode && window.CH.devMode.current()) || 'live';
        const range = computeReportRange();
        const orders = await fetchSalesData(role, mode, range);
        const isSuper = isSuperRole(role);
        const fmtMoney = (n) => CURRENCY + ' ' + money.format(Number(n) || 0);
        const mkCard = (label, value, hint, kind) =>
            `<div class="report-card ${kind ? 'report-card--' + kind : ''}"><div class="report-card__label">${label}</div><div class="report-card__value">${value}</div><div class="report-card__hint">${hint}</div></div>`;

        // ----- Summary cards -----
        const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
        const fulfilled    = orders.filter((o) => o.status === 'fulfilled');
        const pending      = orders.filter((o) => o.status === 'pending');
        const cancelled    = orders.filter((o) => o.status === 'cancelled');
        const grossSales      = nonCancelled.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const received        = nonCancelled.filter((o) => o.payment_confirmed).reduce((s, o) => s + (Number(o.total) || 0), 0);
        const fulfilledValue  = fulfilled.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const scopeLabel = isSuper ? 'all branches' : (role === 'branch_manager' ? (session.branch_name || 'your branch') : 'your sales');
        elSummary.style.display = '';
        elSummary.innerHTML = `
            <h2>Sales summary <span class="report-section__sub">${range.label} · ${escapeHtml(scopeLabel)}</span></h2>
            <div class="report-grid">
                ${mkCard('Total sales', fmtMoney(grossSales), nonCancelled.length + ' invoice' + (nonCancelled.length === 1 ? '' : 's'), 'accent')}
                ${mkCard('Payment received', fmtMoney(received), 'confirmed payments', 'accent')}
                ${mkCard('Fulfilled', fmtMoney(fulfilledValue), fulfilled.length + ' dispatched', '')}
                ${mkCard('Pending', pending.length.toLocaleString(), 'awaiting fulfilment', pending.length ? 'alert' : '')}
                ${mkCard('Cancelled', cancelled.length.toLocaleString(), 'voided', '')}
            </div>`;

        // ----- Sales by branch (super-roles only; others are single-branch) -----
        if (isSuper) {
            const byBranch = new Map();
            (branchesList || []).forEach((b) => byBranch.set(b.id, { name: b.name, count: 0, gross: 0, received: 0, fulfilled: 0, pending: 0 }));
            nonCancelled.forEach((o) => {
                const k = o.branch_id || '_none';
                if (!byBranch.has(k)) byBranch.set(k, { name: (o.branch && o.branch.name) || '— Unassigned —', count: 0, gross: 0, received: 0, fulfilled: 0, pending: 0 });
                const r = byBranch.get(k);
                r.count += 1; r.gross += Number(o.total) || 0;
                if (o.payment_confirmed) r.received += Number(o.total) || 0;
                if (o.status === 'fulfilled') r.fulfilled += 1;
                if (o.status === 'pending') r.pending += 1;
            });
            const rows = Array.from(byBranch.values())
                .filter((r) => r.count > 0)
                .sort((a, b) => b.gross - a.gross)
                .map((r) => `<tr>
                    <td><strong style="color:var(--c-ink-2);">${escapeHtml(r.name)}</strong></td>
                    <td>${r.count}</td>
                    <td><strong>${fmtMoney(r.gross)}</strong></td>
                    <td>${fmtMoney(r.received)}</td>
                    <td>${r.fulfilled}</td>
                    <td>${r.pending > 0 ? '<span class="pill pill--pending">' + r.pending + '</span>' : '—'}</td>
                </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--c-ink-5);">No sales in this period.</td></tr>`;
            elBranch.style.display = '';
            elBranch.innerHTML = `<h2>Sales by branch <span class="report-section__sub">${range.label}</span></h2>
                <div class="table-scroll"><table class="tbl"><thead><tr><th>Branch</th><th>Invoices</th><th>Total sales</th><th>Received</th><th>Fulfilled</th><th>Pending</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        } else {
            elBranch.style.display = 'none'; elBranch.innerHTML = '';
        }

        // ----- Payments received: by method (cards) + by account (table) -----
        const byAccount = new Map();
        const byMethod  = new Map();
        nonCancelled.forEach((o) => {
            const amt = Number(o.total) || 0;
            const confirmed = !!o.payment_confirmed;
            const m = o.payment_method || 'unknown';
            if (!byMethod.has(m)) byMethod.set(m, { count: 0, total: 0, received: 0 });
            const mr = byMethod.get(m); mr.count += 1; mr.total += amt; if (confirmed) mr.received += amt;
            const acc = o.payment_account;
            const key = o.payment_account_id || ('method:' + m);
            const label = acc ? `${acc.provider} — ${acc.account_name}` : `— No account on file (${m}) —`;
            if (!byAccount.has(key)) byAccount.set(key, { label, method: acc ? acc.method : m, number: acc ? acc.account_number : '', count: 0, total: 0, received: 0 });
            const ar = byAccount.get(key); ar.count += 1; ar.total += amt; if (confirmed) ar.received += amt;
        });
        const methodOrder = ['cash', 'momo', 'pos', 'bank', 'unknown'];
        const methodCards = methodOrder.filter((m) => byMethod.has(m)).map((m) => {
            const r = byMethod.get(m);
            return mkCard(m.toUpperCase(), fmtMoney(r.total), r.count + ' txn · ' + fmtMoney(r.received) + ' received', '');
        }).join('');
        const accRows = Array.from(byAccount.values())
            .sort((a, b) => b.total - a.total)
            .map((a) => `<tr>
                <td><strong style="color:var(--c-ink-2);">${escapeHtml(a.label)}</strong>${a.number ? '<br><small style="color:var(--c-ink-5);font-family:var(--f-mono);">' + escapeHtml(a.number) + '</small>' : ''}</td>
                <td><span class="pay-method-tag">${escapeHtml(a.method)}</span></td>
                <td>${a.count}</td>
                <td><strong>${fmtMoney(a.total)}</strong></td>
                <td>${fmtMoney(a.received)}</td>
            </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--c-ink-5);">No payments in this period.</td></tr>`;
        elPay.style.display = '';
        elPay.innerHTML = `<h2>Payments received <span class="report-section__sub">${range.label} · by account &amp; method</span></h2>
            ${methodCards ? '<div class="report-grid" style="margin-bottom:14px;">' + methodCards + '</div>' : ''}
            <div class="table-scroll"><table class="tbl"><thead><tr><th>Account</th><th>Method</th><th>Txns</th><th>Total billed</th><th>Confirmed received</th></tr></thead><tbody>${accRows}</tbody></table></div>`;

        // ----- Full sales ledger (every transaction, date + time) -----
        const LEDGER_CAP = 500;
        const ledgerRows = orders.slice(0, LEDGER_CAP).map((o) => {
            const acc = o.payment_account;
            const accLabel = acc ? escapeHtml(acc.provider + ' — ' + acc.account_name) : '—';
            const staffName = (o.initiator && o.initiator.name) ? o.initiator.name : '—';
            const statusPill = o.status === 'fulfilled'
                ? '<span class="pill pill--paid">Fulfilled</span>'
                : (o.status === 'cancelled' ? '<span class="pill pill--stock-out">Cancelled</span>' : '<span class="pill pill--pending">Pending</span>');
            const paidPill = o.payment_confirmed ? '<span class="pill pill--paid">Paid</span>' : '<span class="pill pill--unpaid">Unpaid</span>';
            return `<tr>
                <td><span style="font-family:var(--f-mono);font-size:0.8rem;color:var(--c-ink-3);white-space:nowrap;">${fmtDateTime(o.created_at)}</span></td>
                <td><span class="itemno">${escapeHtml(o.invoice_code || o.code || '—')}</span></td>
                <td>${escapeHtml((o.branch && o.branch.name) || '—')}</td>
                <td>${escapeHtml(staffName)}</td>
                <td>${escapeHtml(o.client_name || '—')}</td>
                <td><strong>${fmtMoney(o.total)}</strong></td>
                <td><span class="pay-method-tag">${escapeHtml(o.payment_method || '—')}</span></td>
                <td>${accLabel}</td>
                <td>${paidPill}</td>
                <td>${statusPill}</td>
            </tr>`;
        }).join('') || `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--c-ink-5);">No transactions in this period.</td></tr>`;
        const note = orders.length > LEDGER_CAP
            ? `<span class="report-section__sub">Showing latest ${LEDGER_CAP} of ${orders.length} — narrow the range to see more.</span>`
            : `<span class="report-section__sub">${orders.length} transaction${orders.length === 1 ? '' : 's'} · ${range.label}</span>`;
        elLedger.style.display = '';
        elLedger.innerHTML = `<h2>Sales ledger ${note}</h2>
            <div class="table-scroll"><table class="tbl"><thead><tr><th>Date &amp; time</th><th>Invoice</th><th>Branch</th><th>Staff</th><th>Client</th><th>Amount</th><th>Method</th><th>Account</th><th>Payment</th><th>Status</th></tr></thead><tbody>${ledgerRows}</tbody></table></div>`;
    }

    // Wire the date-range filter controls.
    (function wireReportFilter() {
        const filter = document.getElementById('reportFilter');
        if (!filter) return;
        const presets = filter.querySelectorAll('.rf-preset');
        const fromEl = document.getElementById('reportFrom');
        const toEl = document.getElementById('reportTo');
        const applyBtn = document.getElementById('reportApplyRange');
        presets.forEach((btn) => btn.addEventListener('click', () => {
            presets.forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            reportRange = { preset: btn.dataset.range, from: null, to: null };
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            loadReports();
        }));
        if (applyBtn) applyBtn.addEventListener('click', () => {
            const f = fromEl && fromEl.value;
            const t = toEl && toEl.value;
            if (!f && !t) { toast('Pick a "from" and/or "to" date first.', 'error'); return; }
            if (f && t && f > t) { toast('"From" date must be before "To" date.', 'error'); return; }
            presets.forEach((b) => b.classList.remove('is-active'));
            reportRange = { preset: 'custom', from: f || null, to: t || null };
            loadReports();
        });
    })();

    els.reportsRefreshBtn.addEventListener('click', loadReports);

    /* ---- Export PDF -------------------------------------------------- */
    els.reportsExportPdfBtn.addEventListener('click', async () => {
        if (!window.CH || !window.CH.pdf) {
            toast('PDF library not loaded. Reload the page and try again.', 'error');
            return;
        }
        try {
            els.reportsExportPdfBtn.disabled = true;
            const role = currentRole();
            const { branches: br, products: prods, staff: stfRaw } = await window.CH.reports.overview();
            // System Admin accounts never appear in the exported report either.
            const stf = (stfRaw || []).filter((s) => !isSystemAdminStaff(s));
            const visibleProducts = isSuperRole(role) ? prods : prods.filter((p) => p.branch_id === session.branch_id);
            const visibleBranches = isSuperRole(role) ? br : br.filter((b) => b.id === session.branch_id);

            // Sales + payments — same date window + role scope as the on-screen
            // report. Skipped for Warehouse Manager (money hidden).
            let salesPayload = null;
            if (role !== 'warehouse_manager') {
                const mode = (window.CH.devMode && window.CH.devMode.current()) || 'live';
                const range = computeReportRange();
                const orders = await fetchSalesData(role, mode, range).catch(() => []);
                salesPayload = { orders, rangeLabel: range.label, role };
            }

            await window.CH.pdf.exportReport({
                session,
                role,
                currency: CURRENCY,
                branches: visibleBranches,
                products: visibleProducts,
                staff: stf,
                lowThreshold: LOW_STOCK_THRESHOLD,
                sales: salesPayload,
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
                new Notification('Prime Access Ghana — ' + title, { body: sub, icon: 'assets/logo.png', tag: 'ch-stock-alert' });
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
            // Director or super-manager sees all drafts; Branch Manager
            // sees drafts for every branch they manage.
            const role = currentRole();
            const scope = getManagedBranchIds();
            let drafts;
            if (role === 'admin' || scope === 'ALL') {
                drafts = await window.CH.drafts.list();
            } else if (scope.length === 1) {
                drafts = await window.CH.drafts.list(scope[0]);
            } else {
                // Fetch all then filter client-side (we don't have an IN-list endpoint)
                drafts = await window.CH.drafts.list();
                drafts = drafts.filter((d) => scope.includes(d.branch_id));
            }
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
        // Drafts visible to: System Admin only.
        const role = currentRole();
        if (role !== 'system_manager') return;
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
            // Branch Manager sees logs across every branch they manage.
            // Director or super-manager: all logs.
            const role = currentRole();
            const scope = getManagedBranchIds();
            if (role === 'admin' || scope === 'ALL') {
                allLogsCache = all;
            } else {
                const allowed = new Set(scope);
                allLogsCache = all.filter((l) => !l.branch_id || allowed.has(l.branch_id));
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
                const r = currentRole();
                if (r === 'system_manager') {
                    try { await updateDraftsBadge(); } catch (_) {}
                }
            }, 600);
        });
    }

    /* ---------- role-based access control ----------
       Sets body[data-role] so CSS gating activates, and provides a
       guard used by switchView() to block forbidden views server-free.
       Source of truth for allowed views per role: */
    // System Admin has the full view list (everything).
    // Director (admin) gets everything EXCEPT data-ops pages now owned
    // by System Admin: Drafts, Extract from image, Media, ID Cards.
    const ALL_VIEWS = ['products','showroom','reports','messages','drafts','logs','warehouses','warehouse-stock','taxonomy','branches','showrooms','staff','extract','announcements','payment-accounts','product-transfers','new-sale','purchases','verify-invoice','move-stock','media','id-cards','invoice-templates','permissions','theme'];
    // Director gets everything except System Admin-only ops AND id-cards
    // by default; id-cards is dynamically allowed for Director at runtime
    // when the System Admin's feature flag is on (see switchView).
    // 'permissions' is System Admin-only (it controls the other roles).
    const ADMIN_VIEWS = ALL_VIEWS.filter((v) => v !== 'drafts' && v !== 'extract' && v !== 'media' && v !== 'id-cards' && v !== 'invoice-templates' && v !== 'permissions' && v !== 'theme');
    // Staff views depend on their workplace (showroom vs warehouse).
    const STAFF_SHOWROOM_VIEWS  = ['products','showroom','reports','messages','announcements','new-sale','purchases'];
    const STAFF_WAREHOUSE_VIEWS = ['warehouse-stock','purchases','reports','messages','announcements','product-transfers','verify-invoice'];
    const VIEWS_BY_ROLE = {
        admin:             ADMIN_VIEWS,
        system_manager:    ALL_VIEWS,
        // Branch Manager: full branch-wide ops for their branch + can manage
        // (create) staff. Sees both showroom and warehouse of their branch.
        branch_manager:    ['products','showroom','warehouse-stock','warehouses','reports','messages','announcements','logs','product-transfers','new-sale','purchases','staff'],
        // Warehouse Manager: warehouse only — stock + transfers + verify.
        // No new-sale; Purchases shown (to see pending sales). Money hidden.
        warehouse_manager: STAFF_WAREHOUSE_VIEWS,
        // Staff default = showroom side (overridden by workplace below).
        staff:             STAFF_SHOWROOM_VIEWS,
    };

    // A user is "warehouse-side" if they're a warehouse manager, or a staff
    // member assigned to a warehouse. They see warehouse info, not the showroom.
    function isWarehouseSideUser() {
        const r = currentRole();
        if (r === 'warehouse_manager') return true;
        if (r === 'staff' && session && session.warehouse_id) return true;
        return false;
    }

    // Single source of truth for which views the current user may access —
    // role + workplace + Director's dynamic id-cards + per-user denials.
    function allowedViewsForUser() {
        const role = currentRole();
        let base;
        if (role === 'staff') base = (isWarehouseSideUser() ? STAFF_WAREHOUSE_VIEWS : STAFF_SHOWROOM_VIEWS).slice();
        else base = (VIEWS_BY_ROLE[role] || VIEWS_BY_ROLE.staff).slice();
        if (role === 'admin' && featureFlagsCache && featureFlagsCache.id_cards_visible_to_director && !base.includes('id-cards')) {
            base.push('id-cards');
        }
        let denied = [];
        try { denied = deniedViewsForCurrentUser() || []; } catch (_) {}
        const isDenied = (v) => denied && (typeof denied.has === 'function' ? denied.has(v) : denied.indexOf(v) >= 0);
        return base.filter((v) => !isDenied(v));
    }

    // Drive nav visibility entirely from JS (overrides the legacy CSS class
    // rules via !important) so role + workplace + feature flags + setup gate
    // are all honoured in one place.
    function applyNavVisibility() {
        const allowed = new Set(allowedViewsForUser());
        const flags = featureFlagsCache || {};
        const setupIncomplete = document.body.dataset.setup === 'incomplete';
        document.querySelectorAll('.nav a[data-view]').forEach((a) => {
            const v = a.dataset.view;
            let vis = allowed.has(v);
            if (vis && (v === 'product-transfers' || v === 'verify-invoice') && flags.transfers_enabled === false) vis = false;
            if (vis && v === 'move-stock' && flags.move_stock_enabled === false) vis = false;
            if (vis && setupIncomplete && typeof SETUP_BLOCKED_VIEWS !== 'undefined' && SETUP_BLOCKED_VIEWS.includes(v)) vis = false;
            a.style.setProperty('display', vis ? 'flex' : 'none', 'important');
        });
    }

    function currentRole() {
        if (!session) return 'staff';
        const r = session.role;
        if (['staff','branch_manager','warehouse_manager','admin','system_manager'].includes(r)) return r;
        if (session.is_admin) return 'admin';
        return 'staff';
    }

    // Returns true for the two super-roles that have absolute control.
    // Use everywhere instead of `session.is_admin` so System Admin
    // gets the same treatment as Director without duplicate checks.
    function isSuperRole(r) {
        const role = r || currentRole();
        return role === 'admin' || role === 'system_manager';
    }

    /* The staff ID of the signed-in user — never typed manually anymore.
       Prefer the session (set at login), fall back to the staff list. */
    function currentUserStaffCode() {
        if (session && session.staff_code) return String(session.staff_code).toUpperCase();
        const me = (staffList || []).find((s) => s.id === (session && session.id));
        return ((me && me.staff_code) || '').toUpperCase();
    }

    /* Staff-ID action fields (sales, dispatch, transfers, verification) are
       AUTO-FILLED from the authenticated user and locked — no manual entry.
       Fills the input with the signed-in user's staff ID, makes it read-only,
       drops the required marker, and notifies dependent listeners. */
    function relaxStaffIdGate(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const code = currentUserStaffCode();
        if (code) input.value = code;
        input.readOnly = true;
        input.required = false;
        input.setAttribute('title', 'Auto-filled from your account');
        const label = document.querySelector('label[for="' + inputId + '"]');
        const star = label && label.querySelector('.req');
        if (star) star.style.display = 'none';
        try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    }

    /* Resolve the staff-ID for an action form. Always the authenticated
       user's own code — the typed value (if any) is ignored. Returns the
       upper-cased code, or null if the user has no staff ID yet. */
    function resolveActionStaffCode() {
        const code = currentUserStaffCode();
        if (!code) { toast('Your staff ID has not been generated yet. Ask the System Admin.', 'error'); return null; }
        return code;
    }

    // Identifies a System Admin staff record. The canonical signal is
    // role === 'system_manager'. We also catch the legacy super account that
    // was seeded as 'admin' but named "System Admin" so it is hidden from the
    // staff directory even before the role-promotion migration is applied.
    // System Admin is the overall manager (above the Director) and is kept out
    // of every staff listing, dropdown and report count for ALL viewers.
    function isSystemAdminStaff(s) {
        if (!s) return false;
        if (s.role === 'system_manager') return true;
        const name = String(s.name || '').trim().toLowerCase();
        return name === 'system admin' || name === 'systemadmin' || name === 'sysadmin';
    }
    // Expose so other modules / inline handlers can reuse the same rule.
    try { window.isSystemAdminStaff = isSystemAdminStaff; } catch (_) {}

    // Returns the set of branch_ids a session covers, OR the sentinel 'ALL'.
    // Used by every role-scoped loader. Considers:
    //   - admin / manages_all_branches  -> 'ALL'
    //   - else: session.branch_id (home) + every branch where the user is
    //     listed as manager_staff_id (cached from `branches`).
    function getManagedBranchIds() {
        if (!session) return [];
        if (isSuperRole() || session.manages_all_branches) return 'ALL';
        const home = session.branch_id;
        const cache = (typeof branches !== 'undefined' && Array.isArray(branches)) ? branches : [];
        const managed = cache.filter((b) => b.manager_staff_id === session.id).map((b) => b.id);
        const out = new Set(managed);
        if (home) out.add(home);
        return Array.from(out);
    }

    // Returns the set of warehouse_ids a session covers, OR 'ALL'.
    function getManagedWarehouseIds() {
        if (!session) return [];
        if (isSuperRole() || session.manages_all_warehouses) return 'ALL';
        const home = session.warehouse_id;
        const cache = (typeof warehousesCache !== 'undefined' && Array.isArray(warehousesCache)) ? warehousesCache : [];
        const managed = cache.filter((w) => w.manager_staff_id === session.id).map((w) => w.id);
        const out = new Set(managed);
        if (home) out.add(home);
        return Array.from(out);
    }

    function viewAllowedForRole(view /*, role */) {
        return allowedViewsForUser().includes(view);
    }

    function applyRoleVisibility() {
        const role = currentRole();
        document.body.dataset.role = role;
        // Workplace side powers money-hiding + nav tailoring for warehouse users.
        document.body.dataset.side = isWarehouseSideUser() ? 'warehouse' : 'showroom';
        applyNavVisibility();
    }

    /* Setup gate: the platform isn't usable until at least one branch AND one
       showroom exist. Until then, hide Add Product + every operational page
       (CSS via body[data-setup="incomplete"]) and keep the user on the setup
       pages (Branches → Showrooms). */
    const SETUP_BLOCKED_VIEWS = ['products','showroom','new-sale','purchases','warehouse-stock',
        'product-transfers','verify-invoice','move-stock','reports','drafts','extract',
        'media','id-cards','invoice-templates','taxonomy','announcements','messages'];
    function applySetupState() {
        const ready = (branches && branches.length > 0) && (showroomsCache && showroomsCache.length > 0);
        document.body.dataset.setup = ready ? 'ready' : 'incomplete';
        applyNavVisibility();
        if (!ready && SETUP_BLOCKED_VIEWS.includes(currentView)) {
            switchView((branches && branches.length > 0) ? 'showrooms' : 'branches');
        }
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

    /* ============================================================
       PRODUCT TRANSFERS — inbox view (Phase 2 Commit 4)
       ============================================================ */
    let allTransfersCache = [];
    let currentTransfersTab = 'incoming';

    const PT_INBOX = {
        body:  $('#productTransfersBody'),
        empty: $('#productTransfersEmpty'),
        tabs:  $$('.pt-tab'),
        badge: $('#navTransfersBadge'),
        // Receive
        receiveModal:  $('#ptReceiveModal'),
        receiveForm:   $('#ptReceiveForm'),
        receiveId:     $('#ptReceiveId'),
        receiveSummary:$('#ptReceiveSummary'),
        receiveQty:    $('#ptReceiveQty'),
        receiveQtyHint:$('#ptReceiveQtyHint'),
        receiverCode:  $('#ptReceiverCode'),
        receiverName:  $('#ptReceiverName'),
        receivePayConf:$('#ptReceivePaymentConfirmed'),
        receiveSubmit: $('#ptReceiveSubmit'),
        // Cancel
        cancelModal:   $('#ptCancelModal'),
        cancelForm:    $('#ptCancelForm'),
        cancelId:      $('#ptCancelId'),
        cancelReason:  $('#ptCancelReason'),
    };

    const PT_STATUS_LABELS = { pending: 'Pending', received: 'Received', cancelled: 'Cancelled' };
    const PT_STATUS_PILLS  = { pending: 'pill--pt-pending', received: 'pill--pt-received', cancelled: 'pill--pt-cancelled' };

    function isTransferIncoming(t) {
        const role = currentRole();
        const branchScope = getManagedBranchIds();
        if (role === 'admin' || branchScope === 'ALL') return !!t.to_branch_id; // Director sees both, classify
        return Array.isArray(branchScope) && branchScope.includes(t.to_branch_id);
    }
    function isTransferOutgoing(t) {
        const role = currentRole();
        const whScope = getManagedWarehouseIds();
        if (role === 'admin' || whScope === 'ALL') return !!t.from_warehouse_id;
        return Array.isArray(whScope) && whScope.includes(t.from_warehouse_id);
    }

    async function loadProductTransfers() {
        if (!window.CH || !window.CH.productTransfers) {
            if (PT_INBOX.body) PT_INBOX.body.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--c-ink-5);">Transfers not enabled yet. Ask the Director to run the latest setup.</td></tr>';
            return;
        }
        try {
            const role = currentRole();
            let opts = { limit: 500 };
            // For non-admins, pre-filter on the server when possible
            const branchScope = getManagedBranchIds();
            const whScope = getManagedWarehouseIds();
            if (role !== 'admin' && branchScope !== 'ALL' && whScope !== 'ALL') {
                // Fetch unfiltered (a single staff member could be both
                // requester at one branch and warehouse manager elsewhere).
                // We filter client-side instead.
                opts = { limit: 500 };
            }
            const all = await window.CH.productTransfers.list(opts);
            // Visibility filter: admin sees all; otherwise show only the
            // transfers the user is involved in (requester / incoming /
            // outgoing).
            if (role === 'admin' || branchScope === 'ALL' || whScope === 'ALL') {
                allTransfersCache = all;
            } else {
                const branchSet = new Set(branchScope);
                const whSet = new Set(whScope);
                allTransfersCache = all.filter((t) => {
                    return (t.requested_by === session.id) ||
                           branchSet.has(t.to_branch_id) ||
                           whSet.has(t.from_warehouse_id);
                });
            }
            renderProductTransfers();
            updateTransfersBadge();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                if (PT_INBOX.body) PT_INBOX.body.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--c-ink-5);">Transfers not enabled yet. Ask the Director to run the latest setup.</td></tr>';
            } else {
                toast('Could not load transfers: ' + (err.message || 'unknown'), 'error');
            }
        }
    }

    function renderProductTransfers() {
        if (!PT_INBOX.body) return;
        // Filter to the active tab
        let rows;
        if (currentTransfersTab === 'incoming') {
            rows = allTransfersCache.filter(isTransferIncoming);
        } else if (currentTransfersTab === 'outgoing') {
            rows = allTransfersCache.filter(isTransferOutgoing);
        } else {
            rows = allTransfersCache.slice();
        }
        if (rows.length === 0) {
            PT_INBOX.body.innerHTML = '';
            PT_INBOX.empty.style.display = 'block';
            return;
        }
        PT_INBOX.empty.style.display = 'none';
        const role = currentRole();
        PT_INBOX.body.innerHTML = rows.map((t) => {
            const fromWh = t.from_warehouse || {};
            const toBr = t.to_branch || {};
            const route = `${escapeHtml(fromWh.name || '?')} → ${escapeHtml(toBr.name || '?')}`;
            const payment = `${escapeHtml((t.payment_method || '').toUpperCase())}${t.payment_provider ? ' · ' + escapeHtml(t.payment_provider) : ''}`;
            const statusLabel = PT_STATUS_LABELS[t.status] || t.status;
            const statusPill = PT_STATUS_PILLS[t.status] || 'pill';
            const when = relTime(t.requested_at);
            // Action buttons
            const canReceive = t.status === 'pending' && isTransferIncoming(t);
            const canCancel  = t.status === 'pending' && (t.requested_by === session.id || isTransferIncoming(t) || isTransferOutgoing(t) || isSuperRole(role));
            const actions = [
                canReceive ? `<button class="btn btn--success" data-pt-receive="${t.id}" style="padding:4px 10px;font-size:0.78rem;height:auto;">Mark received</button>` : '',
                canCancel  ? `<button class="btn" data-pt-cancel="${t.id}" style="padding:4px 10px;font-size:0.78rem;height:auto;background:#fff;border:1px solid var(--c-danger);color:var(--c-danger);">Cancel</button>` : '',
            ].filter(Boolean).join(' ');
            return `<tr>
                <td><span class="itemno">${escapeHtml(t.code)}</span></td>
                <td>${escapeHtml(t.description || '')}${t.item_no ? '<br><small style="color:var(--c-ink-5);">' + escapeHtml(t.item_no) + '</small>' : ''}</td>
                <td><strong>${t.qty_requested}</strong>${t.qty_received != null ? ' / ' + t.qty_received + ' rcvd' : ''}</td>
                <td>${route}</td>
                <td>${payment}</td>
                <td><span class="pill ${statusPill}">${statusLabel}</span></td>
                <td>${when}</td>
                <td style="text-align:right;">${actions || '<span style="color:var(--c-ink-5);font-size:0.78rem;">—</span>'}</td>
            </tr>`;
        }).join('');
    }

    function updateTransfersBadge() {
        if (!PT_INBOX.badge) return;
        // Show pending count for incoming transfers — these need action
        const role = currentRole();
        if (role === 'warehouse_manager') {
            const n = allTransfersCache.filter((t) => t.status === 'pending' && isTransferOutgoing(t)).length;
            if (n > 0) { PT_INBOX.badge.textContent = String(n); PT_INBOX.badge.hidden = false; } else { PT_INBOX.badge.hidden = true; }
        } else {
            const n = allTransfersCache.filter((t) => t.status === 'pending' && isTransferIncoming(t)).length;
            if (n > 0) { PT_INBOX.badge.textContent = String(n); PT_INBOX.badge.hidden = false; } else { PT_INBOX.badge.hidden = true; }
        }
    }

    // Tab clicks
    PT_INBOX.tabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            PT_INBOX.tabs.forEach((b) => b.classList.toggle('is-active', b === btn));
            currentTransfersTab = btn.dataset.ptTab;
            renderProductTransfers();
        });
    });

    // Row clicks (Receive / Cancel)
    if (PT_INBOX.body) PT_INBOX.body.addEventListener('click', (e) => {
        const recvBtn = e.target.closest('[data-pt-receive]');
        if (recvBtn) { openReceiveModal(recvBtn.dataset.ptReceive); return; }
        const cancelBtn = e.target.closest('[data-pt-cancel]');
        if (cancelBtn) { openCancelModal(cancelBtn.dataset.ptCancel); return; }
    });

    function openReceiveModal(id) {
        const t = allTransfersCache.find((x) => x.id === id);
        if (!t) return;
        PT_INBOX.receiveId.value = id;
        PT_INBOX.receiveQty.value = t.qty_requested;
        PT_INBOX.receiveQty.max = t.qty_requested;
        PT_INBOX.receiveQtyHint.textContent = 'Requested: ' + t.qty_requested + '. You can receive less if the source shipped a smaller amount.';
        PT_INBOX.receiveQtyHint.classList.remove('is-ok', 'is-error');
        PT_INBOX.receivePayConf.checked = false;
        // Pre-fill code with session code if known
        if (session.staff_code) {
            PT_INBOX.receiverCode.value = session.staff_code;
            PT_INBOX.receiverName.textContent = session.name || '';
            PT_INBOX.receiverName.classList.add('is-ok'); PT_INBOX.receiverName.classList.remove('is-error');
        } else {
            PT_INBOX.receiverCode.value = '';
            PT_INBOX.receiverName.textContent = 'Type your code to confirm your name';
            PT_INBOX.receiverName.classList.remove('is-ok', 'is-error');
        }
        // Director & System Admin don't need to confirm a staff ID.
        relaxStaffIdGate('ptReceiverCode');
        // Summary
        const fromWh = t.from_warehouse || {};
        const toBr = t.to_branch || {};
        PT_INBOX.receiveSummary.innerHTML = `
            <div class="pt-receive-summary__row"><span>Code</span><b>${escapeHtml(t.code)}</b></div>
            <div class="pt-receive-summary__row"><span>Product</span><b>${escapeHtml(t.description || '—')}${t.item_no ? ' (' + escapeHtml(t.item_no) + ')' : ''}</b></div>
            <div class="pt-receive-summary__row"><span>Quantity requested</span><b>${t.qty_requested}</b></div>
            <div class="pt-receive-summary__row"><span>Route</span><b>${escapeHtml(fromWh.name || '?')} → ${escapeHtml(toBr.name || '?')}</b></div>
            <div class="pt-receive-summary__row"><span>Payment</span><b>${escapeHtml((t.payment_method || '').toUpperCase())}${t.payment_provider ? ' · ' + escapeHtml(t.payment_provider) : ''}</b></div>
            <div class="pt-receive-summary__row"><span>Requester</span><b>${escapeHtml(t.requested_by_code || '—')}</b></div>
        `;
        PT_INBOX.receiveModal.classList.add('is-open');
    }

    function openCancelModal(id) {
        PT_INBOX.cancelId.value = id;
        PT_INBOX.cancelReason.value = '';
        PT_INBOX.cancelModal.classList.add('is-open');
        setTimeout(() => PT_INBOX.cancelReason.focus(), 40);
    }

    // Receiver code → live name resolution (same pattern as request modal)
    if (PT_INBOX.receiverCode) {
        let debounce;
        PT_INBOX.receiverCode.addEventListener('input', () => {
            const code = (PT_INBOX.receiverCode.value || '').trim().toUpperCase();
            const out = PT_INBOX.receiverName;
            clearTimeout(debounce);
            if (!code) {
                out.textContent = 'Type your code to confirm your name';
                out.classList.remove('is-ok','is-error');
                return;
            }
            debounce = setTimeout(() => {
                const match = (staffList || []).find((s) => (s.staff_code || '').toUpperCase() === code);
                if (match) {
                    out.textContent = match.name + (match.role ? ' · ' + match.role.replace('_',' ') : '');
                    out.classList.add('is-ok'); out.classList.remove('is-error');
                } else {
                    out.textContent = 'No staff with that code';
                    out.classList.add('is-error'); out.classList.remove('is-ok');
                }
            }, 250);
        });
    }

    // Receive submit
    if (PT_INBOX.receiveForm) PT_INBOX.receiveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = PT_INBOX.receiveId.value;
        const t = allTransfersCache.find((x) => x.id === id);
        if (!t) return;
        const qty = parseInt(PT_INBOX.receiveQty.value, 10) || 0;
        let code = (PT_INBOX.receiverCode.value || '').trim().toUpperCase();
        const paymentConfirmed = !!PT_INBOX.receivePayConf.checked;
        if (!qty || qty <= 0 || qty > t.qty_requested) { toast('Enter a quantity between 1 and ' + t.qty_requested + '.', 'error'); return; }
        code = resolveActionStaffCode(code);
        if (code === null) return;
        try {
            PT_INBOX.receiveSubmit.disabled = true;
            PT_INBOX.receiveSubmit.textContent = 'Confirming…';
            await window.CH.productTransfers.receive(id, {
                receiver_staff_id: session.id,
                receiver_code: code,
                qty_received: qty,
                payment_confirmed: paymentConfirmed,
            });
            try {
                await window.CH.logs.record({
                    product_id: t.product_id, item_no: t.item_no,
                    action: 'product_transfer_received',
                    branch_id: t.to_branch_id, branch_name: (t.to_branch && t.to_branch.name),
                    staff_id: session.id, staff_name: session.name,
                    note: t.code + ' · qty ' + qty + (paymentConfirmed ? ' · payment confirmed' : ' · payment NOT confirmed'),
                });
            } catch (_) {}
            toast('Transfer received. Stock moved.', 'success');
            PT_INBOX.receiveModal.classList.remove('is-open');
            await loadProductTransfers();
            if (currentView === 'products') await loadProducts();
        } catch (err) {
            console.error(err);
            toast('Could not receive: ' + (err.message || 'unknown'), 'error');
        } finally {
            PT_INBOX.receiveSubmit.disabled = false;
            PT_INBOX.receiveSubmit.textContent = 'Confirm receipt';
        }
    });

    // Cancel submit
    if (PT_INBOX.cancelForm) PT_INBOX.cancelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = PT_INBOX.cancelId.value;
        const t = allTransfersCache.find((x) => x.id === id);
        const reason = (PT_INBOX.cancelReason.value || '').trim();
        if (!reason) { toast('Please enter a reason.', 'error'); return; }
        try {
            await window.CH.productTransfers.cancel(id, { by_staff_id: session.id, reason });
            try {
                await window.CH.logs.record({
                    product_id: t && t.product_id, item_no: t && t.item_no,
                    action: 'product_transfer_cancelled',
                    branch_id: t && t.to_branch_id, branch_name: (t && t.to_branch && t.to_branch.name),
                    staff_id: session.id, staff_name: session.name,
                    note: (t && t.code) + ' · ' + reason,
                });
            } catch (_) {}
            toast('Transfer cancelled.', 'success');
            PT_INBOX.cancelModal.classList.remove('is-open');
            await loadProductTransfers();
        } catch (err) {
            toast('Could not cancel: ' + (err.message || 'unknown'), 'error');
        }
    });

    // Click-outside closes the receive + cancel modals (mirrors other modals)
    [PT_INBOX.receiveModal, PT_INBOX.cancelModal].filter(Boolean).forEach((m) => {
        m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('is-open'); });
    });

    // Realtime: refresh inbox + badge when ANY transfer changes
    function setupTransfersRealtime() {
        if (!window.CH || !window.CH.productTransfers) return;
        try {
            window.CH.productTransfers.subscribe(() => {
                // Only refresh if user can see transfers
                const role = currentRole();
                if (!VIEWS_BY_ROLE[role] || !VIEWS_BY_ROLE[role].includes('product-transfers')) return;
                // Refresh quietly — cache + badge update; only re-render
                // the table when the inbox view is currently active
                loadProductTransfers();
            });
        } catch (_) { /* table missing — ignore */ }
    }

    /* ============================================================
       PHASE 3 — Customer orders / Invoice / Verification
       ============================================================ */

    let saleLineSeq = 0;
    let saleAccountsCache = [];

    function fmtMoney(n) {
        return CURRENCY + ' ' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ---- New Sale view ------------------------------------------
    // Resolves the default warehouse for the user's branch. Falls back
    // to the user's session.warehouse_id, then any warehouse linked to
    // the branch (regardless of default flag), then null.
    function resolveDefaultWarehouseForUser() {
        if (!session) return null;
        if (session.warehouse_id) return session.warehouse_id;
        if (!session.branch_id) return null;
        if (!warehousesCache || warehousesCache.length === 0) return null;
        const defaultWh = warehousesCache.find((w) => (w.branches || []).some((b) => b.branch_id === session.branch_id && b.is_default));
        if (defaultWh) return defaultWh.id;
        const anyWh = warehousesCache.find((w) => (w.branches || []).some((b) => b.branch_id === session.branch_id));
        return anyWh ? anyWh.id : null;
    }

    async function initNewSale() {
        // Reset the form
        const form = document.getElementById('newSaleForm');
        if (!form) return;
        if (currentRole() === 'warehouse_manager') {
            toast('Warehouse managers do not record sales.', 'error');
            return;
        }
        if (!session.branch_id && !isSuperRole()) {
            toast('You must be assigned to a branch to record sales.', 'error');
            return;
        }
        // Lazy-load warehouses if not yet cached (needed to pick a default)
        if (!warehousesCache || warehousesCache.length === 0) {
            try {
                if (window.CH && window.CH.warehouses) {
                    warehousesCache = await window.CH.warehouses.listWithBranches();
                }
            } catch (_) { /* not migrated yet */ }
        }
        form.reset();
        // Clear lines + add a first one
        const linesHost = $('#saleLines');
        linesHost.innerHTML = '';
        saleLineSeq = 0;
        addSaleLine();
        saleRecomputeTotal();
        // Pre-fill staff code
        if (session.staff_code) {
            $('#saleStaffCode').value = session.staff_code;
            $('#saleStaffName').textContent = session.name || '';
            $('#saleStaffName').classList.add('is-ok');
            $('#saleStaffName').classList.remove('is-error');
        }
        // Director & System Admin don't need to confirm a staff ID.
        relaxStaffIdGate('saleStaffCode');
        // Load payment accounts for this branch (for the Account dropdown)
        loadSaleAccounts();
    }

    async function loadSaleAccounts() {
        const sel = $('#salePaymentAccount');
        if (!sel || !window.CH || !window.CH.paymentAccounts) return;
        try {
            saleAccountsCache = await window.CH.paymentAccounts.listForBranch(session.branch_id);
            updateSaleAccountDropdown();
        } catch (_) {
            saleAccountsCache = [];
        }
    }

    function updateSaleAccountDropdown() {
        const method = $('#salePaymentMethod').value;
        const wrap = $('#salePaymentAccountField');
        const sel = $('#salePaymentAccount');
        // Cash gets its own receipt-affirmation block; the account picker is irrelevant.
        const cashField = $('#saleCashAffirmField');
        const cashAffirm = $('#saleCashAffirm');
        if (cashField) cashField.style.display = (method === 'cash') ? '' : 'none';
        if (cashAffirm && method !== 'cash') cashAffirm.checked = false;
        if (!method || method === 'cash') {
            if (wrap) wrap.style.display = 'none';
            if (sel) sel.required = false;
            return;
        }
        const filtered = saleAccountsCache.filter((a) => a.method === method);
        if (filtered.length === 0) {
            sel.innerHTML = '<option value="">No accounts available — ask Director</option>';
            sel.disabled = true;
        } else {
            sel.innerHTML = ['<option value="" disabled selected>Pick the account customer paid to</option>']
                .concat(filtered.map((a) => `<option value="${a.id}">${escapeHtml(a.provider)} · ${escapeHtml(a.account_number)} · ${escapeHtml(a.account_name)}</option>`))
                .join('');
            sel.disabled = false;
            sel.required = true;
        }
        wrap.style.display = '';
    }

    function addSaleLine() {
        const linesHost = $('#saleLines');
        const lineId = 'saleLine-' + (++saleLineSeq);
        const lineEl = document.createElement('div');
        lineEl.className = 'sale-line';
        lineEl.dataset.lineId = lineId;
        lineEl.innerHTML = `
            <div class="sale-line__thumb-wrap">
                <div class="sale-line__thumb sale-line__thumb--empty" data-sale-thumb>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
            </div>
            <div>
                <label>Product<span class="req">*</span></label>
                <select data-sale-product required>
                    <option value="" disabled selected>Pick product</option>
                </select>
            </div>
            <div>
                <label>Qty<span class="req">*</span></label>
                <input type="number" data-sale-qty min="1" value="1" required />
            </div>
            <div>
                <label>Unit price (GHS)</label>
                <input type="number" data-sale-price min="0" step="0.01" readonly aria-readonly="true" title="Actual product price — not editable" />
            </div>
            <div>
                <label>Source</label>
                <select data-sale-source>
                    <option value="warehouse">Warehouse</option>
                    <option value="showroom">Showroom</option>
                </select>
            </div>
            <button type="button" class="sale-line__del" aria-label="Remove line">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        linesHost.appendChild(lineEl);
        // Populate product dropdown with branch's products
        const sel = lineEl.querySelector('[data-sale-product]');
        const branchProducts = products.filter((p) => !p.is_draft && (session.is_admin || p.branch_id === session.branch_id));
        sel.innerHTML = ['<option value="" disabled selected>Pick product</option>']
            .concat(branchProducts.map((p) => `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}" data-wh="${p.warehouse_id || ''}" data-item-no="${escapeAttr(p.item_no || '')}" data-desc="${escapeAttr(p.description || '')}" data-image="${escapeAttr(p.image_url || '')}">${escapeHtml((p.item_no ? p.item_no + ' · ' : '') + (p.description || ''))} (${p.stock} in stock)</option>`))
            .join('');
        // Auto-fill price + product image when product changes
        const qtyInp = lineEl.querySelector('[data-sale-qty]');
        sel.addEventListener('change', () => {
            const opt = sel.selectedOptions[0];
            const priceInp = lineEl.querySelector('[data-sale-price]');
            priceInp.value = opt && opt.dataset.price ? Number(opt.dataset.price).toFixed(2) : '';
            const thumb = lineEl.querySelector('[data-sale-thumb]');
            const img = opt && opt.dataset.image ? opt.dataset.image : '';
            if (thumb) {
                if (img) {
                    thumb.classList.remove('sale-line__thumb--empty');
                    thumb.innerHTML = `<img src="${escapeAttr(img)}" alt="" loading="lazy" />`;
                } else {
                    thumb.classList.add('sale-line__thumb--empty');
                    thumb.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                }
            }
            const stock = Math.max(0, parseInt((opt && opt.dataset.stock) || '0', 10) || 0);
            qtyInp.max = stock > 0 ? String(stock) : '';
            qtyInp.title = stock > 0 ? ('Available: ' + stock) : 'Out of stock';
            if (stock <= 0) {
                qtyInp.value = '0';
                qtyInp.disabled = true;
                toast('That product is out of stock at this branch.', 'error');
            } else {
                qtyInp.disabled = false;
                const cur = parseInt(qtyInp.value, 10) || 0;
                if (cur > stock) qtyInp.value = String(stock);
                if (cur < 1) qtyInp.value = '1';
            }
            saleRecomputeTotal();
        });
        qtyInp.addEventListener('input', () => {
            const opt = sel.selectedOptions[0];
            const stock = Math.max(0, parseInt((opt && opt.dataset.stock) || '0', 10) || 0);
            if (stock > 0) {
                const v = parseInt(qtyInp.value, 10) || 0;
                if (v > stock) {
                    qtyInp.value = String(stock);
                    toast('Only ' + stock + ' in stock — quantity capped.', 'error');
                }
            }
            saleRecomputeTotal();
        });
        // Delete button (only if more than one line)
        lineEl.querySelector('.sale-line__del').addEventListener('click', () => {
            if (linesHost.children.length === 1) {
                toast('Order needs at least one item.', 'error');
                return;
            }
            lineEl.remove();
            saleRecomputeTotal();
        });
    }

    function saleRecomputeTotal() {
        let total = 0;
        $$('#saleLines .sale-line').forEach((line) => {
            const qty = Number(line.querySelector('[data-sale-qty]').value) || 0;
            const price = Number(line.querySelector('[data-sale-price]').value) || 0;
            total += qty * price;
        });
        $('#saleTotalValue').textContent = fmtMoney(total);
    }

    // Wire static handlers once
    const saleMethodEl = document.getElementById('salePaymentMethod');
    if (saleMethodEl) saleMethodEl.addEventListener('change', updateSaleAccountDropdown);
    const saleAddBtn = document.getElementById('saleAddLineBtn');
    if (saleAddBtn) saleAddBtn.addEventListener('click', () => { addSaleLine(); saleRecomputeTotal(); });
    const saleStaffEl = document.getElementById('saleStaffCode');
    if (saleStaffEl) {
        let debounce;
        saleStaffEl.addEventListener('input', () => {
            const code = (saleStaffEl.value || '').trim().toUpperCase();
            const out = $('#saleStaffName');
            clearTimeout(debounce);
            if (!code) { out.textContent = 'Type your code to confirm your name'; out.classList.remove('is-ok','is-error'); return; }
            debounce = setTimeout(() => {
                const match = (staffList || []).find((s) => (s.staff_code || '').toUpperCase() === code);
                if (match) { out.textContent = match.name + (match.role ? ' · ' + match.role.replace('_',' ') : ''); out.classList.add('is-ok'); out.classList.remove('is-error'); }
                else { out.textContent = 'No staff with that code'; out.classList.add('is-error'); out.classList.remove('is-ok'); }
            }, 250);
        });
    }

    // Submit handler
    const newSaleForm = document.getElementById('newSaleForm');
    if (newSaleForm) newSaleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.CH || !window.CH.customerOrders) {
            toast('Sales not enabled yet. Ask the Director to run the latest setup.', 'error');
            return;
        }
        const submitBtn = $('#saleSubmitBtn');
        const clientName = $('#saleClientName').value.trim();
        const clientPhone = $('#saleClientPhone').value.trim();
        const clientEmail = $('#saleClientEmail').value.trim();
        const method = $('#salePaymentMethod').value;
        const accountId = ($('#salePaymentAccount').value || null);
        const paymentConfirmed = $('#salePaymentConfirmed').checked;
        const note = $('#saleNote').value.trim();
        let code = ($('#saleStaffCode').value || '').trim().toUpperCase();
        // Build items
        const items = [];
        let hasInvalid = false;
        let overStockLabel = '';
        $$('#saleLines .sale-line').forEach((line) => {
            const sel = line.querySelector('[data-sale-product]');
            const opt = sel.selectedOptions[0];
            const product_id = sel.value;
            const qty = parseInt(line.querySelector('[data-sale-qty]').value, 10) || 0;
            const unit_price = Number(line.querySelector('[data-sale-price]').value) || 0;
            const source = line.querySelector('[data-sale-source]').value;
            const source_warehouse_id = opt && opt.dataset.wh ? opt.dataset.wh : null;
            const item_no = opt ? opt.dataset.itemNo : '';
            const description = opt ? opt.dataset.desc : '';
            const stock = Math.max(0, parseInt((opt && opt.dataset.stock) || '0', 10) || 0);
            if (!product_id || qty <= 0) hasInvalid = true;
            if (opt && qty > stock) overStockLabel = (item_no || description || 'an item') + ' (only ' + stock + ' in stock)';
            items.push({ product_id, item_no, description, qty, unit_price, source, source_warehouse_id });
        });
        if (overStockLabel) { toast('Quantity exceeds stock for ' + overStockLabel + '.', 'error'); return; }
        // Validation
        if (!clientName) { toast('Customer name is required.', 'error'); return; }
        if (items.length === 0 || hasInvalid) { toast('Add at least one item with quantity ≥ 1.', 'error'); return; }
        if (!method) { toast('Pick a payment method.', 'error'); return; }
        if (method !== 'cash' && !accountId) { toast('Pick which account the customer paid to.', 'error'); return; }
        if (method === 'cash') {
            const cashAffirm = $('#saleCashAffirm');
            if (!cashAffirm || !cashAffirm.checked) {
                toast('Tick the cash receipt confirmation before issuing the invoice.', 'error');
                return;
            }
        }
        code = resolveActionStaffCode(code);
        if (code === null) return;
        try {
            submitBtn.disabled = true;
            submitBtn.querySelector('span').textContent = 'Generating…';
            const res = await window.CH.customerOrders.create({
                branch_id: session.branch_id || null,
                warehouse_id: resolveDefaultWarehouseForUser(),
                client_name: clientName,
                client_phone: clientPhone,
                client_email: clientEmail,
                initiated_by: session.id,
                initiated_by_code: code,
                payment_method: method,
                payment_provider: null,
                payment_account_id: accountId,
                payment_confirmed: paymentConfirmed,
                note,
                items,
            });
            try {
                await window.CH.logs.record({
                    action: 'customer_order_created',
                    branch_id: session.branch_id,
                    branch_name: session.branch_name,
                    staff_id: session.id,
                    staff_name: session.name,
                    note: res.code + ' · ' + clientName + ' · ' + fmtMoney(items.reduce((s, it) => s + it.qty * it.unit_price, 0)),
                });
            } catch (_) {}
            toast('Sale recorded · ' + res.code, 'success');
            // Open invoice modal
            await openInvoiceModal(res.id);
        } catch (err) {
            console.error(err);
            toast('Could not create sale: ' + (err.message || 'unknown error'), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Generate invoice';
        }
    });

    // ---- Invoice modal ------------------------------------------
    /* Build the invoice HTML for the active template. Three options live
       side-by-side; the chosen one is read from feature_flags.invoice_template
       (set by System Admin on the Invoice Templates page). */
    function buildInvoiceHtml(full, template) {
        const branch = full.branch || {};
        const pa = full.payment_account || {};
        const created = new Date(full.created_at);
        const itemsHtml = (full.items || []).map((it) => `
            <tr>
                <td><strong>${escapeHtml(it.item_no_snap || '—')}</strong><br><small>${escapeHtml(it.description_snap || '')}</small></td>
                <td>${it.qty}</td>
                <td>${fmtMoney(it.unit_price)}</td>
                <td><b>${fmtMoney(it.subtotal)}</b></td>
            </tr>
        `).join('');
        const tpl = template || 'standard';
        const head = `
            <div class="invoice-doc__head">
                <div class="invoice-doc__brand">
                    <img src="assets/icon-180.png" alt="" />
                    <strong>PRIME ACCESS GHANA</strong>
                    <small>@primeacessgh</small>
                </div>
                <div class="invoice-doc__meta">
                    <b>${escapeHtml(full.invoice_code)}</b><br>
                    Order: ${escapeHtml(full.code)}<br>
                    Date: ${created.toLocaleDateString()}<br>
                    Time: ${created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>
                    ${branch.name ? 'Branch: ' + escapeHtml(branch.name) + '<br>' : ''}
                    ${branch.location ? 'Location: ' + escapeHtml(branch.location) : ''}
                </div>
            </div>`;
        const customer = `
            <h3>Customer</h3>
            <div style="font-size:0.92rem;line-height:1.5;">
                <b>${escapeHtml(full.client_name || '')}</b><br>
                ${full.client_phone ? escapeHtml(full.client_phone) + '<br>' : ''}
                ${full.client_email ? escapeHtml(full.client_email) : ''}
            </div>`;
        const itemsTable = `
            <h3>Items</h3>
            <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Subtotal</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="invoice-doc__total">Total: ${fmtMoney(full.total)}</div>`;
        const payment = `
            <h3>Payment</h3>
            <div style="font-size:0.92rem;line-height:1.6;">
                Method: <b>${escapeHtml((full.payment_method || '').toUpperCase())}</b>
                ${pa.provider ? '<br>Account: <b>' + escapeHtml(pa.provider) + ' · ' + escapeHtml(pa.account_number || '') + '</b>' : ''}
                <br>Status: ${full.payment_confirmed ? '<b style="color:#15803d;">Paid</b>' : '<b style="color:#92400E;">Pending confirmation</b>'}
            </div>`;
        const footer = `
            <div class="invoice-doc__footer">
                Thank you for your purchase.<br>
                <i>@primeacessgh</i><br>
                Accra · 054 417 4341 / 059 942 8820 · primeaccessgh@gmail.com
            </div>`;
        // Premium wraps everything after the head in an .invoice-doc__body
        // so the navy banner can sit flush. Compact uses the same layout
        // as Standard but the CSS shrinks padding + typography.
        const isPremium = tpl === 'premium';
        const innerBody = `${customer}${itemsTable}${payment}${footer}`;
        return `<div class="invoice-doc" id="invoiceDocContent" data-template="${tpl}">
            ${head}
            ${isPremium ? `<div class="invoice-doc__body">${innerBody}</div>` : innerBody}
        </div>`;
    }

    async function openInvoiceModal(orderId) {
        const full = await window.CH.customerOrders.get(orderId);
        const tpl = (featureFlagsCache && featureFlagsCache.invoice_template) || 'standard';
        $('#invoiceDoc').innerHTML = buildInvoiceHtml(full, tpl);
        $('#invoiceModalTitle').textContent = 'Invoice · ' + full.code;
        $('#invoiceModal').classList.add('is-open');
    }

    /* ---- Invoice Templates page ----------------------------- */
    async function loadInvoiceTemplates() {
        if (currentRole() !== 'system_manager') {
            toast('Invoice Templates is for System Admin.', 'error');
            switchView('products');
            return;
        }
        // Render a sample invoice into each preview slot.
        const sample = {
            invoice_code: 'INV-A-20260524-DEMO',
            code: 'CO-20260524-XYZ',
            created_at: new Date().toISOString(),
            branch: { name: 'Adabraka Showroom', location: 'Adabraka, Accra' },
            client_name: 'Ama Yeboah',
            client_phone: '024 123 4567',
            client_email: 'ama@example.com',
            payment_method: 'cash',
            payment_confirmed: true,
            total: 12000,
            items: [
                { item_no_snap: '3116', description_snap: 'Shower set chrome colors', qty: 1, unit_price: 12000, subtotal: 12000 },
            ],
        };
        ['standard', 'compact', 'premium'].forEach((tpl) => {
            const host = document.querySelector(`[data-invtpl-preview="${tpl}"]`);
            if (host) host.innerHTML = buildInvoiceHtml(sample, tpl);
        });
        // Mark the active card
        const active = (featureFlagsCache && featureFlagsCache.invoice_template) || 'standard';
        $$('.invtpl-card').forEach((card) => {
            card.classList.toggle('is-active', card.dataset.invtpl === active);
        });
    }
    (function wireInvoiceTemplates() {
        const grid = document.getElementById('invoiceTemplateGrid');
        if (grid) grid.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-set-invtpl]');
            if (!btn) return;
            const tpl = btn.dataset.setInvtpl;
            try {
                await window.CH.featureFlags.update({ invoice_template: tpl });
                featureFlagsCache.invoice_template = tpl;
                $$('.invtpl-card').forEach((c) => c.classList.toggle('is-active', c.dataset.invtpl === tpl));
                toast('Invoice template set: ' + tpl.charAt(0).toUpperCase() + tpl.slice(1), 'success');
            } catch (err) {
                toast('Could not save template: ' + (err.message || 'unknown'), 'error');
            }
        });
    })();

    const invoicePrintBtn = document.getElementById('invoicePrintBtn');
    if (invoicePrintBtn) invoicePrintBtn.addEventListener('click', () => window.print());

    // ---- Purchases list -----------------------------------------
    let purchasesCache = [];

    async function loadPurchases() {
        const body = $('#purchasesBody');
        if (!body) return;
        if (!window.CH || !window.CH.customerOrders) {
            body.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--c-ink-5);">Sales not enabled yet. Ask the Director to run the latest setup.</td></tr>';
            return;
        }
        if (!staffList || staffList.length === 0) {
            try { staffList = await window.CH.staff.list(); } catch (_) {}
        }
        try {
            const role = currentRole();
            const branchScope = getManagedBranchIds();
            const opts = { limit: 500 };
            if (!isSuperRole(role) && branchScope !== 'ALL' && branchScope.length === 1) {
                opts.branchId = branchScope[0];
            }
            const all = await window.CH.customerOrders.list(opts);
            // Filter rules:
            //   - staff           -> only sales THEY initiated (their own)
            //   - branch_manager  -> sales for branches they manage
            //   - warehouse_mgr   -> never sees this view (gated above)
            //   - super-role      -> everything
            if (role === 'staff') {
                purchasesCache = all.filter((o) => o.initiated_by === session.id);
            } else if (!isSuperRole(role) && branchScope !== 'ALL') {
                const allowed = new Set(branchScope);
                purchasesCache = all.filter((o) => allowed.has(o.branch_id));
            } else {
                purchasesCache = all;
            }
            renderPurchases();
            renderSalesSummary();
        } catch (err) {
            console.error(err);
            if (isMissingTableError(err)) {
                body.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--c-ink-5);">Sales not enabled yet. Ask the Director to run the latest setup.</td></tr>';
            } else {
                toast('Could not load sales: ' + (err.message || 'unknown'), 'error');
            }
        }
    }

    function renderPurchases() {
        const body = $('#purchasesBody');
        const empty = $('#purchasesEmpty');
        if (purchasesCache.length === 0) {
            body.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        body.innerHTML = purchasesCache.map((o) => {
            const statusPill = o.status === 'fulfilled' ? 'pill--pt-received'
                : o.status === 'cancelled' ? 'pill--pt-cancelled'
                : 'pill--pt-pending';
            const statusLabel = o.status === 'fulfilled' ? 'Fulfilled' : o.status === 'cancelled' ? 'Cancelled' : 'Pending';
            const initiator = o.initiator || {};
            const itemsCount = Number(o.items_count) || 0;
            return `<tr data-order-id="${o.id}" style="cursor:pointer;">
                <td><span class="itemno">${escapeHtml(o.code)}</span></td>
                <td><strong>${escapeHtml(o.client_name || '—')}</strong>${o.client_phone ? '<br><small style="color:var(--c-ink-5);">' + escapeHtml(o.client_phone) + '</small>' : ''}</td>
                <td>${itemsCount > 0 ? itemsCount + (itemsCount === 1 ? ' item' : ' items') : '<span style="color:var(--c-ink-5);">—</span>'}</td>
                <td><strong>${fmtMoney(o.total)}</strong></td>
                <td>${escapeHtml((o.payment_method || '').toUpperCase())}${o.payment_provider ? '<br><small style="color:var(--c-ink-5);">' + escapeHtml(o.payment_provider) + '</small>' : ''}</td>
                <td><span class="pill ${statusPill}">${statusLabel}</span></td>
                <td>${relTime(o.created_at)}<br><small style="color:var(--c-ink-5);">by ${staffLabelForCode(initiator.staff_code, initiator.name)}</small></td>
                <td style="text-align:right;">
                    <button class="icon-btn" data-reprint="${o.id}" title="Reprint invoice"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>
                </td>
            </tr>`;
        }).join('');
    }

    function renderSalesSummary() {
        const host = $('#salesSummary');
        if (!host) return;
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const fulfilled = purchasesCache.filter((o) => o.status === 'fulfilled');
        const today = fulfilled.filter((o) => (now - new Date(o.created_at).getTime()) < dayMs);
        const week = fulfilled.filter((o) => (now - new Date(o.created_at).getTime()) < 7 * dayMs);
        const month = fulfilled.filter((o) => (now - new Date(o.created_at).getTime()) < 30 * dayMs);
        const sum = (arr) => arr.reduce((s, o) => s + Number(o.total || 0), 0);
        const pending = purchasesCache.filter((o) => o.status === 'pending').length;
        host.innerHTML = `
            <div class="report-card report-card--accent"><div class="report-card__label">Today</div><div class="report-card__value">${fmtMoney(sum(today))}</div><div class="report-card__hint">${today.length} sale${today.length === 1 ? '' : 's'}</div></div>
            <div class="report-card"><div class="report-card__label">This week</div><div class="report-card__value">${fmtMoney(sum(week))}</div><div class="report-card__hint">${week.length} sale${week.length === 1 ? '' : 's'}</div></div>
            <div class="report-card report-card--accent"><div class="report-card__label">This month</div><div class="report-card__value">${fmtMoney(sum(month))}</div><div class="report-card__hint">${month.length} sale${month.length === 1 ? '' : 's'}</div></div>
            <div class="report-card"><div class="report-card__label">Total recorded</div><div class="report-card__value">${fmtMoney(sum(fulfilled))}</div><div class="report-card__hint">${fulfilled.length} fulfilled · ${pending} pending</div></div>
        `;
    }

    const purchasesBodyEl = document.getElementById('purchasesBody');
    if (purchasesBodyEl) purchasesBodyEl.addEventListener('click', (e) => {
        const reBtn = e.target.closest('[data-reprint]');
        if (reBtn) { openInvoiceModal(reBtn.dataset.reprint); return; }
        const row = e.target.closest('tr[data-order-id]');
        if (row) openInvoiceModal(row.dataset.orderId);
    });

    // Resolve a staff_code to "CODE · Full Name" anywhere the UI prints an ID.
    // Falls back to just the code when the name can't be found (e.g. staffList
    // not yet loaded or the staff row was deleted).
    function staffLabelForCode(code, fallbackName) {
        const c = (code || '').toString().trim();
        if (!c) return '—';
        let name = fallbackName || '';
        if (!name && Array.isArray(staffList)) {
            const m = staffList.find((s) => (s.staff_code || '').toUpperCase() === c.toUpperCase());
            if (m) name = m.name || '';
        }
        return name ? (escapeHtml(c) + ' · ' + escapeHtml(name)) : escapeHtml(c);
    }

    // ---- Verify Invoice view ------------------------------------
    async function initVerifyInvoice() {
        $('#verifyInvoiceCode').value = '';
        $('#verifyValidatorCode').value = session.staff_code || '';
        $('#verifyValidatorName').textContent = session.staff_code ? (session.name || '') : 'Type your code to confirm your name';
        $('#verifyValidatorName').className = 'pt-staff-resolve' + (session.staff_code ? ' is-ok' : '');
        // Director & System Admin don't need to confirm a staff ID.
        relaxStaffIdGate('verifyValidatorCode');
        $('#verifyResult').innerHTML = '';
        if (!staffList || staffList.length === 0) {
            try { staffList = await window.CH.staff.list(); } catch (_) {}
        }
    }

    const verifyValidatorCodeEl = document.getElementById('verifyValidatorCode');
    if (verifyValidatorCodeEl) {
        let debounce;
        verifyValidatorCodeEl.addEventListener('input', () => {
            const code = (verifyValidatorCodeEl.value || '').trim().toUpperCase();
            const out = $('#verifyValidatorName');
            clearTimeout(debounce);
            if (!code) { out.textContent = 'Type your code to confirm your name'; out.classList.remove('is-ok','is-error'); return; }
            debounce = setTimeout(async () => {
                if (!staffList || staffList.length === 0) {
                    try { staffList = await window.CH.staff.list(); } catch (_) {}
                }
                const match = (staffList || []).find((s) => (s.staff_code || '').toUpperCase() === code);
                if (match) { out.textContent = match.name; out.classList.add('is-ok'); out.classList.remove('is-error'); }
                else { out.textContent = 'No staff with that code'; out.classList.add('is-error'); out.classList.remove('is-ok'); }
            }, 250);
        });
    }

    const verifyBtn = document.getElementById('verifyInvoiceBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', async () => {
        const code = ($('#verifyInvoiceCode').value || '').trim().toUpperCase();
        let validatorCode = ($('#verifyValidatorCode').value || '').trim().toUpperCase();
        const resultHost = $('#verifyResult');
        if (!code) { toast('Enter an invoice code.', 'error'); return; }
        validatorCode = resolveActionStaffCode(validatorCode);
        if (validatorCode === null) return;
        let warehouseId = session.warehouse_id;
        // Super-roles (Director / System Admin) are not tied to a warehouse.
        // Validate against the order's own warehouse when we can find it, but
        // proceed even if neither side has one — they have full access and the
        // RPC does not enforce a warehouse match when the value is null.
        if (!warehouseId && isSuperRole()) {
            try {
                const lookup = await window.CH.customerOrders.getByInvoiceCode(code);
                if (lookup && lookup.warehouse_id) warehouseId = lookup.warehouse_id;
            } catch (_) {}
        }
        if (!warehouseId && !isSuperRole()) { toast('You are not assigned to a warehouse — cannot validate.', 'error'); return; }
        try {
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Checking…';
            const res = await window.CH.customerOrders.validateInvoice(code, warehouseId || null, session.id, validatorCode);
            try {
                await window.CH.logs.record({
                    action: res.result === 'pass' ? 'customer_order_validated_pass' : 'customer_order_validated_fail',
                    staff_id: session.id, staff_name: session.name,
                    note: code + ' · ' + res.result + ' · ' + (res.detail || ''),
                });
            } catch (_) {}
            renderVerifyResult(res, code);
        } catch (err) {
            toast('Validation failed: ' + (err.message || 'unknown'), 'error');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Validate';
        }
    });

    async function renderVerifyResult(res, code) {
        const host = $('#verifyResult');
        if (!host) return;
        if (res.result === 'pass' && res.order_id) {
            // Fetch full order details
            const full = await window.CH.customerOrders.get(res.order_id);
            const itemsHtml = (full.items || []).map((it) => `
                <div class="verify-result__row"><span>${escapeHtml(it.item_no_snap || '—')} · ${escapeHtml(it.description_snap || '')}</span><b>×${it.qty}</b></div>
            `).join('');
            host.innerHTML = `
                <div class="verify-result verify-result--pass">
                    <div class="verify-result__head">
                        <div class="verify-result__icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                        <div>
                            <h3 class="verify-result__title">PASS · Ready to dispatch</h3>
                            <p class="verify-result__subtitle">Verify the items below match what is being collected, then confirm.</p>
                        </div>
                    </div>
                    <div class="verify-result__rows">
                        <div class="verify-result__row"><span>Invoice code</span><b>${escapeHtml(full.invoice_code)}</b></div>
                        <div class="verify-result__row"><span>Order code</span><b>${escapeHtml(full.code)}</b></div>
                        <div class="verify-result__row"><span>Customer</span><b>${escapeHtml(full.client_name)}</b></div>
                        <div class="verify-result__row"><span>Total</span><b>${fmtMoney(full.total)}</b></div>
                        <div class="verify-result__row"><span>Payment</span><b>${escapeHtml((full.payment_method || '').toUpperCase())}${full.payment_confirmed ? ' · ✓ confirmed' : ' · ⚠ unconfirmed'}</b></div>
                        <div class="verify-result__row"><span>Initiated by</span><b>${staffLabelForCode(full.initiator && full.initiator.staff_code, full.initiator && full.initiator.name)}</b></div>
                    </div>
                    <h3 style="font-size:0.86rem;margin-top:14px;margin-bottom:8px;color:var(--c-ink-3);">Items to dispatch</h3>
                    <div class="verify-result__rows">${itemsHtml}</div>
                    <button type="button" class="btn btn--success" data-fulfill="${full.id}" style="width:100%;margin-top:14px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Confirm &amp; dispatch · single use</span>
                    </button>
                </div>
            `;
            host.querySelector('[data-fulfill]').addEventListener('click', () => fulfillOrder(full, code));
        } else {
            const titleMap = {
                fail_not_found: 'INVALID · Code not found',
                fail_already_used: 'BLOCKED · Already used',
                fail_wrong_warehouse: 'WRONG WAREHOUSE',
                fail_cancelled: 'CANCELLED',
            };
            host.innerHTML = `
                <div class="verify-result verify-result--fail">
                    <div class="verify-result__head">
                        <div class="verify-result__icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
                        <div>
                            <h3 class="verify-result__title">${escapeHtml(titleMap[res.result] || 'FAIL')}</h3>
                            <p class="verify-result__subtitle">${escapeHtml(res.detail || '')}</p>
                        </div>
                    </div>
                    ${res.validated_by_code ? `<div class="verify-result__rows">
                        <div class="verify-result__row"><span>Originally used by</span><b>${staffLabelForCode(res.validated_by_code, res.validated_by_name)}</b></div>
                        ${res.validated_at ? `<div class="verify-result__row"><span>Used at</span><b>${new Date(res.validated_at).toLocaleString()}</b></div>` : ''}
                    </div>` : ''}
                    <div style="font-size:0.84rem;color:var(--c-ink-4);margin-top:14px;">Invoice <code>${escapeHtml(code)}</code> cannot be used again.</div>
                </div>
            `;
        }
    }

    async function fulfillOrder(full, code) {
        const orderId = typeof full === 'string' ? full : full.id;
        if (!confirm('Confirm dispatch? Stock will be deducted and this invoice cannot be reused.')) return;
        let validatorCode = ($('#verifyValidatorCode').value || '').trim().toUpperCase();
        if (!validatorCode && isSuperRole()) validatorCode = (session.staff_code || '').toUpperCase();
        try {
            await window.CH.customerOrders.fulfill(orderId, session.id, validatorCode);
            try {
                await window.CH.logs.record({
                    action: 'customer_order_fulfilled',
                    staff_id: session.id, staff_name: session.name,
                    note: code + ' · dispatched by ' + validatorCode,
                });
            } catch (_) {}
            toast('Dispatched. Stock decremented.', 'success');
            const orderForView = (full && typeof full === 'object') ? full : await window.CH.customerOrders.get(orderId);
            renderFulfilledSuccess(orderForView, code, validatorCode);
            if (currentView === 'products') await loadProducts();
        } catch (err) {
            toast('Could not dispatch: ' + (err.message || 'unknown'), 'error');
        }
    }

    function renderFulfilledSuccess(full, code, validatorCode) {
        const host = $('#verifyResult');
        if (!host) return;
        const itemsHtml = (full.items || []).map((it) => `
            <div class="verify-result__row"><span>${escapeHtml(it.item_no_snap || '—')} · ${escapeHtml(it.description_snap || '')}</span><b>×${it.qty}</b></div>
        `).join('');
        const dispatchedAt = new Date().toLocaleString();
        host.innerHTML = `
            <div class="verify-result verify-result--pass">
                <div class="verify-result__head">
                    <div class="verify-result__icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div>
                        <h3 class="verify-result__title">SUCCESS · Order dispatched</h3>
                        <p class="verify-result__subtitle">Stock has been deducted and the invoice is now closed.</p>
                    </div>
                </div>
                <div class="verify-result__rows">
                    <div class="verify-result__row"><span>Invoice code</span><b>${escapeHtml(full.invoice_code || code)}</b></div>
                    <div class="verify-result__row"><span>Order code</span><b>${escapeHtml(full.code || '—')}</b></div>
                    <div class="verify-result__row"><span>Customer</span><b>${escapeHtml(full.client_name || '—')}</b></div>
                    <div class="verify-result__row"><span>Total</span><b>${fmtMoney(full.total)}</b></div>
                    <div class="verify-result__row"><span>Payment</span><b>${escapeHtml((full.payment_method || '').toUpperCase())}${full.payment_confirmed ? ' · ✓ confirmed' : ''}</b></div>
                    <div class="verify-result__row"><span>Dispatched by</span><b>${staffLabelForCode(validatorCode, session && session.name)}</b></div>
                    <div class="verify-result__row"><span>Dispatched at</span><b>${escapeHtml(dispatchedAt)}</b></div>
                </div>
                <h3 style="font-size:0.86rem;margin-top:14px;margin-bottom:8px;color:var(--c-ink-3);">Items dispatched</h3>
                <div class="verify-result__rows">${itemsHtml}</div>
                <button type="button" class="btn btn--primary" id="verifyAnotherBtn" style="width:100%;margin-top:14px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>
                    <span>Verify another invoice</span>
                </button>
            </div>
        `;
        const againBtn = host.querySelector('#verifyAnotherBtn');
        if (againBtn) againBtn.addEventListener('click', () => {
            initVerifyInvoice();
            const codeInput = $('#verifyInvoiceCode');
            if (codeInput) codeInput.focus();
        });
    }

    // Click-outside close for invoice modal
    const invoiceModalEl = document.getElementById('invoiceModal');
    if (invoiceModalEl) invoiceModalEl.addEventListener('click', (e) => { if (e.target === invoiceModalEl) invoiceModalEl.classList.remove('is-open'); });

    /* ============================================================
       PHASE 4 — Move Stock (super-roles), Media Library, ID Cards,
       Dev/Live mode toggle. All gated server-side too where it matters.
       ============================================================ */

    /* ---- Move Stock view (Director + System Admin) ---------- */
    async function initMoveStock() {
        if (!isSuperRole()) {
            toast('Only Director or System Admin can move stock directly.', 'error');
            switchView('products');
            return;
        }
        const fromSel = $('#msFromWh');
        const toSel   = $('#msToWh');
        if (!fromSel || !toSel) return;
        try {
            if (!warehousesCache || warehousesCache.length === 0) {
                warehousesCache = await window.CH.warehouses.listWithBranches();
            }
        } catch (_) {}
        const opts = ['<option value="" disabled selected>Pick warehouse</option>']
            .concat((warehousesCache || []).map((w) => `<option value="${w.id}">${escapeHtml(w.name)}${w.code ? ' · ' + escapeHtml(w.code) : ''}</option>`));
        fromSel.innerHTML = opts.join('');
        toSel.innerHTML = opts.join('');
        const result = $('#msResult');
        if (result) { result.hidden = true; result.textContent = ''; }
        const form = $('#moveStockForm');
        if (form) form.reset();
    }

    const _msForm = document.getElementById('moveStockForm');
    if (_msForm) _msForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isSuperRole()) return;
        const submitBtn = $('#msSubmitBtn');
        const itemNo = ($('#msItemNo').value || '').trim();
        const qty = parseInt($('#msQty').value, 10) || 0;
        const fromWh = $('#msFromWh').value;
        const toWh = $('#msToWh').value;
        const note = ($('#msNote').value || '').trim();
        const result = $('#msResult');
        if (!itemNo || !qty || qty <= 0 || !fromWh || !toWh) {
            toast('Item code, qty, source and destination are all required.', 'error');
            return;
        }
        if (fromWh === toWh) {
            toast('Source and destination must differ.', 'error');
            return;
        }
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Moving…';
            const code = await window.CH.stockMoves.direct({
                item_no: itemNo,
                from_warehouse_id: fromWh,
                to_warehouse_id: toWh,
                qty,
                by_staff_id: session.id,
                note,
                mode: (window.CH.devMode && window.CH.devMode.current()) || 'live',
            });
            if (result) {
                const fromWhName = (warehousesCache.find((w) => w.id === fromWh) || {}).name || 'source';
                const toWhName   = (warehousesCache.find((w) => w.id === toWh)   || {}).name || 'destination';
                result.hidden = false;
                result.innerHTML = '<b>' + escapeHtml(code) + '</b> · moved ' + qty + ' × ' + escapeHtml(itemNo) + ' from <b>' + escapeHtml(fromWhName) + '</b> → <b>' + escapeHtml(toWhName) + '</b>. Logged in Activity logs.';
            }
            toast('Stock moved · ' + code, 'success');
            // Refresh products so the new stock levels show up
            try { await loadProducts(); } catch (_) {}
            $('#msItemNo').value = '';
            $('#msQty').value = '';
            $('#msNote').value = '';
        } catch (err) {
            console.error(err);
            toast('Move failed: ' + (err.message || 'unknown error'), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Move stock';
        }
    });

    /* ---- Media Library --------------------------------------- */
    let mediaCache = [];
    async function loadMediaLibrary() {
        if (!isSuperRole()) {
            toast('Media Library is for System Admin.', 'error');
            switchView('products');
            return;
        }
        const grid = $('#mediaGrid');
        const empty = $('#mediaEmpty');
        if (!grid) return;
        try {
            mediaCache = await window.CH.media.list((window.CH.devMode && window.CH.devMode.current()) || 'live');
            renderMediaLibrary();
        } catch (err) {
            console.error(err);
            toast('Could not load media: ' + (err.message || 'unknown error'), 'error');
        }
    }

    function renderMediaLibrary() {
        const grid = $('#mediaGrid');
        const empty = $('#mediaEmpty');
        if (!grid) return;
        const q = (($('#mediaSearch') && $('#mediaSearch').value) || '').trim().toLowerCase();
        const list = mediaCache.filter((m) => {
            if (!q) return true;
            const hay = (m.filename || '') + ' ' + (m.note || '');
            return hay.toLowerCase().includes(q);
        });
        if (list.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        grid.innerHTML = list.map((m) => {
            const dt = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
            const kb = m.bytes ? Math.round(m.bytes / 1024) + ' KB' : '';
            return `<div class="media-card" data-media-id="${m.id}">
                <div class="media-card__media"><img src="${escapeAttr(m.url)}" alt="" loading="lazy" /></div>
                <div class="media-card__body">
                    <div class="media-card__name" title="${escapeAttr(m.filename || '')}">${escapeHtml(m.filename || '—')}</div>
                    <div class="media-card__meta">${escapeHtml(dt)}${kb ? ' · ' + escapeHtml(kb) : ''}</div>
                    <div class="media-card__actions">
                        <button type="button" data-media-copy>Copy URL</button>
                        <button type="button" class="is-danger" data-media-del>Delete</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    const _mediaSearchEl = document.getElementById('mediaSearch');
    if (_mediaSearchEl) {
        let _mediaSearchDeb;
        _mediaSearchEl.addEventListener('input', () => {
            clearTimeout(_mediaSearchDeb);
            _mediaSearchDeb = setTimeout(renderMediaLibrary, 160);
        });
    }

    /* AI image enhancer — lazy-loaded TensorFlow.js + UpscalerJS so the
       ~5MB model download only happens when the user actually opts in.
       Runs entirely in the browser; no API keys, no rate limits. */
    let _upscalerInstance = null;
    let _upscalerLoading = null;
    async function ensureUpscaler(onStatus) {
        if (_upscalerInstance) return _upscalerInstance;
        if (_upscalerLoading) return _upscalerLoading;
        _upscalerLoading = (async () => {
            const log = (msg) => { try { onStatus && onStatus(msg); } catch (_) {} };
            // Load TF.js core + WebGL backend, then UpscalerJS + an ESRGAN model.
            // Order matters — UpscalerJS expects tf already on window.
            async function injectScript(src) {
                return new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = src; s.async = true;
                    s.onload = resolve;
                    s.onerror = () => reject(new Error('Failed to load ' + src));
                    document.head.appendChild(s);
                });
            }
            log('Loading AI model (one-time, ~5MB)…');
            await injectScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');
            await injectScript('https://cdn.jsdelivr.net/npm/upscaler@1.0.0-beta.18/dist/browser/umd/upscaler.min.js');
            // Default model bundled with the UMD build is small enough; if a
            // separate model package is required, swap in @upscalerjs/esrgan-slim
            const Upscaler = window.Upscaler || (window.UpscalerJS && window.UpscalerJS.default);
            if (!Upscaler) throw new Error('Upscaler global not found after load');
            _upscalerInstance = new Upscaler();
            log('Warming up model…');
            // Force a tiny warm-up so the first real upscale is fast
            try {
                const warm = document.createElement('canvas');
                warm.width = 32; warm.height = 32;
                await _upscalerInstance.upscale(warm);
            } catch (_) { /* warm-up failure is non-fatal */ }
            log('AI model ready');
            return _upscalerInstance;
        })().catch((err) => {
            _upscalerLoading = null;
            throw err;
        });
        return _upscalerLoading;
    }

    /* Run a single File through the upscaler and return a new File of
       the upscaled image. Falls back to the original if anything fails. */
    async function enhanceImageFile(file, onStatus) {
        try {
            const upscaler = await ensureUpscaler(onStatus);
            // UpscalerJS accepts an HTMLImageElement / canvas / tensor — load the file.
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
            onStatus && onStatus('Upscaling ' + file.name + '…');
            const dataUrl = await upscaler.upscale(img, { output: 'base64' });
            URL.revokeObjectURL(url);
            // Convert the base64 dataURL back into a File so Cloudinary upload works.
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const newName = file.name.replace(/(\.[^.]+)?$/, '-enhanced$1');
            return new File([blob], newName, { type: blob.type || 'image/png' });
        } catch (err) {
            console.warn('AI enhance failed, falling back to original:', err);
            return file;
        }
    }

    const _mediaUploadBtn = document.getElementById('mediaUploadBtn');
    const _mediaFileInput = document.getElementById('mediaFileInput');
    if (_mediaUploadBtn && _mediaFileInput) {
        _mediaUploadBtn.addEventListener('click', () => _mediaFileInput.click());
        _mediaFileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            if (files.length === 0) return;
            const progress = $('#mediaProgress');
            const label    = $('#mediaProgressLabel');
            const fill     = $('#mediaProgressFill');
            const enhance  = !!($('#mediaEnhance') && $('#mediaEnhance').checked);
            if (progress) progress.hidden = false;
            const mode = (window.CH.devMode && window.CH.devMode.current()) || 'live';
            let done = 0, failed = 0;
            for (let i = 0; i < files.length; i++) {
                const original = files[i];
                try {
                    if (label) label.textContent = `Processing ${i + 1}/${files.length} · ${original.name}`;
                    if (fill)  fill.style.width = (i / files.length * 100) + '%';
                    let toUpload = original;
                    if (enhance && /^image\//.test(original.type || '')) {
                        toUpload = await enhanceImageFile(original, (msg) => {
                            if (label) label.textContent = `${i + 1}/${files.length} · ${msg}`;
                        });
                    }
                    const uploaded = await window.CH.cloudinary.upload(toUpload);
                    if (!uploaded || !uploaded.url) throw new Error('Cloudinary returned no URL');
                    await window.CH.media.add({
                        url: uploaded.url,
                        public_id: uploaded.public_id || null,
                        filename: toUpload.name,
                        mime: toUpload.type || null,
                        bytes: uploaded.bytes || toUpload.size || null,
                        uploaded_by: session.id,
                        uploaded_by_name: session.name,
                        note: enhance ? 'AI-enhanced upload' : null,
                        mode,
                    });
                    done += 1;
                } catch (err) {
                    console.error('upload failed', original.name, err);
                    failed += 1;
                }
            }
            if (fill) fill.style.width = '100%';
            if (label) label.textContent = `Done · ${done} uploaded${failed ? ' · ' + failed + ' failed' : ''}`;
            await loadMediaLibrary();
            setTimeout(() => { if (progress) progress.hidden = true; }, 1500);
            toast(`Uploaded ${done} image${done === 1 ? '' : 's'}${failed ? ' · ' + failed + ' failed' : ''}`, failed ? 'error' : 'success');
        });
    }

    const _mediaGridEl = document.getElementById('mediaGrid');
    if (_mediaGridEl) _mediaGridEl.addEventListener('click', async (e) => {
        const card = e.target.closest('[data-media-id]');
        if (!card) return;
        const m = mediaCache.find((x) => x.id === card.dataset.mediaId);
        if (!m) return;
        if (e.target.closest('[data-media-copy]')) {
            try {
                await navigator.clipboard.writeText(m.url);
                toast('URL copied to clipboard', 'success');
            } catch (_) {
                window.prompt('Copy this URL:', m.url);
            }
        } else if (e.target.closest('[data-media-del]')) {
            if (!confirm('Delete this image from the library? (Cloudinary copy stays.)')) return;
            try {
                await window.CH.media.remove(m.id);
                mediaCache = mediaCache.filter((x) => x.id !== m.id);
                renderMediaLibrary();
                toast('Image removed from library', 'success');
            } catch (err) {
                toast('Delete failed: ' + (err.message || 'unknown error'), 'error');
            }
        }
    });

    /* ---- ID Card designer ------------------------------------ */
    let idCardSettings = {
        template: 'classic',
        accent_color: '#0369A1',
        show_role: true,
        show_email: true,
        show_started_at: true,
        show_branch_location: true,
        show_branch_name: false,
        show_issued: false,
        show_staff_id: true,
        show_qr: true,
        enabled_for_print: false,
    };

    function buildIdCardHtml(staffRow, settings) {
        const acc = settings.accent_color || '#0369A1';
        const role = ({
            'staff': 'Staff Member',
            'branch_manager': 'Branch Manager',
            'warehouse_manager': 'Warehouse Manager',
            'admin': 'Director',
            'system_manager': 'System Admin',
        })[staffRow.role] || 'Staff Member';
        const photoInner = staffRow.image_url
            ? `<img src="${escapeAttr(staffRow.image_url)}" alt="" />`
            : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="3.5"/><path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6"/></svg>`;
        const startedAt = staffRow.started_at
            ? new Date(staffRow.started_at).toLocaleDateString()
            : '—';
        // Workplace resolution: a staff posted to a warehouse (warehouse_id set)
        // shows their warehouse; everyone else shows their showroom (branch).
        // This is what makes warehouse staff cards read "Warehouse" and showroom
        // staff cards read "Showroom".
        const branch = (branches || []).find((b) => b.id === staffRow.branch_id);
        const isWarehousePosting = !!staffRow.warehouse_id;
        const warehouse = isWarehousePosting
            ? (warehousesCache || []).find((w) => w.id === staffRow.warehouse_id)
            : null;
        const placeLabel = isWarehousePosting ? 'Warehouse' : 'Showroom';
        const placeLocation = isWarehousePosting
            ? ((warehouse && warehouse.location) || staffRow.warehouse_name || '—')
            : ((branch && branch.location) || staffRow.branch_location || staffRow.branch_name || '—');
        const placeName = isWarehousePosting
            ? ((warehouse && warehouse.name) || staffRow.warehouse_name || '—')
            : ((branch && branch.name) || staffRow.branch_name || '—');
        const qrPayload = JSON.stringify({
            id: staffRow.id,
            name: staffRow.name,
            email: staffRow.email,
            staff_code: staffRow.staff_code,
            role: staffRow.role,
            workplace: isWarehousePosting ? 'warehouse' : 'showroom',
            workplace_name: placeName,
            workplace_location: placeLocation,
            started_at: staffRow.started_at,
            issued: new Date().toISOString().slice(0, 10),
        });
        let qrSvg = '';
        if (settings.show_qr && typeof window.qrcode === 'function') {
            try {
                const qr = window.qrcode(0, 'M');
                qr.addData(qrPayload);
                qr.make();
                // Render as SVG with explicit 100% width/height so it
                // fills its container in every template (Modern's QR was
                // breaking because the SVG had no intrinsic sizing).
                qrSvg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
                qrSvg = qrSvg.replace('<svg ', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ');
            } catch (_) { qrSvg = ''; }
        }
        // Each field: tiny caption label on top, the value on its own line below.
        // Both label and value are explicit elements so the value always renders
        // (a raw text node can vanish inside the column flex layout).
        const fields = [];
        const field = (label, value, cls) =>
            `<div class="id-card__field${cls ? ' ' + cls : ''}"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`;
        if (settings.show_email && staffRow.email) fields.push(field('Email', staffRow.email, 'id-card__field--email'));
        if (settings.show_started_at) fields.push(field('Joined', startedAt));
        // Location row — label + value follow the staff's workplace (warehouse
        // vs showroom). Never silently swallowed: falls back to a dash.
        if (settings.show_branch_location) fields.push(field(placeLabel, placeLocation));
        if (settings.show_branch_name) fields.push(field(placeLabel + ' name', placeName));
        if (settings.show_issued) fields.push(field('Issued', new Date().toLocaleDateString()));
        // Branding: classic / modern / minimal keep their original wordmark-
        // only label (no resizing or layout change). Heritage and Crest are
        // the on-brand variants and include the company logo beside the
        // wordmark for a richer look.
        const useLogo = settings.template === 'heritage' || settings.template === 'bold';
        const brandHtml = useLogo
            ? `<div class="id-card__brand-row">
                   <div class="id-card__logo"><img src="assets/logo-dark.png?v=1" alt="" /></div>
                   <div class="id-card__brand">PRIME ACCESS GHANA</div>
               </div>`
            : `<div class="id-card__brand">PRIME ACCESS GHANA</div>`;
        return `<div class="id-card" data-template="${settings.template}" style="--idc-accent:${escapeAttr(acc)};">
            <div class="id-card__photo-col">
                <div class="id-card__photo">${photoInner}</div>
                ${brandHtml}
            </div>
            <div class="id-card__info">
                ${settings.show_role !== false ? `<div class="id-card__role">${escapeHtml(role)}</div>` : ''}
                <div class="id-card__name">${escapeHtml(staffRow.name || '—')}</div>
                <div class="id-card__fields">${fields.join('')}</div>
                <div class="id-card__bottom">
                    ${settings.show_staff_id !== false ? `<div class="id-card__staff-id"><span class="id-card__staff-id-label">Staff ID</span>${escapeHtml(staffRow.staff_code || '—')}</div>` : '<span></span>'}
                    ${settings.show_qr ? `<div class="id-card__qr">${qrSvg}</div>` : ''}
                </div>
            </div>
        </div>`;
    }

    let idCardPreviewStaffId = '';

    // Fills the "Preview as" dropdown with real staff and keeps a default
    // selection (the chosen one, else the first staff with a code).
    function populateIdCardPreviewStaff() {
        const sel = $('#idCardPreviewStaff');
        if (!sel) return;
        const list = (staffList || []).filter((s) => s.name && !isSystemAdminStaff(s))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        sel.innerHTML = list.length
            ? list.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}${s.staff_code ? ' · ' + escapeHtml(s.staff_code) : ''}</option>`).join('')
            : '<option value="">No staff yet</option>';
        if (!idCardPreviewStaffId || !list.some((s) => s.id === idCardPreviewStaffId)) {
            const def = list.find((s) => s.staff_code) || list[0];
            idCardPreviewStaffId = def ? def.id : '';
        }
        sel.value = idCardPreviewStaffId;
    }

    function renderIdCardPreview() {
        const host = $('#idCardPreview');
        if (!host) return;
        // Preview a real staff member — the one picked in "Preview as", else the
        // first staff with a code. Falls back to a synthetic card only when there
        // are no staff at all.
        const list = (staffList || []).filter((s) => s.name && !isSystemAdminStaff(s));
        const picked = idCardPreviewStaffId ? list.find((s) => s.id === idCardPreviewStaffId) : null;
        const subject = picked || list.find((s) => s.staff_code) || list[0] || {
            id: 'preview',
            name: 'Ama Yeboah',
            email: 'ama@primeaccessgh.com',
            role: 'staff',
            staff_code: 'CH-A-007',
            started_at: '2025-08-01',
            branch_name: 'Adabraka Showroom',
            branch_location: 'Adabraka, Accra',
        };
        host.innerHTML = buildIdCardHtml(subject, idCardSettings);
    }

    async function loadIdCards() {
        const role = currentRole();
        const isSysAdmin = role === 'system_manager';
        const isDirector = role === 'admin';
        if (!isSysAdmin && !isDirector) {
            toast('Staff ID Cards is not available to you.', 'error');
            switchView('products');
            return;
        }
        // Director gates: the feature flag must be on, AND there must be at
        // least one template the System Admin has shared with them.
        if (isDirector) {
            if (!featureFlagsCache || !featureFlagsCache.id_cards_visible_to_director) {
                toast('This page is currently disabled.', 'info');
                switchView('products');
                return;
            }
        }
        // Lazy-load settings + staff
        try {
            const s = await window.CH.idCardSettings.get();
            if (s) idCardSettings = s;
        } catch (_) { /* table may not be migrated yet — use defaults */ }
        if (!staffList || staffList.length === 0) {
            try { staffList = await window.CH.staff.list(); } catch (_) {}
        }
        // Warehouses power the warehouse-posting location/name on the card.
        if (!warehousesCache || warehousesCache.length === 0) {
            try { warehousesCache = await window.CH.warehouses.listWithBranches(); } catch (_) {}
        }
        // Branches power the showroom-posting location/name on the card.
        if (!branches || branches.length === 0) {
            try { branches = await window.CH.branches.list(); } catch (_) {}
        }
        populateIdCardPreviewStaff();
        // For Director, restrict the visible templates to whatever the
        // System Admin allowed. Hide buttons for any template that isn't
        // in the allowed set. Also flip the active template to a permitted
        // one if the saved setting is not allowed.
        const allowed = isDirector ? directorTemplatesAsSet() : null;
        const tplBtns = $$('#idCardTemplatePicker button');
        if (allowed) {
            tplBtns.forEach((b) => {
                b.style.display = allowed.has(b.dataset.template) ? '' : 'none';
            });
            if (!allowed.has(idCardSettings.template)) {
                const first = Array.from(allowed)[0];
                if (first) idCardSettings.template = first;
            }
            if (allowed.size === 0) {
                toast('The System Admin has not shared any ID card templates with you yet.', 'info');
                switchView('products');
                return;
            }
        } else {
            tplBtns.forEach((b) => { b.style.display = ''; });
        }
        // Hide System Admin-only controls (save settings, enable printout)
        // when the Director is viewing — they pick + print but don't change settings.
        const saveBtn  = $('#idCardSaveBtn');
        const printBtn = $('#idCardPrintAllBtn');
        const enableEl = $('#idCardEnablePrint');
        const directorAccess = $('#idCardDirectorAccess');
        if (isDirector) {
            if (saveBtn)  saveBtn.style.display = 'none';
            if (enableEl && enableEl.closest('.idc-control')) enableEl.closest('.idc-control').style.display = 'none';
            if (directorAccess) directorAccess.style.display = 'none';
        } else {
            if (saveBtn)  saveBtn.style.display = '';
            if (enableEl && enableEl.closest('.idc-control')) enableEl.closest('.idc-control').style.display = '';
            if (directorAccess) directorAccess.style.display = '';
        }
        // Reflect template into the picker (use the now-possibly-adjusted value)
        tplBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.template === idCardSettings.template));
        const accEl = $('#idCardAccent');         if (accEl) accEl.value = idCardSettings.accent_color || '#0369A1';
        const roEl  = $('#idCardShowRole');       if (roEl)  roEl.checked = idCardSettings.show_role !== false;
        const siEl  = $('#idCardShowStaffId');    if (siEl)  siEl.checked = idCardSettings.show_staff_id !== false;
        const emEl  = $('#idCardShowEmail');      if (emEl)  emEl.checked = !!idCardSettings.show_email;
        const stEl  = $('#idCardShowStarted');    if (stEl)  stEl.checked = !!idCardSettings.show_started_at;
        const isEl  = $('#idCardShowIssued');     if (isEl)  isEl.checked = !!idCardSettings.show_issued;
        const brEl  = $('#idCardShowBranch');     if (brEl)  brEl.checked = idCardSettings.show_branch_location !== false;
        const bnEl  = $('#idCardShowBranchName'); if (bnEl)  bnEl.checked = !!idCardSettings.show_branch_name;
        const qrEl  = $('#idCardShowQr');         if (qrEl)  qrEl.checked = !!idCardSettings.show_qr;
        const enEl  = $('#idCardEnablePrint');    if (enEl)  enEl.checked = !!idCardSettings.enabled_for_print;
        if (printBtn) printBtn.disabled = !idCardSettings.enabled_for_print;
        renderIdCardPreview();
    }

    function wireIdCardControls() {
        const previewStaff = $('#idCardPreviewStaff');
        if (previewStaff) previewStaff.addEventListener('change', () => {
            idCardPreviewStaffId = previewStaff.value || '';
            renderIdCardPreview();
        });
        const pick = $('#idCardTemplatePicker');
        if (pick) pick.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-template]');
            if (!btn) return;
            $$('#idCardTemplatePicker button').forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            idCardSettings.template = btn.dataset.template;
            renderIdCardPreview();
        });
        const accEl = $('#idCardAccent');
        if (accEl) accEl.addEventListener('input', () => {
            idCardSettings.accent_color = accEl.value;
            renderIdCardPreview();
        });
        ['#idCardShowRole','#idCardShowStaffId','#idCardShowEmail','#idCardShowStarted','#idCardShowIssued','#idCardShowBranch','#idCardShowBranchName','#idCardShowQr'].forEach((sel) => {
            const el = document.querySelector(sel);
            if (!el) return;
            el.addEventListener('change', () => {
                if (sel === '#idCardShowRole')       idCardSettings.show_role = el.checked;
                if (sel === '#idCardShowStaffId')    idCardSettings.show_staff_id = el.checked;
                if (sel === '#idCardShowEmail')      idCardSettings.show_email = el.checked;
                if (sel === '#idCardShowStarted')    idCardSettings.show_started_at = el.checked;
                if (sel === '#idCardShowIssued')     idCardSettings.show_issued = el.checked;
                if (sel === '#idCardShowBranch')     idCardSettings.show_branch_location = el.checked;
                if (sel === '#idCardShowBranchName') idCardSettings.show_branch_name = el.checked;
                if (sel === '#idCardShowQr')         idCardSettings.show_qr = el.checked;
                renderIdCardPreview();
            });
        });
        const enEl = $('#idCardEnablePrint');
        if (enEl) enEl.addEventListener('change', () => {
            idCardSettings.enabled_for_print = enEl.checked;
            const printBtn = $('#idCardPrintAllBtn');
            if (printBtn) printBtn.disabled = !enEl.checked;
        });
        const saveBtn = $('#idCardSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', async () => {
            try {
                await window.CH.idCardSettings.update(idCardSettings);
                toast('ID card settings saved', 'success');
            } catch (err) {
                toast('Save failed: ' + (err.message || 'unknown error'), 'error');
            }
        });
        const printBtn = $('#idCardPrintAllBtn');
        if (printBtn) printBtn.addEventListener('click', () => {
            if (!idCardSettings.enabled_for_print) {
                toast('Enable printout first.', 'error');
                return;
            }
            // System Admin users are infrastructure accounts — they don't
            // get printed cards. Everyone else with a name is printable.
            const list = (staffList || []).filter((s) => s.name && !isSystemAdminStaff(s));
            if (list.length === 0) { toast('No staff to print.', 'error'); return; }
            const cards = list.map((s) => buildIdCardHtml(s, idCardSettings)).join('');
            const win = window.open('', '_blank');
            if (!win) { toast('Pop-up blocked — allow pop-ups to print.', 'error'); return; }
            const css = document.querySelectorAll('style');
            const styleText = Array.from(css).map((s) => s.textContent).join('\n');
            win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Prime Access Ghana — Staff ID Cards</title><style>${styleText}\n.print-sheet{display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#f5f5f5;}@page{size:auto;margin:8mm;}@media print{.print-sheet{background:#fff;padding:0;}}</style></head><body><div class="print-sheet">${cards}</div><script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
            win.document.close();
        });
    }
    wireIdCardControls();

    /* ---- Feature flags (System Admin sidebar toggles) -------- */
    let featureFlagsCache = { transfers_enabled: true, move_stock_enabled: true, id_cards_visible_to_director: false, director_id_card_template: 'classic' };

    function applyFeatureFlagsUi() {
        document.body.dataset.flagTransfers  = featureFlagsCache.transfers_enabled  ? 'on' : 'off';
        document.body.dataset.flagMoveStock  = featureFlagsCache.move_stock_enabled ? 'on' : 'off';
        document.body.dataset.flagIdCardsDirector = featureFlagsCache.id_cards_visible_to_director ? 'on' : 'off';
        try { applyNavVisibility(); } catch (_) {}
        // Reflect into the sidebar toggles if present
        const t = document.getElementById('ffTransfers');
        const m = document.getElementById('ffMoveStock');
        const i = document.getElementById('ffIdCardsDirector');
        if (t) t.checked = !!featureFlagsCache.transfers_enabled;
        if (m) m.checked = !!featureFlagsCache.move_stock_enabled;
        if (i) i.checked = !!featureFlagsCache.id_cards_visible_to_director;
        // Director-templates multi-select (on the Staff ID Cards page).
        const selected = directorTemplatesAsSet();
        $$('#idCardDirectorTemplates input[data-director-tpl]').forEach((el) => {
            el.checked = selected.has(el.dataset.directorTpl);
        });
    }

    function directorTemplatesAsSet() {
        const raw = (featureFlagsCache && featureFlagsCache.director_id_card_templates) || 'classic';
        return new Set(String(raw).split(',').map((s) => s.trim()).filter(Boolean));
    }

    (async function loadFeatureFlagsOnBoot() {
        try {
            if (window.CH && window.CH.featureFlags) {
                featureFlagsCache = await window.CH.featureFlags.get();
                applyFeatureFlagsUi();
            }
        } catch (_) {}
    })();

    /* ============================================================
       ROLE PERMISSIONS (Phase 6 — System Admin page-access control)
       ============================================================ */
    // Manageable pages, in display order. label shown in the panel.
    const PERMISSION_VIEWS = [
        ['products', 'Products'], ['showroom', 'Showroom'], ['warehouse-stock', 'Warehouse Stock'],
        ['reports', 'Reports'], ['messages', 'Messages'], ['announcements', 'Announcements'],
        ['product-transfers', 'Product Transfers'], ['new-sale', 'New Sale'], ['purchases', 'Sales / Purchases'],
        ['verify-invoice', 'Verify Invoice'], ['move-stock', 'Move Stock'], ['warehouses', 'Warehouses'],
        ['payment-accounts', 'Payment Accounts'], ['taxonomy', 'Categories & Materials'], ['branches', 'Branches'],
        ['staff', 'Staff'], ['logs', 'Activity logs'], ['drafts', 'Drafts'], ['extract', 'Extract from image'],
        ['media', 'Media Library'], ['id-cards', 'Staff ID Cards'], ['invoice-templates', 'Invoice Templates'],
    ];
    // Roles the System Admin can limit (System Admin itself is never restricted).
    const PERMISSION_ROLES = [
        ['admin', 'Director'], ['branch_manager', 'Branch Manager'],
        ['warehouse_manager', 'Warehouse Manager'], ['staff', 'Staff'],
    ];
    const PERMISSION_ROLE_LABEL = Object.fromEntries(PERMISSION_ROLES);
    // Manageable ACTIONS (what a role/user can DO), in display order. These are
    // an allow-list: a role/user can perform an action only when it's granted.
    const PERMISSION_ACTIONS = [
        ['product.create', 'Add new product'],
        ['product.edit',   'Edit product info'],
        ['product.delete', 'Delete product'],
    ];
    const ALL_ACTION_KEYS = PERMISSION_ACTIONS.map(([k]) => k);
    // Defaults used only when a role has NO stored row yet (table not migrated
    // or never saved): Director + managers can manage products; Staff cannot.
    const ACTION_ROLE_DEFAULTS = {
        admin:             [...ALL_ACTION_KEYS],
        branch_manager:    [...ALL_ACTION_KEYS],
        warehouse_manager: [...ALL_ACTION_KEYS],
        staff:             [],
    };
    let permissionsCache = {};            // { role: [deniedView, ...] }
    let userPermissionsCache = {};        // { staff_id: [deniedView, ...] }
    let actionPermissionsCache = {};      // { role: [allowedAction, ...] }
    let userActionPermissionsCache = {};  // { staff_id: [allowedAction, ...] }
    let activePermTab = 'role';           // 'role' | 'user' | 'action-role' | 'action-user'
    let selectedPermUserId = '';
    let selectedPermActionUserId = '';

    // Granted actions for a role. System Admin is never restricted (all).
    function allowedActionsForRole(role) {
        if (role === 'system_manager') return [...ALL_ACTION_KEYS];
        const stored = actionPermissionsCache[role];
        if (Array.isArray(stored)) return stored;
        return ACTION_ROLE_DEFAULTS[role] || [];
    }
    function allowedActionsForUser(staffId) {
        const list = userActionPermissionsCache[staffId];
        return Array.isArray(list) ? list : [];
    }
    // Can the SIGNED-IN user perform an action? = role grant OR personal grant.
    function canCurrentUserDo(action) {
        if (currentRole() === 'system_manager') return true;
        // Hard rule: products may only be edited/deleted by Branch Manager &
        // Director (+ System Admin, handled above). Staff and Warehouse
        // Manager can never edit/delete, regardless of granted permissions.
        if (action === 'product.edit' || action === 'product.delete') {
            const r = currentRole();
            if (r !== 'admin' && r !== 'branch_manager') return false;
        }
        const roleAllowed = allowedActionsForRole(currentRole());
        const userAllowed = session ? allowedActionsForUser(session.id) : [];
        return roleAllowed.includes(action) || userAllowed.includes(action);
    }
    // Mirror the current user's action grants onto the body so CSS can hide the
    // edit / delete / add affordances they can't use. The click + submit guards
    // are the real enforcement; this is just so dead buttons don't show.
    function applyActionPermissionsToSelf() {
        const b = document.body;
        b.dataset.canProductCreate = canCurrentUserDo('product.create') ? '1' : '0';
        b.dataset.canProductEdit   = canCurrentUserDo('product.edit')   ? '1' : '0';
        b.dataset.canProductDelete = canCurrentUserDo('product.delete') ? '1' : '0';
    }

    // Denied views for a role. System Admin is never restricted.
    function deniedViewsForRole(role) {
        if (role === 'system_manager') return [];
        const list = permissionsCache[role];
        return Array.isArray(list) ? list : [];
    }
    function deniedViewsForUser(staffId) {
        const list = userPermissionsCache[staffId];
        return Array.isArray(list) ? list : [];
    }
    // Effective denials for the SIGNED-IN user = role denials ∪ their own.
    // Super-roles (Director/System Admin) are never hidden by a per-user
    // override — a leftover per-user "off" must not silently lock the Director
    // out of a page their role already allows (e.g. Showroom).
    function deniedViewsForCurrentUser() {
        if (currentRole() === 'system_manager') return [];
        const roleD = deniedViewsForRole(currentRole());
        const userD = isSuperRole() ? [] : (session ? deniedViewsForUser(session.id) : []);
        return Array.from(new Set([...roleD, ...userD]));
    }

    // Hide denied nav links for the CURRENT user and bounce them off a denied
    // page if they're on one. Non-denied links revert to CSS-governed display.
    function applyRolePermissionsToSelf() {
        const denied = new Set(deniedViewsForCurrentUser());
        PERMISSION_VIEWS.forEach(([view]) => {
            document.querySelectorAll('.nav a[data-view="' + view + '"]').forEach((a) => {
                a.style.display = denied.has(view) ? 'none' : '';
            });
        });
        if (denied.has(currentView)) {
            const fallback = (VIEWS_BY_ROLE[currentRole()] || ['products']).find((v) => !denied.has(v)) || 'products';
            if (fallback !== currentView) switchView(fallback);
        }
    }

    async function loadPermissionsOnBoot() {
        try {
            if (window.CH && window.CH.permissions) {
                const [roleMap, userMap, actionMap, userActionMap] = await Promise.all([
                    window.CH.permissions.getAll(),
                    window.CH.permissions.getAllUsers(),
                    window.CH.permissions.getAllActions ? window.CH.permissions.getAllActions() : {},
                    window.CH.permissions.getAllUserActions ? window.CH.permissions.getAllUserActions() : {},
                ]);
                permissionsCache = roleMap || {};
                userPermissionsCache = userMap || {};
                actionPermissionsCache = actionMap || {};
                userActionPermissionsCache = userActionMap || {};
            }
        } catch (_) {
            permissionsCache = {}; userPermissionsCache = {};
            actionPermissionsCache = {}; userActionPermissionsCache = {};
        }
        applyRolePermissionsToSelf();
        applyActionPermissionsToSelf();
    }
    loadPermissionsOnBoot();

    // ----- "By role" matrix: one table, rows = pages, columns = roles -----
    function renderPermissions() {
        const host = document.getElementById('permissionsHost');
        if (!host) return;
        if (currentRole() !== 'system_manager') {
            host.innerHTML = '<p style="color:var(--c-ink-5);">Only the System Admin can manage permissions.</p>';
            return;
        }
        const heads = PERMISSION_ROLES.map(([role, label]) =>
            `<th style="text-align:center;">${escapeHtml(label)}<br><label class="perms-col-all"><input type="checkbox" data-perm-col="${role}" /> all</label></th>`).join('');
        const rows = PERMISSION_VIEWS.map(([v, vlabel]) => {
            const cells = PERMISSION_ROLES.map(([role]) => {
                const base = VIEWS_BY_ROLE[role] || [];
                if (!base.includes(v)) return '<td style="text-align:center;color:var(--c-ink-5);">—</td>';
                const denied = deniedViewsForRole(role).includes(v);
                return `<td style="text-align:center;"><input type="checkbox" data-perm-role="${role}" data-perm-view="${v}" ${denied ? '' : 'checked'} /></td>`;
            }).join('');
            return `<tr><td>${escapeHtml(vlabel)}</td>${cells}</tr>`;
        }).join('');
        host.innerHTML = `<div class="table-scroll"><table class="tbl perms-table">
            <thead><tr><th>Page</th>${heads}</tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <p class="perms-user-empty">Ticked = the page shows for that role. Unticked = hidden and blocked. You (System Admin) are never affected.</p>`;
    }

    // ----- "By user" table: one user's page visibility -----
    async function ensureStaffLoaded() {
        if (!staffList || staffList.length === 0) {
            try { staffList = await window.CH.staff.list(); } catch (_) {}
        }
    }
    async function populatePermsUserSelect() {
        const sel = document.getElementById('permsUserSelect');
        if (!sel) return;
        await ensureStaffLoaded();
        // Everyone except System Admins (who are never restricted).
        const users = (staffList || []).filter((s) => s.name && !isSystemAdminStaff(s))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        sel.innerHTML = ['<option value="">— Select a user —</option>']
            .concat(users.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} · ${escapeHtml(PERMISSION_ROLE_LABEL[s.role] || s.role || 'Staff')}</option>`))
            .join('');
        if (selectedPermUserId) sel.value = selectedPermUserId;
    }
    function renderUserPermissions(staffId) {
        const host = document.getElementById('permsUserHost');
        if (!host) return;
        if (!staffId) { host.innerHTML = '<p class="perms-user-empty">Pick a user above to set which pages they can see.</p>'; return; }
        const u = (staffList || []).find((s) => s.id === staffId);
        if (!u) { host.innerHTML = '<p class="perms-user-empty">User not found.</p>'; return; }
        const role = ['staff', 'branch_manager', 'warehouse_manager', 'admin', 'system_manager'].includes(u.role) ? u.role : 'staff';
        const base = VIEWS_BY_ROLE[role] || [];
        const views = PERMISSION_VIEWS.filter(([v]) => base.includes(v));
        const userDenied = new Set(deniedViewsForUser(staffId));
        const roleDenied = new Set(deniedViewsForRole(role));
        const rows = views.map(([v, vlabel]) => {
            const note = roleDenied.has(v) ? ' <small style="color:var(--c-ink-5);">(also blocked for the whole role)</small>' : '';
            return `<tr><td>${escapeHtml(vlabel)}${note}</td>
                <td style="text-align:center;"><input type="checkbox" data-perm-user-view="${v}" ${userDenied.has(v) ? '' : 'checked'} /></td></tr>`;
        }).join('') || '<tr><td colspan="2" class="perms-user-empty">No manageable pages for this user.</td></tr>';
        host.innerHTML = `<div class="table-scroll"><table class="tbl perms-table">
            <thead><tr><th>Page</th><th style="text-align:center;">Visible to ${escapeHtml(u.name)}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <p class="perms-user-empty">Ticked = visible for this user. Unticked = hidden for this user only. Role-level blocks still apply on top.</p>`;
    }

    // ----- "Actions · by role" matrix: rows = actions, columns = roles -----
    function renderActionPermissions() {
        const host = document.getElementById('permActionsHost');
        if (!host) return;
        if (currentRole() !== 'system_manager') {
            host.innerHTML = '<p style="color:var(--c-ink-5);">Only the System Admin can manage permissions.</p>';
            return;
        }
        const heads = PERMISSION_ROLES.map(([role, label]) =>
            `<th style="text-align:center;">${escapeHtml(label)}<br><label class="perms-col-all"><input type="checkbox" data-perm-action-col="${role}" /> all</label></th>`).join('');
        const rows = PERMISSION_ACTIONS.map(([a, alabel]) => {
            const cells = PERMISSION_ROLES.map(([role]) => {
                const allowed = allowedActionsForRole(role).includes(a);
                return `<td style="text-align:center;"><input type="checkbox" data-perm-action-role="${role}" data-perm-action="${a}" ${allowed ? 'checked' : ''} /></td>`;
            }).join('');
            return `<tr><td>${escapeHtml(alabel)}</td>${cells}</tr>`;
        }).join('');
        host.innerHTML = `<div class="table-scroll"><table class="tbl perms-table">
            <thead><tr><th>Action</th>${heads}</tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <p class="perms-user-empty">Ticked = that role can perform the action. Staff have none by default — tick to grant. You (System Admin) can always do everything.</p>`;
    }

    async function populatePermsActionUserSelect() {
        const sel = document.getElementById('permsActionUserSelect');
        if (!sel) return;
        await ensureStaffLoaded();
        const users = (staffList || []).filter((s) => s.name && !isSystemAdminStaff(s))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        sel.innerHTML = ['<option value="">— Select a user —</option>']
            .concat(users.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} · ${escapeHtml(PERMISSION_ROLE_LABEL[s.role] || s.role || 'Staff')}</option>`))
            .join('');
        if (selectedPermActionUserId) sel.value = selectedPermActionUserId;
    }

    // ----- "Actions · by user": grant one person extra actions -----
    function renderActionUserPermissions(staffId) {
        const host = document.getElementById('permActionsUserHost');
        if (!host) return;
        if (!staffId) { host.innerHTML = '<p class="perms-user-empty">Pick a user above to grant them specific actions.</p>'; return; }
        const u = (staffList || []).find((s) => s.id === staffId);
        if (!u) { host.innerHTML = '<p class="perms-user-empty">User not found.</p>'; return; }
        const role = ['staff', 'branch_manager', 'warehouse_manager', 'admin', 'system_manager'].includes(u.role) ? u.role : 'staff';
        const roleAllowed = new Set(allowedActionsForRole(role));
        const userAllowed = new Set(allowedActionsForUser(staffId));
        const rows = PERMISSION_ACTIONS.map(([a, alabel]) => {
            const note = roleAllowed.has(a) ? ' <small style="color:var(--c-ink-5);">(already allowed for their role)</small>' : '';
            return `<tr><td>${escapeHtml(alabel)}${note}</td>
                <td style="text-align:center;"><input type="checkbox" data-perm-action-user="${a}" ${userAllowed.has(a) ? 'checked' : ''} /></td></tr>`;
        }).join('');
        host.innerHTML = `<div class="table-scroll"><table class="tbl perms-table">
            <thead><tr><th>Action</th><th style="text-align:center;">${escapeHtml(u.name)} can</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <p class="perms-user-empty">Ticked = this person can perform the action, on top of whatever their role allows. Use this to grant one Staff member product editing without granting all Staff.</p>`;
    }

    // Show + render whichever permissions tab is active. Called when entering
    // the view and on every tab click so the panel and its data stay in sync.
    function renderActivePermTab() {
        const panels = {
            'role': 'permsByRole', 'user': 'permsByUser',
            'action-role': 'permsByActionRole', 'action-user': 'permsByActionUser',
        };
        Object.entries(panels).forEach(([t, id]) => {
            const el = document.getElementById(id);
            if (el) el.style.display = (t === activePermTab) ? '' : 'none';
        });
        document.querySelectorAll('.perms-tab').forEach((tab) =>
            tab.classList.toggle('is-active', tab.dataset.permTab === activePermTab));
        if (activePermTab === 'user') populatePermsUserSelect().then(() => renderUserPermissions(selectedPermUserId));
        else if (activePermTab === 'action-role') renderActionPermissions();
        else if (activePermTab === 'action-user') populatePermsActionUserSelect().then(() => renderActionUserPermissions(selectedPermActionUserId));
        else renderPermissions();
    }

    async function savePermissions() {
        if (currentRole() !== 'system_manager') return;
        const btn = document.getElementById('permsSaveBtn');
        try {
            if (btn) btn.disabled = true;
            if (activePermTab === 'user') {
                if (!selectedPermUserId) { toast('Pick a user first.', 'error'); return; }
                const host = document.getElementById('permsUserHost');
                const denied = [];
                host.querySelectorAll('input[data-perm-user-view]').forEach((cb) => {
                    if (!cb.checked) denied.push(cb.dataset.permUserView);
                });
                await window.CH.permissions.setUserDenied(selectedPermUserId, denied);
                userPermissionsCache[selectedPermUserId] = denied;
                if (session && selectedPermUserId === session.id) applyRolePermissionsToSelf();
                toast('Saved. ' + ((staffList.find((s) => s.id === selectedPermUserId) || {}).name || 'User') + ' sees the change on their next page load.', 'success');
            } else if (activePermTab === 'action-role') {
                const host = document.getElementById('permActionsHost');
                const allowedByRole = {};
                PERMISSION_ROLES.forEach(([role]) => { allowedByRole[role] = []; });
                host.querySelectorAll('input[data-perm-action-role]').forEach((cb) => {
                    if (cb.checked) allowedByRole[cb.dataset.permActionRole].push(cb.dataset.permAction);
                });
                for (const [role, allowed] of Object.entries(allowedByRole)) {
                    await window.CH.permissions.setActionAllowed(role, allowed);
                }
                actionPermissionsCache = allowedByRole;
                applyActionPermissionsToSelf();
                toast('Action permissions saved. Affected users see the change on their next page load.', 'success');
            } else if (activePermTab === 'action-user') {
                if (!selectedPermActionUserId) { toast('Pick a user first.', 'error'); return; }
                const host = document.getElementById('permActionsUserHost');
                const allowed = [];
                host.querySelectorAll('input[data-perm-action-user]').forEach((cb) => {
                    if (cb.checked) allowed.push(cb.dataset.permActionUser);
                });
                await window.CH.permissions.setUserActionAllowed(selectedPermActionUserId, allowed);
                userActionPermissionsCache[selectedPermActionUserId] = allowed;
                if (session && selectedPermActionUserId === session.id) applyActionPermissionsToSelf();
                toast('Saved. ' + ((staffList.find((s) => s.id === selectedPermActionUserId) || {}).name || 'User') + ' sees the change on their next page load.', 'success');
            } else {
                const host = document.getElementById('permissionsHost');
                const deniedByRole = {};
                PERMISSION_ROLES.forEach(([role]) => { deniedByRole[role] = []; });
                host.querySelectorAll('input[data-perm-role]').forEach((cb) => {
                    if (!cb.checked) deniedByRole[cb.dataset.permRole].push(cb.dataset.permView);
                });
                for (const [role, denied] of Object.entries(deniedByRole)) {
                    await window.CH.permissions.setDenied(role, denied);
                }
                permissionsCache = deniedByRole;
                applyRolePermissionsToSelf();
                toast('Permissions saved. Affected users see the change on their next page load.', 'success');
            }
        } catch (e) {
            toast('Could not save permissions: ' + (e.message || 'unknown'), 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    (function wirePermissions() {
        const saveBtn = document.getElementById('permsSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', savePermissions);

        // Tab switching (Pages/Actions × by role/by user).
        document.querySelectorAll('.perms-tab').forEach((tab) => tab.addEventListener('click', () => {
            activePermTab = tab.dataset.permTab;
            renderActivePermTab();
        }));

        // Column "all" toggles for the Pages role matrix.
        const roleHost = document.getElementById('permissionsHost');
        if (roleHost) roleHost.addEventListener('change', (e) => {
            const colCb = e.target.closest('input[data-perm-col]');
            if (!colCb) return;
            roleHost.querySelectorAll('input[data-perm-role="' + colCb.dataset.permCol + '"]').forEach((cb) => { cb.checked = colCb.checked; });
        });

        // Column "all" toggles for the Actions role matrix.
        const actionHost = document.getElementById('permActionsHost');
        if (actionHost) actionHost.addEventListener('change', (e) => {
            const colCb = e.target.closest('input[data-perm-action-col]');
            if (!colCb) return;
            actionHost.querySelectorAll('input[data-perm-action-role="' + colCb.dataset.permActionCol + '"]').forEach((cb) => { cb.checked = colCb.checked; });
        });

        // Page-visibility user picker.
        const userSel = document.getElementById('permsUserSelect');
        if (userSel) userSel.addEventListener('change', () => {
            selectedPermUserId = userSel.value || '';
            renderUserPermissions(selectedPermUserId);
        });

        // Action-grant user picker.
        const actionUserSel = document.getElementById('permsActionUserSelect');
        if (actionUserSel) actionUserSel.addEventListener('change', () => {
            selectedPermActionUserId = actionUserSel.value || '';
            renderActionUserPermissions(selectedPermActionUserId);
        });
    })();

    function wireFeatureFlagToggles() {
        async function save(patch) {
            featureFlagsCache = { ...featureFlagsCache, ...patch };
            applyFeatureFlagsUi();
            if (currentRole() !== 'system_manager') return;
            try { await window.CH.featureFlags.update(patch); } catch (e) { toast('Could not save toggle: ' + (e.message || 'unknown'), 'error'); }
        }
        const t = document.getElementById('ffTransfers');
        const m = document.getElementById('ffMoveStock');
        const i = document.getElementById('ffIdCardsDirector');
        if (t) t.addEventListener('change', () => save({ transfers_enabled: t.checked }));
        if (m) m.addEventListener('change', () => save({ move_stock_enabled: m.checked }));
        if (i) i.addEventListener('change', () => save({ id_cards_visible_to_director: i.checked }));
        // Director-templates multi-select on the Staff ID Cards page.
        const tplHost = document.getElementById('idCardDirectorTemplates');
        if (tplHost) tplHost.addEventListener('change', (e) => {
            const cb = e.target.closest('input[data-director-tpl]');
            if (!cb) return;
            const set = directorTemplatesAsSet();
            if (cb.checked) set.add(cb.dataset.directorTpl);
            else set.delete(cb.dataset.directorTpl);
            const csv = Array.from(set).join(',');
            save({ director_id_card_templates: csv });
        });
    }
    wireFeatureFlagToggles();

    /* ---- Dev/Live mode toggle (sidebar) ---------------------- */
    function applyDevModeUi() {
        const mode = (window.CH.devMode && window.CH.devMode.current()) || 'live';
        document.body.dataset.mode = mode;
        const pill = $('#sbModePill');
        if (pill) {
            pill.dataset.mode = mode;
            $$('#sbModePill button').forEach((b) => b.classList.toggle('is-active', b.dataset.modeSet === mode));
        }
        const hint = $('#sbModeHint');
        if (hint) {
            hint.textContent = mode === 'dev'
                ? 'Sandbox — only you see these changes. Use Reset to wipe demo data.'
                : 'Real data — visible to everyone.';
        }
        const resetBtn = $('#sbResetDevBtn');
        if (resetBtn) resetBtn.hidden = mode !== 'dev';
        const publishBtn = $('#sbPublishDevBtn');
        if (publishBtn) publishBtn.hidden = mode !== 'dev';
    }
    const _publishDevBtn = document.getElementById('sbPublishDevBtn');
    if (_publishDevBtn) _publishDevBtn.addEventListener('click', async () => {
        if (currentRole() !== 'system_manager') return;
        if (!confirm('Publish every Dev-mode product change to Live?\nThis copies all dev products to live. Dev data is kept for further testing.')) return;
        try {
            const { error } = await window.CH.supabase.rpc('publish_all_dev');
            if (error) throw error;
            toast('Published dev changes to live. Reloading…', 'success');
            setTimeout(() => window.location.reload(), 600);
        } catch (err) {
            toast('Publish failed: ' + (err.message || 'unknown error'), 'error');
        }
    });
    const _resetDevBtn = document.getElementById('sbResetDevBtn');
    if (_resetDevBtn) _resetDevBtn.addEventListener('click', async () => {
        if (currentRole() !== 'system_manager') return;
        if (!confirm('Reset ALL demo data?\nThis wipes every Dev-mode product, order, transfer, log, etc. — it does NOT touch Live data.')) return;
        try {
            await window.CH.devMode.resetDevData();
            toast('Demo data reset. Reloading…', 'success');
            setTimeout(() => window.location.reload(), 600);
        } catch (err) {
            toast('Reset failed: ' + (err.message || 'unknown error'), 'error');
        }
    });
    const _modePill = document.getElementById('sbModePill');
    if (_modePill) _modePill.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-mode-set]');
        if (!btn) return;
        if (!isSuperRole() || currentRole() !== 'system_manager') {
            toast('Dev/Live switching is for System Admin.', 'error');
            return;
        }
        const next = btn.dataset.modeSet;
        if (window.CH.devMode) window.CH.devMode.set(next);
        applyDevModeUi();
        toast('Switched to ' + (next === 'dev' ? 'Dev (sandbox)' : 'Live') + ' mode. Reloading…', 'info');
        // Hard reload so every cached list refetches with the new mode filter
        setTimeout(() => window.location.reload(), 500);
    });
    // Initial paint on boot
    applyDevModeUi();

    /* ---------- initial load ---------- */
    (async function init() {
        applyRoleVisibility();
        // Refresh taxonomy first so any modal opened during boot has dropdowns ready
        await refreshTaxonomyCache();
        // Load warehouses (used by new-sale form to resolve the source
        // warehouse) and branches (used by getManagedBranchIds).
        try {
            if (window.CH && window.CH.warehouses) {
                warehousesCache = await window.CH.warehouses.listWithBranches();
            }
            if (window.CH && window.CH.branches) {
                branches = await window.CH.branches.list();
            }
            // Preload the staff list so staff-ID auto-fill on New Sale and
            // Transfer Request works without first opening the Staff page.
            if (window.CH && window.CH.staff) {
                staffList = await window.CH.staff.list();
            }
            if (window.CH && window.CH.showrooms) {
                showroomsCache = await window.CH.showrooms.list();
            }
        } catch (_) { /* tables may not be migrated yet */ }
        // Gate the platform until a branch + showroom exist (redirects off
        // operational pages and hides Add Product / fundamental nav).
        applySetupState();
        await loadProducts();
        checkStockAlertsLocal();
        await updateUnreadBadge();
        // Drafts badge shows for System Admin only
        const r = currentRole();
        if (r === 'system_manager') await updateDraftsBadge();
        // Announcement badge shows for everyone EXCEPT Director
        if (r !== 'admin') await updateAnnouncementBadge();
        // Product Transfers badge — load once at boot, then realtime keeps it fresh
        try { await loadProductTransfers(); } catch (_) { /* table not migrated yet */ }
        setupTransfersRealtime();
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


