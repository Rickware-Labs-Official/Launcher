document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = './login_register.html';
        return;
    }

    await loadAccountSettings(user);
    setupProfileUpload();
    setupBannerUpload();
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
    document.getElementById('memberSince').textContent = (user.created_at || user.user_created_at) ? new Date(user.created_at || user.user_created_at).toLocaleDateString() : 'Unknown';
    document.getElementById('lastLogin').textContent = user.user_last_login ? new Date(user.user_last_login).toLocaleString() : 'Unknown';
    document.getElementById('devicesConnected').textContent = user.devices_connected || 1;

    const profileImg = document.getElementById('settingsProfileImage');
    if (!pendingProfilePictureFile) profileImg.src = userProfileImageSrc(user);
    renderBannerPreview(user);
    applyAccountLimits(user);
}

const BANNER_PATH = '/api/profile_banner/';
let bannerBusy = false;

function setBannerHint(message, state) {
    const hint = document.getElementById('bannerHint');
    const preview = document.getElementById('settingsBannerPreview');
    if (hint) {
        hint.textContent = message;
        hint.classList.toggle('profile-image-error', state === 'error');
        hint.classList.toggle('profile-image-ready', state === 'ready');
    }
    if (preview) preview.classList.toggle('profile-banner-error', state === 'error');
}

function bannerLimitHint(user) {
    const limit = Number(user && user.profile_banner_max_mb) || 20;
    return 'PNG, JPG, GIF, WebP, AVIF, BMP or ICO · animated files work too · max ' + limit + ' MB';
}

function trustedBannerUrl(url) {
    const value = String(url || '');
    return value.indexOf(RWL.apiBase + BANNER_PATH) === 0 && /^[A-Za-z0-9_.\-\/:]+$/.test(value) ? value : '';
}

function renderBannerPreview(user) {
    const image = document.getElementById('settingsBannerImage');
    const plate = document.getElementById('settingsBannerPlate');
    const remove = document.getElementById('removeBannerBtn');
    const badge = document.getElementById('settingsBannerBadge');
    if (!image || !plate) return;
    const banner = trustedBannerUrl(user && user.profile_banner_url);
    if (remove) remove.hidden = !banner;
    if (badge) badge.textContent = banner ? 'Banner' : 'Nameplate';
    if (!bannerBusy) setBannerHint(bannerLimitHint(user), '');
    if (banner) {
        plate.pause();
        plate.hidden = true;
        if (image.getAttribute('src') !== banner) image.src = banner;
        image.hidden = false;
        return;
    }
    image.hidden = true;
    image.removeAttribute('src');
    const cosmetics = (user && user.equipped_cosmetics) || {};
    const source = userNameplateSrc(cosmetics);
    plate.style.filter = RWL.mediaFilterValue(cosmetics.nameplate_filter);
    if (plate.getAttribute('data-src') !== source) {
        plate.setAttribute('data-src', source);
        plate.src = source;
    }
    plate.hidden = false;
    const playing = plate.play();
    if (playing && playing.catch) playing.catch(() => {});
}

function sendBannerFile(token, file) {
    return new Promise(async (resolve) => {
        const form = new FormData();
        form.append('file', file, file.name || 'banner');
        const request = new XMLHttpRequest();
        const uploadUrl = apiUrl('/api/profile/banner');
        request.open('POST', uploadUrl);
        request.setRequestHeader('Authorization', 'Bearer ' + token);
        try {
            const signing = await RWL.signingHeaders('POST', uploadUrl, '', true, token);
            if (signing) Object.keys(signing).forEach((name) => request.setRequestHeader(name, signing[name]));
        } catch (error) {}
        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percent = Math.round(event.loaded / event.total * 100);
                setBannerHint('Uploading... ' + percent + '% (' + formatMegabytes(event.loaded) + ' of ' + formatMegabytes(event.total) + ')', 'ready');
            }
        });
        request.addEventListener('load', () => {
            let data = {};
            try { data = JSON.parse(request.responseText || '{}'); } catch (error) { data = {}; }
            resolve({ status: request.status, data: data });
        });
        request.addEventListener('error', () => resolve({ status: 0, data: {} }));
        request.addEventListener('timeout', () => resolve({ status: 0, data: {} }));
        request.timeout = 300000;
        setBannerHint('Uploading... 0%', 'ready');
        request.send(form);
    });
}

function setBannerButtonsDisabled(disabled) {
    ['uploadBannerBtn', 'removeBannerBtn'].forEach((id) => {
        const button = document.getElementById(id);
        if (button) button.disabled = disabled;
    });
}

async function uploadBanner(file) {
    const token = RWL.getToken();
    if (!token || bannerBusy) return;
    bannerBusy = true;
    setBannerButtonsDisabled(true);
    try {
        let result = await sendBannerFile(token, file);
        if (result.status === 401) {
            const refreshed = await RWL.refreshAccessToken();
            if (refreshed) result = await sendBannerFile(refreshed, file);
        }
        if (result.status === 0) {
            setBannerHint('The upload failed. Please check your connection and try again.', 'error');
            showBanner('The upload failed. Please check your connection and try again.', 'error');
            return;
        }
        if (result.status < 200 || result.status >= 300) {
            const message = RWL.errorDetail(result.data, 'The banner could not be uploaded.');
            setBannerHint(message, 'error');
            showBanner(message, 'error');
            return;
        }
        bannerBusy = false;
        await refreshUserData();
        setBannerHint('Banner uploaded. It is shown in your extended profile.', 'ready');
        showBanner('Profile banner updated.', 'success');
    } catch (error) {
        setBannerHint('The banner could not be uploaded.', 'error');
    } finally {
        bannerBusy = false;
        setBannerButtonsDisabled(false);
    }
}

async function removeBanner() {
    if (bannerBusy) return;
    const confirmed = window.RWLDialog && RWLDialog.confirm
        ? await RWLDialog.confirm({ title: 'Remove Banner', message: 'Remove your profile banner? Your nameplate is shown again.', confirmText: 'Remove', danger: true })
        : window.confirm('Remove your profile banner? Your nameplate is shown again.');
    if (!confirmed) return;
    bannerBusy = true;
    setBannerButtonsDisabled(true);
    try {
        await RWL.apiRequest('/api/profile/banner', { method: 'DELETE' });
        bannerBusy = false;
        await refreshUserData();
        showBanner('Profile banner removed.', 'success');
    } catch (error) {
        setBannerHint(error.message || 'The banner could not be removed.', 'error');
        showBanner(error.message || 'The banner could not be removed.', 'error');
    } finally {
        bannerBusy = false;
        setBannerButtonsDisabled(false);
    }
}

function setupBannerUpload() {
    const uploadButton = document.getElementById('uploadBannerBtn');
    const removeButton = document.getElementById('removeBannerBtn');
    const input = document.getElementById('bannerImageInput');
    if (!uploadButton || !input) return;
    uploadButton.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (file) uploadBanner(file);
    });
    if (removeButton) removeButton.addEventListener('click', removeBanner);
}

let profilePictureLimitMb = 16;
const PROFILE_PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon'];
const PROFILE_PICTURE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i;
function profilePictureHint() {
    return 'PNG, JPG, GIF, WebP, AVIF, BMP or ICO · max ' + profilePictureLimitMb + ' MB';
}

function applyAccountLimits(user) {
    const pictureLimit = Number(user && user.profile_picture_max_mb);
    if (pictureLimit > 0) profilePictureLimitMb = pictureLimit;
    const hint = document.getElementById('profileImageHint');
    if (hint && !pendingProfilePictureFile && !hint.classList.contains('profile-image-error') && !hint.classList.contains('profile-image-ready')) hint.textContent = profilePictureHint();
    const bioLimit = Number(user && user.bio_max_length);
    const bio = document.getElementById('socialBio');
    const bioMax = document.getElementById('socialBioMax');
    if (bioLimit > 0 && bio) bio.maxLength = bioLimit;
    if (bioLimit > 0 && bioMax) bioMax.textContent = String(bioLimit);
}
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

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        imageInput.value = '';
        if (!file) return;
        if (!PROFILE_PICTURE_TYPES.includes((file.type || '').toLowerCase()) && !PROFILE_PICTURE_EXTENSIONS.test(file.name || '')) {
            setProfileImageHint('Unsupported format. Allowed: PNG, JPG, GIF, WebP, AVIF, BMP, ICO.', 'error');
            showBanner('Unsupported format. Allowed: PNG, JPG, GIF, WebP, AVIF, BMP, ICO.', 'error');
            return;
        }
        if (file.size > profilePictureLimitMb * 1024 * 1024) {
            setProfileImageHint('File too large: ' + formatMegabytes(file.size) + '. The limit is ' + profilePictureLimitMb + ' MB.', 'error');
            showBanner('File too large: ' + formatMegabytes(file.size) + '. The limit is ' + profilePictureLimitMb + ' MB.', 'error');
            return;
        }
        if (pendingProfilePreviewUrl) URL.revokeObjectURL(pendingProfilePreviewUrl);
        pendingProfilePictureFile = file;
        pendingProfilePreviewUrl = URL.createObjectURL(file);
        document.getElementById('settingsProfileImage').src = pendingProfilePreviewUrl;
        uploadBtn.disabled = true;
        const token = RWL.getToken();
        const uploaded = token ? await uploadPendingProfilePicture(token) : false;
        uploadBtn.disabled = false;
        if (uploaded) {
            await refreshUserData();
            showBanner('Profile picture updated.', 'success');
        }
    });
}

function uploadWithProgress(token, file) {
    return new Promise(async (resolve) => {
        const form = new FormData();
        form.append('file', file, file.name || 'profile_picture');
        const request = new XMLHttpRequest();
        const uploadUrl = apiUrl('/api/profile/picture');
        request.open('POST', uploadUrl);
        request.setRequestHeader('Authorization', 'Bearer ' + token);
        const signing = await RWL.signingHeaders('POST', uploadUrl, '', true, token);
        if (signing) Object.keys(signing).forEach((name) => request.setRequestHeader(name, signing[name]));
        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percent = Math.round(event.loaded / event.total * 100);
                setProfileImageHint('Uploading... ' + percent + '% (' + formatMegabytes(event.loaded) + ' of ' + formatMegabytes(event.total) + ')', 'ready');
            }
        });
        request.addEventListener('load', () => {
            let data = {};
            try { data = JSON.parse(request.responseText || '{}'); } catch (error) { data = {}; }
            resolve({ status: request.status, data: data });
        });
        request.addEventListener('error', () => resolve({ status: 0, data: {} }));
        request.addEventListener('timeout', () => resolve({ status: 0, data: {} }));
        request.timeout = 120000;
        setProfileImageHint('Uploading... 0%', 'ready');
        request.send(form);
    });
}

async function uploadPendingProfilePicture(token) {
    if (!pendingProfilePictureFile) return true;
    let result = await uploadWithProgress(token, pendingProfilePictureFile);
    if (result.status === 401) {
        const refreshed = await RWL.refreshAccessToken();
        if (refreshed) result = await uploadWithProgress(refreshed, pendingProfilePictureFile);
    }
    if (result.status === 0) {
        setProfileImageHint('The upload failed. Please check your connection and try again.', 'error');
        showBanner('The upload failed. Please check your connection and try again.', 'error');
        return false;
    }
    if (result.status < 200 || result.status >= 300) {
        const message = RWL.errorDetail(result.data, result.status === 413 ? 'File too large (max ' + profilePictureLimitMb + ' MB)' : 'The picture could not be uploaded.');
        setProfileImageHint(message, 'error');
        showBanner(message, 'error');
        return false;
    }
    pendingProfilePictureFile = null;
    if (pendingProfilePreviewUrl) {
        URL.revokeObjectURL(pendingProfilePreviewUrl);
        pendingProfilePreviewUrl = null;
    }
    setProfileImageHint('Uploaded. ' + profilePictureHint(), 'ready');
    return true;
}

function markInvalid(id, invalid) {
    const element = document.getElementById(id);
    if (element) element.classList.toggle('input-invalid', !!invalid);
}

async function changePasswordIfRequested() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    markInvalid('newPassword', false);
    markInvalid('confirmNewPassword', false);
    if (!newPassword && !confirmPassword) return true;
    if (!currentPassword) {
        markInvalid('currentPassword', true);
        showBanner('Enter your current password to set a new one.', 'error');
        return false;
    }
    if (newPassword.length < 8) {
        markInvalid('newPassword', true);
        showBanner('The new password must have at least 8 characters.', 'error');
        return false;
    }
    if (newPassword !== confirmPassword) {
        markInvalid('confirmNewPassword', true);
        showBanner('The new passwords do not match.', 'error');
        return false;
    }
    try {
        const result = await RWL.apiRequest('/api/account/password', { method: 'POST', body: { current_password: currentPassword, new_password: newPassword } });
        if (result.token) {
            RWL.storeTokens(result.token, result.refresh_token);
            RWL.applySession(result.session);
        }
        ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach((id) => { document.getElementById(id).value = ''; });
        showBanner(result.message || 'Password changed.', 'success');
        return true;
    } catch (error) {
        markInvalid(error.status === 400 && /current password/i.test(error.message || '') ? 'currentPassword' : 'newPassword', true);
        showBanner(error.message || 'The password could not be changed.', 'error');
        return false;
    }
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

        ['username', 'emailAddress', 'currentPassword', 'phoneNumber'].forEach((id) => markInvalid(id, false));
        const newUsername = document.getElementById('username').value.trim();
        const newEmail = document.getElementById('emailAddress').value.trim();
        const newPhone = document.getElementById('phoneNumber').value;
        const newsletter = document.getElementById('emailNewsletter').checked;

        const usernameUnchanged = newUsername === (user.username || '');
        if (!usernameUnchanged && !validateUsername(newUsername)) {
            markInvalid('username', true);
            showBanner('Invalid username format! Must be 7-20 characters, start with a letter, and contain at least one uppercase letter and one number.', 'error');
            return;
        }

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) {
            markInvalid('emailAddress', true);
            showBanner('Invalid email address!', 'error');
            return;
        }

        const emailChanged = newEmail.toLowerCase() !== String(user.email_adress || user.email || '').toLowerCase();
        const currentPasswordValue = document.getElementById('currentPassword').value;
        if (emailChanged && !currentPasswordValue) {
            markInvalid('currentPassword', true);
            showBanner('Enter your current password to change the email address.', 'error');
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
        if (emailChanged) body.current_password = currentPasswordValue;

        if (pendingProfilePictureBase64) {
            body.profile_picture_base64 = pendingProfilePictureBase64;
        }

        const response = await fetch(apiUrl('/api/profile/update'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RWL.getToken() || token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const result = await response.json();
            const updatedUser = result.account || result;
            sessionStorage.setItem('rickware_user', JSON.stringify(updatedUser));
            pendingProfilePictureBase64 = null;
            if (!(await changePasswordIfRequested())) return;
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