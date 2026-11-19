(function (global) {
    if (global.RWLTutorial || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;
    if (!document.getElementById('sidebar') || !document.getElementById('userProfileBtn')) return;

    var WAIT_LIMIT_MS = 30000;
    var POLL_MS = 400;
    var layer = null;
    var ring = null;
    var card = null;
    var index = 0;
    var steps = [];
    var running = false;
    var sidebarOpenedByTour = false;
    var finishing = false;

    function lit(text) {
        return text;
    }

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return RWL.escapeHtml(value);
    }

    var STEP_DEFINITIONS = [
        { id: 'welcome', selectors: [], title: lit('Welcome to Rickware - Labs©'), body: lit('This short tour shows you every important area of the platform. It cannot be skipped and you only see it once, so take your time.') },
        { id: 'menu', selectors: ['.sidebar-nav'], menu: true, title: lit('Main Menu'), body: lit('Everything you can do lives in this menu. Pick a section to open it, the selected one stays highlighted.') },
        { id: 'store', selectors: ['.nav-item[data-page="store"]'], menu: true, title: lit('Store'), body: lit('Browse tools and software, filter by category and open any product for screenshots, licenses and details.') },
        { id: 'labpass', selectors: ['.nav-item[data-page="labpass"]'], menu: true, title: lit('Lab-Pass'), body: lit('Finish daily quests to earn season XP and unlock rewards, chests and exclusive items.') },
        { id: 'inventory', selectors: ['.nav-item[data-page="inventory"]'], menu: true, title: lit('Inventory'), body: lit('Open chests and equip name colors, nameplates, avatar decorations and themes. Every item can be customized.') },
        { id: 'bazaar', selectors: ['.nav-item[data-page="bazaar"]'], menu: true, title: lit('Lab Bazaar'), body: lit('Trade items with other members through listings and auctions. Every trade is protected by escrow.') },
        { id: 'reviews', selectors: ['.nav-item[data-page="reviews"]'], menu: true, title: lit('Reviews'), body: lit('Read what customers think about our products and share your own verified review.') },
        { id: 'partner', selectors: ['.nav-item[data-page="partner"]'], menu: true, title: lit('Partner'), body: lit('Meet our trusted partners and communities.') },
        { id: 'forum', selectors: ['.nav-item[data-page="forum"]'], menu: true, title: lit('Forum'), body: lit('Ask questions, share ideas and discuss with the community. Click any name to open that member profile.') },
        { id: 'bank', selectors: ['.nav-item[data-page="bank"]'], menu: true, title: lit('Bank'), body: lit('Buy Lab Coins and exchange them. Lab Coins pay for products and are shown in your nameplate.') },
        { id: 'qa', selectors: ['.nav-item[data-page="qa"]'], menu: true, title: lit('Q&A'), body: lit('Find quick answers to the most common questions.') },
        { id: 'download', selectors: ['#downloadLauncherBtn'], menu: true, title: lit('Launcher'), body: lit('Products are downloaded and started with the Rickware - Labs© Launcher. The website only shows them, the launcher installs and launches them.') },
        { id: 'discord', selectors: ['#discordBtn'], menu: true, title: lit('Discord'), body: lit('Join our Discord server for support, news and giveaways. Link your account to earn XP.') },
        { id: 'search', selectors: ['.search-container'], title: lit('Search'), body: lit('Search the whole store by name, description or category.') },
        { id: 'dashboard', selectors: ['.top-tab[data-tab="dashboard"]'], title: lit('Dashboard'), body: lit('See every member, search them and open their profiles. You can message them or send a friend request.') },
        { id: 'labhub', selectors: ['.top-tab[data-tab="labhub"]'], title: lit('Lab Hub'), body: lit('Your growth center: Personal Pet, profile card, idle lab, events, goals and affiliate program.') },
        { id: 'home', selectors: ['.top-tab[data-tab="discover"]'], title: lit('Home'), body: lit('Back to the store at any time.') },
        { id: 'github', selectors: ['.top-tab[data-tab="github"]'], title: lit('GitHub'), body: lit('Verified open source projects from Rickware - Labs©.') },
        { id: 'archive', selectors: ['.top-tab[data-tab="assetarchive"]'], title: lit('Asset Archive'), body: lit('Browse and download the full Discord asset collection. It opens in a new tab and works without an account.') },
        { id: 'status', selectors: ['.top-tab[data-tab="status"]'], title: lit('Status'), body: lit('Live health of every tool and service.') },
        { id: 'wishlist', selectors: ['#wishlistBtn'], title: lit('Wishlist'), body: lit('Save products you like and come back to them later.') },
        { id: 'cart', selectors: ['#cartBtn'], title: lit('Cart'), body: lit('Collect products, apply coupon codes and check out securely.') },
        { id: 'profile', selectors: ['#userProfileBtn'], title: lit('Your Profile'), body: lit('Your nameplate shows your name, Lab Coins and your account badges. Click it for account settings, orders, sessions, preferences and support.') },
        { id: 'categories', selectors: ['#categoryTabsBar'], title: lit('Store Categories'), body: lit('Filter products by category. Owned lists everything you can use, Free shows free tools and Beta is reserved for Beta testers and staff.') },
        { id: 'products', selectors: ['#productsGrid'], title: lit('Products'), body: lit('Open a product for its extended view. Download and Launch work inside the Launcher, and Buy Now turns into Switch Plan once you own a product.') },
        { id: 'members', selectors: ['.dashboard-toolbar'], dashboard: true, title: lit('Community'), body: lit('Search members here. Status dots blink green for online, red for do not disturb and orange for away.') },
        { id: 'labcord', selectors: ['.rwl-open-labcord', '.dashboard-toolbar'], dashboard: true, title: lit('Labcord'), body: lit('Open Labcord for servers, channels, roles and direct messages. It opens in a new browser tab.') },
        { id: 'done', selectors: [], title: lit('You are ready'), body: lit('That was everything. Enjoy the platform, you can always find help under Support in your profile menu.') }
    ];

    function visible(element) {
        if (!element) return false;
        var rect = element.getBoundingClientRect();
        var style = global.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function findTarget(step) {
        for (var position = 0; position < step.selectors.length; position++) {
            var element = document.querySelector(step.selectors[position]);
            if (element && (visible(element) || step.menu)) return element;
        }
        return null;
    }

    function sidebarIsOffscreen() {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) return false;
        var rect = sidebar.getBoundingClientRect();
        return rect.right <= 8 || rect.width === 0;
    }

    function openSidebar() {
        if (!sidebarIsOffscreen()) return;
        var button = document.getElementById('mobileMenuBtn');
        if (button) {
            button.click();
            sidebarOpenedByTour = true;
        }
    }

    function closeSidebar() {
        if (!sidebarOpenedByTour) return;
        sidebarOpenedByTour = false;
        var close = document.getElementById('sidebarCloseBtn');
        if (close) close.click();
    }

    function showTopTab(tab) {
        var button = document.querySelector('.top-tab[data-tab="' + tab + '"]');
        if (button && !button.classList.contains('active')) button.click();
    }

    function buildLayer() {
        layer = document.createElement('div');
        layer.className = 'rwl-tour-layer';
        layer.setAttribute('role', 'dialog');
        layer.setAttribute('aria-modal', 'true');
        layer.setAttribute('aria-label', t('Welcome tour'));
        layer.innerHTML = '<div class="rwl-tour-shade dim"></div><div class="rwl-tour-ring" hidden></div><div class="rwl-tour-card"></div>';
        document.body.appendChild(layer);
        ring = layer.querySelector('.rwl-tour-ring');
        card = layer.querySelector('.rwl-tour-card');
        layer.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') event.preventDefault();
        }, true);
        layer.addEventListener('click', function (event) {
            if (card && card.contains(event.target)) return;
            event.stopPropagation();
        }, true);
        global.addEventListener('resize', place);
        global.addEventListener('scroll', place, true);
    }

    function place() {
        if (!layer || !steps.length) return;
        var step = steps[index];
        var target = step.element;
        var shade = layer.querySelector('.rwl-tour-shade');
        if (target && document.contains(target)) {
            var rect = target.getBoundingClientRect();
            var pad = 6;
            ring.hidden = false;
            ring.style.top = Math.max(0, rect.top - pad) + 'px';
            ring.style.left = Math.max(0, rect.left - pad) + 'px';
            ring.style.width = Math.min(global.innerWidth, rect.width + pad * 2) + 'px';
            ring.style.height = Math.min(global.innerHeight, rect.height + pad * 2) + 'px';
            shade.classList.remove('dim');
        } else {
            ring.hidden = true;
            shade.classList.add('dim');
        }
        var width = card.offsetWidth || 340;
        var height = card.offsetHeight || 200;
        var viewportWidth = global.innerWidth;
        var viewportHeight = global.innerHeight;
        var left;
        var top;
        if (!target || viewportWidth <= 720) {
            left = Math.max(12, (viewportWidth - width) / 2);
            top = target ? (target.getBoundingClientRect().top > viewportHeight / 2 ? 14 : viewportHeight - height - 14) : Math.max(14, (viewportHeight - height) / 2);
        } else {
            var rectTarget = target.getBoundingClientRect();
            left = rectTarget.right + 18;
            top = rectTarget.top;
            if (left + width > viewportWidth - 12) {
                left = Math.max(12, Math.min(viewportWidth - width - 12, rectTarget.left));
                top = rectTarget.bottom + 18;
            }
            if (top + height > viewportHeight - 12) top = Math.max(12, viewportHeight - height - 12);
        }
        card.style.left = Math.round(left) + 'px';
        card.style.top = Math.round(Math.max(12, top)) + 'px';
    }

    function renderStep() {
        var step = steps[index];
        if (step.menu) openSidebar();
        else closeSidebar();
        if (step.dashboard) showTopTab('dashboard');
        else if (step.id === 'products' || step.id === 'categories' || step.id === 'search') showTopTab('discover');
        step.element = findTarget(step);
        if (step.element && step.element.scrollIntoView) step.element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        var last = index === steps.length - 1;
        var dots = steps.map(function (entry, position) { return '<i class="' + (position < index ? 'done' : (position === index ? 'current' : '')) + '"></i>'; }).join('');
        card.innerHTML = '<div class="rwl-tour-dots" aria-hidden="true">' + dots + '</div>' +
            '<h3>' + esc(t(step.title)) + '</h3><p>' + esc(t(step.body)) + '</p>' +
            '<div class="rwl-tour-foot"><span class="rwl-tour-count">' + (index + 1) + ' / ' + steps.length + '</span><span>' +
            (index > 0 ? '<button type="button" class="rwl-modal-btn ghost" data-tour="back">' + esc(t('Back')) + '</button> ' : '') +
            '<button type="button" class="rwl-modal-btn" data-tour="next">' + esc(last ? t('Finish') : t('Next')) + '</button></span></div>';
        card.querySelector('[data-tour="next"]').addEventListener('click', advance);
        var back = card.querySelector('[data-tour="back"]');
        if (back) back.addEventListener('click', function () { move(-1); });
        global.setTimeout(place, step.menu && sidebarOpenedByTour ? 360 : 60);
        place();
        var next = card.querySelector('[data-tour="next"]');
        if (next) next.focus({ preventScroll: true });
    }

    function move(direction) {
        index = Math.max(0, Math.min(steps.length - 1, index + direction));
        renderStep();
    }

    async function finish() {
        if (finishing) return;
        finishing = true;
        var button = card.querySelector('[data-tour="next"]');
        if (button) button.disabled = true;
        try {
            await RWL.apiRequest('/api/experience/tutorial/complete', { method: 'POST' });
        } catch (error) {
            finishing = false;
            if (button) button.disabled = false;
            if (global.showBanner) global.showBanner(error.message || 'The tour could not be completed, please try again.', 'error');
            return;
        }
        closeSidebar();
        global.removeEventListener('resize', place);
        global.removeEventListener('scroll', place, true);
        layer.remove();
        layer = null;
        running = false;
        showTopTab('discover');
        if (global.showBanner) global.showBanner(t('Welcome to Rickware - Labs©! Your tour is complete.'), 'success');
    }

    function advance() {
        if (index >= steps.length - 1) finish();
        else move(1);
    }

    function start() {
        if (running) return;
        running = true;
        steps = STEP_DEFINITIONS.filter(function (step) {
            if (!step.selectors.length) return true;
            return !!document.querySelector(step.selectors.join(','));
        }).map(function (step) { return Object.assign({}, step); });
        index = 0;
        buildLayer();
        renderStep();
    }

    function ready() {
        var profile = document.getElementById('userProfileBtn');
        return profile && global.getComputedStyle(profile).display !== 'none' && document.querySelector('.nav-item[data-page]');
    }

    async function evaluate() {
        if (!RWL.getToken()) return;
        var started = Date.now();
        while (!ready() && Date.now() - started < WAIT_LIMIT_MS) {
            await new Promise(function (resolve) { global.setTimeout(resolve, POLL_MS); });
        }
        if (!ready()) return;
        try {
            var state = await RWL.apiRequest('/api/experience/tutorial');
            if (state && state.required) {
                await new Promise(function (resolve) { global.setTimeout(resolve, 900); });
                start();
            }
        } catch (error) {
            return;
        }
    }

    global.RWLTutorial = { start: start, active: function () { return running; } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', evaluate, { once: true });
    else evaluate();
})(window);
