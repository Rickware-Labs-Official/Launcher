document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = './login_register.html';
        return;
    }

    await loadAccountSettings(user);
    setupProfileUpload();
    setupSaveCancel();
    setupPasswordToggles();
});

function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        if (btn.dataset.toggleBound === '1') return;
        btn.dataset.toggleBound = '1';
        btn.setAttribute('type', 'button');
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.getAttribute('data-target'));
            if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });
    });
}

async function loadAccountSettings(user) {
    document.getElementById('username').value = user.username || '';
    document.getElementById('emailAddress').value = user.email_adress || '';
    document.getElementById('phoneNumber').value = user.phone_number || '';
    document.getElementById('emailNewsletter').checked = user.email_newsletter || false;
    document.getElementById('accountType').textContent = user.account_type || 'User';
    document.getElementById('memberSince').textContent = user.user_created_at ? new Date(user.user_created_at).toLocaleDateString() : 'Unknown';
    document.getElementById('lastLogin').textContent = user.user_last_login ? new Date(user.user_last_login).toLocaleString() : 'Unknown';
    document.getElementById('devicesConnected').textContent = user.devices_connected || 1;

    const profileImg = document.getElementById('settingsProfileImage');
    if (!pendingProfilePictureFile) profileImg.src = userProfileImageSrc(user);
}

const PROFILE_PICTURE_LIMIT_MB = 10;
const PROFILE_PICTURE_HINT = 'PNG, JPG, GIF, WebP, AVIF, BMP or ICO · max ' + PROFILE_PICTURE_LIMIT_MB + ' MB';
let pendingProfilePictureBase64 = null;
let pendingProfilePictureFile = null;
let pendingProfilePreviewUrl = null;

function setProfileImageHint(message, state) {
    const hint = document.getElementById('profileImageHint');
    if (!hint) return;
    hint.textContent = message;
    hint.classList.toggle('profile-image-error', state === 'error');
    hint.classList.toggle('profile-image-ready', state === 'ready');
}

function formatMegabytes(bytes) {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function setupProfileUpload() {
    const uploadBtn = document.getElementById('uploadImageBtn');
    const imageInput = document.getElementById('profileImageInput');

    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        imageInput.value = '';
        if (!file) return;
        if (file.size > PROFILE_PICTURE_LIMIT_MB * 1024 * 1024) {
            setProfileImageHint('File too large: ' + formatMegabytes(file.size) + '. The limit is ' + PROFILE_PICTURE_LIMIT_MB + ' MB.', 'error');
            showBanner('File too large: ' + formatMegabytes(file.size) + '. The limit is ' + PROFILE_PICTURE_LIMIT_MB + ' MB.', 'error');
            return;
        }
        if (pendingProfilePreviewUrl) URL.revokeObjectURL(pendingProfilePreviewUrl);
        pendingProfilePictureFile = file;
        pendingProfilePreviewUrl = URL.createObjectURL(file);
        document.getElementById('settingsProfileImage').src = pendingProfilePreviewUrl;
        setProfileImageHint('Ready to upload (' + formatMegabytes(file.size) + '). Click Save Changes.', 'ready');
    });
}

async function uploadPendingProfilePicture(token) {
    if (!pendingProfilePictureFile) return true;
    const form = new FormData();
    form.append('file', pendingProfilePictureFile, pendingProfilePictureFile.name || 'profile_picture');
    let response;
    try {
        response = await fetch(apiUrl('/api/profile/picture'), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: form
        });
    } catch (error) {
        setProfileImageHint('The upload failed. Please check your connection and try again.', 'error');
        showBanner('The upload failed. Please check your connection and try again.', 'error');
        return false;
    }
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = RWL.errorDetail(errData, response.status === 413 ? 'File too large (max ' + PROFILE_PICTURE_LIMIT_MB + ' MB)' : 'The picture could not be uploaded.');
        setProfileImageHint(message, 'error');
        showBanner(message, 'error');
        return false;
    }
    pendingProfilePictureFile = null;
    setProfileImageHint(PROFILE_PICTURE_HINT, null);
    return true;
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
            await loadAccountSettings(user);
            return user;
        }
    } catch(e) {}
    return null;
}

async function setupSaveCancel() {
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const token = sessionStorage.getItem('rickware_token');
        if (!token) return;

        const user = await getCurrentUser();
        if (!user) return;

        const newUsername = document.getElementById('username').value;
        const newEmail = document.getElementById('emailAddress').value;
        const newPhone = document.getElementById('phoneNumber').value;
        const newsletter = document.getElementById('emailNewsletter').checked;

        const usernameUnchanged = newUsername === (user.username || '');
        if (!usernameUnchanged && !validateUsername(newUsername)) {
            showBanner('Invalid username format! Must be 7-20 characters, start with a letter, and contain at least one uppercase letter and one number.', 'error');
            return;
        }

        if (!newEmail || !newEmail.includes('@')) {
            showBanner('Invalid email address!', 'error');
            return;
        }

        const currentData = {};
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
        publicFields.forEach(f => {
            if (user[f] !== undefined) currentData[f] = user[f];
        });

        const newData = {
            username: newUsername,
            email_adress: newEmail,
            phone_number: newPhone,
            email_newsletter: newsletter
        };

        if (!(await uploadPendingProfilePicture(token))) return;

        const body = {
            current_data: currentData,
            new_data: newData
        };

        if (pendingProfilePictureBase64) {
            body.profile_picture_base64 = pendingProfilePictureBase64;
        }

        const response = await fetch(apiUrl('/api/profile/update'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const result = await response.json();
            const updatedUser = result.account || result;
            sessionStorage.setItem('rickware_user', JSON.stringify(updatedUser));
            pendingProfilePictureBase64 = null;
            await refreshUserData();
            showBanner('Settings saved successfully!', 'success');
        } else {
            const errData = await response.json().catch(() => ({}));
            showBanner('Failed to save settings: ' + (errData.detail || 'Unknown error'), 'error');
        }
    });

    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}

function validateUsername(username) {
    if (username.length < 7 || username.length > 20) return false;
    if (!/^[A-Za-z]/.test(username)) return false;
    if (!/[A-Z]/.test(username)) return false;
    if (!/[0-9]/.test(username)) return false;
    if (/^[._-]/.test(username) || /[._-]$/.test(username)) return false;
    if (!/^[A-Za-z0-9._-]+$/.test(username)) return false;
    return true;
}