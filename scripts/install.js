/* ============================================================
   Clasikal Homes — PWA install
   Single branded chip, top-right-of-bottom corner. Adapts to platform:
   - Chromium / Edge / Android: uses captured beforeinstallprompt
   - iOS Safari: shows "Add to Home Screen" hint
   - macOS Safari: shows toolbar / menu install hint
   - Other desktops (Firefox, etc.): shows browser-menu hint
   Add `?ch_force_prompt=1` to any URL to bypass dismissal and force-show.
   ============================================================ */
(function () {
    'use strict';

    const DISMISS_KEY = 'ch_install_dismissed';
    const FORCE_PROMPT = new URL(location.href).searchParams.get('ch_force_prompt') === '1';

    // Already installed → nothing to do
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
    if (FORCE_PROMPT) localStorage.removeItem(DISMISS_KEY);
    if (localStorage.getItem(DISMISS_KEY) === '1' && !FORCE_PROMPT) return;

    // ---- One branded chip (NO duplicate buttons) ----------------------------
    let deferredPrompt = null;
    let chip = null;
    let hint = null;

    function buildChip() {
        const el = document.createElement('div');
        el.id = 'chInstallChip';
        el.style.cssText = `
            position: fixed; right: 16px; bottom: 16px;
            z-index: 9000;
            display: none;
            align-items: center;
            gap: 10px;
            max-width: calc(100vw - 32px);
            padding: 10px 12px 10px 14px;
            background: rgba(10, 26, 51, 0.94);
            backdrop-filter: blur(14px) saturate(140%);
            -webkit-backdrop-filter: blur(14px) saturate(140%);
            color: #E2E8F0;
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 14px;
            font: 500 13px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
            opacity: 0;
            transform: translateY(6px);
            transition: opacity 200ms ease, transform 200ms ease;
        `;
        el.innerHTML = `
            <img src="assets/logo.png?v=4" alt="" width="32" height="32" style="border-radius:8px;background:#fff;padding:3px;object-fit:contain;flex-shrink:0;" />
            <span id="chInstallText" style="flex:1;min-width:0;">Install Clasikal Homes</span>
            <button id="chInstallBtn" type="button" style="
                background: linear-gradient(135deg, #0EA5E9, #38BDF8);
                color: #051022; border: 0;
                padding: 8px 14px; border-radius: 9px;
                font: 600 12px/1 inherit; cursor: pointer;
                letter-spacing: 0.02em; flex-shrink: 0;
            ">Install</button>
            <button id="chInstallClose" type="button" aria-label="Dismiss" style="
                background: transparent; border: 0;
                color: rgba(226, 232, 240, 0.55); cursor: pointer;
                width: 28px; height: 28px; border-radius: 6px;
                display: inline-grid; place-items: center; flex-shrink: 0;
            ">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        document.body.appendChild(el);
        return el;
    }

    function show() {
        if (!chip) chip = buildChip();
        chip.style.display = 'flex';
        requestAnimationFrame(() => {
            chip.style.opacity = '1';
            chip.style.transform = 'translateY(0)';
        });
    }
    function hide() {
        if (!chip) return;
        chip.style.opacity = '0';
        chip.style.transform = 'translateY(6px)';
        setTimeout(() => { if (chip) chip.style.display = 'none'; }, 220);
    }
    function dismissForever() {
        localStorage.setItem(DISMISS_KEY, '1');
        hide();
        if (hint) hint.remove();
    }

    // ---- Platform-specific install hints ------------------------------------
    function isIOS() {
        const ua = navigator.userAgent || '';
        const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const iPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
        return iOS || iPadOS;
    }
    function isMacDesktop() {
        return /Macintosh/.test(navigator.userAgent || '') && !isIOS();
    }
    function isFirefox() {
        return /Firefox/.test(navigator.userAgent || '');
    }
    function isEdgeOrChrome() {
        const ua = navigator.userAgent || '';
        return /Chrome|Edg/.test(ua);
    }

    function showHint() {
        if (hint) { hint.remove(); hint = null; }
        let title, detail;
        if (isIOS()) {
            title = 'Install on iPhone / iPad';
            detail = 'Tap the <b>Share</b> button in Safari (square with the up arrow), then choose <b>Add to Home Screen</b>.';
        } else if (isMacDesktop()) {
            title = 'Install on Mac';
            detail = 'In Safari: <b>File → Add to Dock</b>. In Chrome / Edge: click the install icon (⊕) in the address bar, or use <b>menu → Install Clasikal Homes</b>.';
        } else if (isFirefox()) {
            title = 'Install on Firefox';
            detail = 'Firefox desktop does not support installing web apps. To install, open this page in <b>Chrome</b> or <b>Edge</b> and use the install button in the address bar.';
        } else if (isEdgeOrChrome()) {
            title = 'Install Clasikal Homes';
            detail = 'Click the install icon (⊕) on the right side of the address bar, or open the browser <b>⋮ menu → Install Clasikal Homes</b>.';
        } else {
            title = 'Install Clasikal Homes';
            detail = 'Open your browser menu and look for <b>Install</b> or <b>Add to Home Screen</b>.';
        }
        hint = document.createElement('div');
        hint.id = 'chInstallHint';
        hint.style.cssText = `
            position: fixed; right: 16px; bottom: 78px;
            z-index: 9001;
            max-width: min(380px, calc(100vw - 32px));
            padding: 16px 18px;
            background: rgba(10, 26, 51, 0.97);
            color: #E2E8F0;
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 14px;
            font: 500 13px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        `;
        hint.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <img src="assets/logo.png?v=4" alt="" width="28" height="28" style="border-radius:7px;background:#fff;padding:2px;object-fit:contain;flex-shrink:0;" />
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:#fff;margin-bottom:4px;">${title}</div>
                    <div>${detail}</div>
                </div>
                <button id="chInstallHintClose" type="button" aria-label="Close" style="
                    background:transparent;border:0;color:rgba(226,232,240,0.55);
                    cursor:pointer;width:24px;height:24px;border-radius:5px;flex-shrink:0;
                    display:grid;place-items:center;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
        document.body.appendChild(hint);
        hint.querySelector('#chInstallHintClose').addEventListener('click', () => { hint.remove(); hint = null; });
    }

    // ---- Wire it up ---------------------------------------------------------
    // Capture Chromium / Edge / Android prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // If chip is already up, update its label
        if (chip) {
            const txt = chip.querySelector('#chInstallText');
            if (txt) txt.textContent = 'Install Clasikal Homes';
        }
    });

    // Show the chip after a short delay if any install path is plausible
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            // Always show on these — every desktop and mobile is supported
            // via either the native prompt or platform-specific hint.
            show();
        }, 700);
    });

    // Single delegated handler for all chip buttons
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#chInstallClose')) { dismissForever(); return; }
        if (e.target.closest('#chInstallBtn')) {
            if (deferredPrompt) {
                hide();
                deferredPrompt.prompt();
                try {
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') localStorage.setItem(DISMISS_KEY, '1');
                    else show(); // user dismissed — keep chip available
                } catch (_) {}
                deferredPrompt = null;
            } else {
                // No native prompt available — show the platform-specific hint
                showHint();
            }
        }
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem(DISMISS_KEY, '1');
        hide();
        if (hint) hint.remove();
    });
})();
