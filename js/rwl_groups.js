(function (global) {
    if (global.RWLGroups || !global.RWL) return;

    var esc = RWL.escapeHtml;
    var MAX_TEXT = 4000;
    var WRAP_INFO = 'rwl-group-wrap-v1';
    var MESSAGE_INFO = 'rwl-group-message-v1';
    var subtle = global.crypto && global.crypto.subtle;
    var encoder = new TextEncoder();
    var decoder = new TextDecoder();
    var REACTION_CHOICES = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀', '💜', '✅', '🚀', '🤝'];
    var TYPING_SEND_MS = 3000;
    var TYPING_SHOW_MS = 6000;
    var state = { current: null, keys: {}, list: null, listAt: 0, sharing: {}, rotating: {}, typingSentAt: 0, typingUsers: {} };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function api(path, options) {
        return RWL.apiRequest('/api/social' + path, options);
    }

    function social() {
        return global.RWLSocial || null;
    }

    function cryptoApi() {
        var current = social();
        return current && current.crypto ? current.crypto : null;
    }

    function notify(message, type) {
        if (social() && social().notify) social().notify(message, type);
        else if (typeof global.showBanner === 'function') global.showBanner(message, type || 'info');
    }

    function confirmDialog(title, message, danger) {
        if (social() && social().confirmDialog) return social().confirmDialog(title, message, danger);
        return Promise.resolve(global.confirm(message));
    }

    function promptDialog(options) {
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'rwl-vault-overlay';
            overlay.innerHTML = '<form class="rwl-vault-card" autocomplete="off">' +
                '<h3>' + esc(options.title) + '</h3>' + (options.text ? '<p>' + esc(options.text) + '</p>' : '') +
                '<input class="rwl-input" type="text" data-value maxlength="' + (options.maxLength || 60) + '" placeholder="' + esc(options.placeholder || '') + '" value="' + esc(options.value || '') + '">' +
                '<div class="rwl-vault-error" data-error></div>' +
                '<div class="rwl-vault-actions"><button type="button" class="rwl-btn rwl-btn-secondary" data-cancel title="' + esc(t('Cancel')) + '">' + esc(t('Cancel')) + '</button><button type="submit" class="rwl-btn" title="' + esc(options.confirm || t('Continue')) + '">' + esc(options.confirm || t('Continue')) + '</button></div>' +
            '</form>';
            document.body.appendChild(overlay);
            var input = overlay.querySelector('[data-value]');
            var errorBox = overlay.querySelector('[data-error]');
            input.focus();
            var finish = function (value) { overlay.remove(); resolve(value); };
            overlay.querySelector('[data-cancel]').addEventListener('click', function () { finish(null); });
            overlay.addEventListener('click', function (event) { if (event.target === overlay) finish(null); });
            overlay.querySelector('form').addEventListener('submit', function (event) {
                event.preventDefault();
                var value = input.value.trim();
                if (options.pattern && !options.pattern.test(value)) {
                    input.classList.add('rwl-invalid');
                    errorBox.textContent = options.invalid || t('Please check your input.');
                    return;
                }
                finish(value);
            });
        });
    }

    async function list(force) {
        if (!RWL.getToken()) return [];
        if (!force && state.list && Date.now() - state.listAt < 5000) return state.list;
        var data = await api('/groups');
        state.list = data.groups || [];
        state.listAt = Date.now();
        return state.list;
    }

    function myName() {
        return social() && social().username ? social().username() : '';
    }

    function salt(groupId) {
        return 'rwl-group:' + groupId;
    }

    async function wrapFor(groupId, rawKey, member) {
        var crypto = cryptoApi();
        var myKeyId = crypto.myKeyId();
        var mine = member.username.toLowerCase() === myName().toLowerCase();
        var memberKeyId = mine ? myKeyId : member.keys.key_id;
        var publicJson = mine ? await crypto.ownPublicJson(myKeyId) : crypto.partnerPublic(member.keys, memberKeyId);
        var wrappingKey = await crypto.derivedKey(myKeyId, publicJson, salt(groupId), WRAP_INFO);
        var iv = crypto.randomBytes(12);
        var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, wrappingKey, rawKey);
        return { username: member.username, wrapped_key: crypto.toBase64(sealed), wrapped_iv: crypto.toBase64(iv), wrapper_key_id: myKeyId, member_key_id: memberKeyId };
    }

    async function unwrapKeys(detail) {
        var crypto = cryptoApi();
        var keys = state.keys[detail.group_id] || {};
        for (var index = 0; index < detail.my_keys.length; index++) {
            var entry = detail.my_keys[index];
            if (keys[entry.key_version]) continue;
            try {
                var mine = String(entry.wrapper || '').toLowerCase() === myName().toLowerCase();
                var wrapperPublic = mine ? await crypto.ownPublicJson(entry.wrapper_key_id) : crypto.partnerPublic(entry.wrapper_keys, entry.wrapper_key_id);
                var wrappingKey = await crypto.derivedKey(entry.member_key_id, wrapperPublic, salt(detail.group_id), WRAP_INFO);
                var raw = await subtle.decrypt({ name: 'AES-GCM', iv: crypto.fromBase64(entry.wrapped_iv) }, wrappingKey, crypto.fromBase64(entry.wrapped_key));
                keys[entry.key_version] = { raw: new Uint8Array(raw), key: await subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']) };
            } catch (error) {
                keys[entry.key_version] = null;
            }
        }
        state.keys[detail.group_id] = keys;
        return keys;
    }

    async function newGroupKey() {
        var key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        return new Uint8Array(await subtle.exportKey('raw', key));
    }

    async function encryptText(groupId, version, text) {
        var crypto = cryptoApi();
        var entry = (state.keys[groupId] || {})[version];
        if (!entry) throw new Error(t('The server key is not available yet.'));
        var iv = crypto.randomBytes(12);
        var payload = encoder.encode(JSON.stringify({ t: text, v: MESSAGE_INFO }));
        var sealed = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, entry.key, payload);
        return { ciphertext: crypto.toBase64(sealed), iv: crypto.toBase64(iv) };
    }

    async function decryptMessage(groupId, message) {
        if (message.kind === 'system') return { ok: true, text: message.system_text || '', system: true };
        var crypto = cryptoApi();
        var entry = (state.keys[groupId] || {})[message.key_version];
        if (!entry) return { ok: false, text: t('This message was sent before you received the server key.') };
        try {
            var plain = await subtle.decrypt({ name: 'AES-GCM', iv: crypto.fromBase64(message.iv) }, entry.key, crypto.fromBase64(message.ciphertext));
            var data = JSON.parse(decoder.decode(plain));
            return { ok: true, text: String(data.t || '').slice(0, MAX_TEXT) };
        } catch (error) {
            return { ok: false, text: t('This message could not be decrypted.') };
        }
    }

    async function shareWithPending(detail) {
        if (!detail.has_current_key || !detail.pending_key_members.length || state.sharing[detail.group_id]) return false;
        var keys = state.keys[detail.group_id] || {};
        var current = keys[detail.key_version];
        if (!current) return false;
        state.sharing[detail.group_id] = true;
        try {
            var wraps = [];
            for (var index = 0; index < detail.members.length; index++) {
                var member = detail.members[index];
                if (detail.pending_key_members.indexOf(member.username) < 0 || !member.keys || !member.keys.exists) continue;
                try { wraps.push(await wrapFor(detail.group_id, current.raw, member)); } catch (error) {}
            }
            if (!wraps.length) return false;
            await api('/groups/' + encodeURIComponent(detail.group_id) + '/keys', { method: 'POST', body: { key_version: detail.key_version, rotation: false, wraps: wraps } });
            return true;
        } catch (error) {
            return false;
        } finally {
            state.sharing[detail.group_id] = false;
        }
    }

    async function rotate(detail) {
        if (!detail.rotation_needed || state.rotating[detail.group_id]) return false;
        state.rotating[detail.group_id] = true;
        try {
            var raw = await newGroupKey();
            var wraps = [];
            for (var index = 0; index < detail.members.length; index++) {
                var member = detail.members[index];
                var mine = member.username.toLowerCase() === myName().toLowerCase();
                if (!mine && (!member.keys || !member.keys.exists)) continue;
                try { wraps.push(await wrapFor(detail.group_id, raw, member)); } catch (error) {}
            }
            await api('/groups/' + encodeURIComponent(detail.group_id) + '/keys', { method: 'POST', body: { key_version: detail.key_version, rotation: true, wraps: wraps } });
            return true;
        } catch (error) {
            return false;
        } finally {
            state.rotating[detail.group_id] = false;
        }
    }

    function current() {
        return state.current ? { group_id: state.current.id, name: state.current.detail.name } : null;
    }

    function detach() {
        state.current = null;
    }

    var CHANNEL_PATTERN = /^[a-z0-9]{4,16}$/;
    var LABCORD_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

    function detailPath(groupId, channelId) {
        var path = '/groups/' + encodeURIComponent(groupId);
        return channelId && channelId !== 'general' && CHANNEL_PATTERN.test(channelId) ? path + '?channel=' + encodeURIComponent(channelId) : path;
    }

    function labcordUrl(groupId, channelId) {
        var base = global.location.pathname.indexOf('/sites/') >= 0 ? './labcord.html' : './sites/labcord.html';
        return base + (groupId ? '#server/' + encodeURIComponent(groupId) + (channelId ? '/' + encodeURIComponent(channelId) : '') : '');
    }

    function openLabcord(groupId, channelId) {
        var opened = global.open(labcordUrl(groupId, channelId), '_blank', 'noopener');
        if (opened) opened.opener = null;
    }

    async function load(groupId, channelId) {
        var path = detailPath(groupId, channelId);
        var detail = await api(path);
        await unwrapKeys(detail);
        if (await rotate(detail)) {
            detail = await api(path);
            await unwrapKeys(detail);
        }
        if (await shareWithPending(detail)) detail = await api(path);
        return detail;
    }

    async function open(groupId, channelId) {
        var crypto = cryptoApi();
        if (!crypto || !(await crypto.ensureVault())) return;
        var element = social().chatElement();
        if (social().closeChat) {
            var keepPosition = element.style.left;
            social().closeChat();
            if (keepPosition) element.style.left = keepPosition;
        }
        element.hidden = false;
        document.body.classList.add('rwl-chat-open');
        element.innerHTML = '<div class="rwl-center-empty">' + esc(t('Decrypting server...')) + '</div>';
        try {
            var detail = await load(groupId, channelId);
            state.current = { id: detail.group_id, detail: detail, messages: [], byId: {}, channelId: detail.channel_id || 'general' };
            for (var index = 0; index < detail.messages.length; index++) {
                var message = detail.messages[index];
                message.plain = await decryptMessage(detail.group_id, message);
                state.current.messages.push(message);
                state.current.byId[message.id] = message;
            }
            render();
            markRead();
            state.listAt = 0;
        } catch (error) {
            element.innerHTML = '<div class="rwl-center-empty">' + esc(error.message || t('The server could not be loaded.')) + '<br><button type="button" class="rwl-btn rwl-btn-secondary" data-group-action="close">' + esc(t('Close')) + '</button></div>';
            element.onclick = function (event) { if (event.target.closest('[data-group-action="close"]')) social().closeChat(); };
        }
    }

    function memberIdentity(username) {
        var detail = state.current && state.current.detail;
        var found = detail ? detail.members.filter(function (member) { return member.username === username; })[0] : null;
        return found || { username: username || '?' };
    }

    function canDeleteForEveryone(message) {
        var detail = state.current.detail;
        var rules = detail.delete_rules || {};
        if (rules.owner_any_time) return true;
        var created = Date.parse(message.created_at || '');
        var fresh = !isNaN(created) && Date.now() - created <= (rules.window_seconds || 1800) * 1000;
        return fresh && (message.mine || rules.staff_any_message || detail.permissions.moderator);
    }

    function roleStyleFor(username) {
        var provider = global.RWLLabcordRoleStyle;
        var roleStyle = typeof provider === 'function' ? provider(username) : null;
        return roleStyle ? RWL.nameColorStyle(roleStyle, '#ffffff') : null;
    }

    function canPin() {
        var detail = state.current && state.current.detail;
        if (!detail) return false;
        if (detail.permissions && detail.permissions.moderator) return true;
        return typeof global.RWLLabcordCan === 'function' && global.RWLLabcordCan('manage_messages');
    }

    function replyQuoteHtml(message) {
        if (!message.reply_to || !state.current) return '';
        var target = state.current.byId[message.reply_to];
        if (!target || target.kind === 'system') return '<div class="rwl-reply-quote rwl-reply-missing">↩ ' + esc(t('The original message is not available.')) + '</div>';
        var snippet = target.plain && target.plain.ok ? target.plain.text.replace(/\s+/g, ' ').slice(0, 90) : '';
        return '<div class="rwl-reply-quote" translate="no" data-reply-jump="' + esc(target.id) + '">↩ <strong>' + esc(target.mine ? (myName() || t('You')) : (target.sender || t('Former member'))) + '</strong> ' + esc(snippet) + '</div>';
    }

    function reactionsHtml(message) {
        var reactions = Array.isArray(message.reactions) ? message.reactions : [];
        if (!reactions.length) return '';
        return '<div class="rwl-reactions">' + reactions.map(function (reaction) {
            return '<button type="button" class="rwl-reaction' + (reaction.me ? ' mine' : '') + '" data-group-react="' + esc(reaction.emoji) + '" title="' + esc(t('React')) + '">' + esc(reaction.emoji) + ' <span>' + reaction.count + '</span></button>';
        }).join('') + '</div>';
    }

    function messageHtml(message, previous) {
        if (message.kind === 'system') return '<div class="rwl-group-system" data-message-id="' + esc(message.id) + '">' + esc(message.plain.text) + '</div>';
        var author = message.mine ? (myName() || t('You')) : (message.sender || t('Former member'));
        var identity = message.mine ? (social().identity() || memberIdentity(author)) : memberIdentity(author);
        var grouped = previous && previous.kind !== 'system' && previous.sender === message.sender && Date.parse(message.created_at) - Date.parse(previous.created_at) < 7 * 60 * 1000;
        var body = message.plain.ok ? social().renderMarkdown(message.plain.text, message.links_allowed, false) : esc(message.plain.text);
        var authorStyle = roleStyleFor(author) || social().nameStyle(identity);
        var tools = '<div class="rwl-msg-tools">' +
            (message.plain.ok ? '<button type="button" class="rwl-tool" data-group-tool="reply" title="' + esc(t('Reply')) + '">↩</button>' : '') +
            '<button type="button" class="rwl-tool" data-group-tool="react" title="' + esc(t('Add reaction')) + '">😀</button>' +
            (message.mine && message.plain.ok ? '<button type="button" class="rwl-tool" data-group-tool="edit" title="' + esc(t('Edit message')) + '">✎</button>' : '') +
            (canPin() ? '<button type="button" class="rwl-tool" data-group-tool="pin" title="' + esc(message.pinned ? t('Unpin message') : t('Pin message')) + '">📌</button>' : '') +
            (message.plain.ok ? '<button type="button" class="rwl-tool" data-group-tool="copy" title="' + esc(t('Copy text')) + '">⧉</button>' : '') +
            '<button type="button" class="rwl-tool" data-group-tool="delete_me" title="' + esc(t('Delete for me')) + '">🙈</button>' +
            (canDeleteForEveryone(message) ? '<button type="button" class="rwl-tool rwl-tool-danger" data-group-tool="delete" title="' + esc(t('Delete for everyone')) + '">🗑</button>' : '') +
        '</div>';
        var head = grouped ? '<span class="rwl-msg-time-gutter"></span>' : '<div class="rwl-msg-avatar-wrap">' + social().avatarHtml(identity, 'rwl-msg-avatar', true, false) + '</div>';
        return '<div class="rwl-msg' + (grouped ? '' : ' rwl-msg-start') + (message.pinned ? ' rwl-msg-pinned' : '') + '" data-message-id="' + esc(message.id) + '">' + head +
            '<div class="rwl-msg-content">' +
                (grouped ? '' : '<div class="rwl-msg-head" translate="no"><span class="rwl-msg-author" style="' + esc(authorStyle) + '">' + esc(author) + '</span><span class="rwl-msg-time">' + esc(social().formatStamp(message.created_at)) + '</span>' + (message.pinned ? '<span class="rwl-msg-pin" title="' + esc(t('Pinned message')) + '">📌</span>' : '') + '</div>') +
                replyQuoteHtml(message) +
                '<div class="rwl-msg-body' + (message.plain.ok ? '' : ' rwl-msg-locked') + '" translate="no">' + body + (message.edited_at ? '<span class="rwl-msg-edited">(' + esc(t('edited')) + ')</span>' : '') + '</div>' +
                reactionsHtml(message) +
            '</div>' + tools + '</div>';
    }

    function render() {
        var group = state.current;
        if (!group) return;
        var detail = group.detail;
        var element = social().chatElement();
        var banner = '';
        if (detail.suspended) banner = t('This server was suspended by the team.');
        else if (!detail.has_current_key) banner = t('Waiting for a member to share the server key with you. It arrives automatically as soon as a member is online.');
        var channels = detail.channels || [];
        var channelName = detail.channel_name || 'general';
        if (!banner && detail.can_send_here === false) banner = t('You can read this channel, but you cannot write here.');
        var locked = !detail.has_current_key || detail.suspended || detail.can_send_here === false;
        var channelPicker = channels.length > 1 ? '<select class="rwl-select rwl-group-channel" data-group-channel title="' + esc(t('Switch the channel')) + '" translate="no">' + channels.map(function (channel) { return '<option value="' + esc(channel.id) + '"' + (channel.id === group.channelId ? ' selected' : '') + '># ' + esc(channel.name) + '</option>'; }).join('') + '</select>' : '';
        element.setAttribute('data-chat-kind', 'group');
        element.innerHTML =
            '<div class="rwl-chat-head" title="' + esc(t('Drag to move the chat')) + '">' +
                '<button type="button" class="rwl-icon-btn" data-group-action="list" title="' + esc(t('All chats')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></button>' +
                '<span class="rwl-group-icon">' + esc(detail.name.slice(0, 2).toUpperCase()) + '</span>' +
                '<div class="rwl-chat-title" data-group-action="members" title="' + esc(t('Show the members')) + '" translate="no"><strong>' + esc(detail.name) + '</strong><span class="rwl-chat-lock"><b class="rwl-group-channel-name"># ' + esc(channelName) + '</b> · ' + detail.members.length + ' ' + esc(t('members')) + ' · ' + esc(t('End to end encrypted')) + '</span></div>' +
                channelPicker +
                '<button type="button" class="rwl-icon-btn rwl-labcord-btn" data-group-action="labcord" title="' + esc(t('Open Labcord in a new tab')) + '">' + LABCORD_ICON + '</button>' +
                (detail.permissions.can_invite ? '<button type="button" class="rwl-icon-btn" data-group-action="invite" title="' + esc(t('Invite members')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></button>' : '') +
                (detail.permissions.can_clear ? '<button type="button" class="rwl-icon-btn" data-group-action="clear" title="' + esc(t('Clear the chat history')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>' : '') +
                '<button type="button" class="rwl-icon-btn" data-group-action="minimize" title="' + esc(t('Minimize the chat')) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>' +
                '<button type="button" class="rwl-icon-btn" data-group-action="close" title="' + esc(t('Close the conversation')) + '">✕</button>' +
            '</div>' +
            '<div class="rwl-chat-list" hidden></div>' +
            '<div class="rwl-chat-banner"' + (banner ? '' : ' hidden') + '><span>' + esc(banner) + '</span></div>' +
            '<div class="rwl-chat-scroll" tabindex="0"></div>' +
            '<div class="rwl-chat-typing" data-group-typing></div>' +
            '<div class="rwl-composer"><div class="rwl-composer-context" data-group-reply hidden></div><div class="rwl-composer-box' + (locked ? ' rwl-composer-locked' : '') + '">' +
                '<textarea class="rwl-composer-input" rows="1" maxlength="' + MAX_TEXT + '" placeholder="' + esc(locked ? t('You cannot send messages yet') : t('Message') + ' #' + channelName) + '"' + (locked ? ' disabled' : '') + '></textarea>' +
                '<button type="button" class="rwl-icon-btn" data-group-action="send" title="' + esc(t('Send')) + '"' + (locked ? ' disabled' : '') + '><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
            '</div><div class="rwl-composer-hint">' + esc(t('Enter to send, Shift + Enter for a new line.')) + '</div></div>';
        renderMessages(true);
        bind(element);
        if (social().decorateWindow) social().decorateWindow(element);
    }

    function renderMessages(toBottom) {
        var element = social().chatElement();
        var scroller = element.querySelector('.rwl-chat-scroll');
        if (!scroller || !state.current) return;
        var messages = state.current.messages;
        scroller.innerHTML = messages.length ? messages.map(function (message, index) { return messageHtml(message, messages[index - 1]); }).join('') : '<div class="rwl-center-empty">' + esc(t('No messages yet. Say hello!')) + '</div>';
        if (toBottom) scroller.scrollTop = scroller.scrollHeight;
    }

    function bind(element) {
        element.onclick = onClick;
        var picker = element.querySelector('[data-group-channel]');
        if (picker) picker.addEventListener('change', function () { if (state.current) open(state.current.id, picker.value); });
        var input = element.querySelector('.rwl-composer-input');
        if (!input) return;
        input.addEventListener('input', function () {
            input.style.height = 'auto';
            input.style.height = Math.min(160, input.scrollHeight) + 'px';
            announceTyping();
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                send();
            }
        });
    }

    function announceTyping() {
        var group = state.current;
        var now = Date.now();
        if (!group || now - state.typingSentAt < TYPING_SEND_MS) return;
        state.typingSentAt = now;
        var body = {};
        if (group.channelId && group.channelId !== 'general') body.channel_id = group.channelId;
        api('/groups/' + encodeURIComponent(group.id) + '/typing', { method: 'POST', body: body }).catch(function () {});
    }

    function typingText(entry) {
        var indicator = entry.indicator || {};
        if (indicator.mode && indicator.mode !== 'default' && (indicator.text || indicator.emoji)) return (indicator.emoji ? indicator.emoji + ' ' : '') + (indicator.text ? t(indicator.text) : '');
        return entry.username + ' ' + t('is typing...');
    }

    function renderTyping() {
        var element = social().chatElement();
        var box = element && element.querySelector('[data-group-typing]');
        if (!box) return;
        var now = Date.now();
        var active = Object.keys(state.typingUsers).filter(function (name) { return now - state.typingUsers[name].at < TYPING_SHOW_MS; });
        if (!active.length) {
            box.innerHTML = '';
            return;
        }
        box.innerHTML = '<span class="rwl-typing-dots"><i></i><i></i><i></i></span>' + active.slice(0, 3).map(function (name) {
            return '<span translate="no">' + esc(typingText(state.typingUsers[name])) + '</span>';
        }).join(' · ');
        clearTimeout(state.typingTimer);
        state.typingTimer = setTimeout(renderTyping, 1000);
    }

    function setReply(message) {
        var group = state.current;
        if (!group) return;
        group.replyTo = message ? { id: message.id, author: message.mine ? (myName() || t('You')) : (message.sender || t('Former member')), text: message.plain && message.plain.ok ? message.plain.text.replace(/\s+/g, ' ').slice(0, 120) : '' } : null;
        var bar = social().chatElement().querySelector('[data-group-reply]');
        if (!bar) return;
        if (!group.replyTo) {
            bar.hidden = true;
            bar.innerHTML = '';
            return;
        }
        bar.hidden = false;
        bar.innerHTML = '<span translate="no">' + esc(t('Replying to')) + ' <strong>' + esc(group.replyTo.author) + '</strong>: ' + esc(group.replyTo.text) + '</span><button type="button" class="rwl-icon-btn" data-group-tool="cancel_reply" title="' + esc(t('Cancel reply')) + '">✕</button>';
        var input = social().chatElement().querySelector('.rwl-composer-input');
        if (input) input.focus();
    }

    async function toggleReaction(messageId, emoji) {
        try {
            await api('/groups/messages/' + encodeURIComponent(messageId) + '/react', { method: 'POST', body: { emoji: emoji } });
        } catch (error) {
            notify(error.message || t('The reaction could not be saved.'), 'error');
        }
    }

    function showReactionMenu(anchor, messageId) {
        var existing = document.querySelector('.rwl-reaction-menu');
        if (existing) existing.remove();
        var menu = document.createElement('div');
        menu.className = 'rwl-reaction-menu';
        menu.innerHTML = REACTION_CHOICES.map(function (emoji) { return '<button type="button" data-pick="' + esc(emoji) + '">' + esc(emoji) + '</button>'; }).join('');
        document.body.appendChild(menu);
        var rect = anchor.getBoundingClientRect();
        menu.style.top = Math.max(8, Math.min(global.innerHeight - menu.offsetHeight - 8, rect.top - menu.offsetHeight - 6)) + 'px';
        menu.style.left = Math.max(8, Math.min(global.innerWidth - menu.offsetWidth - 8, rect.left - 80)) + 'px';
        menu.addEventListener('click', function (event) {
            var pick = event.target.closest('[data-pick]');
            if (!pick) return;
            menu.remove();
            toggleReaction(messageId, pick.getAttribute('data-pick'));
        });
        setTimeout(function () {
            document.addEventListener('click', function close(event) {
                if (!menu.contains(event.target)) {
                    menu.remove();
                    document.removeEventListener('click', close, true);
                }
            }, true);
        }, 0);
    }

    async function editMessage(message) {
        var group = state.current;
        var value = await promptDialog({ title: t('Edit message'), value: message.plain.text, maxLength: MAX_TEXT, pattern: /^[\s\S]{1,4000}$/, invalid: t('The message is too long.'), confirm: t('Save') });
        if (value === null || value === message.plain.text) return;
        try {
            var sealed = await encryptText(group.id, group.detail.key_version, value);
            await api('/groups/messages/' + encodeURIComponent(message.id) + '/edit', { method: 'POST', body: { ciphertext: sealed.ciphertext, iv: sealed.iv, key_version: group.detail.key_version } });
        } catch (error) {
            notify(error.message || t('The message could not be edited.'), 'error');
        }
    }

    async function pinMessage(message) {
        try {
            await api('/groups/messages/' + encodeURIComponent(message.id) + '/pin', { method: 'POST', body: { pinned: !message.pinned } });
        } catch (error) {
            notify(error.message || t('The message could not be pinned.'), 'error');
        }
    }

    async function send() {
        var group = state.current;
        var element = social().chatElement();
        var input = element.querySelector('.rwl-composer-input');
        if (!group || !input) return;
        var text = input.value.trim();
        if (!text) return;
        if (text.length > MAX_TEXT) {
            notify(t('The message is too long.'), 'error');
            return;
        }
        input.disabled = true;
        try {
            var sealed = await encryptText(group.id, group.detail.key_version, text);
            var body = { ciphertext: sealed.ciphertext, iv: sealed.iv, key_version: group.detail.key_version };
            if (group.channelId && group.channelId !== 'general') body.channel_id = group.channelId;
            if (group.replyTo) body.reply_to = group.replyTo.id;
            var result = await api('/groups/' + encodeURIComponent(group.id) + '/messages', { method: 'POST', body: body });
            setReply(null);
            input.value = '';
            input.style.height = 'auto';
            await addMessage(result.message);
        } catch (error) {
            notify(error.message || t('The message could not be sent.'), 'error');
            if (error.status === 409) open(group.id, group.channelId);
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    async function addMessage(message) {
        var group = state.current;
        if (!group || group.byId[message.id]) return;
        if ((message.channel_id || 'general') !== (group.channelId || 'general')) return;
        message.plain = await decryptMessage(group.id, message);
        group.messages.push(message);
        group.byId[message.id] = message;
        var scroller = social().chatElement().querySelector('.rwl-chat-scroll');
        var nearBottom = !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
        renderMessages(nearBottom);
        if (!message.mine && social().bumpBubble) social().bumpBubble();
    }

    function markRead() {
        if (!state.current || document.visibilityState !== 'visible') return;
        api('/groups/' + encodeURIComponent(state.current.id) + '/read', { method: 'POST' }).catch(function () {});
    }

    async function deleteMessage(messageId, scope) {
        var question = scope === 'me' ? t('Delete this message only for you? The other members still see it.') : t('Delete this message for everyone?');
        if (!(await confirmDialog(t('Delete Message'), question, true))) return;
        try {
            await api('/groups/messages/' + encodeURIComponent(messageId) + '/delete', { method: 'POST', body: { scope: scope } });
            removeMessage(messageId);
        } catch (error) {
            notify(error.message, 'error');
        }
    }

    function removeMessage(messageId) {
        var group = state.current;
        if (!group) return;
        delete group.byId[messageId];
        group.messages = group.messages.filter(function (message) { return message.id !== messageId; });
        renderMessages(false);
    }

    function panelElement() {
        return social().chatElement().querySelector('.rwl-chat-list');
    }

    function showMembers() {
        var detail = state.current.detail;
        var panel = panelElement();
        if (!panel) return;
        if (!panel.hidden && panel.dataset.mode === 'members') {
            panel.hidden = true;
            return;
        }
        panel.dataset.mode = 'members';
        panel.hidden = false;
        var manage = detail.permissions.can_manage;
        var html = '<div class="rwl-chat-list-head"><strong>' + esc(t('Members')) + '</strong>' + (manage ? '<button type="button" class="rwl-btn rwl-btn-secondary" data-group-action="rename">' + esc(t('Rename')) + '</button>' : '') + '</div>';
        html += detail.members.map(function (member) {
            var kick = manage && member.role !== 'owner' ? '<button type="button" class="rwl-btn rwl-btn-danger" data-group-action="kick" data-member="' + esc(member.username) + '">' + esc(t('Remove')) + '</button>' : '';
            return '<div class="rwl-chat-list-row"><span class="rwl-center-avatar">' + social().avatarHtml(member, 'rwl-center-img', true, true) + '</span><span class="rwl-chat-list-name" translate="no" style="' + esc(social().nameStyle(member)) + '">' + esc(member.username) + '</span><span class="rwl-chat-list-meta">' + esc(member.role === 'owner' ? t('Owner') : t('Member')) + (member.has_key ? '' : ' · ' + esc(t('waiting for key'))) + '</span>' + kick + '</div>';
        }).join('');
        if (manage) html += '<label class="rwl-group-toggle"><input type="checkbox" data-group-toggle="members_can_invite"' + (detail.members_can_invite ? ' checked' : '') + '> ' + esc(t('Members can create invite links')) + '</label>';
        html += '<div class="rwl-group-actions"><button type="button" class="rwl-btn rwl-btn-secondary" data-group-action="leave">' + esc(t('Leave Server')) + '</button>' + (manage ? '<button type="button" class="rwl-btn rwl-btn-danger" data-group-action="delete">' + esc(t('Delete Server')) + '</button>' : '') + '</div>';
        panel.innerHTML = html;
        var toggle = panel.querySelector('[data-group-toggle]');
        if (toggle) toggle.addEventListener('change', async function () {
            try {
                await api('/groups/' + encodeURIComponent(detail.group_id), { method: 'PUT', body: { members_can_invite: toggle.checked } });
                detail.members_can_invite = toggle.checked;
            } catch (error) {
                toggle.checked = !toggle.checked;
                notify(error.message, 'error');
            }
        });
    }

    function inviteLink(code) {
        var base = global.location.origin + global.location.pathname.replace(/\/sites\/[^\/]*$/, '/').replace(/[^\/]*$/, '');
        return base + 'index.html?group_invite=' + encodeURIComponent(code);
    }

    async function showInvites() {
        var detail = state.current.detail;
        var panel = panelElement();
        if (!panel) return;
        panel.dataset.mode = 'invites';
        panel.hidden = false;
        var html = '<div class="rwl-chat-list-head"><strong>' + esc(t('Invite Links')) + '</strong></div>' +
            '<div class="rwl-group-invite-form"><select data-invite-hours><option value="1">' + esc(t('1 hour')) + '</option><option value="24">' + esc(t('1 day')) + '</option><option value="168" selected>' + esc(t('7 days')) + '</option><option value="720">' + esc(t('30 days')) + '</option></select>' +
            '<select data-invite-uses><option value="0">' + esc(t('Unlimited uses')) + '</option><option value="1">1</option><option value="5">5</option><option value="10">10</option><option value="25">25</option><option value="100">100</option></select>' +
            '<button type="button" class="rwl-btn" data-group-action="invite_create">' + esc(t('Create Link')) + '</button></div>';
        html += (detail.invites || []).map(function (invite) {
            return '<div class="rwl-chat-list-row"><code class="rwl-invite-code" translate="no">' + esc(invite.code) + '</code><span class="rwl-chat-list-meta">' + invite.uses + '/' + (invite.max_uses || '∞') + '</span><button type="button" class="rwl-btn rwl-btn-secondary" data-group-action="invite_copy" data-code="' + esc(invite.code) + '">' + esc(t('Copy Link')) + '</button><button type="button" class="rwl-btn rwl-btn-danger" data-group-action="invite_revoke" data-code="' + esc(invite.code) + '">' + esc(t('Revoke')) + '</button></div>';
        }).join('') || '<div class="rwl-center-empty">' + esc(t('No active invite links.')) + '</div>';
        panel.innerHTML = html;
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            notify(t('Copied.'), 'success');
        } catch (error) {
            notify(text, 'info');
        }
    }

    async function onClick(event) {
        var group = state.current;
        if (!group) return;
        var tool = event.target.closest('[data-group-tool]');
        if (tool) {
            var row = tool.closest('[data-message-id]');
            var messageId = row && row.getAttribute('data-message-id');
            var name = tool.getAttribute('data-group-tool');
            if (name === 'copy' && group.byId[messageId]) copyText(group.byId[messageId].plain.text);
            else if (name === 'delete') deleteMessage(messageId, 'everyone');
            else if (name === 'delete_me') deleteMessage(messageId, 'me');
            else if (name === 'reply' && group.byId[messageId]) setReply(group.byId[messageId]);
            else if (name === 'cancel_reply') setReply(null);
            else if (name === 'react') showReactionMenu(tool, messageId);
            else if (name === 'edit' && group.byId[messageId]) editMessage(group.byId[messageId]);
            else if (name === 'pin' && group.byId[messageId]) pinMessage(group.byId[messageId]);
            return;
        }
        var reactButton = event.target.closest('[data-group-react]');
        if (reactButton) {
            var reactRow = reactButton.closest('[data-message-id]');
            if (reactRow) toggleReaction(reactRow.getAttribute('data-message-id'), reactButton.getAttribute('data-group-react'));
            return;
        }
        var jump = event.target.closest('[data-reply-jump]');
        if (jump) {
            var targetRow = social().chatElement().querySelector('[data-message-id="' + jump.getAttribute('data-reply-jump') + '"]');
            if (targetRow) targetRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
        }
        var chatAction = event.target.closest('[data-chat-action]');
        if (chatAction) {
            var chatName = chatAction.getAttribute('data-chat-action');
            if (chatName === 'labcord') {
                openLabcord();
                return;
            }
            if (chatName === 'switch_dm') social().openChat(chatAction.getAttribute('data-channel'));
            else if (chatName === 'switch_group') open(chatAction.getAttribute('data-group'));
            else if (chatName === 'group_new') create();
            else if (chatName === 'group_join') join();
            return;
        }
        var button = event.target.closest('[data-group-action]');
        if (!button) return;
        var action = button.getAttribute('data-group-action');
        var detail = group.detail;
        try {
            if (action === 'close') social().closeChat();
            else if (action === 'minimize') social().minimize();
            else if (action === 'list') social().showChatList();
            else if (action === 'send') send();
            else if (action === 'labcord') openLabcord(group.id, group.channelId);
            else if (action === 'members') showMembers();
            else if (action === 'invite') showInvites();
            else if (action === 'invite_create') {
                var panel = panelElement();
                var created = await api('/groups/' + encodeURIComponent(group.id) + '/invites', { method: 'POST', body: { hours: parseInt(panel.querySelector('[data-invite-hours]').value, 10), max_uses: parseInt(panel.querySelector('[data-invite-uses]').value, 10) } });
                await copyText(inviteLink(created.code));
                detail.invites = [{ code: created.code, uses: 0, max_uses: created.max_uses, expires_at: created.expires_at }].concat(detail.invites || []);
                showInvites();
            } else if (action === 'invite_copy') copyText(inviteLink(button.getAttribute('data-code')));
            else if (action === 'invite_revoke') {
                await api('/groups/invites/' + encodeURIComponent(button.getAttribute('data-code')), { method: 'DELETE' });
                detail.invites = (detail.invites || []).filter(function (invite) { return invite.code !== button.getAttribute('data-code'); });
                showInvites();
            } else if (action === 'clear') {
                if (await confirmDialog(t('Clear Chat'), t('Delete every message of this server for all members?'), true)) {
                    await api('/groups/' + encodeURIComponent(group.id) + '/clear', { method: 'POST' });
                    open(group.id, group.channelId);
                }
            } else if (action === 'kick') {
                var member = button.getAttribute('data-member');
                if (await confirmDialog(t('Remove Member'), t('Remove this member from the server? The server key is renewed.'), true)) {
                    await api('/groups/' + encodeURIComponent(group.id) + '/kick', { method: 'POST', body: { username: member } });
                    open(group.id, group.channelId);
                }
            } else if (action === 'leave') {
                if (await confirmDialog(t('Leave Server'), t('Leave this server?'), true)) {
                    await api('/groups/' + encodeURIComponent(group.id) + '/leave', { method: 'POST' });
                    state.listAt = 0;
                    social().closeChat();
                }
            } else if (action === 'delete') {
                if (await confirmDialog(t('Delete Server'), t('Delete this server and every message for all members?'), true)) {
                    await api('/groups/' + encodeURIComponent(group.id), { method: 'DELETE' });
                    state.listAt = 0;
                    social().closeChat();
                }
            } else if (action === 'rename') {
                var name = await promptDialog({ title: t('Rename Server'), value: detail.name, maxLength: 60, pattern: /^.{2,60}$/, invalid: t('Use 2 to 60 characters.'), confirm: t('Save') });
                if (name) {
                    await api('/groups/' + encodeURIComponent(group.id), { method: 'PUT', body: { name: name } });
                    open(group.id, group.channelId);
                }
            }
        } catch (error) {
            notify(error.message || t('The action failed.'), 'error');
        }
    }

    async function create() {
        var crypto = cryptoApi();
        if (!crypto || !(await crypto.ensureVault())) return;
        var name = await promptDialog({ title: t('Create Server'), text: t('Servers are end to end encrypted. Invite members with a link after creating the server.'), placeholder: t('Server name'), maxLength: 60, pattern: /^.{2,60}$/, invalid: t('Use 2 to 60 characters.'), confirm: t('Create') });
        if (!name) return;
        try {
            var created = await api('/groups', { method: 'POST', body: { name: name, members_can_invite: true, wraps: [] } });
            state.listAt = 0;
            open(created.group_id);
        } catch (error) {
            notify(error.message || t('The server could not be created.'), 'error');
        }
    }

    async function join(prefilled) {
        var crypto = cryptoApi();
        if (!crypto || !(await crypto.ensureVault())) return;
        var code = prefilled || await promptDialog({ title: t('Join Server'), text: t('Enter the invite code or paste the invite link.'), placeholder: 'AbCdEf1234', maxLength: 300, confirm: t('Continue') });
        if (!code) return;
        var match = /group_invite=([A-Za-z0-9]{6,24})/.exec(code);
        code = match ? match[1] : code.replace(/[^A-Za-z0-9]/g, '');
        try {
            var preview = await api('/groups/invites/' + encodeURIComponent(code));
            if (preview.already_member) {
                open(preview.group_id);
                return;
            }
            if (preview.full) {
                notify(t('This server is full.'), 'error');
                return;
            }
            if (!(await confirmDialog(t('Join Server'), t('Join') + ' "' + preview.name + '" (' + preview.member_count + ' ' + t('members') + ')?', false))) return;
            var joined = await api('/groups/join', { method: 'POST', body: { code: code } });
            state.listAt = 0;
            open(joined.group_id);
        } catch (error) {
            notify(error.message || t('This invite is invalid or expired'), 'error');
        }
    }

    async function onEvent(event) {
        var entry = event.detail || {};
        if (entry.type === 'labcord_updated') {
            if (state.current && entry.group_id === state.current.id) open(entry.group_id, state.current.channelId).catch(function () {});
            return;
        }
        if (!entry.type || entry.type.indexOf('group') !== 0) return;
        state.listAt = 0;
        var viewing = state.current && entry.group_id === state.current.id;
        if (entry.type === 'group_message') {
            if (viewing) {
                await addMessage(entry.message);
                markRead();
            } else if (entry.from && global.RWLSocialNotify && global.RWLSocialNotify.popup) {
                global.RWLSocialNotify.popup({ title: entry.from.username, body: t('Sent an encrypted message in a server'), picture: entry.from.profile_picture, icon: '👥', onOpen: function () { open(entry.group_id); } });
            }
        } else if (entry.type === 'group_message_delete' || entry.type === 'group_message_hidden') {
            if (viewing) removeMessage(entry.message_id);
        } else if (entry.type === 'group_message_edit') {
            if (viewing && state.current.byId[entry.message.id]) {
                var message = entry.message;
                message.plain = await decryptMessage(state.current.id, message);
                var index = state.current.messages.findIndex(function (row) { return row.id === message.id; });
                if (index >= 0) state.current.messages[index] = message;
                state.current.byId[message.id] = message;
                renderMessages(false);
            }
        } else if (entry.type === 'group_reaction' || entry.type === 'group_pin') {
            if (viewing && state.current.byId[entry.message_id]) {
                var target = state.current.byId[entry.message_id];
                if (entry.type === 'group_reaction') target.reactions = entry.reactions || [];
                else target.pinned = !!entry.pinned;
                renderMessages(false);
            }
        } else if (entry.type === 'group_typing') {
            if (viewing && (entry.channel_id || 'general') === (state.current.channelId || 'general')) {
                state.typingUsers[entry.username] = { at: Date.now(), indicator: entry.indicator || null, username: entry.username };
                renderTyping();
            }
        } else if (entry.type === 'group_key_request' || entry.type === 'group_member_left') {
            var crypto = cryptoApi();
            if (!crypto || !crypto.ready()) return;
            try {
                var detail = await load(entry.group_id);
                if (viewing) {
                    state.current.detail = detail;
                    render();
                }
            } catch (error) {}
        } else if (entry.type === 'group_keys' || entry.type === 'group_member_joined' || entry.type === 'group_updated' || entry.type === 'group_cleared') {
            if (viewing) open(entry.group_id, state.current.channelId);
        } else if (entry.type === 'group_removed' || entry.type === 'group_deleted') {
            if (viewing) {
                social().closeChat();
                notify(entry.type === 'group_removed' ? t('You were removed from the server.') : t('The server was deleted.'), 'info');
            }
        }
    }

    function deepLink() {
        var match = /[?&]group_invite=([A-Za-z0-9]{6,24})/.exec(global.location.search);
        if (!match || !RWL.getToken()) return;
        setTimeout(function () { join(match[1]); }, 900);
    }

    global.RWLGroups = { list: list, open: open, create: create, join: join, current: current, detach: detach, openLabcord: openLabcord, labcordUrl: labcordUrl, detail: function () { return state.current ? state.current.detail : null; }, channelId: function () { return state.current ? state.current.channelId : null; }, showMembers: showMembers, showInvites: showInvites };
    global.addEventListener('rwl-social-event', onEvent);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', deepLink);
    else deepLink();
})(window);
