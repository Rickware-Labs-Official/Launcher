(function (global) {
    if (global.RWLThemeSound || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var DEFAULT_VOLUME = 30;
    var SAVE_DELAY_MS = 450;
    var GESTURES = ['pointerdown', 'keydown', 'touchstart', 'click'];
    var audio = null;
    var activeUrl = null;
    var objectUrl = null;
    var sourceToken = 0;
    var settings = { volume: DEFAULT_VOLUME, muted: false, loaded: false };
    var waitingForGesture = false;
    var saveTimer = null;

    function signedIn() {
        return !!RWL.getToken();
    }

    function effectiveVolume() {
        return settings.muted ? 0 : Math.max(0, Math.min(100, settings.volume)) / 100;
    }

    function announce() {
        try { global.dispatchEvent(new CustomEvent('rwl-theme-sound-change', { detail: { volume: settings.volume, muted: settings.muted, active: !!activeUrl } })); } catch (error) {}
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
        element.src = nextObjectUrl;
        element.setAttribute('data-source', wanted);
        return true;
    }

    async function play() {
        if (!activeUrl) return;
        var element = ensureAudio();
        if (!(await ensureSource(element)) || !activeUrl) return;
        element.volume = effectiveVolume();
        element.muted = settings.muted || dndActive();
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
            audio.muted = settings.muted || dndActive();
        }
    }

    function onTheme(event) {
        var detail = event.detail || {};
        var theme = detail.theme;
        var url = theme && theme.sound_url ? theme.sound_url : null;
        if (url === activeUrl) return;
        activeUrl = url;
        if (!url) {
            stop();
            announce();
            return;
        }
        if (!signedIn()) {
            activeUrl = null;
            return;
        }
        loadSettings().then(function () {
            if (activeUrl === url) play();
            announce();
        });
    }

    async function loadSettings() {
        if (settings.loaded || !signedIn()) return settings;
        try {
            var data = await RWL.apiRequest('/api/experience/state');
            var sound = data && data.theme_sound;
            if (sound) {
                settings.volume = Math.max(0, Math.min(100, parseInt(sound.volume, 10)));
                settings.muted = !!sound.muted;
            }
            settings.loaded = true;
        } catch (error) {
            settings.loaded = false;
        }
        return settings;
    }

    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            RWL.apiRequest('/api/experience/sound', { method: 'POST', body: { volume: settings.volume, muted: settings.muted } }).catch(function () {});
        }, SAVE_DELAY_MS);
    }

    function setVolume(value) {
        var next = Math.max(0, Math.min(100, parseInt(value, 10) || 0));
        settings.volume = next;
        if (next > 0 && settings.muted) settings.muted = false;
        applyVolume();
        scheduleSave();
        announce();
    }

    function setMuted(flag) {
        settings.muted = !!flag;
        applyVolume();
        scheduleSave();
        announce();
    }

    function mountField(container) {
        if (!container || container.querySelector('.rwl-sound-field')) return;
        var field = document.createElement('div');
        field.className = 'rwl-sound-field inv-config-field';
        var tr = function (text) { return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text; };
        field.innerHTML = '<span><span>' + RWL.escapeHtml(tr('Theme Sound')) + '</span><strong class="rwl-sound-value"></strong></span>' +
            '<input type="range" min="0" max="100" step="1" class="rwl-sound-range" title="' + RWL.escapeHtml(tr('Change the volume of the theme sound')) + '">' +
            '<label class="rwl-sound-mute"><span class="rwl-switch"><input type="checkbox" role="switch" class="rwl-sound-mutebox"><span class="rwl-switch-track"></span></span><span>' + RWL.escapeHtml(tr('Mute theme sound')) + '</span></label>';
        var range = field.querySelector('.rwl-sound-range');
        var box = field.querySelector('.rwl-sound-mutebox');
        var value = field.querySelector('.rwl-sound-value');
        var paint = function () {
            range.value = settings.volume;
            box.checked = settings.muted;
            value.textContent = settings.muted ? tr('Muted') : settings.volume + '%';
        };
        range.addEventListener('input', function () { setVolume(range.value); });
        box.addEventListener('change', function () { setMuted(box.checked); });
        global.addEventListener('rwl-theme-sound-change', paint);
        loadSettings().then(paint);
        paint();
        container.appendChild(field);
    }

    function onLauncherEvent(event) {
        var detail = event.detail || {};
        if (detail.name !== 'theme_sound' || !detail.data) return;
        if (typeof detail.data.volume === 'number') {
            settings.volume = Math.max(0, Math.min(100, Math.round(detail.data.volume)));
            if (settings.volume > 0 && settings.muted && detail.data.muted !== true) settings.muted = false;
        }
        if (typeof detail.data.muted === 'boolean') settings.muted = detail.data.muted;
        applyVolume();
        scheduleSave();
        announce();
    }

    function start() {
        global.addEventListener('rwl-theme-applied', onTheme);
        global.addEventListener('rickware-launcher-event', onLauncherEvent);
        global.addEventListener('rwl-presence-change', applyVolume);
        document.addEventListener('visibilitychange', function () {
            if (!activeUrl || (global.RickwareBridge && global.RickwareBridge.isLauncher)) return;
            if (document.hidden) { if (audio) audio.pause(); }
            else play();
        });
        if (global.RWLTheme && global.RWLTheme.current && global.RWLTheme.current()) onTheme({ detail: { theme: global.RWLTheme.current() } });
    }

    global.RWLThemeSound = {
        setVolume: setVolume,
        setMuted: setMuted,
        mountField: mountField,
        state: function () { return { volume: settings.volume, muted: settings.muted, active: !!activeUrl }; },
        active: function () { return !!activeUrl; },
        refresh: function () { settings.loaded = false; return loadSettings(); }
    };

    start();
})(window);
