(function(global) {
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
            id: 'nameplate-outlines',
            name: 'Nameplate Outlines',
            section: 'locker',
            image: 'nameplate_outlines_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="3"/><rect x="5" y="9" width="14" height="6" rx="1.5" stroke-dasharray="2 2"/></svg>'
        },
        {
            id: 'content-borders',
            name: 'Content Borders',
            section: 'locker',
            image: 'content_borders_main.webp',
            icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>'
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
        'nameplates': { catalog: 'nameplates', field: 'nameplate', label: 'Nameplate' },
        'nameplate-outlines': { catalog: 'nameplate_outlines', field: 'nameplate_outline', label: 'Nameplate Outline' },
        'content-borders': { catalog: 'content_borders', field: 'content_border', label: 'Content Border' }
    };
    var GRID_LAYOUTS = {
        launcher_themes: { minWidth: 118, height: 124 },
        name_colors: { minWidth: 118, height: 124 },
        avatar_decorations: { minWidth: 112, height: 134 },
        nameplates: { minWidth: 280, height: 104, mediaRatio: 448 / 84, chromeHeight: 42 },
        nameplate_outlines: { minWidth: 240, height: 100 },
        content_borders: { minWidth: 220, height: 124 }
    };
    var GRID_GAP = 9;
    var GRID_BUFFER_ROWS = 2;
    var CONFIGURABLE_CATALOGS = { name_colors: true, nameplates: true, avatar_decorations: true, launcher_themes: true, nameplate_outlines: true, content_borders: true };
    var DIRECTION_LABELS = { ltr: 'Left To Right', rtl: 'Right To Left', ttb: 'Top To Bottom', btt: 'Bottom To Top', center_out: 'Center To Outside', edge_in: 'Outside To Center' };
    var HOVER_DELAY_MS = 220;
    var THEME_PREVIEW_WIDTH = 1280;
    var THEME_PREVIEW_HEIGHT = 720;
    var THEME_PREVIEW_SCALE = 0.3;
    var activeGrids = [];
    var hoverTimer = null;
    var previewBox = null;
    var themeFrame = null;
    var themeFrameReady = false;
    var pendingPreviewTheme = null;
    var NEW_MARKER_KEYS = {
        'themes': 'launcher_themes',
        'avatar-decos': 'avatar_decorations',
        'name-colors': 'name_colors',
        'nameplates': 'nameplates',
        'nameplate-outlines': 'nameplate_outlines',
        'content-borders': 'content_borders',
        'special-items': 'license_vouchers',
        'coupons': 'reward_coupons'
    };
    var LOCK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    var CHEST_IMAGE = '../images/assets/lab_pass/rickware-labs_chest.webp';
    var KEEP_STYLE = '--rwl-keep:1;';
    var DEFAULT_THEME_ID = '__default__';
    var DEFAULT_THEME = { item_id: DEFAULT_THEME_ID, name: 'Rickware Purple (Default)', rarity: 'Common', preview: ['#9B00CC', '#C97EFF', '#14002A'], is_default: true };

    var state = {
        inventory: null,
        catalogs: {},
        catalogRequests: {},
        dropRates: null,
        activeCategory: null,
        products: null,
        newItems: {},
        openAllResult: null,
        openingAll: false
    };
    var pendingSeen = {};
    var seenTimer = null;

    var esc = RWL.escapeHtml;

    function newSet(key) {
        var set = {};
        ((state.newItems || {})[key] || []).forEach(function(itemId) { set[itemId] = true; });
        return set;
    }

    function isNew(key, itemId) {
        return !!key && ((state.newItems || {})[key] || []).indexOf(itemId) >= 0;
    }

    function newCount(key) {
        return ((state.newItems || {})[key] || []).length;
    }

    function totalNewCount() {
        return Object.keys(state.newItems || {}).reduce(function(sum, key) { return sum + newCount(key); }, 0);
    }

    function flushSeen(keepalive) {
        clearTimeout(seenTimer);
        seenTimer = null;
        var batches = pendingSeen;
        pendingSeen = {};
        Object.keys(batches).forEach(function(key) {
            var ids = batches[key];
            for (var start = 0; start < ids.length; start += 200) {
                var body = JSON.stringify({ category: key, item_ids: ids.slice(start, start + 200) });
                try {
                    fetch(RWL.apiUrl('/api/inventory/seen'), { method: 'POST', headers: RWL.authHeaders(), body: body, keepalive: !!keepalive }).catch(function() {});
                } catch (error) {}
            }
        });
    }

    function markSeen(key, itemId) {
        if (!isNew(key, itemId)) return;
        state.newItems[key] = state.newItems[key].filter(function(entry) { return entry !== itemId; });
        if (!state.newItems[key].length) delete state.newItems[key];
        (pendingSeen[key] = pendingSeen[key] || []).push(itemId);
        clearTimeout(seenTimer);
        seenTimer = setTimeout(function() { flushSeen(false); }, 600);
        document.querySelectorAll('[data-new-key="' + key + '"][data-new-id]').forEach(function(slot) {
            if (slot.getAttribute('data-new-id') !== itemId) return;
            slot.classList.remove('inv-slot-new');
            var badge = slot.querySelector('.inv-item-new');
            if (badge) badge.remove();
        });
        renderGrids();
        renderHeaderStats();
    }

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
        return String(itemId || '').replace(/\.(webm|png|webp)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(^|[\s(])(\S)/g, function(match, lead, char) { return lead + char.toUpperCase(); });
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

    function renderHeaderStats() {
        var inventory = state.inventory;
        if (!inventory) return;
        var itemsEl = document.getElementById('invStatItems');
        var chestsEl = document.getElementById('invStatChests');
        var newEl = document.getElementById('invStatNew');
        var owned = inventory.owned_counts || {};
        var totalOwned = Object.keys(owned).reduce(function(sum, key) { return sum + (owned[key] || 0); }, 0);
        var chests = chestSummary();
        if (itemsEl) itemsEl.textContent = formatNumber(totalOwned);
        if (chestsEl) chestsEl.textContent = chests.unlimited ? '∞' : formatNumber(chests.balance || 0);
        if (newEl) newEl.textContent = formatNumber(totalNewCount());
    }

    function renderCategoryCard(cat) {
        var newKey = NEW_MARKER_KEYS[cat.id];
        var html = '<div class="inv-category-card" data-category="' + cat.id + '">';
        html += '<div class="inv-category-count">' + esc(String(categoryCount(cat))) + '</div>';
        if (newKey && newCount(newKey)) html += '<div class="inv-category-new" title="' + esc(formatNumber(newCount(newKey))) + ' new">NEW</div>';
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
            var valueText = equippedId ? itemName(cosmetic.catalog, equippedId) : (cat.id === 'themes' ? DEFAULT_THEME.name : 'Not Equipped');
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

    function themePreviewHtml(item) {
        var colors = (item.preview || []).map(function(color) { return RWL.sanitizeHex(color, '#7b2cbf'); });
        if (!colors.length) colors = ['#7b2cbf'];
        if (item.animated && colors.length > 1) {
            RWL.ensureCosmeticStyles();
            var seconds = Math.max(4, Math.min(parseInt((item.animation || {}).period_seconds, 10) || 12, 40));
            var stops = colors.concat([colors[0]]).join(',');
            return '<div class="inv-theme-preview inv-theme-preview-animated" title="Animated theme"><span style="' + KEEP_STYLE + 'flex:1;background-image:linear-gradient(90deg,' + stops + ');background-size:300% 100%;animation:rwlNameRgb ' + seconds + 's linear infinite;"></span></div>';
        }
        return '<div class="inv-theme-preview">' + colors.map(function(color) {
            return '<span style="' + KEEP_STYLE + 'background:' + color + ';"></span>';
        }).join('') + '</div>';
    }

    function cosmeticSlotHtml(catalogKey, item, owned, equipped, fresh) {
        var classes = 'inv-slot inv-slot-item inv-slot-visible' + (owned ? '' : ' inv-slot-locked') + (equipped ? ' inv-slot-equipped' : '') + (fresh ? ' inv-slot-new' : '') + ' inv-slot-' + catalogKey.replace(/_/g, '-');
        var settings = itemSettings(catalogKey, item.item_id);
        var visual;
        if (catalogKey === 'name_colors') {
            var swatchItem = Object.assign({}, item, { speed: settings.speed, direction: settings.direction });
            visual = '<div class="inv-item-swatch" style="' + esc(RWL.swatchStyle(swatchItem)) + '"></div>';
        } else if (catalogKey === 'nameplates') {
            visual = '<video class="inv-item-media" muted loop playsinline preload="none" data-rwl-speed="' + settings.speed + '" data-src="' + esc(item.asset_url || '') + '"></video>';
        } else if (catalogKey === 'avatar_decorations') {
            visual = '<img class="inv-item-media inv-item-media-contain" alt="" decoding="async" data-src="' + esc(item.thumb_url || item.asset_url || '') + '">';
        } else if (catalogKey === 'launcher_themes') {
            visual = themePreviewHtml(item);
        } else if (catalogKey === 'nameplate_outlines') {
            visual = '<div class="inv-frame-sample inv-frame-plate' + RWL.frameClasses(item) + '" style="' + esc(RWL.frameStyle(Object.assign({}, item, { speed: settings.speed }))) + '"><span translate="no">' + esc(item.name) + '</span></div>';
        } else if (catalogKey === 'content_borders') {
            visual = '<div class="inv-frame-sample inv-frame-box' + RWL.frameClasses(item) + '" style="' + esc(RWL.frameStyle(Object.assign({}, item, { speed: settings.speed }))) + '"><span></span><span></span><span></span></div>';
        } else {
            visual = '<div class="inv-slot-text">' + esc(item.name) + '</div>';
        }
        return '<div class="' + classes + '" style="' + KEEP_STYLE + 'border-color:' + esc(RWL.rarityColor(item.rarity)) + ';" data-item-id="' + esc(item.item_id) + '" data-owned="' + (owned ? '1' : '0') + '" data-new-key="' + esc(catalogKey) + '" data-new-id="' + esc(item.item_id) + '" title="' + esc(item.name + ' · ' + item.rarity + (owned ? (equipped ? ' · Equipped' : ' · Click to equip') : ' · Locked')) + '">' +
            '<div class="rwl-rarity-banner" style="' + KEEP_STYLE + 'background:' + esc(RWL.rarityColor(item.rarity)) + ';">' + esc(item.rarity) + '</div>' +
            '<div class="inv-item-visual">' + visual + '</div>' +
            '<div class="inv-item-name" translate="no">' + esc(item.name) + '</div>' +
            (owned && item.animated && CONFIGURABLE_CATALOGS[catalogKey] && !item.is_default ? '<button type="button" class="inv-item-config" data-config-item="' + esc(item.item_id) + '" title="Change the playback speed' + (catalogKey === 'name_colors' ? ' and direction' : '') + '" aria-label="Item settings">⚙</button>' : '') +
            (equipped ? '<div class="inv-item-badge">Equipped</div>' : '') +
            (fresh ? '<div class="inv-item-new">NEW</div>' : '') +
            (owned ? '' : '<div class="inv-item-lock">' + LOCK_SVG + '</div>') +
        '</div>';
    }

    function itemSettings(catalogKey, itemId) {
        var stored = ((state.inventory && state.inventory.cosmetic_settings) || {})[catalogKey + ':' + itemId];
        return {
            speed: stored && stored.speed ? Math.max(0.5, Math.min(2, parseFloat(stored.speed) || 1)) : 1,
            direction: stored && stored.direction ? stored.direction : 'ltr'
        };
    }

    function cosmeticGrids(categoryId) {
        var cosmetic = COSMETIC_CATEGORIES[categoryId];
        var catalog = state.catalogs[cosmetic.catalog];
        var owned = ownedSet(cosmetic.catalog);
        var fresh = newSet(cosmetic.catalog);
        var ownedItems = catalog.items.filter(function(item) { return isOwned(cosmetic.catalog, item.item_id, owned); });
        ownedItems.sort(function(left, right) { return (fresh[right.item_id] ? 1 : 0) - (fresh[left.item_id] ? 1 : 0); });
        var isThemes = cosmetic.catalog === 'launcher_themes';
        var leading = isThemes ? [DEFAULT_THEME] : [];
        var emptyText = catalog.items.length ? 'No ' + cosmetic.label.toLowerCase() + 's yet. Open Mystery Chests or progress the Lab-Pass to unlock them.' : 'No ' + cosmetic.label.toLowerCase() + 's are available yet.';
        return {
            ownedItems: leading.concat(ownedItems),
            indexItems: leading.concat(catalog.items),
            emptyOwned: ownedItems.length || leading.length ? '' : emptyText,
            emptyIndex: catalog.items.length || leading.length ? '' : emptyText,
            ownedCount: ownedItems.length,
            total: catalog.items.length
        };
    }

    function slotForItem(cosmetic, item, cache) {
        var owned = cache.owned;
        var equippedId = ((state.inventory && state.inventory.equipped) || {})[cosmetic.field];
        var fresh = cache.fresh;
        if (item.is_default) return cosmeticSlotHtml(cosmetic.catalog, item, true, !equippedId, false);
        var has = isOwned(cosmetic.catalog, item.item_id, owned);
        return cosmeticSlotHtml(cosmetic.catalog, item, has, has && item.item_id === equippedId, has && !!fresh[item.item_id]);
    }

    function VirtualGrid(viewport, items, cosmetic) {
        this.viewport = viewport;
        this.items = items;
        this.cosmetic = cosmetic;
        this.layout = GRID_LAYOUTS[cosmetic.catalog] || { minWidth: 118, height: 124 };
        this.columns = 1;
        this.renderedStart = -1;
        this.renderedEnd = -1;
        this.frame = null;
        this.spacer = document.createElement('div');
        this.spacer.className = 'inv-virtual-spacer';
        this.layer = document.createElement('div');
        this.layer.className = 'inv-slots-grid inv-virtual-layer';
        this.spacer.appendChild(this.layer);
        viewport.innerHTML = '';
        viewport.appendChild(this.spacer);
        var self = this;
        this.onScroll = function() { self.schedule(); };
        viewport.addEventListener('scroll', this.onScroll, { passive: true });
        if (global.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(function() { self.measure(); self.schedule(true); });
            this.resizeObserver.observe(viewport);
        }
        this.measure();
        this.render(true);
    }

    VirtualGrid.prototype.measure = function() {
        var width = this.viewport.clientWidth - 16;
        if (width <= 0) return;
        this.columns = Math.max(1, Math.floor((width + GRID_GAP) / (this.layout.minWidth + GRID_GAP)));
        var columnWidth = (width - GRID_GAP * (this.columns - 1)) / this.columns;
        var slotHeight = this.layout.mediaRatio ? Math.ceil(columnWidth / this.layout.mediaRatio) + this.layout.chromeHeight : this.layout.height;
        this.rowHeight = slotHeight + GRID_GAP;
        this.layer.style.gridTemplateColumns = 'repeat(' + this.columns + ', minmax(0, 1fr))';
        this.layer.style.gridAutoRows = slotHeight + 'px';
        var rows = Math.ceil(this.items.length / this.columns);
        this.spacer.style.height = Math.max(0, rows * this.rowHeight - GRID_GAP) + 'px';
    };

    VirtualGrid.prototype.schedule = function(force) {
        var self = this;
        if (force) this.renderedStart = -1;
        if (this.frame) return;
        this.frame = global.requestAnimationFrame(function() {
            self.frame = null;
            self.render(false);
        });
    };

    VirtualGrid.prototype.render = function(force) {
        if (!this.viewport.offsetParent) return;
        if (force || !this.rowHeight) this.measure();
        if (!this.rowHeight) return;
        var firstRow = Math.max(0, Math.floor(this.viewport.scrollTop / this.rowHeight) - GRID_BUFFER_ROWS);
        var visibleRows = Math.ceil(this.viewport.clientHeight / this.rowHeight) + GRID_BUFFER_ROWS * 2 + 1;
        var start = firstRow * this.columns;
        var end = Math.min(this.items.length, start + visibleRows * this.columns);
        if (!force && start === this.renderedStart && end === this.renderedEnd) return;
        this.renderedStart = start;
        this.renderedEnd = end;
        this.layer.style.transform = 'translateY(' + (firstRow * this.rowHeight) + 'px)';
        var html = '';
        var cache = { owned: ownedSet(this.cosmetic.catalog), fresh: newSet(this.cosmetic.catalog) };
        for (var index = start; index < end; index++) html += slotForItem(this.cosmetic, this.items[index], cache);
        releaseMedia(this.layer);
        this.layer.innerHTML = html;
        var slots = this.layer.querySelectorAll('.inv-slot');
        for (var position = 0; position < slots.length; position++) activateSlotMedia(slots[position]);
    };

    VirtualGrid.prototype.refresh = function() {
        this.render(true);
    };

    VirtualGrid.prototype.destroy = function() {
        this.viewport.removeEventListener('scroll', this.onScroll);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.frame) global.cancelAnimationFrame(this.frame);
        releaseMedia(this.layer);
    };

    function releaseMedia(root) {
        var videos = root.querySelectorAll('video');
        for (var index = 0; index < videos.length; index++) {
            videos[index].pause();
            videos[index].removeAttribute('src');
            videos[index].load();
        }
    }

    function destroyGrids() {
        activeGrids.forEach(function(grid) { grid.destroy(); });
        activeGrids = [];
    }

    function mountVirtualGrid(panelName, items, cosmetic, emptyText) {
        var panel = document.querySelector('.inv-tab-panel[data-tab-panel="' + panelName + '"] .inv-slots-viewport');
        if (!panel) return;
        if (emptyText) {
            panel.innerHTML = '<div class="inv-slots-grid">' + emptyNote(emptyText) + '</div>';
            return;
        }
        activeGrids.push(new VirtualGrid(panel, items, cosmetic));
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

    function chestActionsHtml() {
        var chests = chestSummary();
        var empty = !chests.unlimited && !chests.balance;
        var html = '<div class="inv-chest-actions">';
        html += '<button type="button" class="inv-chest-action-btn" data-chest-open="1"' + (empty ? ' disabled' : '') + ' title="Open one chest with the double spin">Open Chest</button>';
        if (!chests.unlimited) html += '<button type="button" class="inv-chest-action-btn inv-chest-action-secondary" data-chest-open-all="1"' + (empty || state.openingAll ? ' disabled' : '') + ' title="Open all your chests at once without animation">' + (state.openingAll ? 'Opening...' : 'Open Max') + '</button>';
        html += '</div>';
        return html;
    }

    function openAllSummaryHtml() {
        var result = state.openAllResult;
        if (!result) return '';
        var html = '<div class="inv-open-all-summary">';
        html += '<div class="inv-open-all-title">' + esc(formatNumber(result.opened)) + ' chests opened' + (result.lab_coins_awarded ? ' · +' + esc(formatNumber(result.lab_coins_awarded)) + ' LC' : '') + '</div>';
        html += '<div class="inv-open-all-grid">';
        (result.rewards || []).forEach(function(reward) {
            var note = reward.duplicate ? (reward.compensation_lab_coins ? 'Duplicate · +' + reward.compensation_lab_coins + ' LC' : 'Duplicate · already owned') : (reward.voucher ? 'Voucher in Special Items' : 'Added to your locker');
            html += '<div class="inv-open-all-entry" style="' + KEEP_STYLE + 'border-color:' + esc(RWL.rarityColor(reward.rarity)) + ';">';
            html += '<strong translate="no">' + esc(reward.name || 'Item') + '</strong>';
            html += '<span style="' + KEEP_STYLE + 'color:' + esc(RWL.rarityColor(reward.rarity)) + ';">' + esc(reward.rarity || '') + '</span>';
            html += '<span>' + esc(reward.category_label || '') + '</span>';
            html += '<span>' + esc(note) + '</span>';
            html += '</div>';
        });
        html += '</div></div>';
        return html;
    }

    async function openAllChests() {
        if (state.openingAll) return;
        state.openingAll = true;
        if (state.activeCategory === 'mystery-chests') renderCategoryModal('mystery-chests', true);
        try {
            var result = await RWL.apiRequest('/api/chests/open_all', { method: 'POST' });
            state.openAllResult = result;
            toast(formatNumber(result.opened) + ' chests opened. Your rewards were added to your inventory.', 'success');
        } catch (error) {
            toast(error.status === 429 ? 'You are opening chests too fast. Please wait a moment.' : (error.message || 'The chests could not be opened.'), 'error');
        } finally {
            state.openingAll = false;
        }
        await refreshInventory();
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
        html += '<div class="inv-drop-rates-note">Every roll happens on our server. Each chest first spins the category and then the item inside that category. Category chance × rarity chance = overall chance. Duplicates are converted into Lab Coins. License drops arrive as vouchers in Special Items and can be redeemed for any paid product. New accounts receive 1 chest, Unlock All accounts receive 10 chests once, more chests are earned through the Lab-Pass.</div>';
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
        var fresh = newSet('reward_coupons');
        return list.map(function(entry) {
            var status = entry.active ? 'Active' : (entry.used ? 'Used' : 'Expired');
            var color = entry.active ? '#22c55e' : '#9ca3af';
            var isFresh = !!fresh[entry.code];
            return '<div class="inv-slot inv-slot-item inv-slot-wide' + (entry.active ? '' : ' inv-slot-locked') + (isFresh ? ' inv-slot-new' : '') + '" data-copy="' + esc(entry.code) + '" data-new-key="reward_coupons" data-new-id="' + esc(entry.code) + '" title="Click to copy the coupon code" style="border-color:' + color + ';">' +
                '<div class="inv-slot-text"><strong>' + esc(String(entry.percent)) + '% OFF</strong><br>' + esc(entry.code) + '<br><span style="color:' + color + ';">' + status + '</span>' + (entry.valid_until ? ' · until ' + esc(new Date(entry.valid_until).toLocaleDateString()) : '') + '</div>' +
                (isFresh ? '<div class="inv-item-new">NEW</div>' : '') +
            '</div>';
        }).join('');
    }

    function voucherSlotsHtml(onlyActive) {
        var vouchers = (state.inventory && state.inventory.license_vouchers) || [];
        var list = onlyActive ? activeVouchers() : vouchers;
        if (!list.length) return emptyNote(onlyActive ? 'No special items yet. License vouchers are earned through the Lab-Pass and Mystery Chests.' : 'No special items yet.');
        var fresh = newSet('license_vouchers');
        list = list.slice().sort(function(left, right) { return (fresh[right.voucher_id] ? 1 : 0) - (fresh[left.voucher_id] ? 1 : 0); });
        return list.map(function(voucher) {
            var redeemable = !voucher.redeemed && !voucher.expired;
            var status = voucher.redeemed ? 'Redeemed' : (voucher.expired ? 'Expired' : 'Click to redeem');
            var isFresh = !!fresh[voucher.voucher_id];
            return '<div class="inv-slot inv-slot-item inv-slot-wide' + (redeemable ? '' : ' inv-slot-locked') + (isFresh ? ' inv-slot-new' : '') + '"' + (redeemable ? ' data-voucher-id="' + esc(voucher.voucher_id) + '"' : '') + ' data-new-key="license_vouchers" data-new-id="' + esc(voucher.voucher_id) + '" title="' + esc(voucher.label) + '" style="border-color:' + (redeemable ? '#c97eff' : '#6b7280') + ';">' +
                '<div class="inv-slot-text"><strong>' + esc(voucher.label) + '</strong><br>' + esc(status) + (voucher.expires_at && redeemable ? '<br>until ' + esc(new Date(voucher.expires_at).toLocaleDateString()) : '') + '</div>' +
                (isFresh ? '<div class="inv-item-new">NEW</div>' : '') +
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
                    if (isActive) {
                        observeSlots(panels[k]);
                        activeGrids.forEach(function(grid) { grid.schedule(true); });
                    }
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
            media.preload = 'metadata';
            media.autoplay = true;
            media.src = source;
            var startPlayback = media.play();
            if (startPlayback && startPlayback.catch) startPlayback.catch(function() {});
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
                if (e.data && e.data.interrupted) toast('Your chest was opened anyway. The reward was added to your inventory.', 'success');
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
        destroyGrids();
        hideHoverPreview();
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
            bodyEl.innerHTML = tabbedBodyHtml('', '') + '<div class="inv-config-bar" id="invConfigBar" hidden></div>';
            setupModalTabEvents(bodyEl);
            mountVirtualGrid('owned', grids.ownedItems, cosmetic, grids.emptyOwned);
            mountVirtualGrid('index', grids.indexItems, cosmetic, grids.emptyIndex);
            restoreTab(bodyEl, previousTab);
            activeGrids.forEach(function(grid) { grid.schedule(true); });
            return;
        } else if (categoryId === 'mystery-chests') {
            var chests = chestSummary();
            modalHeader(cat, chests.unlimited ? 'Unlimited chests' : formatNumber(chests.balance || 0) + (chests.balance === 1 ? ' chest available' : ' chests available'));
            bodyEl.innerHTML = tabbedBodyHtml(chestSlotHtml(true) + chestActionsHtml() + openAllSummaryHtml(), chestSlotHtml(false) + dropRatesHtml(), 'Owned', 'Drop Rates');
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
        state.openAllResult = null;
        destroyGrids();
        hideHoverPreview();
    }

    async function copyText(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            toast(label + ' copied to clipboard.', 'success');
        } catch (error) {
            toast('Copy failed. Please copy it manually: ' + text, 'error');
        }
    }

    function selectedConfigItem(itemId) {
        var cosmetic = COSMETIC_CATEGORIES[state.activeCategory];
        var catalog = cosmetic && state.catalogs[cosmetic.catalog];
        return catalog ? catalog.byId[itemId] : null;
    }

    function openConfigBar(itemId) {
        var bar = document.getElementById('invConfigBar');
        var cosmetic = COSMETIC_CATEGORIES[state.activeCategory];
        var item = selectedConfigItem(itemId);
        if (!bar || !cosmetic || !item) return;
        var settings = itemSettings(cosmetic.catalog, itemId);
        var directionHtml = '';
        if (cosmetic.catalog === 'name_colors') {
            directionHtml = '<label class="inv-config-field"><span>Direction</span><select id="invConfigDirection" title="Choose the direction of the animation">' + Object.keys(DIRECTION_LABELS).map(function(key) {
                return '<option value="' + key + '"' + (key === settings.direction ? ' selected' : '') + '>' + esc(DIRECTION_LABELS[key]) + '</option>';
            }).join('') + '</select></label>';
        }
        bar.innerHTML = '<div class="inv-config-name" translate="no">' + esc(item.name) + '</div>' +
            '<label class="inv-config-field"><span>Speed <strong id="invConfigSpeedValue">' + settings.speed.toFixed(2) + 'x</strong></span><input type="range" id="invConfigSpeed" min="0.5" max="2" step="0.25" value="' + settings.speed + '" title="Slower or faster playback"></label>' +
            directionHtml +
            '<button type="button" class="inv-chest-action-btn" id="invConfigSave" title="Save these settings, they apply everywhere">Save</button>' +
            '<button type="button" class="inv-chest-action-btn inv-chest-action-secondary" id="invConfigClose" title="Close the settings">Close</button>';
        bar.hidden = false;
        bar.setAttribute('data-item-id', itemId);
        var speedInput = bar.querySelector('#invConfigSpeed');
        speedInput.addEventListener('input', function() {
            bar.querySelector('#invConfigSpeedValue').textContent = parseFloat(speedInput.value).toFixed(2) + 'x';
        });
        bar.querySelector('#invConfigClose').addEventListener('click', function() { bar.hidden = true; });
        bar.querySelector('#invConfigSave').addEventListener('click', function(event) { saveConfig(itemId, cosmetic, event.currentTarget); });
    }

    async function saveConfig(itemId, cosmetic, button) {
        var bar = document.getElementById('invConfigBar');
        var directionInput = bar.querySelector('#invConfigDirection');
        var payload = { category: cosmetic.catalog, item_id: itemId, speed: parseFloat(bar.querySelector('#invConfigSpeed').value) };
        if (directionInput) payload.direction = directionInput.value;
        button.disabled = true;
        try {
            var result = await RWL.apiRequest('/api/cosmetics/settings', { method: 'POST', body: payload });
            var stored = state.inventory.cosmetic_settings = state.inventory.cosmetic_settings || {};
            stored[cosmetic.catalog + ':' + itemId] = result.settings;
            state.inventory.equipped_cosmetics = result.equipped_cosmetics || state.inventory.equipped_cosmetics;
            if (window.RWLTheme && cosmetic.catalog === 'launcher_themes') RWLTheme.sync(state.inventory.equipped_cosmetics || {});
            activeGrids.forEach(function(grid) { grid.refresh(); });
            renderEquippedPanel();
            bar.hidden = true;
            toast('Saved. The settings apply everywhere.', 'success');
        } catch (error) {
            toast(error.message || 'The settings could not be saved.', 'error');
        } finally {
            button.disabled = false;
        }
    }

    function hoverPreviewBox() {
        if (previewBox) return previewBox;
        previewBox = document.createElement('div');
        previewBox.className = 'inv-hover-preview';
        previewBox.hidden = true;
        document.body.appendChild(previewBox);
        return previewBox;
    }

    function positionPreview(slot, width, height) {
        var box = hoverPreviewBox();
        var rect = slot.getBoundingClientRect();
        var left = rect.right + 12;
        if (left + width > window.innerWidth - 10) left = Math.max(10, rect.left - width - 12);
        var top = Math.max(10, Math.min(window.innerHeight - height - 10, rect.top + rect.height / 2 - height / 2));
        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.width = width + 'px';
    }

    function postThemePreview(theme) {
        pendingPreviewTheme = theme;
        if (!themeFrame || !themeFrameReady || !themeFrame.contentWindow) return;
        themeFrame.contentWindow.postMessage({ type: 'rwl_theme_preview', theme: theme }, window.location.origin);
    }

    function themeFrameElement() {
        if (themeFrame) return themeFrame;
        themeFrame = document.createElement('iframe');
        themeFrame.className = 'inv-theme-frame';
        themeFrame.title = 'Theme preview';
        themeFrame.setAttribute('tabindex', '-1');
        themeFrame.setAttribute('aria-hidden', 'true');
        themeFrame.width = THEME_PREVIEW_WIDTH;
        themeFrame.height = THEME_PREVIEW_HEIGHT;
        themeFrame.src = '../index.html?rwl_preview=1';
        themeFrame.addEventListener('load', function() {
            themeFrameReady = true;
            postThemePreview(pendingPreviewTheme);
        });
        return themeFrame;
    }

    function showThemePreview(slot, item) {
        var box = hoverPreviewBox();
        var width = Math.round(THEME_PREVIEW_WIDTH * THEME_PREVIEW_SCALE);
        var height = Math.round(THEME_PREVIEW_HEIGHT * THEME_PREVIEW_SCALE);
        var frame = themeFrameElement();
        if (frame.parentNode !== box) {
            box.innerHTML = '';
            var holder = document.createElement('div');
            holder.className = 'inv-theme-frame-holder';
            holder.style.height = height + 'px';
            holder.appendChild(frame);
            box.appendChild(holder);
            var caption = document.createElement('div');
            caption.className = 'inv-hover-caption';
            box.appendChild(caption);
        }
        frame.style.transform = 'scale(' + THEME_PREVIEW_SCALE + ')';
        box.querySelector('.inv-hover-caption').textContent = item.name;
        box.hidden = false;
        positionPreview(slot, width, height + 30);
        postThemePreview(item.is_default ? null : item);
    }

    function profileStripHtml(cosmetics) {
        var account = (state.inventory && state.inventory.account_preview) || {};
        var username = account.username || 'Username';
        var avatar = account.profile_picture_url || '';
        var outlineData = cosmetics.nameplate_outline_data;
        var outlineClass = RWL.frameClasses(outlineData);
        var outlineStyle = outlineData ? ' style="' + esc(RWL.frameStyle(outlineData)) + '"' : '';
        var plate = cosmetics.nameplate_url ? '<video class="inv-strip-plate" autoplay loop muted playsinline data-rwl-speed="' + (cosmetics.nameplate_speed || 1) + '" src="' + esc(cosmetics.nameplate_url) + '"></video>' : '';
        var picture = avatar ? '<img class="inv-strip-avatar" src="' + esc(avatar) + '" alt="">' : '<div class="inv-strip-avatar inv-strip-initial">' + esc(username.charAt(0).toUpperCase()) + '</div>';
        var decoration = cosmetics.avatar_decoration_url ? '<img class="inv-strip-deco" src="' + esc(cosmetics.avatar_decoration_url) + '" alt="">' : '';
        var permission = account.account_permissions ? '<span class="inv-strip-badge inv-strip-perm">' + esc(account.account_permissions) + '</span>' : '';
        return '<div class="inv-profile-strip' + outlineClass + '"' + outlineStyle + '>' + plate +
            '<div class="inv-strip-avatar-wrap">' + picture + decoration + '</div>' +
            '<div class="inv-strip-text"><span class="inv-strip-name" style="' + esc(RWL.nameColorStyle(cosmetics, '#ffffff')) + '" translate="no">' + esc(username) + '</span>' +
            '<div class="inv-strip-badges"><span class="inv-strip-badge">' + esc(account.account_type || 'User') + '</span>' + permission + '</div></div></div>';
    }

    function previewCosmetics(catalogKey, item) {
        var equipped = Object.assign({}, (state.inventory && state.inventory.equipped_cosmetics) || {});
        var settings = itemSettings(catalogKey, item.item_id);
        if (catalogKey === 'nameplates') {
            equipped.nameplate_url = item.asset_url;
            equipped.nameplate_speed = settings.speed;
        } else if (catalogKey === 'avatar_decorations') {
            equipped.avatar_decoration_url = item.thumb_url || item.asset_url;
        } else if (catalogKey === 'name_colors') {
            equipped.name_color_hex = item.hex;
            equipped.name_color_animated = !!(item.animated && item.gradient);
            equipped.name_color_gradient = item.gradient;
            equipped.name_color_animation_seconds = item.animation_seconds;
            equipped.name_color_effect = item.effect;
            equipped.name_color_speed = settings.speed;
            equipped.name_color_direction = settings.direction;
        } else if (catalogKey === 'nameplate_outlines') {
            equipped.nameplate_outline_data = Object.assign({}, item, { speed: settings.speed });
        }
        return equipped;
    }

    function showProfilePreview(slot, catalogKey, item) {
        var box = hoverPreviewBox();
        if (themeFrame && themeFrame.parentNode) themeFrame.parentNode.removeChild(themeFrame);
        themeFrameReady = false;
        themeFrame = null;
        if (catalogKey === 'content_borders') {
            var frameStyle = esc(RWL.frameStyle(Object.assign({}, item, { speed: itemSettings(catalogKey, item.item_id).speed })));
            box.innerHTML = '<div class="inv-border-demo' + RWL.frameClasses(item) + '" style="' + frameStyle + '"><strong translate="no">' + esc(item.name) + '</strong><span>Reviews, forum posts, comments and replies use this border.</span></div>';
        } else {
            box.innerHTML = profileStripHtml(previewCosmetics(catalogKey, item));
        }
        box.hidden = false;
        positionPreview(slot, 340, 100);
    }

    function hideHoverPreview() {
        clearTimeout(hoverTimer);
        hoverTimer = null;
        if (previewBox) {
            previewBox.hidden = true;
            var strip = previewBox.querySelector('video');
            if (strip) {
                strip.pause();
                strip.removeAttribute('src');
                strip.load();
            }
        }
    }

    function setupHoverPreview() {
        var bodyEl = document.getElementById('invModalBody');
        if (!bodyEl || !window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
        bodyEl.addEventListener('mouseover', function(event) {
            var slot = event.target.closest('.inv-slot-item[data-item-id]');
            if (!slot || slot.contains(event.relatedTarget)) return;
            var cosmetic = COSMETIC_CATEGORIES[state.activeCategory];
            if (!cosmetic) return;
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(function() {
                var itemId = slot.getAttribute('data-item-id');
                var catalog = state.catalogs[cosmetic.catalog];
                var item = itemId === DEFAULT_THEME_ID ? DEFAULT_THEME : (catalog && catalog.byId[itemId]);
                if (!item || !slot.isConnected) return;
                if (cosmetic.catalog === 'launcher_themes') {
                    if (!document.documentElement.classList.contains('rwl-low-fx')) showThemePreview(slot, item);
                } else {
                    showProfilePreview(slot, cosmetic.catalog, item);
                }
            }, HOVER_DELAY_MS);
        });
        bodyEl.addEventListener('mouseout', function(event) {
            var slot = event.target.closest('.inv-slot-item[data-item-id]');
            if (slot && !slot.contains(event.relatedTarget)) hideHoverPreview();
        });
        bodyEl.addEventListener('scroll', hideHoverPreview, { passive: true, capture: true });
    }

    function updateEquippedSlots(bodyEl, field, itemId) {
        bodyEl.querySelectorAll('.inv-slot-equipped').forEach(function(slot) {
            slot.classList.remove('inv-slot-equipped');
            var badge = slot.querySelector('.inv-item-badge');
            if (badge) badge.remove();
        });
        if (!itemId && field === 'launcher_theme') itemId = DEFAULT_THEME_ID;
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
        if (itemId === DEFAULT_THEME_ID && !equipped[cosmetic.field]) {
            toast('The default theme is already active.', 'success');
            return;
        }
        var nextValue = (itemId === DEFAULT_THEME_ID || equipped[cosmetic.field] === itemId) ? '' : itemId;
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
            if (cosmetic.field === 'launcher_theme' && window.RWLTheme) RWLTheme.sync(state.inventory.equipped_cosmetics || {});
            activeGrids.forEach(function(grid) { grid.refresh(); });
            renderEquippedPanel();
            if (itemId === DEFAULT_THEME_ID) toast('The default theme is active again.', 'success');
            else toast((nextValue ? 'Equipped ' : 'Unequipped ') + itemName(cosmetic.catalog, itemId) + '.', 'success');
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
            var configButton = e.target.closest('[data-config-item]');
            if (configButton) {
                e.stopPropagation();
                openConfigBar(configButton.getAttribute('data-config-item'));
                return;
            }
            if (e.target.closest('#invConfigBar')) return;
            if (e.target.closest('[data-voucher-back]')) {
                renderCategoryModal('special-items', false);
                return;
            }
            var openAllButton = e.target.closest('[data-chest-open-all]');
            if (openAllButton) {
                if (!openAllButton.disabled) openAllChests();
                return;
            }
            var chestSlot = e.target.closest('[data-chest-slot],[data-chest-open]');
            if (chestSlot) {
                var chests = chestSummary();
                if (!chests.enabled && chests.enabled !== undefined) { toast('Mystery Chests are currently disabled.', 'error'); return; }
                if (!chests.unlimited && !chests.balance) { toast('You have no Mystery Chests left. Earn more chests through the Lab-Pass.', 'info'); return; }
                openChestIframe();
                return;
            }
            var freshSlot = e.target.closest('[data-new-key][data-new-id]');
            if (freshSlot) markSeen(freshSlot.getAttribute('data-new-key'), freshSlot.getAttribute('data-new-id'));
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
        state.newItems = state.inventory.new_items || {};
        if (window.RWLTheme) RWLTheme.sync(state.inventory.equipped_cosmetics || {});
        renderGrids();
        renderHeaderStats();
        renderEquippedPanel();
        if (state.activeCategory) renderCategoryModal(state.activeCategory, true);
        ['launcher_themes', 'avatar_decorations', 'nameplates', 'name_colors', 'nameplate_outlines', 'content_borders'].forEach(function(catalogKey) {
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
        setupHoverPreview();
        setupCardEvents();
        setupViewAllButton();
        setupLabPassButtons();
        setupChestIframeEvents();
        window.addEventListener('pagehide', function() { flushSeen(true); });
        checkAuthAndInit();
    });
})(window);
