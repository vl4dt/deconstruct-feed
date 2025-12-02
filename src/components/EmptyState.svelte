<script>
  import { createEventDispatcher } from "svelte";
  import { t } from "../lib/stores/i18n";

  export let type = "feed"; // 'feed', 'trending', 'saved'

  const dispatch = createEventDispatcher();

  const configs = {
    feed: {
      icon: "📰",
      titleKey: "emptyFeed.title",
      descriptionKey: "emptyFeed.description",
      primaryAction: "goToSettings",
      primaryLabelKey: "emptyFeed.addTopics",
      suggestions: ["Technology", "Science", "Business", "Health"],
    },
    trending: {
      icon: "🔥",
      titleKey: "emptyTrending.title",
      descriptionKey: "emptyTrending.description",
    },
    saved: {
      icon: "📑",
      titleKey: "emptySaved.title",
      descriptionKey: "emptySaved.description",
    },
  };

  const config = configs[type];

  function handleSuggestion(topic) {
    dispatch("quick-add-topic", { topic });
  }
</script>

<div class="empty-state">
  <div class="empty-icon">{config.icon}</div>
  <h2>{$t(config.titleKey)}</h2>
  <p>{$t(config.descriptionKey)}</p>

  {#if config.primaryAction}
    <button
      class="primary-action"
      on:click={() => dispatch(config.primaryAction)}
    >
      {$t(config.primaryLabelKey)}
    </button>
  {/if}

  {#if config.suggestions && type === "feed"}
    <div class="suggestions">
      <p class="suggestions-label">{$t("emptyFeed.suggestedTopics")}</p>
      <div class="suggestion-chips">
        {#each config.suggestions as topic}
          <button class="chip" on:click={() => handleSuggestion(topic)}>
            {topic}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    min-height: 300px;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-weight: 700;
  }

  p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    max-width: 400px;
    line-height: 1.5;
  }

  .primary-action {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    background: var(--accent-primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .primary-action:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .primary-action:active {
    transform: translateY(0);
  }

  .suggestions {
    margin-top: 2rem;
  }

  .suggestions-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
  }

  .suggestion-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .chip {
    padding: 0.5rem 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chip:hover {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
    transform: scale(1.05);
  }

  .chip:active {
    transform: scale(0.95);
  }
</style>
