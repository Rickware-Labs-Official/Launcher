(function startArchiveApplication() {
    "use strict";

    const configuration = window.app_configuration;
    const labels = window.archive_labels;
    const utils = window.ArchiveUtils;
    const api = window.ArchiveApi;
    const downloads = window.ArchiveDownloads;
    const rwl = window.RWL;

    const state = {
        overview: null,
        showcase: null,
        categoryId: null,
        searchText: "",
        pageNumber: 1,
        perPage: configuration.app_settings.items_per_page,
        totalPages: 1,
        totalItems: 0,
        requestSerial: 0,
        downloadBusy: false,
        failed: false
    };

    const elements = {};
    const lazyVideos = new Set();
    let videoObserver = null;
    let tooltipTarget = null;

    function translate(text) {
        return window.RWLI18n && window.RWLI18n.t ? window.RWLI18n.t(text) : text;
    }

    function label(key) {
        return translate(labels[key] || key);
    }

    function selectElements() {
        [
            "categoryCounterGrid", "categoryTabsContainer", "assetSearchInput", "clearSearchInputButton", "itemsPerPageSelect",
            "downloadAllCategoryButton", "downloadAllProgressFill", "downloadAllButtonText", "assetsGridContainer",
            "paginationNumbersGroup", "previousPageButton", "nextPageButton", "statusSourceDot", "statusSourceValue",
            "statusTotalValue", "statusSizeValue", "statusUpdateValue", "validationFeedbackBanner", "customTooltipBox",
            "toastNotificationContainer", "backToTopButton", "mainScrollableWorkspace", "previewProfileText", "previewProfileSignIn",
            "backToStoreButton", "openLauncherButton", "joinDiscordButton", "assetScraperGithubButton", "brandLogoImage"
        ].forEach((identifier) => {
            elements[identifier] = document.getElementById(identifier);
        });
    }

    function showToast(messageText, isError) {
        const card = document.createElement("div");
        card.className = "toast-message-card" + (isError ? " toast-error" : "");
        card.textContent = messageText;
        elements.toastNotificationContainer.appendChild(card);
        while (elements.toastNotificationContainer.children.length > 4) {
            elements.toastNotificationContainer.firstChild.remove();
        }
        window.setTimeout(() => card.remove(), 4200);
    }

    function openExternal(rawUrl) {
        const target = new URL(rawUrl, window.location.href).href;
        if (window.RickwareBridge && window.RickwareBridge.isLauncher) {
            window.RickwareBridge.call("openExternal", { url: target }).catch(() => {});
            return;
        }
        window.open(target, "_blank", "noopener");
    }

    function setSourceStatus(kind) {
        const dot = elements.statusSourceDot;
        dot.classList.remove("status-dot-warning", "status-dot-error");
        if (kind === "loading") {
            dot.classList.add("status-dot-warning");
            elements.statusSourceValue.textContent = label("status_loading");
        } else if (kind === "error") {
            dot.classList.add("status-dot-error");
            elements.statusSourceValue.textContent = label("status_offline");
        } else {
            elements.statusSourceValue.textContent = label("status_online");
        }
    }

    function categoryById(categoryId) {
        return state.overview.categories.find((entry) => entry.category_id === categoryId) || null;
    }

    function identity() {
        const showcase = state.showcase && state.showcase.available ? state.showcase : null;
        return showcase ? showcase.identity || {} : {};
    }

    function pictureSource() {
        const showcase = state.showcase && state.showcase.available ? state.showcase : null;
        return showcase && showcase.profile_picture ? showcase.profile_picture : "";
    }

    function ownDecorationSource() {
        const current = identity();
        return current.avatar_decoration_thumb_url || current.avatar_decoration_url || "";
    }

    function createLazyImage(sourceUrl, className, altText) {
        const imageElement = document.createElement("img");
        imageElement.className = className;
        imageElement.alt = altText;
        imageElement.decoding = "async";
        imageElement.loading = "lazy";
        imageElement.draggable = false;
        imageElement.src = sourceUrl;
        imageElement.addEventListener("error", () => imageElement.classList.add("media-missing"));
        return imageElement;
    }

    function createAvatarStack(decorationSource, stackClassName, decorationFilter) {
        const stackElement = document.createElement("div");
        stackElement.className = "avatar-stack " + stackClassName;
        const ringElement = document.createElement("div");
        ringElement.className = "avatar-ring";
        const pictureUrl = pictureSource();
        if (pictureUrl) {
            ringElement.appendChild(createLazyImage(pictureUrl, "avatar-image", "Preview profile picture"));
        } else {
            const fallback = document.createElement("span");
            fallback.className = "avatar-image avatar-fallback";
            fallback.textContent = utils.initialsOf(state.showcase && state.showcase.display_name);
            ringElement.appendChild(fallback);
        }
        stackElement.appendChild(ringElement);
        if (decorationSource) {
            const overlay = createLazyImage(decorationSource, "avatar-decoration-overlay", "Avatar decoration");
            if (decorationFilter) {
                overlay.setAttribute("style", rwl.mediaFilterStyle(decorationFilter));
            }
            stackElement.appendChild(overlay);
        }
        const statusDot = document.createElement("span");
        statusDot.className = "avatar-status-dot online";
        stackElement.appendChild(statusDot);
        return stackElement;
    }

    function applyNameStyle(element) {
        const current = identity();
        const style = rwl.nameColorStyle(current, "#f5ecff");
        style.split(";").forEach((rule) => {
            const separator = rule.indexOf(":");
            if (separator > 0) {
                element.style.setProperty(rule.slice(0, separator).trim(), rule.slice(separator + 1).trim());
            }
        });
    }

    function displayName() {
        const showcase = state.showcase && state.showcase.available ? state.showcase : null;
        return showcase ? showcase.display_name : "Rickware - Labs©";
    }

    function createMiniProfileCard(decorationSource, decorationFilter) {
        const showcase = state.showcase && state.showcase.available ? state.showcase : null;
        const cardElement = document.createElement("div");
        cardElement.className = "mini-profile-card";
        const bannerElement = document.createElement("div");
        bannerElement.className = "mini-banner";
        if (showcase && (showcase.profile_banner_poster_url || showcase.profile_banner_url)) {
            bannerElement.appendChild(createLazyImage(showcase.profile_banner_poster_url || showcase.profile_banner_url, "mini-banner-image", "Preview banner"));
        }
        cardElement.appendChild(bannerElement);
        cardElement.appendChild(createAvatarStack(decorationSource, "mini-avatar-stack", decorationFilter));
        const identityElement = document.createElement("div");
        identityElement.className = "mini-identity";
        const nameElement = document.createElement("strong");
        nameElement.className = "mini-display-name";
        nameElement.setAttribute("translate", "no");
        nameElement.textContent = displayName();
        applyNameStyle(nameElement);
        const handleElement = document.createElement("span");
        handleElement.className = "mini-handle-text";
        handleElement.setAttribute("translate", "no");
        handleElement.textContent = showcase ? "@" + showcase.username : "";
        const aboutElement = document.createElement("p");
        aboutElement.className = "mini-about-text";
        aboutElement.setAttribute("translate", "no");
        aboutElement.textContent = showcase ? showcase.bio : "";
        identityElement.appendChild(nameElement);
        identityElement.appendChild(handleElement);
        identityElement.appendChild(aboutElement);
        cardElement.appendChild(identityElement);
        return cardElement;
    }

    function createNameplatePreview(assetItem) {
        const rowElement = document.createElement("div");
        rowElement.className = "nameplate-preview-row";
        const videoElement = document.createElement("video");
        videoElement.className = "nameplate-video-layer";
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.defaultMuted = true;
        videoElement.playsInline = true;
        videoElement.setAttribute("playsinline", "");
        videoElement.setAttribute("muted", "");
        videoElement.preload = "metadata";
        videoElement.setAttribute("data-source", api.mediaUrl(assetItem.id, 0, "original"));
        videoElement.addEventListener("error", () => {
            if (!videoElement.getAttribute("src")) {
                return;
            }
            videoElement.remove();
            const note = document.createElement("span");
            note.className = "media-error-note";
            note.textContent = label("preview_unavailable");
            rowElement.appendChild(note);
        });
        rowElement.appendChild(videoElement);
        registerVideo(videoElement);
        rowElement.appendChild(createAvatarStack(ownDecorationSource(), "nameplate-avatar-stack", identity().avatar_decoration_filter));
        const nameElement = document.createElement("span");
        nameElement.className = "nameplate-display-name";
        nameElement.setAttribute("translate", "no");
        nameElement.textContent = displayName();
        applyNameStyle(nameElement);
        rowElement.appendChild(nameElement);
        return rowElement;
    }

    function attachLayeredOverlay(cardElement, assetItem) {
        const layout = assetItem.layout;
        cardElement.classList.add("frame-target-card");
        cardElement.style.aspectRatio = String(layout.aspect_ratio);
        const staticContainer = document.createElement("div");
        staticContainer.className = "frame-static-clip";
        const frontContainer = document.createElement("div");
        frontContainer.className = "frame-layer-container";
        const backContainer = document.createElement("div");
        backContainer.className = "frame-layer-container frame-back-layer-container";
        cardElement.appendChild(backContainer);
        cardElement.appendChild(staticContainer);
        cardElement.appendChild(frontContainer);
        layout.parts.forEach((partItem) => {
            const partImage = createLazyImage(api.mediaUrl(assetItem.id, partItem.part, "original"), "frame-layer-part", assetItem.name);
            partImage.style.left = partItem.left_percent + "%";
            partImage.style.top = !partItem.is_static && partItem.top_percent >= 50
                ? "calc(" + partItem.top_percent + "% + var(--frame-bottom-offset, 0%))"
                : partItem.top_percent + "%";
            partImage.style.width = partItem.width_percent + "%";
            partImage.style.height = partItem.height_percent + "%";
            const target = partItem.is_static ? staticContainer : (partItem.is_back_layer ? backContainer : frontContainer);
            target.appendChild(partImage);
        });
    }

    function createAssetCard(assetItem, categoryConfig) {
        const cardContainer = document.createElement("article");
        cardContainer.className = "asset-card-box";
        const previewStage = document.createElement("div");
        previewStage.className = "asset-preview-stage";
        const formatPill = document.createElement("span");
        formatPill.className = "asset-format-pill";
        formatPill.textContent = assetItem.format_label;
        previewStage.appendChild(formatPill);
        if (categoryConfig.preview_type === "nameplate") {
            previewStage.classList.add("nameplate-stage");
            previewStage.appendChild(createNameplatePreview(assetItem));
        } else if (categoryConfig.preview_type === "layered_overlay" && assetItem.kind === "folder" && assetItem.layout) {
            previewStage.classList.add("layered-stage");
            const layeredCard = createMiniProfileCard(ownDecorationSource(), identity().avatar_decoration_filter);
            attachLayeredOverlay(layeredCard, assetItem);
            previewStage.appendChild(layeredCard);
        } else {
            previewStage.appendChild(createMiniProfileCard(api.mediaUrl(assetItem.id, 0, "preview"), ""));
        }
        const metadataBlock = document.createElement("div");
        metadataBlock.className = "asset-metadata-block";
        const titleHeading = document.createElement("h3");
        titleHeading.className = "asset-clean-title";
        titleHeading.setAttribute("translate", "no");
        titleHeading.textContent = assetItem.name;
        titleHeading.title = assetItem.name;
        const metaRow = document.createElement("div");
        metaRow.className = "asset-meta-row";
        const addedSpan = document.createElement("span");
        addedSpan.className = "asset-added-timestamp";
        addedSpan.textContent = label("added") + ": " + utils.formatDate(assetItem.added_date, label("unknown_date"));
        const sizeSpan = document.createElement("span");
        sizeSpan.className = "asset-size-label";
        sizeSpan.textContent = utils.formatByteSize(assetItem.size_bytes);
        metaRow.appendChild(addedSpan);
        metaRow.appendChild(sizeSpan);
        metadataBlock.appendChild(titleHeading);
        metadataBlock.appendChild(metaRow);
        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "glow-button asset-download-single-button";
        downloadButton.setAttribute("data-tooltip", assetItem.kind === "folder" ? translate("Download the complete asset as ZIP") : translate("Download this asset"));
        const downloadLabel = document.createElement("span");
        downloadLabel.className = "asset-download-label";
        downloadLabel.textContent = label("download");
        downloadButton.appendChild(downloadLabel);
        downloadButton.addEventListener("click", () => {
            downloads.triggerDownload(api.downloadUrl(assetItem.id));
            showToast(label("download_started"), false);
        });
        cardContainer.appendChild(previewStage);
        cardContainer.appendChild(metadataBlock);
        cardContainer.appendChild(downloadButton);
        return cardContainer;
    }

    function createVideoObserver() {
        if (!("IntersectionObserver" in window)) {
            return null;
        }
        return new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const videoElement = entry.target;
                if (entry.isIntersecting) {
                    if (!videoElement.getAttribute("src")) {
                        videoElement.src = videoElement.getAttribute("data-source");
                    }
                    const attempt = videoElement.play();
                    if (attempt && attempt.catch) {
                        attempt.catch(() => {});
                    }
                } else {
                    videoElement.pause();
                }
            });
        }, { rootMargin: "120px 0px" });
    }

    function registerVideo(videoElement) {
        lazyVideos.add(videoElement);
        if (videoObserver) {
            videoObserver.observe(videoElement);
        } else {
            videoElement.src = videoElement.getAttribute("data-source");
            videoElement.autoplay = true;
        }
    }

    function releaseVideos() {
        lazyVideos.forEach((videoElement) => {
            if (videoObserver) {
                videoObserver.unobserve(videoElement);
            }
            videoElement.pause();
            videoElement.removeAttribute("src");
            videoElement.load();
        });
        lazyVideos.clear();
    }

    function createEmptyState(titleKey, detailKey, withRetry) {
        const box = document.createElement("div");
        box.className = "empty-state-box";
        const title = document.createElement("span");
        title.className = "empty-state-title";
        title.textContent = label(titleKey);
        const detail = document.createElement("span");
        detail.textContent = label(detailKey);
        box.appendChild(title);
        box.appendChild(detail);
        if (withRetry) {
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "glow-button inner-shine-button empty-state-retry";
            retry.textContent = label("retry");
            retry.addEventListener("click", () => initialize());
            box.appendChild(retry);
        }
        return box;
    }

    function renderGrid(items) {
        const grid = elements.assetsGridContainer;
        releaseVideos();
        grid.textContent = "";
        hideTooltip();
        const categoryConfig = categoryById(state.categoryId);
        grid.classList.toggle("nameplate-grid", Boolean(categoryConfig && categoryConfig.preview_type === "nameplate"));
        if (state.failed) {
            grid.appendChild(createEmptyState("load_failed", "load_failed_detail", true));
            return;
        }
        if (items.length === 0) {
            grid.appendChild(state.searchText ? createEmptyState("no_matches_found", "no_matches_detail", false) : createEmptyState("no_assets_found", "no_assets_detail", false));
            return;
        }
        const fragment = document.createDocumentFragment();
        items.forEach((assetItem) => fragment.appendChild(createAssetCard(assetItem, categoryConfig)));
        grid.appendChild(fragment);
    }

    function renderPagination() {
        const group = elements.paginationNumbersGroup;
        group.textContent = "";
        elements.previousPageButton.disabled = state.pageNumber <= 1;
        elements.nextPageButton.disabled = state.pageNumber >= state.totalPages;
        const visible = [];
        for (let pageNumber = 1; pageNumber <= state.totalPages; pageNumber += 1) {
            if (pageNumber === 1 || pageNumber === state.totalPages || Math.abs(pageNumber - state.pageNumber) <= 2) {
                visible.push(pageNumber);
            }
        }
        let previous = 0;
        visible.forEach((pageNumber) => {
            if (pageNumber - previous > 1) {
                const ellipsis = document.createElement("span");
                ellipsis.className = "pagination-ellipsis";
                ellipsis.textContent = "…";
                group.appendChild(ellipsis);
            }
            previous = pageNumber;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "glow-button page-number-button" + (pageNumber === state.pageNumber ? " active-page" : "");
            button.textContent = String(pageNumber);
            button.setAttribute("data-tooltip", label("page_jump") + " " + pageNumber + " " + label("of") + " " + state.totalPages);
            if (pageNumber === state.pageNumber) {
                button.setAttribute("aria-current", "page");
            }
            button.addEventListener("click", () => changePage(pageNumber));
            group.appendChild(button);
        });
    }

    function updateDownloadAllButton() {
        const hasItems = state.totalItems > 0 && !state.failed;
        elements.downloadAllCategoryButton.disabled = !hasItems || state.downloadBusy;
        elements.downloadAllButtonText.textContent = label("download_all") + (hasItems ? " (" + utils.formatCount(state.totalItems) + ")" : "");
    }

    function setDownloadProgress(partNumber, totalParts) {
        elements.downloadAllProgressFill.style.width = Math.round((partNumber / totalParts) * 100) + "%";
        elements.downloadAllButtonText.textContent = label("download_all_part") + " " + partNumber + " / " + totalParts;
    }

    function resetDownloadProgress() {
        elements.downloadAllProgressFill.style.width = "0%";
        elements.downloadAllCategoryButton.classList.remove("is-busy");
    }

    async function downloadAll() {
        if (state.downloadBusy || state.totalItems === 0) {
            return;
        }
        state.downloadBusy = true;
        elements.downloadAllCategoryButton.classList.add("is-busy");
        updateDownloadAllButton();
        const chunk = Math.max(1, state.overview.zip_chunk_items || 100);
        const totalParts = Math.max(1, Math.ceil(state.totalItems / chunk));
        try {
            await downloads.downloadAllParts({
                total_parts: totalParts,
                delay_ms: configuration.app_settings.download_all_part_delay_ms,
                build_url: (partNumber) => api.downloadAllUrl(state.categoryId, state.searchText, partNumber),
                on_progress: setDownloadProgress,
                is_cancelled: () => false
            });
            showToast(label("download_all_done"), false);
        } finally {
            window.setTimeout(() => {
                state.downloadBusy = false;
                resetDownloadProgress();
                updateDownloadAllButton();
            }, 1200);
        }
    }

    async function loadItems() {
        const serial = state.requestSerial + 1;
        state.requestSerial = serial;
        let result = null;
        try {
            result = await api.fetchItems(state.categoryId, state.searchText, state.pageNumber, state.perPage);
        } catch (error) {
            if (serial !== state.requestSerial) {
                return;
            }
            state.failed = true;
            setSourceStatus("error");
            state.totalItems = 0;
            state.totalPages = 1;
            renderGrid([]);
            renderPagination();
            updateDownloadAllButton();
            return;
        }
        if (serial !== state.requestSerial) {
            return;
        }
        state.failed = false;
        setSourceStatus("online");
        state.totalItems = result.total_items;
        state.totalPages = result.total_pages;
        state.pageNumber = result.page;
        renderGrid(result.items);
        renderPagination();
        updateDownloadAllButton();
    }

    function changePage(pageNumber) {
        const next = Math.min(Math.max(1, pageNumber), state.totalPages);
        if (next === state.pageNumber) {
            return;
        }
        state.pageNumber = next;
        loadItems().then(scrollGridIntoView);
    }

    function scrollGridIntoView() {
        const grid = elements.assetsGridContainer;
        const container = elements.mainScrollableWorkspace;
        const target = Math.max(0, grid.offsetTop - 96);
        if (container && container.scrollHeight > container.clientHeight) {
            container.scrollTo({ top: target, behavior: "smooth" });
        } else {
            window.scrollTo({ top: target, behavior: "smooth" });
        }
    }

    function switchCategory(categoryId) {
        if (categoryId === state.categoryId) {
            return;
        }
        state.categoryId = categoryId;
        state.pageNumber = 1;
        Array.prototype.forEach.call(elements.categoryTabsContainer.children, (button) => {
            button.classList.toggle("active-tab", button.getAttribute("data-category") === categoryId);
        });
        loadItems();
    }

    function renderCategories() {
        elements.categoryCounterGrid.textContent = "";
        elements.categoryTabsContainer.textContent = "";
        state.overview.categories.forEach((category) => {
            const counter = document.createElement("div");
            counter.className = "counter-card";
            counter.setAttribute("data-counter-category", category.category_id);
            const counterLabel = document.createElement("span");
            counterLabel.className = "counter-card-label";
            counterLabel.textContent = translate((labels.category_plural_names || {})[category.category_id] || category.display_name);
            const counterValue = document.createElement("strong");
            counterValue.className = "counter-card-value";
            counterValue.textContent = utils.formatCount(category.item_count);
            const counterFooter = document.createElement("span");
            counterFooter.className = "counter-card-footer";
            const counterFormat = document.createElement("span");
            counterFormat.className = "counter-card-format";
            counterFormat.textContent = category.format_label;
            const counterSize = document.createElement("span");
            counterSize.className = "counter-card-size";
            counterSize.textContent = utils.formatByteSize(category.total_size_bytes);
            counterFooter.appendChild(counterFormat);
            counterFooter.appendChild(counterSize);
            counter.appendChild(counterLabel);
            counter.appendChild(counterValue);
            counter.appendChild(counterFooter);
            counter.addEventListener("click", () => switchCategory(category.category_id));
            elements.categoryCounterGrid.appendChild(counter);
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "glow-button category-tab-button" + (category.category_id === state.categoryId ? " active-tab" : "");
            tab.setAttribute("data-category", category.category_id);
            tab.setAttribute("data-tooltip", translate("Browse") + " " + translate(category.display_name));
            const tabLabel = document.createElement("span");
            tabLabel.className = "category-tab-label";
            tabLabel.textContent = translate(category.display_name);
            tab.appendChild(tabLabel);
            if (category.is_new) {
                const badge = document.createElement("span");
                badge.className = "new-feature-badge";
                badge.textContent = "NEW";
                tab.appendChild(badge);
            }
            tab.addEventListener("click", () => switchCategory(category.category_id));
            elements.categoryTabsContainer.appendChild(tab);
        });
    }

    function updateStatusPanel() {
        const categories = state.overview.categories;
        elements.statusTotalValue.textContent = utils.formatCount(categories.reduce((sum, entry) => sum + entry.item_count, 0));
        elements.statusSizeValue.textContent = utils.formatByteSize(categories.reduce((sum, entry) => sum + entry.total_size_bytes, 0));
        elements.statusUpdateValue.textContent = utils.formatDate(state.overview.generated_at, label("unknown_date"));
    }

    function updatePreviewNotice() {
        const showcase = state.showcase;
        const signedIn = Boolean(rwl.getToken());
        elements.previewProfileText.textContent = signedIn && showcase && showcase.is_own ? label("own_preview") : label("guest_preview");
        elements.previewProfileSignIn.classList.toggle("hidden-element", signedIn);
    }

    function applyPerPageOptions() {
        const select = elements.itemsPerPageSelect;
        const options = (state.overview.per_page_options || []).map(String);
        Array.prototype.forEach.call(select.options, (option) => {
            option.hidden = options.length > 0 && options.indexOf(option.value) < 0;
        });
        select.value = String(state.perPage);
    }

    function hideTooltip() {
        tooltipTarget = null;
        elements.customTooltipBox.classList.add("hidden-element");
    }

    function positionTooltip(clientX, clientY) {
        const box = elements.customTooltipBox;
        const left = Math.min(window.innerWidth - box.offsetWidth - 10, Math.max(10, clientX + 14));
        const top = clientY + 22 + box.offsetHeight > window.innerHeight ? clientY - box.offsetHeight - 14 : clientY + 22;
        box.style.left = left + "px";
        box.style.top = Math.max(8, top) + "px";
    }

    function bindTooltips() {
        document.addEventListener("pointerover", (event) => {
            if (event.pointerType === "touch") {
                return;
            }
            const target = event.target.closest("[data-tooltip]");
            if (!target || target === tooltipTarget) {
                return;
            }
            tooltipTarget = target;
            elements.customTooltipBox.textContent = translate(target.getAttribute("data-tooltip"));
            elements.customTooltipBox.classList.remove("hidden-element");
            positionTooltip(event.clientX, event.clientY);
        });
        document.addEventListener("pointermove", (event) => {
            if (tooltipTarget) {
                positionTooltip(event.clientX, event.clientY);
            }
        });
        document.addEventListener("pointerout", (event) => {
            if (tooltipTarget && !tooltipTarget.contains(event.relatedTarget)) {
                hideTooltip();
            }
        });
        document.addEventListener("scroll", hideTooltip, true);
    }

    function bindBackToTop() {
        const button = elements.backToTopButton;
        const container = elements.mainScrollableWorkspace;
        const read = () => (container && container.scrollHeight > container.clientHeight ? container.scrollTop : window.scrollY);
        const update = () => button.classList.toggle("back-to-top-visible", read() > 320);
        container.addEventListener("scroll", update, { passive: true });
        window.addEventListener("scroll", update, { passive: true });
        button.addEventListener("click", () => {
            container.scrollTo({ top: 0, behavior: "smooth" });
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    function bindSearch() {
        const submit = utils.createDebouncer(() => {
            state.pageNumber = 1;
            loadItems();
        }, configuration.app_settings.search_delay_ms);
        elements.assetSearchInput.addEventListener("input", () => {
            const value = elements.assetSearchInput.value;
            const valid = /^[\p{L}\p{N}\s\-_.()',&!+:#]*$/u.test(value);
            elements.assetSearchInput.classList.toggle("input-error", !valid);
            elements.validationFeedbackBanner.textContent = valid ? "" : label("search_invalid");
            elements.validationFeedbackBanner.classList.toggle("hidden-element", valid);
            if (!valid) {
                return;
            }
            state.searchText = value.trim();
            submit();
        });
        elements.clearSearchInputButton.addEventListener("click", () => {
            elements.assetSearchInput.value = "";
            elements.assetSearchInput.classList.remove("input-error");
            elements.validationFeedbackBanner.classList.add("hidden-element");
            state.searchText = "";
            state.pageNumber = 1;
            loadItems();
        });
    }

    function bindInterface() {
        elements.itemsPerPageSelect.addEventListener("change", () => {
            state.perPage = parseInt(elements.itemsPerPageSelect.value, 10) || configuration.app_settings.items_per_page;
            state.pageNumber = 1;
            loadItems();
        });
        elements.previousPageButton.addEventListener("click", () => changePage(state.pageNumber - 1));
        elements.nextPageButton.addEventListener("click", () => changePage(state.pageNumber + 1));
        elements.downloadAllCategoryButton.addEventListener("click", downloadAll);
        elements.backToStoreButton.addEventListener("click", () => {
            window.location.href = configuration.store_url;
        });
        elements.openLauncherButton.addEventListener("click", () => openExternal(configuration.launcher_url));
        elements.joinDiscordButton.addEventListener("click", () => openExternal(configuration.discord_invite_url));
        elements.assetScraperGithubButton.addEventListener("click", () => openExternal(configuration.asset_scraper_github_url));
        elements.previewProfileSignIn.addEventListener("click", () => {
            window.location.href = configuration.login_url;
        });
        document.addEventListener("keydown", (event) => {
            const target = event.target;
            if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) {
                return;
            }
            if (event.key === "ArrowLeft") {
                changePage(state.pageNumber - 1);
            } else if (event.key === "ArrowRight") {
                changePage(state.pageNumber + 1);
            }
        });
        bindSearch();
        bindTooltips();
        bindBackToTop();
    }

    async function initialize() {
        setSourceStatus("loading");
        state.failed = false;
        try {
            const [overview, showcase] = await Promise.all([api.fetchOverview(), api.fetchShowcase().catch(() => ({ available: false }))]);
            state.overview = overview;
            state.showcase = showcase;
        } catch (error) {
            state.failed = true;
            setSourceStatus("error");
            elements.assetsGridContainer.textContent = "";
            elements.assetsGridContainer.appendChild(createEmptyState("load_failed", "load_failed_detail", true));
            return;
        }
        if (!state.categoryId || !categoryById(state.categoryId)) {
            state.categoryId = state.overview.categories.length ? state.overview.categories[0].category_id : null;
        }
        state.perPage = state.overview.per_page_default || state.perPage;
        applyPerPageOptions();
        renderCategories();
        updateStatusPanel();
        updatePreviewNotice();
        if (state.categoryId) {
            await loadItems();
        }
    }

    function start() {
        selectElements();
        document.title = labels.page_title;
        document.documentElement.style.setProperty("--card-min-width", configuration.app_settings.card_min_width_px + "px");
        elements.brandLogoImage.src = configuration.logo_path;
        videoObserver = createVideoObserver();
        bindInterface();
        initialize();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
