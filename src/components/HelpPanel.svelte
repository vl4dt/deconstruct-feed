<script>
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { t } from "../lib/stores/i18n";

    export let view = "feed";

    const dispatch = createEventDispatcher();

    const helpKeys = {
        feed: "onboarding.help.feed",
        saved: "onboarding.help.saved",
        settings: "onboarding.help.settings",
        trending: "onboarding.help.trending",
    };

    $: key = helpKeys[view] || "onboarding.help.feed";

    function close() {
        dispatch("close");
    }

    function openUserGuide() {
        chrome.tabs.create({
            url: "https://deconstruct-feed.vercel.app/USER_GUIDE.html",
        });
    }
</script>

<div
    class="help-overlay"
    transition:fade={{ duration: 200 }}
    role="button"
    tabindex="0"
    onclick={close}
    onkeydown={(e) => e.key === "Escape" && close()}
>
    <div
        class="help-panel"
        role="dialog"
        aria-labelledby="help-title"
        tabindex="-1"
        transition:fly={{ y: 20, duration: 300 }}
        onclick={(e) => e.stopPropagation()}
    >
        <div class="panel-header">
            <h2 id="help-title">{$t(`${key}.title`) || "Help"}</h2>
            <button class="close-btn" onclick={close}>&times;</button>
        </div>

        <div class="panel-content">
            <p class="description">
                {$t(`${key}.description`) || ""}
            </p>

            <ul class="help-list">
                {#each [1, 2, 3] as i}
                    {#if $t(`${key}.tip${i}`)}
                        <li>
                            <span class="bullet">•</span>
                            <span>{$t(`${key}.tip${i}`)}</span>
                        </li>
                    {/if}
                {/each}
            </ul>

            <div class="panel-footer">
                <button class="full-guide-btn" onclick={openUserGuide}>
                    {$t("viewUserGuide")} ↗
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .help-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .help-panel {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        overflow: hidden;
    }

    .panel-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-secondary);
    }

    .panel-header h2 {
        margin: 0;
        font-size: 1.2rem;
        color: var(--text-primary);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }

    .close-btn:hover {
        color: var(--text-primary);
    }

    .panel-content {
        padding: 1.5rem;
    }

    .description {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        line-height: 1.5;
    }

    .help-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .help-list li {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
        color: var(--text-primary);
        line-height: 1.4;
    }

    .bullet {
        color: var(--accent-primary);
        font-weight: bold;
    }

    .panel-footer {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
    }

    .full-guide-btn {
        width: 100%;
        padding: 0.75rem;
        background: var(--bg-tertiary);
        color: var(--accent-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .full-guide-btn:hover {
        background: var(--bg-secondary);
        border-color: var(--accent-primary);
        transform: translateY(-1px);
    }
</style>
