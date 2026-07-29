document.addEventListener('DOMContentLoaded', () => {
    initAuthPage();
    initAuthClock();
    initAuthTabsSlider();
    handleOAuthCallback();
});

function initAuthClock() {
    var el = document.getElementById('authClock');
    if (!el) return;
    function update() {
        var now = new Date();
        var h = String(now.getHours()).padStart(2, '0');
        var m = String(now.getMinutes()).padStart(2, '0');
        var s = String(now.getSeconds()).padStart(2, '0');
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        el.textContent = h + ':' + m + ':' + s + (tz ? '  ' + tz : '');
    }
    update();
    setInterval(update, 1000);
}

function initAuthTabsSlider() {
    var tabs = document.querySelectorAll('.auth-tab');
    var thumb = document.getElementById('authTabsThumb');
    tabs.forEach(function(tab, i) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            if (thumb) {
                if (i === 0) {
                    thumb.classList.remove('right');
                } else {
                    thumb.classList.add('right');
                }
            }
        });
    });
}

var GOOGLE_CLIENT_ID = (typeof config !== 'undefined' && config.google_client_id) ? config.google_client_id : '';
var DISCORD_CLIENT_ID = (typeof config !== 'undefined' && config.discord_client_id) ? config.discord_client_id : '';

var DISCORD_REDIRECT_URI = window.location.origin + window.location.pathname;
var GOOGLE_REDIRECT_URI = window.location.origin + window.location.pathname;

var DISCORD_SCOPE = 'identify email guilds guilds.join';

function getGoogleOAuthUrl(mode) {
    var clientId = GOOGLE_CLIENT_ID;
    if (!clientId) { showBanner('Google OAuth is not configured.', 'error'); return null; }
    var state = btoa(JSON.stringify({ mode: mode, nonce: Math.random().toString(36).slice(2) }));
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_provider', 'google');
    sessionStorage.setItem('oauth_mode', mode);
    var params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        state: state,
        access_type: 'offline',
        prompt: 'select_account'
    });
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

function getDiscordOAuthUrl(mode) {
    var clientId = DISCORD_CLIENT_ID;
    if (!clientId) { showBanner('Discord OAuth is not configured.', 'error'); return null; }
    var state = btoa(JSON.stringify({ mode: mode, nonce: Math.random().toString(36).slice(2) }));
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_provider', 'discord');
    sessionStorage.setItem('oauth_mode', mode);
    var params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: DISCORD_SCOPE,
        state: state,
        permissions: '1'
    });
    return 'https://discord.com/api/oauth2/authorize?' + params.toString();
}

function startGoogleOAuth(mode) {
    var url = getGoogleOAuthUrl(mode || 'login');
    if (url) window.location.href = url;
}

function startDiscordOAuth(mode) {
    var url = getDiscordOAuthUrl(mode || 'login');
    if (url) window.location.href = url;
}

async function handleOAuthCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    var state = params.get('state');
    var error = params.get('error');

    if (error) {
        showBanner('OAuth cancelled or failed: ' + error, 'error');
        window.history.replaceState({}, document.title, window.location.pathname + (params.get('tab') ? '?tab=' + params.get('tab') : ''));
        return;
    }

    if (!code || !state) return;

    var savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
        showBanner('OAuth state mismatch. Please try again.', 'error');
        return;
    }

    var provider = sessionStorage.getItem('oauth_provider');
    var mode = sessionStorage.getItem('oauth_mode') || 'login';

    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_provider');
    sessionStorage.removeItem('oauth_mode');

    window.history.replaceState({}, document.title, window.location.pathname);

    showBanner('Authenticating with ' + (provider === 'google' ? 'Google' : 'Discord') + '...', 'info');

    try {
        var endpoint = mode === 'register' ? '/api/oauth/register' : '/api/oauth/login';
        var res = await fetch(apiUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: provider,
                code: code,
                redirect_uri: provider === 'discord' ? DISCORD_REDIRECT_URI : GOOGLE_REDIRECT_URI,
                user_agent: navigator.userAgent || null,
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
            })
        });

        if (res.ok) {
            var data = await res.json();
            var token = data.token;
            if (!token) { showBanner('Authentication failed: no token received.', 'error'); return; }

            sessionStorage.setItem('rickware_token', token);
            if (data.refresh_token) sessionStorage.setItem('rickware_refresh_token', data.refresh_token);

            var user = data.account || null;
            if (!user && token) {
                try { user = JSON.parse(atob(token.split('.')[1])); } catch(e) {}
            }
            if (user) sessionStorage.setItem('rickware_user', JSON.stringify(user));

            var rememberMe = localStorage.getItem('rickware_remember_me') === '1';
            if (rememberMe) {
                localStorage.setItem('rickware_token', token);
                if (data.refresh_token) localStorage.setItem('rickware_refresh_token', data.refresh_token);
                if (user) localStorage.setItem('rickware_user', JSON.stringify(user));
            }

            var welcomeName = (user && user.username) ? user.username : 'User';
            var actionWord = mode === 'register' ? 'Account created! Welcome, ' : 'Successfully logged in. Welcome back, ';
            sessionStorage.setItem('rickware_pending_banner', JSON.stringify({ message: actionWord + welcomeName + '!', type: 'success' }));
            window.location.href = '../index.html';
        } else {
            var errData = null;
            try { errData = await res.json(); } catch(e) {}
            showBanner((errData && errData.detail) ? errData.detail : 'OAuth authentication failed.', 'error');
        }
    } catch(e) {
        showBanner('OAuth authentication error. Please try again.', 'error');
    }
}

function loadRememberedCredentials() {
    var remembered = localStorage.getItem('rickware_remember_me') === '1';
    if (!remembered) return;

    var savedToken = localStorage.getItem('rickware_token');
    if (savedToken) {
        sessionStorage.setItem('rickware_token', savedToken);
        var savedUser = localStorage.getItem('rickware_user');
        if (savedUser) sessionStorage.setItem('rickware_user', savedUser);
        var savedRefresh = localStorage.getItem('rickware_refresh_token');
        if (savedRefresh) sessionStorage.setItem('rickware_refresh_token', savedRefresh);
        sessionStorage.setItem('rickware_pending_banner', JSON.stringify({ message: 'Welcome back!', type: 'success' }));
        window.location.href = '../index.html';
        return;
    }

    var savedUsername = localStorage.getItem('rickware_saved_username');
    var rememberCheckbox = document.getElementById('login-remember');
    var usernameInput = document.getElementById('login-username-email');
    if (savedUsername && usernameInput) usernameInput.value = savedUsername;
    if (rememberCheckbox) rememberCheckbox.checked = true;
}

function saveRememberMe(usernameOrEmail, token, refreshToken, user) {
    var checkbox = document.getElementById('login-remember');
    if (checkbox && checkbox.checked) {
        localStorage.setItem('rickware_remember_me', '1');
        localStorage.setItem('rickware_saved_username', usernameOrEmail);
        if (token) localStorage.setItem('rickware_token', token);
        if (refreshToken) localStorage.setItem('rickware_refresh_token', refreshToken);
        if (user) localStorage.setItem('rickware_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('rickware_remember_me');
        localStorage.removeItem('rickware_saved_username');
        localStorage.removeItem('rickware_token');
        localStorage.removeItem('rickware_refresh_token');
        localStorage.removeItem('rickware_user');
    }
}

function initAuthPage() {
    loadRememberedCredentials();

    var authTabs = document.querySelectorAll('.auth-tab');
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var sliderTrack = document.getElementById('authSliderTrack');
    var tabIndicator = document.getElementById('authTabIndicator');
    var params = new URLSearchParams(window.location.search);

    var authLogoEl = document.querySelector('.auth-logo');
    if (authLogoEl) {
        authLogoEl.src = '../images/main/r_l_logo_1.webp';
        authLogoEl.onerror = function() { this.style.display = 'none'; };
    }

    function switchTab(tabName) {
        authTabs.forEach(function(t) { t.classList.remove('active'); });
        var targetTab = Array.from(authTabs).find(function(t) { return t.getAttribute('data-tab') === tabName; });
        if (targetTab) targetTab.classList.add('active');
        if (sliderTrack) sliderTrack.style.transform = tabName === 'register' ? 'translateX(-50%)' : 'translateX(0)';
        if (tabIndicator && authTabs.length >= 2) {
            tabIndicator.style.transform = tabName === 'register' ? 'translateX(100%)' : 'translateX(0)';
        }
    }

    if (params.get('tab') === 'register') {
        switchTab('register');
    }

    authTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            switchTab(tab.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.toggle-password').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var inp = document.getElementById(btn.getAttribute('data-target'));
            if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
        });
    });

    var googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() { startGoogleOAuth('login'); });
    }

    var googleRegisterBtn = document.getElementById('googleRegisterBtn');
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', function() { startGoogleOAuth('register'); });
    }

    var discordLoginBtn = document.getElementById('discordLoginBtn');
    if (discordLoginBtn) {
        discordLoginBtn.addEventListener('click', function() { startDiscordOAuth('login'); });
    }

    var discordRegisterBtn = document.getElementById('discordRegisterBtn');
    if (discordRegisterBtn) {
        discordRegisterBtn.addEventListener('click', function() { startDiscordOAuth('register'); });
    }

    var appleLoginBtn = document.getElementById('appleLoginBtn');
    if (appleLoginBtn) {
        appleLoginBtn.addEventListener('click', function() { showBanner('Apple OAuth is not configured.', 'error'); });
    }

    var appleRegisterBtn = document.getElementById('appleRegisterBtn');
    if (appleRegisterBtn) {
        appleRegisterBtn.addEventListener('click', function() { showBanner('Apple OAuth is not configured.', 'error'); });
    }

    var loginFormEl = document.getElementById('loginForm');
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var usernameOrEmail = document.getElementById('login-username-email').value;
            var password = document.getElementById('login-password').value;
            var user = await loginUser(usernameOrEmail, password);
            if (user) {
                var token = sessionStorage.getItem('rickware_token');
                var refreshToken = sessionStorage.getItem('rickware_refresh_token');
                saveRememberMe(usernameOrEmail, token, refreshToken, user);
                sessionStorage.setItem('rickware_pending_banner', JSON.stringify({ message: 'Successfully logged in. Welcome back, ' + (user.username || 'User') + '!', type: 'success' }));
                window.location.href = '../index.html';
            }
        });
    }

    var forgotLink = document.getElementById('forgotPasswordLink');
    var forgotSection = document.getElementById('forgotPasswordSection');
    var forgotBackLink = document.getElementById('forgotBackLink');
    var forgotFormEl = document.getElementById('forgotPasswordForm');
    var resetFormEl = document.getElementById('resetCodeForm');

    if (forgotLink && forgotSection) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginForm) loginForm.style.display = 'none';
            forgotSection.style.display = 'block';
        });
    }
    if (forgotBackLink) {
        forgotBackLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (forgotSection) forgotSection.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    }
    if (forgotFormEl) {
        forgotFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var identifier = document.getElementById('forgot-identifier').value.trim();
            var sent = await forgotPassword(identifier);
            if (sent) {
                forgotFormEl.style.display = 'none';
                if (resetFormEl) resetFormEl.style.display = 'block';
                var hiddenId = document.getElementById('reset-identifier');
                if (hiddenId) hiddenId.value = identifier;
            }
        });
    }
    if (resetFormEl) {
        resetFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var identifier = (document.getElementById('reset-identifier') || {}).value || '';
            var code = document.getElementById('reset-code').value.trim();
            var newPw = document.getElementById('reset-new-password').value;
            var newPw2 = document.getElementById('reset-confirm-password').value;
            if (newPw !== newPw2) { showBanner('Passwords do not match', 'error'); return; }
            if (newPw.length < 6) { showBanner('Password must be at least 6 characters', 'error'); return; }
            var ok = await confirmReset(identifier, code, newPw);
            if (ok) {
                if (forgotSection) forgotSection.style.display = 'none';
                if (loginForm) loginForm.style.display = 'block';
                if (forgotFormEl) forgotFormEl.style.display = 'block';
                if (resetFormEl) resetFormEl.style.display = 'none';
            }
        });
    }

    var registerFormEl = document.getElementById('registerForm');
    if (registerFormEl) {
        registerFormEl.addEventListener('submit', async function(e) {
            e.preventDefault();
            var pw = document.getElementById('register-password').value;
            var pw2 = document.getElementById('register-confirm-password').value;
            if (pw !== pw2) { showBanner('Passwords do not match!', 'error'); return; }
            if (pw.length < 6) { showBanner('Password must be at least 6 characters', 'error'); return; }
            var user = await registerUser(
                document.getElementById('register-username').value,
                document.getElementById('register-email').value,
                document.getElementById('register-phone').value,
                pw
            );
            if (user) { sessionStorage.setItem('rickware_pending_banner', JSON.stringify({ message: 'Account created! Welcome, ' + (user.username || 'User') + '!', type: 'success' })); window.location.href = '../index.html'; }
        });
    }
}