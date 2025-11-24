<script>
  import { onMount } from "svelte";
  import {
    fetchNewsForTopics,
    fetchTrendingNews,
  } from "../lib/news/newsEngine";
  import {
    summarize,
    generateScript,
    deepDive,
    checkBias,
  } from "../lib/ai/aiService";
  import { sourceService } from "../lib/news/sourceService";
  import { userSubscription } from "../lib/stores/subscription";
  import { theme } from "../lib/stores/theme";
  import Settings from "../components/Settings.svelte";
  import UpgradeModal from "../components/UpgradeModal.svelte";

  let articles = $state([]);
  let loading = $state(false);
  let selectedArticle = $state(null);
  let summary = $state("");
  let summaryLoading = $state(false);
  let topics = $state([]);
  let view = $state("feed"); // 'feed', 'article', 'settings', 'script', 'trending', 'analysis'
  let expandedTopics = $state(new Set());
  let collapsedTopics = $state(new Set());

  // Selection Mode State
  let selectionMode = $state(false);
  let selectedArticleIds = $state(new Set());
  let generatedScript = $state("");
  let scriptLoading = $state(false);
  let analysisResult = $state("");
  let analysisTitle = $state("");

  // Trending State
  let trendingArticles = $state([]);

  // Bias Check State
  let biasResult = $state("");
  let biasLoading = $state(false);

  // Upgrade Modal State
  let showUpgradeModal = $state(false);
  let upgradeMessage = $state("");

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

  async function loadTrending() {
    if (!$userSubscription.isPro) {
      upgradeMessage = "Trending Topics is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }
    view = "trending";
    loading = true;
    try {
      trendingArticles = await fetchTrendingNews();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function selectArticle(article) {
    if (selectionMode) {
      toggleSelection(article);
    } else {
      selectedArticle = article;
      summary = "";
      biasResult = "";
      view = "article";
    }
  }

  function toggleSelection(article) {
    const newSet = new Set(selectedArticleIds);
    // Use link as unique ID since we don't have real IDs
    if (newSet.has(article.link)) {
      newSet.delete(article.link);
    } else {
      newSet.add(article.link);
    }
    selectedArticleIds = newSet;
  }

  function toggleSelectionMode() {
    if (!$userSubscription.isPro) {
      upgradeMessage = "Selection Mode is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }
    selectionMode = !selectionMode;
    selectedArticleIds = new Set();
  }

  async function generateVideoScript() {
    if (selectedArticleIds.size === 0) return;

    const selectedArticles = getAllArticles().filter((a) =>
      selectedArticleIds.has(a.link),
    );
    scriptLoading = true;
    analysisTitle = "Video Script";
    view = "analysis";

    try {
      analysisResult = await generateScript(selectedArticles);
    } catch (e) {
      analysisResult = "Error generating script: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  async function performDeepDive() {
    if (selectedArticleIds.size === 0) return;

    const selectedArticles = getAllArticles().filter((a) =>
      selectedArticleIds.has(a.link),
    );
    scriptLoading = true;
    analysisTitle = "Deep Dive Analysis";
    view = "analysis";

    try {
      analysisResult = await deepDive(selectedArticles);
    } catch (e) {
      analysisResult = "Error performing deep dive: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  async function doBiasCheck() {
    if (!selectedArticle) return;
    if (!$userSubscription.isPro) {
      upgradeMessage = "Bias Check is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }
    biasLoading = true;
    try {
      const text = `${selectedArticle.title}\n\n${selectedArticle.description}`;
      biasResult = await checkBias(text);
    } catch (e) {
      biasResult = "Error: " + e.message;
    } finally {
      biasLoading = false;
    }
  }

  function getAllArticles() {
    return view === "trending" ? trendingArticles : articles;
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

  async function doGenerateScript() {
    if (!selectedArticle) return;
    if (!$userSubscription.isPro) {
      upgradeMessage = "Video Script is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }

    scriptLoading = true;
    analysisTitle = "Video Script";
    view = "analysis";

    try {
      analysisResult = await generateScript([selectedArticle]);
    } catch (e) {
      analysisResult = "Error generating script: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  async function doDeepDive() {
    if (!selectedArticle) return;
    if (!$userSubscription.isPro) {
      upgradeMessage = "Deep Dive is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }

    scriptLoading = true;
    analysisTitle = "Deep Dive Analysis";
    view = "analysis";

    try {
      analysisResult = await deepDive([selectedArticle]);
    } catch (e) {
      analysisResult = "Error performing deep dive: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  let showToast = $state(false);

  async function exportToMarkdown() {
    if (!selectedArticle) return;

    if (!$userSubscription.isPro) {
      upgradeMessage =
        "Export to Markdown is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
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

  async function copyToClipboard(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
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
    selectionMode = false;
    selectedArticleIds = new Set();
  }

  function openSettings() {
    view = "settings";
  }

  async function closeSettings() {
    view = "feed";
    await loadTopics();
    loadNews(); // Reload news with potentially new topics
  }

  function handleUpgrade() {
    showUpgradeModal = false;
    view = "settings";
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

  <UpgradeModal
    show={showUpgradeModal}
    message={upgradeMessage}
    on:close={() => (showUpgradeModal = false)}
    on:upgrade={handleUpgrade}
  />

  {#if view !== "settings"}
    <header>
      <div class="header-left">
        <h1>NewsLens AI</h1>
        {#if $userSubscription.isPro}
          <button
            class="icon-btn fire-btn"
            class:active={view === "trending"}
            onclick={loadTrending}
            title="Trending Topics"
          >
            🔥
          </button>
          <button
            class="icon-btn home-btn"
            class:active={view === "feed"}
            onclick={() => {
              view = "feed";
              loadNews();
            }}
            title="My Feed"
          >
            🏠
          </button>
        {/if}
      </div>
      <div class="header-actions">
        {#if $userSubscription.isPro && view !== "article" && view !== "analysis"}
          <button
            class="icon-btn select-btn"
            class:active={selectionMode}
            onclick={toggleSelectionMode}
            title="Select articles for video script"
          >
            {selectionMode ? "Cancel" : "Select"}
          </button>
        {/if}
        <button class="icon-btn" onclick={openSettings}>⚙️</button>
      </div>
    </header>
  {/if}

  {#if view === "settings"}
    <Settings on:back={closeSettings} />
  {:else if view === "analysis"}
    <div class="article-view">
      <button class="back-btn" onclick={backToFeed}>&larr; Back</button>
      <h2>{analysisTitle}</h2>

      {#if scriptLoading}
        <div class="loading">Analyzing with AI...</div>
      {:else}
        <div class="script-content">
          <pre>{analysisResult}</pre>
        </div>
        <button
          class="read-more"
          onclick={() => copyToClipboard(analysisResult)}
        >
          Copy Result
        </button>
      {/if}
    </div>
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
        <div class="ai-toolbar">
          <button
            class="ai-chip"
            class:active={summary}
            onclick={doSummarize}
            disabled={summaryLoading}
            title="Generate Summary"
          >
            ✨ Summarize
          </button>
          <button
            class="ai-chip"
            class:active={biasResult}
            onclick={doBiasCheck}
            disabled={biasLoading}
            title="Check for Bias"
          >
            ⚖️ Bias
          </button>
          <button
            class="ai-chip"
            onclick={doGenerateScript}
            title="Generate Video Script"
          >
            🎬 Script
          </button>
          <button
            class="ai-chip"
            onclick={doDeepDive}
            title="Deep Dive Analysis"
          >
            🧠 Deep Dive
          </button>
        </div>

        {#if summary || summaryLoading}
          <div class="ai-result-card" class:loading={summaryLoading}>
            <div class="result-header">
              <h4>Summary</h4>
              <div class="result-actions">
                {#if summary && !summaryLoading}
                  <button
                    class="copy-icon-btn"
                    onclick={() => copyToClipboard(summary)}
                    title="Copy to clipboard">📋</button
                  >
                  <button class="close-btn" onclick={() => (summary = "")}
                    >×</button
                  >
                {/if}
              </div>
            </div>
            {#if summaryLoading}
              <div class="loading-pulse">Generating summary...</div>
            {:else}
              <div class="markdown-content">
                <pre>{summary}</pre>
              </div>
            {/if}
          </div>
        {/if}

        {#if biasResult || biasLoading}
          <div class="ai-result-card bias-card" class:loading={biasLoading}>
            <div class="result-header">
              <h4>Bias Check</h4>
              <div class="result-actions">
                {#if biasResult && !biasLoading}
                  <button
                    class="copy-icon-btn"
                    onclick={() => copyToClipboard(biasResult)}
                    title="Copy to clipboard">📋</button
                  >
                  <button class="close-btn" onclick={() => (biasResult = "")}
                    >×</button
                  >
                {/if}
              </div>
            </div>
            {#if biasLoading}
              <div class="loading-pulse">Checking bias...</div>
            {:else}
              <div class="markdown-content">
                <pre>{biasResult}</pre>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <a href={selectedArticle.link} target="_blank" class="read-more"
        >Read full article</a
      >
    </div>
  {:else if view === "trending"}
    <div class="feed" class:selection-mode={selectionMode}>
      <h2 class="section-title">🔥 Trending Now</h2>
      {#if loading}
        <div class="loading">Loading trending news...</div>
      {:else if trendingArticles.length > 0}
        {#each trendingArticles as article}
          <div
            class="card"
            class:selected={selectedArticleIds.has(article.link)}
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
            {#if selectionMode}
              <div class="checkbox">
                {#if selectedArticleIds.has(article.link)}✓{/if}
              </div>
            {/if}
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
      {:else}
        <div class="empty-state">
          <p>No trending news found.</p>
        </div>
      {/if}
    </div>
    {#if selectionMode && selectedArticleIds.size > 0}
      <div class="action-bar">
        <div class="selected-count">{selectedArticleIds.size} selected</div>
        <button class="generate-btn" onclick={generateVideoScript}>
          ✨ Script
        </button>
        <button class="generate-btn deep-dive-btn" onclick={performDeepDive}>
          🧠 Deep Dive
        </button>
      </div>
    {/if}
  {:else}
    <div class="feed" class:selection-mode={selectionMode}>
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
                    class:selected={selectedArticleIds.has(article.link)}
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
                    {#if selectionMode}
                      <div class="checkbox">
                        {#if selectedArticleIds.has(article.link)}✓{/if}
                      </div>
                    {/if}
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

    {#if selectionMode && selectedArticleIds.size > 0}
      <div class="action-bar">
        <div class="selected-count">{selectedArticleIds.size} selected</div>
        <button class="generate-btn" onclick={generateVideoScript}>
          ✨ Script
        </button>
        <button class="generate-btn deep-dive-btn" onclick={performDeepDive}>
          🧠 Deep Dive
        </button>
      </div>
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, sans-serif;
    background: var(--bg-secondary);
    color: var(--text-primary);
    overflow: hidden;
  }
  main {
    width: 800px;
    height: 600px;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-header);
    backdrop-filter: blur(10px);
    z-index: 10;
    flex-shrink: 0;
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
    overflow-y: auto;
    flex: 1;
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
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .ai-toolbar {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.2rem;
    scrollbar-width: none; /* Firefox */
  }
  .ai-toolbar::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
  .ai-chip {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .ai-chip:hover:not(:disabled) {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--accent-primary);
    transform: translateY(-1px);
  }
  .ai-chip.active {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }
  .ai-chip:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    font-size: 1rem;
    padding: 0;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  .copy-icon-btn:hover {
    opacity: 1;
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
  .markdown-content pre {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre-wrap;
    font-family: inherit;
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
  .article-view {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
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
  .export-btn {
    background: var(--accent-primary);
    color: white;
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
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }
  .select-btn {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
  }
  .select-btn.active {
    background: var(--accent-primary);
    color: var(--text-inverse);
    border-color: var(--accent-primary);
  }
  .card.selected {
    border-color: var(--accent-primary);
    background: var(--bg-tertiary);
  }
  .checkbox {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-card);
    color: var(--accent-primary);
    font-weight: bold;
  }
  .card.selected .checkbox {
    border-color: var(--accent-primary);
    background: var(--accent-primary);
    color: var(--text-inverse);
  }
  .feed.selection-mode .card {
    position: relative;
    padding-right: 3rem;
  }
  .action-bar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-header);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
    padding: 0.8rem 1.5rem;
    border-radius: 30px;
    display: flex;
    gap: 1rem;
    align-items: center;
    box-shadow: var(--shadow-md);
    z-index: 100;
    animation: slideUp 0.3s ease-out;
  }
  @keyframes slideUp {
    from {
      transform: translate(-50%, 100%);
    }
    to {
      transform: translate(-50%, 0);
    }
  }
  .selected-count {
    font-weight: 600;
    color: var(--text-primary);
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
  .script-content {
    background: var(--bg-card);
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }
  .script-content pre {
    white-space: pre-wrap;
    font-family: inherit;
    margin: 0;
    line-height: 1.6;
    color: var(--text-primary);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .fire-btn,
  .home-btn {
    font-size: 1.1rem;
    padding: 0.3rem;
    border-radius: 50%;
    transition: background 0.2s;
  }
  .fire-btn.active,
  .home-btn.active {
    background: var(--bg-tertiary);
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.1);
  }
  .section-title {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .ai-actions {
    display: flex;
    gap: 0.5rem;
  }
  .bias-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }
  .bias-btn:hover {
    background: var(--bg-secondary);
    border-color: var(--accent-primary);
  }
  .bias-box {
    margin-top: 1rem;
    border-left: 4px solid #ff9800;
  }
  .summary-box h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  .deep-dive-btn {
    background: #9c27b0;
  }
  .deep-dive-btn:hover {
    background: #7b1fa2;
  }
</style>
