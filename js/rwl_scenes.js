(function (global) {
    var TIER_HIGH = 2;
    var TIER_MEDIUM = 1;
    var TIER_LOW = 0;
    var FRAME_BUDGET_MS = 26;
    var MEASURE_FRAMES = 90;
    var SPRITE_CACHE = {};
    var SEASON_DEFAULTS = {
        halloween: { night: 0.1 },
        winter: { night: 0.06 },
        christmas: { night: 0.06 },
        autumn: { night: 0.02 },
        spring: { night: 0 },
        summer: { night: 0 },
        new_year: { night: 0.08 },
        valentine: { night: 0.02 }
    };

    function seededRandom(seed) {
        var value = (seed >>> 0) || 1;
        return function () {
            value ^= value << 13;
            value ^= value >>> 17;
            value ^= value << 5;
            value >>>= 0;
            return value / 4294967296;
        };
    }

    function hexToRgb(hex) {
        var clean = String(hex || '#ffffff').replace('#', '');
        return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
    }

    function rgba(hex, alpha) {
        var rgb = hexToRgb(hex);
        return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
    }

    function makeSprite(key, width, height, draw) {
        var cached = SPRITE_CACHE[key];
        if (cached) return cached;
        var sprite = document.createElement('canvas');
        sprite.width = width;
        sprite.height = height;
        draw(sprite.getContext('2d'), width, height);
        SPRITE_CACHE[key] = sprite;
        return sprite;
    }

    function ellipse(ctx, x, y, rx, ry, rotation) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rotation || 0, 0, Math.PI * 2);
        ctx.closePath();
    }

    var DRAWERS = {
        snow: function (ctx, w) {
            var gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.5, 'rgba(235,245,255,0.8)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, w);
        },
        crystal: function (ctx, w, h, color) {
            ctx.translate(w / 2, h / 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, w / 18);
            ctx.lineCap = 'round';
            for (var arm = 0; arm < 6; arm++) {
                ctx.rotate(Math.PI / 3);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -w * 0.44);
                ctx.moveTo(0, -w * 0.26);
                ctx.lineTo(-w * 0.1, -w * 0.36);
                ctx.moveTo(0, -w * 0.26);
                ctx.lineTo(w * 0.1, -w * 0.36);
                ctx.stroke();
            }
        },
        bat: function (ctx, w, h, color, frame) {
            var lift = frame === 0 ? -0.18 : 0.14;
            ctx.fillStyle = color;
            ctx.translate(w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.1);
            ctx.quadraticCurveTo(-w * 0.2, h * (lift - 0.1), -w * 0.48, h * lift);
            ctx.quadraticCurveTo(-w * 0.34, h * 0.08, -w * 0.28, h * 0.22);
            ctx.quadraticCurveTo(-w * 0.16, h * 0.08, -w * 0.08, h * 0.22);
            ctx.lineTo(0, h * 0.12);
            ctx.lineTo(w * 0.08, h * 0.22);
            ctx.quadraticCurveTo(w * 0.16, h * 0.08, w * 0.28, h * 0.22);
            ctx.quadraticCurveTo(w * 0.34, h * 0.08, w * 0.48, h * lift);
            ctx.quadraticCurveTo(w * 0.2, h * (lift - 0.1), 0, -h * 0.1);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-w * 0.07, -h * 0.1);
            ctx.lineTo(-w * 0.09, -h * 0.3);
            ctx.lineTo(0, -h * 0.16);
            ctx.lineTo(w * 0.09, -h * 0.3);
            ctx.lineTo(w * 0.07, -h * 0.1);
            ctx.fill();
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(-w * 0.05, -h * 0.1, w * 0.03, h * 0.04);
            ctx.fillRect(w * 0.02, -h * 0.1, w * 0.03, h * 0.04);
        },
        pumpkin: function (ctx, w, h, color) {
            var center = w / 2;
            var body = h * 0.56;
            ctx.fillStyle = '#3f7d2c';
            ctx.fillRect(center - w * 0.05, h * 0.06, w * 0.1, h * 0.2);
            for (var lobe = 3; lobe >= 0; lobe--) {
                ctx.fillStyle = lobe % 2 ? color : rgba(color, 0.88);
                ellipse(ctx, center - lobe * w * 0.11, body, w * 0.2, h * 0.34);
                ctx.fill();
                ellipse(ctx, center + lobe * w * 0.11, body, w * 0.2, h * 0.34);
                ctx.fill();
            }
            ctx.fillStyle = '#ffe066';
            ctx.beginPath();
            ctx.moveTo(center - w * 0.22, body - h * 0.12);
            ctx.lineTo(center - w * 0.1, body - h * 0.12);
            ctx.lineTo(center - w * 0.16, body - h * 0.24);
            ctx.closePath();
            ctx.moveTo(center + w * 0.22, body - h * 0.12);
            ctx.lineTo(center + w * 0.1, body - h * 0.12);
            ctx.lineTo(center + w * 0.16, body - h * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(center - w * 0.24, body + h * 0.04);
            ctx.lineTo(center - w * 0.12, body + h * 0.12);
            ctx.lineTo(center - w * 0.06, body + h * 0.04);
            ctx.lineTo(center, body + h * 0.14);
            ctx.lineTo(center + w * 0.06, body + h * 0.04);
            ctx.lineTo(center + w * 0.12, body + h * 0.12);
            ctx.lineTo(center + w * 0.24, body + h * 0.04);
            ctx.lineTo(center + w * 0.14, body + h * 0.22);
            ctx.lineTo(center - w * 0.14, body + h * 0.22);
            ctx.closePath();
            ctx.fill();
        },
        candle: function (ctx, w, h) {
            ctx.fillStyle = '#f2e8d5';
            ctx.fillRect(w * 0.32, h * 0.34, w * 0.36, h * 0.66);
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(w * 0.58, h * 0.34, w * 0.1, h * 0.66);
            ctx.fillStyle = '#3a2a1c';
            ctx.fillRect(w * 0.48, h * 0.27, w * 0.04, h * 0.08);
        },
        flame: function (ctx, w, h) {
            var gradient = ctx.createRadialGradient(w / 2, h * 0.65, 1, w / 2, h * 0.55, h * 0.5);
            gradient.addColorStop(0, 'rgba(255,255,220,1)');
            gradient.addColorStop(0.35, 'rgba(255,190,70,0.95)');
            gradient.addColorStop(1, 'rgba(255,90,10,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.quadraticCurveTo(w, h * 0.6, w / 2, h);
            ctx.quadraticCurveTo(0, h * 0.6, w / 2, 0);
            ctx.fill();
        },
        ghost: function (ctx, w, h) {
            var gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
            gradient.addColorStop(1, 'rgba(215,225,255,0.25)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(w * 0.12, h * 0.95);
            ctx.lineTo(w * 0.12, h * 0.42);
            ctx.quadraticCurveTo(w * 0.12, 0, w * 0.5, 0);
            ctx.quadraticCurveTo(w * 0.88, 0, w * 0.88, h * 0.42);
            ctx.lineTo(w * 0.88, h * 0.95);
            ctx.quadraticCurveTo(w * 0.76, h * 0.8, w * 0.66, h * 0.95);
            ctx.quadraticCurveTo(w * 0.56, h * 0.8, w * 0.5, h * 0.95);
            ctx.quadraticCurveTo(w * 0.4, h * 0.8, w * 0.32, h * 0.95);
            ctx.quadraticCurveTo(w * 0.22, h * 0.8, w * 0.12, h * 0.95);
            ctx.fill();
            ctx.fillStyle = '#16161e';
            ellipse(ctx, w * 0.38, h * 0.36, w * 0.06, h * 0.08);
            ctx.fill();
            ellipse(ctx, w * 0.62, h * 0.36, w * 0.06, h * 0.08);
            ctx.fill();
            ellipse(ctx, w * 0.5, h * 0.52, w * 0.05, h * 0.06);
            ctx.fill();
        },
        spider: function (ctx, w, h) {
            ctx.strokeStyle = '#17171c';
            ctx.fillStyle = '#17171c';
            ctx.lineWidth = Math.max(1, w / 26);
            ctx.translate(w / 2, h / 2);
            for (var leg = 0; leg < 4; leg++) {
                var spread = -0.5 + leg * 0.34;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(w * 0.28, h * (spread - 0.2), w * 0.46, h * (spread + 0.18));
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-w * 0.28, h * (spread - 0.2), -w * 0.46, h * (spread + 0.18));
                ctx.stroke();
            }
            ellipse(ctx, 0, h * 0.06, w * 0.17, h * 0.2);
            ctx.fill();
            ellipse(ctx, 0, -h * 0.16, w * 0.1, h * 0.1);
            ctx.fill();
        },
        witch: function (ctx, w, h) {
            ctx.fillStyle = '#121019';
            ctx.strokeStyle = '#6b4a2b';
            ctx.lineWidth = h * 0.04;
            ctx.beginPath();
            ctx.moveTo(w * 0.02, h * 0.74);
            ctx.lineTo(w * 0.86, h * 0.66);
            ctx.stroke();
            ctx.fillStyle = '#c98d3a';
            ctx.beginPath();
            ctx.moveTo(w * 0.02, h * 0.74);
            ctx.lineTo(w * 0.2, h * 0.6);
            ctx.lineTo(w * 0.2, h * 0.86);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#121019';
            ctx.beginPath();
            ctx.moveTo(w * 0.3, h * 0.72);
            ctx.quadraticCurveTo(w * 0.42, h * 0.3, w * 0.58, h * 0.36);
            ctx.lineTo(w * 0.68, h * 0.7);
            ctx.closePath();
            ctx.fill();
            ellipse(ctx, w * 0.6, h * 0.3, w * 0.07, h * 0.1);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w * 0.48, h * 0.22);
            ctx.lineTo(w * 0.74, h * 0.22);
            ctx.lineTo(w * 0.56, 0);
            ctx.closePath();
            ctx.fill();
        },
        leaf: function (ctx, w, h, color) {
            ctx.translate(w / 2, h / 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.46);
            ctx.bezierCurveTo(w * 0.5, -h * 0.2, w * 0.36, h * 0.3, 0, h * 0.42);
            ctx.bezierCurveTo(-w * 0.36, h * 0.3, -w * 0.5, -h * 0.2, 0, -h * 0.46);
            ctx.fill();
            ctx.strokeStyle = 'rgba(70,30,0,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.4);
            ctx.lineTo(0, h * 0.48);
            ctx.stroke();
        },
        acorn: function (ctx, w, h) {
            ctx.fillStyle = '#a56a2c';
            ellipse(ctx, w / 2, h * 0.6, w * 0.3, h * 0.34);
            ctx.fill();
            ctx.fillStyle = '#6b4220';
            ellipse(ctx, w / 2, h * 0.34, w * 0.36, h * 0.18);
            ctx.fill();
            ctx.fillRect(w * 0.47, h * 0.08, w * 0.06, h * 0.14);
        },
        mushroom: function (ctx, w, h, color) {
            ctx.fillStyle = '#efe6d6';
            ctx.fillRect(w * 0.4, h * 0.46, w * 0.2, h * 0.54);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(w * 0.04, h * 0.5);
            ctx.quadraticCurveTo(w * 0.5, -h * 0.2, w * 0.96, h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ellipse(ctx, w * 0.36, h * 0.3, w * 0.07, h * 0.06);
            ctx.fill();
            ellipse(ctx, w * 0.62, h * 0.22, w * 0.06, h * 0.05);
            ctx.fill();
        },
        gift: function (ctx, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.66);
            ctx.fillStyle = '#ffe28a';
            ctx.fillRect(w * 0.44, h * 0.3, w * 0.12, h * 0.66);
            ctx.fillRect(w * 0.1, h * 0.54, w * 0.8, h * 0.1);
            ellipse(ctx, w * 0.36, h * 0.2, w * 0.14, h * 0.1, 0.5);
            ctx.fill();
            ellipse(ctx, w * 0.64, h * 0.2, w * 0.14, h * 0.1, -0.5);
            ctx.fill();
        },
        tree: function (ctx, w, h) {
            ctx.fillStyle = '#5a3b1e';
            ctx.fillRect(w * 0.44, h * 0.84, w * 0.12, h * 0.16);
            ctx.fillStyle = '#17643a';
            for (var layer = 0; layer < 3; layer++) {
                ctx.beginPath();
                ctx.moveTo(w / 2, h * (0.02 + layer * 0.24));
                ctx.lineTo(w * (0.92 - (2 - layer) * 0.14), h * (0.38 + layer * 0.24));
                ctx.lineTo(w * (0.08 + (2 - layer) * 0.14), h * (0.38 + layer * 0.24));
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = '#ffd84d';
            ellipse(ctx, w / 2, h * 0.04, w * 0.06, w * 0.06);
            ctx.fill();
            var colors = ['#ff4d6d', '#ffe066', '#7bdff2', '#ffffff'];
            for (var bulb = 0; bulb < 8; bulb++) {
                ctx.fillStyle = colors[bulb % 4];
                ellipse(ctx, w * (0.3 + ((bulb * 37) % 40) / 100), h * (0.26 + bulb * 0.08), w * 0.025, w * 0.025);
                ctx.fill();
            }
        },
        santa: function (ctx, w, h) {
            ctx.lineCap = 'round';
            var runner = h * 0.82;
            for (var deer = 0; deer < 3; deer++) {
                var dx = w * (0.62 + deer * 0.13);
                ctx.fillStyle = '#7b4a24';
                ellipse(ctx, dx, h * 0.52, w * 0.05, h * 0.09);
                ctx.fill();
                ellipse(ctx, dx + w * 0.05, h * 0.4, w * 0.018, h * 0.06);
                ctx.fill();
                ctx.strokeStyle = '#7b4a24';
                ctx.lineWidth = Math.max(1, h * 0.022);
                ctx.beginPath();
                ctx.moveTo(dx - w * 0.03, h * 0.58);
                ctx.lineTo(dx - w * 0.04, h * 0.74);
                ctx.moveTo(dx + w * 0.03, h * 0.58);
                ctx.lineTo(dx + w * 0.04, h * 0.74);
                ctx.moveTo(dx + w * 0.05, h * 0.32);
                ctx.lineTo(dx + w * 0.03, h * 0.2);
                ctx.moveTo(dx + w * 0.05, h * 0.32);
                ctx.lineTo(dx + w * 0.08, h * 0.2);
                ctx.stroke();
                if (deer === 2) {
                    ctx.fillStyle = '#ff3b3b';
                    ellipse(ctx, dx + w * 0.075, h * 0.38, w * 0.01, h * 0.022);
                    ctx.fill();
                }
            }
            ctx.strokeStyle = 'rgba(240,210,120,0.8)';
            ctx.lineWidth = Math.max(1, h * 0.012);
            ctx.beginPath();
            ctx.moveTo(w * 0.46, h * 0.56);
            ctx.lineTo(w * 0.9, h * 0.5);
            ctx.stroke();
            ctx.fillStyle = '#b3122f';
            ctx.beginPath();
            ctx.moveTo(w * 0.05, h * 0.42);
            ctx.lineTo(w * 0.46, h * 0.5);
            ctx.quadraticCurveTo(w * 0.48, runner - h * 0.06, w * 0.34, runner - h * 0.06);
            ctx.lineTo(w * 0.1, runner - h * 0.06);
            ctx.quadraticCurveTo(w * 0.03, h * 0.62, w * 0.05, h * 0.42);
            ctx.fill();
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = Math.max(2, h * 0.03);
            ctx.beginPath();
            ctx.moveTo(w * 0.04, runner);
            ctx.lineTo(w * 0.44, runner);
            ctx.quadraticCurveTo(w * 0.5, runner, w * 0.5, runner - h * 0.08);
            ctx.stroke();
            ctx.fillStyle = '#7b4bb7';
            ellipse(ctx, w * 0.13, h * 0.36, w * 0.07, h * 0.14);
            ctx.fill();
            ctx.fillStyle = '#d7263d';
            ellipse(ctx, w * 0.29, h * 0.4, w * 0.055, h * 0.14);
            ctx.fill();
            ctx.fillStyle = '#ffe0bd';
            ellipse(ctx, w * 0.3, h * 0.22, w * 0.032, h * 0.07);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ellipse(ctx, w * 0.31, h * 0.29, w * 0.034, h * 0.06);
            ctx.fill();
            ctx.fillStyle = '#d7263d';
            ctx.beginPath();
            ctx.moveTo(w * 0.26, h * 0.18);
            ctx.lineTo(w * 0.34, h * 0.18);
            ctx.lineTo(w * 0.24, h * 0.05);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(w * 0.255, h * 0.165, w * 0.09, h * 0.03);
        },
        star: function (ctx, w) {
            var gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, w);
        },
        glow: function (ctx, w, h, color) {
            var gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            gradient.addColorStop(0, rgba(color, 1));
            gradient.addColorStop(0.35, rgba(color, 0.55));
            gradient.addColorStop(1, rgba(color, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, w);
        },
        heart: function (ctx, w, h, color) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(w / 2, h * 0.9);
            ctx.bezierCurveTo(-w * 0.1, h * 0.45, w * 0.18, -h * 0.05, w / 2, h * 0.28);
            ctx.bezierCurveTo(w * 0.82, -h * 0.05, w * 1.1, h * 0.45, w / 2, h * 0.9);
            ctx.fill();
        },
        petal: function (ctx, w, h, color) {
            ctx.translate(w / 2, h / 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.45);
            ctx.bezierCurveTo(w * 0.42, -h * 0.28, w * 0.34, h * 0.28, 0, h * 0.45);
            ctx.bezierCurveTo(-w * 0.34, h * 0.28, -w * 0.42, -h * 0.28, 0, -h * 0.45);
            ctx.fill();
        },
        butterfly: function (ctx, w, h, color, frame) {
            var flap = frame === 0 ? 1 : 0.45;
            ctx.translate(w / 2, h / 2);
            ctx.fillStyle = color;
            ellipse(ctx, -w * 0.22 * flap, -h * 0.14, w * 0.24 * flap, h * 0.24, 0.4);
            ctx.fill();
            ellipse(ctx, w * 0.22 * flap, -h * 0.14, w * 0.24 * flap, h * 0.24, -0.4);
            ctx.fill();
            ctx.fillStyle = rgba(color, 0.8);
            ellipse(ctx, -w * 0.16 * flap, h * 0.2, w * 0.16 * flap, h * 0.16);
            ctx.fill();
            ellipse(ctx, w * 0.16 * flap, h * 0.2, w * 0.16 * flap, h * 0.16);
            ctx.fill();
            ctx.fillStyle = '#17171c';
            ellipse(ctx, 0, 0, w * 0.035, h * 0.3);
            ctx.fill();
        },
        bee: function (ctx, w, h, _color, frame) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ellipse(ctx, w * 0.46, h * (frame === 0 ? 0.22 : 0.28), w * 0.16, h * 0.14);
            ctx.fill();
            ctx.fillStyle = '#ffc914';
            ellipse(ctx, w / 2, h * 0.58, w * 0.34, h * 0.26);
            ctx.fill();
            ctx.fillStyle = '#17171c';
            ctx.fillRect(w * 0.38, h * 0.34, w * 0.08, h * 0.48);
            ctx.fillRect(w * 0.56, h * 0.34, w * 0.08, h * 0.48);
        },
        bird: function (ctx, w, h, _color, frame) {
            ctx.strokeStyle = '#101018';
            ctx.lineWidth = Math.max(1.5, w / 16);
            ctx.lineCap = 'round';
            var lift = frame === 0 ? 0.15 : 0.6;
            ctx.beginPath();
            ctx.moveTo(w * 0.04, h * lift);
            ctx.quadraticCurveTo(w * 0.28, h * 0.25, w / 2, h * 0.55);
            ctx.quadraticCurveTo(w * 0.72, h * 0.25, w * 0.96, h * lift);
            ctx.stroke();
        },
        bubble: function (ctx, w) {
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = Math.max(1, w / 18);
            ctx.fillStyle = 'rgba(255,255,255,0.09)';
            ellipse(ctx, w / 2, w / 2, w * 0.44, w * 0.44);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ellipse(ctx, w * 0.36, w * 0.34, w * 0.08, w * 0.06, -0.6);
            ctx.fill();
        }
    };

    function sprite(kind, width, height, color, frame) {
        var key = kind + ':' + width + ':' + height + ':' + (color || '') + ':' + (frame || 0);
        return makeSprite(key, width, height, function (ctx, w, h) {
            DRAWERS[kind](ctx, w, h, color || '#ffffff', frame || 0);
        });
    }

    function deviceTier() {
        var memory = global.navigator && global.navigator.deviceMemory;
        var cores = global.navigator && global.navigator.hardwareConcurrency;
        if (document.documentElement.classList.contains('rwl-low-fx')) return TIER_LOW;
        if ((memory && memory <= 4) || (cores && cores <= 4)) return TIER_MEDIUM;
        return TIER_HIGH;
    }

    function reducedMotion() {
        try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (error) { return false; }
    }

    function Scene(host, options) {
        this.host = host || document.body;
        this.scene = options.scene;
        this.speed = options.speed || 1;
        this.preview = !!options.preview;
        this.random = seededRandom(this.scene.seed);
        this.tier = this.preview ? TIER_MEDIUM : deviceTier();
        this.width = 0;
        this.height = 0;
        this.entities = {};
        this.effects = [];
        this.pointer = { x: -9999, y: -9999, active: false };
        this.frameTimes = [];
        this.lastFrame = 0;
        this.running = false;
        this.frameSkip = 0;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'rwl-scene-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.host.appendChild(this.canvas);
        var self = this;
        this.onResize = function () { self.resize(); };
        this.onPointerMove = function (event) { self.pointer.x = event.clientX; self.pointer.y = event.clientY; self.pointer.active = true; };
        this.onPointerDown = function (event) { self.handleClick(event.clientX, event.clientY); };
        this.onVisibility = function () { if (document.hidden) self.stop(); else self.start(); };
        global.addEventListener('resize', this.onResize, { passive: true });
        if (!this.preview) {
            global.addEventListener('pointermove', this.onPointerMove, { passive: true });
            global.addEventListener('pointerdown', this.onPointerDown, { passive: true });
        }
        document.addEventListener('visibilitychange', this.onVisibility);
        this.resize();
        this.build();
    }

    Scene.prototype.has = function (entity) {
        return (this.scene.entities || []).indexOf(entity) >= 0;
    };

    Scene.prototype.color = function (index) {
        var palette = this.scene.palette || ['#ffffff'];
        return palette[index % palette.length];
    };

    Scene.prototype.resize = function () {
        var rect = this.preview ? this.host.getBoundingClientRect() : { width: global.innerWidth, height: global.innerHeight };
        this.width = Math.max(60, Math.round(rect.width));
        this.height = Math.max(60, Math.round(rect.height));
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.drifts = null;
        if (this.pieces) this.buildPieces();
    };

    Scene.prototype.amount = function (base) {
        var tierScale = this.tier === TIER_HIGH ? 1 : (this.tier === TIER_MEDIUM ? 0.6 : 0.3);
        var areaScale = Math.min(1.4, Math.max(0.25, (this.width * this.height) / (1500 * 800)));
        return Math.max(1, Math.round(base * tierScale * areaScale * (this.scene.density || 1)));
    };

    Scene.prototype.spawnFalling = function (kind, count, options) {
        var list = [];
        for (var index = 0; index < count; index++) {
            var size = (options.min + this.random() * (options.max - options.min)) * (this.scene.scale || 1);
            list.push({
                kind: kind,
                x: this.random() * this.width,
                y: this.random() * this.height,
                size: Math.max(2, Math.round(size)),
                speed: options.speed * (0.6 + this.random() * 0.8),
                sway: this.random() * Math.PI * 2,
                swayRate: 0.4 + this.random() * 1.1,
                rotation: this.random() * Math.PI * 2,
                spin: (this.random() - 0.5) * 2,
                color: options.colors ? options.colors[index % options.colors.length] : null,
                rise: !!options.rise,
                alpha: options.alpha || 0.9
            });
        }
        return list;
    };

    Scene.prototype.spawnFlyers = function (kind, count, minSize, maxSize, colorful) {
        var list = [];
        for (var index = 0; index < count; index++) {
            list.push({
                kind: kind,
                x: this.random() * this.width,
                y: this.random() * this.height * 0.75,
                size: Math.round((minSize + this.random() * (maxSize - minSize)) * (this.scene.scale || 1)),
                vx: (this.random() < 0.5 ? -1 : 1) * (30 + this.random() * 50),
                phase: this.random() * Math.PI * 2,
                flap: 5 + this.random() * 7,
                amplitude: 14 + this.random() * 34,
                color: colorful ? this.color(index) : '#14121c',
                baseY: 0
            });
            list[index].baseY = list[index].y;
        }
        return list;
    };

    Scene.prototype.buildGround = function (kind, count, minSize, maxSize) {
        var list = [];
        for (var index = 0; index < count; index++) {
            var size = Math.round((minSize + this.random() * (maxSize - minSize)) * (this.scene.scale || 1));
            list.push({ kind: kind, x: ((index + 0.5) / count) * this.width + (this.random() - 0.5) * 50, size: size, phase: this.random() * Math.PI * 2, color: this.color(index) });
        }
        return list;
    };

    Scene.prototype.build = function () {
        var entities = {};
        if (this.has('snow')) entities.snow = this.spawnFalling('snow', this.amount(this.scene.season === 'christmas' ? 80 : 130), { min: 3, max: 9, speed: 42 });
        if (this.has('crystals')) entities.crystals = this.spawnFalling('crystal', this.amount(14), { min: 12, max: 24, speed: 26, colors: ['#d8f3ff', this.color(1)] });
        if (this.has('leaves')) entities.leaves = this.spawnFalling('leaf', this.amount(44), { min: 12, max: 24, speed: 46, colors: ['#d9622b', '#e8a33d', '#b23a1e', '#c9852d', this.color(0)] });
        if (this.has('acorns')) entities.acorns = this.spawnFalling('acorn', this.amount(8), { min: 11, max: 16, speed: 70 });
        if (this.has('petals')) entities.petals = this.spawnFalling('petal', this.amount(46), { min: 7, max: 14, speed: 30, colors: ['#ffc2d6', '#ff9ec2', '#fff0f5', this.color(1)] });
        if (this.has('hearts')) entities.hearts = this.spawnFalling('heart', this.amount(26), { min: 9, max: 20, speed: 30, rise: true, colors: ['#ff4d6d', '#ff85a1', this.color(0)] });
        if (this.has('confetti')) entities.confetti = this.spawnFalling('petal', this.amount(60), { min: 5, max: 9, speed: 62, colors: ['#ffd166', '#06d6a0', '#ef476f', '#7bdff2', this.color(0), this.color(1)] });
        if (this.has('bubbles')) entities.bubbles = this.spawnFalling('bubble', this.amount(20), { min: 8, max: 22, speed: 26, rise: true, alpha: 0.65 });
        if (this.has('gifts')) entities.gifts = this.spawnFalling('gift', this.amount(6), { min: 14, max: 22, speed: 40, colors: ['#d7263d', '#1a936f', '#3a86ff'] });
        if (this.has('bats')) entities.bats = this.spawnFlyers('bat', this.amount(13), 24, 44, false);
        if (this.has('butterflies')) entities.butterflies = this.spawnFlyers('butterfly', this.amount(10), 16, 26, true);
        if (this.has('bees')) entities.bees = this.spawnFlyers('bee', this.amount(8), 13, 18, false);
        if (this.has('birds')) entities.birds = this.spawnFlyers('bird', this.amount(9), 14, 22, false);
        if (this.has('ghosts')) {
            entities.ghosts = this.spawnFlyers('ghost', this.amount(6), 30, 52, false);
            entities.ghosts.forEach(function (ghost) { ghost.vx *= 0.35; });
        }
        if (this.has('candles')) entities.candles = this.buildGround('candle', this.amount(11), 18, 30);
        if (this.has('pumpkins')) entities.pumpkins = this.buildGround('pumpkin', this.amount(7), 26, 42);
        if (this.has('trees')) entities.trees = this.buildGround('tree', this.amount(6), 60, 110);
        if (this.has('mushrooms')) entities.mushrooms = this.buildGround('mushroom', this.amount(9), 18, 32);
        if (this.has('spiders')) {
            entities.spiders = [];
            var spiderCount = this.amount(6);
            for (var spider = 0; spider < spiderCount; spider++) {
                entities.spiders.push({ x: this.random() * this.width, length: 60 + this.random() * 200, phase: this.random() * Math.PI * 2, size: Math.round(16 + this.random() * 14) });
            }
        }
        if (this.has('stars')) {
            entities.stars = [];
            var starCount = this.amount(70);
            for (var star = 0; star < starCount; star++) {
                entities.stars.push({ x: this.random() * this.width, y: this.random() * this.height * 0.7, size: 3 + Math.round(this.random() * 6), phase: this.random() * Math.PI * 2 });
            }
        }
        if (this.has('fireflies')) {
            entities.fireflies = [];
            var fireflyCount = this.amount(30);
            for (var firefly = 0; firefly < fireflyCount; firefly++) {
                entities.fireflies.push({ x: this.random() * this.width, y: this.height * (0.3 + this.random() * 0.7), phase: this.random() * Math.PI * 2, size: 10 + Math.round(this.random() * 12) });
            }
        }
        if (this.has('sparkles')) {
            entities.sparkles = [];
            var sparkleCount = this.amount(36);
            for (var sparkle = 0; sparkle < sparkleCount; sparkle++) {
                entities.sparkles.push({ x: this.random() * this.width, y: this.random() * this.height, phase: this.random() * Math.PI * 2, size: 5 + Math.round(this.random() * 9), color: this.color(sparkle) });
            }
        }
        if (this.has('rain')) {
            entities.rain = [];
            var rainCount = this.amount(90);
            for (var drop = 0; drop < rainCount; drop++) {
                entities.rain.push({ x: this.random() * this.width, y: this.random() * this.height, length: 8 + this.random() * 12, speed: 380 + this.random() * 240 });
            }
        }
        if (this.has('lights')) {
            entities.lights = [];
            var lightCount = Math.max(8, Math.round(this.width / 46));
            for (var light = 0; light < lightCount; light++) {
                entities.lights.push({ x: (light + 0.5) * (this.width / lightCount), phase: this.random() * Math.PI * 2, color: ['#ff4d6d', '#ffe066', '#06d6a0', '#7bdff2'][light % 4] });
            }
        }
        this.entities = entities;
        this.nextVisitor = performance.now() + 4000 + this.random() * 6000;
        this.visitor = null;
        this.nextFirework = 0;
        this.buildPieces();
    };

    Scene.prototype.buildPieces = function () {
        var registry = global.RWLScenePieces || {};
        var self = this;
        this.pieces = (this.scene.pieces || []).filter(function (name) { return registry[name]; }).map(function (name) {
            var state = {};
            if (registry[name].build) registry[name].build(self, state);
            return { definition: registry[name], state: state };
        });
    };

    Scene.prototype.spriteOf = function (kind, width, height, color, frame) {
        return sprite(kind, width, height, color, frame);
    };

    Scene.prototype.glow = function (x, y, radius, color, alpha) {
        var ctx = this.ctx;
        var previous = ctx.globalAlpha;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(sprite('glow', 64, 64, color), x - radius, y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = previous;
    };

    Scene.prototype.handleClick = function (x, y) {
        var self = this;
        (this.pieces || []).forEach(function (piece) {
            if (piece.definition.click) piece.definition.click(self, piece.state, x, y);
        });
        ['bats', 'ghosts', 'butterflies', 'bees', 'birds', 'hearts', 'gifts', 'leaves', 'petals'].forEach(function (group) {
            (self.entities[group] || []).forEach(function (entity) {
                var radius = Math.max(18, entity.size);
                if (Math.abs(entity.x - x) < radius && Math.abs(entity.y - y) < radius) {
                    self.burst(entity.x, entity.y, self.color(0), 12);
                    entity.x = self.random() < 0.5 ? -60 : self.width + 60;
                    entity.y = self.random() * self.height * 0.6;
                    if (entity.baseY !== undefined) entity.baseY = entity.y;
                }
            });
        });
        (this.entities.pumpkins || []).forEach(function (pumpkin) {
            if (Math.abs(pumpkin.x - x) < pumpkin.size && y > self.height - pumpkin.size * 1.1) {
                pumpkin.hop = 1;
                self.burst(pumpkin.x, self.height - pumpkin.size, '#ffb347', 14);
            }
        });
    };

    Scene.prototype.burst = function (x, y, color, count) {
        if (this.tier === TIER_LOW) count = Math.ceil(count / 2);
        for (var index = 0; index < count; index++) {
            var angle = (index / count) * Math.PI * 2 + this.random();
            var velocity = 40 + this.random() * 130;
            this.effects.push({ x: x, y: y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: 1, color: color, size: 2 + this.random() * 3 });
        }
        if (this.effects.length > 400) this.effects.splice(0, this.effects.length - 400);
    };

    Scene.prototype.updateFalling = function (list, dt, drawAngle) {
        var ctx = this.ctx;
        var wind = (this.scene.wind || 0) * 34;
        var pointer = this.pointer;
        for (var index = 0; index < list.length; index++) {
            var entity = list[index];
            entity.sway += entity.swayRate * dt;
            entity.y += (entity.rise ? -entity.speed : entity.speed) * dt;
            entity.x += (wind + Math.sin(entity.sway) * 22) * dt;
            entity.rotation += entity.spin * dt;
            if (pointer.active) {
                var dx = entity.x - pointer.x;
                var dy = entity.y - pointer.y;
                var distance = dx * dx + dy * dy;
                if (distance < 8100 && distance > 1) {
                    var push = (8100 - distance) / 8100 * 150 * dt;
                    var root = Math.sqrt(distance);
                    entity.x += (dx / root) * push;
                    entity.y += (dy / root) * push;
                }
            }
            if (entity.rise && entity.y < -30) { entity.y = this.height + 20; entity.x = this.random() * this.width; }
            if (!entity.rise && entity.y > this.height + 30) {
                if (entity.kind === 'snow') this.addDrift(entity.x, entity.size);
                entity.y = -24;
                entity.x = this.random() * this.width;
            }
            if (entity.x < -40) entity.x = this.width + 30;
            if (entity.x > this.width + 40) entity.x = -30;
            var image = sprite(entity.kind, entity.size, entity.size, entity.color);
            ctx.globalAlpha = entity.alpha;
            if (drawAngle) {
                ctx.save();
                ctx.translate(entity.x, entity.y);
                ctx.rotate(entity.rotation);
                ctx.drawImage(image, -entity.size / 2, -entity.size / 2);
                ctx.restore();
            } else {
                ctx.drawImage(image, entity.x - entity.size / 2, entity.y - entity.size / 2);
            }
        }
        ctx.globalAlpha = 1;
    };

    Scene.prototype.addDrift = function (x, size) {
        if (!this.has('drifts')) return;
        if (!this.drifts) this.drifts = new Float32Array(Math.ceil(this.width / 16) + 2);
        var slot = Math.max(0, Math.min(this.drifts.length - 1, Math.round(x / 16)));
        var maximum = this.preview ? 8 : 46;
        var amount = size * 0.14;
        this.drifts[slot] = Math.min(maximum, this.drifts[slot] + amount);
        if (slot > 0) this.drifts[slot - 1] = Math.min(maximum, this.drifts[slot - 1] + amount * 0.5);
        if (slot < this.drifts.length - 1) this.drifts[slot + 1] = Math.min(maximum, this.drifts[slot + 1] + amount * 0.5);
    };

    Scene.prototype.drawDrifts = function () {
        if (!this.has('drifts')) return;
        if (!this.drifts) {
            this.drifts = new Float32Array(Math.ceil(this.width / 16) + 2);
            for (var seed = 0; seed < this.drifts.length; seed++) this.drifts[seed] = 5 + Math.sin(seed * 0.4) * 3 + this.random() * 3;
        }
        var ctx = this.ctx;
        var bottom = this.height;
        ctx.fillStyle = 'rgba(240,248,255,0.88)';
        ctx.beginPath();
        ctx.moveTo(0, bottom);
        for (var index = 0; index < this.drifts.length; index++) {
            this.drifts[index] = Math.max(2, this.drifts[index] - 0.004);
            ctx.lineTo(index * 16, bottom - this.drifts[index]);
        }
        ctx.lineTo(this.width, bottom);
        ctx.closePath();
        ctx.fill();
    };

    Scene.prototype.updateFlyers = function (list, dt, time) {
        var ctx = this.ctx;
        var pointer = this.pointer;
        for (var index = 0; index < list.length; index++) {
            var flyer = list[index];
            flyer.x += flyer.vx * dt;
            flyer.y = flyer.baseY + Math.sin(time * 0.0012 + flyer.phase) * flyer.amplitude;
            if (pointer.active) {
                var dx = flyer.x - pointer.x;
                var dy = flyer.y - pointer.y;
                if (dx * dx + dy * dy < 14400) {
                    flyer.baseY += (dy > 0 ? 1 : -1) * 90 * dt;
                    if ((dx > 0 && flyer.vx < 0) || (dx < 0 && flyer.vx > 0)) flyer.vx = -flyer.vx;
                }
            }
            if (flyer.x < -70) { flyer.x = this.width + 60; flyer.baseY = this.random() * this.height * 0.75; }
            if (flyer.x > this.width + 70) { flyer.x = -60; flyer.baseY = this.random() * this.height * 0.75; }
            var frame = Math.sin(time * 0.001 * flyer.flap + flyer.phase) > 0 ? 0 : 1;
            var height = flyer.kind === 'ghost' ? Math.round(flyer.size * 1.2) : (flyer.kind === 'bat' ? Math.round(flyer.size * 0.7) : flyer.size);
            var image = flyer.kind === 'ghost' ? sprite('ghost', flyer.size, height) : sprite(flyer.kind, flyer.size, height, flyer.color, frame);
            ctx.globalAlpha = flyer.kind === 'ghost' ? 0.42 + Math.sin(time * 0.0016 + flyer.phase) * 0.14 : 0.92;
            if (flyer.vx < 0) {
                ctx.drawImage(image, flyer.x - flyer.size / 2, flyer.y - height / 2);
            } else {
                ctx.save();
                ctx.translate(flyer.x, flyer.y);
                ctx.scale(-1, 1);
                ctx.drawImage(image, -flyer.size / 2, -height / 2);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
    };

    Scene.prototype.drawGround = function (time, dt) {
        var ctx = this.ctx;
        var bottom = this.height;
        var self = this;
        (this.entities.trees || []).forEach(function (tree) {
            var width = Math.round(tree.size * 0.72);
            ctx.globalAlpha = 0.62;
            ctx.drawImage(sprite('tree', width, tree.size), tree.x - width / 2, bottom - tree.size);
        });
        (this.entities.pumpkins || []).forEach(function (pumpkin) {
            pumpkin.hop = Math.max(0, (pumpkin.hop || 0) - dt * 1.6);
            var lift = Math.sin((pumpkin.hop || 0) * Math.PI) * 34;
            var glow = 0.75 + Math.sin(time * 0.003 + pumpkin.phase) * 0.15;
            var size = pumpkin.size;
            ctx.globalAlpha = glow * 0.32;
            ctx.drawImage(sprite('glow', 80, 80, '#ff9a3c'), pumpkin.x - size, bottom - size * 1.4 - lift, size * 2, size * 2);
            ctx.globalAlpha = 0.86;
            ctx.drawImage(sprite('pumpkin', size, size, '#ec7a1c'), pumpkin.x - size / 2, bottom - size + 3 - lift);
        });
        (this.entities.mushrooms || []).forEach(function (mushroom) {
            ctx.globalAlpha = 0.95;
            ctx.drawImage(sprite('mushroom', mushroom.size, mushroom.size, '#c2402c'), mushroom.x - mushroom.size / 2, bottom - mushroom.size);
        });
        (this.entities.candles || []).forEach(function (candle) {
            var width = Math.round(candle.size * 0.55);
            var flicker = 0.82 + Math.sin(time * 0.012 + candle.phase) * 0.1 + Math.sin(time * 0.031 + candle.phase * 2) * 0.08;
            var near = self.pointer.active && Math.abs(self.pointer.x - candle.x) < 60 && self.pointer.y > bottom - 120;
            var flameSize = Math.round(candle.size * 0.42 * (near ? 0.55 : flicker));
            ctx.globalAlpha = 0.9;
            ctx.drawImage(sprite('candle', width, candle.size), candle.x - width / 2, bottom - candle.size);
            ctx.globalAlpha = (near ? 0.25 : 0.42) * flicker;
            ctx.drawImage(sprite('glow', 80, 80, '#ffb347'), candle.x - candle.size, bottom - candle.size * 1.65, candle.size * 2, candle.size * 2);
            ctx.globalAlpha = 1;
            ctx.drawImage(sprite('flame', 16, 24), candle.x - flameSize / 2 + (near ? 4 : 0), bottom - candle.size * 0.74 - flameSize, flameSize, flameSize * 1.3);
        });
        ctx.globalAlpha = 1;
    };

    Scene.prototype.drawAmbient = function (time, dt) {
        var ctx = this.ctx;
        var width = this.width;
        var height = this.height;
        var self = this;
        if (this.has('moon')) {
            var moonSize = Math.min(150, width * 0.1);
            var moonX = width - moonSize * 0.6;
            var moonY = moonSize * 0.5;
            ctx.globalAlpha = 0.2;
            ctx.drawImage(sprite('glow', 128, 128, '#ffe9a8'), moonX - moonSize * 1.6, moonY - moonSize * 1.6, moonSize * 3.2, moonSize * 3.2);
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#ffeec2';
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonSize * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (this.has('sun_low') || this.has('sun_rays')) {
            var sunSize = Math.min(420, width * 0.3);
            ctx.globalAlpha = 0.16 + Math.sin(time * 0.0006) * 0.03;
            ctx.drawImage(sprite('glow', 128, 128, this.color(1)), -sunSize * 0.4, -sunSize * 0.4, sunSize * 1.6, sunSize * 1.6);
            ctx.globalAlpha = 1;
        }
        if (this.has('aurora') && this.tier !== TIER_LOW) {
            for (var band = 0; band < 3; band++) {
                var offset = Math.sin(time * 0.00025 + band * 1.7) * width * 0.12;
                var gradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
                gradient.addColorStop(0, rgba(this.color(band), 0));
                gradient.addColorStop(0.5, rgba(this.color(band), 0.09));
                gradient.addColorStop(1, rgba(this.color(band), 0));
                ctx.fillStyle = gradient;
                ctx.fillRect(width * (0.1 + band * 0.26) + offset, 0, width * 0.34, height * 0.5);
            }
        }
        if (this.has('fog') && this.tier !== TIER_LOW) {
            for (var cloud = 0; cloud < 4; cloud++) {
                var fogX = ((time * 0.012 * (cloud + 1) + cloud * 300) % (width + 500)) - 250;
                ctx.globalAlpha = 0.09;
                ctx.drawImage(sprite('glow', 128, 128, '#c7d0e0'), fogX - 280, height - 240 - cloud * 26, 560, 260);
            }
            ctx.globalAlpha = 1;
        }
        (this.entities.stars || []).forEach(function (star) {
            ctx.globalAlpha = 0.25 + (Math.sin(time * 0.002 + star.phase) + 1) * 0.3;
            ctx.drawImage(sprite('star', 16, 16), star.x, star.y, star.size, star.size);
        });
        (this.entities.fireflies || []).forEach(function (firefly) {
            firefly.x += Math.sin(time * 0.0007 + firefly.phase) * 14 * dt;
            firefly.y += Math.cos(time * 0.0009 + firefly.phase) * 11 * dt;
            ctx.globalAlpha = Math.max(0, Math.sin(time * 0.0024 + firefly.phase)) * 0.9;
            ctx.drawImage(sprite('glow', 32, 32, '#e5ff7a'), firefly.x, firefly.y, firefly.size, firefly.size);
        });
        (this.entities.sparkles || []).forEach(function (sparkle) {
            ctx.globalAlpha = Math.max(0, Math.sin(time * 0.003 + sparkle.phase));
            ctx.drawImage(sprite('glow', 24, 24, sparkle.color), sparkle.x, sparkle.y, sparkle.size, sparkle.size);
        });
        ctx.globalAlpha = 1;
        if (this.entities.rain) {
            ctx.strokeStyle = 'rgba(190,210,235,0.32)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.entities.rain.forEach(function (drop) {
                drop.y += drop.speed * dt;
                drop.x += (self.scene.wind || 0) * 90 * dt;
                if (drop.y > height) { drop.y = -20; drop.x = self.random() * width; }
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x + (self.scene.wind || 0) * 4, drop.y + drop.length);
            });
            ctx.stroke();
        }
        if (this.has('wind') && this.tier !== TIER_LOW) {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var streak = 0; streak < 5; streak++) {
                var streakY = height * (0.2 + streak * 0.15);
                var streakX = (time * 0.2 * (streak + 2)) % (width + 400) - 200;
                ctx.moveTo(streakX, streakY);
                ctx.quadraticCurveTo(streakX + 120, streakY - 16, streakX + 240, streakY);
            }
            ctx.stroke();
        }
        if (this.has('waves')) {
            for (var wave = 0; wave < 2; wave++) {
                ctx.fillStyle = rgba(this.color(wave), 0.16);
                ctx.beginPath();
                ctx.moveTo(0, height);
                for (var position = 0; position <= width; position += 32) {
                    ctx.lineTo(position, height - 22 - wave * 12 + Math.sin(position * 0.012 + time * 0.0012 + wave * 2) * 8);
                }
                ctx.lineTo(width, height);
                ctx.closePath();
                ctx.fill();
            }
        }
        if (this.has('webs')) {
            ctx.strokeStyle = 'rgba(235,235,245,0.2)';
            ctx.lineWidth = 1;
            [[0, 0, 1, 1], [width, 0, -1, 1]].forEach(function (corner) {
                var reach = Math.min(190, width * 0.13);
                ctx.beginPath();
                for (var spoke = 0; spoke <= 4; spoke++) {
                    var angle = (spoke / 4) * (Math.PI / 2);
                    ctx.moveTo(corner[0], corner[1]);
                    ctx.lineTo(corner[0] + Math.cos(angle) * reach * corner[2], corner[1] + Math.sin(angle) * reach * corner[3]);
                }
                for (var ring = 1; ring <= 3; ring++) {
                    for (var arc = 0; arc < 4; arc++) {
                        var first = (arc / 4) * (Math.PI / 2);
                        var second = ((arc + 1) / 4) * (Math.PI / 2);
                        var radius = reach * ring / 3.2;
                        ctx.moveTo(corner[0] + Math.cos(first) * radius * corner[2], corner[1] + Math.sin(first) * radius * corner[3]);
                        ctx.quadraticCurveTo(corner[0] + Math.cos((first + second) / 2) * radius * 0.85 * corner[2], corner[1] + Math.sin((first + second) / 2) * radius * 0.85 * corner[3], corner[0] + Math.cos(second) * radius * corner[2], corner[1] + Math.sin(second) * radius * corner[3]);
                    }
                }
                ctx.stroke();
            });
        }
        (this.entities.spiders || []).forEach(function (spider) {
            var drop = spider.length + Math.sin(time * 0.0009 + spider.phase) * 34;
            if (self.pointer.active && Math.abs(self.pointer.x - spider.x) < 54) spider.length = Math.max(30, spider.length - 80 * dt);
            else spider.length = Math.min(spider.length + 8 * dt, 280);
            ctx.strokeStyle = 'rgba(235,235,245,0.26)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(spider.x, 0);
            ctx.lineTo(spider.x, drop);
            ctx.stroke();
            ctx.drawImage(sprite('spider', spider.size, spider.size), spider.x - spider.size / 2, drop - 2);
        });
        (this.entities.lights || []).forEach(function (light, index) {
            var sag = Math.sin((index % 6) / 5 * Math.PI) * 14 + 6;
            var pulse = 0.5 + (Math.sin(time * 0.003 + light.phase) + 1) * 0.25;
            ctx.globalAlpha = pulse;
            ctx.drawImage(sprite('glow', 24, 24, light.color), light.x - 9, sag - 9, 18, 18);
        });
        ctx.globalAlpha = 1;
    };

    Scene.prototype.updateVisitor = function (time, dt) {
        var hasSanta = this.has('santa');
        var hasWitch = this.has('witches');
        if (!hasSanta && !hasWitch) return;
        var ctx = this.ctx;
        if (!this.visitor && time > this.nextVisitor) {
            var size = Math.min(hasSanta ? 340 : 110, this.width * (hasSanta ? 0.32 : 0.12));
            this.visitor = { x: -size - 20, y: 40 + this.random() * this.height * (this.preview ? 0.2 : 0.18), size: size, speed: Math.max(110, this.width * 0.13), bob: this.random() * 6, dropAt: 0 };
        }
        var visitor = this.visitor;
        if (!visitor) return;
        visitor.x += visitor.speed * dt;
        var yOffset = Math.sin(time * 0.002 + visitor.bob) * 9;
        var height = Math.round(visitor.size * 0.42);
        ctx.drawImage(sprite(hasSanta ? 'santa' : 'witch', Math.round(visitor.size), hasSanta ? height : Math.round(visitor.size * 0.72)), visitor.x, visitor.y + yOffset);
        if (hasSanta && time > visitor.dropAt && this.tier !== TIER_LOW) {
            visitor.dropAt = time + 900;
            var list = this.entities.droppedGifts || (this.entities.droppedGifts = []);
            if (list.length < 12) {
                list.push({ kind: 'gift', x: visitor.x + visitor.size * 0.16, y: visitor.y + height, size: 16 + Math.round(this.random() * 8), speed: 110, sway: 0, swayRate: 1, rotation: 0, spin: this.random() - 0.5, color: ['#d7263d', '#1a936f', '#3a86ff', '#ffd166'][list.length % 4], alpha: 0.95, once: true });
            }
        }
        if (visitor.x > this.width + 40) {
            this.visitor = null;
            this.nextVisitor = time + (this.preview ? 2500 : 35000 + this.random() * 50000);
        }
    };

    Scene.prototype.updateDroppedGifts = function (dt) {
        var list = this.entities.droppedGifts;
        if (!list || !list.length) return;
        var ctx = this.ctx;
        for (var index = list.length - 1; index >= 0; index--) {
            var gift = list[index];
            gift.y += gift.speed * dt;
            gift.rotation += gift.spin * dt;
            ctx.save();
            ctx.translate(gift.x, gift.y);
            ctx.rotate(gift.rotation);
            ctx.drawImage(sprite('gift', gift.size, gift.size, gift.color), -gift.size / 2, -gift.size / 2);
            ctx.restore();
            if (gift.y > this.height + 20) {
                this.burst(gift.x, this.height - 6, '#ffd166', 8);
                list.splice(index, 1);
            }
        }
    };

    Scene.prototype.updateFireworks = function (time) {
        if (!this.has('fireworks') || time < this.nextFirework) return;
        var interval = this.tier === TIER_LOW ? 2600 : 1200;
        this.nextFirework = time + interval + this.random() * 900;
        this.burst(this.width * (0.1 + this.random() * 0.8), this.height * (0.1 + this.random() * 0.4), this.color(Math.floor(this.random() * 3)), this.tier === TIER_HIGH ? 42 : 22);
    };

    Scene.prototype.updateEffects = function (dt) {
        var ctx = this.ctx;
        for (var index = this.effects.length - 1; index >= 0; index--) {
            var effect = this.effects[index];
            effect.life -= dt * 0.85;
            if (effect.life <= 0) {
                this.effects.splice(index, 1);
                continue;
            }
            effect.x += effect.vx * dt;
            effect.y += effect.vy * dt;
            effect.vy += 90 * dt;
            ctx.globalAlpha = effect.life;
            ctx.fillStyle = effect.color;
            ctx.fillRect(effect.x, effect.y, effect.size, effect.size);
        }
        ctx.globalAlpha = 1;
    };

    Scene.prototype.adapt = function (duration) {
        if (this.preview) return;
        this.frameTimes.push(duration);
        if (this.frameTimes.length < MEASURE_FRAMES) return;
        var total = 0;
        for (var index = 0; index < this.frameTimes.length; index++) total += this.frameTimes[index];
        var average = total / this.frameTimes.length;
        this.frameTimes = [];
        if (average > FRAME_BUDGET_MS && this.tier > TIER_LOW) {
            this.tier -= 1;
            this.build();
        } else if (average > FRAME_BUDGET_MS * 1.6 && this.tier === TIER_LOW) {
            this.frameSkip = Math.min(3, this.frameSkip + 1);
        }
    };

    Scene.prototype.frame = function (now) {
        if (!this.running) return;
        var self = this;
        this.raf = global.requestAnimationFrame(function (next) { self.frame(next); });
        this.frameIndex = (this.frameIndex || 0) + 1;
        if (this.frameSkip && this.frameIndex % (this.frameSkip + 1) !== 0) return;
        var raw = this.lastFrame ? (now - this.lastFrame) / 1000 : 0.016;
        this.lastFrame = now;
        var dt = Math.min(0.1, raw) * (this.speed || 1);
        var time = now * (this.speed || 1);
        var started = performance.now();
        var ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        this.drawAmbient(time, dt);
        for (var pieceIndex = 0; pieceIndex < (this.pieces || []).length; pieceIndex++) {
            var piece = this.pieces[pieceIndex];
            if (piece.definition.draw) piece.definition.draw(this, piece.state, ctx, time, dt);
        }
        var entities = this.entities;
        if (entities.snow) this.updateFalling(entities.snow, dt, false);
        if (entities.crystals) this.updateFalling(entities.crystals, dt, true);
        if (entities.leaves) this.updateFalling(entities.leaves, dt, true);
        if (entities.acorns) this.updateFalling(entities.acorns, dt, true);
        if (entities.petals) this.updateFalling(entities.petals, dt, true);
        if (entities.confetti) this.updateFalling(entities.confetti, dt, true);
        if (entities.hearts) this.updateFalling(entities.hearts, dt, false);
        if (entities.bubbles) this.updateFalling(entities.bubbles, dt, false);
        if (entities.gifts) this.updateFalling(entities.gifts, dt, true);
        ['bats', 'butterflies', 'bees', 'birds', 'ghosts'].forEach(function (group) {
            if (entities[group]) self.updateFlyers(entities[group], dt, time);
        });
        this.updateVisitor(now, dt);
        this.updateDroppedGifts(dt);
        this.drawGround(time, dt);
        this.drawDrifts();
        this.updateFireworks(now);
        this.updateEffects(dt);
        this.adapt(performance.now() - started + Math.max(0, raw * 1000 - 34));
    };

    Scene.prototype.start = function () {
        if (this.running || reducedMotion() || (this.preview && !this.host.isConnected)) return;
        this.running = true;
        this.lastFrame = 0;
        var self = this;
        this.raf = global.requestAnimationFrame(function (now) { self.frame(now); });
    };

    Scene.prototype.stop = function () {
        this.running = false;
        if (this.raf) global.cancelAnimationFrame(this.raf);
    };

    Scene.prototype.destroy = function () {
        this.stop();
        global.removeEventListener('resize', this.onResize);
        global.removeEventListener('pointermove', this.onPointerMove);
        global.removeEventListener('pointerdown', this.onPointerDown);
        document.removeEventListener('visibilitychange', this.onVisibility);
        if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    };

    function canRun(scene) {
        return !!(scene && scene.season && SEASON_DEFAULTS[scene.season]);
    }

    var active = null;
    var activeKey = '';

    global.RWLScenes = {
        set: function (scene, speed) {
            var key = scene ? scene.season + ':' + scene.year : '';
            if (active && key === activeKey) {
                active.speed = speed || 1;
                return;
            }
            if (active) active.destroy();
            active = null;
            activeKey = '';
            if (!canRun(scene) || global.RWL_REDUCED_EFFECTS || !document.body) return;
            active = new Scene(document.body, { scene: scene, speed: speed || 1 });
            activeKey = key;
            active.start();
        },
        clear: function () {
            if (active) active.destroy();
            active = null;
            activeKey = '';
        },
        mount: function (host, scene, speed) {
            if (!canRun(scene)) return null;
            var instance = new Scene(host, { scene: scene, speed: speed || 1, preview: true });
            instance.start();
            return instance;
        }
    };
})(window);
