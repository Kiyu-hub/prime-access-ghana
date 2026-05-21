/* ============================================================
   Clasikal Homes — PWA install prompt
   - Chromium / Android: captures beforeinstallprompt, shows floating chip
   - iOS / Safari:       shows a one-time hint ("Share → Add to Home Screen")
   - Hides if already installed (display-mode: standalone) or dismissed
   ============================================================ */
(function () {
    'use strict';

    const DISMISS_KEY = 'ch_install_dismissed';
    const FORCE_PROMPT = new URL(location.href).searchParams.get('ch_force_prompt') === '1';

    // Already installed (PWA) → nothing to do
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;

    // If forced via query param, clear any previous dismissal so prompt can show
    if (FORCE_PROMPT) localStorage.removeItem(DISMISS_KEY);

    // User already dismissed → nothing to do (unless forced)
    if (localStorage.getItem(DISMISS_KEY) === '1' && !FORCE_PROMPT) return;

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
    // append the floating chip to the DOM
    let pageInstallBtn = null;
    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(chip);
        pageInstallBtn = document.querySelector('#chInstallPageBtn');
        // Show the floating chip and/or page button when appropriate
        const shouldShow = deferredPrompt || FORCE_PROMPT || isMacDesktop() || isIOS() || location.hostname === 'localhost';
        if (shouldShow) {
            // small delay so it doesn't slam the user on first paint
            setTimeout(() => {
                // prefer page-level button when present to avoid duplicate install controls
                if (pageInstallBtn) {
                    pageInstallBtn.style.display = 'inline-flex';
                    // keep chip hidden when page button exists
                    hide();
                } else {
                    show();
                }
            }, 600);
        } else {
            // If we have a page-level button, show it instead of auto-opening a dialog
            if (pageInstallBtn) {
                pageInstallBtn.style.display = 'inline-flex';
            } else {
                // fallback dialog for platforms that don't support beforeinstallprompt
                setTimeout(showInstallDialogFallback, 1200);
            }
        }
        // hide page button if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            if (pageInstallBtn) pageInstallBtn.style.display = 'none';
        }
    });

    // basic chip show/hide
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

    // small branded dialog fallback (for platforms that don't surface beforeinstallprompt)
    let installDialog = null;

    function createInstallDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'chInstallDialog';
        dialog.style.cssText = `
            position: fixed;
            right: 16px;
            bottom: 16px;
            z-index: 9001;
            display: none;
            flex-direction: column;
            gap: 10px;
            width: min(420px, calc(100vw - 32px));
            background: rgba(10, 26, 51, 0.96);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 18px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
            color: #E2E8F0;
            font: 500 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            backdrop-filter: blur(18px) saturate(140%);
            -webkit-backdrop-filter: blur(18px) saturate(140%);
            overflow: hidden;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 220ms ease, transform 220ms ease;
        `;
        dialog.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;padding:16px;">
                <img src="assets/logo.png" alt="Clasikal Homes" width="40" height="40" style="border-radius:14px;background:#fff;object-fit:cover;" />
                <div style="min-width:0;flex:1;">
                    <div style="font-size:0.95rem;font-weight:700;color:#fff;">Install Clasikal Homes</div>
                    <div style="margin-top:4px;font-size:0.82rem;color:rgba(226,232,240,0.8);line-height:1.45;">Use Clasikal Homes like a native app for faster access and offline support.</div>
                </div>
            </div>
            <div style="display:flex;gap:10px;padding:0 16px 16px;">
                <button id="chInstallDialogBtn" type="button" style="flex:1;background:linear-gradient(135deg,#0EA5E9,#38BDF8);color:#051022;border:0;padding:10px 14px;border-radius:12px;font:600 0.86rem/1 inherit;cursor:pointer;">Install now</button>
                <button id="chInstallDialogClose" type="button" style="background:transparent;border:1px solid rgba(226,232,240,0.18);color:#E2E8F0;padding:10px 14px;border-radius:12px;font:600 0.86rem/1 inherit;cursor:pointer;">Later</button>
            </div>
        `;
        document.body.appendChild(dialog);
        return dialog;
    }

    function showDialog() {
        if (!installDialog) installDialog = createInstallDialog();
        if (installDialog.style.display === 'flex') return;
        // hide chip and page button while dialog is visible
        hide();
        if (pageInstallBtn) pageInstallBtn.style.display = 'none';
        installDialog.style.display = 'flex';
        requestAnimationFrame(() => {
            installDialog.style.opacity = '1';
            installDialog.style.transform = 'translateY(0)';
        });
    }

    function hideDialog() {
        if (!installDialog) return;
        installDialog.style.opacity = '0';
        installDialog.style.transform = 'translateY(10px)';
        setTimeout(() => {
            if (installDialog) installDialog.style.display = 'none';
            // restore chip/page button if install not completed or dismissed
            if (!(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)) {
                if (localStorage.getItem(DISMISS_KEY) !== '1') {
                    if (deferredPrompt || FORCE_PROMPT || isMacDesktop() || isIOS() || location.hostname === 'localhost') show();
                    if (pageInstallBtn) pageInstallBtn.style.display = 'inline-flex';
                }
            }
        }, 240);
    }

    function dismissForever() {
        localStorage.setItem(DISMISS_KEY, '1');
        hide();
        hideDialog();
        if (pageInstallBtn) pageInstallBtn.style.display = 'none';
    }

    function showInstallDialogFallback() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
        if (localStorage.getItem(DISMISS_KEY) === '1') return;
        if (deferredPrompt) return;
        showDialog();
    }

    // ---- Chromium / Edge / Android (beforeinstallprompt) --------------------
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(show, 800); // small delay so it doesn't slam the user on first paint
    });

    // NOTE: DOMContentLoaded handler is defined above; remove duplicate handlers.

    document.addEventListener('click', async (e) => {
        if (e.target.closest('#chInstallClose') || e.target.closest('#chInstallDialogClose')) { dismissForever(); return; }
        const isPageButton = Boolean(e.target.closest('#chInstallPageBtn'));
        if (e.target.closest('#chInstallBtn') || e.target.closest('#chInstallDialogBtn') || isPageButton) {
            const isDialogButton = Boolean(e.target.closest('#chInstallDialogBtn'));
            if (deferredPrompt) {
                if (isDialogButton || isPageButton) hideDialog(); else hide();
                deferredPrompt.prompt();
                try {
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') localStorage.setItem(DISMISS_KEY, '1');
                } catch (_) {}
                deferredPrompt = null;
            } else if (isIOS() || isMacDesktop()) {
                if (isDialogButton || isPageButton) hideDialog();
                showInstallHint();
            } else if (isDialogButton) {
                const text = document.querySelector('#chInstallDialog div div');
                if (text) text.textContent = 'Use your browser menu or toolbar icon to install Clasikal Homes.';
            }
        }
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem(DISMISS_KEY, '1');
        hide();
        hideDialog();
        if (pageInstallBtn) pageInstallBtn.style.display = 'none';
    });

    // ---- helpers and hints --------------------------------------------------
    function isIOS() {
        const ua = navigator.userAgent || '';
        const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const iPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
        return iOS || iPadOS;
    }

    function isMacDesktop() {
        return /Macintosh/.test(navigator.userAgent || '') && !isIOS();
    }

    function showInstallHint() {
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
        const title = isMacDesktop() ? 'To install on Mac desktop' : 'To install on iPhone / iPad';
        const detail = isMacDesktop()
            ? 'Open the browser menu and choose Install App, or use the toolbar install icon.'
            : 'Tap the Share button in Safari, then choose Add to Home Screen.';
        hint.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">${title}</div>
            <div style="line-height:1.5;">${detail}</div>
        `;
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 8000);
    }
})();
