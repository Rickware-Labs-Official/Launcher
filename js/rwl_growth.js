(function (global) {
    if (global.RWLGrowth || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var esc = RWL.escapeHtml;
    var AFFILIATE_TOKEN_KEY = 'rwl_affiliate_token';
    var state = { companion: null, widget: null, panelOpen: false, reacting: null, events: null };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function inSites() {
        return global.location.pathname.indexOf('/sites/') >= 0;
    }

    function pageUrl(name) {
        return (inSites() ? './' : './sites/') + name;
    }

    function ensureStyles() {
        if (document.querySelector('link[href*="rwl_growth.css"]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = inSites() ? '../css/rwl_growth.css' : './css/rwl_growth.css';
        document.head.appendChild(link);
    }

    function body(species) {
        if (species === 'bot') return '<rect x="22" y="30" width="56" height="48" rx="12" class="cp-body"/><line x1="50" y1="30" x2="50" y2="16" class="cp-line"/><circle cx="50" cy="13" r="5" class="cp-accent"/><rect x="30" y="70" width="40" height="8" rx="4" class="cp-shade"/>';
        if (species === 'flask') return '<path d="M40 18h20v18l18 34a10 10 0 0 1-9 14H31a10 10 0 0 1-9-14l18-34z" class="cp-body"/><path d="M28 66h44l4 8a7 7 0 0 1-6 10H30a7 7 0 0 1-6-10z" class="cp-accent"/><circle cx="44" cy="72" r="3" class="cp-bubble"/><circle cx="56" cy="76" r="2" class="cp-bubble"/><rect x="38" y="14" width="24" height="6" rx="3" class="cp-shade"/>';
        if (species === 'atom') return '<ellipse cx="50" cy="52" rx="40" ry="14" class="cp-orbit"/><ellipse cx="50" cy="52" rx="40" ry="14" transform="rotate(60 50 52)" class="cp-orbit"/><ellipse cx="50" cy="52" rx="40" ry="14" transform="rotate(-60 50 52)" class="cp-orbit"/><circle cx="50" cy="52" r="24" class="cp-body"/>';
        if (species === 'slime') return '<path d="M16 80c0-30 14-52 34-52s34 22 34 52c-6 4-12 0-17 4-5 4-10 0-17 0s-12 4-17 0c-5-4-11 0-17-4z" class="cp-body"/><circle cx="74" cy="38" r="5" class="cp-bubble"/>';
        return '<path d="M18 62c0-24 14-40 32-40s32 16 32 40c0 14-12 22-32 22S18 76 18 62z" class="cp-body"/><ellipse cx="50" cy="78" rx="24" ry="5" class="cp-shade"/>';
    }

    function face(mood) {
        var eyes = mood === 'sleepy' ? '<path d="M36 52q5 4 10 0M54 52q5 4 10 0" class="cp-line"/>' : '<circle cx="41" cy="51" r="4.5" class="cp-eye"/><circle cx="59" cy="51" r="4.5" class="cp-eye"/><circle cx="42.5" cy="49.5" r="1.4" class="cp-glint"/><circle cx="60.5" cy="49.5" r="1.4" class="cp-glint"/>';
        var mouth = mood === 'ecstatic' ? '<path d="M41 60q9 10 18 0z" class="cp-mouth"/>' : (mood === 'happy' ? '<path d="M42 61q8 6 16 0" class="cp-line"/>' : (mood === 'bored' ? '<line x1="44" y1="62" x2="56" y2="62" class="cp-line"/>' : (mood === 'sleepy' ? '<circle cx="50" cy="63" r="2.5" class="cp-mouth"/>' : '<path d="M44 62q6 4 12 0" class="cp-line"/>')));
        var blush = '<ellipse cx="34" cy="59" rx="4" ry="2.5" class="cp-blush"/><ellipse cx="66" cy="59" rx="4" ry="2.5" class="cp-blush"/>';
        return eyes + mouth + blush;
    }

    function decoration(key) {
        var shapes = {
            bowtie: '<path d="M40 82l10 4 10-4-2 8-8-2-8 2z" class="cp-deco-pink"/>',
            goggles: '<rect x="30" y="44" width="16" height="12" rx="6" class="cp-deco-glass"/><rect x="54" y="44" width="16" height="12" rx="6" class="cp-deco-glass"/><line x1="46" y1="50" x2="54" y2="50" class="cp-deco-line"/>',
            party_hat: '<path d="M38 26l12-24 12 24z" class="cp-deco-gold"/><circle cx="50" cy="2" r="3" class="cp-deco-pink"/>',
            headset: '<path d="M22 54a28 28 0 0 1 56 0" class="cp-deco-line"/><rect x="16" y="50" width="9" height="14" rx="4" class="cp-deco-dark"/><rect x="75" y="50" width="9" height="14" rx="4" class="cp-deco-dark"/>',
            scarf: '<path d="M26 74q24 10 48 0v8q-24 10-48 0z" class="cp-deco-red"/><path d="M64 80l4 12-8-2z" class="cp-deco-red"/>',
            crown: '<path d="M34 26l4-12 8 8 4-12 4 12 8-8 4 12z" class="cp-deco-gold"/>',
            cape: '<path d="M24 60q-10 24 4 34h44q14-10 4-34z" class="cp-deco-cape"/>',
            halo: '<ellipse cx="50" cy="12" rx="16" ry="4" class="cp-deco-halo"/>',
            plasma_aura: '<circle cx="50" cy="54" r="44" class="cp-deco-aura"/>',
            pixel_wings: '<path d="M18 44h-8v8h-6v8h6v8h8zM82 44h8v8h6v8h-6v8h-8z" class="cp-deco-wing"/>'
        };
        return shapes[key] || '';
    }

    function companionSvg(companion, size) {
        var back = ['cape', 'plasma_aura', 'pixel_wings'];
        var equipped = (companion && companion.equipped) || [];
        var hue = Math.max(0, Math.min(360, parseInt(companion && companion.hue, 10) || 270));
        var behind = equipped.filter(function (key) { return back.indexOf(key) >= 0; }).map(decoration).join('');
        var front = equipped.filter(function (key) { return back.indexOf(key) < 0; }).map(decoration).join('');
        return '<svg class="rwl-companion-svg" viewBox="0 0 100 100" width="' + (size || 72) + '" height="' + (size || 72) + '" style="--cp-hue:' + hue + 'deg" aria-hidden="true">' + behind + body(companion && companion.species) + face(companion && companion.mood) + front + '</svg>';
    }

    function captureAffiliate() {
        var match = /[?&]ref=([A-Za-z2-9]{6,24})(?:&|$)/.exec(global.location.search);
        if (!match) return;
        if (RWL.getToken()) return;
        try {
            if (sessionStorage.getItem(AFFILIATE_TOKEN_KEY)) return;
        } catch (error) {
            return;
        }
        RWL.apiRequest('/api/affiliate/visit', { method: 'POST', body: { code: match[1].toUpperCase(), device_key: RWL.deviceKey ? RWL.deviceKey() : null } }).then(function (result) {
            if (result && result.tracked && result.token) {
                try { sessionStorage.setItem(AFFILIATE_TOKEN_KEY, result.token); } catch (error) {}
            }
        }).catch(function () {});
    }

    function affiliateToken() {
        try { return sessionStorage.getItem(AFFILIATE_TOKEN_KEY) || null; } catch (error) { return null; }
    }

    function clearAffiliateToken() {
        try { sessionStorage.removeItem(AFFILIATE_TOKEN_KEY); } catch (error) {}
    }

    function widgetElement() {
        if (state.widget && state.widget.isConnected) return state.widget;
        var widget = document.createElement('div');
        widget.className = 'rwl-companion-widget';
        widget.innerHTML = '<button type="button" class="rwl-companion-orb" data-companion-toggle></button><div class="rwl-companion-panel" hidden></div><div class="rwl-companion-speech" hidden></div>';
        widget.addEventListener('click', onWidgetClick);
        document.body.appendChild(widget);
        state.widget = widget;
        return widget;
    }

    function renderWidget() {
        var data = state.companion;
        if (!data || !data.adopted || !data.catalog || !data.catalog.enabled) {
            if (state.widget) state.widget.hidden = true;
            return;
        }
        ensureStyles();
        var widget = widgetElement();
        widget.hidden = false;
        var companion = data.companion;
        var orb = widget.querySelector('[data-companion-toggle]');
        orb.innerHTML = companionSvg(companion, 64) + '<span class="rwl-companion-level">' + companion.level + '</span>';
        orb.title = companion.name + ' · ' + t('Level') + ' ' + companion.level;
        orb.setAttribute('aria-label', orb.title);
        var panel = widget.querySelector('.rwl-companion-panel');
        var perLevel = data.catalog.xp_per_level || 120;
        var progress = Math.round(((companion.level_progress || 0) / perLevel) * 100);
        var cooling = companion.care_cooldown_seconds > 0;
        panel.innerHTML = '<div class="rwl-companion-panel-head"><strong translate="no">' + esc(companion.name) + '</strong><span>' + esc(t('Level')) + ' ' + companion.level + ' · ' + esc(t(companion.mood.charAt(0).toUpperCase() + companion.mood.slice(1))) + '</span></div>' +
            '<div class="rwl-companion-bar"><span style="width:' + progress + '%"></span></div>' +
            '<div class="rwl-companion-actions">' + data.catalog.care_actions.map(function (action) {
                var label = { feed: t('Feed'), pet: t('Pet'), play: t('Play') }[action] || action;
                return '<button type="button" class="rwl-btn rwl-btn-secondary" data-companion-care="' + action + '"' + (cooling ? ' disabled' : '') + ' title="' + esc(cooling ? t('Your companion needs a short break') : label) + '">' + esc(label) + '</button>';
            }).join('') + '</div>' +
            '<a class="rwl-companion-link" href="' + esc(pageUrl('lab_hub.html')) + '">' + esc(t('Open the Lab Hub')) + '</a>';
    }

    function speak(text) {
        if (!state.widget) return;
        var bubble = state.widget.querySelector('.rwl-companion-speech');
        bubble.textContent = text;
        bubble.hidden = false;
        clearTimeout(state.speechTimer);
        state.speechTimer = setTimeout(function () { bubble.hidden = true; }, 4200);
    }

    function react(kind, text) {
        if (!state.widget || state.widget.hidden) return;
        var orb = state.widget.querySelector('[data-companion-toggle]');
        orb.classList.remove('rwl-companion-react-jump', 'rwl-companion-react-spin', 'rwl-companion-react-love');
        void orb.offsetWidth;
        orb.classList.add(kind === 'level' ? 'rwl-companion-react-spin' : (kind === 'love' ? 'rwl-companion-react-love' : 'rwl-companion-react-jump'));
        if (text) speak(text);
    }

    async function loadCompanion() {
        if (!RWL.getToken()) return;
        try {
            state.companion = await RWL.apiRequest('/api/growth/companion');
            renderWidget();
        } catch (error) {
            state.companion = null;
        }
    }

    async function care(action) {
        try {
            var result = await RWL.apiRequest('/api/growth/companion/care', { method: 'POST', body: { action: action } });
            state.companion = result;
            renderWidget();
            react(result.level_up ? 'level' : 'love', result.level_up ? t('Level up! Thank you!') : { feed: t('Yummy!'), pet: t('That feels nice!'), play: t('Again, again!') }[action]);
        } catch (error) {
            speak(error.message || t('Not right now.'));
        }
    }

    function onWidgetClick(event) {
        var careButton = event.target.closest('[data-companion-care]');
        if (careButton) {
            care(careButton.getAttribute('data-companion-care'));
            return;
        }
        if (event.target.closest('[data-companion-toggle]')) {
            var panel = state.widget.querySelector('.rwl-companion-panel');
            panel.hidden = !panel.hidden;
            if (!panel.hidden) react('jump');
        }
    }

    function onSocialEvent(event) {
        var entry = event.detail || {};
        if (entry.type === 'companion_reaction') {
            if (state.companion && state.companion.companion) {
                state.companion.companion.level = entry.level || state.companion.companion.level;
                renderWidget();
            }
            react('jump', entry.xp ? '+' + entry.xp + ' XP · ' + t('Great tool choice!') : t('Nice!'));
        } else if (entry.type === 'gift_received' && global.RWLSocialNotify && global.RWLSocialNotify.popup) {
            global.RWLSocialNotify.popup({ title: entry.from || t('Gift'), body: t('Sent you a gift') + ': ' + ((entry.item && entry.item.name) || ''), icon: '🎁', onOpen: function () { global.location.href = pageUrl('inventory.html'); } });
            react('love', t('A present for you!'));
        } else if (entry.type === 'bug_reward' && global.RWLSocialNotify && global.RWLSocialNotify.popup) {
            global.RWLSocialNotify.popup({ title: t('Bug Report Reward'), body: t('Thank you for your bug report!'), icon: '🐞' });
        } else if (entry.type === 'clear_requested' && !entry.echo && global.RWLSocialNotify && global.RWLSocialNotify.popup) {
            if (global.RWLSocial && global.RWLSocial.isChatOpenFor && global.RWLSocial.isChatOpenFor(entry.channel_id)) return;
            global.RWLSocialNotify.popup({ title: entry.username || t('Chat'), body: t('Wants to clear your chat history'), icon: '🧹', onOpen: function () { if (global.RWLSocial) global.RWLSocial.openChat(entry.channel_id); } });
        }
    }

    function onToolLaunched() {
        react('jump', t('Let us run some experiments!'));
    }

    async function loadEvents() {
        try {
            var data = await RWL.apiRequest('/api/growth/events');
            state.events = data;
            renderEventBanner(data);
        } catch (error) {
            state.events = null;
        }
    }

    function renderEventBanner(data) {
        var running = (data.events || []).filter(function (event) { return event.active; });
        if (!running.length || document.querySelector('.rwl-event-banner')) return;
        var dismissed = false;
        try { dismissed = sessionStorage.getItem('rwl_event_banner') === running[0].id; } catch (error) {}
        if (dismissed) return;
        ensureStyles();
        var banner = document.createElement('div');
        banner.className = 'rwl-event-banner';
        var event = running[0];
        banner.innerHTML = '<span class="rwl-event-spark">⚡</span><span><strong>' + esc(event.name) + '</strong> · ' + esc(event.multiplier) + 'x ' + esc(t('boost is active')) + (event.description ? ' · ' + esc(event.description) : '') + '</span><a href="' + esc(pageUrl('lab_hub.html')) + '">' + esc(t('Details')) + '</a><button type="button" title="' + esc(t('Close')) + '">✕</button>';
        banner.querySelector('button').addEventListener('click', function () {
            banner.remove();
            try { sessionStorage.setItem('rwl_event_banner', event.id); } catch (error) {}
        });
        document.body.appendChild(banner);
    }

    global.RWLGrowth = {
        companionSvg: companionSvg,
        affiliateToken: affiliateToken,
        clearAffiliateToken: clearAffiliateToken,
        refreshCompanion: loadCompanion,
        setCompanion: function (data) { state.companion = data; renderWidget(); },
        react: react,
        toolLaunched: onToolLaunched
    };

    function init() {
        captureAffiliate();
        global.addEventListener('rwl-social-event', onSocialEvent);
        global.addEventListener('rwl-tool-launched', onToolLaunched);
        setTimeout(loadCompanion, 1500);
        setTimeout(loadEvents, 2200);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
