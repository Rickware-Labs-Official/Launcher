(function (global) {
    var TRUSTED_ORIGINS = ['https://dev-rick-c137.github.io', 'https://rickware-labs-official.github.io'];
    var SECRET_KEY = 'rwl_bridge_secret';

    (function installDesktopBridge() {
        if (global.RickwareBridge) return;
        var external = global.external;
        if (!external || typeof external.sendMessage !== 'function' || typeof external.receiveMessage !== 'function') return;
        if (global.top !== global || TRUSTED_ORIGINS.indexOf(global.location.origin) < 0) return;
        var match = /(?:^#|&)rwl_bridge_secret=([a-f0-9]{48})(?:&|$)/.exec(global.location.hash || '');
        try {
            if (match) {
                global.sessionStorage.setItem(SECRET_KEY, match[1]);
                global.history.replaceState(null, '', global.location.pathname + global.location.search);
            }
        } catch (error) {}
        var secret = null;
        try { secret = global.sessionStorage.getItem(SECRET_KEY); } catch (error) { secret = null; }
        if (!secret || !/^[a-f0-9]{48}$/.test(secret)) return;
        var pending = {};
        var nextId = 1;

        function send(message) {
            message.secret = secret;
            message.origin = global.location.origin;
            external.sendMessage(JSON.stringify(message));
        }

        external.receiveMessage(function (raw) {
            var data;
            try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (error) { return; }
            if (!data || data.channel !== 'rwl') return;
            if (data.id && pending[data.id]) {
                var entry = pending[data.id];
                delete pending[data.id];
                clearTimeout(entry.timer);
                if (data.ok) entry.resolve(data.result);
                else {
                    var failure = new Error(data.error || 'Launcher request failed');
                    failure.code = data.code || 'error';
                    entry.reject(failure);
                }
                return;
            }
            if (data.event) global.dispatchEvent(new CustomEvent('rickware-launcher-event', { detail: { name: data.event, data: data.data } }));
        });

        function desktopCall(method, args) {
            return new Promise(function (resolve, reject) {
                var id = nextId++;
                var timer = setTimeout(function () {
                    if (pending[id]) {
                        delete pending[id];
                        reject(new Error('The launcher did not respond in time'));
                    }
                }, 900000);
                pending[id] = { resolve: resolve, reject: reject, timer: timer };
                send({ channel: 'rwl', id: id, method: String(method), args: args || {} });
            });
        }

        function isTrustedUrl(url) {
            return TRUSTED_ORIGINS.indexOf(url.origin) >= 0;
        }

        function openOutside(href) {
            var url;
            try { url = new URL(href, global.location.href); } catch (error) { return false; }
            if (isTrustedUrl(url)) return false;
            if (url.protocol === 'http:' || url.protocol === 'https:') desktopCall('openExternal', { url: url.href }).catch(function () {});
            return true;
        }

        document.addEventListener('click', function (event) {
            var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
            if (!anchor) return;
            var href = anchor.getAttribute('href') || '';
            if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return;
            var target = new URL(anchor.href, global.location.href);
            if (isTrustedUrl(target)) return;
            event.preventDefault();
            openOutside(anchor.href);
        }, true);

        global.open = function (url) {
            if (url && openOutside(String(url))) return null;
            if (url) global.location.href = String(url);
            return null;
        };

        function action(name) {
            send({ action: name });
        }

        global.RickwareBridge = Object.freeze({
            isLauncher: true,
            desktop: true,
            version: '',
            call: desktopCall,
            minimize: function () { action('minimize'); },
            maximize: function () { action('maximize'); },
            close: function () { action('close'); },
            startDrag: function () {}
        });
        var ready = function () { global.dispatchEvent(new CustomEvent('rickware-bridge-ready')); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
        else ready();
    })();

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

    var settingsPanel = null;

    function settingsStyle() {
        if (document.getElementById('rwlLauncherSettingsStyle')) return;
        var style = document.createElement('style');
        style.id = 'rwlLauncherSettingsStyle';
        style.textContent = '#rwlLauncherGear{position:fixed;right:18px;bottom:18px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(224,170,255,0.55);background:linear-gradient(135deg,#7b2cbf,#9d4edd);color:#fff;font-size:20px;cursor:pointer;z-index:99990;box-shadow:0 0 16px rgba(157,78,221,0.55);transition:transform .2s,box-shadow .2s}' +
            '#rwlLauncherGear:hover{transform:rotate(30deg);box-shadow:0 0 24px rgba(224,170,255,0.75)}' +
            '#rwlLauncherSettings{position:fixed;right:18px;bottom:72px;width:min(360px,calc(100vw - 36px));padding:18px;border-radius:14px;background:#160f24;border:1px solid rgba(157,78,221,0.55);color:#efe6ff;z-index:99991;box-shadow:0 18px 40px rgba(0,0,0,0.55),0 0 18px rgba(157,78,221,0.35);font-size:13px}' +
            '#rwlLauncherSettings h3{margin:0 0 12px;font-size:15px;color:#e0aaff}' +
            '#rwlLauncherSettings label{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(157,78,221,0.15)}' +
            '#rwlLauncherSettings input[type=checkbox]{width:18px;height:18px;accent-color:#9d4edd}' +
            '#rwlLauncherSettings .rwl-ls-path{font-family:monospace;font-size:11px;color:#a594c4;word-break:break-all;margin:8px 0}' +
            '#rwlLauncherSettings .rwl-ls-row{display:flex;gap:8px;margin-top:12px}' +
            '#rwlLauncherSettings button{flex:1;padding:9px 12px;border-radius:10px;border:1px solid rgba(224,170,255,0.45);background:linear-gradient(135deg,#7b2cbf,#9d4edd);color:#fff;font-weight:700;cursor:pointer;box-shadow:0 0 10px rgba(157,78,221,0.35)}' +
            '#rwlLauncherSettings button.rwl-ls-ghost{background:rgba(123,44,191,0.15)}';
        (document.head || document.documentElement).appendChild(style);
    }

    function renderSettings(config) {
        settingsPanel.innerHTML = '';
        var title = document.createElement('h3');
        title.textContent = 'Launcher Settings';
        settingsPanel.appendChild(title);
        [['auto_login', 'Auto Login'], ['start_at_login', 'Start at login'], ['start_minimized', 'Start minimized']].forEach(function (pair) {
            var label = document.createElement('label');
            var text = document.createElement('span');
            text.textContent = pair[1];
            var box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = !!config[pair[0]];
            box.setAttribute('data-setting', pair[0]);
            label.appendChild(text);
            label.appendChild(box);
            settingsPanel.appendChild(label);
        });
        var folderTitle = document.createElement('div');
        folderTitle.style.marginTop = '10px';
        folderTitle.textContent = 'Tools folder';
        var folder = document.createElement('div');
        folder.className = 'rwl-ls-path';
        folder.textContent = config.exe_download_path || '-';
        settingsPanel.appendChild(folderTitle);
        settingsPanel.appendChild(folder);
        var row = document.createElement('div');
        row.className = 'rwl-ls-row';
        var choose = document.createElement('button');
        choose.type = 'button';
        choose.className = 'rwl-ls-ghost';
        choose.title = 'Choose the folder for installed tools';
        choose.textContent = 'Choose Folder';
        choose.onclick = function () {
            call('browseToolsDirectory').then(function (result) {
                folder.textContent = result.exe_download_path;
            }, function (error) {
                if (error && error.code !== 'cancelled') notify(error.message, 'error');
            });
        };
        var save = document.createElement('button');
        save.type = 'button';
        save.title = 'Save the launcher settings';
        save.textContent = 'Save';
        save.onclick = function () {
            var values = {};
            settingsPanel.querySelectorAll('[data-setting]').forEach(function (box) { values[box.getAttribute('data-setting')] = box.checked; });
            call('saveLauncherConfig', { settings: values }).then(function () {
                notify('Launcher settings saved.', 'success');
                closeSettings();
            }, function (error) { notify((error && error.message) || 'The settings could not be saved.', 'error'); });
        };
        row.appendChild(choose);
        row.appendChild(save);
        settingsPanel.appendChild(row);
    }

    function closeSettings() {
        if (settingsPanel && settingsPanel.parentNode) settingsPanel.remove();
        settingsPanel = null;
    }

    function toggleSettings() {
        if (settingsPanel) {
            closeSettings();
            return;
        }
        settingsPanel = document.createElement('div');
        settingsPanel.id = 'rwlLauncherSettings';
        settingsPanel.textContent = 'Loading...';
        document.body.appendChild(settingsPanel);
        call('getLauncherConfig').then(renderSettings, function (error) {
            notify((error && error.message) || 'The launcher settings could not be loaded.', 'error');
            closeSettings();
        });
    }

    function installDesktopSettings() {
        var current = bridge();
        if (!current || !current.desktop || document.getElementById('rwlLauncherGear')) return;
        settingsStyle();
        var gear = document.createElement('button');
        gear.id = 'rwlLauncherGear';
        gear.type = 'button';
        gear.title = 'Launcher Settings';
        gear.setAttribute('aria-label', 'Launcher Settings');
        gear.textContent = '⚙';
        gear.onclick = toggleSettings;
        document.body.appendChild(gear);
    }

    function initialize() {
        if (isLauncher()) document.documentElement.classList.add('rwl-launcher-host');
        observeProductModal();
        installDesktopSettings();
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
