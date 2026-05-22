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
        async create(name, location = '') {
            const { data, error } = await client.from('branches').insert({ name, location }).select().single();
            if (error) throw error;
            return data;
        },
        async rename(id, name, location) {
            const patch = { name };
            if (location !== undefined) patch.location = location;
            const { error } = await client.from('branches').update(patch).eq('id', id);
            if (error) throw error;
        },
        async remove(id) {
            const { error } = await client.from('branches').delete().eq('id', id);
            if (error) throw error;
        },
    };

    /* ---- staff ----------------------------------------------- */
    const staff = {
        async list() {
            const { data, error } = await client.from('staff_view').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        async create({ email, password, name, role, branch_id, is_admin }) {
            const { data, error } = await client.rpc('create_staff', {
                p_email: email,
                p_password: password,
                p_name: name,
                p_role: role,
                p_branch_id: branch_id,
                p_is_admin: !!is_admin,
            });
            if (error) throw error;
            return data;
        },
        async update(id, { email, password, name, role, branch_id, is_admin }) {
            const { error } = await client.rpc('update_staff', {
                p_id: id,
                p_email: email,
                p_password: password || '',
                p_name: name,
                p_role: role,
                p_branch_id: branch_id,
                p_is_admin: !!is_admin,
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
    };

    /* ---- products -------------------------------------------- */
    const products = {
        async list(branch_id) {
            let q = client.from('products').select('*').order('created_at', { ascending: false });
            if (branch_id) q = q.eq('branch_id', branch_id);
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
                client.from('products').select('id,item_no,description,branch_id,price,stock,category,material,color,supplier,image_url,created_at'),
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
            const { data, error } = await client.from('product_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        },
        async record({ product_id, item_no, action, branch_id, branch_name, staff_id, staff_name, note }) {
            const { error } = await client.from('product_logs').insert({
                product_id: product_id || null,
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
            const { data, error } = await client.from('products')
                .select('id, warehouse_id, stock, branch_id, warehouses:warehouse_id(name,code), branches:branch_id(name)')
                .eq('item_no', itemNo)
                .gt('stock', 0)
                .eq('is_draft', false);
            if (error) throw error;
            return (data || []).filter((p) => p.warehouse_id && p.warehouse_id !== excludeWarehouseId);
        },

        // Create a new transfer request (calls the SECURITY DEFINER RPC).
        async create({ product_id, from_warehouse_id, qty, payment_method, payment_provider, delivery_type, requester_staff_id, requester_code, note }) {
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
    });
})();
