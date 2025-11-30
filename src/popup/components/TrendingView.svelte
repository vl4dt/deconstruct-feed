<script>
    import LoadingSpinner from "../../components/LoadingSpinner.svelte";
    import { savedItems } from "../../lib/stores/savedItems";
    import { t } from "../../lib/stores/i18n";

    export let loading = false;
    export let loadingMessage = "";
    export let trendingArticles = [];
    export let selectionMode = false;
    export let selectedArticleIds = new Set();

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function selectArticle(article) {
        dispatch("selectArticle", article);
    }

    function toggleSave(article, e) {
        dispatch("toggleSave", { article, event: e });
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
</script>

<div class="feed" class:selection-mode={selectionMode}>
    <h2 class="section-title">Trending Now</h2>
    {#if loading}
        <LoadingSpinner text={loadingMessage} />
    {:else if trendingArticles.length > 0}
        {#each trendingArticles as article}
            <div
                class="card"
                class:selected={selectedArticleIds.has(article.link)}
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
                    <h3>{article.title || "No Title"}</h3>
                    <p class="snippet">
                        {getSnippet(article.description) ||
                            "No description available"}
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
                    </div>
                </div>
                <div class="card-actions">
                    <button
                        class="icon-btn save-btn"
                        class:active={$savedItems.items.some(
                            (i) => i.link === article.link,
                        )}
                        onclick={(e) => toggleSave(article, e)}
                        title={$savedItems.items.some(
                            (i) => i.link === article.link,
                        )
                            ? "Remove from saved"
                            : "Save for later"}
                    >
                        {$savedItems.items.some((i) => i.link === article.link)
                            ? "Saved"
                            : "Save"}
                    </button>
                </div>
            </div>
        {/each}
    {:else}
        <div class="empty-state">
            <p>{$t("noTrendingNews")}</p>
        </div>
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
    .section-title {
        margin: 0 0 1rem 0;
        font-size: 1.2rem;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 0.5rem;
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
