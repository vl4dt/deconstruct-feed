<script>
  import { onMount } from "svelte";
  import { fetchNewsForTopics } from "../lib/news/newsEngine";
  import { summarize } from "../lib/ai/aiService";
  import { sourceService } from "../lib/news/sourceService";
  import { userSubscription } from "../lib/stores/subscription";
  import { theme } from "../lib/stores/theme";
  import Settings from "../components/Settings.svelte";

  let articles = $state([]);
  let loading = $state(false);
  let selectedArticle = $state(null);
  let summary = $state("");
  let summaryLoading = $state(false);
  let topics = $state([]);
  let view = $state("feed"); // 'feed', 'article', 'settings'
  let expandedTopics = $state(new Set());
  let collapsedTopics = $state(new Set());

  // Derived state for grouped articles
  let groupedArticles = $derived.by(() => {
    const groups = {};

    // Initialize all topics with empty arrays
    topics.forEach((topic) => {
      groups[topic] = [];
    });

    articles.forEach((article) => {
      if (groups[article.topic]) {
        groups[article.topic].push(article);
      }
    });

    // Sort articles within each group by date (newest first)
    for (const topic in groups) {
      groups[topic].sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );
      // No longer slicing here, handled in template
    }
    return groups;
  });

  onMount(async () => {
    await theme.init();
    await userSubscription.init();
    await loadTopics();
    if (topics.length > 0) {
      loadNews();
    }
  });

  async function loadTopics() {
    try {
      topics = await sourceService.getTopics();
    } catch (e) {
      console.error("Failed to load topics", e);
    }
  }

  async function loadNews() {
    loading = true;
    try {
      articles = await fetchNewsForTopics(topics);
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function selectArticle(article) {
    selectedArticle = article;
    summary = "";
    view = "article";
  }

  async function doSummarize() {
    if (!selectedArticle) return;
    summaryLoading = true;
    try {
      const text = `${selectedArticle.title}\n\n${selectedArticle.description}`;
      summary = await summarize(text);
    } catch (e) {
      summary = "Error: " + e.message;
    } finally {
      summaryLoading = false;
    }
  }

  let showToast = $state(false);

  async function exportToMarkdown() {
    if (!selectedArticle) return;

    if (!$userSubscription.isPro) {
      alert("Export to Markdown is a Pro feature. Upgrade in Settings!");
      return;
    }

    const md = `# ${selectedArticle.title}
**Source:** ${selectedArticle.source || selectedArticle.topic} | **Date:** ${new Date(selectedArticle.pubDate).toLocaleDateString()}
[Read Original](${selectedArticle.link})

## Summary
${summary || "No summary generated."}

## Description
${getTextContent(selectedArticle.description)}
`;

    try {
      await navigator.clipboard.writeText(md);
      showToast = true;
      setTimeout(() => {
        showToast = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  }

  function backToFeed() {
    selectedArticle = null;
    summary = "";
    view = "feed";
  }

  function openSettings() {
    view = "settings";
  }

  async function closeSettings() {
    view = "feed";
    await loadTopics();
    loadNews(); // Reload news with potentially new topics
  }

  function getSnippet(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || "";
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  }

  function getTextContent(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  function toggleTopic(topic) {
    const newSet = new Set(expandedTopics);
    if (newSet.has(topic)) {
      newSet.delete(topic);
    } else {
      newSet.add(topic);
    }
    expandedTopics = newSet;
  }

  function toggleCollapse(topic) {
    const newSet = new Set(collapsedTopics);
    if (newSet.has(topic)) {
      newSet.delete(topic);
    } else {
      newSet.add(topic);
    }
    collapsedTopics = newSet;
  }
</script>

<main>
  {#if showToast}
    <div class="toast">Copied to clipboard!</div>
  {/if}

  {#if view !== "settings"}
    <header>
      <h1>News Curator</h1>
      <button class="icon-btn" onclick={openSettings}>⚙️</button>
    </header>
  {/if}

  {#if view === "settings"}
    <Settings on:back={closeSettings} />
  {:else if view === "article" && selectedArticle}
    <div class="article-view">
      <div class="article-nav">
        <button class="back-btn" onclick={backToFeed}>&larr; Back</button>
        <button class="export-btn" onclick={exportToMarkdown}
          >📋 Export MD</button
        >
      </div>
      <h2>{selectedArticle.title}</h2>
      <p class="meta">
        {new Date(selectedArticle.pubDate).toLocaleDateString()} • {selectedArticle.topic}
      </p>
      <div class="content">
        {@html selectedArticle.description}
      </div>

      <div class="ai-section">
        <div class="ai-header">
          <h3>AI Summary</h3>
          {#if !summary && !summaryLoading}
            <button class="ai-btn" onclick={doSummarize}>✨ Summarize</button>
          {/if}
        </div>

        {#if summary}
          <div class="summary-box">
            <p>{summary}</p>
          </div>
        {:else if summaryLoading}
          <div class="loading">Generating summary...</div>
        {/if}
      </div>

      <a href={selectedArticle.link} target="_blank" class="read-more"
        >Read full article</a
      >
    </div>
  {:else}
    <div class="feed">
      {#if loading}
        <div class="loading">Loading news...</div>
      {:else if topics.length > 0}
        {#each topics as topic}
          <div class="topic-group">
            <button class="topic-header" onclick={() => toggleCollapse(topic)}>
              <span>{topic}</span>
              <span class="chevron" class:collapsed={collapsedTopics.has(topic)}
                >▼</span
              >
            </button>
            {#if !collapsedTopics.has(topic)}
              {#if groupedArticles[topic] && groupedArticles[topic].length > 0}
                {@const visibleArticles = expandedTopics.has(topic)
                  ? groupedArticles[topic]
                  : groupedArticles[topic].slice(0, 5)}
                {#each visibleArticles as article}
                  <div
                    class="card"
                    role="button"
                    tabindex="0"
                    onclick={() => selectArticle(article)}
                    onkeydown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectArticle(article);
                      }
                    }}
                  >
                    <h3>{article.title}</h3>
                    <p class="snippet">{getSnippet(article.description)}</p>
                    <div class="card-footer">
                      <button
                        class="action-btn youtube-btn"
                        onclick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://www.youtube.com/results?search_query=${encodeURIComponent(article.title)}`,
                            "_blank",
                          );
                        }}
                        title="Search on YouTube"
                      >
                        📺 Search YT
                      </button>
                      <span class="date"
                        >{new Date(article.pubDate).toLocaleDateString()}</span
                      >
                    </div>
                  </div>
                {/each}
                {#if groupedArticles[topic].length > 5}
                  <button
                    class="view-more-btn"
                    onclick={() => toggleTopic(topic)}
                  >
                    {expandedTopics.has(topic)
                      ? "View Less"
                      : `View More (${groupedArticles[topic].length - 5} more)`}
                  </button>
                {/if}
              {:else}
                <div class="empty-topic">No recent news</div>
              {/if}
            {/if}
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <p>No topics found.</p>
          <button onclick={openSettings}>Add Topics</button>
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, sans-serif;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  main {
    width: 600px;
    min-height: 600px;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: var(--bg-header);
    backdrop-filter: blur(10px);
    z-index: 10;
  }
  h1 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    background: var(--accent-gradient);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .icon-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 50%;
    color: var(--text-secondary);
  }
  .icon-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  .feed {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .topic-group {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .topic-header {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    border: none;
    border-bottom: 2px solid var(--border-color);
    padding: 0.5rem 0;
    background: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .topic-header:hover {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
  }
  .chevron {
    font-size: 0.8rem;
    transition: transform 0.2s;
  }
  .chevron.collapsed {
    transform: rotate(-90deg);
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--border-hover);
  }
  .card h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.4;
    color: var(--text-primary);
  }
  .snippet {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.3rem;
  }
  .action-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
  }
  .action-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--accent-primary);
  }
  .youtube-btn:hover {
    color: #ff0000; /* YouTube Red */
    border-color: #ff0000;
  }
  .article-view {
    padding: 1rem;
  }
  .back-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  .back-btn:hover {
    color: var(--text-primary);
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
  }
  .content :global(a) {
    color: var(--accent-primary);
  }
  .ai-section {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .ai-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .ai-header h3 {
    margin: 0;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-primary);
  }
  .ai-btn {
    background: var(--accent-primary);
    color: var(--text-inverse);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8rem;
    transition: background 0.2s;
  }
  .ai-btn:hover {
    background: var(--accent-hover);
  }
  .summary-box {
    background: var(--bg-card);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--text-primary);
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
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-tertiary);
  }
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }
  .empty-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--accent-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .empty-state button:hover {
    background: var(--accent-hover);
  }
  .empty-topic {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    font-style: italic;
    padding: 0.5rem 0;
  }
  .view-more-btn {
    background: none;
    border: none;
    color: var(--accent-primary);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.5rem;
    text-align: center;
    width: 100%;
  }
  .view-more-btn:hover {
    text-decoration: underline;
  }
  .article-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .export-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
  }
  .export-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--accent-primary);
  }
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent-primary);
    color: var(--text-inverse);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    box-shadow: var(--shadow-md);
    z-index: 100;
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
