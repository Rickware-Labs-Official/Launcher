(function (global) {
    if (!global.RWL) return;

    var esc = RWL.escapeHtml;
    var CATEGORY_LABELS = { launcher_themes: 'Theme', avatar_decorations: 'Avatar Deco', name_colors: 'Name Color', nameplates: 'Nameplate', nameplate_outlines: 'Nameplate Outline', content_borders: 'Content Border' };
    var CATEGORIES = Object.keys(CATEGORY_LABELS);
    var CURRENCY = { lc: 'LC', xp: 'XP' };
    var state = { tab: 'all', page: 1, pages: 1, query: '', category: '', currency: '', sort: 'new', sellable: null, catalogs: {}, loading: false, refreshTimer: null, draft: null };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function signedIn() {
        return !!RWL.getToken();
    }

    function requireLogin() {
        global.location.href = './login_register.html?tab=login';
    }

    function api(path, options) {
        return RWL.apiRequest('/api/bazaar' + path, options);
    }

    function toast(message, type) {
        if (global.RWLSocialNotify && global.RWLSocialNotify.popup) global.RWLSocialNotify.popup({ title: 'Lab Bazaar', body: message, icon: type === 'error' ? '⚠️' : '✅' });
        else if (global.RWLDialog) global.RWLDialog.alert({ title: 'Lab Bazaar', message: message });
    }

    function confirmDialog(title, message) {
        if (global.RWLDialog && global.RWLDialog.confirm) return global.RWLDialog.confirm({ title: title, message: message, confirmText: t('Confirm') });
        return Promise.resolve(global.confirm(message));
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString();
    }

    function price(amount, currency) {
        return formatNumber(amount) + ' ' + (CURRENCY[currency] || 'LC');
    }

    function timeLeft(endsAt) {
        var seconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
        if (!seconds) return t('Ended');
        var days = Math.floor(seconds / 86400);
        var hours = Math.floor((seconds % 86400) / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var rest = seconds % 60;
        if (days) return days + 'd ' + hours + 'h';
        if (hours) return hours + 'h ' + minutes + 'm';
        return minutes + 'm ' + (rest < 10 ? '0' : '') + rest + 's';
    }

    function themePreview(item) {
        var colors = (item.preview || []).map(function (color) { return RWL.sanitizeHex(color, '#7b2cbf'); });
        if (!colors.length) colors = ['#7b2cbf', '#c97eff', '#14002a'];
        var icon = global.RWLIcons ? global.RWLIcons.themeIcon(item, 26) : '';
        return '<div class="bz-theme-preview">' + colors.map(function (color) { return '<span style="--rwl-keep:1;background:' + color + ';"></span>'; }).join('') + '<i class="bz-theme-icon">' + icon + '</i></div>';
    }

    function itemVisual(item) {
        var category = item.category;
        if (category === 'name_colors') return '<div class="bz-swatch" style="' + esc(RWL.swatchStyle(item)) + '"></div>';
        if (category === 'nameplates') return '<video class="bz-media" muted loop playsinline preload="none" data-src="' + esc(item.asset_url || '') + '"></video>';
        if (category === 'avatar_decorations') return '<img class="bz-media bz-media-contain" alt="" decoding="async" loading="lazy" data-retry src="' + esc(item.thumb_url || item.asset_url || '') + '">';
        if (category === 'launcher_themes') return themePreview(item);
        if (category === 'nameplate_outlines') return '<div class="bz-frame bz-frame-plate' + RWL.frameClasses(item) + '" style="' + esc(RWL.frameStyle(item)) + '"><span translate="no">' + esc(item.name) + '</span></div>';
        if (category === 'content_borders') return '<div class="bz-frame bz-frame-box' + RWL.frameClasses(item) + '" style="' + esc(RWL.frameStyle(item)) + '"><span></span><span></span></div>';
        return '<div class="bz-swatch"></div>';
    }

    function rarityBanner(item) {
        return '<span class="bz-rarity" style="--rwl-keep:1;background:' + esc(RWL.rarityColor(item.rarity)) + ';">' + esc(t(item.rarity || 'Common')) + '</span>';
    }

    function kindLabel(kind) {
        return { fixed: t('Buy Now'), auction: t('Auction'), trade: t('Trade') }[kind] || kind;
    }

    function priceLine(listing) {
        if (listing.kind === 'fixed') return '<span class="bz-price">' + esc(price(listing.price, listing.currency)) + '</span>';
        if (listing.kind === 'auction') {
            var current = listing.bid_count ? listing.current_bid : listing.start_price;
            return '<span class="bz-price">' + esc(price(current, listing.currency)) + '</span><span class="bz-sub">' + esc(listing.bid_count + ' ' + t('bids')) + ' · <b data-ends="' + esc(listing.ends_at) + '">' + esc(timeLeft(listing.ends_at)) + '</b></span>';
        }
        return '<span class="bz-price">' + esc((listing.slots || []).length + ' ' + t('trade slots')) + '</span>';
    }

    function statusPill(listing) {
        if (listing.status === 'active') {
            if (listing.top_bidder_is_me) return '<span class="bz-pill bz-pill-good">' + esc(t('Highest bid')) + '</span>';
            if (listing.is_mine) return '<span class="bz-pill">' + esc(t('Your listing')) + '</span>';
            return '';
        }
        return '<span class="bz-pill bz-pill-muted">' + esc(t(listing.status.charAt(0).toUpperCase() + listing.status.slice(1))) + '</span>';
    }

    function cardHtml(listing) {
        var item = listing.item || {};
        return '<article class="bz-listing bz-kind-' + esc(listing.kind) + '" data-listing="' + esc(listing.id) + '" tabindex="0" role="button" style="--rwl-keep:1;border-color:' + esc(RWL.rarityColor(item.rarity)) + '55;">' +
            '<div class="bz-listing-top">' + rarityBanner(item) + '<span class="bz-kind">' + esc(kindLabel(listing.kind)) + '</span></div>' +
            '<div class="bz-visual">' + itemVisual(item) + '</div>' +
            '<div class="bz-listing-body">' +
                '<div class="bz-item-name" translate="no">' + esc(item.name || '') + '</div>' +
                '<div class="bz-item-cat">' + esc(t(CATEGORY_LABELS[item.category] || '')) + (item.exclusive ? ' · <span class="bz-exclusive">' + esc(t('Exclusive')) + '</span>' : '') + '</div>' +
                '<div class="bz-price-row">' + priceLine(listing) + '</div>' +
                '<div class="bz-seller" translate="no"><span class="bz-seller-dot' + (listing.seller && listing.seller.online ? ' online' : '') + '"></span>' + esc((listing.seller && listing.seller.username) || '') + statusPill(listing) + '</div>' +
            '</div>' +
        '</article>';
    }

    function activateMedia(root) {
        Array.prototype.forEach.call(root.querySelectorAll('video[data-src]'), function (video) {
            if (!('IntersectionObserver' in global)) { video.src = video.getAttribute('data-src'); return; }
            if (!state.observer) {
                state.observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        var media = entry.target;
                        if (entry.isIntersecting) {
                            if (!media.getAttribute('src')) media.src = media.getAttribute('data-src');
                            var playing = media.play();
                            if (playing && playing.catch) playing.catch(function () {});
                        } else if (!media.paused) media.pause();
                    });
                }, { rootMargin: '120px 0px' });
            }
            state.observer.observe(video);
        });
        Array.prototype.forEach.call(root.querySelectorAll('img[data-retry]'), function (image) {
            image.addEventListener('error', function retry() {
                var attempts = parseInt(image.getAttribute('data-attempt') || '0', 10);
                if (attempts >= 2) { image.removeEventListener('error', retry); return; }
                image.setAttribute('data-attempt', String(attempts + 1));
                setTimeout(function () { image.src = image.src.split('#')[0].replace(/([?&])rwl_retry=\d+/, '$1').replace(/[?&]$/, '') + (image.src.indexOf('?') >= 0 ? '&' : '?') + 'rwl_retry=' + (attempts + 1); }, 700 * (attempts + 1));
            });
        });
    }

    function emptyHtml(text) {
        return '<div class="bz-empty">' + esc(text) + '</div>';
    }

    async function loadListings(append) {
        if (state.loading) return;
        state.loading = true;
        var grid = byId('bzGrid');
        var more = byId('bzMore');
        if (!append) {
            state.page = 1;
            grid.innerHTML = '<div class="bz-empty">' + esc(t('Loading the bazaar...')) + '</div>';
        }
        try {
            var listings;
            if (state.tab === 'mine' || state.tab === 'bids') {
                var mine = await api('/mine');
                listings = state.tab === 'mine' ? mine.listings : mine.bids;
                state.pages = 1;
            } else {
                var params = new URLSearchParams({ page: String(state.page), sort: state.sort });
                if (state.tab !== 'all') params.set('kind', state.tab);
                if (state.category) params.set('category', state.category);
                if (state.currency) params.set('currency', state.currency);
                if (state.query) params.set('q', state.query);
                var data = await api('/listings?' + params.toString());
                listings = data.listings;
                state.pages = data.pages;
                byId('bzTotal').textContent = formatNumber(data.total);
            }
            if (state.query && (state.tab === 'mine' || state.tab === 'bids')) {
                var query = state.query.toLowerCase();
                listings = listings.filter(function (listing) { return String((listing.item || {}).name || '').toLowerCase().indexOf(query) >= 0; });
            }
            var html = listings.map(cardHtml).join('');
            if (append) grid.insertAdjacentHTML('beforeend', html);
            else grid.innerHTML = html || emptyHtml(state.tab === 'mine' ? t('You have no listings yet. Press Sell or Trade to list an item.') : (state.tab === 'bids' ? t('You did not bid on any auction yet.') : t('No listings match your filters.')));
            activateMedia(grid);
            more.hidden = state.page >= state.pages || state.tab === 'mine' || state.tab === 'bids';
        } catch (error) {
            if (!append) grid.innerHTML = emptyHtml(error.message || t('The bazaar could not be loaded.'));
        } finally {
            state.loading = false;
        }
    }

    function scheduleRefresh() {
        clearTimeout(state.refreshTimer);
        state.refreshTimer = setTimeout(function () {
            loadListings(false);
            loadHistoryCount();
            loadSellable();
        }, 700);
    }

    function overlay() {
        return byId('bzOverlay');
    }

    function openModal(html, wide) {
        var previous = byId('bzModal');
        Array.prototype.forEach.call(previous.querySelectorAll('video'), function (video) { video.pause(); });
        var modal = previous.cloneNode(false);
        previous.parentNode.replaceChild(modal, previous);
        modal.className = 'bz-modal' + (wide ? ' bz-modal-wide' : '');
        modal.innerHTML = '<button type="button" class="rwl-icon-btn bz-modal-close" data-close title="' + esc(t('Close')) + '">✕</button>' + html;
        overlay().hidden = false;
        document.body.classList.add('bz-locked');
        activateMedia(modal);
        return modal;
    }

    function closeModal() {
        var modal = byId('bzModal');
        Array.prototype.forEach.call(modal.querySelectorAll('video'), function (video) { video.pause(); });
        overlay().hidden = true;
        modal.innerHTML = '';
        document.body.classList.remove('bz-locked');
        state.draft = null;
    }

    function slotsHtml(listing) {
        return (listing.slots || []).map(function (slot) {
            return '<div class="bz-slot' + (slot.available ? ' bz-slot-ready' : '') + '">' +
                '<div class="bz-slot-head"><strong>' + esc(t('Slot') + ' ' + (slot.index + 1)) + '</strong>' +
                    (listing.is_mine || !signedIn() ? '' : (slot.available ? '<button type="button" class="bz-btn bz-btn-primary" data-trade="' + slot.index + '" title="' + esc(t('Trade these items for the offered item')) + '">' + esc(t('Trade With This Slot')) + '</button>' : '<span class="bz-sub">' + esc(slot.seller_owns_one ? t('The seller already owns an item of this slot') : t('You are missing items of this slot')) + '</span>')) +
                '</div>' +
                '<div class="bz-slot-items">' + slot.items.map(function (item) {
                    return '<div class="bz-slot-item' + (item.you_have ? ' bz-have' : ' bz-missing') + '" title="' + esc(item.you_have ? t('You have this item') : t('You do not have this item')) + '"><div class="bz-mini-visual">' + itemVisual(item) + '</div><span translate="no">' + esc(item.name) + '</span></div>';
                }).join('') + '</div>' +
            '</div>';
        }).join('');
    }

    async function openDetail(listingId) {
        var modal = openModal('<div class="bz-empty">' + esc(t('Loading...')) + '</div>');
        try {
            var listing = await api('/listings/' + encodeURIComponent(listingId));
            var item = listing.item || {};
            var actions = '';
            if (!signedIn()) {
                if (listing.status === 'active') actions = '<button type="button" class="bz-btn bz-btn-primary bz-btn-large" data-login title="' + esc(t('Log in to buy, bid or trade')) + '">' + esc(t('Log in to buy, bid or trade')) + '</button>';
            } else if (listing.status === 'active' && !listing.is_mine) {
                if (listing.you_own_item) actions = '<p class="bz-note">' + esc(t('You already own this item.')) + '</p>';
                else if (listing.kind === 'fixed') actions = '<button type="button" class="bz-btn bz-btn-primary bz-btn-large" data-buy title="' + esc(t('Buy this item now')) + '">' + esc(t('Buy for') + ' ' + price(listing.price, listing.currency)) + '</button>';
                else if (listing.kind === 'auction') actions = '<form class="bz-bid-form" data-bid><input type="number" class="rwl-input" min="' + listing.next_min_bid + '" step="1" value="' + listing.next_min_bid + '" title="' + esc(t('Your bid')) + '"><button type="submit" class="bz-btn bz-btn-primary" title="' + esc(t('Place your bid, it is reserved until you are outbid')) + '">' + esc(t('Place Bid')) + '</button></form><p class="bz-note">' + esc(t('Minimum bid') + ': ' + price(listing.next_min_bid, listing.currency) + ' · ' + (listing.reserve_met ? t('Minimum price reached') : t('Minimum price not reached yet'))) + '</p>';
            }
            if (listing.status === 'active' && listing.is_mine && !(listing.kind === 'auction' && listing.bid_count)) actions += '<button type="button" class="bz-btn bz-btn-danger" data-cancel title="' + esc(t('Cancel the listing and get the item back')) + '">' + esc(t('Cancel Listing')) + '</button>';
            var bids = listing.kind === 'auction' ? '<div class="bz-section-title">' + esc(t('Bids')) + '</div>' + ((listing.bids || []).length ? '<div class="bz-bids">' + listing.bids.map(function (bid) { return '<div class="bz-bid-row" translate="no"><span>' + esc(bid.username) + '</span><b>' + esc(price(bid.amount, listing.currency)) + '</b><span class="bz-sub">' + esc(new Date(bid.at).toLocaleString()) + '</span></div>'; }).join('') + '</div>' : emptyHtml(t('No bids yet.'))) : '';
            modal = openModal(
                '<div class="bz-detail">' +
                    '<div class="bz-detail-visual" style="--rwl-keep:1;border-color:' + esc(RWL.rarityColor(item.rarity)) + ';">' + rarityBanner(item) + itemVisual(item) + '</div>' +
                    '<div class="bz-detail-info">' +
                        '<div class="bz-kind">' + esc(kindLabel(listing.kind)) + '</div>' +
                        '<h2 translate="no">' + esc(item.name) + '</h2>' +
                        '<div class="bz-item-cat">' + esc(t(CATEGORY_LABELS[item.category] || '')) + ' · ' + esc(t(item.rarity || '')) + '</div>' +
                        '<div class="bz-detail-seller" translate="no">' + esc(t('Seller')) + ': <strong>' + esc((listing.seller && listing.seller.username) || '') + '</strong></div>' +
                        (listing.note ? '<p class="bz-detail-note" translate="no">' + esc(listing.note) + '</p>' : '') +
                        '<div class="bz-price-row bz-price-large">' + priceLine(listing) + '</div>' +
                        (listing.is_mine && listing.kind === 'auction' ? '<p class="bz-note">' + esc(t('Your minimum price') + ': ' + price(listing.min_price, listing.currency)) + '</p>' : '') +
                        '<div class="bz-actions">' + actions + '</div>' +
                    '</div>' +
                '</div>' +
                (listing.kind === 'trade' ? '<div class="bz-section-title">' + esc(t('Accepted in exchange (choose one slot)')) + '</div><div class="bz-slots">' + slotsHtml(listing) + '</div>' : '') +
                bids, true);
            modal.setAttribute('data-listing', listing.id);
            bindDetail(modal, listing);
        } catch (error) {
            openModal(emptyHtml(error.message || t('The listing could not be loaded.')));
        }
    }

    function bindDetail(modal, listing) {
        var login = modal.querySelector('[data-login]');
        if (login) login.addEventListener('click', requireLogin);
        var buy = modal.querySelector('[data-buy]');
        if (buy) buy.addEventListener('click', async function () {
            if (!(await confirmDialog(t('Buy Item'), t('Buy') + ' ' + listing.item.name + ' ' + t('for') + ' ' + price(listing.price, listing.currency) + '?'))) return;
            buy.disabled = true;
            try {
                await api('/listings/' + encodeURIComponent(listing.id) + '/buy', { method: 'POST' });
                toast(t('Purchase complete. The item is in your inventory.'), 'success');
                closeModal();
                scheduleRefresh();
            } catch (error) {
                toast(error.message || t('The purchase failed.'), 'error');
                buy.disabled = false;
            }
        });
        var bidForm = modal.querySelector('[data-bid]');
        if (bidForm) bidForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var input = bidForm.querySelector('input');
            var amount = parseInt(input.value, 10);
            input.classList.toggle('rwl-invalid', !(amount >= listing.next_min_bid));
            if (input.classList.contains('rwl-invalid')) return;
            if (!(await confirmDialog(t('Place Bid'), t('Bid') + ' ' + price(amount, listing.currency) + '? ' + t('The amount is reserved until you are outbid or the auction ends.')))) return;
            try {
                await api('/listings/' + encodeURIComponent(listing.id) + '/bid', { method: 'POST', body: { amount: amount } });
                toast(t('Your bid was placed.'), 'success');
                openDetail(listing.id);
                scheduleRefresh();
            } catch (error) {
                input.classList.add('rwl-invalid');
                toast(error.message || t('The bid failed.'), 'error');
            }
        });
        Array.prototype.forEach.call(modal.querySelectorAll('[data-trade]'), function (button) {
            button.addEventListener('click', async function () {
                var slot = parseInt(button.getAttribute('data-trade'), 10);
                if (!(await confirmDialog(t('Confirm Trade'), t('Trade every item of slot') + ' ' + (slot + 1) + ' ' + t('for') + ' ' + listing.item.name + '? ' + t('This cannot be undone.')))) return;
                button.disabled = true;
                try {
                    await api('/listings/' + encodeURIComponent(listing.id) + '/trade', { method: 'POST', body: { slot: slot } });
                    toast(t('Trade complete. The item is in your inventory.'), 'success');
                    closeModal();
                    scheduleRefresh();
                } catch (error) {
                    toast(error.message || t('The trade failed.'), 'error');
                    button.disabled = false;
                }
            });
        });
        var cancel = modal.querySelector('[data-cancel]');
        if (cancel) cancel.addEventListener('click', async function () {
            if (!(await confirmDialog(t('Cancel Listing'), t('Cancel this listing? The item goes back to your inventory.')))) return;
            try {
                await api('/listings/' + encodeURIComponent(listing.id) + '/cancel', { method: 'POST' });
                toast(t('Listing cancelled.'), 'success');
                closeModal();
                scheduleRefresh();
            } catch (error) {
                toast(error.message || t('The listing could not be cancelled.'), 'error');
            }
        });
    }

    async function loadSellable() {
        try {
            state.sellable = await api('/sellable');
            byId('bzBalance').textContent = formatNumber(state.sellable.balances.lc);
        } catch (error) {}
        return state.sellable;
    }

    async function loadCatalog(category) {
        if (state.catalogs[category]) return state.catalogs[category];
        var data = await RWL.apiRequest('/api/cosmetics/catalog/' + category);
        state.catalogs[category] = (data.items || []).map(function (item) { return Object.assign({ category: category }, item); });
        return state.catalogs[category];
    }

    function itemTile(item, selected, attribute) {
        return '<button type="button" class="bz-pick' + (selected ? ' bz-pick-selected' : '') + '" ' + attribute + ' title="' + esc(item.name + ' · ' + item.rarity) + '" style="--rwl-keep:1;border-color:' + esc(RWL.rarityColor(item.rarity)) + '88;">' +
            '<div class="bz-mini-visual">' + itemVisual(item) + '</div><span translate="no">' + esc(item.name) + '</span></button>';
    }

    function boundTile(item) {
        var reason = item.bound_reason || t('This item is bound to your account.');
        return '<div class="bz-pick bz-pick-bound" role="img" aria-label="' + esc(item.name + ' · ' + reason) + '" title="' + esc(reason) + '">' +
            '<div class="bz-mini-visual">' + itemVisual(item) + '</div><span translate="no">' + esc(item.name) + '</span><small class="bz-bound-tag">🔒 ' + esc(item.source_label || t('Bound')) + '</small></div>';
    }

    function tradeableCount(data, key) {
        return (data.items[key] || []).filter(function (item) { return item.tradeable !== false; }).length;
    }

    function sellNoteHtml(data) {
        if (data.staff_mode) return '<p class="bz-note bz-staff-note">' + esc(t('Team mode: you can list every item except exclusive ones. Your own copy stays in your inventory.')) + '</p>';
        return '<p class="bz-note">' + esc(t('Only items from the Lab-Pass, Mystery Chests, Experiment Crates, trades and gifts between members can be sold. Greyed out items are bound to your account.')) + '</p>';
    }

    async function openSell() {
        var data = await loadSellable();
        if (!data) {
            toast(t('Your inventory could not be loaded.'), 'error');
            return;
        }
        state.draft = { step: 1, category: CATEGORIES.filter(function (key) { return tradeableCount(data, key); })[0] || CATEGORIES.filter(function (key) { return (data.items[key] || []).length; })[0] || CATEGORIES[0], item: null, kind: 'fixed', currency: 'lc', slots: [[]], activeSlot: 0, pickerCategory: 'launcher_themes', pickerQuery: '' };
        renderSell();
    }

    function renderSell() {
        var draft = state.draft;
        var data = state.sellable;
        if (!draft) return;
        if (draft.step === 1) {
            var items = (data.items[draft.category] || []).filter(function (item) { return !draft.query || item.name.toLowerCase().indexOf(draft.query.toLowerCase()) >= 0; });
            items = items.filter(function (item) { return item.tradeable !== false; }).concat(items.filter(function (item) { return item.tradeable === false; }));
            var modal = openModal(
                '<h2>' + esc(t('Choose An Item')) + '</h2><p class="bz-note">' + esc(t('Only items in your inventory can be listed. A listed item is held safely until it is sold, traded or cancelled.')) + '</p>' + sellNoteHtml(data) +
                '<div class="bz-sell-cats">' + CATEGORIES.map(function (key) { return '<button type="button" class="bz-chip' + (key === draft.category ? ' active' : '') + '" data-sell-cat="' + key + '">' + esc(t(CATEGORY_LABELS[key])) + ' <small>' + tradeableCount(data, key) + '</small></button>'; }).join('') + '</div>' +
                '<input type="search" class="rwl-input bz-sell-search" placeholder="' + esc(t('Search your items')) + '" value="' + esc(draft.query || '') + '" maxlength="60">' +
                '<div class="bz-pick-grid">' + (items.map(function (item) { return item.tradeable === false ? boundTile(item) : itemTile(item, false, 'data-sell-item="' + esc(item.item_id) + '"'); }).join('') || emptyHtml(t('No items in this category.'))) + '</div>', true);
            Array.prototype.forEach.call(modal.querySelectorAll('[data-sell-cat]'), function (button) {
                button.addEventListener('click', function () { draft.category = button.getAttribute('data-sell-cat'); renderSell(); });
            });
            var search = modal.querySelector('.bz-sell-search');
            search.addEventListener('input', function () {
                clearTimeout(draft.searchTimer);
                draft.searchTimer = setTimeout(function () { draft.query = search.value; renderSell(); var next = byId('bzModal').querySelector('.bz-sell-search'); if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); } }, 250);
            });
            Array.prototype.forEach.call(modal.querySelectorAll('[data-sell-item]'), function (button) {
                button.addEventListener('click', function () {
                    draft.item = (data.items[draft.category] || []).filter(function (item) { return item.item_id === button.getAttribute('data-sell-item'); })[0];
                    draft.step = 2;
                    renderSell();
                });
            });
            return;
        }
        renderConfigure();
    }

    function slotEditorHtml(draft) {
        return draft.slots.map(function (slot, index) {
            return '<div class="bz-slot-edit' + (index === draft.activeSlot ? ' active' : '') + '" data-slot-select="' + index + '">' +
                '<div class="bz-slot-head"><strong>' + esc(t('Slot') + ' ' + (index + 1)) + '</strong><span class="bz-sub">' + slot.length + ' / ' + state.sellable.limits.max_items_per_slot + '</span>' +
                (draft.slots.length > 1 ? '<button type="button" class="rwl-icon-btn" data-slot-remove="' + index + '" title="' + esc(t('Remove this slot')) + '">✕</button>' : '') + '</div>' +
                '<div class="bz-slot-items">' + (slot.map(function (item, itemIndex) {
                    return '<div class="bz-slot-item"><div class="bz-mini-visual">' + itemVisual(item) + '</div><span translate="no">' + esc(item.name) + '</span><button type="button" class="bz-remove-item" data-slot-item-remove="' + index + ':' + itemIndex + '" title="' + esc(t('Remove')) + '">✕</button></div>';
                }).join('') || '<span class="bz-sub">' + esc(t('Pick items from the index on the right')) + '</span>') + '</div>' +
            '</div>';
        }).join('') + (draft.slots.length < state.sellable.limits.max_slots ? '<button type="button" class="bz-btn" data-slot-add title="' + esc(t('Add another slot')) + '">+ ' + esc(t('Add Slot')) + '</button>' : '');
    }

    async function pickerHtml(draft) {
        var items = await loadCatalog(draft.pickerCategory);
        var query = (draft.pickerQuery || '').toLowerCase();
        var filtered = items.filter(function (item) { return !query || String(item.name).toLowerCase().indexOf(query) >= 0 || String(item.rarity).toLowerCase().indexOf(query) >= 0; }).slice(0, 60);
        var active = draft.slots[draft.activeSlot] || [];
        return filtered.map(function (item) {
            var chosen = active.some(function (entry) { return entry.category === item.category && entry.item_id === item.item_id; });
            return itemTile(item, chosen, 'data-pick-item="' + esc(item.item_id) + '"');
        }).join('') || emptyHtml(t('No items found.'));
    }

    async function renderConfigure() {
        var draft = state.draft;
        var data = state.sellable;
        var item = draft.item;
        var xpAllowed = data.discord_linked;
        var form = '<div class="bz-sell-kinds">' +
            ['fixed', 'auction', 'trade'].map(function (kind) { return '<button type="button" class="bz-chip' + (draft.kind === kind ? ' active' : '') + '" data-kind="' + kind + '">' + esc({ fixed: t('Fixed Price'), auction: t('Auction'), trade: t('Trade') }[kind]) + '</button>'; }).join('') + '</div>';
        if (draft.kind !== 'trade') {
            form += '<div class="bz-form-grid">' +
                '<label class="rwl-field">' + esc(t('Paid with')) + '<select class="rwl-select" data-field="currency"><option value="lc"' + (draft.currency === 'lc' ? ' selected' : '') + '>Lab Coins</option><option value="xp"' + (draft.currency === 'xp' ? ' selected' : '') + (xpAllowed ? '' : ' disabled') + '>XP' + (xpAllowed ? '' : ' (' + esc(t('link Discord first')) + ')') + '</option></select></label>';
            if (draft.kind === 'fixed') form += '<label class="rwl-field">' + esc(t('Price')) + '<input type="number" class="rwl-input" data-field="price" min="1" max="' + data.limits.max_price + '" step="1" value="' + esc(draft.price || '') + '" placeholder="100"></label>';
            else form += '<label class="rwl-field">' + esc(t('Start price')) + '<input type="number" class="rwl-input" data-field="start_price" min="1" max="' + data.limits.max_price + '" step="1" value="' + esc(draft.start_price || '') + '" placeholder="50"></label>' +
                '<label class="rwl-field">' + esc(t('Minimum price')) + '<input type="number" class="rwl-input" data-field="min_price" min="1" max="' + data.limits.max_price + '" step="1" value="' + esc(draft.min_price || '') + '" placeholder="100"></label>' +
                '<label class="rwl-field">' + esc(t('Duration in hours')) + '<input type="number" class="rwl-input" data-field="duration_hours" min="' + data.limits.min_hours + '" max="' + data.limits.max_hours + '" step="1" value="' + esc(draft.duration_hours || 24) + '"></label>';
            form += '</div>';
            if (draft.kind === 'auction') form += '<p class="bz-note">' + esc(t('The item only sells when the highest bid reaches your minimum price. Bids in the last 2 minutes extend the auction.')) + '</p>';
        } else {
            form += '<p class="bz-note">' + esc(t('Add up to 10 slots with up to 5 items each. A buyer who owns every item of one slot can trade instantly, you do not need to be online.')) + '</p>' +
                '<div class="bz-trade-builder"><div class="bz-slot-list">' + slotEditorHtml(draft) + '</div>' +
                '<div class="bz-picker"><div class="bz-sell-cats">' + CATEGORIES.map(function (key) { return '<button type="button" class="bz-chip' + (key === draft.pickerCategory ? ' active' : '') + '" data-picker-cat="' + key + '">' + esc(t(CATEGORY_LABELS[key])) + '</button>'; }).join('') + '</div>' +
                '<input type="search" class="rwl-input" data-picker-search maxlength="60" placeholder="' + esc(t('Search the item index')) + '" value="' + esc(draft.pickerQuery || '') + '">' +
                '<div class="bz-pick-grid bz-pick-grid-small" data-picker-grid><div class="bz-empty">' + esc(t('Loading...')) + '</div></div></div></div>';
        }
        form += '<label class="rwl-field">' + esc(t('Note (optional)')) + '<input type="text" class="rwl-input" data-field="note" maxlength="200" value="' + esc(draft.note || '') + '"></label>';
        var modal = openModal(
            '<div class="bz-sell-head"><button type="button" class="bz-btn" data-back title="' + esc(t('Choose another item')) + '">← ' + esc(t('Back')) + '</button>' +
            '<div class="bz-sell-item"><div class="bz-mini-visual">' + itemVisual(item) + '</div><div><strong translate="no">' + esc(item.name) + '</strong><div class="bz-item-cat">' + esc(t(CATEGORY_LABELS[item.category])) + ' · ' + esc(t(item.rarity)) + '</div></div></div></div>' +
            form +
            '<div class="bz-actions"><button type="button" class="bz-btn bz-btn-primary bz-btn-large" data-submit title="' + esc(t('Publish the listing')) + '">' + esc(t('Publish Listing')) + '</button></div>', true);
        bindConfigure(modal);
        if (draft.kind === 'trade') {
            var grid = modal.querySelector('[data-picker-grid]');
            try {
                grid.innerHTML = await pickerHtml(draft);
                activateMedia(grid);
            } catch (error) {
                grid.innerHTML = emptyHtml(t('The item index could not be loaded.'));
            }
        }
    }

    function readFields(modal) {
        var draft = state.draft;
        Array.prototype.forEach.call(modal.querySelectorAll('[data-field]'), function (input) {
            draft[input.getAttribute('data-field')] = input.value;
        });
    }

    function bindConfigure(modal) {
        var draft = state.draft;
        modal.querySelector('[data-back]').addEventListener('click', function () { draft.step = 1; renderSell(); });
        Array.prototype.forEach.call(modal.querySelectorAll('[data-kind]'), function (button) {
            button.addEventListener('click', function () { readFields(modal); draft.kind = button.getAttribute('data-kind'); renderConfigure(); });
        });
        modal.addEventListener('click', async function (event) {
            var target = event.target;
            var remove = target.closest('[data-slot-item-remove]');
            if (remove) {
                event.stopPropagation();
                var parts = remove.getAttribute('data-slot-item-remove').split(':');
                draft.slots[parseInt(parts[0], 10)].splice(parseInt(parts[1], 10), 1);
                readFields(modal);
                renderConfigure();
                return;
            }
            var removeSlot = target.closest('[data-slot-remove]');
            if (removeSlot) {
                event.stopPropagation();
                draft.slots.splice(parseInt(removeSlot.getAttribute('data-slot-remove'), 10), 1);
                draft.activeSlot = Math.min(draft.activeSlot, draft.slots.length - 1);
                readFields(modal);
                renderConfigure();
                return;
            }
            if (target.closest('[data-slot-add]')) {
                draft.slots.push([]);
                draft.activeSlot = draft.slots.length - 1;
                readFields(modal);
                renderConfigure();
                return;
            }
            var select = target.closest('[data-slot-select]');
            if (select && !target.closest('button')) {
                draft.activeSlot = parseInt(select.getAttribute('data-slot-select'), 10);
                readFields(modal);
                renderConfigure();
                return;
            }
            var category = target.closest('[data-picker-cat]');
            if (category) {
                draft.pickerCategory = category.getAttribute('data-picker-cat');
                readFields(modal);
                renderConfigure();
                return;
            }
            var pick = target.closest('[data-pick-item]');
            if (pick) {
                var catalog = await loadCatalog(draft.pickerCategory);
                var item = catalog.filter(function (entry) { return entry.item_id === pick.getAttribute('data-pick-item'); })[0];
                var slot = draft.slots[draft.activeSlot];
                if (!item || !slot) return;
                var existing = slot.findIndex(function (entry) { return entry.category === item.category && entry.item_id === item.item_id; });
                if (existing >= 0) slot.splice(existing, 1);
                else if (item.category === draft.item.category && item.item_id === draft.item.item_id) toast(t('You cannot ask for the item you offer.'), 'error');
                else if (slot.length >= state.sellable.limits.max_items_per_slot) toast(t('A slot can hold at most 5 items.'), 'error');
                else slot.push(item);
                readFields(modal);
                renderConfigure();
            }
        });
        var pickerSearch = modal.querySelector('[data-picker-search]');
        if (pickerSearch) pickerSearch.addEventListener('input', function () {
            clearTimeout(draft.pickerTimer);
            draft.pickerTimer = setTimeout(async function () {
                draft.pickerQuery = pickerSearch.value;
                var grid = modal.querySelector('[data-picker-grid]');
                grid.innerHTML = await pickerHtml(draft);
                activateMedia(grid);
            }, 250);
        });
        modal.querySelector('[data-submit]').addEventListener('click', submitListing);
    }

    function markInvalid(modal, field, invalid) {
        var input = modal.querySelector('[data-field="' + field + '"]');
        if (input) input.classList.toggle('rwl-invalid', !!invalid);
        return !invalid;
    }

    async function submitListing(event) {
        var modal = byId('bzModal');
        var draft = state.draft;
        readFields(modal);
        var limits = state.sellable.limits;
        var number = function (value) { var parsed = parseInt(value, 10); return isNaN(parsed) ? 0 : parsed; };
        var valid = true;
        var payload = { kind: draft.kind, category: draft.item.category, item_id: draft.item.item_id, note: (draft.note || '').trim() || null };
        if (draft.kind === 'fixed') {
            payload.currency = draft.currency;
            payload.price = number(draft.price);
            valid = markInvalid(modal, 'price', payload.price < 1 || payload.price > limits.max_price) && valid;
        } else if (draft.kind === 'auction') {
            payload.currency = draft.currency;
            payload.start_price = number(draft.start_price);
            payload.min_price = number(draft.min_price);
            payload.duration_hours = number(draft.duration_hours);
            valid = markInvalid(modal, 'start_price', payload.start_price < 1) && valid;
            valid = markInvalid(modal, 'min_price', payload.min_price < payload.start_price) && valid;
            valid = markInvalid(modal, 'duration_hours', payload.duration_hours < limits.min_hours || payload.duration_hours > limits.max_hours) && valid;
        } else {
            var slots = draft.slots.filter(function (slot) { return slot.length; });
            if (!slots.length) {
                toast(t('Add at least one item to a slot.'), 'error');
                valid = false;
            }
            payload.slots = slots.map(function (slot) { return slot.map(function (item) { return { category: item.category, item_id: item.item_id }; }); });
        }
        if (!valid) return;
        var button = event.currentTarget;
        button.disabled = true;
        try {
            await api('/listings', { method: 'POST', body: payload });
            toast(t('Your listing is live.'), 'success');
            closeModal();
            state.tab = 'mine';
            syncTabs();
            scheduleRefresh();
        } catch (error) {
            toast(error.message || t('The listing could not be published.'), 'error');
            button.disabled = false;
        }
    }

    async function loadHistoryCount() {
        try {
            var data = await api('/history');
            state.history = data;
            var badge = byId('bzHistoryCount');
            badge.textContent = String(data.unseen);
            badge.hidden = !data.unseen;
            if (!byId('bzHistory').hidden) renderHistory();
        } catch (error) {}
    }

    var HISTORY_ICONS = { listed: '🏷️', sold: '💰', bought: '🛍️', bid: '🔨', new_bid: '🔔', outbid: '⚠️', won: '🏆', traded: '🔄', refund: '↩️', cancelled: '✖️', expired: '⌛', removed: '🛡️' };

    function renderHistory() {
        var list = byId('bzHistoryList');
        var events = (state.history && state.history.events) || [];
        list.innerHTML = events.length ? events.map(function (entry) {
            return '<div class="bz-history-row' + (entry.seen ? '' : ' bz-unseen') + '"' + (entry.listing_id ? ' data-history-listing="' + esc(entry.listing_id) + '"' : '') + '><span class="bz-history-icon">' + (HISTORY_ICONS[entry.type] || '•') + '</span><div><div class="bz-history-text" translate="no">' + esc(entry.message) + '</div><div class="bz-sub">' + esc(new Date(entry.at).toLocaleString()) + '</div></div></div>';
        }).join('') : emptyHtml(t('Nothing happened yet. Your sales, purchases and trades appear here.'));
    }

    async function openHistory() {
        var panel = byId('bzHistory');
        panel.hidden = !panel.hidden;
        if (panel.hidden) return;
        await loadHistoryCount();
        renderHistory();
        if (state.history && state.history.unseen) {
            api('/history/seen', { method: 'POST' }).then(function () {
                byId('bzHistoryCount').hidden = true;
            }).catch(function () {});
        }
    }

    function syncTabs() {
        Array.prototype.forEach.call(document.querySelectorAll('.bz-tab'), function (tab) {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === state.tab);
        });
    }

    function tickCountdowns() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-ends]'), function (element) {
            element.textContent = timeLeft(element.getAttribute('data-ends'));
        });
    }

    function bind() {
        byId('bzTabs').addEventListener('click', function (event) {
            var tab = event.target.closest('.bz-tab');
            if (!tab) return;
            var requested = tab.getAttribute('data-tab');
            if ((requested === 'mine' || requested === 'bids') && !signedIn()) {
                requireLogin();
                return;
            }
            state.tab = requested;
            syncTabs();
            loadListings(false);
        });
        var searchTimer = null;
        byId('bzSearch').addEventListener('input', function (event) {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () { state.query = event.target.value.trim(); loadListings(false); }, 300);
        });
        byId('bzCategory').addEventListener('change', function (event) { state.category = event.target.value; loadListings(false); });
        byId('bzCurrency').addEventListener('change', function (event) { state.currency = event.target.value; loadListings(false); });
        byId('bzSort').addEventListener('change', function (event) { state.sort = event.target.value; loadListings(false); });
        byId('bzMore').addEventListener('click', function () { state.page += 1; loadListings(true); });
        byId('bzGrid').addEventListener('click', function (event) {
            var card = event.target.closest('[data-listing]');
            if (card) openDetail(card.getAttribute('data-listing'));
        });
        byId('bzGrid').addEventListener('keydown', function (event) {
            var card = event.target.closest('[data-listing]');
            if (card && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                openDetail(card.getAttribute('data-listing'));
            }
        });
        byId('bzSellBtn').addEventListener('click', function () { if (signedIn()) openSell(); else requireLogin(); });
        byId('bzHistoryBtn').addEventListener('click', function () { if (signedIn()) openHistory(); else requireLogin(); });
        byId('bzHistoryClose').addEventListener('click', function () { byId('bzHistory').hidden = true; });
        byId('bzHistoryList').addEventListener('click', function (event) {
            var row = event.target.closest('[data-history-listing]');
            if (row) openDetail(row.getAttribute('data-history-listing'));
        });
        overlay().addEventListener('click', function (event) {
            if (event.target === overlay() || event.target.closest('[data-close]')) closeModal();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !overlay().hidden) closeModal();
        });
        global.addEventListener('rwl-social-event', function (event) {
            if (event.detail && event.detail.type === 'bazaar') scheduleRefresh();
        });
        setInterval(tickCountdowns, 1000);
    }

    function applyGuestMode() {
        document.body.classList.add('bz-guest');
        var sell = byId('bzSellBtn');
        sell.textContent = t('Log In');
        sell.title = t('Log in to buy, bid, sell or trade');
        var balance = byId('bzBalance').closest('.bz-stat');
        if (balance) balance.style.display = 'none';
        var notice = document.createElement('div');
        notice.className = 'bz-guest-notice bz-card';
        notice.innerHTML = '<span>' + esc(t('You are browsing the Lab Bazaar as a guest. Log in to buy, bid, sell or trade.')) + '</span>' +
            '<button type="button" class="bz-btn bz-btn-primary" data-login title="' + esc(t('Log in to buy, bid, sell or trade')) + '">' + esc(t('Log In')) + '</button>';
        notice.querySelector('[data-login]').addEventListener('click', requireLogin);
        var tabs = byId('bzTabs');
        tabs.parentNode.insertBefore(notice, tabs);
    }

    function init() {
        bind();
        if (signedIn()) {
            loadSellable();
            loadHistoryCount();
        } else {
            applyGuestMode();
        }
        loadListings(false);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
