(function (global) {
    var API_BASE = 'https://rickware-labs-api.apps.bot-hosting.cloud';
    var VISITOR_KEY = 'rwl_visitor_id';
    var SESSION_KEY = 'rwl_session_id';
    var TOKEN_KEY = 'rickware_token';
    var STATE_POLL_MS = 15000;
    var SYSTEM_POLL_MS = 30000;
    var BLOCKED_POLL_MS = 15000;
    var LONG_POLL_RETRY_MS = 4000;
    var COMMAND_DONE_KEY = 'rwl_client_commands_done';
    var ANALYTICS_FLUSH_MS = 20000;
    var ANALYTICS_BACKOFF_MS = 300000;
    var analyticsNotBefore = 0;
    var SYSTEM_BACKOFF_MS = 300000;
    var systemNotBefore = 0;
    var MAX_QUEUE = 40;
    var nativeFetch = global.fetch ? global.fetch.bind(global) : null;

    function randomId(length) {
        var bytes = new Uint8Array(length);
        (global.crypto || global.msCrypto).getRandomValues(bytes);
        var out = '';
        for (var index = 0; index < bytes.length; index++) out += ('0' + (bytes[index] & 255).toString(16)).slice(-2);
        return out;
    }

    function persistentId(storage, key, length) {
        try {
            var existing = storage.getItem(key);
            if (existing && /^[A-Za-z0-9_\-]{8,40}$/.test(existing)) return existing;
            var created = randomId(length);
            storage.setItem(key, created);
            return created;
        } catch (error) {
            return randomId(length);
        }
    }

    var visitorId = persistentId(global.localStorage, VISITOR_KEY, 12);
    var sessionId = persistentId(global.sessionStorage, SESSION_KEY, 10);

    function token() {
        try { return global.sessionStorage.getItem(TOKEN_KEY); } catch (error) { return null; }
    }

    function isLoggedIn() {
        var value = token();
        return !!value && value.split('.').length === 3;
    }

    var queue = [];
    var viewedProducts = {};
    var viewedGithub = {};
    var viewedPartners = {};
    var flushTimer = null;

    function enqueue(event) {
        if (!event || typeof event.type !== 'string') return;
        queue.push(event);
        if (queue.length >= MAX_QUEUE) flush();
        else scheduleFlush();
    }

    function scheduleFlush() {
        if (flushTimer || !nativeFetch) return;
        flushTimer = global.setTimeout(flush, ANALYTICS_FLUSH_MS);
    }

    function flush(useBeacon) {
        if (flushTimer) { global.clearTimeout(flushTimer); flushTimer = null; }
        if (!queue.length || !nativeFetch || /[?&]rwl_preview=1/.test(global.location.search)) return;
        var batch = queue.splice(0, MAX_QUEUE);
        var payload = { visitor_id: visitorId, session_id: sessionId, events: batch };
        var url = API_BASE + '/api/analytics/batch';
        var headers = { 'Content-Type': 'application/json' };
        var authToken = token();
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
        if (useBeacon && global.navigator && global.navigator.sendBeacon && !authToken) {
            try {
                global.navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
                return;
            } catch (error) {}
        }
        if (Date.now() < analyticsNotBefore) return;
        nativeFetch(url, { method: 'POST', headers: headers, body: JSON.stringify(payload), keepalive: !!useBeacon }).then(function (response) {
            if (response.status === 403 || response.status === 429) analyticsNotBefore = Date.now() + ANALYTICS_BACKOFF_MS;
        }).catch(function () {});
    }

    function meta() {
        var language = 'en';
        try { language = (global.RWLI18n && global.RWLI18n.language()) || global.localStorage.getItem('rwl_language') || 'en'; } catch (error) {}
        return {
            lang: language,
            screen: (global.screen ? global.screen.width + 'x' + global.screen.height : ''),
            ref: (document.referrer || '').replace(/^https?:\/\//, '').split('/')[0].slice(0, 120),
            launcher: !!(global.RWLLauncher && global.RWLLauncher.isLauncher && global.RWLLauncher.isLauncher())
        };
    }

    function pageName() {
        var path = global.location.pathname.split('/').pop() || 'index.html';
        return path.replace(/\.html$/, '') || 'index';
    }

    var currentTab = null;
    var tabEnteredAt = 0;

    function closeTab() {
        if (currentTab && tabEnteredAt) {
            var elapsed = Date.now() - tabEnteredAt;
            if (elapsed > 400) enqueue({ type: 'tab_time', tab: currentTab, page: pageName(), ms: elapsed });
        }
    }

    function trackTab(tab, fromTab) {
        if (!tab) return;
        closeTab();
        currentTab = String(tab).slice(0, 80);
        tabEnteredAt = Date.now();
        enqueue({ type: 'tab_open', tab: currentTab, page: pageName(), target: fromTab ? String(fromTab).slice(0, 80) : null });
    }

    var api = {
        visitorId: visitorId,
        sessionId: sessionId,
        page: function (name) { enqueue({ type: 'page_view', page: (name || pageName()).slice(0, 120) }); },
        tab: trackTab,
        search: function (query) {
            var value = String(query || '').trim();
            if (value.length >= 2) enqueue({ type: 'search', target: value.slice(0, 120), tab: currentTab });
        },
        click: function (label) { if (label) enqueue({ type: 'click', target: String(label).slice(0, 200), tab: currentTab }); },
        productView: function (productId) {
            var id = String(productId || '');
            if (!id || viewedProducts[id]) return;
            viewedProducts[id] = true;
            enqueue({ type: 'product_view', target: id.slice(0, 120) });
        },
        githubView: function (repo) {
            var id = String(repo || '');
            if (!id || viewedGithub[id]) return;
            viewedGithub[id] = true;
            enqueue({ type: 'github_view', target: id.slice(0, 120) });
        },
        partnerView: function (name) {
            var id = String(name || '');
            if (!id || viewedPartners[id]) return;
            viewedPartners[id] = true;
            enqueue({ type: 'partner_view', target: id.slice(0, 120) });
        },
        flush: flush
    };

    enqueue({ type: 'session_start', page: pageName(), meta: meta() });
    api.page();

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { closeTab(); flush(true); }
    });
    global.addEventListener('pagehide', function () { closeTab(); enqueue({ type: 'session_end', page: pageName() }); flush(true); });
    global.addEventListener('beforeunload', function () { closeTab(); flush(true); });

    global.RWLAnalytics = api;

    var viewCountCache = {};

    function loadViewCounts(itemType) {
        if (!nativeFetch) return Promise.resolve({});
        if (viewCountCache[itemType]) return Promise.resolve(viewCountCache[itemType]);
        return nativeFetch(API_BASE + '/api/views/' + itemType).then(function (response) {
            return response.ok ? response.json() : { views: {} };
        }).then(function (data) {
            viewCountCache[itemType] = data.views || {};
            return viewCountCache[itemType];
        }).catch(function () { return {}; });
    }

    global.RWLViews = { load: loadViewCounts };

    global.addEventListener('rwl-fx', function (event) {
        if (!event || !event.detail) return;
        var detail = event.detail;
        if (detail.type === 'tab' && detail.tab) trackTab(detail.tab, detail.from);
        else if (detail.type === 'search') api.search(detail.value);
        else if (detail.type === 'product' && detail.id) api.productView(detail.id);
        else if (detail.type === 'github' && detail.id) api.githubView(detail.id);
        else if (detail.type === 'partner' && detail.id) api.partnerView(detail.id);
        else if (detail.type === 'click') api.click(detail.label);
    });

    var effectState = { effects: [], message: null, renames: {}, version: -1, frozen: false };
    var effectStyleEl = null;
    var messageEl = null;
    var hoverFleeBound = false;
    var reportedLabels = {};
    var labelReportTimer = null;

    var EFFECT_CLASSES = {
        breakdance: 'rwlfx-breakdance',
        shaking_text: 'rwlfx-shaking',
        upside_down: 'rwlfx-upside-down',
        mirror_mode: 'rwlfx-mirror',
        rainbow_mode: 'rwlfx-rainbow',
        comic_sans: 'rwlfx-comic',
        wobble_mode: 'rwlfx-wobble',
        tiny_mode: 'rwlfx-tiny',
        blur_vision: 'rwlfx-blur',
        slow_motion: 'rwlfx-slowmo',
        spin_images: 'rwlfx-spin',
        gravity_drop: 'rwlfx-gravity'
    };
    var PROTECTED_SELECTOR = '[data-fx-protected],.product-card,.products-grid,.product-image-area,.product-preview-img,.product-card-actions,.product-modal,.product-modal-overlay,.checkout-modal,.checkout-modal-overlay,.product-btn,.product-btn-launch,.product-btn-buy,.cp-product-row,.cp-products-list,.dropdown-checkout-btn,.coin-checkout-row,.cp-order-row,#productModal,#checkoutModal,.bank-pack-card,.bank-packs-grid,.auth-btn,.lp-buy-level-btn,.lp-price-btn,.lp-activate-btn,.lp-bundle-btn';

    function ensureEffectStyles() {
        if (effectStyleEl) return;
        effectStyleEl = document.createElement('style');
        effectStyleEl.id = 'rwlfxStyles';
        effectStyleEl.textContent = [
            '@keyframes rwlfxShake{0%,100%{transform:translate(0,0) rotate(0)}20%{transform:translate(-1px,1px) rotate(-0.6deg)}40%{transform:translate(1px,-1px) rotate(0.6deg)}60%{transform:translate(-1px,-1px) rotate(-0.4deg)}80%{transform:translate(1px,1px) rotate(0.4deg)}}',
            '@keyframes rwlfxFloat{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(42vw,18vh) rotate(160deg)}50%{transform:translate(-38vw,40vh) rotate(-120deg)}75%{transform:translate(30vw,-22vh) rotate(90deg)}100%{transform:translate(0,0) rotate(360deg)}}',
            '@keyframes rwlfxRainbow{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}',
            '@keyframes rwlfxWobble{0%,100%{transform:skew(0deg,0deg)}25%{transform:skew(3deg,1deg)}75%{transform:skew(-3deg,-1deg)}}',
            '@keyframes rwlfxSpin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}',
            '@keyframes rwlfxGravity{0%{transform:translateY(0)}100%{transform:translateY(16px)}}',
            '@keyframes rwlfxFly{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--rwlfx-dx),var(--rwlfx-dy)) rotate(var(--rwlfx-dr));opacity:0}}',
            '.rwlfx-shaking :not(' + PROTECTED_SELECTOR + '){animation:rwlfxShake 0.35s infinite}',
            '.rwlfx-breakdance .rwlfx-dancer{animation:rwlfxFloat 6s ease-in-out infinite;will-change:transform}',
            '.rwlfx-rainbow{animation:rwlfxRainbow 6s linear infinite}',
            '.rwlfx-upside-down{transform:rotate(180deg)}',
            '.rwlfx-mirror{transform:scaleX(-1)}',
            '.rwlfx-comic *{font-family:"Comic Sans MS","Comic Sans",cursive !important}',
            '.rwlfx-wobble :not(' + PROTECTED_SELECTOR + '){animation:rwlfxWobble 1.6s ease-in-out infinite}',
            '.rwlfx-tiny{zoom:0.6}',
            '.rwlfx-blur{filter:blur(1.4px)}',
            '.rwlfx-slowmo *{transition-duration:2.5s !important;animation-duration:4s !important}',
            '.rwlfx-spin img:not(' + PROTECTED_SELECTOR + '){animation:rwlfxSpin 3s linear infinite}',
            '.rwlfx-gravity :not(' + PROTECTED_SELECTOR + '){animation:rwlfxGravity 2s ease-in-out infinite alternate}',
            '.rwlfx-fly-clone{position:fixed;z-index:999998;pointer-events:none;animation:rwlfxFly 1.1s ease-in forwards;--rwlfx-dx:0px;--rwlfx-dy:0px;--rwlfx-dr:0deg}',
            '#rwlfxMessage{position:fixed;left:50%;transform:translateX(-50%);z-index:999997;max-width:92vw;padding:12px 22px;border-radius:12px;background:rgba(30,0,50,0.92);color:#fff;border:1px solid rgba(200,80,255,0.5);box-shadow:0 8px 32px rgba(0,0,0,0.45);font-weight:600;font-size:14px;text-align:center}',
            '#rwlfxMessage.rwlfx-top{top:14px}#rwlfxMessage.rwlfx-center{top:50%;transform:translate(-50%,-50%)}#rwlfxMessage.rwlfx-bottom{bottom:14px}',
            '#rwlIdentifyBanner{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483000;max-width:92vw;padding:14px 26px;border-radius:14px;background:linear-gradient(135deg,#f97316,#fb923c);color:#1a0b00;font-weight:800;font-size:15px;text-align:center;box-shadow:0 10px 36px rgba(249,115,22,0.55),0 0 0 2px rgba(255,237,213,0.6);animation:rwlIdentifyPulse 1.2s ease-in-out infinite}',
            '#rwlIdentifyBanner small{display:block;font-weight:600;font-size:12px;opacity:0.85;margin-top:2px}',
            '@keyframes rwlIdentifyPulse{0%,100%{box-shadow:0 10px 36px rgba(249,115,22,0.45),0 0 0 2px rgba(255,237,213,0.5)}50%{box-shadow:0 10px 44px rgba(249,115,22,0.85),0 0 0 4px rgba(255,237,213,0.85)}}',
            '#rwlSystemBanner{position:fixed;left:0;right:0;top:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 18px;font-weight:700;font-size:14px;text-align:center;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,0.45)}',
            '#rwlSystemBanner.rwl-system-frozen{background:linear-gradient(135deg,#0c4a6e,#0ea5e9);border-bottom:1px solid rgba(186,230,253,0.7)}',
            '#rwlSystemBanner.rwl-system-maintenance{background:linear-gradient(135deg,#78350f,#f59e0b);border-bottom:1px solid rgba(253,230,138,0.7)}',
            '#rwlSystemBanner .rwl-system-icon{font-size:20px}',
            'body.rwl-system-locked{padding-top:52px}',
            '@media (prefers-reduced-motion: reduce){#rwlIdentifyBanner{animation:none}}'
        ].join('');
        (document.head || document.documentElement).appendChild(effectStyleEl);
    }

    function isProtected(element) {
        return !element || (element.closest && element.closest(PROTECTED_SELECTOR));
    }

    function applyBreakdanceTargets(enabled) {
        var container = document.querySelector('.main-content') || document.body;
        var nodes = container.querySelectorAll('h1,h2,h3,p,span,svg,.nav-item,.category-tab,.news-card,.partner-card,img');
        for (var index = 0; index < nodes.length; index++) {
            var node = nodes[index];
            if (enabled && !isProtected(node)) {
                if (!node.classList.contains('rwlfx-dancer')) {
                    node.classList.add('rwlfx-dancer');
                    node.style.animationDelay = (Math.random() * 5).toFixed(2) + 's';
                }
            } else if (node.classList.contains('rwlfx-dancer')) {
                node.classList.remove('rwlfx-dancer');
                node.style.animationDelay = '';
            }
        }
    }

    function onHoverFlee(event) {
        var target = event.target;
        if (target.nodeType !== 1 || isProtected(target)) return;
        if (!/^(SPAN|P|H1|H2|H3|H4|LABEL|LI|A|STRONG|EM|SMALL)$/.test(target.tagName)) return;
        if (target.dataset.rwlfxFlying === '1' || !target.textContent.trim()) return;
        target.dataset.rwlfxFlying = '1';
        var rect = target.getBoundingClientRect();
        var clone = target.cloneNode(true);
        clone.className = 'rwlfx-fly-clone';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.font = global.getComputedStyle(target).font;
        clone.style.setProperty('--rwlfx-dx', (Math.random() * 160 - 80).toFixed(0) + 'vw');
        clone.style.setProperty('--rwlfx-dy', (Math.random() * 120 - 60).toFixed(0) + 'vh');
        clone.style.setProperty('--rwlfx-dr', (Math.random() * 720 - 360).toFixed(0) + 'deg');
        document.body.appendChild(clone);
        target.style.visibility = 'hidden';
        global.setTimeout(function () {
            if (clone.parentNode) clone.remove();
            target.style.visibility = '';
            target.dataset.rwlfxFlying = '';
        }, 1100);
    }

    function setHoverFlee(enabled) {
        if (enabled && !hoverFleeBound) {
            document.body.addEventListener('mouseover', onHoverFlee);
            hoverFleeBound = true;
        } else if (!enabled && hoverFleeBound) {
            document.body.removeEventListener('mouseover', onHoverFlee);
            hoverFleeBound = false;
        }
    }

    var messageTimer = null;

    function applyMessage(message) {
        if (messageTimer) {
            global.clearTimeout(messageTimer);
            messageTimer = null;
        }
        if (!message || !message.text) {
            if (messageEl && messageEl.parentNode) messageEl.remove();
            messageEl = null;
            return;
        }
        if (message.seconds_left) {
            messageTimer = global.setTimeout(function () { applyMessage(null); }, Math.max(1, message.seconds_left) * 1000);
        }
        ensureEffectStyles();
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'rwlfxMessage';
            document.body.appendChild(messageEl);
        }
        messageEl.className = 'rwlfx-' + (message.position || 'top');
        messageEl.textContent = message.text;
    }

    var lagTimer = null;

    function setLaggyLauncher(enabled) {
        if (enabled && !lagTimer) {
            lagTimer = global.setInterval(function () {
                if (document.hidden) return;
                var until = Date.now() + 70 + Math.random() * 90;
                while (Date.now() < until) { void Math.sqrt(until * Math.random()); }
            }, 900);
        } else if (!enabled && lagTimer) {
            global.clearInterval(lagTimer);
            lagTimer = null;
        }
    }

    var EXTRA_TROLLS = ['disco_wash', 'drunk_sway', 'emoji_cursor_trail', 'fake_update', 'tilted_world', 'letter_chaos', 'shrinking_buttons', 'giant_cursor', 'pixel_vision', 'grayscale_world', 'negative_colors', 'wave_text', 'fake_achievements', 'dvd_logo', 'helper_bubble', 'confetti_clicks', 'shouting_text', 'pirate_speak', 'page_heartbeat', 'ghost_cursors', 'emoji_rain', 'reverse_text'];
    var extraTrollScript = null;
    var pendingExtraTrolls = [];

    function applyExtraTrolls(effects) {
        var active = effects.filter(function (name) { return EXTRA_TROLLS.indexOf(name) >= 0; });
        pendingExtraTrolls = active;
        if (global.RWLTrollExtra) {
            global.RWLTrollExtra.apply(active);
            return;
        }
        if (!active.length || extraTrollScript) return;
        var current = document.querySelector('script[src*="rwl_fx.js"]');
        if (!current) return;
        extraTrollScript = document.createElement('script');
        extraTrollScript.src = current.src.replace(/rwl_fx\.js.*$/, 'rwl_troll_extra.js');
        extraTrollScript.onload = function () { if (global.RWLTrollExtra) global.RWLTrollExtra.apply(pendingExtraTrolls); };
        document.head.appendChild(extraTrollScript);
    }

    function applyEffects(effects) {
        applyExtraTrolls(effects);
        ensureEffectStyles();
        var set = {};
        effects.forEach(function (name) { set[name] = true; });
        Object.keys(EFFECT_CLASSES).forEach(function (name) {
            document.body.classList.toggle(EFFECT_CLASSES[name], !!set[name]);
        });
        applyBreakdanceTargets(!!set.breakdance);
        setHoverFlee(!!set.hover_flee);
        setLaggyLauncher(!!set.laggy_launcher);
    }

    function applyRenames(renames) {
        var map = renames || {};
        var keys = Object.keys(map);
        if (!keys.length) return;
        var buttons = document.querySelectorAll('button,a,.nav-item,.top-tab,.category-tab,[role="button"],input[type="submit"],input[type="button"]');
        for (var index = 0; index < buttons.length; index++) {
            var element = buttons[index];
            var labelNode = findLabelNode(element);
            if (!labelNode) continue;
            var original = labelNode.dataset ? labelNode.dataset.rwlfxOriginal : null;
            var current = (labelNode.textContent || '').trim();
            var source = original || current;
            if (map[source] !== undefined) {
                if (!original && labelNode.dataset) labelNode.dataset.rwlfxOriginal = source;
                if (current !== map[source]) labelNode.textContent = map[source];
            } else if (original && current !== original) {
                labelNode.textContent = original;
            }
        }
    }

    function findLabelNode(element) {
        if (element.tagName === 'INPUT') return null;
        var span = element.querySelector('span[data-translate],span:not([class])');
        if (span && span.textContent.trim()) return span;
        for (var index = 0; index < element.childNodes.length; index++) {
            if (element.childNodes[index].nodeType === 3 && element.childNodes[index].nodeValue.trim()) return element;
        }
        return element.children.length === 0 ? element : null;
    }

    function collectLabels() {
        if (!isLoggedIn()) return;
        var buttons = document.querySelectorAll('button,a.nav-item,.top-tab,.category-tab,a.auth-btn,.profile-nav-item');
        var fresh = [];
        for (var index = 0; index < buttons.length && fresh.length < 200; index++) {
            var text = (buttons[index].textContent || '').replace(/\s+/g, ' ').trim();
            if (text && text.length <= 80 && /[a-zA-Z0-9]/.test(text) && !reportedLabels[text]) {
                reportedLabels[text] = true;
                fresh.push(text);
            }
        }
        if (!fresh.length || !nativeFetch) return;
        var authToken = token();
        if (!authToken) return;
        nativeFetch(API_BASE + '/api/client/labels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify({ labels: fresh })
        }).catch(function () {});
    }

    function scheduleLabelReport() {
        if (labelReportTimer) global.clearTimeout(labelReportTimer);
        labelReportTimer = global.setTimeout(collectLabels, 2500);
    }

    var identifyEl = null;
    var identifyTimer = null;
    var systemBannerEl = null;
    var systemState = 'normal';
    var currentSignature = '';
    var pollRunning = false;
    var pollGeneration = 0;
    var activeAudio = [];
    var audioCommandVolume = 0.8;

    function showIdentify(identify) {
        if (!identify || !identify.number) return;
        ensureEffectStyles();
        if (!identifyEl) {
            identifyEl = document.createElement('div');
            identifyEl.id = 'rwlIdentifyBanner';
            identifyEl.setAttribute('role', 'alert');
            document.body.appendChild(identifyEl);
        }
        identifyEl.textContent = '';
        var headline = document.createElement('span');
        headline.textContent = 'System notice: this device is being identified as session #' + identify.number;
        var detail = document.createElement('small');
        detail.textContent = identify.kind === 'client' ? 'Rickware - Labs© Launcher' : 'Browser session';
        identifyEl.appendChild(headline);
        identifyEl.appendChild(detail);
        if (identifyTimer) global.clearTimeout(identifyTimer);
        identifyTimer = global.setTimeout(function () {
            if (identifyEl && identifyEl.parentNode) identifyEl.remove();
            identifyEl = null;
        }, Math.min(10, Math.max(1, identify.seconds || 10)) * 1000);
    }

    function applySystemState(system) {
        var state = system && system.state ? system.state : 'normal';
        systemState = state;
        if (state === 'normal') {
            if (systemBannerEl && systemBannerEl.parentNode) systemBannerEl.remove();
            systemBannerEl = null;
            document.body.classList.remove('rwl-system-locked');
            return;
        }
        ensureEffectStyles();
        if (!systemBannerEl) {
            systemBannerEl = document.createElement('div');
            systemBannerEl.id = 'rwlSystemBanner';
            systemBannerEl.setAttribute('role', 'alert');
            document.body.appendChild(systemBannerEl);
        }
        systemBannerEl.className = state === 'frozen' ? 'rwl-system-frozen' : 'rwl-system-maintenance';
        systemBannerEl.textContent = '';
        var icon = document.createElement('span');
        icon.className = 'rwl-system-icon';
        icon.textContent = state === 'frozen' ? '🧊' : '🛠️';
        var text = document.createElement('span');
        text.textContent = system.message || (state === 'frozen' ? 'An administrator has frozen the system for security reasons. Everything is paused until it is released again.' : 'Maintenance in progress. This service is temporarily unavailable, please try again later.');
        systemBannerEl.appendChild(icon);
        systemBannerEl.appendChild(text);
        document.body.classList.add('rwl-system-locked');
    }

    function doneCommands() {
        try { return JSON.parse(global.sessionStorage.getItem(COMMAND_DONE_KEY) || '{}') || {}; } catch (error) { return {}; }
    }

    function markCommand(id) {
        var done = doneCommands();
        done[id] = Date.now();
        var keys = Object.keys(done);
        if (keys.length > 60) keys.sort(function (a, b) { return done[a] - done[b]; }).slice(0, keys.length - 60).forEach(function (key) { delete done[key]; });
        try { global.sessionStorage.setItem(COMMAND_DONE_KEY, JSON.stringify(done)); } catch (error) {}
    }

    function isLauncherClient() {
        return !!(global.RWLLauncher && global.RWLLauncher.isLauncher && global.RWLLauncher.isLauncher());
    }

    var nativeAudioActive = false;

    function stopAudio() {
        activeAudio.forEach(function (audio) {
            try { audio.pause(); audio.src = ''; } catch (error) {}
        });
        activeAudio = [];
        if (nativeAudioActive) {
            nativeAudioActive = false;
            try { global.RWLLauncher.call('stopSound', {}).catch(function () {}); } catch (error) {}
        }
    }

    function playNative(command) {
        try {
            nativeAudioActive = true;
            global.RWLLauncher.call('playSound', { url: API_BASE + command.url, volume: Math.max(0, Math.min(100, command.volume || 0)), mode: command.mode || 'once', repeat: Math.max(1, command.repeat || 1) }).catch(function () { nativeAudioActive = false; });
        } catch (error) {
            nativeAudioActive = false;
        }
    }

    function playAudio(command) {
        if (!command.url || command.url.indexOf('/api/client/sound/') !== 0) return;
        stopAudio();
        var audio = new Audio(API_BASE + command.url);
        audioCommandVolume = Math.max(0, Math.min(100, command.volume || 0)) / 100;
        audio.volume = audioCommandVolume;
        audio.preload = 'auto';
        var remaining = command.mode === 'repeat' ? Math.max(1, command.repeat || 1) : 1;
        audio.loop = command.mode === 'loop';
        audio.addEventListener('ended', function () {
            remaining -= 1;
            if (remaining > 0) {
                audio.currentTime = 0;
                audio.play().catch(function () {});
            }
        });
        activeAudio.push(audio);
        audio.play().catch(function () {
            activeAudio = activeAudio.filter(function (entry) { return entry !== audio; });
            playNative(command);
        });
    }

    function applyCommands(state) {
        if (!isLauncherClient()) return;
        var done = doneCommands();
        var audio = state.audio;
        if (audio && audio.command_id && !done[audio.command_id]) {
            markCommand(audio.command_id);
            if (audio.action === 'stop') stopAudio();
            else playAudio(audio);
        }
        var soundVolume = state.sound_volume;
        if (soundVolume && soundVolume.command_id && !done[soundVolume.command_id]) {
            markCommand(soundVolume.command_id);
            audioCommandVolume = Math.max(0, Math.min(100, soundVolume.volume || 0)) / 100;
            activeAudio.forEach(function (entry) { entry.volume = audioCommandVolume; });
        }
        var systemVolume = state.system_volume;
        if (systemVolume && systemVolume.command_id && !done[systemVolume.command_id]) {
            markCommand(systemVolume.command_id);
            try { global.RWLLauncher.call('setSystemVolume', { level: systemVolume.level }).catch(function () {}); } catch (error) {}
        }
    }

    function homeUrl() {
        return /\/sites\//.test(global.location.pathname) ? '../index.html' : './index.html';
    }

    function applyState(state) {
        effectState = state;
        if (state.frozen) {
            try { if (global.RWL) global.RWL.clearSession(); } catch (error) {}
            global.location.replace(homeUrl());
            return;
        }
        applyEffects(state.effects || []);
        applyMessage(state.message);
        applyRenames(state.renames || {});
        applySystemState(state.system);
        if (state.identify) showIdentify(state.identify);
        applyCommands(state);
    }

    function handleUnauthorized() {
        if (global.RWL && global.RWL.clearSession) global.RWL.clearSession();
        if (!/index\.html?$/.test(global.location.pathname) && global.location.pathname !== '/') global.location.replace(homeUrl());
    }

    function wait(ms) {
        return new Promise(function (resolve) { global.setTimeout(resolve, ms); });
    }

    function readSystemState() {
        if (document.hidden || Date.now() < systemNotBefore) return Promise.resolve(null);
        return nativeFetch(API_BASE + '/api/system/state', { cache: 'no-store' }).then(function (response) {
            if (response.status === 403 || response.status === 429) systemNotBefore = Date.now() + SYSTEM_BACKOFF_MS * (0.8 + Math.random() * 0.4);
            return response.ok ? response.json() : null;
        }).then(function (system) {
            if (system) applySystemState(system);
            return system;
        }).catch(function () { return null; });
    }

    function stateRequest(longPoll) {
        var url = API_BASE + '/api/client/state' + (longPoll && currentSignature ? '?wait=1&since=' + encodeURIComponent(currentSignature) : '');
        return nativeFetch(url, { headers: { 'Authorization': 'Bearer ' + token() }, cache: 'no-store' });
    }

    async function stateLoop(generation) {
        while (generation === pollGeneration && isLoggedIn()) {
            try {
                var response = await stateRequest(true);
                if (generation !== pollGeneration) return;
                if (response.status === 403) {
                    var denied = null;
                    try { denied = await response.clone().json(); } catch (error) { denied = null; }
                    if (denied && denied.ip_blocked) {
                        await wait(SYSTEM_BACKOFF_MS);
                        continue;
                    }
                }
                if (response.status === 401 || response.status === 403) {
                    handleUnauthorized();
                    return;
                }
                if (response.status === 429) {
                    await wait(Math.max(LONG_POLL_RETRY_MS, (parseInt(response.headers.get('Retry-After'), 10) || 0) * 1000));
                    continue;
                }
                if (response.status === 503) {
                    var blocked = null;
                    try { blocked = await response.json(); } catch (error) { blocked = null; }
                    applySystemState({ state: (blocked && blocked.system_state) || 'maintenance', message: blocked && blocked.detail });
                    await wait(BLOCKED_POLL_MS);
                    continue;
                }
                if (!response.ok) {
                    await wait(LONG_POLL_RETRY_MS);
                    continue;
                }
                var state = await response.json();
                if (state && state.signature) {
                    currentSignature = state.signature;
                    applyState(state);
                }
                if (document.hidden) await wait(STATE_POLL_MS);
            } catch (error) {
                await wait(LONG_POLL_RETRY_MS);
            }
        }
        pollRunning = false;
    }

    function pollState() {
        if (!nativeFetch) return;
        if (!isLoggedIn()) {
            readSystemState();
            return;
        }
        if (pollRunning) return;
        pollRunning = true;
        pollGeneration += 1;
        stateLoop(pollGeneration);
    }

    function restartPolling() {
        pollGeneration += 1;
        pollRunning = false;
        currentSignature = '';
        pollState();
    }

    var effectObserver = null;

    function startEffectObserver() {
        if (effectObserver || typeof MutationObserver !== 'function') return;
        effectObserver = new MutationObserver(function () {
            if (effectState.effects && effectState.effects.indexOf('breakdance') >= 0) applyBreakdanceTargets(true);
            if (Object.keys(effectState.renames || {}).length) applyRenames(effectState.renames);
            scheduleLabelReport();
        });
        effectObserver.observe(document.body, { childList: true, subtree: true });
    }

    var previewFrame = /[?&]rwl_preview=1/.test(global.location.search);

    function init() {
        if (previewFrame) return;
        startEffectObserver();
        scheduleLabelReport();
        pollState();
        global.setInterval(function () {
            if (!isLoggedIn()) readSystemState();
            else if (!pollRunning) pollState();
        }, SYSTEM_POLL_MS);
        global.addEventListener('rwl-system-state', function (event) {
            if (event && event.detail) applySystemState(event.detail);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    global.RWLFX = {
        refresh: restartPolling,
        systemState: function () { return systemState; },
        applySystemState: applySystemState,
        state: function () { return effectState; },
        reportLabels: collectLabels
    };
})(window);
