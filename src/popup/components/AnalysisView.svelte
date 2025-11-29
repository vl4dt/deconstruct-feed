<script>
    import MarkdownRenderer from "../../components/MarkdownRenderer.svelte";
    import LoadingSpinner from "../../components/LoadingSpinner.svelte";
    import { t } from "../../lib/stores/i18n";

    export let analysisTitle = "";
    export let analysisResult = "";
    export let scriptLoading = false;

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
</script>

<div class="article-view">
    <div class="article-nav">
        <button class="back-btn" onclick={handleBack}
            >&larr; {$t("back")}</button
        >
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
</style>
