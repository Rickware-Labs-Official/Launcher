(function (global) {
    if (global.RWLGifts || !global.RWL) return;

    var esc = RWL.escapeHtml;
    var PAGE = 120;
    var CATEGORY_LABELS = {
        name_colors: 'Name Colors',
        nameplates: 'Nameplates',
        avatar_decorations: 'Avatar Decorations',
        launcher_themes: 'Launcher Themes',
        nameplate_outlines: 'Nameplate Outlines',
        content_borders: 'Content Borders'
    };
    var state = { data: null, username: '', category: 'name_colors', query: '', limit: PAGE, selected: null, overlay: null, sending: false };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function notify(message, type) {
        if (typeof global.showBanner === 'function') global.showBanner(message, type || 'info');
        else if (global.RWLDialog) global.RWLDialog.alert({ title: t('Notice'), message: message });
    }

    function ensureStyles() {
        if (document.querySelector('link[href*="rwl_growth.css"]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = global.location.pathname.indexOf('/sites/') >= 0 ? '../css/rwl_growth.css' : './css/rwl_growth.css';
        document.head.appendChild(link);
    }

    function itemPreview(item) {
        if (item.category === 'name_colors') {
            var style = RWL.swatchStyle ? RWL.swatchStyle(item) : 'background:' + (RWL.sanitizeHex(item.hex) || '#9d4edd');
            return '<span class="rwl-gift-swatch" style="' + esc(style) + '"></span>';
        }
        var src = item.thumb_url || item.asset_url || item.preview || '';
        if (src && !/^https?:\/\//.test(src)) src = RWL.apiUrl(src);
        return src ? '<img class="rwl-gift-thumb" src="' + esc(src) + '" alt="" loading="lazy" decoding="async">' : '<span class="rwl-gift-swatch rwl-gift-swatch-empty">🎁</span>';
    }

    function filtered() {
        var items = (state.data && state.data.items && state.data.items[state.category]) || [];
        var query = state.query.trim().toLowerCase();
        if (query) items = items.filter(function (item) { return String(item.name || item.item_id).toLowerCase().indexOf(query) >= 0; });
        return items.slice().sort(function (left, right) { return (right.giftable ? 1 : 0) - (left.giftable ? 1 : 0); });
    }

    function render() {
        var overlay = state.overlay;
        if (!overlay || !state.data) return;
        var items = filtered();
        var visible = items.slice(0, state.limit);
        var tabs = Object.keys(CATEGORY_LABELS).map(function (key) {
            var count = ((state.data.items || {})[key] || []).filter(function (item) { return item.giftable; }).length;
            return '<button type="button" class="rwl-gift-tab' + (key === state.category ? ' active' : '') + '" data-gift-tab="' + key + '">' + esc(t(CATEGORY_LABELS[key])) + ' <span>' + count + '</span></button>';
        }).join('');
        var grid = visible.length ? visible.map(function (item) {
            var reason = item.recipient_owns ? t('Already owned by the recipient') : (item.bound_reason || '');
            var selected = state.selected && state.selected.item_id === item.item_id && state.selected.category === state.category;
            return '<button type="button" class="rwl-gift-item' + (item.giftable ? '' : ' rwl-gift-locked') + (selected ? ' selected' : '') + '" data-gift-item="' + esc(item.item_id) + '"' + (item.giftable ? '' : ' aria-disabled="true"') + ' title="' + esc(item.giftable ? (item.source_label ? t('Origin') + ': ' + t(item.source_label) : '') : reason) + '">' +
                itemPreview(item) +
                '<span class="rwl-gift-name" translate="no">' + esc(item.name || item.item_id) + '</span>' +
                '<span class="rwl-gift-rarity" style="color:' + esc(RWL.rarityColor ? RWL.rarityColor(item.rarity) : '#e0aaff') + '">' + esc(t(item.rarity || 'Common')) + '</span>' +
                (item.giftable ? '' : '<span class="rwl-gift-lock">' + esc(item.recipient_owns ? t('Owned') : t('Bound')) + '</span>') +
            '</button>';
        }).join('') : '<div class="rwl-gift-empty">' + esc(t('No items in this category.')) + '</div>';
        var more = items.length > state.limit ? '<button type="button" class="rwl-btn rwl-btn-secondary rwl-gift-more" data-gift-more>' + esc(t('Show more')) + ' (' + (items.length - state.limit) + ')</button>' : '';
        var selectedText = state.selected ? t('Selected') + ': ' + (state.selected.name || state.selected.item_id) : t('Choose an item to gift.');
        overlay.querySelector('[data-gift-body]').innerHTML =
            (state.data.staff_mode ? '<div class="rwl-gift-note">' + esc(t('As a team member you gift without losing the item. Team gifts arrive bound to the account.')) + '</div>' : '<div class="rwl-gift-note">' + esc(t('Only items from the Lab-Pass, Mystery Chests, Experiment Crates, the Lab Bazaar or gifts from members can be gifted. Grey items are bound to your account.')) + '</div>') +
            (state.data.recipient.owns_everything ? '<div class="rwl-gift-note rwl-gift-warning">' + esc(t('This member already owns every item.')) + '</div>' : '') +
            '<div class="rwl-gift-tabs">' + tabs + '</div>' +
            '<input type="search" class="rwl-input rwl-gift-search" data-gift-search maxlength="60" placeholder="' + esc(t('Search items')) + '" value="' + esc(state.query) + '">' +
            '<div class="rwl-gift-grid">' + grid + '</div>' + more +
            '<div class="rwl-gift-footer"><span class="rwl-gift-selected" translate="no">' + esc(selectedText) + '</span>' +
            '<input type="text" class="rwl-input rwl-gift-message" data-gift-note maxlength="200" placeholder="' + esc(t('Add a note (optional)')) + '">' +
            '<button type="button" class="rwl-btn rwl-btn-gift" data-gift-send' + (state.selected && !state.sending ? '' : ' disabled') + '>🎁 ' + esc(t('Send Gift')) + '</button></div>';
        var search = overlay.querySelector('[data-gift-search]');
        if (search && document.activeElement !== search && state.focusSearch) {
            search.focus();
            search.setSelectionRange(search.value.length, search.value.length);
        }
    }

    function close() {
        if (state.overlay) state.overlay.remove();
        state.overlay = null;
        state.data = null;
        state.selected = null;
    }

    async function send() {
        if (!state.selected || state.sending) return;
        var note = state.overlay.querySelector('[data-gift-note]');
        var noteText = note ? note.value.trim() : '';
        var question = t('Send') + ' "' + (state.selected.name || state.selected.item_id) + '" ' + t('to') + ' ' + state.username + '?' + (state.data.staff_mode ? '' : ' ' + t('The item leaves your inventory.'));
        var confirmed = global.RWLDialog && global.RWLDialog.confirm ? await global.RWLDialog.confirm({ title: t('Send Gift'), message: question, confirmText: t('Send Gift') }) : global.confirm(question);
        if (!confirmed) return;
        state.sending = true;
        render();
        try {
            await RWL.apiRequest('/api/gifts/send', { method: 'POST', body: { username: state.username, category: state.selected.category, item_id: state.selected.item_id, note: noteText || null } });
            notify(t('Gift sent to') + ' ' + state.username + '.', 'success');
            close();
        } catch (error) {
            state.sending = false;
            notify(error.message || t('The gift could not be sent.'), 'error');
            render();
        }
    }

    function onClick(event) {
        var target = event.target;
        if (target === state.overlay || target.closest('[data-gift-close]')) {
            close();
            return;
        }
        var tab = target.closest('[data-gift-tab]');
        if (tab) {
            state.category = tab.getAttribute('data-gift-tab');
            state.limit = PAGE;
            state.focusSearch = false;
            render();
            return;
        }
        if (target.closest('[data-gift-more]')) {
            state.limit += PAGE;
            render();
            return;
        }
        var item = target.closest('[data-gift-item]');
        if (item) {
            var found = ((state.data.items || {})[state.category] || []).filter(function (entry) { return entry.item_id === item.getAttribute('data-gift-item'); })[0];
            if (!found || !found.giftable) {
                notify(found ? (found.recipient_owns ? t('Already owned by the recipient') : (found.bound_reason || t('This item is bound to your account.'))) : t('Item not found'), 'info');
                return;
            }
            state.selected = Object.assign({ category: state.category }, found);
            render();
            return;
        }
        if (target.closest('[data-gift-send]')) send();
    }

    async function open(username) {
        if (!RWL.getToken()) {
            global.location.href = global.location.pathname.indexOf('/sites/') >= 0 ? './login_register.html?tab=login' : './sites/login_register.html?tab=login';
            return;
        }
        ensureStyles();
        close();
        state.username = username;
        state.category = 'name_colors';
        state.query = '';
        state.limit = PAGE;
        state.sending = false;
        var overlay = document.createElement('div');
        overlay.className = 'rwl-gift-overlay';
        overlay.innerHTML = '<div class="rwl-gift-card" role="dialog" aria-modal="true"><div class="rwl-gift-head"><h3>🎁 ' + esc(t('Send a Gift to')) + ' <span translate="no">' + esc(username) + '</span></h3><button type="button" class="rwl-icon-btn" data-gift-close title="' + esc(t('Close')) + '">✕</button></div><div data-gift-body><div class="rwl-gift-empty">' + esc(t('Loading your inventory...')) + '</div></div></div>';
        overlay.addEventListener('click', onClick);
        overlay.addEventListener('input', function (event) {
            if (event.target.matches('[data-gift-search]')) {
                state.query = event.target.value.slice(0, 60);
                state.limit = PAGE;
                state.focusSearch = true;
                render();
            }
        });
        document.addEventListener('keydown', function escape(event) {
            if (event.key === 'Escape' && state.overlay) {
                close();
                document.removeEventListener('keydown', escape);
            }
        });
        document.body.appendChild(overlay);
        state.overlay = overlay;
        try {
            state.data = await RWL.apiRequest('/api/gifts/options/' + encodeURIComponent(username));
            var firstWithItems = Object.keys(CATEGORY_LABELS).filter(function (key) { return ((state.data.items || {})[key] || []).some(function (item) { return item.giftable; }); })[0];
            if (firstWithItems) state.category = firstWithItems;
            render();
        } catch (error) {
            overlay.querySelector('[data-gift-body]').innerHTML = '<div class="rwl-gift-empty">' + esc(error.message || t('Your inventory could not be loaded.')) + '</div>';
        }
    }

    global.RWLGifts = { open: open, close: close };
})(window);
