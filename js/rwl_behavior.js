(function (global) {
    if (global.RWLBehavior || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var FLUSH_MS = 15000;
    var STROKE_GAP_MS = 220;
    var MAX_STROKES = 40;
    var MAX_POINTS = 160;
    var MAX_KEYS = 240;
    var strokes = [];
    var stroke = null;
    var lastMove = null;
    var keyIntervals = [];
    var keyDwells = [];
    var keyDown = {};
    var lastKeyDown = 0;
    var untrustedPointer = 0;
    var startedAt = Date.now();
    var sending = false;
    var stopped = false;

    function pageName() {
        var path = global.location.pathname.toLowerCase();
        if (path.indexOf('login_register') >= 0) return 'login';
        if (path.indexOf('inventory') >= 0) return 'inventory';
        if (path.indexOf('lab-pass') >= 0) return 'lab_pass';
        if (path.indexOf('bazaar') >= 0) return 'bazaar';
        if (path.indexOf('chest_opening') >= 0) return 'chest';
        if (path.indexOf('account_settings') >= 0 || path.indexOf('preferences') >= 0) return 'settings';
        if (path.indexOf('/sites/') >= 0) return 'other';
        return 'home';
    }

    function now() {
        return global.performance && global.performance.now ? global.performance.now() : Date.now();
    }

    function closeStroke() {
        if (stroke && stroke.length >= 3 && strokes.length < MAX_STROKES) strokes.push(stroke);
        stroke = null;
    }

    function onMove(event) {
        if (!event.isTrusted) {
            untrustedPointer++;
            return;
        }
        if (event.pointerType && event.pointerType !== 'mouse') return;
        var stamp = event.timeStamp || now();
        if (!lastMove || stamp - lastMove.t > STROKE_GAP_MS) {
            closeStroke();
            stroke = [];
            lastMove = { x: event.clientX, y: event.clientY, t: stamp };
            return;
        }
        if (stroke && stroke.length < MAX_POINTS) {
            var dx = Math.round((event.clientX - lastMove.x) * 100) / 100;
            var dy = Math.round((event.clientY - lastMove.y) * 100) / 100;
            var dt = Math.round((stamp - lastMove.t) * 10) / 10;
            if (dx || dy) stroke.push([dx, dy, Math.max(0, Math.min(2000, dt))]);
        }
        lastMove = { x: event.clientX, y: event.clientY, t: stamp };
    }

    function onClick(event) {
        if (!event.isTrusted) untrustedPointer++;
    }

    function sensitiveTarget(target) {
        return !!(target && target.tagName === 'INPUT' && String(target.type).toLowerCase() === 'password');
    }

    function onKeyDown(event) {
        if (!event.isTrusted || event.repeat || sensitiveTarget(event.target)) return;
        if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta' || event.key === 'CapsLock') return;
        var stamp = event.timeStamp || now();
        if (lastKeyDown && keyIntervals.length < MAX_KEYS) {
            var interval = stamp - lastKeyDown;
            if (interval < 5000) keyIntervals.push(Math.round(interval * 10) / 10);
        }
        lastKeyDown = stamp;
        keyDown[event.code || event.keyCode] = stamp;
    }

    function onKeyUp(event) {
        if (!event.isTrusted || sensitiveTarget(event.target)) return;
        var key = event.code || event.keyCode;
        var pressed = keyDown[key];
        if (pressed === undefined) return;
        delete keyDown[key];
        if (keyDwells.length < MAX_KEYS) keyDwells.push(Math.round(((event.timeStamp || now()) - pressed) * 10) / 10);
    }

    function hasData() {
        return strokes.length >= 4 || keyIntervals.length >= 20 || untrustedPointer >= 5;
    }

    function takeBatch() {
        closeStroke();
        var batch = {
            page: pageName(),
            strokes: strokes.splice(0, MAX_STROKES),
            key_intervals: keyIntervals.splice(0, MAX_KEYS),
            key_dwells: keyDwells.splice(0, MAX_KEYS),
            untrusted_pointer: untrustedPointer,
            duration_ms: Math.min(600000, Date.now() - startedAt)
        };
        untrustedPointer = 0;
        startedAt = Date.now();
        return batch;
    }

    function handleResult(result) {
        if (!result || result.ok !== false) return;
        stopped = true;
        var t = function (text) { return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text; };
        if (result.locked) {
            var until = result.permanent ? t('permanently') : (result.until ? t('until') + ' ' + new Date(result.until).toLocaleString() : '');
            try { RWL.clearSession(); } catch (error) {}
            if (global.RWLGuard && global.RWLGuard.showOverlay) global.RWLGuard.showOverlay('behavior', t('Security Alert'), (result.reason || '') + ' ' + t('Your account is locked') + ' ' + until + '.', true);
        } else if (result.blocked && global.RWLGuard && global.RWLGuard.showOverlay) {
            global.RWLGuard.showOverlay('behavior', t('Security Alert'), t('Automated behavior was detected. Access from this device and network is blocked.'), true);
        }
    }

    function flush() {
        if (sending || stopped || !hasData()) return;
        sending = true;
        var batch = takeBatch();
        RWL.deviceFingerprint().then(function (fingerprint) {
            if (fingerprint) batch.fingerprint = fingerprint;
            var headers = { 'Content-Type': 'application/json' };
            var token = RWL.getToken();
            if (token) headers.Authorization = 'Bearer ' + token;
            return fetch(RWL.apiUrl('/api/guard/behavior'), { method: 'POST', headers: headers, body: JSON.stringify(batch), keepalive: JSON.stringify(batch).length < 60000 });
        }).then(function (response) {
            return response && response.ok ? response.json() : null;
        }).then(handleResult).catch(function () {}).then(function () {
            sending = false;
        });
    }

    function start() {
        document.addEventListener('pointermove', onMove, { passive: true, capture: true });
        document.addEventListener('mousemove', function (event) { if (!event.isTrusted) untrustedPointer++; }, { passive: true, capture: true });
        document.addEventListener('click', onClick, { passive: true, capture: true });
        document.addEventListener('keydown', onKeyDown, { passive: true, capture: true });
        document.addEventListener('keyup', onKeyUp, { passive: true, capture: true });
        setInterval(function () { if (!document.hidden) flush(); }, FLUSH_MS);
        document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
        var loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', function () { flush(); }, true);
    }

    function init() {
        var configLoader = global.RWLGuard && global.RWLGuard.config ? global.RWLGuard.config() : fetch(RWL.apiUrl('/api/security/client_config')).then(function (response) { return response.ok ? response.json() : {}; });
        Promise.resolve(configLoader).then(function (settings) {
            if (!settings || !settings.behavior) return;
            if (RWL.enableDeviceHeader) RWL.enableDeviceHeader();
            if (settings.behavior.enabled) start();
        }).catch(function () {});
    }

    global.RWLBehavior = { flush: flush };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
    else setTimeout(init, 300);
})(window);
