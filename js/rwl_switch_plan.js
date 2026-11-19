(function (global) {
    if (global.RWLSwitchPlan || !global.RWL) return;

    var backdrop = null;
    var selected = null;
    var data = null;
    var activeProduct = null;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function esc(value) {
        return RWL.escapeHtml(value);
    }

    function money(value) {
        if (typeof global.formatUSD === 'function') return global.formatUSD(value);
        return '$' + Number(value || 0).toFixed(2);
    }

    function formatDate(value) {
        if (!value) return t('Never expires');
        var date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function kindLabel(kind) {
        if (kind === 'upgrade') return t('Upgrade');
        if (kind === 'downgrade') return t('Downgrade');
        if (kind === 'current') return t('Current plan');
        if (kind === 'source') return t('Source code');
        return t('New plan');
    }

    function close() {
        if (backdrop) backdrop.remove();
        backdrop = null;
        selected = null;
        data = null;
        document.removeEventListener('keydown', onKey, true);
    }

    function onKey(event) {
        if (event.key === 'Escape') close();
    }

    function shell(body) {
        close();
        backdrop = document.createElement('div');
        backdrop.className = 'rwl-modal-backdrop';
        backdrop.innerHTML = '<div class="rwl-modal" role="dialog" aria-modal="true" aria-label="' + esc(t('Switch Plan')) + '">' + body + '</div>';
        backdrop.addEventListener('click', function (event) { if (event.target === backdrop) close(); });
        document.body.appendChild(backdrop);
        document.addEventListener('keydown', onKey, true);
        var cancel = backdrop.querySelector('[data-plan-cancel]');
        if (cancel) cancel.addEventListener('click', close);
    }

    function optionHtml(entry, index) {
        var discounted = entry.price_due < entry.price && !entry.disabled && entry.kind !== 'source';
        return '<div class="rwl-plan-option' + (entry.disabled ? ' disabled' : '') + '" role="radio" aria-checked="false" tabindex="' + (entry.disabled ? -1 : 0) + '" data-plan-index="' + index + '" title="' + esc(entry.reason || '') + '">' +
            '<span class="rwl-plan-name" translate="no">' + esc(entry.label) + '</span>' +
            '<span class="rwl-plan-kind">' + esc(kindLabel(entry.kind)) + (entry.reason && entry.kind !== 'current' ? ' · ' + esc(t(entry.reason)) : '') + '</span>' +
            '<span class="rwl-plan-price">' + (discounted ? '<small>' + esc(money(entry.price)) + '</small>' : '') + esc(entry.disabled ? money(entry.price) : money(entry.price_due)) + '</span></div>';
    }

    function render() {
        var plans = (data.plans || []).map(function (entry) { return Object.assign({}, entry); });
        var source = data.source;
        var entries = plans.slice();
        if (source && source.available) {
            entries.push({ category: source.category, label: t('Source Code'), price: source.price, price_due: source.price, kind: 'source', disabled: !!source.owned, reason: source.owned ? t('You already own this') : '' });
        }
        var current = data.current;
        var intro = current
            ? '<p>' + esc(t('Your current plan')) + ': <strong translate="no">' + esc(current.label) + '</strong> · ' + esc(t('Valid until')) + ' ' + esc(formatDate(current.expires_at)) + '</p>'
            : '<p>' + esc(t('Choose a plan or buy the source code.')) + '</p>';
        var credit = current && data.credit > 0 ? '<div class="rwl-plan-credit">' + esc(t('The unused time of your current plan is worth')) + ' <strong>' + esc(money(data.credit)) + '</strong>. ' + esc(t('It is deducted when you switch. Downgrades do not refund leftover value.')) + '</div>' : '';
        var list = entries.length
            ? '<div class="rwl-plan-list" role="radiogroup">' + entries.map(optionHtml).join('') + '</div>'
            : '<p>' + esc(t('There are no other plans available for this product.')) + '</p>';
        shell('<h2 translate="no">' + esc(data.title) + '</h2>' + intro + list + credit +
            '<div class="rwl-modal-actions"><button type="button" class="rwl-modal-btn ghost" data-plan-cancel>' + esc(t('Cancel')) + '</button><button type="button" class="rwl-modal-btn" data-plan-confirm disabled>' + esc(t('Continue to Checkout')) + '</button></div>');
        var confirm = backdrop.querySelector('[data-plan-confirm]');
        var nodes = backdrop.querySelectorAll('.rwl-plan-option');
        var choose = function (node) {
            var entry = entries[parseInt(node.getAttribute('data-plan-index'), 10)];
            if (!entry || entry.disabled) return;
            selected = entry;
            Array.prototype.forEach.call(nodes, function (other) {
                var active = other === node;
                other.classList.toggle('selected', active);
                other.setAttribute('aria-checked', active ? 'true' : 'false');
            });
            confirm.disabled = false;
        };
        Array.prototype.forEach.call(nodes, function (node) {
            node.addEventListener('click', function () { choose(node); });
            node.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    choose(node);
                }
            });
        });
        confirm.addEventListener('click', function () { checkout(entries); });
    }

    function checkout() {
        if (!selected || !data) return;
        var product = activeProduct || {};
        var isSource = selected.kind === 'source';
        var item = {
            _uid: 'plan_' + data.product_id + '_' + selected.category,
            name: (data.title + ' — ' + selected.category.replace(/_/g, ' ') + (isSource ? '' : ' (plan switch)')).slice(0, 300),
            price: String(isSource ? selected.price : selected.price_due),
            qty: 1,
            product: product,
            licenseKey: selected.category,
            switchFrom: isSource || !data.current ? null : data.current.license_id
        };
        close();
        if (global.RWLCheckout) {
            if (typeof global.closeProductModal === 'function') global.closeProductModal();
            global.RWLCheckout.openFor([item]);
        }
    }

    async function open(product) {
        if (!RWL.getToken()) {
            if (global.showBanner) global.showBanner('Please login to switch your plan.', 'info');
            return;
        }
        if (!product || !product.product_id) return;
        activeProduct = product;
        shell('<h2>' + esc(t('Switch Plan')) + '</h2><p>' + esc(t('Loading your plans...')) + '</p><div class="rwl-modal-actions"><button type="button" class="rwl-modal-btn ghost" data-plan-cancel>' + esc(t('Cancel')) + '</button></div>');
        try {
            data = await RWL.apiRequest('/api/plans/' + encodeURIComponent(product.product_id));
        } catch (error) {
            shell('<h2>' + esc(t('Switch Plan')) + '</h2><p>' + esc(error.message || t('Your plans could not be loaded.')) + '</p><div class="rwl-modal-actions"><button type="button" class="rwl-modal-btn ghost" data-plan-cancel>' + esc(t('Close')) + '</button></div>');
            return;
        }
        if (!backdrop) return;
        render();
    }

    global.RWLSwitchPlan = { open: open, close: close };
})(window);
