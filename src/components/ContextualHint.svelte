<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { settings, onboardingHelpers } from "../lib/stores/settings";
    import { t } from "../lib/stores/i18n";

    export let id; // Unique ID for the hint (e.g., 'try-summarize')
    export let position = "bottom"; // top, bottom, left, right
    export let align = "center"; // start, center, end
    export let delay = 0; // Delay before showing
    export let condition = true; // Extra condition to show
    export let target = null; // Target element selector (optional, for positioning)

    const dispatch = createEventDispatcher();
    let visible = false;
    let dismissed = false;

    $: alreadyShown = $settings.ui?.shownHints?.includes(id);

    onMount(() => {
        if (!alreadyShown && condition && !dismissed) {
            setTimeout(() => {
                visible = true;
            }, delay);
        }
    });

    function dismiss() {
        visible = false;
        dismissed = true;
        onboardingHelpers.markHintShown(id);
        dispatch("dismiss");
    }
</script>

{#if visible && !alreadyShown && condition}
    <div
        class="contextual-hint {position} {align}"
        transition:fly={{ y: 10, duration: 300 }}
    >
        <div class="hint-content">
            <slot />
        </div>
        <button class="dismiss-btn" on:click|stopPropagation={dismiss}>×</button
        >
        <div class="arrow"></div>
    </div>
{/if}

<style>
    .contextual-hint {
        position: absolute;
        background: var(--accent-primary);
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        min-width: 180px;
        max-width: 250px;
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        animation: pulse-border 2s infinite;
    }

    @keyframes pulse-border {
        0% {
            box-shadow: 0 0 0 0 rgba(var(--accent-primary-rgb), 0.4);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(var(--accent-primary-rgb), 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(var(--accent-primary-rgb), 0);
        }
    }

    .hint-content {
        flex: 1;
        line-height: 1.4;
    }

    .dismiss-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        margin-top: -2px;
    }

    .dismiss-btn:hover {
        color: white;
    }

    .arrow {
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
    }

    /* Positioning */
    .contextual-hint.bottom {
        top: 100%;
        margin-top: 10px;
    }
    .contextual-hint.bottom .arrow {
        top: -6px;
        border-width: 0 6px 6px 6px;
        border-color: transparent transparent var(--accent-primary) transparent;
    }

    .contextual-hint.top {
        bottom: 100%;
        margin-bottom: 10px;
    }
    .contextual-hint.top .arrow {
        bottom: -6px;
        border-width: 6px 6px 0 6px;
        border-color: var(--accent-primary) transparent transparent transparent;
    }

    .contextual-hint.left {
        right: 100%;
        margin-right: 10px;
        top: 50%;
        transform: translateY(-50%);
    }
    .contextual-hint.left .arrow {
        right: -6px;
        top: 50%;
        margin-top: -6px;
        border-width: 6px 0 6px 6px;
        border-color: transparent transparent transparent var(--accent-primary);
    }

    .contextual-hint.right {
        left: 100%;
        margin-left: 10px;
        top: 50%;
        transform: translateY(-50%);
    }
    .contextual-hint.right .arrow {
        left: -6px;
        top: 50%;
        margin-top: -6px;
        border-width: 6px 6px 6px 0;
        border-color: transparent var(--accent-primary) transparent transparent;
    }

    /* Alignment */
    .contextual-hint.center {
        left: 50%;
        transform: translateX(-50%);
    }
    .contextual-hint.left.center,
    .contextual-hint.right.center {
        transform: translateY(-50%); /* Reset for side positioning */
        left: auto; /* Reset */
    }

    .contextual-hint.bottom.center .arrow,
    .contextual-hint.top.center .arrow {
        left: 50%;
        margin-left: -6px;
    }

    .contextual-hint.start {
        left: 0;
    }
    .contextual-hint.bottom.start .arrow,
    .contextual-hint.top.start .arrow {
        left: 10px;
    }

    .contextual-hint.end {
        right: 0;
        left: auto;
    }
    .contextual-hint.bottom.end .arrow,
    .contextual-hint.top.end .arrow {
        right: 10px;
    }
</style>
