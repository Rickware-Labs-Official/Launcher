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

function loadPreferences(user) {
    userPreferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');

    document.getElementById('preferredLanguage').value = userPreferences.language || 'en';
    document.getElementById('timeZone').value = user.user_time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    document.getElementById('emailNotifications').checked = userPreferences.emailNotifications !== false;
    document.getElementById('productUpdates').checked = userPreferences.productUpdates !== false;
    document.getElementById('promotionalEmails').checked = user.email_newsletter || false;
    document.getElementById('discordNotifications').checked = userPreferences.discordNotifications || false;

    document.getElementById('showOnlineStatus').checked = userPreferences.showOnlineStatus !== false;
    document.getElementById('allowDataCollection').checked = userPreferences.allowDataCollection !== false;

    document.getElementById('themeSelect').value = userPreferences.theme || 'dark';
    document.getElementById('compactMode').checked = userPreferences.compactMode || false;
    document.getElementById('animationsEnabled').checked = userPreferences.animationsEnabled !== false;

    document.getElementById('autoInstall').checked = userPreferences.autoInstall || false;
    document.getElementById('pauseDownloads').checked = userPreferences.pauseDownloads || false;

    document.getElementById('currentAccountType').textContent = user.account_type || 'User';
    document.getElementById('memberSince').textContent = user.user_last_login ? new Date(user.user_last_login).toLocaleDateString() : 'Unknown';

    let totalPurchases = 0;
    if (user.purchased_products) totalPurchases = user.purchased_products.length;
    document.getElementById('totalPurchases').textContent = totalPurchases;
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

        const preferences = {
            language: document.getElementById('preferredLanguage').value,
            emailNotifications: document.getElementById('emailNotifications').checked,
            productUpdates: document.getElementById('productUpdates').checked,
            promotionalEmails: document.getElementById('promotionalEmails').checked,
            discordNotifications: document.getElementById('discordNotifications').checked,
            showOnlineStatus: document.getElementById('showOnlineStatus').checked,
            allowDataCollection: document.getElementById('allowDataCollection').checked,
            theme: document.getElementById('themeSelect').value,
            compactMode: document.getElementById('compactMode').checked,
            animationsEnabled: document.getElementById('animationsEnabled').checked,
            autoInstall: document.getElementById('autoInstall').checked,
            pauseDownloads: document.getElementById('pauseDownloads').checked
        };

        localStorage.setItem('user_preferences', JSON.stringify(preferences));

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

        alert('Preferences saved successfully!');

        if (preferences.language !== userPreferences.language) {
            window.location.reload();
        }
    });

    document.getElementById('cancelPreferencesBtn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}