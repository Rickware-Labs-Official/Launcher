(function (global) {
    if (global.LabcordExtras || !global.RWL) return;

    var esc = RWL.escapeHtml;
    var HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
    var PRESET_COLORS = ['#9D4EDD', '#7B2CBF', '#E0AAFF', '#F23F43', '#F0B232', '#23A55A', '#3BA5FF', '#00BCD4', '#FF73FA', '#FFFFFF', '#B5BAC1', '#1ABC9C'];
    var NAME_COLOR_PAGE = 48;
    var DIRECTION_LABELS = { ltr: 'Left To Right', rtl: 'Right To Left', ttb: 'Top To Bottom', btt: 'Bottom To Top', center_out: 'Center To Outside', edge_in: 'Outside To Center' };
    var LONG_PRESS_MS = 320;
    var MOVE_THRESHOLD = 6;
    var nameColorCache = null;
    var openPicker = null;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function hsvToHex(hue, saturation, value) {
        var chroma = value * saturation;
        var sector = (hue / 60) % 6;
        var x = chroma * (1 - Math.abs((sector % 2) - 1));
        var red = 0;
        var green = 0;
        var blue = 0;
        if (sector < 1) { red = chroma; green = x; }
        else if (sector < 2) { red = x; green = chroma; }
        else if (sector < 3) { green = chroma; blue = x; }
        else if (sector < 4) { green = x; blue = chroma; }
        else if (sector < 5) { red = x; blue = chroma; }
        else { red = chroma; blue = x; }
        var offset = value - chroma;
        var toByte = function (channel) { return ('0' + Math.round((channel + offset) * 255).toString(16)).slice(-2); };
        return ('#' + toByte(red) + toByte(green) + toByte(blue)).toUpperCase();
    }

    function hexToHsv(hex) {
        var value = HEX_PATTERN.test(hex) ? hex : '#9D4EDD';
        var red = parseInt(value.slice(1, 3), 16) / 255;
        var green = parseInt(value.slice(3, 5), 16) / 255;
        var blue = parseInt(value.slice(5, 7), 16) / 255;
        var max = Math.max(red, green, blue);
        var min = Math.min(red, green, blue);
        var delta = max - min;
        var hue = 0;
        if (delta) {
            if (max === red) hue = ((green - blue) / delta) % 6;
            else if (max === green) hue = (blue - red) / delta + 2;
            else hue = (red - green) / delta + 4;
            hue *= 60;
            if (hue < 0) hue += 360;
        }
        return { h: hue, s: max ? delta / max : 0, v: max };
    }

    function closePicker() {
        if (openPicker) {
            openPicker.remove();
            openPicker = null;
        }
    }

    function colorFieldHtml(name, value, disabled) {
        var color = HEX_PATTERN.test(value) ? value.toUpperCase() : '#9D4EDD';
        return '<span class="lc-colorfield" data-colorfield>' +
            '<button type="button" class="lc-color-swatch" data-color-trigger style="--rwl-keep:1;background:' + esc(color) + '"' + (disabled ? ' disabled' : '') + ' title="' + esc(t('Pick a colour')) + '"></button>' +
            '<input type="text" class="lc-input lc-color-hex" data-color-hex maxlength="7" spellcheck="false" value="' + esc(color) + '"' + (disabled ? ' disabled' : '') + '>' +
            '<input type="hidden" name="' + esc(name) + '" value="' + esc(color) + '"></span>';
    }

    function setFieldValue(field, hex) {
        var color = hex.toUpperCase();
        field.querySelector('input[type="hidden"]').value = color;
        field.querySelector('[data-color-hex]').value = color;
        field.querySelector('[data-color-trigger]').style.background = color;
        field.classList.remove('lc-invalid');
        field.dispatchEvent(new CustomEvent('lc-color-change', { bubbles: true, detail: { value: color } }));
    }

    function showPicker(field) {
        closePicker();
        var current = field.querySelector('input[type="hidden"]').value;
        var hsv = hexToHsv(current);
        var popup = document.createElement('div');
        popup.className = 'lc-cpick';
        popup.innerHTML = '<div class="lc-cpick-sv" data-sv><i class="lc-cpick-thumb" data-sv-thumb></i></div>' +
            '<div class="lc-cpick-hue" data-hue><i class="lc-cpick-thumb" data-hue-thumb></i></div>' +
            '<div class="lc-cpick-row"><span class="lc-cpick-preview" data-preview></span><input type="text" class="lc-input" data-popup-hex maxlength="7" spellcheck="false"></div>' +
            '<div class="lc-cpick-presets">' + PRESET_COLORS.map(function (color) { return '<button type="button" class="lc-cpick-preset" data-preset="' + color + '" style="--rwl-keep:1;background:' + color + '" title="' + color + '"></button>'; }).join('') + '</div>';
        document.body.appendChild(popup);
        openPicker = popup;
        var surface = popup.querySelector('[data-sv]');
        var hueBar = popup.querySelector('[data-hue]');
        var paint = function (commit) {
            var hex = hsvToHex(hsv.h, hsv.s, hsv.v);
            surface.style.backgroundColor = hsvToHex(hsv.h, 1, 1);
            popup.querySelector('[data-sv-thumb]').style.left = (hsv.s * 100) + '%';
            popup.querySelector('[data-sv-thumb]').style.top = ((1 - hsv.v) * 100) + '%';
            popup.querySelector('[data-hue-thumb]').style.left = (hsv.h / 360 * 100) + '%';
            popup.querySelector('[data-preview]').style.background = hex;
            popup.querySelector('[data-popup-hex]').value = hex;
            if (commit) setFieldValue(field, hex);
        };
        var drag = function (element, handler) {
            element.addEventListener('pointerdown', function (event) {
                event.preventDefault();
                element.setPointerCapture(event.pointerId);
                var move = function (moveEvent) {
                    var rect = element.getBoundingClientRect();
                    handler(clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1), clamp((moveEvent.clientY - rect.top) / rect.height, 0, 1));
                    paint(true);
                };
                move(event);
                element.addEventListener('pointermove', move);
                var stop = function () {
                    element.removeEventListener('pointermove', move);
                    element.removeEventListener('pointerup', stop);
                    element.removeEventListener('pointercancel', stop);
                };
                element.addEventListener('pointerup', stop);
                element.addEventListener('pointercancel', stop);
            });
        };
        drag(surface, function (x, y) { hsv.s = x; hsv.v = 1 - y; });
        drag(hueBar, function (x) { hsv.h = x * 360; });
        popup.querySelector('[data-popup-hex]').addEventListener('input', function (event) {
            var value = event.target.value.trim().toUpperCase();
            if (!HEX_PATTERN.test(value)) return;
            hsv = hexToHsv(value);
            paint(true);
        });
        popup.addEventListener('click', function (event) {
            var preset = event.target.closest('[data-preset]');
            if (!preset) return;
            hsv = hexToHsv(preset.getAttribute('data-preset'));
            paint(true);
        });
        paint(false);
        var rect = field.getBoundingClientRect();
        var top = rect.bottom + 8;
        if (top + popup.offsetHeight > global.innerHeight - 8) top = Math.max(8, rect.top - popup.offsetHeight - 8);
        popup.style.top = top + 'px';
        popup.style.left = Math.max(8, Math.min(global.innerWidth - popup.offsetWidth - 8, rect.left)) + 'px';
    }

    function bindColorFields(root) {
        Array.prototype.forEach.call(root.querySelectorAll('[data-colorfield]'), function (field) {
            var trigger = field.querySelector('[data-color-trigger]');
            var text = field.querySelector('[data-color-hex]');
            if (field.getAttribute('data-bound')) return;
            field.setAttribute('data-bound', '1');
            trigger.addEventListener('click', function (event) {
                event.stopPropagation();
                if (openPicker) closePicker();
                else showPicker(field);
            });
            text.addEventListener('input', function () {
                var value = text.value.trim();
                if (HEX_PATTERN.test(value)) setFieldValue(field, value);
                else field.classList.add('lc-invalid');
            });
        });
    }

    document.addEventListener('click', function (event) {
        if (openPicker && !openPicker.contains(event.target) && !event.target.closest('[data-colorfield]')) closePicker();
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closePicker();
    });

    async function loadNameColors() {
        if (nameColorCache) return nameColorCache;
        var data = await RWL.apiRequest('/api/cosmetics/catalog/name_colors');
        nameColorCache = data.items || [];
        return nameColorCache;
    }

    function swatchHtml(item) {
        return '<i class="lc-cosmetic-swatch" style="' + esc(RWL.swatchStyle(item)) + '"></i>';
    }

    function roleStyleFieldsHtml(role, disabled) {
        var current = role.name_color || '';
        var directionOptions = Object.keys(DIRECTION_LABELS).map(function (key) {
            return '<option value="' + key + '"' + (key === (role.direction || 'ltr') ? ' selected' : '') + '>' + esc(t(DIRECTION_LABELS[key])) + '</option>';
        }).join('');
        return '<div class="lc-field"><span>' + esc(t('Name Colour Style')) + '</span><div class="lc-namecolor-current"><span class="lc-namecolor-preview" data-namecolor-preview translate="no" style="' + esc(RWL.nameColorStyle(role.style || {}, role.color)) + '">' + esc(role.name) + '</span>' +
            '<button type="button" class="lc-btn lc-btn-small" data-namecolor-open' + (disabled ? ' disabled' : '') + ' title="' + esc(t('Choose from every name colour')) + '">' + esc(t('Choose Name Colour')) + '</button>' +
            '<button type="button" class="lc-btn lc-btn-small" data-namecolor-clear' + (current && !disabled ? '' : ' disabled') + ' title="' + esc(t('Use the plain role colour')) + '">' + esc(t('Plain Colour')) + '</button>' +
            '<input type="hidden" name="name_color" value="' + esc(current) + '"></div></div>' +
            '<label class="lc-field"><span>' + esc(t('Animation Speed')) + ' <strong data-speed-value>' + Number(role.speed || 1).toFixed(2) + 'x</strong></span><input type="range" class="lc-range" name="speed" min="0.5" max="2" step="0.25" value="' + esc(String(role.speed || 1)) + '"' + (disabled ? ' disabled' : '') + '></label>' +
            '<label class="lc-field"><span>' + esc(t('Direction')) + '</span><select class="lc-select" name="direction"' + (disabled ? ' disabled' : '') + '>' + directionOptions + '</select></label>' +
            '<label class="lc-field"><span>' + esc(t('Apply Colour To')) + '</span><select class="lc-select" name="color_scope"' + (disabled ? ' disabled' : '') + '><option value="names"' + (role.color_scope !== 'header' ? ' selected' : '') + '>' + esc(t('Usernames and the category title')) + '</option><option value="header"' + (role.color_scope === 'header' ? ' selected' : '') + '>' + esc(t('Only the category title in the member list')) + '</option></select></label>';
    }

    function previewStyleFromForm(form, role) {
        var hidden = form.elements.name_color.value;
        var match = nameColorCache ? nameColorCache.filter(function (item) { return item.item_id === hidden; })[0] : null;
        var source = {
            name_color: hidden || null,
            name_color_hex: form.elements.color.value,
            name_color_gradient: match ? match.gradient : null,
            name_color_animated: !!(match && match.animated && match.gradient),
            name_color_effect: match ? match.effect : null,
            name_color_animation_seconds: match ? match.animation_seconds : null,
            name_color_speed: parseFloat(form.elements.speed.value) || 1,
            name_color_direction: form.elements.direction.value
        };
        return RWL.nameColorStyle(source, form.elements.color.value || role.color);
    }

    function refreshPreview(form, role) {
        var preview = form.querySelector('[data-namecolor-preview]');
        if (preview) preview.setAttribute('style', previewStyleFromForm(form, role));
        var clear = form.querySelector('[data-namecolor-clear]');
        if (clear && !form.querySelector('[data-namecolor-open]').disabled) clear.disabled = !form.elements.name_color.value;
    }

    function openNameColorDialog(onPick) {
        var layer = document.createElement('div');
        layer.className = 'rwl-modal-backdrop lc-namecolor-layer';
        layer.innerHTML = '<div class="rwl-modal lc-namecolor-dialog"><h2>' + esc(t('Choose Name Colour')) + '</h2><p>' + esc(t('Every name colour of the platform is available for roles.')) + '</p>' +
            '<input type="search" class="lc-input" data-nc-search maxlength="60" placeholder="' + esc(t('Search name colours')) + '">' +
            '<div class="lc-namecolor-grid" data-nc-grid></div><div class="rwl-modal-actions"><button type="button" class="rwl-modal-btn ghost" data-nc-more hidden>' + esc(t('Show More')) + '</button><button type="button" class="rwl-modal-btn ghost" data-nc-close>' + esc(t('Close')) + '</button></div></div>';
        document.body.appendChild(layer);
        var grid = layer.querySelector('[data-nc-grid]');
        var more = layer.querySelector('[data-nc-more]');
        var shown = NAME_COLOR_PAGE;
        var matches = [];
        var render = function () {
            var query = layer.querySelector('[data-nc-search]').value.trim().toLowerCase();
            matches = (nameColorCache || []).filter(function (item) { return !query || String(item.name || item.item_id).toLowerCase().indexOf(query) >= 0; });
            grid.innerHTML = matches.slice(0, shown).map(function (item) {
                return '<button type="button" class="lc-cosmetic" data-nc-pick="' + esc(item.item_id) + '" title="' + esc(item.name || item.item_id) + '">' + swatchHtml(item) + '<span translate="no">' + esc(item.name || item.item_id) + '</span></button>';
            }).join('') || '<div class="lc-empty">' + esc(t('No name colours found.')) + '</div>';
            more.hidden = matches.length <= shown;
        };
        layer.querySelector('[data-nc-search]').addEventListener('input', function () { shown = NAME_COLOR_PAGE; render(); });
        more.addEventListener('click', function () { shown += NAME_COLOR_PAGE; render(); });
        layer.querySelector('[data-nc-close]').addEventListener('click', function () { layer.remove(); });
        layer.addEventListener('click', function (event) {
            if (event.target === layer) layer.remove();
            var pick = event.target.closest('[data-nc-pick]');
            if (!pick) return;
            layer.remove();
            onPick(pick.getAttribute('data-nc-pick'));
        });
        loadNameColors().then(render).catch(function () { grid.innerHTML = '<div class="lc-empty">' + esc(t('The name colours could not be loaded.')) + '</div>'; });
    }

    function bindRoleStyle(form, role) {
        bindColorFields(form);
        loadNameColors().then(function () { refreshPreview(form, role); }).catch(function () {});
        form.addEventListener('lc-color-change', function () { refreshPreview(form, role); });
        var speed = form.elements.speed;
        if (speed) speed.addEventListener('input', function () {
            form.querySelector('[data-speed-value]').textContent = parseFloat(speed.value).toFixed(2) + 'x';
            refreshPreview(form, role);
        });
        if (form.elements.direction) form.elements.direction.addEventListener('change', function () { refreshPreview(form, role); });
        var open = form.querySelector('[data-namecolor-open]');
        if (open) open.addEventListener('click', function () {
            openNameColorDialog(function (itemId) {
                form.elements.name_color.value = itemId;
                refreshPreview(form, role);
            });
        });
        var clear = form.querySelector('[data-namecolor-clear]');
        if (clear) clear.addEventListener('click', function () {
            form.elements.name_color.value = '';
            refreshPreview(form, role);
        });
    }

    function readRoleStyle(form) {
        return {
            name_color: form.elements.name_color.value || '',
            speed: parseFloat(form.elements.speed.value) || 1,
            direction: form.elements.direction.value,
            color_scope: form.elements.color_scope.value
        };
    }

    function attachSortable(root, options) {
        var state = null;
        function cleanup() {
            if (!state) return;
            if (state.ghost) state.ghost.remove();
            if (state.indicator) state.indicator.classList.remove('lc-drop-before', 'lc-drop-after', 'lc-drop-into');
            if (state.source) state.source.classList.remove('lc-dragging');
            document.body.classList.remove('lc-sorting');
            global.clearTimeout(state.timer);
            state = null;
        }
        function begin(event, source) {
            state.active = true;
            state.ghost = source.cloneNode(true);
            state.ghost.className += ' lc-drag-ghost';
            state.ghost.style.width = source.offsetWidth + 'px';
            document.body.appendChild(state.ghost);
            source.classList.add('lc-dragging');
            document.body.classList.add('lc-sorting');
            move(event);
        }
        function move(event) {
            if (!state || !state.active) return;
            state.ghost.style.left = (event.clientX + 10) + 'px';
            state.ghost.style.top = (event.clientY + 6) + 'px';
            if (state.indicator) state.indicator.classList.remove('lc-drop-before', 'lc-drop-after', 'lc-drop-into');
            state.target = null;
            var element = document.elementFromPoint(event.clientX, event.clientY);
            var target = element && element.closest(options.itemSelector);
            if (!target || target === state.source || !root.contains(target) || !options.canDrop(state.source, target)) return;
            var rect = target.getBoundingClientRect();
            var vertical = options.axis !== 'x';
            var ratio = vertical ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;
            var position = ratio < 0.5 ? 'before' : 'after';
            if (options.intoSelector && target.matches(options.intoSelector) && ratio > 0.3 && ratio < 0.7) position = 'into';
            state.target = target;
            state.position = position;
            state.indicator = target;
            target.classList.add('lc-drop-' + position);
        }
        root.addEventListener('pointerdown', function (event) {
            if (event.button !== undefined && event.button !== 0) return;
            if (event.target.closest('button, input, select, textarea, a') && !event.target.closest('[data-drag-handle]')) return;
            var source = event.target.closest(options.itemSelector);
            if (!source || !root.contains(source) || !options.canDrag(source)) return;
            cleanup();
            state = { source: source, startX: event.clientX, startY: event.clientY, active: false, pointerId: event.pointerId, touch: event.pointerType === 'touch' };
            if (state.touch) {
                state.timer = global.setTimeout(function () { if (state && !state.active) begin(event, source); }, LONG_PRESS_MS);
            }
        });
        global.addEventListener('pointermove', function (event) {
            if (!state) return;
            if (!state.active) {
                var distance = Math.abs(event.clientX - state.startX) + Math.abs(event.clientY - state.startY);
                if (state.touch) {
                    if (distance > MOVE_THRESHOLD * 2) cleanup();
                    return;
                }
                if (distance < MOVE_THRESHOLD) return;
                begin(event, state.source);
            }
            event.preventDefault();
            move(event);
        }, { passive: false });
        global.addEventListener('pointerup', function () {
            if (!state) return;
            var finished = state.active && state.target ? { source: state.source, target: state.target, position: state.position } : null;
            var suppress = state.active;
            cleanup();
            if (suppress) global.addEventListener('click', function swallow(event) { event.stopPropagation(); event.preventDefault(); }, { capture: true, once: true });
            if (finished) options.onDrop(finished.source, finished.target, finished.position);
        });
        global.addEventListener('pointercancel', cleanup);
        global.addEventListener('keydown', function (event) { if (event.key === 'Escape') cleanup(); });
    }

    function typingSettingsHtml(data) {
        var setting = data.typing_indicator;
        var presets = data.presets || {};
        var keys = Object.keys(presets).filter(function (key) { return key !== 'default'; });
        return '<div class="lc-typing-settings"><p class="lc-note">' + esc(t('Other members see this instead of your name and "is typing" while you write.')) + '</p>' +
            '<div class="lc-tabs">' + ['default', 'preset', 'custom'].map(function (mode) {
                var label = { default: 'Default', preset: 'Preset', custom: 'Custom' }[mode];
                return '<button type="button" class="lc-tab' + (setting.mode === mode ? ' active' : '') + '" data-typing-mode="' + mode + '" title="' + esc(t(label)) + '">' + esc(t(label)) + '</button>';
            }).join('') + '</div>' +
            '<div class="lc-typing-presets"' + (setting.mode === 'preset' ? '' : ' hidden') + '>' + keys.map(function (key) {
                return '<button type="button" class="lc-cosmetic' + (setting.preset === key ? ' active' : '') + '" data-typing-preset="' + esc(key) + '" title="' + esc(t(presets[key].text)) + '"><span class="lc-cosmetic-none">' + esc(presets[key].emoji) + '</span><span>' + esc(t(presets[key].text)) + '</span></button>';
            }).join('') + '</div>' +
            '<div class="lc-typing-custom"' + (setting.mode === 'custom' ? '' : ' hidden') + '><label class="lc-field"><span>' + esc(t('Text')) + '</span><input type="text" class="lc-input" data-typing-text maxlength="32" value="' + esc(setting.text) + '" placeholder="' + esc(t('plotting something')) + '"></label>' +
            '<label class="lc-field"><span>' + esc(t('Emoji')) + '</span><input type="text" class="lc-input" data-typing-emoji maxlength="8" value="' + esc(setting.emoji) + '" placeholder="' + esc(t('Optional emoji')) + '"></label></div>' +
            '<div class="lc-typing-preview"><span class="rwl-typing-dots"><i></i><i></i><i></i></span><span translate="no" data-typing-preview></span></div>' +
            '<div class="lc-form-error" data-typing-error></div></div>';
    }

    function bindTypingSettings(root, data, onSaved) {
        var setting = Object.assign({}, data.typing_indicator);
        var presets = data.presets || {};
        var preview = root.querySelector('[data-typing-preview]');
        var errorBox = root.querySelector('[data-typing-error]');
        var save = null;
        var paint = function () {
            var label;
            if (setting.mode === 'preset' && presets[setting.preset] && setting.preset !== 'default') label = presets[setting.preset].emoji + ' ' + t(presets[setting.preset].text);
            else if (setting.mode === 'custom' && (setting.text || setting.emoji)) label = (setting.emoji ? setting.emoji + ' ' : '') + setting.text;
            else label = t('Name is typing...');
            preview.textContent = label;
            Array.prototype.forEach.call(root.querySelectorAll('[data-typing-mode]'), function (button) { button.classList.toggle('active', button.getAttribute('data-typing-mode') === setting.mode); });
            Array.prototype.forEach.call(root.querySelectorAll('[data-typing-preset]'), function (button) { button.classList.toggle('active', button.getAttribute('data-typing-preset') === setting.preset); });
            root.querySelector('.lc-typing-presets').hidden = setting.mode !== 'preset';
            root.querySelector('.lc-typing-custom').hidden = setting.mode !== 'custom';
        };
        var persist = function () {
            clearTimeout(save);
            save = setTimeout(async function () {
                errorBox.textContent = '';
                try {
                    var result = await RWL.apiRequest('/api/experience/typing_indicator', { method: 'POST', body: { mode: setting.mode, preset: setting.preset, text: setting.text, emoji: setting.emoji } });
                    if (onSaved) onSaved(result.typing_indicator);
                } catch (error) {
                    errorBox.textContent = error.message || t('The typing indicator could not be saved.');
                }
            }, 450);
        };
        root.addEventListener('click', function (event) {
            var mode = event.target.closest('[data-typing-mode]');
            if (mode) {
                setting.mode = mode.getAttribute('data-typing-mode');
                paint();
                persist();
                return;
            }
            var preset = event.target.closest('[data-typing-preset]');
            if (preset) {
                setting.preset = preset.getAttribute('data-typing-preset');
                paint();
                persist();
            }
        });
        root.querySelector('[data-typing-text]').addEventListener('input', function (event) {
            setting.text = event.target.value;
            paint();
            persist();
        });
        root.querySelector('[data-typing-emoji]').addEventListener('input', function (event) {
            setting.emoji = event.target.value;
            paint();
            persist();
        });
        paint();
    }

    function loadTypingSettings() {
        return RWL.apiRequest('/api/experience/typing_indicator');
    }

    global.LabcordExtras = {
        colorFieldHtml: colorFieldHtml,
        bindColorFields: bindColorFields,
        roleStyleFieldsHtml: roleStyleFieldsHtml,
        bindRoleStyle: bindRoleStyle,
        readRoleStyle: readRoleStyle,
        attachSortable: attachSortable,
        typingSettingsHtml: typingSettingsHtml,
        bindTypingSettings: bindTypingSettings,
        loadTypingSettings: loadTypingSettings
    };
})(window);
