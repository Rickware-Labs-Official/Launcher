(function (global) {
    if (global.LabcordSwitcher || !global.RWL) return;

    var MAX_RESULTS = 40;
    var KIND_ICONS = { server: 'users', channel: 'hash', dm: 'chat', home: 'user_plus' };
    var layer = null;
    var input = null;
    var list = null;
    var results = [];
    var cursor = 0;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function icon(name, size) {
        return global.RWL.uiIcon ? global.RWL.uiIcon(name, size) : '';
    }

    function labcord() {
        return global.Labcord && global.Labcord.switcherEntries ? global.Labcord : null;
    }

    function build() {
        if (layer) return;
        layer = document.createElement('div');
        layer.className = 'lc-switcher-layer';
        layer.hidden = true;
        var box = document.createElement('div');
        box.className = 'lc-switcher';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', t('Quick Switcher'));
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'lc-input lc-switcher-input';
        input.maxLength = 60;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.placeholder = t('Where would you like to go?');
        list = document.createElement('div');
        list.className = 'lc-switcher-list';
        list.setAttribute('role', 'listbox');
        var hint = document.createElement('div');
        hint.className = 'lc-switcher-hint';
        hint.textContent = t('Arrow keys to move, Enter to open, Esc to close');
        box.appendChild(input);
        box.appendChild(list);
        box.appendChild(hint);
        layer.appendChild(box);
        document.body.appendChild(layer);
        layer.addEventListener('mousedown', function (event) {
            if (event.target === layer) close();
        });
        input.addEventListener('input', function () { cursor = 0; refresh(); });
        input.addEventListener('keydown', onKey);
        list.addEventListener('click', function (event) {
            var row = event.target.closest('[data-index]');
            if (!row) return;
            choose(parseInt(row.getAttribute('data-index'), 10));
        });
    }

    function score(entry, query) {
        var label = String(entry.label || '').toLowerCase();
        var hint = String(entry.hint || '').toLowerCase();
        if (!query) return entry.kind === 'channel' ? 3 : (entry.kind === 'dm' ? 2 : 1);
        if (label === query) return 100;
        if (label.indexOf(query) === 0) return 80;
        if (label.indexOf('#' + query) === 0) return 75;
        if (label.indexOf(query) > 0) return 50;
        if (hint.indexOf(query) >= 0) return 20;
        return 0;
    }

    function refresh() {
        var api = labcord();
        var query = String(input.value || '').trim().toLowerCase();
        var entries = api ? api.switcherEntries() : [];
        results = entries
            .map(function (entry) { return { entry: entry, score: score(entry, query) }; })
            .filter(function (row) { return row.score > 0; })
            .sort(function (left, right) { return right.score - left.score; })
            .slice(0, MAX_RESULTS)
            .map(function (row) { return row.entry; });
        cursor = Math.max(0, Math.min(cursor, results.length - 1));
        list.textContent = '';
        if (!results.length) {
            var empty = document.createElement('div');
            empty.className = 'lc-switcher-empty';
            empty.textContent = t('Nothing found.');
            list.appendChild(empty);
            return;
        }
        results.forEach(function (entry, index) {
            var row = document.createElement('div');
            row.className = 'lc-switcher-row' + (index === cursor ? ' active' : '');
            row.setAttribute('role', 'option');
            row.setAttribute('data-index', String(index));
            var glyph = document.createElement('span');
            glyph.className = 'lc-switcher-icon';
            glyph.innerHTML = icon(KIND_ICONS[entry.kind] || 'hash', 16);
            var name = document.createElement('span');
            name.className = 'lc-switcher-name';
            name.setAttribute('translate', 'no');
            name.textContent = entry.label;
            var sub = document.createElement('small');
            sub.className = 'lc-switcher-sub';
            sub.textContent = entry.hint || '';
            row.appendChild(glyph);
            row.appendChild(name);
            row.appendChild(sub);
            list.appendChild(row);
        });
        var active = list.querySelector('.active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
    }

    function choose(index) {
        var entry = results[index];
        close();
        if (entry && labcord()) global.Labcord.switchTo(entry);
    }

    function onKey(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            cursor = Math.min(results.length - 1, cursor + 1);
            refresh();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            cursor = Math.max(0, cursor - 1);
            refresh();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            choose(cursor);
        }
    }

    function open() {
        if (!labcord()) return;
        build();
        layer.hidden = false;
        input.value = '';
        cursor = 0;
        refresh();
        input.focus();
    }

    function close() {
        if (layer) layer.hidden = true;
    }

    function toggle() {
        if (layer && !layer.hidden) close();
        else open();
    }

    document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && String(event.key).toLowerCase() === 'k') {
            event.preventDefault();
            toggle();
        }
    });

    document.addEventListener('click', function (event) {
        if (event.target.closest && event.target.closest('#lcQuickSwitch')) open();
    });

    global.LabcordSwitcher = { open: open, close: close, toggle: toggle };
})(window);
