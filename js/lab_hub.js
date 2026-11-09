(function (global) {
    if (!global.RWL) return;

    var esc = RWL.escapeHtml;
    var TABS = ['overview', 'leaderboard', 'crates', 'companion', 'lab', 'card', 'codes', 'invites', 'bugs'];
    var BOARDS = [['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time'], ['pass', 'Lab Pass Level']];
    var REWARD_LABELS = { lab_coins: 'Lab Coins', xp: 'XP', research: 'Research', chest: 'Mystery Chests', cosmetic: 'Random Cosmetic' };
    var REWARD_ICONS = { lab_coins: '💰', xp: '⭐', research: '🧪', chest: '🎁', cosmetic: '✨' };
    var TARGET_LABELS = { lab_pass: 'Lab Pass XP', discord_xp: 'Discord XP', activity: 'Activity Points', idle_lab: 'Idle Lab Research', companion: 'Companion XP' };
    var METRIC_LABELS = { any: 'Any activity', use_tool: 'Using tools', launch_tools: 'Starting tools', login: 'Daily logins', customize_profile: 'Profile changes', apply_theme: 'Applying themes', add_friend: 'New friendships', bazaar_purchase: 'Bazaar purchases', bazaar_sale: 'Bazaar sales', bazaar_trade: 'Bazaar trades', forum_post: 'Forum posts', review: 'Reviews', idle_collect: 'Idle Lab collections', companion_care: 'Companion care' };
    var MOOD_LABELS = { curious: 'Curious', ecstatic: 'Ecstatic', happy: 'Happy', bored: 'Bored', sleepy: 'Sleepy' };
    var CARE_LABELS = { feed: 'Feed', pet: 'Pet', play: 'Play' };
    var CARE_TITLES = { feed: 'Feed your companion', pet: 'Pet your companion', play: 'Play with your companion' };
    var CARE_ICONS = { feed: '🍪', pet: '🤚', play: '🎾' };
    var BUG_STATUS = { open: 'Submitted', confirmed: 'Confirmed', resolved: 'Resolved', rejected: 'Rejected', duplicate: 'Duplicate' };
    var REFERRAL_STATUS = { active: 'Waiting', kept: 'Yours forever', left_early: 'Removed', revoked: 'Revoked' };
    var CODE_PATTERN = /^[A-Za-z0-9-]{3,40}$/;
    var NAME_PATTERN = /^[0-9A-Za-zÀ-ÖØ-öø-ÿ' \-]{2,24}$/;
    var CLICK_FLUSH_MS = 2500;
    var MAX_CLICK_BATCH = 60;
    var state = { hub: null, tab: 'overview', board: 'week', boards: {}, lab: null, labTicker: null, cooldownTicker: null, pendingClicks: 0, clickTimer: null, clickBusy: false, cardBlob: null, cardUrl: null, busy: false, companionDraft: null, adoptDraft: null };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function api(path, options) {
        return RWL.apiRequest('/api/growth' + path, options);
    }

    function requireLogin() {
        global.location.href = './login_register.html?tab=login';
    }

    function toast(message, type) {
        if (global.RWLSocialNotify && global.RWLSocialNotify.popup) global.RWLSocialNotify.popup({ title: 'Lab Hub', body: message, icon: type === 'error' ? '⚠️' : '✅' });
        else if (global.RWLDialog) global.RWLDialog.alert({ title: 'Lab Hub', message: message });
    }

    function failure(error, fallback) {
        if (error && error.status === 401) {
            requireLogin();
            return;
        }
        toast((error && error.message) || fallback, 'error');
    }

    function confirmDialog(title, message) {
        if (global.RWLDialog && global.RWLDialog.confirm) return global.RWLDialog.confirm({ title: title, message: message, confirmText: t('Confirm') });
        return Promise.resolve(global.confirm(message));
    }

    function wait(milliseconds) {
        return new Promise(function (resolve) { setTimeout(resolve, milliseconds); });
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    function formatDate(value) {
        if (!value) return '-';
        var date = new Date(value);
        return isNaN(date.getTime()) ? '-' : date.toLocaleString();
    }

    function formatDuration(seconds) {
        var total = Math.max(0, Math.floor(seconds));
        var hours = Math.floor(total / 3600);
        var minutes = Math.floor((total % 3600) / 60);
        var rest = total % 60;
        if (hours) return hours + 'h ' + minutes + 'm';
        return minutes + 'm ' + (rest < 10 ? '0' : '') + rest + 's';
    }

    function pictureUrl(path) {
        if (!path) return '';
        return /^https?:\/\//.test(path) ? path : RWL.apiUrl(path);
    }

    function initials(name) {
        return String(name || '?').trim().slice(0, 2).toUpperCase() || '?';
    }

    function markInvalid(input) {
        if (!input) return;
        input.classList.add('lh-invalid');
        input.focus();
        input.addEventListener('input', function clear() {
            input.classList.remove('lh-invalid');
            input.removeEventListener('input', clear);
        });
    }

    function companionSvg(companion, size) {
        if (global.RWLGrowth && global.RWLGrowth.companionSvg) return global.RWLGrowth.companionSvg(companion, size);
        return '<span class="lh-svg-placeholder" style="width:' + (size || 72) + 'px;height:' + (size || 72) + 'px"></span>';
    }

    function metric(label, value, hint) {
        return '<div class="lh-metric"' + (hint ? ' title="' + esc(hint) + '"' : '') + '><span class="lh-metric-value">' + esc(value) + '</span><span class="lh-metric-label">' + esc(label) + '</span></div>';
    }

    function progressBar(value, maximum, extraClass) {
        var percent = maximum > 0 ? Math.max(0, Math.min(100, Math.round(value * 100 / maximum))) : 0;
        return '<div class="lh-progress ' + (extraClass || '') + '"><span style="width:' + percent + '%"></span></div>';
    }

    function section(title, inner, extraClass, hint) {
        return '<section class="lh-card lh-section ' + (extraClass || '') + '"><h2 class="lh-section-title">' + esc(title) + '</h2>' + (hint ? '<p class="lh-section-hint">' + esc(hint) + '</p>' : '') + inner + '</section>';
    }

    function empty(text) {
        return '<div class="lh-empty">' + esc(text) + '</div>';
    }

    function renderStats() {
        var activity = (state.hub && state.hub.activity) || {};
        byId('lhWeekPoints').textContent = formatNumber(activity.points_week);
        byId('lhCrateCount').textContent = formatNumber(activity.crates_available);
        byId('lhResearch').textContent = formatNumber(Math.floor(state.lab ? state.lab.research : 0));
    }

    async function loadHub(silent) {
        try {
            state.hub = await api('/hub');
            state.lab = state.hub.lab;
        } catch (error) {
            if (error && error.status === 401) {
                requireLogin();
                return;
            }
            if (!silent) byId('lhContent').innerHTML = '<div class="lh-card">' + empty((error && error.message) || 'The Lab Hub could not be loaded. Please try again later.') + '</div>';
            return;
        }
        renderStats();
        if (!silent) renderTab();
    }

    function selectTab(tab) {
        if (TABS.indexOf(tab) < 0) tab = 'overview';
        if (state.tab === 'lab' && tab !== 'lab') flushClicks();
        state.tab = tab;
        document.querySelectorAll('#lhTabs .lh-tab').forEach(function (button) {
            var active = button.getAttribute('data-tab') === tab;
            button.classList.toggle('active', active);
            if (active && button.scrollIntoView) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
        try { global.history.replaceState(null, '', '#' + tab); } catch (error) {}
        renderTab();
    }

    function stopTickers() {
        clearInterval(state.labTicker);
        clearInterval(state.cooldownTicker);
        state.labTicker = null;
        state.cooldownTicker = null;
    }

    function renderTab() {
        stopTickers();
        if (!state.hub) return;
        var content = byId('lhContent');
        var renderers = { overview: renderOverview, leaderboard: renderLeaderboard, crates: renderCrates, companion: renderCompanion, lab: renderLab, card: renderCard, codes: renderCodes, invites: renderInvites, bugs: renderBugs };
        (renderers[state.tab] || renderOverview)(content);
    }

    function eventCard(event) {
        var targets = (event.targets || []).map(function (target) { return '<span class="lh-chip">' + esc(TARGET_LABELS[target] || target) + '</span>'; }).join('');
        var rows = [];
        if (event.recurrence === 'weekends') rows.push('<div class="lh-event-time">Every weekend</div>');
        if (event.starts_at) rows.push('<div class="lh-event-time"><span>Starts</span><b>' + esc(formatDate(event.starts_at)) + '</b></div>');
        if (event.ends_at) rows.push('<div class="lh-event-time"><span>Ends</span><b>' + esc(formatDate(event.ends_at)) + '</b></div>');
        return '<article class="lh-event' + (event.active ? ' active' : '') + '">' +
            '<div class="lh-event-head"><span class="lh-event-multiplier">' + esc(String(event.multiplier)) + 'x</span><div class="lh-event-name"><strong translate="no">' + esc(event.name) + '</strong>' + (event.active ? '<span class="lh-badge lh-badge-live">Live Now</span>' : '<span class="lh-badge">Upcoming</span>') + '</div></div>' +
            (event.description ? '<p class="lh-event-desc" translate="no">' + esc(event.description) + '</p>' : '') +
            '<div class="lh-chips">' + targets + '</div>' + rows.join('') +
        '</article>';
    }

    function goalCard(goal) {
        var done = !!goal.completed_at;
        var badge = done ? '<span class="lh-badge lh-badge-done">Completed</span>' : (goal.running ? '<span class="lh-badge lh-badge-live">Running</span>' : '<span class="lh-badge">Upcoming</span>');
        return '<article class="lh-goal' + (done ? ' done' : '') + '">' +
            '<div class="lh-row-between"><strong translate="no">' + esc(goal.name) + '</strong>' + badge + '</div>' +
            (goal.description ? '<p class="lh-event-desc" translate="no">' + esc(goal.description) + '</p>' : '') +
            '<div class="lh-row-between lh-goal-meta"><span>' + esc(METRIC_LABELS[goal.metric] || goal.metric) + '</span><span>' + formatNumber(Math.min(goal.progress, goal.target)) + ' / ' + formatNumber(goal.target) + '</span></div>' +
            progressBar(goal.progress, goal.target, done ? 'lh-progress-done' : '') +
            (goal.reward_crates ? '<div class="lh-note">Reward for every contributor: ' + formatNumber(goal.reward_crates) + ' Experiment Crates</div>' : '') +
        '</article>';
    }

    function renderOverview(content) {
        var activity = state.hub.activity || {};
        var events = state.hub.events || [];
        var goals = state.hub.goals || [];
        var crateGoal = Math.max(1, activity.crate_points || 1);
        var activityHtml = '<div class="lh-metrics">' +
                metric('Points Today', formatNumber(activity.points_today)) +
                metric('This Week', formatNumber(activity.points_week)) +
                metric('This Month', formatNumber(activity.points_month)) +
                metric('All Time', formatNumber(activity.points_total)) +
                metric('Daily Limit', formatNumber(activity.daily_cap), 'You can earn this many activity points per day') +
                metric('Crates Opened', formatNumber(activity.crates_opened)) +
            '</div>' +
            '<div class="lh-crate-progress">' +
                '<div class="lh-row-between"><span>Next Experiment Crate</span><span>' + formatNumber(activity.crate_progress) + ' / ' + formatNumber(crateGoal) + '</span></div>' +
                progressBar(activity.crate_progress || 0, crateGoal) +
                (activity.pending_points ? '<div class="lh-note">' + formatNumber(activity.pending_points) + ' points are still being counted</div>' : '') +
            '</div>';
        content.innerHTML =
            section('Your Activity', activityHtml, '', 'Starting tools, chatting, trading and caring for your companion earns activity points. Activity points fill up Experiment Crates.') +
            section('Events', events.length ? '<div class="lh-event-list">' + events.map(eventCard).join('') + '</div>' : empty('No events are planned right now. Keep an eye on our Discord server!')) +
            section('Community Goals', goals.length ? '<div class="lh-goal-list">' + goals.map(goalCard).join('') + '</div>' : empty('There is no community goal running right now.'), '', 'Everyone works together. When the goal is reached, every contributor gets the reward.');
    }

    function renderLeaderboard(content) {
        content.innerHTML = '<section class="lh-card lh-section">' +
            '<div class="lh-row-between lh-wrap"><h2 class="lh-section-title">Leaderboard</h2><div class="lh-segment" id="lhBoards">' + BOARDS.map(function (board) {
                return '<button type="button" class="lh-segment-btn' + (board[0] === state.board ? ' active' : '') + '" data-board="' + board[0] + '" title="Show the ' + esc(board[1]) + ' leaderboard">' + esc(board[1]) + '</button>';
            }).join('') + '</div></div>' +
            '<div id="lhBoardBody">' + empty('Loading...') + '</div></section>';
        byId('lhBoards').addEventListener('click', function (event) {
            var button = event.target.closest('[data-board]');
            if (!button) return;
            state.board = button.getAttribute('data-board');
            byId('lhBoards').querySelectorAll('.lh-segment-btn').forEach(function (entry) { entry.classList.toggle('active', entry === button); });
            loadBoard();
        });
        loadBoard();
    }

    async function loadBoard() {
        var board = state.board;
        var cached = state.boards[board];
        if (!cached || Date.now() - cached.at > 60000) {
            try {
                cached = { at: Date.now(), data: await api('/leaderboard?board=' + encodeURIComponent(board)) };
                state.boards[board] = cached;
            } catch (error) {
                var failed = byId('lhBoardBody');
                if (failed && state.board === board) failed.innerHTML = empty('The leaderboard could not be loaded.');
                return;
            }
        }
        var body = byId('lhBoardBody');
        if (!body || state.board !== board || state.tab !== 'leaderboard') return;
        var data = cached.data || {};
        if (!data.enabled) {
            body.innerHTML = empty('The leaderboard is disabled right now.');
            return;
        }
        if (!data.entries || !data.entries.length) {
            body.innerHTML = empty('Nobody is on this leaderboard yet. Be the first!');
            return;
        }
        var unit = board === 'pass' ? 'Level' : 'Points';
        body.innerHTML = '<ol class="lh-board">' + data.entries.map(function (entry) {
            var picture = pictureUrl(entry.profile_picture);
            var avatar = picture ? '<img class="lh-avatar" src="' + esc(picture) + '" alt="" decoding="async" loading="lazy" data-initials="' + esc(initials(entry.username)) + '">' : '<span class="lh-avatar lh-avatar-fallback">' + esc(initials(entry.username)) + '</span>';
            var rank = entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : '#' + entry.rank;
            return '<li class="lh-board-row lh-rank-' + Math.min(entry.rank, 4) + '">' +
                '<span class="lh-rank">' + rank + '</span>' + avatar +
                '<span class="lh-board-name" translate="no" style="' + esc(RWL.nameColorStyle(entry, '#e0aaff')) + '">' + esc(entry.username) + '</span>' +
                (board !== 'pass' ? '<span class="lh-board-level" title="Lab Pass level">Lv ' + formatNumber(entry.pass_level) + '</span>' : '') +
                '<span class="lh-board-value"><b>' + formatNumber(entry.value) + '</b><small>' + unit + '</small></span>' +
            '</li>';
        }).join('') + '</ol>';
    }

    function crateSvg() {
        return '<svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true"><defs><linearGradient id="lhCrateGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9d4edd"/><stop offset="100%" stop-color="#3c096c"/></linearGradient></defs><path d="M20 44l40-20 40 20v44l-40 20-40-20z" fill="url(#lhCrateGrad)" stroke="#e0aaff" stroke-width="2"/><path d="M20 44l40 20 40-20M60 64v44" fill="none" stroke="#e0aaff" stroke-width="2"/><path d="M40 34l40 20" stroke="#f72585" stroke-width="5"/><circle cx="60" cy="64" r="7" fill="#ffd166" class="lh-crate-core"/><path d="M52 14l4 8M68 14l-4 8M60 10v10" stroke="#ffd166" stroke-width="2" stroke-linecap="round" class="lh-crate-spark"/></svg>';
    }

    function rewardText(reward) {
        if (!reward) return '';
        var label = REWARD_LABELS[reward.type] || reward.type;
        if (reward.type === 'cosmetic' && reward.item) {
            var color = RWL.sanitizeHex(RWL.rarityColor ? RWL.rarityColor(reward.item.rarity) : '#e0aaff', '#e0aaff');
            return '<span class="lh-reward-icon">' + REWARD_ICONS.cosmetic + '</span><strong>New Item</strong><span class="lh-reward-item" translate="no" style="color:' + color + '">' + esc(reward.item.name || reward.item.item_id || '') + '</span>';
        }
        return '<span class="lh-reward-icon">' + (REWARD_ICONS[reward.type] || '🎉') + '</span><strong>+' + formatNumber(reward.amount) + '</strong><span>' + esc(label) + '</span>' + (reward.note ? '<small>' + esc(reward.note) + '</small>' : '');
    }

    function renderCrates(content, reward) {
        var activity = state.hub.activity || {};
        var crates = state.hub.crates || {};
        var odds = crates.odds || [];
        var history = crates.history || [];
        var ready = activity.crates_available || 0;
        content.innerHTML =
            '<section class="lh-card lh-section lh-crate-stage">' +
                '<div class="lh-crate-visual' + (ready ? ' ready' : '') + '" id="lhCrateVisual">' + crateSvg() + '</div>' +
                '<div class="lh-crate-info">' +
                    '<h2 class="lh-section-title">Experiment Crates</h2>' +
                    '<p class="lh-section-hint">You earn one crate for every ' + formatNumber(activity.crate_points || 0) + ' activity points.</p>' +
                    '<div class="lh-metrics">' + metric('Ready To Open', formatNumber(ready)) + metric('Opened', formatNumber(activity.crates_opened)) + metric('Storage Limit', formatNumber(activity.max_crates), 'You can hold this many unopened crates') + '</div>' +
                    '<button type="button" class="lh-btn lh-btn-primary lh-btn-big" id="lhOpenCrate"' + (ready ? '' : ' disabled') + ' title="Open one Experiment Crate">Open Crate</button>' +
                    '<div class="lh-reward" id="lhCrateResult"' + (reward ? '' : ' hidden') + '>' + rewardText(reward) + '</div>' +
                '</div>' +
            '</section>' +
            section('Possible Rewards', odds.length ? '<div class="lh-table-wrap"><table class="lh-table"><thead><tr><th>Reward</th><th>Amount</th><th>Chance</th></tr></thead><tbody>' + odds.map(function (entry) {
                return '<tr><td>' + (REWARD_ICONS[entry.type] || '') + ' ' + esc(REWARD_LABELS[entry.type] || entry.type) + '</td><td>' + (entry.type === 'cosmetic' ? '1' : formatNumber(entry.min) + (entry.max > entry.min ? ' – ' + formatNumber(entry.max) : '')) + '</td><td>' + formatNumber(entry.chance_percent) + ' %</td></tr>';
            }).join('') + '</tbody></table></div>' : empty('No rewards are configured right now.'), '', 'Every chance is shown openly. XP needs a linked Discord account, otherwise you receive Lab Coins instead.') +
            section('Recent Crates', history.length ? '<ul class="lh-list">' + history.map(function (entry) {
                return '<li class="lh-list-row"><span>' + (REWARD_ICONS[entry.type] || '🎉') + ' ' + (entry.item ? '<b translate="no">' + esc(entry.item) + '</b>' : '<b>+' + formatNumber(entry.amount) + '</b> ' + esc(REWARD_LABELS[entry.type] || entry.type)) + '</span><small>' + esc(formatDate(entry.opened_at)) + '</small></li>';
            }).join('') + '</ul>' : empty('You have not opened any crates yet.'));
        byId('lhOpenCrate').addEventListener('click', function () { openCrate(this); });
    }

    async function openCrate(button) {
        if (state.busy) return;
        state.busy = true;
        button.disabled = true;
        var visual = byId('lhCrateVisual');
        if (visual) visual.classList.add('shaking');
        try {
            var result = await api('/crates/open', { method: 'POST' });
            await wait(900);
            state.hub.activity.crates_available = result.crates_available;
            state.hub.activity.crates_opened = (state.hub.activity.crates_opened || 0) + 1;
            state.hub.crates.history = result.history || [];
            renderStats();
            if (state.tab === 'crates') renderCrates(byId('lhContent'), result.reward);
            if (global.RWLGrowth && global.RWLGrowth.react) global.RWLGrowth.react('jump', t('Ooh, what was inside?'));
        } catch (error) {
            if (visual) visual.classList.remove('shaking');
            button.disabled = false;
            failure(error, t('The crate could not be opened.'));
        } finally {
            state.busy = false;
        }
    }

    function speciesPicker(selected, hue, mood) {
        var species = ((state.hub.companion || {}).catalog || {}).species || [];
        return '<div class="lh-species" id="lhSpecies">' + species.map(function (entry) {
            return '<button type="button" class="lh-species-card' + (entry.key === selected ? ' active' : '') + '" data-species="' + esc(entry.key) + '" title="' + esc(entry.name) + '">' + companionSvg({ species: entry.key, hue: hue, mood: mood || 'happy', equipped: [] }, 64) + '<span translate="no">' + esc(entry.name) + '</span></button>';
        }).join('') + '</div>';
    }

    function bindSpecies(onPick) {
        var picker = byId('lhSpecies');
        if (!picker) return;
        picker.addEventListener('click', function (event) {
            var card = event.target.closest('[data-species]');
            if (card) onPick(card.getAttribute('data-species'));
        });
    }

    function renderCompanion(content) {
        var data = state.hub.companion || {};
        var catalog = data.catalog || {};
        if (!catalog.enabled) {
            content.innerHTML = '<section class="lh-card lh-section">' + empty('Your companion is resting right now. Please come back later.') + '</section>';
            return;
        }
        if (!data.adopted) renderAdoption(content, catalog);
        else renderCompanionView(content, data);
    }

    function renderAdoption(content, catalog) {
        var draft = state.adoptDraft || (state.adoptDraft = { species: ((catalog.species || [])[0] || {}).key || 'blob', name: '' });
        content.innerHTML = '<section class="lh-card lh-section lh-companion">' +
            '<div class="lh-companion-stage">' + companionSvg({ species: draft.species, hue: 270, mood: 'happy', equipped: [] }, 160) + '</div>' +
            '<div class="lh-companion-info">' +
                '<h2 class="lh-section-title">Adopt A Lab Companion</h2>' +
                '<p class="lh-section-hint">Your companion lives in the launcher, reacts when you start tools, levels up with you and unlocks decorations along the way.</p>' +
                speciesPicker(draft.species, 270, 'happy') +
                '<label class="lh-field"><span>Name</span><input type="text" class="lh-input" id="lhAdoptName" maxlength="24" placeholder="Give your companion a name" value="' + esc(draft.name) + '"></label>' +
                '<button type="button" class="lh-btn lh-btn-primary" id="lhAdoptBtn" title="Adopt this companion">Adopt Companion</button>' +
            '</div></section>';
        bindSpecies(function (key) {
            draft.species = key;
            draft.name = byId('lhAdoptName').value;
            renderAdoption(content, catalog);
        });
        byId('lhAdoptName').addEventListener('input', function () { draft.name = this.value; });
        byId('lhAdoptBtn').addEventListener('click', async function () {
            var button = this;
            var input = byId('lhAdoptName');
            var name = input.value.trim();
            if (!NAME_PATTERN.test(name)) {
                markInvalid(input);
                return;
            }
            button.disabled = true;
            try {
                var result = await api('/companion/adopt', { method: 'POST', body: { species: draft.species, name: name } });
                state.hub.companion = result;
                state.adoptDraft = null;
                state.companionDraft = null;
                if (global.RWLGrowth && global.RWLGrowth.setCompanion) global.RWLGrowth.setCompanion(result);
                renderTab();
                toast(t('Welcome to the lab, little one!'));
            } catch (error) {
                button.disabled = false;
                failure(error, t('The companion could not be adopted.'));
            }
        });
    }

    function companionDraft(companion) {
        if (!state.companionDraft) state.companionDraft = { name: companion.name, species: companion.species, hue: companion.hue, equipped: (companion.equipped || []).slice() };
        return state.companionDraft;
    }

    function renderCompanionView(content, data) {
        var companion = data.companion;
        var catalog = data.catalog;
        var draft = companionDraft(companion);
        var perLevel = Math.max(1, catalog.xp_per_level || 1);
        var maxed = companion.level >= catalog.max_level;
        var unlocked = companion.unlocked || [];
        var decorations = (catalog.decorations || []).map(function (entry) {
            var open = unlocked.indexOf(entry.key) >= 0;
            var active = draft.equipped.indexOf(entry.key) >= 0;
            return '<button type="button" class="lh-deco' + (active ? ' active' : '') + (open ? '' : ' locked') + '" data-deco="' + esc(entry.key) + '"' + (open ? '' : ' disabled') + ' title="' + esc(open ? entry.name : 'Unlocks at level ' + entry.level) + '">' + companionSvg({ species: draft.species, hue: draft.hue, mood: 'happy', equipped: [entry.key] }, 54) + '<span>' + esc(entry.name) + '</span>' + (open ? '' : '<small>Level ' + entry.level + '</small>') + '</button>';
        }).join('');
        content.innerHTML =
            '<section class="lh-card lh-section lh-companion">' +
                '<div class="lh-companion-stage" id="lhCompanionStage">' + companionSvg({ species: draft.species, hue: draft.hue, mood: companion.mood, equipped: draft.equipped }, 170) + '</div>' +
                '<div class="lh-companion-info">' +
                    '<div class="lh-row-between lh-wrap"><h2 class="lh-section-title" translate="no">' + esc(companion.name) + '</h2><span class="lh-badge lh-badge-live">' + esc(MOOD_LABELS[companion.mood] || companion.mood) + '</span></div>' +
                    '<div class="lh-metrics">' + metric('Level', formatNumber(companion.level)) + metric('Total XP', formatNumber(companion.xp)) + metric('Tool XP Today', formatNumber(companion.launch_xp_today) + ' / ' + formatNumber(companion.daily_launch_xp_cap), 'Your companion gains XP when you start tools') + '</div>' +
                    '<div class="lh-row-between"><span>Next Level</span><span>' + (maxed ? 'Max Level' : formatNumber(companion.level_progress) + ' / ' + formatNumber(perLevel)) + '</span></div>' +
                    progressBar(maxed ? perLevel : companion.level_progress, perLevel) +
                    '<div class="lh-care" id="lhCare">' + (catalog.care_actions || []).map(function (action) {
                        return '<button type="button" class="lh-btn lh-care-btn" data-care="' + esc(action) + '"' + (companion.care_cooldown_seconds > 0 ? ' disabled' : '') + ' title="' + esc(CARE_TITLES[action] || action) + '">' + (CARE_ICONS[action] || '') + ' <span>' + esc(CARE_LABELS[action] || action) + '</span></button>';
                    }).join('') + '</div>' +
                    '<div class="lh-note" id="lhCareCooldown"' + (companion.care_cooldown_seconds > 0 ? '' : ' hidden') + '></div>' +
                '</div>' +
            '</section>' +
            '<section class="lh-card lh-section">' +
                '<h2 class="lh-section-title">Customise</h2>' +
                '<label class="lh-field"><span>Name</span><input type="text" class="lh-input" id="lhCompanionName" maxlength="24" value="' + esc(draft.name) + '"></label>' +
                '<div class="lh-field"><span>Species</span>' + speciesPicker(draft.species, draft.hue, companion.mood) + '</div>' +
                '<label class="lh-field"><span>Colour</span><input type="range" class="lh-range" id="lhHue" min="0" max="360" step="1" value="' + esc(String(draft.hue)) + '"></label>' +
                '<div class="lh-field"><span>Decorations</span><small>Choose up to 3 decorations. New ones unlock as your companion levels up.</small><div class="lh-decos" id="lhDecos">' + decorations + '</div></div>' +
                '<div class="lh-actions"><button type="button" class="lh-btn lh-btn-primary" id="lhCompanionSave" title="Save your companion">Save Changes</button><button type="button" class="lh-btn" id="lhCompanionReset" title="Discard your unsaved changes">Reset</button></div>' +
            '</section>';
        startCooldown(companion.care_cooldown_seconds);
        byId('lhCompanionName').addEventListener('input', function () { draft.name = this.value; });
        byId('lhHue').addEventListener('input', function () {
            draft.hue = Math.max(0, Math.min(360, parseInt(this.value, 10) || 0));
            byId('lhCompanionStage').innerHTML = companionSvg({ species: draft.species, hue: draft.hue, mood: companion.mood, equipped: draft.equipped }, 170);
        });
        byId('lhHue').addEventListener('change', function () { renderCompanionView(content, data); });
        bindSpecies(function (key) {
            draft.species = key;
            renderCompanionView(content, data);
        });
        byId('lhDecos').addEventListener('click', function (event) {
            var button = event.target.closest('[data-deco]');
            if (!button || button.disabled) return;
            var key = button.getAttribute('data-deco');
            var index = draft.equipped.indexOf(key);
            if (index >= 0) draft.equipped.splice(index, 1);
            else if (draft.equipped.length >= (catalog.max_equipped || 3)) {
                toast(t('You can wear up to 3 decorations at once.'), 'error');
                return;
            } else draft.equipped.push(key);
            renderCompanionView(content, data);
        });
        byId('lhCare').addEventListener('click', function (event) {
            var button = event.target.closest('[data-care]');
            if (button && !button.disabled) careFor(button.getAttribute('data-care'));
        });
        byId('lhCompanionSave').addEventListener('click', function () { saveCompanion(this); });
        byId('lhCompanionReset').addEventListener('click', function () {
            state.companionDraft = null;
            renderCompanionView(content, data);
        });
    }

    function startCooldown(seconds) {
        clearInterval(state.cooldownTicker);
        var until = Date.now() + Math.max(0, seconds || 0) * 1000;
        function update() {
            var note = byId('lhCareCooldown');
            if (!note) return clearInterval(state.cooldownTicker);
            var left = (until - Date.now()) / 1000;
            if (left <= 0) {
                clearInterval(state.cooldownTicker);
                note.hidden = true;
                document.querySelectorAll('#lhCare [data-care]').forEach(function (button) { button.disabled = false; });
                return;
            }
            note.hidden = false;
            note.textContent = 'You can care for your companion again in ' + formatDuration(left);
        }
        if (seconds > 0) {
            update();
            state.cooldownTicker = setInterval(update, 1000);
        }
    }

    async function careFor(action) {
        document.querySelectorAll('#lhCare [data-care]').forEach(function (button) { button.disabled = true; });
        try {
            var result = await api('/companion/care', { method: 'POST', body: { action: action } });
            state.hub.companion = result;
            if (global.RWLGrowth && global.RWLGrowth.setCompanion) global.RWLGrowth.setCompanion(result);
            if (global.RWLGrowth && global.RWLGrowth.react) global.RWLGrowth.react(result.level_up ? 'level' : 'love', result.level_up ? t('Level up! Thank you!') : t('That felt great!'));
            if (state.tab === 'companion') renderTab();
            if (result.level_up) toast(t('Your companion reached a new level!'));
        } catch (error) {
            failure(error, t('Your companion did not react.'));
            loadHub(true).then(function () { if (state.tab === 'companion') renderTab(); });
        }
    }

    async function saveCompanion(button) {
        var draft = state.companionDraft;
        var input = byId('lhCompanionName');
        var name = input.value.trim();
        if (!NAME_PATTERN.test(name)) {
            markInvalid(input);
            return;
        }
        button.disabled = true;
        try {
            var result = await api('/companion/update', { method: 'POST', body: { name: name, species: draft.species, hue: draft.hue, equipped: draft.equipped.slice(0, 3) } });
            state.hub.companion = result;
            state.companionDraft = null;
            if (global.RWLGrowth && global.RWLGrowth.setCompanion) global.RWLGrowth.setCompanion(result);
            if (state.tab === 'companion') renderTab();
            toast(t('Your companion was updated.'));
        } catch (error) {
            button.disabled = false;
            failure(error, t('Your companion could not be updated.'));
        }
    }

    function reactorSvg() {
        return '<svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true"><defs><radialGradient id="lhReactorGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#e0aaff"/><stop offset="60%" stop-color="#9d4edd"/><stop offset="100%" stop-color="#3c096c"/></radialGradient></defs><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(224,170,255,0.35)" stroke-width="2" stroke-dasharray="6 8" class="lh-reactor-ring"/><path d="M48 18h24v26l20 38a12 12 0 0 1-10.6 17.6H38.6A12 12 0 0 1 28 82l20-38z" fill="rgba(22,15,36,0.9)" stroke="#e0aaff" stroke-width="2.5"/><path d="M36 74h48l6 11a8 8 0 0 1-7 12H37a8 8 0 0 1-7-12z" fill="url(#lhReactorGlow)" class="lh-reactor-liquid"/><circle cx="52" cy="84" r="3" fill="#ffffff" class="lh-reactor-bubble"/><circle cx="66" cy="88" r="2" fill="#ffffff" class="lh-reactor-bubble lh-reactor-bubble-late"/><rect x="44" y="12" width="32" height="8" rx="4" fill="#9d4edd"/></svg>';
    }

    function applyLab(result) {
        if (!result) return;
        var pending = state.pendingClicks * (result.click_value || 0);
        state.lab = result;
        state.lab.research = (result.research || 0) + pending;
        state.hub.lab = state.lab;
        renderStats();
    }

    function updateLabNumbers() {
        var lab = state.lab;
        if (!lab) return;
        var research = byId('lhLabResearch');
        var stored = byId('lhLabStored');
        var bar = byId('lhLabStoredBar');
        var collect = byId('lhLabCollect');
        if (research) research.textContent = formatNumber(Math.floor(lab.research));
        if (stored) stored.textContent = formatNumber(Math.floor(lab.stored)) + ' / ' + formatNumber(lab.capacity);
        if (bar) bar.style.width = (lab.capacity > 0 ? Math.min(100, lab.stored * 100 / lab.capacity) : 0) + '%';
        if (collect) collect.disabled = Math.floor(lab.stored) < 1;
        document.querySelectorAll('[data-upgrade-cost]').forEach(function (button) {
            button.disabled = lab.research < parseInt(button.getAttribute('data-upgrade-cost'), 10);
        });
        renderStats();
    }

    function upgradeRow(upgrade) {
        var maxed = upgrade.cost === null || upgrade.cost === undefined;
        return '<div class="lh-upgrade">' +
            '<div class="lh-upgrade-text"><strong>' + esc(upgrade.name) + '</strong><span>' + esc(upgrade.description) + '</span><small>Level ' + formatNumber(upgrade.level) + ' / ' + formatNumber(upgrade.max_level) + '</small></div>' +
            (maxed ? '<span class="lh-badge lh-badge-done">Max Level</span>' : '<button type="button" class="lh-btn lh-btn-small" data-upgrade="' + esc(upgrade.key) + '" data-upgrade-cost="' + esc(String(upgrade.cost)) + '" title="Buy this upgrade with research">🧪 ' + formatNumber(upgrade.cost) + '</button>') +
        '</div>';
    }

    function renderLab(content) {
        var lab = state.lab;
        if (!lab || !lab.enabled) {
            content.innerHTML = '<section class="lh-card lh-section">' + empty('The idle lab is closed right now.') + '</section>';
            return;
        }
        var conversion = lab.conversion || {};
        var lcLeft = Math.max(0, (conversion.daily_lab_coin_cap || 0) - (conversion.converted_lc_today || 0));
        var xpLeft = Math.max(0, (conversion.daily_xp_cap || 0) - (conversion.converted_xp_today || 0));
        content.innerHTML =
            '<section class="lh-card lh-section lh-lab">' +
                '<button type="button" class="lh-lab-reactor" id="lhReactor" title="Click to run a quick experiment">' + reactorSvg() + '<span class="lh-lab-click">+' + formatNumber(lab.click_value) + '</span></button>' +
                '<div class="lh-lab-info">' +
                    '<h2 class="lh-section-title">Idle Lab</h2>' +
                    '<p class="lh-section-hint">Your lab keeps researching while you are away, even when the launcher only runs in the tray. Collect the stored research, click the flask for quick experiments and invest in upgrades.</p>' +
                    '<div class="lh-metrics">' +
                        '<div class="lh-metric"><span class="lh-metric-value" id="lhLabResearch">' + formatNumber(Math.floor(lab.research)) + '</span><span class="lh-metric-label">Research</span></div>' +
                        metric('Per Hour', formatNumber(lab.rate_per_hour)) +
                        metric('Per Click', formatNumber(lab.click_value)) +
                        metric('Storage Time', formatNumber(lab.cap_hours) + 'h', 'Your lab stores research for this many hours while you are away') +
                    '</div>' +
                    '<div class="lh-row-between"><span>Stored Research</span><span id="lhLabStored">' + formatNumber(Math.floor(lab.stored)) + ' / ' + formatNumber(lab.capacity) + '</span></div>' +
                    '<div class="lh-progress"><span id="lhLabStoredBar" style="width:' + (lab.capacity > 0 ? Math.min(100, lab.stored * 100 / lab.capacity) : 0) + '%"></span></div>' +
                    '<div class="lh-actions"><button type="button" class="lh-btn lh-btn-primary" id="lhLabCollect" title="Move the stored research into your lab"' + (Math.floor(lab.stored) < 1 ? ' disabled' : '') + '>Collect Research</button></div>' +
                    '<div class="lh-note" id="lhLabNote" hidden></div>' +
                '</div>' +
            '</section>' +
            section('Upgrades', '<div class="lh-upgrades" id="lhUpgrades">' + (lab.upgrades || []).map(upgradeRow).join('') + '</div>') +
            section('Convert Research', '<div class="lh-convert">' +
                '<form class="lh-convert-card" data-target="lc"><strong>💰 Lab Coins</strong><span>' + formatNumber(conversion.research_per_lab_coin) + ' research = 1 Lab Coin</span><small>Left today: ' + formatNumber(lcLeft) + ' Lab Coins</small><input type="number" class="lh-input" min="1" step="1" inputmode="numeric" placeholder="Research amount" required><output class="lh-convert-preview">= 0</output><button type="submit" class="lh-btn" title="Convert research into Lab Coins">Convert</button></form>' +
                '<form class="lh-convert-card' + (conversion.discord_linked ? '' : ' locked') + '" data-target="xp"><strong>⭐ XP</strong><span>1 research = ' + formatNumber(conversion.xp_per_research) + ' XP</span><small>' + (conversion.discord_linked ? 'Left today: ' + formatNumber(xpLeft) + ' XP' : 'Link your Discord account to convert into XP') + '</small><input type="number" class="lh-input" min="1" step="1" inputmode="numeric" placeholder="Research amount" required' + (conversion.discord_linked ? '' : ' disabled') + '><output class="lh-convert-preview">= 0</output><button type="submit" class="lh-btn" title="Convert research into XP"' + (conversion.discord_linked ? '' : ' disabled') + '>Convert</button></form>' +
            '</div>', '', 'Daily limits keep the economy fair for everyone.');
        updateLabNumbers();
        byId('lhReactor').addEventListener('click', onReactorClick);
        byId('lhLabCollect').addEventListener('click', function () { collectLab(this); });
        byId('lhUpgrades').addEventListener('click', function (event) {
            var button = event.target.closest('[data-upgrade]');
            if (button && !button.disabled) buyUpgrade(button.getAttribute('data-upgrade'), button);
        });
        content.querySelectorAll('.lh-convert-card').forEach(function (form) {
            var input = form.querySelector('input');
            var preview = form.querySelector('output');
            var target = form.getAttribute('data-target');
            input.addEventListener('input', function () {
                var amount = Math.max(0, parseInt(input.value, 10) || 0);
                var value = target === 'lc' ? Math.floor(amount / Math.max(1, conversion.research_per_lab_coin || 1)) : Math.floor(amount * (conversion.xp_per_research || 0));
                preview.textContent = '= ' + formatNumber(value) + (target === 'lc' ? ' LC' : ' XP');
            });
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                convertResearch(target, input, form.querySelector('button'));
            });
        });
        state.labTicker = setInterval(function () {
            var current = state.lab;
            if (!current || state.tab !== 'lab') return stopTickers();
            current.stored = Math.min(current.capacity, current.stored + (current.rate_per_hour || 0) / 3600);
            updateLabNumbers();
        }, 1000);
    }

    function showLabNote(text) {
        var note = byId('lhLabNote');
        if (!note) return;
        note.textContent = text;
        note.hidden = false;
        clearTimeout(note.hideTimer);
        note.hideTimer = setTimeout(function () { note.hidden = true; }, 5000);
    }

    function floatText(event, text) {
        var reactor = byId('lhReactor');
        if (!reactor) return;
        var bubble = document.createElement('span');
        bubble.className = 'lh-float';
        bubble.textContent = text;
        var box = reactor.getBoundingClientRect();
        var x = event && event.clientX ? event.clientX - box.left : box.width / 2;
        var y = event && event.clientY ? event.clientY - box.top : box.height / 2;
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
        reactor.appendChild(bubble);
        setTimeout(function () { bubble.remove(); }, 900);
    }

    function onReactorClick(event) {
        var lab = state.lab;
        if (!lab) return;
        state.pendingClicks += 1;
        lab.research += lab.click_value || 0;
        updateLabNumbers();
        floatText(event, '+' + formatNumber(lab.click_value));
        var reactor = byId('lhReactor');
        if (reactor) {
            reactor.classList.remove('pulse');
            void reactor.offsetWidth;
            reactor.classList.add('pulse');
        }
        if (state.pendingClicks >= MAX_CLICK_BATCH) flushClicks();
        else if (!state.clickTimer) state.clickTimer = setTimeout(flushClicks, CLICK_FLUSH_MS);
    }

    async function flushClicks() {
        clearTimeout(state.clickTimer);
        state.clickTimer = null;
        if (state.clickBusy || !state.pendingClicks) return;
        var count = Math.min(MAX_CLICK_BATCH, state.pendingClicks);
        state.pendingClicks -= count;
        state.clickBusy = true;
        try {
            var result = await api('/lab/click', { method: 'POST', body: { count: count } });
            applyLab(result);
            if (state.tab === 'lab') updateLabNumbers();
            if (result.throttled) showLabNote(t('Easy there! Your lab can only handle a limited number of clicks per minute.'));
        } catch (error) {
            state.pendingClicks = 0;
            failure(error, t('The experiment failed.'));
            await refreshLab();
        } finally {
            state.clickBusy = false;
            if (state.pendingClicks && !state.clickTimer) state.clickTimer = setTimeout(flushClicks, CLICK_FLUSH_MS);
        }
    }

    async function refreshLab() {
        try {
            applyLab(await api('/lab'));
            if (state.tab === 'lab') renderLab(byId('lhContent'));
        } catch (error) {
            return;
        }
    }

    async function collectLab(button) {
        button.disabled = true;
        await flushClicks();
        try {
            var result = await api('/lab/collect', { method: 'POST' });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            toast(result.collected ? 'Collected ' + formatNumber(result.collected) + ' research.' : t('There was nothing to collect yet.'));
        } catch (error) {
            button.disabled = false;
            failure(error, t('The research could not be collected.'));
        }
    }

    async function buyUpgrade(key, button) {
        button.disabled = true;
        await flushClicks();
        try {
            var result = await api('/lab/upgrade', { method: 'POST', body: { key: key } });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            toast(t('Upgrade installed!'));
        } catch (error) {
            button.disabled = false;
            failure(error, t('The upgrade could not be bought.'));
        }
    }

    async function convertResearch(target, input, button) {
        var amount = parseInt(input.value, 10);
        if (!amount || amount < 1 || String(amount) !== String(input.value).trim()) {
            markInvalid(input);
            return;
        }
        button.disabled = true;
        await flushClicks();
        try {
            var result = await api('/lab/convert', { method: 'POST', body: { target: target, research: amount } });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            var converted = result.converted || {};
            toast('You received ' + formatNumber(converted.amount) + (target === 'lc' ? ' Lab Coins.' : ' XP.'));
        } catch (error) {
            button.disabled = false;
            failure(error, t('The research could not be converted.'));
        }
    }

    function renderCard(content) {
        content.innerHTML = '<section class="lh-card lh-section lh-card-section">' +
            '<div class="lh-card-preview" id="lhCardPreview">' + empty('Generating your card...') + '</div>' +
            '<div class="lh-card-side">' +
                '<h2 class="lh-section-title">Profile Card</h2>' +
                '<p class="lh-section-hint">Your card shows your level, nameplate, badges and favourite tools. Download it or post it straight to our Discord server.</p>' +
                '<div class="lh-actions lh-actions-column">' +
                    '<button type="button" class="lh-btn lh-btn-primary" id="lhCardShare" title="Post your card in the showcase channel of our Discord server">Post To Discord</button>' +
                    '<button type="button" class="lh-btn" id="lhCardDownload" title="Save the card as a PNG image" disabled>Download PNG</button>' +
                    '<button type="button" class="lh-btn" id="lhCardCopy" title="Copy the image to your clipboard" disabled>Copy Image</button>' +
                    '<button type="button" class="lh-btn" id="lhCardRefresh" title="Create the card again with your newest stats">Refresh</button>' +
                '</div>' +
            '</div></section>';
        byId('lhCardRefresh').addEventListener('click', function () { loadCard(true); });
        byId('lhCardDownload').addEventListener('click', downloadCard);
        byId('lhCardCopy').addEventListener('click', copyCard);
        byId('lhCardShare').addEventListener('click', function () { shareCard(this); });
        loadCard(false);
    }

    function showCard() {
        var preview = byId('lhCardPreview');
        if (!preview || !state.cardUrl) return;
        preview.innerHTML = '<img src="' + esc(state.cardUrl) + '" alt="Your profile card">';
        ['lhCardDownload', 'lhCardCopy'].forEach(function (id) {
            var button = byId(id);
            if (button) button.disabled = false;
        });
    }

    async function loadCard(force) {
        if (state.cardUrl && !force) {
            showCard();
            return;
        }
        var preview = byId('lhCardPreview');
        if (preview) preview.innerHTML = empty('Generating your card...');
        try {
            var response = await fetch(RWL.apiUrl('/api/growth/card'), { method: 'GET', headers: RWL.authHeaders() });
            if (!response.ok) {
                var data = null;
                try { data = await response.json(); } catch (error) { data = null; }
                var problem = new Error(RWL.errorDetail(data, 'The card could not be created.'));
                problem.status = response.status;
                throw problem;
            }
            var blob = await response.blob();
            if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
            state.cardBlob = blob;
            state.cardUrl = URL.createObjectURL(blob);
            showCard();
        } catch (error) {
            if (error && error.status === 401) return requireLogin();
            preview = byId('lhCardPreview');
            if (preview) preview.innerHTML = empty((error && error.message) || 'The card could not be created.');
        }
    }

    function downloadCard() {
        if (!state.cardUrl) return;
        var link = document.createElement('a');
        link.href = state.cardUrl;
        link.download = 'rickware_labs_card.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async function copyCard() {
        try {
            if (!state.cardBlob || !global.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error('unsupported');
            await navigator.clipboard.write([new global.ClipboardItem({ 'image/png': state.cardBlob })]);
            toast(t('The card was copied to your clipboard.'));
        } catch (error) {
            toast(t('Your browser cannot copy images. Use the download button instead.'), 'error');
        }
    }

    async function shareCard(button) {
        var confirmed = await confirmDialog(t('Post To Discord'), t('Your profile card will be posted publicly in our Discord server. Continue?'));
        if (!confirmed) return;
        button.disabled = true;
        try {
            await api('/card/share', { method: 'POST' });
            toast(t('Your card was posted on Discord!'));
        } catch (error) {
            failure(error, t('The card could not be posted.'));
        } finally {
            button.disabled = false;
        }
    }

    function renderCodes(content) {
        var history = state.hub.codes || [];
        content.innerHTML =
            section('Redeem A Code', '<form class="lh-code-form" id="lhCodeForm" autocomplete="off"><input type="text" id="lhCodeInput" class="lh-input lh-code-input" maxlength="40" placeholder="XXXX-XXXX-XXXX" spellcheck="false" autocapitalize="characters"><button type="submit" class="lh-btn lh-btn-primary" title="Redeem this code">Redeem</button></form><div class="lh-reward" id="lhCodeResult" hidden></div>', '', 'Codes are handed out during Discord events and giveaways. Every code works once per account.') +
            section('Redeemed Codes', history.length ? '<ul class="lh-list">' + history.map(function (entry) {
                return '<li class="lh-list-row"><span><b class="lh-mono" translate="no">' + esc(entry.code) + '</b> <span class="lh-muted">' + esc(entry.summary) + '</span></span><small>' + esc(formatDate(entry.redeemed_at)) + '</small></li>';
            }).join('') + '</ul>' : empty('You have not redeemed any codes yet.'));
        byId('lhCodeForm').addEventListener('submit', function (event) {
            event.preventDefault();
            redeemCode(this.querySelector('button'));
        });
    }

    async function redeemCode(button) {
        var input = byId('lhCodeInput');
        var code = input.value.trim().toUpperCase();
        if (!CODE_PATTERN.test(code)) {
            markInvalid(input);
            return;
        }
        button.disabled = true;
        try {
            var result = await api('/codes/redeem', { method: 'POST', body: { code: code } });
            await loadHub(true);
            if (state.tab !== 'codes') return;
            renderCodes(byId('lhContent'));
            var box = byId('lhCodeResult');
            box.hidden = false;
            box.innerHTML = '<span class="lh-reward-icon">🎉</span><strong>Code redeemed!</strong><span>' + esc(result.summary || '') + '</span>';
        } catch (error) {
            button.disabled = false;
            markInvalid(input);
            failure(error, t('The code could not be redeemed.'));
        }
    }

    function renderInvites(content) {
        var referrals = state.hub.referrals || {};
        if (!referrals.linked) {
            content.innerHTML = section('Invite Rewards', empty('Link your Discord account in your account settings to earn invite rewards.') + '<div class="lh-actions"><a class="lh-btn lh-btn-primary" href="./account_settings.html" title="Open your account settings">Open Account Settings</a></div>');
            return;
        }
        var rewards = referrals.rewards || [];
        content.innerHTML = section('Invite Rewards', rewards.length ? '<ul class="lh-list">' + rewards.map(function (entry) {
            var status = entry.status || 'active';
            return '<li class="lh-list-row"><span>✨ <b translate="no">' + esc(entry.item || '-') + '</b> <span class="lh-badge lh-badge-' + esc(status) + '">' + esc(REFERRAL_STATUS[status] || status) + '</span></span><small>' + (status === 'active' && entry.secure_at ? 'Yours forever from ' + esc(formatDate(entry.secure_at)) : esc(formatDate(entry.joined_at))) + '</small></li>';
        }).join('') + '</ul>' : empty('You have not invited anyone yet.'), '', 'Invite friends to our Discord server with your own invite link. For every new member you receive a random cosmetic. If the member leaves within ' + formatNumber(referrals.keep_days || 90) + ' days, the item is removed again and the bot tells you in a direct message. After that it is yours forever.');
    }

    function diagnostics() {
        var lines = [
            'page=' + global.location.pathname,
            'client=' + (RWL.clientKind ? RWL.clientKind() : 'web'),
            'language=' + (navigator.language || ''),
            'screen=' + (global.screen ? global.screen.width + 'x' + global.screen.height : ''),
            'viewport=' + global.innerWidth + 'x' + global.innerHeight,
            'user_agent=' + (navigator.userAgent || '')
        ];
        try { lines.push('time_zone=' + Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (error) {}
        return lines.join('\n');
    }

    async function launcherLogs() {
        if (!global.RWLLauncher || !global.RWLLauncher.isLauncher || !global.RWLLauncher.isLauncher()) return '';
        try {
            var result = await global.RWLLauncher.call('getRecentLogs', { max_lines: 400 });
            return Array.isArray(result && result.lines) ? result.lines.join('\n') : '';
        } catch (error) {
            return '';
        }
    }

    function renderBugs(content) {
        var reports = state.hub.bug_reports || [];
        var inLauncher = !!(global.RWLLauncher && global.RWLLauncher.isLauncher && global.RWLLauncher.isLauncher());
        content.innerHTML =
            section('Report A Bug', '<form class="lh-bug-form" id="lhBugForm" autocomplete="off">' +
                '<label class="lh-field"><span>Title</span><input type="text" class="lh-input" id="lhBugTitle" maxlength="120" placeholder="Short summary of the problem"></label>' +
                '<label class="lh-field"><span>What happened?</span><textarea class="lh-input lh-textarea" id="lhBugText" maxlength="4000" rows="6" placeholder="What did you do, what did you expect and what happened instead?"></textarea></label>' +
                '<label class="lh-check"><input type="checkbox" id="lhBugLogs"' + (inLauncher ? ' checked' : ' disabled') + '><span>' + (inLauncher ? 'Attach the latest launcher logs' : 'Launcher logs can only be attached inside the launcher') + '</span></label>' +
                '<label class="lh-check"><input type="checkbox" id="lhBugDiag" checked><span>Attach technical details (browser, screen size, language)</span></label>' +
                '<div class="lh-actions"><button type="submit" class="lh-btn lh-btn-primary" title="Send the bug report to the team">Send Report</button></div>' +
            '</form>', '', 'Tokens, passwords and e-mail addresses are removed from logs automatically. Helpful reports are rewarded with Lab Coins or XP.') +
            section('Your Reports', reports.length ? '<ul class="lh-list">' + reports.map(function (entry) {
                var reward = [];
                if (entry.reward_lab_coins) reward.push('+' + formatNumber(entry.reward_lab_coins) + ' LC');
                if (entry.reward_xp) reward.push('+' + formatNumber(entry.reward_xp) + ' XP');
                return '<li class="lh-list-row"><span><b translate="no">' + esc(entry.title) + '</b> <span class="lh-badge lh-badge-' + esc(entry.status) + '">' + esc(BUG_STATUS[entry.status] || entry.status) + '</span>' + (reward.length ? ' <span class="lh-reward-chip">🎁 ' + esc(reward.join(' · ')) + '</span>' : '') + '</span><small>' + esc(formatDate(entry.created_at)) + '</small></li>';
            }).join('') + '</ul>' : empty('You have not sent any bug reports yet.'));
        byId('lhBugForm').addEventListener('submit', function (event) {
            event.preventDefault();
            sendBug(this.querySelector('button[type="submit"]'));
        });
    }

    async function sendBug(button) {
        var title = byId('lhBugTitle');
        var text = byId('lhBugText');
        var valid = true;
        if (title.value.trim().length < 4) {
            markInvalid(title);
            valid = false;
        }
        if (text.value.trim().length < 10) {
            if (valid) markInvalid(text);
            else text.classList.add('lh-invalid');
            valid = false;
        }
        if (!valid) return;
        button.disabled = true;
        try {
            var parts = [];
            if (byId('lhBugDiag').checked) parts.push(diagnostics());
            if (byId('lhBugLogs').checked) {
                var logs = await launcherLogs();
                if (logs) parts.push(logs);
            }
            await api('/bugs', { method: 'POST', body: { title: title.value.trim(), description: text.value.trim(), logs: parts.length ? parts.join('\n\n').slice(-600000) : null, client: RWL.clientKind ? RWL.clientKind() : 'web', page: (document.referrer ? new URL(document.referrer, global.location.href).pathname : global.location.pathname).slice(0, 120) } });
            await loadHub(true);
            if (state.tab === 'bugs') renderBugs(byId('lhContent'));
            toast(t('Thank you! Your report was sent to the team.'));
        } catch (error) {
            button.disabled = false;
            failure(error, t('The bug report could not be sent.'));
        }
    }

    function onAvatarError(event) {
        var image = event.target;
        if (!image || image.tagName !== 'IMG' || !image.classList || !image.classList.contains('lh-avatar')) return;
        var fallback = document.createElement('span');
        fallback.className = 'lh-avatar lh-avatar-fallback';
        fallback.textContent = image.getAttribute('data-initials') || '?';
        image.replaceWith(fallback);
    }

    function waitForGrowth(timeout) {
        return new Promise(function (resolve) {
            var started = Date.now();
            (function check() {
                if (global.RWLGrowth || Date.now() - started > timeout) return resolve();
                setTimeout(check, 100);
            })();
        });
    }

    async function init() {
        if (!RWL.getToken()) {
            requireLogin();
            return;
        }
        document.addEventListener('error', onAvatarError, true);
        byId('lhTabs').addEventListener('click', function (event) {
            var button = event.target.closest('[data-tab]');
            if (button) selectTab(button.getAttribute('data-tab'));
        });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) flushClicks();
        });
        global.addEventListener('pagehide', flushClicks);
        global.addEventListener('rwl-social-event', function (event) {
            var detail = (event && event.detail) || {};
            if (detail.type === 'companion_reaction' && state.hub) loadHub(true).then(function () { if (state.tab === 'companion' || state.tab === 'overview') renderTab(); });
        });
        var initial = (global.location.hash || '').replace('#', '');
        state.tab = TABS.indexOf(initial) >= 0 ? initial : 'overview';
        document.querySelectorAll('#lhTabs .lh-tab').forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-tab') === state.tab); });
        await Promise.all([loadHub(true), waitForGrowth(4000)]);
        if (state.hub) renderTab();
        else await loadHub(false);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
