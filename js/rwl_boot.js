(function (global) {
    var DEFAULT_LANGUAGE = 'de';
    var SOURCE_LANGUAGE = 'en';
    var SUPPORTED_LANGUAGES = ['de', 'en', 'ru', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh'];
    var LANGUAGE_NAMES = { de: 'Deutsch', en: 'English', ru: 'Русский', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', ja: '日本語', ko: '한국어', zh: '中文' };
    var LANGUAGE_STORAGE_KEY = 'rwl_language';
    var THEME_STORAGE_KEY = 'rwl_theme';
    var TRANSLATED_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'];
    var BUTTON_INPUT_TYPES = { button: true, submit: true, reset: true };
    var SKIPPED_TAGS = { SCRIPT: true, STYLE: true, NOSCRIPT: true, TEXTAREA: true, CODE: true, PRE: true, svg: true, SVG: true, IFRAME: true, VIDEO: true, CANVAS: true };
    var SKIP_SELECTOR = 'script,style,noscript,textarea,code,pre,svg,[translate="no"],.notranslate,[contenteditable="true"]';
    var LETTER_PATTERN = /[A-Za-z]/;
    var MAX_CACHE_ENTRIES = 30000;

    var bootScript = document.currentScript;
    var baseUrl = bootScript && bootScript.src ? bootScript.src.replace(/js\/rwl_boot\.js(?:[?#].*)?$/, '') : './';
    var extraPacks = ((bootScript && bootScript.getAttribute('data-i18n-extra')) || '').split(/\s+/).filter(function (entry) { return /^[a-z_]+$/.test(entry); });

    function readStorage(key) {
        try { return global.localStorage.getItem(key); } catch (error) { return null; }
    }

    function writeStorage(key, value) {
        try {
            if (value === null || value === undefined) global.localStorage.removeItem(key);
            else global.localStorage.setItem(key, value);
        } catch (error) {}
    }

    function supportedLanguage(value) {
        var language = String(value || '').toLowerCase();
        return SUPPORTED_LANGUAGES.indexOf(language) >= 0 ? language : null;
    }

    var currentLanguage = supportedLanguage(readStorage(LANGUAGE_STORAGE_KEY)) || DEFAULT_LANGUAGE;
    var packs = {};
    var loadedPackFiles = {};
    var textRecords = new WeakMap();
    var attributeRecords = new WeakMap();
    var observer = null;
    var observerStarted = false;

    function escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function packFor(language) {
        if (!packs[language]) packs[language] = { entries: new Map(), patterns: [], cache: new Map() };
        return packs[language];
    }

    function compilePattern(source, target) {
        var parts = String(source).split(/(\{#?\d+\})/);
        var expression = '^';
        var order = [];
        var anchor = '';
        parts.forEach(function (part) {
            var placeholder = /^\{(#?)(\d+)\}$/.exec(part);
            if (placeholder) {
                expression += placeholder[1] ? '([+\\-]?[\\d∞][\\d.,\\s]*)' : '([\\s\\S]+?)';
                order.push(parseInt(placeholder[2], 10));
            } else if (part) {
                expression += escapeRegex(part);
                if (part.trim().length > anchor.length) anchor = part.trim();
            }
        });
        return { regex: new RegExp(expression + '$'), order: order, target: String(target).replace(/\{#(\d+)\}/g, '{$1}'), anchor: anchor };
    }

    function register(language, entries, patterns) {
        var pack = packFor(language);
        Object.keys(entries || {}).forEach(function (key) {
            var value = entries[key];
            if (typeof value === 'string' && value) pack.entries.set(key, value);
        });
        (patterns || []).forEach(function (pair) {
            if (Array.isArray(pair) && pair.length === 2) pack.patterns.push(compilePattern(pair[0], pair[1]));
        });
        pack.patterns.sort(function (left, right) { return right.anchor.length - left.anchor.length; });
        pack.cache = new Map();
        if (language === currentLanguage && document.documentElement) translateTree(document.documentElement);
    }

    function translateFragment(pack, value) {
        var trimmed = value.trim();
        var direct = pack.entries.get(trimmed);
        if (direct === undefined) return value;
        return value.replace(trimmed, direct);
    }

    function lookup(normalized) {
        var pack = packs[currentLanguage];
        if (!pack) return null;
        var direct = pack.entries.get(normalized);
        if (direct !== undefined) return direct;
        if (pack.cache.has(normalized)) return pack.cache.get(normalized);
        var result = null;
        for (var index = 0; index < pack.patterns.length; index++) {
            var pattern = pack.patterns[index];
            if (pattern.anchor && normalized.indexOf(pattern.anchor) < 0) continue;
            var match = pattern.regex.exec(normalized);
            if (!match) continue;
            var values = [];
            for (var group = 1; group < match.length; group++) {
                values[pattern.order[group - 1]] = translateFragment(pack, match[group]);
            }
            result = pattern.target.replace(/\{(\d+)\}/g, function (all, number) {
                var value = values[parseInt(number, 10)];
                return value === undefined ? '' : value;
            });
            break;
        }
        if (pack.cache.size > MAX_CACHE_ENTRIES) pack.cache.clear();
        pack.cache.set(normalized, result);
        return result;
    }

    function translateText(raw) {
        if (currentLanguage === SOURCE_LANGUAGE || !raw || !LETTER_PATTERN.test(raw)) return null;
        var trimmed = raw.trim();
        if (!trimmed) return null;
        var normalized = trimmed.replace(/\s+/g, ' ');
        var translated = lookup(normalized);
        if (translated === null || translated === undefined || translated === normalized) return null;
        var start = raw.indexOf(trimmed);
        return raw.slice(0, start) + translated + raw.slice(start + trimmed.length);
    }

    function translateMessage(message) {
        if (typeof message !== 'string') return message;
        var whole = translateText(message);
        if (whole !== null) return whole;
        if (message.indexOf('\n') < 0) return message;
        return message.split('\n').map(function (line) {
            var translated = translateText(line);
            return translated === null ? line : translated;
        }).join('\n');
    }

    function isSkipped(node) {
        var element = node.nodeType === 1 ? node : node.parentElement;
        if (!element) return false;
        return !!(element.closest && element.closest(SKIP_SELECTOR));
    }

    function processText(node) {
        var value = node.nodeValue;
        var record = textRecords.get(node);
        var source = record && value === record.output ? record.source : value;
        var translated = translateText(source);
        var target = translated === null ? source : translated;
        if (target !== value) node.nodeValue = target;
        if (target !== source) textRecords.set(node, { source: source, output: target });
        else if (record) textRecords.delete(node);
    }

    function processAttribute(element, name) {
        if (name === 'value' && !(element.tagName === 'INPUT' && BUTTON_INPUT_TYPES[(element.getAttribute('type') || '').toLowerCase()])) return;
        var value = element.getAttribute(name);
        if (value === null) return;
        var records = attributeRecords.get(element);
        var record = records && records[name];
        var source = record && value === record.output ? record.source : value;
        var translated = translateText(source);
        var target = translated === null ? source : translated;
        if (target !== value) element.setAttribute(name, target);
        if (target !== source) {
            if (!records) {
                records = {};
                attributeRecords.set(element, records);
            }
            records[name] = { source: source, output: target };
        } else if (record) {
            delete records[name];
        }
    }

    function processElementAttributes(element) {
        for (var index = 0; index < TRANSLATED_ATTRIBUTES.length; index++) {
            if (element.hasAttribute(TRANSLATED_ATTRIBUTES[index])) processAttribute(element, TRANSLATED_ATTRIBUTES[index]);
        }
        if (element.tagName === 'INPUT' && element.hasAttribute('value')) processAttribute(element, 'value');
    }

    function rejectElement(element) {
        if (SKIPPED_TAGS[element.tagName]) return true;
        if (element.getAttribute('translate') === 'no') return true;
        if (element.classList && element.classList.contains('notranslate')) return true;
        return element.getAttribute('contenteditable') === 'true';
    }

    function translateTree(root) {
        if (!root) return;
        if (root.nodeType === 3) {
            if (!isSkipped(root)) processText(root);
            return;
        }
        if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
        if (root.nodeType === 1) {
            if (isSkipped(root)) return;
            processElementAttributes(root);
        }
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (node.nodeType === 1) return rejectElement(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var node = walker.nextNode();
        while (node) {
            if (node.nodeType === 3) processText(node);
            else processElementAttributes(node);
            node = walker.nextNode();
        }
    }

    function handleMutations(mutations) {
        for (var index = 0; index < mutations.length; index++) {
            var mutation = mutations[index];
            if (mutation.type === 'childList') {
                for (var added = 0; added < mutation.addedNodes.length; added++) translateTree(mutation.addedNodes[added]);
            } else if (mutation.type === 'characterData') {
                if (mutation.target.isConnected && !isSkipped(mutation.target)) processText(mutation.target);
            } else if (mutation.type === 'attributes') {
                if (!isSkipped(mutation.target)) processAttribute(mutation.target, mutation.attributeName);
            }
        }
    }

    function startObserver() {
        if (observerStarted || !global.MutationObserver) return;
        observerStarted = true;
        observer = new MutationObserver(handleMutations);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: TRANSLATED_ATTRIBUTES.concat(['value'])
        });
    }

    function packFiles(language) {
        return [language].concat(extraPacks.map(function (extra) { return language + '_' + extra; }));
    }

    function packUrl(file) {
        return baseUrl + 'js/i18n/' + file + '.js';
    }

    function writePackScripts(language) {
        packFiles(language).forEach(function (file) {
            loadedPackFiles[file] = true;
            document.write('<script src="' + packUrl(file) + '"><\/script>');
        });
    }

    function loadPackScripts(language) {
        var pending = packFiles(language).filter(function (file) { return !loadedPackFiles[file]; });
        return Promise.all(pending.map(function (file) {
            return new Promise(function (resolve) {
                var script = document.createElement('script');
                script.src = packUrl(file);
                script.onload = function () { loadedPackFiles[file] = true; resolve(); };
                script.onerror = function () { resolve(); };
                (document.head || document.documentElement).appendChild(script);
            });
        }));
    }

    function setLanguage(language) {
        var next = supportedLanguage(language);
        if (!next) return Promise.resolve(false);
        writeStorage(LANGUAGE_STORAGE_KEY, next);
        currentLanguage = next;
        document.documentElement.setAttribute('lang', next);
        var ready = next === SOURCE_LANGUAGE ? Promise.resolve() : loadPackScripts(next);
        return ready.then(function () {
            startObserver();
            translateTree(document.documentElement);
            try { global.dispatchEvent(new CustomEvent('rwl-language-changed', { detail: { language: next } })); } catch (error) {}
            return true;
        });
    }

    function sourceText(node) {
        if (!node) return '';
        if (node.nodeType === 3) {
            var record = textRecords.get(node);
            return record && node.nodeValue === record.output ? record.source : node.nodeValue;
        }
        var parts = [];
        var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
        var current = walker.nextNode();
        while (current) {
            parts.push(sourceText(current));
            current = walker.nextNode();
        }
        return parts.join('');
    }

    ['alert', 'confirm', 'prompt'].forEach(function (name) {
        var native = global[name];
        if (typeof native !== 'function') return;
        global[name] = function (message) {
            var args = Array.prototype.slice.call(arguments);
            args[0] = translateMessage(message);
            return native.apply(global, args);
        };
    });

    document.documentElement.setAttribute('lang', currentLanguage);
    if (currentLanguage !== SOURCE_LANGUAGE) {
        writePackScripts(currentLanguage);
        startObserver();
    }
    document.addEventListener('DOMContentLoaded', function () {
        if (currentLanguage !== SOURCE_LANGUAGE) translateTree(document.documentElement);
    });

    global.RWLI18n = {
        defaultLanguage: DEFAULT_LANGUAGE,
        sourceLanguage: SOURCE_LANGUAGE,
        languages: SUPPORTED_LANGUAGES.slice(),
        languageNames: LANGUAGE_NAMES,
        language: function () { return currentLanguage; },
        register: register,
        setLanguage: setLanguage,
        t: function (text) { var translated = translateMessage(String(text)); return translated; },
        source: sourceText,
        refresh: function (root) { translateTree(root || document.documentElement); }
    };

    var COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])|rgba?\(\s*[\d.]+%?\s*[\s,]\s*[\d.]+%?\s*[\s,]\s*[\d.]+%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)/g;
    var COLOR_HINT = /#[0-9a-fA-F]{3}|rgba?\(/;
    var KEEP_MARKER = '--rwl-keep';
    var THEMED_ATTRIBUTES = ['style', 'fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'];
    var PROTECTED_COLORS = { '184,184,200': true, '76,175,80': true, '59,130,246': true, '168,85,247': true, '245,158,11': true, '239,68,68': true, '255,0,255': true };

    var activeTheme = null;
    var colorCache = new Map();
    var themedDeclarations = [];
    var processedSheets = typeof WeakSet === 'function' ? new WeakSet() : null;
    var themeRecords = new WeakMap();
    var themeObserver = null;

    function clampNumber(value, minimum, maximum, fallback) {
        var number = parseInt(value, 10);
        if (isNaN(number)) return fallback;
        return Math.max(minimum, Math.min(maximum, number));
    }

    function normalizeTheme(raw) {
        if (!raw || typeof raw !== 'object' || !raw.item_id) return null;
        var bandMin = clampNumber(raw.band_min, 0, 359, 245);
        var bandMax = clampNumber(raw.band_max, 0, 359, 330);
        return {
            item_id: String(raw.item_id).slice(0, 64),
            name: String(raw.name || '').slice(0, 80),
            hue: clampNumber(raw.hue, 0, 359, 285),
            saturation: clampNumber(raw.saturation, 0, 200, 100),
            lightness: clampNumber(raw.lightness, -40, 40, 0),
            background_hue: clampNumber(raw.background_hue, 0, 359, clampNumber(raw.hue, 0, 359, 285)),
            base_hue: clampNumber(raw.base_hue, 0, 359, 285),
            band_min: Math.min(bandMin, bandMax),
            band_max: Math.max(bandMin, bandMax),
            min_saturation: clampNumber(raw.min_saturation, 0, 100, 18),
            dark_lightness: clampNumber(raw.dark_lightness, 0, 60, 20)
        };
    }

    function rgbToHsl(red, green, blue) {
        red /= 255; green /= 255; blue /= 255;
        var max = Math.max(red, green, blue);
        var min = Math.min(red, green, blue);
        var lightness = (max + min) / 2;
        var hue = 0;
        var saturation = 0;
        if (max !== min) {
            var delta = max - min;
            saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
            if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
            else if (max === green) hue = (blue - red) / delta + 2;
            else hue = (red - green) / delta + 4;
            hue *= 60;
        }
        return [hue, saturation, lightness];
    }

    function hueToChannel(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    function hslToRgb(hue, saturation, lightness) {
        var h = ((hue % 360) + 360) % 360 / 360;
        if (saturation === 0) {
            var gray = Math.round(lightness * 255);
            return [gray, gray, gray];
        }
        var q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
        var p = 2 * lightness - q;
        return [
            Math.round(hueToChannel(p, q, h + 1 / 3) * 255),
            Math.round(hueToChannel(p, q, h) * 255),
            Math.round(hueToChannel(p, q, h - 1 / 3) * 255)
        ];
    }

    function inBand(hue, theme) {
        return hue >= theme.band_min && hue <= theme.band_max;
    }

    function parseColor(token) {
        if (token.charAt(0) === '#') {
            var hex = token.slice(1);
            if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(function (char) { return char + char; }).join('');
            var alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : null;
            return { rgb: [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)], alpha: alpha, hex: true };
        }
        var numbers = token.replace(/rgba?\(|\)/g, '').split(/[\s,/]+/).filter(Boolean);
        var channels = numbers.slice(0, 3).map(function (entry) {
            return entry.indexOf('%') >= 0 ? Math.round(parseFloat(entry) * 2.55) : parseFloat(entry);
        });
        var alphaValue = numbers.length > 3 ? (numbers[3].indexOf('%') >= 0 ? parseFloat(numbers[3]) / 100 : parseFloat(numbers[3])) : null;
        return { rgb: channels, alpha: alphaValue, hex: false };
    }

    function formatColor(rgb, alpha, asHex) {
        if (asHex && alpha === null) {
            return '#' + rgb.map(function (channel) { return ('0' + Math.max(0, Math.min(255, channel)).toString(16)).slice(-2); }).join('');
        }
        if (alpha === null) return 'rgb(' + rgb.join(', ') + ')';
        return 'rgba(' + rgb.join(', ') + ', ' + (Math.round(alpha * 1000) / 1000) + ')';
    }

    function transformColorToken(token) {
        var cached = colorCache.get(token);
        if (cached !== undefined) return cached;
        var parsed = parseColor(token);
        var result = token;
        if (parsed.rgb.length === 3 && !parsed.rgb.some(isNaN) && !PROTECTED_COLORS[parsed.rgb.join(',')]) {
            var hsl = rgbToHsl(parsed.rgb[0], parsed.rgb[1], parsed.rgb[2]);
            if (hsl[1] * 100 >= activeTheme.min_saturation && inBand(hsl[0], activeTheme)) {
                var dark = hsl[2] * 100 < activeTheme.dark_lightness;
                var offset = (hsl[0] - activeTheme.base_hue) * 0.5;
                var targetHue = (dark ? activeTheme.background_hue : activeTheme.hue) + offset;
                var saturation = Math.max(0, Math.min(1, hsl[1] * activeTheme.saturation / 100));
                var lightness = dark ? hsl[2] : Math.max(0, Math.min(1, hsl[2] + activeTheme.lightness / 100));
                result = formatColor(hslToRgb(targetHue, saturation, lightness), parsed.alpha, parsed.hex);
            }
        }
        colorCache.set(token, result);
        return result;
    }

    function transformValue(value) {
        if (!activeTheme || !value || !COLOR_HINT.test(value)) return value;
        return value.replace(COLOR_PATTERN, transformColorToken);
    }

    function themeDeclarations(style) {
        for (var index = 0; index < style.length; index++) {
            var property = style[index];
            var value = style.getPropertyValue(property);
            if (!value || !COLOR_HINT.test(value)) continue;
            var transformed = transformValue(value);
            if (transformed !== value) {
                themedDeclarations.push({ style: style, property: property, original: value, priority: style.getPropertyPriority(property) });
                style.setProperty(property, transformed, style.getPropertyPriority(property));
            }
        }
    }

    function themeRules(rules) {
        for (var index = 0; index < rules.length; index++) {
            var rule = rules[index];
            if (rule.style) themeDeclarations(rule.style);
            if (rule.cssRules) themeRules(rule.cssRules);
        }
    }

    function themeSheet(sheet) {
        if (!sheet || (processedSheets && processedSheets.has(sheet))) return;
        var rules;
        try { rules = sheet.cssRules; } catch (error) { return; }
        if (!rules) return;
        if (processedSheets) processedSheets.add(sheet);
        themeRules(rules);
    }

    function themeAllSheets() {
        for (var index = 0; index < document.styleSheets.length; index++) themeSheet(document.styleSheets[index]);
    }

    function restoreDeclarations() {
        for (var index = themedDeclarations.length - 1; index >= 0; index--) {
            var entry = themedDeclarations[index];
            try { entry.style.setProperty(entry.property, entry.original, entry.priority); } catch (error) {}
        }
        themedDeclarations = [];
        processedSheets = typeof WeakSet === 'function' ? new WeakSet() : null;
    }

    function processThemeAttribute(element, name) {
        var value = element.getAttribute(name);
        if (value === null) return;
        var records = themeRecords.get(element);
        var record = records && records[name];
        var source = record && value === record.output ? record.source : value;
        var target = !activeTheme || source.indexOf(KEEP_MARKER) >= 0 ? source : transformValue(source);
        if (target !== value) element.setAttribute(name, target);
        if (target !== source) {
            if (!records) {
                records = {};
                themeRecords.set(element, records);
            }
            records[name] = { source: source, output: target };
        } else if (record) {
            delete records[name];
        }
    }

    function themeElement(element) {
        if (!element || element.nodeType !== 1) return;
        if (element.tagName === 'STYLE') {
            themeSheet(element.sheet);
            return;
        }
        if (element.tagName === 'LINK') {
            if (element.sheet) themeSheet(element.sheet);
            else element.addEventListener('load', function () { if (activeTheme) themeSheet(element.sheet); }, { once: true });
            return;
        }
        for (var index = 0; index < THEMED_ATTRIBUTES.length; index++) {
            if (element.hasAttribute(THEMED_ATTRIBUTES[index])) processThemeAttribute(element, THEMED_ATTRIBUTES[index]);
        }
    }

    function themeTree(root) {
        if (!root || root.nodeType !== 1) return;
        themeElement(root);
        var nodes = root.querySelectorAll('[style],[fill],[stroke],[stop-color],style,link[rel="stylesheet"]');
        for (var index = 0; index < nodes.length; index++) themeElement(nodes[index]);
    }

    function handleThemeMutations(mutations) {
        if (!activeTheme) return;
        for (var index = 0; index < mutations.length; index++) {
            var mutation = mutations[index];
            if (mutation.type === 'childList') {
                for (var added = 0; added < mutation.addedNodes.length; added++) themeTree(mutation.addedNodes[added]);
            } else if (mutation.type === 'attributes') {
                processThemeAttribute(mutation.target, mutation.attributeName);
            }
        }
    }

    function startThemeObserver() {
        if (themeObserver || !global.MutationObserver) return;
        themeObserver = new MutationObserver(handleThemeMutations);
        themeObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: THEMED_ATTRIBUTES });
    }

    function stopThemeObserver() {
        if (themeObserver) themeObserver.disconnect();
        themeObserver = null;
    }

    function applyTheme(rawTheme, persist) {
        var theme = normalizeTheme(rawTheme);
        if (activeTheme && theme && activeTheme.item_id === theme.item_id && JSON.stringify(activeTheme) === JSON.stringify(theme)) return;
        restoreDeclarations();
        colorCache = new Map();
        activeTheme = theme;
        if (persist !== false) writeStorage(THEME_STORAGE_KEY, theme ? JSON.stringify(theme) : null);
        if (!theme) {
            stopThemeObserver();
            if (document.body) themeTree(document.documentElement);
            document.documentElement.removeAttribute('data-rwl-theme');
            return;
        }
        document.documentElement.setAttribute('data-rwl-theme', theme.item_id);
        themeAllSheets();
        themeTree(document.documentElement);
        startThemeObserver();
    }

    function storedTheme() {
        try {
            var raw = readStorage(THEME_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    global.RWLTheme = {
        apply: function (theme) { applyTheme(theme, true); },
        clear: function () { applyTheme(null, true); },
        current: function () { return activeTheme; },
        keepMarker: KEEP_MARKER,
        sync: function (cosmetics) {
            var data = cosmetics && cosmetics.launcher_theme_data;
            applyTheme(data || null, true);
        }
    };

    var initialTheme = storedTheme();
    if (initialTheme) applyTheme(initialTheme, false);
})(window);
