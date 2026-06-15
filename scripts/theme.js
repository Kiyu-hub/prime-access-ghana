/* ============================================================
   Prime Access Ghana — Theme customizer (System Admin)
   Recolor the navy + accent palette live and reset to defaults.
   Saved per-browser in localStorage and applied on every load
   (login page + dashboard). Editor is shown to System Admin only,
   both as a floating button and a dedicated "Theme" page.
   ============================================================ */
(function () {
    'use strict';

    var STORE_KEY = 'pag_theme';

    // Palette knobs. Defaults mirror dashboard.html :root. The navy + accent
    // also drive the sidebar and login backgrounds (via color-mix in CSS).
    var SWATCHES = [
        { var: '--c-navy',     label: 'Navy — primary',  def: '#0B1F3F' },
        { var: '--c-navy-2',   label: 'Navy — deep',     def: '#112C58' },
        { var: '--c-accent',   label: 'Accent',          def: '#0369A1' },
        { var: '--c-accent-2', label: 'Accent — mid',    def: '#0284C7' },
        { var: '--c-accent-3', label: 'Accent — sky',    def: '#38BDF8' },
    ];

    function loadSaved() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; }
        catch (_) { return {}; }
    }
    function save(obj) {
        try {
            if (obj && Object.keys(obj).length) localStorage.setItem(STORE_KEY, JSON.stringify(obj));
            else localStorage.removeItem(STORE_KEY);
        } catch (_) {}
    }

    // Apply saved overrides to :root. Runs for every user on this browser.
    function applySaved() {
        var saved = loadSaved();
        SWATCHES.forEach(function (s) {
            if (saved[s.var]) document.documentElement.style.setProperty(s.var, saved[s.var]);
        });
    }
    applySaved();

    function getSession() {
        try { return JSON.parse(localStorage.getItem('ch_session') || 'null'); }
        catch (_) { return null; }
    }
    function isSystemAdmin() {
        var s = getSession();
        return !!s && s.role === 'system_manager';
    }

    function currentValue(varName, def) {
        var saved = loadSaved();
        if (saved[varName]) return saved[varName];
        var computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return computed || def;
    }

    // Keep every visible color input in sync (FAB + page can both be open).
    function syncInputs(varName, value) {
        document.querySelectorAll('input[type="color"][data-theme-var="' + varName + '"]').forEach(function (i) {
            if (i.value !== value) i.value = value;
        });
    }

    // Build the swatch rows + reset into a container. Reusable by FAB & page.
    function buildControls(container) {
        container.innerHTML = SWATCHES.map(function (s) {
            var val = currentValue(s.var, s.def);
            return '' +
                '<label class="pag-theme-row">' +
                    '<span>' + s.label + '</span>' +
                    '<input type="color" data-theme-var="' + s.var + '" value="' + val + '" />' +
                '</label>';
        }).join('') +
        '<button type="button" class="pag-theme-reset">Reset to default</button>';

        container.querySelectorAll('input[type="color"]').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var v = inp.getAttribute('data-theme-var');
                var saved = loadSaved();
                saved[v] = inp.value;
                document.documentElement.style.setProperty(v, inp.value);
                save(saved);
                syncInputs(v, inp.value);
            });
        });
        container.querySelector('.pag-theme-reset').addEventListener('click', function () {
            SWATCHES.forEach(function (s) {
                document.documentElement.style.removeProperty(s.var);
            });
            save({});
            SWATCHES.forEach(function (s) { syncInputs(s.var, s.def); });
        });
    }

    // Minimal shared styles (injected once).
    function injectStyles() {
        if (document.getElementById('pagThemeStyles')) return;
        var st = document.createElement('style');
        st.id = 'pagThemeStyles';
        st.textContent =
            '.pag-theme-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0;font-size:13px;}' +
            '.pag-theme-row input[type=color]{width:42px;height:28px;border:1px solid #E2E8F0;border-radius:6px;background:none;padding:0;cursor:pointer;flex-shrink:0;}' +
            '.pag-theme-reset{margin-top:12px;width:100%;padding:9px 10px;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;color:#0F172A;font-size:13px;font-weight:600;cursor:pointer;}' +
            '.pag-theme-reset:hover{background:#EEF2F6;}' +
            '#pagThemePanel{position:fixed;right:18px;bottom:74px;z-index:9999;width:280px;max-width:calc(100vw - 36px);display:none;background:#fff;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 30px 80px rgba(11,31,63,0.28);padding:14px 16px;color:#0F172A;}' +
            '#pagThemeFab{position:fixed;right:18px;bottom:18px;z-index:9998;width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;font-size:20px;line-height:46px;color:#fff;background:linear-gradient(135deg,var(--c-navy,#0B1F3F),var(--c-accent,#0369A1));box-shadow:0 8px 24px rgba(2,6,23,0.28);}' +
            '.pag-theme-card{max-width:420px;background:#fff;border:1px solid var(--c-line,#E2E8F0);border-radius:14px;padding:20px 22px;box-shadow:var(--shadow-sm,0 1px 2px rgba(2,6,23,0.05));}';
        document.head.appendChild(st);
    }

    // Floating quick-access button + panel.
    function buildFab() {
        if (document.getElementById('pagThemeFab')) return;
        var fab = document.createElement('button');
        fab.id = 'pagThemeFab';
        fab.type = 'button';
        fab.title = 'Theme';
        fab.setAttribute('aria-label', 'Open theme customizer');
        fab.innerHTML = '🎨';

        var panel = document.createElement('div');
        panel.id = 'pagThemePanel';
        panel.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
                '<strong style="font-size:14px;">Theme</strong>' +
                '<button type="button" id="pagThemeClose" aria-label="Close" style="border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#64748B;">×</button>' +
            '</div>' +
            '<p style="margin:0 0 8px;font-size:11.5px;color:#64748B;">Recolor navy &amp; accent. Saved on this device.</p>' +
            '<div id="pagThemeFabBody"></div>';

        document.body.appendChild(panel);
        document.body.appendChild(fab);
        buildControls(panel.querySelector('#pagThemeFabBody'));

        fab.addEventListener('click', function () {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        panel.querySelector('#pagThemeClose').addEventListener('click', function () {
            panel.style.display = 'none';
        });
    }

    // Render the full Theme page (called by dashboard switchView).
    function renderPage(container) {
        if (!container) return;
        injectStyles();
        container.innerHTML =
            '<div class="pag-theme-card">' +
                '<p style="margin:0 0 14px;color:var(--c-ink-3,#334155);font-size:13.5px;">' +
                    'Customize the navy &amp; accent palette. Changes preview instantly and are saved on this device ' +
                    '(they also recolor the sidebar and the sign-in screen). Use <strong>Reset</strong> to restore the default navy theme.' +
                '</p>' +
                '<div id="pagThemePageBody"></div>' +
            '</div>';
        buildControls(container.querySelector('#pagThemePageBody'));
    }

    window.PAGTheme = { renderPage: renderPage, applySaved: applySaved };

    function init() {
        if (!isSystemAdmin()) return;
        injectStyles();
        buildFab();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
