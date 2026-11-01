let userPreferences = {};

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = './login_register.html';
        return;
    }

    loadPreferences(user);
    setupSaveCancel();
});

async function getCurrentUser() {
    const token = sessionStorage.getItem('rickware_token');
    if (!token) return null;
    const stored = sessionStorage.getItem('rickware_user');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) {}
    }
    try {
        const res = await fetch(apiUrl('/api/user'), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            const user = data.account || data;
            sessionStorage.setItem('rickware_user', JSON.stringify(user));
            return user;
        }
    } catch(e) {}
    return null;
}

function preferenceElement(id) {
    return document.getElementById(id);
}

function setPreferenceValue(id, value) {
    const element = preferenceElement(id);
    if (element) element.value = value;
}

function setPreferenceChecked(id, value) {
    const element = preferenceElement(id);
    if (element) element.checked = !!value;
}

function preferenceValue(id, fallback) {
    const element = preferenceElement(id);
    return element ? element.value : fallback;
}

function preferenceChecked(id, fallback) {
    const element = preferenceElement(id);
    return element ? element.checked : fallback;
}

function activeLanguage(user) {
    if (window.RWLI18n) return RWLI18n.language();
    return (user && user.preferred_language) || userPreferences.language || 'en';
}

function loadPreferences(user) {
    try {
        userPreferences = JSON.parse(localStorage.getItem('user_preferences') || '{}') || {};
    } catch (error) {
        userPreferences = {};
    }

    setPreferenceValue('preferredLanguage', activeLanguage(user));
    setPreferenceValue('timeZone', user.user_time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone);

    setPreferenceChecked('emailNotifications', userPreferences.emailNotifications !== false);
    setPreferenceChecked('productUpdates', userPreferences.productUpdates !== false);
    setPreferenceChecked('promotionalEmails', user.email_newsletter || false);
    setPreferenceChecked('discordNotifications', userPreferences.discordNotifications || false);

    setPreferenceChecked('showOnlineStatus', userPreferences.showOnlineStatus !== false);
    setPreferenceChecked('allowDataCollection', userPreferences.allowDataCollection !== false);

    setPreferenceValue('themeSelect', userPreferences.theme || 'dark');
    setPreferenceChecked('compactMode', userPreferences.compactMode || false);
    setPreferenceChecked('animationsEnabled', userPreferences.animationsEnabled !== false);

    setPreferenceChecked('autoInstall', userPreferences.autoInstall || false);
    setPreferenceChecked('pauseDownloads', userPreferences.pauseDownloads || false);

    const accountType = preferenceElement('currentAccountType');
    if (accountType) accountType.textContent = user.account_type || 'User';
    const memberSince = preferenceElement('memberSince');
    if (memberSince) memberSince.textContent = (user.created_at || user.user_last_login) ? new Date(user.created_at || user.user_last_login).toLocaleDateString() : 'Unknown';

    let totalPurchases = 0;
    if (user.purchased_products) totalPurchases = user.purchased_products.length;
    const purchases = preferenceElement('totalPurchases');
    if (purchases) purchases.textContent = totalPurchases;
}

async function refreshUserData() {
    const token = sessionStorage.getItem('rickware_token');
    if (!token) return null;
    try {
        const res = await fetch(apiUrl('/api/user'), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            const user = data.account || data;
            sessionStorage.setItem('rickware_user', JSON.stringify(user));
            loadPreferences(user);
            return user;
        }
    } catch(e) {}
    return null;
}

async function setupSaveCancel() {
    document.getElementById('savePreferencesBtn').addEventListener('click', async () => {
        const token = sessionStorage.getItem('rickware_token');
        if (!token) return;

        const user = await getCurrentUser();
        if (!user) return;

        const previousLanguage = activeLanguage(user);
        const preferences = {
            language: preferenceValue('preferredLanguage', previousLanguage),
            emailNotifications: preferenceChecked('emailNotifications', true),
            productUpdates: preferenceChecked('productUpdates', true),
            promotionalEmails: preferenceChecked('promotionalEmails', false),
            discordNotifications: preferenceChecked('discordNotifications', false),
            showOnlineStatus: preferenceChecked('showOnlineStatus', true),
            allowDataCollection: preferenceChecked('allowDataCollection', true),
            theme: preferenceValue('themeSelect', userPreferences.theme || 'dark'),
            compactMode: preferenceChecked('compactMode', false),
            animationsEnabled: preferenceChecked('animationsEnabled', true),
            autoInstall: preferenceChecked('autoInstall', false),
            pauseDownloads: preferenceChecked('pauseDownloads', false)
        };

        localStorage.setItem('user_preferences', JSON.stringify(preferences));

        if (preferences.language !== previousLanguage || preferences.language !== user.preferred_language) {
            try {
                const languageResponse = await fetch(apiUrl('/api/profile/update'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ new_data: { preferred_language: preferences.language } })
                });
                if (languageResponse.ok) {
                    const languageResult = await languageResponse.json();
                    if (languageResult.account) sessionStorage.setItem('rickware_user', JSON.stringify(languageResult.account));
                } else {
                    const languageError = await languageResponse.json().catch(() => ({}));
                    showBanner(RWL.errorDetail(languageError, 'The language could not be saved.'), 'error');
                    return;
                }
            } catch (error) {
                showBanner('The language could not be saved. Please try again.', 'error');
                return;
            }
            if (window.RWLI18n) await RWLI18n.setLanguage(preferences.language);
        }

        if (preferences.promotionalEmails !== user.email_newsletter) {
            const publicFields = [
                'system_ban', 'system_timeout', 'username', '2_fa', 'email_newsletter',
                'email_adress', 'phone_number', 'discord_linked', 'google_linked',
                'profile_picture', 'account_type', 'account_permissions',
                'database_main_product_key', 'purchased_products', 'paid_products',
                'product_types', 'product_license_keys', 'paused_license_keys',
                'banned_products', 'user_last_ip', 'user_last_login', 'user_login_count',
                'user_discord_username', 'user_discord_displayname', 'user_discord_user_id',
                'user_discord_user_ticket_ids', 'user_discord_user_coin_amount',
                'user_discord_user_xp_amount', 'user_discord_user_invited_user'
            ];
            const currentData = {};
            publicFields.forEach(f => {
                if (user[f] !== undefined) currentData[f] = user[f];
            });
            const response = await fetch(apiUrl('/api/profile/update'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    current_data: currentData,
                    new_data: { email_newsletter: preferences.promotionalEmails }
                })
            });
            if (response.ok) {
                const result = await response.json();
                const updatedUser = result.account || result;
                sessionStorage.setItem('rickware_user', JSON.stringify(updatedUser));
                await refreshUserData();
            }
        }

        userPreferences = preferences;
        alert('Preferences saved successfully!');
    });

    document.getElementById('cancelPreferencesBtn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}