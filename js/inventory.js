(function() {
    var lockerCategories = [
        {
            id: 'themes',
            name: 'Themes',
            section: 'locker',
            image: 'themes_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6.5" r="0.6" fill="#c97eff"/></svg>'
        },
        {
            id: 'avatar-decos',
            name: 'Avatar Decos',
            section: 'locker',
            image: 'avatar_decos_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M7 19c1-2.5 3-3.5 5-3.5s4 1 5 3.5"/></svg>'
        },
        {
            id: 'name-colors',
            name: 'Name Colors',
            section: 'locker',
            image: 'name_colors_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><path d="M4 20l4-12 4 12M6.5 13.5h3"/><circle cx="17.5" cy="15.5" r="3.5"/></svg>'
        },
        {
            id: 'nameplates',
            name: 'Nameplates',
            section: 'locker',
            image: 'nameplates_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="7" cy="12" r="2"/><path d="M12 10h7M12 14h5"/></svg>'
        },
        {
            id: 'mystery-chests',
            name: 'Mystery Chests',
            section: 'inventory',
            image: 'mystery_chests_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M3 10l2-5h14l2 5"/><path d="M12 10v10M9 5l3 5 3-5"/></svg>'
        },
        {
            id: 'licenses',
            name: 'Licenses',
            section: 'inventory',
            image: 'licenses_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l2 2M19 4l2 2"/></svg>'
        },
        {
            id: 'coupons',
            name: 'Coupons',
            section: 'inventory',
            image: 'coupons_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z"/><line x1="9" y1="7" x2="9" y2="17" stroke-dasharray="2 2"/></svg>'
        },
        {
            id: 'special-items',
            name: 'Special Items',
            section: 'inventory',
            image: 'special_items_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
        }
    ];

    var COSMETIC_CATEGORIES = {
        'themes': { catalog: 'launcher_themes', field: 'launcher_theme', label: 'Theme' },
        'avatar-decos': { catalog: 'avatar_decorations', field: 'avatar_decoration', label: 'Avatar Decoration' },
        'name-colors': { catalog: 'name_colors', field: 'name_color', label: 'Name Color' },
        'nameplates': { catalog: 'nameplates', field: 'nameplate', label: 'Nameplate' }
    };
    var LOCK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    var CHEST_IMAGE = '../images/assets/lab_pass/rickware-labs_chest.webp';

    var state = {
        inventory: null,
        catalogs: {},
        catalogRequests: {},
        dropRates: null,
        activeCategory: null,
        products: null
    };

    var esc = RWL.escapeHtml;

    function toast(message, type) {
        var existing = document.getElementById('invToast');
        if (existing) existing.remove();
        var colors = type === 'error' ? ['rgba(30,0,50,0.85)', 'rgba(239,68,68,0.55)', '#ff8a8a'] : (type === 'success' ? ['rgba(10,30,15,0.85)', 'rgba(80,200,100,0.5)', '#7ee08f'] : ['rgba(20,0,40,0.85)', 'rgba(155,0,204,0.5)', '#e0aaff']);
        var element = document.createElement('div');
        element.id = 'invToast';
        element.className = 'inv-toast';
        element.style.background = colors[0];
        element.style.borderColor = colors[1];
        element.style.color = colors[2];
        element.textContent = message;
        document.body.appendChild(element);
        setTimeout(function() { element.classList.add('inv-toast-hide'); }, 4500);
        setTimeout(function() { if (element.parentNode) element.remove(); }, 5000);
        element.addEventListener('click', function() { element.remove(); });
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('en-US');
    }

    function displayNameFromId(itemId) {
        return String(itemId || '').replace(/\.(webm|png)$/i, '').replace(/_/g, ' ').replace(/\b\w/g, function(char) { return char.toUpperCase(); });
    }

    function itemName(catalogKey, itemId) {
        var catalog = state.catalogs[catalogKey];
        if (catalog && catalog.byId[itemId]) return catalog.byId[itemId].name;
        return displayNameFromId(itemId);
    }

    async function loadCatalog(catalogKey) {
        if (state.catalogs[catalogKey]) return state.catalogs[catalogKey];
        if (!state.catalogRequests[catalogKey]) {
            state.catalogRequests[catalogKey] = RWL.apiRequest('/api/cosmetics/catalog/' + catalogKey).then(function(data) {
                var byId = {};
                (data.items || []).forEach(function(item) { byId[item.item_id] = item; });
                state.catalogs[catalogKey] = { items: data.items || [], byId: byId };
                return state.catalogs[catalogKey];
            }).catch(function(error) {
                delete state.catalogRequests[catalogKey];
                throw error;
            });
        }
        return state.catalogRequests[catalogKey];
    }

    function ownedSet(catalogKey) {
        var inventory = state.inventory || {};
        if (inventory.owns_all_cosmetics && state.catalogs[catalogKey]) {
            return null;
        }
        var owned = {};
        ((inventory.items || {})[catalogKey] || []).forEach(function(itemId) { owned[itemId] = true; });
        return owned;
    }

    function isOwned(catalogKey, itemId, owned) {
        return owned === null ? true : !!owned[itemId];
    }

    function chestSummary() {
        return (state.inventory && state.inventory.mystery_chests) || { balance: 0, unlimited: false, chest_name: 'Mystery Chest' };
    }

    function activeVouchers() {
        return ((state.inventory && state.inventory.license_vouchers) || []).filter(function(voucher) { return !voucher.redeemed && !voucher.expired; });
    }

    function categoryCount(cat) {
        var inventory = state.inventory;
        if (!inventory) return 0;
        var cosmetic = COSMETIC_CATEGORIES[cat.id];
        if (cosmetic) return formatNumber((inventory.owned_counts || {})[cosmetic.catalog] || 0);
        if (cat.id === 'mystery-chests') {
            var chests = chestSummary();
            return chests.unlimited ? '∞' : formatNumber(chests.balance || 0);
        }
        if (cat.id === 'licenses') return formatNumber((inventory.licenses || []).filter(function(entry) { return entry.is_valid; }).length);
        if (cat.id === 'coupons') return formatNumber((inventory.coupons || []).filter(function(entry) { return entry.active; }).length);
        if (cat.id === 'special-items') return formatNumber(activeVouchers().length);
        return 0;
    }

    function renderCategoryCard(cat) {
        var html = '<div class="inv-category-card" data-category="' + cat.id + '">';
        html += '<div class="inv-category-count">' + esc(String(categoryCount(cat))) + '</div>';
        html += '<img class="inv-category-image" src="../images/assets/inventory/' + cat.image + '" alt="' + esc(cat.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
        html += '<div class="inv-category-fallback" style="display:none;">' + cat.icon + '<span>' + esc(cat.name) + '</span></div>';
        html += '</div>';
        return html;
    }

    function renderGrids() {
        var lockerGrid = document.getElementById('invLockerGrid');
        var inventoryGrid = document.getElementById('invInventoryGrid');
        if (lockerGrid) {
            lockerGrid.innerHTML = lockerCategories.filter(function(c) { return c.section === 'locker'; }).map(renderCategoryCard).join('');
        }
        if (inventoryGrid) {
            inventoryGrid.innerHTML = lockerCategories.filter(function(c) { return c.section === 'inventory'; }).map(renderCategoryCard).join('');
        }
    }

    function renderEquippedPanel() {
        var listEl = document.getElementById('invEquippedList');
        if (!listEl) return;
        var equipped = (state.inventory && state.inventory.equipped) || {};
        var cosmetics = (state.inventory && state.inventory.equipped_cosmetics) || {};
        listEl.innerHTML = lockerCategories.filter(function(c) { return c.section === 'locker'; }).map(function(cat) {
            var cosmetic = COSMETIC_CATEGORIES[cat.id];
            var equippedId = cosmetic ? equipped[cosmetic.field] : null;
            var valueClass = equippedId ? 'inv-equipped-row-value' : 'inv-equipped-row-value inv-equipped-none';
            var valueText = equippedId ? itemName(cosmetic.catalog, equippedId) : 'Not Equipped';
            var valueStyle = equippedId && cat.id === 'name-colors' ? ' style="' + esc(RWL.nameColorStyle(cosmetics, '#e0aaff')) + '"' : '';
            var row = '<div class="inv-equipped-row">';
            row += '<div class="inv-equipped-row-icon">' + cat.icon.replace('width="32" height="32"', 'width="14" height="14"') + '</div>';
            row += '<div class="inv-equipped-row-text">';
            row += '<div class="inv-equipped-row-label">' + esc(cat.name) + '</div>';
            row += '<div class="' + valueClass + '"' + valueStyle + '>' + esc(valueText) + '</div>';
            row += '</div>';
            row += '</div>';
            return row;
        }).join('');
    }

    function emptyNote(text) {
        return '<div class="inv-empty-note">' + esc(text) + '</div>';
    }

    function cosmeticSlotHtml(catalogKey, item, owned, equipped) {
        var classes = 'inv-slot inv-slot-item' + (owned ? '' : ' inv-slot-locked') + (equipped ? ' inv-slot-equipped' : '');
        var visual;
        if (catalogKey === 'name_colors') {
            visual = '<div class="inv-item-swatch" style="' + esc(RWL.swatchStyle(item)) + '"></div>';
        } else if (catalogKey === 'nameplates') {
            visual = '<video class="inv-item-media" muted loop playsinline preload="none" data-src="' + esc(item.asset_url || '') + '"></video>';
        } else if (catalogKey === 'avatar_decorations') {
            visual = '<img class="inv-item-media inv-item-media-contain" alt="" loading="lazy" data-src="' + esc(item.asset_url || '') + '">';
        } else {
            visual = '<div class="inv-slot-text">' + esc(item.name) + '</div>';
        }
        return '<div class="' + classes + '" style="border-color:' + esc(RWL.rarityColor(item.rarity)) + ';" data-item-id="' + esc(item.item_id) + '" data-owned="' + (owned ? '1' : '0') + '" title="' + esc(item.name + ' · ' + item.rarity + (owned ? (equipped ? ' · Equipped' : ' · Click to equip') : ' · Locked')) + '">' +
            '<div class="inv-item-visual">' + visual + '</div>' +
            '<div class="inv-item-name">' + esc(item.name) + '</div>' +
            (equipped ? '<div class="inv-item-badge">Equipped</div>' : '') +
            (owned ? '' : '<div class="inv-item-lock">' + LOCK_SVG + '</div>') +
        '</div>';
    }

    function cosmeticGrids(categoryId) {
        var cosmetic = COSMETIC_CATEGORIES[categoryId];
        var catalog = state.catalogs[cosmetic.catalog];
        var owned = ownedSet(cosmetic.catalog);
        var equippedId = ((state.inventory && state.inventory.equipped) || {})[cosmetic.field];
        var ownedItems = catalog.items.filter(function(item) { return isOwned(cosmetic.catalog, item.item_id, owned); });
        var ownedHtml = ownedItems.length
            ? ownedItems.map(function(item) { return cosmeticSlotHtml(cosmetic.catalog, item, true, item.item_id === equippedId); }).join('')
            : emptyNote(catalog.items.length ? 'No ' + cosmetic.label.toLowerCase() + 's yet. Open Mystery Chests or progress the Lab-Pass to unlock them.' : 'No ' + cosmetic.label.toLowerCase() + 's are available yet.');
        var indexHtml = catalog.items.length
            ? catalog.items.map(function(item) { var has = isOwned(cosmetic.catalog, item.item_id, owned); return cosmeticSlotHtml(cosmetic.catalog, item, has, has && item.item_id === equippedId); }).join('')
            : emptyNote('No ' + cosmetic.label.toLowerCase() + 's are available yet.');
        return { owned: ownedHtml, index: indexHtml, ownedCount: ownedItems.length, total: catalog.items.length };
    }

    function chestSlotHtml(clickable) {
        var chests = chestSummary();
        var name = chests.chest_name || 'Mystery Chest';
        var empty = !chests.unlimited && !chests.balance;
        var slot = '<div class="inv-slot inv-slot-chest' + (empty && clickable ? ' inv-slot-locked' : '') + '"' + (clickable ? ' data-chest-slot="1"' : ' data-chest-index-slot="1"') + ' title="' + esc(name) + '">';
        slot += '<div class="inv-chest-slot-inner">';
        slot += '<img src="' + CHEST_IMAGE + '" alt="' + esc(name) + '" class="inv-chest-img">';
        if (clickable) slot += '<div class="inv-chest-count-badge" id="invChestCountBadge">' + (chests.unlimited ? '∞' : esc(String(chests.balance || 0))) + '</div>';
        slot += '<div class="inv-chest-hover-desc">' + esc(clickable ? (empty ? 'No chests left' : 'Click to open') : name) + '</div>';
        slot += '</div>';
        slot += '</div>';
        return slot;
    }

    function dropRatesHtml() {
        var rates = state.dropRates;
        if (!rates) return emptyNote('Loading drop rates...');
        var html = '<div class="inv-drop-rates">';
        html += '<div class="inv-drop-rates-title">🎲 Drop Rate Statistics</div>';
        (rates.categories || []).forEach(function(category) {
            html += '<div class="inv-drop-rates-group">';
            html += '<div class="inv-drop-rates-head"><span>' + esc(category.label) + ' (' + formatNumber(category.item_count) + ' items)</span><strong>' + esc(String(category.chance_percent)) + '%</strong></div>';
            (category.rarities || []).forEach(function(rarity) {
                html += '<div class="inv-drop-rates-row"><span style="color:' + esc(RWL.rarityColor(rarity.rarity)) + ';">' + esc(rarity.rarity) + '</span><span>' + formatNumber(rarity.item_count) + ' items</span><strong>' + esc(String(rarity.chance_percent)) + '%</strong></div>';
            });
            html += '</div>';
        });
        html += '<div class="inv-drop-rates-note">Every roll happens on our server. Category chance × rarity chance = overall chance. Duplicates are converted into Lab Coins. New accounts receive 1 chest, Unlock All accounts receive 10 chests once, more chests are earned through the Lab-Pass.</div>';
        html += '</div>';
        return html;
    }

    function licenseSlotsHtml(onlyValid) {
        var licenses = (state.inventory && state.inventory.licenses) || [];
        var list = onlyValid ? licenses.filter(function(entry) { return entry.is_valid; }) : licenses;
        if (!list.length) return emptyNote(onlyValid ? 'No active licenses yet.' : 'No licenses yet.');
        return list.map(function(entry) {
            var expiry = entry.expires_at === 'Lifetime' ? 'Lifetime' : new Date(entry.expires_at).toLocaleDateString();
            var status = entry.is_paused ? 'Paused' : (entry.is_valid ? 'Active' : 'Expired');
            var color = entry.is_valid ? '#22c55e' : '#ef4444';
            var launchable = entry.is_valid && entry.product_id && window.RWLLauncher && RWLLauncher.isLauncher();
            var action = launchable
                ? ' data-launch-product="' + esc(entry.product_id) + '" title="Click to install or start this tool in the launcher"'
                : ' data-copy="' + esc(entry.license_key) + '" title="Click to copy the license key"';
            return '<div class="inv-slot inv-slot-item inv-slot-wide"' + action + ' style="border-color:' + color + ';">' +
                '<div class="inv-slot-text"><strong>' + esc(entry.product_name) + '</strong><br>' + esc(entry.duration || '') + '<br><span style="color:' + color + ';">' + status + '</span> · ' + esc(expiry) + (launchable ? '<br>▶ Install / Launch' : '') + '</div>' +
            '</div>';
        }).join('');
    }

    function couponSlotsHtml(onlyActive) {
        var coupons = (state.inventory && state.inventory.coupons) || [];
        var list = onlyActive ? coupons.filter(function(entry) { return entry.active; }) : coupons;
        if (!list.length) return emptyNote(onlyActive ? 'No active coupons. Earn coupons through the Lab-Pass.' : 'No coupons yet.');
        return list.map(function(entry) {
            var status = entry.active ? 'Active' : (entry.used ? 'Used' : 'Expired');
            var color = entry.active ? '#22c55e' : '#9ca3af';
            return '<div class="inv-slot inv-slot-item inv-slot-wide' + (entry.active ? '' : ' inv-slot-locked') + '" data-copy="' + esc(entry.code) + '" title="Click to copy the coupon code" style="border-color:' + color + ';">' +
                '<div class="inv-slot-text"><strong>' + esc(String(entry.percent)) + '% OFF</strong><br>' + esc(entry.code) + '<br><span style="color:' + color + ';">' + status + '</span>' + (entry.valid_until ? ' · until ' + esc(new Date(entry.valid_until).toLocaleDateString()) : '') + '</div>' +
            '</div>';
        }).join('');
    }

    function voucherSlotsHtml(onlyActive) {
        var vouchers = (state.inventory && state.inventory.license_vouchers) || [];
        var list = onlyActive ? activeVouchers() : vouchers;
        if (!list.length) return emptyNote(onlyActive ? 'No special items yet. License vouchers are earned through the Lab-Pass.' : 'No special items yet.');
        return list.map(function(voucher) {
            var redeemable = !voucher.redeemed && !voucher.expired;
            var status = voucher.redeemed ? 'Redeemed' : (voucher.expired ? 'Expired' : 'Click to redeem');
            return '<div class="inv-slot inv-slot-item inv-slot-wide' + (redeemable ? '' : ' inv-slot-locked') + '"' + (redeemable ? ' data-voucher-id="' + esc(voucher.voucher_id) + '"' : '') + ' title="' + esc(voucher.label) + '" style="border-color:' + (redeemable ? '#c97eff' : '#6b7280') + ';">' +
                '<div class="inv-slot-text"><strong>' + esc(voucher.label) + '</strong><br>' + esc(status) + (voucher.expires_at && redeemable ? '<br>until ' + esc(new Date(voucher.expires_at).toLocaleDateString()) : '') + '</div>' +
            '</div>';
        }).join('');
    }

    function setupModalTabEvents(container) {
        var tabs = container.querySelectorAll('.inv-modal-tab');
        var panels = container.querySelectorAll('.inv-tab-panel');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function(e) {
                var target = e.currentTarget.getAttribute('data-tab');
                for (var j = 0; j < tabs.length; j++) {
                    tabs[j].classList.toggle('inv-modal-tab-active', tabs[j] === e.currentTarget);
                }
                for (var k = 0; k < panels.length; k++) {
                    var isActive = panels[k].getAttribute('data-tab-panel') === target;
                    panels[k].classList.toggle('inv-tab-panel-active', isActive);
                    if (isActive) observeSlots(panels[k]);
                }
            });
        }
    }

    function activateSlotMedia(slot) {
        var media = slot.querySelector('[data-src]');
        if (!media || media.getAttribute('src')) return;
        var source = media.getAttribute('data-src');
        if (!source) return;
        if (media.tagName === 'VIDEO') {
            media.muted = true;
            media.preload = 'auto';
            media.autoplay = true;
            media.src = source;
            media.play().catch(function() {});
        } else {
            media.src = source;
        }
    }

    function setupSlotObserver(viewport) {
        if (!viewport.offsetParent) return;
        var slots = viewport.querySelectorAll('.inv-slot:not(.inv-slot-visible)');
        if (!('IntersectionObserver' in window)) {
            for (var i = 0; i < slots.length; i++) {
                slots[i].classList.add('inv-slot-visible');
                activateSlotMedia(slots[i]);
            }
            return;
        }
        var observer = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('inv-slot-visible');
                    activateSlotMedia(entries[i].target);
                    observer.unobserve(entries[i].target);
                }
            }
        }, { root: viewport, rootMargin: '120px 0px', threshold: 0.05 });
        for (var j = 0; j < slots.length; j++) {
            observer.observe(slots[j]);
        }
    }

    function observeSlots(container) {
        var viewports = container.querySelectorAll('.inv-slots-viewport');
        for (var i = 0; i < viewports.length; i++) {
            setupSlotObserver(viewports[i]);
        }
    }

    function openChestIframe() {
        var overlay = document.getElementById('invChestIframeOverlay');
        var iframe = document.getElementById('invChestIframe');
        if (!overlay || !iframe) return;
        iframe.src = './chest_opening.html';
        overlay.classList.add('inv-chest-open');
        document.body.style.overflow = 'hidden';
    }

    async function closeChestIframe() {
        var overlay = document.getElementById('invChestIframeOverlay');
        var iframe = document.getElementById('invChestIframe');
        if (!overlay || !iframe) return;
        overlay.classList.remove('inv-chest-open');
        iframe.src = '';
        var categoryModal = document.getElementById('invModalOverlay');
        document.body.style.overflow = categoryModal && categoryModal.classList.contains('inv-open') ? 'hidden' : '';
        await refreshInventory();
    }

    function setupChestIframeEvents() {
        window.addEventListener('message', function(e) {
            if (e.origin !== window.location.origin) return;
            if (e.data === 'chest_opening_done' || (e.data && e.data.type === 'chest_opening_done')) {
                closeChestIframe();
            }
        });
    }

    function modalHeader(cat, subtitle) {
        var titleEl = document.getElementById('invModalTitle');
        var subtitleEl = document.getElementById('invModalSubtitle');
        var iconEl = document.getElementById('invModalIcon');
        if (titleEl) titleEl.textContent = cat.name;
        if (iconEl) iconEl.innerHTML = cat.icon;
        if (subtitleEl) subtitleEl.textContent = subtitle;
    }

    function tabbedBodyHtml(ownedHtml, indexHtml, ownedLabel, indexLabel) {
        var bodyHtml = '<div class="inv-modal-tabs">';
        bodyHtml += '<button type="button" class="inv-modal-tab inv-modal-tab-active" data-tab="owned">' + esc(ownedLabel || 'Owned') + '</button>';
        bodyHtml += '<button type="button" class="inv-modal-tab" data-tab="index">' + esc(indexLabel || 'Index') + '</button>';
        bodyHtml += '</div>';
        bodyHtml += '<div class="inv-modal-tab-panels">';
        bodyHtml += '<div class="inv-tab-panel inv-tab-panel-active" data-tab-panel="owned"><div class="inv-slots-viewport"><div class="inv-slots-grid">' + ownedHtml + '</div></div></div>';
        bodyHtml += '<div class="inv-tab-panel" data-tab-panel="index"><div class="inv-slots-viewport"><div class="inv-slots-grid">' + indexHtml + '</div></div></div>';
        bodyHtml += '</div>';
        return bodyHtml;
    }

    function activeTabName(bodyEl) {
        var active = bodyEl.querySelector('.inv-modal-tab.inv-modal-tab-active');
        return active ? active.getAttribute('data-tab') : 'owned';
    }

    function restoreTab(bodyEl, tabName) {
        var tab = bodyEl.querySelector('.inv-modal-tab[data-tab="' + tabName + '"]');
        if (tab && tabName !== 'owned') tab.click();
    }

    async function renderCategoryModal(categoryId, keepTab) {
        var cat = lockerCategories.filter(function(c) { return c.id === categoryId; })[0];
        var bodyEl = document.getElementById('invModalBody');
        if (!cat || !bodyEl) return;
        var previousTab = keepTab ? activeTabName(bodyEl) : 'owned';
        var cosmetic = COSMETIC_CATEGORIES[categoryId];
        if (cosmetic) {
            if (!state.catalogs[cosmetic.catalog]) {
                modalHeader(cat, 'Loading items...');
                bodyEl.innerHTML = tabbedBodyHtml(emptyNote('Loading items...'), emptyNote('Loading items...'));
                setupModalTabEvents(bodyEl);
                try {
                    await loadCatalog(cosmetic.catalog);
                } catch (error) {
                    bodyEl.innerHTML = tabbedBodyHtml(emptyNote('Items could not be loaded. Please try again.'), emptyNote('Items could not be loaded. Please try again.'));
                    setupModalTabEvents(bodyEl);
                    return;
                }
                if (state.activeCategory !== categoryId) return;
            }
            var grids = cosmeticGrids(categoryId);
            var everything = state.inventory && state.inventory.owns_all_cosmetics;
            modalHeader(cat, everything ? 'All ' + formatNumber(grids.total) + ' items unlocked' : formatNumber(grids.ownedCount) + ' of ' + formatNumber(grids.total) + ' items owned');
            bodyEl.innerHTML = tabbedBodyHtml(grids.owned, grids.index);
        } else if (categoryId === 'mystery-chests') {
            var chests = chestSummary();
            modalHeader(cat, chests.unlimited ? 'Unlimited chests' : formatNumber(chests.balance || 0) + (chests.balance === 1 ? ' chest available' : ' chests available'));
            bodyEl.innerHTML = tabbedBodyHtml(chestSlotHtml(true), chestSlotHtml(false) + dropRatesHtml(), 'Owned', 'Drop Rates');
            if (!state.dropRates) {
                RWL.apiRequest('/api/chests/drop_rates').then(function(rates) {
                    state.dropRates = rates;
                    if (state.activeCategory === 'mystery-chests') renderCategoryModal('mystery-chests', true);
                }).catch(function() {});
            }
        } else if (categoryId === 'licenses') {
            var licenses = (state.inventory && state.inventory.licenses) || [];
            modalHeader(cat, formatNumber(licenses.filter(function(entry) { return entry.is_valid; }).length) + ' active licenses');
            bodyEl.innerHTML = tabbedBodyHtml(licenseSlotsHtml(true), licenseSlotsHtml(false), 'Active', 'All');
        } else if (categoryId === 'coupons') {
            var coupons = (state.inventory && state.inventory.coupons) || [];
            modalHeader(cat, formatNumber(coupons.filter(function(entry) { return entry.active; }).length) + ' active coupons');
            bodyEl.innerHTML = tabbedBodyHtml(couponSlotsHtml(true), couponSlotsHtml(false), 'Active', 'All');
        } else {
            modalHeader(cat, formatNumber(activeVouchers().length) + ' redeemable items');
            bodyEl.innerHTML = tabbedBodyHtml(voucherSlotsHtml(true), voucherSlotsHtml(false), 'Available', 'All');
        }
        setupModalTabEvents(bodyEl);
        restoreTab(bodyEl, previousTab);
        observeSlots(bodyEl);
    }

    async function openCategoryModal(categoryId) {
        var overlay = document.getElementById('invModalOverlay');
        if (!overlay) return;
        state.activeCategory = categoryId;
        overlay.classList.add('inv-open');
        document.body.style.overflow = 'hidden';
        await renderCategoryModal(categoryId, false);
    }

    function closeCategoryModal() {
        var overlay = document.getElementById('invModalOverlay');
        if (!overlay) return;
        overlay.classList.remove('inv-open');
        document.body.style.overflow = '';
        state.activeCategory = null;
    }

    async function copyText(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            toast(label + ' copied to clipboard.', 'success');
        } catch (error) {
            toast('Copy failed. Please copy it manually: ' + text, 'error');
        }
    }

    function updateEquippedSlots(bodyEl, field, itemId) {
        bodyEl.querySelectorAll('.inv-slot-equipped').forEach(function(slot) {
            slot.classList.remove('inv-slot-equipped');
            var badge = slot.querySelector('.inv-item-badge');
            if (badge) badge.remove();
        });
        if (!itemId) return;
        bodyEl.querySelectorAll('.inv-slot-item[data-owned="1"]').forEach(function(slot) {
            if (slot.getAttribute('data-item-id') === itemId) {
                slot.classList.add('inv-slot-equipped');
                slot.insertAdjacentHTML('beforeend', '<div class="inv-item-badge">Equipped</div>');
            }
        });
    }

    async function equipItem(slot) {
        var cosmetic = COSMETIC_CATEGORIES[state.activeCategory];
        if (!cosmetic || slot.classList.contains('inv-slot-busy')) return;
        var itemId = slot.getAttribute('data-item-id');
        var equipped = (state.inventory && state.inventory.equipped) || {};
        var nextValue = equipped[cosmetic.field] === itemId ? '' : itemId;
        var payload = {};
        payload[cosmetic.field] = nextValue;
        slot.classList.add('inv-slot-busy');
        try {
            var result = await RWL.apiRequest('/api/profile/update', { method: 'POST', body: { new_data: payload } });
            if (nextValue) equipped[cosmetic.field] = nextValue;
            else delete equipped[cosmetic.field];
            state.inventory.equipped = equipped;
            if (result && result.account) {
                state.inventory.equipped_cosmetics = result.account.equipped_cosmetics || state.inventory.equipped_cosmetics;
                try { sessionStorage.setItem('rickware_user', JSON.stringify(result.account)); } catch (error) {}
            }
            updateEquippedSlots(document.getElementById('invModalBody'), cosmetic.field, nextValue);
            renderEquippedPanel();
            toast((nextValue ? 'Equipped ' : 'Unequipped ') + itemName(cosmetic.catalog, itemId) + '.', 'success');
        } catch (error) {
            toast(error.status === 429 ? 'You are changing items too fast. Please wait a moment.' : (error.message || 'The item could not be equipped.'), 'error');
        } finally {
            slot.classList.remove('inv-slot-busy');
        }
    }

    async function loadStoreProducts() {
        if (state.products) return state.products;
        var response = await fetch('../config/products.json', { cache: 'no-store' });
        var data = await response.json();
        state.products = (data.products || []).filter(function(product) {
            if (!product.product_id || product.file_product === false) return false;
            var categories = [];
            (product.license_categories || []).forEach(function(entry) { categories = categories.concat(Object.keys(entry || {})); });
            return categories.length && !categories.every(function(category) { return category === 'free'; });
        });
        return state.products;
    }

    async function openVoucherPicker(voucherId) {
        var bodyEl = document.getElementById('invModalBody');
        if (!bodyEl) return;
        bodyEl.innerHTML = '<div class="inv-modal-tabs"><button type="button" class="inv-modal-tab inv-modal-tab-active" data-voucher-back="1">← Back</button></div><div class="inv-modal-tab-panels"><div class="inv-tab-panel inv-tab-panel-active"><div class="inv-slots-viewport"><div class="inv-slots-grid">' + emptyNote('Loading products...') + '</div></div></div></div>';
        try {
            var products = await loadStoreProducts();
            var grid = bodyEl.querySelector('.inv-slots-grid');
            grid.innerHTML = products.length ? products.map(function(product) {
                return '<div class="inv-slot inv-slot-item inv-slot-wide inv-slot-visible" data-redeem-product="' + esc(product.product_id) + '" data-redeem-voucher="' + esc(voucherId) + '" title="Redeem the voucher for this product">' +
                    '<div class="inv-slot-text"><strong>' + esc(String(product.title || 'Product').replace(/^[•·\-\s]+/, '')) + '</strong><br>' + esc(product.category || '') + '</div>' +
                '</div>';
            }).join('') : emptyNote('No products are available for vouchers right now.');
        } catch (error) {
            toast('Products could not be loaded. Please try again.', 'error');
        }
    }

    async function redeemVoucher(slot) {
        if (slot.classList.contains('inv-slot-busy')) return;
        slot.classList.add('inv-slot-busy');
        try {
            var result = await RWL.apiRequest('/api/season_pass/vouchers/redeem', {
                method: 'POST',
                body: { voucher_id: slot.getAttribute('data-redeem-voucher'), product_id: slot.getAttribute('data-redeem-product') }
            });
            toast('Voucher redeemed: ' + result.product_name + ' (' + result.duration + '). Your license is active now.', 'success');
            await refreshInventory();
        } catch (error) {
            toast(error.message || 'The voucher could not be redeemed.', 'error');
            slot.classList.remove('inv-slot-busy');
        }
    }

    function setupModalBodyEvents() {
        var bodyEl = document.getElementById('invModalBody');
        if (!bodyEl) return;
        bodyEl.addEventListener('click', function(e) {
            if (e.target.closest('[data-voucher-back]')) {
                renderCategoryModal('special-items', false);
                return;
            }
            var chestSlot = e.target.closest('[data-chest-slot]');
            if (chestSlot) {
                var chests = chestSummary();
                if (!chests.enabled && chests.enabled !== undefined) { toast('Mystery Chests are currently disabled.', 'error'); return; }
                if (!chests.unlimited && !chests.balance) { toast('You have no Mystery Chests left. Earn more chests through the Lab-Pass.', 'info'); return; }
                openChestIframe();
                return;
            }
            var redeemSlot = e.target.closest('[data-redeem-product]');
            if (redeemSlot) { redeemVoucher(redeemSlot); return; }
            var launchSlot = e.target.closest('[data-launch-product]');
            if (launchSlot) {
                if (launchSlot.classList.contains('inv-slot-busy')) return;
                launchSlot.classList.add('inv-slot-busy');
                RWLLauncher.runAction(launchSlot.getAttribute('data-launch-product')).then(function() {
                    launchSlot.classList.remove('inv-slot-busy');
                });
                return;
            }
            var voucherSlot = e.target.closest('[data-voucher-id]');
            if (voucherSlot) { openVoucherPicker(voucherSlot.getAttribute('data-voucher-id')); return; }
            var copySlot = e.target.closest('[data-copy]');
            if (copySlot) { copyText(copySlot.getAttribute('data-copy'), state.activeCategory === 'coupons' ? 'Coupon code' : 'License key'); return; }
            var itemSlot = e.target.closest('.inv-slot-item[data-item-id]');
            if (!itemSlot) return;
            if (itemSlot.getAttribute('data-owned') !== '1') {
                toast('This item is locked. Unlock it from Mystery Chests or the Lab-Pass.', 'info');
                return;
            }
            equipItem(itemSlot);
        });
    }

    function setupModalEvents() {
        var overlay = document.getElementById('invModalOverlay');
        var closeBtn = document.getElementById('invModalClose');
        if (closeBtn) closeBtn.addEventListener('click', closeCategoryModal);
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) closeCategoryModal();
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var chestOverlay = document.getElementById('invChestIframeOverlay');
                if (chestOverlay && chestOverlay.classList.contains('inv-chest-open')) {
                    closeChestIframe();
                    return;
                }
                closeCategoryModal();
            }
        });
    }

    function setupCardEvents() {
        document.addEventListener('click', function(e) {
            var card = e.target.closest('.inv-category-card');
            if (!card) return;
            openCategoryModal(card.getAttribute('data-category'));
        });
    }

    function setupViewAllButton() {
        var btn = document.getElementById('invViewAllBtn');
        if (!btn) return;
        btn.addEventListener('click', function() {
            window.location.href = '../sites/lab-pass.html';
        });
    }

    function setupLabPassButtons() {
        var buyBtn = document.getElementById('invLabPassBuyBtn');
        var freeBtn = document.getElementById('invLabPassFreeBtn');
        if (buyBtn) {
            buyBtn.addEventListener('click', function() {
                window.location.href = '../sites/lab-pass.html';
            });
        }
        if (freeBtn) {
            freeBtn.addEventListener('click', function() {
                window.location.href = '../sites/lab-pass.html';
            });
        }
    }

    async function loadLabPassPromo() {
        try {
            var info = await RWL.apiRequest('/api/season_pass/info');
            if (!info || !info.season) return;
            var newPrice = document.querySelector('.inv-labpass-price-new');
            var oldPrice = document.querySelector('.inv-labpass-price-old');
            var subtitle = document.querySelector('.inv-labpass-promo-sub');
            var badge = document.querySelector('.inv-labpass-promo-badge');
            var season = info.season;
            if (newPrice) newPrice.textContent = season.bundle_price_lc + ' LC';
            if (oldPrice) oldPrice.textContent = season.bundle_original_price_lc + ' LC';
            if (subtitle) subtitle.textContent = 'Pass + ' + season.bundle_levels + ' Levels';
            if (badge && season.bundle_original_price_lc > 0) badge.textContent = '-' + Math.round((1 - season.bundle_price_lc / season.bundle_original_price_lc) * 100) + '%';
        } catch (error) {}
    }

    async function refreshInventory() {
        try {
            state.inventory = await RWL.apiRequest('/api/inventory');
        } catch (error) {
            if (error.status === 401) {
                RWL.clearSession();
                redirectToLogin();
                return;
            }
            toast('Your locker could not be loaded. Please try again shortly.', 'error');
            return;
        }
        renderGrids();
        renderEquippedPanel();
        if (state.activeCategory) renderCategoryModal(state.activeCategory, true);
        ['launcher_themes', 'avatar_decorations', 'nameplates', 'name_colors'].forEach(function(catalogKey) {
            loadCatalog(catalogKey).then(renderEquippedPanel).catch(function() {});
        });
    }

    function showInventoryContent() {
        var loadingState = document.getElementById('invLoadingState');
        var content = document.getElementById('invContent');
        if (loadingState) loadingState.style.display = 'none';
        if (content) content.classList.add('inv-visible');
    }

    function redirectToLogin() {
        window.location.href = './login_register.html?tab=login';
    }

    async function checkAuthAndInit() {
        var token = RWL.getToken();
        if (!token || token.split('.').length !== 3) {
            redirectToLogin();
            return;
        }
        renderGrids();
        renderEquippedPanel();
        await refreshInventory();
        showInventoryContent();
        loadLabPassPromo();
    }

    document.addEventListener('DOMContentLoaded', function() {
        RWL.ensureCosmeticStyles();
        if (window.RWLLauncher) RWLLauncher.setNotifier(toast);
        setupModalEvents();
        setupModalBodyEvents();
        setupCardEvents();
        setupViewAllButton();
        setupLabPassButtons();
        setupChestIframeEvents();
        checkAuthAndInit();
    });
})();
