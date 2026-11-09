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
    var SIGNING_KEY = 'rickware_signing_key';
    var TURNSTILE_ACTIONS = [[/\/api\/login$/, 'login'], [/\/api\/register$/, 'register'], [/\/api\/forgot_password$/, 'password_reset']];
    var UNSIGNED_BODY_MARKER = 'unsigned-multipart';
    var DIRECTION_ANGLES = { ltr: 90, rtl: 90, ttb: 180, btt: 180 };
    var clockOffset = 0;
    var signingKeyPromise = null;
    var encoder = global.TextEncoder ? new TextEncoder() : null;

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
        [TOKEN_KEY, REFRESH_KEY, USER_KEY, SIGNING_KEY, 'rickware_pw'].forEach(function (key) {
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

    function tokenSessionId(token) {
        try {
            var payload = String(token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(payload)).sid || '';
        } catch (error) {
            return '';
        }
    }

    function storedSigningKey(sessionId) {
        var raw = sessionStorage.getItem(SIGNING_KEY) || (isRemembered() ? localStorage.getItem(SIGNING_KEY) : '');
        if (!raw) return '';
        var separator = raw.indexOf('|');
        return separator > 0 && raw.slice(0, separator) === sessionId ? raw.slice(separator + 1) : '';
    }

    function rememberSigningKey(sessionId, key) {
        var value = sessionId + '|' + key;
        sessionStorage.setItem(SIGNING_KEY, value);
        if (isRemembered()) localStorage.setItem(SIGNING_KEY, value);
    }

    function fetchSigningKey(token, sessionId) {
        if (signingKeyPromise) return signingKeyPromise;
        signingKeyPromise = nativeFetch(apiUrl('/api/security/signing_key'), { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (data && data.signing_key) rememberSigningKey(sessionId, data.signing_key);
            return data ? data.signing_key : '';
        }).catch(function () {
            return '';
        }).then(function (key) {
            signingKeyPromise = null;
            return key;
        });
        return signingKeyPromise;
    }

    function hex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (value) { return ('0' + value.toString(16)).slice(-2); }).join('');
    }

    async function sha256Hex(text) {
        return hex(await global.crypto.subtle.digest('SHA-256', encoder.encode(text)));
    }

    async function signingHeaders(method, url, bodyText, multipart, token) {
        var sessionId = tokenSessionId(token);
        if (!sessionId || !global.crypto || !global.crypto.subtle || !encoder) return null;
        var key = storedSigningKey(sessionId) || await fetchSigningKey(token, sessionId);
        if (!key) return null;
        var parsed = new URL(url, global.location.href);
        var timestamp = String(Math.floor(Date.now() / 1000 + clockOffset));
        var nonce = randomKey(24);
        var bodyHash = multipart ? UNSIGNED_BODY_MARKER : await sha256Hex(bodyText || '');
        var message = [String(method || 'GET').toUpperCase(), parsed.pathname + parsed.search, timestamp, nonce, bodyHash].join('\n');
        var cryptoKey = await global.crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        var signature = hex(await global.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
        var headers = { 'X-RWL-Timestamp': timestamp, 'X-RWL-Nonce': nonce, 'X-RWL-Signature': signature };
        if (multipart) headers['X-RWL-Body'] = UNSIGNED_BODY_MARKER;
        return headers;
    }

    function noteServerTime(response) {
        var serverTime = parseInt(response.headers.get('X-Server-Time'), 10);
        if (!isNaN(serverTime)) {
            var difference = serverTime - Date.now() / 1000;
            if (Math.abs(difference - clockOffset) > 5) clockOffset = difference;
        }
    }

    async function signedInit(input, init, token) {
        var url = requestUrl(input);
        var options = Object.assign({}, init || {});
        var method = options.method || (input && input.method) || 'GET';
        var body = options.body;
        var multipart = !!(body && typeof body !== 'string');
        var headers = new Headers(options.headers || (input && input.headers) || undefined);
        var extra = await signingHeaders(method, url, typeof body === 'string' ? body : '', multipart, token);
        if (extra) Object.keys(extra).forEach(function (name) { headers.set(name, extra[name]); });
        options.headers = headers;
        return options;
    }

    function bearerOf(input, init) {
        var headers = new Headers((init && init.headers) || (input && input.headers) || undefined);
        var authorization = headers.get('Authorization') || '';
        return authorization.indexOf('Bearer ') === 0 ? authorization.slice(7) : '';
    }

    async function withTurnstile(url, init) {
        for (var index = 0; index < TURNSTILE_ACTIONS.length; index++) {
            if (TURNSTILE_ACTIONS[index][0].test(url) && global.RWLGuard) {
                var token = await global.RWLGuard.turnstileFor(TURNSTILE_ACTIONS[index][1]);
                if (!token) return init;
                var options = Object.assign({}, init || {});
                var headers = new Headers(options.headers || undefined);
                headers.set('X-Turnstile-Token', token);
                options.headers = headers;
                return options;
            }
        }
        return init;
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

    async function handleSecurityResponse(response, input, init, token) {
        if (response.status !== 403 || !token) return response;
        var data = null;
        try { data = await response.clone().json(); } catch (error) { return response; }
        if (data && data.security_block) {
            try { global.dispatchEvent(new CustomEvent('rwl-security-block', { detail: { kind: data.security_block, message: data.detail } })); } catch (error) {}
            return response;
        }
        if (data && typeof data.code === 'string' && data.code.indexOf('signature_') === 0) {
            if (data.server_time) clockOffset = data.server_time - Date.now() / 1000;
            sessionStorage.removeItem(SIGNING_KEY);
            localStorage.removeItem(SIGNING_KEY);
            return nativeFetch(requestUrl(input), await signedInit(input, init, token));
        }
        return response;
    }

    global.fetch = async function (input, init) {
        var url = requestUrl(input);
        var isApi = url.indexOf(RWL_API_BASE + '/') === 0;
        if (!isApi) return nativeFetch(input, init);
        var token = bearerOf(input, init);
        var outgoing = init;
        if (token) outgoing = await signedInit(input, init, token);
        else outgoing = await withTurnstile(url, init);
        outgoing = await withDeviceFingerprint(input, outgoing);
        var response = await nativeFetch(input, outgoing);
        noteServerTime(response);
        announceSystemState(response, url);
        response = await handleSecurityResponse(response, input, init, token);
        if (response.status !== 401 || url.indexOf(RWL_API_BASE + '/api/') !== 0 || AUTH_ENDPOINT_PATTERN.test(url) || !token) {
            return response;
        }
        var newToken = await refreshAccessToken();
        if (!newToken) return response;
        var headers = new Headers((init && init.headers) || (input && input.headers) || undefined);
        headers.set('Authorization', 'Bearer ' + newToken);
        var retryInit = Object.assign({}, init || {}, { headers: headers });
        return nativeFetch(url, await signedInit(url, retryInit, newToken));
    };

    var fingerprintPromise = null;
    var deviceHeaderEnabled = false;

    function fingerprintSource() {
        var parts = [];
        try {
            var screenInfo = global.screen || {};
            parts.push(navigator.userAgent || '', navigator.platform || '', String(navigator.hardwareConcurrency || ''), String(navigator.deviceMemory || ''), String(navigator.maxTouchPoints || 0));
            parts.push(String(screenInfo.width || 0) + 'x' + String(screenInfo.height || 0) + 'x' + String(screenInfo.colorDepth || 0), String(global.devicePixelRatio || 1));
            parts.push((Intl.DateTimeFormat().resolvedOptions().timeZone || ''), (navigator.languages || []).join(','));
            var canvas = document.createElement('canvas');
            var context = canvas.getContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            if (context) {
                var debugInfo = context.getExtension('WEBGL_debug_renderer_info');
                parts.push(debugInfo ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '') : String(context.getParameter(context.RENDERER) || ''));
            }
        } catch (error) {}
        return parts.join('|');
    }

    function deviceFingerprint() {
        if (!fingerprintPromise) {
            fingerprintPromise = (global.crypto && global.crypto.subtle && encoder ? sha256Hex(fingerprintSource()) : Promise.resolve('')).catch(function () { return ''; });
        }
        return fingerprintPromise;
    }

    async function withDeviceFingerprint(input, init) {
        if (!deviceHeaderEnabled) return init;
        var fingerprint = await deviceFingerprint();
        if (!fingerprint) return init;
        var headers = new Headers((init && init.headers) || (input && input.headers) || undefined);
        headers.set('X-RWL-Device', fingerprint);
        return Object.assign({}, init || {}, { headers: headers });
    }

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
        style.textContent = '@keyframes rwlNameRgb{0%{background-position:300% 50%}100%{background-position:0% 50%}}' +
            '@keyframes rwlNameRev{0%{background-position:0% 50%}100%{background-position:300% 50%}}' +
            '@keyframes rwlNameDown{0%{background-position:50% 300%}100%{background-position:50% 0%}}' +
            '@keyframes rwlNameUp{0%{background-position:50% 0%}100%{background-position:50% 300%}}' +
            '@property --rwl-p{syntax:"<number>";inherits:false;initial-value:0}' +
            '@keyframes rwlNameOut{0%{--rwl-p:-100}100%{--rwl-p:0}}' +
            '@keyframes rwlNameIn{0%{--rwl-p:0}100%{--rwl-p:-100}}' +
            '@keyframes rwlFxPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.55)}}' +
            '@keyframes rwlFxGlow{0%,100%{filter:drop-shadow(0 0 1px currentColor) brightness(1)}50%{filter:drop-shadow(0 0 7px var(--rwl-g,#fff)) brightness(1.25)}}' +
            '@keyframes rwlFxGlitch{0%,86%,100%{filter:none;opacity:1}88%{filter:hue-rotate(90deg) saturate(2);opacity:.75}90%{filter:hue-rotate(-90deg);opacity:1}93%{filter:contrast(2);opacity:.6}96%{filter:hue-rotate(180deg);opacity:1}}' +
            '@keyframes rwlFxRainbow{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}' +
            '@keyframes rwlFxBreath{0%,100%{opacity:1}50%{opacity:.5}}' +
            '@keyframes rwlFxSparkle{0%,70%,100%{filter:brightness(1)}74%{filter:brightness(2.3) saturate(1.5)}78%{filter:brightness(1)}84%{filter:brightness(1.9)}}' +
            '@keyframes rwlFxFire{0%,100%{filter:brightness(1) drop-shadow(0 -1px 3px #ff6a00)}25%{filter:brightness(1.3) drop-shadow(0 -2px 5px #ffb300)}60%{filter:brightness(.9) drop-shadow(0 -1px 2px #ff3d00)}}' +
            '@keyframes rwlFxIce{0%,100%{filter:brightness(1.05) drop-shadow(0 0 2px #9be7ff)}50%{filter:brightness(1.4) drop-shadow(0 0 6px #e3f9ff)}}' +
            '@keyframes rwlFxNeon{0%,18%,22%,62%,64%,100%{opacity:1;filter:drop-shadow(0 0 5px var(--rwl-g,#fff))}20%,63%{opacity:.35;filter:none}}' +
            '@keyframes rwlFxGhost{0%,100%{filter:blur(0);opacity:1}50%{filter:blur(.8px);opacity:.55}}' +
            '@keyframes rwlFxStorm{0%,91%,95%,100%{filter:brightness(1)}92%{filter:brightness(2.6)}93%{filter:brightness(1.1)}94%{filter:brightness(2.2)}}' +
            '@keyframes rwlFxPrism{0%,100%{filter:hue-rotate(-25deg) saturate(1.3)}50%{filter:hue-rotate(25deg) saturate(1.9)}}' +
            '.rwl-rgb-text{background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent;animation:rwlNameRgb 4s linear infinite;}' +
            '.rwl-rgb-swatch{background-size:300% 100%;animation:rwlNameRgb 4s linear infinite;}';
        (document.head || document.documentElement).appendChild(style);
    }

    function gradientCss(colors) {
        var safe = (colors || []).map(function (color) { return sanitizeHex(color, ''); }).filter(Boolean);
        if (safe.length < 2) return '';
        return 'linear-gradient(90deg,' + safe.join(',') + ')';
    }

    var EFFECT_OVERLAYS = {
        pulse: ['rwlFxPulse', 0.6, 'ease-in-out'],
        glow: ['rwlFxGlow', 0.7, 'ease-in-out'],
        glitch: ['rwlFxGlitch', 1.2, 'steps(1)'],
        rainbow: ['rwlFxRainbow', 2, 'linear'],
        breath: ['rwlFxBreath', 0.9, 'ease-in-out'],
        sparkle: ['rwlFxSparkle', 1, 'linear'],
        fire: ['rwlFxFire', 0.35, 'ease-in-out'],
        ice: ['rwlFxIce', 1, 'ease-in-out'],
        neon: ['rwlFxNeon', 1.1, 'linear'],
        ghost: ['rwlFxGhost', 1, 'ease-in-out'],
        storm: ['rwlFxStorm', 1.6, 'linear'],
        prism: ['rwlFxPrism', 1, 'ease-in-out']
    };
    var EFFECT_SIZES = { shimmer: 200, chrome: 160, plasma: 400, aurora: 500, lava: 500, matrix: 400, tide: 240 };
    var EFFECT_TIMINGS = { plasma: 'ease-in-out', aurora: 'ease-in-out', lava: 'ease-in-out', tide: 'ease-in-out', matrix: 'steps(14)' };
    var EFFECT_DIRECTIONS = { plasma: 'alternate', aurora: 'alternate', lava: 'alternate', tide: 'alternate' };
    var EFFECT_SPEEDS = { shimmer: 0.7, chrome: 0.8, matrix: 0.9, lava: 2.2, aurora: 2, plasma: 1.5, tide: 1.4 };

    function effectStops(colors, effect) {
        if (effect === 'shimmer' || effect === 'chrome') {
            var highlighted = colors.slice(0, 3);
            return highlighted.concat(['#ffffff'], highlighted.slice().reverse());
        }
        if (effect === 'fire') return ['#fff3b0', '#ffb703', '#fb5607', '#d00000'].concat(colors.slice(0, 1));
        if (effect === 'ice') return ['#ffffff', '#caf0f8', '#48cae4'].concat(colors.slice(0, 1));
        return colors;
    }

    function directedAnimation(direction) {
        if (direction === 'rtl') return 'rwlNameRev';
        if (direction === 'ttb') return 'rwlNameDown';
        if (direction === 'btt') return 'rwlNameUp';
        if (direction === 'center_out') return 'rwlNameOut';
        if (direction === 'edge_in') return 'rwlNameIn';
        return 'rwlNameRgb';
    }

    function radialStops(colors) {
        var step = 100 / colors.length;
        return colors.map(function (color, index) {
            return color + ' calc((var(--rwl-p) + ' + (index * step) + ') * 1%)';
        }).join(',');
    }

    function animatedFill(colors, seconds, effect, direction) {
        var safe = colors.map(function (color) { return sanitizeHex(color, ''); }).filter(Boolean);
        if (safe.length < 2) return '';
        var stops = effectStops(safe, effect);
        var chosen = direction || 'ltr';
        var size = EFFECT_SIZES[effect] || 300;
        var duration = Math.max(0.5, seconds * (EFFECT_SPEEDS[effect] || 1));
        var timing = EFFECT_TIMINGS[effect] || 'linear';
        var iteration = EFFECT_DIRECTIONS[effect] ? ' ' + EFFECT_DIRECTIONS[effect] : '';
        var background;
        if (chosen === 'center_out' || chosen === 'edge_in') {
            background = 'background-image:repeating-radial-gradient(ellipse 60% 240% at 50% 50%,' + radialStops(stops.concat([stops[0]])) + ');background-size:100% 100%;';
        } else {
            var vertical = chosen === 'ttb' || chosen === 'btt';
            var angle = effect === 'plasma' ? 45 : DIRECTION_ANGLES[chosen];
            background = 'background-image:linear-gradient(' + angle + 'deg,' + stops.join(',') + ');background-size:' + (vertical ? '100% ' + size + '%' : size + '% 100%') + ';';
        }
        var animations = [directedAnimation(chosen) + ' ' + duration + 's ' + timing + ' infinite' + iteration];
        var overlay = EFFECT_OVERLAYS[effect];
        if (overlay) animations.push(overlay[0] + ' ' + Math.max(0.3, seconds * overlay[1]) + 's ' + overlay[2] + ' infinite');
        return background + '--rwl-g:' + safe[0] + ';animation:' + animations.join(',') + ';';
    }

    function clampSpeed(raw) {
        var speed = parseFloat(raw);
        return isNaN(speed) ? 1 : Math.max(0.5, Math.min(2, speed));
    }

    function nameColorStyle(cosmetics, fallback) {
        ensureCosmeticStyles();
        var data = cosmetics || {};
        if (data.name_color_animated && data.name_color_gradient) {
            var baseSeconds = Math.max(1, Math.min(parseInt(data.name_color_animation_seconds, 10) || 4, 20)) / clampSpeed(data.name_color_speed);
            var fill = animatedFill(data.name_color_gradient, baseSeconds, data.name_color_effect || 'flow', data.name_color_direction || 'ltr');
            if (fill) {
                return KEEP_COLORS_STYLE + fill + '-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;';
            }
        }
        if (data.name_color_hex) return KEEP_COLORS_STYLE + 'color:' + sanitizeHex(data.name_color_hex, fallback) + ';';
        return KEEP_COLORS_STYLE + 'color:' + sanitizeHex(fallback, '#ffffff') + ';';
    }

    function swatchStyle(item) {
        ensureCosmeticStyles();
        if (item && item.animated && item.gradient) {
            var seconds = Math.max(1, Math.min(parseInt(item.animation_seconds, 10) || 4, 20)) / clampSpeed(item.speed);
            var swatchFill = animatedFill(item.gradient, seconds, item.effect || 'flow', item.direction || 'ltr');
            if (swatchFill) return KEEP_COLORS_STYLE + swatchFill;
        }
        return KEEP_COLORS_STYLE + 'background:' + sanitizeHex(item && item.hex, '#7b2cbf') + ';';
    }

    function frameColorVars(colors) {
        var vars = '';
        for (var index = 0; index < 6; index++) {
            vars += '--rwl-f' + (index + 1) + ':' + (colors[index] || colors[index % colors.length]) + ';';
        }
        return vars;
    }

    var MEDIA_FILTER_PATTERN = /^hue-rotate\(-?\d{1,3}deg\) saturate\(\d{1,3}%\) brightness\(\d{1,3}%\)$/;

    function mediaFilterValue(value) {
        return value && MEDIA_FILTER_PATTERN.test(String(value)) ? String(value) : '';
    }

    function mediaFilterStyle(value) {
        var filter = mediaFilterValue(value);
        return filter ? KEEP_COLORS_STYLE + 'filter:' + filter + ';' : '';
    }

    function frameAttributes(data, extraClass) {
        if (!data || !data.effect || !Array.isArray(data.colors) || !data.colors.length) return extraClass ? ' class="' + extraClass + '"' : '';
        var colors = data.colors.map(function (color) { return sanitizeHex(color, '#9d4edd'); });
        var seconds = Math.max(1, Math.min(parseFloat(data.animation_seconds) || 6, 30)) / clampSpeed(data.speed);
        var width = Math.max(1, Math.min(parseInt(data.thickness, 10) || 2, 6));
        var style = KEEP_COLORS_STYLE + frameColorVars(colors) + '--rwl-fs:' + seconds.toFixed(2) + 's;--rwl-fw:' + width + 'px;';
        var effect = String(data.effect).replace(/[^a-z0-9_]/g, '');
        return ' class="' + (extraClass ? extraClass + ' ' : '') + 'rwl-frame rwl-frame-' + effect + '" style="' + style + '"';
    }

    function frameClasses(data) {
        if (!data || !data.effect) return '';
        return ' rwl-frame rwl-frame-' + String(data.effect).replace(/[^a-z0-9_]/g, '');
    }

    function frameStyle(data) {
        if (!data || !data.effect || !Array.isArray(data.colors) || !data.colors.length) return '';
        var colors = data.colors.map(function (color) { return sanitizeHex(color, '#9d4edd'); });
        var seconds = Math.max(1, Math.min(parseFloat(data.animation_seconds) || 6, 30)) / clampSpeed(data.speed);
        var width = Math.max(1, Math.min(parseInt(data.thickness, 10) || 2, 6));
        return KEEP_COLORS_STYLE + frameColorVars(colors) + '--rwl-fs:' + seconds.toFixed(2) + 's;--rwl-fw:' + width + 'px;';
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

    function loadCompanion(fileName) {
        var current = document.currentScript || document.querySelector('script[src*="api_client.js"]');
        if (!current || !current.src) return;
        var script = document.createElement('script');
        script.src = current.src.replace(/api_client\.js.*$/, fileName);
        script.defer = true;
        (document.head || document.documentElement).appendChild(script);
    }

    loadCompanion('rwl_guard.js');
    loadCompanion('rwl_upgrade.js');
    loadCompanion('rwl_behavior.js');
    loadCompanion('rwl_social_notify.js');
    loadCompanion('rwl_growth.js');

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
        mediaFilterValue: mediaFilterValue,
        mediaFilterStyle: mediaFilterStyle,
        swatchStyle: swatchStyle,
        frameAttributes: frameAttributes,
        frameClasses: frameClasses,
        frameStyle: frameStyle,
        signingHeaders: signingHeaders,
        ensureCosmeticStyles: ensureCosmeticStyles,
        trackEvent: trackEvent,
        deviceFingerprint: deviceFingerprint,
        enableDeviceHeader: function () { deviceHeaderEnabled = true; }
    };
    global.apiUrl = apiUrl;
})(window);
