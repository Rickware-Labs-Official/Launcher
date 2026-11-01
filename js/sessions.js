(function () {
    var REFRESH_MS = 15000;
    var revealed = {};
    var refreshTimer = null;
    var busy = false;
    var esc = RWL.escapeHtml;

    function formatDate(value) {
        if (!value) return '-';
        var date = new Date(value);
        return isNaN(date.getTime()) ? '-' : date.toLocaleString();
    }

    function formatDuration(seconds) {
        var total = Math.max(0, parseInt(seconds, 10) || 0);
        if (total < 60) return total + 's';
        var hours = Math.floor(total / 3600);
        var minutes = Math.floor((total % 3600) / 60);
        return hours ? hours + 'h ' + minutes + 'm' : minutes + 'm';
    }

    function field(label, value) {
        return '<div class="session-field"><span>' + esc(label) + '</span><strong translate="no">' + esc(value === null || value === undefined || value === '' ? '-' : String(value)) + '</strong></div>';
    }

    function sessionCard(session) {
        var masked = !revealed[session.session_id];
        var isClient = session.kind === 'client';
        var classes = 'session-card' + (session.current ? ' session-current' : '') + (masked ? ' session-masked' : '');
        var badges = '';
        if (session.current) badges += '<span class="session-badge">This device</span>';
        badges += session.active ? '<span class="session-badge badge-active">Active</span>' : '<span class="session-badge badge-idle">Idle</span>';
        if (isClient) badges += '<span class="session-badge">Device bound</span>';
        else if (session.persistent) badges += '<span class="session-badge">Login saved</span>';
        var html = '<div class="' + classes + '" data-session-id="' + esc(session.session_id) + '">';
        html += '<div class="session-head">';
        html += '<span class="session-number">' + esc(String(session.number)) + '</span>';
        html += '<div class="session-title"><strong>' + esc(isClient ? 'Launcher Session' : 'Browser Session') + '</strong><span>' + esc(isClient ? 'Rickware - Labs© Launcher' : (session.browser + ' · ' + session.platform)) + '</span></div>';
        html += '<div class="session-badges">' + badges + '</div>';
        html += '<div class="session-buttons">';
        html += '<button type="button" class="session-button" data-toggle-session="' + esc(session.session_id) + '" title="Show or hide the details of this session">' + (masked ? 'Show Details' : 'Hide Details') + '</button>';
        html += '<button type="button" class="session-button session-signout" data-revoke-session="' + esc(session.session_id) + '" title="Sign out this session">Sign Out</button>';
        html += '</div></div>';
        html += '<div class="session-details">';
        html += field('Session number', '#' + session.number);
        html += field('Type', isClient ? 'Launcher' : 'Browser');
        html += field('Browser', session.browser);
        html += field('Platform', session.platform);
        html += field('Last IP', session.last_ip);
        html += field('First IP', session.first_ip);
        html += field('Login count', session.login_count);
        html += field('Last login', formatDate(session.last_login_at));
        html += field('Last activity', formatDate(session.last_seen_at));
        html += field('Current duration', session.active ? formatDuration(session.current_duration_seconds) : '-');
        html += field('Last session duration', formatDuration(session.last_session_duration_seconds !== undefined ? session.last_session_duration_seconds : session.last_duration_seconds));
        html += field('Total time', formatDuration(session.total_seconds));
        html += field('Requests', session.request_count);
        html += field('Time zone', session.time_zone);
        html += field('Created', formatDate(session.created_at));
        html += '</div></div>';
        return html;
    }

    function render(data) {
        var list = document.getElementById('sessionsList');
        var sessions = (data && data.sessions) || [];
        list.innerHTML = sessions.length ? sessions.map(sessionCard).join('') : '<div class="empty-message">No active sessions.</div>';
        var limits = (data && data.limits) || {};
        var limitText = document.getElementById('sessionsLimits');
        if (limitText && limits.max_browser_sessions) {
            limitText.textContent = 'Up to ' + limits.max_browser_sessions + ' browser sessions at the same time plus the launcher, ' + limits.max_total_sessions + ' sessions in total. Active browser sessions: ' + (limits.active_browser_sessions || 0) + ' · open sessions: ' + (limits.open_sessions || 0) + '.';
        }
        var toggle = document.getElementById('staySignedIn');
        if (toggle && !toggle.dataset.busy) toggle.checked = !!(data && data.stay_signed_in);
        if (toggle) toggle.disabled = RWL.isLauncherHost();
    }

    async function load() {
        if (busy || document.hidden) return;
        try {
            render(await RWL.apiRequest('/api/sessions'));
        } catch (error) {
            if (error.status === 401) {
                window.location.href = './login_register.html';
                return;
            }
            if (error.status !== 503) showBanner(error.message || 'Sessions could not be loaded.', 'error');
        }
    }

    async function revoke(sessionId, button) {
        if (!window.confirm('Sign out this session? The device has to sign in again.')) return;
        button.disabled = true;
        busy = true;
        try {
            var result = await RWL.apiRequest('/api/sessions/revoke', { method: 'POST', body: { session_id: sessionId } });
            if (result.signed_out_current) {
                RWL.clearSession();
                window.location.href = './login_register.html';
                return;
            }
            showBanner('The session was signed out.', 'success');
        } catch (error) {
            showBanner(error.message || 'The session could not be signed out.', 'error');
        } finally {
            busy = false;
            button.disabled = false;
        }
        load();
    }

    function bindEvents() {
        document.getElementById('sessionsList').addEventListener('click', function (event) {
            var toggle = event.target.closest('[data-toggle-session]');
            if (toggle) {
                var id = toggle.getAttribute('data-toggle-session');
                revealed[id] = !revealed[id];
                var card = toggle.closest('.session-card');
                card.classList.toggle('session-masked', !revealed[id]);
                toggle.textContent = revealed[id] ? 'Hide Details' : 'Show Details';
                return;
            }
            var revokeButton = event.target.closest('[data-revoke-session]');
            if (revokeButton) revoke(revokeButton.getAttribute('data-revoke-session'), revokeButton);
        });
        document.getElementById('identifySessionsBtn').addEventListener('click', async function (event) {
            var button = event.currentTarget;
            button.disabled = true;
            try {
                var result = await RWL.apiRequest('/api/sessions/identify', { method: 'POST' });
                showBanner('Every active device shows its session number for ' + result.seconds + ' seconds.', 'success');
                if (window.RWLFX && RWLFX.refresh) RWLFX.refresh();
            } catch (error) {
                showBanner(error.message || 'The sessions could not be identified.', 'error');
            }
            window.setTimeout(function () { button.disabled = false; }, 10000);
        });
        document.getElementById('revokeOthersBtn').addEventListener('click', async function (event) {
            if (!window.confirm('Sign out every other session? Those devices have to sign in again.')) return;
            var button = event.currentTarget;
            button.disabled = true;
            try {
                var result = await RWL.apiRequest('/api/sessions/revoke_others', { method: 'POST' });
                showBanner(result.count + ' sessions were signed out.', 'success');
            } catch (error) {
                showBanner(error.message || 'The sessions could not be signed out.', 'error');
            }
            button.disabled = false;
            load();
        });
        document.getElementById('staySignedIn').addEventListener('change', async function (event) {
            var toggle = event.currentTarget;
            toggle.dataset.busy = '1';
            toggle.disabled = true;
            try {
                var result = await RWL.apiRequest('/api/sessions/stay_signed_in', { method: 'POST', body: { enabled: toggle.checked } });
                RWL.applySession({ persistent: result.persistent });
                showBanner(result.stay_signed_in ? 'This browser stays signed in now.' : 'Browsers no longer stay signed in.', 'success');
            } catch (error) {
                toggle.checked = !toggle.checked;
                showBanner(error.message || 'The setting could not be saved.', 'error');
            }
            delete toggle.dataset.busy;
            toggle.disabled = RWL.isLauncherHost();
            load();
        });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) load();
        });
    }

    document.addEventListener('DOMContentLoaded', async function () {
        if (!RWL.getToken()) {
            window.location.href = './login_register.html';
            return;
        }
        bindEvents();
        await load();
        refreshTimer = window.setInterval(load, REFRESH_MS);
    });
})();
