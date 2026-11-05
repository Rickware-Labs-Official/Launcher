(function() {
    var passState = null;
    var loadedAt = Date.now();
    var busy = false;
    var showAllChallenges = true;
    var hintShown = false;
    var resetReloadPending = false;
    var esc = RWL.escapeHtml;

    function notify(message, type) {
        if (typeof showBanner === 'function') showBanner(message, type);
    }

    function getRewardIcon(type) {
        if (type === 'lc') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9 9a3 3 0 0 1 6 0c0 2-3 3-3 5"/></svg>';
        }
        if (type === 'xp') {
            return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        }
        if (type === 'chest') {
            return '<img src="../images/assets/lab_pass/rickware-labs_chest.webp" alt="Mystery Chest" style="width:28px;height:28px;object-fit:contain;">';
        }
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c97eff" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    }

    function ensureClaimStyles() {
        if (document.getElementById('lpClaimStyles')) return;
        var style = document.createElement('style');
        style.id = 'lpClaimStyles';
        style.textContent = '@keyframes lpClaimPulse{0%,100%{box-shadow:0 0 0 1px rgba(201,126,255,0.55),0 0 10px rgba(155,0,204,0.35)}50%{box-shadow:0 0 0 1px rgba(224,170,255,0.95),0 0 22px rgba(201,126,255,0.75)}}' +
            '.lp-cell-claimable{cursor:pointer;animation:lpClaimPulse 1.8s ease-in-out infinite;}' +
            '.lp-cell-claimable:hover{transform:translateY(-2px);}' +
            '.lp-hero-claimable{cursor:pointer;}';
        document.head.appendChild(style);
    }

    function lockIcon() {
        return '<div class="lp-reward-lock-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(201,126,255,0.5)" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>';
    }

    function checkIcon() {
        return '<div class="lp-reward-check-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>';
    }

    function rewardCellHtml(track, reward, currentLevel) {
        var isCurrent = reward.level === currentLevel;
        var cellClass = isCurrent ? 'lp-cell-active' : (reward.unlocked ? 'lp-cell-unlocked' : 'lp-cell-locked');
        if (reward.claimable) cellClass += ' lp-cell-claimable';
        var title = reward.claimed ? 'Claimed' : (reward.claimable ? 'Click to claim' : (track === 'premium' && !passState.progress.premium ? 'Premium Lab-Pass required' : 'Reach level ' + reward.level));
        var html = '<div class="lp-grid-cell ' + cellClass + '" data-track="' + track + '" data-level="' + reward.level + '" title="' + esc(reward.name + ' · ' + title) + '">';
        html += '<div class="lp-reward-icon-wrap">';
        html += '<div class="lp-reward-icon-placeholder">' + getRewardIcon(reward.icon) + '</div>';
        if (reward.claimed) html += checkIcon();
        else if (!reward.unlocked) html += lockIcon();
        html += '</div>';
        html += '<div class="lp-reward-name" translate="no">' + esc(reward.name) + '</div>';
        html += '</div>';
        return html;
    }

    function renderRewardsGrid() {
        var track = document.getElementById('lpRewardsTrack');
        if (!track || !passState) return;
        var maxLevel = passState.season.max_level;
        var currentLevel = passState.progress.level;
        var headerHtml = '<div class="lp-grid-header-row"><div class="lp-grid-header-spacer"></div>';
        for (var i = 1; i <= maxLevel; i++) {
            headerHtml += '<div class="lp-grid-level-header' + (i === currentLevel ? ' lp-level-active' : '') + '">' + i + '</div>';
        }
        headerHtml += '</div>';
        var freeRowHtml = '<div class="lp-grid-body-row lp-grid-free-row"><div class="lp-grid-row-label">Free</div>';
        passState.free_rewards.forEach(function(reward) { freeRowHtml += rewardCellHtml('free', reward, currentLevel); });
        freeRowHtml += '</div>';
        var premHtml = '<div class="lp-grid-body-row lp-grid-premium-row"><div class="lp-grid-row-label lp-grid-premium-label">Premium</div>';
        passState.premium_rewards.forEach(function(reward) { premHtml += rewardCellHtml('premium', reward, currentLevel); });
        premHtml += '</div>';
        track.innerHTML = headerHtml + freeRowHtml + premHtml;
    }

    function claimableCount() {
        if (!passState) return 0;
        return passState.free_rewards.concat(passState.premium_rewards).filter(function(reward) { return reward.claimable; }).length;
    }

    function formatDuration(seconds) {
        var total = Math.max(0, Math.floor(seconds));
        var days = Math.floor(total / 86400);
        var hours = Math.floor((total % 86400) / 3600);
        var minutes = Math.floor((total % 3600) / 60);
        if (days > 0) return days + 'd ' + hours + 'h';
        if (hours > 0) return hours + 'h ' + minutes + 'm';
        return minutes + 'm ' + (total % 60) + 's';
    }

    function elapsedSeconds() {
        return (Date.now() - loadedAt) / 1000;
    }

    function renderTimeLeft() {
        var element = document.getElementById('lpTimeLeft');
        if (!element || !passState || !passState.season) return;
        var season = passState.season;
        var remaining = season.seconds_left - elapsedSeconds();
        if (season.status === 'active') element.textContent = remaining > 0 ? formatDuration(remaining) + ' left' : 'Season ended';
        else if (season.status === 'upcoming') element.textContent = remaining > 0 ? 'Starts in ' + formatDuration(remaining) : 'Starting now';
        else element.textContent = 'Season ended';
    }

    function renderHeader() {
        var season = passState.season;
        var progress = passState.progress;
        var label = document.querySelector('.lp-season-label');
        if (label) label.textContent = String(season.name || '').toUpperCase();
        var currentLevel = document.getElementById('lpCurrentLevel');
        var nextLevel = document.getElementById('lpNextLevel');
        var xpBar = document.getElementById('lpXpBar');
        var xpText = document.getElementById('lpXpText');
        if (currentLevel) currentLevel.textContent = progress.level;
        if (nextLevel) nextLevel.textContent = progress.max_level_reached ? 'MAX' : progress.next_level;
        if (xpBar) xpBar.style.width = Math.max(0, Math.min(100, progress.level_xp / progress.next_level_xp * 100)) + '%';
        if (xpText) xpText.textContent = progress.max_level_reached ? 'Max level reached' : progress.level_xp + ' / ' + progress.next_level_xp + ' XP';
        var passPrice = document.getElementById('lpPassPrice');
        if (passPrice) passPrice.textContent = progress.premium ? 'Active' : season.premium_price_lc + ' LC';
        var activateBtn = document.getElementById('lpActivateBtn');
        if (activateBtn) {
            var activateLabel = progress.premium ? (progress.premium_included ? 'Included With Your Account' : 'Lab-Pass Active') : 'Activate Lab-Pass';
            var textNode = Array.prototype.filter.call(activateBtn.childNodes, function(node) { return node.nodeType === 3 && node.textContent.trim(); })[0];
            if (textNode) textNode.textContent = ' ' + activateLabel + ' ';
            activateBtn.disabled = progress.premium || season.status !== 'active';
            activateBtn.title = progress.premium ? 'Your premium Lab-Pass is active for this season' : 'Unlock all premium rewards for ' + season.premium_price_lc + ' LC';
        }
        var bundleNew = document.querySelector('.lp-bundle-price-new');
        var bundleOld = document.querySelector('.lp-bundle-price-old');
        var bundleDesc = document.querySelector('.lp-bundle-desc');
        var bundleDiscount = document.querySelector('.lp-bundle-discount');
        var bundleBtn = document.getElementById('lpBundleBtn');
        if (bundleNew) bundleNew.textContent = season.bundle_price_lc + ' LC';
        if (bundleOld) bundleOld.textContent = season.bundle_original_price_lc + ' LC';
        if (bundleDesc) bundleDesc.textContent = 'Pass + ' + season.bundle_levels + ' Levels';
        if (bundleDiscount && season.bundle_original_price_lc > 0) bundleDiscount.textContent = '-' + Math.round((1 - season.bundle_price_lc / season.bundle_original_price_lc) * 100) + '%';
        if (bundleBtn) {
            bundleBtn.disabled = progress.premium || season.status !== 'active';
            bundleBtn.textContent = progress.premium ? 'Pass Active' : 'Buy Bundle';
        }
        var hero = document.getElementById('lpHeroChest');
        if (hero) {
            var pending = claimableCount();
            hero.classList.toggle('lp-hero-claimable', pending > 0);
            hero.title = pending > 0 ? 'Click to claim all ' + pending + ' available rewards' : 'No rewards ready to claim';
        }
        renderBuyLevels();
        renderTimeLeft();
        renderClaimAll();
    }

    function renderBuyLevels() {
        var row = document.getElementById('lpBuyLevelRow');
        var optionsEl = document.getElementById('lpBuyLevelOptions');
        if (!row || !optionsEl) return;
        var info = passState.level_purchase;
        if (!info || !info.enabled || !info.options || !info.options.length || passState.season.status !== 'active') {
            row.style.display = 'none';
            return;
        }
        row.style.display = 'flex';
        optionsEl.innerHTML = info.options.map(function(option) {
            var affordable = passState.lab_coins >= option.price;
            var label = option.levels === 1 ? '+1 Level' : '+' + option.levels + ' Levels';
            return '<button class="lp-buy-level-btn' + (affordable ? '' : ' lp-buy-level-locked') + '" data-buy-levels="' + option.levels + '" title="Buy ' + option.levels + ' level(s) for ' + option.price + ' Lab Coins">' +
                '<span class="lp-buy-level-count">' + label + '</span>' +
                '<span class="lp-buy-level-price"><img src="../images/main/lc_coin_96.webp" alt="LC" onerror="this.style.display=\'none\'">' + option.price + ' LC</span>' +
            '</button>';
        }).join('');
    }

    async function buyLevels(count) {
        if (busy || !passState) return;
        var info = passState.level_purchase;
        var option = (info && info.options || []).filter(function(entry) { return entry.levels === count; })[0];
        if (!option) return;
        if (passState.lab_coins < option.price) { notify('Not enough Lab Coins. You need ' + option.price + ' LC for ' + count + ' level(s).', 'error'); return; }
        if (!window.confirm('Buy ' + count + ' Lab-Pass level(s) for ' + option.price + ' Lab Coins? Your balance: ' + passState.lab_coins + ' LC.')) return;
        busy = true;
        try {
            var result = await RWL.apiRequest('/api/season_pass/buy_levels', { method: 'POST', body: { levels: count } });
            applyPass(result.pass);
            notify('Bought ' + result.levels + ' level(s) for ' + result.lc_spent + ' LC. New balance: ' + result.lc_balance + ' LC.', 'success');
        } catch (error) {
            notify(error.message || 'The level purchase failed.', 'error');
        } finally {
            busy = false;
        }
    }

    function renderChallenges() {
        var list = document.getElementById('lpChallengesList');
        if (!list || !passState) return;
        var items = passState.daily_challenges.items.filter(function(item) { return showAllChallenges || !item.completed; });
        list.innerHTML = items.map(function(item) {
            var percent = Math.max(0, Math.min(100, item.progress / item.target * 100));
            return '<div class="lp-challenge-item" title="' + esc(item.source === 'client' && item.challenge_id !== 'visit_store' && item.challenge_id !== 'browse_tools' && item.challenge_id !== 'share_product' ? 'Tracked by the Rickware - Labs© Launcher' : 'Tracked automatically') + '">' +
                '<div class="lp-challenge-info">' +
                    '<span class="lp-challenge-name" translate="no">' + esc(item.name) + '</span>' +
                    '<div class="lp-challenge-bar-wrap">' +
                        '<div class="lp-challenge-bar-track"><div class="lp-challenge-bar-fill" style="width:' + percent + '%"></div></div>' +
                        '<span class="lp-challenge-prog">' + Math.min(item.progress, item.target) + '/' + item.target + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="lp-challenge-reward">' +
                    (item.swappable && passState.daily_challenges.swaps_left > 0 ? '<button type="button" class="lp-quest-swap" data-swap-quest="' + esc(item.challenge_id) + '" title="Swap this quest for another one (' + passState.daily_challenges.swaps_left + ' swaps left in the last 24 hours)">↻</button>' : '') +
                    (item.completed ? '<svg class="lp-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
                    '<span class="lp-xp-reward">' + item.xp + ' XP</span>' +
                '</div>' +
            '</div>';
        }).join('') || '<div class="lp-challenge-item"><div class="lp-challenge-info"><span class="lp-challenge-name">All daily challenges completed. Come back tomorrow!</span></div></div>';
        var allButton = document.getElementById('lpAllChallengesBtn');
        if (allButton) allButton.textContent = showAllChallenges ? 'Hide Completed' : 'All Challenges';
        renderSwapInfo();
    }

    function renderSwapInfo() {
        var list = document.getElementById('lpChallengesList');
        if (!list || !passState) return;
        var info = document.getElementById('lpSwapInfo');
        if (!info) {
            info = document.createElement('div');
            info.id = 'lpSwapInfo';
            info.className = 'lp-swap-info';
            list.parentNode.insertBefore(info, list);
        }
        var daily = passState.daily_challenges;
        info.textContent = 'Quest swaps left: ' + daily.swaps_left + ' / ' + daily.swaps_per_day + (daily.next_swap_in_seconds ? ' · Next swap in ' + formatDuration(daily.next_swap_in_seconds) : '');
    }

    async function swapQuest(challengeId) {
        if (busy) return;
        busy = true;
        try {
            var result = await RWL.apiRequest('/api/season_pass/quests/swap', { method: 'POST', body: { challenge_id: challengeId } });
            applyPass(result.pass);
            notify('The quest was swapped.', 'success');
        } catch (error) {
            notify(error.message || 'The quest could not be swapped.', 'error');
        } finally {
            busy = false;
        }
    }

    function renderClaimAll() {
        var pending = claimableCount();
        var button = document.getElementById('lpClaimAllBtn');
        if (!button) {
            var hero = document.getElementById('lpHeroChest');
            if (!hero || !hero.parentNode) return;
            button = document.createElement('button');
            button.type = 'button';
            button.id = 'lpClaimAllBtn';
            button.className = 'lp-claim-all';
            button.title = 'Claim every unlocked reward at once';
            hero.parentNode.insertBefore(button, hero.nextSibling);
            button.addEventListener('click', function() {
                if (claimableCount() > 0) claim({ claim_all: true }, true);
            });
        }
        button.textContent = pending > 0 ? 'Claim All (' + pending + ')' : 'Nothing To Claim';
        button.disabled = pending === 0;
    }

    function rewardRevealEntries(claims, labCoins) {
        var entries = [];
        if (labCoins) entries.push({ title: labCoins + ' LC', subtitle: 'Lab Coins', rarity: 'Rare' });
        claims.forEach(function(claim) {
            if (claim.items) {
                claim.items.forEach(function(item) {
                    if (item.fallback_lab_coins) return;
                    entries.push({ title: item.name || claim.name, subtitle: item.duplicate ? 'Duplicate' : (item.category_label || claim.name), rarity: item.rarity || 'Rare' });
                });
            } else if (claim.type !== 'lab_coins') {
                entries.push({ title: claim.name, subtitle: 'Level ' + claim.level, rarity: 'Rare' });
            }
        });
        return entries;
    }

    function showRewardReveal(claims, labCoins) {
        var entries = rewardRevealEntries(claims, labCoins);
        if (!entries.length) return;
        var overlay = document.createElement('div');
        overlay.className = 'lp-reveal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        var capped = entries.slice(0, 60);
        overlay.innerHTML = '<div class="lp-reveal-card"><h2>' + esc(entries.length + ' Rewards Claimed') + '</h2><div class="lp-reveal-grid">' + capped.map(function(entry, index) {
            var color = RWL.rarityColor(entry.rarity);
            return '<div class="lp-reveal-item" style="--rwl-keep:1;border-color:' + esc(color) + ';animation-delay:' + Math.min(index * 45, 1400) + 'ms;"><strong translate="no">' + esc(entry.title) + '</strong><span>' + esc(entry.subtitle) + '</span></div>';
        }).join('') + '</div>' + (entries.length > capped.length ? '<div class="lp-reveal-more">+' + (entries.length - capped.length) + ' more</div>' : '') + '<button type="button" class="lp-claim-all" title="Close this overview">Continue</button></div>';
        function close() {
            overlay.remove();
            document.removeEventListener('keydown', onKey);
        }
        function onKey(event) {
            if (event.key === 'Escape') close();
        }
        overlay.addEventListener('click', function(event) {
            if (event.target === overlay || event.target.closest('.lp-claim-all')) close();
        });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
    }

    function updateChallengeTimer() {
        var timer = document.getElementById('lpChallengeTimer');
        if (!timer) return;
        if (!passState || !passState.daily_challenges) {
            var now = new Date();
            var tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
            timer.textContent = formatDuration((tomorrow - now) / 1000);
            return;
        }
        var remaining = passState.daily_challenges.seconds_until_reset - elapsedSeconds();
        if (remaining <= 0) {
            timer.textContent = '0m 0s';
            if (!resetReloadPending) {
                resetReloadPending = true;
                loadPass().finally(function() { resetReloadPending = false; });
            }
            return;
        }
        var hours = Math.floor(remaining / 3600);
        var minutes = Math.floor((remaining % 3600) / 60);
        var seconds = Math.floor(remaining % 60);
        timer.textContent = hours + 'h ' + minutes + 'm ' + seconds + 's';
    }

    function applyPass(data) {
        if (!data || !data.season) return;
        passState = data;
        loadedAt = Date.now();
        renderHeader();
        renderRewardsGrid();
        renderChallenges();
        if (typeof setLabCoinsBalance === 'function' && data.lab_coins !== undefined) setLabCoinsBalance(data.lab_coins);
        if (!hintShown && claimableCount() > 0) {
            hintShown = true;
            notify('You have ' + claimableCount() + ' rewards ready. Click a glowing reward or the Season Chest to claim everything.', 'info');
        }
    }

    function showUnavailable(status) {
        var element = document.getElementById('lpTimeLeft');
        if (element) element.textContent = status === 'disabled' ? 'Unavailable' : 'Coming Soon';
        var track = document.getElementById('lpRewardsTrack');
        if (track) track.innerHTML = '<div style="padding:30px;color:rgba(255,255,255,0.6);">The next Lab-Pass season is being prepared. Check back soon!</div>';
    }

    async function loadPass() {
        if (!RWL.getToken()) {
            window.location.href = './login_register.html?tab=login';
            return;
        }
        try {
            var data = await RWL.apiRequest('/api/season_pass');
            if (!data.season) {
                showUnavailable(data.status);
                return;
            }
            applyPass(data);
        } catch (error) {
            if (error.status === 401) {
                window.location.href = './login_register.html?tab=login';
                return;
            }
            notify(error.message || 'The Lab-Pass could not be loaded.', 'error');
        }
    }

    function describeClaims(claims, labCoins) {
        var parts = [];
        claims.forEach(function(claim) {
            if (claim.items) {
                claim.items.forEach(function(item) {
                    if (item.fallback_lab_coins) return;
                    parts.push((item.name || claim.name) + (item.duplicate ? ' (duplicate)' : ''));
                });
            } else if (claim.type !== 'lab_coins') {
                parts.push(claim.name);
            }
        });
        if (labCoins) parts.unshift(labCoins + ' LC');
        var unique = parts.slice(0, 6).join(', ');
        return unique + (parts.length > 6 ? ' and ' + (parts.length - 6) + ' more' : '');
    }

    async function claim(body, reveal) {
        if (busy) return;
        busy = true;
        try {
            var result = await RWL.apiRequest('/api/season_pass/claim', { method: 'POST', body: body });
            applyPass(result.pass);
            if (reveal) showRewardReveal(result.claimed || [], result.lab_coins_awarded || 0);
            else notify('Claimed: ' + describeClaims(result.claimed || [], result.lab_coins_awarded || 0), 'success');
        } catch (error) {
            notify(error.message || 'The reward could not be claimed.', 'error');
        } finally {
            busy = false;
        }
    }

    async function purchase(bundle) {
        if (busy || !passState) return;
        var season = passState.season;
        var price = bundle ? season.bundle_price_lc : season.premium_price_lc;
        var label = bundle ? 'the Lab-Pass Bundle (Pass + ' + season.bundle_levels + ' Levels)' : 'the premium Lab-Pass';
        if (!window.confirm('Buy ' + label + ' for ' + price + ' Lab Coins? Your balance: ' + passState.lab_coins + ' LC. Lab-Pass purchases are final.')) return;
        busy = true;
        try {
            var result = await RWL.apiRequest('/api/season_pass/purchase', { method: 'POST', body: { bundle: !!bundle } });
            applyPass(result.pass);
            notify('Lab-Pass activated! ' + result.lc_spent + ' LC spent, new balance: ' + result.lc_balance + ' LC.', 'success');
        } catch (error) {
            notify(error.message || 'The purchase failed.', 'error');
        } finally {
            busy = false;
        }
    }

    function setupInteractions() {
        var track = document.getElementById('lpRewardsTrack');
        if (track) {
            track.addEventListener('click', function(e) {
                var cell = e.target.closest('.lp-grid-cell');
                if (!cell || !passState) return;
                var trackName = cell.getAttribute('data-track');
                var level = parseInt(cell.getAttribute('data-level'), 10);
                var rewards = trackName === 'premium' ? passState.premium_rewards : passState.free_rewards;
                var reward = rewards.filter(function(entry) { return entry.level === level; })[0];
                if (!reward) return;
                if (reward.claimable) { claim({ track: trackName, level: level }); return; }
                if (reward.claimed) { notify(reward.name + ' was already claimed.', 'info'); return; }
                if (trackName === 'premium' && !passState.progress.premium) { notify('Activate the premium Lab-Pass to unlock premium rewards.', 'info'); return; }
                notify('Reach level ' + level + ' to unlock ' + reward.name + '.', 'info');
            });
        }
        var hero = document.getElementById('lpHeroChest');
        if (hero) {
            hero.addEventListener('click', function() {
                if (claimableCount() > 0) claim({ claim_all: true }, true);
            });
        }
        var activateBtn = document.getElementById('lpActivateBtn');
        if (activateBtn) activateBtn.addEventListener('click', function() { purchase(false); });
        var priceBtn = document.getElementById('lpPriceBtn');
        if (priceBtn) priceBtn.addEventListener('click', function() { if (passState && !passState.progress.premium) purchase(false); });
        var bundleBtn = document.getElementById('lpBundleBtn');
        if (bundleBtn) bundleBtn.addEventListener('click', function() { purchase(true); });
        var buyOptions = document.getElementById('lpBuyLevelOptions');
        if (buyOptions) {
            buyOptions.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-buy-levels]');
                if (btn) buyLevels(parseInt(btn.getAttribute('data-buy-levels'), 10));
            });
        }
        var questList = document.getElementById('lpChallengesList');
        if (questList) {
            questList.addEventListener('click', function(e) {
                var swap = e.target.closest('[data-swap-quest]');
                if (swap) swapQuest(swap.getAttribute('data-swap-quest'));
            });
        }
        var allButton = document.getElementById('lpAllChallengesBtn');
        if (allButton) {
            allButton.addEventListener('click', function() {
                showAllChallenges = !showAllChallenges;
                renderChallenges();
            });
        }
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
        var dragMoved = false;
        var startX = 0;
        var startScroll = 0;

        scrollEl.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragMoved = false;
            startX = e.pageX - scrollEl.offsetLeft;
            startScroll = scrollEl.scrollLeft;
            scrollEl.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            e.preventDefault();
            var x = e.pageX - scrollEl.offsetLeft;
            if (Math.abs(x - startX) > 4) dragMoved = true;
            scrollEl.scrollLeft = startScroll - (x - startX);
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                scrollEl.style.cursor = 'grab';
            }
        });

        scrollEl.addEventListener('click', function(e) {
            if (dragMoved) {
                e.stopPropagation();
                dragMoved = false;
            }
        }, true);

        updateFill();
    }

    function scrollToCurrentLevel() {
        var scrollEl = document.getElementById('lpRewardsScroll');
        var active = document.querySelector('.lp-grid-level-header.lp-level-active');
        if (!scrollEl || !active) return;
        scrollEl.scrollLeft = Math.max(0, active.offsetLeft - scrollEl.clientWidth / 2);
    }

    document.addEventListener('DOMContentLoaded', async function() {
        ensureClaimStyles();
        var challengeList = document.getElementById('lpChallengesList');
        if (challengeList) challengeList.innerHTML = '<div class="lp-challenge-item"><div class="lp-challenge-info"><span class="lp-challenge-name">Loading daily challenges...</span></div></div>';
        initSlider();
        setupInteractions();
        updateChallengeTimer();
        setInterval(function() {
            updateChallengeTimer();
            renderTimeLeft();
        }, 1000);
        await loadPass();
        scrollToCurrentLevel();
        setInterval(function() { if (!document.hidden && !busy) loadPass(); }, 60000);
    });
})();
