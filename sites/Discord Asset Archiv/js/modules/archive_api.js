(function registerArchiveApi(globalScope) {
    function routes() {
        return globalScope.archive_routes;
    }

    function apiBase() {
        return globalScope.RWL.apiBase;
    }

    function buildQuery(parameters) {
        const query = new URLSearchParams();
        Object.keys(parameters).forEach((key) => {
            const value = parameters[key];
            if (value !== undefined && value !== null && value !== "") {
                query.set(key, String(value));
            }
        });
        const text = query.toString();
        return text ? "?" + text : "";
    }

    function fetchOverview() {
        return globalScope.RWL.apiRequest(routes().overview_path);
    }

    function fetchItems(categoryId, searchText, pageNumber, perPage) {
        return globalScope.RWL.apiRequest(routes().items_path + buildQuery({ category: categoryId, q: searchText, page: pageNumber, per_page: perPage }));
    }

    function fetchShowcase() {
        return globalScope.RWL.apiRequest(routes().showcase_path);
    }

    function mediaUrl(itemId, partIndex, variant) {
        return apiBase() + routes().media_path + encodeURIComponent(itemId) + buildQuery({ part: partIndex || 0, variant: variant || "preview" });
    }

    function downloadUrl(itemId) {
        return apiBase() + routes().download_path + encodeURIComponent(itemId);
    }

    function downloadAllUrl(categoryId, searchText, partNumber) {
        return apiBase() + routes().download_all_path + buildQuery({ category: categoryId, q: searchText, part: partNumber });
    }

    globalScope.ArchiveApi = Object.freeze({
        fetchOverview,
        fetchItems,
        fetchShowcase,
        mediaUrl,
        downloadUrl,
        downloadAllUrl
    });
})(window);
