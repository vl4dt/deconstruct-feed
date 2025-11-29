<script>
    import MarkdownRenderer from "../../components/MarkdownRenderer.svelte";
    import SkeletonLoader from "../../components/SkeletonLoader.svelte";
    import LoadingSpinner from "../../components/LoadingSpinner.svelte";
    import { t } from "../../lib/stores/i18n";

    export let pageLoading = false;
    export let pageError = "";
    export let currentPage = null;
    export let summary = "";
    export let summaryLoading = false;
    export let biasResult = "";
    export let biasLoading = false;

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function handleBack() {
        dispatch("back");
    }

    function retry() {
        dispatch("retry");
    }

    function doPageSummarize(forceRefresh = false) {
        dispatch("doPageSummarize", forceRefresh);
    }

    function doPageBias(forceRefresh = false) {
        dispatch("doPageBias", forceRefresh);
    }

    function doPageDeepDive() {
        dispatch("doPageDeepDive");
    }

    function copyToClipboard(text) {
        dispatch("copyToClipboard", text);
    }
</script>

<div class="article-view">
    <div class="article-nav">
        <button class="back-btn" onclick={handleBack}
            >&larr; {$t("back")}</button
        >
    </div>
    {#if pageLoading}
        <LoadingSpinner text="Analyzing page..." />
    {:else if pageError}
        <div class="error-state">
            <p>{pageError}</p>
            <button onclick={retry}>Retry</button>
        </div>
    {:else if currentPage}
        <h2>{currentPage.title}</h2>
        <p class="meta">
            <a href={currentPage.url} target="_blank">{currentPage.url}</a>
        </p>

        <div class="ai-section">
            <div class="ai-toolbar">
                <button
                    class="ai-chip"
                    class:active={summary}
                    onclick={() => doPageSummarize(false)}
                    disabled={summaryLoading}
                    title={$t("summarize")}
                >
                    <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                </button>
                <button
                    class="ai-chip"
                    class:active={biasResult}
                    onclick={() => doPageBias(false)}
                    disabled={biasLoading}
                    title={$t("biasCheck")}
                >
                    <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                </button>
                <button
                    class="ai-chip"
                    onclick={doPageDeepDive}
                    title={$t("deepDiveAnalysis")}
                >
                    <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                    </svg>
                </button>
            </div>

            {#if summary || summaryLoading}
                <div class="ai-result-card" class:loading={summaryLoading}>
                    <div class="result-header">
                        <h4>{$t("summary")}</h4>
                        <div class="result-actions">
                            {#if summary && !summaryLoading}
                                <button
                                    class="copy-icon-btn"
                                    onclick={() => copyToClipboard(summary)}
                                    title="Copy to clipboard">📋</button
                                >
                                <button
                                    class="copy-icon-btn"
                                    onclick={() => doPageSummarize(true)}
                                    title="Regenerate">↻</button
                                >
                                <button
                                    class="close-btn"
                                    onclick={() => dispatch("clearSummary")}
                                    >×</button
                                >
                            {/if}
                        </div>
                    </div>
                    {#if summaryLoading}
                        <div class="loading-pulse">
                            <p class="loading-text">
                                {$t("generatingSummary")}
                            </p>
                            <SkeletonLoader lines={3} />
                        </div>
                    {:else}
                        <div class="markdown-content">
                            <MarkdownRenderer content={summary} />
                        </div>
                    {/if}
                </div>
            {/if}

            {#if biasResult || biasLoading}
                <div
                    class="ai-result-card bias-card"
                    class:loading={biasLoading}
                >
                    <div class="result-header">
                        <h4>{$t("biasCheck")}</h4>
                        <div class="result-actions">
                            {#if biasResult && !biasLoading}
                                <button
                                    class="copy-icon-btn"
                                    onclick={() => copyToClipboard(biasResult)}
                                    title="Copy to clipboard">📋</button
                                >
                                <button
                                    class="copy-icon-btn"
                                    onclick={() => doPageBias(true)}
                                    title="Regenerate">↻</button
                                >
                                <button
                                    class="close-btn"
                                    onclick={() => dispatch("clearBias")}
                                    >×</button
                                >
                            {/if}
                        </div>
                    </div>
                    {#if biasLoading}
                        <div class="loading-pulse">
                            <SkeletonLoader lines={2} />
                        </div>
                    {:else}
                        <div class="markdown-content">
                            <MarkdownRenderer content={biasResult} />
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .article-view {
        padding: 1rem;
        overflow-y: auto;
        overflow-x: hidden;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: 100%;
    }
    .article-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        flex-shrink: 0;
    }
    .back-btn {
        background: var(--bg-tertiary);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--text-primary);
        font-weight: 500;
    }
    .back-btn:hover {
        background: var(--bg-secondary);
    }
    .article-view h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.4rem;
        color: var(--text-primary);
    }
    .meta {
        color: var(--text-tertiary);
        font-size: 0.8rem;
        margin-bottom: 1.5rem;
    }
    .ai-section {
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .ai-toolbar {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        padding: 0.2rem 0;
    }
    .ai-chip {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
        color: var(--text-secondary);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 0.3rem;
    }
    .ai-chip:hover:not(:disabled) {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border-color: var(--accent-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .ai-chip.active {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }
    .ai-chip:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .btn-icon {
        width: 18px;
        height: 18px;
        stroke-width: 2;
    }
    .ai-result-card {
        background: var(--bg-tertiary);
        border-radius: 12px;
        padding: 1rem;
        border: 1px solid var(--border-color);
        animation: slideDown 0.3s ease-out;
    }
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    .result-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .result-header h4 {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .copy-icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
    }
    .copy-icon-btn:hover {
        opacity: 1;
    }
    .close-btn {
        background: none;
        border: none;
        color: var(--text-tertiary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    .close-btn:hover {
        color: var(--text-primary);
    }
    .loading-pulse {
        color: var(--text-tertiary);
        font-style: italic;
        font-size: 0.9rem;
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.6;
        }
    }
    .loading-text {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin: 0 0 0.5rem 0;
        font-style: normal;
    }
    .error-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
    }
    .error-state button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: var(--accent-primary);
        color: var(--text-inverse);
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }
</style>
