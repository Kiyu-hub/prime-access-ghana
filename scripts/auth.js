/* ============================================================
   Prime Access Ghana — Login form handler
   Validates inputs, calls CH.signIn (Supabase RPC verify_login),
   persists session in localStorage, redirects to dashboard.
   ============================================================ */
(function () {
    'use strict';

    // If already signed in, skip the form and go straight to dashboard
    if (window.CH && window.CH.session) {
        window.location.replace('dashboard.html');
        return;
    }

    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailEl    = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const togglePw   = document.getElementById('togglePw');
    const msg        = document.getElementById('formMsg');
    const btn        = document.getElementById('loginBtn');
    const forgotLink = document.getElementById('forgotLink');

    /* ---- show / hide password ------------------------------- */
    togglePw.addEventListener('click', function () {
        const isPw = passwordEl.type === 'password';
        passwordEl.type = isPw ? 'text' : 'password';
        togglePw.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
    });

    /* ---- forgot password (info only — no email backend yet) - */
    forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        showMsg('Ask your Director to reset your password from Admin → Staff.', 'info');
    });

    /* ---- submit --------------------------------------------- */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email    = emailEl.value.trim().toLowerCase();
        const password = passwordEl.value;

        if (!email || !password) {
            showMsg('Please enter both email and password.', 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMsg('Please enter a valid email address.', 'error');
            return;
        }
        if (!window.CH || !window.CH.signIn) {
            showMsg('Site not yet configured. Please contact the Director.', 'error');
            return;
        }

        setLoading(true);
        try {
            await window.CH.signIn(email, password);
            showMsg('Signed in. Loading dashboard…', 'success');
            const session = window.CH.session;
            // Log sign-in (best-effort; failure shouldn't block dashboard load)
            try {
                if (window.CH.logs && session) {
                    window.CH.logs.record({ action: 'signed_in', staff_id: session.id, staff_name: session.name, branch_id: session.branch_id, branch_name: session.branch_name });
                }
            } catch (_) {}
            setTimeout(function () {
                const url = session && session.is_admin ? 'dashboard.html?admin=true' : 'dashboard.html';
                window.location.href = url;
            }, 400);
        } catch (err) {
            setLoading(false);
            console.error(err);
            if (err && err.code === 'invalid_credentials') {
                showMsg('Invalid email or password. Please try again.', 'error');
                passwordEl.focus();
            } else if (err && (err.message || '').includes('not configured')) {
                showMsg(err.message, 'error');
            } else {
                showMsg('Could not sign in. Check your internet connection and try again.', 'error');
            }
        }
    });

    function setLoading(loading) {
        btn.disabled = loading;
        btn.classList.toggle('is-loading', loading);
        btn.querySelector('span:not(.spinner)').textContent = loading ? 'Signing in…' : 'Sign in';
    }

    function showMsg(text, kind) {
        msg.textContent = text;
        msg.className = 'form-msg' + (kind ? ' ' + kind : '');
    }
})();
