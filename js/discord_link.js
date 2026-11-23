(function (global) {
    'use strict';

    if (!global.RWL) return;

    var STATUS_PATH = '/api/account/discord/status';
    var LINK_PATH = '/api/account/discord/link';
    var PROFILE_PATH = '/api/account/discord/profile';
    var POLL_MS = 4000;
    var HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
    var IMAGE_PREFIXES = [
        'https://raw.githubusercontent.com/Rickware-Labs-Official/Discord-Badges-Index/main/assets/',
        'https://cdn.discordapp.com/',
        'https://media.discordapp.net/'
    ];
    var PRESENCE_LABELS = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };
    var PLATFORM_LABELS = { desktop: 'Desktop', mobile: 'Mobile', web: 'Web' };
    var ACTIVITY_LABELS = { playing: 'Playing', streaming: 'Streaming', listening: 'Listening To', watching: 'Watching', competing: 'Competing In', custom: 'Status Message' };

    var state = { linked: false, request: null, remaining: 0, busy: false, tick: null, poll: null };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return RWL.escapeHtml(value);
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function safeImage(url) {
        var value = String(url || '');
        return IMAGE_PREFIXES.some(function (prefix) { return value.indexOf(prefix) === 0; }) && /^[A-Za-z0-9_.\-\/:?=&%]+$/.test(value) ? value : '';
    }

    function formatDate(value) {
        if (!value) return '';
        var date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
    }

    function formatClock(totalSeconds) {
        var seconds = Math.max(0, totalSeconds);
        return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    }

    function setStatus(text, kind) {
        var box = byId('discordLinkStatus');
        if (!box) return;
        box.hidden = !text;
        box.textContent = text ? t(text) : '';
        box.className = 'discord-link-status' + (kind ? ' discord-link-' + kind : '');
    }

    function setButton(label, disabled) {
        var button = byId('discordLinkBtn');
        if (!button) return;
        button.disabled = !!disabled;
        button.textContent = label;
    }

    function stopTimers() {
        if (state.tick) global.clearInterval(state.tick);
        if (state.poll) global.clearInterval(state.poll);
        state.tick = null;
        state.poll = null;
    }

    function paintPending() {
        setButton(t('Resend in') + ' ' + formatClock(state.remaining), true);
    }

    function showExpired() {
        stopTimers();
        setButton(t('Resend'), false);
        setStatus('The request expired. Press Resend to get a new message.', 'warning');
    }

    function startPending(seconds) {
        stopTimers();
        state.remaining = Math.max(0, parseInt(seconds, 10) || 0);
        if (!state.remaining) {
            showExpired();
            return;
        }
        paintPending();
        setStatus('Check your Discord direct messages and press Verify within 5 minutes.', '');
        state.tick = global.setInterval(function () {
            state.remaining -= 1;
            if (state.remaining <= 0) {
                refreshStatus();
                return;
            }
            paintPending();
        }, 1000);
        state.poll = global.setInterval(refreshStatus, POLL_MS);
    }

    function applyStatus(data) {
        state.linked = !!(data && data.linked);
        state.request = data ? data.request : null;
        var section = byId('discordLinkSection');
        var block = byId('discordAccountBlock');
        if (state.linked) {
            stopTimers();
            if (section) section.hidden = true;
            if (block) block.hidden = false;
            return;
        }
        if (section) section.hidden = false;
        if (block) block.hidden = true;
        var request = state.request;
        if (request && request.status === 'pending') {
            startPending(request.resend_in);
        } else if (request && request.status === 'expired') {
            showExpired();
        } else if (request && request.status === 'cancelled') {
            stopTimers();
            setButton(t('Link Account'), false);
            setStatus('The request was cancelled on Discord.', 'warning');
        } else if (request && request.status === 'failed') {
            stopTimers();
            setButton(t('Link Account'), false);
            setStatus('The request could not be completed. Please try again.', 'error');
        } else if (!state.busy) {
            stopTimers();
            setButton(t('Link Account'), false);
        }
    }

    async function refreshStatus() {
        try {
            var wasLinked = state.linked;
            applyStatus(await RWL.apiRequest(STATUS_PATH));
            if (state.linked && !wasLinked) onLinked();
            if (state.linked && !state.profileLoaded) loadProfile();
        } catch (error) {
            return;
        }
    }

    async function onLinked() {
        if (typeof global.showBanner === 'function') global.showBanner(t('Your Discord account is linked.'), 'success');
        if (typeof global.refreshUserData === 'function') {
            try { await global.refreshUserData(); } catch (error) { return; }
        }
    }

    async function submit() {
        var input = byId('discordLinkId');
        if (!input || state.busy) return;
        input.classList.remove('invalid');
        state.busy = true;
        setButton(t('Sending...'), true);
        setStatus('', '');
        try {
            var result = await RWL.apiRequest(LINK_PATH, { method: 'POST', body: { discord_user_id: input.value.trim() } });
            state.busy = false;
            applyStatus({ linked: false, request: result.request });
        } catch (error) {
            state.busy = false;
            input.classList.add('invalid');
            setButton(t('Link Account'), false);
            setStatus(error.message || 'The request could not be sent.', 'error');
            if (error.status === 429) refreshStatus();
        }
    }

    function detail(label, value, extraClass) {
        if (value === null || value === undefined || value === '') return '';
        return '<div class="dc-detail' + (extraClass ? ' ' + extraClass : '') + '"><dt>' + esc(t(label)) + '</dt><dd>' + value + '</dd></div>';
    }

    function textValue(value) {
        return '<span translate="no">' + esc(value) + '</span>';
    }

    function renderBadges(badges) {
        if (!badges || !badges.length) return '<div class="dc-empty-badges">' + esc(t('No badges found on this account.')) + '</div>';
        return '<div class="dc-badges">' + badges.map(function (badge) {
            var icon = safeImage(badge.icon_url);
            if (!icon) return '';
            var title = String(badge.title || '') + (badge.description ? ' - ' + badge.description : '');
            return '<img class="dc-badge' + (badge.source === 'detected' ? ' dc-badge-detected' : '') + '" src="' + esc(icon) + '" alt="' + esc(badge.title || '') + '" title="' + esc(title) + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">';
        }).join('') + '</div>';
    }

    function renderRoles(roles) {
        if (!roles || !roles.length) return '';
        return '<div class="dc-roles">' + roles.map(function (role) {
            var color = HEX_PATTERN.test(String(role.color || '')) ? role.color : '';
            return '<span class="dc-role" translate="no"><span class="dc-role-dot"' + (color ? ' style="--rwl-keep:1;--dc-role-color:' + color + '"' : '') + '></span>' + esc(role.name) + '</span>';
        }).join('') + '</div>';
    }

    function renderProfile(profile) {
        var card = byId('discordAccountCard');
        if (!card) return;
        if (!profile || !profile.available) {
            card.innerHTML = '<div class="dc-card"><div class="dc-banner"></div><dl class="dc-details">' +
                detail('Display name', textValue((profile && profile.display_name) || '-')) +
                detail('Username', textValue((profile && profile.username) || '-')) +
                detail('User ID', textValue((profile && profile.id) || '-')) +
                '</dl><p class="dc-notice">' + esc(t('Live Discord details are unavailable right now. They appear again as soon as the bot is back.')) + '</p></div>';
            return;
        }
        var accent = HEX_PATTERN.test(String(profile.accent_color || '')) ? profile.accent_color : '';
        var banner = profile.banner ? safeImage(profile.banner.url) : '';
        var avatar = profile.avatar ? safeImage(profile.avatar.url) : '';
        var decoration = profile.avatar_decoration ? safeImage(profile.avatar_decoration.url) : '';
        var tag = profile.server_tag && profile.server_tag.tag ? '<span class="dc-tag" translate="no">' + (safeImage(profile.server_tag.badge_url) ? '<img src="' + esc(safeImage(profile.server_tag.badge_url)) + '" alt="">' : '') + esc(profile.server_tag.tag) + '</span>' : '';
        var member = profile.member || {};
        var rows = '';
        rows += detail('Display name', textValue(profile.display_name));
        rows += detail('Username', textValue(profile.username));
        rows += detail('User ID', textValue(profile.id));
        rows += detail('Account created', esc(formatDate(profile.created_at)));
        rows += detail('Accent color', accent ? '<span class="dc-swatch" style="--rwl-keep:1;--dc-accent:' + accent + '"></span>' + textValue(accent) : '');
        if (member.in_server) {
            rows += detail('Server nickname', member.nickname ? textValue(member.nickname) : '');
            rows += detail('Joined the server', esc(formatDate(member.joined_at)));
            rows += detail('Boosting since', esc(formatDate(member.boosting_since)));
            rows += detail('Status', esc(t(PRESENCE_LABELS[member.status] || PRESENCE_LABELS.offline)));
            rows += detail('Platforms', (member.platforms || []).length ? esc(member.platforms.map(function (name) { return t(PLATFORM_LABELS[name] || name); }).join(', ')) : '');
            rows += detail('Activity', (member.activities || []).length ? member.activities.map(function (activity) { return esc(t(ACTIVITY_LABELS[activity.type] || activity.type)) + ' ' + textValue(activity.name); }).join(', ') : '');
            rows += detail('Timed out until', esc(formatDate(member.timed_out_until)));
            rows += detail('Roles', renderRoles(member.roles), 'dc-wide');
        } else {
            rows += detail('Server', esc(t('Not a member of the Rickware - Labs© Discord server.')), 'dc-wide');
        }
        card.innerHTML = '<div class="dc-card">' +
            '<div class="dc-banner' + (banner ? '' : (accent ? ' dc-banner-accent' : '')) + '"' + (!banner && accent ? ' style="--rwl-keep:1;--dc-accent:' + accent + '"' : '') + '>' + (banner ? '<img class="dc-banner-image" src="' + esc(banner) + '" alt="" decoding="async">' : '') + '</div>' +
            '<div class="dc-head"><div class="dc-avatar-wrap">' + (avatar ? '<img class="dc-avatar" src="' + esc(avatar) + '" alt="" decoding="async">' : '<div class="dc-avatar"></div>') + (decoration ? '<img class="dc-decoration" src="' + esc(decoration) + '" alt="" decoding="async">' : '') + '</div>' +
            '<div class="dc-names"><strong class="dc-display" translate="no">' + esc(profile.display_name) + '</strong><span class="dc-username" translate="no">@' + esc(profile.username) + '</span>' + tag + '</div></div>' +
            renderBadges(profile.badges) +
            '<dl class="dc-details">' + rows + '</dl></div>';
    }

    async function loadProfile() {
        state.profileLoaded = true;
        try {
            renderProfile(await RWL.apiRequest(PROFILE_PATH));
        } catch (error) {
            state.profileLoaded = false;
        }
    }

    function bind() {
        var input = byId('discordLinkId');
        var button = byId('discordLinkBtn');
        if (!input || !button) return;
        input.addEventListener('input', function () {
            input.value = input.value.replace(/\D+/g, '').slice(0, 22);
            input.classList.remove('invalid');
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !button.disabled) {
                event.preventDefault();
                submit();
            }
        });
        button.addEventListener('click', submit);
    }

    document.addEventListener('DOMContentLoaded', function () {
        bind();
        refreshStatus();
    });
})(window);
