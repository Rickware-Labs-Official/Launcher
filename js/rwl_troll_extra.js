(function (global) {
    var CSS_EFFECTS = ['disco_wash', 'drunk_sway', 'tilted_world', 'letter_chaos', 'shrinking_buttons', 'giant_cursor', 'pixel_vision', 'grayscale_world', 'negative_colors', 'wave_text', 'shouting_text', 'page_heartbeat'];
    var ACHIEVEMENTS = ['Achievement unlocked: Moved the mouse', 'Achievement unlocked: Breathing', 'Achievement unlocked: Looked at a button', 'Achievement unlocked: Still here', 'Achievement unlocked: Scrolled like a pro', 'Achievement unlocked: Clicked something probably'];
    var TIPS = ['It looks like you are using a computer. Need help?', 'Tip: Buttons work better when you click them.', 'Did you know? This text is not helpful.', 'Try turning your monitor off and on again.', 'Reminder: You have a mouse.', 'Pro tip: Blinking is free.'];
    var PIRATE_WORDS = [[/\bBuy\b/g, 'Plunder'], [/\bHome\b/g, 'Harbor'], [/\bSettings\b/g, 'Ship Rigging'], [/\bDownload\b/g, 'Haul Aboard'], [/\bLogin\b/g, 'Board Ship'], [/\bLogout\b/g, 'Abandon Ship'], [/\bHelp\b/g, 'Parley'], [/\bSearch\b/g, 'Spyglass'], [/\bStore\b/g, 'Treasure Hold']];
    var EMOJIS = ['✨', '🦆', '🍕', '💀', '🌈', '🐸', '🎉'];
    var active = {};
    var timers = {};
    var nodes = {};
    var handlers = {};
    var styleElement = null;

    function t(text) {
        return global.RWLI18n && global.RWLI18n.t ? global.RWLI18n.t(text) : text;
    }

    function ensureStyles() {
        if (styleElement) return;
        styleElement = document.createElement('style');
        styleElement.textContent = [
            '@keyframes rwlxDisco{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}',
            '@keyframes rwlxSway{0%,100%{transform:rotate(-0.7deg) translateX(-5px)}50%{transform:rotate(0.7deg) translateX(5px)}}',
            '@keyframes rwlxWave{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
            '@keyframes rwlxBeat{0%,30%,100%{transform:scale(1)}10%,22%{transform:scale(1.008)}}',
            '@keyframes rwlxFall{to{transform:translateY(60vh) rotate(420deg);opacity:0}}',
            '@keyframes rwlxFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
            'body.rwlx-disco_wash{animation:rwlxDisco 18s linear infinite}',
            'body.rwlx-drunk_sway{animation:rwlxSway 6s ease-in-out infinite;transform-origin:center top}',
            'body.rwlx-tilted_world{transform:rotate(1.1deg);transform-origin:center}',
            'body.rwlx-letter_chaos h1,body.rwlx-letter_chaos h2,body.rwlx-letter_chaos h3,body.rwlx-letter_chaos button,body.rwlx-letter_chaos a{letter-spacing:.14em}',
            'body.rwlx-shrinking_buttons button:not([data-fx-protected]):hover{transform:scale(.72)!important;transition:transform .25s ease}',
            'body.rwlx-giant_cursor,body.rwlx-giant_cursor *{cursor:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'64\' height=\'64\'><path d=\'M4 2 L4 54 L18 42 L28 62 L38 58 L28 38 L46 38 Z\' fill=\'%239d4edd\' stroke=\'white\' stroke-width=\'2\'/></svg>") 2 2,auto!important}',
            'body.rwlx-pixel_vision img{image-rendering:pixelated;filter:contrast(1.2)}',
            'html.rwlx-grayscale_world{filter:grayscale(1)}',
            'html.rwlx-negative_colors{filter:invert(1) hue-rotate(180deg)}',
            'body.rwlx-wave_text h1,body.rwlx-wave_text h2,body.rwlx-wave_text h3{animation:rwlxWave 1.6s ease-in-out infinite}',
            'body.rwlx-shouting_text *{text-transform:uppercase}',
            'body.rwlx-page_heartbeat{animation:rwlxBeat 1.8s ease-in-out infinite;transform-origin:center}',
            '.rwlx-float{position:fixed;z-index:2147482600;pointer-events:none;font-size:18px}',
            '.rwlx-card{position:fixed;z-index:2147482600;background:#0a0a0d;border:1px solid rgba(157,78,221,.6);border-radius:12px;color:#fff;font:13px/1.4 "Segoe UI",sans-serif;padding:10px 14px;box-shadow:0 8px 28px #000;animation:rwlxFade .3s ease both;max-width:280px}',
            '.rwlx-update{position:fixed;inset:0;z-index:2147482700;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:16px "Segoe UI",sans-serif;cursor:pointer;text-align:center;padding:20px}',
            '.rwlx-update-bar{width:min(420px,80vw);height:8px;border-radius:8px;background:#222;overflow:hidden}',
            '.rwlx-update-bar span{display:block;height:100%;background:linear-gradient(90deg,#7b2cbf,#e0aaff);transition:width .8s ease}'
        ].join('');
        document.head.appendChild(styleElement);
    }

    function toggleClass(name, enabled) {
        var target = (name === 'grayscale_world' || name === 'negative_colors') ? document.documentElement : document.body;
        target.classList.toggle('rwlx-' + name, enabled);
    }

    function floatEmoji(x, y, text, seconds) {
        var element = document.createElement('div');
        element.className = 'rwlx-float';
        element.textContent = text;
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.animation = 'rwlxFall ' + seconds + 's ease-in forwards';
        document.body.appendChild(element);
        setTimeout(function () { element.remove(); }, seconds * 1000);
    }

    function card(text, right, bottom, seconds) {
        var element = document.createElement('div');
        element.className = 'rwlx-card';
        element.textContent = t(text);
        element.style.right = right + 'px';
        element.style.bottom = bottom + 'px';
        document.body.appendChild(element);
        setTimeout(function () { element.remove(); }, seconds * 1000);
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    var STARTERS = {
        emoji_cursor_trail: function () {
            var last = 0;
            handlers.emoji_cursor_trail = function (event) {
                var now = Date.now();
                if (now - last < 90) return;
                last = now;
                floatEmoji(event.clientX, event.clientY, pick(EMOJIS), 1.1);
            };
            global.addEventListener('pointermove', handlers.emoji_cursor_trail, { passive: true });
        },
        confetti_clicks: function () {
            handlers.confetti_clicks = function (event) {
                for (var index = 0; index < 12; index++) floatEmoji(event.clientX + (Math.random() - 0.5) * 90, event.clientY + (Math.random() - 0.5) * 40, pick(['🎉', '🎊', '✨']), 1 + Math.random());
            };
            global.addEventListener('pointerdown', handlers.confetti_clicks, { passive: true });
        },
        fake_achievements: function () {
            timers.fake_achievements = setInterval(function () {
                if (!document.hidden) card(pick(ACHIEVEMENTS), 18, 18, 5);
            }, 28000);
        },
        helper_bubble: function () {
            timers.helper_bubble = setInterval(function () {
                if (!document.hidden) card('📎 ' + pick(TIPS), 18, 90, 7);
            }, 37000);
        },
        fake_update: function () {
            var overlay = document.createElement('div');
            overlay.className = 'rwlx-update';
            overlay.title = t('Click to dismiss');
            overlay.innerHTML = '<div>' + t('Installing important update...') + '</div><div class="rwlx-update-bar"><span></span></div><small>' + t('Click to dismiss') + '</small>';
            var bar = overlay.querySelector('span');
            var progress = 3;
            timers.fake_update = setInterval(function () {
                progress = Math.min(99, progress + (99 - progress) * 0.08);
                bar.style.width = progress + '%';
            }, 900);
            overlay.addEventListener('click', function () {
                clearInterval(timers.fake_update);
                overlay.remove();
            });
            document.body.appendChild(overlay);
            nodes.fake_update = overlay;
        },
        dvd_logo: function () {
            var logo = document.createElement('div');
            logo.className = 'rwlx-float';
            logo.textContent = '💿 Rickware';
            logo.style.fontWeight = '800';
            logo.style.color = '#e0aaff';
            document.body.appendChild(logo);
            nodes.dvd_logo = logo;
            var x = 40, y = 40, dx = 1.5, dy = 1.2;
            timers.dvd_logo = setInterval(function () {
                x += dx * 2;
                y += dy * 2;
                if (x < 0 || x > global.innerWidth - logo.offsetWidth) dx = -dx;
                if (y < 0 || y > global.innerHeight - logo.offsetHeight) dy = -dy;
                logo.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            }, 40);
        },
        ghost_cursors: function () {
            var ghosts = [];
            for (var index = 0; index < 4; index++) {
                var ghost = document.createElement('div');
                ghost.className = 'rwlx-float';
                ghost.textContent = '➤';
                ghost.style.opacity = '0.55';
                ghost.style.color = '#ffffff';
                ghost.style.transition = 'transform 2.4s ease-in-out';
                document.body.appendChild(ghost);
                ghosts.push(ghost);
            }
            nodes.ghost_cursors = ghosts;
            timers.ghost_cursors = setInterval(function () {
                ghosts.forEach(function (ghost) {
                    ghost.style.transform = 'translate(' + Math.random() * global.innerWidth + 'px,' + Math.random() * global.innerHeight + 'px) rotate(-90deg)';
                });
            }, 2400);
        },
        pirate_speak: function () {
            function translate() {
                document.querySelectorAll('button:not([data-fx-protected]), a.nav-item, .nav-item span').forEach(function (element) {
                    if (element.children.length) return;
                    var text = element.textContent;
                    PIRATE_WORDS.forEach(function (entry) { text = text.replace(entry[0], entry[1]); });
                    if (text !== element.textContent) element.textContent = text;
                });
            }
            translate();
            timers.pirate_speak = setInterval(translate, 4000);
        }
    };

    function stop(name) {
        toggleClass(name, false);
        if (timers[name]) clearInterval(timers[name]);
        delete timers[name];
        if (handlers[name]) {
            global.removeEventListener('pointermove', handlers[name]);
            global.removeEventListener('pointerdown', handlers[name]);
            delete handlers[name];
        }
        var node = nodes[name];
        if (node) {
            (Array.isArray(node) ? node : [node]).forEach(function (entry) { entry.remove(); });
            delete nodes[name];
        }
    }

    global.RWLTrollExtra = {
        apply: function (list) {
            if (!document.body) return;
            ensureStyles();
            var wanted = {};
            list.forEach(function (name) { wanted[name] = true; });
            Object.keys(active).forEach(function (name) {
                if (!wanted[name]) {
                    stop(name);
                    delete active[name];
                }
            });
            list.forEach(function (name) {
                if (active[name]) return;
                active[name] = true;
                if (CSS_EFFECTS.indexOf(name) >= 0) toggleClass(name, true);
                else if (STARTERS[name]) STARTERS[name]();
            });
        }
    };
})(window);
