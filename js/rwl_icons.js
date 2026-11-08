(function (global) {
    if (global.RWLIcons) return;

    var PATHS = {
        pumpkin: '<path d="M12 6c-1-2 0-3 1.5-3.5"/><path d="M12 6c-4.5-1.5-8 1.5-8 6.5S7 20 12 20s8-2.5 8-7.5S16.5 4.5 12 6z"/><path d="M12 6c-2 2-2 12 0 14M12 6c2 2 2 12 0 14"/><path d="M8.5 11l1.5 1M15.5 11l-1.5 1M9 15.5c2 1 4 1 6 0"/>',
        haunted_house: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/><path d="M8 12h2M14 12h2"/><path d="M17 4v3"/><path d="M19.5 8.5l1.5-1"/>',
        tombstone: '<path d="M7 21V10a5 5 0 0 1 10 0v11"/><path d="M4 21h16"/><path d="M12 9v6M9.5 11.5h5"/>',
        cauldron: '<path d="M4 10h16"/><path d="M5 10c0 5 3 8 7 8s7-3 7-8"/><path d="M8 18l-1 3M16 18l1 3"/><circle cx="10" cy="6" r="1.4"/><circle cx="14" cy="4.5" r="1"/><circle cx="13" cy="7.5" r="0.8"/>',
        blood_moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M15 18v2.5M18 16.5v2"/>',
        snowman: '<circle cx="12" cy="7" r="3.2"/><circle cx="12" cy="16" r="5"/><path d="M10.8 6.5h.01M13.2 6.5h.01"/><path d="M12 8l2 .6"/><path d="M7.5 13.5L4 11M16.5 13.5L20 11"/><path d="M12 14v.01M12 17v.01"/>',
        castle: '<path d="M3 21V9h3V6h2v3h2V5h4v4h2V6h2v3h3v12z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><path d="M12 5V2.5l2 1-2 1"/>',
        aurora: '<path d="M2 20l6-8 4 5 3-4 7 7"/><path d="M3 9c3-3 6 2 9-1s6 2 9-1"/><path d="M3 5c3-2 6 2 9 0s6 2 9 0"/>',
        skate: '<path d="M6 4h5l1 7h5a3 3 0 0 1 3 3v1H6z"/><path d="M4 19h16"/><path d="M8 15v4M17 15v4"/>',
        wolf: '<path d="M4 4l4 5h8l4-5v8l-3 5-5 3-5-3-3-5z"/><path d="M9.5 12h.01M14.5 12h.01"/><path d="M11 15.5h2l-1 1.2z"/>',
        bauble: '<circle cx="12" cy="14" r="7"/><path d="M10 7V5h4v2"/><path d="M12 5V3"/><path d="M5.5 12.5c4 2 9 2 13 0M6 16.5c4 1.5 8 1.5 12 0"/>',
        village: '<path d="M2 21h20"/><path d="M3 21v-7l4-4 4 4v7"/><path d="M11 21v-9l5-4 5 4v9"/><path d="M6 21v-3h2v3M15 21v-4h2v4"/><path d="M14 12h.01M18 12h.01"/>',
        xmas_tree: '<path d="M12 2l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 8l-2.4 1.2.5-2.6L8.2 4.8l2.6-.4z"/><path d="M12 9l-5 6h3l-4 5h12l-4-5h3z"/><path d="M12 20v2"/>',
        gift: '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M2 9h20v-3H2z"/><path d="M12 6v15"/><path d="M12 6c-2.5 0-4.5-1-4.5-2.5S9.5 2 12 6zM12 6c2.5 0 4.5-1 4.5-2.5S14.5 2 12 6z"/>',
        antlers: '<path d="M8 21v-6a4 4 0 0 1 8 0v6"/><path d="M9 11L5 6M5 6L3 7M5 6l-.5-3M7.5 8.5L9 5"/><path d="M15 11l4-5M19 6l2 1M19 6l.5-3M16.5 8.5L15 5"/><path d="M11 17h.01M13 17h.01"/>',
        rocket: '<path d="M12 2c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10z"/><circle cx="12" cy="9" r="1.8"/><path d="M9 15l-3 3 1 3 3-2M15 15l3 3-1 3-3-2"/><path d="M12 18v4"/>',
        skyline: '<path d="M2 21h20"/><path d="M4 21V11h4v10M8 21V6h5v15M13 21V9h4v12M17 21v-7h3v7"/><path d="M10 9h1M10 12h1M10 15h1M15 12h.5M15 15h.5"/><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z"/>',
        clock: '<circle cx="12" cy="13" r="8"/><path d="M12 13V8.5"/><path d="M12 13l3 1.5"/><path d="M9 2h6"/><path d="M12 2v3"/>',
        lantern: '<path d="M9 3h6"/><path d="M12 3v2"/><path d="M7 7c0-1 2-2 5-2s5 1 5 2v9c0 1-2 2-5 2s-5-1-5-2z"/><path d="M7 11h10M7 14h10"/><path d="M10 18l-1 3h6l-1-3"/>',
        galaxy: '<path d="M12 12c0-3 3-5 6-4"/><path d="M12 12c0 3-3 5-6 4"/><path d="M12 12c3 0 5 3 4 6"/><path d="M12 12c-3 0-5-3-4-6"/><circle cx="12" cy="12" r="1.5"/><path d="M4 4h.01M20 20h.01M20 4h.01"/>',
        heart_pulse: '<path d="M12 20s-7-4.5-9-9.5C1.6 7 4 4 7 4c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3 0 5.4 3 4 6.5"/><path d="M3 12h4l2-3 3 6 2-3h7"/>',
        rose: '<path d="M12 13c-3 0-5-2-5-5 0-2 1.5-3 3-3 1 0 1.5.5 2 1 .5-.5 1-1 2-1 1.5 0 3 1 3 3 0 3-2 5-5 5z"/><path d="M12 13v9"/><path d="M12 17c-2-2-4-2-5-1M12 19c2-2 4-2 5-1"/>',
        love_letter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/><path d="M12 17.5s-2.5-1.4-2.5-3a1.3 1.3 0 0 1 2.5-.5 1.3 1.3 0 0 1 2.5.5c0 1.6-2.5 3-2.5 3z"/>',
        cupid: '<path d="M14 11s-3-2-3-4a2 2 0 0 1 3-1.7A2 2 0 0 1 17 7c0 2-3 4-3 4z"/><path d="M3 21l9-9"/><path d="M3 21v-3M3 21h3"/><path d="M18 6l3-3M21 3h-3M21 3v3"/>',
        constellation: '<path d="M12 19L5 11a3.5 3.5 0 0 1 7-3 3.5 3.5 0 0 1 7 3z"/><circle cx="12" cy="19" r="1"/><circle cx="5" cy="11" r="1"/><circle cx="19" cy="11" r="1"/><circle cx="8.5" cy="6.5" r="1"/><circle cx="15.5" cy="6.5" r="1"/>',
        sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/><path d="M7 21h10"/>',
        sunflower: '<circle cx="12" cy="9" r="2.5"/><path d="M12 3.5v2M12 12.5v2M6.5 9h2M15.5 9h2M8.2 5.2l1.4 1.4M14.4 11.4l1.4 1.4M8.2 12.8l1.4-1.4M14.4 6.6l1.4-1.4"/><path d="M12 14.5V22"/><path d="M12 18c-2-2-4-2-5-1"/>',
        rainbow: '<path d="M3 17a9 9 0 0 1 18 0"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M9 17a3 3 0 0 1 6 0"/><path d="M4 21v.01M8 20v.01M12 21v.01M16 20v.01M20 21v.01"/>',
        blossom: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10c-2-3-1-6 0-7 1 1 2 4 0 7zM13.9 11.4c2.2-2.8 5.3-3 6.6-2.7-.4 1.3-2.6 3.7-6.6 2.7zM13.2 13.6c3.3 1.1 4.6 4 4.6 5.3-1.4.1-4.4-1-4.6-5.3zM10.8 13.6c-.2 4.3-3.2 5.4-4.6 5.3 0-1.3 1.3-4.2 4.6-5.3zM10.1 11.4c-4 1-6.2-1.4-6.6-2.7 1.3-.3 4.4-.1 6.6 2.7z"/>',
        butterfly: '<path d="M12 7v13"/><path d="M12 9C9 4 3 4 3 8s4 5 9 3"/><path d="M12 9c3-5 9-5 9-1s-4 5-9 3"/><path d="M12 13c-3 0-6 1.5-6 4s3 2 6-2"/><path d="M12 13c3 0 6 1.5 6 4s-3 2-6-2"/><path d="M10.5 4.5L12 7l1.5-2.5"/>',
        sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
        palm: '<path d="M12 22c0-5 0-9 1-12"/><path d="M13 10C11 6 7 5 4 6c3 0 6 1 9 4z"/><path d="M13 10c1-4 5-6 8-5-3 0-6 2-8 5z"/><path d="M13 10c3-1 7 0 8 3-3-1-6-2-8-3z"/><path d="M13 10c-3 0-6 2-7 5 2-2 5-4 7-5z"/><path d="M6 22h12"/>',
        fish: '<path d="M3 12c3-4 7-6 11-6 3 0 5 3 6 6-1 3-3 6-6 6-4 0-8-2-11-6z"/><path d="M3 12l-1-4M3 12l-1 4"/><circle cx="16" cy="11" r="0.8"/><path d="M11 9c1 2 1 4 0 6"/>',
        sailboat: '<path d="M11 3v14"/><path d="M11 4l7 11h-7"/><path d="M11 7l-5 8h5"/><path d="M3 18h18l-2 3H5z"/>',
        wave: '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M4 10c1-4 5-6 9-5-3 1-4 4-2 6 1.5 1.5 4 1 5-1"/>',
        leaf: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z"/><path d="M5 19c3-5 7-9 11-11"/>',
        tree: '<path d="M12 22v-6"/><path d="M12 16c-4 0-7-2-7-5 0-2 1.5-3.5 3-4 0-2.5 2-4.5 4-4.5s4 2 4 4.5c1.5.5 3 2 3 4 0 3-3 5-7 5z"/><path d="M9 11l3 3 3-3"/>',
        wheat: '<path d="M12 22V6"/><path d="M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zM12 8c2-1 3-3 3-5-2 1-3 3-3 5z"/><path d="M12 13c-2-1-3.5-3-3.5-5 2 1 3.5 3 3.5 5zM12 13c2-1 3.5-3 3.5-5-2 1-3.5 3-3.5 5z"/><path d="M12 18c-2-1-4-3-4-5 2.5 1 4 3 4 5zM12 18c2-1 4-3 4-5-2.5 1-4 3-4 5z"/>',
        duck: '<path d="M8 9a3 3 0 1 1 5 2c3 0 7 1 8 5-1 3-4 4-8 4-5 0-9-2-9-5 0-2 2-3 4-3"/><path d="M8 9l-3 .5 3 1"/><circle cx="10" cy="8" r="0.6"/>',
        acorn: '<path d="M6 10h12"/><path d="M6 10c0-3 3-5 6-5s6 2 6 5"/><path d="M12 5V3"/><path d="M7 10c0 6 2 10 5 11 3-1 5-5 5-11"/>',
        snowflake: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 5l2.5-1.5M9.5 20.5L12 19l2.5 1.5M4 10.5l1.5-1.5L5 6.5M19 17.5l-.5-2.5 1.5-1.5M4 13.5L5.5 15 5 17.5M19 6.5l-.5 2.5L20 10.5"/>',
        sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
        heart: '<path d="M12 20s-8-4.6-8-10.2A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.8C20 15.4 12 20 12 20z"/>',
        flower: '<circle cx="12" cy="10" r="2.2"/><path d="M12 7.8c0-2.5-1.2-4-2.5-4.5M12 7.8c0-2.5 1.2-4 2.5-4.5M14.2 10c2.5 0 4-1.2 4.5-2.5M14.2 10c2.5 0 4 1.2 4.5 2.5M9.8 10c-2.5 0-4-1.2-4.5-2.5M9.8 10c-2.5 0-4 1.2-4.5 2.5"/><path d="M12 12.2V22"/>',
        flame: '<path d="M12 22c4 0 7-3 7-7 0-5-4-7-5-12-1 3-3 4-4 7-1-1-1-3-1-4-2 2-3 5-3 9 0 4 3 7 6 7z"/><path d="M12 22c-2 0-3-1.5-3-3.5S11 15 12 13c1 2 3 3.5 3 5.5S14 22 12 22z"/>',
        moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3v3M15.5 4.5h3"/>',
        bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
        crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
        palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-2 0-3s2.5-.5 4-.5A3 3 0 0 0 21 12a9 9 0 0 0-9-9z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/><circle cx="17" cy="10.5" r="1.2"/>',
        drop: '<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z"/>',
        mountain: '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M7.5 10.5l1.5 1.5 1.5-1.5"/>'
    };

    var PIECES = {
        jack_lanterns: 'pumpkin', haunted_house: 'haunted_house', graveyard: 'tombstone', witch_cauldron: 'cauldron', blood_ritual: 'blood_moon',
        snowman: 'snowman', ice_palace: 'castle', aurora_range: 'aurora', frozen_lake: 'skate', wolf_cliff: 'wolf',
        ornament_string: 'bauble', christmas_village: 'village', grand_tree: 'xmas_tree', elf_workshop: 'gift', reindeer_flight: 'antlers',
        click_rockets: 'rocket', city_skyline: 'skyline', midnight_clock: 'clock', sky_lanterns: 'lantern', galaxy_shells: 'galaxy',
        love_pulse: 'heart_pulse', rose_garden: 'rose', love_letters: 'love_letter', cupid: 'cupid', heart_constellation: 'constellation',
        grass_meadow: 'sprout', flower_field: 'sunflower', rainbow_shower: 'rainbow', cherry_tree: 'blossom', butterfly_garden: 'butterfly',
        sun_flare: 'sun', beach_crab: 'palm', coral_reef: 'fish', sunset_sail: 'sailboat', bioluminescence: 'wave',
        leaf_pile: 'leaf', windy_forest: 'tree', harvest_farm: 'wheat', misty_lake: 'duck', squirrel_canopy: 'acorn'
    };

    var SEASONS = { new_year: 'sparkle', valentine: 'heart', spring: 'flower', summer: 'sun', autumn: 'leaf', halloween: 'pumpkin', winter: 'snowflake', christmas: 'xmas_tree' };
    var KEYWORDS = [
        [/neon|cyber|volt|electric|thunder|storm|plasma/i, 'bolt'],
        [/ocean|sea|wave|tide|aqua|lagoon|reef|coral/i, 'wave'],
        [/forest|jungle|wood|grove|leaf|moss|emerald/i, 'tree'],
        [/fire|lava|ember|inferno|magma|blaze|flame|solar/i, 'flame'],
        [/space|galaxy|nebula|cosmic|astral|star|void/i, 'galaxy'],
        [/night|moon|lunar|midnight|shadow|dusk/i, 'moon'],
        [/ice|frost|glacier|snow|arctic|crystal/i, 'snowflake'],
        [/gold|royal|imperial|king|queen|crown/i, 'crown'],
        [/rose|blossom|sakura|bloom|petal|flower/i, 'blossom'],
        [/mountain|peak|summit|canyon/i, 'mountain'],
        [/rain|mist|fog|drop/i, 'drop'],
        [/sun|dawn|sunrise|sunset|desert/i, 'sun']
    ];

    function svg(name, size) {
        var body = PATHS[name] || PATHS.palette;
        var dimension = size || 22;
        return '<svg class="rwl-icon rwl-icon-' + name + '" width="' + dimension + '" height="' + dimension + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
    }

    function themeIconName(item) {
        if (!item) return 'palette';
        if (item.is_default) return 'palette';
        var pieces = item.scene && Array.isArray(item.scene.pieces) ? item.scene.pieces : [];
        for (var index = 0; index < pieces.length; index++) {
            if (PIECES[pieces[index]]) return PIECES[pieces[index]];
        }
        var season = item.season || (item.scene && item.scene.season) || String(item.item_id || '').replace(/_\d{4}$/, '');
        if (item.exclusive && SEASONS[season]) return SEASONS[season];
        var name = String(item.name || '') + ' ' + String(item.item_id || '');
        for (var keyword = 0; keyword < KEYWORDS.length; keyword++) {
            if (KEYWORDS[keyword][0].test(name)) return KEYWORDS[keyword][1];
        }
        if (SEASONS[season]) return SEASONS[season];
        return 'palette';
    }

    global.RWLIcons = {
        svg: svg,
        themeIcon: function (item, size) { return svg(themeIconName(item), size); },
        themeIconName: themeIconName,
        names: Object.keys(PATHS)
    };
})(window);
