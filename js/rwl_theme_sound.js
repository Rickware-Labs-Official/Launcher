(function (global) {
    if (global.RWLThemeSound || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var DEFAULT_VOLUME = 30;
    var SAVE_DELAY_MS = 450;
    var RESUME_KEY = 'rwl_theme_sound_resume';
    var RESUME_MAX_AGE_MS = 120000;
    var GESTURES = ['pointerdown', 'keydown', 'touchstart', 'click'];
    var audio = null;
    var activeUrl = null;
    var activeThemeId = null;
    var objectUrl = null;
    var sourceToken = 0;
    var themeSettings = {};
    var loaded = false;
    var waitingForGesture = false;
    var saveTimers = {};

    function signedIn() {
        return !!RWL.getToken();
    }

    function clampVolume(value) {
        var number = parseInt(value, 10);
        return isNaN(number) ? DEFAULT_VOLUME : Math.max(0, Math.min(100, number));
    }

    function settingsFor(themeId) {
        var key = String(themeId || activeThemeId || '');
        if (!themeSettings[key]) themeSettings[key] = { volume: DEFAULT_VOLUME, muted: false };
        return themeSettings[key];
    }

    function effectiveVolume() {
        var current = settingsFor(activeThemeId);
        return current.muted ? 0 : clampVolume(current.volume) / 100;
    }

    function announce() {
        var current = settingsFor(activeThemeId);
        try { global.dispatchEvent(new CustomEvent('rwl-theme-sound-change', { detail: { theme_id: activeThemeId, volume: current.volume, muted: current.muted, active: !!activeUrl } })); } catch (error) {}
    }

    function dndActive() {
        return global.RWLPresence && global.RWLPresence.current().selected === 'dnd';
    }

    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audio.controls = false;
        audio.disableRemotePlayback = true;
        if (audio.controlsList) audio.controlsList.add('nodownload');
        return audio;
    }

    function removeGestureListeners() {
        GESTURES.forEach(function (name) { global.removeEventListener(name, onGesture, true); });
        waitingForGesture = false;
    }

    function onGesture() {
        removeGestureListeners();
        play();
    }

    function awaitGesture() {
        if (waitingForGesture) return;
        waitingForGesture = true;
        GESTURES.forEach(function (name) { global.addEventListener(name, onGesture, { capture: true, once: false, passive: true }); });
    }

    function releaseObjectUrl() {
        if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch (error) {}
            objectUrl = null;
        }
    }

    function readResume() {
        try {
            var raw = global.sessionStorage.getItem(RESUME_KEY);
            if (!raw) return null;
            var entry = JSON.parse(raw);
            if (!entry || entry.id !== activeThemeId || Date.now() - Number(entry.at) > RESUME_MAX_AGE_MS) return null;
            var seconds = Number(entry.t);
            return isFinite(seconds) && seconds > 0 ? seconds : null;
        } catch (error) {
            return null;
        }
    }

    function rememberPosition() {
        try {
            if (audio && activeThemeId && activeUrl && !audio.paused && audio.currentTime > 0) {
                global.sessionStorage.setItem(RESUME_KEY, JSON.stringify({ id: activeThemeId, t: audio.currentTime, at: Date.now() }));
            }
        } catch (error) {}
    }

    function applyResume(element) {
        var seconds = readResume();
        if (seconds === null) return;
        var restore = function () {
            element.removeEventListener('loadedmetadata', restore);
            try {
                if (!isFinite(element.duration) || seconds < element.duration - 1) element.currentTime = seconds;
            } catch (error) {}
        };
        element.addEventListener('loadedmetadata', restore);
    }

    async function streamSource(url) {
        var response = await global.fetch(url, { method: 'GET', headers: RWL.authHeaders(), cache: 'no-store', credentials: 'omit' });
        if (!response.ok) throw new Error('theme sound unavailable');
        var type = response.headers.get('Content-Type') || 'audio/mpeg';
        var data = await response.arrayBuffer();
        return URL.createObjectURL(new Blob([data], { type: type }));
    }

    async function ensureSource(element) {
        if (element.getAttribute('data-source') === activeUrl && objectUrl) return true;
        var token = ++sourceToken;
        var wanted = activeUrl;
        var nextObjectUrl;
        try {
            nextObjectUrl = await streamSource(wanted);
        } catch (error) {
            return false;
        }
        if (token !== sourceToken || wanted !== activeUrl) {
            try { URL.revokeObjectURL(nextObjectUrl); } catch (error) {}
            return false;
        }
        releaseObjectUrl();
        objectUrl = nextObjectUrl;
        applyResume(element);
        element.src = nextObjectUrl;
        element.setAttribute('data-source', wanted);
        return true;
    }

    async function play() {
        if (!activeUrl) return;
        var element = ensureAudio();
        if (!(await ensureSource(element)) || !activeUrl) return;
        var current = settingsFor(activeThemeId);
        element.volume = effectiveVolume();
        element.muted = current.muted || dndActive();
        var attempt = element.play();
        if (attempt && attempt.catch) attempt.catch(function () { awaitGesture(); });
    }

    function stop() {
        sourceToken++;
        removeGestureListeners();
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.removeAttribute('data-source');
            audio.load();
        }
        releaseObjectUrl();
    }

    function applyVolume() {
        if (!activeUrl) return;
        if (audio) {
            audio.volume = effectiveVolume();
            audio.muted = settingsFor(activeThemeId).muted || dndActive();
        }
    }

    function onTheme(event) {
        var detail = event.detail || {};
        var theme = detail.theme;
        var url = theme && theme.sound_url ? theme.sound_url : null;
        if (url === activeUrl) return;
        activeUrl = url;
        activeThemeId = url && theme.item_id ? String(theme.item_id).toLowerCase() : null;
        if (!url) {
            stop();
            announce();
            return;
        }
        if (!signedIn()) {
            activeUrl = null;
            activeThemeId = null;
            return;
        }
        loadSettings().then(function () {
            if (activeUrl === url) play();
            announce();
        });
    }

    async function loadSettings() {
        if (loaded || !signedIn()) return themeSettings;
        try {
            var data = await RWL.apiRequest('/api/experience/state');
            var all = data && data.theme_sounds && typeof data.theme_sounds === 'object' ? data.theme_sounds : {};
            Object.keys(all).forEach(function (key) {
                var entry = all[key] || {};
                themeSettings[String(key).toLowerCase()] = { volume: clampVolume(entry.volume), muted: !!entry.muted };
            });
            var equipped = data && data.theme_sound;
            if (equipped && activeThemeId && !all[activeThemeId]) {
                themeSettings[activeThemeId] = { volume: clampVolume(equipped.volume), muted: !!equipped.muted };
            }
            loaded = true;
        } catch (error) {
            loaded = false;
        }
        return themeSettings;
    }

    function scheduleSave(themeId) {
        var key = String(themeId || '');
        if (!key) return;
        clearTimeout(saveTimers[key]);
        saveTimers[key] = setTimeout(function () {
            var current = settingsFor(key);
            RWL.apiRequest('/api/experience/sound', { method: 'POST', body: { theme_id: key, volume: current.volume, muted: current.muted } }).catch(function () {});
        }, SAVE_DELAY_MS);
    }

    function setVolume(value, themeId) {
        var key = String(themeId || activeThemeId || '');
        if (!key) return;
        var current = settingsFor(key);
        current.volume = clampVolume(value);
        if (current.volume > 0 && current.muted) current.muted = false;
        applyVolume();
        scheduleSave(key);
        announce();
    }

    function setMuted(flag, themeId) {
        var key = String(themeId || activeThemeId || '');
        if (!key) return;
        settingsFor(key).muted = !!flag;
        applyVolume();
        scheduleSave(key);
        announce();
    }

    function mountField(container, themeId) {
        if (!container || container.querySelector('.rwl-sound-field')) return;
        var key = String(themeId || activeThemeId || '').toLowerCase();
        if (!key) return;
        var field = document.createElement('div');
        field.className = 'rwl-sound-field inv-config-field';
        var tr = function (text) { return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text; };
        field.innerHTML = '<span><span>' + RWL.escapeHtml(tr('Sound Settings')) + '</span><strong class="rwl-sound-value"></strong></span>' +
            '<input type="range" min="0" max="100" step="1" class="rwl-sound-range" title="' + RWL.escapeHtml(tr('Change the volume of the theme sound')) + '">' +
            '<label class="rwl-sound-mute"><span class="rwl-switch"><input type="checkbox" role="switch" class="rwl-sound-mutebox"><span class="rwl-switch-track"></span></span><span>' + RWL.escapeHtml(tr('Mute theme sound')) + '</span></label>';
        var range = field.querySelector('.rwl-sound-range');
        var box = field.querySelector('.rwl-sound-mutebox');
        var value = field.querySelector('.rwl-sound-value');
        var paint = function () {
            var current = settingsFor(key);
            range.value = current.volume;
            box.checked = current.muted;
            value.textContent = current.muted ? tr('Muted') : current.volume + '%';
        };
        range.addEventListener('input', function () { setVolume(range.value, key); });
        box.addEventListener('change', function () { setMuted(box.checked, key); });
        global.addEventListener('rwl-theme-sound-change', paint);
        loadSettings().then(paint);
        paint();
        container.appendChild(field);
    }

    function onLauncherEvent(event) {
        var detail = event.detail || {};
        if (detail.name !== 'theme_sound' || !detail.data || !activeThemeId) return;
        var current = settingsFor(activeThemeId);
        if (typeof detail.data.volume === 'number') {
            current.volume = clampVolume(Math.round(detail.data.volume));
            if (current.volume > 0 && current.muted && detail.data.muted !== true) current.muted = false;
        }
        if (typeof detail.data.muted === 'boolean') current.muted = detail.data.muted;
        applyVolume();
        scheduleSave(activeThemeId);
        announce();
    }

    function start() {
        global.addEventListener('rwl-theme-applied', onTheme);
        global.addEventListener('rickware-launcher-event', onLauncherEvent);
        global.addEventListener('rwl-presence-change', applyVolume);
        global.addEventListener('pagehide', rememberPosition);
        document.addEventListener('visibilitychange', function () {
            if (!activeUrl || (global.RickwareBridge && global.RickwareBridge.isLauncher)) return;
            if (document.hidden) { rememberPosition(); if (audio) audio.pause(); }
            else play();
        });
        if (global.RWLTheme && global.RWLTheme.current && global.RWLTheme.current()) onTheme({ detail: { theme: global.RWLTheme.current() } });
    }

    global.RWLThemeSound = {
        setVolume: setVolume,
        setMuted: setMuted,
        mountField: mountField,
        state: function () { var current = settingsFor(activeThemeId); return { theme_id: activeThemeId, volume: current.volume, muted: current.muted, active: !!activeUrl }; },
        active: function () { return !!activeUrl; },
        refresh: function () { loaded = false; return loadSettings(); }
    };

    start();
})(window);
