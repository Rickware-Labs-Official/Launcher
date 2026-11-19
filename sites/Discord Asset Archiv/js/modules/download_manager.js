(function registerDownloadManager(globalScope) {
    function triggerDownload(downloadUrl) {
        const anchorElement = document.createElement("a");
        anchorElement.href = downloadUrl;
        anchorElement.rel = "noopener";
        anchorElement.style.display = "none";
        document.body.appendChild(anchorElement);
        anchorElement.click();
        anchorElement.remove();
    }

    function wait(milliseconds) {
        return new Promise((resolve) => globalScope.setTimeout(resolve, milliseconds));
    }

    async function downloadAllParts(options) {
        const totalParts = Math.max(1, options.total_parts);
        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
            if (options.is_cancelled && options.is_cancelled()) {
                return false;
            }
            triggerDownload(options.build_url(partNumber));
            options.on_progress(partNumber, totalParts);
            if (partNumber < totalParts) {
                await wait(options.delay_ms);
            }
        }
        return true;
    }

    globalScope.ArchiveDownloads = Object.freeze({
        triggerDownload,
        downloadAllParts
    });
})(window);
