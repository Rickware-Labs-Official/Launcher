(function() {
    var API_BASE_RAW = 'http://prem-eu4.bot-hosting.net:20940';
    var CF_WORKER = 'https://rickware-labs-launcher.reissdonavan.workers.dev';

    function apiUrl(path) {
        if (window.location.protocol === 'https:') {
            return CF_WORKER + path;
        }
        return API_BASE_RAW + path;
    }

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

    var SLOT_COUNTS = {
        'default': { owned: 10, index: 10 },
        'name-colors': { owned: 4943, index: 4943 },
        'mystery-chests': { owned: 10, index: 10 }
    };

    var userItems = {};
    var equippedItems = {};

    function getChestCount() {
        var val = parseInt(sessionStorage.getItem('inv_chest_count'), 10);
        if (isNaN(val)) {
            val = 100;
            sessionStorage.setItem('inv_chest_count', val);
        }
        return val;
    }

    function setChestCount(val) {
        sessionStorage.setItem('inv_chest_count', val);
    }

    function getEmptySlotSvg() {
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>';
    }

    function renderCategoryCard(cat) {
        var items = userItems[cat.id] || [];
        var html = '<div class="inv-category-card" data-category="' + cat.id + '">';
        html += '<div class="inv-category-count">' + items.length + '</div>';
        html += '<img class="inv-category-image" src="../images/assets/inventory/' + cat.image + '" alt="' + cat.name + '" loading="lazy">';
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

        var lockerOnly = lockerCategories.filter(function(c) { return c.section === 'locker'; });

        var html = lockerOnly.map(function(cat) {
            var equippedName = equippedItems[cat.id];
            var valueClass = equippedName ? 'inv-equipped-row-value' : 'inv-equipped-row-value inv-equipped-none';
            var valueText = equippedName ? equippedName : 'Not Equipped';
            var row = '<div class="inv-equipped-row">';
            row += '<div class="inv-equipped-row-icon">' + cat.icon.replace('width="32" height="32"', 'width="14" height="14"') + '</div>';
            row += '<div class="inv-equipped-row-text">';
            row += '<div class="inv-equipped-row-label">' + cat.name + '</div>';
            row += '<div class="' + valueClass + '">' + valueText + '</div>';
            row += '</div>';
            row += '</div>';
            return row;
        }).join('');

        listEl.innerHTML = html;
    }

    function buildSlotsHtml(categoryId, tab) {
        var counts = SLOT_COUNTS[categoryId] || SLOT_COUNTS['default'];
        var count = tab === 'owned' ? counts.owned : counts.index;
        var slotSvg = getEmptySlotSvg();
        var parts = [];

        if (categoryId === 'mystery-chests' && tab === 'owned') {
            var chestCount = getChestCount();
            var chestSlot = '<div class="inv-slot inv-slot-chest" data-chest-slot="1" title="Normal Epic Chest">';
            chestSlot += '<div class="inv-chest-slot-inner">';
            chestSlot += '<img src="../images/assets/lab_pass/rickware-labs_chest.webp" alt="Normal Epic Chest" class="inv-chest-img">';
            chestSlot += '<div class="inv-chest-count-badge" id="invChestCountBadge">' + chestCount + '</div>';
            chestSlot += '<div class="inv-chest-hover-desc">Normal Epic Chest</div>';
            chestSlot += '</div>';
            chestSlot += '</div>';
            parts.push(chestSlot);
            for (var i = 1; i < count; i++) {
                parts.push('<div class="inv-slot">' + slotSvg + '</div>');
            }
        } else if (categoryId === 'mystery-chests' && tab === 'index') {
            var chestIndexSlot = '<div class="inv-slot inv-slot-chest" data-chest-index-slot="1" title="Normal Epic Chest">';
            chestIndexSlot += '<div class="inv-chest-slot-inner">';
            chestIndexSlot += '<img src="../images/assets/lab_pass/rickware-labs_chest.webp" alt="Normal Epic Chest" class="inv-chest-img">';
            chestIndexSlot += '<div class="inv-chest-hover-desc">Normal Epic Chest</div>';
            chestIndexSlot += '</div>';
            chestIndexSlot += '</div>';
            parts.push(chestIndexSlot);
            for (var j = 1; j < count; j++) {
                parts.push('<div class="inv-slot">' + slotSvg + '</div>');
            }
        } else {
            for (var k = 0; k < count; k++) {
                parts.push('<div class="inv-slot">' + slotSvg + '</div>');
            }
        }

        return parts.join('');
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
                    panels[k].classList.toggle('inv-tab-panel-active', panels[k].getAttribute('data-tab-panel') === target);
                }
            });
        }
    }

    function setupSlotObserver(viewport) {
        var slots = viewport.querySelectorAll('.inv-slot');
        if (!('IntersectionObserver' in window)) {
            for (var i = 0; i < slots.length; i++) {
                slots[i].classList.add('inv-slot-visible');
            }
            return;
        }
        var observer = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('inv-slot-visible');
                    observer.unobserve(entries[i].target);
                }
            }
        }, { root: viewport, rootMargin: '60px 0px', threshold: 0.1 });
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

    function closeChestIframe() {
        var overlay = document.getElementById('invChestIframeOverlay');
        var iframe = document.getElementById('invChestIframe');
        if (!overlay || !iframe) return;
        overlay.classList.remove('inv-chest-open');
        iframe.src = '';
        document.body.style.overflow = '';

        var current = getChestCount();
        if (current > 0) {
            setChestCount(current - 1);
        }
        var badge = document.getElementById('invChestCountBadge');
        if (badge) badge.textContent = getChestCount();
    }

    function setupChestIframeEvents() {
        window.addEventListener('message', function(e) {
            if (e.data === 'chest_opening_done') {
                closeChestIframe();
            }
        });
    }

    function setupChestSlotClick(container) {
        container.addEventListener('click', function(e) {
            var slot = e.target.closest('[data-chest-slot]');
            if (!slot) return;
            var count = getChestCount();
            if (count <= 0) return;
            openChestIframe();
        });
    }

    function openCategoryModal(categoryId) {
        var cat = lockerCategories.filter(function(c) { return c.id === categoryId; })[0];
        if (!cat) return;

        var overlay = document.getElementById('invModalOverlay');
        var titleEl = document.getElementById('invModalTitle');
        var subtitleEl = document.getElementById('invModalSubtitle');
        var iconEl = document.getElementById('invModalIcon');
        var bodyEl = document.getElementById('invModalBody');
        if (!overlay || !titleEl || !subtitleEl || !iconEl || !bodyEl) return;

        var items = userItems[cat.id] || [];

        titleEl.textContent = cat.name;
        iconEl.innerHTML = cat.icon;
        subtitleEl.textContent = items.length + (items.length === 1 ? ' item owned' : ' items owned');

        var ownedSlotsHtml = buildSlotsHtml(categoryId, 'owned');
        var indexSlotsHtml = buildSlotsHtml(categoryId, 'index');
        var bodyHtml = '';
        bodyHtml += '<div class="inv-modal-tabs">';
        bodyHtml += '<button type="button" class="inv-modal-tab inv-modal-tab-active" data-tab="owned">Owned</button>';
        bodyHtml += '<button type="button" class="inv-modal-tab" data-tab="index">Index</button>';
        bodyHtml += '</div>';
        bodyHtml += '<div class="inv-modal-tab-panels">';
        bodyHtml += '<div class="inv-tab-panel inv-tab-panel-active" data-tab-panel="owned"><div class="inv-slots-viewport"><div class="inv-slots-grid">' + ownedSlotsHtml + '</div></div></div>';
        bodyHtml += '<div class="inv-tab-panel" data-tab-panel="index"><div class="inv-slots-viewport"><div class="inv-slots-grid">' + indexSlotsHtml + '</div></div></div>';
        bodyHtml += '</div>';

        bodyEl.innerHTML = bodyHtml;

        setupModalTabEvents(bodyEl);
        observeSlots(bodyEl);

        if (categoryId === 'mystery-chests') {
            setupChestSlotClick(bodyEl);
        }

        overlay.classList.add('inv-open');
        document.body.style.overflow = 'hidden';
    }

    function closeCategoryModal() {
        var overlay = document.getElementById('invModalOverlay');
        if (!overlay) return;
        overlay.classList.remove('inv-open');
        document.body.style.overflow = '';
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
            var categoryId = card.getAttribute('data-category');
            openCategoryModal(categoryId);
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

    async function fetchUserItems(token) {
        try {
            var res = await fetch(apiUrl('/api/inventory'), {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                var data = await res.json();
                return {
                    items: data.items || data.inventory || {},
                    equipped: data.equipped || {}
                };
            }
        } catch (e) {}
        return { items: {}, equipped: {} };
    }

    async function initInventoryData(token) {
        var fetched = await fetchUserItems(token);
        if (fetched && typeof fetched === 'object') {
            userItems = fetched.items || {};
            equippedItems = fetched.equipped || {};
        }
        renderGrids();
        renderEquippedPanel();
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
        var token = sessionStorage.getItem('rickware_token');
        if (!token) {
            redirectToLogin();
            return;
        }
        var parts = token.split('.');
        if (parts.length !== 3) {
            sessionStorage.removeItem('rickware_token');
            redirectToLogin();
            return;
        }
        try {
            JSON.parse(atob(parts[1]));
        } catch (e) {
            sessionStorage.removeItem('rickware_token');
            redirectToLogin();
            return;
        }

        renderGrids();
        renderEquippedPanel();
        showInventoryContent();
        initInventoryData(token);
    }

    document.addEventListener('DOMContentLoaded', function() {
        setupModalEvents();
        setupCardEvents();
        setupViewAllButton();
        setupLabPassButtons();
        setupChestIframeEvents();
        checkAuthAndInit();
    });
})();