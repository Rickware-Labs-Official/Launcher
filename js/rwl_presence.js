(function (global) {
    if (global.RWLPresence || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var STATUSES = ['online', 'dnd', 'away'];
    var LABELS = { online: 'Online', dnd: 'Do Not Disturb', away: 'Away', offline: 'Offline' };
    var HINTS = { online: 'You are visible and receive every notification.', dnd: 'You will not receive notifications or sounds.', away: 'Shown when you are not around.' };
    var ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'pointerdown', 'scroll'];
    var CHECK_MS = 15000;
    var state = { selected: 'online', effective: 'online', idleAfter: 300, forced: false, canForce: false, idle: false, lastActivity: Date.now(), loaded: false, launcherIdle: null };
    var menu = null;
    var timer = null;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return RWL.escapeHtml(value);
    }

    function normalize(status) {
        return STATUSES.indexOf(status) >= 0 ? status : (status === 'offline' ? 'offline' : '');
    }

    function statusOf(user) {
        if (!user) return 'offline';
        var direct = normalize(user.presence_status);
        if (direct) return direct;
        if (user.online === true) return 'online';
        return 'offline';
    }

    function label(status) {
        return t(LABELS[status] || LABELS.offline);
    }

    function dotHtml(status, extraClass) {
        var value = normalize(status) || 'offline';
        return '<span class="rwl-status-dot ' + value + (extraClass ? ' ' + esc(extraClass) : '') + '" data-presence="' + value + '" title="' + esc(label(value)) + '"></span>';
    }

    function isIdle() {
        return state.idle;
    }

    function current() {
        return { selected: state.selected, effective: state.effective, forced: state.forced, idle: state.idle };
    }

    function announce() {
        try { global.dispatchEvent(new CustomEvent('rwl-presence-change', { detail: current() })); } catch (error) {}
    }

    function signedIn() {
        return !!RWL.getToken();
    }

    async function refresh() {
        if (!signedIn()) return null;
        try {
            var data = await RWL.apiRequest('/api/online/status');
            state.selected = normalize(data.status) || 'online';
            state.effective = normalize(data.effective) || state.selected;
            state.idleAfter = Math.max(60, parseInt(data.idle_away_seconds, 10) || 300);
            state.forced = !!data.forced_online;
            state.canForce = !!data.can_force_online;
            state.loaded = true;
            announce();
            return data;
        } catch (error) {
            return null;
        }
    }

    async function set(status) {
        if (STATUSES.indexOf(status) < 0 || !signedIn()) return null;
        try {
            var data = await RWL.apiRequest('/api/online/status', { method: 'POST', body: { status: status } });
            state.selected = normalize(data.status) || status;
            state.effective = normalize(data.effective) || state.selected;
            announce();
            return data;
        } catch (error) {
            if (global.showBanner) global.showBanner(error.message || 'Your status could not be changed.', 'error');
            return null;
        }
    }

    function pushIdle() {
        if (!signedIn()) return;
        RWL.apiRequest('/api/online/ping?idle=' + (state.idle ? '1' : '0'), { method: 'POST' }).catch(function () {});
    }

    function setIdle(next) {
        if (state.idle === next) return;
        state.idle = next;
        pushIdle();
        announce();
    }

    function onActivity() {
        state.lastActivity = Date.now();
        if (state.idle && !inLauncher()) setIdle(false);
    }

    function inLauncher() {
        return !!(RWL.isLauncherHost && RWL.isLauncherHost());
    }

    function check() {
        if (!signedIn() || inLauncher()) return;
        setIdle(Date.now() - state.lastActivity >= state.idleAfter * 1000);
    }

    function menuElement() {
        if (menu && menu.isConnected) return menu;
        menu = document.createElement('div');
        menu.className = 'rwl-presence-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');
        document.body.appendChild(menu);
        document.addEventListener('click', function (event) {
            if (menu && !menu.hidden && !menu.contains(event.target) && !event.target.closest('[data-presence-trigger]')) menu.hidden = true;
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && menu) menu.hidden = true;
        });
        return menu;
    }

    function renderMenu() {
        var element = menuElement();
        element.innerHTML = STATUSES.map(function (status) {
            return '<button type="button" class="rwl-presence-option' + (state.selected === status ? ' active' : '') + '" role="menuitemradio" aria-checked="' + (state.selected === status) + '" data-status="' + status + '">' +
                dotHtml(status) + '<span>' + esc(label(status)) + '<small>' + esc(t(HINTS[status])) + '</small></span></button>';
        }).join('') + '<div class="rwl-presence-note">' + esc(t('Your status applies to Labcord, the chat popup and the dashboard. You switch to Away automatically when you are idle.')) + (state.forced ? ' ' + esc(t('Always online is active, everyone sees you as online.')) : '') + '</div>';
        Array.prototype.forEach.call(element.querySelectorAll('.rwl-presence-option'), function (button) {
            button.addEventListener('click', async function () {
                var status = button.getAttribute('data-status');
                element.hidden = true;
                await set(status);
            });
        });
    }

    function openMenu(anchor) {
        if (!signedIn()) return;
        var element = menuElement();
        renderMenu();
        element.hidden = false;
        var rect = anchor.getBoundingClientRect();
        var width = element.offsetWidth || 240;
        var height = element.offsetHeight || 220;
        var left = Math.max(12, Math.min(global.innerWidth - width - 12, rect.left));
        var top = rect.top - height - 8;
        if (top < 12) top = Math.min(global.innerHeight - height - 12, rect.bottom + 8);
        element.style.left = left + 'px';
        element.style.top = top + 'px';
        refresh().then(function () { if (!element.hidden) renderMenu(); });
    }

    function mountProfileRow() {
        var sidebar = document.getElementById('profileSidebar');
        if (!sidebar || sidebar.querySelector('.rwl-status-row') || !signedIn()) return;
        var nav = sidebar.querySelector('.profile-sidebar-nav');
        if (!nav) return;
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'rwl-status-row';
        row.setAttribute('data-presence-trigger', '1');
        row.title = t('Change your status');
        nav.parentNode.insertBefore(row, nav);
        var paint = function () {
            row.innerHTML = dotHtml(state.selected) + '<span class="rwl-status-row-label">' + esc(label(state.selected)) + '</span><span aria-hidden="true">▾</span>';
        };
        paint();
        global.addEventListener('rwl-presence-change', paint);
        row.addEventListener('click', function (event) {
            event.stopPropagation();
            openMenu(row);
        });
    }

    function onLauncherEvent(event) {
        var detail = event.detail || {};
        if (detail.name === 'idle' && detail.data) setIdle(!!detail.data.idle);
    }

    function start() {
        if (timer) return;
        ACTIVITY_EVENTS.forEach(function (name) { global.addEventListener(name, onActivity, { passive: true, capture: true }); });
        global.addEventListener('rickware-launcher-event', onLauncherEvent);
        timer = setInterval(check, CHECK_MS);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) onActivity(); });
        if (signedIn()) refresh().then(mountProfileRow);
        var observer = new MutationObserver(function () { mountProfileRow(); });
        observer.observe(document.body, { childList: true, subtree: true });
        global.setTimeout(function () { observer.disconnect(); }, 20000);
        global.addEventListener('rwl-login', function () { refresh().then(mountProfileRow); });
    }

    global.RWLPresence = {
        statuses: STATUSES,
        label: label,
        dotHtml: dotHtml,
        statusOf: statusOf,
        isIdle: isIdle,
        idleAfter: function () { return state.idleAfter; },
        current: current,
        refresh: refresh,
        set: set,
        openMenu: openMenu,
        wantsNotifications: function () { return state.selected !== 'dnd'; }
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})(window);
