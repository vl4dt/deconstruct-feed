<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { fade, slide } from "svelte/transition";
    import { settings, onboardingHelpers } from "../lib/stores/settings";
    import { t } from "../lib/stores/i18n";

    export let id = "";
    export let message = "";
    export let actionLabel = "";
    export let icon = "💡";
    export let delay = 0;
    export let condition = true;

    const dispatch = createEventDispatcher();
    let visible = false;

    $: isDismissed = onboardingHelpers.isSuggestionDismissed(id, $settings);

    onMount(() => {
        if (!isDismissed && condition) {
            if (delay > 0) {
                setTimeout(() => {
                    visible = true;
                }, delay);
            } else {
                visible = true;
            }
        }
    });

    function dismiss() {
        visible = false;
        onboardingHelpers.dismissSuggestion(id);
        dispatch("dismiss");
    }

    function handleAction() {
        dispatch("action");
        // Optional: dismiss on action?
        // dismiss();
    }
</script>

{#if visible && !isDismissed && condition}
    <div class="smart-suggestion" transition:slide={{ duration: 300 }}>
        <div class="icon">{icon}</div>
        <div class="content">
            <p>{message}</p>
            {#if actionLabel}
                <button class="action-btn" onclick={handleAction}>
                    {actionLabel}
                </button>
            {/if}
        </div>
        <button
            class="close-btn"
            onclick={dismiss}
            title={$t("remove") || "Dismiss"}>×</button
        >
    </div>
{/if}

<style>
    .smart-suggestion {
        background: var(--bg-tertiary);
        border: 1px solid var(--accent-primary);
        border-radius: 8px;
        padding: 0.8rem;
        margin: 1rem 0;
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
        position: relative;
        box-shadow: var(--shadow-sm);
    }

    .icon {
        font-size: 1.2rem;
        line-height: 1;
        padding-top: 0.1rem;
    }

    .content {
        flex: 1;
    }

    p {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: var(--text-primary);
        line-height: 1.4;
    }

    p:last-child {
        margin-bottom: 0;
    }

    .action-btn {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    }

    .action-btn:hover {
        background: var(--accent-hover);
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--text-tertiary);
        font-size: 1.2rem;
        line-height: 0.5;
        cursor: pointer;
        padding: 0;
        align-self: flex-start;
    }

    .close-btn:hover {
        color: var(--text-primary);
    }
</style>
