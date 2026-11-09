(function (global) {
    if (global.RWLSocial || !global.RWL) return;

    var esc = RWL.escapeHtml;
    var HOVER_DELAY_MS = 320;
    var PROFILE_CACHE_MS = 20000;
    var PENDING_KEY_ID = 0;
    var BANNER_PATH = '/api/profile_banner/';
    var MAX_TEXT = 4000;
    var VAULT_ITERATIONS = 600000;
    var GROUP_MS = 7 * 60 * 1000;
    var URL_PATTERN = /\bhttps?:\/\/[^\s<]+[^\s<.,:;"')\]]/gi;
    var LOOSE_LINK_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|gg|io|de|co|xyz|me|tv|ru|link|app|dev)\b/i;
    var EMOJI_SET = ['😀','😂','🤣','😊','😍','😘','😎','🤔','😅','😭','😡','🥳','😇','🙃','😴','🤯','👍','👎','👏','🙌','🙏','💪','🤝','👀','❤️','💜','💔','🔥','✨','⭐','🎉','💯','✅','❌','⚡','🚀','🎮','🍕','☕','💀','👻','🤖','🎁','🏆','💎','🧪','🔒','💬'];
    var KIND_ICONS = { image: '🖼️', video: '🎬', file: '📄' };
    var state = {
        overview: null,
        profiles: {},
        notifications: null,
        keys: null,
        privateKeys: {},
        vaultData: null,
        myKeyId: 0,
        sharedKeys: {},
        partnerKeyCache: {},
        unlocking: null,
        chat: null,
        hoverTimer: null,
        popoutUser: '',
        deliveringAll: null,
        centerTab: 'messages',
        initialized: false,
        mediaObserver: null
    };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function api(path, options) {
        return RWL.apiRequest('/api/social' + path, options);
    }

    function signedIn() {
        return !!RWL.getToken();
    }

    function notify(message, type) {
        if (typeof global.showBanner === 'function') global.showBanner(message, type || 'info');
        else if (global.RWLDialog) global.RWLDialog.alert({ title: t('Notice'), message: message });
    }

    function confirmDialog(title, message, danger) {
        if (global.RWLDialog && global.RWLDialog.confirm) return global.RWLDialog.confirm({ title: title, message: message, confirmText: t('Confirm'), danger: !!danger });
        return Promise.resolve(global.confirm(message));
    }

    function pictureUrl(path) {
        if (!path) return '';
        if (typeof global.profilePicUrl === 'function') return global.profilePicUrl(path);
        return /^https?:\/\//.test(path) ? path : RWL.apiUrl(path);
    }

    function initials(name) {
        var value = String(name || '?');
        return (value.split(/[_\s.\-]/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2) || value.charAt(0)).toUpperCase();
    }

    function nameStyle(user) {
        return RWL.nameColorStyle(user || {}, (global.config && global.config.default_name_color) || '#ffffff');
    }

    function plateSrc(user) {
        if (typeof global.userNameplateSrc === 'function') return global.userNameplateSrc(user);
        return user && user.nameplate_url ? user.nameplate_url : '';
    }

    function decorationSrc(user) {
        if (typeof global.userDecorationSrc === 'function') return global.userDecorationSrc(user);
        return user && (user.avatar_decoration_thumb_url || user.avatar_decoration_url) || '';
    }

    function filterAttr(value) {
        var style = RWL.mediaFilterStyle(value);
        return style ? ' style="' + esc(style) + '"' : '';
    }

    function avatarHtml(user, imageClass, withDecoration, withPresence) {
        var src = pictureUrl(user && user.profile_picture);
        var html = src
            ? '<img class="' + imageClass + '" src="' + esc(src) + '" alt="" decoding="async" data-rwl-fallback="' + esc(initials(user.username)) + '">'
            : '<div class="rwl-plate-avatar-fallback ' + imageClass + '">' + esc(initials(user && user.username)) + '</div>';
        if (withDecoration) {
            var deco = decorationSrc(user);
            if (deco) html += '<img class="rwl-plate-decoration" src="' + esc(deco) + '" alt=""' + filterAttr(user.avatar_decoration_filter) + '>';
        }
        if (withPresence) html += '<span class="rwl-plate-presence' + (user && user.online ? ' online' : '') + '"></span>';
        return html;
    }

    function plateVideo(user, extraClass) {
        var src = plateSrc(user);
        if (!src) return '';
        var speed = parseFloat(user.nameplate_speed) || 1;
        return '<video class="rwl-plate-bg ' + (extraClass || '') + '"' + filterAttr(user.nameplate_filter) + ' muted loop playsinline preload="none" data-rwl-speed="' + speed + '" data-src="' + esc(src) + '"></video>';
    }

    function lowEffects() {
        var connection = navigator.connection || {};
        if (connection.saveData) return true;
        if (document.documentElement.classList.contains('rwl-low-fx')) return true;
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function trustedBanner(url) {
        var value = String(url || '');
        return value.indexOf(RWL.apiBase + BANNER_PATH) === 0 && /^[A-Za-z0-9_.\-\/:]+$/.test(value) ? value : '';
    }

    function bannerHtml(profile, large) {
        var full = large ? trustedBanner(profile.banner_url) : '';
        if (!full) return plateVideo(profile, '');
        var poster = trustedBanner(profile.banner_poster_url);
        var source = lowEffects() && poster ? poster : full;
        return '<img class="rwl-profile-banner-img" src="' + esc(source) + '" alt="" decoding="async" draggable="false">';
    }

    function badgesHtml(user) {
        var type = user.account_type || 'User';
        var style = typeof global.getAccountTypeBadgeStyle === 'function' ? global.getAccountTypeBadgeStyle(type) : '';
        var html = '<span class="dashboard-type-badge" style="' + esc(style) + '">' + esc(t(type)) + '</span>';
        var perms = Array.isArray(user.account_permissions) ? user.account_permissions.join(', ') : (user.account_permissions || '');
        if (perms && perms !== 'none' && perms !== 'User') html += '<span class="dashboard-perms-badge">' + esc(perms) + '</span>';
        return html;
    }

    function formatDate(value) {
        if (!value) return '';
        var date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatTime(value) {
        var date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    function formatStamp(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';
        var today = new Date();
        var yesterday = new Date(Date.now() - 86400000);
        if (date.toDateString() === today.toDateString()) return t('Today at') + ' ' + formatTime(value);
        if (date.toDateString() === yesterday.toDateString()) return t('Yesterday at') + ' ' + formatTime(value);
        return date.toLocaleDateString() + ' ' + formatTime(value);
    }

    function activateMedia(video) {
        if (!video || video.getAttribute('src')) {
            if (video && video.paused) { var resumed = video.play(); if (resumed && resumed.catch) resumed.catch(function () {}); }
            return;
        }
        var source = video.getAttribute('data-src');
        if (!source) return;
        var attempts = parseInt(video.getAttribute('data-rwl-attempt') || '0', 10);
        video.muted = true;
        video.playbackRate = parseFloat(video.getAttribute('data-rwl-speed')) || 1;
        video.onplaying = function () { video.classList.add('rwl-media-ready'); };
        video.onerror = function () {
            if (attempts >= 2) return;
            video.setAttribute('data-rwl-attempt', String(attempts + 1));
            setTimeout(function () {
                video.removeAttribute('src');
                video.setAttribute('data-src', source.split('#')[0] + (source.indexOf('?') >= 0 ? '&' : '?') + 'rwl_retry=' + (attempts + 1));
                activateMedia(video);
            }, 800 * (attempts + 1));
        };
        video.src = source;
        var playback = video.play();
        if (playback && playback.catch) playback.catch(function () {});
    }

    function pauseMedia(video) {
        if (video && !video.paused) video.pause();
    }

    function mediaObserver() {
        if (state.mediaObserver || !('IntersectionObserver' in global)) return state.mediaObserver;
        state.mediaObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var video = entry.target;
                if (entry.isIntersecting) activateMedia(video);
                else pauseMedia(video);
            });
        }, { rootMargin: '150px 0px', threshold: 0.01 });
        return state.mediaObserver;
    }

    function watchMedia(root) {
        var observer = mediaObserver();
        Array.prototype.forEach.call(root.querySelectorAll('video[data-src]'), function (video) {
            if (observer) observer.observe(video);
            else activateMedia(video);
        });
        Array.prototype.forEach.call(root.querySelectorAll('img[data-rwl-fallback]'), function (image) {
            image.addEventListener('error', function handle() {
                image.removeEventListener('error', handle);
                var fallback = document.createElement('div');
                fallback.className = 'rwl-plate-avatar-fallback ' + image.className;
                fallback.textContent = image.getAttribute('data-rwl-fallback');
                if (image.parentNode) image.parentNode.replaceChild(fallback, image);
            });
        });
    }

    function startMedia(root) {
        Array.prototype.forEach.call(root.querySelectorAll('video[data-src]'), activateMedia);
    }

    function stopMedia(root) {
        Array.prototype.forEach.call(root.querySelectorAll('video'), function (video) {
            video.pause();
            if (state.mediaObserver) state.mediaObserver.unobserve(video);
        });
    }

    function observeCard(card) {
        watchMedia(card);
    }

    async function loadProfile(username, force) {
        var key = String(username || '').toLowerCase();
        var cached = state.profiles[key];
        if (!force && cached && Date.now() - cached.at < PROFILE_CACHE_MS) return cached.data;
        var data = await api('/profile/' + encodeURIComponent(username));
        state.profiles[key] = { at: Date.now(), data: data };
        return data;
    }

    function invalidateProfile(username) {
        delete state.profiles[String(username || '').toLowerCase()];
    }

    function relationButtons(profile, compact) {
        var rel = profile.relationship;
        if (!rel || rel.self) return '';
        var buttons = [];
        if (rel.blocked_by_me) {
            buttons.push('<button type="button" class="rwl-btn rwl-btn-secondary" data-social-action="unblock" title="' + esc(t('Allow this member to contact you again')) + '">' + esc(t('Unblock')) + '</button>');
            return buttons.join('');
        }
        if (rel.can_message || rel.friend_status === 'friends') {
            buttons.push('<button type="button" class="rwl-btn" data-social-action="message" title="' + esc(t('Send an end to end encrypted message')) + '">' + esc(t('Message')) + '</button>');
        }
        if (rel.friend_status === 'none' && rel.can_add_friend) buttons.push('<button type="button" class="rwl-btn rwl-btn-success" data-social-action="add" title="' + esc(t('Send a friend request')) + '">' + esc(t('Add Friend')) + '</button>');
        else if (rel.friend_status === 'outgoing') buttons.push('<button type="button" class="rwl-btn rwl-btn-secondary" data-social-action="remove" title="' + esc(t('Cancel your friend request')) + '">' + esc(t('Request Sent')) + '</button>');
        else if (rel.friend_status === 'incoming') buttons.push('<button type="button" class="rwl-btn rwl-btn-success" data-social-action="accept" title="' + esc(t('Accept the friend request')) + '">' + esc(t('Accept Request')) + '</button>');
        else if (rel.friend_status === 'friends' && !compact) buttons.push('<button type="button" class="rwl-btn rwl-btn-secondary" data-social-action="remove" title="' + esc(t('Remove this friend')) + '">' + esc(t('Remove Friend')) + '</button>');
        if (!buttons.length) buttons.push('<button type="button" class="rwl-btn rwl-btn-secondary" disabled title="' + esc(t('This member does not accept messages or friend requests')) + '">' + esc(t('Not Available')) + '</button>');
        if (!compact && !rel.blocked_me) buttons.push('<button type="button" class="rwl-btn rwl-btn-gift" data-social-action="gift" title="' + esc(t('Send an item from your inventory as a gift')) + '">🎁 ' + esc(t('Send Gift')) + '</button>');
        return buttons.join('');
    }

    function profileBody(profile, large) {
        var bio = profile.bio ? '<div class="rwl-profile-text" translate="no">' + esc(profile.bio) + '</div>' : '<div class="rwl-profile-text rwl-profile-muted">' + esc(t('This member has not written a bio yet.')) + '</div>';
        var lastOnline = profile.online ? t('Online now') : (profile.last_online ? t('Last online') + ' ' + formatStamp(profile.last_online) : '');
        var rel = profile.relationship || {};
        var meta = '<div class="rwl-profile-grid">' +
            '<div><div class="rwl-profile-label">' + esc(t('Member Since')) + '</div><div class="rwl-profile-text">' + esc(formatDate(profile.member_since)) + '</div></div>' +
            '<div><div class="rwl-profile-label">' + esc(t('Friends')) + '</div><div class="rwl-profile-text">' + esc(String(profile.friends || 0)) + (rel.self ? '' : ' · ' + esc(String(profile.mutual_friends || 0)) + ' ' + esc(t('mutual'))) + '</div></div>' +
            (profile.discord_linked ? '<div><div class="rwl-profile-label">Discord</div><div class="rwl-profile-text" translate="no">' + esc(profile.discord_display_name || t('Linked')) + '</div></div>' : '') +
            '</div>';
        var quick = large && rel && !rel.self ? '<div class="rwl-profile-quick">' +
            (rel.blocked_by_me ? '' : '<button type="button" class="rwl-icon-btn" data-social-action="block" title="' + esc(t('Block this member')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg></button>') +
            '</div>' : '';
        var footer = large
            ? (signedIn() ? '<div class="rwl-profile-actions">' + relationButtons(profile, false) + '</div>' : '')
            : '<div class="rwl-profile-hint">' + esc(t('Click to open the full profile')) + '</div>';
        return '<div class="rwl-profile-banner">' + bannerHtml(profile, large) + '</div>' +
            '<div class="rwl-profile-head"><div class="rwl-profile-avatar">' + avatarHtml(profile, 'rwl-profile-picture', true, true) + '</div>' + quick + '</div>' +
            '<div class="rwl-profile-card" translate="no">' +
                '<div class="rwl-profile-name" style="' + esc(nameStyle(profile)) + '">' + esc(profile.username) + '</div>' +
                '<div class="rwl-profile-tag">' + esc(lastOnline) + '</div>' +
                '<div class="rwl-profile-badges">' + badgesHtml(profile) + '</div>' +
                '<div class="rwl-profile-divider"></div>' +
                '<div class="rwl-profile-label">' + esc(t('About Me')) + '</div>' + bio +
                '<div class="rwl-profile-divider"></div>' + meta +
                footer +
            '</div>';
    }

    function popoutElement() {
        var element = document.getElementById('rwlSocialPopout');
        if (element) return element;
        element = document.createElement('div');
        element.id = 'rwlSocialPopout';
        element.className = 'rwl-popout';
        element.hidden = true;
        element.setAttribute('aria-hidden', 'true');
        document.body.appendChild(element);
        return element;
    }

    function positionPopout(element, anchor) {
        var rect = anchor.getBoundingClientRect();
        var width = element.offsetWidth || 320;
        var height = element.offsetHeight || 380;
        var left = rect.right + 12;
        if (left + width > global.innerWidth - 10) left = rect.left - width - 12;
        if (left < 10) left = Math.max(10, Math.min(global.innerWidth - width - 10, rect.left));
        var top = Math.max(10, Math.min(global.innerHeight - height - 10, rect.top - 20));
        element.style.left = left + 'px';
        element.style.top = top + 'px';
    }

    function profileOverlayOpen() {
        var overlay = document.getElementById('rwlProfileOverlay');
        return !!(overlay && !overlay.hidden);
    }

    async function showPopout(anchor, username) {
        if (profileOverlayOpen()) return;
        var element = popoutElement();
        state.popoutUser = username;
        try {
            var profile = await loadProfile(username);
            if (state.popoutUser !== username || !anchor.isConnected || profileOverlayOpen()) return;
            stopMedia(element);
            element.innerHTML = profileBody(profile, false);
            element.setAttribute('data-username', profile.username);
            element.hidden = false;
            watchMedia(element);
            startMedia(element);
            positionPopout(element, anchor);
        } catch (error) {
            element.hidden = true;
        }
    }

    function hidePopout() {
        var element = document.getElementById('rwlSocialPopout');
        state.popoutUser = '';
        if (element && !element.hidden) {
            stopMedia(element);
            element.hidden = true;
        }
    }

    function overlayElement() {
        var overlay = document.getElementById('rwlProfileOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'rwlProfileOverlay';
        overlay.className = 'rwl-profile-overlay';
        overlay.hidden = true;
        overlay.innerHTML = '<div class="rwl-profile-modal" role="dialog" aria-modal="true"></div>';
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeProfile();
        });
        overlay.querySelector('.rwl-profile-modal').addEventListener('click', onActionClick);
        document.body.appendChild(overlay);
        return overlay;
    }

    async function openProfile(username) {
        hidePopout();
        var overlay = overlayElement();
        var modal = overlay.querySelector('.rwl-profile-modal');
        modal.innerHTML = '<div class="rwl-center-empty">' + esc(t('Loading profile...')) + '</div>';
        overlay.hidden = false;
        try {
            var profile = await loadProfile(username, true);
            stopMedia(modal);
            modal.innerHTML = '<button type="button" class="rwl-icon-btn rwl-profile-close" data-social-close title="' + esc(t('Close')) + '">✕</button>' + profileBody(profile, true);
            modal.setAttribute('data-username', profile.username);
            var bannerImage = modal.querySelector('.rwl-profile-banner-img');
            if (bannerImage) bannerImage.addEventListener('error', function () {
                var holder = bannerImage.parentNode;
                if (!holder) return;
                holder.innerHTML = plateVideo(profile, '');
                watchMedia(holder);
                startMedia(holder);
            }, { once: true });
            watchMedia(modal);
            startMedia(modal);
        } catch (error) {
            modal.innerHTML = '<div class="rwl-center-empty">' + esc(error.message || t('The profile could not be loaded.')) + '</div>';
        }
    }

    function closeProfile() {
        var overlay = document.getElementById('rwlProfileOverlay');
        if (!overlay || overlay.hidden) return;
        stopMedia(overlay);
        overlay.hidden = true;
    }

    async function refreshOpenProfiles(username) {
        invalidateProfile(username);
        var overlay = document.getElementById('rwlProfileOverlay');
        if (overlay && !overlay.hidden && overlay.querySelector('.rwl-profile-modal').getAttribute('data-username') === username) openProfile(username);
        var popout = document.getElementById('rwlSocialPopout');
        if (popout && !popout.hidden && popout.getAttribute('data-username') === username) hidePopout();
    }

    async function socialAction(action, username, trigger) {
        if (!signedIn()) {
            global.location.href = './sites/login_register.html?tab=login';
            return;
        }
        if (action === 'gift') {
            if (global.RWLGifts && global.RWLGifts.open) global.RWLGifts.open(username);
            return;
        }
        if (trigger) trigger.disabled = true;
        try {
            if (action === 'add') {
                await api('/friends/request', { method: 'POST', body: { username: username } });
                notify(t('Friend request sent.'), 'success');
            } else if (action === 'accept') {
                await api('/friends/respond', { method: 'POST', body: { username: username, accept: true } });
                notify(t('You are now friends.'), 'success');
            } else if (action === 'decline') {
                await api('/friends/respond', { method: 'POST', body: { username: username, accept: false } });
            } else if (action === 'remove') {
                if (!(await confirmDialog(t('Remove Friend'), t('Remove this friend or cancel the request?'), true))) return;
                await api('/friends/remove', { method: 'POST', body: { username: username } });
            } else if (action === 'block') {
                if (!(await confirmDialog(t('Block Member'), t('Blocked members cannot message you or send friend requests.'), true))) return;
                await api('/block', { method: 'POST', body: { username: username } });
                notify(t('Member blocked.'), 'success');
            } else if (action === 'unblock') {
                await api('/unblock', { method: 'POST', body: { username: username } });
            } else if (action === 'message') {
                closeProfile();
                hidePopout();
                await openChatWith(username);
                return;
            }
            await refreshOpenProfiles(username);
            refreshNotifications();
        } catch (error) {
            notify(error.message || t('The action failed.'), 'error');
        } finally {
            if (trigger) trigger.disabled = false;
        }
    }

    function onActionClick(event) {
        if (event.target.closest('[data-social-close]')) {
            closeProfile();
            return;
        }
        var button = event.target.closest('[data-social-action]');
        if (!button) return;
        var holder = button.closest('[data-username]');
        var username = button.getAttribute('data-username') || (holder && holder.getAttribute('data-username'));
        if (username) socialAction(button.getAttribute('data-social-action'), username, button);
    }

    function setupDashboardInteractions() {
        var grid = document.getElementById('dashboardGrid');
        if (!grid || grid.getAttribute('data-rwl-social') === '1') return;
        grid.setAttribute('data-rwl-social', '1');
        var canHover = global.matchMedia && global.matchMedia('(hover: hover)').matches;
        grid.addEventListener('mouseover', function (event) {
            if (!canHover) return;
            var card = event.target.closest('[data-username]');
            if (!card || card.contains(event.relatedTarget)) return;
            clearTimeout(state.hoverTimer);
            if (state.popoutUser && state.popoutUser !== card.getAttribute('data-username')) hidePopout();
            state.hoverTimer = setTimeout(function () { showPopout(card, card.getAttribute('data-username')); }, HOVER_DELAY_MS);
        });
        grid.addEventListener('mouseout', function (event) {
            var card = event.target.closest('[data-username]');
            if (!card || card.contains(event.relatedTarget)) return;
            clearTimeout(state.hoverTimer);
            hidePopout();
        });
        grid.addEventListener('click', function (event) {
            var card = event.target.closest('[data-username]');
            if (!card) return;
            clearTimeout(state.hoverTimer);
            openProfile(card.getAttribute('data-username'));
        });
        grid.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            var card = event.target.closest('[data-username]');
            if (!card) return;
            event.preventDefault();
            openProfile(card.getAttribute('data-username'));
        });
        global.addEventListener('scroll', hidePopout, { passive: true, capture: true });
        watchMedia(grid);
    }

    function centerElement() {
        var center = document.getElementById('rwlSocialCenter');
        if (center) return center;
        center = document.createElement('div');
        center.id = 'rwlSocialCenter';
        center.className = 'rwl-social-center';
        center.hidden = true;
        center.innerHTML =
            '<div class="rwl-center-head"><span>' + esc(t('Notification Center')) + '</span><button type="button" class="rwl-icon-btn" data-center-close title="' + esc(t('Close')) + '">✕</button></div>' +
            '<div class="rwl-center-tabs">' +
                '<button type="button" class="rwl-center-tab" data-center-tab="messages" title="' + esc(t('Your direct messages')) + '">' + esc(t('Messages')) + '</button>' +
                '<button type="button" class="rwl-center-tab" data-center-tab="requests" title="' + esc(t('Friend and message requests')) + '">' + esc(t('Requests')) + '</button>' +
                '<button type="button" class="rwl-center-tab" data-center-tab="friends" title="' + esc(t('Your friends')) + '">' + esc(t('Friends')) + '</button>' +
            '</div>' +
            '<div class="rwl-center-body" data-center-body></div>';
        center.addEventListener('click', onCenterClick);
        document.body.appendChild(center);
        document.addEventListener('click', function (event) {
            if (center.hidden) return;
            if (center.contains(event.target) || event.target.closest('.rwl-social-bell')) return;
            center.hidden = true;
        });
        return center;
    }

    function setupToolbar() {
        var toolbar = document.querySelector('#dashboardTab .dashboard-toolbar');
        if (!toolbar || toolbar.querySelector('.rwl-social-bell') || !signedIn()) return;
        var holder = document.createElement('div');
        holder.className = 'rwl-social-toolbar';
        holder.innerHTML =
            '<button type="button" class="rwl-social-bell" data-open-center="messages" title="' + esc(t('Open your direct messages')) + '"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>' + esc(t('Messages')) + '</span><span class="rwl-social-count" data-count="unread" hidden>0</span></button>' +
            '<button type="button" class="rwl-social-bell" data-open-center="requests" title="' + esc(t('Open the notification center')) + '"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span>' + esc(t('Notifications')) + '</span><span class="rwl-social-count" data-count="requests" hidden>0</span></button>';
        toolbar.appendChild(holder);
        holder.addEventListener('click', function (event) {
            var button = event.target.closest('[data-open-center]');
            if (!button) return;
            event.stopPropagation();
            toggleCenter(button.getAttribute('data-open-center'), button);
        });
    }

    function toggleCenter(tab, anchor) {
        var center = centerElement();
        if (!center.hidden && state.centerTab === tab) {
            center.hidden = true;
            return;
        }
        state.centerTab = tab;
        center.hidden = false;
        var rect = anchor.getBoundingClientRect();
        var width = center.offsetWidth || 400;
        center.style.top = Math.min(global.innerHeight - 200, rect.bottom + 8) + 'px';
        center.style.left = Math.max(12, Math.min(global.innerWidth - width - 12, rect.right - width)) + 'px';
        renderCenter();
        refreshNotifications();
    }

    function centerGroupsHtml() {
        var groups = state.centerGroups;
        if (!groups) return '<div class="rwl-center-empty">' + esc(t('Loading chats...')) + '</div>';
        if (!groups.length) return '<div class="rwl-center-empty">' + esc(t('No group chats yet.')) + '</div>';
        return groups.map(function (group) {
            var sub = esc(group.member_count + ' ' + t('members')) + (group.unread ? ' · <strong style="color:#f87171">' + esc(group.unread + ' ' + t('new')) + '</strong>' : '');
            return '<div class="rwl-center-row" data-open-group="' + esc(group.group_id) + '" translate="no"><div class="rwl-center-avatar"><span class="rwl-group-icon">' + esc(initials(group.name)) + '</span></div><div class="rwl-center-info"><span class="rwl-center-name">' + esc(group.name) + '</span><span class="rwl-center-sub">' + sub + '</span></div></div>';
        }).join('');
    }

    async function loadCenterGroups() {
        if (!global.RWLGroups || !global.RWLGroups.list) return;
        try { state.centerGroups = await global.RWLGroups.list(); } catch (error) { state.centerGroups = []; }
        var holder = document.querySelector('#rwlSocialCenter [data-center-groups]');
        if (holder) holder.innerHTML = centerGroupsHtml();
    }

    function centerRow(user, sub, actions, attributes) {
        return '<div class="rwl-center-row" data-username="' + esc(user.username) + '" ' + (attributes || '') + ' translate="no">' +
            '<div class="rwl-center-avatar">' + avatarHtml(user, 'rwl-center-img', false, true) + '</div>' +
            '<div class="rwl-center-info"><span class="rwl-center-name" style="' + esc(nameStyle(user)) + '">' + esc(user.username) + '</span><span class="rwl-center-sub">' + sub + '</span></div>' +
            '<div class="rwl-center-actions">' + (actions || '') + '</div>' +
        '</div>';
    }

    function iconButton(action, title, svg, extraClass, attributes) {
        return '<button type="button" class="rwl-icon-btn ' + (extraClass || '') + '" data-center-action="' + action + '" ' + (attributes || '') + ' title="' + esc(title) + '">' + svg + '</button>';
    }

    var ICONS = {
        check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        cross: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        chat: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        user: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg>'
    };

    function renderCenter() {
        var center = document.getElementById('rwlSocialCenter');
        if (!center || center.hidden) return;
        Array.prototype.forEach.call(center.querySelectorAll('[data-center-tab]'), function (button) {
            button.classList.toggle('active', button.getAttribute('data-center-tab') === state.centerTab);
        });
        var body = center.querySelector('[data-center-body]');
        var data = state.notifications;
        if (!data) {
            body.innerHTML = '<div class="rwl-center-empty">' + esc(t('Loading...')) + '</div>';
            return;
        }
        var html = '';
        if (state.centerTab === 'messages') {
            if (state.overview && state.overview.keys && !state.overview.keys.exists && !vaultReady()) html += '<div class="rwl-center-cta"><span>' + esc(t('Activate encrypted messages so other members can reach you.')) + '</span><button type="button" class="rwl-btn" data-center-activate title="' + esc(t('Choose your chat passphrase')) + '">' + esc(t('Activate')) + '</button></div>';
            if (!data.channels.length) html += '<div class="rwl-center-empty">' + esc(t('No conversations yet. Click a member on the dashboard and press Message.')) + '</div>';
            data.channels.forEach(function (channel) {
                var sub = channel.unread ? '<strong style="color:#f87171">' + esc(channel.unread + ' ' + t('new')) + '</strong>' : esc(channel.last_message_at ? formatStamp(channel.last_message_at) : t('No messages yet'));
                html += centerRow(channel.partner, sub, iconButton('hide', t('Close this conversation'), ICONS.cross, 'rwl-decline', 'data-channel="' + esc(channel.channel_id) + '"'), 'data-open-channel="' + esc(channel.channel_id) + '"');
            });
            if (global.RWLGroups) html += '<div class="rwl-center-section rwl-center-group-head"><span>' + esc(t('Group Chats')) + '</span><span class="rwl-center-group-buttons"><button type="button" class="rwl-btn rwl-btn-secondary" data-center-group="new" title="' + esc(t('Create Group')) + '">' + esc(t('New Group')) + '</button><button type="button" class="rwl-btn rwl-btn-secondary" data-center-group="join" title="' + esc(t('Join Group')) + '">' + esc(t('Join With Code')) + '</button></span></div><div data-center-groups>' + centerGroupsHtml() + '</div>';
        } else if (state.centerTab === 'requests') {
            html += '<div class="rwl-center-section">' + esc(t('Friend Requests')) + '</div>';
            if (!data.friend_requests.length) html += '<div class="rwl-center-empty">' + esc(t('No open friend requests.')) + '</div>';
            data.friend_requests.forEach(function (user) {
                html += centerRow(user, esc(t('Wants to be your friend')), iconButton('accept', t('Accept'), ICONS.check, 'rwl-accept') + iconButton('decline', t('Decline'), ICONS.cross, 'rwl-decline'));
            });
            html += '<div class="rwl-center-section">' + esc(t('Message Requests')) + '</div>';
            if (!data.message_requests.length) html += '<div class="rwl-center-empty">' + esc(t('No message requests.')) + '</div>';
            data.message_requests.forEach(function (channel) {
                html += centerRow(channel.partner, esc(t('Wants to send you messages')), iconButton('channel_accept', t('Accept'), ICONS.check, 'rwl-accept', 'data-channel="' + esc(channel.channel_id) + '"') + iconButton('channel_decline', t('Decline'), ICONS.cross, 'rwl-decline', 'data-channel="' + esc(channel.channel_id) + '"'));
            });
            if (data.outgoing_requests.length) {
                html += '<div class="rwl-center-section">' + esc(t('Sent Requests')) + '</div>';
                data.outgoing_requests.forEach(function (user) {
                    html += centerRow(user, esc(t('Pending')), iconButton('cancel', t('Cancel the request'), ICONS.cross, 'rwl-decline'));
                });
            }
        } else {
            html += '<form class="rwl-center-add" data-add-friend><input class="rwl-input" maxlength="32" placeholder="' + esc(t('Add a friend by username')) + '" autocomplete="off" spellcheck="false"><button type="submit" class="rwl-btn" title="' + esc(t('Send a friend request')) + '">' + esc(t('Add')) + '</button></form>';
            var friends = (state.friends && state.friends.friends) || [];
            if (!friends.length) html += '<div class="rwl-center-empty">' + esc(t('No friends yet.')) + '</div>';
            friends.forEach(function (user) {
                html += centerRow(user, esc(user.online ? t('Online') : t('Offline')), iconButton('message', t('Message'), ICONS.chat) + iconButton('profile', t('Profile'), ICONS.user));
            });
        }
        body.innerHTML = html;
        var form = body.querySelector('[data-add-friend]');
        if (form) form.addEventListener('submit', onAddFriend);
        if (state.centerTab === 'messages' && body.querySelector('[data-center-groups]')) loadCenterGroups();
    }

    async function onAddFriend(event) {
        event.preventDefault();
        var input = event.currentTarget.querySelector('input');
        var value = input.value.trim();
        input.classList.toggle('rwl-invalid', !/^[A-Za-z][A-Za-z0-9_.\-]{2,31}$/.test(value));
        if (input.classList.contains('rwl-invalid')) return;
        try {
            await api('/friends/request', { method: 'POST', body: { username: value } });
            input.value = '';
            notify(t('Friend request sent.'), 'success');
            refreshNotifications();
        } catch (error) {
            input.classList.add('rwl-invalid');
            notify(error.message || t('The friend request failed.'), 'error');
        }
    }

    async function onCenterClick(event) {
        if (event.target.closest('[data-center-close]')) {
            document.getElementById('rwlSocialCenter').hidden = true;
            return;
        }
        var tab = event.target.closest('[data-center-tab]');
        if (tab) {
            state.centerTab = tab.getAttribute('data-center-tab');
            renderCenter();
            if (state.centerTab === 'friends') loadFriends();
            return;
        }
        if (event.target.closest('[data-center-activate]')) {
            event.stopPropagation();
            var activated = await ensureVault();
            if (activated && state.overview) state.overview.keys = { exists: true };
            renderCenter();
            return;
        }
        var groupButton = event.target.closest('[data-center-group]');
        if (groupButton && global.RWLGroups) {
            event.stopPropagation();
            document.getElementById('rwlSocialCenter').hidden = true;
            if (groupButton.getAttribute('data-center-group') === 'new') global.RWLGroups.create();
            else global.RWLGroups.join();
            return;
        }
        var groupRow = event.target.closest('[data-open-group]');
        if (groupRow && global.RWLGroups) {
            document.getElementById('rwlSocialCenter').hidden = true;
            global.RWLGroups.open(groupRow.getAttribute('data-open-group'));
            return;
        }
        var actionButton = event.target.closest('[data-center-action]');
        var row = event.target.closest('.rwl-center-row');
        if (!row) return;
        var username = row.getAttribute('data-username');
        if (actionButton) {
            event.stopPropagation();
            var action = actionButton.getAttribute('data-center-action');
            var channelId = actionButton.getAttribute('data-channel');
            actionButton.disabled = true;
            try {
                if (action === 'accept' || action === 'decline') await api('/friends/respond', { method: 'POST', body: { username: username, accept: action === 'accept' } });
                else if (action === 'cancel') await api('/friends/remove', { method: 'POST', body: { username: username } });
                else if (action === 'channel_accept' || action === 'channel_decline') {
                    await api('/channels/' + encodeURIComponent(channelId) + '/respond', { method: 'POST', body: { accept: action === 'channel_accept' } });
                    if (action === 'channel_accept') openChat(channelId);
                } else if (action === 'hide') await api('/channels/' + encodeURIComponent(channelId) + '/hide', { method: 'POST' });
                else if (action === 'message') await openChatWith(username);
                else if (action === 'profile') openProfile(username);
                invalidateProfile(username);
                await refreshNotifications();
                if (state.centerTab === 'friends') loadFriends();
            } catch (error) {
                notify(error.message || t('The action failed.'), 'error');
            } finally {
                actionButton.disabled = false;
            }
            return;
        }
        var open = row.getAttribute('data-open-channel');
        if (open) openChat(open);
        else openProfile(username);
    }

    async function loadFriends() {
        try {
            state.friends = await api('/friends');
            renderCenter();
        } catch (error) {}
    }

    function updateCounters() {
        var data = state.notifications;
        if (!data) return;
        var unread = data.counts.unread || 0;
        var requests = (data.counts.friend_requests || 0) + (data.counts.message_requests || 0);
        Array.prototype.forEach.call(document.querySelectorAll('[data-count="unread"]'), function (badge) {
            badge.textContent = unread > 99 ? '99+' : String(unread);
            badge.hidden = !unread;
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-count="requests"]'), function (badge) {
            badge.textContent = String(requests);
            badge.hidden = !requests;
        });
    }

    var refreshTimer = null;

    function refreshNotifications() {
        clearTimeout(refreshTimer);
        return new Promise(function (resolve) {
            refreshTimer = setTimeout(async function () {
                if (!signedIn()) return resolve();
                try {
                    state.notifications = await api('/notifications');
                    updateCounters();
                    renderCenter();
                } catch (error) {}
                resolve();
            }, 120);
        });
    }

    var subtle = global.crypto && global.crypto.subtle;
    var encoder = new TextEncoder();
    var decoder = new TextDecoder();

    function toBase64(buffer) {
        var bytes = new Uint8Array(buffer);
        var binary = '';
        for (var index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
        return btoa(binary);
    }

    function fromBase64(text) {
        var binary = atob(text);
        var bytes = new Uint8Array(binary.length);
        for (var index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        return bytes;
    }

    function randomBytes(length) {
        var bytes = new Uint8Array(length);
        global.crypto.getRandomValues(bytes);
        return bytes;
    }

    async function vaultKey(passphrase, salt, iterations) {
        var material = await subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
        return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }

    async function sealVault(passphrase, data) {
        var salt = randomBytes(16);
        var iv = randomBytes(12);
        var key = await vaultKey(passphrase, salt, VAULT_ITERATIONS);
        var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(JSON.stringify(data)));
        return { vault: toBase64(sealed), vault_salt: toBase64(salt), vault_iv: toBase64(iv), vault_iterations: VAULT_ITERATIONS };
    }

    async function newKeyPair() {
        var pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        var privateJwk = await subtle.exportKey('jwk', pair.privateKey);
        var publicJwk = await subtle.exportKey('jwk', pair.publicKey);
        return { privateJwk: privateJwk, publicKey: JSON.stringify({ kty: 'EC', crv: 'P-256', x: publicJwk.x, y: publicJwk.y }) };
    }

    async function importPrivateKeys(data) {
        state.privateKeys = {};
        var ids = Object.keys((data && data.keys) || {});
        for (var index = 0; index < ids.length; index++) {
            state.privateKeys[ids[index]] = await subtle.importKey('jwk', data.keys[ids[index]], { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
        }
    }

    async function createVault(passphrase) {
        var pair = await newKeyPair();
        var data = { version: 1, keys: { '1': pair.privateJwk } };
        var sealed = await sealVault(passphrase, data);
        var stored = await api('/keys/me', { method: 'PUT', body: Object.assign({ public_key: pair.publicKey, rotate: false }, sealed) });
        state.keys = stored;
        state.myKeyId = stored.key_id;
        state.vaultData = data;
        await importPrivateKeys(data);
    }

    async function resetVault(passphrase) {
        var pair = await newKeyPair();
        var current = state.keys && state.keys.exists ? state.keys : await api('/keys/me');
        var nextId = String((current.key_id || 0) + 1);
        var data = { version: 1, keys: {} };
        if (state.vaultData && state.vaultData.keys) data.keys = Object.assign({}, state.vaultData.keys);
        data.keys[nextId] = pair.privateJwk;
        var sealed = await sealVault(passphrase, data);
        var stored = await api('/keys/me', { method: 'PUT', body: Object.assign({ public_key: pair.publicKey, rotate: !!current.exists }, sealed) });
        state.keys = stored;
        state.myKeyId = stored.key_id;
        state.vaultData = data;
        state.sharedKeys = {};
        await importPrivateKeys(data);
    }

    async function unlockVault(passphrase) {
        var keys = await api('/keys/me');
        var key = await vaultKey(passphrase, fromBase64(keys.vault_salt), keys.vault_iterations);
        var plain;
        try {
            plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(keys.vault_iv) }, key, fromBase64(keys.vault));
        } catch (error) {
            throw new Error(t('Wrong passphrase.'));
        }
        var data = JSON.parse(decoder.decode(plain));
        state.keys = keys;
        state.myKeyId = keys.key_id;
        state.vaultData = data;
        await importPrivateKeys(data);
    }

    function vaultReady() {
        return !!(state.myKeyId && state.privateKeys[String(state.myKeyId)]);
    }

    function vaultDialog(mode) {
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'rwl-vault-overlay';
            var create = mode === 'create' || mode === 'reset';
            var title = mode === 'create' ? t('Protect Your Messages') : (mode === 'reset' ? t('Reset Chat Encryption') : t('Unlock Your Messages'));
            var text = mode === 'create'
                ? t('Your direct messages are end to end encrypted. Choose a chat passphrase. Only you know it, nobody else can read your messages, not even the staff. You need it on every device.')
                : (mode === 'reset' ? t('Resetting creates a new key. Messages encrypted with your old key can no longer be read.') : t('Enter your chat passphrase to decrypt your messages. It never leaves this device.'));
            overlay.innerHTML = '<form class="rwl-vault-card" autocomplete="off">' +
                '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
                '<input class="rwl-input" type="password" data-pass maxlength="128" placeholder="' + esc(t('Chat passphrase')) + '" autocomplete="new-password">' +
                (create ? '<input class="rwl-input" type="password" data-pass-confirm maxlength="128" placeholder="' + esc(t('Repeat the passphrase')) + '" autocomplete="new-password">' : '') +
                '<div class="rwl-vault-error" data-error></div>' +
                (mode === 'unlock' ? '<button type="button" class="rwl-link-btn" data-forgot>' + esc(t('Forgot your passphrase?')) + '</button>' : '') +
                '<div class="rwl-vault-actions"><button type="button" class="rwl-btn rwl-btn-secondary" data-cancel title="' + esc(t('Cancel')) + '">' + esc(t('Cancel')) + '</button><button type="submit" class="rwl-btn" title="' + esc(t('Continue')) + '">' + esc(create ? t('Save Passphrase') : t('Unlock')) + '</button></div>' +
            '</form>';
            document.body.appendChild(overlay);
            var form = overlay.querySelector('form');
            var pass = overlay.querySelector('[data-pass]');
            var repeat = overlay.querySelector('[data-pass-confirm]');
            var errorBox = overlay.querySelector('[data-error]');
            pass.focus();
            var finish = function (value) { overlay.remove(); resolve(value); };
            overlay.querySelector('[data-cancel]').addEventListener('click', function () { finish(false); });
            var forgot = overlay.querySelector('[data-forgot]');
            if (forgot) forgot.addEventListener('click', function () { overlay.remove(); vaultDialog('reset').then(resolve); });
            form.addEventListener('submit', async function (event) {
                event.preventDefault();
                pass.classList.remove('rwl-invalid');
                if (repeat) repeat.classList.remove('rwl-invalid');
                if (create && pass.value.length < 8) {
                    pass.classList.add('rwl-invalid');
                    errorBox.textContent = t('Use at least 8 characters.');
                    return;
                }
                if (repeat && repeat.value !== pass.value) {
                    repeat.classList.add('rwl-invalid');
                    errorBox.textContent = t('The passphrases do not match.');
                    return;
                }
                errorBox.textContent = t('Working...');
                try {
                    if (mode === 'create') await createVault(pass.value);
                    else if (mode === 'reset') await resetVault(pass.value);
                    else await unlockVault(pass.value);
                    pass.value = '';
                    if (repeat) repeat.value = '';
                    finish(true);
                } catch (error) {
                    pass.classList.add('rwl-invalid');
                    errorBox.textContent = error.message || t('That did not work.');
                }
            });
        });
    }

    async function ensureVault() {
        if (vaultReady()) return true;
        if (!subtle) {
            notify(t('Your browser does not support encrypted messages.'), 'error');
            return false;
        }
        if (state.unlocking) return state.unlocking;
        state.unlocking = (async function () {
            try {
                var keys = await api('/keys/me');
                state.keys = keys;
                var unlocked = await vaultDialog(keys.exists ? 'unlock' : 'create');
                if (unlocked) deliverAllPending();
                return unlocked;
            } catch (error) {
                notify(error.message || t('Encryption could not be started.'), 'error');
                return false;
            } finally {
                state.unlocking = null;
            }
        })();
        return state.unlocking;
    }

    function partnerPublic(keys, keyId) {
        if (!keys || !keys.exists) return null;
        if (String(keys.key_id) === String(keyId)) return keys.public_key;
        return (keys.history || {})[String(keyId)] || null;
    }

    async function sharedKey(channelId, myKeyId, partnerKeys, partnerKeyId) {
        var cacheKey = channelId + ':' + myKeyId + ':' + partnerKeyId;
        if (state.sharedKeys[cacheKey]) return state.sharedKeys[cacheKey];
        var privateKey = state.privateKeys[String(myKeyId)];
        var publicJson = partnerPublic(partnerKeys, partnerKeyId);
        if (!privateKey || !publicJson) throw new Error('missing key');
        var publicKey = await subtle.importKey('jwk', Object.assign({ ext: true }, JSON.parse(publicJson)), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        var bits = await subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
        var material = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
        var key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(channelId), info: encoder.encode('rwl-dm-v1') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        state.sharedKeys[cacheKey] = key;
        return key;
    }

    async function selfKey(channelId, keyId) {
        var cacheKey = channelId + ':self:' + keyId;
        if (state.sharedKeys[cacheKey]) return state.sharedKeys[cacheKey];
        var privateKey = state.privateKeys[String(keyId)];
        var jwk = state.vaultData && state.vaultData.keys ? state.vaultData.keys[String(keyId)] : null;
        if (!privateKey || !jwk || !jwk.x || !jwk.y) throw new Error('missing key');
        var publicKey = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        var bits = await subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
        var material = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
        var key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(channelId), info: encoder.encode('rwl-dm-self-v1') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        state.sharedKeys[cacheKey] = key;
        return key;
    }

    function isPending(message) {
        return Number(message && message.recipient_key_id) === PENDING_KEY_ID;
    }

    async function encryptPayload(chat, payload) {
        var pending = !chat.partnerKeys || !chat.partnerKeys.exists;
        var key = pending ? await selfKey(chat.id, state.myKeyId) : await sharedKey(chat.id, state.myKeyId, chat.partnerKeys, chat.partnerKeys.key_id);
        var iv = randomBytes(12);
        var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(JSON.stringify(payload)));
        return { ciphertext: toBase64(sealed), iv: toBase64(iv), sender_key_id: state.myKeyId, recipient_key_id: pending ? PENDING_KEY_ID : chat.partnerKeys.key_id };
    }

    async function decryptMessage(chat, message) {
        var mine = message.sender === 'me';
        var pending = isPending(message);
        if (pending && !mine) return { text: t('This message is waiting for delivery. It appears as soon as the sender is online again.'), files: [], ok: false, waiting: true };
        var myKeyId = mine ? message.sender_key_id : message.recipient_key_id;
        var partnerKeyId = mine ? message.recipient_key_id : message.sender_key_id;
        try {
            var key = pending ? await selfKey(chat.id, message.sender_key_id) : await sharedKey(chat.id, myKeyId, chat.partnerKeys, partnerKeyId);
            var plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(message.iv) }, key, fromBase64(message.ciphertext));
            var data = JSON.parse(decoder.decode(plain));
            return { text: String(data.t || '').slice(0, MAX_TEXT), files: Array.isArray(data.a) ? data.a : [], ok: true };
        } catch (error) {
            return { text: t('This message was encrypted with a key that is no longer available.'), files: [], ok: false };
        }
    }

    function chatElement() {
        var element = document.getElementById('rwlChat');
        if (element) return element;
        element = document.createElement('section');
        element.id = 'rwlChat';
        element.className = 'rwl-chat';
        element.hidden = true;
        element.setAttribute('aria-label', t('Direct message'));
        document.body.appendChild(element);
        return element;
    }

    async function openChatWith(username) {
        if (!(await ensureVault())) return;
        try {
            var opened = await api('/channels/open', { method: 'POST', body: { username: username } });
            await openChat(opened.channel_id);
        } catch (error) {
            notify(error.message || t('The conversation could not be opened.'), 'error');
        }
    }

    function currentDraft() {
        var input = document.querySelector('#rwlChat .rwl-composer-input');
        return input ? input.value : '';
    }

    function restoreDraft(text) {
        var input = document.querySelector('#rwlChat .rwl-composer-input');
        if (!text || !input || input.disabled) return;
        input.value = text;
        input.dispatchEvent(new Event('input'));
    }

    async function openChat(channelId) {
        if (!(await ensureVault())) return;
        if (global.RWLGroups && global.RWLGroups.detach) global.RWLGroups.detach();
        if (windowState.minimized) {
            windowState.minimized = false;
            if (windowState.bubble) windowState.bubble.hidden = true;
        }
        var draft = state.chat && state.chat.id === channelId ? currentDraft() : '';
        var center = document.getElementById('rwlSocialCenter');
        if (center) center.hidden = true;
        var element = chatElement();
        stopMedia(element);
        element.hidden = false;
        document.body.classList.add('rwl-chat-open');
        element.innerHTML = '<div class="rwl-center-empty">' + esc(t('Decrypting conversation...')) + '</div>';
        try {
            var detail = await api('/channels/' + encodeURIComponent(channelId) + '?limit=50');
            state.chat = {
                id: detail.channel_id,
                detail: detail,
                partner: detail.partner,
                partnerKeys: detail.partner_keys,
                messages: [],
                byId: {},
                hasMore: detail.has_more,
                replyTo: null,
                editing: null,
                files: [],
                typingTimer: null,
                lastTypingSent: 0,
                firstUnreadId: null,
                pinned: detail.pinned || []
            };
            renderChatShell();
            await ingestMessages(detail.messages, false);
            renderMessages(true);
            restoreDraft(draft);
            markRead();
            deliverOpenChat();
        } catch (error) {
            element.innerHTML = '<div class="rwl-center-empty">' + esc(error.message || t('The conversation could not be loaded.')) + '</div>';
        }
    }

    function closeChat() {
        var element = document.getElementById('rwlChat');
        document.body.classList.remove('rwl-chat-open');
        windowState.minimized = false;
        if (windowState.bubble) windowState.bubble.hidden = true;
        if (global.RWLGroups && global.RWLGroups.detach) global.RWLGroups.detach();
        if (!element) return;
        stopMedia(element);
        revokeObjectUrls();
        element.hidden = true;
        element.innerHTML = '';
        state.chat = null;
    }

    async function applyDelivered(channelId, messageId, data) {
        var chat = state.chat;
        if (!chat || chat.id !== channelId) return;
        var row = chat.byId[messageId];
        if (!row || row.ciphertext === data.ciphertext) return;
        row.ciphertext = data.ciphertext;
        row.iv = data.iv;
        row.sender_key_id = data.sender_key_id;
        row.recipient_key_id = data.recipient_key_id;
        row.pending = false;
        row.plain = await decryptMessage(chat, row);
        renderMessages(false);
    }

    async function deliverMessages(channelId, partnerKeys, messages) {
        if (!vaultReady() || !partnerKeys || !partnerKeys.exists) return 0;
        var delivered = 0;
        for (var index = 0; index < messages.length; index++) {
            var message = messages[index];
            if (message.sender !== 'me' || !isPending(message)) continue;
            try {
                var source = await selfKey(channelId, message.sender_key_id);
                var plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(message.iv) }, source, fromBase64(message.ciphertext));
                var target = await sharedKey(channelId, state.myKeyId, partnerKeys, partnerKeys.key_id);
                var iv = randomBytes(12);
                var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, target, plain);
                var body = { ciphertext: toBase64(sealed), iv: toBase64(iv), sender_key_id: state.myKeyId, recipient_key_id: partnerKeys.key_id };
                await api('/messages/' + encodeURIComponent(message.id) + '/deliver', { method: 'POST', body: body });
                delivered++;
                await applyDelivered(channelId, message.id, body);
            } catch (error) {
                if (error && (error.status === 403 || error.status === 429 || error.status === 401)) break;
            }
        }
        return delivered;
    }

    function deliverAllPending() {
        if (!vaultReady() || state.deliveringAll) return state.deliveringAll;
        state.deliveringAll = (async function () {
            try {
                var data = await api('/pending');
                var channels = (data && data.channels) || [];
                for (var index = 0; index < channels.length; index++) {
                    await deliverMessages(channels[index].channel_id, channels[index].partner_keys, channels[index].messages || []);
                }
            } catch (error) {
            } finally {
                state.deliveringAll = null;
            }
        })();
        return state.deliveringAll;
    }

    function deliverOpenChat() {
        var chat = state.chat;
        if (!chat || !chat.partnerKeys || !chat.partnerKeys.exists) return;
        var own = chat.messages.filter(function (message) { return message.sender === 'me' && isPending(message); });
        if (!own.length) return;
        deliverMessages(chat.id, chat.partnerKeys, own).then(function () { deliverAllPending(); });
    }

    var objectUrls = [];

    function revokeObjectUrls() {
        objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        objectUrls = [];
    }

    async function ingestMessages(messages, prepend) {
        var chat = state.chat;
        var decrypted = await Promise.all(messages.map(function (message) { return decryptMessage(chat, message); }));
        var rows = messages.map(function (message, index) { return Object.assign({}, message, { plain: decrypted[index] }); });
        rows.forEach(function (row) { chat.byId[row.id] = row; });
        chat.messages = prepend ? rows.concat(chat.messages) : chat.messages.concat(rows);
    }

    function canSend() {
        var detail = state.chat && state.chat.detail;
        return detail && detail.can_send && detail.can_send.text;
    }

    function renderChatShell() {
        var chat = state.chat;
        var element = chatElement();
        var partner = chat.partner;
        var detail = chat.detail;
        var canAttach = detail.can_send.image || detail.can_send.video || detail.can_send.file;
        var accept = [detail.can_send.image ? 'image/*' : '', detail.can_send.video ? 'video/*' : '', detail.can_send.file ? '*/*' : ''].filter(Boolean).join(',');
        var banner = '';
        if (detail.incoming_request) banner = '<span>' + esc(t('This member wants to send you messages.')) + '</span><button type="button" class="rwl-btn rwl-btn-success" data-chat-action="accept_request">' + esc(t('Accept')) + '</button><button type="button" class="rwl-btn rwl-btn-danger" data-chat-action="decline_request">' + esc(t('Decline')) + '</button>';
        else if (detail.status === 'request') banner = '<span>' + esc(t('Message request sent. You can send up to 3 messages until it is accepted.')) + '</span>';
        else if (detail.status === 'declined') banner = '<span>' + esc(t('This member declined your message request.')) + '</span>';
        else if (!chat.partnerKeys || !chat.partnerKeys.exists) banner = '<span>' + esc(t('This member has not activated encrypted messages yet. Your messages stay sealed and are delivered automatically as soon as they open their messages.')) + '</span>';
        var clearRequest = detail.clear_request;
        if (!banner && clearRequest && clearRequest.pending) {
            banner = clearRequest.by_me
                ? '<span>' + esc(t('You asked to clear this chat. It is cleared as soon as your partner confirms.')) + '</span><button type="button" class="rwl-btn rwl-btn-secondary" data-chat-action="clear_cancel">' + esc(t('Cancel Request')) + '</button>'
                : '<span>' + esc(t('Your partner wants to clear the whole chat history for both of you.')) + '</span><button type="button" class="rwl-btn rwl-btn-danger" data-chat-action="clear_confirm">' + esc(t('Clear Chat')) + '</button><button type="button" class="rwl-btn rwl-btn-secondary" data-chat-action="clear_cancel">' + esc(t('Decline')) + '</button>';
        }
        var locked = !canSend();
        var lockText = detail.incoming_request ? t('Accept the message request to reply') : (detail.status === 'declined' ? t('This member declined your message request.') : t('You cannot send messages in this conversation'));
        var lockAttribute = locked ? ' disabled' : '';
        element.innerHTML =
            '<div class="rwl-chat-head" data-username="' + esc(partner.username) + '" title="' + esc(t('Drag to move the chat')) + '">' + plateVideo(partner, '') +
                '<button type="button" class="rwl-icon-btn" data-chat-action="list" title="' + esc(t('All chats')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></button>' +
                '<div class="rwl-center-avatar">' + avatarHtml(partner, 'rwl-center-img', true, true) + '</div>' +
                '<div class="rwl-chat-title" data-chat-action="profile" title="' + esc(t('Open the profile')) + '" translate="no"><strong style="' + esc(nameStyle(partner)) + '">' + esc(partner.username) + '</strong><span class="rwl-chat-lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' + esc(t('End to end encrypted')) + '</span></div>' +
                '<button type="button" class="rwl-icon-btn" data-chat-action="pins" title="' + esc(t('Pinned messages')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M5 17h14l-2-5V5h1V3H6v2h1v7z"/></svg></button>' +
                '<button type="button" class="rwl-icon-btn" data-chat-action="clear" title="' + esc(t('Clear the chat history')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>' +
                '<button type="button" class="rwl-icon-btn" data-chat-action="minimize" title="' + esc(t('Minimize the chat')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>' +
                '<button type="button" class="rwl-icon-btn" data-chat-action="close" title="' + esc(t('Close the conversation')) + '">✕</button>' +
            '</div>' +
            '<div class="rwl-chat-list" hidden></div>' +
            '<div class="rwl-chat-banner"' + (banner ? '' : ' hidden') + '>' + banner + '</div>' +
            '<div class="rwl-pins-panel" hidden></div>' +
            '<div class="rwl-chat-scroll" tabindex="0"></div>' +
            '<button type="button" class="rwl-btn rwl-jump" hidden data-chat-action="jump">' + esc(t('Jump to present')) + '</button>' +
            '<div class="rwl-chat-typing"></div>' +
            '<div class="rwl-emoji-panel" hidden>' + EMOJI_SET.map(function (emoji) { return '<button type="button" class="rwl-emoji" data-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div>' +
            '<div class="rwl-composer">' +
                '<div class="rwl-composer-context" hidden><span data-context-text></span><button type="button" class="rwl-icon-btn" data-chat-action="cancel_context" title="' + esc(t('Cancel')) + '">✕</button></div>' +
                '<div class="rwl-composer-files" hidden></div>' +
                '<div class="rwl-composer-box' + (locked ? ' rwl-composer-locked' : '') + '">' +
                    (canAttach && !locked ? '<button type="button" class="rwl-icon-btn" data-chat-action="attach" title="' + esc(t('Attach a file')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button><input type="file" hidden multiple data-file-input accept="' + esc(accept) + '">' : '') +
                    '<textarea class="rwl-composer-input" rows="1" maxlength="' + MAX_TEXT + '" placeholder="' + esc(locked ? lockText : t('Message') + ' @' + partner.username) + '"' + lockAttribute + '></textarea>' +
                    '<button type="button" class="rwl-icon-btn" data-chat-action="emoji" title="' + esc(t('Emoji')) + '"' + lockAttribute + '>😊</button>' +
                    '<button type="button" class="rwl-icon-btn" data-chat-action="send" title="' + esc(t('Send')) + '"' + lockAttribute + '><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
                '</div>' +
                '<div class="rwl-composer-hint">' + esc(detail.can_send.links ? t('Enter to send, Shift + Enter for a new line. **bold** *italic* __underline__ ~~strike~~ `code` ||spoiler||') : t('Links are not allowed for your account. Enter to send, Shift + Enter for a new line.')) + '</div>' +
            '</div>';
        watchMedia(element);
        startMedia(element.querySelector('.rwl-chat-head'));
        bindChat(element);
        decorateWindow(element);
    }

    var windowState = { x: null, y: null, minimized: false, bubble: null, dragging: null };

    function clampPosition(element, x, y) {
        var width = element.offsetWidth || 420;
        var height = element.offsetHeight || 520;
        return {
            x: Math.max(8, Math.min(x, global.innerWidth - Math.min(width, global.innerWidth - 16) - 8)),
            y: Math.max(8, Math.min(y, global.innerHeight - 120))
        };
    }

    function applyWindowPosition(element) {
        if (windowState.x === null || windowState.y === null) return;
        var position = clampPosition(element, windowState.x, windowState.y);
        element.classList.add('rwl-chat-moved');
        element.style.left = position.x + 'px';
        element.style.top = position.y + 'px';
    }

    function decorateWindow(element) {
        applyWindowPosition(element);
        if (element.dataset.windowReady === '1') return;
        element.dataset.windowReady = '1';
        element.addEventListener('pointerdown', function (event) {
            var head = event.target.closest('.rwl-chat-head');
            if (!head || event.button !== 0 || event.target.closest('button, a, input, textarea, [data-chat-action="profile"]')) return;
            var rect = element.getBoundingClientRect();
            windowState.dragging = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, pointer: event.pointerId };
            element.classList.add('rwl-chat-dragging');
            try { head.setPointerCapture(event.pointerId); } catch (error) {}
            event.preventDefault();
        });
        element.addEventListener('pointermove', function (event) {
            var drag = windowState.dragging;
            if (!drag || drag.pointer !== event.pointerId) return;
            var position = clampPosition(element, event.clientX - drag.offsetX, event.clientY - drag.offsetY);
            windowState.x = position.x;
            windowState.y = position.y;
            element.classList.add('rwl-chat-moved');
            element.style.left = position.x + 'px';
            element.style.top = position.y + 'px';
        });
        function endDrag(event) {
            if (!windowState.dragging || windowState.dragging.pointer !== event.pointerId) return;
            windowState.dragging = null;
            element.classList.remove('rwl-chat-dragging');
        }
        element.addEventListener('pointerup', endDrag);
        element.addEventListener('pointercancel', endDrag);
        element.addEventListener('dblclick', function (event) {
            if (!event.target.closest('.rwl-chat-head') || event.target.closest('button')) return;
            windowState.x = null;
            windowState.y = null;
            element.classList.remove('rwl-chat-moved');
            element.style.left = '';
            element.style.top = '';
        });
        global.addEventListener('resize', function () { if (!element.hidden) applyWindowPosition(element); }, { passive: true });
    }

    function bubbleElement() {
        if (windowState.bubble && windowState.bubble.isConnected) return windowState.bubble;
        var bubble = document.createElement('button');
        bubble.type = 'button';
        bubble.className = 'rwl-chat-bubble';
        bubble.hidden = true;
        bubble.addEventListener('click', restoreChat);
        document.body.appendChild(bubble);
        windowState.bubble = bubble;
        return bubble;
    }

    function bubbleIdentity() {
        if (state.chat && state.chat.partner) return { user: state.chat.partner, label: state.chat.partner.username };
        var group = global.RWLGroups && global.RWLGroups.current ? global.RWLGroups.current() : null;
        if (group) return { user: { username: group.name }, label: group.name };
        return { user: { username: '?' }, label: t('Chat') };
    }

    function minimizeChat() {
        var element = document.getElementById('rwlChat');
        if (!element || element.hidden) return;
        var identity = bubbleIdentity();
        var bubble = bubbleElement();
        bubble.innerHTML = '<span class="rwl-chat-bubble-avatar">' + avatarHtml(identity.user, 'rwl-center-img', true, false) + '</span><span class="rwl-chat-bubble-badge" hidden></span>';
        bubble.title = t('Open the chat with') + ' ' + identity.label;
        bubble.setAttribute('aria-label', bubble.title);
        windowState.minimized = true;
        element.classList.add('rwl-chat-minimizing');
        setTimeout(function () {
            element.classList.remove('rwl-chat-minimizing');
            if (!windowState.minimized) return;
            element.hidden = true;
            document.body.classList.remove('rwl-chat-open');
            bubble.hidden = false;
            bubble.classList.remove('rwl-chat-bubble-pop');
            void bubble.offsetWidth;
            bubble.classList.add('rwl-chat-bubble-pop');
        }, 260);
    }

    function restoreChat() {
        var element = document.getElementById('rwlChat');
        var bubble = bubbleElement();
        bubble.hidden = true;
        windowState.minimized = false;
        if (!element) return;
        element.hidden = false;
        document.body.classList.add('rwl-chat-open');
        element.classList.remove('rwl-chat-restoring');
        void element.offsetWidth;
        element.classList.add('rwl-chat-restoring');
        setTimeout(function () { element.classList.remove('rwl-chat-restoring'); }, 320);
        applyWindowPosition(element);
        if (state.chat) markRead();
    }

    function bumpBubble() {
        if (!windowState.minimized) return;
        var bubble = bubbleElement();
        var badge = bubble.querySelector('.rwl-chat-bubble-badge');
        if (!badge) return;
        var count = (parseInt(badge.textContent, 10) || 0) + 1;
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = false;
    }

    async function renderChatList() {
        var element = document.getElementById('rwlChat');
        var panel = element && element.querySelector('.rwl-chat-list');
        if (!panel) return;
        if (!panel.hidden) {
            panel.hidden = true;
            return;
        }
        panel.hidden = false;
        panel.innerHTML = '<div class="rwl-center-empty">' + esc(t('Loading chats...')) + '</div>';
        if (!state.notifications) await refreshNotifications();
        var groups = [];
        if (global.RWLGroups && global.RWLGroups.list) {
            try { groups = await global.RWLGroups.list(); } catch (error) { groups = []; }
        }
        var channels = (state.notifications && state.notifications.channels) || [];
        var currentGroup = global.RWLGroups && global.RWLGroups.current ? global.RWLGroups.current() : null;
        var html = '<div class="rwl-chat-list-head"><strong>' + esc(t('Direct Messages')) + '</strong>' + (global.RWLGroups ? '<button type="button" class="rwl-btn rwl-btn-secondary" data-chat-action="group_new">' + esc(t('New Group')) + '</button>' : '') + '</div>';
        html += channels.length ? channels.map(function (row) {
            var active = state.chat && state.chat.id === row.channel_id;
            return '<button type="button" class="rwl-chat-list-row' + (active ? ' active' : '') + '" data-chat-action="switch_dm" data-channel="' + esc(row.channel_id) + '"><span class="rwl-center-avatar">' + avatarHtml(row.partner, 'rwl-center-img', true, true) + '</span><span class="rwl-chat-list-name" translate="no" style="' + esc(nameStyle(row.partner)) + '">' + esc(row.partner.username) + '</span>' + (row.unread ? '<span class="rwl-count-badge">' + (row.unread > 99 ? '99+' : row.unread) + '</span>' : '') + '</button>';
        }).join('') : '<div class="rwl-center-empty">' + esc(t('No direct messages yet.')) + '</div>';
        if (global.RWLGroups) {
            html += '<div class="rwl-chat-list-head"><strong>' + esc(t('Group Chats')) + '</strong><button type="button" class="rwl-btn rwl-btn-secondary" data-chat-action="group_join">' + esc(t('Join With Code')) + '</button></div>';
            html += groups.length ? groups.map(function (group) {
                var active = currentGroup && currentGroup.group_id === group.group_id;
                return '<button type="button" class="rwl-chat-list-row' + (active ? ' active' : '') + '" data-chat-action="switch_group" data-group="' + esc(group.group_id) + '"><span class="rwl-group-icon">' + esc(initials(group.name)) + '</span><span class="rwl-chat-list-name" translate="no">' + esc(group.name) + '</span><span class="rwl-chat-list-meta">' + group.member_count + ' ' + esc(t('members')) + '</span>' + (group.unread ? '<span class="rwl-count-badge">' + (group.unread > 99 ? '99+' : group.unread) + '</span>' : '') + '</button>';
            }).join('') : '<div class="rwl-center-empty">' + esc(t('No group chats yet.')) + '</div>';
        }
        panel.innerHTML = html;
    }

    async function requestClear() {
        var chat = state.chat;
        if (!chat) return;
        var rules = chat.detail.delete_rules || {};
        var pending = chat.detail.clear_request;
        var question = rules.staff_instant_clear ? t('Clear the whole chat history for both members now?') : (pending && pending.pending && !pending.by_me ? t('Confirm clearing the whole chat history for both of you?') : t('Ask your partner to clear the whole chat history? It is cleared as soon as both of you confirmed.'));
        if (pending && pending.pending && pending.by_me) {
            notify(t('Waiting for your partner to confirm the clear request.'), 'info');
            return;
        }
        if (!(await confirmDialog(t('Clear Chat'), question, true))) return;
        try {
            var result = await api('/channels/' + encodeURIComponent(chat.id) + '/clear', { method: 'POST' });
            notify(result.cleared ? t('The chat was cleared.') : t('Clear request sent. Your partner has to confirm it.'), 'success');
            openChat(chat.id);
        } catch (error) {
            notify(error.message || t('The chat could not be cleared.'), 'error');
        }
    }

    async function declineClear() {
        var chat = state.chat;
        if (!chat) return;
        try {
            await api('/channels/' + encodeURIComponent(chat.id) + '/clear/decline', { method: 'POST' });
            openChat(chat.id);
        } catch (error) {
            notify(error.message, 'error');
        }
    }

    function canDeleteForEveryone(message) {
        var chat = state.chat;
        var rules = (chat && chat.detail && chat.detail.delete_rules) || {};
        if (rules.owner_any_time) return true;
        var created = Date.parse(message.created_at || '');
        var fresh = !isNaN(created) && Date.now() - created <= (rules.window_seconds || 1800) * 1000;
        return fresh && (message.sender === 'me' || rules.staff_any_message);
    }

    async function deleteMessage(messageId, scope) {
        var question = scope === 'me' ? t('Delete this message only for you? Your partner still sees it.') : t('Delete this message for everyone?');
        if (!(await confirmDialog(t('Delete Message'), question, true))) return;
        try {
            await api('/messages/' + encodeURIComponent(messageId) + '/delete', { method: 'POST', body: { scope: scope } });
            if (scope === 'me' && state.chat) {
                delete state.chat.byId[messageId];
                state.chat.messages = state.chat.messages.filter(function (message) { return message.id !== messageId; });
                renderMessages(false);
            }
        } catch (error) {
            notify(error.message, 'error');
        }
    }

    function bindChat(element) {
        var scroller = element.querySelector('.rwl-chat-scroll');
        var input = element.querySelector('.rwl-composer-input');
        var firstBind = element.dataset.chatBound !== '1';
        element.dataset.chatBound = '1';
        if (firstBind) element.addEventListener('click', onChatClick);
        scroller.addEventListener('scroll', function () {
            var nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
            element.querySelector('.rwl-jump').hidden = nearBottom;
            if (scroller.scrollTop < 60 && state.chat && state.chat.hasMore && !state.chat.loadingOlder) loadOlder();
            if (nearBottom) markRead();
        }, { passive: true });
        input.addEventListener('input', function () {
            input.style.height = 'auto';
            input.style.height = Math.min(160, input.scrollHeight) + 'px';
            sendTyping();
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                submitComposer();
            } else if (event.key === 'Escape') {
                cancelContext();
            } else if (event.key === 'ArrowUp' && !input.value && state.chat) {
                var own = state.chat.messages.filter(function (message) { return message.sender === 'me' && message.plain.ok; });
                if (own.length) {
                    event.preventDefault();
                    startEdit(own[own.length - 1].id);
                }
            }
        });
        var fileInput = element.querySelector('[data-file-input]');
        if (fileInput) fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
        if (firstBind) {
            element.addEventListener('dragover', function (event) { if (element.querySelector('[data-file-input]')) event.preventDefault(); });
            element.addEventListener('drop', function (event) {
                var currentInput = element.querySelector('[data-file-input]');
                if (!currentInput || !state.chat || !event.dataTransfer || !event.dataTransfer.files.length) return;
                event.preventDefault();
                addFiles(event.dataTransfer.files);
            });
        }
        input.addEventListener('paste', function (event) {
            if (fileInput && event.clipboardData && event.clipboardData.files && event.clipboardData.files.length) {
                event.preventDefault();
                addFiles(event.clipboardData.files);
            }
        });
    }

    function fileKind(file) {
        if (/^image\//.test(file.type)) return 'image';
        if (/^video\//.test(file.type)) return 'video';
        return 'file';
    }

    function addFiles(list) {
        var chat = state.chat;
        if (!chat) return;
        Array.prototype.forEach.call(list || [], function (file) {
            var kind = fileKind(file);
            if (!chat.detail.can_send[kind]) {
                notify(t('You cannot send this type of file to this member.'), 'error');
                return;
            }
            if (file.size > chat.detail.limits[kind]) {
                notify(t('The file is too large.') + ' (' + file.name + ')', 'error');
                return;
            }
            if (chat.files.length >= 5) return;
            chat.files.push(file);
        });
        renderFiles();
    }

    function renderFiles() {
        var element = document.getElementById('rwlChat');
        var holder = element && element.querySelector('.rwl-composer-files');
        if (!holder || !state.chat) return;
        holder.hidden = !state.chat.files.length;
        holder.innerHTML = state.chat.files.map(function (file, index) {
            return '<span class="rwl-file-chip" translate="no">' + KIND_ICONS[fileKind(file)] + ' ' + esc(file.name.slice(0, 40)) + ' <button type="button" class="rwl-tool" data-remove-file="' + index + '" title="' + esc(t('Remove')) + '">✕</button></span>';
        }).join('');
    }

    function sendTyping() {
        var chat = state.chat;
        if (!chat || Date.now() - chat.lastTypingSent < 3500) return;
        chat.lastTypingSent = Date.now();
        api('/channels/' + encodeURIComponent(chat.id) + '/typing', { method: 'POST' }).catch(function () {});
    }

    function setContext(text) {
        var element = document.getElementById('rwlChat');
        var context = element.querySelector('.rwl-composer-context');
        context.hidden = !text;
        context.querySelector('[data-context-text]').textContent = text || '';
    }

    function cancelContext() {
        if (!state.chat) return;
        var wasEditing = !!state.chat.editing;
        state.chat.replyTo = null;
        state.chat.editing = null;
        setContext('');
        if (wasEditing) document.querySelector('#rwlChat .rwl-composer-input').value = '';
    }

    function startReply(messageId) {
        var message = state.chat && state.chat.byId[messageId];
        if (!message) return;
        state.chat.editing = null;
        state.chat.replyTo = messageId;
        setContext(t('Replying to') + ' ' + (message.sender === 'me' ? t('yourself') : state.chat.partner.username));
        document.querySelector('#rwlChat .rwl-composer-input').focus();
    }

    function startEdit(messageId) {
        var message = state.chat && state.chat.byId[messageId];
        if (!message || message.sender !== 'me' || !message.plain.ok) return;
        state.chat.replyTo = null;
        state.chat.editing = messageId;
        setContext(t('Editing message, press Escape to cancel'));
        var input = document.querySelector('#rwlChat .rwl-composer-input');
        input.value = message.plain.text;
        input.focus();
        input.dispatchEvent(new Event('input'));
    }

    async function encryptFile(file) {
        var key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        var iv = randomBytes(12);
        var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, await file.arrayBuffer());
        var raw = await subtle.exportKey('raw', key);
        return { body: sealed, key: toBase64(raw), iv: toBase64(iv) };
    }

    async function uploadFile(chat, file) {
        var kind = fileKind(file);
        var sealed = await encryptFile(file);
        var response = await fetch(RWL.apiUrl('/api/social/channels/' + encodeURIComponent(chat.id) + '/attachments?kind=' + kind), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + RWL.getToken(), 'Content-Type': 'application/octet-stream' },
            body: sealed.body
        });
        var data = null;
        try { data = await response.json(); } catch (error) {}
        if (!response.ok) throw new Error(RWL.errorDetail(data, t('The file could not be uploaded.')));
        return { id: data.attachment_id, kind: kind, name: file.name.slice(0, 120), mime: (file.type || 'application/octet-stream').slice(0, 80), size: file.size, key: sealed.key, iv: sealed.iv };
    }

    async function submitComposer() {
        var chat = state.chat;
        var element = document.getElementById('rwlChat');
        if (!chat || !element) return;
        var input = element.querySelector('.rwl-composer-input');
        var text = input.value.replace(/\s+$/, '');
        if (!text.trim() && !chat.files.length) return;
        if (text.length > MAX_TEXT) {
            notify(t('The message is too long.'), 'error');
            return;
        }
        if (!chat.detail.can_send.links && LOOSE_LINK_PATTERN.test(text)) {
            input.classList.add('rwl-invalid');
            notify(t('Links are not allowed for your account.'), 'error');
            return;
        }
        input.classList.remove('rwl-invalid');
        if (!canSend()) return;
        var sendButton = element.querySelector('[data-chat-action="send"]');
        sendButton.disabled = true;
        input.disabled = true;
        try {
            if (chat.editing) {
                var original = chat.byId[chat.editing];
                var payload = { v: 1, t: text, a: original.plain.files || [] };
                var sealed = await encryptEditPayload(chat, original, payload);
                await api('/messages/' + encodeURIComponent(chat.editing) + '/edit', { method: 'POST', body: sealed });
                cancelContext();
            } else {
                var files = [];
                for (var index = 0; index < chat.files.length; index++) files.push(await uploadFile(chat, chat.files[index]));
                var body = await encryptPayload(chat, { v: 1, t: text, a: files });
                body.reply_to = chat.replyTo;
                body.attachments = files.map(function (file) { return file.id; });
                var result = await api('/channels/' + encodeURIComponent(chat.id) + '/messages', { method: 'POST', body: body });
                chat.files = [];
                renderFiles();
                cancelContext();
                await addLiveMessage(result.message);
            }
            input.value = '';
            input.style.height = 'auto';
        } catch (error) {
            if (error.status === 409) {
                notify(t('The encryption keys changed. The conversation is reloaded.'), 'info');
                openChat(chat.id);
            } else {
                notify(error.message || t('The message could not be sent.'), 'error');
            }
        } finally {
            sendButton.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    async function encryptEditPayload(chat, original, payload) {
        var key = isPending(original) ? await selfKey(chat.id, original.sender_key_id) : await sharedKey(chat.id, original.sender_key_id, chat.partnerKeys, original.recipient_key_id);
        var iv = randomBytes(12);
        var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(JSON.stringify(payload)));
        return { ciphertext: toBase64(sealed), iv: toBase64(iv), sender_key_id: original.sender_key_id, recipient_key_id: original.recipient_key_id };
    }

    async function addLiveMessage(message) {
        var chat = state.chat;
        if (!chat || chat.byId[message.id]) return;
        var scroller = document.querySelector('#rwlChat .rwl-chat-scroll');
        var nearBottom = !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
        await ingestMessages([message], false);
        renderMessages(nearBottom || message.sender === 'me');
        if (nearBottom && document.visibilityState === 'visible') markRead();
    }

    async function loadOlder() {
        var chat = state.chat;
        if (!chat || !chat.messages.length) return;
        chat.loadingOlder = true;
        var scroller = document.querySelector('#rwlChat .rwl-chat-scroll');
        var previousHeight = scroller.scrollHeight;
        try {
            var detail = await api('/channels/' + encodeURIComponent(chat.id) + '?limit=50&before=' + encodeURIComponent(chat.messages[0].id));
            chat.hasMore = detail.has_more;
            await ingestMessages(detail.messages, true);
            renderMessages(false);
            scroller.scrollTop = scroller.scrollHeight - previousHeight;
        } catch (error) {
        } finally {
            chat.loadingOlder = false;
        }
    }

    function linkify(escaped, allowed, hidden) {
        return escaped.replace(URL_PATTERN, function (url) {
            if (allowed && !hidden) return '<a href="' + url + '" target="_blank" rel="noopener noreferrer nofollow">' + url + '</a>';
            return '<span class="rwl-link-blocked" title="' + esc(hidden ? t('Links from members are hidden by your safety settings') : t('This member is not allowed to send links')) + '">' + esc(t('link removed')) + '</span>';
        });
    }

    function renderMarkdown(text, allowLinks, linksHidden) {
        var blocks = [];
        var source = String(text || '').replace(/```(?:[a-z0-9]{0,12}\n)?([\s\S]*?)```/gi, function (all, code) {
            blocks.push('<pre>' + esc(code.replace(/^\n+|\n+$/g, '')) + '</pre>');
            return '\u0000B' + (blocks.length - 1) + '\u0000';
        });
        var inline = [];
        source = source.replace(/`([^`\n]+)`/g, function (all, code) {
            inline.push('<code>' + esc(code) + '</code>');
            return '\u0000I' + (inline.length - 1) + '\u0000';
        });
        var html = esc(source);
        html = linkify(html, allowLinks, linksHidden);
        html = html.replace(/\|\|(.+?)\|\|/g, '<span class="rwl-spoiler" data-spoiler>$1</span>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<u>$1</u>');
        html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
        html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        html = html.replace(/(^|\n)&gt; ?([^\n]*)/g, '$1<blockquote>$2</blockquote>');
        html = html.replace(/\u0000I(\d+)\u0000/g, function (all, index) { return inline[parseInt(index, 10)] || ''; });
        html = html.replace(/\u0000B(\d+)\u0000/g, function (all, index) { return blocks[parseInt(index, 10)] || ''; });
        return html;
    }

    function dayKey(value) {
        var date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toDateString();
    }

    function messageHtml(message, grouped) {
        var chat = state.chat;
        var mine = message.sender === 'me';
        var author = mine ? (state.overview && state.overview.username) || t('You') : chat.partner.username;
        var authorUser = mine ? ((state.overview && state.overview.identity) || { username: author }) : chat.partner;
        var plain = message.plain;
        var reply = '';
        if (message.reply_to) {
            var target = chat.byId[message.reply_to];
            var replyAuthor = target ? (target.sender === 'me' ? author : chat.partner.username) : '';
            var replyText = target ? (target.plain.text || (target.attachments.length ? t('Attachment') : '')).slice(0, 120) : t('Original message was deleted');
            reply = '<div class="rwl-reply-ref" data-jump-to="' + esc(message.reply_to) + '" translate="no"><strong>' + esc(replyAuthor) + '</strong><span>' + esc(replyText) + '</span></div>';
            grouped = false;
        }
        var body = plain.ok ? renderMarkdown(plain.text, message.links_allowed, message.links_hidden) : esc(plain.text);
        var attachments = (plain.files || []).map(function (file) {
            return '<div class="rwl-attachment" data-attachment="' + esc(file.id) + '" data-message="' + esc(message.id) + '"><span class="rwl-attachment-loading">' + KIND_ICONS[file.kind] + ' ' + esc(file.name || t('Attachment')) + '</span></div>';
        }).join('');
        var reactions = (message.reactions || []).map(function (reaction) {
            return '<button type="button" class="rwl-reaction' + (reaction.me ? ' mine' : '') + '" data-react="' + esc(reaction.emoji) + '" title="' + esc(t('React')) + '">' + esc(reaction.emoji) + ' <span>' + reaction.count + '</span></button>';
        }).join('');
        var tools = '<div class="rwl-msg-tools">' +
            '<button type="button" class="rwl-tool" data-tool="react" title="' + esc(t('Add reaction')) + '">😊</button>' +
            '<button type="button" class="rwl-tool" data-tool="reply" title="' + esc(t('Reply')) + '">↩</button>' +
            '<button type="button" class="rwl-tool" data-tool="pin" title="' + esc(message.pinned ? t('Unpin') : t('Pin')) + '">📌</button>' +
            (plain.ok ? '<button type="button" class="rwl-tool" data-tool="copy" title="' + esc(t('Copy text')) + '">⧉</button>' : '') +
            (mine && plain.ok ? '<button type="button" class="rwl-tool" data-tool="edit" title="' + esc(t('Edit')) + '">✎</button>' : '') +
            '<button type="button" class="rwl-tool" data-tool="delete_me" title="' + esc(t('Delete for me')) + '">🙈</button>' +
            (canDeleteForEveryone(message) ? '<button type="button" class="rwl-tool rwl-tool-danger" data-tool="delete" title="' + esc(t('Delete for everyone')) + '">🗑</button>' : '') +
        '</div>';
        var waitingNote = mine && isPending(message) ? '<span class="rwl-msg-pending-note" title="' + esc(t('Delivered automatically as soon as this member activates encrypted messages')) + '">⏳ ' + esc(t('Waiting for delivery')) + '</span>' : '';
        var bodyState = plain.ok ? '' : (plain.waiting ? ' rwl-msg-waiting' : ' rwl-msg-locked');
        var head = grouped
            ? '<span class="rwl-msg-time-gutter">' + esc(formatTime(message.created_at)) + '</span>'
            : '<div class="rwl-msg-avatar-wrap" data-chat-action="profile_author" data-author="' + esc(mine ? 'me' : 'partner') + '">' + avatarHtml(authorUser, 'rwl-msg-avatar', true, false) + '</div>';
        return '<div class="rwl-msg' + (grouped ? '' : ' rwl-msg-start') + (message.pinned ? ' rwl-msg-pinned' : '') + '" data-message-id="' + esc(message.id) + '">' +
            reply + head +
            '<div class="rwl-msg-content">' +
                (grouped ? '' : '<div class="rwl-msg-head" translate="no"><span class="rwl-msg-author" style="' + esc(nameStyle(authorUser)) + '" data-chat-action="profile_author" data-author="' + (mine ? 'me' : 'partner') + '">' + esc(author) + '</span><span class="rwl-msg-time">' + esc(formatStamp(message.created_at)) + '</span></div>') +
                '<div class="rwl-msg-body' + bodyState + '" translate="no">' + body + (message.edited_at ? '<span class="rwl-msg-edited">(' + esc(t('edited')) + ')</span>' : '') + waitingNote + '</div>' +
                (attachments ? '<div class="rwl-attachments">' + attachments + '</div>' : '') +
                (reactions ? '<div class="rwl-reactions">' + reactions + '</div>' : '') +
            '</div>' + tools +
        '</div>';
    }

    function renderMessages(scrollToBottom) {
        var chat = state.chat;
        var element = document.getElementById('rwlChat');
        if (!chat || !element) return;
        var scroller = element.querySelector('.rwl-chat-scroll');
        var html = chat.hasMore ? '' : '<div class="rwl-chat-start" translate="no"><strong style="' + esc(nameStyle(chat.partner)) + '">' + esc(chat.partner.username) + '</strong>' + esc(t('This is the beginning of your direct message history. Messages are end to end encrypted.')) + '</div>';
        var previous = null;
        var readAt = chat.detail.partner_read_at;
        chat.messages.forEach(function (message) {
            if (!previous || dayKey(previous.created_at) !== dayKey(message.created_at)) {
                html += '<div class="rwl-day">' + esc(new Date(message.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })) + '</div>';
                previous = null;
            }
            var grouped = !!previous && previous.sender === message.sender && new Date(message.created_at) - new Date(previous.created_at) < GROUP_MS && !message.reply_to;
            html += messageHtml(message, grouped);
            previous = message;
        });
        var last = chat.messages[chat.messages.length - 1];
        if (last && last.sender === 'me' && readAt && new Date(readAt) >= new Date(last.created_at)) html += '<div class="rwl-composer-hint" style="text-align:right;padding:2px 16px">' + esc(t('Seen')) + '</div>';
        scroller.innerHTML = html;
        loadAttachments(scroller);
        if (scrollToBottom) scroller.scrollTop = scroller.scrollHeight;
    }

    async function loadAttachments(scroller) {
        var chat = state.chat;
        var holders = scroller.querySelectorAll('[data-attachment]');
        for (var index = 0; index < holders.length; index++) {
            var holder = holders[index];
            var message = chat.byId[holder.getAttribute('data-message')];
            var file = message && (message.plain.files || []).filter(function (entry) { return entry.id === holder.getAttribute('data-attachment'); })[0];
            if (!file) continue;
            if (file.kind === 'file') {
                holder.innerHTML = '<button type="button" class="rwl-attachment-file" data-download="' + esc(file.id) + '" data-message="' + esc(message.id) + '" translate="no">📄 ' + esc(file.name) + ' · ' + esc(Math.max(1, Math.round(file.size / 1024)) + ' KB') + '</button>';
                continue;
            }
            decryptAttachment(chat, file).then((function (target, entry) {
                return function (url) {
                    if (!url || !target.isConnected) return;
                    target.innerHTML = entry.kind === 'image'
                        ? '<img class="rwl-attachment-media" src="' + url + '" alt="' + esc(entry.name) + '">'
                        : '<video class="rwl-attachment-media" src="' + url + '" controls playsinline preload="metadata"></video>';
                };
            })(holder, file)).catch(function () {});
        }
    }

    var attachmentCache = {};

    async function decryptAttachment(chat, file) {
        if (attachmentCache[file.id]) return attachmentCache[file.id];
        var response = await fetch(RWL.apiUrl('/api/social/attachments/' + encodeURIComponent(chat.id) + '/' + encodeURIComponent(file.id)), { headers: { 'Authorization': 'Bearer ' + RWL.getToken() } });
        if (!response.ok) throw new Error('download failed');
        var sealed = await response.arrayBuffer();
        var key = await subtle.importKey('raw', fromBase64(file.key), { name: 'AES-GCM' }, false, ['decrypt']);
        var plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.iv) }, key, sealed);
        var safeMime = /^(image\/(png|jpe?g|gif|webp|bmp)|video\/(mp4|webm|ogg|quicktime))$/i.test(file.mime) ? file.mime : 'application/octet-stream';
        var url = URL.createObjectURL(new Blob([plain], { type: safeMime }));
        objectUrls.push(url);
        attachmentCache[file.id] = url;
        return url;
    }

    async function downloadAttachment(messageId, fileId) {
        var chat = state.chat;
        var message = chat && chat.byId[messageId];
        var file = message && message.plain.files.filter(function (entry) { return entry.id === fileId; })[0];
        if (!file) return;
        try {
            var url = await decryptAttachment(chat, Object.assign({}, file, { mime: 'application/octet-stream' }));
            var link = document.createElement('a');
            link.href = url;
            link.download = String(file.name || 'file').replace(/[\\/:*?"<>|]+/g, '_');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            notify(t('The file could not be downloaded.'), 'error');
        }
    }

    function showReactionPicker(button, messageId) {
        var emoji = (state.chat && state.chat.detail.reaction_emoji) || [];
        var panel = document.querySelector('#rwlChat .rwl-emoji-panel');
        panel.innerHTML = emoji.map(function (item) { return '<button type="button" class="rwl-emoji" data-reaction-pick="' + item + '" data-message="' + esc(messageId) + '">' + item + '</button>'; }).join('');
        panel.hidden = false;
        panel.setAttribute('data-mode', 'reaction');
    }

    function showEmojiPicker() {
        var panel = document.querySelector('#rwlChat .rwl-emoji-panel');
        if (!panel.hidden && panel.getAttribute('data-mode') === 'emoji') {
            panel.hidden = true;
            return;
        }
        panel.innerHTML = EMOJI_SET.map(function (emoji) { return '<button type="button" class="rwl-emoji" data-emoji="' + emoji + '">' + emoji + '</button>'; }).join('');
        panel.hidden = false;
        panel.setAttribute('data-mode', 'emoji');
    }

    function insertText(text) {
        var input = document.querySelector('#rwlChat .rwl-composer-input');
        if (!input) return;
        var start = input.selectionStart || input.value.length;
        var end = input.selectionEnd || input.value.length;
        input.value = input.value.slice(0, start) + text + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start + text.length;
        input.focus();
    }

    function renderPins() {
        var chat = state.chat;
        var panel = document.querySelector('#rwlChat .rwl-pins-panel');
        if (!panel) return;
        if (!panel.hidden) {
            panel.hidden = true;
            return;
        }
        var pinned = chat.messages.filter(function (message) { return message.pinned; });
        panel.innerHTML = '<div class="rwl-center-section">' + esc(t('Pinned Messages')) + '</div>' + (pinned.length ? pinned.map(function (message) {
            return '<div class="rwl-pin-row" data-jump-to="' + esc(message.id) + '" translate="no"><strong>' + esc(message.sender === 'me' ? t('You') : chat.partner.username) + '</strong> · ' + esc((message.plain.text || t('Attachment')).slice(0, 140)) + '</div>';
        }).join('') : '<div class="rwl-center-empty">' + esc(t('No pinned messages in the loaded history.')) + '</div>');
        panel.hidden = false;
    }

    function jumpTo(messageId) {
        var row = document.querySelector('#rwlChat [data-message-id="' + (global.CSS && CSS.escape ? CSS.escape(messageId) : messageId) + '"]');
        if (!row) {
            notify(t('This message is not loaded. Scroll up to load older messages.'), 'info');
            return;
        }
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row.classList.add('rwl-msg-flash');
        setTimeout(function () { row.classList.remove('rwl-msg-flash'); }, 1600);
    }

    async function onChatClick(event) {
        var chat = state.chat;
        if (!chat) return;
        var target = event.target;
        var spoiler = target.closest('[data-spoiler]');
        if (spoiler) {
            spoiler.classList.add('rwl-revealed');
            return;
        }
        var jump = target.closest('[data-jump-to]');
        if (jump) {
            var pins = document.querySelector('#rwlChat .rwl-pins-panel');
            if (pins) pins.hidden = true;
            jumpTo(jump.getAttribute('data-jump-to'));
            return;
        }
        var emojiButton = target.closest('[data-emoji]');
        if (emojiButton) {
            insertText(emojiButton.getAttribute('data-emoji'));
            return;
        }
        var reactionPick = target.closest('[data-reaction-pick]');
        if (reactionPick) {
            document.querySelector('#rwlChat .rwl-emoji-panel').hidden = true;
            react(reactionPick.getAttribute('data-message'), reactionPick.getAttribute('data-reaction-pick'));
            return;
        }
        var removeFile = target.closest('[data-remove-file]');
        if (removeFile) {
            chat.files.splice(parseInt(removeFile.getAttribute('data-remove-file'), 10), 1);
            renderFiles();
            return;
        }
        var download = target.closest('[data-download]');
        if (download) {
            downloadAttachment(download.getAttribute('data-message'), download.getAttribute('data-download'));
            return;
        }
        var reaction = target.closest('[data-react]');
        if (reaction) {
            var row = reaction.closest('[data-message-id]');
            react(row.getAttribute('data-message-id'), reaction.getAttribute('data-react'));
            return;
        }
        var tool = target.closest('[data-tool]');
        if (tool) {
            var messageRow = tool.closest('[data-message-id]');
            var messageId = messageRow.getAttribute('data-message-id');
            var name = tool.getAttribute('data-tool');
            if (name === 'reply') startReply(messageId);
            else if (name === 'edit') startEdit(messageId);
            else if (name === 'react') showReactionPicker(tool, messageId);
            else if (name === 'copy') {
                try { await navigator.clipboard.writeText(chat.byId[messageId].plain.text); notify(t('Copied.'), 'success'); } catch (error) {}
            } else if (name === 'pin') {
                try { await api('/messages/' + encodeURIComponent(messageId) + '/pin', { method: 'POST', body: { pinned: !chat.byId[messageId].pinned } }); } catch (error) { notify(error.message, 'error'); }
            } else if (name === 'delete') {
                await deleteMessage(messageId, 'everyone');
            } else if (name === 'delete_me') {
                await deleteMessage(messageId, 'me');
            }
            return;
        }
        var actionButton = target.closest('[data-chat-action]');
        if (!actionButton) {
            var panel = document.querySelector('#rwlChat .rwl-emoji-panel');
            if (panel && !panel.contains(target)) panel.hidden = true;
            return;
        }
        var action = actionButton.getAttribute('data-chat-action');
        if (action === 'close') closeChat();
        else if (action === 'minimize') minimizeChat();
        else if (action === 'list') renderChatList();
        else if (action === 'clear' || action === 'clear_confirm') requestClear();
        else if (action === 'clear_cancel') declineClear();
        else if (action === 'switch_dm') openChat(actionButton.getAttribute('data-channel'));
        else if (action === 'switch_group' && global.RWLGroups) global.RWLGroups.open(actionButton.getAttribute('data-group'));
        else if (action === 'group_new' && global.RWLGroups) global.RWLGroups.create();
        else if (action === 'group_join' && global.RWLGroups) global.RWLGroups.join();
        else if (action === 'send') submitComposer();
        else if (action === 'emoji') showEmojiPicker();
        else if (action === 'attach') document.querySelector('#rwlChat [data-file-input]').click();
        else if (action === 'cancel_context') cancelContext();
        else if (action === 'pins') renderPins();
        else if (action === 'jump') {
            var scroller = document.querySelector('#rwlChat .rwl-chat-scroll');
            scroller.scrollTop = scroller.scrollHeight;
        } else if (action === 'profile') openProfile(chat.partner.username);
        else if (action === 'profile_author') openProfile(actionButton.getAttribute('data-author') === 'me' ? (state.overview && state.overview.username) : chat.partner.username);
        else if (action === 'accept_request' || action === 'decline_request') {
            try {
                await api('/channels/' + encodeURIComponent(chat.id) + '/respond', { method: 'POST', body: { accept: action === 'accept_request' } });
                if (action === 'accept_request') openChat(chat.id);
                else closeChat();
                refreshNotifications();
            } catch (error) {
                notify(error.message, 'error');
            }
        }
    }

    async function react(messageId, emoji) {
        try {
            await api('/messages/' + encodeURIComponent(messageId) + '/react', { method: 'POST', body: { emoji: emoji } });
        } catch (error) {
            notify(error.message || t('The reaction failed.'), 'error');
        }
    }

    var readTimer = null;

    function markRead() {
        var chat = state.chat;
        if (!chat) return;
        clearTimeout(readTimer);
        readTimer = setTimeout(function () {
            api('/channels/' + encodeURIComponent(chat.id) + '/read', { method: 'POST' }).then(refreshNotifications).catch(function () {});
        }, 400);
    }

    function showTyping() {
        var element = document.querySelector('#rwlChat .rwl-chat-typing');
        if (!element || !state.chat) return;
        element.innerHTML = '<span class="rwl-typing-dots"><i></i><i></i><i></i></span><span translate="no"><strong>' + esc(state.chat.partner.username) + '</strong> ' + esc(t('is typing...')) + '</span>';
        clearTimeout(state.chat.typingTimer);
        state.chat.typingTimer = setTimeout(function () { element.innerHTML = ''; }, 6000);
    }

    async function onSocialEvent(event) {
        var entry = event.detail || {};
        var chat = state.chat;
        var forChat = chat && entry.channel_id === chat.id;
        if (entry.type === 'message') {
            if (forChat) {
                await addLiveMessage(entry.message);
                var typing = document.querySelector('#rwlChat .rwl-chat-typing');
                if (typing && entry.message.sender === 'partner') typing.innerHTML = '';
                if (entry.message.sender === 'partner') bumpBubble();
            }
            refreshNotifications();
        } else if ((entry.type === 'clear_requested' || entry.type === 'clear_declined') && forChat) {
            openChat(chat.id);
            if (entry.type === 'clear_declined' && !entry.cancelled && entry.username !== (state.overview && state.overview.username)) notify(t('The clear request was declined.'), 'info');
        } else if (entry.type === 'message_hidden' && forChat) {
            delete chat.byId[entry.message_id];
            chat.messages = chat.messages.filter(function (message) { return message.id !== entry.message_id; });
            renderMessages(false);
        } else if (entry.type === 'message_edit' && forChat) {
            var edited = chat.byId[entry.message_id];
            if (edited) {
                edited.ciphertext = entry.ciphertext;
                edited.iv = entry.iv;
                edited.edited_at = entry.edited_at;
                edited.plain = await decryptMessage(chat, edited);
                renderMessages(false);
            }
        } else if (entry.type === 'message_delivered' && forChat) {
            await applyDelivered(entry.channel_id, entry.message_id, entry);
        } else if (entry.type === 'partner_keys_ready') {
            if (forChat) openChat(chat.id);
            else if (vaultReady()) deliverAllPending();
            else if (global.RWLSocialNotify && global.RWLSocialNotify.popup) global.RWLSocialNotify.popup({ title: entry.username || t('Messages'), body: t('Activated encrypted messages. Open the chat to deliver your messages.'), icon: '🔐', onOpen: function () { openChat(entry.channel_id); } });
        } else if (entry.type === 'message_delete' && forChat) {
            delete chat.byId[entry.message_id];
            chat.messages = chat.messages.filter(function (message) { return message.id !== entry.message_id; });
            renderMessages(false);
        } else if (entry.type === 'reaction' && forChat) {
            var reacted = chat.byId[entry.message_id];
            if (reacted) {
                reacted.reactions = entry.reactions;
                renderMessages(false);
            }
        } else if (entry.type === 'pin' && forChat) {
            var pinned = chat.byId[entry.message_id];
            if (pinned) {
                pinned.pinned = entry.pinned;
                renderMessages(false);
            }
        } else if (entry.type === 'typing' && forChat) {
            showTyping();
        } else if (entry.type === 'read' && forChat) {
            chat.detail.partner_read_at = new Date(entry.at * 1000).toISOString();
            renderMessages(false);
        } else if (entry.type === 'channel_cleared' && forChat) {
            openChat(chat.id);
        } else if (entry.type === 'channel_update') {
            if (forChat) openChat(chat.id);
            refreshNotifications();
        } else if (entry.type === 'permissions' && chat) {
            openChat(chat.id);
        } else if (entry.type === 'friend_request' || entry.type === 'friend_update') {
            if (entry.username) invalidateProfile(entry.username);
            refreshNotifications();
            if (state.centerTab === 'friends') loadFriends();
        }
    }

    function isChatOpenFor(channelId) {
        return !!(state.chat && state.chat.id === channelId && document.visibilityState === 'visible');
    }

    function deepLink() {
        var match = /[?&#]dm=([0-9a-fA-F-]{36})/.exec(global.location.search + global.location.hash);
        if (!match || !signedIn()) return;
        var tab = document.querySelector('.top-tab[data-tab="dashboard"]');
        if (tab) tab.click();
        setTimeout(function () { openChat(match[1]); }, 300);
    }

    async function init() {
        if (state.initialized) return;
        state.initialized = true;
        setupDashboardInteractions();
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeProfile();
                hidePopout();
            }
        });
        if (!signedIn()) return;
        try {
            state.overview = await api('/me');
        } catch (error) {
            return;
        }
        setupToolbar();
        refreshNotifications();
        global.addEventListener('rwl-social-event', onSocialEvent);
        deepLink();
    }

    function onDashboardShown() {
        setupDashboardInteractions();
        setupToolbar();
        if (signedIn()) refreshNotifications();
    }

    async function ownPublicJson(keyId) {
        var jwk = state.vaultData && state.vaultData.keys ? state.vaultData.keys[String(keyId)] : null;
        if (!jwk || !jwk.x || !jwk.y) throw new Error('missing key');
        return JSON.stringify({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });
    }

    async function derivedKey(myKeyId, publicJson, salt, info) {
        var privateKey = state.privateKeys[String(myKeyId)];
        if (!privateKey || !publicJson) throw new Error('missing key');
        var publicKey = await subtle.importKey('jwk', Object.assign({ ext: true }, JSON.parse(publicJson)), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
        var bits = await subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
        var material = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
        return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(salt), info: encoder.encode(info) }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }

    global.RWLSocial = {
        observeCard: observeCard,
        openProfile: openProfile,
        openChat: openChat,
        openChatWith: openChatWith,
        isChatOpenFor: isChatOpenFor,
        refresh: refreshNotifications,
        closeChat: closeChat,
        minimize: minimizeChat,
        restore: restoreChat,
        showChatList: renderChatList,
        decorateWindow: decorateWindow,
        chatElement: chatElement,
        bumpBubble: bumpBubble,
        avatarHtml: avatarHtml,
        nameStyle: nameStyle,
        renderMarkdown: renderMarkdown,
        formatStamp: formatStamp,
        confirmDialog: confirmDialog,
        notify: notify,
        identity: function () { return state.overview ? (state.overview.identity || { username: state.overview.username }) : null; },
        username: function () { return state.overview ? state.overview.username : ''; },
        crypto: {
            ensureVault: ensureVault,
            ready: vaultReady,
            myKeyId: function () { return state.myKeyId; },
            ownPublicJson: ownPublicJson,
            derivedKey: derivedKey,
            partnerPublic: partnerPublic,
            toBase64: toBase64,
            fromBase64: fromBase64,
            randomBytes: randomBytes
        },
        resetVault: function () { return vaultDialog('reset'); },
        changeVaultPassphrase: async function (passphrase) {
            if (!vaultReady()) throw new Error(t('Unlock your messages first.'));
            var sealed = await sealVault(passphrase, state.vaultData);
            return api('/keys/me', { method: 'PUT', body: Object.assign({ public_key: state.keys.public_key, rotate: false }, sealed) });
        }
    };

    document.addEventListener('click', function (event) {
        var tab = event.target.closest && event.target.closest('.top-tab[data-tab="dashboard"]');
        if (tab) setTimeout(onDashboardShown, 50);
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 400); });
    else setTimeout(init, 400);
})(window);
