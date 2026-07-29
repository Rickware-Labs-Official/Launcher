(function() {
    var LP_LEVELS = 100;
    var LP_CURRENT_LEVEL = 1;
    var LP_CURRENT_XP = 50;
    var LP_NEXT_XP = 250;
    var LP_HAS_PREMIUM = false;
    var LP_DAYS_LEFT = 0;
    var LP_SEASON = 'Season 1: Coming Soon';
    var LP_PASS_PRICE = 39;

    var freeRewards = [
        { level: 1, type: 'lc', amount: 5, name: '5 LC', unlocked: true },
        { level: 2, type: 'xp', name: 'XP', unlocked: false },
        { level: 3, type: 'item', name: '1 Day License', unlocked: false },
        { level: 4, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 5, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 6, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 7, type: 'xp', name: 'XP', unlocked: false },
        { level: 8, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 9, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 10, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 11, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 12, type: 'item', name: '1 Day License', unlocked: false },
        { level: 13, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 14, type: 'xp', name: 'XP', unlocked: false },
        { level: 15, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 16, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 17, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 18, type: 'xp', name: 'XP', unlocked: false },
        { level: 19, type: 'item', name: '1 Day License', unlocked: false },
        { level: 20, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 21, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 22, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 23, type: 'xp', name: 'XP', unlocked: false },
        { level: 24, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 25, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 26, type: 'item', name: '1 Day License', unlocked: false },
        { level: 27, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 28, type: 'xp', name: 'XP', unlocked: false },
        { level: 29, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 30, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 31, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 32, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 33, type: 'xp', name: 'XP', unlocked: false },
        { level: 34, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 35, type: 'item', name: '1 Day License', unlocked: false },
        { level: 36, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 37, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 38, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 39, type: 'xp', name: 'XP', unlocked: false },
        { level: 40, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 41, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 42, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 43, type: 'item', name: '1 Day License', unlocked: false },
        { level: 44, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 45, type: 'xp', name: 'XP', unlocked: false },
        { level: 46, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 47, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 48, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 49, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 50, type: 'xp', name: 'XP', unlocked: false },
        { level: 51, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 52, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 53, type: 'item', name: '1 Day License', unlocked: false },
        { level: 54, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 55, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 56, type: 'xp', name: 'XP', unlocked: false },
        { level: 57, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 58, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 59, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 60, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 61, type: 'item', name: '5% Coupon', unlocked: false },
        { level: 62, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 63, type: 'xp', name: 'XP', unlocked: false },
        { level: 64, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 65, type: 'item', name: '10% Coupon', unlocked: false },
        { level: 66, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 67, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 68, type: 'item', name: '1 Day License', unlocked: false },
        { level: 69, type: 'xp', name: 'XP', unlocked: false },
        { level: 70, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 71, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 72, type: 'item', name: '15% Coupon', unlocked: false },
        { level: 73, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 74, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 75, type: 'xp', name: 'XP', unlocked: false },
        { level: 76, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 77, type: 'item', name: '1 Day License', unlocked: false },
        { level: 78, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 79, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 80, type: 'xp', name: 'XP', unlocked: false },
        { level: 81, type: 'item', name: '5% Coupon', unlocked: false },
        { level: 82, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 83, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 84, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 85, type: 'xp', name: 'XP', unlocked: false },
        { level: 86, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 87, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 88, type: 'item', name: '1 Day License', unlocked: false },
        { level: 89, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 90, type: 'xp', name: 'XP', unlocked: false },
        { level: 91, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 92, type: 'item', name: '10% Coupon', unlocked: false },
        { level: 93, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 94, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 95, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 96, type: 'xp', name: 'XP', unlocked: false },
        { level: 97, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 98, type: 'lc', amount: 5, name: '5 LC', unlocked: false },
        { level: 99, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 100, type: 'chest', name: 'Mystery Chest', unlocked: false }
    ];

    var premiumRewards = [
        { level: 1, type: 'lc', amount: 20, name: '20 LC', unlocked: false },
        { level: 2, type: 'xp', name: 'XP', unlocked: false },
        { level: 3, type: 'item', name: '1 Day License', unlocked: false },
        { level: 4, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 5, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 6, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 7, type: 'xp', name: 'XP', unlocked: false },
        { level: 8, type: 'lc', amount: 20, name: '20 LC', unlocked: false },
        { level: 9, type: 'item', name: '1 Week License', unlocked: false },
        { level: 10, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 11, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 12, type: 'xp', name: 'XP', unlocked: false },
        { level: 13, type: 'item', name: '1 Day License', unlocked: false },
        { level: 14, type: 'lc', amount: 20, name: '20 LC', unlocked: false },
        { level: 15, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 16, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 17, type: 'xp', name: 'XP', unlocked: false },
        { level: 18, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 19, type: 'item', name: '1 Week License', unlocked: false },
        { level: 20, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 21, type: 'lc', amount: 20, name: '20 LC', unlocked: false },
        { level: 22, type: 'xp', name: 'XP', unlocked: false },
        { level: 23, type: 'item', name: '1 Day License', unlocked: false },
        { level: 24, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 25, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 26, type: 'xp', name: 'XP', unlocked: false },
        { level: 27, type: 'lc', amount: 20, name: '20 LC', unlocked: false },
        { level: 28, type: 'item', name: '1 Week License', unlocked: false },
        { level: 29, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 30, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 31, type: 'item', name: 'Launcher Name Color', unlocked: false },
        { level: 32, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 33, type: 'xp', name: 'XP', unlocked: false },
        { level: 34, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 35, type: 'item', name: '1 Week License', unlocked: false },
        { level: 36, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 37, type: 'item', name: 'Launcher Nameplate', unlocked: false },
        { level: 38, type: 'lc', amount: 60, name: '60 LC', unlocked: false },
        { level: 39, type: 'xp', name: 'XP', unlocked: false },
        { level: 40, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 41, type: 'item', name: '1 Day License', unlocked: false },
        { level: 42, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 43, type: 'item', name: '2x Launcher Name Color', unlocked: false },
        { level: 44, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 45, type: 'xp', name: 'XP', unlocked: false },
        { level: 46, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 47, type: 'item', name: '1 Week License', unlocked: false },
        { level: 48, type: 'lc', amount: 60, name: '60 LC', unlocked: false },
        { level: 49, type: 'item', name: '2x Launcher Nameplate', unlocked: false },
        { level: 50, type: 'xp', name: 'XP', unlocked: false },
        { level: 51, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 52, type: 'lc', amount: 30, name: '30 LC', unlocked: false },
        { level: 53, type: 'item', name: '1 Day License', unlocked: false },
        { level: 54, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 55, type: 'xp', name: 'XP', unlocked: false },
        { level: 56, type: 'item', name: '2x Launcher Name Color', unlocked: false },
        { level: 57, type: 'lc', amount: 60, name: '60 LC', unlocked: false },
        { level: 58, type: 'item', name: 'Launcher PB Deco', unlocked: false },
        { level: 59, type: 'item', name: '1 Week License', unlocked: false },
        { level: 60, type: 'item', name: '2x Launcher Nameplate', unlocked: false },
        { level: 61, type: 'item', name: '5% Coupon', unlocked: false },
        { level: 62, type: 'lc', amount: 60, name: '60 LC', unlocked: false },
        { level: 63, type: 'xp', name: 'XP', unlocked: false },
        { level: 64, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 65, type: 'item', name: '10% Coupon', unlocked: false },
        { level: 66, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 67, type: 'item', name: '2x Launcher Name Color', unlocked: false },
        { level: 68, type: 'item', name: '1 Week License', unlocked: false },
        { level: 69, type: 'xp', name: 'XP', unlocked: false },
        { level: 70, type: 'lc', amount: 90, name: '90 LC', unlocked: false },
        { level: 71, type: 'item', name: '2x Launcher Nameplate', unlocked: false },
        { level: 72, type: 'item', name: '15% Coupon', unlocked: false },
        { level: 73, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 74, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 75, type: 'xp', name: 'XP', unlocked: false },
        { level: 76, type: 'item', name: '2x 1 Day License', unlocked: false },
        { level: 77, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 78, type: 'lc', amount: 60, name: '60 LC', unlocked: false },
        { level: 79, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 80, type: 'xp', name: 'XP', unlocked: false },
        { level: 81, type: 'item', name: '2x 1 Week License', unlocked: false },
        { level: 82, type: 'lc', amount: 90, name: '90 LC', unlocked: false },
        { level: 83, type: 'item', name: '5% Coupon', unlocked: false },
        { level: 84, type: 'item', name: '2x Launcher Name Color', unlocked: false },
        { level: 85, type: 'xp', name: 'XP', unlocked: false },
        { level: 86, type: 'chest', name: 'Mystery Chest', unlocked: false },
        { level: 87, type: 'item', name: '10% Coupon', unlocked: false },
        { level: 88, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 89, type: 'item', name: '2x Launcher Nameplate', unlocked: false },
        { level: 90, type: 'xp', name: 'XP', unlocked: false },
        { level: 91, type: 'lc', amount: 60, name: '60 LC', unlocked: false },
        { level: 92, type: 'item', name: '15% Coupon', unlocked: false },
        { level: 93, type: 'item', name: '2x 1 Week License', unlocked: false },
        { level: 94, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 95, type: 'xp', name: 'XP', unlocked: false },
        { level: 96, type: 'lc', amount: 90, name: '90 LC', unlocked: false },
        { level: 97, type: 'item', name: '2x Launcher Name Color', unlocked: false },
        { level: 98, type: 'item', name: 'Launcher Theme', unlocked: false },
        { level: 99, type: 'item', name: '2x Launcher PB Deco', unlocked: false },
        { level: 100, type: 'chest', name: 'Mystery Chest', unlocked: false }
    ];

    function getRewardIcon(type) {
        if (type === 'lc') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9a3 3 0 0 1 6 0c0 2-3 3-3 5"/></svg>';
        }
        if (type === 'xp') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        }
        if (type === 'sticker') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18M9 21V9"/></svg>';
        }
        if (type === 'banner') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
        }
        if (type === 'nitro') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l4-4 4 4M12 8v8"/></svg>';
        }
        if (type === 'chest') {
            return '<img src="../images/assets/lab_pass/rickware-labs_chest.webp" alt="Mystery Chest" style="width:28px;height:28px;object-fit:contain;">';
        }
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    }

    function renderRewardsGrid() {
        var track = document.getElementById('lpRewardsTrack');
        if (!track) return;

        var headerHtml = '<div class="lp-grid-header-row"><div class="lp-grid-header-spacer"></div>';
        for (var i = 1; i <= LP_LEVELS; i++) {
            var isActive = (i === LP_CURRENT_LEVEL);
            headerHtml += '<div class="lp-grid-level-header' + (isActive ? ' lp-level-active' : '') + '">' + i + '</div>';
        }
        headerHtml += '</div>';

        var freeRowHtml = '<div class="lp-grid-body-row lp-grid-free-row"><div class="lp-grid-row-label">Free</div>';
        for (var fi = 1; fi <= LP_LEVELS; fi++) {
            var fr = freeRewards[fi - 1];
            var isAct = (fi === LP_CURRENT_LEVEL);
            var isUnl = fr.unlocked && !fr.current;
            var cellClass = isAct ? 'lp-cell-active' : (isUnl ? 'lp-cell-unlocked' : 'lp-cell-locked');
            freeRowHtml += '<div class="lp-grid-cell ' + cellClass + '">';
            freeRowHtml += '<div class="lp-reward-icon-wrap">';
            freeRowHtml += '<div class="lp-reward-icon-placeholder">' + getRewardIcon(fr.type) + '</div>';
            if (!isUnl && !isAct) {
                freeRowHtml += '<div class="lp-reward-lock-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(201,126,255,0.5)" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>';
            } else if (isUnl) {
                freeRowHtml += '<div class="lp-reward-check-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>';
            }
            freeRowHtml += '</div>';
            freeRowHtml += '<div class="lp-reward-name">' + fr.name + '</div>';
            freeRowHtml += '</div>';
        }
        freeRowHtml += '</div>';

        var premHtml = '<div class="lp-grid-body-row lp-grid-premium-row"><div class="lp-grid-row-label lp-grid-premium-label">Premium</div>';
        for (var pi = 1; pi <= LP_LEVELS; pi++) {
            var pr = premiumRewards[pi - 1];
            var isActP = (pi === LP_CURRENT_LEVEL);
            var isUnlP = pr.unlocked && !pr.current;
            var cellClassP = isActP ? 'lp-cell-active' : (isUnlP ? 'lp-cell-unlocked' : 'lp-cell-locked');
            premHtml += '<div class="lp-grid-cell ' + cellClassP + '">';
            premHtml += '<div class="lp-reward-icon-wrap">';
            premHtml += '<div class="lp-reward-icon-placeholder">' + getRewardIcon(pr.type) + '</div>';
            if (!isUnlP && !isActP) {
                premHtml += '<div class="lp-reward-lock-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(201,126,255,0.5)" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>';
            } else if (isUnlP) {
                premHtml += '<div class="lp-reward-check-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>';
            }
            premHtml += '</div>';
            premHtml += '<div class="lp-reward-name">' + pr.name + '</div>';
            premHtml += '</div>';
        }
        premHtml += '</div>';

        track.innerHTML = headerHtml + freeRowHtml + premHtml;
    }

    function initSlider() {
        var scrollEl = document.getElementById('lpRewardsScroll');
        var fillEl = document.getElementById('lpSliderFill');
        var trackEl = document.getElementById('lpSliderTrack');
        var btnLeft = document.getElementById('lpSliderLeft');
        var btnRight = document.getElementById('lpSliderRight');

        if (!scrollEl || !fillEl || !trackEl || !btnLeft || !btnRight) return;

        function updateFill() {
            var max = scrollEl.scrollWidth - scrollEl.clientWidth;
            if (max <= 0) {
                fillEl.style.width = '100%';
                return;
            }
            var pct = (scrollEl.scrollLeft / max) * 100;
            fillEl.style.width = pct + '%';
        }

        scrollEl.addEventListener('scroll', updateFill);
        window.addEventListener('resize', updateFill);

        btnLeft.addEventListener('click', function() {
            scrollEl.scrollBy({ left: -200, behavior: 'smooth' });
        });

        btnRight.addEventListener('click', function() {
            scrollEl.scrollBy({ left: 200, behavior: 'smooth' });
        });

        trackEl.addEventListener('click', function(e) {
            var rect = trackEl.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            var max = scrollEl.scrollWidth - scrollEl.clientWidth;
            scrollEl.scrollLeft = pct * max;
        });

        var isDragging = false;
        var startX = 0;
        var startScroll = 0;

        scrollEl.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.pageX - scrollEl.offsetLeft;
            startScroll = scrollEl.scrollLeft;
            scrollEl.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            e.preventDefault();
            var x = e.pageX - scrollEl.offsetLeft;
            scrollEl.scrollLeft = startScroll - (x - startX);
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                scrollEl.style.cursor = 'grab';
            }
        });

        updateFill();
    }

    function updateChallengeTimer() {
        var lpChallengeTimer = document.getElementById('lpChallengeTimer');
        if (!lpChallengeTimer) return;

        var now = new Date();
        var tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        var diff = tomorrow - now;
        var hours = Math.floor(diff / (1000 * 60 * 60));
        var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((diff % (1000 * 60)) / 1000);

        lpChallengeTimer.textContent = hours + 'h ' + minutes + 'm ' + seconds + 's';
    }

    document.addEventListener('DOMContentLoaded', function() {
        renderRewardsGrid();
        initSlider();
        updateChallengeTimer();
        setInterval(updateChallengeTimer, 1000);
    });
})();