<script>
    import { savedItems } from "../../lib/stores/savedItems";
    import { userSubscription } from "../../lib/stores/subscription";

    export let selectionMode = false;
    export let selectedArticleIds = new Set();
    export let activeCollection = "all";
    export let showCreateCollection = false;
    export let newCollectionName = "";
    export let movingArticleLink = null;

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    // Search state
    let searchQuery = "";
    let searchResults = null;
    let isSearching = false;
    let searchTimeout;

    async function performSearch() {
        if (!searchQuery.trim()) {
            searchResults = null;
            isSearching = false;
            return;
        }
        isSearching = true;
        searchResults = await savedItems.search(searchQuery);
        isSearching = false;
    }

    function handleSearchInput(e) {
        searchQuery = e.target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    }

    function clearSearch() {
        searchQuery = "";
        searchResults = null;
        isSearching = false;
    }

    // Derived state for filtered items
    $: displayItems =
        searchResults !== null ? searchResults : $savedItems.items;

    $: filteredItems =
        activeCollection === "all"
            ? displayItems
            : displayItems.filter(
                  (i) => (i.collection || i.collectionId) === activeCollection,
              );

    function selectArticle(article) {
        dispatch("selectArticle", article);
    }

    function toggleSave(article, e) {
        dispatch("toggleSave", { article, event: e });
    }

    function createCollection() {
        dispatch("createCollection");
    }

    function confirmCreateCollection() {
        dispatch("confirmCreateCollection");
    }

    function cancelCreateCollection() {
        dispatch("cancelCreateCollection");
    }

    function setActiveCollection(id) {
        dispatch("setActiveCollection", id);
    }

    function setMovingArticleLink(link) {
        dispatch("setMovingArticleLink", link);
    }

    function moveArticleTo(collectionId) {
        dispatch("moveArticleTo", collectionId);
    }

    function generateVideoScript() {
        dispatch("generateVideoScript");
    }

    function performDeepDive() {
        dispatch("performDeepDive");
    }

    function getSnippet(html) {
        if (!html) return "";
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        let text = tmp.textContent || tmp.innerText || "";
        return text.length > 100 ? text.substring(0, 100) + "..." : text;
    }

    function highlightText(text, query) {
        if (!query || !text) return text;

        // Split query into terms and escape them
        const terms = query
            .split(/\s+/)
            .filter((t) => t.length > 0)
            .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

        if (terms.length === 0) return text;

        const regex = new RegExp(`(${terms.join("|")})`, "gi");
        return text.replace(regex, '<mark class="highlight">$1</mark>');
    }
</script>

<div class="feed" class:selection-mode={selectionMode}>
    <div class="saved-header">
        <h2 class="section-title">
            Saved Items ({$savedItems.items.length})
        </h2>
        {#if $userSubscription.isPro}
            <button
                class="icon-btn add-btn"
                onclick={createCollection}
                title="New Collection">New</button
            >
        {/if}
    </div>

    <div class="search-container">
        <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
                type="text"
                placeholder="Search saved articles..."
                value={searchQuery}
                oninput={handleSearchInput}
            />
            {#if searchQuery}
                <button class="clear-search-btn" onclick={clearSearch}>×</button
                >
            {/if}
        </div>
    </div>

    {#if showCreateCollection}
        <div class="create-collection-row">
            <input
                bind:value={newCollectionName}
                placeholder="Collection Name"
                oninput={(e) =>
                    dispatch("updateNewCollectionName", e.currentTarget.value)}
            />
            <button class="primary-btn" onclick={confirmCreateCollection}
                >Create</button
            >
            <button class="cancel-btn" onclick={cancelCreateCollection}
                >Cancel</button
            >
        </div>
    {/if}

    {#if $userSubscription.isPro}
        <div class="saved-content-wrapper">
            <div class="collection-sidebar">
                <button
                    class="collection-tab"
                    class:active={activeCollection === "all"}
                    onclick={() => setActiveCollection("all")}>All</button
                >
                {#each $savedItems.collections as collection}
                    <button
                        class="collection-tab"
                        class:active={activeCollection === collection.id}
                        onclick={() => setActiveCollection(collection.id)}
                    >
                        {collection.name}
                    </button>
                {/each}
            </div>
            <div class="saved-items-list">
                {#if filteredItems.length === 0}
                    <p>No saved items yet.</p>
                    <p class="sub-text">
                        Bookmark articles to read them later.
                    </p>
                {:else}
                    {#each filteredItems as article}
                        <div
                            class="card"
                            class:selected={selectedArticleIds.has(
                                article.link,
                            )}
                            class:moving={movingArticleLink === article.link}
                            role="button"
                            tabindex="0"
                            onclick={() => selectArticle(article)}
                            onkeydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    selectArticle(article);
                                }
                            }}
                        >
                            {#if selectionMode}
                                <div class="checkbox">
                                    {#if selectedArticleIds.has(article.link)}✓{/if}
                                </div>
                            {/if}
                            <div class="card-image">
                                {#if article.image}
                                    <img
                                        src={article.image}
                                        alt={article.title}
                                        loading="lazy"
                                    />
                                {:else}
                                    <img
                                        src="/placeholder.svg"
                                        alt="Placeholder"
                                    />
                                {/if}
                            </div>
                            <div class="card-content">
                                <h3>
                                    {#if searchQuery}
                                        {@html highlightText(
                                            article.title || "No Title",
                                            searchQuery,
                                        )}
                                    {:else}
                                        {article.title || "No Title"}
                                    {/if}
                                </h3>
                                <p class="snippet">
                                    {#if searchQuery && article._searchSnippet}
                                        {@html highlightText(
                                            article._searchSnippet,
                                            searchQuery,
                                        )}
                                    {:else}
                                        {getSnippet(article.description) ||
                                            "No description available"}
                                    {/if}
                                </p>
                                <div class="card-footer">
                                    <a
                                        href={article.sourceLink || "#"}
                                        target="_blank"
                                        class="source source-link"
                                        onclick={(e) => e.stopPropagation()}
                                    >
                                        {article.source || "Unknown Source"}
                                    </a>
                                    <span class="separator">•</span>
                                    <span class="date"
                                        >{new Date(
                                            article.pubDate,
                                        ).toLocaleDateString()}</span
                                    >
                                    {#if article._matchType}
                                        <span class="separator">•</span>
                                        <span class="match-badge"
                                            >Match in {article._matchType}</span
                                        >
                                    {/if}
                                </div>
                            </div>
                            <div class="card-actions">
                                {#if $userSubscription.isPro}
                                    <div class="move-dropdown-container">
                                        <button
                                            class="icon-btn move-btn"
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                setMovingArticleLink(
                                                    movingArticleLink ===
                                                        article.link
                                                        ? null
                                                        : article.link,
                                                );
                                            }}
                                            title="Move to collection"
                                        >
                                            Move
                                        </button>
                                        {#if movingArticleLink === article.link}
                                            <div class="move-dropdown">
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        moveArticleTo("all");
                                                    }}>All (Default)</button
                                                >
                                                {#each $savedItems.collections as col}
                                                    <button
                                                        onclick={(e) => {
                                                            e.stopPropagation();
                                                            moveArticleTo(
                                                                col.id,
                                                            );
                                                        }}>{col.name}</button
                                                    >
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                                <button
                                    class="icon-btn save-btn active"
                                    onclick={(e) => toggleSave(article, e)}
                                    title="Remove from saved"
                                >
                                    Saved
                                </button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {:else}
        <!-- Free tier: simple list without sidebar -->
        {#if filteredItems.length === 0}
            <div class="empty-state">
                <p>No saved items yet.</p>
                <p class="sub-text">Bookmark articles to read them later.</p>
            </div>
        {:else}
            {#each filteredItems as article}
                <div
                    class="card"
                    class:selected={selectedArticleIds.has(article.link)}
                    class:moving={movingArticleLink === article.link}
                    role="button"
                    tabindex="0"
                    onclick={() => selectArticle(article)}
                    onkeydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectArticle(article);
                        }
                    }}
                >
                    {#if selectionMode}
                        <div class="checkbox">
                            {#if selectedArticleIds.has(article.link)}✓{/if}
                        </div>
                    {/if}
                    <div class="card-image">
                        {#if article.image}
                            <img
                                src={article.image}
                                alt={article.title}
                                loading="lazy"
                            />
                        {:else}
                            <img src="/placeholder.svg" alt="Placeholder" />
                        {/if}
                    </div>
                    <div class="card-content">
                        <h3>
                            {#if searchQuery}
                                {@html highlightText(
                                    article.title || "No Title",
                                    searchQuery,
                                )}
                            {:else}
                                {article.title || "No Title"}
                            {/if}
                        </h3>
                        <p class="snippet">
                            {#if searchQuery && article._searchSnippet}
                                {@html highlightText(
                                    article._searchSnippet,
                                    searchQuery,
                                )}
                            {:else}
                                {getSnippet(article.description) ||
                                    "No description available"}
                            {/if}
                        </p>
                        <div class="card-footer">
                            <a
                                href={article.sourceLink || "#"}
                                target="_blank"
                                class="source source-link"
                                onclick={(e) => e.stopPropagation()}
                            >
                                {article.source || "Unknown Source"}
                            </a>
                            <span class="separator">•</span>
                            <span class="date"
                                >{new Date(
                                    article.pubDate,
                                ).toLocaleDateString()}</span
                            >
                            {#if article._matchType}
                                <span class="separator">•</span>
                                <span class="match-badge"
                                    >Match in {article._matchType}</span
                                >
                            {/if}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button
                            class="icon-btn save-btn active"
                            onclick={(e) => toggleSave(article, e)}
                            title="Remove from saved"
                        >
                            Saved
                        </button>
                    </div>
                </div>
            {/each}
        {/if}
    {/if}
</div>

{#if selectionMode && selectedArticleIds.size > 0}
    <div class="action-bar">
        <div class="selected-count">{selectedArticleIds.size} selected</div>
        <button class="generate-btn" onclick={generateVideoScript}>
            ✨ Script
        </button>
        <button class="generate-btn deep-dive-btn" onclick={performDeepDive}>
            🧠 Deep Dive
        </button>
    </div>
{/if}

<style>
    .feed {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
        overflow-x: hidden;
        flex: 1;
        min-height: 0;
        scroll-behavior: smooth;
    }
    .feed::-webkit-scrollbar {
        width: 8px;
    }
    .feed::-webkit-scrollbar-track {
        background: var(--bg-secondary);
    }
    .feed::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
    }
    .feed::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
    }
    .saved-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .section-title {
        margin: 0;
        font-size: 1.2rem;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .search-container {
        margin-bottom: 1rem;
    }
    .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 0.4rem 0.8rem;
        transition: border-color 0.2s;
    }
    .search-input-wrapper:focus-within {
        border-color: var(--accent-primary);
    }
    .search-icon {
        font-size: 0.9rem;
        margin-right: 0.5rem;
        opacity: 0.6;
    }
    .search-input-wrapper input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 0.95rem;
        outline: none;
        min-width: 0;
    }
    .clear-search-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0 0.2rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .clear-search-btn:hover {
        color: var(--text-primary);
    }
    .add-btn {
        font-size: 0.85rem;
        font-weight: 500;
        background: var(--bg-tertiary);
        color: var(--text-primary);
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        transition: all 0.2s;
    }
    .add-btn:hover {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }
    .create-collection-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background: var(--bg-secondary);
        border-radius: 8px;
    }
    .create-collection-row input {
        flex: 1;
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
    }
    .primary-btn,
    .cancel-btn {
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
    }
    .primary-btn {
        background: var(--accent-primary);
        color: white;
    }
    .cancel-btn {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
    .saved-content-wrapper {
        display: flex;
        gap: 1rem;
        width: 100%;
    }
    .collection-sidebar {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 120px;
        flex-shrink: 0;
    }
    .saved-items-list {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .collection-tab {
        background: var(--bg-secondary);
        border: none;
        padding: 0.6rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        white-space: nowrap;
        color: var(--text-primary);
        font-size: 0.95rem;
        font-weight: 500;
        text-align: left;
        transition: all 0.2s;
    }
    .collection-tab:hover {
        background: var(--bg-tertiary);
    }
    .collection-tab.active {
        background: var(--accent-primary);
        color: white;
        font-weight: 600;
    }
    .card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem;
        text-align: left;
        cursor: pointer;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
        display: flex;
        flex-direction: row;
        gap: 1rem;
        align-items: flex-start;
    }
    .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
    }
    .card.selected {
        border-color: var(--accent-primary);
        background: var(--bg-tertiary);
    }
    .card.moving {
        z-index: 1000;
        position: relative;
    }
    .card-image {
        width: 80px;
        height: 80px;
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-secondary);
    }
    .card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .card-content {
        flex: 1;
        min-width: 0;
    }
    .card h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        line-height: 1.4;
        color: var(--text-primary);
        display: block;
        max-height: 2.8em; /* 2 lines * 1.4 line-height */
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .snippet {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        /* autoprefixer: ignore next */
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .card-actions {
        display: flex;
        align-items: flex-start;
    }
    .save-btn {
        font-size: 0.8rem;
        font-weight: 500;
        padding: 0.3rem 0.7rem;
        border-radius: 4px;
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid transparent;
        transition: all 0.2s;
    }
    .save-btn:hover {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border-color: var(--border-color);
    }
    .save-btn.active {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }
    .move-btn {
        font-size: 0.8rem;
        font-weight: 500;
        padding: 0.3rem 0.7rem;
        border-radius: 4px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        transition: all 0.2s;
    }
    .move-btn:hover {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
    }
    .move-dropdown-container {
        position: relative;
    }
    .move-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 100;
        min-width: 150px;
        overflow: hidden;
    }
    .move-dropdown button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
    }
    .move-dropdown button:hover {
        background: var(--bg-tertiary);
    }
    .card-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: var(--text-tertiary);
        width: 100%;
    }
    .source-link {
        color: var(--text-secondary);
        text-decoration: none;
        font-weight: 500;
    }
    .source-link:hover {
        color: var(--accent-primary);
        text-decoration: underline;
    }
    .empty-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
    }
    .checkbox {
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 20px;
        height: 20px;
        border: 2px solid var(--border-color);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-card);
        color: var(--accent-primary);
        font-weight: bold;
    }
    .card.selected .checkbox {
        border-color: var(--accent-primary);
        background: var(--accent-primary);
        color: var(--text-inverse);
    }
    .feed.selection-mode .card {
        position: relative;
        padding-right: 3rem;
    }
    .action-bar {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-header);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border-color);
        padding: 0.8rem 1.5rem;
        border-radius: 30px;
        display: flex;
        gap: 1rem;
        align-items: center;
        box-shadow: var(--shadow-md);
        z-index: 100;
        animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
        from {
            transform: translate(-50%, 100%);
        }
        to {
            transform: translate(-50%, 0);
        }
    }
    .selected-count {
        font-weight: 600;
        color: var(--text-primary);
    }
    .generate-btn {
        background: var(--accent-primary);
        color: var(--text-inverse);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
    }
    .generate-btn:hover {
        background: var(--accent-hover);
    }
    .deep-dive-btn {
        background: #9c27b0;
    }
    .deep-dive-btn:hover {
        background: #7b1fa2;
    }
</style>
