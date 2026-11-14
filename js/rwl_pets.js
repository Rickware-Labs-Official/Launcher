(function (global) {
    if (global.RWLPets) return;

    var uid = 0;
    var KEEP = '--rwl-keep:1;';
    var CENTER_X = 50;
    var CENTER_Y = 54;

    function star(cx, cy, radius, className) {
        var points = [];
        for (var index = 0; index < 10; index++) {
            var angle = -Math.PI / 2 + index * Math.PI / 5;
            var length = index % 2 ? radius * 0.45 : radius;
            points.push((cx + Math.cos(angle) * length).toFixed(1) + ',' + (cy + Math.sin(angle) * length).toFixed(1));
        }
        return '<polygon points="' + points.join(' ') + '" class="' + (className || 'pd-b') + '"/>';
    }

    function heart(cx, cy, size, className) {
        var s = size;
        return '<path d="M' + cx + ' ' + (cy + s * 0.9) + 'c' + (-s * 1.5) + ' ' + (-s * 0.9) + ' ' + (-s * 1.1) + ' ' + (-s * 2.1) + ' 0 ' + (-s * 1.2) + 'c' + (s * 1.1) + ' ' + (-s * 0.9) + ' ' + (s * 1.5) + ' ' + (s * 0.3) + ' 0 ' + (s * 1.2) + 'z" class="' + (className || 'pd-a') + '"/>';
    }

    function onCircle(count, radius, draw, offset) {
        var out = '';
        for (var index = 0; index < count; index++) {
            var angle = (offset || 0) + index * Math.PI * 2 / count;
            out += draw(CENTER_X + Math.cos(angle) * radius, CENTER_Y + Math.sin(angle) * radius, index, angle * 180 / Math.PI);
        }
        return out;
    }

    function mirrored(left) {
        return '<g class="pd-flap-l">' + left + '</g><g class="pd-flap-r"><g transform="matrix(-1 0 0 1 100 0)">' + left + '</g></g>';
    }

    function scatter(count, seed, draw) {
        var out = '';
        var value = seed;
        for (var index = 0; index < count; index++) {
            value = (value * 73 + 41) % 997;
            var x = 6 + (value % 89);
            value = (value * 73 + 41) % 997;
            var y = 8 + (value % 86);
            if (Math.abs(x - CENTER_X) < 24 && Math.abs(y - CENTER_Y) < 26) x = x < CENTER_X ? x - 26 : x + 26;
            out += draw(Math.max(4, Math.min(96, x)), y, index);
        }
        return out;
    }

    var BODIES = {
        blob: { outline: 'M18 62c0-24 14-40 32-40s32 16 32 40c0 14-12 22-32 22S18 76 18 62z', front: '<ellipse cx="50" cy="78" rx="24" ry="5" class="cp-shade"/>' },
        bot: { outline: 'M34 30h32a12 12 0 0 1 12 12v24a12 12 0 0 1-12 12H34a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12z', back: '<line x1="50" y1="30" x2="50" y2="16" class="cp-line"/><circle cx="50" cy="13" r="5" class="cp-accent"/>', front: '<rect x="30" y="70" width="40" height="8" rx="4" class="cp-shade"/>' },
        flask: { outline: 'M40 18h20v18l18 34a10 10 0 0 1-9 14H31a10 10 0 0 1-9-14l18-34z', front: '<path d="M28 66h44l4 8a7 7 0 0 1-6 10H30a7 7 0 0 1-6-10z" class="cp-accent" opacity="0.55"/><circle cx="34" cy="74" r="3" class="cp-bubble"/><circle cx="66" cy="77" r="2" class="cp-bubble"/><rect x="38" y="14" width="24" height="6" rx="3" class="cp-shade"/>' },
        atom: { outline: 'M26 52a24 24 0 1 0 48 0a24 24 0 1 0-48 0z', back: '<ellipse cx="50" cy="52" rx="40" ry="14" class="cp-orbit"/><ellipse cx="50" cy="52" rx="40" ry="14" transform="rotate(60 50 52)" class="cp-orbit"/><ellipse cx="50" cy="52" rx="40" ry="14" transform="rotate(-60 50 52)" class="cp-orbit"/>' },
        slime: { outline: 'M16 80c0-30 14-52 34-52s34 22 34 52c-6 4-12 0-17 4-5 4-10 0-17 0s-12 4-17 0c-5-4-11 0-17-4z', front: '<circle cx="72" cy="40" r="4" class="cp-bubble"/>' },
        cat: { outline: 'M22 60c0-12 3-20 8-26l-4-16 16 8c5-2 11-2 16 0l16-8-4 16c5 6 8 14 8 26 0 14-12 24-28 24S22 74 22 60z', back: '<path d="M74 76q16-2 12-20" class="cp-tail"/>', front: '<path d="M30 58l-12-2M30 62l-12 2M70 58l12-2M70 62l12 2" class="cp-whisker"/><path d="M29 30l1-7 6 3zM71 30l-1-7-6 3z" class="cp-accent"/>' },
        fox: { outline: 'M20 58l6-36 16 14q8-3 16 0l16-14 6 36c0 16-12 26-30 26S20 74 20 58z', back: '<path d="M72 78q22 2 18-22-6 4-8 14z" class="cp-accent"/>', front: '<path d="M34 66q16 18 32 0-16-8-32 0z" class="cp-belly"/><path d="M28 32l1-6 5 4zM72 32l-1-6-5 4z" class="cp-shade"/>' },
        owl: { outline: 'M24 44c0-14 10-22 26-22s26 8 26 22v18c0 14-10 22-26 22S24 76 24 62z', back: '<path d="M28 36l-6-16 16 8zM72 36l6-16-16 8z" class="cp-body"/>', front: '<circle cx="41" cy="51" r="9.5" class="cp-belly"/><circle cx="59" cy="51" r="9.5" class="cp-belly"/><path d="M46.5 57l3.5 7 3.5-7z" class="cp-beak"/><path d="M38 72q12 8 24 0" class="cp-whisker"/>' },
        dragon: { outline: 'M22 60c0-22 12-36 28-36s28 14 28 36c0 14-12 24-28 24S22 74 22 60z', back: '<path d="M36 30l-8-16 14 8zM64 30l8-16-14 8z" class="cp-accent"/><path d="M24 58l-18-12 4 22zM76 58l18-12-4 22z" class="cp-accent"/>', front: '<ellipse cx="50" cy="75" rx="14" ry="7" class="cp-belly" opacity="0.7"/><path d="M46 28l4-8 4 8z" class="cp-accent"/>' },
        ghost: { outline: 'M22 54c0-20 12-32 28-32s28 12 28 32v30l-9-6-9 6-10-6-10 6-9-6-9 6z', front: '' },
        shroom: { outline: 'M14 50c0-18 16-30 36-30s36 12 36 30c0 4-4 6-10 6h-8v18a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10V56h-8c-6 0-10-2-10-6z', front: '<circle cx="30" cy="36" r="5" class="cp-belly"/><circle cx="52" cy="29" r="4" class="cp-belly"/><circle cx="72" cy="40" r="3.5" class="cp-belly"/>' },
        crystal: { outline: 'M50 16l26 22-8 42H32l-8-42z', front: '<path d="M50 16l-12 22M50 16l12 22M24 38h52" class="cp-facet"/>' },
        cloud: { outline: 'M30 82a17 17 0 0 1-5-33 19 19 0 0 1 36-9 17 17 0 0 1 16 23 12 12 0 0 1-5 19z', front: '' },
        star: { outline: 'M50 18L60.6 39.4 84.2 42.9 67.1 59.5 71.2 83 50 71.9 28.8 83 32.9 59.5 15.8 42.9 39.4 39.4z', front: '' },
        octo: { outline: 'M24 50c0-16 11-28 26-28s26 12 26 28v12q8 6 6 14t-10 4q-2 8-9 6t-5-8q-4 8-10 6t-6-8q-4 8-10 6t-6-8q-8 6-12 0t4-12z', front: '<circle cx="34" cy="74" r="2" class="cp-shade"/><circle cx="50" cy="78" r="2" class="cp-shade"/><circle cx="66" cy="74" r="2" class="cp-shade"/>' },
        bunny: { outline: 'M22 60c0-18 12-30 28-30s28 12 28 30c0 14-12 24-28 24S22 74 22 60z', back: '<path d="M38 34c-8-14-7-30 0-30s9 16 6 28zM62 34c8-14 7-30 0-30s-9 16-6 28z" class="cp-body"/><path d="M39 28c-4-8-4-18 0-18s4 10 2 18zM61 28c4-8 4-18 0-18s-4 10-2 18z" class="cp-blush"/>', front: '<ellipse cx="50" cy="76" rx="10" ry="5" class="cp-belly" opacity="0.6"/>' },
        bat: { outline: 'M26 58c0-12 4-20 8-24l-2-14 10 9q8-2 16 0l10-9-2 14c4 4 8 12 8 24 0 14-10 24-24 24S26 72 26 58z', back: '<path d="M28 52l-24-14 5 14-7 4 11 4-4 10 19-8zM72 52l24-14-5 14 7 4-11 4 4 10-19-8z" class="cp-accent"/>', front: '<path d="M45 63l2 5 2-5zM51 63l2 5 2-5z" class="cp-glint"/>' },
        cactus: { outline: 'M36 84V38a14 14 0 0 1 28 0v46z', back: '<path d="M36 64h-8a8 8 0 0 1-8-8v-8M64 58h8a8 8 0 0 0 8-8v-6" class="cp-arm"/>', front: '<path d="M30 80h40l-4 14H34z" class="cp-pot"/><path d="M50 26v-4M40 30l-2-3M60 30l2-3" class="cp-whisker"/><circle cx="56" cy="24" r="4" class="cp-blush"/>' },
        penguin: { outline: 'M26 56c0-20 10-34 24-34s24 14 24 34c0 16-10 28-24 28S26 72 26 56z', back: '<path d="M28 52l-12 20 12-6zM72 52l12 20-12-6z" class="cp-body"/>', front: '<path d="M33 60c0-13 7.500-21 17-21s17 8 17 21-7.500 22-17 22-17-9-17-22z" class="cp-belly"/><path d="M46 56l4 6 4-6z" class="cp-beak"/><ellipse cx="41" cy="86" rx="7" ry="3" class="cp-beak"/><ellipse cx="59" cy="86" rx="7" ry="3" class="cp-beak"/>' },
        turtle: { outline: 'M22 62c0-18 12-30 28-30s28 12 28 30c0 13-12 22-28 22S22 75 22 62z', back: '<path d="M10 64c0-26 18-44 40-44s40 18 40 44z" class="cp-shell"/><path d="M50 20v20M26 34l10 12M74 34l-10 12" class="cp-facet"/>', front: '<ellipse cx="50" cy="78" rx="12" ry="4" class="cp-belly" opacity="0.5"/>' }
    };

    function spots() {
        return '<circle cx="30" cy="40" r="6"/><circle cx="68" cy="36" r="5"/><circle cx="26" cy="68" r="5"/><circle cx="74" cy="66" r="6"/><circle cx="50" cy="30" r="4"/><circle cx="50" cy="80" r="5"/>';
    }

    var VARIANTS = {
        classic: {},
        mint: { a: '#3ecf8e', b: '#c9ffe5' },
        ember: { a: '#f2622e', b: '#ffd29c' },
        ocean: { a: '#2d7ff0', b: '#b5dcff' },
        rose: { a: '#ff6fa5', b: '#ffe0ec' },
        slate: { a: '#6b7a90', b: '#dfe6f0' },
        spotted: { a: '#c98a4b', b: '#fff0d8', overlay: function () { return '<g fill="#6b3f17" opacity="0.55">' + spots() + '</g>'; } },
        striped: { a: '#f2a93b', b: '#fff3d0', overlay: function () { return '<g stroke="#8a4b08" stroke-width="5" opacity="0.5" fill="none"><path d="M10 34q40-12 80 0M10 70q40 10 80 0M10 84q40 8 80 0"/></g>'; } },
        twotone: { a: '#9d4edd', b: '#ffd166', overlay: function () { return '<rect x="0" y="62" width="100" height="40" fill="#ffd166" opacity="0.85"/>'; } },
        frost: { a: '#8fd8ff', b: '#ffffff', overlay: function () { return '<g fill="#ffffff" opacity="0.9"><circle cx="28" cy="38" r="2.5"/><circle cx="70" cy="34" r="2"/><circle cx="24" cy="66" r="2"/><circle cx="76" cy="70" r="2.5"/><circle cx="50" cy="28" r="2"/><circle cx="38" cy="80" r="2"/><circle cx="64" cy="80" r="1.6"/></g>'; } },
        candy: { a: '#ff8ad1', b: '#ffffff', overlay: function () { return '<g stroke="#ffffff" stroke-width="6" opacity="0.55"><path d="M-10 40l50-50M-10 80l90-90M20 100l90-90M60 100l50-50"/></g>'; } },
        neon: { a: '#12121c', b: '#39ff14', cls: 'pv-neon pv-dark', overlay: function () { return '<g fill="none" stroke="#39ff14" stroke-width="1.5" opacity="0.6" class="pv-pulse"><path d="M10 40h80M10 68h80M36 10v90M64 10v90"/></g>'; } },
        shadow: { a: '#1a1026', b: '#7b2cbf', cls: 'pv-shadow pv-dark', overlay: function () { return '<g fill="#7b2cbf" opacity="0.5"><circle cx="30" cy="82" r="8" class="pv-rise"/><circle cx="50" cy="86" r="10" class="pv-rise pv-late"/><circle cx="70" cy="82" r="8" class="pv-rise pv-later"/></g>'; } },
        gem: { a: '#19c3b1', b: '#e8fffb', cls: 'pv-gem', overlay: function () { return '<g class="pv-sweep"><path d="M-30 0l14 0 40 100-14 0z" fill="#ffffff" opacity="0.55"/></g><path d="M20 44l30-22 30 22" fill="none" stroke="#e8fffb" stroke-width="1.5" opacity="0.6"/>'; } },
        toxic: { a: '#7fd321', b: '#eaff9c', cls: 'pv-toxic', overlay: function () { return '<g fill="#eaff9c" opacity="0.8"><circle cx="30" cy="80" r="3" class="pv-rise"/><circle cx="46" cy="84" r="2" class="pv-rise pv-late"/><circle cx="60" cy="80" r="3.5" class="pv-rise pv-later"/><circle cx="72" cy="84" r="2" class="pv-rise"/></g>'; } },
        galaxy: { a: '#1b1464', b: '#b8a5ff', cls: 'pv-galaxy pv-dark', overlay: function () { return '<circle cx="64" cy="70" r="20" fill="#7b2cbf" opacity="0.45"/><circle cx="32" cy="38" r="14" fill="#2d7ff0" opacity="0.35"/><g fill="#ffffff">' + scatter(12, 17, function (x, y, index) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (index % 3 ? 1 : 1.6) + '" class="pv-twinkle' + (index % 2 ? ' pv-late' : '') + '"/>'; }) + '<circle cx="34" cy="34" r="1.4" class="pv-twinkle"/><circle cx="66" cy="72" r="1.6" class="pv-twinkle pv-late"/><circle cx="50" cy="30" r="1.2" class="pv-twinkle pv-later"/></g>'; } },
        inferno: { a: '#d7263d', b: '#ffb703', cls: 'pv-inferno', overlay: function () { return '<g class="pv-flame" fill="#ffb703" opacity="0.85"><path d="M14 100q4-24 14-30 0 12 8 14-2-18 12-28 2 16 12 22 0-10 6-14 10 14 6 36z"/></g><g class="pv-flame pv-late" fill="#fff3b0" opacity="0.7"><path d="M34 100q2-12 10-18 2 8 8 10 2-6 6-8 6 8 4 16z"/></g>'; } },
        glitch: { a: '#00e5ff', b: '#ff00aa', cls: 'pv-glitch', overlay: function () { return '<g class="pv-jitter"><rect x="0" y="36" width="100" height="5" fill="#ff00aa" opacity="0.7"/><rect x="0" y="66" width="100" height="3" fill="#ffffff" opacity="0.7"/><rect x="0" y="76" width="100" height="6" fill="#ff00aa" opacity="0.5"/></g>'; } },
        prism: { a: '#ff5f6d', b: '#ffffff', cls: 'pv-prism', overlay: function () { return '<g opacity="0.75"><rect x="0" y="0" width="100" height="34" fill="#ffd166"/><rect x="0" y="34" width="100" height="18" fill="#06d6a0"/><rect x="0" y="52" width="100" height="18" fill="#3a86ff"/><rect x="0" y="70" width="100" height="32" fill="#c77dff"/></g><g fill="#ffffff">' + star(30, 36, 4, 'pv-twinkle') + star(72, 72, 3.500, 'pv-twinkle pv-late') + star(66, 32, 3, 'pv-twinkle pv-later') + '</g>'; } },
        celestial: { a: '#fff4c2', b: '#ffd700', cls: 'pv-celestial', aura: function () { return '<g class="pv-rays">' + onCircle(12, 40, function (x, y, index, degrees) { return '<path d="M0 -3L12 0 0 3z" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + degrees.toFixed(1) + ')" fill="#ffd700" opacity="' + (index % 2 ? 0.5 : 0.9) + '"/>'; }) + '</g><g class="pv-orbit">' + star(50, 6, 5, 'pv-star-gold') + star(92, 62, 3.500, 'pv-star-gold') + star(12, 70, 3.500, 'pv-star-gold') + '</g>'; }, overlay: function () { return '<circle cx="38" cy="38" r="16" fill="#ffffff" opacity="0.45"/>'; } }
    };

    var S = {};
    function shape(key, slot, colors, markup, extraClass) {
        S[key] = { slot: slot, colors: colors, markup: markup, cls: extraClass || '' };
    }

    shape('tophat', 'head', ['#22202b', '#e63946'], '<rect x="34" y="4" width="32" height="18" rx="2" class="pd-a"/><rect x="26" y="20" width="48" height="5" rx="2.5" class="pd-a"/><rect x="34" y="15" width="32" height="4" class="pd-b"/>');
    shape('beanie', 'head', ['#3a86ff', '#ffffff'], '<path d="M30 26c0-12 9-19 20-19s20 7 20 19z" class="pd-a"/><rect x="28" y="22" width="44" height="6" rx="3" class="pd-b"/><circle cx="50" cy="6" r="4" class="pd-b"/>');
    shape('cowboy', 'head', ['#8d5524', '#ffd166'], '<path d="M12 24q38 10 76 0-6-6-18-6l-4-12q-16-4-32 0l-4 12q-12 0-18 6z" class="pd-a"/><path d="M33 17q17 4 34 0v3q-17 4-34 0z" class="pd-b"/>');
    shape('wizard', 'head', ['#4c1d95', '#ffd166'], '<path d="M50 0l16 24H34z" class="pd-a"/><path d="M22 24q28 8 56 0v4q-28 8-56 0z" class="pd-a"/>' + star(50, 15, 4.500, 'pd-b'));
    shape('royalcrown', 'head', ['#ffd166', '#e63946'], '<path d="M30 26l-3-18 10 8 6-12 7 12 7-12 6 12 10-8-3 18z" class="pd-a"/><circle cx="50" cy="20" r="2.6" class="pd-b"/><circle cx="38" cy="21" r="2" class="pd-b"/><circle cx="62" cy="21" r="2" class="pd-b"/>');
    shape('tiara', 'head', ['#e5e7eb', '#60a5fa'], '<path d="M30 26q20-10 40 0l-4-2-6-10-5 8-5-12-5 12-5-8-6 10z" class="pd-a"/><circle cx="50" cy="13" r="2.6" class="pd-b"/>');
    shape('cap', 'head', ['#e63946', '#1d3557'], '<path d="M30 26c0-11 9-17 20-17s20 6 20 17z" class="pd-a"/><path d="M68 22q16 0 20 6-12 2-22-1z" class="pd-b"/><circle cx="50" cy="9" r="2" class="pd-b"/>');
    shape('chef', 'head', ['#ffffff', '#d1d5db'], '<path d="M34 26V17a9 9 0 0 1 3-15 10 10 0 0 1 13-1 10 10 0 0 1 13 1 9 9 0 0 1 3 15v9z" class="pd-a"/><rect x="34" y="21" width="32" height="5" class="pd-b"/>');
    shape('pirate', 'head', ['#1f2937', '#f8fafc'], '<path d="M22 26q4-18 28-20 24 2 28 20-28-8-56 0z" class="pd-a"/><circle cx="50" cy="15" r="4" class="pd-b"/><path d="M44 21l12-4M44 17l12 4" class="pd-l"/>');
    shape('viking', 'head', ['#9ca3af', '#fef3c7'], '<path d="M30 26c0-12 9-18 20-18s20 6 20 18z" class="pd-a"/><path d="M30 18q-12-2-12-14 8 6 14 6zM70 18q12-2 12-14-8 6-14 6z" class="pd-b"/><rect x="29" y="22" width="42" height="5" rx="2" class="pd-b"/>');
    shape('cone', 'head', ['#ff5fb0', '#ffd166'], '<path d="M38 26l12-24 12 24z" class="pd-a"/><circle cx="50" cy="2" r="3.500" class="pd-b"/><path d="M42 18h16M45 11h10" class="pd-l"/>');
    shape('flower', 'head', ['#ff7ab6', '#ffe066'], '<circle cx="30" cy="24" r="4" class="pd-a"/><circle cx="40" cy="20" r="4" class="pd-b"/><circle cx="50" cy="18" r="4.500" class="pd-a"/><circle cx="60" cy="20" r="4" class="pd-b"/><circle cx="70" cy="24" r="4" class="pd-a"/>');
    shape('ribbon', 'head', ['#ef476f', '#ffd6e0'], '<path d="M64 20l-12-8v16zM64 20l12-8v16z" class="pd-a"/><circle cx="64" cy="20" r="3.500" class="pd-b"/>');
    shape('antenna', 'head', ['#94a3b8', '#f43f5e'], '<path d="M50 24V8" class="pd-s"/><circle cx="50" cy="6" r="4.500" class="pd-b pd-blink"/>');
    shape('propeller', 'head', ['#22c55e', '#fde047'], '<path d="M32 26c0-10 8-15 18-15s18 5 18 15z" class="pd-a"/><path d="M50 11V5" class="pd-s"/><g class="pd-spin" style="transform-origin:50px 5px"><ellipse cx="41" cy="5" rx="9" ry="2.6" class="pd-b"/><ellipse cx="59" cy="5" rx="9" ry="2.6" class="pd-b"/></g>');
    shape('ringhalo', 'head', ['#ffe066', '#ffffff'], '<ellipse cx="50" cy="10" rx="17" ry="4.500" class="pd-ring"/>');
    shape('horns', 'head', ['#b91c1c', '#fecaca'], '<path d="M34 28q-10-6-6-20 4 10 14 12zM66 28q10-6 6-20-4 10-14 12z" class="pd-a"/>');
    shape('catears', 'head', ['#374151', '#fda4af'], '<path d="M28 30l2-20 14 12zM72 30l-2-20-14 12z" class="pd-a"/><path d="M31 25l1-9 7 6zM69 25l-1-9-7 6z" class="pd-b"/>');
    shape('bunnyears', 'head', ['#f8fafc', '#fda4af'], '<path d="M38 28c-6-12-5-26 1-26s8 14 5 26zM62 28c6-12 5-26-1-26s-8 14-5 26z" class="pd-a"/><path d="M40 24c-3-8-3-17 0-17s4 9 2 17zM60 24c3-8 3-17 0-17s-4 9-2 17z" class="pd-b"/>');
    shape('headphones', 'head', ['#111827', '#22d3ee'], '<path d="M22 54a28 28 0 0 1 56 0" class="pd-s"/><rect x="15" y="48" width="10" height="16" rx="5" class="pd-a"/><rect x="75" y="48" width="10" height="16" rx="5" class="pd-a"/><rect x="17" y="52" width="6" height="8" rx="3" class="pd-b"/><rect x="77" y="52" width="6" height="8" rx="3" class="pd-b"/>');
    shape('santa', 'head', ['#dc2626', '#ffffff'], '<path d="M30 26c2-14 12-20 22-18 10 2 18 10 26 18l-6 2c-6-6-12-8-18-6z" class="pd-a"/><rect x="28" y="22" width="44" height="6" rx="3" class="pd-b"/><circle cx="80" cy="27" r="4.500" class="pd-b"/>');
    shape('gradcap', 'head', ['#111827', '#ffd166'], '<path d="M50 6l30 10-30 10-30-10z" class="pd-a"/><path d="M36 20v6q14 6 28 0v-6l-14 5z" class="pd-a"/><path d="M76 16v10" class="pd-l"/><circle cx="76" cy="27" r="2.500" class="pd-b"/>');
    shape('mushcap', 'head', ['#ef4444', '#ffffff'], '<path d="M22 26c0-14 12-22 28-22s28 8 28 22z" class="pd-a"/><circle cx="38" cy="14" r="4" class="pd-b"/><circle cx="56" cy="10" r="3" class="pd-b"/><circle cx="66" cy="19" r="3.500" class="pd-b"/>');
    shape('sprout', 'head', ['#22c55e', '#bbf7d0'], '<path d="M50 24V12" class="pd-s"/><path d="M50 14q-12 0-14-10 12 0 14 10zM50 12q10-2 14-10-12 0-14 10z" class="pd-a"/>');
    shape('crest', 'head', ['#f97316', '#fde047'], '<path d="M40 26q-6-10 2-18 0 8 6 8-4-10 4-16 2 10 8 14 2-4 0-8 8 8 2 20z" class="pd-a pd-flicker"/><path d="M46 26q-2-6 4-10 0 6 6 10z" class="pd-b"/>');

    shape('glasses', 'eyes', ['#1f2937', '#93c5fd'], '<circle cx="41" cy="51" r="8" class="pd-lens"/><circle cx="59" cy="51" r="8" class="pd-lens"/><path d="M49 51h2" class="pd-s2"/>');
    shape('shades', 'eyes', ['#0f172a', '#94a3b8'], '<path d="M30 46h18v6a8 8 0 0 1-16 0zM52 46h18l-2 6a8 8 0 0 1-16 0z" class="pd-a"/><path d="M48 47h4" class="pd-s2"/><path d="M34 49h5M56 49h5" class="pd-l"/>');
    shape('monocle', 'eyes', ['#b45309', '#fde68a'], '<circle cx="59" cy="51" r="8.500" class="pd-lens"/><path d="M66 57q4 10 0 22" class="pd-s2"/>');
    shape('visor', 'eyes', ['#06b6d4', '#67e8f9'], '<path d="M28 45h44v8q-22 6-44 0z" class="pd-b" opacity="0.7"/><path d="M28 45h44" class="pd-s"/>');
    shape('eyepatch', 'eyes', ['#111827', '#4b5563'], '<path d="M24 40l52 14" class="pd-s2"/><path d="M33 45h16v7a8 8 0 0 1-16 0z" class="pd-a"/>');
    shape('starglasses', 'eyes', ['#facc15', '#fff7ae'], star(41, 51, 10, 'pd-a') + star(59, 51, 10, 'pd-a') + '<circle cx="41" cy="51" r="3" class="pd-b"/><circle cx="59" cy="51" r="3" class="pd-b"/>');
    shape('heartglasses', 'eyes', ['#fb7185', '#ffe4e6'], heart(41, 50, 6.500, 'pd-a') + heart(59, 50, 6.500, 'pd-a') + '<path d="M48 50h4" class="pd-s2"/>');
    shape('vr', 'eyes', ['#1e293b', '#22d3ee'], '<rect x="26" y="42" width="48" height="18" rx="7" class="pd-a"/><rect x="31" y="46" width="38" height="9" rx="4" class="pd-b pd-blink"/><path d="M26 50h-6M74 50h6" class="pd-s2"/>');
    shape('safety', 'eyes', ['#f59e0b', '#fef3c7'], '<rect x="29" y="43" width="19" height="15" rx="6" class="pd-lens"/><rect x="52" y="43" width="19" height="15" rx="6" class="pd-lens"/><path d="M48 50h4M29 50h-7M71 50h7" class="pd-s2"/>');
    shape('mask', 'eyes', ['#dc2626', '#fecaca'], '<path fill-rule="evenodd" d="M26 46q24-8 48 0v8q-10 6-18 0-6-4-12 0-8 6-18 0zM35 51a6 4.500 0 1 0 12 0a6 4.500 0 1 0-12 0zM53 51a6 4.500 0 1 0 12 0a6 4.500 0 1 0-12 0z" class="pd-a"/>');

    shape('bowknot', 'neck', ['#ec4899', '#fbcfe8'], '<path d="M50 82l-12-6v12zM50 82l12-6v12z" class="pd-a"/><circle cx="50" cy="82" r="3.200" class="pd-b"/>');
    shape('tie', 'neck', ['#1d4ed8', '#93c5fd'], '<path d="M46 78h8l-2 5 4 12-6 5-6-5 4-12z" class="pd-a"/><path d="M46 78h8l-2 5h-4z" class="pd-b"/>');
    shape('longscarf', 'neck', ['#16a34a', '#bbf7d0'], '<path d="M26 74q24 10 48 0v8q-24 10-48 0z" class="pd-a"/><path d="M62 80l6 16-9-2-3-12z" class="pd-a"/><path d="M30 79q20 7 40 0" class="pd-l"/>');
    shape('bandana', 'neck', ['#dc2626', '#ffffff'], '<path d="M28 74q22 8 44 0l-22 20z" class="pd-a"/><circle cx="44" cy="80" r="1.6" class="pd-b"/><circle cx="54" cy="82" r="1.6" class="pd-b"/><circle cx="50" cy="87" r="1.6" class="pd-b"/>');
    shape('bell', 'neck', ['#b91c1c', '#fbbf24'], '<path d="M28 76q22 8 44 0" class="pd-s"/><circle cx="50" cy="85" r="5" class="pd-b"/><path d="M46 86h8" class="pd-s2"/>');
    shape('necklace', 'neck', ['#38bdf8', '#f8fafc'], '<circle cx="32" cy="77" r="2.600" class="pd-b"/><circle cx="41" cy="81" r="2.600" class="pd-b"/><circle cx="59" cy="81" r="2.600" class="pd-b"/><circle cx="68" cy="77" r="2.600" class="pd-b"/><circle cx="50" cy="83" r="3.600" class="pd-a"/>');
    shape('medal', 'neck', ['#2563eb', '#fbbf24'], '<path d="M40 74l10 12 10-12" class="pd-s"/><circle cx="50" cy="90" r="6" class="pd-b"/>' + star(50, 90, 3.500, 'pd-a'));
    shape('amulet', 'neck', ['#7c3aed', '#e9d5ff'], '<path d="M34 74q16 14 32 0" class="pd-l"/><path d="M50 82l6 7-6 8-6-8z" class="pd-a"/><path d="M50 85l2.500 4-2.500 4-2.500-4z" class="pd-b pd-blink"/>');
    shape('lei', 'neck', ['#fb7185', '#fde047'], '<circle cx="28" cy="75" r="3.600" class="pd-a"/><circle cx="35" cy="79" r="3.600" class="pd-b"/><circle cx="42" cy="82" r="3.600" class="pd-a"/><circle cx="50" cy="83" r="3.600" class="pd-b"/><circle cx="58" cy="82" r="3.600" class="pd-a"/><circle cx="65" cy="79" r="3.600" class="pd-b"/><circle cx="72" cy="75" r="3.600" class="pd-a"/>');
    shape('ruff', 'neck', ['#94a3b8', '#f8fafc'], '<path d="M24 76q6-6 9 0 4-6 8 0 4-6 9 0 4-6 9 0 4-6 8 0 4-6 9 0l-2 8q-24 8-48 0z" class="pd-b"/><path d="M26 81q24 8 48 0" class="pd-s2"/>');

    shape('angelwings', 'back', ['#f8fafc', '#cbd5e1'], mirrored('<path d="M26 52q-12-22-24-12 0 12 8 16-6 0-6 6 8 6 22-2z" class="pd-a"/><path d="M22 54q-8-8-14-6" class="pd-l"/>'));
    shape('batwings', 'back', ['#312e81', '#818cf8'], mirrored('<path d="M26 52l-24-16 3 12-6 2 9 6-4 8 10-2 2 8 10-10z" class="pd-a"/><path d="M26 52l-18-6M26 52l-12 6" class="pd-l"/>'));
    shape('fairywings', 'back', ['#f0abfc', '#a5f3fc'], mirrored('<ellipse cx="14" cy="42" rx="12" ry="16" transform="rotate(-24 14 42)" class="pd-b" opacity="0.75"/><ellipse cx="14" cy="68" rx="9" ry="11" transform="rotate(20 14 68)" class="pd-a" opacity="0.75"/>'));
    shape('dragonwings', 'back', ['#b91c1c', '#fca5a5'], mirrored('<path d="M26 50q-10-26-26-24 6 6 4 14 6-2 8 4 6-2 8 4 4-2 6 4z" class="pd-a"/><path d="M26 50q-10-14-22-22M26 50q-8-8-16-8" class="pd-l"/>'));
    shape('mechwings', 'back', ['#64748b', '#22d3ee'], mirrored('<path d="M26 48l-22-10v8l16 6zM26 56l-24-4v8l20 2zM26 64l-20 4 2 8 18-6z" class="pd-a"/><circle cx="24" cy="56" r="3" class="pd-b pd-blink"/>'));
    shape('butterfly', 'back', ['#f97316', '#fde047'], mirrored('<path d="M26 54q-6-28-22-24-6 14 8 24-12 2-8 16 12 8 22-10z" class="pd-a"/><circle cx="12" cy="42" r="4" class="pd-b"/><circle cx="12" cy="66" r="3" class="pd-b"/>'));
    shape('royalcape', 'back', ['#7f1d1d', '#fbbf24'], '<path d="M24 56q-14 26 0 40h52q14-14 0-40z" class="pd-a"/><path d="M22 60q28-14 56 0l-2 6q-26-12-52 0z" class="pd-b"/>');
    shape('cloak', 'back', ['#1e1b4b', '#6366f1'], '<path d="M22 50q-12 30-2 46h60q10-16-2-46-28-12-56 0z" class="pd-a"/><path d="M14 90q36 10 72 0" class="pd-l"/>');
    shape('jetpack', 'back', ['#475569', '#fb923c'], '<rect x="6" y="44" width="15" height="30" rx="6" class="pd-a"/><rect x="79" y="44" width="15" height="30" rx="6" class="pd-a"/><path d="M9 74l4.500 16 4.500-16zM82 74l4.500 16 4.500-16z" class="pd-b pd-flicker"/>');
    shape('backpack', 'back', ['#0d9488', '#99f6e4'], '<rect x="72" y="44" width="22" height="32" rx="7" class="pd-a"/><rect x="76" y="58" width="14" height="10" rx="3" class="pd-b"/>');
    shape('foxtail', 'back', ['#ea580c', '#fff7ed'], '<g class="pd-sway" style="transform-origin:74px 80px"><path d="M72 82q26 0 22-28-4-10-10-4 6 16-14 22z" class="pd-a"/><path d="M93 54q-2-8-8-4 2 6 0 10z" class="pd-b"/></g>');
    shape('deviltail', 'back', ['#b91c1c', '#fca5a5'], '<g class="pd-sway" style="transform-origin:74px 80px"><path d="M74 82q20 0 18-22" class="pd-s"/><path d="M92 62l-7-2 7-13 5 13z" class="pd-a"/></g>');
    shape('shell', 'back', ['#15803d', '#86efac'], '<path d="M10 64c0-27 17-44 40-44s40 17 40 44z" class="pd-a"/><path d="M50 20v20M28 30l8 14M72 30l-8 14" class="pd-l"/>');
    shape('quiver', 'back', ['#92400e', '#fde68a'], '<rect x="74" y="30" width="12" height="34" rx="4" transform="rotate(18 80 47)" class="pd-a"/><path d="M86 30l4-12M82 28l2-13M90 33l7-10" class="pd-l"/>');
    shape('banner', 'back', ['#7c3aed', '#fde047'], '<path d="M90 96V10" class="pd-s"/><g class="pd-wave" style="transform-origin:90px 20px"><path d="M90 12H68l6 9-6 9h22z" class="pd-a"/><circle cx="80" cy="21" r="3" class="pd-b"/></g>');

    shape('ring', 'aura', ['#e0aaff', '#ffffff'], '<g class="pd-rot"><circle cx="50" cy="54" r="45" class="pd-dash"/></g>');
    shape('doublering', 'aura', ['#7dd3fc', '#f0abfc'], '<g class="pd-rot"><circle cx="50" cy="54" r="46" class="pd-dash"/></g><g class="pd-rot pd-rev"><circle cx="50" cy="54" r="40" class="pd-dash2"/></g>');
    shape('starring', 'aura', ['#fde047', '#fff7ae'], '<g class="pd-rot">' + onCircle(8, 45, function (x, y, index) { return star(x, y, index % 2 ? 3 : 4.500, 'pd-a'); }) + '</g>');
    shape('sparks', 'aura', ['#fef08a', '#ffffff'], scatter(11, 5, function (x, y, index) { return '<path d="M' + x + ' ' + (y - 4) + 'l1.500 2.500 2.500 1.500-2.500 1.500-1.500 2.500-1.500-2.500-2.500-1.500 2.500-1.500z" class="pd-a pd-twinkle' + (index % 3 === 1 ? ' pd-late' : (index % 3 === 2 ? ' pd-later' : '')) + '"/>'; }));
    shape('flames', 'aura', ['#f97316', '#fde047'], onCircle(10, 43, function (x, y, index, degrees) { return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (degrees + 90).toFixed(1) + ')"><path d="M0-9q6 7 0 14-6-7 0-14z" class="' + (index % 2 ? 'pd-b' : 'pd-a') + ' pd-flicker' + (index % 2 ? ' pd-late' : '') + '"/></g>'; }));
    shape('frostaura', 'aura', ['#bae6fd', '#ffffff'], '<g class="pd-rot">' + onCircle(6, 44, function (x, y) { return '<path d="M' + (x - 5).toFixed(1) + ' ' + y.toFixed(1) + 'h10M' + x.toFixed(1) + ' ' + (y - 5).toFixed(1) + 'v10M' + (x - 3.500).toFixed(1) + ' ' + (y - 3.500).toFixed(1) + 'l7 7M' + (x + 3.500).toFixed(1) + ' ' + (y - 3.500).toFixed(1) + 'l-7 7" class="pd-l"/>'; }) + '</g>');
    shape('lightning', 'aura', ['#fde047', '#ffffff'], '<path d="M12 20l8 14-6 2 10 16-16-12 6-3z" class="pd-a pd-flash"/><path d="M88 30l-8 12 6 2-10 14 16-10-6-3z" class="pd-a pd-flash pd-late"/><path d="M16 78l8-8-1 6 9-4-12 12 1-6z" class="pd-b pd-flash pd-later"/>');
    shape('bubbles', 'aura', ['#7dd3fc', '#e0f2fe'], onCircle(9, 44, function (x, y, index) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (2.500 + (index % 3) * 1.500) + '" class="pd-bubble pd-float' + (index % 2 ? ' pd-late' : '') + '"/>'; }));
    shape('runes', 'aura', ['#c4b5fd', '#f5f3ff'], '<g class="pd-rot"><circle cx="50" cy="54" r="46" class="pd-thin"/><circle cx="50" cy="54" r="38" class="pd-thin"/>' + onCircle(8, 42, function (x, y, index) { var glyphs = ['M-2-3h4l-4 6h4', 'M0-3v6M-2 0h4', 'M-2 3l2-6 2 6', 'M-2-3l4 6M2-3l-4 6']; return '<path d="' + glyphs[index % 4] + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" class="pd-l"/>'; }) + '</g>');
    shape('hexshield', 'aura', ['#22d3ee', '#cffafe'], '<polygon points="50,6 91.600,30 91.600,78 50,102 8.400,78 8.400,30" class="pd-hex pd-pulse"/><polygon points="50,14 84.600,34 84.600,74 50,94 15.400,74 15.400,34" class="pd-thin"/>');
    shape('orbit', 'aura', ['#f0abfc', '#ffffff'], '<g class="pd-rot"><circle cx="50" cy="9" r="4.500" class="pd-a"/><circle cx="89" cy="76" r="3.500" class="pd-b"/><circle cx="11" cy="76" r="3.500" class="pd-a"/><circle cx="50" cy="54" r="45" class="pd-thin"/></g>');
    shape('hearts', 'aura', ['#fb7185', '#ffe4e6'], onCircle(7, 44, function (x, y, index) { return '<g class="pd-float' + (index % 2 ? ' pd-late' : '') + '">' + heart(Number(x.toFixed(1)), Number(y.toFixed(1)), index % 2 ? 3 : 4, index % 2 ? 'pd-b' : 'pd-a') + '</g>'; }, 0.300));
    shape('leaves', 'aura', ['#22c55e', '#bbf7d0'], '<g class="pd-rot">' + onCircle(8, 44, function (x, y, index, degrees) { return '<path d="M0-6q5 6 0 12-5-6 0-12z" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (degrees + 40).toFixed(1) + ')" class="' + (index % 2 ? 'pd-b' : 'pd-a') + '"/>'; }) + '</g>');
    shape('pixels', 'aura', ['#22d3ee', '#f0abfc'], scatter(14, 23, function (x, y, index) { return '<rect x="' + x + '" y="' + y + '" width="' + (index % 2 ? 3 : 4.500) + '" height="' + (index % 2 ? 3 : 4.500) + '" class="' + (index % 2 ? 'pd-b' : 'pd-a') + ' pd-twinkle' + (index % 3 === 1 ? ' pd-late' : (index % 3 === 2 ? ' pd-later' : '')) + '"/>'; }));
    shape('rift', 'aura', ['#7c3aed', '#22d3ee'], '<ellipse cx="50" cy="54" rx="47" ry="47" class="pd-void"/><g class="pd-rot"><ellipse cx="50" cy="54" rx="46" ry="30" class="pd-dash"/></g><g class="pd-rot pd-rev"><ellipse cx="50" cy="54" rx="30" ry="46" class="pd-dash2"/></g>');

    shape('wand', 'held', ['#7c3aed', '#fde047'], '<path d="M78 82l13-30" class="pd-s"/>' + star(92, 46, 6.500, 'pd-b pd-blink'));
    shape('sword', 'held', ['#92400e', '#e5e7eb'], '<path d="M86 28l4.500 7v31h-9V35z" class="pd-b"/><rect x="77" y="66" width="18" height="4" rx="2" class="pd-a"/><rect x="84" y="70" width="4" height="11" rx="2" class="pd-a"/>');
    shape('shield', 'held', ['#1d4ed8', '#fbbf24'], '<path d="M76 46l11-4 11 4v14q0 12-11 18-11-6-11-18z" class="pd-a"/><path d="M87 48v24M79 58h16" class="pd-l"/>');
    shape('potion', 'held', ['#22c55e', '#dcfce7'], '<path d="M83 44h8v8l7 14a6 6 0 0 1-5 9H81a6 6 0 0 1-5-9l7-14z" class="pd-b" opacity="0.5"/><path d="M78 64h18l2 3a6 6 0 0 1-5 8H81a6 6 0 0 1-5-8z" class="pd-a"/><rect x="82" y="41" width="10" height="4" rx="2" class="pd-b"/><circle cx="87" cy="36" r="1.800" class="pd-a pd-float"/>');
    shape('book', 'held', ['#7c2d12', '#fde68a'], '<rect x="74" y="52" width="22" height="26" rx="3" class="pd-a"/><rect x="77" y="52" width="3" height="26" class="pd-b"/><path d="M84 60h8M84 66h8" class="pd-l"/>');
    shape('lollipop', 'held', ['#f472b6', '#ffffff'], '<path d="M86 86V62" class="pd-s2"/><circle cx="86" cy="52" r="11" class="pd-a"/><path d="M80 52a6 6 0 1 1 6 6 3 3 0 1 1 3-3" class="pd-l"/>');
    shape('balloon', 'held', ['#ef4444', '#fecaca'], '<g class="pd-sway" style="transform-origin:86px 88px"><path d="M86 88q-4-10 0-20" class="pd-s2"/><ellipse cx="86" cy="50" rx="11" ry="14" class="pd-a"/><path d="M84 64h4l-2 4z" class="pd-a"/><ellipse cx="82" cy="45" rx="3" ry="5" class="pd-b" opacity="0.6"/></g>');
    shape('flag', 'held', ['#0ea5e9', '#e0f2fe'], '<path d="M80 88V36" class="pd-s2"/><g class="pd-wave" style="transform-origin:80px 46px"><path d="M80 38q8-6 16 0v14q-8-6-16 0z" class="pd-a"/></g>');
    shape('lantern', 'held', ['#78350f', '#fde047'], '<path d="M86 34v8" class="pd-s2"/><rect x="78" y="42" width="16" height="22" rx="5" class="pd-a"/><rect x="81" y="46" width="10" height="14" rx="3" class="pd-b pd-flicker"/>');
    shape('umbrella', 'held', ['#8b5cf6', '#ddd6fe'], '<path d="M86 88V44" class="pd-s2"/><path d="M68 46a18 18 0 0 1 36 0q-4.500-4-9 0-4.500-4-9 0-4.500-4-9 0-4.500-4-9 0z" class="pd-a"/>');
    shape('coffee', 'held', ['#78350f', '#fff7ed'], '<path d="M76 58h18v14a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z" class="pd-b"/><path d="M94 61h3a4 4 0 0 1 0 8h-3" class="pd-s2"/><path d="M81 52q-3-4 0-8M88 52q-3-4 0-8" class="pd-l pd-float"/>');
    shape('controller', 'held', ['#334155', '#f43f5e'], '<rect x="72" y="58" width="26" height="15" rx="7" class="pd-a"/><path d="M78 63v6M75 66h6" class="pd-l"/><circle cx="90" cy="64" r="1.800" class="pd-b"/><circle cx="93" cy="68" r="1.800" class="pd-b"/>');
    shape('wrench', 'held', ['#64748b', '#cbd5e1'], '<path d="M80 86l9-28" class="pd-s"/><path d="M85 58a8 8 0 1 1 11-6l-5 1-1 5z" class="pd-b"/>');
    shape('testtube', 'held', ['#06b6d4', '#cffafe'], '<path d="M82 40h10v32a5 5 0 0 1-10 0z" class="pd-b" opacity="0.5"/><path d="M82 58h10v14a5 5 0 0 1-10 0z" class="pd-a"/><rect x="80" y="38" width="14" height="4" rx="2" class="pd-b"/><circle cx="87" cy="66" r="1.500" class="pd-b pd-float"/>');
    shape('scepter', 'held', ['#fbbf24', '#ef4444'], '<path d="M86 90V46" class="pd-s"/><circle cx="86" cy="40" r="7" class="pd-a"/><circle cx="86" cy="40" r="3" class="pd-b pd-blink"/><path d="M79 48h14" class="pd-s2"/>');

    shape('cloudseat', 'ground', ['#e0f2fe', '#ffffff'], '<path d="M18 97a9 9 0 0 1 4-17 12 12 0 0 1 20-5 12 12 0 0 1 20 0 12 12 0 0 1 18 6 9 9 0 0 1 2 16z" class="pd-b pd-float"/>');
    shape('hoverdisc', 'ground', ['#334155', '#22d3ee'], '<ellipse cx="50" cy="91" rx="34" ry="7" class="pd-a"/><ellipse cx="50" cy="89" rx="24" ry="4" class="pd-b pd-pulse"/>');
    shape('flowerpatch', 'ground', ['#f472b6', '#22c55e'], '<path d="M20 97V87M34 97V89M66 97V89M80 97V87" class="pd-l"/><circle cx="20" cy="85" r="4" class="pd-a"/><circle cx="34" cy="87" r="3.500" class="pd-a"/><circle cx="66" cy="87" r="3.500" class="pd-a"/><circle cx="80" cy="85" r="4" class="pd-a"/>');
    shape('puddle', 'ground', ['#38bdf8', '#e0f2fe'], '<ellipse cx="50" cy="93" rx="36" ry="6" class="pd-a" opacity="0.7"/><ellipse cx="40" cy="92" rx="10" ry="1.600" class="pd-b"/>');
    shape('snowpile', 'ground', ['#bae6fd', '#ffffff'], '<path d="M10 98q8-12 20-8 8-8 20-2 10-8 20 0 12-2 20 10z" class="pd-b"/><circle cx="30" cy="92" r="1.500" class="pd-a"/><circle cx="64" cy="93" r="1.500" class="pd-a"/>');
    shape('firering', 'ground', ['#f97316', '#fde047'], '<ellipse cx="50" cy="93" rx="36" ry="5" class="pd-thin"/>' + [14, 26, 38, 50, 62, 74, 86].map(function (x, index) { return '<path d="M' + x + ' 96q-5-7 0-14 5 7 0 14z" class="' + (index % 2 ? 'pd-b' : 'pd-a') + ' pd-flicker' + (index % 2 ? ' pd-late' : '') + '"/>'; }).join(''));
    shape('startrail', 'ground', ['#fde047', '#ffffff'], star(16, 88, 4.500, 'pd-a pd-twinkle') + star(30, 95, 3, 'pd-b pd-twinkle pd-late') + star(72, 94, 3.500, 'pd-a pd-twinkle pd-later') + star(86, 87, 5, 'pd-b pd-twinkle'));
    shape('notes', 'ground', ['#a78bfa', '#ddd6fe'], '<g class="pd-float"><path d="M12 40V26l10-3v14" class="pd-l"/><circle cx="9" cy="40" r="3.400" class="pd-a"/><circle cx="19" cy="37" r="3.400" class="pd-a"/></g><g class="pd-float pd-late"><path d="M90 30V16" class="pd-l"/><circle cx="87" cy="30" r="3.400" class="pd-a"/></g>');
    shape('zzz', 'ground', ['#93c5fd', '#dbeafe'], '<g class="pd-float"><path d="M78 22h8l-8 9h8" class="pd-s2"/></g><g class="pd-float pd-late"><path d="M88 8h6l-6 7h6" class="pd-s2"/></g><g class="pd-float pd-later"><path d="M70 34h5l-5 6h5" class="pd-s2"/></g>');
    shape('confetti', 'ground', ['#f472b6', '#fde047'], scatter(14, 11, function (x, y, index) { return '<rect x="' + x + '" y="' + y + '" width="4" height="2.500" transform="rotate(' + (index * 37 % 180) + ' ' + x + ' ' + y + ')" class="' + (index % 2 ? 'pd-b' : 'pd-a') + ' pd-fall' + (index % 3 === 1 ? ' pd-late' : (index % 3 === 2 ? ' pd-later' : '')) + '"/>'; }));

    var BACK_SLOTS = { back: true, aura: true, ground: true };
    var TIER_COLORS = { r: ['#3b82f6', '#dbeafe'], e: ['#a855f7', '#f5d0fe'], m: ['#ffd166', '#ff5fb0'] };
    var LEGACY_BACK = { cape: true, plasma_aura: true, pixel_wings: true };

    function parseSpecies(key) {
        var parts = String(key || 'blob').split('_');
        var body = BODIES[parts[0]] ? parts[0] : 'blob';
        var variant = parts[1] && VARIANTS[parts[1]] ? parts[1] : 'classic';
        return { body: body, variant: variant };
    }

    function parseDecoration(key) {
        var match = /^([a-z]+)_([curem])$/.exec(String(key || ''));
        if (!match || !S[match[1]]) return null;
        return { shape: S[match[1]], name: match[1], tier: match[2] };
    }

    function sparkles(slot) {
        var spots = { head: [[30, 8], [70, 6], [50, -2]], eyes: [[24, 44], [76, 44], [50, 40]], neck: [[30, 86], [70, 86], [50, 96]], back: [[6, 34], [94, 34], [50, 98]], aura: [[8, 20], [92, 22], [50, 100]], held: [[98, 40], [74, 44], [96, 80]], ground: [[8, 84], [92, 84], [50, 98]] }[slot] || [];
        return spots.map(function (point, index) { return star(point[0], point[1], 3, 'pd-spark pd-twinkle' + (index === 1 ? ' pd-late' : (index === 2 ? ' pd-later' : ''))); }).join('');
    }

    function decorationSvg(key) {
        var parsed = parseDecoration(key);
        if (!parsed) return null;
        var colors = TIER_COLORS[parsed.tier] || parsed.shape.colors;
        var extra = parsed.tier === 'm' ? sparkles(parsed.shape.slot) : '';
        return { back: !!BACK_SLOTS[parsed.shape.slot], markup: '<g class="pd pd-slot-' + parsed.shape.slot + ' pd-t-' + parsed.tier + ' ' + parsed.shape.cls + '" style="' + KEEP + '--da:' + colors[0] + ';--db:' + colors[1] + '">' + '<g class="pd-move">' + parsed.shape.markup + '</g>' + extra + '</g>' };
    }

    function face(mood) {
        var eyes = mood === 'sleepy' ? '<path d="M36 52q5 4 10 0M54 52q5 4 10 0" class="cp-line"/>' : '<circle cx="41" cy="51" r="4.500" class="cp-eye"/><circle cx="59" cy="51" r="4.500" class="cp-eye"/><circle cx="42.500" cy="49.500" r="1.400" class="cp-glint"/><circle cx="60.500" cy="49.500" r="1.400" class="cp-glint"/>';
        var mouth = mood === 'ecstatic' ? '<path d="M41 60q9 10 18 0z" class="cp-mouth"/>' : (mood === 'happy' ? '<path d="M42 61q8 6 16 0" class="cp-line"/>' : (mood === 'bored' ? '<line x1="44" y1="62" x2="56" y2="62" class="cp-line"/>' : (mood === 'sleepy' ? '<circle cx="50" cy="63" r="2.500" class="cp-mouth"/>' : '<path d="M44 62q6 4 12 0" class="cp-line"/>')));
        return eyes + mouth + '<ellipse cx="34" cy="59" rx="4" ry="2.500" class="cp-blush"/><ellipse cx="66" cy="59" rx="4" ry="2.500" class="cp-blush"/>';
    }

    function svg(companion, size, legacyDecoration) {
        var data = companion || {};
        var parsed = parseSpecies(data.species);
        var body = BODIES[parsed.body];
        var variant = VARIANTS[parsed.variant];
        var hue = Math.max(0, Math.min(360, parseInt(data.hue, 10)));
        if (isNaN(hue)) hue = 270;
        var behind = '';
        var front = '';
        (data.equipped || []).forEach(function (key) {
            var modern = decorationSvg(key);
            if (modern) {
                if (modern.back) behind += modern.markup;
                else front += modern.markup;
                return;
            }
            if (!legacyDecoration) return;
            if (LEGACY_BACK[key]) behind += legacyDecoration(key);
            else front += legacyDecoration(key);
        });
        var clipId = 'rwlPetClip' + (++uid);
        var style = KEEP + '--cp-hue:' + hue + 'deg;' + (variant.a ? '--pa:' + variant.a + ';--pb:' + variant.b + ';' : '');
        var classes = 'rwl-companion-svg rwl-pet' + (variant.a ? ' pv' : '') + (variant.cls ? ' ' + variant.cls : '') + (data.still ? ' rwl-pet-still' : '');
        var pixels = size || 72;
        return '<svg class="' + classes + '" viewBox="-4 -6 108 112" width="' + pixels + '" height="' + pixels + '" style="' + style + '" aria-hidden="true">' +
            '<defs><clipPath id="' + clipId + '"><path d="' + body.outline + '"/></clipPath></defs>' +
            (variant.aura ? variant.aura() : '') + behind +
            '<g class="cp-figure">' + (body.back || '') +
            '<path d="' + body.outline + '" class="cp-body"/>' +
            (variant.overlay ? '<g clip-path="url(#' + clipId + ')" class="cp-overlay">' + variant.overlay() + '</g><path d="' + body.outline + '" class="cp-outline"/>' : '') +
            (body.front || '') + face(data.mood) + '</g>' + front + '</svg>';
    }

    global.RWLPets = {
        svg: svg,
        bodies: Object.keys(BODIES),
        variants: Object.keys(VARIANTS),
        shapes: Object.keys(S),
        slotOf: function (key) { var parsed = parseDecoration(key); return parsed ? parsed.shape.slot : null; },
        knowsSpecies: function (key) { var parts = String(key || '').split('_'); return !!BODIES[parts[0]] && (!parts[1] || !!VARIANTS[parts[1]]); },
        knowsDecoration: function (key) { return !!parseDecoration(key); }
    };
})(window);
