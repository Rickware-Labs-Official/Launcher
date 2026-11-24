(function (global) {
    if (global.RWLThemeSound || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var DEFAULT_VOLUME = 30;
    var SAVE_DELAY_MS = 450;
    var TIMELINE_KEY = 'rwl_theme_sound_timeline';
    var OWNER_KEY = 'rwl_theme_sound_owner';
    var CHANNEL_NAME = 'rwl_theme_sound';
    var CACHE_NAME = 'rwl-theme-sound-v1';
    var TIMELINE_STALE_MS = 1800000;
    var HEARTBEAT_MS = 3000;
    var OWNER_STALE_MS = 9000;
    var RESYNC_TOLERANCE_SECONDS = 1.2;
    var RETRY_DELAYS_MS = [800, 2000, 5000, 12000];
    var GESTURES = ['pointerdown', 'keydown', 'touchend', 'click'];
    var tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var channel = typeof global.BroadcastChannel === 'function' ? new global.BroadcastChannel(CHANNEL_NAME) : null;
    var audio = null;
    var activeUrl = null;
    var activeThemeId = null;
    var objectUrl = null;
    var sourceToken = 0;
    var themeSettings = {};
    var loaded = false;
    var waitingForGesture = false;
    var isOwner = false;
    var heartbeatTimer = null;
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

    function readJson(key) {
        try {
            return JSON.parse(global.localStorage.getItem(key) || 'null');
        } catch (error) {
            return null;
        }
    }

    function writeJson(key, value) {
        try {
            if (value === null) global.localStorage.removeItem(key);
            else global.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {}
    }

    function post(message) {
        if (!channel) return;
        try { channel.postMessage(Object.assign({ tab: tabId }, message)); } catch (error) {}
    }

    function pause(milliseconds) {
        return new Promise(function (resolve) { setTimeout(resolve, milliseconds); });
    }

    function readTimeline() {
        var entry = readJson(TIMELINE_KEY);
        if (!entry || entry.id !== activeThemeId || !isFinite(entry.anchor) || Date.now() - Number(entry.seen) > TIMELINE_STALE_MS) return null;
        return entry;
    }

    function touchTimeline(anchor) {
        var entry = readTimeline();
        writeJson(TIMELINE_KEY, { id: activeThemeId, anchor: anchor !== undefined ? anchor : (entry ? entry.anchor : Date.now()), seen: Date.now() });
    }

    function timelinePosition(duration) {
        var entry = readTimeline();
        if (!entry) return null;
        var seconds = Math.max(0, (Date.now() - entry.anchor) / 1000);
        return isFinite(duration) && duration > 0 ? seconds % duration : seconds;
    }

    function syncToTimeline(element) {
        if (!isFinite(element.duration) || element.duration <= 0) return;
        var wanted = timelinePosition(element.duration);
        if (wanted === null || Math.abs(element.currentTime - wanted) <= RESYNC_TOLERANCE_SECONDS) return;
        try { element.currentTime = wanted; } catch (error) {}
    }

    function onAudioPlaying() {
        if (!readTimeline()) touchTimeline(Date.now() - audio.currentTime * 1000);
    }

    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audio.controls = false;
        audio.disableRemotePlayback = true;
        if (audio.controlsList) audio.controlsList.add('nodownload');
        audio.addEventListener('loadedmetadata', function () { syncToTimeline(audio); });
        audio.addEventListener('playing', onAudioPlaying);
        audio.addEventListener('error', onAudioError);
        return audio;
    }

    function onAudioError() {
        if (!activeUrl || !audio || !audio.getAttribute('data-source')) return;
        audio.removeAttribute('data-source');
        releaseObjectUrl();
        setTimeout(function () { if (isOwner && activeUrl) play(); }, 2000);
    }

    function removeGestureListeners() {
        GESTURES.forEach(function (name) { global.removeEventListener(name, onGesture, true); });
        waitingForGesture = false;
    }

    function onGesture() {
        removeGestureListeners();
        if (isOwner) play();
        else if (activeUrl) claim();
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

    async function readCachedSound(url) {
        if (!global.caches) return null;
        try {
            var cache = await global.caches.open(CACHE_NAME);
            var match = await cache.match(url);
            return match ? await match.blob() : null;
        } catch (error) {
            return null;
        }
    }

    async function writeCachedSound(url, response) {
        if (!global.caches) return;
        try {
            var cache = await global.caches.open(CACHE_NAME);
            var keys = await cache.keys();
            await Promise.all(keys.filter(function (request) { return request.url !== url; }).map(function (request) { return cache.delete(request); }));
            await cache.put(url, response);
        } catch (error) {}
    }

    async function purgeCachedSounds() {
        if (!global.caches) return;
        try { await global.caches.delete(CACHE_NAME); } catch (error) {}
    }

    async function obtainSound(url) {
        var cached = await readCachedSound(url);
        if (cached) return cached;
        for (var attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
            try {
                var response = await global.fetch(url, { method: 'GET', headers: RWL.authHeaders(), cache: 'no-store', credentials: 'omit' });
                if (response.ok) {
                    var copy = response.clone();
                    var blob = await response.blob();
                    writeCachedSound(url, copy);
                    return blob;
                }
                if (response.status === 401 || response.status === 403 || response.status === 404) return null;
            } catch (error) {}
            if (url !== activeUrl || attempt === RETRY_DELAYS_MS.length) return null;
            await pause(RETRY_DELAYS_MS[attempt]);
            if (url !== activeUrl) return null;
        }
        return null;
    }

    async function ensureSource(element) {
        if (element.getAttribute('data-source') === activeUrl && objectUrl) return true;
        var token = ++sourceToken;
        var wanted = activeUrl;
        var blob = await obtainSound(wanted);
        if (!blob || token !== sourceToken || wanted !== activeUrl) return false;
        releaseObjectUrl();
        objectUrl = URL.createObjectURL(blob);
        element.src = objectUrl;
        element.setAttribute('data-source', wanted);
        return true;
    }

    function applyVolumeTo(element) {
        var current = settingsFor(activeThemeId);
        element.volume = effectiveVolume();
        element.muted = current.muted || dndActive();
    }

    async function play() {
        if (!activeUrl || !isOwner) return;
        var element = ensureAudio();
        var ready = await Promise.all([loadSettings(), ensureSource(element)]);
        if (!ready[1] || !activeUrl || !isOwner) return;
        applyVolumeTo(element);
        syncToTimeline(element);
        var attempt = element.play();
        if (attempt && attempt.catch) attempt.catch(function () { awaitGesture(); });
        startHeartbeat();
    }

    function pauseOutput() {
        if (audio && !audio.paused) audio.pause();
    }

    function stop() {
        sourceToken++;
        removeGestureListeners();
        releaseOwnership();
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.removeAttribute('data-source');
            audio.load();
        }
        releaseObjectUrl();
    }

    function applyVolume() {
        if (!activeUrl || !audio) return;
        applyVolumeTo(audio);
    }

    function ownerRecord() {
        return readJson(OWNER_KEY);
    }

    function otherOwnerAlive() {
        var record = ownerRecord();
        return !!record && record.tab !== tabId && Date.now() - Number(record.at) < OWNER_STALE_MS;
    }

    function writeOwner() {
        writeJson(OWNER_KEY, { tab: tabId, at: Date.now() });
    }

    function startHeartbeat() {
        if (heartbeatTimer) return;
        heartbeatTimer = setInterval(function () {
            if (!isOwner) return;
            writeOwner();
            if (audio && !audio.paused) touchTimeline();
        }, HEARTBEAT_MS);
    }

    function stopHeartbeat() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    function claim() {
        if (!activeUrl) return;
        var wasOwner = isOwner;
        isOwner = true;
        writeOwner();
        if (!wasOwner) post({ type: 'claim' });
        startHeartbeat();
        if (!wasOwner || (audio && audio.paused)) play();
    }

    function releaseOwnership() {
        stopHeartbeat();
        var record = ownerRecord();
        if (isOwner && record && record.tab === tabId) writeJson(OWNER_KEY, null);
        isOwner = false;
    }

    function yieldOwnership() {
        if (!isOwner) return;
        isOwner = false;
        stopHeartbeat();
        pauseOutput();
    }

    function onChannelMessage(event) {
        var message = event && event.data;
        if (!message || message.tab === tabId) return;
        if (message.type === 'claim') {
            yieldOwnership();
        } else if (message.type === 'settings' && message.id) {
            var key = String(message.id).toLowerCase();
            themeSettings[key] = { volume: clampVolume(message.volume), muted: !!message.muted };
            applyVolume();
            announce();
        }
    }

    function onPageHide() {
        if (!isOwner) return;
        if (audio && !audio.paused) touchTimeline();
        var record = ownerRecord();
        if (record && record.tab === tabId) writeJson(OWNER_KEY, null);
    }

    function onPageShow(event) {
        if (event && event.persisted && activeUrl) claim();
    }

    function onVisibility() {
        if (activeUrl && document.visibilityState === 'visible') claim();
    }

    function onFocus() {
        if (activeUrl) claim();
    }

    function onTheme(event) {
        var detail = event.detail || {};
        var theme = detail.theme;
        var url = theme && theme.sound_url ? theme.sound_url : null;
        if (url === activeUrl) return;
        var previousUrl = activeUrl;
        activeUrl = url;
        activeThemeId = url && theme.item_id ? String(theme.item_id).toLowerCase() : null;
        if (!url) {
            stop();
            if (previousUrl) purgeCachedSounds();
            announce();
            return;
        }
        if (!signedIn()) {
            activeUrl = null;
            activeThemeId = null;
            return;
        }
        if (document.visibilityState === 'visible' || !otherOwnerAlive()) claim();
        loadSettings().then(function () {
            if (activeUrl === url) announce();
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

    function shareSettings(key) {
        var current = settingsFor(key);
        post({ type: 'settings', id: key, volume: current.volume, muted: current.muted });
    }

    function setVolume(value, themeId) {
        var key = String(themeId || activeThemeId || '');
        if (!key) return;
        var current = settingsFor(key);
        current.volume = clampVolume(value);
        if (current.volume > 0 && current.muted) current.muted = false;
        applyVolume();
        scheduleSave(key);
        shareSettings(key);
        announce();
    }

    function setMuted(flag, themeId) {
        var key = String(themeId || activeThemeId || '');
        if (!key) return;
        settingsFor(key).muted = !!flag;
        applyVolume();
        scheduleSave(key);
        shareSettings(key);
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
        shareSettings(activeThemeId);
        announce();
    }

    function start() {
        global.addEventListener('rwl-theme-applied', onTheme);
        global.addEventListener('rickware-launcher-event', onLauncherEvent);
        global.addEventListener('rwl-presence-change', applyVolume);
        global.addEventListener('pagehide', onPageHide);
        global.addEventListener('pageshow', onPageShow);
        global.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        if (channel) channel.onmessage = onChannelMessage;
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
