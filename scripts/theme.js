/* ============================================================
   Prime Access Ghana — Theme customizer (System Admin)
   Lets the System Admin recolor the navy + accent palette live and
   reset to defaults. Saved per-browser in localStorage; applied on
   every load. The editor UI is shown to System Admin only.
   ============================================================ */
(function () {
    'use strict';

    var STORE_KEY = 'pag_theme';

    // The brand palette knobs. Defaults mirror dashboard.html :root.
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

    // Only the System Admin gets the editor.
    function isSystemAdmin() {
        var s = getSession();
        return !!s && s.role === 'system_manager';
    }

    function currentValue(varName, def) {
        var saved = loadSaved();
        if (saved[varName]) return saved[varName];
        // Fall back to the computed default from the stylesheet.
        var computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return computed || def;
    }

    function buildPanel() {
        if (document.getElementById('pagThemeFab')) return;

        var fab = document.createElement('button');
        fab.id = 'pagThemeFab';
        fab.type = 'button';
        fab.title = 'Theme';
        fab.setAttribute('aria-label', 'Open theme customizer');
        fab.innerHTML = '🎨';
        fab.style.cssText = [
            'position:fixed', 'right:18px', 'bottom:18px', 'z-index:9998',
            'width:46px', 'height:46px', 'border-radius:50%', 'border:0', 'cursor:pointer',
            'font-size:20px', 'line-height:46px',
            'background:linear-gradient(135deg,var(--c-navy,#0B1F3F),var(--c-accent,#0369A1))',
            'color:#fff', 'box-shadow:0 8px 24px rgba(2,6,23,0.28)'
        ].join(';');

        var panel = document.createElement('div');
        panel.id = 'pagThemePanel';
        panel.style.cssText = [
            'position:fixed', 'right:18px', 'bottom:74px', 'z-index:9999',
            'width:280px', 'max-width:calc(100vw - 36px)', 'display:none',
            'background:#fff', 'border:1px solid #E2E8F0', 'border-radius:14px',
            'box-shadow:0 30px 80px rgba(11,31,63,0.28)', 'padding:14px 16px',
            'font-family:var(--f-sans,sans-serif)', 'color:#0F172A'
        ].join(';');

        var rows = SWATCHES.map(function (s) {
            var val = currentValue(s.var, s.def);
            return '' +
                '<label style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;font-size:13px;">' +
                    '<span>' + s.label + '</span>' +
                    '<input type="color" data-var="' + s.var + '" value="' + val + '" ' +
                        'style="width:38px;height:26px;border:1px solid #E2E8F0;border-radius:6px;background:none;padding:0;cursor:pointer;flex-shrink:0;" />' +
                '</label>';
        }).join('');

        panel.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
                '<strong style="font-size:14px;">Theme</strong>' +
                '<button type="button" id="pagThemeClose" aria-label="Close" ' +
                    'style="border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#64748B;">×</button>' +
            '</div>' +
            '<p style="margin:0 0 8px;font-size:11.5px;color:#64748B;">Recolor the navy & accent palette. Saved on this device.</p>' +
            rows +
            '<button type="button" id="pagThemeReset" ' +
                'style="margin-top:10px;width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:8px;' +
                'background:#F8FAFC;color:#0F172A;font-size:13px;font-weight:600;cursor:pointer;">Reset to default</button>';

        document.body.appendChild(panel);
        document.body.appendChild(fab);

        fab.addEventListener('click', function () {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        panel.querySelector('#pagThemeClose').addEventListener('click', function () {
            panel.style.display = 'none';
        });

        // Live color changes.
        panel.querySelectorAll('input[type="color"]').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var v = inp.getAttribute('data-var');
                var saved = loadSaved();
                saved[v] = inp.value;
                document.documentElement.style.setProperty(v, inp.value);
                save(saved);
            });
        });

        // Reset everything to the stylesheet defaults.
        panel.querySelector('#pagThemeReset').addEventListener('click', function () {
            SWATCHES.forEach(function (s) {
                document.documentElement.style.removeProperty(s.var);
            });
            save({});
            panel.querySelectorAll('input[type="color"]').forEach(function (inp) {
                var s = SWATCHES.filter(function (x) { return x.var === inp.getAttribute('data-var'); })[0];
                inp.value = s ? s.def : inp.value;
            });
        });
    }

    function init() {
        if (isSystemAdmin()) buildPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
