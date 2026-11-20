(function (global) {
    if (global.Labcord || !global.RWL) return;
    global.RWL_SURFACE = 'labcord';

    var esc = RWL.escapeHtml;
    var HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
    var USERNAME_PATTERN = /^[A-Za-z0-9_.\-]{3,32}$/;
    var CHANNEL_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
    var SERVER_NAME_PATTERN = /^.{2,60}$/;
    var IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    var REFRESH_MS = 20000;
    var SLOWMODE_STEPS = [0, 5, 10, 30, 60, 300, 900, 3600, 21600];
    var COSMETIC_PARTS = [['avatar_decoration', 'Avatar Decoration'], ['nameplate', 'Nameplate'], ['name_color', 'Name Colour']];
    var ICONS = {
        hash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
        lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
        gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg>',
        chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
        plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        up: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>',
        down: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
    };
    var state = { boot: null, servers: [], server: null, serverId: null, channelId: 'general', view: 'home', homeTab: 'online', friends: null, notifications: null, collapsed: {}, membersOpen: true, settingsTab: 'overview', roleId: null, channelEditId: null, cosmetics: null, cosmeticPart: 'avatar_decoration', cosmeticQuery: '', userTab: 'appearance', typingData: null, busy: false, timer: null };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function api(path, options) {
        return RWL.apiRequest('/api/labcord' + path, options);
    }

    function socialApi(path, options) {
        return RWL.apiRequest('/api/social' + path, options);
    }

    function social() {
        return global.RWLSocial || null;
    }

    function groups() {
        return global.RWLGroups || null;
    }

    function toast(message, type) {
        var box = byId('lcToast');
        if (!box) return;
        box.textContent = message;
        box.className = 'lc-toast' + (type === 'error' ? ' lc-toast-error' : '');
        box.hidden = false;
        clearTimeout(box.hideTimer);
        box.hideTimer = setTimeout(function () { box.hidden = true; }, 4200);
    }

    function failure(error, fallback) {
        if (error && error.status === 401) {
            requireLogin();
            return;
        }
        toast((error && error.message) || fallback, 'error');
    }

    function requireLogin() {
        global.location.replace('./login_register.html?tab=login');
    }

    function confirmDialog(title, message, danger) {
        if (social() && social().confirmDialog) return social().confirmDialog(title, message, danger);
        return Promise.resolve(global.confirm(message));
    }

    function pictureUrl(path) {
        if (!path) return '';
        return /^https?:\/\//.test(path) ? path : RWL.apiUrl(path);
    }

    function initials(name) {
        return String(name || '?').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 3).toUpperCase() || '?';
    }

    function avatar(user, className) {
        if (social() && social().avatarHtml) return social().avatarHtml(user, className || 'lc-avatar-img', true, true);
        return '<span class="lc-avatar-fallback">' + esc(initials(user && user.username)) + '</span>';
    }

    function nameStyle(user) {
        return social() && social().nameStyle ? social().nameStyle(user) : '';
    }

    function markInvalid(input) {
        if (!input) return;
        input.classList.add('lc-invalid');
        input.focus();
        input.addEventListener('input', function clear() {
            input.classList.remove('lc-invalid');
            input.removeEventListener('input', clear);
        });
    }

    function has(permission) {
        return !!(state.server && state.server.permissions.indexOf(permission) >= 0);
    }

    function setHash() {
        var hash = state.view === 'server' && state.serverId ? '#server/' + state.serverId + '/' + state.channelId : '#home';
        try { global.history.replaceState(null, '', hash); } catch (error) {}
    }

    function chatDock() {
        var dock = byId('lcChatDock');
        var chat = social() && social().chatElement ? social().chatElement() : null;
        if (chat && chat.parentNode !== dock) dock.appendChild(chat);
        return chat;
    }

    function syncDock() {
        var chat = chatDock();
        var open = !!chat && !chat.hidden;
        byId('lcChatDock').classList.toggle('active', open);
        byId('lcView').hidden = open;
    }

    function closeChat() {
        if (groups() && groups().detach) groups().detach();
        if (social() && social().closeChat) social().closeChat();
        syncDock();
    }

    function serverIcon(server, className) {
        var picture = pictureUrl(server.icon_url);
        return picture ? '<img class="' + className + '" src="' + esc(picture) + '" alt="" decoding="async" loading="lazy">' : '<span class="' + className + ' lc-icon-fallback" translate="no">' + esc(initials(server.name)) + '</span>';
    }

    function renderRail() {
        byId('lcHome').classList.toggle('active', state.view === 'home');
        byId('lcServers').innerHTML = state.servers.map(function (server) {
            return '<button type="button" class="lc-rail-btn lc-rail-server' + (state.view === 'server' && state.serverId === server.group_id ? ' active' : '') + '" data-server="' + esc(server.group_id) + '" data-drag-kind="server" data-drag-id="' + esc(server.group_id) + '" data-drag-handle="1" title="' + esc(server.name) + '">' + serverIcon(server, 'lc-rail-icon') + (server.unread ? '<span class="lc-rail-badge">' + (server.unread > 99 ? '99+' : server.unread) + '</span>' : '') + '</button>';
        }).join('');
        var counts = (state.notifications && state.notifications.counts) || {};
        var total = (counts.unread || 0) + (counts.friend_requests || 0) + (counts.message_requests || 0);
        var badge = byId('lcHomeBadge');
        badge.hidden = !total;
        badge.textContent = total > 99 ? '99+' : String(total);
    }

    function renderUser() {
        var identity = state.boot && state.boot.identity;
        if (!identity) return;
        var presence = global.RWLPresence ? global.RWLPresence.current().selected : 'online';
        var presenceDot = global.RWLPresence ? global.RWLPresence.dotHtml(presence) : '';
        var plate = social() && social().plateVideo ? social().plateVideo(identity, 'lc-plate-bg') : '';
        byId('lcUser').innerHTML = plate + '<button type="button" class="lc-user-main" data-user-action="profile" title="' + esc(t('Open your profile')) + '"><span class="lc-user-avatar">' + avatar(Object.assign({}, identity, { presence_status: presence }), 'lc-avatar-img') + '</span><span class="lc-user-text"><strong translate="no" style="' + esc(nameStyle(identity)) + '">' + esc(identity.username) + '</strong><small>' + esc(identity.account_type || 'User') + '</small></span></button>' +
            '<button type="button" class="lc-status-btn" data-user-action="status" title="' + esc(t('Change your status')) + '" data-presence-trigger="1">' + presenceDot + '</button>' +
            '<button type="button" class="lc-icon-btn" data-user-action="settings" title="' + esc(t('User Settings')) + '">' + ICONS.gear + '</button>';
        if (plate && social().observeCard) social().observeCard(byId('lcUser'));
    }

    function renderHomeSide() {
        var channels = (state.notifications && state.notifications.channels) || [];
        byId('lcSideHead').innerHTML = '<span class="lc-side-title">' + esc(t('Direct Messages')) + '</span>';
        byId('lcSideBody').innerHTML = '<button type="button" class="lc-side-row lc-side-friends' + (!chatOpen() ? ' active' : '') + '" data-home="friends" title="' + esc(t('Friends')) + '">' + ICONS.users + '<span>' + esc(t('Friends')) + '</span></button>' +
            '<div class="lc-side-label">' + esc(t('Direct Messages')) + '</div>' +
            (channels.length ? channels.map(function (row) {
                var rowPlate = social() && social().plateVideo ? social().plateVideo(row.partner, 'lc-plate-bg') : '';
                var rowBadges = social() && social().badgesHtml ? social().badgesHtml(row.partner) : '';
                var rowPet = social() && social().petHtml ? social().petHtml(row.partner, 16, false, false) : '';
                return '<button type="button" class="lc-side-row lc-dm-row" data-dm="' + esc(row.channel_id) + '" title="' + esc(row.partner.username) + '">' + rowPlate + '<span class="lc-dm-avatar">' + avatar(row.partner, 'lc-avatar-img') + '</span><span class="lc-dm-text"><span class="lc-dm-nameline"><span class="lc-dm-name" translate="no" style="' + esc(nameStyle(row.partner)) + '">' + esc(row.partner.username) + '</span>' + rowPet + '</span>' + rowBadges + '</span>' + (row.unread ? '<span class="lc-pill">' + (row.unread > 99 ? '99+' : row.unread) + '</span>' : '') + '</button>';
            }).join('') : '<div class="lc-empty">' + esc(t('No direct messages yet.')) + '</div>');
        if (social() && social().observeCard) social().observeCard(byId('lcSideBody'));
    }

    function chatOpen() {
        var chat = social() && social().chatElement ? social().chatElement() : null;
        return !!chat && !chat.hidden;
    }

    function friendRow(user, sub, actions) {
        return '<div class="lc-friend" data-username="' + esc(user.username) + '"><span class="lc-friend-avatar">' + avatar(user, 'lc-avatar-img') + '</span><span class="lc-friend-text"><strong translate="no" style="' + esc(nameStyle(user)) + '">' + esc(user.username) + '</strong><small>' + sub + '</small></span><span class="lc-friend-actions">' + actions + '</span></div>';
    }

    function actionButton(action, label, extra) {
        return '<button type="button" class="lc-btn lc-btn-small' + (extra ? ' ' + extra : '') + '" data-friend-action="' + action + '" title="' + esc(label) + '">' + esc(label) + '</button>';
    }

    function renderHomeView() {
        var view = byId('lcView');
        var friends = (state.friends && state.friends.friends) || [];
        var data = state.notifications || { friend_requests: [], outgoing_requests: [], message_requests: [] };
        var tabs = [['online', 'Online'], ['all', 'All'], ['pending', 'Pending'], ['add', 'Add Friend']];
        var pending = (data.friend_requests || []).length + (data.message_requests || []).length;
        var body = '';
        if (state.homeTab === 'add') {
            body = '<form class="lc-add-friend" id="lcAddFriend" autocomplete="off"><h3>' + esc(t('Add Friend')) + '</h3><p>' + esc(t('You can add friends with their Rickware - Labs username.')) + '</p><div class="lc-add-row"><input type="text" class="lc-input" id="lcFriendName" maxlength="32" placeholder="' + esc(t('Enter a username')) + '" spellcheck="false"><button type="submit" class="lc-btn lc-btn-primary" title="' + esc(t('Send a friend request')) + '">' + esc(t('Send Friend Request')) + '</button></div></form>';
        } else if (state.homeTab === 'pending') {
            body = (data.friend_requests || []).map(function (user) { return friendRow(user, esc(t('Incoming friend request')), actionButton('accept', t('Accept'), 'lc-btn-success') + actionButton('decline', t('Decline'), 'lc-btn-danger')); }).join('') +
                (data.outgoing_requests || []).map(function (user) { return friendRow(user, esc(t('Outgoing friend request')), actionButton('cancel', t('Cancel'), 'lc-btn-danger')); }).join('') +
                (data.message_requests || []).map(function (channel) { return '<div class="lc-friend" data-channel="' + esc(channel.channel_id) + '"><span class="lc-friend-avatar">' + avatar(channel.partner, 'lc-avatar-img') + '</span><span class="lc-friend-text"><strong translate="no">' + esc(channel.partner.username) + '</strong><small>' + esc(t('Wants to send you messages')) + '</small></span><span class="lc-friend-actions"><button type="button" class="lc-btn lc-btn-small" data-dm="' + esc(channel.channel_id) + '" title="' + esc(t('Open the conversation')) + '">' + esc(t('Open')) + '</button></span></div>'; }).join('');
            if (!body) body = '<div class="lc-empty lc-empty-big">' + esc(t('There are no pending requests.')) + '</div>';
        } else {
            var visible = state.homeTab === 'online' ? friends.filter(function (user) { return user.online; }) : friends;
            body = '<div class="lc-list-label">' + esc(state.homeTab === 'online' ? t('Online') : t('All Friends')) + ' — ' + visible.length + '</div>' +
                (visible.length ? visible.map(function (user) { return friendRow(user, esc(user.online ? t('Online') : t('Offline')), actionButton('message', t('Message'), '') + actionButton('profile', t('Profile'), '') + actionButton('remove', t('Remove'), 'lc-btn-danger')); }).join('') : '<div class="lc-empty lc-empty-big">' + esc(state.homeTab === 'online' ? t('Nobody is online right now.') : t('You have no friends yet. Add one with the Add Friend tab.')) + '</div>');
        }
        view.innerHTML = '<header class="lc-view-head">' + ICONS.users + '<strong>' + esc(t('Friends')) + '</strong><span class="lc-head-line"></span><div class="lc-tabs">' + tabs.map(function (tab) {
            return '<button type="button" class="lc-tab' + (state.homeTab === tab[0] ? ' active' : '') + (tab[0] === 'add' ? ' lc-tab-add' : '') + '" data-home-tab="' + tab[0] + '" title="' + esc(t(tab[1])) + '">' + esc(t(tab[1])) + (tab[0] === 'pending' && pending ? '<span class="lc-pill">' + pending + '</span>' : '') + '</button>';
        }).join('') + '</div></header><div class="lc-view-body">' + body + '</div>';
        var form = byId('lcAddFriend');
        if (form) form.addEventListener('submit', addFriend);
    }

    async function addFriend(event) {
        event.preventDefault();
        var input = byId('lcFriendName');
        var username = input.value.trim().replace(/^@/, '');
        if (!USERNAME_PATTERN.test(username)) {
            markInvalid(input);
            return;
        }
        try {
            await socialApi('/friends/request', { method: 'POST', body: { username: username } });
            input.value = '';
            toast(t('Friend request sent.'));
            await loadHomeData();
            renderHome();
        } catch (error) {
            markInvalid(input);
            failure(error, t('The friend request could not be sent.'));
        }
    }

    async function loadHomeData() {
        var results = await Promise.all([socialApi('/notifications').catch(function () { return null; }), socialApi('/friends').catch(function () { return null; })]);
        if (results[0]) state.notifications = results[0];
        if (results[1]) state.friends = results[1];
    }

    function renderHome() {
        renderRail();
        renderHomeSide();
        if (!chatOpen()) renderHomeView();
        byId('lcMembers').innerHTML = '';
        byId('lcApp').classList.remove('lc-with-members');
        syncDock();
    }

    function showHome() {
        state.view = 'home';
        state.serverId = null;
        state.server = null;
        closeChat();
        setHash();
        renderHome();
        loadHomeData().then(function () { if (state.view === 'home') renderHome(); });
    }

    async function openDm(channelId) {
        if (!social()) return;
        state.view = 'home';
        state.serverId = null;
        state.server = null;
        renderRail();
        chatDock();
        try {
            await social().openChat(channelId);
        } catch (error) {
            failure(error, t('The conversation could not be opened.'));
        }
        syncDock();
        renderHomeSide();
    }

    function channelRow(channel) {
        var manage = has('manage_channels');
        return '<div class="lc-channel' + (channel.id === state.channelId ? ' active' : '') + '" data-channel="' + esc(channel.id) + '"' + (manage ? ' data-drag-kind="channel" data-drag-id="' + esc(channel.id) + '"' : '') + ' role="button" tabindex="0" title="' + esc(channel.topic || '#' + channel.name) + '">' + ICONS.hash + '<span class="lc-channel-name" translate="no">' + esc(channel.name) + '</span>' + ((channel.view_roles || []).length ? '<span class="lc-channel-flag" title="' + esc(t('Private channel')) + '">' + ICONS.lock + '</span>' : '') +
            (manage ? '<button type="button" class="lc-icon-btn lc-channel-edit" data-channel-edit="' + esc(channel.id) + '" title="' + esc(t('Edit Channel')) + '">' + ICONS.gear + '</button>' : '') + '</div>';
    }

    function renderServerSide() {
        var server = state.server;
        if (!server) return;
        var manage = has('manage_channels');
        byId('lcSideHead').innerHTML = '<button type="button" class="lc-server-menu-btn" id="lcServerMenuBtn" title="' + esc(t('Server Menu')) + '"><span class="lc-side-title" translate="no">' + esc(server.name) + '</span>' + ICONS.chevron + '</button><div class="lc-menu" id="lcServerMenu" hidden></div>';
        var html = (server.channels || []).filter(function (channel) { return !channel.category_id; }).map(channelRow).join('');
        (server.categories || []).forEach(function (category) {
            var channels = server.channels.filter(function (channel) { return channel.category_id === category.id; });
            if (!channels.length && !manage) return;
            var collapsed = !!state.collapsed[server.group_id + ':' + category.id];
            html += '<div class="lc-category' + (collapsed ? ' collapsed' : '') + '"' + (manage ? ' data-drag-kind="category" data-drag-id="' + esc(category.id) + '"' : '') + '><button type="button" class="lc-category-head" data-drag-handle="1" data-category="' + esc(category.id) + '" title="' + esc(t('Show or hide this category')) + '">' + ICONS.chevron + '<span translate="no">' + esc(category.name) + '</span></button>' + (manage ? '<button type="button" class="lc-icon-btn" data-channel-new="' + esc(category.id) + '" title="' + esc(t('Create Channel')) + '">' + ICONS.plus + '</button>' : '') + '</div>';
            if (!collapsed) html += channels.map(channelRow).join('');
            else html += channels.filter(function (channel) { return channel.id === state.channelId; }).map(channelRow).join('');
        });
        byId('lcSideBody').innerHTML = html || '<div class="lc-empty">' + esc(t('There are no channels you can see.')) + '</div>';
    }

    function serverMenuHtml() {
        var items = [];
        if (has('create_invites')) items.push(['invite', 'Invite People']);
        if (has('manage_server') || has('manage_roles') || has('manage_channels')) items.push(['settings', 'Server Settings']);
        if (has('manage_channels')) items.push(['channel', 'Create Channel'], ['category', 'Create Category']);
        items.push(['nickname', 'Change Nickname'], ['members', 'Show Members']);
        if (!state.server.is_owner) items.push(['leave', 'Leave Server']);
        return items.map(function (item) {
            return '<button type="button" class="lc-menu-item' + (item[0] === 'leave' ? ' lc-menu-danger' : '') + '" data-server-menu="' + item[0] + '" title="' + esc(t(item[1])) + '">' + esc(t(item[1])) + '</button>';
        }).join('');
    }

    function hoistedRole(member) {
        var roles = (state.server.roles || []);
        for (var index = 0; index < roles.length; index++) if (roles[index].hoist && member.roles.indexOf(roles[index].id) >= 0) return roles[index];
        return null;
    }

    function memberRow(member) {
        var style = member.role_style ? RWL.nameColorStyle(member.role_style, '#e0aaff') : nameStyle(member);
        return '<button type="button" class="lc-member' + (member.online ? '' : ' offline') + '" data-member="' + esc(member.username) + '" title="' + esc(member.username) + '"><span class="lc-member-avatar">' + avatar(member, 'lc-avatar-img') + '</span><span class="lc-member-text"><strong translate="no" style="' + esc(style) + '">' + esc(member.nickname || member.username) + '</strong>' + (member.owner ? '<small class="lc-owner-tag" title="' + esc(t('Server Owner')) + '">👑</small>' : '') + '</span></button>';
    }

    function renderMembers() {
        var box = byId('lcMembers');
        var server = state.server;
        byId('lcApp').classList.toggle('lc-with-members', !!server && state.membersOpen);
        if (!server || !state.membersOpen) {
            box.innerHTML = '';
            return;
        }
        var sections = [];
        (server.roles || []).filter(function (role) { return role.hoist; }).forEach(function (role) {
            var rows = server.members.filter(function (member) { return member.online && hoistedRole(member) === role; });
            if (rows.length) sections.push([role.name, rows, role.style]);
        });
        var online = server.members.filter(function (member) { return member.online && !hoistedRole(member); });
        var offline = server.members.filter(function (member) { return !member.online; });
        if (online.length) sections.push([t('Online'), online]);
        if (offline.length) sections.push([t('Offline'), offline]);
        box.innerHTML = sections.map(function (section) {
            return '<div class="lc-list-label"><span translate="no"' + (section[2] ? ' style="' + esc(RWL.nameColorStyle(section[2], '#e0aaff')) + '"' : '') + '>' + esc(section[0]) + '</span> — ' + section[1].length + '</div>' + section[1].map(memberRow).join('');
        }).join('');
    }

    async function loadServer(groupId) {
        state.server = await api('/servers/' + encodeURIComponent(groupId));
        return state.server;
    }

    async function openServer(groupId, channelId) {
        state.view = 'server';
        state.serverId = groupId;
        renderRail();
        try {
            await loadServer(groupId);
        } catch (error) {
            failure(error, t('The server could not be loaded.'));
            return showHome();
        }
        if (state.serverId !== groupId) return;
        var channels = state.server.channels || [];
        var wanted = channels.filter(function (channel) { return channel.id === channelId; })[0] || channels.filter(function (channel) { return channel.id === 'general'; })[0] || channels[0];
        state.channelId = wanted ? wanted.id : 'general';
        renderServerSide();
        renderMembers();
        setHash();
        await openChannel(state.channelId);
    }

    async function openChannel(channelId) {
        state.channelId = channelId;
        renderServerSide();
        setHash();
        chatDock();
        if (!groups()) return;
        try {
            await groups().open(state.serverId, channelId);
        } catch (error) {
            failure(error, t('The channel could not be opened.'));
        }
        syncDock();
        byId('lcApp').classList.remove('lc-side-open');
    }

    async function refreshServer(keepChat) {
        if (state.view !== 'server' || !state.serverId) return;
        var groupId = state.serverId;
        try {
            await loadServer(groupId);
        } catch (error) {
            if (error && (error.status === 403 || error.status === 404)) {
                await loadServers();
                showHome();
            }
            return;
        }
        if (state.serverId !== groupId) return;
        var still = state.server.channels.some(function (channel) { return channel.id === state.channelId; });
        renderServerSide();
        renderMembers();
        if (!still) openChannel('general');
        else if (!keepChat && byId('lcModalLayer').hidden === false && state.modal === 'settings') renderSettings();
    }

    async function loadServers() {
        try {
            var data = await api('/servers');
            state.servers = data.servers || [];
        } catch (error) {
            if (error && error.status === 401) requireLogin();
        }
        renderRail();
    }

    function openModal(html, kind, wide) {
        var layer = byId('lcModalLayer');
        state.modal = kind || 'dialog';
        layer.innerHTML = '<div class="lc-modal' + (wide ? ' lc-modal-wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
        layer.hidden = false;
        var first = layer.querySelector('input:not([type="hidden"]):not([type="file"]), textarea, select');
        if (first) first.focus();
    }

    function closeModal() {
        var layer = byId('lcModalLayer');
        layer.hidden = true;
        layer.innerHTML = '';
        state.modal = null;
    }

    function formModal(options) {
        return new Promise(function (resolve) {
            openModal('<form class="lc-form" id="lcForm" autocomplete="off"><h2>' + esc(options.title) + '</h2>' + (options.text ? '<p class="lc-note">' + esc(options.text) + '</p>' : '') + options.fields + '<div class="lc-form-error" id="lcFormError"></div><div class="lc-modal-actions"><button type="button" class="lc-btn" data-modal-close title="' + esc(t('Cancel')) + '">' + esc(t('Cancel')) + '</button><button type="submit" class="lc-btn lc-btn-primary" title="' + esc(options.confirm) + '">' + esc(options.confirm) + '</button></div></form>', 'form');
            var form = byId('lcForm');
            var finished = false;
            function finish(value) {
                if (finished) return;
                finished = true;
                resolve(value);
            }
            state.modalCancel = function () { finish(null); };
            form.addEventListener('submit', async function (event) {
                event.preventDefault();
                var values = options.read(form);
                if (!values) return;
                var submit = form.querySelector('button[type="submit"]');
                submit.disabled = true;
                try {
                    var result = await options.submit(values);
                    closeModal();
                    finish(result === undefined ? true : result);
                } catch (error) {
                    submit.disabled = false;
                    if (error && error.status === 401) return requireLogin();
                    byId('lcFormError').textContent = (error && error.message) || t('This did not work. Please try again.');
                }
            });
        });
    }

    function textField(label, name, value, maxLength, placeholder) {
        return '<label class="lc-field"><span>' + esc(label) + '</span><input type="text" class="lc-input" name="' + name + '" maxlength="' + maxLength + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '"></label>';
    }

    function addServerDialog() {
        openModal('<div class="lc-form"><h2>' + esc(t('Add A Server')) + '</h2><p class="lc-note">' + esc(t('A server is where you and your friends hang out. Create your own or join one with an invite code.')) + '</p><div class="lc-choice"><button type="button" class="lc-btn lc-btn-primary lc-btn-big" data-add="create" title="' + esc(t('Create My Own')) + '">' + esc(t('Create My Own')) + '</button><button type="button" class="lc-btn lc-btn-big" data-add="join" title="' + esc(t('Join With An Invite Code')) + '">' + esc(t('Join With An Invite Code')) + '</button></div><div class="lc-modal-actions"><button type="button" class="lc-btn" data-modal-close title="' + esc(t('Close')) + '">' + esc(t('Close')) + '</button></div></div>', 'add');
    }

    async function createOrJoin(kind) {
        closeModal();
        if (!groups() || !social()) return;
        chatDock();
        var before = state.servers.map(function (server) { return server.group_id; });
        try {
            if (kind === 'create') await groups().create();
            else await groups().join();
        } catch (error) {
            failure(error, t('This did not work. Please try again.'));
        }
        await loadServers();
        var added = state.servers.filter(function (server) { return before.indexOf(server.group_id) < 0; })[0];
        if (added) openServer(added.group_id, 'general');
        else syncDock();
    }

    function channelDialog(channelId, categoryId) {
        var server = state.server;
        var channel = channelId ? server.channels.filter(function (entry) { return entry.id === channelId; })[0] : null;
        var roleBoxes = function (name, selected) {
            if (!server.roles.length) return '<p class="lc-note">' + esc(t('Create roles first to limit this channel.')) + '</p>';
            return '<div class="lc-checks">' + server.roles.map(function (role) { return '<label class="lc-check"><input type="checkbox" name="' + name + '" value="' + esc(role.id) + '"' + (selected.indexOf(role.id) >= 0 ? ' checked' : '') + '><span translate="no" style="--rwl-keep:1;color:' + RWL.sanitizeHex(role.color, '#e0aaff') + '">' + esc(role.name) + '</span></label>'; }).join('') + '</div>';
        };
        var fields = textField(t('Channel Name'), 'name', channel ? channel.name : '', 32, 'new-channel') + textField(t('Topic'), 'topic', channel ? channel.topic : '', 200, t('What is this channel about?')) +
            '<label class="lc-field"><span>' + esc(t('Category')) + '</span><select class="lc-select" name="category_id"><option value="">' + esc(t('No Category')) + '</option>' + server.categories.map(function (category) { return '<option value="' + esc(category.id) + '"' + ((channel ? channel.category_id : categoryId) === category.id ? ' selected' : '') + '>' + esc(category.name) + '</option>'; }).join('') + '</select></label>' +
            '<label class="lc-field"><span>' + esc(t('Slow Mode')) + '</span><select class="lc-select" name="slowmode">' + SLOWMODE_STEPS.map(function (seconds) { return '<option value="' + seconds + '"' + ((channel ? channel.slowmode : 0) === seconds ? ' selected' : '') + '>' + (seconds ? (seconds >= 3600 ? seconds / 3600 + ' h' : (seconds >= 60 ? seconds / 60 + ' min' : seconds + ' s')) : esc(t('Off'))) + '</option>'; }).join('') + '</select></label>' +
            '<div class="lc-field"><span>' + esc(t('Only these roles can write (empty = everyone)')) + '</span>' + roleBoxes('send_roles', channel ? channel.send_roles : []) + '</div>' +
            (channel && channel.id === 'general' ? '' : '<div class="lc-field"><span>' + esc(t('Only these roles can see the channel (empty = everyone)')) + '</span>' + roleBoxes('view_roles', channel ? channel.view_roles : []) + '</div>') +
            (channel && channel.id !== 'general' ? '<button type="button" class="lc-btn lc-btn-danger" data-channel-delete="' + esc(channel.id) + '" title="' + esc(t('Delete Channel')) + '">' + esc(t('Delete Channel')) + '</button>' : '');
        return formModal({
            title: channel ? t('Edit Channel') : t('Create Channel'),
            fields: fields,
            confirm: channel ? t('Save Changes') : t('Create Channel'),
            read: function (form) {
                var name = form.elements.name.value.trim().toLowerCase().replace(/\s+/g, '-');
                if (!CHANNEL_NAME_PATTERN.test(name)) {
                    markInvalid(form.elements.name);
                    return null;
                }
                var checked = function (field) { return Array.prototype.map.call(form.querySelectorAll('input[name="' + field + '"]:checked'), function (input) { return input.value; }); };
                var values = { name: name, topic: form.elements.topic.value.trim(), category_id: form.elements.category_id.value, slowmode: parseInt(form.elements.slowmode.value, 10) || 0, send_roles: checked('send_roles') };
                if (!channel || channel.id !== 'general') values.view_roles = checked('view_roles');
                if (channel) values.id = channel.id;
                return values;
            },
            submit: function (values) { return api('/servers/' + encodeURIComponent(state.serverId) + '/channels', { method: 'POST', body: values }); }
        }).then(function (result) {
            if (result) refreshServer(true).then(function () { if (!channel && result.channel_id) openChannel(result.channel_id); });
        });
    }

    function categoryDialog(categoryId) {
        var category = categoryId ? state.server.categories.filter(function (entry) { return entry.id === categoryId; })[0] : null;
        return formModal({
            title: category ? t('Rename Category') : t('Create Category'),
            fields: textField(t('Category Name'), 'name', category ? category.name : '', 32, t('New Category')),
            confirm: category ? t('Save Changes') : t('Create Category'),
            read: function (form) {
                var name = form.elements.name.value.trim();
                if (!name) {
                    markInvalid(form.elements.name);
                    return null;
                }
                return category ? { id: category.id, name: name } : { name: name };
            },
            submit: function (values) { return api('/servers/' + encodeURIComponent(state.serverId) + '/categories', { method: 'POST', body: values }); }
        }).then(function (result) { if (result) refreshServer(true); });
    }

    function nicknameDialog(username) {
        var me = state.boot.identity.username;
        var target = username || me;
        var member = state.server.members.filter(function (entry) { return entry.username === target; })[0] || {};
        return formModal({
            title: t('Change Nickname'),
            text: t('The nickname is only shown in this server. Leave it empty to use the username.'),
            fields: textField(t('Nickname'), 'nickname', member.nickname || '', 32, target),
            confirm: t('Save Changes'),
            read: function (form) { return { username: target === me ? null : target, nickname: form.elements.nickname.value.trim() || null }; },
            submit: function (values) { return api('/servers/' + encodeURIComponent(state.serverId) + '/members/nickname', { method: 'POST', body: values }); }
        }).then(function (result) { if (result) refreshServer(true); });
    }

    function settingsTabs() {
        var tabs = [];
        if (has('manage_server')) tabs.push(['overview', 'Overview']);
        if (has('manage_roles')) tabs.push(['roles', 'Roles']);
        if (has('manage_channels')) tabs.push(['channels', 'Channels']);
        if (has('manage_roles') || has('kick_members')) tabs.push(['members', 'Members']);
        return tabs;
    }

    function iconLimitMb() {
        return (state.server && state.server.limits && state.server.limits.icon_mb) || 10;
    }

    function overviewPanel() {
        var server = state.server;
        var open = ['send_messages', 'create_invites', 'mention_everyone'];
        return '<h3>' + esc(t('Server Overview')) + '</h3><div class="lc-overview"><div class="lc-icon-edit">' + serverIcon(server, 'lc-big-icon') + '<div class="lc-icon-buttons"><button type="button" class="lc-btn lc-btn-small" data-icon="upload" title="' + esc(t('Upload a server picture')) + '">' + esc(t('Upload Picture')) + '</button>' + (server.icon_url ? '<button type="button" class="lc-btn lc-btn-small lc-btn-danger" data-icon="remove" title="' + esc(t('Remove the server picture')) + '">' + esc(t('Remove')) + '</button>' : '') + '<input type="file" id="lcIconFile" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/x-icon" hidden><small>' + esc(t('PNG, JPG, GIF, WebP, AVIF, BMP or ICO, up to') + ' ' + iconLimitMb() + ' MB.') + '</small></div></div>' +
            '<form class="lc-form-inline" id="lcOverviewForm" autocomplete="off">' + textField(t('Server Name'), 'name', server.name, 60, '') + '<label class="lc-field"><span>' + esc(t('Description')) + '</span><textarea class="lc-input lc-textarea" name="description" maxlength="200" rows="3" placeholder="' + esc(t('Tell people what this server is about')) + '">' + esc(server.description || '') + '</textarea></label>' +
            (has('manage_roles') ? '<div class="lc-field"><span>' + esc(t('What everyone is allowed to do')) + '</span><div class="lc-checks">' + open.map(function (permission) { return '<label class="lc-check"><input type="checkbox" name="everyone" value="' + permission + '"' + (server.everyone.indexOf(permission) >= 0 ? ' checked' : '') + '><span>' + esc(t(server.permission_labels[permission] || permission)) + '</span></label>'; }).join('') + '</div></div>' : '') +
            '<div class="lc-form-error" id="lcOverviewError"></div><button type="submit" class="lc-btn lc-btn-primary" title="' + esc(t('Save Changes')) + '">' + esc(t('Save Changes')) + '</button></form></div>';
    }

    function rolesPanel() {
        var server = state.server;
        var roles = server.roles || [];
        if (state.roleId && !roles.some(function (role) { return role.id === state.roleId; })) state.roleId = null;
        if (!state.roleId && roles.length) state.roleId = roles[0].id;
        var role = roles.filter(function (entry) { return entry.id === state.roleId; })[0];
        var locked = function (index) { return server.my_position >= 0 && index <= server.my_position; };
        var list = roles.map(function (entry, index) {
            return '<div class="lc-role-row' + (entry.id === state.roleId ? ' active' : '') + '"' + (locked(index) ? '' : ' data-drag-kind="role" data-drag-id="' + esc(entry.id) + '"') + '><button type="button" class="lc-role-pick" data-drag-handle="1" data-role="' + esc(entry.id) + '" title="' + esc(entry.name) + '"><i class="lc-role-dot" style="--rwl-keep:1;background:' + RWL.sanitizeHex(entry.color, '#9d4edd') + '"></i><span translate="no">' + esc(entry.name) + '</span></button><span class="lc-order"><button type="button" class="lc-icon-btn" data-role-move="-1" data-role-id="' + esc(entry.id) + '"' + (index === 0 || locked(index) || locked(index - 1) ? ' disabled' : '') + ' title="' + esc(t('Move up')) + '">' + ICONS.up + '</button><button type="button" class="lc-icon-btn" data-role-move="1" data-role-id="' + esc(entry.id) + '"' + (index === roles.length - 1 || locked(index) ? ' disabled' : '') + ' title="' + esc(t('Move down')) + '">' + ICONS.down + '</button></span></div>';
        }).join('');
        var editor = '<p class="lc-note">' + esc(t('Roles higher in the list outrank the roles below. Members can only manage roles below their own highest role.')) + '</p>';
        if (role) {
            var index = roles.indexOf(role);
            var disabled = locked(index) ? ' disabled' : '';
            editor = '<form class="lc-form-inline" id="lcRoleForm" autocomplete="off">' + (disabled ? '<p class="lc-note">' + esc(t('You cannot edit this role because it is not below your own highest role.')) + '</p>' : '') +
                '<label class="lc-field"><span>' + esc(t('Role Name')) + '</span><input type="text" class="lc-input" name="name" maxlength="32" value="' + esc(role.name) + '"' + disabled + '></label>' +
                '<div class="lc-field lc-color-field"><span>' + esc(t('Role Colour')) + '</span>' + global.LabcordExtras.colorFieldHtml('color', RWL.sanitizeHex(role.color, '#9d4edd'), !!disabled) + '</div>' + global.LabcordExtras.roleStyleFieldsHtml(role, !!disabled) +
                '<label class="lc-check"><input type="checkbox" name="hoist"' + (role.hoist ? ' checked' : '') + disabled + '><span>' + esc(t('Show members with this role separately in the member list')) + '</span></label>' +
                '<div class="lc-field"><span>' + esc(t('Permissions')) + '</span><div class="lc-checks">' + Object.keys(server.permission_labels).map(function (permission) {
                    var mine = server.permissions.indexOf(permission) >= 0;
                    return '<label class="lc-check"><input type="checkbox" name="permissions" value="' + permission + '"' + (role.permissions.indexOf(permission) >= 0 ? ' checked' : '') + (disabled || !mine ? ' disabled' : '') + '><span>' + esc(t(server.permission_labels[permission])) + '</span></label>';
                }).join('') + '</div></div><div class="lc-form-error" id="lcRoleError"></div>' +
                '<div class="lc-modal-actions"><button type="button" class="lc-btn lc-btn-danger" data-role-delete="' + esc(role.id) + '"' + disabled + ' title="' + esc(t('Delete Role')) + '">' + esc(t('Delete Role')) + '</button><button type="submit" class="lc-btn lc-btn-primary"' + disabled + ' title="' + esc(t('Save Changes')) + '">' + esc(t('Save Changes')) + '</button></div></form>';
        }
        return '<h3>' + esc(t('Roles')) + '</h3><div class="lc-split"><div class="lc-split-list"><button type="button" class="lc-btn lc-btn-primary lc-btn-small" data-role-new title="' + esc(t('Create Role')) + '">' + esc(t('Create Role')) + '</button>' + (list || '<div class="lc-empty">' + esc(t('No roles yet.')) + '</div>') + '</div><div class="lc-split-body">' + editor + '</div></div>';
    }

    function layoutOf() {
        var server = state.server;
        return {
            uncategorized: server.channels.filter(function (channel) { return !channel.category_id; }).map(function (channel) { return channel.id; }),
            categories: server.categories.map(function (category) { return { id: category.id, channels: server.channels.filter(function (channel) { return channel.category_id === category.id; }).map(function (channel) { return channel.id; }) }; })
        };
    }

    function channelsPanel() {
        var server = state.server;
        var moveButtons = function (kind, id, first, last) {
            return '<span class="lc-order"><button type="button" class="lc-icon-btn" data-move="' + kind + '" data-id="' + esc(id) + '" data-step="-1"' + (first ? ' disabled' : '') + ' title="' + esc(t('Move up')) + '">' + ICONS.up + '</button><button type="button" class="lc-icon-btn" data-move="' + kind + '" data-id="' + esc(id) + '" data-step="1"' + (last ? ' disabled' : '') + ' title="' + esc(t('Move down')) + '">' + ICONS.down + '</button></span>';
        };
        var rows = function (channels) {
            return channels.map(function (channel, index) {
                return '<div class="lc-manage-row lc-manage-channel" data-drag-kind="channel" data-drag-id="' + esc(channel.id) + '">' + ICONS.hash + '<span translate="no">' + esc(channel.name) + '</span>' + moveButtons('channel', channel.id, index === 0, index === channels.length - 1) + '<button type="button" class="lc-btn lc-btn-small" data-channel-edit="' + esc(channel.id) + '" title="' + esc(t('Edit Channel')) + '">' + esc(t('Edit')) + '</button></div>';
            }).join('');
        };
        var html = rows(server.channels.filter(function (channel) { return !channel.category_id; }));
        server.categories.forEach(function (category, index) {
            html += '<div class="lc-manage-row lc-manage-category" data-drag-kind="category" data-drag-id="' + esc(category.id) + '"><strong translate="no">' + esc(category.name) + '</strong>' + moveButtons('category', category.id, index === 0, index === server.categories.length - 1) + '<button type="button" class="lc-btn lc-btn-small" data-category-edit="' + esc(category.id) + '" title="' + esc(t('Rename Category')) + '">' + esc(t('Rename')) + '</button><button type="button" class="lc-btn lc-btn-small lc-btn-danger" data-category-delete="' + esc(category.id) + '" title="' + esc(t('Delete Category')) + '">' + esc(t('Delete')) + '</button></div>' + rows(server.channels.filter(function (channel) { return channel.category_id === category.id; }));
        });
        return '<h3>' + esc(t('Channels')) + '</h3><div class="lc-modal-actions lc-actions-left"><button type="button" class="lc-btn lc-btn-primary lc-btn-small" data-server-menu="channel" title="' + esc(t('Create Channel')) + '">' + esc(t('Create Channel')) + '</button><button type="button" class="lc-btn lc-btn-small" data-server-menu="category" title="' + esc(t('Create Category')) + '">' + esc(t('Create Category')) + '</button></div><div class="lc-manage-list">' + html + '</div>';
    }

    function membersPanel() {
        var server = state.server;
        var canRoles = has('manage_roles');
        var canKick = has('kick_members');
        return '<h3>' + esc(t('Members')) + ' — ' + server.members.length + '</h3><div class="lc-manage-list">' + server.members.map(function (member) {
            var chips = server.roles.map(function (role, index) {
                var owned = member.roles.indexOf(role.id) >= 0;
                var locked = !canRoles || (server.my_position >= 0 && index <= server.my_position);
                if (!owned && locked) return '';
                return '<button type="button" class="lc-role-chip' + (owned ? ' active' : '') + '" data-member-role="' + esc(role.id) + '" data-member-name="' + esc(member.username) + '"' + (locked ? ' disabled' : '') + ' style="--rwl-keep:1;--lc-role:' + RWL.sanitizeHex(role.color, '#9d4edd') + '" title="' + esc(owned ? t('Remove this role') : t('Give this role')) + '" translate="no">' + esc(role.name) + '</button>';
            }).join('');
            return '<div class="lc-manage-row lc-manage-member"><span class="lc-member-avatar">' + avatar(member, 'lc-avatar-img') + '</span><span class="lc-manage-name"><strong translate="no">' + esc(member.nickname || member.username) + '</strong>' + (member.nickname ? '<small translate="no">' + esc(member.username) + '</small>' : '') + (member.owner ? '<small>' + esc(t('Server Owner')) + '</small>' : '') + '</span><span class="lc-role-chips">' + chips + '</span>' +
                (canRoles ? '<button type="button" class="lc-btn lc-btn-small" data-member-nick="' + esc(member.username) + '" title="' + esc(t('Change Nickname')) + '">' + esc(t('Nickname')) + '</button>' : '') +
                (canKick && !member.owner && member.username !== state.boot.identity.username ? '<button type="button" class="lc-btn lc-btn-small lc-btn-danger" data-member-kick="' + esc(member.username) + '" title="' + esc(t('Remove this member from the server')) + '">' + esc(t('Kick')) + '</button>' : '') + '</div>';
        }).join('') + '</div>';
    }

    function renderSettings() {
        var tabs = settingsTabs();
        if (!tabs.length) return closeModal();
        if (!tabs.some(function (tab) { return tab[0] === state.settingsTab; })) state.settingsTab = tabs[0][0];
        var panels = { overview: overviewPanel, roles: rolesPanel, channels: channelsPanel, members: membersPanel };
        openModal('<div class="lc-settings"><nav class="lc-settings-nav"><div class="lc-list-label" translate="no">' + esc(state.server.name) + '</div>' + tabs.map(function (tab) {
            return '<button type="button" class="lc-settings-tab' + (tab[0] === state.settingsTab ? ' active' : '') + '" data-settings-tab="' + tab[0] + '" title="' + esc(t(tab[1])) + '">' + esc(t(tab[1])) + '</button>';
        }).join('') + (state.server.is_owner ? '<button type="button" class="lc-settings-tab lc-menu-danger" data-server-delete title="' + esc(t('Delete Server')) + '">' + esc(t('Delete Server')) + '</button>' : '') + '</nav><section class="lc-settings-body">' + panels[state.settingsTab]() + '</section><button type="button" class="lc-icon-btn lc-settings-close" data-modal-close title="' + esc(t('Close')) + '">✕</button></div>', 'settings', true);
        bindSettings();
    }

    function bindSettings() {
        var overview = byId('lcOverviewForm');
        if (overview) overview.addEventListener('submit', async function (event) {
            event.preventDefault();
            var name = overview.elements.name.value.trim();
            if (!SERVER_NAME_PATTERN.test(name)) return markInvalid(overview.elements.name);
            var body = { name: name, description: overview.elements.description.value.trim() };
            if (overview.querySelector('input[name="everyone"]')) body.everyone = Array.prototype.map.call(overview.querySelectorAll('input[name="everyone"]:checked'), function (input) { return input.value; });
            try {
                await api('/servers/' + encodeURIComponent(state.serverId), { method: 'PUT', body: body });
                toast(t('The server was updated.'));
                await loadServers();
                await refreshServer(true);
                renderSettings();
            } catch (error) {
                byId('lcOverviewError').textContent = (error && error.message) || t('This did not work. Please try again.');
            }
        });
        var file = byId('lcIconFile');
        if (file) file.addEventListener('change', function () { uploadIcon(file); });
        var role = byId('lcRoleForm');
        if (role) global.LabcordExtras.bindRoleStyle(role, (state.server.roles || []).filter(function (entry) { return entry.id === state.roleId; })[0] || {});
        if (role) role.addEventListener('submit', async function (event) {
            event.preventDefault();
            var name = role.elements.name.value.trim();
            if (!name) return markInvalid(role.elements.name);
            if (!HEX_PATTERN.test(role.elements.color.value)) return markInvalid(role.elements.color);
            var body = { id: state.roleId, name: name, color: role.elements.color.value.toUpperCase(), hoist: role.elements.hoist.checked, permissions: Array.prototype.map.call(role.querySelectorAll('input[name="permissions"]:checked'), function (input) { return input.value; }) };
            Object.assign(body, global.LabcordExtras.readRoleStyle(role));
            try {
                await api('/servers/' + encodeURIComponent(state.serverId) + '/roles', { method: 'POST', body: body });
                toast(t('The role was saved.'));
                await refreshServer(true);
                renderSettings();
            } catch (error) {
                byId('lcRoleError').textContent = (error && error.message) || t('This did not work. Please try again.');
            }
        });
    }

    async function uploadIcon(input) {
        var file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        if (IMAGE_TYPES.indexOf(file.type) < 0 || file.size > ((state.server.limits && state.server.limits.icon_bytes) || 10485760)) {
            toast(t('Choose a PNG, JPG, GIF, WebP, AVIF, BMP or ICO picture up to') + ' ' + iconLimitMb() + ' MB.', 'error');
            return;
        }
        var form = new FormData();
        form.append('file', file);
        var headers = RWL.authHeaders();
        delete headers['Content-Type'];
        try {
            var response = await fetch(RWL.apiUrl('/api/labcord/servers/' + encodeURIComponent(state.serverId) + '/icon'), { method: 'POST', headers: headers, body: form });
            var data = null;
            try { data = await response.json(); } catch (error) { data = null; }
            if (!response.ok) throw new Error(RWL.errorDetail(data, t('The picture could not be uploaded.')));
            toast(t('The server picture was updated.'));
            await loadServers();
            await refreshServer(true);
            renderSettings();
        } catch (error) {
            toast(error.message || t('The picture could not be uploaded.'), 'error');
        }
    }

    async function moveEntry(kind, id, step) {
        var layout = layoutOf();
        var swap = function (list, index) {
            var target = index + step;
            if (index < 0 || target < 0 || target >= list.length) return false;
            var held = list[index];
            list[index] = list[target];
            list[target] = held;
            return true;
        };
        var changed = false;
        if (kind === 'category') changed = swap(layout.categories, layout.categories.map(function (entry) { return entry.id; }).indexOf(id));
        else {
            changed = swap(layout.uncategorized, layout.uncategorized.indexOf(id));
            layout.categories.forEach(function (category) { if (!changed) changed = swap(category.channels, category.channels.indexOf(id)); });
        }
        if (!changed) return;
        try {
            await api('/servers/' + encodeURIComponent(state.serverId) + '/layout', { method: 'POST', body: layout });
            await refreshServer(true);
            renderSettings();
        } catch (error) {
            failure(error, t('The order could not be saved.'));
        }
    }

    async function moveRole(roleId, step) {
        var ids = state.server.roles.map(function (role) { return role.id; });
        var index = ids.indexOf(roleId);
        var target = index + step;
        if (index < 0 || target < 0 || target >= ids.length) return;
        ids[index] = ids[target];
        ids[target] = roleId;
        try {
            await api('/servers/' + encodeURIComponent(state.serverId) + '/roles/order', { method: 'POST', body: { role_ids: ids } });
            await refreshServer(true);
            renderSettings();
        } catch (error) {
            failure(error, t('The order could not be saved.'));
        }
    }

    async function toggleMemberRole(username, roleId) {
        var member = state.server.members.filter(function (entry) { return entry.username === username; })[0];
        if (!member) return;
        var roles = member.roles.indexOf(roleId) >= 0 ? member.roles.filter(function (entry) { return entry !== roleId; }) : member.roles.concat(roleId);
        try {
            await api('/servers/' + encodeURIComponent(state.serverId) + '/members/roles', { method: 'POST', body: { username: username, role_ids: roles } });
            await refreshServer(true);
            renderSettings();
        } catch (error) {
            failure(error, t('The roles could not be changed.'));
        }
    }

    async function kickMember(username) {
        if (!(await confirmDialog(t('Remove Member'), t('Remove this member from the server? The server key is renewed.'), true))) return;
        try {
            await socialApi('/groups/' + encodeURIComponent(state.serverId) + '/kick', { method: 'POST', body: { username: username } });
            await refreshServer(true);
            if (state.modal === 'settings') renderSettings();
        } catch (error) {
            failure(error, t('The member could not be removed.'));
        }
    }

    async function leaveServer() {
        if (!(await confirmDialog(t('Leave Server'), t('Leave this server?'), true))) return;
        try {
            await socialApi('/groups/' + encodeURIComponent(state.serverId) + '/leave', { method: 'POST' });
            await loadServers();
            showHome();
        } catch (error) {
            failure(error, t('You could not leave the server.'));
        }
    }

    async function deleteServer() {
        if (!(await confirmDialog(t('Delete Server'), t('Delete this server and every message for all members? This cannot be undone.'), true))) return;
        try {
            await socialApi('/groups/' + encodeURIComponent(state.serverId), { method: 'DELETE' });
            closeModal();
            await loadServers();
            showHome();
        } catch (error) {
            failure(error, t('The server could not be deleted.'));
        }
    }

    function cosmeticsPanel() {
        var data = state.cosmetics;
        if (!data) return '<div class="lc-empty">' + esc(t('Loading...')) + '</div>';
        var part = state.cosmeticPart;
        var equipped = data.profile[part] || null;
        var query = state.cosmeticQuery.trim().toLowerCase();
        var items = (data.owned[part] || []).filter(function (item) { return !query || String(item.name || item.item_id).toLowerCase().indexOf(query) >= 0; }).slice(0, 120);
        return '<div class="lc-tabs lc-cosmetic-tabs">' + COSMETIC_PARTS.map(function (entry) { return '<button type="button" class="lc-tab' + (entry[0] === part ? ' active' : '') + '" data-cosmetic-part="' + entry[0] + '" title="' + esc(t(entry[1])) + '">' + esc(t(entry[1])) + '</button>'; }).join('') + '</div>' +
            '<input type="search" class="lc-input" id="lcCosmeticSearch" maxlength="60" placeholder="' + esc(t('Search your items')) + '" value="' + esc(state.cosmeticQuery) + '">' +
            '<div class="lc-cosmetic-grid"><button type="button" class="lc-cosmetic' + (!equipped ? ' active' : '') + '" data-cosmetic="" title="' + esc(t('None')) + '"><span class="lc-cosmetic-none">∅</span><span>' + esc(t('None')) + '</span></button>' + items.map(function (item) {
                var preview = part === 'name_color' ? '<i class="lc-cosmetic-swatch" style="--rwl-keep:1;background:' + (item.gradient ? 'linear-gradient(90deg,' + item.gradient.map(function (color) { return RWL.sanitizeHex(color, '#e0aaff'); }).join(',') + ')' : RWL.sanitizeHex(item.hex, '#e0aaff')) + '"></i>' : (part === 'avatar_decoration' ? '<img src="' + esc(pictureUrl(item.thumb_url || item.asset_url)) + '" alt="" loading="lazy" decoding="async">' : '<i class="lc-cosmetic-swatch lc-cosmetic-plate"></i>');
                return '<button type="button" class="lc-cosmetic' + (item.item_id === equipped ? ' active' : '') + '" data-cosmetic="' + esc(item.item_id) + '" title="' + esc(item.name || item.item_id) + '">' + preview + '<span translate="no">' + esc(item.name || item.item_id) + '</span></button>';
            }).join('') + '</div>';
    }

    function userSettingsTabs() {
        return [['appearance', 'Appearance'], ['typing', 'Typing Indicator'], ['notifications', 'Status And Notifications']];
    }

    function userPanelHtml() {
        if (state.userTab === 'typing') {
            if (!state.typingData) return '<div class="lc-empty">' + esc(t('Loading...')) + '</div>';
            return global.LabcordExtras.typingSettingsHtml(state.typingData);
        }
        if (state.userTab === 'notifications') {
            var presence = global.RWLPresence ? global.RWLPresence.current() : { selected: 'online' };
            var current = global.RWLPresence ? global.RWLPresence.label(presence.selected) : '';
            return '<div class="lc-form"><p class="lc-note">' + esc(t('Your status applies to Labcord, the chat popup and the dashboard. You switch to Away automatically when you are idle.')) + '</p><div class="lc-modal-actions lc-actions-left"><button type="button" class="lc-btn" data-user-status-open title="' + esc(t('Change your status')) + '">' + (global.RWLPresence ? global.RWLPresence.dotHtml(presence.selected) : '') + ' ' + esc(current) + '</button><span data-notify-slot></span></div></div>';
        }
        return '<p class="lc-note">' + esc(t('Decorations you choose here are used everywhere on Rickware - Labs. Your theme, profile picture and banner can only be changed in the launcher.')) + '</p><div id="lcCosmetics">' + cosmeticsPanel() + '</div>';
    }

    function renderUserSettings() {
        var identity = state.boot.identity;
        var tabs = userSettingsTabs().map(function (tab) {
            return '<button type="button" class="lc-tab' + (state.userTab === tab[0] ? ' active' : '') + '" data-user-tab="' + tab[0] + '" title="' + esc(t(tab[1])) + '">' + esc(t(tab[1])) + '</button>';
        }).join('');
        openModal('<div class="lc-form lc-user-settings"><h2>' + esc(t('User Settings')) + '</h2><div class="lc-profile-preview"><span class="lc-profile-avatar">' + avatar(identity, 'lc-avatar-img') + '</span><div><strong translate="no" style="' + esc(nameStyle(identity)) + '">' + esc(identity.username) + '</strong><small>' + esc(identity.account_type || 'User') + '</small></div></div>' +
            '<div class="lc-tabs lc-user-settings-tabs">' + tabs + '</div><div id="lcUserPanel">' + userPanelHtml() + '</div><div class="lc-modal-actions"><a class="lc-btn" href="./inventory.html" target="_blank" rel="noopener" title="' + esc(t('Open your inventory')) + '">' + esc(t('Open Inventory')) + '</a><button type="button" class="lc-btn lc-btn-primary" data-modal-close title="' + esc(t('Done')) + '">' + esc(t('Done')) + '</button></div></div>', 'user', true);
        bindUserPanel();
    }

    function bindUserPanel() {
        var panel = byId('lcUserPanel');
        if (!panel) return;
        if (state.userTab === 'appearance' && !state.cosmetics) {
            RWL.apiRequest('/api/growth/card/config').then(function (data) {
                state.cosmetics = { owned: data.owned || {}, profile: data.profile || {} };
                var box = byId('lcCosmetics');
                if (box) box.innerHTML = cosmeticsPanel();
            }).catch(function (error) {
                var box = byId('lcCosmetics');
                if (box) box.innerHTML = '<div class="lc-empty">' + esc((error && error.message) || t('Your items could not be loaded.')) + '</div>';
            });
        } else if (state.userTab === 'typing') {
            var show = function () {
                var holder = byId('lcUserPanel');
                if (!holder || state.userTab !== 'typing') return;
                holder.innerHTML = global.LabcordExtras.typingSettingsHtml(state.typingData);
                global.LabcordExtras.bindTypingSettings(holder, state.typingData, function (saved) { state.typingData.typing_indicator = saved; });
            };
            if (state.typingData) show();
            else global.LabcordExtras.loadTypingSettings().then(function (data) { state.typingData = data; show(); }).catch(function (error) {
                var holder = byId('lcUserPanel');
                if (holder) holder.innerHTML = '<div class="lc-empty">' + esc((error && error.message) || t('Your typing indicator could not be loaded.')) + '</div>';
            });
        } else if (state.userTab === 'notifications') {
            var slot = panel.querySelector('[data-notify-slot]');
            if (slot && global.RWLNotify) global.RWLNotify.mountToggle(slot);
            var statusButton = panel.querySelector('[data-user-status-open]');
            if (statusButton && global.RWLPresence) statusButton.addEventListener('click', function (event) {
                event.stopPropagation();
                global.RWLPresence.openMenu(statusButton);
            });
        }
    }

    async function equipCosmetic(itemId) {
        if (state.busy || !state.cosmetics) return;
        state.busy = true;
        var payload = {};
        payload[state.cosmeticPart] = itemId || null;
        try {
            await RWL.apiRequest('/api/profile/update', { method: 'POST', body: { new_data: payload } });
            state.cosmetics.profile[state.cosmeticPart] = itemId || null;
            state.boot = await api('/bootstrap');
            renderUser();
            renderUserSettings();
            if (state.view === 'server') refreshServer(true);
            toast(t('Your profile was updated everywhere.'));
        } catch (error) {
            failure(error, t('The item could not be equipped.'));
        } finally {
            state.busy = false;
        }
    }

    function onRailClick(event) {
        var server = event.target.closest('[data-server]');
        if (server) return openServer(server.getAttribute('data-server'), 'general');
        if (event.target.closest('#lcHome')) return showHome();
        if (event.target.closest('#lcAddServer')) addServerDialog();
    }

    function onSideClick(event) {
        var menuButton = event.target.closest('#lcServerMenuBtn');
        if (menuButton) {
            var menu = byId('lcServerMenu');
            menu.innerHTML = serverMenuHtml();
            menu.hidden = !menu.hidden;
            return;
        }
        var menuItem = event.target.closest('[data-server-menu]');
        if (menuItem) return serverMenu(menuItem.getAttribute('data-server-menu'));
        var edit = event.target.closest('[data-channel-edit]');
        if (edit) return channelDialog(edit.getAttribute('data-channel-edit'));
        var create = event.target.closest('[data-channel-new]');
        if (create) return channelDialog(null, create.getAttribute('data-channel-new'));
        var category = event.target.closest('[data-category]');
        if (category) {
            var key = state.serverId + ':' + category.getAttribute('data-category');
            state.collapsed[key] = !state.collapsed[key];
            return renderServerSide();
        }
        var channel = event.target.closest('[data-channel]');
        if (channel) return openChannel(channel.getAttribute('data-channel'));
        var dm = event.target.closest('[data-dm]');
        if (dm) return openDm(dm.getAttribute('data-dm'));
        if (event.target.closest('[data-home="friends"]')) return showHome();
        var user = event.target.closest('[data-user-action]');
        if (user) {
            var userAction = user.getAttribute('data-user-action');
            if (userAction === 'settings') renderUserSettings();
            else if (userAction === 'status') {
                if (global.RWLPresence) global.RWLPresence.openMenu(user);
            } else if (social() && state.boot) social().openProfile(state.boot.identity.username);
        }
    }

    function serverMenu(action) {
        var menu = byId('lcServerMenu');
        if (menu) menu.hidden = true;
        if (action === 'settings') {
            state.settingsTab = (settingsTabs()[0] || ['overview'])[0];
            renderSettings();
        } else if (action === 'channel') channelDialog(null, null);
        else if (action === 'category') categoryDialog(null);
        else if (action === 'nickname') nicknameDialog(null);
        else if (action === 'leave') leaveServer();
        else if (action === 'members') {
            state.membersOpen = !state.membersOpen;
            renderMembers();
        } else if (action === 'invite') {
            var chat = social() && social().chatElement();
            var button = chat && chat.querySelector('[data-group-action="invite"]');
            if (button) button.click();
            else toast(t('Open a channel first to invite people.'), 'error');
        }
    }

    async function onViewClick(event) {
        var tab = event.target.closest('[data-home-tab]');
        if (tab) {
            state.homeTab = tab.getAttribute('data-home-tab');
            return renderHomeView();
        }
        var dm = event.target.closest('[data-dm]');
        if (dm) return openDm(dm.getAttribute('data-dm'));
        var action = event.target.closest('[data-friend-action]');
        if (!action) return;
        var row = action.closest('[data-username]');
        var username = row && row.getAttribute('data-username');
        var name = action.getAttribute('data-friend-action');
        if (!username) return;
        try {
            if (name === 'message') {
                chatDock();
                await social().openChatWith(username);
                syncDock();
                return renderHomeSide();
            }
            if (name === 'profile') return social().openProfile(username);
            if (name === 'accept' || name === 'decline') await socialApi('/friends/respond', { method: 'POST', body: { username: username, accept: name === 'accept' } });
            else if (name === 'cancel' || name === 'remove') {
                if (name === 'remove' && !(await confirmDialog(t('Remove Friend'), t('Remove this friend?'), true))) return;
                await socialApi('/friends/remove', { method: 'POST', body: { username: username } });
            }
            await loadHomeData();
            renderHome();
        } catch (error) {
            failure(error, t('This did not work. Please try again.'));
        }
    }

    async function onModalClick(event) {
        var layer = byId('lcModalLayer');
        if (event.target === layer || event.target.closest('[data-modal-close]')) {
            if (state.modalCancel) state.modalCancel();
            state.modalCancel = null;
            return closeModal();
        }
        var userTab = event.target.closest('[data-user-tab]');
        if (userTab) {
            state.userTab = userTab.getAttribute('data-user-tab');
            return renderUserSettings();
        }
        var add = event.target.closest('[data-add]');
        if (add) return createOrJoin(add.getAttribute('data-add'));
        var tab = event.target.closest('[data-settings-tab]');
        if (tab) {
            state.settingsTab = tab.getAttribute('data-settings-tab');
            return renderSettings();
        }
        if (event.target.closest('[data-server-delete]')) return deleteServer();
        var icon = event.target.closest('[data-icon]');
        if (icon) {
            if (icon.getAttribute('data-icon') === 'upload') return byId('lcIconFile').click();
            try {
                await api('/servers/' + encodeURIComponent(state.serverId) + '/icon', { method: 'DELETE' });
                await loadServers();
                await refreshServer(true);
                renderSettings();
            } catch (error) {
                failure(error, t('The picture could not be removed.'));
            }
            return;
        }
        var rolePick = event.target.closest('[data-role]');
        if (rolePick) {
            state.roleId = rolePick.getAttribute('data-role');
            return renderSettings();
        }
        if (event.target.closest('[data-role-new]')) {
            try {
                var created = await api('/servers/' + encodeURIComponent(state.serverId) + '/roles', { method: 'POST', body: { name: 'new role' } });
                state.roleId = created.role_id;
                await refreshServer(true);
                renderSettings();
            } catch (error) {
                failure(error, t('The role could not be created.'));
            }
            return;
        }
        var roleMove = event.target.closest('[data-role-move]');
        if (roleMove && !roleMove.disabled) return moveRole(roleMove.getAttribute('data-role-id'), parseInt(roleMove.getAttribute('data-role-move'), 10));
        var roleDelete = event.target.closest('[data-role-delete]');
        if (roleDelete && !roleDelete.disabled) {
            if (!(await confirmDialog(t('Delete Role'), t('Delete this role? Members lose it immediately.'), true))) return;
            try {
                await api('/servers/' + encodeURIComponent(state.serverId) + '/roles/' + encodeURIComponent(roleDelete.getAttribute('data-role-delete')), { method: 'DELETE' });
                state.roleId = null;
                await refreshServer(true);
                renderSettings();
            } catch (error) {
                failure(error, t('The role could not be deleted.'));
            }
            return;
        }
        var move = event.target.closest('[data-move]');
        if (move && !move.disabled) return moveEntry(move.getAttribute('data-move'), move.getAttribute('data-id'), parseInt(move.getAttribute('data-step'), 10));
        var menuItem = event.target.closest('[data-server-menu]');
        if (menuItem) return serverMenu(menuItem.getAttribute('data-server-menu'));
        var channelEdit = event.target.closest('[data-channel-edit]');
        if (channelEdit) return channelDialog(channelEdit.getAttribute('data-channel-edit'));
        var channelDelete = event.target.closest('[data-channel-delete]');
        if (channelDelete) {
            if (!(await confirmDialog(t('Delete Channel'), t('Delete this channel and all of its messages?'), true))) return;
            try {
                await api('/servers/' + encodeURIComponent(state.serverId) + '/channels/' + encodeURIComponent(channelDelete.getAttribute('data-channel-delete')), { method: 'DELETE' });
                closeModal();
                await refreshServer(true);
            } catch (error) {
                failure(error, t('The channel could not be deleted.'));
            }
            return;
        }
        var categoryEdit = event.target.closest('[data-category-edit]');
        if (categoryEdit) return categoryDialog(categoryEdit.getAttribute('data-category-edit'));
        var categoryDelete = event.target.closest('[data-category-delete]');
        if (categoryDelete) {
            if (!(await confirmDialog(t('Delete Category'), t('Delete this category? Its channels stay and move to the top.'), true))) return;
            try {
                await api('/servers/' + encodeURIComponent(state.serverId) + '/categories/' + encodeURIComponent(categoryDelete.getAttribute('data-category-delete')), { method: 'DELETE' });
                await refreshServer(true);
                renderSettings();
            } catch (error) {
                failure(error, t('The category could not be deleted.'));
            }
            return;
        }
        var memberRoleButton = event.target.closest('[data-member-role]');
        if (memberRoleButton && !memberRoleButton.disabled) return toggleMemberRole(memberRoleButton.getAttribute('data-member-name'), memberRoleButton.getAttribute('data-member-role'));
        var nick = event.target.closest('[data-member-nick]');
        if (nick) return nicknameDialog(nick.getAttribute('data-member-nick'));
        var kick = event.target.closest('[data-member-kick]');
        if (kick) return kickMember(kick.getAttribute('data-member-kick'));
        var part = event.target.closest('[data-cosmetic-part]');
        if (part) {
            state.cosmeticPart = part.getAttribute('data-cosmetic-part');
            state.cosmeticQuery = '';
            byId('lcCosmetics').innerHTML = cosmeticsPanel();
            return;
        }
        var cosmetic = event.target.closest('[data-cosmetic]');
        if (cosmetic) equipCosmetic(cosmetic.getAttribute('data-cosmetic'));
    }

    function reorderIds(ids, sourceId, targetId, position) {
        var rest = ids.filter(function (entry) { return entry !== sourceId; });
        var index = rest.indexOf(targetId);
        if (index < 0) return null;
        rest.splice(position === 'before' ? index : index + 1, 0, sourceId);
        return rest;
    }

    async function dropServer(sourceId, targetId, position) {
        var ids = reorderIds(state.servers.map(function (server) { return server.group_id; }), sourceId, targetId, position);
        if (!ids) return;
        var byIdMap = {};
        state.servers.forEach(function (server) { byIdMap[server.group_id] = server; });
        state.servers = ids.map(function (identifier) { return byIdMap[identifier]; });
        renderRail();
        try {
            await api('/servers/order', { method: 'POST', body: { group_ids: ids } });
        } catch (error) {
            failure(error, t('The order could not be saved.'));
            loadServers();
        }
    }

    async function dropLayout(source, target, position) {
        var layout = layoutOf();
        var kind = source.getAttribute('data-drag-kind');
        var sourceId = source.getAttribute('data-drag-id');
        var targetKind = target.getAttribute('data-drag-kind');
        var targetId = target.getAttribute('data-drag-id');
        var containerOf = function (channelId) {
            if (layout.uncategorized.indexOf(channelId) >= 0) return layout.uncategorized;
            var found = layout.categories.filter(function (category) { return category.channels.indexOf(channelId) >= 0; })[0];
            return found ? found.channels : null;
        };
        if (kind === 'category') {
            var anchorCategory = targetKind === 'category' ? targetId : (function () {
                var found = layout.categories.filter(function (category) { return category.channels.indexOf(targetId) >= 0; })[0];
                return found ? found.id : null;
            })();
            if (!anchorCategory || anchorCategory === sourceId) return;
            var moving = layout.categories.filter(function (category) { return category.id === sourceId; })[0];
            var remaining = layout.categories.filter(function (category) { return category.id !== sourceId; });
            var at = remaining.map(function (category) { return category.id; }).indexOf(anchorCategory);
            remaining.splice(position === 'before' ? at : at + 1, 0, moving);
            layout.categories = remaining;
        } else {
            var origin = containerOf(sourceId);
            if (!origin) return;
            origin.splice(origin.indexOf(sourceId), 1);
            if (targetKind === 'channel') {
                var destination = containerOf(targetId);
                if (!destination) return;
                var position2 = destination.indexOf(targetId);
                destination.splice(position === 'before' ? position2 : position2 + 1, 0, sourceId);
            } else {
                var category = layout.categories.filter(function (entry) { return entry.id === targetId; })[0];
                if (!category) return;
                category.channels.unshift(sourceId);
            }
        }
        try {
            await api('/servers/' + encodeURIComponent(state.serverId) + '/layout', { method: 'POST', body: layout });
            await refreshServer(true);
            if (state.modal === 'settings') renderSettings();
        } catch (error) {
            failure(error, t('The order could not be saved.'));
            refreshServer(true);
        }
    }

    async function dropRole(sourceId, targetId, position) {
        var ids = reorderIds(state.server.roles.map(function (role) { return role.id; }), sourceId, targetId, position);
        if (!ids) return;
        try {
            await api('/servers/' + encodeURIComponent(state.serverId) + '/roles/order', { method: 'POST', body: { role_ids: ids } });
            await refreshServer(true);
            renderSettings();
        } catch (error) {
            failure(error, t('The order could not be saved.'));
        }
    }

    function setupSortables() {
        var extras = global.LabcordExtras;
        if (!extras) return;
        extras.attachSortable(byId('lcServers'), {
            itemSelector: '[data-drag-kind="server"]',
            canDrag: function () { return true; },
            canDrop: function () { return true; },
            onDrop: function (source, target, position) { dropServer(source.getAttribute('data-drag-id'), target.getAttribute('data-drag-id'), position); }
        });
        var layoutOptions = {
            itemSelector: '[data-drag-kind="channel"], [data-drag-kind="category"]',
            intoSelector: '[data-drag-kind="category"]',
            canDrag: function () { return has('manage_channels'); },
            canDrop: function (source, target) { return source !== target; },
            onDrop: dropLayout
        };
        extras.attachSortable(byId('lcSideBody'), layoutOptions);
        extras.attachSortable(byId('lcModalLayer'), {
            itemSelector: '[data-drag-kind]',
            intoSelector: '[data-drag-kind="category"]',
            canDrag: function (source) { return source.getAttribute('data-drag-kind') === 'role' ? has('manage_roles') : has('manage_channels'); },
            canDrop: function (source, target) {
                var sourceKind = source.getAttribute('data-drag-kind');
                var targetKind = target.getAttribute('data-drag-kind');
                return sourceKind === 'role' ? targetKind === 'role' : targetKind !== 'role';
            },
            onDrop: function (source, target, position) {
                if (source.getAttribute('data-drag-kind') === 'role') dropRole(source.getAttribute('data-drag-id'), target.getAttribute('data-drag-id'), position);
                else dropLayout(source, target, position);
            }
        });
    }

    function installHooks() {
        global.RWLLabcordRoleStyle = function (username) {
            if (!state.server || !state.server.members) return null;
            var member = state.server.members.filter(function (entry) { return entry.username === username; })[0];
            return member && member.role_style ? member.role_style : null;
        };
        global.RWLLabcordCan = function (permission) { return has(permission); };
        global.RWLLabcordFocus = function (groupId) {
            return state.view === 'server' && state.serverId === groupId && !document.hidden && document.hasFocus();
        };
        global.addEventListener('rwl-presence-change', function () { if (state.boot) renderUser(); });
    }

    function onModalInput(event) {
        if (event.target.id !== 'lcCosmeticSearch') return;
        state.cosmeticQuery = event.target.value.slice(0, 60);
        var caret = event.target.selectionStart;
        byId('lcCosmetics').innerHTML = cosmeticsPanel();
        var input = byId('lcCosmeticSearch');
        if (input) {
            input.focus();
            try { input.setSelectionRange(caret, caret); } catch (error) {}
        }
    }

    function onSocialEvent(event) {
        var entry = (event && event.detail) || {};
        var type = entry.type || '';
        if (type === 'labcord_updated') {
            if (entry.group_id === state.serverId) refreshServer(false);
            if (entry.reason === 'overview' || entry.reason === 'icon') loadServers();
            return;
        }
        if (type.indexOf('group') === 0) {
            if (type === 'group_removed' || type === 'group_deleted') {
                loadServers().then(function () { if (entry.group_id === state.serverId) showHome(); });
                return;
            }
            if (type === 'group_member_joined' || type === 'group_member_left' || type === 'group_updated') {
                if (entry.group_id === state.serverId) refreshServer(true);
                loadServers();
                return;
            }
            if (type === 'group_message' && entry.group_id !== state.serverId) loadServers();
            return;
        }
        if (state.view === 'home') loadHomeData().then(function () { if (state.view === 'home') renderHome(); });
        else loadHomeData().then(renderRail);
    }

    function route() {
        var match = /^#server\/([0-9a-fA-F-]{32,40})(?:\/([a-z0-9]{4,16}))?/.exec(global.location.hash || '');
        if (match && state.servers.some(function (server) { return server.group_id === match[1]; })) return openServer(match[1], match[2] || 'general');
        showHome();
    }

    function waitForSocial(timeout) {
        return new Promise(function (resolve) {
            var started = Date.now();
            (function check() {
                if ((social() && social().username && social().username()) || Date.now() - started > timeout) return resolve();
                setTimeout(check, 120);
            })();
        });
    }

    async function init() {
        if (!RWL.getToken()) return requireLogin();
        byId('lcRail').addEventListener('click', onRailClick);
        byId('lcSide').addEventListener('click', onSideClick);
        byId('lcSide').addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            var channel = event.target.closest('.lc-channel');
            if (channel && event.target === channel) {
                event.preventDefault();
                openChannel(channel.getAttribute('data-channel'));
            }
        });
        byId('lcView').addEventListener('click', onViewClick);
        byId('lcMembers').addEventListener('click', function (event) {
            var member = event.target.closest('[data-member]');
            if (member && social()) social().openProfile(member.getAttribute('data-member'));
        });
        byId('lcModalLayer').addEventListener('click', onModalClick);
        byId('lcModalLayer').addEventListener('input', onModalInput);
        byId('lcSideToggle').addEventListener('click', function () { byId('lcApp').classList.toggle('lc-side-open'); });
        document.addEventListener('click', function (event) {
            var menu = byId('lcServerMenu');
            if (menu && !menu.hidden && !event.target.closest('#lcSideHead')) menu.hidden = true;
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !byId('lcModalLayer').hidden) {
                if (state.modalCancel) state.modalCancel();
                state.modalCancel = null;
                closeModal();
            }
        });
        global.addEventListener('rwl-social-event', onSocialEvent);
        try {
            state.boot = await api('/bootstrap');
        } catch (error) {
            if (error && (error.status === 401 || error.status === 403)) return requireLogin();
            byId('lcView').innerHTML = '<div class="lc-empty lc-empty-big">' + esc((error && error.message) || t('Labcord could not be loaded. Please try again later.')) + '</div>';
            return;
        }
        state.servers = state.boot.servers || [];
        await waitForSocial(6000);
        var chat = chatDock();
        if (chat && global.MutationObserver) new MutationObserver(function () {
            syncDock();
            if (state.view === 'home') {
                renderHomeSide();
                if (!chatOpen()) renderHomeView();
            }
        }).observe(chat, { attributes: true, attributeFilter: ['hidden'] });
        renderUser();
        renderRail();
        setupSortables();
        installHooks();
        await loadHomeData();
        route();
        state.timer = setInterval(function () {
            if (document.hidden) return;
            loadServers();
            if (state.view === 'server') refreshServer(true);
            else loadHomeData().then(function () { if (state.view === 'home') renderHome(); });
        }, REFRESH_MS);
    }

    global.Labcord = { openServer: openServer, openDm: openDm, showHome: showHome };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
