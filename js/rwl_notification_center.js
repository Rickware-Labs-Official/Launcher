(function (global) {
    if (global.RWLNotificationCenter || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;
    var wrapper = document.getElementById('notificationWrapper');
    var button = document.getElementById('notificationBtn');
    var badge = document.getElementById('notificationBadge');
    var panel = document.getElementById('notificationPanel');
    if (!wrapper || !button || !badge || !panel) return;

    var POLL_MS = 60000;
    var REFRESH_DELAY_MS = 450;
    var NAVIGATE_WAIT_MS = 700;
    var PAGE_SIZE = 30;
    var ARROW = String.fromCharCode(8594);
    var DOT = String.fromCharCode(183);
    var TIMES = String.fromCharCode(215);
    var CATEGORY_ICONS = {
        forum: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        reviews: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
        wallet: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 2.5-5 1.5-5 4a2.5 2 0 0 0 5 0"/>',
        shop: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
        bazaar: '<path d="M3 9l1-5h16l1 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
        lab_hub: '<path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 15h9"/>',
        dashboard: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        labcord: '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01M6 17.5h.01"/>',
        lab_pass: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
        account: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    };
    var CATEGORY_LABELS = { forum: 'Forum', reviews: 'Reviews', wallet: 'Wallet', shop: 'Shop', bazaar: 'Lab Bazaar', lab_hub: 'Lab Hub', dashboard: 'Dashboard', labcord: 'Labcord', lab_pass: 'Lab Pass', account: 'Account' };
    var KIND_TEXT = {
        forum_comment: ['commented on your post', true],
        forum_reply: ['replied to your comment', true],
        forum_post_like: ['liked your post', true],
        forum_post_dislike: ['disliked your post', true],
        forum_comment_like: ['liked your comment', true],
        forum_comment_dislike: ['disliked your comment', true],
        review_like: ['liked your review', true],
        review_dislike: ['disliked your review', true],
        xp_exchange: ['You exchanged XP for Lab Coins', false],
        order_completed: ['Your order was completed', false],
        order_pending: ['Your order is waiting for the payment', false],
        order_failed: ['Your order could not be completed', false],
        bazaar_bought: ['You bought an item on the Lab Bazaar', false],
        bazaar_sold: ['bought your item on the Lab Bazaar', true],
        bazaar_outbid: ['You were outbid on the Lab Bazaar', false],
        bazaar_new_bid: ['placed a bid on your item', true],
        bazaar_won: ['You won an auction on the Lab Bazaar', false],
        bazaar_traded: ['completed a trade with you', true],
        bazaar_refund: ['Your bid was refunded', false],
        bazaar_closed: ['Your Lab Bazaar listing was closed', false],
        bug_reward: ['You received a reward for your bug report', false],
        affiliate_commission: ['You earned an affiliate commission', false],
        affiliate_payout: ['Your affiliate payout was updated', false],
        referral_reward: ['You received an invite reward', false],
        friend_request: ['sent you a friend request', true],
        friend_accepted: ['accepted your friend request', true],
        dm_message: ['sent you a message', true],
        dm_request: ['sent you a message request', true],
        gift_received: ['sent you a gift', true],
        labcord_message: ['sent a message in this server', true],
        labcord_removed: ['You were removed from a Labcord server', false],
        lab_pass_level: ['You reached a new Lab Pass level', false],
        always_online_granted: ['Always Online was unlocked for your account', false],
        always_online_removed: ['Always Online was removed from your account', false],
        password_changed: ['Your password was changed', false],
        discord_linked: ['Your Discord account was linked', false]
    };
    var PAYOUT_STATES = { requested: 'Requested', approved: 'Approved', paid: 'Paid', rejected: 'Rejected', completed: 'Completed' };
    var TARGETS = {
        forum: { nav: 'forum' },
        reviews: { nav: 'reviews' },
        bank: { nav: 'bank' },
        bazaar: { nav: 'bazaar' },
        labpass: { nav: 'labpass' },
        inventory: { nav: 'inventory' },
        dashboard: { tab: 'dashboard' },
        labhub: { tab: 'labhub' },
        orders: { url: 'sites/order_history.html' },
        labcord: { url: 'sites/labcord.html' },
        account: { url: 'sites/account_settings.html' },
        sessions: { url: 'sites/sessions.html' }
    };
    var state = { open: false, view: 'recent', summary: null, lists: {}, busy: false };
    var refreshTimer = null;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return RWL.escapeHtml(value);
    }

    function signedIn() {
        return !!RWL.getToken();
    }

    function icon(name, size) {
        var path = CATEGORY_ICONS[name] || CATEGORY_ICONS.account;
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
    }

    function number(value) {
        var parsed = Number(value);
        return isFinite(parsed) ? parsed.toLocaleString(global.RWLI18n && global.RWLI18n.language ? global.RWLI18n.language() : 'en') : '0';
    }

    function relative(iso) {
        var stamp = Date.parse(iso);
        if (isNaN(stamp)) return '';
        var seconds = Math.round((stamp - Date.now()) / 1000);
        var magnitude = Math.abs(seconds);
        var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
        if (!global.Intl || !global.Intl.RelativeTimeFormat) return new Date(stamp).toLocaleString();
        var language = global.RWLI18n && global.RWLI18n.language ? global.RWLI18n.language() : 'en';
        var formatter;
        try { formatter = new global.Intl.RelativeTimeFormat(language, { numeric: 'auto' }); } catch (error) { formatter = new global.Intl.RelativeTimeFormat('en', { numeric: 'auto' }); }
        for (var index = 0; index < units.length; index++) {
            if (magnitude >= units[index][1]) return formatter.format(Math.round(seconds / units[index][1]), units[index][0]);
        }
        return formatter.format(0, 'second');
    }

    function detailParts(item, leads) {
        var meta = item.meta || {};
        var parts = [];
        if (item.kind === 'xp_exchange') {
            parts.push(number(meta.xp) + ' XP ' + ARROW + ' ' + number(meta.lab_coins) + ' LC');
        } else if (/^order_/.test(item.kind)) {
            if (item.subject) parts.push(item.subject);
            if (meta.order) parts.push('#' + meta.order);
            if (meta.amount !== undefined) parts.push(Number(meta.amount).toFixed(2) + ' ' + String(meta.currency || ''));
        } else if (item.kind === 'bug_reward') {
            if (item.subject) parts.push(item.subject);
            if (meta.lab_coins) parts.push('+' + number(meta.lab_coins) + ' LC');
            if (meta.xp) parts.push('+' + number(meta.xp) + ' XP');
        } else if (item.kind === 'affiliate_commission') {
            parts.push('$' + Number(meta.usd || 0).toFixed(2));
        } else if (item.kind === 'affiliate_payout') {
            if (PAYOUT_STATES[item.subject]) parts.push(t(PAYOUT_STATES[item.subject]));
            parts.push('$' + Number(meta.usd || 0).toFixed(2));
        } else if (item.subject) {
            parts.push(item.subject);
        }
        if (/^bazaar_/.test(item.kind) && meta.price !== undefined) parts.push(number(meta.price) + ' ' + String(meta.currency || 'lc').toUpperCase());
        if (!leads && item.actor) parts.push(item.actor);
        return parts;
    }

    function itemHtml(item, withChip) {
        var spec = KIND_TEXT[item.kind] || ['New notification', false];
        var leads = spec[1] && !!item.actor;
        var line = (leads ? '<strong class="rwl-nc-actor" translate="no">' + esc(item.actor) + '</strong> ' : '') + '<span>' + esc(t(spec[0])) + '</span>' + (item.count > 1 ? '<span class="rwl-nc-count" translate="no">' + TIMES + esc(item.count) + '</span>' : '');
        var parts = detailParts(item, leads);
        var detail = parts.length ? '<span class="rwl-nc-detail" translate="no">' + esc(parts.join(' ' + DOT + ' ')) + '</span>' : '';
        var chip = withChip ? '<span class="rwl-nc-chip">' + esc(t(CATEGORY_LABELS[item.category] || item.category)) + '</span>' : '';
        return '<button type="button" class="rwl-nc-item' + (item.read ? '' : ' rwl-nc-unread') + '" data-nc-item="' + esc(item.id) + '" data-nc-target="' + esc(item.target || '') + '">' +
            '<span class="rwl-nc-icon">' + icon(item.category, 18) + '</span>' +
            '<span class="rwl-nc-body"><span class="rwl-nc-line">' + line + '</span>' + detail +
            '<span class="rwl-nc-meta">' + chip + '<time datetime="' + esc(item.created_at) + '" translate="no">' + esc(relative(item.created_at)) + '</time></span></span>' +
            (item.read ? '' : '<span class="rwl-nc-dot" aria-hidden="true"></span>') +
            '</button>';
    }

    function currentItems() {
        if (state.view === 'recent') return state.summary ? state.summary.recent : [];
        var list = state.lists[state.view];
        return list ? list.items : [];
    }

    function render() {
        if (!state.open) return;
        var summary = state.summary || { unread: 0, total: 0, categories: [], recent: [] };
        var list = panel.querySelector('.rwl-nc-list');
        var tabs = panel.querySelector('.rwl-nc-tabs');
        var listScroll = list ? list.scrollTop : 0;
        var tabScroll = tabs ? tabs.scrollLeft : 0;
        var category = summary.categories.filter(function (entry) { return entry.key === state.view; })[0];
        var items = currentItems();
        var listState = state.lists[state.view];
        var tabsHtml = '<button type="button" class="rwl-nc-tab' + (state.view === 'recent' ? ' rwl-nc-active' : '') + '" data-nc-tab="recent">' + esc(t('Recent')) + (summary.unread ? '<span class="rwl-nc-tab-count" translate="no">' + esc(summary.unread > 99 ? '99+' : summary.unread) + '</span>' : '') + '</button>' +
            summary.categories.map(function (entry) {
                return '<button type="button" class="rwl-nc-tab' + (state.view === entry.key ? ' rwl-nc-active' : '') + '" data-nc-tab="' + esc(entry.key) + '">' + esc(t(CATEGORY_LABELS[entry.key] || entry.label)) + (entry.unread ? '<span class="rwl-nc-tab-count" translate="no">' + esc(entry.unread > 99 ? '99+' : entry.unread) + '</span>' : '') + '</button>';
            }).join('');
        var areaClear = state.view !== 'recent' && category && category.total ? '<button type="button" class="rwl-nc-action rwl-nc-danger" data-nc-action="clear-area">' + esc(t('Clear this area')) + '</button>' : '';
        var itemsHtml = items.length ? items.map(function (item) { return itemHtml(item, state.view === 'recent'); }).join('') : '<div class="rwl-nc-empty">' + esc(t(state.busy || (listState && listState.loading) ? 'Loading' : 'Nothing new here.')) + '</div>';
        var more = state.view !== 'recent' && listState && listState.hasMore ? '<button type="button" class="rwl-nc-action rwl-nc-more" data-nc-action="more"' + (listState.loading ? ' disabled' : '') + '>' + esc(t('Load more')) + '</button>' : '';
        panel.innerHTML = '<div class="rwl-nc-head"><span class="rwl-nc-title">' + esc(t('Notifications')) + '</span>' +
            '<button type="button" class="rwl-nc-action" data-nc-action="read-all"' + (summary.unread ? '' : ' disabled') + '>' + esc(t('Mark all read')) + '</button>' + areaClear +
            '<button type="button" class="rwl-nc-action rwl-nc-danger" data-nc-action="clear-all"' + (summary.total ? '' : ' disabled') + '>' + esc(t('Clear all')) + '</button></div>' +
            '<div class="rwl-nc-tabs" role="tablist">' + tabsHtml + '</div>' +
            '<div class="rwl-nc-list">' + itemsHtml + more + '</div>' +
            '<div class="rwl-nc-foot"><span>' + esc(t('Messages are deleted automatically after 7 days.')) + '</span></div>';
        var nextList = panel.querySelector('.rwl-nc-list');
        var nextTabs = panel.querySelector('.rwl-nc-tabs');
        if (nextList) nextList.scrollTop = listScroll;
        if (nextTabs) nextTabs.scrollLeft = tabScroll;
    }

    function paintBadge() {
        var unread = state.summary ? state.summary.unread : 0;
        badge.style.display = unread > 0 ? '' : 'none';
        badge.textContent = unread > 99 ? '99+' : String(unread);
        button.classList.toggle('rwl-nc-has-unread', unread > 0);
    }

    function profileVisible() {
        var profile = document.getElementById('userProfileBtn');
        return !profile || profile.style.display !== 'none';
    }

    function syncVisibility() {
        var visible = signedIn() && profileVisible();
        wrapper.style.display = visible ? '' : 'none';
        if (!visible) {
            state.summary = null;
            state.lists = {};
            if (state.open) closePanel();
            paintBadge();
        }
        return visible;
    }

    async function loadSummary() {
        if (!signedIn() || !profileVisible()) return;
        try {
            var data = await RWL.apiRequest('/api/notifications/summary');
            var previous = state.summary;
            state.summary = data;
            paintBadge();
            if (state.open && state.view !== 'recent') {
                var before = previous ? previous.categories.filter(function (entry) { return entry.key === state.view; })[0] : null;
                var now = data.categories.filter(function (entry) { return entry.key === state.view; })[0];
                if (!before || !now || before.total !== now.total || before.unread !== now.unread) await loadCategory(state.view, false);
            }
            render();
        } catch (error) {
            if (error && error.status === 401) syncVisibility();
        }
    }

    async function loadCategory(key, append) {
        var list = state.lists[key] || { items: [], hasMore: false, nextBefore: null, loading: false };
        if (list.loading) return;
        list.loading = true;
        state.lists[key] = list;
        render();
        try {
            var query = '?category=' + encodeURIComponent(key) + '&limit=' + PAGE_SIZE + (append && list.nextBefore ? '&before=' + encodeURIComponent(list.nextBefore) : '');
            var data = await RWL.apiRequest('/api/notifications/list' + query);
            list.items = append ? list.items.concat(data.items) : data.items;
            list.hasMore = !!data.has_more;
            list.nextBefore = data.next_before || null;
        } catch (error) {
            if (!append) list.items = [];
        }
        list.loading = false;
        render();
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(loadSummary, REFRESH_DELAY_MS);
    }

    function applyRead(ids, category) {
        var summary = state.summary;
        if (!summary) return;
        var touched = {};
        var mark = function (item) {
            if (item.read) return;
            if (ids ? ids.indexOf(item.id) >= 0 : (!category || item.category === category)) {
                item.read = true;
                touched[item.id] = item.category;
            }
        };
        summary.recent.forEach(mark);
        Object.keys(state.lists).forEach(function (key) { state.lists[key].items.forEach(mark); });
        if (!ids) {
            summary.categories.forEach(function (entry) { if (!category || entry.key === category) entry.unread = 0; });
        } else {
            Object.keys(touched).forEach(function (id) {
                summary.categories.forEach(function (entry) { if (entry.key === touched[id] && entry.unread > 0) entry.unread -= 1; });
            });
        }
        summary.unread = summary.categories.reduce(function (sum, entry) { return sum + entry.unread; }, 0);
        paintBadge();
        render();
    }

    async function markRead(ids, category) {
        applyRead(ids, category);
        try {
            await RWL.apiRequest('/api/notifications/read', { method: 'POST', body: ids ? { ids: ids } : (category ? { category: category } : {}) });
        } catch (error) {
            scheduleRefresh();
        }
    }

    async function clearNotifications(category) {
        var message = category ? t('Delete every message of this area?') : t('Delete every message of every area?');
        var confirmed = global.RWLDialog && global.RWLDialog.confirm ? await global.RWLDialog.confirm({ title: t('Clear notifications'), message: message, confirmText: t('Delete'), danger: true }) : true;
        if (!confirmed) return;
        try {
            await RWL.apiRequest('/api/notifications/clear', { method: 'POST', body: category ? { category: category } : {} });
        } catch (error) {
            return;
        }
        if (category) delete state.lists[category];
        else state.lists = {};
        await loadSummary();
        if (state.view !== 'recent' && !category) state.view = 'recent';
        render();
    }

    function go(target) {
        var spec = TARGETS[target];
        closePanel();
        if (!spec) return;
        if (spec.nav) {
            var navItem = document.querySelector('.nav-item[data-page="' + spec.nav + '"]');
            if (navItem) { navItem.click(); return; }
        }
        if (spec.tab) {
            var topTab = document.querySelector('.top-tab[data-tab="' + spec.tab + '"]');
            if (topTab) { topTab.click(); return; }
        }
        if (spec.url) global.location.href = './' + spec.url;
    }

    function openPanel() {
        var cart = document.getElementById('cartDropdown');
        var wishlist = document.getElementById('wishlistDropdown');
        if (cart) cart.classList.remove('open');
        if (wishlist) wishlist.classList.remove('open');
        state.open = true;
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        render();
        loadSummary();
        if (state.view !== 'recent') loadCategory(state.view, false);
    }

    function closePanel() {
        state.open = false;
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
    }

    function onPanelClick(event) {
        var tab = event.target.closest('[data-nc-tab]');
        if (tab) {
            state.view = tab.getAttribute('data-nc-tab');
            render();
            if (state.view !== 'recent' && !state.lists[state.view]) loadCategory(state.view, false);
            return;
        }
        var action = event.target.closest('[data-nc-action]');
        if (action) {
            var name = action.getAttribute('data-nc-action');
            if (name === 'read-all') markRead(null, state.view === 'recent' ? null : state.view);
            else if (name === 'clear-all') clearNotifications(null);
            else if (name === 'clear-area') clearNotifications(state.view);
            else if (name === 'more') loadCategory(state.view, true);
            return;
        }
        var row = event.target.closest('[data-nc-item]');
        if (row) {
            var id = row.getAttribute('data-nc-item');
            var target = row.getAttribute('data-nc-target');
            var item = currentItems().filter(function (entry) { return entry.id === id; })[0];
            var pending = item && !item.read ? markRead([id], null) : Promise.resolve();
            Promise.race([pending, new Promise(function (resolve) { setTimeout(resolve, NAVIGATE_WAIT_MS); })]).then(function () { go(target); });
        }
    }

    function start() {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            if (state.open) closePanel();
            else openPanel();
        });
        panel.addEventListener('click', onPanelClick);
        document.addEventListener('click', function (event) {
            if (!state.open || wrapper.contains(event.target)) return;
            if (event.target.closest && event.target.closest('.rwl-dialog-overlay')) return;
            closePanel();
        }, true);
        document.addEventListener('keydown', function (event) {
            if (state.open && event.key === 'Escape') {
                closePanel();
                button.focus();
            }
        });
        global.addEventListener('rwl-social-event', function (event) {
            if (event.detail && event.detail.type === 'notification') scheduleRefresh();
        });
        global.addEventListener('rwl-login', function () { if (syncVisibility()) loadSummary(); });
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible' && syncVisibility()) loadSummary();
        });
        var profile = document.getElementById('userProfileBtn');
        if (profile && global.MutationObserver) {
            new MutationObserver(function () { if (syncVisibility()) loadSummary(); }).observe(profile, { attributes: true, attributeFilter: ['style'] });
        }
        setInterval(function () {
            if (document.visibilityState === 'visible' && syncVisibility()) loadSummary();
        }, POLL_MS);
        if (syncVisibility()) loadSummary();
    }

    global.RWLNotificationCenter = { refresh: loadSummary, open: openPanel, close: closePanel, state: function () { return { open: state.open, unread: state.summary ? state.summary.unread : 0, view: state.view }; } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})(window);
