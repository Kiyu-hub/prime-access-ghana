/* ============================================================
   Clasikal Homes — Supabase client + data helpers
   Loaded as a regular <script> after the Supabase UMD bundle.

   Exposes window.CH with:
     CH.supabase                 — the configured client (or null if config is missing)
     CH.session                  — currently signed-in staff session, or null
     CH.signIn(email, password)  — RPC-backed login, persists session, returns staff row
     CH.signOut()                — clears session
     CH.requireSession(redirect) — used by dashboard to gate access

     CH.branches.list/create/rename/remove
     CH.staff.list/create/update/remove
     CH.products.list/upsert/remove
   ============================================================ */
(function () {
    'use strict';

    const cfg = window.CH_CONFIG || {};
    const SESSION_KEY = 'ch_session';

    /* ---- client init ----------------------------------------- */
    let client = null;
    if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient) {
        client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
            auth: { persistSession: false }, // we use our own session
        });
    } else {
        console.warn('[CH] Supabase client not initialised — check scripts/config.js (SUPABASE_URL, SUPABASE_ANON_KEY) and that the Supabase SDK loaded.');
    }

    /* ---- session helpers ------------------------------------- */
    function readSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
        catch (_) { return null; }
    }
    function writeSession(s) {
        if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        else   localStorage.removeItem(SESSION_KEY);
    }

    /* ---- auth ------------------------------------------------ */
    async function signIn(email, password) {
        if (!client) throw new Error('Site not configured. Please ask the Director to complete setup.');
        const { data, error } = await client.rpc('verify_login', {
            p_email: email,
            p_password: password,
        });
        if (error) throw error;
        if (!data || data.length === 0) {
            const err = new Error('Invalid email or password.');
            err.code = 'invalid_credentials';
            throw err;
        }
        const row = data[0];
        const session = {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            branch_id: row.branch_id,
            branch_name: row.branch_name || 'Unassigned',
            is_admin: row.is_admin,
            signedInAt: new Date().toISOString(),
        };
        writeSession(session);
        return session;
    }
    function signOut() { writeSession(null); }
    function requireSession(redirectUrl = 'index.html') {
        const s = readSession();
        if (!s) { window.location.replace(redirectUrl); return null; }
        return s;
    }

    /* ---- branches -------------------------------------------- */
    const branches = {
        async list() {
            const { data, error } = await client.from('branches').select('*').order('name');
            if (error) throw error;
            return data || [];
        },
        async create(name, location = '', manager_staff_id = null) {
            const { data, error } = await client.from('branches')
                .insert({ name, location, manager_staff_id: manager_staff_id || null })
                .select().single();
            if (error) throw error;
            return data;
        },
        async update(id, patch) {
            const { error } = await client.from('branches').update(patch).eq('id', id);
            if (error) throw error;
        },
        // Backward-compat alias: existing UI may still call rename(id, name, location)
        async rename(id, name, location, manager_staff_id) {
            const patch = { name };
            if (location !== undefined) patch.location = location;
            if (manager_staff_id !== undefined) patch.manager_staff_id = manager_staff_id || null;
            const { error } = await client.from('branches').update(patch).eq('id', id);
            if (error) throw error;
        },
        async remove(id) {
            const { error } = await client.from('branches').delete().eq('id', id);
            if (error) throw error;
        },
        async managedBranchIds(staffId) {
            const { data, error } = await client.rpc('staff_managed_branch_ids', { p_staff_id: staffId });
            if (error) throw error;
            return (data || []).map((r) => (typeof r === 'string' ? r : r.staff_managed_branch_ids || r));
        },
        async managedWarehouseIds(staffId) {
            const { data, error } = await client.rpc('staff_managed_warehouse_ids', { p_staff_id: staffId });
            if (error) throw error;
            return (data || []).map((r) => (typeof r === 'string' ? r : r.staff_managed_warehouse_ids || r));
        },
    };

    /* ---- staff ----------------------------------------------- */
    const staff = {
        async list() {
            const { data, error } = await client.from('staff_view').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        async create({ email, password, name, role, branch_id, is_admin, manages_all_branches, manages_all_warehouses }) {
            const { data, error } = await client.rpc('create_staff', {
                p_email: email,
                p_password: password,
                p_name: name,
                p_role: role,
                p_branch_id: branch_id,
                p_is_admin: !!is_admin,
                p_manages_all_branches: !!manages_all_branches,
                p_manages_all_warehouses: !!manages_all_warehouses,
            });
            if (error) throw error;
            return data;
        },
        async update(id, { email, password, name, role, branch_id, is_admin, manages_all_branches, manages_all_warehouses }) {
            const { error } = await client.rpc('update_staff', {
                p_id: id,
                p_email: email,
                p_password: password || '',
                p_name: name,
                p_role: role,
                p_branch_id: branch_id,
                p_is_admin: !!is_admin,
                p_manages_all_branches: !!manages_all_branches,
                p_manages_all_warehouses: !!manages_all_warehouses,
            });
            if (error) throw error;
        },
        async remove(id) {
            const { error } = await client.from('staff').delete().eq('id', id);
            if (error) throw error;
        },
        // Assigns or clears a warehouse for a warehouse_manager staff.
        async setWarehouse(id, warehouse_id) {
            const { error } = await client.from('staff').update({ warehouse_id: warehouse_id || null }).eq('id', id);
            if (error) throw error;
        },
        // Phase 4 — patch optional fields that don't go through the RPC
        // (image_url, started_at, staff_code).
        async patch(id, patch) {
            const payload = {};
            if (patch.image_url !== undefined)  payload.image_url = patch.image_url || null;
            if (patch.started_at !== undefined) payload.started_at = patch.started_at || null;
            if (patch.staff_code !== undefined) payload.staff_code = patch.staff_code || null;
            if (Object.keys(payload).length === 0) return;
            const { error } = await client.from('staff').update(payload).eq('id', id);
            if (error) throw error;
        },
    };

    // Mode helper — reads localStorage. Defined early so every data
    // module below can call it. The toggle UI lives in dashboard.js.
    function currentMode() {
        try { return localStorage.getItem('ch_mode') === 'dev' ? 'dev' : 'live'; }
        catch (_) { return 'live'; }
    }
    // In live mode reads see only env='live' rows. In dev mode reads see
    // EVERYTHING — the System Admin can test against real data, but their
    // writes are tagged 'dev' and stay isolated until they hit Publish.
    function applyEnvFilter(q) {
        return currentMode() === 'dev' ? q : q.eq('env', 'live');
    }

    /* ---- products -------------------------------------------- */
    const products = {
        async list(branch_id) {
            let q = client.from('products').select('*').order('created_at', { ascending: false });
            if (branch_id) q = q.eq('branch_id', branch_id);
            q = applyEnvFilter(q);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        async upsert(row) {
            const isUpdate = !!row.id;
            const payload = { ...row };
            delete payload.id;          // never put id in insert/update payload
            delete payload.created_at;  // server-managed
            delete payload.updated_at;  // server-managed (trigger)
            // For updates, don't overwrite original adder fields
            if (isUpdate) {
                delete payload.added_by;
                delete payload.added_by_name;
            }
            // Tag new rows with the current mode (defaults to 'live' on the
            // server too — this just makes the intent explicit on inserts).
            // Also delete legacy `mode` key if it leaked through from caller.
            delete payload.mode;
            if (!isUpdate && !payload.env) payload.env = currentMode();

            const q = isUpdate
                ? client.from('products').update(payload).eq('id', row.id).select().single()
                : client.from('products').insert(payload).select().single();

            const { data, error } = await q;
            if (error) throw error;
            return data;
        },
        async findByItemNo(branch_id, item_no) {
            const { data, error } = await client.from('products')
                .select('*')
                .eq('branch_id', branch_id)
                .eq('item_no', item_no)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await client.from('products').delete().eq('id', id);
            if (error) throw error;
        },
        subscribe(onChange) {
            if (!client) return () => {};
            const ch = client.channel('ch-products')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
                .subscribe();
            return () => client.removeChannel(ch);
        },
    };

    /* ---- messages -------------------------------------------- */
    const messages = {
        async listThread(thread_staff_id) {
            const { data, error } = await client
                .from('messages')
                .select('*')
                .eq('thread_staff_id', thread_staff_id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        async listAdminThreads() {
            const { data, error } = await client
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const byThread = new Map();
            (data || []).forEach((m) => {
                if (!byThread.has(m.thread_staff_id)) {
                    byThread.set(m.thread_staff_id, { last: m, unread: 0 });
                }
                if (!m.sender_is_admin && !m.read_at) {
                    byThread.get(m.thread_staff_id).unread += 1;
                }
            });
            const { data: staffRows } = await client.from('staff_view').select('id,name,email,role,branch_name');
            const staffMap = new Map((staffRows || []).map((s) => [s.id, s]));
            return Array.from(byThread.entries()).map(([thread_staff_id, agg]) => ({
                thread_staff_id,
                staff: staffMap.get(thread_staff_id) || { name: 'Unknown', email: '', role: '', branch_name: '' },
                last: agg.last,
                unread: agg.unread,
            }));
        },
        async send({ thread_staff_id, body, sender_id, sender_name, sender_is_admin }) {
            const { data, error } = await client.from('messages').insert({
                thread_staff_id, body, sender_id, sender_name, sender_is_admin,
            }).select().single();
            if (error) throw error;
            return data;
        },
        async markRead(thread_staff_id, currentUserIsAdmin) {
            const q = client.from('messages').update({ read_at: new Date().toISOString() })
                .eq('thread_staff_id', thread_staff_id)
                .is('read_at', null);
            // Only mark messages from the other side as read
            const { error } = currentUserIsAdmin
                ? await q.eq('sender_is_admin', false)
                : await q.eq('sender_is_admin', true);
            if (error) throw error;
        },
        async unreadCount(forSession) {
            // For staff: messages where thread = me, sender_is_admin = true, read_at null
            // For admin: any message where sender_is_admin = false, read_at null
            const q = client.from('messages').select('id', { count: 'exact', head: true }).is('read_at', null);
            const { count, error } = forSession.is_admin
                ? await q.eq('sender_is_admin', false)
                : await q.eq('thread_staff_id', forSession.id).eq('sender_is_admin', true);
            if (error) throw error;
            return count || 0;
        },
        subscribe(onChange) {
            if (!client) return () => {};
            const ch = client.channel('ch-messages')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
                .subscribe();
            return () => client.removeChannel(ch);
        },
    };

    /* ---- reports --------------------------------------------- */
    const reports = {
        async overview() {
            const [branchesRes, productsRes, staffRes] = await Promise.all([
                client.from('branches').select('*'),
                applyEnvFilter(client.from('products').select('id,item_no,description,branch_id,price,stock,category,material,color,supplier,image_url,created_at')),
                client.from('staff_view').select('id,branch_id,is_admin'),
            ]);
            if (branchesRes.error)  throw branchesRes.error;
            if (productsRes.error)  throw productsRes.error;
            if (staffRes.error)     throw staffRes.error;
            return {
                branches: branchesRes.data || [],
                products: productsRes.data || [],
                staff: staffRes.data || [],
            };
        },
    };

    /* ---- product audit logs ---------------------------------- */
    const logs = {
        async list(limit = 200) {
            let q = client.from('product_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            q = applyEnvFilter(q);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        async record({ product_id, item_no, action, branch_id, branch_name, staff_id, staff_name, note }) {
            const { error } = await client.from('product_logs').insert({
                product_id: product_id || null,
                env: currentMode(),
                item_no: item_no || null,
                action,
                branch_id: branch_id || null,
                branch_name: branch_name || null,
                staff_id: staff_id || null,
                staff_name: staff_name || null,
                note: note || null,
            });
            if (error) console.warn('log insert failed:', error);
        },
    };

    /* ---- announcements -------------------------------------- */
    const announcements = {
        async list(limit = 100) {
            const { data, error } = await client.from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        },
        async post({ title, body, sender_id, sender_name }) {
            const { data, error } = await client.from('announcements')
                .insert({ title: title || null, body, sender_id, sender_name })
                .select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await client.from('announcements').delete().eq('id', id);
            if (error) throw error;
        },
        subscribe(onChange) {
            if (!client) return () => {};
            const ch = client.channel('ch-announcements')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, onChange)
                .subscribe();
            return () => client.removeChannel(ch);
        },
    };

    /* ---- drafts (products with is_draft = true) -------------- */
    const drafts = {
        async list(branch_id) {
            let q = client.from('products').select('*').eq('is_draft', true).order('created_at', { ascending: false });
            if (branch_id) q = q.eq('branch_id', branch_id);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        async count() {
            const { count, error } = await client.from('products').select('id', { count: 'exact', head: true }).eq('is_draft', true);
            if (error) throw error;
            return count || 0;
        },
    };

    /* ---- categories ----------------------------------------- */
    const categories = {
        async list() {
            const { data, error } = await client.from('categories')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        async add(name) {
            const trimmed = (name || '').trim();
            if (!trimmed) throw new Error('Name is required.');
            const { data, error } = await client.from('categories')
                .insert({ name: trimmed }).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await client.from('categories').delete().eq('id', id);
            if (error) throw error;
        },
    };

    /* ---- materials ------------------------------------------ */
    const materials = {
        async list() {
            const { data, error } = await client.from('materials')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        async add(name) {
            const trimmed = (name || '').trim();
            if (!trimmed) throw new Error('Name is required.');
            const { data, error } = await client.from('materials')
                .insert({ name: trimmed }).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await client.from('materials').delete().eq('id', id);
            if (error) throw error;
        },
    };

    /* ---- warehouses (Phase 1) -------------------------------- */
    const warehouses = {
        async list() {
            const { data, error } = await client.from('warehouses')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        async listWithBranches() {
            const [whResult, linksResult] = await Promise.all([
                client.from('warehouses').select('*').order('name'),
                client.from('branch_warehouses').select('warehouse_id, branch_id, is_default, branches(name)'),
            ]);
            if (whResult.error) throw whResult.error;
            if (linksResult.error) throw linksResult.error;
            const linksByWarehouse = new Map();
            (linksResult.data || []).forEach((l) => {
                const arr = linksByWarehouse.get(l.warehouse_id) || [];
                arr.push({ branch_id: l.branch_id, branch_name: l.branches && l.branches.name, is_default: l.is_default });
                linksByWarehouse.set(l.warehouse_id, arr);
            });
            return (whResult.data || []).map((w) => ({ ...w, branches: linksByWarehouse.get(w.id) || [] }));
        },
        async listForBranch(branchId) {
            const { data, error } = await client.from('branch_warehouses')
                .select('warehouse_id, is_default, warehouses(*)')
                .eq('branch_id', branchId);
            if (error) throw error;
            return (data || []).map((row) => ({ ...row.warehouses, is_default: row.is_default }));
        },
        async add({ name, code, location, manager_staff_id, branch_links }) {
            const { data: wh, error } = await client.from('warehouses')
                .insert({ name, code, location: location || null, manager_staff_id: manager_staff_id || null })
                .select().single();
            if (error) throw error;
            if (Array.isArray(branch_links) && branch_links.length) {
                const rows = branch_links.map((l) => ({
                    warehouse_id: wh.id,
                    branch_id: l.branch_id,
                    is_default: !!l.is_default,
                }));
                const { error: linkErr } = await client.from('branch_warehouses').insert(rows);
                if (linkErr) throw linkErr;
            }
            return wh;
        },
        async update(id, { name, code, location, manager_staff_id }) {
            const patch = {};
            if (name !== undefined) patch.name = name;
            if (code !== undefined) patch.code = code;
            if (location !== undefined) patch.location = location || null;
            if (manager_staff_id !== undefined) patch.manager_staff_id = manager_staff_id || null;
            const { error } = await client.from('warehouses').update(patch).eq('id', id);
            if (error) throw error;
        },
        async remove(id) {
            const { error } = await client.from('warehouses').delete().eq('id', id);
            if (error) throw error;
        },
        async replaceBranchLinks(warehouseId, branchLinks) {
            // Wipe & recreate for simplicity. branchLinks: [{ branch_id, is_default }]
            const { error: delErr } = await client.from('branch_warehouses')
                .delete().eq('warehouse_id', warehouseId);
            if (delErr) throw delErr;
            if (!branchLinks || !branchLinks.length) return;
            const rows = branchLinks.map((l) => ({
                warehouse_id: warehouseId,
                branch_id: l.branch_id,
                is_default: !!l.is_default,
            }));
            const { error: insErr } = await client.from('branch_warehouses').insert(rows);
            if (insErr) throw insErr;
        },
    };

    /* ---- roles + session (Phase 1) --------------------------- */
    const roles = {
        async assign(staffId, newRole, changedBy) {
            const { error } = await client.rpc('assign_role', {
                p_staff_id: staffId,
                p_new_role: newRole,
                p_changed_by: changedBy,
            });
            if (error) throw error;
        },
        async checkSession(staffId, sessionVersion) {
            const { data, error } = await client.rpc('check_session', {
                p_staff_id: staffId,
                p_session_version: sessionVersion,
            });
            if (error) throw error;
            return data === true;
        },
        async generateStaffCode(branchId) {
            const { data, error } = await client.rpc('generate_staff_code', { p_branch_id: branchId });
            if (error) throw error;
            return data;
        },
    };

    /* ---- product transfers (Phase 2) ------------------------- */
    const productTransfers = {
        // Fetch transfers. Optional filters:
        //   { status, fromWarehouseId, toBranchId, productId, limit }
        async list(opts = {}) {
            let q = client.from('product_transfer_requests')
                .select('*, from_warehouse:from_warehouse_id(name,code), to_warehouse:to_warehouse_id(name,code), from_branch:from_branch_id(name), to_branch:to_branch_id(name)')
                .order('requested_at', { ascending: false });
            q = applyEnvFilter(q);
            if (opts.status)            q = q.eq('status', opts.status);
            if (opts.fromWarehouseId)   q = q.eq('from_warehouse_id', opts.fromWarehouseId);
            if (opts.toBranchId)        q = q.eq('to_branch_id', opts.toBranchId);
            if (opts.productId)         q = q.eq('product_id', opts.productId);
            if (opts.limit)             q = q.limit(opts.limit);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },

        // Count pending transfers, optionally scoped to a branch (incoming).
        async countPending({ toBranchId, fromWarehouseId } = {}) {
            let q = client.from('product_transfer_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending');
            q = applyEnvFilter(q);
            if (toBranchId)     q = q.eq('to_branch_id', toBranchId);
            if (fromWarehouseId) q = q.eq('from_warehouse_id', fromWarehouseId);
            const { count, error } = await q;
            if (error) throw error;
            return count || 0;
        },

        // Find warehouses that hold a given item_no with stock > 0, excluding
        // a warehouse (typically the requester's own). Used to populate the
        // "From which branch" dropdown in the request modal.
        async findSourcesForItem(itemNo, excludeWarehouseId) {
            let q = client.from('products')
                .select('id, warehouse_id, stock, branch_id, warehouses:warehouse_id(name,code), branches:branch_id(name)')
                .eq('item_no', itemNo)
                .gt('stock', 0)
                .eq('is_draft', false);
            q = applyEnvFilter(q);
            const { data, error } = await q;
            if (error) throw error;
            return (data || []).filter((p) => p.warehouse_id && p.warehouse_id !== excludeWarehouseId);
        },

        // Create a new transfer request (calls the SECURITY DEFINER RPC).
        async create({ product_id, from_warehouse_id, qty, payment_method, payment_provider, delivery_type, requester_staff_id, requester_code, note, delivery_address, delivery_recipient_name, delivery_recipient_phone }) {
            const { data, error } = await client.rpc('request_product_transfer', {
                p_product_id: product_id,
                p_from_warehouse_id: from_warehouse_id,
                p_qty: qty,
                p_payment_method: payment_method,
                p_payment_provider: payment_provider || null,
                p_delivery_type: delivery_type,
                p_requester_staff_id: requester_staff_id,
                p_requester_code: requester_code || null,
                p_note: note || null,
                p_delivery_address: delivery_address || null,
                p_delivery_recipient_name: delivery_recipient_name || null,
                p_delivery_recipient_phone: delivery_recipient_phone || null,
            });
            if (error) throw error;
            return data; // the PT-... code
        },

        // Receive a transfer: atomic stock move + status update.
        async receive(id, { receiver_staff_id, receiver_code, qty_received, payment_confirmed }) {
            const { error } = await client.rpc('receive_product_transfer', {
                p_id: id,
                p_receiver_staff_id: receiver_staff_id,
                p_receiver_code: receiver_code || null,
                p_qty_received: qty_received,
                p_payment_confirmed: !!payment_confirmed,
            });
            if (error) throw error;
        },

        // Cancel a pending transfer.
        async cancel(id, { by_staff_id, reason }) {
            const { error } = await client.rpc('cancel_product_transfer', {
                p_id: id,
                p_by_staff_id: by_staff_id,
                p_reason: reason || null,
            });
            if (error) throw error;
        },

        // Subscribe to realtime changes on this table. Returns an unsubscribe
        // function. The callback gets the Supabase change payload.
        subscribe(onChange) {
            if (!client) return () => {};
            const ch = client.channel('ch-product-transfers')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'product_transfer_requests' }, onChange)
                .subscribe();
            return () => client.removeChannel(ch);
        },
    };

    /* ---- payment accounts (Phase 2) -------------------------- */
    const paymentAccounts = {
        async list() {
            // Pull accounts + their linked branches (for the admin table display)
            const [accountsResult, linksResult] = await Promise.all([
                client.from('payment_accounts').select('*').order('is_global', { ascending: false }).order('method').order('provider'),
                client.from('payment_account_branches').select('payment_account_id, branch_id, branches(name)'),
            ]);
            if (accountsResult.error) throw accountsResult.error;
            if (linksResult.error) throw linksResult.error;
            const linksByAccount = new Map();
            (linksResult.data || []).forEach((l) => {
                const arr = linksByAccount.get(l.payment_account_id) || [];
                arr.push({ branch_id: l.branch_id, branch_name: l.branches && l.branches.name });
                linksByAccount.set(l.payment_account_id, arr);
            });
            return (accountsResult.data || []).map((a) => ({ ...a, branches: linksByAccount.get(a.id) || [] }));
        },
        async listForBranch(branchId) {
            const { data, error } = await client.rpc('payment_accounts_for_branch', { p_branch_id: branchId });
            if (error) throw error;
            return data || [];
        },
        async add({ method, provider, account_name, account_number, notes, is_global, branch_ids, created_by }) {
            const { data: pa, error } = await client.from('payment_accounts')
                .insert({ method, provider, account_name, account_number, notes: notes || null, is_global: !!is_global, created_by: created_by || null })
                .select().single();
            if (error) throw error;
            if (!is_global && Array.isArray(branch_ids) && branch_ids.length > 0) {
                const rows = branch_ids.map((b) => ({ payment_account_id: pa.id, branch_id: b }));
                const { error: linkErr } = await client.from('payment_account_branches').insert(rows);
                if (linkErr) throw linkErr;
            }
            return pa;
        },
        async update(id, { method, provider, account_name, account_number, notes, is_global }) {
            const patch = {};
            if (method !== undefined)         patch.method = method;
            if (provider !== undefined)       patch.provider = provider;
            if (account_name !== undefined)   patch.account_name = account_name;
            if (account_number !== undefined) patch.account_number = account_number;
            if (notes !== undefined)          patch.notes = notes || null;
            if (is_global !== undefined)      patch.is_global = !!is_global;
            const { error } = await client.from('payment_accounts').update(patch).eq('id', id);
            if (error) throw error;
        },
        async remove(id) {
            const { error } = await client.from('payment_accounts').delete().eq('id', id);
            if (error) throw error;
        },
        async replaceBranchLinks(accountId, branchIds) {
            const { error: delErr } = await client.from('payment_account_branches').delete().eq('payment_account_id', accountId);
            if (delErr) throw delErr;
            if (!branchIds || branchIds.length === 0) return;
            const rows = branchIds.map((b) => ({ payment_account_id: accountId, branch_id: b }));
            const { error } = await client.from('payment_account_branches').insert(rows);
            if (error) throw error;
        },
    };

    /* ---- customer orders (Phase 3) --------------------------- */
    const customerOrders = {
        // List orders with optional filters; joins minimal nested data
        async list(opts = {}) {
            let q = client.from('customer_orders')
                .select('*, branch:branch_id(name), warehouse:warehouse_id(name,code), initiator:initiated_by(name,staff_code), validator:validated_by(name,staff_code)')
                .order('created_at', { ascending: false });
            q = applyEnvFilter(q);
            if (opts.branchId)       q = q.eq('branch_id', opts.branchId);
            if (opts.warehouseId)    q = q.eq('warehouse_id', opts.warehouseId);
            if (opts.status)         q = q.eq('status', opts.status);
            if (opts.limit)          q = q.limit(opts.limit);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        async get(id) {
            const [orderResult, itemsResult] = await Promise.all([
                client.from('customer_orders')
                    .select('*, branch:branch_id(name,location), warehouse:warehouse_id(name,code), initiator:initiated_by(name,staff_code), validator:validated_by(name,staff_code), payment_account:payment_account_id(provider,account_name,account_number,method)')
                    .eq('id', id).single(),
                client.from('customer_order_items').select('*').eq('order_id', id),
            ]);
            if (orderResult.error) throw orderResult.error;
            if (itemsResult.error) throw itemsResult.error;
            return { ...orderResult.data, items: itemsResult.data || [] };
        },
        async getByInvoiceCode(invoiceCode) {
            const { data, error } = await client.from('customer_orders').select('id').eq('invoice_code', invoiceCode).maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return this.get(data.id);
        },
        // Create a new order. items: [{ product_id, item_no, description, qty, unit_price, source, source_warehouse_id }]
        async create({ branch_id, warehouse_id, client_name, client_phone, client_email, initiated_by, initiated_by_code, payment_method, payment_provider, payment_account_id, payment_confirmed, note, items }) {
            const { data, error } = await client.rpc('create_customer_order', {
                p_branch_id: branch_id,
                p_warehouse_id: warehouse_id || null,
                p_client_name: client_name,
                p_client_phone: client_phone || null,
                p_client_email: client_email || null,
                p_initiated_by: initiated_by,
                p_initiated_by_code: initiated_by_code || null,
                p_payment_method: payment_method,
                p_payment_provider: payment_provider || null,
                p_payment_account_id: payment_account_id || null,
                p_payment_confirmed: !!payment_confirmed,
                p_note: note || null,
                p_items: items,
                p_env: currentMode(),
            });
            if (error) throw error;
            // The RPC returns one row. After the fix-2 migration the columns
            // are (order_id, order_code, order_invoice_code); pre-fix it was
            // (id, code, invoice_code). Normalise so the caller always sees
            // the old { id, code, invoice_code } shape.
            const row = Array.isArray(data) ? data[0] : data;
            if (!row) return row;
            return {
                id:           row.id           ?? row.order_id,
                code:         row.code         ?? row.order_code,
                invoice_code: row.invoice_code ?? row.order_invoice_code,
            };
        },
        async validateInvoice(code, warehouseId, validatorId, validatorCode) {
            const { data, error } = await client.rpc('validate_invoice_code', {
                p_code: code,
                p_warehouse_id: warehouseId,
                p_validator_id: validatorId,
                p_validator_code: validatorCode || null,
            });
            if (error) throw error;
            return Array.isArray(data) ? data[0] : data;
        },
        async fulfill(orderId, validatorId, validatorCode) {
            const { error } = await client.rpc('fulfill_customer_order', {
                p_order_id: orderId,
                p_validator_id: validatorId,
                p_validator_code: validatorCode || null,
            });
            if (error) throw error;
        },
        async cancel(orderId, byStaffId, reason) {
            const { error } = await client.rpc('cancel_customer_order', {
                p_order_id: orderId,
                p_by_staff_id: byStaffId,
                p_reason: reason || null,
            });
            if (error) throw error;
        },
        subscribe(onChange) {
            if (!client) return () => {};
            const ch = client.channel('ch-customer-orders')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_orders' }, onChange)
                .subscribe();
            return () => client.removeChannel(ch);
        },
    };

    /* ---- direct stock move (Phase 4 — super-role only) ------- */
    const stockMoves = {
        // Move stock from one warehouse to another without going through
        // the request/receive flow. Server-side enforces super-role.
        async direct({ item_no, from_warehouse_id, to_warehouse_id, qty, by_staff_id, note, mode }) {
            const { data, error } = await client.rpc('move_stock_direct', {
                p_item_no: item_no,
                p_from_warehouse_id: from_warehouse_id,
                p_to_warehouse_id: to_warehouse_id,
                p_qty: qty,
                p_by_staff_id: by_staff_id,
                p_note: note || null,
                p_env: mode || 'live',
            });
            if (error) throw error;
            return data; // MV-... code
        },
    };

    /* ---- media library (Phase 4) ---------------------------- */
    const media = {
        async list(mode) {
            let q = client.from('media_assets').select('*').order('created_at', { ascending: false });
            if (mode) q = q.eq('env', mode);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        },
        async add({ url, public_id, filename, mime, bytes, uploaded_by, uploaded_by_name, note, mode }) {
            const { data, error } = await client.from('media_assets')
                .insert({ url, public_id, filename, mime, bytes, uploaded_by, uploaded_by_name, note: note || null, env: mode || 'live' })
                .select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await client.from('media_assets').delete().eq('id', id);
            if (error) throw error;
        },
    };

    /* ---- ID card settings (Phase 4) ------------------------- */
    const idCardSettings = {
        async get() {
            const { data, error } = await client.from('id_card_settings').select('*').eq('id', 1).single();
            if (error) throw error;
            return data;
        },
        async update(patch) {
            const { error } = await client.from('id_card_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1);
            if (error) throw error;
        },
    };

    /* ---- Feature flags (System Admin toggles) ---------------- */
    const featureFlags = {
        async get() {
            const fallback = {
                transfers_enabled: true,
                move_stock_enabled: true,
                id_cards_visible_to_director: false,
                director_id_card_templates: 'classic',
            };
            try {
                const { data, error } = await client.from('feature_flags').select('*').eq('id', 1).maybeSingle();
                if (error) throw error;
                if (!data) return fallback;
                // Forward-compat: if only the old single-value column came
                // back (pre-fix-3 migration), surface it under the new key.
                if (!data.director_id_card_templates && data.director_id_card_template) {
                    data.director_id_card_templates = data.director_id_card_template;
                }
                if (!data.director_id_card_templates) data.director_id_card_templates = 'classic';
                return data;
            } catch (_) { return fallback; }
        },
        async update(patch) {
            const { error } = await client.from('feature_flags').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1);
            if (error) throw error;
        },
    };

    /* ---- dev/live mode helpers (Phase 4) -------------------- */
    const devMode = {
        // The mode toggle lives in localStorage so it survives reloads,
        // is per-browser (so two sysadmins can be in different modes),
        // and the client uses it to filter reads + tag writes.
        KEY: 'ch_mode',
        current() {
            try { return localStorage.getItem(devMode.KEY) === 'dev' ? 'dev' : 'live'; }
            catch (_) { return 'live'; }
        },
        set(mode) {
            try { localStorage.setItem(devMode.KEY, mode === 'dev' ? 'dev' : 'live'); }
            catch (_) {}
        },
        async resetDevData() {
            const { error } = await client.rpc('reset_dev_data');
            if (error) throw error;
        },
        async publishProduct(productId) {
            const { error } = await client.rpc('publish_dev_product', { p_id: productId });
            if (error) throw error;
        },
    };

    /* ---- expose ---------------------------------------------- */
    window.CH = Object.assign(window.CH || {}, {
        supabase: client,
        get session() { return readSession(); },
        signIn,
        signOut,
        requireSession,
        branches,
        staff,
        products,
        messages,
        reports,
        logs,
        drafts,
        announcements,
        categories,
        materials,
        warehouses,
        roles,
        productTransfers,
        paymentAccounts,
        customerOrders,
        stockMoves,
        media,
        idCardSettings,
        featureFlags,
        devMode,
    });
})();

