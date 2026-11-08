(function (global) {
    if (global.RWLSocialNotify || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var MAX_POPUPS = 4;
    var POPUP_MS = 7000;
    var cursor = 0;
    var running = false;
    var failures = 0;
    var stack = null;
    var BAZAAR_TEXT = {
        sold: 'An item was sold on the Lab Bazaar.',
        traded: 'A trade was completed on the Lab Bazaar.',
        bid: 'There is a new bid on the Lab Bazaar.',
        settled: 'An auction ended on the Lab Bazaar.',
        removed: 'A listing was removed by staff.',
        cancelled: 'A listing was cancelled.',
        moderated: 'A listing was changed by staff.'
    };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return RWL.escapeHtml(value);
    }

    function indexUrl(query) {
        var inSites = global.location.pathname.indexOf('/sites/') >= 0;
        return (inSites ? '../index.html' : './index.html') + (query || '');
    }

    function bazaarUrl() {
        return global.location.pathname.indexOf('/sites/') >= 0 ? './bazaar.html' : './sites/bazaar.html';
    }

    function pictureUrl(path) {
        if (!path) return '';
        if (typeof global.profilePicUrl === 'function') return global.profilePicUrl(path);
        return /^https?:\/\//.test(path) ? path : RWL.apiUrl(path);
    }

    function stackElement() {
        if (stack && stack.isConnected) return stack;
        stack = document.createElement('div');
        stack.className = 'rwl-pop-stack';
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
        if (!document.querySelector('link[href*="rwl_social.css"]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = global.location.pathname.indexOf('/sites/') >= 0 ? '../css/rwl_social.css' : './css/rwl_social.css';
            document.head.appendChild(link);
        }
        return stack;
    }

    function popup(options) {
        var holder = stackElement();
        while (holder.children.length >= MAX_POPUPS) holder.removeChild(holder.firstChild);
        var element = document.createElement('div');
        element.className = 'rwl-pop';
        element.setAttribute('role', 'status');
        var picture = pictureUrl(options.picture);
        element.innerHTML = (picture ? '<img class="rwl-pop-icon" src="' + esc(picture) + '" alt="">' : '<div class="rwl-pop-icon">' + (options.icon || '💬') + '</div>') +
            '<div class="rwl-pop-text"><span class="rwl-pop-title" translate="no">' + esc(options.title) + '</span><span class="rwl-pop-body">' + esc(options.body) + '</span></div>' +
            '<button type="button" class="rwl-pop-close" title="' + esc(t('Close')) + '">✕</button>';
        element.addEventListener('click', function (event) {
            element.remove();
            if (event.target.closest('.rwl-pop-close')) return;
            if (options.onOpen) options.onOpen();
        });
        holder.appendChild(element);
        setTimeout(function () { if (element.isConnected) element.remove(); }, POPUP_MS);
    }

    function openChannel(channelId) {
        if (global.RWLSocial && global.RWLSocial.openChat) {
            var tab = document.querySelector('.top-tab[data-tab="dashboard"]');
            if (tab && !tab.classList.contains('active')) tab.click();
            global.RWLSocial.openChat(channelId);
        } else {
            global.location.href = indexUrl('?dm=' + encodeURIComponent(channelId));
        }
    }

    function openDashboard() {
        var tab = document.querySelector('.top-tab[data-tab="dashboard"]');
        if (tab) tab.click();
        else global.location.href = indexUrl('#dashboard');
    }

    function handle(entry) {
        try { global.dispatchEvent(new CustomEvent('rwl-social-event', { detail: entry })); } catch (error) {}
        if (entry.type === 'message' && !entry.echo && entry.message && entry.message.sender === 'partner') {
            if (global.RWLSocial && global.RWLSocial.isChatOpenFor && global.RWLSocial.isChatOpenFor(entry.channel_id)) return;
            var from = entry.from || {};
            popup({ title: from.username || t('New message'), body: entry.request ? t('Sent you a message request') : t('Sent you an encrypted message'), picture: from.profile_picture, onOpen: function () { openChannel(entry.channel_id); } });
        } else if (entry.type === 'friend_request' && entry.from) {
            popup({ title: entry.from.username, body: t('Sent you a friend request'), picture: entry.from.profile_picture, icon: '🤝', onOpen: openDashboard });
        } else if (entry.type === 'friend_update' && entry.by && entry.friend_status === 'friends') {
            popup({ title: entry.by.username, body: t('Accepted your friend request'), picture: entry.by.profile_picture, icon: '🤝', onOpen: openDashboard });
        } else if (entry.type === 'bazaar' && BAZAAR_TEXT[entry.action]) {
            if (global.location.pathname.indexOf('bazaar') >= 0 && (entry.action === 'listed' || entry.action === 'bid')) return;
            popup({ title: 'Lab Bazaar', body: t(BAZAAR_TEXT[entry.action]), icon: '🏪', onOpen: function () { global.location.href = bazaarUrl(); } });
        }
    }

    async function request(wait) {
        var response = await fetch(RWL.apiUrl('/api/social/events?cursor=' + cursor + (wait ? '&wait=1' : '')), { headers: { 'Authorization': 'Bearer ' + RWL.getToken() } });
        if (response.status === 401 || response.status === 403 || response.status === 404) {
            var stop = new Error('stop');
            stop.stop = true;
            throw stop;
        }
        if (!response.ok) throw new Error('events failed');
        return response.json();
    }

    async function loop() {
        if (running) return;
        running = true;
        try {
            var first = await request(false);
            cursor = first.cursor || 0;
        } catch (error) {
            running = false;
            if (!error.stop) setTimeout(loop, 15000);
            return;
        }
        while (RWL.getToken()) {
            try {
                var data = await request(true);
                failures = 0;
                if (!data.reset) (data.events || []).forEach(handle);
                else if (global.RWLSocial && global.RWLSocial.refresh) global.RWLSocial.refresh();
                cursor = data.cursor || cursor;
                if (document.hidden) await new Promise(function (resolve) { setTimeout(resolve, 4000); });
            } catch (error) {
                if (error.stop) break;
                failures++;
                await new Promise(function (resolve) { setTimeout(resolve, Math.min(60000, 3000 * failures)); });
            }
        }
        running = false;
    }

    global.RWLSocialNotify = { popup: popup, start: loop };

    function init() {
        if (!RWL.getToken()) return;
        loop();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200); });
    else setTimeout(init, 1200);
})(window);
