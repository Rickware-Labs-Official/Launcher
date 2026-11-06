(function (global) {
    var pieces = {};

    function strip(scene) {
        return Math.min(230, scene.height * 0.28);
    }

    function near(scene, x, y, radius) {
        var pointer = scene.pointer;
        if (!pointer.active) return false;
        var dx = pointer.x - x;
        var dy = pointer.y - y;
        return dx * dx + dy * dy < radius * radius;
    }

    function layer(state, scene, draw) {
        if (state.layer && state.layerWidth === scene.width && state.layerHeight === scene.height) return state.layer;
        var canvas = document.createElement('canvas');
        canvas.width = scene.width;
        canvas.height = scene.height;
        draw(canvas.getContext('2d'), scene.width, scene.height);
        state.layer = canvas;
        state.layerWidth = scene.width;
        state.layerHeight = scene.height;
        return canvas;
    }

    function polygon(ctx, points) {
        ctx.beginPath();
        points.forEach(function (point, index) {
            if (index === 0) ctx.moveTo(point[0], point[1]);
            else ctx.lineTo(point[0], point[1]);
        });
        ctx.closePath();
        ctx.fill();
    }

    function heartPath(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.bezierCurveTo(x - size * 0.9, y - size * 0.4, x - size * 0.4, y - size, x, y - size * 0.4);
        ctx.bezierCurveTo(x + size * 0.4, y - size, x + size * 0.9, y - size * 0.4, x, y + size * 0.3);
        ctx.closePath();
    }

    function tree(ctx, x, base, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x - height * 0.03, base - height * 0.4, height * 0.06, height * 0.4);
        for (var level = 0; level < 3; level++) {
            var top = base - height + level * height * 0.2;
            var bottom = top + height * 0.45;
            var half = height * (0.14 + level * 0.07);
            polygon(ctx, [[x, top], [x + half, bottom], [x - half, bottom]]);
        }
    }

    function rings(state, x, y, color) {
        state.rings = state.rings || [];
        state.rings.push({ x: x, y: y, radius: 4, life: 1, color: color });
        if (state.rings.length > 12) state.rings.shift();
    }

    function drawRings(ctx, state, dt, speed, flat) {
        (state.rings || []).forEach(function (ring) {
            ring.radius += (speed || 90) * dt;
            ring.life -= dt * 0.8;
        });
        state.rings = (state.rings || []).filter(function (ring) { return ring.life > 0; });
        state.rings.forEach(function (ring) {
            ctx.globalAlpha = ring.life * 0.7;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(ring.x, ring.y, ring.radius, ring.radius * (flat ? 0.28 : 1), 0, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }

    function shootingStars(scene, state, ctx, time, dt) {
        if (!state.nextStar || time > state.nextStar) {
            state.nextStar = time + 3500 + scene.random() * 6000;
            state.star = { x: scene.width * (0.2 + scene.random() * 0.7), y: scene.height * 0.08, life: 1 };
        }
        if (!state.star) return;
        state.star.life -= dt * 1.1;
        if (state.star.life <= 0) {
            state.star = null;
            return;
        }
        state.star.x -= 420 * dt;
        state.star.y += 190 * dt;
        ctx.globalAlpha = state.star.life;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(state.star.x, state.star.y);
        ctx.lineTo(state.star.x + 90, state.star.y - 40);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    pieces.shooting_stars = { draw: function (scene, state, ctx, time, dt) { shootingStars(scene, state, ctx, time, dt); } };

    pieces.jack_lanterns = {
        build: function (scene, state) {
            state.items = [0.08, 0.2, 0.86, 0.95].map(function (ratio) { return { ratio: ratio, lit: 0, size: 34 + scene.random() * 22 }; });
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            state.items.forEach(function (item) {
                var x = item.ratio * scene.width;
                item.lit += ((near(scene, x, base - item.size, 170) ? 1 : 0.12) - item.lit) * dt * 3;
                ctx.globalAlpha = 0.82;
                ctx.fillStyle = '#c85f12';
                ctx.beginPath();
                ctx.ellipse(x, base - item.size * 0.5, item.size * 0.62, item.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#3f5f1e';
                ctx.fillRect(x - 3, base - item.size - 5, 6, 10);
                ctx.globalAlpha = 0.3 + item.lit * 0.7;
                ctx.fillStyle = '#ffe28a';
                polygon(ctx, [[x - item.size * 0.3, base - item.size * 0.62], [x - item.size * 0.12, base - item.size * 0.62], [x - item.size * 0.2, base - item.size * 0.8]]);
                polygon(ctx, [[x + item.size * 0.3, base - item.size * 0.62], [x + item.size * 0.12, base - item.size * 0.62], [x + item.size * 0.2, base - item.size * 0.8]]);
                ctx.fillRect(x - item.size * 0.3, base - item.size * 0.38, item.size * 0.6, item.size * 0.1);
                scene.glow(x, base - item.size * 0.5, item.size * 1.5, '#ff9a3c', item.lit * 0.34);
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.items.forEach(function (item) {
                if (Math.abs(item.ratio * scene.width - x) < item.size && y > scene.height - item.size * 1.3) scene.burst(x, y, '#ffb347', 18);
            });
        }
    };

    pieces.haunted_house = {
        build: function (scene, state) { state.ghosts = []; state.windows = []; },
        draw: function (scene, state, ctx, time, dt) {
            var size = strip(scene) * 1.05;
            var x = scene.width - size * 1.25;
            var base = scene.height;
            var image = layer(state, scene, function (target, width, height) {
                target.fillStyle = '#0b0912';
                target.fillRect(x, height - size * 0.62, size, size * 0.62);
                target.fillRect(x + size * 0.2, height - size * 0.86, size * 0.2, size * 0.3);
                polygon(target, [[x - size * 0.06, height - size * 0.62], [x + size * 0.5, height - size * 1.02], [x + size * 1.06, height - size * 0.62]]);
                polygon(target, [[x + size * 0.14, height - size * 0.86], [x + size * 0.3, height - size * 1.16], [x + size * 0.46, height - size * 0.86]]);
            });
            ctx.globalAlpha = 0.78;
            ctx.drawImage(image, 0, 0);
            var close = near(scene, x + size / 2, base - size / 2, size * 1.4);
            for (var row = 0; row < 2; row++) {
                for (var column = 0; column < 4; column++) {
                    var wx = x + size * (0.12 + column * 0.22);
                    var wy = base - size * (0.5 - row * 0.24);
                    var pulse = Math.sin(time * 0.002 + column * 2 + row) > 0.55 ? 1 : 0.15;
                    ctx.globalAlpha = close ? 0.95 : pulse * 0.55;
                    ctx.fillStyle = '#ffcf6b';
                    ctx.fillRect(wx, wy, size * 0.1, size * 0.13);
                }
            }
            state.ghosts = state.ghosts.filter(function (ghost) { return ghost.life > 0; });
            state.ghosts.forEach(function (ghost) {
                ghost.life -= dt * 0.35;
                ghost.y -= 46 * dt;
                ghost.x += Math.sin(time * 0.004 + ghost.phase) * 26 * dt;
                ctx.globalAlpha = Math.min(0.75, ghost.life);
                ctx.drawImage(scene.spriteOf('ghost', 44, 52), ghost.x - 22, ghost.y - 26);
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) {
            var size = strip(scene) * 1.05;
            state.ghosts.push({ x: Math.max(scene.width - size * 1.25, Math.min(scene.width - size * 0.25, x)), y: scene.height - size * 0.5, life: 1, phase: scene.random() * 6 });
        }
    };

    pieces.graveyard = {
        build: function (scene, state) {
            state.stones = [];
            var count = Math.max(5, Math.round(scene.width / 220));
            for (var index = 0; index < count; index++) state.stones.push({ x: (index + 0.5) * scene.width / count, height: 42 + scene.random() * 38, hand: 0, phase: scene.random() * 6 });
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            state.stones.forEach(function (stone) {
                var glow = near(scene, stone.x, base - 40, 110);
                stone.hand = Math.max(0, stone.hand - dt * 0.42);
                if (stone.hand > 0) {
                    var rise = Math.sin(Math.min(1, stone.hand) * Math.PI) * 44;
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = '#6f8a5d';
                    ctx.fillRect(stone.x + 22, base - rise, 8, rise);
                    for (var finger = 0; finger < 4; finger++) ctx.fillRect(stone.x + 20 + finger * 3.6, base - rise - 9, 2.4, 10);
                }
                ctx.globalAlpha = 0.82;
                ctx.fillStyle = '#1b1a24';
                ctx.beginPath();
                ctx.moveTo(stone.x - 18, base);
                ctx.lineTo(stone.x - 18, base - stone.height + 16);
                ctx.quadraticCurveTo(stone.x, base - stone.height - 12, stone.x + 18, base - stone.height + 16);
                ctx.lineTo(stone.x + 18, base);
                ctx.fill();
                ctx.globalAlpha = glow ? 0.95 : 0.3;
                ctx.fillStyle = glow ? '#9dff8a' : '#6a6a78';
                ctx.fillRect(stone.x - 2, base - stone.height + 8, 4, 22);
                ctx.fillRect(stone.x - 8, base - stone.height + 14, 16, 4);
                if (glow) scene.glow(stone.x, base - stone.height + 16, 54, '#7dff6a', 0.3);
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) {
            state.stones.forEach(function (stone) {
                if (Math.abs(stone.x - x) < 90) stone.hand = 1;
            });
        }
    };

    pieces.witch_cauldron = {
        build: function (scene, state) { state.bubbles = []; state.next = 0; },
        draw: function (scene, state, ctx, time, dt) {
            var x = scene.width * 0.83;
            var base = scene.height;
            var close = near(scene, x, base - 60, 220);
            if (time > state.next && state.bubbles.length < 26) {
                state.next = time + (close ? 70 : 220);
                state.bubbles.push({ x: x + (scene.random() - 0.5) * 70, y: base - 88, size: 3 + scene.random() * 7, life: 1 });
            }
            scene.glow(x, base - 12, 110, '#ff7a1a', 0.3 + Math.sin(time * 0.02) * 0.06);
            ctx.globalAlpha = 0.88;
            ctx.fillStyle = '#ff8f1f';
            for (var flame = 0; flame < 5; flame++) {
                var fx = x - 40 + flame * 20;
                polygon(ctx, [[fx - 10, base], [fx + 10, base], [fx, base - 20 - Math.sin(time * 0.02 + flame) * 7]]);
            }
            ctx.fillStyle = '#121019';
            ctx.beginPath();
            ctx.ellipse(x, base - 52, 62, 42, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x - 54, base - 88, 108, 10);
            ctx.fillStyle = '#58ff7a';
            ctx.beginPath();
            ctx.ellipse(x, base - 84, 48, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            state.bubbles = state.bubbles.filter(function (bubble) { return bubble.life > 0; });
            state.bubbles.forEach(function (bubble) {
                bubble.life -= dt * 0.7;
                bubble.y -= 70 * dt;
                bubble.x += Math.sin(time * 0.006 + bubble.size) * 12 * dt;
                ctx.globalAlpha = bubble.life * 0.8;
                ctx.strokeStyle = '#8dff9f';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            if (near(scene, scene.width * 0.83, scene.height - 60, 170) || Math.abs(x - scene.width * 0.83) < 110) scene.burst(scene.width * 0.83, scene.height - 90, '#58ff7a', 34);
            else scene.burst(x, y, '#a855f7', 10);
        }
    };

    pieces.blood_ritual = {
        build: function (scene, state) {
            state.x = scene.width / 2;
            state.y = scene.height / 2;
            state.flash = 0;
            state.crows = [];
            for (var index = 0; index < 8; index++) state.crows.push({ x: scene.random() * scene.width, y: 40 + scene.random() * scene.height * 0.3, vx: 26 + scene.random() * 30, phase: scene.random() * 6 });
        },
        draw: function (scene, state, ctx, time, dt) {
            var moon = Math.min(170, scene.width * 0.11);
            var mx = scene.width - moon * 1.3;
            scene.glow(mx, moon * 1.2, moon * 2.6, '#ff1f3d', 0.3);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#b5122b';
            ctx.beginPath();
            ctx.arc(mx, moon * 1.2, moon * 0.72, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#5d0716';
            for (var spot = 0; spot < 4; spot++) {
                ctx.beginPath();
                ctx.arc(mx - moon * 0.3 + spot * moon * 0.22, moon * (0.9 + (spot % 2) * 0.5), moon * 0.11, 0, Math.PI * 2);
                ctx.fill();
            }
            if (scene.pointer.active) {
                state.x += (scene.pointer.x - state.x) * dt * 3;
                state.y += (scene.pointer.y - state.y) * dt * 3;
                ctx.save();
                ctx.translate(state.x, state.y);
                ctx.rotate(time * 0.0007);
                ctx.globalAlpha = 0.34;
                ctx.strokeStyle = '#ff4d6d';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, 58, 0, Math.PI * 2);
                ctx.moveTo(44, 0);
                ctx.arc(0, 0, 44, 0, Math.PI * 2);
                for (var point = 0; point < 5; point++) {
                    var from = (point * 2 / 5) * Math.PI * 2;
                    var to = ((point + 1) * 2 / 5) * Math.PI * 2;
                    ctx.moveTo(Math.cos(from) * 44, Math.sin(from) * 44);
                    ctx.lineTo(Math.cos(to) * 44, Math.sin(to) * 44);
                }
                ctx.stroke();
                ctx.restore();
            }
            ctx.fillStyle = '#0a0a10';
            ctx.globalAlpha = 0.85;
            state.crows.forEach(function (crow) {
                crow.x += crow.vx * (1 + state.flash * 6) * dt;
                if (crow.x > scene.width + 30) crow.x = -30;
                var flap = Math.sin(time * 0.012 + crow.phase) * 9;
                polygon(ctx, [[crow.x - 14, crow.y - flap], [crow.x, crow.y], [crow.x + 14, crow.y - flap], [crow.x, crow.y + 4]]);
            });
            state.flash = Math.max(0, state.flash - dt * 1.6);
            if (state.flash > 0) {
                ctx.globalAlpha = state.flash * 0.3;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, scene.width, scene.height);
            }
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.flash = 1;
            scene.burst(x, y, '#ff1f3d', 30);
        }
    };

    pieces.snowman = {
        build: function (scene, state) { state.wave = 0; state.hat = 0; state.balls = []; },
        draw: function (scene, state, ctx, time, dt) {
            var x = scene.width * 0.9;
            var base = scene.height;
            var close = near(scene, x, base - 90, 190);
            state.wave += ((close ? 1 : 0) - state.wave) * dt * 4;
            state.hat = Math.max(0, state.hat - dt * 1.3);
            ctx.globalAlpha = 0.94;
            ctx.fillStyle = '#f2f8ff';
            [[0, 34, 38], [-54, 26, 26], [-94, 18, 18]].forEach(function (ball) {
                ctx.beginPath();
                ctx.arc(x, base + ball[0] - 22, ball[1], 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = '#ef6c1a';
            polygon(ctx, [[x + 4, base - 116], [x + 26, base - 112], [x + 4, base - 108]]);
            ctx.fillStyle = '#17161f';
            ctx.beginPath();
            ctx.arc(x - 6, base - 120, 2.4, 0, Math.PI * 2);
            ctx.arc(x + 6, base - 120, 2.4, 0, Math.PI * 2);
            ctx.fill();
            var lift = Math.sin(state.hat * Math.PI) * 48;
            ctx.fillRect(x - 15, base - 150 - lift, 30, 20);
            ctx.fillRect(x - 22, base - 132 - lift, 44, 4);
            ctx.strokeStyle = '#5a3a22';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 24, base - 80);
            ctx.lineTo(x - 54, base - 84 - state.wave * (22 + Math.sin(time * 0.012) * 12));
            ctx.moveTo(x + 24, base - 80);
            ctx.lineTo(x + 50, base - 94);
            ctx.stroke();
            state.balls = state.balls.filter(function (ball) { return ball.life > 0; });
            state.balls.forEach(function (ball) {
                ball.life -= dt;
                ball.vy += 340 * dt;
                ball.x += ball.vx * dt;
                ball.y += ball.vy * dt;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            var sx = scene.width * 0.9;
            state.hat = 1;
            state.balls.push({ x: sx - 50, y: scene.height - 100, vx: (x - sx) * 1.1, vy: (y - scene.height) * 0.9 - 120, life: 1.6 });
        }
    };

    pieces.ice_palace = {
        build: function (scene, state) {
            state.spires = [];
            var count = 11;
            for (var index = 0; index < count; index++) state.spires.push({ offset: index / count, height: 60 + Math.abs(Math.sin(index * 1.7)) * 130, width: 18 + (index % 3) * 8, phase: scene.random() * 6 });
        },
        draw: function (scene, state, ctx, time, dt) {
            var origin = scene.width * 0.68;
            var range = scene.width * 0.3;
            state.spires.forEach(function (spire) {
                var x = origin + spire.offset * range;
                var base = scene.height;
                var close = scene.pointer.active ? Math.max(0, 1 - Math.abs(scene.pointer.x - x) / 200) : 0;
                var gradient = ctx.createLinearGradient(x - spire.width, 0, x + spire.width, 0);
                gradient.addColorStop(0, 'rgba(120,200,255,0.55)');
                gradient.addColorStop(0.5, 'rgba(235,250,255,' + (0.5 + close * 0.45) + ')');
                gradient.addColorStop(1, 'rgba(80,140,230,0.55)');
                ctx.fillStyle = gradient;
                ctx.globalAlpha = 0.72;
                polygon(ctx, [[x - spire.width, base], [x, base - spire.height], [x + spire.width, base]]);
                var glint = Math.max(0, Math.sin(time * 0.002 + spire.phase));
                scene.glow(x, base - spire.height + 6, 22 + close * 34, '#e8fbff', glint * 0.34 + close * 0.45);
            });
            drawRings(ctx, state, dt, 170);
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            rings(state, x, y, '#c9f3ff');
            rings(state, x, y, '#ffffff');
            scene.burst(x, y, '#c9f3ff', 14);
        }
    };

    pieces.aurora_range = {
        draw: function (scene, state, ctx, time, dt) {
            var width = scene.width;
            var base = scene.height;
            var parallax = scene.pointer.active ? (scene.pointer.x / width - 0.5) : 0;
            state.shift = (state.shift || 0) + (parallax - (state.shift || 0)) * dt * 2;
            if (scene.tier > 0) {
                for (var band = 0; band < 3; band++) {
                    ctx.beginPath();
                    for (var x = 0; x <= width; x += 40) {
                        var y = scene.height * (0.1 + band * 0.05) + Math.sin(x * 0.006 + time * 0.0006 + band) * 26 + Math.sin(x * 0.015 - time * 0.0009) * 10;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = ['rgba(90,255,190,0.22)', 'rgba(120,160,255,0.2)', 'rgba(200,110,255,0.18)'][band];
                    ctx.lineWidth = 24 - band * 5;
                    ctx.stroke();
                }
            }
            [[0.5, 0.2, '#31486f', 26], [0.72, 0.15, '#20324f', 44], [1, 0.11, '#111d33', 70]].forEach(function (range, layerIndex) {
                ctx.globalAlpha = 0.72;
                ctx.fillStyle = range[2];
                ctx.beginPath();
                ctx.moveTo(0, base);
                for (var peak = -1; peak <= 12; peak++) {
                    var px = (peak / 11) * width + state.shift * range[3];
                    ctx.lineTo(px, base - strip(scene) * range[0] * (0.5 + Math.abs(Math.sin(peak * (layerIndex + 1.3))) * 0.5));
                }
                ctx.lineTo(width, base);
                ctx.fill();
            });
            shootingStars(scene, state, ctx, time, dt);
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.star = { x: x + 120, y: y - 60, life: 1 };
        }
    };

    pieces.frozen_lake = {
        build: function (scene, state) { state.cracks = []; state.trail = []; },
        draw: function (scene, state, ctx, time, dt) {
            var top = scene.height - strip(scene) * 0.5;
            var gradient = ctx.createLinearGradient(0, top, 0, scene.height);
            gradient.addColorStop(0, 'rgba(150,215,255,0.1)');
            gradient.addColorStop(1, 'rgba(210,240,255,0.42)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, top, scene.width, scene.height - top);
            var angle = time * 0.00045;
            var x = scene.width * 0.5 + Math.cos(angle) * scene.width * 0.38;
            var y = top + (scene.height - top) * 0.55 + Math.sin(angle * 2) * (scene.height - top) * 0.25;
            state.trail.push([x, y]);
            if (state.trail.length > 70) state.trail.shift();
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            state.trail.forEach(function (point, index) {
                if (index === 0) ctx.moveTo(point[0], point[1]);
                else ctx.lineTo(point[0], point[1]);
            });
            ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#16162a';
            ctx.fillRect(x - 3, y - 26, 6, 18);
            ctx.beginPath();
            ctx.arc(x, y - 31, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#16162a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x - 7, y);
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x + 8, y - 1);
            ctx.moveTo(x, y - 22);
            ctx.lineTo(x - 13 * Math.cos(angle), y - 15);
            ctx.stroke();
            state.cracks = state.cracks.filter(function (crack) { return crack.life > 0; });
            state.cracks.forEach(function (crack) {
                crack.life -= dt * 0.22;
                ctx.globalAlpha = Math.min(0.9, crack.life);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                crack.lines.forEach(function (line) {
                    ctx.moveTo(crack.x, crack.y);
                    ctx.lineTo(crack.x + line[0], crack.y + line[1] * 0.35);
                    ctx.lineTo(crack.x + line[2], crack.y + line[3] * 0.35);
                });
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            var lines = [];
            for (var index = 0; index < 8; index++) {
                var angle = (index / 8) * Math.PI * 2 + scene.random();
                var first = 30 + scene.random() * 40;
                var second = first + 20 + scene.random() * 60;
                lines.push([Math.cos(angle) * first, Math.sin(angle) * first, Math.cos(angle + 0.3) * second, Math.sin(angle + 0.3) * second]);
            }
            state.cracks.push({ x: x, y: Math.max(y, scene.height - strip(scene) * 0.45), life: 1, lines: lines });
            if (state.cracks.length > 6) state.cracks.shift();
        }
    };

    pieces.wolf_cliff = {
        build: function (scene, state) {
            state.flakes = [];
            var count = scene.tier > 0 ? 70 : 28;
            for (var index = 0; index < count; index++) state.flakes.push({ x: scene.random() * scene.width, y: scene.random() * scene.height, speed: 120 + scene.random() * 240 });
            state.howl = 0;
            state.gust = 0;
        },
        draw: function (scene, state, ctx, time, dt) {
            var size = strip(scene);
            var base = scene.height;
            var x = size * 0.18;
            var moonX = size * 0.95;
            scene.glow(moonX, base - size * 1.4, size * 0.9, '#d6e8ff', 0.26);
            ctx.globalAlpha = 0.86;
            ctx.fillStyle = '#0a1020';
            polygon(ctx, [[0, base], [0, base - size * 0.6], [size * 0.44, base - size * 0.66], [size * 0.9, base - size * 0.34], [size * 1.5, base]]);
            state.howl = Math.max(0, state.howl - dt * 0.4);
            var head = Math.sin(Math.min(1, state.howl + (near(scene, x + size * 0.3, base - size * 0.8, 170) ? 0.6 : 0)) * Math.PI / 2);
            var wx = x + size * 0.1;
            var wy = base - size * 0.66;
            ctx.fillStyle = '#04060e';
            polygon(ctx, [[wx - 26, wy], [wx - 30, wy - 18], [wx - 6, wy - 28], [wx + 22, wy - 28], [wx + 26, wy]]);
            ctx.save();
            ctx.translate(wx + 20, wy - 26);
            ctx.rotate(-0.25 - head * 0.85);
            polygon(ctx, [[-4, 6], [26, -2], [34, 3], [10, 12], [-2, 14]]);
            polygon(ctx, [[2, -2], [8, -13], [12, -2]]);
            ctx.restore();
            polygon(ctx, [[wx - 30, wy - 18], [wx - 46, wy - 6], [wx - 28, wy - 10]]);
            state.gust = Math.max(0, state.gust - dt * 0.8);
            ctx.globalAlpha = 0.65;
            ctx.strokeStyle = '#f2f8ff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            var px = scene.pointer.active ? scene.pointer.x : scene.width / 2;
            var py = scene.pointer.active ? scene.pointer.y : scene.height / 2;
            state.flakes.forEach(function (flake) {
                var dx = px - flake.x;
                var dy = py - flake.y;
                var pull = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 260);
                var vx = -flake.speed * (0.8 + state.gust * 2) - dy * pull * 1.6;
                var vy = flake.speed * 0.34 + dx * pull * 1.6;
                flake.x += vx * dt;
                flake.y += vy * dt;
                if (flake.x < -10) flake.x = scene.width + 10;
                if (flake.y > base) flake.y = 0;
                ctx.moveTo(flake.x, flake.y);
                ctx.lineTo(flake.x + 7, flake.y - 2);
            });
            ctx.stroke();
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.gust = 1;
            state.howl = 1;
            scene.burst(x, y, '#ffffff', 16);
        }
    };

    pieces.ornament_string = {
        build: function (scene, state) {
            state.balls = [];
            var count = Math.max(8, Math.round(scene.width / 130));
            for (var index = 0; index < count; index++) state.balls.push({ x: (index + 0.5) * scene.width / count, length: 22 + (index % 4) * 13, swing: 0, speed: 0, color: ['#d7263d', '#ffd166', '#1a936f', '#3a86ff'][index % 4], dropped: false, y: 0 });
        },
        draw: function (scene, state, ctx, time, dt) {
            state.balls.forEach(function (ball) {
                if (near(scene, ball.x, ball.length + 10, 46)) ball.speed += 6 * dt;
                ball.speed += -ball.swing * 7 * dt;
                ball.speed *= 0.985;
                ball.swing += ball.speed * dt * 4;
                if (ball.dropped) {
                    ball.y += 280 * dt;
                    if (ball.y > scene.height + 20) { ball.dropped = false; ball.y = 0; scene.burst(ball.x, scene.height - 6, ball.color, 10); }
                }
                var bx = ball.x + Math.sin(ball.swing) * ball.length;
                var by = ball.dropped ? ball.y : Math.cos(ball.swing) * ball.length;
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#d9c28a';
                ctx.lineWidth = 1;
                if (!ball.dropped) {
                    ctx.beginPath();
                    ctx.moveTo(ball.x, 0);
                    ctx.lineTo(bx, by);
                    ctx.stroke();
                }
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = ball.color;
                ctx.beginPath();
                ctx.arc(bx, by + 7, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath();
                ctx.arc(bx - 3, by + 4, 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.balls.forEach(function (ball) {
                if (Math.abs(ball.x - x) < 36 && y < ball.length + 40) { ball.dropped = true; ball.y = ball.length; }
            });
        }
    };

    pieces.christmas_village = {
        build: function (scene, state) {
            state.houses = [];
            var count = Math.max(4, Math.round(scene.width / 280));
            for (var index = 0; index < count; index++) state.houses.push({ x: (index + 0.5) * scene.width / count, width: 74 + scene.random() * 40, height: 50 + scene.random() * 24, festive: false, smoke: [], next: 0, roof: ['#3a2230', '#26334a', '#2c3a2d'][index % 3] });
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            state.houses.forEach(function (house) {
                var close = near(scene, house.x, base - 50, house.width);
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#1d1825';
                ctx.fillRect(house.x - house.width / 2, base - house.height, house.width, house.height);
                ctx.fillStyle = house.roof;
                polygon(ctx, [[house.x - house.width * 0.62, base - house.height], [house.x, base - house.height - house.width * 0.42], [house.x + house.width * 0.62, base - house.height]]);
                ctx.fillStyle = '#eaf4ff';
                polygon(ctx, [[house.x - house.width * 0.62, base - house.height], [house.x, base - house.height - house.width * 0.42], [house.x + house.width * 0.62, base - house.height], [house.x + house.width * 0.5, base - house.height - 6], [house.x, base - house.height - house.width * 0.36], [house.x - house.width * 0.5, base - house.height - 6]]);
                ctx.fillStyle = '#1d1825';
                ctx.fillRect(house.x + house.width * 0.2, base - house.height - house.width * 0.36, 12, 24);
                ctx.globalAlpha = close || house.festive ? 1 : 0.5;
                ctx.fillStyle = '#ffd98a';
                ctx.fillRect(house.x - house.width * 0.34, base - house.height * 0.72, 16, 16);
                ctx.fillRect(house.x + house.width * 0.12, base - house.height * 0.72, 16, 16);
                if (house.festive) {
                    for (var light = 0; light < 7; light++) {
                        ctx.fillStyle = ['#ff4d6d', '#ffe066', '#06d6a0'][(light + Math.floor(time * 0.004)) % 3];
                        ctx.beginPath();
                        ctx.arc(house.x - house.width * 0.5 + light * house.width / 6, base - house.height - 2, 2.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                if (time > house.next) {
                    house.next = time + 340;
                    house.smoke.push({ x: house.x + house.width * 0.2 + 6, y: base - house.height - house.width * 0.36 - 24, life: 1 });
                    if (house.smoke.length > 9) house.smoke.shift();
                }
                house.smoke.forEach(function (puff) {
                    puff.life -= dt * 0.28;
                    puff.y -= 22 * dt;
                    puff.x += 8 * dt;
                    ctx.globalAlpha = Math.max(0, puff.life) * 0.3;
                    ctx.fillStyle = '#dfe6f2';
                    ctx.beginPath();
                    ctx.arc(puff.x, puff.y, 6 + (1 - puff.life) * 10, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) {
            state.houses.forEach(function (house) {
                if (Math.abs(house.x - x) < house.width * 0.7) {
                    house.festive = !house.festive;
                    scene.burst(house.x, scene.height - house.height, '#ffe066', 12);
                }
            });
        }
    };

    pieces.grand_tree = {
        build: function (scene, state) {
            state.baubles = [];
            for (var index = 0; index < 26; index++) {
                var level = scene.random();
                state.baubles.push({ level: level, side: scene.random() * 2 - 1, color: ['#ff4d6d', '#ffd166', '#7bdff2', '#c77dff', '#06d6a0'][index % 5], phase: scene.random() * 6 });
            }
        },
        draw: function (scene, state, ctx, time) {
            var height = Math.min(scene.height * 0.62, 460);
            var x = scene.width - height * 0.42;
            var base = scene.height;
            ctx.globalAlpha = 0.82;
            tree(ctx, x, base, height, '#123c2a');
            state.baubles.forEach(function (bauble) {
                var y = base - height * (0.16 + bauble.level * 0.76);
                var spread = height * 0.34 * (1 - bauble.level);
                var bx = x + bauble.side * spread;
                var glow = near(scene, bx, y, 90);
                var twinkle = 0.55 + Math.sin(time * 0.004 + bauble.phase) * 0.45;
                ctx.globalAlpha = glow ? 1 : twinkle;
                ctx.fillStyle = bauble.color;
                ctx.beginPath();
                ctx.arc(bx, y, glow ? 7 : 5, 0, Math.PI * 2);
                ctx.fill();
                if (glow) scene.glow(bx, y, 34, bauble.color, 0.55);
            });
            scene.glow(x, base - height, 60, '#ffe066', 0.5 + Math.sin(time * 0.003) * 0.2);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffe066';
            polygon(ctx, [[x, base - height - 16], [x + 5, base - height - 4], [x + 16, base - height - 2], [x + 7, base - height + 5], [x + 10, base - height + 16], [x, base - height + 9], [x - 10, base - height + 16], [x - 7, base - height + 5], [x - 16, base - height - 2], [x - 5, base - height - 4]]);
        },
        click: function (scene, state, x, y) {
            var height = Math.min(scene.height * 0.62, 460);
            var center = scene.width - height * 0.42;
            if (Math.abs(x - center) < height * 0.4 && y > scene.height - height) {
                var level = Math.max(0, Math.min(1, (scene.height - y) / height - 0.16));
                state.baubles.push({ level: level, side: (x - center) / Math.max(10, height * 0.34 * (1 - level)), color: ['#ff4d6d', '#ffd166', '#7bdff2'][state.baubles.length % 3], phase: scene.random() * 6 });
                if (state.baubles.length > 70) state.baubles.shift();
                scene.burst(x, y, '#ffe066', 14);
            }
        }
    };

    pieces.elf_workshop = {
        build: function (scene, state) {
            state.gifts = [];
            for (var index = 0; index < 9; index++) state.gifts.push({ x: index / 9, size: 24 + scene.random() * 16, color: ['#d7263d', '#1a936f', '#3a86ff', '#ffd166'][index % 4], ribbon: ['#ffe066', '#ffffff', '#ff85a1'][index % 3], open: 0 });
            state.speed = 0.03;
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height - 24;
            var hovering = scene.pointer.active && scene.pointer.y > base - 90;
            state.speed += ((hovering ? 0.1 : 0.03) - state.speed) * dt * 2;
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#231c2c';
            ctx.fillRect(0, base, scene.width, 24);
            ctx.fillStyle = '#4b3f58';
            var offset = (time * state.speed * 0.25) % 48;
            for (var slat = -1; slat < scene.width / 48 + 1; slat++) ctx.fillRect(slat * 48 + offset, base + 4, 24, 4);
            for (var gear = 0; gear < 2; gear++) {
                var gx = gear ? scene.width - 54 : 54;
                ctx.save();
                ctx.translate(gx, base - 42);
                ctx.rotate(time * 0.0012 * (gear ? -1 : 1));
                ctx.fillStyle = '#3a3346';
                for (var tooth = 0; tooth < 8; tooth++) {
                    ctx.rotate(Math.PI / 4);
                    ctx.fillRect(-5, -30, 10, 12);
                }
                ctx.beginPath();
                ctx.arc(0, 0, 21, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            state.gifts.forEach(function (gift) {
                gift.x = (gift.x + state.speed * dt) % 1;
                gift.open = Math.max(0, gift.open - dt * 0.8);
                var x = gift.x * (scene.width + 80) - 40;
                ctx.fillStyle = gift.color;
                ctx.fillRect(x - gift.size / 2, base - gift.size, gift.size, gift.size);
                ctx.fillStyle = gift.ribbon;
                ctx.fillRect(x - 3, base - gift.size, 6, gift.size);
                ctx.save();
                ctx.translate(x, base - gift.size);
                ctx.rotate(-gift.open * 1.4);
                ctx.fillRect(-gift.size / 2 - 2, -6 - gift.open * 12, gift.size + 4, 7);
                ctx.restore();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.gifts.forEach(function (gift) {
                var gx = gift.x * (scene.width + 80) - 40;
                if (Math.abs(gx - x) < gift.size && y > scene.height - 24 - gift.size * 1.6) {
                    gift.open = 1;
                    scene.burst(gx, scene.height - 24 - gift.size, gift.color, 26);
                    scene.burst(gx, scene.height - 24 - gift.size, '#ffe066', 14);
                }
            });
        }
    };

    pieces.reindeer_flight = {
        build: function (scene, state) {
            state.chain = [];
            for (var index = 0; index < 8; index++) state.chain.push({ x: -50 - index * 40, y: 90 });
            state.trail = [];
            state.pile = [];
        },
        draw: function (scene, state, ctx, time, dt) {
            for (var band = 0; band < 2; band++) {
                ctx.beginPath();
                for (var x = 0; x <= scene.width; x += 50) {
                    var wave = scene.height * (0.06 + band * 0.04) + Math.sin(x * 0.005 + time * 0.0007 + band) * 22;
                    if (x === 0) ctx.moveTo(x, wave);
                    else ctx.lineTo(x, wave);
                }
                ctx.strokeStyle = band ? 'rgba(130,120,255,0.18)' : 'rgba(90,255,180,0.2)';
                ctx.lineWidth = 22;
                ctx.stroke();
            }
            var lead = state.chain[0];
            var targetX = scene.pointer.active ? scene.pointer.x : (time * 0.09) % (scene.width + 300) - 100;
            var targetY = scene.pointer.active ? Math.min(scene.pointer.y, scene.height * 0.6) : 90 + Math.sin(time * 0.001) * 46;
            lead.x += (targetX - lead.x) * dt * 1.6;
            lead.y += (targetY - lead.y) * dt * 1.6;
            for (var index = 1; index < state.chain.length; index++) {
                var link = state.chain[index];
                var previous = state.chain[index - 1];
                var dx = previous.x - link.x;
                var dy = previous.y - link.y;
                var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                link.x = previous.x - (dx / distance) * 34;
                link.y = previous.y - (dy / distance) * 34;
            }
            ctx.fillStyle = '#2a1a12';
            ctx.globalAlpha = 0.92;
            state.chain.slice(0, 6).forEach(function (deer, position) {
                var leg = Math.sin(time * 0.014 + position) * 6;
                ctx.fillRect(deer.x - 11, deer.y - 5, 22, 10);
                ctx.fillRect(deer.x + 9, deer.y - 13, 7, 12);
                ctx.fillRect(deer.x - 9, deer.y + 5, 3, 7 + leg);
                ctx.fillRect(deer.x + 6, deer.y + 5, 3, 7 - leg);
                ctx.strokeStyle = '#6b4a2f';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(deer.x + 13, deer.y - 13);
                ctx.lineTo(deer.x + 18, deer.y - 22);
                ctx.moveTo(deer.x + 15, deer.y - 17);
                ctx.lineTo(deer.x + 23, deer.y - 19);
                ctx.stroke();
                if (position === 0) {
                    ctx.fillStyle = '#ff2d2d';
                    ctx.beginPath();
                    ctx.arc(deer.x + 18, deer.y - 9, 3, 0, Math.PI * 2);
                    ctx.fill();
                    scene.glow(deer.x + 18, deer.y - 9, 24, '#ff2d2d', 0.6);
                    ctx.fillStyle = '#2a1a12';
                }
            });
            var sleigh = state.chain[7];
            ctx.fillStyle = '#b3122b';
            ctx.fillRect(sleigh.x - 22, sleigh.y - 8, 44, 16);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(sleigh.x - 26, sleigh.y + 10, 52, 3);
            ctx.fillStyle = '#d7263d';
            ctx.beginPath();
            ctx.arc(sleigh.x, sleigh.y - 14, 8, 0, Math.PI * 2);
            ctx.fill();
            state.trail.push({ x: sleigh.x, y: sleigh.y, life: 1 });
            if (state.trail.length > 60) state.trail.shift();
            state.trail.forEach(function (spark) {
                spark.life -= dt * 0.9;
                ctx.globalAlpha = Math.max(0, spark.life) * 0.8;
                ctx.fillStyle = '#ffe9a8';
                ctx.fillRect(spark.x - 1, spark.y + (1 - spark.life) * 26, 2, 2);
            });
            state.pile.forEach(function (gift) {
                if (gift.y < scene.height - gift.size - gift.stack) gift.y += 170 * dt;
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = gift.color;
                ctx.fillRect(gift.x - gift.size / 2, gift.y, gift.size, gift.size);
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state) {
            var sleigh = state.chain[7];
            var stack = state.pile.filter(function (gift) { return Math.abs(gift.x - sleigh.x) < 20; }).length * 18;
            state.pile.push({ x: sleigh.x, y: sleigh.y, size: 18, stack: stack, color: ['#d7263d', '#1a936f', '#3a86ff', '#ffd166'][state.pile.length % 4] });
            if (state.pile.length > 40) state.pile.shift();
        }
    };

    pieces.click_rockets = {
        build: function (scene, state) { state.rockets = []; },
        draw: function (scene, state, ctx, time, dt) {
            state.rockets = state.rockets.filter(function (rocket) {
                rocket.y -= rocket.speed * dt;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = rocket.color;
                ctx.fillRect(rocket.x - 1.5, rocket.y, 3, 16);
                scene.glow(rocket.x, rocket.y + 14, 16, '#ffe066', 0.5);
                if (rocket.y <= rocket.target) {
                    scene.burst(rocket.x, rocket.y, rocket.color, 44);
                    return false;
                }
                return true;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.rockets.push({ x: x, y: scene.height, target: y, speed: 620, color: scene.color(state.rockets.length) });
        }
    };

    pieces.city_skyline = {
        build: function (scene, state) {
            state.buildings = [];
            var x = 0;
            while (x < scene.width) {
                var width = 44 + scene.random() * 60;
                var height = 54 + scene.random() * strip(scene) * 0.72;
                var windows = [];
                for (var row = 0; row < Math.floor(height / 16); row++) {
                    for (var column = 0; column < Math.floor(width / 15); column++) windows.push({ row: row, column: column, on: scene.random() > 0.55 });
                }
                state.buildings.push({ x: x, width: width, height: height, windows: windows });
                x += width + 3;
            }
            state.rockets = [];
            state.next = 0;
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            state.buildings.forEach(function (building, index) {
                ctx.globalAlpha = 0.88;
                ctx.fillStyle = '#090913';
                ctx.fillRect(building.x, base - building.height, building.width, building.height);
                var close = scene.pointer.active && Math.abs(scene.pointer.x - building.x - building.width / 2) < 120;
                ctx.fillStyle = '#ffd98a';
                building.windows.forEach(function (light) {
                    var lit = close || (light.on && Math.sin(time * 0.0007 + index + light.row) > -0.8);
                    if (!lit) return;
                    ctx.globalAlpha = close ? 0.95 : 0.55;
                    ctx.fillRect(building.x + 5 + light.column * 15, base - building.height + 7 + light.row * 16, 7, 8);
                });
            });
            if (time > state.next) {
                state.next = time + 1700 + scene.random() * 2200;
                var source = state.buildings[Math.floor(scene.random() * state.buildings.length)];
                state.rockets.push({ x: source.x + source.width / 2, y: base - source.height, target: scene.height * (0.1 + scene.random() * 0.34), color: scene.color(Math.floor(scene.random() * 3)) });
            }
            state.rockets = state.rockets.filter(function (rocket) {
                rocket.y -= 500 * dt;
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = rocket.color;
                ctx.fillRect(rocket.x - 1, rocket.y, 2, 14);
                if (rocket.y <= rocket.target) {
                    scene.burst(rocket.x, rocket.y, rocket.color, 40);
                    return false;
                }
                return true;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.rockets.push({ x: x, y: scene.height - 40, target: y, color: scene.color(state.rockets.length) });
        }
    };

    pieces.midnight_clock = {
        build: function (scene, state) { state.bubbles = []; },
        draw: function (scene, state, ctx, time, dt) {
            var radius = Math.min(96, scene.width * 0.075);
            var x = scene.width - radius * 1.5;
            var y = radius * 1.4;
            var now = new Date();
            var seconds = now.getSeconds() + now.getMilliseconds() / 1000;
            var close = near(scene, x, y, radius * 2.2);
            scene.glow(x, y, radius * 2.2, '#ffd166', close ? 0.5 : 0.24);
            ctx.globalAlpha = 0.86;
            ctx.fillStyle = '#16121f';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 3;
            ctx.stroke();
            for (var mark = 0; mark < 12; mark++) {
                var angle = (mark / 12) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(x + Math.cos(angle) * radius * 0.82, y + Math.sin(angle) * radius * 0.82);
                ctx.lineTo(x + Math.cos(angle) * radius * 0.94, y + Math.sin(angle) * radius * 0.94);
                ctx.stroke();
            }
            [[now.getHours() % 12 + now.getMinutes() / 60, 12, 0.5, 4], [now.getMinutes() + seconds / 60, 60, 0.74, 3], [seconds, 60, 0.86, 1.5]].forEach(function (hand, index) {
                var handAngle = (hand[0] / hand[1]) * Math.PI * 2 - Math.PI / 2;
                ctx.strokeStyle = index === 2 ? '#ff4d6d' : '#ffe9a8';
                ctx.lineWidth = hand[3];
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(handAngle) * radius * hand[2], y + Math.sin(handAngle) * radius * hand[2]);
                ctx.stroke();
            });
            if (scene.random() < dt * (scene.tier > 0 ? 9 : 3)) state.bubbles.push({ x: scene.random() * scene.width, y: scene.height + 8, size: 2 + scene.random() * 5, speed: 50 + scene.random() * 90 });
            ctx.strokeStyle = 'rgba(255,233,168,0.7)';
            ctx.lineWidth = 1;
            state.bubbles = state.bubbles.filter(function (bubble) {
                bubble.y -= bubble.speed * dt;
                bubble.x += Math.sin(time * 0.003 + bubble.size) * 12 * dt;
                ctx.globalAlpha = 0.65;
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
                ctx.stroke();
                return bubble.y > -10;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            for (var index = 0; index < 26; index++) state.bubbles.push({ x: x + (scene.random() - 0.5) * 50, y: y, size: 2 + scene.random() * 6, speed: 110 + scene.random() * 180 });
            scene.burst(x, y, '#ffd166', 16);
        }
    };

    pieces.sky_lanterns = {
        build: function (scene, state) {
            state.lanterns = [];
            var count = scene.tier > 0 ? 18 : 8;
            for (var index = 0; index < count; index++) state.lanterns.push({ x: scene.random() * scene.width, y: scene.random() * scene.height, size: 14 + scene.random() * 20, speed: 16 + scene.random() * 22, phase: scene.random() * 6 });
        },
        draw: function (scene, state, ctx, time, dt) {
            state.lanterns = state.lanterns.filter(function (lantern) {
                lantern.y -= lantern.speed * dt;
                lantern.x += Math.sin(time * 0.0007 + lantern.phase) * 9 * dt;
                if (near(scene, lantern.x, lantern.y, 120)) {
                    lantern.x += (lantern.x - scene.pointer.x) * dt * 0.9;
                    lantern.y -= 30 * dt;
                }
                if (lantern.y < -60) {
                    if (lantern.extra) return false;
                    lantern.y = scene.height + 40;
                    lantern.x = scene.random() * scene.width;
                }
                var flicker = 0.8 + Math.sin(time * 0.008 + lantern.phase) * 0.14;
                scene.glow(lantern.x, lantern.y, lantern.size * 2.2, '#ff9d3c', 0.32 * flicker);
                ctx.globalAlpha = 0.86 * flicker;
                ctx.fillStyle = '#ffb35a';
                polygon(ctx, [[lantern.x - lantern.size * 0.42, lantern.y + lantern.size * 0.5], [lantern.x - lantern.size * 0.5, lantern.y - lantern.size * 0.5], [lantern.x + lantern.size * 0.5, lantern.y - lantern.size * 0.5], [lantern.x + lantern.size * 0.42, lantern.y + lantern.size * 0.5]]);
                ctx.fillStyle = '#fff3c4';
                ctx.fillRect(lantern.x - 3, lantern.y + lantern.size * 0.26, 6, 5);
                return true;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.lanterns.push({ x: x, y: y, size: 22, speed: 46, phase: scene.random() * 6, extra: true });
            if (state.lanterns.length > 60) state.lanterns.splice(0, 1);
        }
    };

    function shellPoints(shape, count) {
        var points = [];
        for (var index = 0; index < count; index++) {
            var t = (index / count) * Math.PI * 2;
            if (shape === 'heart') points.push([16 * Math.pow(Math.sin(t), 3) / 16, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]);
            else if (shape === 'star') { var radius = index % 2 ? 0.45 : 1; points.push([Math.cos(t) * radius, Math.sin(t) * radius]); }
            else if (shape === 'spiral') points.push([Math.cos(t * 3) * (index / count), Math.sin(t * 3) * (index / count)]);
            else points.push([Math.cos(t), Math.sin(t)]);
        }
        return points;
    }

    pieces.galaxy_shells = {
        build: function (scene, state) { state.sparks = []; state.next = 0; state.trail = []; state.kind = 0; },
        launch: function (scene, state, x, y) {
            var shapes = ['ring', 'heart', 'star', 'spiral'];
            var shape = shapes[state.kind++ % shapes.length];
            var color = scene.color(state.kind);
            shellPoints(shape, scene.tier > 0 ? 54 : 26).forEach(function (point) {
                state.sparks.push({ x: x, y: y, vx: point[0] * 150, vy: point[1] * 150, life: 1, color: color });
            });
            rings(state, x, y, color);
        },
        draw: function (scene, state, ctx, time, dt) {
            if (time > state.next) {
                state.next = time + 1800 + scene.random() * 1400;
                pieces.galaxy_shells.launch(scene, state, scene.width * (0.15 + scene.random() * 0.7), scene.height * (0.12 + scene.random() * 0.35));
            }
            state.sparks = state.sparks.filter(function (spark) {
                spark.life -= dt * 0.72;
                spark.x += spark.vx * dt;
                spark.y += spark.vy * dt;
                spark.vy += 14 * dt;
                spark.vx *= 0.99;
                spark.vy *= 0.99;
                ctx.globalAlpha = Math.max(0, spark.life);
                ctx.fillStyle = spark.color;
                ctx.fillRect(spark.x, spark.y, 2.6, 2.6);
                return spark.life > 0;
            });
            drawRings(ctx, state, dt, 210);
            if (scene.pointer.active) {
                state.trail.push({ x: scene.pointer.x, y: scene.pointer.y, life: 1 });
                if (state.trail.length > 36) state.trail.shift();
            }
            state.trail.forEach(function (point, index) {
                point.life -= dt * 1.6;
                ctx.globalAlpha = Math.max(0, point.life) * 0.7;
                ctx.fillStyle = scene.color(index);
                ctx.beginPath();
                ctx.arc(point.x, point.y, 1 + point.life * 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) { pieces.galaxy_shells.launch(scene, state, x, y); }
    };

    pieces.love_pulse = {
        build: function (scene, state) { state.trail = []; state.last = 0; },
        draw: function (scene, state, ctx, time, dt) {
            var size = 34 + Math.sin(time * 0.004) * 4 + Math.pow(Math.max(0, Math.sin(time * 0.008)), 8) * 7;
            var x = scene.width - 74;
            var y = scene.height - 74;
            scene.glow(x, y, size * 2.4, '#ff4d6d', 0.3);
            ctx.globalAlpha = 0.86;
            ctx.fillStyle = '#ff4d6d';
            heartPath(ctx, x, y, size);
            ctx.fill();
            if (scene.pointer.active && time - state.last > 110) {
                state.last = time;
                state.trail.push({ x: scene.pointer.x, y: scene.pointer.y, life: 1, size: 6 + scene.random() * 6 });
                if (state.trail.length > 24) state.trail.shift();
            }
            state.trail.forEach(function (heart) {
                heart.life -= dt * 0.8;
                heart.y -= 26 * dt;
                ctx.globalAlpha = Math.max(0, heart.life) * 0.8;
                ctx.fillStyle = '#ff85a1';
                heartPath(ctx, heart.x, heart.y, heart.size);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) { scene.burst(x, y, '#ff4d6d', 24); }
    };

    pieces.rose_garden = {
        build: function (scene, state) {
            state.roses = [];
            var count = Math.max(8, Math.round(scene.width / 130));
            for (var index = 0; index < count; index++) state.roses.push({ x: (index + 0.5) * scene.width / count + (scene.random() - 0.5) * 40, height: 40 + scene.random() * 90, bloom: 0.2, phase: scene.random() * 6, grow: 1 });
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            state.roses.forEach(function (rose) {
                rose.grow = Math.min(1, rose.grow + dt * 0.6);
                var close = near(scene, rose.x, base - rose.height, 120);
                rose.bloom += ((close ? 1 : 0.28) - rose.bloom) * dt * 3;
                var height = rose.height * rose.grow;
                var sway = Math.sin(time * 0.0012 + rose.phase) * 7;
                ctx.globalAlpha = 0.88;
                ctx.strokeStyle = '#1f5a34';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(rose.x, base);
                ctx.quadraticCurveTo(rose.x - 12, base - height / 2, rose.x + sway, base - height);
                ctx.stroke();
                ctx.fillStyle = '#2a7a46';
                polygon(ctx, [[rose.x - 5, base - height * 0.45], [rose.x - 22, base - height * 0.55], [rose.x - 8, base - height * 0.36]]);
                var size = 5 + rose.bloom * 13;
                var petals = 5;
                ctx.fillStyle = '#d7263d';
                for (var petal = 0; petal < petals; petal++) {
                    var angle = (petal / petals) * Math.PI * 2 + time * 0.0002;
                    ctx.beginPath();
                    ctx.arc(rose.x + sway + Math.cos(angle) * size * 0.5, base - height + Math.sin(angle) * size * 0.5, size * 0.56, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#ff5c7a';
                ctx.beginPath();
                ctx.arc(rose.x + sway, base - height, size * 0.42, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.roses.push({ x: x, height: Math.max(40, Math.min(170, scene.height - y)), bloom: 1, phase: scene.random() * 6, grow: 0 });
            if (state.roses.length > 40) state.roses.shift();
        }
    };

    pieces.love_letters = {
        build: function (scene, state) {
            state.letters = [];
            var count = scene.tier > 0 ? 12 : 5;
            for (var index = 0; index < count; index++) state.letters.push({ x: scene.random() * scene.width, y: scene.random() * scene.height, speed: 12 + scene.random() * 20, phase: scene.random() * 6, open: 0, size: 26 + scene.random() * 16 });
        },
        draw: function (scene, state, ctx, time, dt) {
            state.letters.forEach(function (letter) {
                letter.y -= letter.speed * dt;
                letter.x += Math.sin(time * 0.0009 + letter.phase) * 18 * dt;
                if (letter.y < -40) { letter.y = scene.height + 40; letter.x = scene.random() * scene.width; }
                var target = near(scene, letter.x, letter.y, 80) ? 1 : 0;
                letter.open += (target - letter.open) * dt * 5;
                var width = letter.size;
                var height = letter.size * 0.66;
                ctx.save();
                ctx.translate(letter.x, letter.y);
                ctx.rotate(Math.sin(time * 0.0012 + letter.phase) * 0.18);
                ctx.globalAlpha = 0.78;
                if (letter.open > 0.1) {
                    ctx.fillStyle = '#ff4d6d';
                    heartPath(ctx, 0, -height * 0.4 - letter.open * 12, 7);
                    ctx.fill();
                }
                ctx.fillStyle = '#ffeef2';
                ctx.fillRect(-width / 2, -height / 2, width, height);
                ctx.fillStyle = letter.open > 0.5 ? '#ffc6d3' : '#ffd9e2';
                var tip = letter.open > 0.5 ? -height / 2 - height * 0.5 * letter.open : height * 0.1;
                polygon(ctx, [[-width / 2, -height / 2], [0, tip], [width / 2, -height / 2]]);
                ctx.fillStyle = '#d7263d';
                ctx.beginPath();
                ctx.arc(0, height * 0.02, 2.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.letters.forEach(function (letter) {
                if (Math.abs(letter.x - x) < letter.size && Math.abs(letter.y - y) < letter.size) {
                    scene.burst(letter.x, letter.y, '#ff4d6d', 26);
                    letter.y = scene.height + 40;
                }
            });
        }
    };

    pieces.cupid = {
        build: function (scene, state) { state.arrows = []; state.next = 0; state.x = scene.width * 0.8; state.y = scene.height * 0.22; state.hearts = []; },
        shoot: function (scene, state, x, y) {
            var dx = x - state.x;
            var dy = y - state.y;
            var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            state.arrows.push({ x: state.x, y: state.y, vx: dx / distance * 520, vy: dy / distance * 520, tx: x, ty: y, angle: Math.atan2(dy, dx), distance: distance });
        },
        draw: function (scene, state, ctx, time, dt) {
            var goalX = scene.pointer.active ? scene.pointer.x + 180 : scene.width * 0.8;
            var goalY = scene.pointer.active ? scene.pointer.y - 130 : scene.height * 0.22 + Math.sin(time * 0.001) * 30;
            state.x += (Math.min(scene.width - 50, goalX) - state.x) * dt * 0.9;
            state.y += (Math.max(50, goalY) - state.y) * dt * 0.9;
            if (scene.pointer.active && time > state.next) {
                state.next = time + 3200;
                pieces.cupid.shoot(scene, state, scene.pointer.x, scene.pointer.y);
            }
            var flap = Math.sin(time * 0.016);
            ctx.globalAlpha = 0.92;
            ctx.fillStyle = '#ffe9f0';
            polygon(ctx, [[state.x, state.y], [state.x + 30, state.y - 14 - flap * 16], [state.x + 8, state.y + 6]]);
            polygon(ctx, [[state.x, state.y], [state.x - 30, state.y - 14 - flap * 16], [state.x - 8, state.y + 6]]);
            ctx.fillStyle = '#f5c6a8';
            ctx.beginPath();
            ctx.arc(state.x, state.y - 15, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(state.x - 7, state.y - 8, 14, 18);
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(state.x - 14, state.y, 13, -1.2, 1.2);
            ctx.stroke();
            state.arrows = state.arrows.filter(function (arrow) {
                arrow.x += arrow.vx * dt;
                arrow.y += arrow.vy * dt;
                arrow.distance -= 520 * dt;
                ctx.save();
                ctx.translate(arrow.x, arrow.y);
                ctx.rotate(arrow.angle);
                ctx.fillStyle = '#ffd166';
                ctx.fillRect(-14, -1, 24, 2);
                ctx.fillStyle = '#ff4d6d';
                heartPath(ctx, 14, 2, 5);
                ctx.fill();
                ctx.restore();
                if (arrow.distance <= 0) {
                    state.hearts.push({ x: arrow.tx, y: arrow.ty, life: 1 });
                    scene.burst(arrow.tx, arrow.ty, '#ff4d6d', 18);
                    return false;
                }
                return true;
            });
            state.hearts = state.hearts.filter(function (heart) {
                heart.life -= dt;
                ctx.globalAlpha = Math.max(0, heart.life);
                ctx.fillStyle = '#ff4d6d';
                heartPath(ctx, heart.x, heart.y, 14 + (1 - heart.life) * 22);
                ctx.fill();
                return heart.life > 0;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) { pieces.cupid.shoot(scene, state, x, y); }
    };

    pieces.heart_constellation = {
        build: function (scene, state) {
            state.points = shellPoints('heart', 22);
            state.trail = [];
            state.waves = [];
        },
        draw: function (scene, state, ctx, time, dt) {
            var scale = Math.min(120, scene.width * 0.09) * (1 + Math.pow(Math.max(0, Math.sin(time * 0.003)), 6) * 0.08);
            var cx = scene.width - scale * 1.5;
            var cy = scale * 1.6;
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#ff85a1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            state.points.forEach(function (point, index) {
                var x = cx + point[0] * scale;
                var y = cy + point[1] * scale;
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.stroke();
            state.points.forEach(function (point, index) {
                var x = cx + point[0] * scale;
                var y = cy + point[1] * scale;
                ctx.globalAlpha = 0.5 + Math.sin(time * 0.004 + index) * 0.4;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
            });
            if (scene.pointer.active) {
                state.trail.push({ x: scene.pointer.x, y: scene.pointer.y });
                if (state.trail.length > 28) state.trail.shift();
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = '#ffd6e0';
                ctx.beginPath();
                state.trail.forEach(function (point, index) {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
            }
            state.waves = state.waves.filter(function (wave) {
                wave.life -= dt * 0.6;
                wave.size += 170 * dt;
                ctx.globalAlpha = Math.max(0, wave.life) * 0.6;
                ctx.strokeStyle = '#ff4d6d';
                ctx.lineWidth = 2;
                heartPath(ctx, wave.x, wave.y, wave.size);
                ctx.stroke();
                return wave.life > 0;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.waves.push({ x: x, y: y, size: 10, life: 1 });
            scene.burst(x, y, '#ffd6e0', 14);
        }
    };

    pieces.grass_meadow = {
        build: function (scene, state) {
            state.blades = [];
            var count = Math.min(240, Math.round(scene.width / (scene.tier > 0 ? 7 : 16)));
            for (var index = 0; index < count; index++) state.blades.push({ x: (index / count) * scene.width, height: 18 + scene.random() * 34, phase: scene.random() * 6, shade: 110 + Math.floor(scene.random() * 30) });
            state.flowers = [];
        },
        draw: function (scene, state, ctx, time) {
            var base = scene.height;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 2;
            state.blades.forEach(function (blade) {
                var push = 0;
                if (scene.pointer.active && scene.pointer.y > base - 160) {
                    var dx = blade.x - scene.pointer.x;
                    if (Math.abs(dx) < 90) push = (dx > 0 ? 1 : -1) * (90 - Math.abs(dx)) * 0.32;
                }
                var sway = Math.sin(time * 0.0016 + blade.phase) * 6 + push;
                ctx.strokeStyle = 'hsl(' + blade.shade + ',60%,34%)';
                ctx.beginPath();
                ctx.moveTo(blade.x, base);
                ctx.quadraticCurveTo(blade.x + sway * 0.4, base - blade.height * 0.6, blade.x + sway, base - blade.height);
                ctx.stroke();
            });
            state.flowers.forEach(function (flower) {
                flower.grow = Math.min(1, flower.grow + 0.02);
                ctx.fillStyle = flower.color;
                for (var petal = 0; petal < 6; petal++) {
                    var angle = (petal / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(flower.x + Math.cos(angle) * 6 * flower.grow, base - 44 + Math.sin(angle) * 6 * flower.grow, 4 * flower.grow, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#ffe066';
                ctx.beginPath();
                ctx.arc(flower.x, base - 44, 3 * flower.grow, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) {
            state.flowers.push({ x: x, grow: 0, color: ['#ff85a1', '#ffffff', '#c77dff', '#7bdff2'][state.flowers.length % 4] });
            if (state.flowers.length > 40) state.flowers.shift();
        }
    };

    pieces.flower_field = {
        build: function (scene, state) {
            state.flowers = [];
            var count = Math.max(12, Math.round(scene.width / 76));
            for (var index = 0; index < count; index++) state.flowers.push({ x: (index + 0.5) * scene.width / count, height: 40 + scene.random() * 70, open: 0.3, color: ['#ffd166', '#ff85a1', '#c77dff', '#ffffff', '#ff9f1c'][index % 5], phase: scene.random() * 6, grown: 1 });
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            state.flowers.forEach(function (flower) {
                var head = base - flower.height * flower.grown;
                var lean = scene.pointer.active ? Math.max(-18, Math.min(18, (scene.pointer.x - flower.x) * 0.06)) : Math.sin(time * 0.001 + flower.phase) * 6;
                flower.open += ((near(scene, flower.x, head, 150) ? 1 : 0.35) - flower.open) * dt * 3;
                flower.grown = Math.min(1 + scene.random() * 0.001, flower.grown + dt * 0.05);
                ctx.globalAlpha = 0.9;
                ctx.strokeStyle = '#2f7a3f';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(flower.x, base);
                ctx.quadraticCurveTo(flower.x, head + 20, flower.x + lean, head);
                ctx.stroke();
                var size = 5 + flower.open * 10;
                ctx.fillStyle = flower.color;
                for (var petal = 0; petal < 8; petal++) {
                    var angle = (petal / 8) * Math.PI * 2 + lean * 0.02;
                    ctx.beginPath();
                    ctx.ellipse(flower.x + lean + Math.cos(angle) * size, head + Math.sin(angle) * size, size * 0.62, size * 0.36, angle, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#6b3f12';
                ctx.beginPath();
                ctx.arc(flower.x + lean, head, size * 0.46, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) {
            state.flowers.forEach(function (flower) {
                if (Math.abs(flower.x - x) < 70) {
                    flower.height = Math.min(190, flower.height + 18);
                    scene.burst(flower.x, scene.height - flower.height, flower.color, 12);
                }
            });
        }
    };

    pieces.rainbow_shower = {
        build: function (scene, state) { state.fade = 0.4; },
        draw: function (scene, state, ctx, time, dt) {
            state.fade = Math.max(0.28, state.fade - dt * 0.08);
            var radius = Math.min(scene.width * 0.3, 420);
            var colors = ['#ff004c', '#ff9500', '#ffe600', '#2bff00', '#00c8ff', '#7a00ff'];
            ctx.lineWidth = 9;
            colors.forEach(function (color, index) {
                ctx.globalAlpha = state.fade * (0.7 + Math.sin(time * 0.001 + index) * 0.12);
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.arc(scene.width * 0.74, scene.height * 0.5, radius - index * 9, Math.PI * 1.04, Math.PI * 1.96);
                ctx.stroke();
            });
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#7bdff2';
            ctx.beginPath();
            ctx.ellipse(scene.width * 0.5, scene.height - 8, scene.width * 0.36, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            if (scene.random() < dt * 3) rings(state, scene.width * (0.2 + scene.random() * 0.6), scene.height - 8, '#c9f3ff');
            drawRings(ctx, state, dt, 46, true);
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.fade = 1;
            rings(state, x, Math.max(y, scene.height - 40), '#ffffff');
            scene.burst(x, y, '#7bdff2', 14);
        }
    };

    pieces.cherry_tree = {
        build: function (scene, state) {
            state.shake = 0;
            state.falling = [];
            state.blossoms = [];
            for (var index = 0; index < 70; index++) {
                var t = scene.random();
                state.blossoms.push({ t: t, offset: (scene.random() - 0.5) * 90, drop: scene.random() * 60, size: 4 + scene.random() * 6, phase: scene.random() * 6 });
            }
        },
        draw: function (scene, state, ctx, time, dt) {
            var startX = scene.width;
            var length = Math.min(scene.width * 0.42, 620);
            state.shake = Math.max(0, state.shake - dt * 1.3);
            var hover = scene.pointer.active && scene.pointer.x > startX - length && scene.pointer.y < 240 ? 3 : 0;
            var sway = Math.sin(time * 0.0012) * 3 + Math.sin(time * 0.03) * state.shake * 12 + hover * Math.sin(time * 0.006);
            ctx.globalAlpha = 0.88;
            ctx.strokeStyle = '#3a2418';
            ctx.lineWidth = 15;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(startX, 10);
            ctx.quadraticCurveTo(startX - length * 0.5, 34 + sway, startX - length, 90 + sway * 2);
            ctx.stroke();
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(startX - length * 0.4, 32 + sway);
            ctx.quadraticCurveTo(startX - length * 0.5, 100, startX - length * 0.7, 150 + sway * 2);
            ctx.moveTo(startX - length * 0.7, 66 + sway);
            ctx.lineTo(startX - length * 0.92, 28 + sway);
            ctx.stroke();
            ctx.lineCap = 'butt';
            state.blossoms.forEach(function (blossom) {
                var x = startX - blossom.t * length + blossom.offset * 0.4;
                var y = 24 + blossom.t * 90 + blossom.drop + sway * (0.5 + blossom.t);
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = blossom.size > 7 ? '#ffc2d6' : '#ff9ec2';
                ctx.beginPath();
                ctx.arc(x, y, blossom.size, 0, Math.PI * 2);
                ctx.fill();
            });
            state.falling = state.falling.filter(function (petal) {
                petal.y += petal.speed * dt;
                petal.x += Math.sin(time * 0.002 + petal.phase) * 36 * dt;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#ffd6e4';
                ctx.beginPath();
                ctx.ellipse(petal.x, petal.y, 5, 3, time * 0.002 + petal.phase, 0, Math.PI * 2);
                ctx.fill();
                return petal.y < scene.height + 10;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state) {
            state.shake = 1;
            var length = Math.min(scene.width * 0.42, 620);
            for (var index = 0; index < 42; index++) state.falling.push({ x: scene.width - scene.random() * length, y: 40 + scene.random() * 130, speed: 60 + scene.random() * 110, phase: scene.random() * 6 });
            if (state.falling.length > 200) state.falling.splice(0, state.falling.length - 200);
        }
    };

    pieces.butterfly_garden = {
        build: function (scene, state) {
            state.flies = [];
            var count = scene.tier > 0 ? 22 : 9;
            for (var index = 0; index < count; index++) state.flies.push({ x: scene.random() * scene.width, y: scene.random() * scene.height, phase: scene.random() * 6, size: 8 + scene.random() * 10, color: ['#ff9f1c', '#c77dff', '#7bdff2', '#ff85a1', '#ffe066'][index % 5], offset: scene.random() * 6 });
            state.pollen = [];
        },
        add: function (scene, state, x, y) {
            state.flies.push({ x: x, y: y, phase: scene.random() * 6, size: 8 + scene.random() * 10, color: ['#ff9f1c', '#c77dff', '#7bdff2', '#ff85a1', '#ffe066'][state.flies.length % 5], offset: scene.random() * 6 });
            if (state.flies.length > 70) state.flies.shift();
        },
        draw: function (scene, state, ctx, time, dt) {
            state.flies.forEach(function (fly) {
                var goalX = scene.pointer.active ? scene.pointer.x + Math.cos(time * 0.0012 + fly.offset) * 110 : scene.width * (0.5 + Math.cos(time * 0.0003 + fly.offset) * 0.45);
                var goalY = scene.pointer.active ? scene.pointer.y + Math.sin(time * 0.0015 + fly.offset) * 80 : scene.height * (0.5 + Math.sin(time * 0.0004 + fly.offset) * 0.4);
                fly.x += (goalX - fly.x) * dt * 0.8;
                fly.y += (goalY - fly.y) * dt * 0.8;
                var flap = Math.abs(Math.sin(time * 0.018 + fly.phase));
                ctx.globalAlpha = 0.92;
                ctx.fillStyle = fly.color;
                ctx.beginPath();
                ctx.ellipse(fly.x - fly.size * 0.5 * flap, fly.y - 2, fly.size * 0.6 * flap + 1, fly.size * 0.7, -0.4, 0, Math.PI * 2);
                ctx.ellipse(fly.x + fly.size * 0.5 * flap, fly.y - 2, fly.size * 0.6 * flap + 1, fly.size * 0.7, 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#20182a';
                ctx.fillRect(fly.x - 1, fly.y - fly.size * 0.6, 2, fly.size * 1.1);
            });
            if (scene.random() < dt * 8) state.pollen.push({ x: scene.random() * scene.width, y: scene.height, life: 1 });
            state.pollen = state.pollen.filter(function (grain) {
                grain.life -= dt * 0.2;
                grain.y -= 28 * dt;
                grain.x += Math.sin(time * 0.002 + grain.y * 0.02) * 12 * dt;
                ctx.globalAlpha = Math.max(0, grain.life) * 0.7;
                ctx.fillStyle = '#fff3a8';
                ctx.fillRect(grain.x, grain.y, 2, 2);
                return grain.life > 0;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            for (var index = 0; index < 4; index++) pieces.butterfly_garden.add(scene, state, x, y);
            scene.burst(x, y, '#fff3a8', 12);
        }
    };

    pieces.sun_flare = {
        build: function (scene, state) { state.pulse = 0; },
        draw: function (scene, state, ctx, time, dt) {
            var sx = scene.width * 0.92;
            var sy = 70;
            state.pulse = Math.max(0, state.pulse - dt * 0.9);
            var px = scene.pointer.active ? scene.pointer.x : scene.width * 0.4;
            var py = scene.pointer.active ? scene.pointer.y : scene.height * 0.6;
            scene.glow(sx, sy, 170 + state.pulse * 180, '#ffd166', 0.42 + state.pulse * 0.3);
            ctx.strokeStyle = 'rgba(255,225,130,0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (var ray = 0; ray < 12; ray++) {
                var angle = (ray / 12) * Math.PI * 2 + time * 0.0002;
                ctx.moveTo(sx + Math.cos(angle) * 60, sy + Math.sin(angle) * 60);
                ctx.lineTo(sx + Math.cos(angle) * (110 + state.pulse * 120), sy + Math.sin(angle) * (110 + state.pulse * 120));
            }
            ctx.stroke();
            [0.25, 0.5, 0.72, 1.1].forEach(function (ratio, index) {
                var x = sx + (px - sx) * ratio;
                var y = sy + (py - sy) * ratio;
                scene.glow(x, y, 26 + index * 14, ['#ffd166', '#7bdff2', '#ff85a1', '#ffffff'][index], 0.14);
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            state.pulse = 1;
            scene.burst(x, y, '#ffd166', 14);
        }
    };

    pieces.beach_crab = {
        build: function (scene, state) { state.crab = { x: scene.width * 0.3, vx: 40, hop: 0 }; state.castles = []; },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            var sand = Math.min(90, strip(scene) * 0.42);
            ctx.globalAlpha = 0.86;
            ctx.fillStyle = '#d6b679';
            ctx.beginPath();
            ctx.moveTo(0, base);
            for (var x = 0; x <= scene.width; x += 60) ctx.lineTo(x, base - sand + Math.sin(x * 0.01) * 10);
            ctx.lineTo(scene.width, base);
            ctx.fill();
            var palmX = scene.width - 110;
            var palmH = Math.min(300, scene.height * 0.42);
            ctx.strokeStyle = '#5a3a22';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(palmX, base - sand + 8);
            ctx.quadraticCurveTo(palmX - 30, base - palmH * 0.6, palmX + 16, base - palmH);
            ctx.stroke();
            ctx.fillStyle = '#1f7a4a';
            for (var frond = 0; frond < 7; frond++) {
                var angle = (frond / 7) * Math.PI * 2 + Math.sin(time * 0.001 + frond) * 0.08;
                var tipX = palmX + 16 + Math.cos(angle) * 96;
                var tipY = base - palmH + Math.sin(angle) * 42 + 24;
                polygon(ctx, [[palmX + 16, base - palmH], [tipX, tipY], [palmX + 16 + Math.cos(angle + 0.4) * 42, base - palmH + 10]]);
            }
            var crab = state.crab;
            if (scene.pointer.active && Math.abs(scene.pointer.x - crab.x) < 130 && scene.pointer.y > base - 200) crab.vx = (crab.x > scene.pointer.x ? 1 : -1) * 170;
            else crab.vx += ((crab.vx > 0 ? 34 : -34) - crab.vx) * dt;
            crab.x += crab.vx * dt;
            if (crab.x < 30 || crab.x > scene.width - 30) crab.vx = -crab.vx;
            crab.hop = Math.max(0, crab.hop - dt * 1.8);
            var cy = base - sand * 0.5 - Math.sin(crab.hop * Math.PI) * 54;
            ctx.fillStyle = '#e8483a';
            ctx.beginPath();
            ctx.ellipse(crab.x, cy, 17, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e8483a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (var leg = -1; leg <= 1; leg += 2) {
                for (var pair = 0; pair < 3; pair++) {
                    ctx.moveTo(crab.x + leg * 11, cy + 4 + pair * 2);
                    ctx.lineTo(crab.x + leg * 24, cy + 11 + pair * 2 + Math.sin(time * 0.03 + pair) * 3);
                }
            }
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(crab.x - 7, cy - 16, 4, 4);
            ctx.fillRect(crab.x + 3, cy - 16, 4, 4);
            state.castles.forEach(function (castle) {
                ctx.fillStyle = '#c9a767';
                ctx.fillRect(castle.x - 22, base - sand * 0.5 - 18, 44, 22);
                ctx.fillRect(castle.x - 26, base - sand * 0.5 - 30, 14, 14);
                ctx.fillRect(castle.x + 12, base - sand * 0.5 - 30, 14, 14);
                ctx.fillStyle = '#ff4d6d';
                polygon(ctx, [[castle.x, base - sand * 0.5 - 46], [castle.x + 14, base - sand * 0.5 - 40], [castle.x, base - sand * 0.5 - 34]]);
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            if (Math.abs(state.crab.x - x) < 44) state.crab.hop = 1;
            else if (y > scene.height - 110) {
                state.castles.push({ x: x });
                if (state.castles.length > 6) state.castles.shift();
            }
        }
    };

    pieces.coral_reef = {
        build: function (scene, state) {
            state.fish = [];
            var count = scene.tier > 0 ? 34 : 14;
            for (var index = 0; index < count; index++) state.fish.push({ x: scene.random() * scene.width, y: scene.height * (0.45 + scene.random() * 0.5), vx: (scene.random() < 0.5 ? -1 : 1) * (36 + scene.random() * 40), vy: 0, size: 7 + scene.random() * 9, color: ['#ff9f1c', '#7bdff2', '#ffe066', '#ff6b9d', '#b0ff92'][index % 5] });
            state.jellies = [0.16, 0.42, 0.7].map(function (ratio, index) { return { x: ratio * scene.width, y: scene.height * 0.5, phase: index * 2 }; });
            state.bubbles = [];
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            for (var plant = 0; plant < Math.round(scene.width / 90); plant++) {
                var x = plant * 90 + 30;
                ctx.globalAlpha = 0.7;
                ctx.strokeStyle = plant % 2 ? '#1f8a5c' : '#c2527a';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(x, base);
                for (var segment = 1; segment <= 5; segment++) ctx.lineTo(x + Math.sin(time * 0.0013 + plant + segment * 0.6) * segment * 3.2, base - segment * 18);
                ctx.stroke();
            }
            state.fish.forEach(function (fish) {
                if (scene.pointer.active) {
                    var dx = fish.x - scene.pointer.x;
                    var dy = fish.y - scene.pointer.y;
                    var distance = dx * dx + dy * dy;
                    if (distance < 19600) {
                        fish.vx += (dx > 0 ? 1 : -1) * 520 * dt;
                        fish.vy += (dy > 0 ? 1 : -1) * 300 * dt;
                    }
                }
                fish.vx += ((fish.vx > 0 ? 1 : -1) * 44 - fish.vx) * dt * 0.7;
                fish.vy *= 0.97;
                fish.x += fish.vx * dt;
                fish.y += fish.vy * dt;
                fish.y = Math.max(scene.height * 0.35, Math.min(base - 12, fish.y));
                if (fish.x < -20) fish.x = scene.width + 20;
                if (fish.x > scene.width + 20) fish.x = -20;
                var dir = fish.vx > 0 ? 1 : -1;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = fish.color;
                ctx.beginPath();
                ctx.ellipse(fish.x, fish.y, fish.size, fish.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                polygon(ctx, [[fish.x - dir * fish.size * 0.8, fish.y], [fish.x - dir * fish.size * 1.5, fish.y - fish.size * 0.55], [fish.x - dir * fish.size * 1.5, fish.y + fish.size * 0.55]]);
            });
            state.jellies.forEach(function (jelly) {
                var pulse = Math.sin(time * 0.003 + jelly.phase);
                jelly.y -= (pulse > 0 ? 22 : -8) * dt;
                if (jelly.y < scene.height * 0.28) jelly.y = scene.height * 0.8;
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#d8b4fe';
                ctx.beginPath();
                ctx.ellipse(jelly.x, jelly.y, 26 + pulse * 6, 17 - pulse * 3, 0, Math.PI, 0);
                ctx.fill();
                ctx.strokeStyle = '#d8b4fe';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (var tail = -2; tail <= 2; tail++) {
                    ctx.moveTo(jelly.x + tail * 9, jelly.y);
                    ctx.quadraticCurveTo(jelly.x + tail * 12 + pulse * 7, jelly.y + 26, jelly.x + tail * 8, jelly.y + 48);
                }
                ctx.stroke();
            });
            ctx.strokeStyle = 'rgba(255,255,255,0.65)';
            ctx.lineWidth = 1;
            state.bubbles = state.bubbles.filter(function (bubble) {
                bubble.y -= 70 * dt;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(bubble.x + Math.sin(bubble.y * 0.05) * 5, bubble.y, bubble.size, 0, Math.PI * 2);
                ctx.stroke();
                return bubble.y > 0;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            for (var index = 0; index < 12; index++) state.bubbles.push({ x: x + (scene.random() - 0.5) * 40, y: y + scene.random() * 30, size: 2 + scene.random() * 6 });
        }
    };

    pieces.sunset_sail = {
        build: function (scene, state) { state.boat = scene.width * 0.4; state.gulls = []; for (var index = 0; index < 5; index++) state.gulls.push({ x: scene.random() * scene.width, y: 60 + scene.random() * 120, phase: scene.random() * 6 }); state.splashes = []; },
        draw: function (scene, state, ctx, time, dt) {
            var horizon = scene.height - strip(scene) * 0.62;
            var sunX = scene.width * 0.74;
            scene.glow(sunX, horizon, 230, '#ff9f4a', 0.55);
            ctx.globalAlpha = 0.72;
            ctx.fillStyle = '#ff7a3c';
            ctx.beginPath();
            ctx.arc(sunX, horizon, 70, Math.PI, 0);
            ctx.fill();
            var gradient = ctx.createLinearGradient(0, horizon, 0, scene.height);
            gradient.addColorStop(0, 'rgba(255,130,70,0.42)');
            gradient.addColorStop(1, 'rgba(20,40,90,0.72)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, horizon, scene.width, scene.height - horizon);
            ctx.fillStyle = 'rgba(255,190,120,0.5)';
            for (var line = 0; line < 9; line++) {
                var width = 110 - line * 8 + Math.sin(time * 0.002 + line) * 16;
                ctx.fillRect(sunX - width / 2 + Math.sin(time * 0.0015 + line) * 6, horizon + 6 + line * 11, width, 3);
            }
            var goal = scene.pointer.active ? scene.pointer.x : scene.width * 0.4;
            state.boat += (goal - state.boat) * dt * 0.25;
            var bob = Math.sin(time * 0.002) * 4;
            var by = horizon + 34 + bob;
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = '#17121f';
            polygon(ctx, [[state.boat - 40, by], [state.boat + 40, by], [state.boat + 26, by + 14], [state.boat - 26, by + 14]]);
            ctx.fillRect(state.boat - 1.5, by - 62, 3, 62);
            ctx.fillStyle = '#fff3e2';
            polygon(ctx, [[state.boat + 3, by - 60], [state.boat + 36, by - 8], [state.boat + 3, by - 8]]);
            ctx.fillStyle = '#ff85a1';
            polygon(ctx, [[state.boat - 3, by - 50], [state.boat - 30, by - 8], [state.boat - 3, by - 8]]);
            ctx.strokeStyle = '#1a1a22';
            ctx.lineWidth = 2;
            ctx.beginPath();
            state.gulls.forEach(function (gull) {
                gull.x += 30 * dt;
                if (gull.x > scene.width + 20) gull.x = -20;
                var flap = Math.sin(time * 0.009 + gull.phase) * 6;
                ctx.moveTo(gull.x - 12, gull.y - flap);
                ctx.quadraticCurveTo(gull.x - 5, gull.y - 5, gull.x, gull.y);
                ctx.quadraticCurveTo(gull.x + 5, gull.y - 5, gull.x + 12, gull.y - flap);
            });
            ctx.stroke();
            drawRings(ctx, state, dt, 60, true);
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            rings(state, x, Math.max(y, scene.height - strip(scene) * 0.5), '#ffe0b8');
            scene.burst(x, y, '#ffd166', 12);
        }
    };

    pieces.bioluminescence = {
        build: function (scene, state) { state.trail = []; state.ripples = []; state.sparks = []; for (var index = 0; index < (scene.tier > 0 ? 90 : 36); index++) state.sparks.push({ x: scene.random() * scene.width, y: scene.height - scene.random() * strip(scene) * 0.7, phase: scene.random() * 6 }); },
        draw: function (scene, state, ctx, time, dt) {
            var top = scene.height - strip(scene) * 0.7;
            var gradient = ctx.createLinearGradient(0, top, 0, scene.height);
            gradient.addColorStop(0, 'rgba(0,60,90,0)');
            gradient.addColorStop(1, 'rgba(0,90,130,0.5)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, top, scene.width, scene.height - top);
            for (var wave = 0; wave < 3; wave++) {
                ctx.beginPath();
                for (var x = 0; x <= scene.width; x += 28) {
                    var y = scene.height - 12 - wave * 18 + Math.sin(x * 0.011 + time * 0.0013 + wave * 1.7) * 7;
                    var boost = scene.pointer.active ? Math.max(0, 1 - Math.abs(scene.pointer.x - x) / 200) : 0;
                    if (x === 0) ctx.moveTo(x, y - boost * 8);
                    else ctx.lineTo(x, y - boost * 8);
                }
                ctx.strokeStyle = 'rgba(40,255,235,' + (0.5 - wave * 0.12) + ')';
                ctx.lineWidth = 2.2;
                ctx.stroke();
            }
            state.sparks.forEach(function (spark) {
                var close = scene.pointer.active ? Math.max(0, 1 - Math.hypot(scene.pointer.x - spark.x, scene.pointer.y - spark.y) / 170) : 0;
                ctx.globalAlpha = Math.max(close, Math.sin(time * 0.002 + spark.phase) * 0.35 + 0.25);
                ctx.fillStyle = '#7dfff0';
                ctx.fillRect(spark.x, spark.y, 2 + close * 2, 2 + close * 2);
            });
            if (scene.pointer.active) {
                state.trail.push({ x: scene.pointer.x, y: scene.pointer.y, life: 1 });
                if (state.trail.length > 42) state.trail.shift();
            }
            state.trail.forEach(function (point) {
                point.life -= dt * 0.9;
                scene.glow(point.x, point.y, 18, '#2bffe0', Math.max(0, point.life) * 0.26);
            });
            drawRings(ctx, state, dt, 110, true);
            shootingStars(scene, state, ctx, time, dt);
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            rings(state, x, y, '#2bffe0');
            rings(state, x, y, '#ffffff');
            scene.burst(x, y, '#2bffe0', 18);
        }
    };

    pieces.leaf_pile = {
        build: function (scene, state) {
            state.leaves = [];
            var count = Math.min(190, Math.round(scene.width / (scene.tier > 0 ? 8 : 20)));
            for (var index = 0; index < count; index++) {
                state.leaves.push({ x: scene.random() * scene.width, baseY: scene.height - 4 - scene.random() * 26, y: 0, vy: 0, vx: 0, air: false, color: ['#d9622b', '#e8a33d', '#b23a1e', '#c9852d'][index % 4], rotation: scene.random() * 6, size: 5 + scene.random() * 6 });
                state.leaves[index].y = state.leaves[index].baseY;
            }
        },
        kick: function (state, x, power) {
            state.leaves.forEach(function (leaf) {
                var distance = Math.abs(leaf.x - x);
                if (distance < 120) {
                    leaf.air = true;
                    leaf.vy = -(1 - distance / 120) * power - 30;
                    leaf.vx = (leaf.x - x) * 1.4;
                }
            });
        },
        draw: function (scene, state, ctx, time, dt) {
            if (scene.pointer.active && scene.pointer.y > scene.height - 70) {
                state.leaves.forEach(function (leaf) {
                    if (!leaf.air && Math.abs(leaf.x - scene.pointer.x) < 34) {
                        leaf.air = true;
                        leaf.vy = -90;
                        leaf.vx = (leaf.x - scene.pointer.x) * 2.4;
                    }
                });
            }
            state.leaves.forEach(function (leaf) {
                if (leaf.air) {
                    leaf.vy += 180 * dt;
                    leaf.x += leaf.vx * dt;
                    leaf.y += leaf.vy * dt;
                    leaf.rotation += dt * 5;
                    if (leaf.y >= leaf.baseY) { leaf.y = leaf.baseY; leaf.air = false; }
                }
                ctx.save();
                ctx.translate(leaf.x, leaf.y);
                ctx.rotate(leaf.rotation);
                ctx.globalAlpha = 0.92;
                ctx.fillStyle = leaf.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) { pieces.leaf_pile.kick(state, x, 390); }
    };

    pieces.windy_forest = {
        build: function (scene, state) {
            state.trees = [];
            var count = Math.max(5, Math.round(scene.width / 210));
            for (var index = 0; index < count; index++) state.trees.push({ x: (index + 0.5) * scene.width / count, height: 120 + scene.random() * 110, phase: scene.random() * 6, color: ['#a8501e', '#c97a1e', '#8c3b1a', '#d9962c'][index % 4] });
            state.gust = 0;
            state.flying = [];
        },
        draw: function (scene, state, ctx, time, dt) {
            state.gust = Math.max(0, state.gust - dt * 0.55);
            var base = scene.height;
            var mouse = scene.pointer.active ? (scene.pointer.x / scene.width - 0.5) * 16 : 0;
            state.trees.forEach(function (tree) {
                var bend = Math.sin(time * 0.0014 + tree.phase) * 7 + state.gust * 44 + mouse;
                var topX = tree.x + bend;
                ctx.globalAlpha = 0.86;
                ctx.strokeStyle = '#2a1a12';
                ctx.lineWidth = 11;
                ctx.beginPath();
                ctx.moveTo(tree.x, base);
                ctx.quadraticCurveTo(tree.x, base - tree.height * 0.5, topX, base - tree.height * 0.82);
                ctx.stroke();
                ctx.fillStyle = tree.color;
                [[0, 0.9, 0.34], [-0.2, 0.76, 0.27], [0.2, 0.74, 0.28]].forEach(function (cloud) {
                    ctx.beginPath();
                    ctx.arc(topX + cloud[0] * tree.height, base - tree.height * cloud[1], tree.height * cloud[2], 0, Math.PI * 2);
                    ctx.fill();
                });
            });
            state.flying = state.flying.filter(function (leaf) {
                leaf.x += (120 + state.gust * 560) * dt;
                leaf.y += Math.sin(time * 0.005 + leaf.phase) * 50 * dt + 18 * dt;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = leaf.color;
                ctx.save();
                ctx.translate(leaf.x, leaf.y);
                ctx.rotate(time * 0.005 + leaf.phase);
                ctx.fillRect(-5, -2.5, 10, 5);
                ctx.restore();
                return leaf.x < scene.width + 20 && leaf.y < scene.height + 20;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state) {
            state.gust = 1;
            state.trees.forEach(function (tree) {
                for (var index = 0; index < 5; index++) state.flying.push({ x: tree.x, y: scene.height - tree.height * (0.6 + scene.random() * 0.4), phase: scene.random() * 6, color: tree.color });
            });
            if (state.flying.length > 150) state.flying.splice(0, state.flying.length - 150);
        }
    };

    pieces.harvest_farm = {
        build: function (scene, state) {
            state.crows = [];
            for (var index = 0; index < 7; index++) state.crows.push({ x: scene.width * (0.1 + index * 0.08), y: scene.height - 62, vx: 0, vy: 0, flying: false, home: scene.height - 62, phase: scene.random() * 6 });
        },
        draw: function (scene, state, ctx, time, dt) {
            var base = scene.height;
            var barnX = scene.width - 240;
            ctx.globalAlpha = 0.88;
            ctx.fillStyle = '#6a1f1a';
            ctx.fillRect(barnX, base - 120, 170, 120);
            ctx.fillStyle = '#3f1412';
            polygon(ctx, [[barnX - 14, base - 120], [barnX + 85, base - 186], [barnX + 184, base - 120]]);
            ctx.strokeStyle = '#efe0c8';
            ctx.lineWidth = 3;
            ctx.strokeRect(barnX + 58, base - 74, 54, 74);
            ctx.beginPath();
            ctx.moveTo(barnX + 58, base - 74);
            ctx.lineTo(barnX + 112, base);
            ctx.moveTo(barnX + 112, base - 74);
            ctx.lineTo(barnX + 58, base);
            ctx.stroke();
            var scareX = scene.width * 0.42;
            var sway = Math.sin(time * 0.0016) * 3 + (near(scene, scareX, base - 80, 150) ? Math.sin(time * 0.02) * 9 : 0);
            ctx.strokeStyle = '#5a3a22';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(scareX, base);
            ctx.lineTo(scareX, base - 110);
            ctx.moveTo(scareX - 44, base - 86 + sway);
            ctx.lineTo(scareX + 44, base - 86 - sway);
            ctx.stroke();
            ctx.fillStyle = '#b86a1f';
            ctx.fillRect(scareX - 22, base - 96, 44, 50);
            ctx.fillStyle = '#e8c58a';
            ctx.beginPath();
            ctx.arc(scareX, base - 118, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a2418';
            polygon(ctx, [[scareX - 22, base - 126], [scareX, base - 152], [scareX + 22, base - 126]]);
            ctx.fillStyle = '#c9a23c';
            [0.2, 0.3, 0.62].forEach(function (ratio) {
                ctx.beginPath();
                ctx.ellipse(scene.width * ratio, base - 18, 46, 24, 0, Math.PI, 0);
                ctx.fill();
            });
            ctx.fillStyle = '#0f0d14';
            state.crows.forEach(function (crow) {
                if (!crow.flying && near(scene, crow.x, crow.y, 150)) {
                    crow.flying = true;
                    crow.vx = (crow.x > scene.pointer.x ? 1 : -1) * (120 + scene.random() * 80);
                    crow.vy = -130 - scene.random() * 90;
                }
                if (crow.flying) {
                    crow.x += crow.vx * dt;
                    crow.y += crow.vy * dt;
                    crow.vy += 14 * dt;
                    if (crow.y > crow.home) { crow.y = crow.home; crow.flying = false; }
                    if (crow.x < 10 || crow.x > scene.width - 10) crow.vx = -crow.vx;
                    var flap = Math.sin(time * 0.02 + crow.phase) * 10;
                    polygon(ctx, [[crow.x - 14, crow.y - flap], [crow.x, crow.y], [crow.x + 14, crow.y - flap], [crow.x, crow.y + 4]]);
                } else {
                    ctx.beginPath();
                    ctx.ellipse(crow.x, crow.y, 9, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(crow.x + 7, crow.y - 6, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x) {
            state.crows.forEach(function (crow) {
                crow.flying = true;
                crow.vx = (crow.x > x ? 1 : -1) * (150 + scene.random() * 90);
                crow.vy = -210 - scene.random() * 80;
            });
        }
    };

    pieces.misty_lake = {
        build: function (scene, state) { state.ducks = [{ x: scene.width * 0.3, dir: 1 }, { x: scene.width * 0.34, dir: 1 }, { x: scene.width * 0.38, dir: 1 }]; },
        draw: function (scene, state, ctx, time, dt) {
            var top = scene.height - strip(scene) * 0.56;
            ctx.globalAlpha = 0.72;
            ctx.fillStyle = '#233040';
            ctx.beginPath();
            ctx.moveTo(0, top);
            for (var x = 0; x <= scene.width; x += 70) ctx.lineTo(x, top - 26 - Math.abs(Math.sin(x * 0.012)) * 48);
            ctx.lineTo(scene.width, top);
            ctx.fill();
            var gradient = ctx.createLinearGradient(0, top, 0, scene.height);
            gradient.addColorStop(0, 'rgba(120,150,170,0.5)');
            gradient.addColorStop(1, 'rgba(30,50,70,0.72)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, top, scene.width, scene.height - top);
            ctx.fillStyle = 'rgba(217,120,50,0.2)';
            for (var reflection = 0; reflection < 7; reflection++) {
                ctx.fillRect(scene.width * (reflection / 7), top + 4 + (reflection % 3) * 14, 90 + Math.sin(time * 0.001 + reflection) * 22, 3);
            }
            if (scene.tier > 0) {
                for (var cloud = 0; cloud < 5; cloud++) {
                    var mx = ((time * 0.01 * (cloud + 1) + cloud * 260) % (scene.width + 500)) - 250;
                    scene.glow(mx, top - 4, 170, '#d6dde8', 0.13);
                }
            }
            var pointerX = scene.pointer.active ? scene.pointer.x : -999;
            ctx.globalAlpha = 0.96;
            state.ducks.forEach(function (duck, index) {
                if (Math.abs(pointerX - duck.x) < 110) duck.dir = duck.x > pointerX ? 1 : -1;
                duck.x += duck.dir * 26 * dt;
                if (duck.x < 20) duck.dir = 1;
                if (duck.x > scene.width - 20) duck.dir = -1;
                var y = top + 30 + index * 4 + Math.sin(time * 0.002 + index) * 2;
                ctx.fillStyle = '#efe7d6';
                ctx.beginPath();
                ctx.ellipse(duck.x, y, 15, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(duck.x + duck.dir * 12, y - 9, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#e8983a';
                ctx.fillRect(duck.x + duck.dir * 15 - (duck.dir < 0 ? 6 : 0), y - 10, 6, 3);
            });
            drawRings(ctx, state, dt, 58, true);
            ctx.globalAlpha = 1;
        },
        click: function (scene, state, x, y) {
            var top = scene.height - strip(scene) * 0.56;
            rings(state, x, Math.max(y, top + 10), '#dfeaf2');
            rings(state, x, Math.max(y, top + 10), '#ffffff');
        }
    };

    pieces.squirrel_canopy = {
        build: function (scene, state) {
            state.squirrel = { x: scene.width * 0.3, vx: 0 };
            state.acorns = [];
            state.leaves = [];
            for (var index = 0; index < 60; index++) state.leaves.push({ t: scene.random(), drop: scene.random() * 80, size: 7 + scene.random() * 11, color: ['#d9622b', '#e8a33d', '#b23a1e', '#d9962c'][index % 4] });
        },
        draw: function (scene, state, ctx, time, dt) {
            var branch = 62;
            for (var ray = 0; ray < 4; ray++) {
                ctx.globalAlpha = 0.09 + Math.sin(time * 0.0007 + ray) * 0.03;
                ctx.fillStyle = '#ffd98a';
                var rx = scene.width * (0.2 + ray * 0.2);
                polygon(ctx, [[rx, 0], [rx + 90, 0], [rx + 280, scene.height], [rx + 60, scene.height]]);
            }
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#3a2418';
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.moveTo(0, branch - 14);
            ctx.quadraticCurveTo(scene.width / 2, branch + 22 + Math.sin(time * 0.001) * 4, scene.width, branch - 14);
            ctx.stroke();
            state.leaves.forEach(function (leaf) {
                var x = leaf.t * scene.width;
                var y = branch - 22 + leaf.drop * 0.62 + Math.sin(time * 0.001 + leaf.t * 40) * 3;
                ctx.globalAlpha = 0.86;
                ctx.fillStyle = leaf.color;
                ctx.beginPath();
                ctx.ellipse(x, y, leaf.size, leaf.size * 0.56, leaf.t * 8, 0, Math.PI * 2);
                ctx.fill();
            });
            var squirrel = state.squirrel;
            var goal = scene.pointer.active ? scene.pointer.x : scene.width * (0.5 + Math.sin(time * 0.0002) * 0.4);
            squirrel.vx = (goal - squirrel.x) * 2.2;
            squirrel.vx = Math.max(-340, Math.min(340, squirrel.vx));
            squirrel.x += squirrel.vx * dt;
            var ratio = squirrel.x / scene.width;
            var sy = branch - 14 + 4 * ratio * (1 - ratio) * 36 - 12 - Math.abs(Math.sin(time * 0.016)) * (Math.abs(squirrel.vx) > 20 ? 7 : 0);
            var dir = squirrel.vx >= 0 ? 1 : -1;
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#8c4a1e';
            ctx.beginPath();
            ctx.ellipse(squirrel.x, sy, 15, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(squirrel.x + dir * 14, sy - 6, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(squirrel.x - dir * 18, sy - 12, 8, 15, dir * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#6b4a2f';
            state.acorns = state.acorns.filter(function (acorn) {
                acorn.vy += 320 * dt;
                acorn.y += acorn.vy * dt;
                ctx.save();
                ctx.translate(acorn.x, acorn.y);
                ctx.rotate(acorn.y * 0.03);
                ctx.fillStyle = '#b8782f';
                ctx.beginPath();
                ctx.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#5a3a22';
                ctx.fillRect(-7, -6, 14, 5);
                ctx.restore();
                if (acorn.y > scene.height - 8) {
                    scene.burst(acorn.x, scene.height - 8, '#d9962c', 12);
                    return false;
                }
                return true;
            });
            ctx.globalAlpha = 1;
        },
        click: function (scene, state) {
            for (var index = 0; index < 3; index++) state.acorns.push({ x: state.squirrel.x + (index - 1) * 16, y: 80, vy: 20 * index });
        }
    };

    global.RWLScenePieces = pieces;
})(window);
