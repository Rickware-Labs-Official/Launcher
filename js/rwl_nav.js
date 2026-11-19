(function (global) {
    if (global.RWLNav) return;
    if (/[?&]rwl_preview=1/.test(global.location.search) || global.top !== global.self) return;

    function relocateBadges() {
        var profile = document.getElementById('userProfileBtn');
        var typeBadge = document.getElementById('accountTypeBadge');
        var permsBadge = document.getElementById('accountPermsBadge');
        if (!profile || !typeBadge || !permsBadge) return false;
        if (profile.querySelector('.rwl-nameplate-badges')) return true;
        var holder = document.createElement('span');
        holder.className = 'rwl-nameplate-badges';
        holder.appendChild(typeBadge);
        holder.appendChild(permsBadge);
        profile.appendChild(holder);
        return true;
    }

    function start() {
        if (!document.getElementById('sidebar')) return;
        if (relocateBadges()) return;
        var observer = new MutationObserver(function () {
            if (relocateBadges()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        global.setTimeout(function () { observer.disconnect(); }, 15000);
    }

    global.RWLNav = { relocateBadges: relocateBadges };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})(window);
