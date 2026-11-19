(function registerArchiveUtilities(globalScope) {
    const byteUnits = ["B", "KB", "MB", "GB", "TB"];

    function formatByteSize(rawBytes) {
        let value = Number(rawBytes);
        if (!Number.isFinite(value) || value < 0) {
            return "–";
        }
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < byteUnits.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        return (unitIndex === 0 ? String(Math.round(value)) : value.toFixed(value >= 100 ? 0 : 1)) + " " + byteUnits[unitIndex];
    }

    function formatDate(rawDate, fallbackLabel) {
        if (typeof rawDate !== "string" || rawDate.length === 0) {
            return fallbackLabel;
        }
        const parsedDate = new Date(rawDate + "T00:00:00");
        if (Number.isNaN(parsedDate.getTime())) {
            return fallbackLabel;
        }
        return parsedDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    function formatCount(rawCount) {
        const value = Number(rawCount);
        return Number.isFinite(value) ? value.toLocaleString() : "0";
    }

    function createDebouncer(callback, delayMilliseconds) {
        let timerHandle = null;
        return function debounced(...callArguments) {
            if (timerHandle !== null) {
                window.clearTimeout(timerHandle);
            }
            timerHandle = window.setTimeout(() => {
                timerHandle = null;
                callback(...callArguments);
            }, delayMilliseconds);
        };
    }

    function initialsOf(rawName) {
        const cleaned = String(rawName || "?").replace(/[^A-Za-z0-9 ]/g, "").trim();
        if (cleaned.length === 0) {
            return "?";
        }
        return cleaned.split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase();
    }

    globalScope.ArchiveUtils = Object.freeze({
        formatByteSize,
        formatDate,
        formatCount,
        createDebouncer,
        initialsOf
    });
})(window);
