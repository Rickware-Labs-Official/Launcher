(function (global) {
    if (!global.RWL) return;

    var esc = RWL.escapeHtml;
    var COMMISSION_STATUS = { pending: 'Holding Period', held: 'Under Review', available: 'Available', reversed: 'Reversed' };
    var PAYOUT_STATUS = { requested: 'Requested', approved: 'Approved', paid: 'Paid', rejected: 'Rejected', completed: 'Completed' };
    var PAYOUT_KIND = { crypto: 'Crypto Payout', lc: 'Lab Coins', xp: 'XP' };
    var ADDRESS_PATTERN = /^[A-Za-z0-9:]{20,120}$/;
    var AMOUNT_PATTERN = /^\d{1,7}([.,]\d{1,2})?$/;
    var REFRESH_MS = 60000;
    var state = { data: null, refreshTimer: null };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function api(path, options) {
        return RWL.apiRequest('/api/affiliate' + path, options);
    }

    function notify(message, type) {
        if (typeof global.showBanner === 'function') global.showBanner(message, type || 'success');
        else if (global.RWLDialog) global.RWLDialog.alert({ title: 'Affiliate Program', message: message });
    }

    function confirmDialog(title, message) {
        if (global.RWLDialog && global.RWLDialog.confirm) return global.RWLDialog.confirm({ title: title, message: message, confirmText: t('Confirm') });
        return Promise.resolve(global.confirm(message));
    }

    function money(value) {
        return '$' + Number(value || 0).toFixed(2);
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    function formatDate(value) {
        if (!value) return '-';
        var date = new Date(value);
        return isNaN(date.getTime()) ? '-' : date.toLocaleString();
    }

    function markInvalid(input) {
        if (!input) return;
        input.classList.add('af-invalid');
        input.focus();
        input.addEventListener('input', function clear() {
            input.classList.remove('af-invalid');
            input.removeEventListener('input', clear);
        });
    }

    function parseAmount(raw) {
        var value = String(raw || '').trim();
        if (!value) return null;
        if (!AMOUNT_PATTERN.test(value)) return NaN;
        return parseFloat(value.replace(',', '.'));
    }

    function linkFor(code) {
        var url = new URL('../', global.location.href);
        url.search = '?ref=' + encodeURIComponent(code);
        url.hash = '';
        return url.href;
    }

    function info(label, value, extraClass, hint) {
        return '<div class="info-item af-info ' + (extraClass || '') + '"' + (hint ? ' title="' + esc(hint) + '"' : '') + '><label>' + esc(label) + '</label><span>' + esc(value) + '</span></div>';
    }

    function badge(status, labels) {
        return '<span class="af-badge af-badge-' + esc(status) + '">' + esc(labels[status] || status) + '</span>';
    }

    function table(headers, rows, emptyText) {
        if (!rows.length) return '<div class="empty-message">' + esc(emptyText) + '</div>';
        return '<div class="af-table-wrap"><table class="af-table"><thead><tr>' + headers.map(function (header) { return '<th>' + esc(header) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
    }

    function renderIntro(settings) {
        var join = settings.enabled
            ? '<button type="button" class="btn-primary af-join" id="afJoin" title="Create your personal affiliate link">Join The Affiliate Program</button>'
            : '<div class="af-warning">The affiliate program is paused right now. Please come back later.</div>';
        return '<div class="settings-section">' +
            '<h3>How It Works</h3>' +
            '<div class="af-steps">' +
                '<div class="af-step"><span class="af-step-number">1</span><strong>Share your link</strong><small>Send your personal link to friends, your community or your followers.</small></div>' +
                '<div class="af-step"><span class="af-step-number">2</span><strong>They create an account</strong><small>Only new accounts that open the launcher through your link and register are counted.</small></div>' +
                '<div class="af-step"><span class="af-step-number">3</span><strong>You earn a commission</strong><small>' + formatNumber(settings.first_rate_percent) + '% on their first real-money purchase and ' + formatNumber(settings.repeat_rate_percent) + '% on every further product, once per product.</small></div>' +
            '</div>' +
            '<ul class="af-rules">' +
                '<li>Only purchases with real money count. Lab Coins, vouchers and rewards do not.</li>' +
                '<li>Every product pays a commission only once, no matter which option or how often it is bought.</li>' +
                '<li>Commissions become available after a holding period of ' + formatNumber(settings.hold_days) + ' days.</li>' +
                '<li>Withdraw in crypto from ' + money(settings.min_payout_usd) + ' or convert your balance into Lab Coins or XP. XP needs a linked Discord account.</li>' +
                '<li>The people you invite get no discount and pay the normal price.</li>' +
                '<li>Suspicious sign-ups are checked by the team and refunded purchases lose their commission.</li>' +
            '</ul>' + join +
        '</div>';
    }

    function renderLink(data) {
        var suspended = data.status !== 'active';
        return '<div class="settings-section af-hero">' +
            '<h3>Your Affiliate Link</h3>' +
            '<div class="af-link-row"><input type="text" class="form-control af-link" id="afLink" readonly value="' + esc(linkFor(data.code)) + '" translate="no"><button type="button" class="btn-primary af-copy" id="afCopy" title="Copy your affiliate link">Copy Link</button></div>' +
            '<div class="af-meta"><span>Code</span><b translate="no">' + esc(data.code) + '</b>' + (suspended ? '<span class="af-badge af-badge-rejected">Suspended</span>' : '<span class="af-badge af-badge-available">Active</span>') + '</div>' +
            (suspended ? '<div class="af-warning">Your affiliate account is suspended. New commissions and payouts are paused. Please contact the support.</div>' : '') +
        '</div>';
    }

    function renderStats(data) {
        var stats = data.stats || {};
        return '<div class="settings-section"><h3>Statistics</h3><div class="info-grid af-grid">' +
            info('Link Visits', formatNumber(stats.clicks), '', 'Unique visits through your link') +
            info('Registrations', formatNumber(stats.signups)) +
            info('Purchases', formatNumber(stats.purchases)) +
            info('Conversion', formatNumber(stats.conversion_percent) + ' %', '', 'Registrations per visit') +
        '</div></div>';
    }

    function renderBalances(data) {
        var balances = data.balances || {};
        return '<div class="settings-section"><h3>Balance</h3><div class="info-grid af-grid">' +
            info('Available', money(balances.available_usd), 'af-info-main', 'Ready for a payout or a conversion') +
            info('Holding Period', money(balances.pending_usd), '', 'Commissions that are still in the holding period') +
            info('Under Review', money(balances.held_usd), '', 'Commissions that are checked by the team') +
            info('Payout Requested', money(balances.reserved_usd), '', 'Reserved for your open payout request') +
            info('Total Earned', money(balances.earned_usd)) +
            info('Paid Out', money(balances.paid_usd)) +
            info('Converted', money(balances.converted_usd)) +
            info('Reversed', money(balances.reversed_usd), '', 'Commissions removed because of refunds or abuse') +
        '</div></div>';
    }

    function openPayout(data) {
        return (data.payouts || []).some(function (payout) { return payout.status === 'requested' || payout.status === 'approved'; });
    }

    function renderPayout(data) {
        var settings = data.settings || {};
        var coins = settings.payout_coins || [];
        var blocked = data.status !== 'active' || openPayout(data) || !coins.length;
        var reason = data.status !== 'active' ? 'Payouts are paused while your affiliate account is suspended.' : (openPayout(data) ? 'You already have an open payout request. You can request a new payout once it was handled.' : (!coins.length ? 'Crypto payouts are not available right now.' : ''));
        return '<div class="settings-section">' +
            '<h3>Withdraw In Crypto</h3>' +
            '<p class="af-hint">Every payout is checked by hand before it is sent. Only one request can be open at a time.</p>' +
            '<div class="af-inline"><span>Minimum payout</span><b>' + money(settings.min_payout_usd) + '</b><span>Available</span><b>' + money((data.balances || {}).available_usd) + '</b></div>' +
            (reason ? '<div class="af-warning">' + esc(reason) + '</div>' : '') +
            '<form class="settings-form af-form" id="afPayoutForm" autocomplete="off">' +
                '<div class="form-group"><label for="afCoin">Coin</label><select id="afCoin" class="form-control af-select"' + (blocked ? ' disabled' : '') + '>' + coins.map(function (coin) { return '<option value="' + esc(coin.key) + '">' + esc(coin.label) + '</option>'; }).join('') + '</select></div>' +
                '<div class="form-group"><label for="afAddress">Wallet Address</label><input type="text" id="afAddress" class="form-control" maxlength="120" placeholder="Your wallet address" spellcheck="false"' + (blocked ? ' disabled' : '') + '><small>Check the address and the network carefully. Payouts to a wrong address cannot be recovered.</small></div>' +
                '<div class="form-group"><label for="afPayoutAmount">Amount In USD</label><input type="text" id="afPayoutAmount" class="form-control" inputmode="decimal" maxlength="10" placeholder="Leave empty for your full balance"' + (blocked ? ' disabled' : '') + '></div>' +
                '<button type="submit" class="btn-primary af-submit" title="Send your payout request to the team"' + (blocked ? ' disabled' : '') + '>Request Payout</button>' +
            '</form>' +
        '</div>';
    }

    function renderConvert(data) {
        var settings = data.settings || {};
        var blocked = data.status !== 'active';
        return '<div class="settings-section">' +
            '<h3>Convert Your Balance</h3>' +
            '<p class="af-hint">Turn your available balance into Lab Coins or XP instantly.</p>' +
            '<div class="af-rates">' +
                '<div><span>1 USD</span><b>= ' + formatNumber(settings.lab_coins_per_usd) + ' Lab Coins</b></div>' +
                '<div><span>1 USD</span><b>= ' + formatNumber(settings.xp_per_usd) + ' XP</b></div>' +
                '<div><span>Daily Limit</span><b>' + money(settings.daily_conversion_cap_usd) + '</b></div>' +
            '</div>' +
            '<form class="settings-form af-form" id="afConvertForm" autocomplete="off">' +
                '<div class="form-group"><label for="afTarget">Convert Into</label><select id="afTarget" class="form-control af-select"' + (blocked ? ' disabled' : '') + '><option value="lc">Lab Coins</option><option value="xp"' + (settings.discord_linked ? '' : ' disabled') + '>XP</option></select>' + (settings.discord_linked ? '' : '<small>XP needs a linked Discord account.</small>') + '</div>' +
                '<div class="form-group"><label for="afConvertAmount">Amount In USD</label><input type="text" id="afConvertAmount" class="form-control" inputmode="decimal" maxlength="10" placeholder="Leave empty for your full balance"' + (blocked ? ' disabled' : '') + '><small id="afConvertPreview"></small></div>' +
                '<button type="submit" class="btn-secondary af-submit" title="Convert your balance now"' + (blocked ? ' disabled' : '') + '>Convert</button>' +
            '</form>' +
        '</div>';
    }

    function renderReferrals(data) {
        var rows = (data.referrals || []).map(function (entry) {
            return '<tr><td translate="no"><b>' + esc(entry.username) + '</b>' + (entry.under_review ? ' <span class="af-badge af-badge-held">Under Review</span>' : '') + '</td><td>' + esc(formatDate(entry.registered_at)) + '</td><td>' + esc(formatDate(entry.first_purchase_at)) + '</td><td>' + formatNumber(entry.purchases) + '</td><td>' + money(entry.commission_usd) + '</td></tr>';
        });
        return '<div class="settings-section"><h3>Registered Through Your Link</h3>' + table(['User', 'Registered', 'First Purchase', 'Purchases', 'Commission'], rows, 'Nobody registered through your link yet.') + '</div>';
    }

    function renderCommissions(data) {
        var rows = (data.commissions || []).map(function (entry) {
            return '<tr><td>' + esc(formatDate(entry.created_at)) + '</td><td translate="no">' + esc(entry.buyer) + '</td><td translate="no">' + esc(entry.product || '-') + '</td><td>' + formatNumber(entry.rate_percent) + ' %' + (entry.first_purchase ? ' <span class="af-badge af-badge-first">First Purchase</span>' : '') + '</td><td>' + money(entry.base_usd) + '</td><td><b>' + money(entry.amount_usd) + '</b></td><td>' + badge(entry.status, COMMISSION_STATUS) + '</td><td>' + esc(entry.status === 'pending' ? formatDate(entry.available_at) : '-') + '</td></tr>';
        });
        return '<div class="settings-section"><h3>Commissions</h3>' + table(['Date', 'Buyer', 'Product', 'Rate', 'Order Value', 'Commission', 'Status', 'Available From'], rows, 'You have not earned a commission yet.') + '</div>';
    }

    function coinLabel(data, key) {
        var match = ((data.settings || {}).payout_coins || []).filter(function (coin) { return coin.key === key; })[0];
        return match ? match.label : String(key || '').toUpperCase();
    }

    function renderPayouts(data) {
        var rows = (data.payouts || []).map(function (entry) {
            var details = entry.kind === 'crypto' ? esc(coinLabel(data, entry.coin)) + ' <span class="af-mono" translate="no">' + esc(entry.address || '') + '</span>' : (entry.kind === 'lc' ? '+' + formatNumber(entry.lab_coins) + ' LC' : '+' + formatNumber(entry.xp) + ' XP');
            return '<tr><td>' + esc(formatDate(entry.created_at)) + '</td><td>' + esc(PAYOUT_KIND[entry.kind] || entry.kind) + '</td><td><b>' + money(entry.amount_usd) + '</b></td><td>' + details + '</td><td>' + badge(entry.status, PAYOUT_STATUS) + '</td><td class="af-mono" translate="no">' + esc(entry.reference || '-') + '</td></tr>';
        });
        return '<div class="settings-section"><h3>Payouts And Conversions</h3>' + table(['Date', 'Type', 'Amount', 'Details', 'Status', 'Reference'], rows, 'No payouts or conversions yet.') + '</div>';
    }

    function render() {
        var root = byId('affiliateRoot');
        var data = state.data;
        if (!root || !data) return;
        if (!data.enrolled) {
            root.innerHTML = renderIntro(data.settings || {});
            var join = byId('afJoin');
            if (join) join.addEventListener('click', function () { enroll(join); });
            return;
        }
        var focused = document.activeElement && root.contains(document.activeElement) && document.activeElement.id;
        if (focused === 'afAddress' || focused === 'afPayoutAmount' || focused === 'afConvertAmount') return;
        root.innerHTML = renderLink(data) + renderStats(data) + renderBalances(data) + renderPayout(data) + renderConvert(data) + renderReferrals(data) + renderCommissions(data) + renderPayouts(data);
        byId('afCopy').addEventListener('click', copyLink);
        byId('afPayoutForm').addEventListener('submit', submitPayout);
        byId('afConvertForm').addEventListener('submit', submitConvert);
        byId('afConvertAmount').addEventListener('input', updatePreview);
        byId('afTarget').addEventListener('change', updatePreview);
        updatePreview();
    }

    function updatePreview() {
        var data = state.data;
        var preview = byId('afConvertPreview');
        if (!data || !preview) return;
        var settings = data.settings || {};
        var amount = parseAmount(byId('afConvertAmount').value);
        if (amount === null) amount = (data.balances || {}).available_usd || 0;
        if (isNaN(amount)) {
            preview.textContent = '';
            return;
        }
        var target = byId('afTarget').value;
        var value = Math.floor(amount * (target === 'xp' ? settings.xp_per_usd : settings.lab_coins_per_usd) || 0);
        preview.textContent = 'You receive about ' + formatNumber(value) + (target === 'xp' ? ' XP' : ' Lab Coins');
    }

    async function load() {
        try {
            state.data = await api('/me');
            render();
        } catch (error) {
            if (error && error.status === 401) {
                global.location.href = './login_register.html?tab=login';
                return;
            }
            var root = byId('affiliateRoot');
            if (root && !state.data) root.innerHTML = '<div class="settings-section"><div class="empty-message">' + esc((error && error.message) || 'The affiliate program could not be loaded.') + '</div></div>';
        }
    }

    async function enroll(button) {
        button.disabled = true;
        try {
            state.data = await api('/enroll', { method: 'POST' });
            render();
            notify(t('Welcome to the affiliate program! Your personal link is ready.'));
        } catch (error) {
            button.disabled = false;
            notify(error.message || t('You could not join the affiliate program.'), 'error');
        }
    }

    async function copyLink() {
        var input = byId('afLink');
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(input.value);
            else {
                input.select();
                document.execCommand('copy');
            }
            notify(t('Your affiliate link was copied.'));
        } catch (error) {
            input.select();
            notify(t('Copy the link manually with Ctrl + C.'), 'info');
        }
    }

    async function submitPayout(event) {
        event.preventDefault();
        var data = state.data;
        var coin = byId('afCoin');
        var address = byId('afAddress');
        var amountInput = byId('afPayoutAmount');
        var button = event.target.querySelector('button[type="submit"]');
        var addressValue = address.value.trim();
        var amount = parseAmount(amountInput.value);
        var valid = true;
        if (!ADDRESS_PATTERN.test(addressValue)) {
            markInvalid(address);
            valid = false;
        }
        if (amount !== null && (isNaN(amount) || amount <= 0)) {
            if (valid) markInvalid(amountInput);
            else amountInput.classList.add('af-invalid');
            valid = false;
        }
        if (!valid) return;
        var label = coin.options[coin.selectedIndex] ? coin.options[coin.selectedIndex].text : coin.value;
        var shown = money(amount === null ? (data.balances || {}).available_usd : amount);
        var confirmed = await confirmDialog(t('Request Payout'), t('Please check the wallet address and the network carefully. Payouts to a wrong address cannot be recovered.') + ' ' + shown + ' · ' + label + ' · ' + addressValue);
        if (!confirmed) return;
        button.disabled = true;
        try {
            state.data = await api('/payout', { method: 'POST', body: { coin: coin.value, address: addressValue, amount_usd: amount === null ? null : amount.toFixed(2) } });
            address.value = '';
            amountInput.value = '';
            address.blur();
            render();
            notify(t('Your payout request was sent. The team checks it by hand before it is paid.'));
        } catch (error) {
            button.disabled = false;
            notify(error.message || t('The payout could not be requested.'), 'error');
        }
    }

    async function submitConvert(event) {
        event.preventDefault();
        var data = state.data;
        var target = byId('afTarget').value;
        var amountInput = byId('afConvertAmount');
        var button = event.target.querySelector('button[type="submit"]');
        var amount = parseAmount(amountInput.value);
        if (amount !== null && (isNaN(amount) || amount <= 0)) {
            markInvalid(amountInput);
            return;
        }
        var shown = money(amount === null ? (data.balances || {}).available_usd : amount);
        var confirmed = await confirmDialog(t('Convert Your Balance'), t('Converted balance cannot be turned back into money.') + ' ' + shown + ' → ' + (target === 'xp' ? 'XP' : 'Lab Coins'));
        if (!confirmed) return;
        button.disabled = true;
        try {
            state.data = await api('/convert', { method: 'POST', body: { target: target, amount_usd: amount === null ? null : amount.toFixed(2) } });
            amountInput.value = '';
            amountInput.blur();
            render();
            notify(t('Your balance was converted.'));
        } catch (error) {
            button.disabled = false;
            notify(error.message || t('The conversion failed.'), 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        if (!RWL.getToken()) {
            global.location.href = './login_register.html?tab=login';
            return;
        }
        await load();
        state.refreshTimer = global.setInterval(function () {
            if (!document.hidden) load();
        }, REFRESH_MS);
    });
})(window);
