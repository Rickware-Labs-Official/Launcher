(function (global) {
    if (!global.RWL) return;

    var FIELDS = { block_links: 'socialBlockLinks', block_images: 'socialBlockImages', block_videos: 'socialBlockVideos', block_files: 'socialBlockFiles', discord_notifications: 'socialDiscordNotify' };

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function message(text, type) {
        if (typeof global.showBanner === 'function') global.showBanner(text, type);
        else if (global.RWLDialog) global.RWLDialog.alert({ title: t('Notice'), message: text });
    }

    function updateCount() {
        byId('socialBioCount').textContent = String(byId('socialBio').value.length);
    }

    function apply(settings) {
        byId('socialBio').value = settings.bio || '';
        byId('socialDmPolicy').value = settings.dm_policy || 'everyone';
        byId('socialFriendPolicy').value = settings.friend_requests || 'everyone';
        Object.keys(FIELDS).forEach(function (key) { byId(FIELDS[key]).checked = !!settings[key]; });
        updateCount();
    }

    async function load() {
        try {
            var overview = await RWL.apiRequest('/api/social/me');
            apply(overview.settings || {});
            var discordToggle = byId('socialDiscordNotify');
            if (discordToggle) discordToggle.closest('.rwl-switch-row').title = t('Get a Discord message from the bot when you are offline. Needs a linked Discord account.');
        } catch (error) {
            var section = byId('socialSettingsSection');
            if (section) section.style.display = 'none';
        }
    }

    async function save(event) {
        var button = event.currentTarget;
        var bio = byId('socialBio');
        bio.classList.remove('rwl-invalid');
        var payload = {
            bio: bio.value,
            dm_policy: byId('socialDmPolicy').value,
            friend_requests: byId('socialFriendPolicy').value
        };
        Object.keys(FIELDS).forEach(function (key) { payload[key] = byId(FIELDS[key]).checked; });
        button.disabled = true;
        try {
            var result = await RWL.apiRequest('/api/social/settings', { method: 'PUT', body: payload });
            apply(result.settings || {});
            message(t('Privacy settings saved.'), 'success');
        } catch (error) {
            bio.classList.add('rwl-invalid');
            message(error.message || t('The settings could not be saved.'), 'error');
        } finally {
            button.disabled = false;
        }
    }

    async function resetKeys(event) {
        var button = event.currentTarget;
        if (!global.RWLSocial || !global.RWLSocial.resetVault) return;
        button.disabled = true;
        try {
            var done = await global.RWLSocial.resetVault();
            if (done) message(t('Chat encryption was reset. Use your new passphrase from now on.'), 'success');
        } finally {
            button.disabled = false;
        }
    }

    function init() {
        if (!byId('socialSettingsSection') || !RWL.getToken()) return;
        byId('socialBio').addEventListener('input', updateCount);
        byId('socialSaveBtn').addEventListener('click', save);
        byId('socialResetKeysBtn').addEventListener('click', resetKeys);
        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
