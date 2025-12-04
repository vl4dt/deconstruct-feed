<script>
    import MarkdownRenderer from "../../components/MarkdownRenderer.svelte";
    import SkeletonLoader from "../../components/SkeletonLoader.svelte";
    import ContextualHint from "../../components/ContextualHint.svelte";
    import { savedItems } from "../../lib/stores/savedItems";
    import { t, locale } from "../../lib/stores/i18n";

    export let selectedArticle = null;
    export let summary = "";
    export let summaryLoading = false;
    export let biasResult = "";
    export let biasLoading = false;
    export let translating = false;
    export let isTranslated = false;

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function handleBack() {
        dispatch("back");
    }

    function toggleSave(article, e) {
        dispatch("toggleSave", { article, event: e });
    }

    function doSummarize(forceRefresh = false) {
        dispatch("doSummarize", forceRefresh);
    }

    function doBiasCheck(forceRefresh = false) {
        dispatch("doBiasCheck", forceRefresh);
    }

    function doGenerateScript() {
        dispatch("doGenerateScript");
    }

    function doGeneratePodcastScript() {
        dispatch("doGeneratePodcastScript");
    }

    function doDeepDive() {
        dispatch("doDeepDive");
    }

    function toggleTranslation() {
        dispatch("toggleTranslation");
    }

    function exportToMarkdown() {
        dispatch("exportToMarkdown");
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
        <button
            class="icon-btn save-btn"
            class:active={$savedItems.items.some(
                (i) => i.link === selectedArticle.link,
            )}
            onclick={(e) => toggleSave(selectedArticle, e)}
            title={$savedItems.items.some(
                (i) => i.link === selectedArticle.link,
            )
                ? "Remove from saved"
                : "Save for later"}
        >
            {$savedItems.items.some((i) => i.link === selectedArticle.link)
                ? "Saved"
                : "Save"}
        </button>
    </div>
    <h2>{selectedArticle.title}</h2>
    <p class="meta">
        {new Date(selectedArticle.pubDate).toLocaleDateString()} • {selectedArticle.topic}
    </p>
    <div class="content">
        {@html selectedArticle.description}
    </div>

    <div class="ai-section">
        <div class="ai-toolbar">
            <div class="hint-wrapper">
                <button
                    class="ai-chip"
                    class:active={summary}
                    onclick={() => doSummarize(false)}
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
                <ContextualHint
                    id="first-summarize"
                    position="bottom"
                    align="center"
                    delay={1000}
                >
                    Tap to get a quick AI summary of this article.
                </ContextualHint>
            </div>

            <div class="hint-wrapper">
                <button
                    class="ai-chip"
                    class:active={biasResult}
                    onclick={() => doBiasCheck(false)}
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
                <ContextualHint
                    id="first-bias-check"
                    position="bottom"
                    align="center"
                    delay={500}
                    condition={!!summary}
                >
                    Check for media bias and political leaning.
                </ContextualHint>
            </div>

            <button
                class="ai-chip"
                onclick={doGenerateScript}
                title={$t("videoScript")}
            >
                <svg
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                </svg>
            </button>
            <button
                class="ai-chip"
                onclick={doGeneratePodcastScript}
                title={$t("podcastScript")}
            >
                <svg
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                </svg>
            </button>
            <button
                class="ai-chip"
                onclick={doDeepDive}
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
            <div class="hint-wrapper">
                <button
                    class="icon-btn translate-btn"
                    onclick={toggleTranslation}
                    disabled={translating}
                    title={translating
                        ? $t("translating")
                        : isTranslated
                          ? $t("showOriginal")
                          : $locale === "en"
                            ? $t("translateToSpanish")
                            : $t("translateToEnglish")}
                >
                    <svg
                        class="btn-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                    </svg>
                </button>
                <ContextualHint
                    id="first-translate"
                    position="bottom"
                    align="end"
                    delay={3000}
                >
                    Translate articles to your preferred language.
                </ContextualHint>
            </div>
            <div class="divider"></div>
            <button
                class="generate-btn"
                onclick={() =>
                    window.open(
                        `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedArticle.title)}`,
                        "_blank",
                    )}
                title="Search this topic on YouTube"
                aria-label="Search this topic on YouTube"
            >
                <svg
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
            <div class="divider"></div>
            <button
                class="ai-chip export-chip"
                onclick={exportToMarkdown}
                title={$t("export")}
            >
                <svg
                    class="btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
                                title="Copy to clipboard">Copy</button
                            >
                            <button
                                class="copy-icon-btn"
                                onclick={() => doSummarize(true)}
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
                        <p class="loading-text">{$t("generatingSummary")}</p>
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
            <div class="ai-result-card bias-card" class:loading={biasLoading}>
                <div class="result-header">
                    <h4>{$t("biasCheck")}</h4>
                    <div class="result-actions">
                        {#if biasResult && !biasLoading}
                            <button
                                class="copy-icon-btn"
                                onclick={() => copyToClipboard(biasResult)}
                                title="Copy to clipboard">Copy</button
                            >
                            <button
                                class="copy-icon-btn"
                                onclick={() => doBiasCheck(true)}
                                title="Regenerate">↻</button
                            >
                            <button
                                class="close-btn"
                                onclick={() => dispatch("clearBias")}>×</button
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

    <a href={selectedArticle.link} target="_blank" class="read-more"
        >{$t("readFullArticle")}</a
    >
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
    .content {
        line-height: 1.6;
        color: var(--text-primary);
        margin-bottom: 2rem;
        overflow-wrap: break-word;
        word-break: break-word;
        max-width: 100%;
    }
    .content :global(img) {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
    }
    .content :global(pre),
    .content :global(code) {
        white-space: pre-wrap;
        overflow-x: auto;
        max-width: 100%;
    }
    .content :global(a) {
        color: var(--accent-primary);
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
        align-items: center;
    }
    .ai-chip {
        font-size: 0.85rem;
        font-weight: 500;
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        padding: 0.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        min-width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .ai-chip:hover:not(:disabled) {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
    }
    .ai-chip.active {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }
    .ai-chip.active:hover:not(:disabled) {
        background: var(--accent-hover);
        color: white;
    }
    .ai-chip:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .divider {
        width: 1px;
        height: 20px;
        background: var(--border-color);
        margin: 0 0.2rem;
    }
    .export-chip {
        margin-left: auto;
        border-style: dashed;
    }
    .translate-btn {
        font-size: 0.85rem;
        font-weight: 500;
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        padding: 0.5rem 1rem;
        border-radius: 6px;
    }
    .btn-icon {
        width: 18px;
        height: 18px;
        stroke-width: 2;
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
        font-size: 0.8rem;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
        color: var(--text-secondary);
    }
    .copy-icon-btn:hover {
        opacity: 1;
        color: var(--text-primary);
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
    .read-more {
        display: block;
        text-align: center;
        background: var(--text-primary);
        color: var(--bg-primary);
        text-decoration: none;
        padding: 1rem;
        border-radius: 8px;
        font-weight: 600;
    }
    .read-more:hover {
        opacity: 0.9;
    }
    .hint-wrapper {
        position: relative;
        display: inline-flex;
    }
</style>
