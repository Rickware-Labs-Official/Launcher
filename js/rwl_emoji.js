(function (global) {
    if (global.RWLEmoji) return;

    var script = document.currentScript;
    var baseUrl = script && script.src ? script.src.replace(/rwl_emoji\.js(?:[?#].*)?$/, '') : './js/';
    var pending = {};
    var GROUP_TITLES = {
        smileys: 'Smileys & Emotion',
        people: 'People & Body',
        nature: 'Animals & Nature',
        food: 'Food & Drink',
        travel: 'Travel & Places',
        activities: 'Activities',
        objects: 'Objects',
        symbols: 'Symbols',
        flags: 'Flags'
    };
    var ATTRIBUTE_PATTERN = /^data-[a-z\-]{1,30}$/;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return String(value === undefined || value === null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function language() {
        var current = global.RWLI18n && global.RWLI18n.language ? global.RWLI18n.language() : 'en';
        return /^[a-z]{2}$/.test(current) ? current : 'en';
    }

    function loadScript(url) {
        if (!pending[url]) {
            pending[url] = new Promise(function (resolve) {
                var element = document.createElement('script');
                element.src = url;
                element.onload = resolve;
                element.onerror = resolve;
                (document.head || document.documentElement).appendChild(element);
            });
        }
        return pending[url];
    }

    async function ensureData() {
        await loadScript(baseUrl + 'rwl_emoji_data.js');
        await loadScript(baseUrl + 'emoji_names/' + language() + '.js');
        return global.RWLEmojiData && global.RWLEmojiData.groups ? global.RWLEmojiData : null;
    }

    function extraAttributes(extra) {
        var html = '';
        Object.keys(extra || {}).forEach(function (key) {
            if (ATTRIBUTE_PATTERN.test(key)) html += ' ' + key + '="' + esc(extra[key]) + '"';
        });
        return html;
    }

    function applySearch(root, query) {
        var needle = String(query || '').trim().toLowerCase();
        var visibleTotal = 0;
        Array.prototype.forEach.call(root.querySelectorAll('.rwl-emoji-group'), function (group) {
            var visible = 0;
            Array.prototype.forEach.call(group.querySelectorAll('.rwl-emoji'), function (button) {
                var match = !needle || (button.getAttribute('data-n') || '').indexOf(needle) >= 0;
                button.hidden = !match;
                if (match) visible++;
            });
            group.hidden = visible === 0;
            visibleTotal += visible;
        });
        var empty = root.querySelector('.rwl-emoji-empty');
        if (empty) empty.hidden = visibleTotal > 0;
    }

    async function fill(panel, options) {
        var settings = options || {};
        panel.setAttribute('data-picker', 'full');
        panel.innerHTML = '<div class="rwl-emoji-empty">' + esc(t('Loading emoji...')) + '</div>';
        var data = await ensureData();
        if (!data) {
            panel.innerHTML = '';
            return;
        }
        var names = (data.names && data.names[language()]) || {};
        var attribute = ATTRIBUTE_PATTERN.test(settings.attribute || '') ? settings.attribute : 'data-emoji';
        var extra = extraAttributes(settings.extra);

        function button(glyph) {
            var label = names[glyph] || '';
            return '<button type="button" class="rwl-emoji" ' + attribute + '="' + esc(glyph) + '"' + extra + ' title="' + esc(label) + '" data-n="' + esc(label) + '">' + esc(glyph) + '</button>';
        }

        var sections = [];
        var tabs = [];
        if (Array.isArray(settings.quick) && settings.quick.length) {
            sections.push('<div class="rwl-emoji-group" data-group="quick"><div class="rwl-emoji-group-title">' + esc(t('Quick Reactions')) + '</div><div class="rwl-emoji-grid">' + settings.quick.map(button).join('') + '</div></div>');
            tabs.push('<button type="button" class="rwl-emoji-tab" data-emoji-tab="quick" title="' + esc(t('Quick Reactions')) + '">⚡</button>');
        }
        data.groups.forEach(function (group) {
            var glyphs = String(group.emoji || '').split(' ').filter(Boolean);
            sections.push('<div class="rwl-emoji-group" data-group="' + esc(group.id) + '"><div class="rwl-emoji-group-title">' + esc(t(GROUP_TITLES[group.id] || group.id)) + '</div><div class="rwl-emoji-grid">' + glyphs.map(button).join('') + '</div></div>');
            tabs.push('<button type="button" class="rwl-emoji-tab" data-emoji-tab="' + esc(group.id) + '" title="' + esc(t(GROUP_TITLES[group.id] || group.id)) + '">' + esc(group.icon) + '</button>');
        });
        panel.innerHTML = '<div class="rwl-emoji-picker">' +
            '<input type="search" class="rwl-emoji-search" maxlength="40" autocomplete="off" placeholder="' + esc(t('Search emoji')) + '" title="' + esc(t('Search emoji')) + '">' +
            '<div class="rwl-emoji-tabs">' + tabs.join('') + '</div>' +
            '<div class="rwl-emoji-scroll">' + sections.join('') + '<div class="rwl-emoji-empty" hidden>' + esc(t('No emoji found.')) + '</div></div>' +
            '</div>';
        var root = panel.querySelector('.rwl-emoji-picker');
        var scroller = root.querySelector('.rwl-emoji-scroll');
        var search = root.querySelector('.rwl-emoji-search');
        var timer = null;
        search.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(function () { applySearch(root, search.value); }, 90);
        });
        search.addEventListener('keydown', function (event) { event.stopPropagation(); });
        root.querySelector('.rwl-emoji-tabs').addEventListener('click', function (event) {
            var tab = event.target.closest('[data-emoji-tab]');
            if (!tab) return;
            event.stopPropagation();
            search.value = '';
            applySearch(root, '');
            var target = root.querySelector('.rwl-emoji-group[data-group="' + tab.getAttribute('data-emoji-tab') + '"]');
            if (target) scroller.scrollTop = target.offsetTop - scroller.offsetTop;
        });
    }

    global.RWLEmoji = { fill: fill, ready: ensureData };
})(window);
