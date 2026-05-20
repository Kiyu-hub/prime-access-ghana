/* ============================================================
   Clasikal Homes — User Auth (client-side demo)
   In production this would call a secure backend API.
   ============================================================ */

(function () {
    'use strict';

    /* Seed user directory — replace with API in production */
    const USER_DIRECTORY = [
        /* Admin */
        { email: 'Director@clasikalhomes.com', password: 'clasikal@2026', name: 'Director', role: 'Admin', isAdmin: true },
        
        /* Staff */
        { email: 'kwame@clasikal.com',  password: 'demo123',      name: 'Kwame Mensah',  role: 'Inventory Manager' },
        { email: 'ama@clasikal.com',    password: 'pass123',      name: 'Ama Boateng',   role: 'Showroom Staff' },
        { email: 'yaw@clasikal.com',    password: 'secure456',    name: 'Yaw Owusu',     role: 'Branch Manager' },
        { email: 'nancy@clasikal.com',  password: 'welcome789',   name: 'Nancy Asante',  role: 'Operations Lead' },
        { email: 'kofi@clasikal.com',   password: 'design2026',   name: 'Kofi Darko',    role: 'Visual Merchandiser' },
    ];

    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const togglePw = document.getElementById('togglePw');
    const msg = document.getElementById('formMsg');
    const btn = document.getElementById('loginBtn');
    const forgotLink = document.getElementById('forgotLink');
    const yearEl = document.getElementById('year');

    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* Show / hide password */
    togglePw.addEventListener('click', function () {
        const isPw = passwordEl.type === 'password';
        passwordEl.type = isPw ? 'text' : 'password';
        togglePw.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
    });

    /* Forgot password */
    forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        showMsg('Password reset link sent to your email. Check your inbox.', 'info');
    });

    /* Submit */
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = emailEl.value.trim().toLowerCase();
        const password = passwordEl.value;

        if (!email || !password) {
            showMsg('Please enter both email and password.', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMsg('Please enter a valid email address.', 'error');
            return;
        }

        setLoading(true);

        /* Simulate auth call */
        setTimeout(function () {
            const user = USER_DIRECTORY.find(function (u) {
                return u.email === email && u.password === password;
            });

            if (!user) {
                setLoading(false);
                showMsg('Invalid email or password. Please try again.', 'error');
                passwordEl.focus();
                return;
            }

            /* Persist session */
            const session = {
                email: user.email,
                name: user.name,
                role: user.role,
                isAdmin: user.isAdmin || false,
                signedInAt: new Date().toISOString(),
            };
            sessionStorage.setItem('ch_session', JSON.stringify(session));
            localStorage.removeItem('ch_remember');

            showMsg('Signed in. Loading dashboard…', 'success');
            setTimeout(function () {
                const redirectUrl = user.isAdmin ? 'dashboard.html?admin=true' : 'dashboard.html';
                window.location.href = redirectUrl;
            }, 450);
        }, 550);
    });

    function setLoading(loading) {
        btn.disabled = loading;
        btn.querySelector('span').textContent = loading ? 'Signing in…' : 'Sign in';
    }

    function showMsg(text, kind) {
        msg.textContent = text;
        msg.className = 'form-msg';
        if (kind === 'success') {
            msg.classList.add('success');
        } else if (kind === 'info') {
            msg.style.color = '#38BDF8';
        } else {
            msg.style.color = '#FF6B6B';
        }
    }
})();
