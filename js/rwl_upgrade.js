(function (global) {
    if (global.RWLUpgrade || !global.RWL) return;
    var previewMode = /[?&]rwl_preview=1/.test(global.location.search);
    var PRESENCE_ID_KEY = 'rwl_presence_id';
    var PRESENCE_MIN_GAP_MS = 1200;
    var DOWNLOAD_POLL_MS = 1000;
    var esc = RWL.escapeHtml;
    var presenceInterval = 5000;
    var presenceEnabled = true;
    var presenceTimer = null;
    var presenceDebounce = null;
    var lastPresenceAt = 0;
    var lastPresenceKey = '';

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function applyPlaybackSpeed(event) {
        var video = event.target;
        if (video && video.tagName === 'VIDEO' && video.dataset && video.dataset.rwlSpeed) {
            var speed = parseFloat(video.dataset.rwlSpeed);
            if (speed >= 0.25 && speed <= 4) video.playbackRate = speed;
        }
    }

    document.addEventListener('loadedmetadata', applyPlaybackSpeed, true);
    document.addEventListener('play', applyPlaybackSpeed, true);

    function presenceId() {
        var stored = sessionStorage.getItem(PRESENCE_ID_KEY);
        if (stored) return stored;
        var bytes = new Uint8Array(15);
        global.crypto.getRandomValues(bytes);
        var created = 'p' + Array.prototype.map.call(bytes, function (value) { return ('0' + value.toString(16)).slice(-2); }).join('').slice(0, 28);
        sessionStorage.setItem(PRESENCE_ID_KEY, created);
        return created;
    }

    function visibleLiveItems() {
        var nodes = document.querySelectorAll('[data-live-item]');
        var items = {};
        for (var index = 0; index < nodes.length; index++) {
            if (nodes[index].offsetParent !== null) items[nodes[index].getAttribute('data-live-item')] = true;
        }
        return Object.keys(items).slice(0, 120);
    }

    function updateLiveCounts(counts) {
        var nodes = document.querySelectorAll('[data-live-item]');
        for (var index = 0; index < nodes.length; index++) {
            var count = counts[nodes[index].getAttribute('data-live-item')];
            var value = nodes[index].querySelector('.product-stat-value');
            if (value && count !== undefined) value.textContent = String(count);
        }
    }

    function syncPresence(force) {
        if (!presenceEnabled || document.hidden) return;
        var now = Date.now();
        var items = visibleLiveItems();
        var key = items.join('|');
        if (!force && key === lastPresenceKey && now - lastPresenceAt < presenceInterval - 200) return;
        if (now - lastPresenceAt < PRESENCE_MIN_GAP_MS) return;
        lastPresenceAt = now;
        lastPresenceKey = key;
        var headers = { 'Content-Type': 'application/json' };
        var token = RWL.getToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        fetch(RWL.apiUrl('/api/presence/sync'), { method: 'POST', headers: headers, body: JSON.stringify({ visitor_id: presenceId(), items: items, view: currentView() }) }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (!data) return;
            if (data.enabled === false) {
                presenceEnabled = false;
                document.documentElement.classList.add('rwl-no-live');
                return;
            }
            if (data.interval) presenceInterval = Math.max(2000, data.interval * 1000);
            updateLiveCounts(data.counts || {});
        }).catch(function () {});
    }

    function currentView() {
        var active = document.querySelector('.nav-item.active, .tab-btn.active, .category-tab.active');
        var label = active ? (active.getAttribute('data-tab') || active.getAttribute('data-category') || active.textContent || '') : '';
        return (global.location.pathname.split('/').pop() + ':' + String(label).trim()).slice(0, 60);
    }

    function leavePresence() {
        if (!presenceEnabled) return;
        try {
            fetch(RWL.apiUrl('/api/presence/leave'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor_id: presenceId() }), keepalive: true }).catch(function () {});
        } catch (error) {}
    }

    function startPresence() {
        if (previewMode) return;
        syncPresence(true);
        presenceTimer = setInterval(function () { syncPresence(false); }, 1000);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) leavePresence();
            else syncPresence(true);
        });
        global.addEventListener('pagehide', leavePresence);
        var observer = new MutationObserver(function () {
            clearTimeout(presenceDebounce);
            presenceDebounce = setTimeout(function () { syncPresence(false); }, 350);
        });
        var root = document.getElementById('content') || document.body;
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }

    var lightbox = null;

    function openLightbox(images, startIndex) {
        closeLightbox();
        var index = startIndex;
        var zoom = 1;
        var offsetX = 0;
        var offsetY = 0;
        var drag = null;
        var overlay = document.createElement('div');
        overlay.className = 'rwl-lightbox';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = '<img alt="">' +
            '<button type="button" class="rwl-lightbox-button rwl-lightbox-close" title="' + esc(t('Close')) + '" aria-label="' + esc(t('Close')) + '">✕</button>' +
            '<button type="button" class="rwl-lightbox-button rwl-lightbox-zoom-in" title="' + esc(t('Zoom in')) + '" aria-label="' + esc(t('Zoom in')) + '">+</button>' +
            '<button type="button" class="rwl-lightbox-button rwl-lightbox-zoom-out" title="' + esc(t('Zoom out')) + '" aria-label="' + esc(t('Zoom out')) + '">−</button>' +
            (images.length > 1 ? '<button type="button" class="rwl-lightbox-button rwl-lightbox-prev" title="' + esc(t('Previous image')) + '" aria-label="' + esc(t('Previous image')) + '">‹</button><button type="button" class="rwl-lightbox-button rwl-lightbox-next" title="' + esc(t('Next image')) + '" aria-label="' + esc(t('Next image')) + '">›</button>' : '') +
            '<div class="rwl-lightbox-counter"></div>';
        var image = overlay.querySelector('img');
        var counter = overlay.querySelector('.rwl-lightbox-counter');

        function applyTransform() {
            image.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + zoom + ')';
        }

        function show(next) {
            index = (next + images.length) % images.length;
            zoom = 1;
            offsetX = 0;
            offsetY = 0;
            image.src = images[index];
            counter.textContent = (index + 1) + ' / ' + images.length;
            applyTransform();
        }

        function setZoom(value) {
            zoom = Math.max(1, Math.min(6, value));
            if (zoom === 1) {
                offsetX = 0;
                offsetY = 0;
            }
            applyTransform();
        }

        overlay.addEventListener('click', function (event) {
            var target = event.target;
            if (target === overlay) closeLightbox();
            else if (target.classList.contains('rwl-lightbox-close')) closeLightbox();
            else if (target.classList.contains('rwl-lightbox-zoom-in')) setZoom(zoom + 0.5);
            else if (target.classList.contains('rwl-lightbox-zoom-out')) setZoom(zoom - 0.5);
            else if (target.classList.contains('rwl-lightbox-prev')) show(index - 1);
            else if (target.classList.contains('rwl-lightbox-next')) show(index + 1);
        });
        overlay.addEventListener('wheel', function (event) {
            event.preventDefault();
            setZoom(zoom + (event.deltaY < 0 ? 0.35 : -0.35));
        }, { passive: false });
        image.addEventListener('dblclick', function () { setZoom(zoom > 1 ? 1 : 2.5); });
        image.addEventListener('pointerdown', function (event) {
            if (zoom <= 1) return;
            drag = { x: event.clientX - offsetX, y: event.clientY - offsetY };
            image.classList.add('rwl-dragging');
            image.setPointerCapture(event.pointerId);
        });
        image.addEventListener('pointermove', function (event) {
            if (!drag) return;
            offsetX = event.clientX - drag.x;
            offsetY = event.clientY - drag.y;
            applyTransform();
        });
        image.addEventListener('pointerup', function () {
            drag = null;
            image.classList.remove('rwl-dragging');
        });
        lightbox = {
            element: overlay,
            onKey: function (event) {
                if (event.key === 'Escape') closeLightbox();
                else if (event.key === 'ArrowLeft' && images.length > 1) show(index - 1);
                else if (event.key === 'ArrowRight' && images.length > 1) show(index + 1);
                else if (event.key === '+') setZoom(zoom + 0.5);
                else if (event.key === '-') setZoom(zoom - 0.5);
            }
        };
        document.addEventListener('keydown', lightbox.onKey, true);
        document.body.appendChild(overlay);
        show(startIndex);
    }

    function closeLightbox() {
        if (!lightbox) return;
        document.removeEventListener('keydown', lightbox.onKey, true);
        lightbox.element.remove();
        lightbox = null;
    }

    document.addEventListener('click', function (event) {
        var image = event.target.closest && event.target.closest('.modal-gallery-img');
        if (!image) return;
        var gallery = image.closest('.modal-image-gallery') || image.parentElement;
        var nodes = Array.prototype.slice.call(gallery.querySelectorAll('.modal-gallery-img'));
        openLightbox(nodes.map(function (node) { return node.src; }), Math.max(0, nodes.indexOf(image)));
    });

    var downloadPopup = null;
    var downloadTimer = null;

    function bridge() {
        return global.RickwareBridge && global.RickwareBridge.isLauncher ? global.RickwareBridge : null;
    }

    function bridgeCall(method, args) {
        var host = bridge();
        if (!host || typeof host.call !== 'function') return Promise.resolve(null);
        return host.call(method, args || {}).catch(function () { return null; });
    }

    function formatBytes(value) {
        var number = Number(value) || 0;
        if (number >= 1073741824) return (number / 1073741824).toFixed(2) + ' GB';
        if (number >= 1048576) return (number / 1048576).toFixed(1) + ' MB';
        if (number >= 1024) return (number / 1024).toFixed(0) + ' KB';
        return number + ' B';
    }

    function formatDuration(seconds) {
        var total = Math.max(0, Math.round(seconds));
        if (total >= 3600) return Math.floor(total / 3600) + 'h ' + Math.floor((total % 3600) / 60) + 'm';
        if (total >= 60) return Math.floor(total / 60) + 'm ' + (total % 60) + 's';
        return total + 's';
    }

    function renderDownloads(downloads, tools) {
        var body = downloadPopup && downloadPopup.querySelector('.rwl-download-body');
        if (!body) return;
        var running = (tools || []).filter(function (tool) { return tool.status === 'running'; });
        var html = '<div class="rwl-download-group">' + esc(t('Downloads')) + '</div>';
        if (!bridge()) {
            html += '<div class="rwl-download-empty">' + esc(t('Tool downloads and updates run inside the Rickware - Labs Launcher.')) + '</div>';
        } else if (!downloads.length) {
            html += '<div class="rwl-download-empty">' + esc(t('No active downloads')) + '</div>';
        } else {
            downloads.forEach(function (entry) {
                var total = Number(entry.total) || 0;
                var received = Number(entry.received) || 0;
                var percent = total ? Math.min(100, Math.round(received / total * 100)) : 0;
                var speed = Number(entry.speed) || 0;
                var remaining = speed > 0 && total ? (total - received) / speed : 0;
                html += '<div class="rwl-download-item"><div class="rwl-download-title"><span translate="no">' + esc(entry.name || entry.product_id || 'Tool') + '</span><span>' + percent + '%</span></div>' +
                    '<div class="rwl-progress"><span style="--rwl-keep:1;width:' + percent + '%"></span></div>' +
                    '<div class="rwl-download-meta"><span>' + esc(formatBytes(received)) + ' / ' + esc(formatBytes(total)) + '</span><span>' + esc(formatBytes(speed)) + '/s</span><span>' + (remaining ? esc(formatDuration(remaining)) : '-') + '</span></div>' +
                    '<div class="rwl-download-meta"><span>' + esc(t(entry.kind === 'update' ? 'Update' : 'Download')) + '</span><span>' + esc(t(entry.status === 'verifying' ? 'Verifying' : 'Downloading')) + '</span></div></div>';
            });
        }
        html += '<div class="rwl-download-group">' + esc(t('Running Sessions')) + '</div>';
        if (!running.length) {
            html += '<div class="rwl-download-empty">' + esc(t('No tools are running')) + '</div>';
        } else {
            running.forEach(function (tool) {
                html += '<div class="rwl-download-item"><div class="rwl-download-title"><span translate="no">' + esc(tool.name || tool.product_id) + '</span><button type="button" class="rwl-small-button" data-stop-tool="' + esc(tool.product_id) + '" title="' + esc(t('Stop this tool')) + '">' + esc(t('Stop')) + '</button></div></div>';
            });
        }
        body.innerHTML = html;
    }

    function updateDownloadBadge(count) {
        var host = document.getElementById('downloadStatus');
        if (!host) return;
        var badge = host.querySelector('.rwl-download-badge');
        if (!count) {
            if (badge) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'rwl-download-badge';
            host.appendChild(badge);
        }
        badge.textContent = String(count);
    }

    function pollDownloads() {
        if (!bridge()) {
            updateDownloadBadge(0);
            if (downloadPopup && !downloadPopup.hidden) renderDownloads([], []);
            return;
        }
        Promise.all([bridgeCall('getDownloads'), bridgeCall('getInstalledTools')]).then(function (results) {
            var downloads = (results[0] && results[0].downloads) || [];
            var tools = Array.isArray(results[1]) ? results[1] : ((results[1] && results[1].tools) || []);
            updateDownloadBadge(downloads.length);
            if (downloadPopup && !downloadPopup.hidden) renderDownloads(downloads, tools);
        });
    }

    function setupDownloadCenter() {
        var host = document.getElementById('downloadStatus');
        if (!host) return;
        host.title = t('Downloads and running sessions');
        host.setAttribute('role', 'button');
        host.setAttribute('tabindex', '0');
        downloadPopup = document.createElement('div');
        downloadPopup.className = 'rwl-download-popup';
        downloadPopup.hidden = true;
        downloadPopup.innerHTML = '<div class="rwl-download-head"><span>' + esc(t('Downloads')) + '</span><button type="button" class="rwl-download-close" title="' + esc(t('Close')) + '" aria-label="' + esc(t('Close')) + '">✕</button></div><div class="rwl-download-body"></div>';
        document.body.appendChild(downloadPopup);
        function toggle() {
            downloadPopup.hidden = !downloadPopup.hidden;
            if (!downloadPopup.hidden) pollDownloads();
        }
        host.addEventListener('click', toggle);
        host.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle();
            }
        });
        downloadPopup.addEventListener('click', function (event) {
            if (event.target.closest('.rwl-download-close')) {
                downloadPopup.hidden = true;
                return;
            }
            var stop = event.target.closest('[data-stop-tool]');
            if (stop) bridgeCall('stopTool', { product_id: stop.getAttribute('data-stop-tool') }).then(pollDownloads);
        });
        document.addEventListener('click', function (event) {
            if (!downloadPopup.hidden && !downloadPopup.contains(event.target) && !host.contains(event.target)) downloadPopup.hidden = true;
        });
        downloadTimer = setInterval(function () {
            if (!document.hidden) pollDownloads();
        }, DOWNLOAD_POLL_MS);
    }

    function renderBankExchange(card, state) {
        if (!state) {
            card.innerHTML = '<div class="bank-exchange-note">' + esc(t('Sign in to exchange your Discord Server XP for Lab Coins.')) + '</div>';
            return;
        }
        if (!state.linked) {
            card.innerHTML = '<div class="bank-exchange-head"><span>' + esc(t('Exchange XP To Lab Coins')) + '</span></div><div class="bank-exchange-note">' + esc(t('You need to link your Discord account with your Rickware - Labs account to exchange XP here. Link it in your account settings. Alternatively you can also exchange your XP directly on our Discord server.')) + '</div>';
            return;
        }
        if (!state.enabled) {
            card.innerHTML = '<div class="bank-exchange-head"><span>' + esc(t('Exchange XP To Lab Coins')) + '</span></div><div class="bank-exchange-note">' + esc(t('The XP exchange is currently paused.')) + '</div>';
            return;
        }
        var rate = Math.ceil(Number(state.effective_xp_per_lab_coin) || Number(state.xp_per_lab_coin) || 1);
        card.innerHTML = '<div class="bank-exchange-head"><span>' + esc(t('Exchange XP To Lab Coins')) + '</span><span class="bank-exchange-rate">≈ ' + esc(rate.toLocaleString()) + ' XP = 1 LC</span></div>' +
            '<div class="bank-exchange-balances"><span>XP: <strong>' + esc(Number(state.xp_balance).toLocaleString()) + '</strong></span><span>LC: <strong>' + esc(Number(state.lab_coins).toLocaleString()) + '</strong></span><span>' + esc(t('Maximum now')) + ': <strong>' + esc(Number(state.max_lab_coins).toLocaleString()) + ' LC</strong></span></div>' +
            '<div class="bank-exchange-row"><input class="bank-exchange-input" type="number" min="1" step="1" inputmode="numeric" placeholder="' + esc(t('Amount of XP')) + '"><button type="button" class="rwl-small-button" data-exchange-max title="' + esc(t('Use all your XP')) + '">' + esc(t('Max')) + '</button><button type="button" class="rwl-small-button" data-exchange-submit title="' + esc(t('Convert the XP into Lab Coins')) + '">' + esc(t('Exchange')) + '</button></div>' +
            '<div class="bank-exchange-quote"></div><div class="rwl-inline-error" hidden></div>';
        var input = card.querySelector('.bank-exchange-input');
        var quote = card.querySelector('.bank-exchange-quote');
        var errorBox = card.querySelector('.rwl-inline-error');
        function showError(text) {
            errorBox.textContent = text || '';
            errorBox.hidden = !text;
        }
        function updateQuote() {
            var amount = parseInt(input.value, 10);
            var valid = !input.value || (amount > 0 && amount <= state.xp_balance);
            input.classList.toggle('rwl-invalid', !valid);
            quote.textContent = amount > 0 ? '≈ ' + Math.floor(amount / (Number(state.effective_xp_per_lab_coin) || 1)).toLocaleString() + ' LC' : '';
            return valid && amount > 0;
        }
        input.addEventListener('input', function () { updateQuote(); showError(''); });
        card.querySelector('[data-exchange-max]').addEventListener('click', function () {
            input.value = String(state.xp_balance || 0);
            updateQuote();
        });
        card.querySelector('[data-exchange-submit]').addEventListener('click', function (event) {
            if (!updateQuote()) {
                input.classList.add('rwl-invalid');
                return;
            }
            var button = event.currentTarget;
            button.disabled = true;
            RWL.apiRequest('/api/bank/exchange', { method: 'POST', body: { xp: parseInt(input.value, 10) } }).then(function (result) {
                if (typeof global.setLcBalance === 'function') global.setLcBalance(result.state.lab_coins);
                renderBankExchange(card, result.state);
                var done = document.createElement('div');
                done.className = 'bank-exchange-quote';
                done.textContent = '+' + Number(result.lab_coins).toLocaleString() + ' LC · -' + Number(result.xp_used).toLocaleString() + ' XP';
                card.appendChild(done);
            }).catch(function (error) {
                button.disabled = false;
                showError(error.message || t('The exchange failed. Please try again.'));
            });
        });
    }

    function mountBankExchange() {
        var section = document.querySelector('.bank-xp-exchange-section');
        if (!section || section.previousElementSibling && section.previousElementSibling.classList.contains('bank-exchange-card')) return;
        var card = document.createElement('div');
        card.className = 'bank-exchange-card';
        card.innerHTML = '<div class="bank-exchange-note">' + esc(t('Loading...')) + '</div>';
        section.parentNode.insertBefore(card, section);
        if (!RWL.getToken()) {
            renderBankExchange(card, null);
            return;
        }
        RWL.apiRequest('/api/bank/exchange').then(function (state) { renderBankExchange(card, state); }).catch(function () { renderBankExchange(card, { linked: false }); });
    }

    function revealRow(label, value, sensitive) {
        var shown = value === null || value === undefined || value === '' ? '-' : String(value);
        return '<div class="rwl-personal-item"><div class="rwl-personal-label">' + esc(t(label)) + '</div><div class="rwl-personal-value' + (sensitive ? ' rwl-concealed' : '') + '"><span translate="no">' + esc(shown) + '</span>' +
            (sensitive ? '<button type="button" class="rwl-reveal-button" title="' + esc(t('Show or hide this value')) + '">' + esc(t('Show')) + '</button>' : '') + '</div></div>';
    }

    function formatDate(value) {
        if (!value) return '-';
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
    }

    function mountPersonalArea(account) {
        var host = document.getElementById('rwlPersonalArea');
        if (!host || !account) return;
        var licenses = account.license_keys || [];
        host.innerHTML = '<h3>' + esc(t('Personal Data')) + '</h3><p class="rwl-personal-label" style="--rwl-keep:1;text-transform:none;letter-spacing:0;">' + esc(t('Everything we store for your account. Sensitive values stay hidden until you reveal them.')) + '</p><div class="rwl-personal-grid">' +
            revealRow('Registered', formatDate(account.created_at)) +
            revealRow('Last sign in', formatDate(account.user_last_login)) +
            revealRow('Sign ins', account.user_login_count) +
            revealRow('Account type', account.account_type) +
            revealRow('Account ID', account.id, true) +
            revealRow('Email', account.email, true) +
            revealRow('Phone number', account.phone_number, true) +
            revealRow('Last IP address', account.user_last_ip, true) +
            revealRow('Lab Coins', account.lab_coins) +
            revealRow('Discord XP', account.user_discord_user_xp_amount) +
            revealRow('Discord account', account.user_discord_username, true) +
            revealRow('Discord user ID', account.user_discord_user_id, true) +
            revealRow('Discord invites', account.user_discord_user_invited_user) +
            revealRow('Linked Google', account.google_linked ? t('Yes') : t('No')) +
            revealRow('Active licenses', licenses.filter(function (entry) { return entry.is_valid; }).length) +
            revealRow('Orders', (account.order_history || []).length) +
            revealRow('Registered devices', account.device_count) +
            revealRow('Language', account.preferred_language || 'en') +
            '</div>' +
            '<label class="rwl-toggle-row"><span>' + esc(t('Show when I was last online')) + '<small>' + esc(t('Other users can see this in the dashboard.')) + '</small></span><input type="checkbox" id="rwlShowLastOnline"' + (account.show_last_online !== false ? ' checked' : '') + '></label>' +
            '<label class="rwl-toggle-row"><span>' + esc(t('Reduced effects')) + '<small>' + esc(t('Turns off animated theme scenes and slows effects. Recommended for weaker hardware.')) + '</small></span><input type="checkbox" id="rwlReducedEffects"' + (account.reduced_effects ? ' checked' : '') + '></label>';
        host.addEventListener('click', function (event) {
            var button = event.target.closest('.rwl-reveal-button');
            if (!button) return;
            var value = button.parentElement;
            value.classList.toggle('rwl-concealed');
            button.textContent = t(value.classList.contains('rwl-concealed') ? 'Show' : 'Hide');
        });
        function savePreference(field, input) {
            var payload = {};
            payload[field] = input.checked;
            input.disabled = true;
            RWL.apiRequest('/api/profile/update', { method: 'POST', body: { new_data: payload } }).then(function () {
                if (field === 'reduced_effects' && global.RWLTheme) global.RWLTheme.setReducedEffects(input.checked);
            }).catch(function () {
                input.checked = !input.checked;
            }).then(function () {
                input.disabled = false;
            });
        }
        host.querySelector('#rwlShowLastOnline').addEventListener('change', function (event) { savePreference('show_last_online', event.target); });
        host.querySelector('#rwlReducedEffects').addEventListener('change', function (event) { savePreference('reduced_effects', event.target); });
    }

    function setupAccountPage() {
        if (global.location.pathname.indexOf('account_settings') < 0 || !RWL.getToken()) return;
        var container = document.querySelector('.settings-section');
        if (!container || !container.parentNode) return;
        var area = document.createElement('div');
        area.className = 'settings-section';
        area.id = 'rwlPersonalArea';
        container.parentNode.appendChild(area);
        RWL.apiRequest('/api/user').then(function (data) { mountPersonalArea(data.account); }).catch(function () {});
    }

    function syncAccountPreferences() {
        if (previewMode || !RWL.getToken()) return;
        RWL.apiRequest('/api/user').then(function (data) {
            var account = data && data.account;
            if (account && global.RWLTheme && global.RWLTheme.setReducedEffects) global.RWLTheme.setReducedEffects(!!account.reduced_effects);
        }).catch(function () {});
    }

    function observeBank() {
        var content = document.getElementById('content');
        if (!content) return;
        var scheduled = false;
        new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            setTimeout(function () {
                scheduled = false;
                mountBankExchange();
            }, 300);
        }).observe(content, { childList: true, subtree: true });
    }

    function init() {
        startPresence();
        setupDownloadCenter();
        observeBank();
        mountBankExchange();
        setupAccountPage();
        syncAccountPreferences();
    }

    global.RWLUpgrade = { openLightbox: openLightbox, syncPresence: syncPresence };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
