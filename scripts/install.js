/* ============================================================
   Clasikal Homes — PWA install prompt
   - Chromium / Android: captures beforeinstallprompt, shows floating chip
   - iOS / Safari:       shows a one-time hint ("Share → Add to Home Screen")
   - Hides if already installed (display-mode: standalone) or dismissed
   ============================================================ */
(function () {
    'use strict';

    const DISMISS_KEY = 'ch_install_dismissed';

    // Already installed (PWA) → nothing to do
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;

    // User already dismissed → nothing to do
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // ---- Floating chip ------------------------------------------------------
    const chip = document.createElement('div');
    chip.id = 'chInstallChip';
    chip.style.cssText = `
        position: fixed; right: 16px; bottom: 16px;
        z-index: 9000;
        display: none;
        align-items: center;
        gap: 10px;
        max-width: calc(100vw - 32px);
        padding: 10px 12px 10px 14px;
        background: rgba(10, 26, 51, 0.92);
        backdrop-filter: blur(14px) saturate(140%);
        -webkit-backdrop-filter: blur(14px) saturate(140%);
        color: #E2E8F0;
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 12px;
        font: 500 13px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 200ms ease, transform 200ms ease;
    `;
    chip.innerHTML = `
        <span style="display:inline-flex;width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#0EA5E9,#38BDF8);color:#051022;align-items:center;justify-content:center;flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        </span>
        <span id="chInstallText" style="flex:1;min-width:0;">Install Clasikal Homes as an app</span>
        <button id="chInstallBtn" type="button" style="
            background: linear-gradient(135deg, #0EA5E9, #38BDF8);
            color: #051022; border: 0;
            padding: 7px 12px;
            border-radius: 8px;
            font: 600 12px/1 inherit; cursor: pointer;
            letter-spacing: 0.02em;
        ">Install</button>
        <button id="chInstallClose" type="button" aria-label="Dismiss" style="
            background: transparent; border: 0;
            color: rgba(226, 232, 240, 0.6); cursor: pointer;
            width: 28px; height: 28px; border-radius: 6px;
            display: inline-grid; place-items: center;
        ">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(chip));

    function show() {
        chip.style.display = 'flex';
        requestAnimationFrame(() => {
            chip.style.opacity = '1';
            chip.style.transform = 'translateY(0)';
        });
    }
    function hide() {
        chip.style.opacity = '0';
        chip.style.transform = 'translateY(6px)';
        setTimeout(() => { chip.style.display = 'none'; }, 220);
    }
    function dismissForever() {
        localStorage.setItem(DISMISS_KEY, '1');
        hide();
    }

    // ---- Chromium / Edge / Android (beforeinstallprompt) --------------------
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(show, 800); // small delay so it doesn't slam the user on first paint
    });

    document.addEventListener('click', async (e) => {
        if (e.target.closest('#chInstallClose')) { dismissForever(); return; }
        if (e.target.closest('#chInstallBtn')) {
            if (deferredPrompt) {
                hide();
                deferredPrompt.prompt();
                try {
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') localStorage.setItem(DISMISS_KEY, '1');
                } catch (_) {}
                deferredPrompt = null;
            } else if (isIOS()) {
                showIOSHint();
            }
        }
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem(DISMISS_KEY, '1');
        hide();
    });

    // ---- iOS Safari (no beforeinstallprompt) -------------------------------
    function isIOS() {
        const ua = navigator.userAgent || '';
        const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        // iPadOS 13+ reports as Mac — check touch
        const iPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
        return iOS || iPadOS;
    }

    function showIOSHint() {
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed; left: 50%; bottom: 80px;
            transform: translateX(-50%);
            z-index: 9001;
            max-width: calc(100vw - 32px);
            padding: 14px 16px;
            background: rgba(10, 26, 51, 0.96);
            color: #E2E8F0;
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 12px;
            font: 500 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        `;
        hint.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">To install on iPhone / iPad</div>
            <div>Tap the Share button <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> in Safari, then choose <b>Add to Home Screen</b>.</div>
        `;
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 8000);
    }

    // ---- iOS: auto-show install hint chip after page settles ----------------
    if (isIOS()) {
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('chInstallText').textContent = 'Install on your iPhone';
            document.getElementById('chInstallBtn').textContent = 'How';
            setTimeout(show, 1200);
        });
    }
})();
