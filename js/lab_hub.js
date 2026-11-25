(function (global) {
    if (!global.RWL) return;

    var esc = RWL.escapeHtml;
    var TABS = ['overview', 'companion', 'leaderboard', 'card', 'crates', 'lab', 'codes', 'invites', 'bugs'];
    var BOARDS = [['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time'], ['pass', 'Lab Pass Level']];
    var REWARD_LABELS = { lab_coins: 'Lab Coins', xp: 'XP', research: 'Research', chest: 'Mystery Chests', cosmetic: 'Random Cosmetic' };
    var REWARD_ICONS = { lab_coins: '💰', xp: '⭐', research: '🧪', chest: '🎁', cosmetic: '✨' };
    var TARGET_LABELS = { lab_pass: 'Lab Pass XP', discord_xp: 'Discord XP', activity: 'Activity Points', idle_lab: 'Idle Lab Research', companion: 'Pet XP' };
    var METRIC_LABELS = { any: 'Any activity', use_tool: 'Using tools', launch_tools: 'Starting tools', login: 'Daily logins', customize_profile: 'Profile changes', apply_theme: 'Applying themes', add_friend: 'New friendships', bazaar_purchase: 'Bazaar purchases', bazaar_sale: 'Bazaar sales', bazaar_trade: 'Bazaar trades', forum_post: 'Forum posts', review: 'Reviews', idle_collect: 'Idle Lab collections', companion_care: 'Pet care' };
    var MOOD_LABELS = { curious: 'Curious', ecstatic: 'Ecstatic', happy: 'Happy', bored: 'Bored', sleepy: 'Sleepy' };
    var CARE_LABELS = { feed: 'Feed', pet: 'Pet', play: 'Play' };
    var CARE_TITLES = { feed: 'Feed your pet', pet: 'Pet your pet', play: 'Play with your pet' };
    var CARE_ICONS = { feed: '🍪', pet: '🤚', play: '🎾' };
    var BUG_STATUS = { open: 'Submitted', confirmed: 'Confirmed', resolved: 'Resolved', rejected: 'Rejected', duplicate: 'Duplicate' };
    var REFERRAL_STATUS = { active: 'Waiting', kept: 'Yours forever', left_early: 'Removed', revoked: 'Revoked' };
    var CODE_PATTERN = /^[A-Za-z0-9-]{3,40}$/;
    var NAME_PATTERN = /^[0-9A-Za-zÀ-ÖØ-öø-ÿ' \-]{2,24}$/;
    var CLICK_IDLE_FLUSH_MS = 700;
    var CLICK_MAX_WAIT_MS = 3000;
    var CLICK_RETRY_MS = 1500;
    var DEFAULT_CHUNK_SIZE = 10;
    var MILESTONE_NAMES = { first_steps: 'First Steps', curious_mind: 'Curious Mind', bench_scientist: 'Bench Scientist', senior_researcher: 'Senior Researcher', lab_director: 'Lab Director', pioneer: 'Pioneer', visionary: 'Visionary', legend: 'Legend' };
    var MAX_CLICK_BATCH = 60;
    var state = { hub: null, tab: 'overview', board: 'week', boards: {}, lab: null, labTicker: null, cooldownTicker: null, pendingClicks: 0, inFlightClicks: 0, clickStamps: [], clickTimer: null, clickMaxTimer: null, clickBusy: false, cardBlob: null, cardUrl: null, busy: false, companionDraft: null, adoptDraft: null };

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

    var COMPACT_UNITS = [{ size: 1e3, suffix: 'k' }, { size: 1e6, suffix: 'M' }, { size: 1e9, suffix: 'B' }, { size: 1e12, suffix: 'T' }];

    function formatCompact(value) {
        var number = Number(value || 0);
        var absolute = Math.abs(number);
        if (absolute < 1000) return formatNumber(number);
        var index = 0;
        while (index < COMPACT_UNITS.length - 1 && absolute >= COMPACT_UNITS[index + 1].size) index++;
        var scaled = absolute / COMPACT_UNITS[index].size;
        var rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
        if (rounded >= 1000 && index < COMPACT_UNITS.length - 1) {
            index++;
            rounded = 1;
        }
        return (number < 0 ? '-' : '') + rounded + COMPACT_UNITS[index].suffix;
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
        byId('lhResearch').textContent = formatNumber(Math.floor(state.lab && !labFrozen(state.lab) ? state.lab.research : 0));
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
            section('Your Activity', activityHtml, '', 'Starting tools, chatting, trading and caring for your pet earns activity points. Activity points fill up Experiment Crates.') +
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

    var PET_PAGE_SIZE = 30;
    var SLOT_LABELS = { head: 'Head', eyes: 'Eyes', neck: 'Neck', back: 'Back', aura: 'Aura', held: 'Held Item', ground: 'Ground' };
    var petState = { catalog: null, loading: null, failed: false, species: { rarity: 'all', query: '', page: 0, owned: false }, decorations: { rarity: 'all', slot: 'all', query: '', page: 0, owned: false } };

    function decodeCatalog(raw) {
        var rarities = raw.rarities || [];
        var slots = raw.slots || [];
        return {
            rarities: rarities,
            slots: slots,
            max_equipped: raw.max_equipped || 6,
            species: (raw.species || []).map(function (row) { return { key: row[0], name: row[1], rarity: rarities[row[2]] || 'Common', level: row[3], animated: !!row[4] }; }),
            decorations: (raw.decorations || []).map(function (row) { return { key: row[0], name: row[1], rarity: rarities[row[2]] || 'Common', level: row[3], animated: !!row[4], slot: slots[row[5]] || 'head' }; })
        };
    }

    function loadPetCatalog() {
        if (petState.catalog) return Promise.resolve(petState.catalog);
        if (petState.loading) return petState.loading;
        petState.failed = false;
        petState.loading = api('/companion/catalog').then(function (raw) {
            petState.catalog = decodeCatalog(raw || {});
            petState.loading = null;
            return petState.catalog;
        }).catch(function (error) {
            petState.loading = null;
            petState.failed = true;
            if (error && error.status === 401) requireLogin();
            return null;
        });
        return petState.loading;
    }

    function petUnlocked(entry, level, everything) {
        return !!everything || entry.level <= level;
    }

    function filteredEntries(kind, level, everything) {
        var filter = petState[kind];
        var entries = (petState.catalog && petState.catalog[kind]) || [];
        var query = filter.query.trim().toLowerCase();
        return entries.filter(function (entry) {
            if (filter.rarity !== 'all' && entry.rarity !== filter.rarity) return false;
            if (kind === 'decorations' && filter.slot !== 'all' && entry.slot !== filter.slot) return false;
            if (filter.owned && !petUnlocked(entry, level, everything)) return false;
            return !query || entry.name.toLowerCase().indexOf(query) >= 0;
        });
    }

    function rarityStyle(rarity) {
        return '--rwl-keep:1;--lh-rarity:' + RWL.sanitizeHex(RWL.rarityColor ? RWL.rarityColor(rarity) : '#e0aaff', '#e0aaff');
    }

    function pickerHtml(kind, draft, level, everything) {
        var filter = petState[kind];
        var catalog = petState.catalog;
        if (!catalog) return empty(petState.failed ? 'The catalog could not be loaded. Please try again later.' : 'Loading...');
        var entries = filteredEntries(kind, level, everything);
        var pages = Math.max(1, Math.ceil(entries.length / PET_PAGE_SIZE));
        filter.page = Math.max(0, Math.min(filter.page, pages - 1));
        var visible = entries.slice(filter.page * PET_PAGE_SIZE, (filter.page + 1) * PET_PAGE_SIZE);
        var chips = ['all'].concat(catalog.rarities).map(function (rarity) {
            return '<button type="button" class="lh-chip-btn' + (filter.rarity === rarity ? ' active' : '') + '" data-pick-rarity="' + esc(rarity) + '" style="' + (rarity === 'all' ? '' : rarityStyle(rarity)) + '" title="' + esc(rarity === 'all' ? 'Show every rarity' : 'Show only ' + rarity + ' items') + '">' + esc(rarity === 'all' ? 'All' : rarity) + '</button>';
        }).join('');
        var slotSelect = kind === 'decorations' ? '<select class="lh-select" data-pick-slot title="Filter by slot"><option value="all">All Slots</option>' + catalog.slots.map(function (slot) { return '<option value="' + esc(slot) + '"' + (filter.slot === slot ? ' selected' : '') + '>' + esc(SLOT_LABELS[slot] || slot) + '</option>'; }).join('') + '</select>' : '';
        var cards = visible.map(function (entry) {
            var open = petUnlocked(entry, level, everything);
            var active = kind === 'species' ? draft.species === entry.key : draft.equipped.indexOf(entry.key) >= 0;
            var preview = kind === 'species' ? { species: entry.key, hue: draft.hue, mood: 'happy', equipped: [] } : { species: draft.species, hue: draft.hue, mood: 'happy', equipped: [entry.key] };
            return '<button type="button" class="lh-pick-card' + (active ? ' active' : '') + (open ? '' : ' locked') + '" data-pick="' + esc(entry.key) + '" style="' + rarityStyle(entry.rarity) + '" title="' + esc(open ? entry.name + ' · ' + entry.rarity : 'Unlocks at level ' + entry.level) + '">' +
                (entry.animated ? '<i class="lh-pick-anim" title="Animated">✦</i>' : '') + companionSvg(preview, 62) +
                '<span class="lh-pick-name" translate="no">' + esc(entry.name) + '</span>' +
                '<small class="lh-pick-meta">' + (open ? esc(entry.rarity) : '🔒 Level ' + formatCompact(entry.level)) + '</small></button>';
        }).join('');
        return '<div class="lh-pick-bar"><div class="lh-chip-row">' + chips + '</div><div class="lh-pick-tools">' + slotSelect +
            '<input type="search" class="lh-input lh-pick-search" data-pick-search maxlength="40" placeholder="Search by name" value="' + esc(filter.query) + '">' +
            '<label class="lh-check lh-pick-owned"><input type="checkbox" data-pick-owned' + (filter.owned ? ' checked' : '') + '><span>Unlocked only</span></label></div></div>' +
            (visible.length ? '<div class="lh-pick-grid">' + cards + '</div>' : empty('Nothing matches these filters.')) +
            '<div class="lh-pick-pager"><button type="button" class="lh-btn lh-btn-small" data-pick-page="-1"' + (filter.page <= 0 ? ' disabled' : '') + ' title="Previous page">‹</button><span>' + formatNumber(entries.length) + ' items · Page ' + (filter.page + 1) + ' / ' + pages + '</span><button type="button" class="lh-btn lh-btn-small" data-pick-page="1"' + (filter.page >= pages - 1 ? ' disabled' : '') + ' title="Next page">›</button></div>';
    }

    function bindPicker(container, kind, refresh, onPick) {
        if (!container) return;
        var filter = petState[kind];
        container.addEventListener('click', function (event) {
            var rarity = event.target.closest('[data-pick-rarity]');
            if (rarity) {
                filter.rarity = rarity.getAttribute('data-pick-rarity');
                filter.page = 0;
                refresh();
                return;
            }
            var pager = event.target.closest('[data-pick-page]');
            if (pager && !pager.disabled) {
                filter.page += parseInt(pager.getAttribute('data-pick-page'), 10);
                refresh();
                return;
            }
            var card = event.target.closest('[data-pick]');
            if (card) onPick(card.getAttribute('data-pick'), card.classList.contains('locked'));
        });
        container.addEventListener('input', function (event) {
            if (!event.target.matches('[data-pick-search]')) return;
            filter.query = event.target.value.slice(0, 40);
            filter.page = 0;
            var caret = event.target.selectionStart;
            refresh();
            var input = container.querySelector('[data-pick-search]');
            if (input) {
                input.focus();
                try { input.setSelectionRange(caret, caret); } catch (error) {}
            }
        });
        container.addEventListener('change', function (event) {
            if (event.target.matches('[data-pick-slot]')) {
                filter.slot = event.target.value;
                filter.page = 0;
                refresh();
            } else if (event.target.matches('[data-pick-owned]')) {
                filter.owned = event.target.checked;
                filter.page = 0;
                refresh();
            }
        });
    }

    function findEntry(kind, key) {
        var entries = (petState.catalog && petState.catalog[kind]) || [];
        for (var index = 0; index < entries.length; index++) if (entries[index].key === key) return entries[index];
        return null;
    }

    function starterPicker(selected) {
        var species = ((state.hub.companion || {}).catalog || {}).species || [];
        return '<div class="lh-pick-grid" id="lhSpecies">' + species.map(function (entry) {
            return '<button type="button" class="lh-pick-card' + (entry.key === selected ? ' active' : '') + '" data-species="' + esc(entry.key) + '" style="' + rarityStyle(entry.rarity || 'Common') + '" title="' + esc(entry.name) + '">' + companionSvg({ species: entry.key, hue: 270, mood: 'happy', equipped: [] }, 62) + '<span class="lh-pick-name" translate="no">' + esc(entry.name) + '</span></button>';
        }).join('') + '</div>';
    }

    function renderCompanion(content) {
        var data = state.hub.companion || {};
        var catalog = data.catalog || {};
        if (!catalog.enabled) {
            content.innerHTML = '<section class="lh-card lh-section">' + empty('Your personal pet is resting right now. Please come back later.') + '</section>';
            return;
        }
        if (!data.adopted) renderAdoption(content, catalog);
        else {
            renderCompanionView(content, data);
            if (!petState.catalog) loadPetCatalog().then(function () { if (state.tab === 'companion' && state.hub && state.hub.companion && state.hub.companion.adopted) renderCompanionView(byId('lhContent'), state.hub.companion); });
        }
    }

    function discordNoticeHtml(catalog) {
        if (catalog.discord_linked) return '';
        return '<div class="lh-note lh-discord-note" role="note">🔗 ' + esc(t(catalog.discord_link_notice || 'Link your Discord account to earn XP for every level your pet reaches.')) + ' <a href="./account_settings.html" class="lh-link">' + esc(t('Link Discord')) + '</a></div>';
    }

    function levelRewardHtml(companion, catalog, maxed) {
        if (!catalog.discord_linked) return discordNoticeHtml(catalog);
        if (maxed) return '';
        return '<div class="lh-row-between"><span>' + esc(t('Reward For Next Level')) + '</span><span>+' + formatCompact(companion.next_level_reward || 0) + ' XP</span></div>' +
            '<div class="lh-row-between"><span>' + esc(t('Level Rewards Today')) + '</span><span>' + formatCompact(companion.level_xp_today || 0) + ' / ' + formatCompact(catalog.daily_level_xp_cap || 0) + ' XP</span></div>';
    }

    function renderAdoption(content, catalog) {
        var draft = state.adoptDraft || (state.adoptDraft = { species: ((catalog.species || [])[0] || {}).key || 'blob', name: '' });
        content.innerHTML = '<section class="lh-card lh-section lh-companion">' +
            '<div class="lh-companion-stage">' + companionSvg({ species: draft.species, hue: 270, mood: 'happy', equipped: [] }, 160) + '</div>' +
            '<div class="lh-companion-info">' +
                '<h2 class="lh-section-title">Adopt Your Personal Pet</h2>' +
                '<p class="lh-section-hint">Your pet lives in the launcher, reacts when you start tools and grows with you up to level ' + formatNumber(catalog.max_level || 10000) + '. Along the way it unlocks ' + formatNumber(catalog.species_total || 400) + ' species and ' + formatNumber(catalog.decorations_total || 500) + ' decorations from Common to Mythical.</p>' +
                discordNoticeHtml(catalog) +
                starterPicker(draft.species) +
                '<label class="lh-field"><span>Name</span><input type="text" class="lh-input" id="lhAdoptName" maxlength="24" placeholder="Give your pet a name" value="' + esc(draft.name) + '"></label>' +
                '<button type="button" class="lh-btn lh-btn-primary" id="lhAdoptBtn" title="Adopt this pet">Adopt Pet</button>' +
            '</div></section>';
        byId('lhSpecies').addEventListener('click', function (event) {
            var card = event.target.closest('[data-species]');
            if (!card) return;
            draft.species = card.getAttribute('data-species');
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
                failure(error, t('The pet could not be adopted.'));
            }
        });
    }

    function companionDraft(companion) {
        if (!state.companionDraft) state.companionDraft = { name: companion.name, species: companion.species, hue: companion.hue, equipped: (companion.equipped || []).slice() };
        return state.companionDraft;
    }

    function unlockedCount(kind, level, everything) {
        var entries = (petState.catalog && petState.catalog[kind]) || [];
        return entries.filter(function (entry) { return petUnlocked(entry, level, everything); }).length;
    }

    function renderCompanionView(content, data) {
        var companion = data.companion;
        var catalog = data.catalog;
        var draft = companionDraft(companion);
        var perLevel = Math.max(1, catalog.xp_per_level || 1);
        var maxed = companion.level >= catalog.max_level;
        var everything = !!catalog.all_unlocked;
        var maxEquipped = catalog.max_equipped || 6;
        var rarity = companion.rarity || 'Common';
        function stageSvg() {
            return companionSvg({ species: draft.species, hue: draft.hue, mood: companion.mood, equipped: draft.equipped }, 180);
        }
        function equippedChips() {
            if (!draft.equipped.length) return '<span class="lh-muted">No decorations equipped</span>';
            return draft.equipped.map(function (key) {
                var entry = findEntry('decorations', key);
                return '<button type="button" class="lh-equipped-chip" data-unequip="' + esc(key) + '" style="' + rarityStyle(entry ? entry.rarity : 'Common') + '" title="Remove this decoration"><span translate="no">' + esc(entry ? entry.name : key) + '</span> ✕</button>';
            }).join('');
        }
        content.innerHTML =
            '<section class="lh-card lh-section lh-companion">' +
                '<div class="lh-companion-stage" id="lhCompanionStage">' + stageSvg() + '</div>' +
                '<div class="lh-companion-info">' +
                    '<div class="lh-row-between lh-wrap"><h2 class="lh-section-title" translate="no">' + esc(companion.name) + '</h2><span class="lh-pet-tags"><span class="lh-badge lh-rarity-badge" style="' + rarityStyle(rarity) + '">' + esc(rarity) + '</span><span class="lh-badge lh-badge-live">' + esc(MOOD_LABELS[companion.mood] || companion.mood) + '</span></span></div>' +
                    '<div class="lh-metrics">' + metric('Level', formatCompact(companion.level) + ' / ' + formatCompact(catalog.max_level), formatNumber(companion.level) + ' / ' + formatNumber(catalog.max_level)) + metric('Total XP', formatCompact(companion.xp), formatNumber(companion.xp)) + metric('Tool XP Today', formatCompact(companion.launch_xp_today) + ' / ' + formatCompact(companion.daily_launch_xp_cap), 'Your pet gains XP when you start tools') +
                        (petState.catalog ? metric('Species', formatCompact(unlockedCount('species', companion.level, everything)) + ' / ' + formatCompact(petState.catalog.species.length), 'Species you unlocked') + metric('Decorations', formatCompact(unlockedCount('decorations', companion.level, everything)) + ' / ' + formatCompact(petState.catalog.decorations.length), 'Decorations you unlocked') : '') + '</div>' +
                    '<div class="lh-row-between"><span>Next Level</span><span>' + (maxed ? 'Max Level' : formatCompact(companion.level_progress) + ' / ' + formatCompact(perLevel)) + '</span></div>' +
                    progressBar(maxed ? perLevel : companion.level_progress, perLevel) +
                    levelRewardHtml(companion, catalog, maxed) +
                    '<div class="lh-care" id="lhCare">' + (catalog.care_actions || []).map(function (action) {
                        return '<button type="button" class="lh-btn lh-care-btn" data-care="' + esc(action) + '"' + (companion.care_cooldown_seconds > 0 ? ' disabled' : '') + ' title="' + esc(CARE_TITLES[action] || action) + '">' + (CARE_ICONS[action] || '') + ' <span>' + esc(CARE_LABELS[action] || action) + '</span></button>';
                    }).join('') + '</div>' +
                    '<div class="lh-note" id="lhCareCooldown"' + (companion.care_cooldown_seconds > 0 ? '' : ' hidden') + '></div>' +
                '</div>' +
            '</section>' +
            '<section class="lh-card lh-section">' +
                '<h2 class="lh-section-title">Customise</h2>' +
                '<div class="lh-pet-basics"><label class="lh-field"><span>Name</span><input type="text" class="lh-input" id="lhCompanionName" maxlength="24" value="' + esc(draft.name) + '"></label>' +
                '<label class="lh-field"><span>Colour Shift</span><input type="range" class="lh-range" id="lhHue" min="0" max="360" step="1" value="' + esc(String(draft.hue)) + '"></label></div>' +
                '<div class="lh-field"><span>Equipped Decorations (' + draft.equipped.length + ' / ' + maxEquipped + ')</span><div class="lh-equipped" id="lhEquipped">' + equippedChips() + '</div></div>' +
                '<div class="lh-actions"><button type="button" class="lh-btn lh-btn-primary" id="lhCompanionSave" title="Save your pet">Save Changes</button><button type="button" class="lh-btn" id="lhCompanionReset" title="Discard your unsaved changes">Reset</button></div>' +
            '</section>' +
            '<section class="lh-card lh-section"><h2 class="lh-section-title">Species</h2><p class="lh-section-hint">New species unlock as your pet levels up. Rare and higher species are animated.</p><div id="lhSpeciesPick">' + pickerHtml('species', draft, companion.level, everything) + '</div></section>' +
            '<section class="lh-card lh-section"><h2 class="lh-section-title">Decorations</h2><p class="lh-section-hint">Choose up to ' + maxEquipped + ' decorations. Gleaming, Radiant and Mythic decorations are animated.</p><div id="lhDecoPick">' + pickerHtml('decorations', draft, companion.level, everything) + '</div></section>';
        startCooldown(companion.care_cooldown_seconds);
        function refreshStage() {
            byId('lhCompanionStage').innerHTML = stageSvg();
        }
        function refreshSpecies() {
            byId('lhSpeciesPick').innerHTML = pickerHtml('species', draft, companion.level, everything);
        }
        function refreshDecorations() {
            byId('lhDecoPick').innerHTML = pickerHtml('decorations', draft, companion.level, everything);
            byId('lhEquipped').innerHTML = equippedChips();
            var label = byId('lhEquipped').previousElementSibling;
            if (label) label.textContent = 'Equipped Decorations (' + draft.equipped.length + ' / ' + maxEquipped + ')';
        }
        byId('lhCompanionName').addEventListener('input', function () { draft.name = this.value; });
        byId('lhHue').addEventListener('input', function () {
            draft.hue = Math.max(0, Math.min(360, parseInt(this.value, 10) || 0));
            refreshStage();
        });
        byId('lhHue').addEventListener('change', function () {
            refreshSpecies();
            refreshDecorations();
        });
        bindPicker(byId('lhSpeciesPick'), 'species', refreshSpecies, function (key, locked) {
            var entry = findEntry('species', key);
            if (locked) {
                toast('This species unlocks at level ' + formatNumber(entry ? entry.level : 0) + '.', 'error');
                return;
            }
            draft.species = key;
            refreshStage();
            refreshSpecies();
            refreshDecorations();
        });
        bindPicker(byId('lhDecoPick'), 'decorations', refreshDecorations, function (key, locked) {
            var entry = findEntry('decorations', key);
            if (locked) {
                toast('This decoration unlocks at level ' + formatNumber(entry ? entry.level : 0) + '.', 'error');
                return;
            }
            var index = draft.equipped.indexOf(key);
            if (index >= 0) draft.equipped.splice(index, 1);
            else if (draft.equipped.length >= maxEquipped) {
                toast('You can wear up to ' + maxEquipped + ' decorations at once.', 'error');
                return;
            } else draft.equipped.push(key);
            refreshStage();
            refreshDecorations();
        });
        byId('lhEquipped').addEventListener('click', function (event) {
            var chip = event.target.closest('[data-unequip]');
            if (!chip) return;
            var index = draft.equipped.indexOf(chip.getAttribute('data-unequip'));
            if (index >= 0) draft.equipped.splice(index, 1);
            refreshStage();
            refreshDecorations();
        });
        byId('lhCare').addEventListener('click', function (event) {
            var button = event.target.closest('[data-care]');
            if (button && !button.disabled) careFor(button.getAttribute('data-care'));
        });
        byId('lhCompanionSave').addEventListener('click', function () { saveCompanion(this, maxEquipped); });
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
            note.textContent = 'You can care for your pet again in ' + formatDuration(left);
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
            if (result.level_up) toast(t('Your pet reached a new level!'));
            if (result.xp_reward) toast(t('You earned') + ' +' + formatNumber(result.xp_reward) + ' XP');
        } catch (error) {
            failure(error, t('Your pet did not react.'));
            loadHub(true).then(function () { if (state.tab === 'companion') renderTab(); });
        }
    }

    async function saveCompanion(button, maxEquipped) {
        var draft = state.companionDraft;
        var input = byId('lhCompanionName');
        var name = input.value.trim();
        if (!NAME_PATTERN.test(name)) {
            markInvalid(input);
            return;
        }
        button.disabled = true;
        try {
            var result = await api('/companion/update', { method: 'POST', body: { name: name, species: draft.species, hue: draft.hue, equipped: draft.equipped.slice(0, maxEquipped || 6) } });
            state.hub.companion = result;
            state.companionDraft = null;
            if (global.RWLGrowth && global.RWLGrowth.setCompanion) global.RWLGrowth.setCompanion(result);
            if (state.tab === 'companion') renderTab();
            toast(t('Your pet was updated.'));
        } catch (error) {
            button.disabled = false;
            failure(error, t('Your pet could not be updated.'));
        }
    }

    function reactorSvg() {
        return '<svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true"><defs><radialGradient id="lhReactorGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#e0aaff"/><stop offset="60%" stop-color="#9d4edd"/><stop offset="100%" stop-color="#3c096c"/></radialGradient></defs><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(224,170,255,0.35)" stroke-width="2" stroke-dasharray="6 8" class="lh-reactor-ring"/><path d="M48 18h24v26l20 38a12 12 0 0 1-10.6 17.6H38.6A12 12 0 0 1 28 82l20-38z" fill="rgba(22,15,36,0.9)" stroke="#e0aaff" stroke-width="2.5"/><path d="M36 74h48l6 11a8 8 0 0 1-7 12H37a8 8 0 0 1-7-12z" fill="url(#lhReactorGlow)" class="lh-reactor-liquid"/><circle cx="52" cy="84" r="3" fill="#ffffff" class="lh-reactor-bubble"/><circle cx="66" cy="88" r="2" fill="#ffffff" class="lh-reactor-bubble lh-reactor-bubble-late"/><rect x="44" y="12" width="32" height="8" rx="4" fill="#9d4edd"/></svg>';
    }

    function labFrozen(lab) {
        return !!(lab && lab.frozen && lab.frozen.active);
    }

    function pendingResearch() {
        var lab = state.lab;
        return (state.pendingClicks + state.inFlightClicks) * ((lab && lab.click_value) || 0);
    }

    function applyLab(result) {
        if (!result) return;
        state.lab = result;
        if (!labFrozen(result)) state.lab.research = (result.research || 0) + pendingResearch();
        state.hub.lab = state.lab;
        renderStats();
    }

    function updateLabNumbers() {
        var lab = state.lab;
        if (!lab || labFrozen(lab)) return;
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
        var breakthrough = byId('lhBreakthrough');
        if (breakthrough && lab.breakthrough) breakthrough.disabled = !lab.breakthrough.available;
        renderStats();
    }

    function upgradeRow(upgrade) {
        var maxed = upgrade.cost === null || upgrade.cost === undefined;
        return '<div class="lh-upgrade">' +
            '<div class="lh-upgrade-text"><strong>' + esc(upgrade.name) + '</strong><span>' + esc(upgrade.description) + '</span><small>Level ' + formatNumber(upgrade.level) + ' / ' + formatNumber(upgrade.max_level) + '</small></div>' +
            (maxed ? '<span class="lh-badge lh-badge-done">Max Level</span>' : '<button type="button" class="lh-btn lh-btn-small" data-upgrade="' + esc(upgrade.key) + '" data-upgrade-cost="' + esc(String(upgrade.cost)) + '" title="Buy this upgrade with research">🧪 ' + formatNumber(upgrade.cost) + '</button>') +
        '</div>';
    }

    function milestoneCard(entry, total) {
        var rewardText = entry.amount > 0 ? formatNumber(entry.amount) + ' ' + t(REWARD_LABELS[entry.type] || entry.type) : t('Achievement only');
        var action = entry.claimed ? '<span class="lh-badge lh-badge-done">Claimed</span>' : (entry.reached ? '<button type="button" class="lh-btn lh-btn-small lh-btn-primary" data-milestone="' + esc(entry.key) + '" title="Claim the reward of this milestone">Claim</button>' : '<span class="lh-badge">Locked</span>');
        var shown = Math.min(total, entry.research);
        return '<article class="lh-milestone' + (entry.claimed ? ' done' : (entry.reached ? ' ready' : '')) + '">' +
            '<div class="lh-row-between"><strong>' + esc(MILESTONE_NAMES[entry.key] || entry.key) + '</strong>' + action + '</div>' +
            '<span class="lh-milestone-reward">' + (entry.amount > 0 ? (REWARD_ICONS[entry.type] || '') + ' ' : '') + esc(rewardText) + '</span>' +
            '<div class="lh-row-between lh-goal-meta"><span>Total research</span><span>' + formatCompact(shown) + ' / ' + formatCompact(entry.research) + '</span></div>' +
            progressBar(shown, entry.research, entry.reached ? 'lh-progress-done' : '') +
        '</article>';
    }

    function breakthroughSection(lab) {
        var info = lab.breakthrough || {};
        var gained = Math.round(((info.multiplier || 1) - 1) * 1000) / 10;
        var inner = '<div class="lh-metrics">' +
                metric('Breakthroughs', formatNumber(info.count) + ' / ' + formatNumber(info.max)) +
                metric('Permanent Bonus', '+' + formatNumber(gained) + '%', 'Research bonus from all your breakthroughs') +
                metric('Next Breakthrough', '+' + formatNumber(info.bonus_percent) + '%', 'Extra bonus you get for the next breakthrough') +
            '</div>' +
            '<div class="lh-row-between"><span>Research This Run</span><span>' + formatNumber(info.progress) + ' / ' + formatNumber(info.requirement) + '</span></div>' +
            progressBar(info.progress || 0, info.requirement || 1, info.available ? 'lh-progress-done' : '') +
            '<div class="lh-actions"><button type="button" class="lh-btn lh-btn-primary" id="lhBreakthrough" title="Reset your research and upgrades for a permanent bonus"' + (info.available ? '' : ' disabled') + '>Start Breakthrough</button></div>';
        return section('Breakthrough', inner, '', 'A breakthrough resets your research and upgrades and gives you a permanent research bonus. Your total research, milestones and daily limits stay.');
    }

    function statisticsSection(lab) {
        var stats = lab.stats || {};
        return section('Lab Statistics', '<div class="lh-metrics">' +
            metric('Total Clicks', formatNumber(stats.total_clicks)) +
            metric('Clicks Today', formatNumber(stats.clicks_today)) +
            metric('Critical Discoveries', formatNumber(stats.total_crits)) +
            metric('Total Research', formatNumber(stats.total_research)) +
        '</div>');
    }

    function frozenIcon() {
        return '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20M4.2 7l15.6 10M19.8 7 4.2 17"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2M3 10l3.4.4L7 14M21 10l-3.4.4L17 14M3 14l3.4-.4L7 10M21 14l-3.4-.4L17 10"/></svg>';
    }

    function renderFrozen(content, frozen) {
        content.innerHTML =
            '<section class="lh-card lh-section lh-frozen">' +
                '<div class="lh-frozen-icon">' + frozenIcon() + '</div>' +
                '<h2 class="lh-section-title">Your lab is frozen</h2>' +
                '<p class="lh-section-hint">We detected automatic clicking. Nothing works in the idle lab until the cooldown ends. Every new flag doubles the cooldown and from the fifth flag on it grows even faster.</p>' +
                '<div class="lh-frozen-clock" id="lhFrozenClock" role="timer">' + esc(formatDuration(frozen.seconds_left)) + '</div>' +
                '<div class="lh-metrics">' + metric('Auto Clicker Flags', formatNumber(frozen.flags)) + '</div>' +
            '</section>';
        var until = Date.now() + frozen.seconds_left * 1000;
        state.labTicker = setInterval(function () {
            var left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
            var clock = byId('lhFrozenClock');
            if (clock) clock.textContent = formatDuration(left);
            if (left <= 0) {
                stopTickers();
                refreshLab();
            }
        }, 1000);
    }

    function renderLab(content) {
        var lab = state.lab;
        if (!lab || !lab.enabled) {
            content.innerHTML = '<section class="lh-card lh-section">' + empty('The idle lab is closed right now.') + '</section>';
            return;
        }
        if (labFrozen(lab)) {
            renderFrozen(content, lab.frozen);
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
                        metric('Critical Chance', formatNumber(lab.crit_chance_percent) + '%', 'Chance that a click becomes a critical discovery') +
                        metric('Critical Bonus', formatNumber(lab.crit_multiplier) + 'x', 'Research a critical discovery is worth compared to a normal click') +
                        metric('Storage Time', formatNumber(lab.cap_hours) + 'h', 'Your lab stores research for this many hours while you are away') +
                    '</div>' +
                    '<div class="lh-row-between"><span>Stored Research</span><span id="lhLabStored">' + formatNumber(Math.floor(lab.stored)) + ' / ' + formatNumber(lab.capacity) + '</span></div>' +
                    '<div class="lh-progress"><span id="lhLabStoredBar" style="width:' + (lab.capacity > 0 ? Math.min(100, lab.stored * 100 / lab.capacity) : 0) + '%"></span></div>' +
                    '<div class="lh-actions"><button type="button" class="lh-btn lh-btn-primary" id="lhLabCollect" title="Move the stored research into your lab"' + (Math.floor(lab.stored) < 1 ? ' disabled' : '') + '>Collect Research</button></div>' +
                    '<div class="lh-note" id="lhLabNote" hidden></div>' +
                '</div>' +
            '</section>' +
            section('Upgrades', '<div class="lh-upgrades" id="lhUpgrades">' + (lab.upgrades || []).map(upgradeRow).join('') + '</div>') +
            section('Milestones', '<div class="lh-milestones" id="lhMilestones">' + (lab.milestones || []).map(function (entry) { return milestoneCard(entry, lab.total_research || 0); }).join('') + '</div>', '', 'Reach research milestones over your whole lab career and claim a reward for every one of them.') +
            breakthroughSection(lab) +
            section('Convert Research', '<div class="lh-convert">' +
                '<form class="lh-convert-card" data-target="lc"><strong>💰 Lab Coins</strong><span>' + formatNumber(conversion.research_per_lab_coin) + ' research = 1 Lab Coin</span><small>Left today: ' + formatNumber(lcLeft) + ' Lab Coins</small><input type="number" class="lh-input" min="1" step="1" inputmode="numeric" placeholder="Research amount" required><output class="lh-convert-preview">= 0</output><button type="submit" class="lh-btn" title="Convert research into Lab Coins">Convert</button></form>' +
                '<form class="lh-convert-card' + (conversion.discord_linked ? '' : ' locked') + '" data-target="xp"><strong>⭐ XP</strong><span>1 research = ' + formatNumber(conversion.xp_per_research) + ' XP</span><small>' + (conversion.discord_linked ? 'Left today: ' + formatNumber(xpLeft) + ' XP' : 'Link your Discord account to convert into XP') + '</small><input type="number" class="lh-input" min="1" step="1" inputmode="numeric" placeholder="Research amount" required' + (conversion.discord_linked ? '' : ' disabled') + '><output class="lh-convert-preview">= 0</output><button type="submit" class="lh-btn" title="Convert research into XP"' + (conversion.discord_linked ? '' : ' disabled') + '>Convert</button></form>' +
            '</div>', '', 'Daily limits keep the economy fair for everyone.') +
            statisticsSection(lab);
        updateLabNumbers();
        var reactor = byId('lhReactor');
        reactor.addEventListener('click', onReactorClick);
        reactor.addEventListener('keydown', function (event) {
            if (event.repeat) event.preventDefault();
        });
        byId('lhLabCollect').addEventListener('click', function () { collectLab(this); });
        byId('lhUpgrades').addEventListener('click', function (event) {
            var button = event.target.closest('[data-upgrade]');
            if (button && !button.disabled) buyUpgrade(button.getAttribute('data-upgrade'), button);
        });
        byId('lhMilestones').addEventListener('click', function (event) {
            var button = event.target.closest('[data-milestone]');
            if (button && !button.disabled) claimMilestone(button.getAttribute('data-milestone'), button);
        });
        byId('lhBreakthrough').addEventListener('click', function () { startBreakthrough(this); });
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
            if (labFrozen(current)) return;
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

    function chunkSize() {
        var configured = state.lab && state.lab.click_chunk_size;
        return Math.max(1, Math.min(MAX_CLICK_BATCH, parseInt(configured, 10) || DEFAULT_CHUNK_SIZE));
    }

    function nowMilliseconds() {
        return global.performance && performance.now ? performance.now() : Date.now();
    }

    function onReactorClick(event) {
        var lab = state.lab;
        if (!lab || labFrozen(lab) || (event && event.isTrusted === false)) return;
        state.clickStamps.push(nowMilliseconds());
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
        if (state.pendingClicks >= chunkSize()) {
            flushClicks();
            return;
        }
        clearTimeout(state.clickTimer);
        state.clickTimer = setTimeout(flushClicks, CLICK_IDLE_FLUSH_MS);
        if (!state.clickMaxTimer) state.clickMaxTimer = setTimeout(flushClicks, CLICK_MAX_WAIT_MS);
    }

    function clickGaps(stamps) {
        var gaps = [];
        for (var index = 1; index < stamps.length; index++) gaps.push(Math.max(0, Math.min(60000, Math.round(stamps[index] - stamps[index - 1]))));
        return gaps;
    }

    function resetClickTimers() {
        clearTimeout(state.clickTimer);
        clearTimeout(state.clickMaxTimer);
        state.clickTimer = null;
        state.clickMaxTimer = null;
    }

    async function flushClicks() {
        resetClickTimers();
        if (state.clickBusy || !state.pendingClicks) return;
        var count = Math.min(MAX_CLICK_BATCH, state.pendingClicks);
        var stamps = state.clickStamps.splice(0, count);
        state.pendingClicks -= count;
        state.inFlightClicks = count;
        state.clickBusy = true;
        var retry = false;
        try {
            var result = await api('/lab/click', { method: 'POST', body: { count: count, gaps: clickGaps(stamps) } });
            state.inFlightClicks = 0;
            applyLab(result);
            if (state.tab === 'lab') updateLabNumbers();
            if (result.crits) floatText(null, t('Critical discovery!') + ' x' + result.crits);
        } catch (error) {
            state.inFlightClicks = 0;
            if (error && error.status === 423) {
                state.pendingClicks = 0;
                state.clickStamps = [];
                await refreshLab();
            } else if (error && error.status === 401) {
                requireLogin();
            } else if (!error || !error.status || error.status === 429 || error.status >= 500) {
                state.pendingClicks += count;
                state.clickStamps = stamps.concat(state.clickStamps);
                retry = true;
            } else {
                state.pendingClicks = 0;
                state.clickStamps = [];
                failure(error, t('The experiment failed.'));
                await refreshLab();
            }
        } finally {
            state.clickBusy = false;
            if (state.pendingClicks >= chunkSize() && !retry) flushClicks();
            else if (state.pendingClicks && !state.clickTimer) state.clickTimer = setTimeout(flushClicks, retry ? CLICK_RETRY_MS : CLICK_IDLE_FLUSH_MS);
        }
    }

    async function flushAll() {
        var deadline = Date.now() + 8000;
        while ((state.clickBusy || state.pendingClicks) && Date.now() < deadline) {
            if (!state.clickBusy) await flushClicks();
            else await wait(40);
        }
    }

    function flushOnLeave() {
        if (!state.pendingClicks || !state.lab || labFrozen(state.lab)) return;
        var count = Math.min(MAX_CLICK_BATCH, state.pendingClicks);
        var stamps = state.clickStamps.splice(0, count);
        state.pendingClicks -= count;
        try {
            global.fetch(RWL.apiUrl('/api/growth/lab/click'), { method: 'POST', headers: RWL.authHeaders(), body: JSON.stringify({ count: count, gaps: clickGaps(stamps) }), keepalive: true }).catch(function () {});
        } catch (error) {}
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
        await flushAll();
        try {
            var result = await api('/lab/collect', { method: 'POST' });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            toast(result.collected ? 'Collected ' + formatNumber(result.collected) + ' research.' : t('There was nothing to collect yet.'));
        } catch (error) {
            button.disabled = false;
            if (error && error.status === 423) return refreshLab();
            failure(error, t('The research could not be collected.'));
        }
    }

    async function buyUpgrade(key, button) {
        button.disabled = true;
        await flushAll();
        try {
            var result = await api('/lab/upgrade', { method: 'POST', body: { key: key } });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            toast(t('Upgrade installed!'));
        } catch (error) {
            button.disabled = false;
            if (error && error.status === 423) return refreshLab();
            failure(error, t('The upgrade could not be bought.'));
        }
    }

    async function claimMilestone(key, button) {
        button.disabled = true;
        await flushAll();
        try {
            var result = await api('/lab/milestone', { method: 'POST', body: { key: key } });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            var reward = result.reward || {};
            toast(reward.amount > 0 ? 'You received ' + formatNumber(reward.amount) + ' ' + t(REWARD_LABELS[reward.type] || reward.type) + '.' : t('Milestone completed!'));
        } catch (error) {
            button.disabled = false;
            if (error && error.status === 423) return refreshLab();
            failure(error, t('The reward could not be claimed.'));
        }
    }

    async function startBreakthrough(button) {
        var info = (state.lab && state.lab.breakthrough) || {};
        var confirmed = await confirmDialog(t('Start a breakthrough?'), t('Your research, stored research and all upgrades are reset. You keep your total research, milestones and daily limits and gain a permanent research bonus.'));
        if (!confirmed) return;
        button.disabled = true;
        await flushAll();
        try {
            var result = await api('/lab/breakthrough', { method: 'POST' });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            toast(t('Breakthrough achieved!'));
        } catch (error) {
            button.disabled = !info.available;
            if (error && error.status === 423) return refreshLab();
            failure(error, t('The breakthrough failed.'));
        }
    }

    async function convertResearch(target, input, button) {
        var amount = parseInt(input.value, 10);
        if (!amount || amount < 1 || String(amount) !== String(input.value).trim()) {
            markInvalid(input);
            return;
        }
        button.disabled = true;
        await flushAll();
        try {
            var result = await api('/lab/convert', { method: 'POST', body: { target: target, research: amount } });
            applyLab(result);
            if (state.tab === 'lab') renderLab(byId('lhContent'));
            var converted = result.converted || {};
            toast('You received ' + formatNumber(converted.amount) + (target === 'lc' ? ' Lab Coins.' : ' XP.'));
        } catch (error) {
            button.disabled = false;
            if (error && error.status === 423) return refreshLab();
            failure(error, t('The research could not be converted.'));
        }
    }

    var CARD_PREVIEW_DELAY_MS = 800;
    var CARD_PICK_PAGE = 24;
    var HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
    var COLOR_LABELS = { background_a: 'Background 1', background_b: 'Background 2', accent: 'Accent', text: 'Text', panel: 'Panels' };
    var SHOW_LABELS = { level: 'Lab Pass level', activity: 'Activity points', member_since: 'Member since', account_type: 'Account type', badges: 'Badges', tools: 'Favourite tools', socials: 'Social links', pet: 'Personal pet' };
    var PART_LABELS = { name_color: 'Name Colour', border: 'Card Border', avatar_decoration: 'Avatar Decoration', nameplate: 'Nameplate' };
    var MODE_LABELS = { profile: 'Same as my profile', none: 'None', item: 'Choose for this card' };
    var cardState = { editor: null, draft: null, dirty: false, previewTimer: null, previewToken: 0, animated: false, kind: 'image/png', pick: {} };

    function cloneValue(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function cardOptions() {
        return (cardState.editor && cardState.editor.options) || {};
    }

    function optionList(entries, selected) {
        return (entries || []).map(function (entry) {
            var key = typeof entry === 'string' ? entry : entry.key;
            var name = typeof entry === 'string' ? entry.charAt(0).toUpperCase() + entry.slice(1) : entry.name;
            return '<option value="' + esc(key) + '"' + (key === selected ? ' selected' : '') + '>' + esc(name) + '</option>';
        }).join('');
    }

    function rangeField(label, path, value, bounds, step, suffix) {
        return '<label class="lh-field lh-card-range"><span>' + esc(label) + ' <b data-range-value="' + esc(path) + '">' + esc(String(value)) + esc(suffix || '') + '</b></span><input type="range" class="lh-range" data-card-range="' + esc(path) + '" data-suffix="' + esc(suffix || '') + '" min="' + bounds[0] + '" max="' + bounds[1] + '" step="' + step + '" value="' + esc(String(value)) + '"></label>';
    }

    function setPath(target, path, value) {
        var parts = path.split('.');
        var node = target;
        for (var index = 0; index < parts.length - 1; index++) node = node[parts[index]];
        node[parts[parts.length - 1]] = value;
    }

    function ownedOf(part) {
        return ((cardState.editor && cardState.editor.owned) || {})[part] || [];
    }

    function findOwned(part, itemId) {
        var items = ownedOf(part);
        for (var index = 0; index < items.length; index++) if (items[index].item_id === itemId) return items[index];
        return null;
    }

    function itemLabel(item) {
        return item.name || item.item_id;
    }

    function itemSwatch(part, item) {
        if (part === 'name_color') return '<i class="lh-item-swatch" style="--rwl-keep:1;background:' + (item.gradient ? 'linear-gradient(90deg,' + item.gradient.map(function (color) { return RWL.sanitizeHex(color, '#e0aaff'); }).join(',') + ')' : RWL.sanitizeHex(item.hex, '#e0aaff')) + '"></i>';
        if (part === 'border') return '<i class="lh-item-swatch" style="--rwl-keep:1;background:linear-gradient(90deg,' + (item.colors || ['#e0aaff']).concat((item.colors || ['#e0aaff'])[0]).map(function (color) { return RWL.sanitizeHex(color, '#e0aaff'); }).join(',') + ')"></i>';
        if (part === 'avatar_decoration' && (item.thumb_url || item.asset_url)) return '<img class="lh-item-thumb" src="' + esc(pictureUrl(item.thumb_url || item.asset_url)) + '" alt="" loading="lazy" decoding="async">';
        return '<i class="lh-item-swatch lh-item-plate"></i>';
    }

    function itemPickerHtml(part) {
        var pick = cardState.pick[part] || (cardState.pick[part] = { query: '', page: 0 });
        var selected = cardState.draft[part].item_id;
        var query = pick.query.trim().toLowerCase();
        var items = ownedOf(part).filter(function (item) { return !query || itemLabel(item).toLowerCase().indexOf(query) >= 0; });
        var pages = Math.max(1, Math.ceil(items.length / CARD_PICK_PAGE));
        pick.page = Math.max(0, Math.min(pick.page, pages - 1));
        var visible = items.slice(pick.page * CARD_PICK_PAGE, (pick.page + 1) * CARD_PICK_PAGE);
        return '<div class="lh-item-tools"><input type="search" class="lh-input" data-item-search="' + part + '" maxlength="60" placeholder="Search your items" value="' + esc(pick.query) + '"><span class="lh-muted">' + formatNumber(items.length) + ' items</span></div>' +
            (visible.length ? '<div class="lh-item-grid">' + visible.map(function (item) {
                return '<button type="button" class="lh-item' + (item.item_id === selected ? ' active' : '') + '" data-item-part="' + part + '" data-item-id="' + esc(item.item_id) + '" style="' + rarityStyle(item.rarity || 'Common') + '" title="' + esc(itemLabel(item) + ' · ' + (item.rarity || '')) + '">' + itemSwatch(part, item) + '<span translate="no">' + esc(itemLabel(item)) + '</span></button>';
            }).join('') + '</div>' : empty(ownedOf(part).length ? 'Nothing matches your search.' : 'You have not unlocked any items of this kind yet.')) +
            (pages > 1 ? '<div class="lh-pick-pager"><button type="button" class="lh-btn lh-btn-small" data-item-page="' + part + '" data-step="-1"' + (pick.page <= 0 ? ' disabled' : '') + ' title="Previous page">‹</button><span>Page ' + (pick.page + 1) + ' / ' + pages + '</span><button type="button" class="lh-btn lh-btn-small" data-item-page="' + part + '" data-step="1"' + (pick.page >= pages - 1 ? ' disabled' : '') + ' title="Next page">›</button></div>' : '');
    }

    function partHtml(part) {
        var value = cardState.draft[part];
        var filters = cardOptions().filters || {};
        var modes = part === 'border' ? ['none', 'item'] : ['profile', 'none', 'item'];
        var html = '<div class="lh-segment lh-card-modes">' + modes.map(function (mode) {
            return '<button type="button" class="lh-segment-btn' + (value.mode === mode ? ' active' : '') + '" data-part-mode="' + part + '" data-mode="' + mode + '" title="' + esc(MODE_LABELS[mode]) + '">' + esc(part === 'border' && mode === 'item' ? 'Use a border' : MODE_LABELS[mode]) + '</button>';
        }).join('') + '</div>';
        if (value.mode !== 'item') return html + (value.mode === 'profile' ? '<p class="lh-note">The card shows whatever you have equipped on your profile, including your inventory settings.</p>' : '');
        html += '<div data-item-picker="' + part + '">' + itemPickerHtml(part) + '</div>';
        if (!value.item_id) return html + '<p class="lh-note">Pick an item to customise it for this card. Your inventory stays untouched.</p>';
        html += '<div class="lh-card-custom"><p class="lh-note">These settings only apply to your profile card.</p>';
        if (part === 'border') {
            var item = findOwned('border', value.item_id) || {};
            var colors = value.colors && value.colors.length ? value.colors : (item.colors || []);
            html += '<div class="lh-color-row">' + colors.map(function (color, index) {
                return '<label class="lh-color" title="Border colour ' + (index + 1) + '"><input type="color" data-border-color="' + index + '" value="' + esc(RWL.sanitizeHex(color, '#9d4edd')) + '"><span>Colour ' + (index + 1) + '</span></label>';
            }).join('') + '<button type="button" class="lh-btn lh-btn-small" data-border-reset title="Use the original colours of this border">Original Colours</button></div>' +
                rangeField('Thickness', 'border.thickness', value.thickness, [1, 6], 1, '');
        } else if (part !== 'name_color') {
            html += rangeField('Hue', part + '.hue', value.hue, filters.hue || [-180, 180], 1, '°') + rangeField('Saturation', part + '.saturation', value.saturation, filters.saturation || [0, 300], 1, '%') + rangeField('Brightness', part + '.brightness', value.brightness, filters.brightness || [50, 150], 1, '%');
        }
        return html + rangeField('Speed', part + '.speed', value.speed, filters.speed || [0.5, 2], 0.25, 'x') + '</div>';
    }

    function socialsHtml() {
        var options = cardOptions();
        var used = cardState.draft.socials.map(function (entry) { return entry.platform; });
        var free = (options.platforms || []).filter(function (platform) { return used.indexOf(platform.key) < 0; });
        var rows = cardState.draft.socials.map(function (entry, index) {
            var platform = (options.platforms || []).filter(function (candidate) { return candidate.key === entry.platform; })[0] || { name: entry.platform, color: '#e0aaff', prefix: '' };
            return '<li class="lh-social-row"><i class="lh-social-dot" style="--rwl-keep:1;background:' + RWL.sanitizeHex(platform.color, '#e0aaff') + '"></i><b>' + esc(platform.name) + '</b><span translate="no">' + esc(platform.prefix + entry.handle) + '</span><button type="button" class="lh-btn lh-btn-small" data-social-remove="' + index + '" title="Remove this link">✕</button></li>';
        }).join('');
        var full = cardState.draft.socials.length >= (options.max_socials || 6);
        return (rows ? '<ul class="lh-social-list">' + rows + '</ul>' : '<p class="lh-note">No social links yet.</p>') +
            (full || !free.length ? '<p class="lh-note">You reached the maximum number of links.</p>' : '<div class="lh-social-add"><select class="lh-select" id="lhSocialPlatform" title="Choose a platform">' + optionList(free, free[0].key) + '</select><input type="text" class="lh-input" id="lhSocialHandle" maxlength="40" placeholder="Your username" autocomplete="off" spellcheck="false"><button type="button" class="lh-btn" id="lhSocialAdd" title="Add this link to your card">Add Link</button></div>') +
            '<p class="lh-note">Only usernames on the listed platforms are allowed. Links to other websites cannot be added.</p>';
    }

    function group(key, title, inner, open) {
        return '<details class="lh-card-group" data-card-group="' + key + '"' + (open ? ' open' : '') + '><summary title="Show or hide ' + esc(title) + '">' + esc(title) + '</summary><div class="lh-card-group-body" data-group-body="' + key + '">' + inner + '</div></details>';
    }

    function editorHtml() {
        var draft = cardState.draft;
        var options = cardOptions();
        var layouts = '<div class="lh-layout-grid">' + (options.layouts || []).map(function (layout) {
            return '<button type="button" class="lh-layout' + (layout.key === draft.layout ? ' active' : '') + '" data-layout="' + esc(layout.key) + '" title="' + esc(layout.name) + '"><i class="lh-layout-icon lh-layout-' + esc(layout.archetype) + (layout.mirror ? ' mirror' : '') + '"><b></b><u></u></i><span>' + esc(layout.name) + '</span></button>';
        }).join('') + '</div>';
        var presets = '<div class="lh-preset-row">' + (options.color_presets || []).map(function (preset, index) {
            return '<button type="button" class="lh-preset" data-preset="' + index + '" title="' + esc(preset.name) + '" style="--rwl-keep:1;background:linear-gradient(135deg,' + RWL.sanitizeHex(preset.background_a, '#160f24') + ' 0 45%,' + RWL.sanitizeHex(preset.accent, '#9d4edd') + ' 45% 70%,' + RWL.sanitizeHex(preset.panel, '#7b2cbf') + ' 70%)"></button>';
        }).join('') + '</div>';
        var colors = '<div class="lh-color-row">' + Object.keys(COLOR_LABELS).map(function (key) {
            return '<label class="lh-color" title="' + esc(COLOR_LABELS[key]) + '"><input type="color" data-card-color="' + key + '" value="' + esc(RWL.sanitizeHex(draft.colors[key], '#9d4edd')) + '"><span>' + esc(COLOR_LABELS[key]) + '</span></label>';
        }).join('') + '</div>';
        var style = '<div class="lh-card-two"><label class="lh-field"><span>Font</span><select class="lh-select" data-card-select="font">' + optionList(options.fonts, draft.font) + '</select></label>' +
            '<label class="lh-field"><span>Background</span><select class="lh-select" data-card-select="background">' + optionList(options.backgrounds, draft.background) + '</select></label>' +
            '<label class="lh-field"><span>Avatar Shape</span><select class="lh-select" data-card-select="avatar_shape">' + optionList(options.avatar_shapes, draft.avatar_shape) + '</select></label>' +
            '<label class="lh-field"><span>Tag Style</span><select class="lh-select" data-card-select="pill_style">' + optionList(options.pill_styles, draft.pill_style) + '</select></label></div>' +
            rangeField('Panel Opacity', 'panel_opacity', draft.panel_opacity, [0, 100], 1, '%') + rangeField('Corner Radius', 'corner_radius', draft.corner_radius, [0, 60], 1, '') +
            '<label class="lh-check"><input type="checkbox" data-card-flag="glow"' + (draft.glow ? ' checked' : '') + '><span>Background glow</span></label>' +
            '<label class="lh-check"><input type="checkbox" data-card-flag="avatar_ring"' + (draft.avatar_ring ? ' checked' : '') + '><span>Ring around the avatar</span></label>';
        var content = '<label class="lh-field"><span>Tagline</span><input type="text" class="lh-input" id="lhCardTagline" maxlength="' + (options.tagline_max || 60) + '" placeholder="A short line below your name" value="' + esc(draft.tagline) + '"></label><div class="lh-card-two">' + Object.keys(SHOW_LABELS).map(function (key) {
            return '<label class="lh-check"><input type="checkbox" data-card-show="' + key + '"' + (draft.show[key] ? ' checked' : '') + '><span>' + esc(SHOW_LABELS[key]) + '</span></label>';
        }).join('') + '</div>';
        return group('layout', 'Layout', layouts, true) + group('colors', 'Colours', presets + colors, false) + group('style', 'Style And Font', style, false) + group('content', 'Content', content, false) + group('socials', 'Social Links', socialsHtml(), false) +
            ['name_color', 'border', 'avatar_decoration', 'nameplate'].map(function (part) { return group(part, PART_LABELS[part], partHtml(part), false); }).join('');
    }

    function renderCard(content) {
        content.innerHTML = '<section class="lh-card lh-section lh-card-section lh-card-editor">' +
            '<div class="lh-card-stage"><div class="lh-card-preview" id="lhCardPreview">' + empty('Generating your card...') + '</div>' +
                '<div class="lh-card-status" id="lhCardStatus"></div>' +
                '<div class="lh-actions lh-card-actions">' +
                    '<button type="button" class="lh-btn lh-btn-primary" id="lhCardSave" title="Save this design as your profile card" disabled>Save Card</button>' +
                    '<button type="button" class="lh-btn" id="lhCardAnimate" title="Render the animated version of your current design">Preview Animation</button>' +
                    '<button type="button" class="lh-btn" id="lhCardDownload" title="Save the card as an image file" disabled>Download</button>' +
                    '<button type="button" class="lh-btn" id="lhCardCopy" title="Copy the image to your clipboard" disabled>Copy Image</button>' +
                    '<button type="button" class="lh-btn" id="lhCardShare" title="Post your saved card in the showcase channel of our Discord server">Post To Discord</button>' +
                    '<button type="button" class="lh-btn" id="lhCardReset" title="Go back to the default card design">Reset Design</button>' +
                '</div></div>' +
            '<div class="lh-card-side"><h2 class="lh-section-title">Profile Card</h2><p class="lh-section-hint">Design your own card. Cards with animated parts are created as a looping GIF, everything else as a PNG.</p><div id="lhCardEditor">' + empty('Loading...') + '</div></div></section>';
        byId('lhCardSave').addEventListener('click', function () { saveCard(this); });
        byId('lhCardAnimate').addEventListener('click', function () { requestPreview(true); });
        byId('lhCardDownload').addEventListener('click', downloadCard);
        byId('lhCardCopy').addEventListener('click', copyCard);
        byId('lhCardShare').addEventListener('click', function () { shareCard(this); });
        byId('lhCardReset').addEventListener('click', function () { resetCard(this); });
        bindCardEditor(byId('lhCardEditor'));
        if (cardState.editor) {
            byId('lhCardEditor').innerHTML = editorHtml();
            if (state.cardUrl) showCard();
            else requestPreview(false);
            syncCardButtons();
            return;
        }
        api('/card/config').then(function (editor) {
            cardState.editor = editor;
            cardState.draft = cloneValue(editor.config);
            cardState.dirty = false;
            if (state.tab !== 'card') return;
            byId('lhCardEditor').innerHTML = editorHtml();
            syncCardButtons();
            loadCard(true);
        }).catch(function (error) {
            if (error && error.status === 401) return requireLogin();
            var box = byId('lhCardEditor');
            if (box) box.innerHTML = empty((error && error.message) || 'The card editor could not be loaded.');
        });
    }

    function syncCardButtons() {
        var save = byId('lhCardSave');
        if (save) save.disabled = !cardState.dirty;
        var status = byId('lhCardStatus');
        if (status) status.textContent = cardState.dirty ? 'Unsaved changes' : '';
    }

    function refreshGroup(key) {
        var body = document.querySelector('[data-group-body="' + key + '"]');
        if (!body) return;
        body.innerHTML = key === 'socials' ? socialsHtml() : partHtml(key);
    }

    function cardChanged(skipPreview) {
        cardState.dirty = true;
        syncCardButtons();
        if (skipPreview) return;
        clearTimeout(cardState.previewTimer);
        cardState.previewTimer = setTimeout(function () { requestPreview(false); }, CARD_PREVIEW_DELAY_MS);
    }

    function bindCardEditor(editor) {
        editor.addEventListener('click', function (event) {
            var draft = cardState.draft;
            if (!draft) return;
            var layout = event.target.closest('[data-layout]');
            if (layout) {
                draft.layout = layout.getAttribute('data-layout');
                editor.querySelectorAll('[data-layout]').forEach(function (button) { button.classList.toggle('active', button === layout); });
                return cardChanged();
            }
            var preset = event.target.closest('[data-preset]');
            if (preset) {
                var colors = (cardOptions().color_presets || [])[parseInt(preset.getAttribute('data-preset'), 10)];
                if (!colors) return;
                Object.keys(COLOR_LABELS).forEach(function (key) {
                    draft.colors[key] = colors[key];
                    var input = editor.querySelector('[data-card-color="' + key + '"]');
                    if (input) input.value = RWL.sanitizeHex(colors[key], '#9d4edd');
                });
                return cardChanged();
            }
            var mode = event.target.closest('[data-part-mode]');
            if (mode) {
                var part = mode.getAttribute('data-part-mode');
                draft[part].mode = mode.getAttribute('data-mode');
                refreshGroup(part);
                return cardChanged(draft[part].mode === 'item' && !draft[part].item_id);
            }
            var item = event.target.closest('[data-item-id]');
            if (item) {
                var itemPart = item.getAttribute('data-item-part');
                draft[itemPart].item_id = item.getAttribute('data-item-id');
                if (itemPart === 'border') draft.border.colors = [];
                refreshGroup(itemPart);
                return cardChanged();
            }
            var pager = event.target.closest('[data-item-page]');
            if (pager && !pager.disabled) {
                var pagePart = pager.getAttribute('data-item-page');
                cardState.pick[pagePart].page += parseInt(pager.getAttribute('data-step'), 10);
                var holder = editor.querySelector('[data-item-picker="' + pagePart + '"]');
                if (holder) holder.innerHTML = itemPickerHtml(pagePart);
                return;
            }
            if (event.target.closest('[data-border-reset]')) {
                draft.border.colors = [];
                refreshGroup('border');
                return cardChanged();
            }
            var remove = event.target.closest('[data-social-remove]');
            if (remove) {
                draft.socials.splice(parseInt(remove.getAttribute('data-social-remove'), 10), 1);
                refreshGroup('socials');
                return cardChanged();
            }
            if (event.target.closest('#lhSocialAdd')) addSocial();
        });
        editor.addEventListener('input', function (event) {
            var draft = cardState.draft;
            var target = event.target;
            if (!draft) return;
            if (target.matches('[data-card-range]')) {
                var path = target.getAttribute('data-card-range');
                var number = parseFloat(target.value);
                setPath(draft, path, number);
                var label = editor.querySelector('[data-range-value="' + path + '"]');
                if (label) label.textContent = number + target.getAttribute('data-suffix');
                return cardChanged();
            }
            if (target.matches('[data-card-color]') && HEX_PATTERN.test(target.value)) {
                draft.colors[target.getAttribute('data-card-color')] = target.value.toUpperCase();
                return cardChanged();
            }
            if (target.matches('[data-border-color]') && HEX_PATTERN.test(target.value)) {
                var entry = findOwned('border', draft.border.item_id) || {};
                if (!draft.border.colors.length) draft.border.colors = (entry.colors || []).slice();
                draft.border.colors[parseInt(target.getAttribute('data-border-color'), 10)] = target.value.toUpperCase();
                return cardChanged();
            }
            if (target.id === 'lhCardTagline') {
                draft.tagline = target.value.slice(0, cardOptions().tagline_max || 60);
                return cardChanged();
            }
            if (target.matches('[data-item-search]')) {
                var part = target.getAttribute('data-item-search');
                cardState.pick[part].query = target.value.slice(0, 60);
                cardState.pick[part].page = 0;
                var caret = target.selectionStart;
                var holder = editor.querySelector('[data-item-picker="' + part + '"]');
                if (holder) holder.innerHTML = itemPickerHtml(part);
                var again = editor.querySelector('[data-item-search="' + part + '"]');
                if (again) {
                    again.focus();
                    try { again.setSelectionRange(caret, caret); } catch (error) {}
                }
            }
        });
        editor.addEventListener('change', function (event) {
            var draft = cardState.draft;
            var target = event.target;
            if (!draft) return;
            if (target.matches('[data-card-select]')) {
                draft[target.getAttribute('data-card-select')] = target.value;
                cardChanged();
            } else if (target.matches('[data-card-flag]')) {
                draft[target.getAttribute('data-card-flag')] = target.checked;
                cardChanged();
            } else if (target.matches('[data-card-show]')) {
                draft.show[target.getAttribute('data-card-show')] = target.checked;
                cardChanged();
            }
        });
        editor.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && event.target.id === 'lhSocialHandle') {
                event.preventDefault();
                addSocial();
            }
        });
    }

    function addSocial() {
        var select = byId('lhSocialPlatform');
        var input = byId('lhSocialHandle');
        if (!select || !input) return;
        var platform = (cardOptions().platforms || []).filter(function (candidate) { return candidate.key === select.value; })[0];
        var handle = input.value.trim().replace(/^@/, '');
        if (platform && platform.key === 'discord') handle = handle.toLowerCase();
        var valid = false;
        try { valid = !!platform && new RegExp(platform.pattern).test(handle); } catch (error) { valid = false; }
        if (!valid) {
            markInvalid(input);
            return;
        }
        cardState.draft.socials.push({ platform: platform.key, handle: handle });
        refreshGroup('socials');
        cardChanged();
    }

    function cardBody() {
        var draft = cloneValue(cardState.draft);
        ['name_color', 'border', 'avatar_decoration', 'nameplate'].forEach(function (part) {
            if (draft[part].mode === 'item' && !draft[part].item_id) draft[part].mode = part === 'border' ? 'none' : 'profile';
            if (draft[part].mode !== 'item') draft[part].item_id = null;
        });
        if (draft.border.mode !== 'item') draft.border.colors = [];
        return draft;
    }

    function setCardImage(blob) {
        if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
        state.cardBlob = blob;
        state.cardUrl = URL.createObjectURL(blob);
        cardState.kind = blob.type === 'image/gif' ? 'image/gif' : 'image/png';
        showCard();
    }

    async function cardRequest(path, options) {
        var response = await fetch(RWL.apiUrl('/api/growth' + path), options);
        if (!response.ok) {
            var data = null;
            try { data = await response.json(); } catch (error) { data = null; }
            var problem = new Error(RWL.errorDetail(data, 'The card could not be created.'));
            problem.status = response.status;
            throw problem;
        }
        return response.blob();
    }

    async function requestPreview(animated) {
        if (!cardState.draft) return;
        clearTimeout(cardState.previewTimer);
        var token = ++cardState.previewToken;
        var preview = byId('lhCardPreview');
        var animate = byId('lhCardAnimate');
        if (preview) preview.classList.add('loading');
        if (animated && animate) animate.disabled = true;
        try {
            var headers = RWL.authHeaders();
            headers['Content-Type'] = 'application/json';
            var blob = await cardRequest('/card/preview', { method: 'POST', headers: headers, body: JSON.stringify({ config: cardBody(), animated: !!animated }) });
            if (token !== cardState.previewToken) return;
            setCardImage(blob);
            if (animated && blob.type !== 'image/gif') toast(t('This design has no animated parts, so it stays a still image.'));
        } catch (error) {
            if (error && error.status === 401) return requireLogin();
            if (token === cardState.previewToken) {
                var status = byId('lhCardStatus');
                if (status) status.textContent = (error && error.message) || 'The preview could not be created.';
            }
        } finally {
            preview = byId('lhCardPreview');
            if (preview && token === cardState.previewToken) preview.classList.remove('loading');
            animate = byId('lhCardAnimate');
            if (animate) animate.disabled = false;
        }
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
            setCardImage(await cardRequest('/card', { method: 'GET', headers: RWL.authHeaders() }));
        } catch (error) {
            if (error && error.status === 401) return requireLogin();
            preview = byId('lhCardPreview');
            if (preview) preview.innerHTML = empty((error && error.message) || 'The card could not be created.');
        }
    }

    async function saveCard(button) {
        button.disabled = true;
        try {
            var result = await api('/card/config', { method: 'POST', body: cardBody() });
            cardState.editor.config = result.config;
            cardState.editor.saved = true;
            cardState.draft = cloneValue(result.config);
            cardState.dirty = false;
            syncCardButtons();
            toast(t('Your profile card was saved.'));
            loadCard(true);
        } catch (error) {
            button.disabled = false;
            failure(error, t('The card could not be saved.'));
        }
    }

    async function resetCard(button) {
        var confirmed = await confirmDialog(t('Reset Design'), t('Your saved card design will be replaced by the default design. Continue?'));
        if (!confirmed) return;
        button.disabled = true;
        try {
            var result = await api('/card/reset', { method: 'POST' });
            cardState.editor.config = result.config;
            cardState.draft = cloneValue(result.config);
            cardState.dirty = false;
            cardState.pick = {};
            byId('lhCardEditor').innerHTML = editorHtml();
            syncCardButtons();
            loadCard(true);
        } catch (error) {
            failure(error, t('The card could not be reset.'));
        } finally {
            button.disabled = false;
        }
    }

    function downloadCard() {
        if (!state.cardUrl) return;
        var link = document.createElement('a');
        link.href = state.cardUrl;
        link.download = cardState.kind === 'image/gif' ? 'rickware_labs_card.gif' : 'rickware_labs_card.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async function copyCard() {
        try {
            if (!state.cardBlob || cardState.kind !== 'image/png' || !global.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error('unsupported');
            await navigator.clipboard.write([new global.ClipboardItem({ 'image/png': state.cardBlob })]);
            toast(t('The card was copied to your clipboard.'));
        } catch (error) {
            toast(cardState.kind === 'image/gif' ? t('Animated cards cannot be copied. Use the download button instead.') : t('Your browser cannot copy images. Use the download button instead.'), 'error');
        }
    }

    async function shareCard(button) {
        if (cardState.dirty) {
            toast(t('Save your card first. Only the saved design is posted.'), 'error');
            return;
        }
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

    var CODE_ITEM_CATEGORIES = { name_colors: 'Name Colors', nameplates: 'Nameplates', avatar_decorations: 'Avatar Decorations', launcher_themes: 'Launcher Themes', nameplate_outlines: 'Nameplate Outlines', content_borders: 'Content Borders' };
    var CODE_CURRENCIES = { lab_coins: ['💰', 'Lab Coins'], xp: ['⭐', 'XP'], chests: ['🎁', 'Mystery Chests'], crates: ['📦', 'Experiment Crates'], research: ['🧪', 'Research'] };
    var REVEAL_STEP_MS = 70;
    var REVEAL_MAX_DELAY_MS = 1400;

    function mediaSource(path) {
        if (!path) return '';
        return /^https?:\/\//.test(path) ? path : RWL.apiUrl(path);
    }

    function revealNameStyle(item) {
        return RWL.nameColorStyle({
            name_color_hex: item.hex,
            name_color_animated: item.animated,
            name_color_gradient: item.gradient,
            name_color_animation_seconds: item.animation_seconds,
            name_color_speed: item.speed,
            name_color_effect: item.effect,
            name_color_direction: item.direction
        }, '#ffffff');
    }

    function revealThemeColors(item) {
        var colors = (item.preview || []).map(function (color) { return RWL.sanitizeHex(color, '#7b2cbf'); });
        return colors.length ? colors : ['#7b2cbf', '#c97eff', '#14002a'];
    }

    function revealVisual(item) {
        switch (item.category) {
            case 'name_colors':
                return '<span class="lh-reveal-name" translate="no" style="' + esc(revealNameStyle(item)) + '">' + esc(item.name || item.item_id || '') + '</span>';
            case 'nameplates':
                return '<video class="lh-reveal-media" muted loop playsinline preload="none" data-reveal-src="' + esc(mediaSource(item.asset_url)) + '"></video>';
            case 'avatar_decorations':
                return '<img class="lh-reveal-media lh-reveal-contain" alt="" decoding="async" loading="lazy" src="' + esc(mediaSource(item.thumb_url || item.asset_url)) + '">';
            case 'launcher_themes':
                return '<div class="lh-reveal-theme">' + revealThemeColors(item).map(function (color) { return '<span style="--rwl-keep:1;background:' + color + ';"></span>'; }).join('') + '</div>';
            case 'nameplate_outlines':
                return '<div class="lh-reveal-frame lh-reveal-frame-plate' + RWL.frameClasses(item) + '" style="' + esc(RWL.frameStyle(item)) + '"><span translate="no">' + esc(item.name || '') + '</span></div>';
            case 'content_borders':
                return '<div class="lh-reveal-frame lh-reveal-frame-box' + RWL.frameClasses(item) + '" style="' + esc(RWL.frameStyle(item)) + '"><span></span><span></span></div>';
            default:
                return '<span class="lh-reveal-name" translate="no">' + esc(item.name || item.item_id || '') + '</span>';
        }
    }

    function revealDelay(index) {
        return Math.min(index * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS);
    }

    function revealCurrencyBox(entry, index) {
        var meta = CODE_CURRENCIES[entry.type] || ['🎉', entry.type];
        return '<div class="lh-reveal-box lh-reveal-currency" style="--lh-reveal-delay:' + revealDelay(index) + 'ms">' +
            '<span class="lh-reveal-icon">' + meta[0] + '</span>' +
            '<strong class="lh-reveal-amount">+' + formatNumber(entry.amount) + '</strong>' +
            '<span class="lh-reveal-label">' + esc(meta[1]) + '</span>' +
        '</div>';
    }

    function revealItemBox(entry, index) {
        var item = entry.item || {};
        var color = RWL.sanitizeHex(RWL.rarityColor(item.rarity), '#9d4edd');
        return '<div class="lh-reveal-box lh-reveal-item' + (entry.already_owned ? ' lh-reveal-owned' : '') + '" style="--rwl-keep:1;--lh-reveal-delay:' + revealDelay(index) + 'ms;--lh-reveal-color:' + color + ';">' +
            '<span class="lh-reveal-rarity" style="--rwl-keep:1;background:' + color + ';">' + esc(item.rarity || 'Common') + '</span>' +
            '<div class="lh-reveal-visual">' + revealVisual(item) + '</div>' +
            '<span class="lh-reveal-item-name" translate="no">' + esc(item.name || item.item_id || '') + '</span>' +
            '<small class="lh-reveal-note' + (entry.already_owned ? '' : ' lh-reveal-new') + '">' + (entry.already_owned ? 'Already in your locker' : 'Added to your locker') + '</small>' +
        '</div>';
    }

    function revealHtml(result) {
        var entries = result.entries || [];
        var currencies = entries.filter(function (entry) { return entry.kind === 'currency'; });
        var groups = {};
        entries.forEach(function (entry) {
            if (entry.kind !== 'item') return;
            if (!groups[entry.category]) groups[entry.category] = [];
            groups[entry.category].push(entry);
        });
        var step = 0;
        var html = '<div class="lh-reveal-head"><span class="lh-reward-icon">🎉</span><strong>Code redeemed!</strong></div>';
        if (currencies.length) {
            html += '<section class="lh-reveal-group"><h4 class="lh-reveal-title">Currency And Boosts</h4><div class="lh-reveal-grid">' + currencies.map(function (entry) { return revealCurrencyBox(entry, step++); }).join('') + '</div></section>';
        }
        Object.keys(CODE_ITEM_CATEGORIES).filter(function (key) { return groups[key]; }).forEach(function (key) {
            html += '<section class="lh-reveal-group"><h4 class="lh-reveal-title">' + esc(CODE_ITEM_CATEGORIES[key]) + '<span class="lh-reveal-count">' + groups[key].length + '</span></h4><div class="lh-reveal-grid">' + groups[key].map(function (entry) { return revealItemBox(entry, step++); }).join('') + '</div></section>';
        });
        return html;
    }

    function activateRevealMedia(root) {
        var videos = root.querySelectorAll('video[data-reveal-src]');
        if (!videos.length) return;
        var start = function (video) {
            if (!video.getAttribute('src')) video.setAttribute('src', video.getAttribute('data-reveal-src'));
            var played = video.play();
            if (played && played.catch) played.catch(function () {});
        };
        if (!global.IntersectionObserver) {
            Array.prototype.forEach.call(videos, start);
            return;
        }
        var observer = new IntersectionObserver(function (observed) {
            observed.forEach(function (entry) {
                if (entry.isIntersecting) start(entry.target);
                else entry.target.pause();
            });
        }, { rootMargin: '120px' });
        Array.prototype.forEach.call(videos, function (video) { observer.observe(video); });
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
            if (Array.isArray(result.entries) && result.entries.length) {
                box.classList.add('lh-reveal');
                box.innerHTML = revealHtml(result);
                activateRevealMedia(box);
                box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                box.classList.remove('lh-reveal');
                box.innerHTML = '<span class="lh-reward-icon">🎉</span><strong>Code redeemed!</strong><span>' + esc(result.summary || '') + '</span>';
            }
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
                if ((global.RWLGrowth && global.RWLPets) || Date.now() - started > timeout) return resolve();
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
            if (document.hidden) flushOnLeave();
        });
        global.addEventListener('pagehide', flushOnLeave);
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
