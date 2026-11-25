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
    var HEARTBEAT_MS = 2000;
    var OWNER_STALE_MS = 7000;
    var RECONCILE_MS = 1500;
    var SETTINGS_WAIT_MS = 2500;
    var METADATA_WAIT_MS = 4000;
    var RESYNC_TOLERANCE_SECONDS = 0.4;
    var RETRY_DELAYS_MS = [1000, 2500, 6000, 15000];
    var DENIED_RETRY_MS = 30000;
    var GESTURES = ['pointerdown', 'keydown', 'touchend', 'click'];
    var STATUS_TEXT = {
        loading: 'Loading the theme sound',
        playing: 'Playing',
        standby: 'Playing in another window',
        blocked: 'Click anywhere on the page to start the theme sound',
        failed: 'The theme sound could not be loaded, trying again'
    };
    var tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var channel = typeof global.BroadcastChannel === 'function' ? new global.BroadcastChannel(CHANNEL_NAME) : null;
    var audio = null;
    var activeUrl = null;
    var activeThemeId = null;
    var objectUrl = null;
    var loadedUrl = null;
    var loadEntry = null;
    var failureCount = 0;
    var retryAt = 0;
    var themeSettings = {};
    var loaded = false;
    var settingsRequest = null;
    var waitingForGesture = false;
    var playBusy = false;
    var isOwner = false;
    var status = 'idle';
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
        try { global.dispatchEvent(new CustomEvent('rwl-theme-sound-change', { detail: { theme_id: activeThemeId, volume: current.volume, muted: current.muted, active: !!activeUrl, status: status } })); } catch (error) {}
    }

    function setStatus(next) {
        if (status === next) return;
        status = next;
        announce();
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

    function writeTimeline(anchor) {
        writeJson(TIMELINE_KEY, { id: activeThemeId, anchor: anchor, seen: Date.now() });
    }

    function timelinePosition(duration) {
        var entry = readTimeline();
        if (!entry) return null;
        var seconds = Math.max(0, (Date.now() - entry.anchor) / 1000);
        return isFinite(duration) && duration > 0 ? seconds % duration : seconds;
    }

    function syncToTimeline(element, tolerance) {
        if (!isFinite(element.duration) || element.duration <= 0) return;
        var wanted = timelinePosition(element.duration);
        if (wanted === null || Math.abs(element.currentTime - wanted) <= tolerance) return;
        try { element.currentTime = wanted; } catch (error) {}
    }

    function refreshAnchor() {
        if (!audio || audio.paused || audio.seeking || audio.readyState < 3 || !isFinite(audio.currentTime)) return;
        writeTimeline(Date.now() - audio.currentTime * 1000);
    }

    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audio.controls = false;
        audio.disableRemotePlayback = true;
        if (audio.controlsList) audio.controlsList.add('nodownload');
        audio.addEventListener('playing', onAudioPlaying);
        audio.addEventListener('error', onAudioError);
        return audio;
    }

    function onAudioPlaying() {
        failureCount = 0;
        retryAt = 0;
        refreshAnchor();
        setStatus('playing');
    }

    function onAudioError() {
        if (!activeUrl || !audio || !audio.getAttribute('src')) return;
        loadedUrl = null;
        releaseObjectUrl();
        purgeCachedSounds();
        registerFailure(0);
    }

    function registerFailure(httpStatus) {
        failureCount += 1;
        var denied = httpStatus === 403 || httpStatus === 404;
        retryAt = Date.now() + (denied ? DENIED_RETRY_MS : RETRY_DELAYS_MS[Math.min(failureCount - 1, RETRY_DELAYS_MS.length - 1)]);
        setStatus('failed');
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

    async function downloadSound(url) {
        var cached = await readCachedSound(url);
        if (cached) return cached;
        var response = await global.fetch(url, { method: 'GET', headers: RWL.authHeaders(), cache: 'no-store', credentials: 'omit' });
        if (!response.ok) {
            var failure = new Error('The theme sound request failed');
            failure.status = response.status;
            throw failure;
        }
        var copy = response.clone();
        var blob = await response.blob();
        writeCachedSound(url, copy);
        return blob;
    }

    function ensureSource(element) {
        var wanted = activeUrl;
        if (!wanted) return Promise.resolve(false);
        if (loadedUrl === wanted && objectUrl) return Promise.resolve(true);
        if (loadEntry && loadEntry.url === wanted) return loadEntry.promise;
        var entry = { url: wanted, promise: null };
        entry.promise = downloadSound(wanted).then(function (blob) {
            if (wanted !== activeUrl) return false;
            releaseObjectUrl();
            objectUrl = URL.createObjectURL(blob);
            element.src = objectUrl;
            loadedUrl = wanted;
            return true;
        }).catch(function (error) {
            if (wanted === activeUrl) registerFailure(error && error.status ? error.status : 0);
            return false;
        }).then(function (ready) {
            if (loadEntry === entry) loadEntry = null;
            return ready;
        });
        loadEntry = entry;
        return entry.promise;
    }

    function waitForMetadata(element) {
        if (element.readyState >= 1) return Promise.resolve();
        return new Promise(function (resolve) {
            var finish = function () {
                element.removeEventListener('loadedmetadata', finish);
                element.removeEventListener('error', finish);
                resolve();
            };
            element.addEventListener('loadedmetadata', finish);
            element.addEventListener('error', finish);
            setTimeout(finish, METADATA_WAIT_MS);
        });
    }

    function applyVolumeTo(element) {
        var current = settingsFor(activeThemeId);
        element.volume = effectiveVolume();
        element.muted = current.muted;
    }

    async function play() {
        if (!activeUrl || !isOwner || playBusy) return;
        playBusy = true;
        try {
            var element = ensureAudio();
            if (loadedUrl !== activeUrl) setStatus('loading');
            var ready = await Promise.all([Promise.race([loadSettings(), pause(SETTINGS_WAIT_MS)]), ensureSource(element)]);
            if (!ready[1] || !activeUrl || !isOwner) return;
            await waitForMetadata(element);
            if (!activeUrl || !isOwner) return;
            applyVolumeTo(element);
            syncToTimeline(element, 0);
            startHeartbeat();
            try {
                await element.play();
                removeGestureListeners();
            } catch (error) {
                if (error && error.name === 'NotAllowedError') {
                    setStatus('blocked');
                    awaitGesture();
                } else if (error && error.name !== 'AbortError') {
                    loadedUrl = null;
                    releaseObjectUrl();
                    purgeCachedSounds();
                    registerFailure(0);
                }
            }
        } finally {
            playBusy = false;
        }
    }

    function pauseOutput() {
        if (audio && !audio.paused) audio.pause();
    }

    function stop() {
        loadEntry = null;
        loadedUrl = null;
        removeGestureListeners();
        releaseOwnership();
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }
        releaseObjectUrl();
        setStatus('idle');
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
            refreshAnchor();
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
        if (!wasOwner || !audio || audio.paused) play();
    }

    function releaseOwnership() {
        stopHeartbeat();
        var record = ownerRecord();
        if (isOwner && record && record.tab === tabId) writeJson(OWNER_KEY, null);
        isOwner = false;
    }

    function yieldOwnership() {
        if (!isOwner) return;
        refreshAnchor();
        isOwner = false;
        stopHeartbeat();
        pauseOutput();
        setStatus('standby');
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
        refreshAnchor();
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

    function wantedSound() {
        var theme = global.RWLTheme && global.RWLTheme.current ? global.RWLTheme.current() : null;
        var url = theme && theme.sound_url ? String(theme.sound_url) : null;
        return { url: url, id: url && theme.item_id ? String(theme.item_id).toLowerCase() : null };
    }

    function switchTo(wanted) {
        var previousUrl = activeUrl;
        if (!wanted.url) {
            activeUrl = null;
            activeThemeId = null;
            stop();
            if (previousUrl) purgeCachedSounds();
            announce();
            return;
        }
        if (!signedIn()) return;
        pauseOutput();
        activeUrl = wanted.url;
        activeThemeId = wanted.id;
        loadEntry = null;
        loadedUrl = null;
        failureCount = 0;
        retryAt = 0;
        releaseObjectUrl();
        setStatus('loading');
        if (document.visibilityState === 'visible' || !otherOwnerAlive()) claim();
        loadSettings().then(function () {
            if (activeUrl === wanted.url) announce();
        });
    }

    function reconcile() {
        var wanted = wantedSound();
        if (wanted.url !== activeUrl) {
            switchTo(wanted);
            return;
        }
        if (!activeUrl) return;
        if (!isOwner) {
            if (document.visibilityState === 'visible' && !otherOwnerAlive()) claim();
            return;
        }
        if (waitingForGesture || playBusy || (audio && !audio.paused) || Date.now() < retryAt) return;
        play();
    }

    function loadSettings() {
        if (loaded || !signedIn()) return Promise.resolve(themeSettings);
        if (settingsRequest) return settingsRequest;
        settingsRequest = RWL.apiRequest('/api/experience/state').then(function (data) {
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
        }).catch(function () {
            loaded = false;
        }).then(function () {
            settingsRequest = null;
            return themeSettings;
        });
        return settingsRequest;
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
            '<label class="rwl-sound-mute"><span class="rwl-switch"><input type="checkbox" role="switch" class="rwl-sound-mutebox"><span class="rwl-switch-track"></span></span><span>' + RWL.escapeHtml(tr('Mute theme sound')) + '</span></label>' +
            '<small class="rwl-sound-status" role="status" hidden></small>';
        var range = field.querySelector('.rwl-sound-range');
        var box = field.querySelector('.rwl-sound-mutebox');
        var value = field.querySelector('.rwl-sound-value');
        var note = field.querySelector('.rwl-sound-status');
        var paint = function () {
            var current = settingsFor(key);
            range.value = current.volume;
            box.checked = current.muted;
            value.textContent = current.muted ? tr('Muted') : current.volume + '%';
            var text = activeThemeId === key && STATUS_TEXT[status] ? tr(STATUS_TEXT[status]) : '';
            note.textContent = text;
            note.hidden = !text;
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
        global.addEventListener('rwl-theme-applied', reconcile);
        global.addEventListener('rickware-launcher-event', onLauncherEvent);
        global.addEventListener('pagehide', onPageHide);
        global.addEventListener('pageshow', onPageShow);
        global.addEventListener('focus', onFocus);
        global.addEventListener('online', reconcile);
        document.addEventListener('visibilitychange', onVisibility);
        if (channel) channel.onmessage = onChannelMessage;
        setInterval(reconcile, RECONCILE_MS);
        reconcile();
    }

    global.RWLThemeSound = {
        setVolume: setVolume,
        setMuted: setMuted,
        mountField: mountField,
        state: function () { var current = settingsFor(activeThemeId); return { theme_id: activeThemeId, volume: current.volume, muted: current.muted, active: !!activeUrl, status: status }; },
        active: function () { return !!activeUrl; },
        refresh: function () { loaded = false; return loadSettings(); }
    };

    start();
})(window);
