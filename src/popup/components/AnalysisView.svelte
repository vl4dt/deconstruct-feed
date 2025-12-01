<script>
    import MarkdownRenderer from "../../components/MarkdownRenderer.svelte";
    import LoadingSpinner from "../../components/LoadingSpinner.svelte";
    import { t, locale } from "../../lib/stores/i18n";

    export let analysisTitle = "";
    export let analysisResult = "";
    export let scriptLoading = false;
    export let translating = false;
    export let isTranslated = false;

    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    function handleBack() {
        dispatch("back");
    }

    function copyToClipboard(text) {
        dispatch("copyToClipboard", text);
    }

    function regenerateAnalysis() {
        dispatch("regenerateAnalysis");
    }

    function toggleTranslation() {
        dispatch("toggleTranslation");
    }
</script>

<div class="article-view">
    <div class="article-nav">
        <button class="back-btn" onclick={handleBack}
            >&larr; {$t("back")}</button
        >
        <button
            class="icon-btn translate-btn"
            onclick={toggleTranslation}
            disabled={translating || scriptLoading}
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
    </div>
    <h2>{analysisTitle}</h2>

    {#if scriptLoading}
        <LoadingSpinner text={$t("analyzingAI")} />
    {:else}
        <div class="script-content">
            <MarkdownRenderer content={analysisResult} />
        </div>
        <div class="actions">
            <button
                class="read-more"
                onclick={() => copyToClipboard(analysisResult)}
            >
                {$t("copyResult")}
            </button>
            <button class="read-more secondary" onclick={regenerateAnalysis}>
                Regenerate
            </button>
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
    .script-content {
        background: var(--bg-card);
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        margin-bottom: 1.5rem;
        overflow-x: auto;
    }
    .actions {
        display: flex;
        gap: 1rem;
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
        flex: 1;
        cursor: pointer;
        border: none;
    }
    .read-more:hover {
        opacity: 0.9;
    }
    .read-more.secondary {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }
    .read-more.secondary:hover {
        background: var(--bg-secondary);
    }
    .translate-btn {
        font-size: 0.85rem;
        font-weight: 500;
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .translate-btn:hover:not(:disabled) {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
    }
    .translate-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .btn-icon {
        width: 18px;
        height: 18px;
        stroke-width: 2;
    }
</style>
