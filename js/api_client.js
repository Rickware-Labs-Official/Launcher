(function (global) {
    var RWL_API_BASE = 'https://rickware-labs-api.apps.bot-hosting.cloud';
    var TOKEN_KEY = 'rickware_token';
    var REFRESH_KEY = 'rickware_refresh_token';
    var USER_KEY = 'rickware_user';
    var REMEMBER_KEY = 'rickware_remember_me';
    var DEVICE_KEY = 'rwl_device_key';
    var HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
    var KEEP_COLORS_STYLE = '--rwl-keep:1;';
    var AUTH_ENDPOINT_PATTERN = /\/api\/(refresh|login|logout|register|oauth\/|forgot_password|confirm_reset)/;
    var RARITY_COLORS = {
        'Common': '#b8b8c8',
        'Uncommon': '#4caf50',
        'Rare': '#3b82f6',
        'Epic': '#a855f7',
        'Mythical': '#f59e0b',
        'Ultra Rare': '#ef4444',
        'Ultra Mythical': '#ff00ff'
    };
    var nativeFetch = global.fetch.bind(global);
    var refreshPromise = null;

    function apiUrl(path) {
        return RWL_API_BASE + path;
    }

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function launcherHost() {
        return !!(global.RickwareBridge && global.RickwareBridge.isLauncher);
    }

    function isRemembered() {
        return !launcherHost() && localStorage.getItem(REMEMBER_KEY) === '1';
    }

    function randomKey(length) {
        var bytes = new Uint8Array(length);
        (global.crypto || global.msCrypto).getRandomValues(bytes);
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        var out = '';
        for (var index = 0; index < bytes.length; index++) out += alphabet.charAt(bytes[index] % alphabet.length);
        return out;
    }

    function deviceKey() {
        try {
            var existing = localStorage.getItem(DEVICE_KEY);
            if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
            var created = randomKey(32);
            localStorage.setItem(DEVICE_KEY, created);
            return created;
        } catch (error) {
            return randomKey(32);
        }
    }

    function clientKind() {
        return launcherHost() ? 'launcher' : 'browser';
    }

    function applySession(session) {
        if (!session) return;
        try {
            if (session.persistent && !launcherHost()) {
                localStorage.setItem(REMEMBER_KEY, '1');
                [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach(function (key) {
                    var value = sessionStorage.getItem(key);
                    if (value) localStorage.setItem(key, value);
                });
            } else {
                localStorage.removeItem(REMEMBER_KEY);
                [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach(function (key) { localStorage.removeItem(key); });
            }
        } catch (error) {}
    }

    function storedRefreshToken() {
        return sessionStorage.getItem(REFRESH_KEY) || (isRemembered() ? localStorage.getItem(REFRESH_KEY) : null);
    }

    function storeTokens(token, refreshToken) {
        if (!token) return;
        sessionStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
        if (isRemembered()) {
            localStorage.setItem(TOKEN_KEY, token);
            if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        }
    }

    function clearSession() {
        [TOKEN_KEY, REFRESH_KEY, USER_KEY, 'rickware_pw'].forEach(function (key) {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
        localStorage.removeItem(REMEMBER_KEY);
        if (global.RWLTheme) global.RWLTheme.clear();
        if (global.RWLI18n && global.RWLI18n.useVisitorLanguage) global.RWLI18n.useVisitorLanguage();
    }

    function refreshAccessToken() {
        if (refreshPromise) return refreshPromise;
        var refreshToken = storedRefreshToken();
        if (!refreshToken) return Promise.resolve(null);
        refreshPromise = (async function () {
            try {
                var response = await nativeFetch(apiUrl('/api/refresh'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });
                if (!response.ok) {
                    if (response.status === 401) clearSession();
                    return null;
                }
                var data = await response.json();
                if (!data || !data.token) return null;
                storeTokens(data.token, data.refresh_token);
                if (data.session) applySession(data.session);
                return data.token;
            } catch (error) {
                return null;
            } finally {
                setTimeout(function () { refreshPromise = null; }, 0);
            }
        })();
        return refreshPromise;
    }

    function requestUrl(input) {
        if (typeof input === 'string') return input;
        if (input && typeof input.url === 'string') return input.url;
        return String(input || '');
    }

    function announceSystemState(response, url) {
        if (response.status !== 503 || url.indexOf(RWL_API_BASE) !== 0) return;
        var state = response.headers.get('X-System-State');
        if (!state) return;
        try { global.dispatchEvent(new CustomEvent('rwl-system-state', { detail: { state: state } })); } catch (error) {}
    }

    global.fetch = async function (input, init) {
        var url = requestUrl(input);
        var response = await nativeFetch(input, init);
        announceSystemState(response, url);
        if (response.status !== 401 || url.indexOf(RWL_API_BASE + '/api/') !== 0 || AUTH_ENDPOINT_PATTERN.test(url)) {
            return response;
        }
        var headers = new Headers((init && init.headers) || (input && input.headers) || undefined);
        var authorization = headers.get('Authorization') || '';
        if (authorization.indexOf('Bearer ') !== 0) return response;
        var newToken = await refreshAccessToken();
        if (!newToken) return response;
        headers.set('Authorization', 'Bearer ' + newToken);
        return nativeFetch(url, Object.assign({}, init || {}, { headers: headers }));
    };

    function authHeaders(extra) {
        var headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
        var token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    function errorDetail(data, fallback) {
        var detail = data && data.detail;
        if (Array.isArray(detail)) detail = detail.map(function (entry) { return entry && entry.msg ? String(entry.msg).replace(/^Value error, /, '') : ''; }).filter(Boolean).join(', ');
        return typeof detail === 'string' && detail ? detail : fallback;
    }

    async function apiRequest(path, options) {
        var settings = options || {};
        var response = await fetch(apiUrl(path), {
            method: settings.method || 'GET',
            headers: authHeaders(settings.headers),
            body: settings.body !== undefined ? JSON.stringify(settings.body) : undefined
        });
        var data = null;
        try { data = await response.json(); } catch (error) { data = null; }
        if (!response.ok) {
            var failure = new Error(errorDetail(data, 'Request failed (' + response.status + ')'));
            failure.status = response.status;
            failure.data = data;
            throw failure;
        }
        return data;
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function sanitizeHex(value, fallback) {
        return HEX_PATTERN.test(String(value || '')) ? String(value) : (fallback || '#ffffff');
    }

    function rarityColor(rarity) {
        return RARITY_COLORS[rarity] || RARITY_COLORS.Common;
    }

    function ensureCosmeticStyles() {
        if (document.getElementById('rwlCosmeticStyles')) return;
        var style = document.createElement('style');
        style.id = 'rwlCosmeticStyles';
        style.textContent = '@keyframes rwlNameRgb{0%{background-position:0% 50%}100%{background-position:300% 50%}}' +
            '.rwl-rgb-text{background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent;animation:rwlNameRgb 4s linear infinite;}' +
            '.rwl-rgb-swatch{background-size:300% 100%;animation:rwlNameRgb 4s linear infinite;}';
        (document.head || document.documentElement).appendChild(style);
    }

    function gradientCss(colors) {
        var safe = (colors || []).map(function (color) { return sanitizeHex(color, ''); }).filter(Boolean);
        if (safe.length < 2) return '';
        return 'linear-gradient(90deg,' + safe.join(',') + ')';
    }

    function nameColorStyle(cosmetics, fallback) {
        ensureCosmeticStyles();
        var data = cosmetics || {};
        if (data.name_color_animated && data.name_color_gradient) {
            var gradient = gradientCss(data.name_color_gradient);
            if (gradient) {
                var seconds = Math.max(1, Math.min(parseInt(data.name_color_animation_seconds, 10) || 4, 20));
                return KEEP_COLORS_STYLE + 'background-image:' + gradient + ';background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:rwlNameRgb ' + seconds + 's linear infinite;';
            }
        }
        if (data.name_color_hex) return KEEP_COLORS_STYLE + 'color:' + sanitizeHex(data.name_color_hex, fallback) + ';';
        return KEEP_COLORS_STYLE + 'color:' + sanitizeHex(fallback, '#ffffff') + ';';
    }

    function swatchStyle(item) {
        ensureCosmeticStyles();
        if (item && item.animated && item.gradient) {
            var gradient = gradientCss(item.gradient);
            if (gradient) {
                var seconds = Math.max(1, Math.min(parseInt(item.animation_seconds, 10) || 4, 20));
                return KEEP_COLORS_STYLE + 'background-image:' + gradient + ';background-size:300% 100%;animation:rwlNameRgb ' + seconds + 's linear infinite;';
            }
        }
        return KEEP_COLORS_STYLE + 'background:' + sanitizeHex(item && item.hex, '#7b2cbf') + ';';
    }

    function todayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    function trackEvent(eventName, uniqueKey) {
        if (!getToken() || !/^[a-z_]+$/.test(eventName || '')) return;
        var storageKey = 'rwl_event_' + eventName + '_' + todayKey() + (uniqueKey ? '_' + uniqueKey : '');
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, '1');
        fetch(apiUrl('/api/season_pass/event'), {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ event: eventName })
        }).catch(function () {});
    }

    function restoreRememberedSession() {
        try {
            if (sessionStorage.getItem(TOKEN_KEY) || !isRemembered()) return;
            var token = localStorage.getItem(TOKEN_KEY);
            if (!token) return;
            sessionStorage.setItem(TOKEN_KEY, token);
            var refreshToken = localStorage.getItem(REFRESH_KEY);
            if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
            var user = localStorage.getItem(USER_KEY);
            if (user) sessionStorage.setItem(USER_KEY, user);
        } catch (error) {}
    }

    restoreRememberedSession();

    global.RWL = {
        apiBase: RWL_API_BASE,
        apiUrl: apiUrl,
        apiRequest: apiRequest,
        errorDetail: errorDetail,
        authHeaders: authHeaders,
        getToken: getToken,
        storeTokens: storeTokens,
        applySession: applySession,
        deviceKey: deviceKey,
        clientKind: clientKind,
        isLauncherHost: launcherHost,
        clearSession: clearSession,
        refreshAccessToken: refreshAccessToken,
        escapeHtml: escapeHtml,
        sanitizeHex: sanitizeHex,
        rarityColor: rarityColor,
        nameColorStyle: nameColorStyle,
        swatchStyle: swatchStyle,
        ensureCosmeticStyles: ensureCosmeticStyles,
        trackEvent: trackEvent
    };
    global.apiUrl = apiUrl;
})(window);
