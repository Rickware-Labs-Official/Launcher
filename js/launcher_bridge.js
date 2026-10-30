(function (global) {
    var connectPromise = null;
    var toolCache = {};
    var notifier = null;
    var PRIVILEGED_TYPES = ['admin', 'owner', 'unlock all'];
    var ICONS = {
        install: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        launch: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
        stop: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
        busy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" stroke-dasharray="40 20"/></svg>'
    };

    function bridge() {
        var candidate = global.RickwareBridge;
        return candidate && candidate.isLauncher ? candidate : null;
    }

    function isLauncher() {
        return !!bridge();
    }

    function call(method, args) {
        var current = bridge();
        if (!current) return Promise.reject(new Error('Open the Rickware - Labs© Launcher to use this feature.'));
        return current.call(method, args || {});
    }

    function notify(message, type) {
        if (typeof notifier === 'function') notifier(message, type);
        else if (typeof global.showBanner === 'function') global.showBanner(message, type);
    }

    function setNotifier(callback) {
        notifier = typeof callback === 'function' ? callback : null;
    }

    function loginPageUrl() {
        return /\/sites\//.test(location.pathname) ? './login_register.html?tab=login' : './sites/login_register.html?tab=login';
    }

    function handleLocked(message) {
        RWL.clearSession();
        notify(message || 'Your account was locked by our security system.', 'error');
        setTimeout(function () { location.href = loginPageUrl(); }, 4000);
    }

    function connect() {
        if (!isLauncher()) return Promise.resolve(null);
        var token = RWL.getToken();
        if (!token) return Promise.resolve(null);
        if (connectPromise) return connectPromise;
        connectPromise = call('connect', { access_token: token }).then(function (status) {
            connectPromise = null;
            return status;
        }, function (error) {
            connectPromise = null;
            if (error && error.code === 'locked') handleLocked(error.message);
            else notify((error && error.message) || 'The launcher could not connect to your account.', 'error');
            return null;
        });
        return connectPromise;
    }

    function disconnect() {
        if (!isLauncher()) return Promise.resolve();
        return call('disconnect').then(function () {}, function () {});
    }

    function refreshTools() {
        if (!isLauncher()) return Promise.resolve({});
        return call('getInstalledTools').then(function (tools) {
            toolCache = {};
            (tools || []).forEach(function (tool) { toolCache[tool.product_id] = tool; });
            return toolCache;
        });
    }

    function toolState(productId) {
        var tool = toolCache[productId];
        if (!tool) return 'not_installed';
        return tool.status === 'running' ? 'running' : 'installed';
    }

    function currentAccount() {
        try {
            var stored = sessionStorage.getItem('rickware_user');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    function isPrivileged(account) {
        var type = String((account && account.account_type) || '').toLowerCase();
        var role = String((account && account.role) || '').toLowerCase();
        return PRIVILEGED_TYPES.indexOf(type) >= 0 || role === 'admin' || role === 'unlockall';
    }

    function canUseProduct(product) {
        var account = currentAccount();
        if (!account || !product || !product.product_id) return false;
        if (isPrivileged(account)) return true;
        if (typeof global.isFreeProduct === 'function' && global.isFreeProduct(product)) return true;
        return (account.license_keys || []).some(function (entry) {
            return String(entry.product_id) === String(product.product_id) && entry.is_valid;
        });
    }

    function runAction(productId) {
        if (!isLauncher()) {
            notify('Open the Rickware - Labs© Launcher to install and start tools.', 'info');
            return Promise.resolve(null);
        }
        return connect().then(function (status) {
            if (!status || !status.connected) throw new Error('Please log in to use the launcher.');
            return refreshTools();
        }).then(function () {
            var state = toolState(productId);
            if (state === 'running') {
                return call('stopTool', { product_id: productId }).then(function () {
                    notify('The tool was stopped.', 'success');
                    return 'stopped';
                });
            }
            var installStep = state === 'not_installed'
                ? (notify('Installing, please wait...', 'info'), call('installTool', { product_id: productId }).then(function (result) {
                    notify((result && result.name ? result.name : 'The tool') + ' was installed and verified.', 'success');
                }))
                : Promise.resolve();
            return installStep.then(function () {
                return call('launchTool', { product_id: productId });
            }).then(function (result) {
                notify(result && result.status === 'opened' ? 'The download folder was opened.' : 'The tool was started.', 'success');
                return result && result.status;
            });
        }).catch(function (error) {
            if (error && error.code === 'locked') handleLocked(error.message);
            else notify((error && error.message) || 'The launcher could not complete the request.', 'error');
            return null;
        }).then(function (result) {
            return refreshTools().then(function () { updateModalButton(); return result; }, function () { return result; });
        });
    }

    function buttonLabel(productId) {
        var state = toolState(productId);
        if (state === 'running') return ICONS.stop + ' Stop';
        if (state === 'installed') return ICONS.launch + ' Launch';
        return ICONS.install + ' Install';
    }

    function updateModalButton() {
        var product = global._rwlActiveProduct;
        var button = document.getElementById('modalLauncherBtn') || document.querySelector('#modalDlBtn[data-launcher="1"]');
        if (!product || !button || button.dataset.busy === '1') return;
        button.innerHTML = buttonLabel(product.product_id);
    }

    function attachLauncherButton(button, product) {
        button.setAttribute('data-launcher', '1');
        button.title = 'Install, start or stop this tool in the Rickware - Labs© Launcher';
        button.innerHTML = buttonLabel(product.product_id);
        button.onclick = function (event) {
            event.preventDefault();
            if (button.dataset.busy === '1') return;
            button.dataset.busy = '1';
            button.disabled = true;
            button.innerHTML = ICONS.busy + ' Working...';
            runAction(product.product_id).then(function () {
                button.dataset.busy = '';
                button.disabled = false;
                updateModalButton();
            });
        };
        refreshTools().then(updateModalButton, function () {});
    }

    function decorateProductModal() {
        var product = global._rwlActiveProduct;
        var actions = document.getElementById('modalActions');
        if (!product || !actions || actions.getAttribute('data-launcher-ready') === '1') return;
        actions.setAttribute('data-launcher-ready', '1');
        var freeButton = document.getElementById('modalDlBtn');
        if (!isLauncher()) {
            if (freeButton && freeButton.tagName === 'BUTTON') {
                freeButton.onclick = function () {
                    notify('Tools are installed through the Rickware - Labs© Launcher. Open the launcher, log in and click Install.', 'info');
                };
            }
            return;
        }
        if (!product.product_id || !canUseProduct(product)) return;
        if (freeButton && freeButton.tagName === 'BUTTON') {
            attachLauncherButton(freeButton, product);
            return;
        }
        var button = document.createElement('button');
        button.className = 'modal-btn modal-btn-download';
        button.id = 'modalLauncherBtn';
        actions.insertBefore(button, actions.firstChild);
        attachLauncherButton(button, product);
    }

    function observeProductModal() {
        if (!('MutationObserver' in global) || !document.body) return;
        var observer = new MutationObserver(function () {
            if (document.getElementById('modalActions')) decorateProductModal();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    global.addEventListener('rickware-launcher-event', function (event) {
        var detail = event.detail || {};
        if (detail.name === 'locked') handleLocked(detail.data && detail.data.message);
        if (detail.name === 'tool_status' && detail.data && detail.data.product_id) {
            var entry = toolCache[detail.data.product_id];
            if (detail.data.status === 'removed') delete toolCache[detail.data.product_id];
            else if (entry) entry.status = detail.data.status;
            updateModalButton();
        }
    });

    function initialize() {
        observeProductModal();
        if (isLauncher() && RWL.getToken()) connect();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();

    global.RWLLauncher = {
        isLauncher: isLauncher,
        call: call,
        connect: connect,
        disconnect: disconnect,
        runAction: runAction,
        refreshTools: refreshTools,
        toolState: toolState,
        setNotifier: setNotifier
    };
})(window);
