document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = './login_register.html';
        return;
    }

    await loadOrderHistory(user);
});

async function loadOrderHistory(user) {
    const totalPurchasesElem = document.getElementById('totalPurchases');
    const activeSubscriptionsElem = document.getElementById('activeSubscriptions');
    const totalSpentElem = document.getElementById('totalSpent');
    const ordersList = document.getElementById('ordersList');
    const licenseKeysContainer = document.getElementById('licenseKeysContainer');
    const productTypesContainer = document.getElementById('productTypesContainer');
    const pausedLicensesContainer = document.getElementById('pausedLicensesContainer');
    const bannedProductsContainer = document.getElementById('bannedProductsContainer');

    const orderHistory = user.order_history || [];
    const productTypes = user.product_types || [];
    const pausedLicenses = user.paused_license_keys || [];
    const bannedProducts = user.banned_products || [];

    const totalSpent = orderHistory.reduce((sum, o) => sum + (parseFloat(o.total_usd) || 0), 0);

    let licenseData = [];
    try {
        const token = sessionStorage.getItem('rickware_token');
        if (token) {
            const res = await fetch(apiUrl('/api/licenses'), {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                licenseData = data.license_keys || [];
            }
        }
    } catch(e) {}

    const activeLicenses = licenseData.filter(lk => lk.is_valid === true);

    if (totalPurchasesElem) totalPurchasesElem.textContent = orderHistory.length;
    if (activeSubscriptionsElem) activeSubscriptionsElem.textContent = activeLicenses.length;
    if (totalSpentElem) totalSpentElem.textContent = '$' + totalSpent.toFixed(2);

    if (ordersList) {
        if (orderHistory.length === 0) {
            ordersList.innerHTML = '<div class="empty-state"><p>No orders yet</p></div>';
        } else {
            const sorted = orderHistory.slice().sort((a, b) => {
                const da = new Date(a.paid_at || a.created_at || 0);
                const db = new Date(b.paid_at || b.created_at || 0);
                return db - da;
            });
            ordersList.innerHTML = sorted.map(o => {
                const statusClass = o.status === 'paid' ? 'paid' : (o.status === 'pending' ? 'pending' : 'unknown');
                const itemNames = (o.items || []).map(i => i.name).join(', ') || o.order_id;
                const dateStr = o.paid_at || o.created_at || '';
                const coinStr = o.coin ? o.coin.toUpperCase() : '';
                return `
                    <div class="table-row">
                        <span>${escHtmlOH(dateStr)}</span>
                        <span>${escHtmlOH(itemNames)}</span>
                        <span>$${parseFloat(o.total_usd || 0).toFixed(2)}${coinStr ? ' (' + escHtmlOH(coinStr) + ')' : ''}</span>
                        <span class="status-badge ${statusClass}">${escHtmlOH(o.status || 'unknown')}</span>
                    </div>
                `;
            }).join('');
        }
    }

    if (licenseKeysContainer) {
        if (licenseData.length === 0) {
            licenseKeysContainer.innerHTML = '<div class="empty-state-small"><p>No active license keys</p></div>';
        } else {
            licenseKeysContainer.innerHTML = licenseData.map(lk => {
                const key = lk.license_key || '';
                const keyDisplay = key.length > 24 ? key.substring(0, 24) + '...' : key;
                const expiry = lk.expires_at === 'Lifetime' ? 'Lifetime' : (lk.expires_at || 'Unknown');
                const isValid = lk.is_valid !== false;
                const validColor = isValid ? '#22c55e' : '#ef4444';
                const validLabel = isValid ? 'Active' : 'Expired';
                return `
                    <div class="license-key-item">
                        <div class="license-key-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                            </svg>
                        </div>
                        <div class="license-key-info">
                            <span class="license-key-text">${escHtmlOH(lk.product_name || 'Product')} &mdash; ${escHtmlOH(lk.duration || '')}</span>
                            <span style="font-size:11px;color:var(--text-tertiary);">Expires: ${escHtmlOH(expiry)}</span>
                            <span style="font-size:11px;color:${validColor};font-weight:600;">${validLabel}</span>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                                <span style="font-size:11px;color:var(--text-tertiary);word-break:break-all;">${escHtmlOH(keyDisplay)}</span>
                                <button class="btn-copy-key" onclick="copyToClipboard('${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                                    </svg>
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    if (productTypesContainer) {
        if (productTypes.length === 0) {
            productTypesContainer.innerHTML = '<div class="empty-state-small"><p>No product types recorded</p></div>';
        } else {
            productTypesContainer.innerHTML = '<div class="tags-container">' + productTypes.map(type => '<span class="tag">' + escHtmlOH(type === 'ALL' ? 'All Types' : type) + '</span>').join('') + '</div>';
        }
    }

    if (pausedLicensesContainer) {
        if (pausedLicenses.length === 0) {
            pausedLicensesContainer.innerHTML = '<div class="empty-state-small"><p>No paused licenses</p></div>';
        } else {
            pausedLicensesContainer.innerHTML = '<div class="list-items">' + pausedLicenses.map(lic => '<div class="list-item paused">' + escHtmlOH(lic) + '</div>').join('') + '</div>';
        }
    }

    if (bannedProductsContainer) {
        if (bannedProducts.length === 0) {
            bannedProductsContainer.innerHTML = '<div class="empty-state-small success"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><p>No banned products</p></div>';
        } else {
            bannedProductsContainer.innerHTML = '<div class="list-items">' + bannedProducts.map(prod => '<div class="list-item banned">' + escHtmlOH(prod) + '</div>').join('') + '</div>';
        }
    }
}

function escHtmlOH(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert('License key copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy:', err);
    }
    document.body.removeChild(textArea);
}