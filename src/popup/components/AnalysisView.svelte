<script>
    import { userSubscription } from "../../lib/stores/subscription";
    import { t, locale } from "../../lib/stores/i18n";
    import UpgradeModal from "../../components/UpgradeModal.svelte";
    import { createEventDispatcher } from "svelte";
    import MarkdownRenderer from "../../components/MarkdownRenderer.svelte";
    import LoadingSpinner from "../../components/LoadingSpinner.svelte";

    export let analysisTitle = "";
    export let analysisResult = "";
    export let scriptLoading = false;
    export let translating = false;
    export let isTranslated = false;
    export let featureType = "summary"; // 'summary', 'script', 'podcast', 'deepDive'

    const dispatch = createEventDispatcher();

    let showUpgradeModal = false;
    let isLocked = false;

    // Get limits from subscription store
    const limits = userSubscription.getLimits();

    // Reactive usage display
    $: usageCount = getUsageCount($userSubscription.usage, featureType);
    $: usageLimit = getUsageLimit(featureType);
    $: showUsageCounter = !$userSubscription.isPro && featureType !== "summary";

    function getUsageCount(usage, type) {
        if (!usage) return 0;
        if (type === "script") return usage.scriptsGenerated || 0;
        if (type === "podcast") return usage.podcastsGenerated || 0;
        if (type === "deepDive") return usage.deepDives || 0;
        return 0;
    }

    function getUsageLimit(type) {
        if (type === "script") return limits.scripts;
        if (type === "podcast") return limits.podcasts;
        if (type === "deepDive") return limits.deepDives;
        return 3;
    }

    $: if (analysisResult && !scriptLoading) {
        checkAccess();
    }

    function checkAccess() {
        // Summaries are always free
        if (featureType === "summary") {
            isLocked = false;
            return;
        }

        const allowed = userSubscription.checkLimit(featureType);

        if (allowed) {
            isLocked = false;
        } else {
            isLocked = true;
        }
    }

    function handleBack() {
        dispatch("back");
    }

    function copyToClipboard(text) {
        if (isLocked) {
            showUpgradeModal = true;
            return;
        }
        dispatch("copyToClipboard", text);
    }

    function regenerateAnalysis() {
        if (isLocked) {
            showUpgradeModal = true;
            return;
        }
        dispatch("regenerateAnalysis");
    }

    function toggleTranslation() {
        if (isLocked) {
            showUpgradeModal = true;
            return;
        }
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

    {#if showUsageCounter}
        <div
            class="usage-counter"
            class:limit-reached={usageCount >= usageLimit}
        >
            {usageCount}/{usageLimit} free uses
            {#if usageCount >= usageLimit}
                <span class="limit-badge">Limit reached</span>
            {/if}
        </div>
    {/if}

    {#if scriptLoading}
        <LoadingSpinner text={$t("analyzingAI")} />
    {:else}
        <div class="script-content" class:locked={isLocked}>
            <MarkdownRenderer content={analysisResult} />

            {#if isLocked}
                <div class="lock-overlay">
                    <div class="lock-message">
                        <span class="lock-icon">🔒</span>
                        <h3>{$t("freeLimitReached")}</h3>
                        <p>{$t("upgradeToExport")}</p>
                        <button
                            class="upgrade-btn"
                            onclick={() => (showUpgradeModal = true)}
                        >
                            {$t("upgradeToPro")}
                        </button>
                    </div>
                </div>
            {/if}
        </div>
        <div class="actions">
            <button
                class="read-more"
                onclick={() => copyToClipboard(analysisResult)}
                disabled={isLocked}
            >
                {#if isLocked}🔒
                {/if}{$t("copyResult")}
            </button>
            <button class="read-more secondary" onclick={regenerateAnalysis}>
                Regenerate
            </button>
        </div>
    {/if}
</div>

<UpgradeModal
    show={showUpgradeModal}
    on:close={() => (showUpgradeModal = false)}
/>

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
        border: 1px solid var(--border-color);
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
        position: relative;
    }

    .script-content.locked :global(.markdown-content) {
        filter: blur(4px);
        user-select: none;
        pointer-events: none;
    }

    .lock-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.6);
        z-index: 10;
        backdrop-filter: blur(2px);
        border-radius: 8px;
        filter: none !important;
        pointer-events: auto !important;
    }

    :global(.dark) .lock-overlay {
        background: rgba(0, 0, 0, 0.6);
    }

    .lock-message {
        background: var(--bg-card);
        padding: 2rem;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color);
        max-width: 80%;
    }

    .lock-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        display: block;
    }

    .lock-message h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
        color: var(--text-primary);
    }

    .lock-message p {
        margin: 0 0 1.5rem 0;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .upgrade-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .upgrade-btn:hover {
        transform: translateY(-2px);
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
    .read-more:hover:not(:disabled) {
        opacity: 0.9;
    }
    .read-more:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
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
    .usage-counter {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        padding: 0.25rem 0.5rem;
        background: var(--bg-tertiary);
        border-radius: 4px;
        margin-bottom: 0.75rem;
        width: fit-content;
    }
    .usage-counter.limit-reached {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }
    .limit-badge {
        font-size: 0.7rem;
        font-weight: 600;
        background: #ef4444;
        color: white;
        padding: 0.1rem 0.4rem;
        border-radius: 3px;
    }
</style>
