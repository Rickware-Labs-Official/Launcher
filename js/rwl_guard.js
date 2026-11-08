(function (global) {
    if (global.RWLGuard || !global.RWL) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    var TELEMETRY_WINDOW_MS = 2000;
    var TELEMETRY_FLUSH_MS = 12000;
    var BAIT_WAIT_MS = 2500;
    var BLOCK_RECHECK_MS = 5000;
    var BAIT_CLASS_NAMES = 'ad ads adsbox ad-banner ad-placement adsbygoogle banner_ad sponsor-ad pub_300x250 text-ad';
    var AD_NETWORK_PROBES = ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'https://static.doubleclick.net/instream/ad_status.js'];
    var config = null;
    var windows = [];
    var current = { d: 0, k: 0, c: 0, s: 0, m: 0 };
    var windowStart = Date.now();
    var overlayShown = '';
    var challengeTimer = null;
    var visitorKey = 'rwl_guard_visitor';

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function signedIn() {
        return !!RWL.getToken();
    }

    function loadConfig() {
        if (config) return Promise.resolve(config);
        return fetch(RWL.apiUrl('/api/security/client_config')).then(function (response) {
            return response.ok ? response.json() : {};
        }).then(function (data) {
            config = data || {};
            return config;
        }).catch(function () {
            config = {};
            return config;
        });
    }

    function rollWindow() {
        var now = Date.now();
        current.d = now - windowStart;
        if (current.d >= TELEMETRY_WINDOW_MS) {
            if (current.k || current.c || current.s || current.m) {
                windows.push({ d: current.d, k: current.k, c: current.c, s: current.s, m: current.m });
                if (windows.length > 30) windows.shift();
            }
            current = { d: 0, k: 0, c: 0, s: 0, m: 0 };
            windowStart = now;
        }
    }

    function count(field) {
        current[field] += 1;
        if (current[field] % 16 === 0) rollWindow();
    }

    function startTelemetry() {
        var options = { passive: true, capture: true };
        document.addEventListener('keydown', function (event) {
            if (event.isTrusted && !event.repeat) count('k');
        }, options);
        document.addEventListener('pointerdown', function (event) {
            if (event.isTrusted && event.pointerType === 'mouse') count('c');
        }, options);
        document.addEventListener('wheel', function (event) {
            if (event.isTrusted) count('s');
        }, options);
        document.addEventListener('mousemove', function (event) {
            if (event.isTrusted) count('m');
        }, options);
        setInterval(rollWindow, TELEMETRY_WINDOW_MS);
        setInterval(flushTelemetry, TELEMETRY_FLUSH_MS);
    }

    function flushTelemetry() {
        rollWindow();
        if (!signedIn() || !windows.length) return;
        var batch = windows.splice(0, 30);
        RWL.apiRequest('/api/guard/telemetry', { method: 'POST', body: { windows: batch } }).then(function (result) {
            if (result && result.locked) showLockedScreen(result);
        }).catch(function () {});
    }

    function showLockedScreen(result) {
        var until = result.permanent ? t('until an administrator releases it') : (result.until ? t('until') + ' ' + new Date(result.until).toLocaleString() : '');
        RWL.clearSession();
        showOverlay('locked', t('Security Alert'), (result.reason || '') + ' ' + t('Your account is locked') + ' ' + until + '. ' + t('An email with the details was sent to you.'), true);
    }

    function injectBaitElement() {
        var bait = document.createElement('div');
        bait.className = BAIT_CLASS_NAMES;
        bait.setAttribute('aria-hidden', 'true');
        bait.innerHTML = '&nbsp;';
        bait.style.cssText = 'position:absolute!important;left:-9999px!important;top:-9999px!important;width:300px!important;height:250px!important;';
        document.body.appendChild(bait);
        return bait;
    }

    function injectBaitIframe() {
        var frame = document.createElement('iframe');
        frame.id = 'google_ads_iframe_rwl_0';
        frame.className = 'adsbygoogle';
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('tabindex', '-1');
        frame.src = 'about:blank';
        frame.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:728px;height:90px;border:0;';
        document.body.appendChild(frame);
        return frame;
    }

    function hidden(element) {
        if (!element || !element.isConnected) return true;
        var style = global.getComputedStyle(element);
        return style.display === 'none' || style.visibility === 'hidden' || element.offsetHeight === 0 || element.offsetWidth === 0;
    }

    function probeNetwork() {
        return Promise.all(AD_NETWORK_PROBES.map(function (url) {
            return fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(function () { return false; }).catch(function () { return true; });
        })).then(function (results) {
            return results.every(Boolean);
        });
    }

    function loadBait(entry) {
        return new Promise(function (resolve) {
            if (entry.kind === 'script') {
                var script = document.createElement('script');
                script.src = entry.url;
                script.async = true;
                script.onload = function () { script.remove(); resolve(); };
                script.onerror = function () { script.remove(); resolve(); };
                document.head.appendChild(script);
            } else if (entry.kind === 'image') {
                var image = new Image();
                image.onload = resolve;
                image.onerror = resolve;
                image.src = entry.url;
            } else {
                fetch(entry.url, { mode: 'no-cors', cache: 'no-store' }).then(resolve).catch(resolve);
            }
        });
    }

    function collectSignals() {
        var bait = injectBaitElement();
        var frame = injectBaitIframe();
        var removedByObserver = false;
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.removedNodes.forEach(function (node) {
                    if (node === bait || node === frame) removedByObserver = true;
                });
            });
        });
        observer.observe(document.body, { childList: true });
        return Promise.all([probeNetwork(), new Promise(function (resolve) { setTimeout(resolve, BAIT_WAIT_MS); })]).then(function (results) {
            var signals = {
                bait_element: hidden(bait),
                bait_iframe: hidden(frame),
                bait_script: false,
                ad_network_probe: results[0],
                snippet_removed: removedByObserver
            };
            observer.disconnect();
            if (bait.isConnected) bait.remove();
            if (frame.isConnected) frame.remove();
            return signals;
        });
    }

    function runSignedInCheck() {
        return RWL.apiRequest('/api/guard/challenge').then(function (challenge) {
            if (!challenge || !challenge.required) {
                clearOverlay('adblock');
                return null;
            }
            return Promise.all([Promise.all(challenge.baits.map(loadBait)), collectSignals()]).then(function (results) {
                var signals = results[1];
                signals.bait_script = global.__rwlAdServer !== true;
                global.__rwlAdServer = false;
                return RWL.apiRequest('/api/guard/adblock_report', { method: 'POST', body: { challenge_id: challenge.challenge_id, signals: signals } });
            });
        }).then(function (result) {
            if (!result) return;
            if (result.blocked) showAdblockOverlay();
            else clearOverlay('adblock');
        }).catch(function () {});
    }

    function runVisitorCheck() {
        if (sessionStorage.getItem(visitorKey)) return;
        sessionStorage.setItem(visitorKey, '1');
        collectSignals().then(function (signals) {
            var positive = Object.keys(signals).filter(function (key) { return signals[key]; }).length;
            var visitorId = (global.RWLFxVisitor && global.RWLFxVisitor()) || localStorage.getItem('rwl_visitor_id');
            if (!visitorId) return;
            fetch(RWL.apiUrl('/api/guard/visitor_adblock'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor_id: visitorId, blocked: positive >= 2 }) }).catch(function () {});
        });
    }

    function scheduleChecks(minutes) {
        clearInterval(challengeTimer);
        challengeTimer = setInterval(function () {
            if (signedIn() && !document.hidden) runSignedInCheck();
        }, Math.max(1, minutes) * 60000);
    }

    function showOverlay(kind, title, message, final) {
        if (overlayShown === kind) return;
        clearOverlay();
        overlayShown = kind;
        var overlay = document.createElement('div');
        overlay.id = 'rwlSecurityOverlay';
        overlay.className = 'rwl-security-overlay';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        var card = document.createElement('div');
        card.className = 'rwl-security-card';
        var heading = document.createElement('h2');
        heading.textContent = title;
        var text = document.createElement('p');
        text.textContent = message;
        card.appendChild(heading);
        card.appendChild(text);
        if (!final) {
            var retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'rwl-security-button';
            retry.title = t('Check again now');
            retry.textContent = t('Check Again');
            retry.addEventListener('click', function () { recheck(); });
            card.appendChild(retry);
        } else {
            var close = document.createElement('a');
            close.className = 'rwl-security-button';
            close.href = global.location.pathname.indexOf('/sites/') >= 0 ? './login_register.html?tab=login' : './sites/login_register.html?tab=login';
            close.title = t('Back to sign in');
            close.textContent = t('Back To Sign In');
            card.appendChild(close);
        }
        overlay.appendChild(card);
        document.documentElement.classList.add('rwl-security-blocked');
        document.body.appendChild(overlay);
    }

    function clearOverlay(kind) {
        if (kind && overlayShown !== kind) return;
        var overlay = document.getElementById('rwlSecurityOverlay');
        if (overlay) overlay.remove();
        overlayShown = '';
        document.documentElement.classList.remove('rwl-security-blocked');
    }

    function showAdblockOverlay() {
        var settings = (config && config.adblock) || {};
        showOverlay('adblock', t(settings.title || 'Adblocker Detected'), t(settings.message || 'Please disable your adblocker for this website. Everything unlocks automatically as soon as it is off.'));
        setTimeout(function () { if (overlayShown === 'adblock') recheck(); }, BLOCK_RECHECK_MS);
    }

    function showVpnOverlay(message) {
        showOverlay('vpn', t('VPN Detected'), t(message || 'A VPN, proxy or Tor connection was detected. Please disable it to use your account.'));
    }

    function recheck() {
        if (!signedIn()) {
            clearOverlay();
            return;
        }
        RWL.apiRequest('/api/guard/state').then(function (state) {
            if (state.vpn_blocked) {
                showVpnOverlay(state.vpn && state.vpn.detail);
                setTimeout(function () { if (overlayShown === 'vpn') recheck(); }, BLOCK_RECHECK_MS * 3);
                return;
            }
            if (overlayShown === 'vpn') clearOverlay('vpn');
            return runSignedInCheck();
        }).catch(function () {});
    }

    global.addEventListener('rwl-security-block', function (event) {
        var detail = event.detail || {};
        if (detail.kind === 'adblock') showAdblockOverlay();
        else if (detail.kind === 'vpn') showVpnOverlay(detail.message);
    });

    function loadTurnstileScript() {
        if (global.turnstile) return Promise.resolve();
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function turnstileToken() {
        return loadConfig().then(function (settings) {
            var turnstile = settings.turnstile;
            if (!turnstile || !turnstile.enabled || !turnstile.site_key) return '';
            return loadTurnstileScript().then(function () {
                return new Promise(function (resolve) {
                    var overlay = document.createElement('div');
                    overlay.className = 'rwl-turnstile-overlay';
                    var host = document.createElement('div');
                    overlay.appendChild(host);
                    document.body.appendChild(overlay);
                    var finish = function (token) {
                        overlay.remove();
                        resolve(token || '');
                    };
                    global.turnstile.render(host, {
                        sitekey: turnstile.site_key,
                        appearance: 'interaction-only',
                        theme: 'dark',
                        callback: finish,
                        'error-callback': function () { finish(''); },
                        'timeout-callback': function () { finish(''); },
                        'before-interactive-callback': function () { overlay.classList.add('rwl-turnstile-visible'); }
                    });
                });
            });
        }).catch(function () { return ''; });
    }

    global.RWLGuard = {
        turnstileFor: function (action) {
            return loadConfig().then(function (settings) {
                var turnstile = settings.turnstile;
                return turnstile && turnstile.enabled && turnstile[action] ? turnstileToken() : '';
            });
        },
        recheck: recheck,
        config: loadConfig,
        showOverlay: showOverlay
    };

    function init() {
        if (!document.body) return;
        var checked = false;
        loadConfig().then(function (settings) {
            if (settings.automation && settings.automation.enabled) startTelemetry();
            if (!settings.adblock || !settings.adblock.enabled) return;
            scheduleChecks(settings.adblock.recheck_minutes || 5);
            if (signedIn()) {
                checked = true;
                runSignedInCheck();
            } else {
                runVisitorCheck();
            }
            setInterval(function () {
                if (!checked && signedIn()) {
                    checked = true;
                    runSignedInCheck();
                }
            }, 15000);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
