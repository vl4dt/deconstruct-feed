<script>
    import { slide } from "svelte/transition";
    import { settings, onboardingHelpers } from "../lib/stores/settings";
    import { t } from "../lib/stores/i18n";

    let expanded = false;

    $: progress = onboardingHelpers.getChecklistProgress($settings);
    $: completion = onboardingHelpers.getChecklistCompletion($settings);
    $: isComplete = completion.completed === completion.total;

    function toggleExpand() {
        expanded = !expanded;
    }

    const items = [
        { key: "addedTopic", label: "Add Topics", icon: "rss_feed" },
        { key: "configuredAI", label: "Configure AI", icon: "psychology" },
        { key: "readArticle", label: "Read an Article", icon: "article" },
        { key: "triedSummarize", label: "Try Summarize", icon: "summarize" },
        { key: "savedArticle", label: "Save an Article", icon: "bookmark" },
        { key: "triedTranslate", label: "Try Translate", icon: "translate" },
    ];
</script>

{#if !isComplete}
    <div class="checklist-widget" class:expanded>
        <button class="widget-header" onclick={toggleExpand}>
            <div class="header-content">
                <span class="icon">✓</span>
                <span class="label"
                    >{$t("onboarding.checklistTitle") || "Setup Progress"}</span
                >
                <span class="count"
                    >{completion.completed}/{completion.total}</span
                >
            </div>
            <span class="chevron">{expanded ? "▼" : "▲"}</span>
        </button>

        {#if expanded}
            <div class="widget-body" transition:slide={{ duration: 200 }}>
                <div class="progress-bar">
                    <div
                        class="fill"
                        style="width: {completion.percentage}%"
                    ></div>
                </div>
                <ul class="checklist">
                    {#each items as item}
                        <li class:completed={progress[item.key]}>
                            <span class="check"
                                >{progress[item.key] ? "✓" : "○"}</span
                            >
                            <span class="text">
                                {$t(`onboarding.checklist.${item.key}`) ||
                                    item.label}
                            </span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
{/if}

<style>
    .checklist-widget {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        width: 260px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9000;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .widget-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem 1rem;
        background: var(--bg-secondary);
        border: none;
        cursor: pointer;
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.9rem;
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .icon {
        color: var(--accent-primary);
        font-weight: bold;
    }

    .count {
        background: var(--bg-tertiary);
        padding: 0.1rem 0.4rem;
        border-radius: 10px;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .chevron {
        font-size: 0.8rem;
        color: var(--text-tertiary);
    }

    .widget-body {
        padding: 1rem;
        background: var(--bg-card);
        border-top: 1px solid var(--border-color);
    }

    .progress-bar {
        height: 4px;
        background: var(--bg-tertiary);
        border-radius: 2px;
        margin-bottom: 1rem;
        overflow: hidden;
    }

    .fill {
        height: 100%;
        background: var(--accent-primary);
        transition: width 0.3s ease;
    }

    .checklist {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .checklist li {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.4rem 0;
        color: var(--text-secondary);
        font-size: 0.9rem;
        transition: color 0.2s;
    }

    .checklist li.completed {
        color: var(--text-primary);
        text-decoration: line-through;
        opacity: 0.7;
    }

    .check {
        font-weight: bold;
        color: var(--accent-primary);
        width: 16px;
        text-align: center;
    }

    .checklist li:not(.completed) .check {
        color: var(--text-tertiary);
    }
</style>
