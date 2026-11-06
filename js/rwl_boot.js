(function (global) {
    var DEFAULT_LANGUAGE = 'en';
    var API_BASE = 'https://rickware-labs-api.apps.bot-hosting.cloud';
    var VISITOR_LANGUAGE_KEY = 'rwl_visitor_language';
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

    function readSessionValue(key) {
        try { return global.sessionStorage.getItem(key); } catch (error) { return null; }
    }

    function writeSessionValue(key, value) {
        try { global.sessionStorage.setItem(key, value); } catch (error) {}
    }

    function signedIn() {
        try {
            if (global.sessionStorage.getItem('rickware_token')) return true;
            return global.localStorage.getItem('rickware_remember_me') === '1' && !!global.localStorage.getItem('rickware_token');
        } catch (error) {
            return false;
        }
    }

    var currentLanguage = signedIn()
        ? (supportedLanguage(readStorage(LANGUAGE_STORAGE_KEY)) || DEFAULT_LANGUAGE)
        : (supportedLanguage(readSessionValue(VISITOR_LANGUAGE_KEY)) || DEFAULT_LANGUAGE);
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

    function setLanguage(language, scope) {
        var next = supportedLanguage(language);
        if (!next) return Promise.resolve(false);
        if (scope === 'visitor') writeSessionValue(VISITOR_LANGUAGE_KEY, next);
        else writeStorage(LANGUAGE_STORAGE_KEY, next);
        if (next === currentLanguage && (next === SOURCE_LANGUAGE || packs[next])) {
            try { global.dispatchEvent(new CustomEvent('rwl-language-changed', { detail: { language: next } })); } catch (error) {}
            return Promise.resolve(true);
        }
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

    var visitorLookup = null;

    function detectVisitorLanguage() {
        var cached = supportedLanguage(readSessionValue(VISITOR_LANGUAGE_KEY));
        if (cached) return Promise.resolve(cached);
        if (visitorLookup) return visitorLookup;
        visitorLookup = fetch(API_BASE + '/api/visitor/locale', { method: 'GET', credentials: 'omit', cache: 'no-store' })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) {
                var detected = supportedLanguage(data && data.language) || DEFAULT_LANGUAGE;
                writeSessionValue(VISITOR_LANGUAGE_KEY, detected);
                return detected;
            })
            .catch(function () { return DEFAULT_LANGUAGE; });
        return visitorLookup;
    }

    function useVisitorLanguage() {
        return detectVisitorLanguage().then(function (language) {
            return setLanguage(language, 'visitor');
        });
    }

    function useAccountLanguage(preferred) {
        return setLanguage(supportedLanguage(preferred) || DEFAULT_LANGUAGE, 'account');
    }

    global.RWLI18n = {
        defaultLanguage: DEFAULT_LANGUAGE,
        sourceLanguage: SOURCE_LANGUAGE,
        languages: SUPPORTED_LANGUAGES.slice(),
        languageNames: LANGUAGE_NAMES,
        language: function () { return currentLanguage; },
        register: register,
        setLanguage: setLanguage,
        useVisitorLanguage: useVisitorLanguage,
        useAccountLanguage: useAccountLanguage,
        signedIn: signedIn,
        t: function (text) { var translated = translateMessage(String(text)); return translated; },
        source: sourceText,
        refresh: function (root) { translateTree(root || document.documentElement); }
    };

    if (!signedIn() && !supportedLanguage(readSessionValue(VISITOR_LANGUAGE_KEY))) {
        useVisitorLanguage();
    }

    var dialogQueue = Promise.resolve();

    function dialogText(value) {
        return translateMessage(String(value === undefined || value === null ? '' : value));
    }

    function showDialog(options) {
        return new Promise(function (resolve) {
            whenBodyReady(function () {
                var previousFocus = document.activeElement;
                var overlay = document.createElement('div');
                overlay.className = 'rwl-dialog-overlay';
                var card = document.createElement('div');
                card.className = 'rwl-dialog' + (options.danger ? ' rwl-dialog-danger' : '');
                card.setAttribute('role', 'alertdialog');
                card.setAttribute('aria-modal', 'true');
                var title = document.createElement('h2');
                title.className = 'rwl-dialog-title';
                title.textContent = dialogText(options.title || 'Please confirm');
                card.appendChild(title);
                var message = document.createElement('p');
                message.className = 'rwl-dialog-message';
                message.textContent = dialogText(options.message);
                card.appendChild(message);
                var actions = document.createElement('div');
                actions.className = 'rwl-dialog-actions';
                var confirmButton = document.createElement('button');
                confirmButton.type = 'button';
                confirmButton.className = 'rwl-dialog-button rwl-dialog-confirm';
                confirmButton.textContent = dialogText(options.confirmText || 'OK');
                function close(result) {
                    document.removeEventListener('keydown', onKey, true);
                    overlay.remove();
                    if (previousFocus && previousFocus.focus) {
                        try { previousFocus.focus(); } catch (error) {}
                    }
                    resolve(result);
                }
                function onKey(event) {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        close(false);
                    } else if (event.key === 'Enter') {
                        event.preventDefault();
                        close(document.activeElement && document.activeElement.classList.contains('rwl-dialog-cancel') ? false : true);
                    }
                }
                if (options.cancelable) {
                    var cancelButton = document.createElement('button');
                    cancelButton.type = 'button';
                    cancelButton.className = 'rwl-dialog-button rwl-dialog-cancel';
                    cancelButton.textContent = dialogText(options.cancelText || 'Cancel');
                    cancelButton.addEventListener('click', function () { close(false); });
                    actions.appendChild(cancelButton);
                }
                confirmButton.addEventListener('click', function () { close(true); });
                actions.appendChild(confirmButton);
                card.appendChild(actions);
                overlay.appendChild(card);
                overlay.addEventListener('mousedown', function (event) {
                    if (event.target === overlay && options.cancelable) close(false);
                });
                document.addEventListener('keydown', onKey, true);
                document.body.appendChild(overlay);
                confirmButton.focus();
            });
        });
    }

    function queueDialog(options) {
        var result = dialogQueue.then(function () { return showDialog(options); });
        dialogQueue = result.catch(function () {});
        return result;
    }

    global.RWLDialog = {
        confirm: function (options) { return queueDialog(Object.assign({ cancelable: true }, options)); },
        alert: function (options) { return queueDialog(typeof options === 'string' ? { title: 'Notice', message: options } : Object.assign({ title: 'Notice' }, options)); }
    };
    global.alert = function (message) { global.RWLDialog.alert(String(message)); };

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

    function normalizeAnimation(raw) {
        if (!raw || typeof raw !== 'object' || (raw.mode !== 'oscillate' && raw.mode !== 'cycle')) return null;
        return {
            mode: raw.mode,
            hue_to: clampNumber(raw.hue_to, 0, 720, 360),
            period_seconds: clampNumber(raw.period_seconds, 6, 120, 20)
        };
    }

    function normalizeTheme(raw) {
        if (!raw || typeof raw !== 'object' || !raw.item_id) return null;
        var bandMin = clampNumber(raw.band_min, 0, 359, 245);
        var bandMax = clampNumber(raw.band_max, 0, 359, 330);
        return {
            animation: normalizeAnimation(raw.animation),
            scene: raw.scene && typeof raw.scene === 'object' ? raw.scene : null,
            speed: Math.max(0.5, Math.min(2, parseFloat(raw.speed) || 1)),
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

    var ANIMATION_STEP_MS = 1400;
    var ANIMATION_SLOW_STEP_MS = 3200;
    var ANIMATION_VERY_SLOW_STEP_MS = 7000;
    var INTERACTION_QUIET_MS = 450;
    var HUE_QUANTIZE = 4;
    var AUTO_LOW_FX_MIN_FPS = 28;
    var AUTO_LOW_FX_SAMPLE_MS = 2500;
    var AUTO_LOW_FX_DELAY_MS = 3000;
    var AUTO_LOW_FX_DAYS = 14;
    var animationTimer = null;
    var animationBase = null;
    var animationStep = ANIMATION_STEP_MS;
    var lastInteraction = 0;
    var bootScript = document.currentScript;
    var baseUrl = bootScript && bootScript.src ? bootScript.src.replace(/js\/rwl_boot\.js.*$/, '') : '';
    var scenesRequested = false;
    var pendingScene = null;

    function markInteraction() {
        lastInteraction = Date.now();
    }

    ['scroll', 'wheel', 'pointermove', 'pointerdown', 'keydown', 'touchmove'].forEach(function (eventName) {
        global.addEventListener(eventName, markInteraction, { passive: true, capture: true });
    });

    function loadUpgradeStyles() {
        if (!baseUrl || document.getElementById('rwlUpgradeStyles')) return;
        var link = document.createElement('link');
        link.id = 'rwlUpgradeStyles';
        link.rel = 'stylesheet';
        link.href = baseUrl + 'css/rwl_upgrade.css';
        (document.head || document.documentElement).appendChild(link);
        var frames = document.createElement('link');
        frames.id = 'rwlFrameStyles';
        frames.rel = 'stylesheet';
        frames.href = baseUrl + 'css/rwl_frames.css';
        (document.head || document.documentElement).appendChild(frames);
    }

    function lowEndDevice() {
        var navigatorInfo = global.navigator || {};
        return (navigatorInfo.deviceMemory && navigatorInfo.deviceMemory <= 2) || (navigatorInfo.hardwareConcurrency && navigatorInfo.hardwareConcurrency <= 2);
    }

    function reducedEffects() {
        return readStorage('rwl_reduced_effects') === '1';
    }

    function applyEffectPreference() {
        var reduced = reducedEffects();
        global.RWL_REDUCED_EFFECTS = reduced;
        document.documentElement.classList.toggle('rwl-low-fx', reduced || lowEndDevice() || autoLowEffectsActive());
    }

    function syncScene(theme) {
        var scene = theme && theme.scene;
        pendingScene = scene ? { scene: scene, speed: theme.speed || 1 } : null;
        if (!scene) {
            if (global.RWLScenes) global.RWLScenes.clear();
            return;
        }
        if (global.RWLScenes) {
            whenBodyReady(function () { if (pendingScene) global.RWLScenes.set(pendingScene.scene, pendingScene.speed); });
            return;
        }
        if (scenesRequested || !baseUrl) return;
        scenesRequested = true;
        var pieces = document.createElement('script');
        pieces.src = baseUrl + 'js/rwl_scene_pieces.js';
        pieces.async = false;
        (document.head || document.documentElement).appendChild(pieces);
        var script = document.createElement('script');
        script.src = baseUrl + 'js/rwl_scenes.js';
        script.async = false;
        script.onload = function () {
            whenBodyReady(function () { if (pendingScene && global.RWLScenes) global.RWLScenes.set(pendingScene.scene, pendingScene.speed); });
        };
        (document.head || document.documentElement).appendChild(script);
    }

    function whenBodyReady(callback) {
        if (document.body) callback();
        else document.addEventListener('DOMContentLoaded', callback, { once: true });
    }

    function setAutoLowEffects() {
        writeStorage('rwl_auto_low_fx', String(Date.now()));
        document.documentElement.classList.add('rwl-low-fx');
    }

    function autoLowEffectsActive() {
        var stored = parseInt(readStorage('rwl_auto_low_fx'), 10);
        return !isNaN(stored) && Date.now() - stored < AUTO_LOW_FX_DAYS * 86400000;
    }

    function measurePerformance() {
        if (autoLowEffectsActive() || !global.requestAnimationFrame) return;
        var frames = 0;
        var started = 0;
        function tick(now) {
            if (document.hidden) {
                started = 0;
                frames = 0;
                global.requestAnimationFrame(tick);
                return;
            }
            if (!started) started = now;
            frames += 1;
            if (now - started < AUTO_LOW_FX_SAMPLE_MS) {
                global.requestAnimationFrame(tick);
                return;
            }
            if (frames / ((now - started) / 1000) < AUTO_LOW_FX_MIN_FPS) setAutoLowEffects();
        }
        global.setTimeout(function () { global.requestAnimationFrame(tick); }, AUTO_LOW_FX_DELAY_MS);
    }

    loadUpgradeStyles();
    applyEffectPreference();
    if (autoLowEffectsActive()) document.documentElement.classList.add('rwl-low-fx');
    measurePerformance();

    function reducedMotion() {
        try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (error) { return false; }
    }

    function retint() {
        colorCache = new Map();
        var root = document.documentElement;
        root.classList.add('rwl-retinting');
        for (var index = 0; index < themedDeclarations.length; index++) {
            var entry = themedDeclarations[index];
            try { entry.style.setProperty(entry.property, transformValue(entry.original), entry.priority); } catch (error) {}
        }
        var nodes = document.querySelectorAll('[style],[fill],[stroke],[stop-color]');
        for (var node = 0; node < nodes.length; node++) {
            for (var attribute = 0; attribute < THEMED_ATTRIBUTES.length; attribute++) {
                if (nodes[node].hasAttribute(THEMED_ATTRIBUTES[attribute])) processThemeAttribute(nodes[node], THEMED_ATTRIBUTES[attribute]);
            }
        }
        global.requestAnimationFrame(function () { global.requestAnimationFrame(function () { root.classList.remove('rwl-retinting'); }); });
    }

    function animationFrame() {
        if (!activeTheme || !animationBase || !activeTheme.animation) return;
        if (document.hidden || Date.now() - lastInteraction < INTERACTION_QUIET_MS || reducedEffects()) return;
        var animation = activeTheme.animation;
        var seconds = (Date.now() / 1000) % animation.period_seconds;
        var progress = seconds / animation.period_seconds;
        var offset;
        if (animation.mode === 'cycle') {
            offset = progress * 360;
        } else {
            offset = ((Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 1) / 2) * (animation.hue_to - animationBase.hue);
        }
        var nextHue = Math.round((animationBase.hue + offset + 720) / HUE_QUANTIZE) * HUE_QUANTIZE % 360;
        var nextBackground = Math.round((animationBase.background_hue + offset * (animation.mode === 'cycle' ? 1 : 0.6) + 720) / HUE_QUANTIZE) * HUE_QUANTIZE % 360;
        if (nextHue === activeTheme.hue && nextBackground === activeTheme.background_hue) return;
        activeTheme.hue = nextHue;
        activeTheme.background_hue = nextBackground;
        var started = (global.performance && performance.now) ? performance.now() : Date.now();
        retint();
        var elapsed = ((global.performance && performance.now) ? performance.now() : Date.now()) - started;
        var nextStep = elapsed > 90 ? ANIMATION_VERY_SLOW_STEP_MS : (elapsed > 30 ? ANIMATION_SLOW_STEP_MS : ANIMATION_STEP_MS);
        if (nextStep !== animationStep) {
            animationStep = nextStep;
            startThemeAnimation();
        }
    }

    function stopThemeAnimation() {
        if (animationTimer) clearInterval(animationTimer);
        animationTimer = null;
    }

    function startThemeAnimation() {
        stopThemeAnimation();
        if (!activeTheme || !activeTheme.animation || reducedMotion()) return;
        animationTimer = setInterval(animationFrame, animationStep);
    }

    function applyTheme(rawTheme, persist) {
        var theme = normalizeTheme(rawTheme);
        if (activeTheme && theme && activeTheme.item_id === theme.item_id && animationBase && JSON.stringify(animationBase) === JSON.stringify(theme)) return;
        if (activeTheme && theme && activeTheme.item_id === theme.item_id && !theme.animation && JSON.stringify(activeTheme) === JSON.stringify(theme)) return;
        stopThemeAnimation();
        animationBase = theme ? JSON.parse(JSON.stringify(theme)) : null;
        syncScene(theme);
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
        if (theme.animation) {
            animationStep = ANIMATION_STEP_MS;
            startThemeAnimation();
        }
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
        preview: function (theme) { applyTheme(theme, false); },
        setReducedEffects: function (enabled) {
            writeStorage('rwl_reduced_effects', enabled ? '1' : null);
            applyEffectPreference();
            syncScene(activeTheme);
            if (enabled && global.RWLScenes) global.RWLScenes.clear();
        },
        clear: function () { applyTheme(null, true); },
        current: function () { return activeTheme; },
        keepMarker: KEEP_MARKER,
        sync: function (cosmetics) {
            var data = cosmetics && cosmetics.launcher_theme_data;
            applyTheme(data || null, true);
        }
    };

    var previewMode = /[?&]rwl_preview=1/.test(global.location.search);
    if (previewMode) {
        document.documentElement.classList.add('rwl-preview-frame');
        global.RWLTheme.apply = function () {};
        global.RWLTheme.sync = function () {};
        global.RWLTheme.clear = function () {};
        global.addEventListener('message', function (event) {
            if (event.origin !== global.location.origin || !event.data || event.data.type !== 'rwl_theme_preview') return;
            applyTheme(event.data.theme || null, false);
        });
    }
    var initialTheme = previewMode ? null : storedTheme();
    if (initialTheme) applyTheme(initialTheme, false);

    var SERVER_HEALTH_URL = API_BASE + '/health';
    var SERVER_PROBE_TIMEOUT_MS = 8000;
    var SERVER_QUICK_RETRY_MS = 1500;
    var SERVER_RETRY_STEPS_MS = [15000, 30000, 60000];
    var SERVER_NOTICE_MS = 60000;
    var SERVER_RESTORED_MS = 12000;
    var SERVER_FAILURE_WINDOW_MS = 30000;
    var SERVER_FAILURE_LIMIT = 2;
    var SERVER_BACKGROUND_PATH = /\/api\/(presence|analytics|client\/state)/;
    var SERVER_PROBLEM_STATES = { server: true, network: true, blocked: true };
    var SERVER_STATUS_COPY = {
        server: { title: 'Server Problems', text: 'We are currently having problems with our server. Some features may not work right now. We are working on it.' },
        network: { title: 'No Connection', text: 'You appear to be offline. Please check your internet connection.' },
        blocked: { title: 'Connection Blocked', text: 'Your connection was temporarily blocked by our security system. Please try again later.' },
        limited: { title: 'Too Many Requests', text: 'Too many requests came from your connection. Please wait a moment.' },
        degraded: { title: 'Limited Service', text: 'Some features are currently not working correctly. We are working on it.' },
        restored: { title: 'Connection Restored', text: 'The server is reachable again. Reload the page if something is missing.' }
    };
    var serverState = null;
    var serverDismissed = null;
    var serverProbeRunning = false;
    var serverProbeTimer = null;
    var serverClearTimer = null;
    var serverFailedProbes = 0;
    var serverQuickRetried = false;
    var serverFailures = [];
    var pageUnloading = false;

    function removeServerBanner() {
        var banner = document.getElementById('rwlServerBanner');
        if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    }

    function serverButton(className, label, title, action) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.addEventListener('click', action);
        return button;
    }

    function renderServerBanner() {
        removeServerBanner();
        if (!serverState || serverDismissed === serverState || !document.body) return;
        var copy = SERVER_STATUS_COPY[serverState];
        var banner = document.createElement('div');
        banner.id = 'rwlServerBanner';
        banner.className = 'rwl-server-banner rwl-server-banner-' + serverState;
        banner.setAttribute('role', 'alert');
        var content = document.createElement('div');
        content.className = 'rwl-server-banner-content';
        var title = document.createElement('strong');
        title.textContent = copy.title;
        var text = document.createElement('span');
        text.textContent = copy.text;
        content.appendChild(title);
        content.appendChild(text);
        banner.appendChild(content);
        if (serverState === 'restored') {
            banner.appendChild(serverButton('rwl-server-banner-action', 'Reload', 'Reload this page', function () { global.location.reload(); }));
        } else {
            banner.appendChild(serverButton('rwl-server-banner-action', 'Try Again', 'Check the server connection again', function () { serverQuickRetried = true; probeServer(); }));
        }
        banner.appendChild(serverButton('rwl-server-banner-close', '\u00d7', 'Hide this message', function () { serverDismissed = serverState; removeServerBanner(); }));
        document.body.appendChild(banner);
    }

    function setServerState(state, clearAfterMs) {
        global.clearTimeout(serverClearTimer);
        serverClearTimer = null;
        if (state !== serverState) {
            serverState = state;
            serverDismissed = null;
            whenBodyReady(renderServerBanner);
        }
        if (clearAfterMs) {
            serverClearTimer = global.setTimeout(function () {
                serverState = null;
                removeServerBanner();
            }, clearAfterMs);
        }
    }

    function scheduleServerProbe(delay) {
        global.clearTimeout(serverProbeTimer);
        serverProbeTimer = global.setTimeout(function () {
            if (document.hidden) scheduleServerProbe(delay);
            else probeServer();
        }, delay);
    }

    function recentServerFailures() {
        var now = Date.now();
        serverFailures = serverFailures.filter(function (stamp) { return now - stamp < SERVER_FAILURE_WINDOW_MS; });
        return serverFailures.length;
    }

    function handleServerHealth(data) {
        var hadProblem = !!SERVER_PROBLEM_STATES[serverState];
        serverFailedProbes = 0;
        serverQuickRetried = false;
        var blockedSeconds = data ? parseInt(data.blocked_seconds, 10) || 0 : 0;
        if (blockedSeconds > 0) {
            setServerState('blocked');
            scheduleServerProbe(Math.max(SERVER_RETRY_STEPS_MS[2], Math.min(blockedSeconds * 1000, 300000)));
            return;
        }
        if ((data && data.status === 'degraded') || recentServerFailures() >= SERVER_FAILURE_LIMIT) {
            setServerState('degraded', SERVER_NOTICE_MS);
            if (data && data.status === 'degraded') scheduleServerProbe(SERVER_RETRY_STEPS_MS[2]);
            return;
        }
        if (hadProblem) setServerState('restored', SERVER_RESTORED_MS);
    }

    function handleServerProbeFailure(timedOut) {
        if (global.navigator && global.navigator.onLine === false) {
            setServerState('network');
            scheduleServerProbe(SERVER_RETRY_STEPS_MS[0]);
            return;
        }
        if (!timedOut && !serverQuickRetried) {
            serverQuickRetried = true;
            scheduleServerProbe(SERVER_QUICK_RETRY_MS);
            return;
        }
        setServerState('server');
        var step = SERVER_RETRY_STEPS_MS[Math.min(serverFailedProbes, SERVER_RETRY_STEPS_MS.length - 1)];
        serverFailedProbes += 1;
        scheduleServerProbe(step * (0.85 + Math.random() * 0.3));
    }

    function probeServer() {
        if (serverProbeRunning) return;
        serverProbeRunning = true;
        global.clearTimeout(serverProbeTimer);
        var timedOut = false;
        var controller = global.AbortController ? new AbortController() : null;
        var timeout = global.setTimeout(function () {
            timedOut = true;
            if (controller) controller.abort();
        }, SERVER_PROBE_TIMEOUT_MS);
        rawServerFetch.call(global, SERVER_HEALTH_URL, { cache: 'no-store', credentials: 'omit', signal: controller ? controller.signal : undefined }).then(function (response) {
            if (!response.ok) throw new Error('status');
            return response.json().catch(function () { return {}; });
        }).then(function (data) {
            global.clearTimeout(timeout);
            serverProbeRunning = false;
            handleServerHealth(data);
        }).catch(function () {
            global.clearTimeout(timeout);
            serverProbeRunning = false;
            handleServerProbeFailure(timedOut);
        });
    }

    function noteServerFailure(counts) {
        if (counts) serverFailures.push(Date.now());
        if (!serverProbeRunning) scheduleServerProbe(SERVER_QUICK_RETRY_MS);
    }

    function observeServerResponse(response, background) {
        var status = response.status;
        if (status === 429 && !background) {
            setServerState('limited', SERVER_NOTICE_MS);
        } else if (status === 403) {
            response.clone().json().then(function (body) {
                if (body && body.ip_blocked) {
                    setServerState('blocked');
                    scheduleServerProbe(SERVER_RETRY_STEPS_MS[2]);
                }
            }).catch(function () {});
        } else if (status === 503) {
            response.clone().json().then(function (body) {
                if (!body || !body.system_state) noteServerFailure(!background);
            }).catch(function () { noteServerFailure(!background); });
        } else if (status >= 500) {
            noteServerFailure(!background);
        }
    }

    var rawServerFetch = typeof global.fetch === 'function' ? global.fetch : null;
    if (rawServerFetch && !previewMode) {
        global.fetch = function (input) {
            var result = rawServerFetch.apply(this, arguments);
            try {
                var url = String((input && input.url) || input || '');
                if (url.indexOf(API_BASE) === 0 && url.indexOf(SERVER_HEALTH_URL) !== 0) {
                    var background = SERVER_BACKGROUND_PATH.test(url);
                    result.then(function (response) {
                        observeServerResponse(response, background);
                    }, function (error) {
                        if (pageUnloading || (error && error.name === 'AbortError') || background) return;
                        noteServerFailure(true);
                    });
                }
            } catch (error) {}
            return result;
        };
        global.addEventListener('pagehide', function () { pageUnloading = true; });
        global.addEventListener('pageshow', function () { pageUnloading = false; });
        global.addEventListener('online', probeServer);
        global.addEventListener('offline', function () { setServerState('network'); });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && SERVER_PROBLEM_STATES[serverState]) probeServer();
        });
        probeServer();
    }
})(window);
