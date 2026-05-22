/* ============================================================
   Clasikal Homes — Shared UI polish layer
   initReveal, initCursor, initMobileNav, registerSW
   Loaded as a module from index.html and dashboard.html.
   ============================================================ */

export function initReveal() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

export function initCursor() {
    // Skip on touch / coarse pointer devices entirely
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    let mx = -100, my = -100;
    let rx = -100, ry = -100;

    document.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0)`;
    });

    function loop() {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        ring.style.transform = `translate3d(${rx - 17}px, ${ry - 17}px, 0)`;
        requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button, [role=button], input, select, textarea, [data-hover]')) {
            ring.classList.add('is-hover');
        } else {
            ring.classList.remove('is-hover');
        }
    });
}

export function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('navOverlay');
    const closeBtn = document.getElementById('sidebarClose');
    if (!toggle || !sidebar) return;

    function close() {
        sidebar.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-shown');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('drawer-open');
    }
    function open() {
        sidebar.classList.add('is-open');
        if (overlay) overlay.classList.add('is-shown');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('drawer-open');
    }

    toggle.addEventListener('click', () => {
        sidebar.classList.contains('is-open') ? close() : open();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('#sidebarClose')) return; // already handled
        if (e.target.closest('.nav a')) close();        // auto-close after tapping a nav link
    });
}

const SW_RESET_KEY = 'ch_sw_reset_v4';
const UPDATE_SNOOZE_KEY = 'ch_update_snooze_until';
const SNOOZE_MS = 30 * 60 * 1000; // 30 minutes

export function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;

    // One-time hard reset: unregister any old SW + wipe its caches, then reload
    // once so the fresh sw.js installs cleanly. Bump SW_RESET_KEY to trigger again.
    if (!localStorage.getItem(SW_RESET_KEY)) {
        (async () => {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister()));
                if (window.caches && caches.keys) {
                    const keys = await caches.keys();
                    await Promise.all(keys.filter((k) => k.startsWith('ch-v')).map((k) => caches.delete(k)));
                }
            } catch (_) {}
            localStorage.setItem(SW_RESET_KEY, '1');
            // Reload once so the new SW installs against fresh, uncached HTML/CSS/JS
            setTimeout(() => location.reload(), 60);
        })();
        return; // skip register() this load — it happens after the reload
    }

    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('./scripts/sw.js');

            // Auto-detect when a new SW becomes available and open the dialog.
            // The page itself NEVER reloads automatically — only when the user
            // clicks "Update Now" inside the dialog. So this is a non-destructive
            // prompt, never an interruption.
            reg.addEventListener('updatefound', () => {
                const newSW = reg.installing;
                if (!newSW) return;
                newSW.addEventListener('statechange', () => {
                    if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateDialog(reg);
                    }
                });
            });
            // If a waiting SW already exists when the page loads (e.g. user
            // dismissed earlier and came back), show the dialog right away.
            if (reg.waiting && navigator.serviceWorker.controller) {
                showUpdateDialog(reg);
            }

            // Aggressive update polling so a fresh deploy surfaces within ~60s
            // instead of waiting for the browser's default 24-hour SW check.
            // Also re-check whenever the tab is focused or becomes visible.
            const checkForUpdate = () => reg.update().catch(() => {});
            setInterval(checkForUpdate, 60 * 1000);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') checkForUpdate();
            });
            window.addEventListener('focus', checkForUpdate);
            window.addEventListener('online', checkForUpdate);
        } catch (err) {
            console.warn('[CH] Service worker registration failed:', err);
        }
    });
}

function showUpdateDialog(reg) {
    if (document.getElementById('chUpdateModal')) return;
    const snoozeUntil = Number(localStorage.getItem(UPDATE_SNOOZE_KEY) || 0);
    if (Date.now() < snoozeUntil) return;
    // Just finished an update? Suppress the dialog for 60 seconds so any
    // lingering "waiting" SW state from the previous instance can't loop us.
    if (sessionStorage.getItem('ch_just_updated') === '1') {
        sessionStorage.removeItem('ch_just_updated');
        localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + 60 * 1000));
        return;
    }

    // Fetch the new SW's version so we can show it in the dialog
    let newVersion = '';
    try {
        if (reg && reg.waiting) {
            const channel = new MessageChannel();
            channel.port1.onmessage = (e) => {
                if (e.data && e.data.version) {
                    newVersion = e.data.version;
                    const numEl = document.getElementById('chUpdateNewV');
                    if (numEl) numEl.textContent = newVersion;
                }
            };
            reg.waiting.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        }
    } catch (_) {}

    const overlay = document.createElement('div');
    overlay.id = 'chUpdateModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'chUpdateTitle');
    overlay.style.cssText = `
        position: fixed; inset: 0;
        z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        background: rgba(11, 31, 63, 0.55);
        backdrop-filter: blur(8px) saturate(120%);
        -webkit-backdrop-filter: blur(8px) saturate(120%);
        opacity: 0;
        transition: opacity 200ms ease;
    `;
    overlay.innerHTML = `
        <div style="width:100%;max-width:440px;background:#fff;border-radius:18px;box-shadow:0 32px 80px rgba(2,6,23,0.45);overflow:hidden;font-family:inherit;transform:translateY(-8px) scale(0.97);transition:transform 240ms cubic-bezier(0.2,0,0,1), opacity 240ms ease;opacity:0;">
            <div style="padding:24px 26px 18px;border-bottom:1px solid #E5E7EB;display:flex;align-items:flex-start;gap:14px;">
                <div style="flex:0 0 44px;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0EA5E9,#38BDF8);color:#fff;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </div>
                <div style="flex:1;min-width:0;">
                    <h3 id="chUpdateTitle" style="margin:0;font-family:'Bodoni Moda',Georgia,serif;font-weight:600;font-size:1.25rem;color:#0F172A;letter-spacing:-0.01em;">Update Available</h3>
                    <p style="margin:4px 0 0;font-size:0.86rem;color:#64748B;line-height:1.45;">A new version of the staff portal is ready. Your current work is safe — nothing will reload until you choose to update.</p>
                </div>
            </div>
            <div style="padding:18px 26px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:0.78rem;color:#64748B;">
                <span>New version</span>
                <code id="chUpdateNewV" style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;color:#0F172A;background:#F1F5F9;padding:3px 8px;border-radius:6px;">…</code>
            </div>
            <div style="padding:14px 22px 22px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                <button id="chUpdateLater" type="button" style="background:#fff;border:1.5px solid #E5E7EB;color:#475569;padding:10px 18px;border-radius:10px;font:500 0.88rem/1 inherit;cursor:pointer;flex:0 1 auto;">Remind me later</button>
                <button id="chUpdateNow" type="button" style="background:linear-gradient(135deg,#0B1F3F,#0369A1);color:#fff;border:0;padding:10px 22px;border-radius:10px;font:600 0.88rem/1 inherit;cursor:pointer;box-shadow:0 4px 12px rgba(3,105,161,0.35);flex:0 1 auto;">Update Now</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const dialog = overlay.firstElementChild;
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        dialog.style.opacity = '1';
        dialog.style.transform = 'translateY(0) scale(1)';
    });

    function close() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 240);
    }
    overlay.querySelector('#chUpdateLater').addEventListener('click', () => {
        localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
        close();
    });
    overlay.querySelector('#chUpdateNow').addEventListener('click', async () => {
        const btn = overlay.querySelector('#chUpdateNow');
        btn.disabled = true;
        btn.textContent = 'Updating…';
        // Log the update BEFORE reload — best-effort, never blocks the update.
        try {
            const session = (window.CH && window.CH.session) || null;
            const fromV = await readCurrentSWVersion();
            if (session && window.CH && window.CH.logs && window.CH.logs.record) {
                await window.CH.logs.record({
                    action: 'app_updated',
                    staff_id: session.id,
                    staff_name: session.name,
                    branch_id: session.branch_id,
                    branch_name: session.branch_name,
                    note: 'Updated' + (fromV ? ' from ' + fromV : '') + (newVersion ? ' to ' + newVersion : ''),
                });
            }
        } catch (_) { /* swallow — never block the update */ }

        // CRITICAL: don't reload until the new SW has actually taken over.
        // Reloading too early leaves the OLD SW in control and the new one
        // still waiting → dialog reappears in a loop on the next load.
        sessionStorage.setItem('ch_just_updated', '1');
        let reloaded = false;
        const reload = () => {
            if (reloaded) return;
            reloaded = true;
            location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
        try { if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
        // Hard fallback in case the controllerchange event never fires (rare)
        setTimeout(reload, 5000);
    });
    // ESC dismisses (treats as "later") but never auto-applies
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', onKey);
            localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
            close();
        }
    });
}

/**
 * Returns the currently-running app version. Used to log
 * "updated from X to Y" entries.
 */
async function readCurrentSWVersion() {
    return (typeof self !== 'undefined' && self.CH_APP_VERSION) || (typeof window !== 'undefined' && window.CH_APP_VERSION) || '';
}

/**
 * Writes the current app version (from scripts/version.js) into the badge.
 * Instant — no service-worker round-trip. The version constant is loaded
 * via the <script src="scripts/version.js"> tag before this module runs.
 */
export function showAppVersion(selector = '#sbVersion') {
    const el = document.querySelector(selector);
    if (!el) return;
    const v = (typeof self !== 'undefined' && self.CH_APP_VERSION) || (typeof window !== 'undefined' && window.CH_APP_VERSION) || '';
    el.textContent = v || 'v—';
}

/**
 * Manually triggers a service-worker update check. Clears the snooze so
 * any waiting update shows its dialog immediately. Bound to the version
 * badge so the user can tap it any time.
 */
export async function checkForUpdates(btnSelector = '#sbVersionBtn') {
    const btn = btnSelector ? document.querySelector(btnSelector) : null;
    const restore = btn && btn.querySelector('.sb-version__num') ? btn.querySelector('.sb-version__num').textContent : '';
    try {
        if (btn && btn.querySelector('.sb-version__num')) btn.querySelector('.sb-version__num').textContent = '…';
        // Always clear snooze when user manually checks
        localStorage.removeItem(UPDATE_SNOOZE_KEY);
        if (!('serviceWorker' in navigator)) {
            toast('Updates not supported by this browser.');
            return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
            toast('Reload the page to install the latest version.');
            return;
        }
        await reg.update();
        // If a waiting SW exists after update, show the dialog now
        if (reg.waiting && navigator.serviceWorker.controller) {
            showUpdateDialog(reg);
        } else {
            toast('You are on the latest version.');
        }
    } catch (e) {
        console.warn('[CH] update check failed:', e);
        toast('Could not check for updates.');
    } finally {
        if (btn && btn.querySelector('.sb-version__num') && restore) {
            btn.querySelector('.sb-version__num').textContent = restore;
        }
    }
}

// Tiny toast for the version badge (avoids depending on dashboard.js's toast)
function toast(msg) {
    let host = document.getElementById('chUiToast');
    if (!host) {
        host = document.createElement('div');
        host.id = 'chUiToast';
        host.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9500;background:rgba(15,23,42,0.94);color:#fff;padding:10px 18px;border-radius:999px;font:500 13px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,0.3);opacity:0;transition:opacity 200ms ease;pointer-events:none;';
        document.body.appendChild(host);
    }
    host.textContent = msg;
    host.style.opacity = '1';
    clearTimeout(host._t);
    host._t = setTimeout(() => { host.style.opacity = '0'; }, 2400);
}

export function initYear(selector = '#year') {
    document.querySelectorAll(selector).forEach((el) => {
        el.textContent = new Date().getFullYear();
    });
}
