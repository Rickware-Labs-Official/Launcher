(function (global) {
    if (global.RWLNotify || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var MAX_BODY = 140;
    var COOLDOWN_MS = 2500;
    var lastShown = {};
    var serverEnabled = true;
    var loaded = false;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function inLauncher() {
        return !!(RWL.isLauncherHost && RWL.isLauncherHost());
    }

    function supported() {
        return inLauncher() || ('Notification' in global);
    }

    function permission() {
        if (inLauncher()) return 'granted';
        return 'Notification' in global ? global.Notification.permission : 'denied';
    }

    function request() {
        if (inLauncher()) return Promise.resolve('granted');
        if (!('Notification' in global)) return Promise.resolve('denied');
        try {
            var result = global.Notification.requestPermission();
            return result && result.then ? result : Promise.resolve(global.Notification.permission);
        } catch (error) {
            return Promise.resolve(global.Notification.permission);
        }
    }

    function loadServerFlag() {
        if (loaded || !RWL.getToken()) return Promise.resolve();
        loaded = true;
        return RWL.apiRequest('/api/experience/state').then(function (data) {
            serverEnabled = data.notifications_enabled !== false;
        }).catch(function () { loaded = false; });
    }

    function allowed() {
        if (!serverEnabled || !RWL.getToken()) return false;
        if (global.RWLPresence && global.RWLPresence.current().selected === 'dnd') return false;
        return permission() === 'granted';
    }

    function show(options) {
        if (!allowed()) return false;
        var key = String(options.tag || options.title);
        var now = Date.now();
        if (lastShown[key] && now - lastShown[key] < COOLDOWN_MS) return false;
        if (!options.force && !document.hidden && document.hasFocus()) return false;
        lastShown[key] = now;
        var title = String(options.title || 'Rickware - Labs©').slice(0, 80);
        var body = String(options.body || '').slice(0, MAX_BODY);
        if (inLauncher()) {
            global.RickwareBridge.call('showNotification', { title: title, body: body }).catch(function () {});
            return true;
        }
        try {
            var notification = new global.Notification(title, { body: body, tag: key, icon: options.icon || undefined, silent: false });
            notification.onclick = function () {
                try { global.focus(); } catch (error) {}
                notification.close();
                if (typeof options.onClick === 'function') options.onClick();
            };
            return true;
        } catch (error) {
            return false;
        }
    }

    function onSocialEvent(event) {
        var entry = event.detail || {};
        if (entry.type === 'message' && !entry.echo && entry.message && entry.message.sender === 'partner') {
            var from = entry.from || {};
            show({ title: from.username || t('New message'), body: entry.request ? t('Sent you a message request') : t('Sent you an encrypted message'), tag: 'dm:' + entry.channel_id, onClick: function () { if (global.RWLSocial && global.RWLSocial.openChat) global.RWLSocial.openChat(entry.channel_id); } });
        } else if (entry.type === 'group_message' && entry.from && entry.message && !entry.message.mine) {
            if (global.RWLLabcordFocus && global.RWLLabcordFocus(entry.group_id, entry.message.channel_id)) return;
            show({ title: entry.from.username, body: t('Sent a message in one of your Labcord servers'), tag: 'group:' + entry.group_id });
        } else if (entry.type === 'friend_request' && entry.from) {
            show({ title: entry.from.username, body: t('Sent you a friend request'), tag: 'friend:' + entry.from.username });
        } else if (entry.type === 'friend_update' && entry.by && entry.friend_status === 'friends') {
            show({ title: entry.by.username, body: t('Accepted your friend request'), tag: 'friend_ok:' + entry.by.username });
        }
    }

    function chipLabel() {
        var state = permission();
        if (!supported()) return t('System notifications are not supported here');
        if (state === 'granted') return t('System notifications are on');
        if (state === 'denied') return t('System notifications are blocked in your browser');
        return t('Enable system notifications');
    }

    function mountToggle(container) {
        if (!container || container.querySelector('.rwl-notify-chip')) return null;
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'rwl-notify-chip';
        chip.title = t('Get a system notification for new messages and friend requests');
        var paint = function () {
            chip.textContent = '🔔 ' + chipLabel();
            chip.disabled = !supported() || permission() === 'denied';
        };
        chip.addEventListener('click', async function () {
            if (permission() === 'granted') {
                show({ title: 'Rickware - Labs©', body: t('System notifications work.'), force: true, tag: 'test' });
                return;
            }
            await request();
            paint();
        });
        paint();
        container.appendChild(chip);
        return chip;
    }

    global.RWLNotify = { supported: supported, permission: permission, request: request, show: show, mountToggle: mountToggle };
    global.addEventListener('rwl-social-event', onSocialEvent);
    loadServerFlag();
    global.addEventListener('rwl-login', function () { loaded = false; loadServerFlag(); });
})(window);
