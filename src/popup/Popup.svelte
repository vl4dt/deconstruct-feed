<script>
  import { onMount } from "svelte";
  import {
    fetchNewsForTopics,
    fetchCachedNewsForTopics,
    fetchTrendingNews,
  } from "../lib/news/newsEngine";
  import {
    summarize,
    generateScript,
    generatePodcastScript,
    deepDive,
    checkBias,
    translate,
    isChromeAIAvailable,
  } from "../lib/ai/aiService";
  import { sourceService } from "../lib/news/sourceService";
  import Settings from "../components/Settings.svelte";
  import UpgradeModal from "../components/UpgradeModal.svelte";
  import MarkdownRenderer from "../components/MarkdownRenderer.svelte";
  import SkeletonLoader from "../components/SkeletonLoader.svelte";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import { userSubscription } from "../lib/stores/subscription";
  import { theme } from "../lib/stores/theme";
  import { settings } from "../lib/stores/settings";
  import { t, locale } from "../lib/stores/i18n";

  let articles = $state([]);
  let loading = $state(false);
  let isRefreshing = $state(false);
  let loadingMessage = $state("Loading...");
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

  // Chrome AI State
  let chromeAIAvailable = $state(true);

  // Translation State
  let translating = $state(false);
  let isTranslated = $state(false);
  let originalTitle = $state("");
  let originalDescription = $state("");
  let originalSummary = $state("");
  let originalBiasResult = $state("");
  let originalAnalysisResult = $state("");

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
    loading = true;
    try {
      loadingMessage = $t("initializingTheme");
      await theme.init();

      loadingMessage = $t("checkingSubscription");
      await userSubscription.init();

      loadingMessage = $t("loadingSettings");
      await settings.init();

      loadingMessage = $t("loadingTopics");
      await loadTopics();

      loadingMessage = $t("checkingAI");
      chromeAIAvailable = await isChromeAIAvailable();

      if (topics.length > 0) {
        loadingMessage = $t("fetchingNews");
        await loadNews();
      }
    } catch (e) {
      console.error("Initialization error:", e);
    } finally {
      loading = false;
    }
  });

  async function loadTopics() {
    try {
      topics = await sourceService.getTopics();
    } catch (e) {
      console.error("Failed to load topics", e);
    }
  }

  async function loadNews(forceRefresh = false) {
    // 1. Try to load from cache first if not forcing refresh
    if (!forceRefresh) {
      try {
        const cachedArticles = await fetchCachedNewsForTopics(topics);
        if (cachedArticles && cachedArticles.length > 0) {
          articles = cachedArticles;
          // Don't set loading=true if we have cached content
        } else {
          loading = true;
        }
      } catch (e) {
        console.error("Failed to load cached news", e);
        loading = true;
      }
    } else {
      loading = true;
    }

    // 2. Fetch fresh data in background (or foreground if no cache)
    if (articles.length > 0) {
      isRefreshing = true;
    }

    loadingMessage = $t("fetchingNews");
    try {
      const freshArticles = await fetchNewsForTopics(
        topics,
        forceRefresh,
        (msg) => {
          loadingMessage = msg;
        },
      );
      articles = freshArticles;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
      isRefreshing = false;
    }
  }

  async function loadTrending(forceRefresh = false) {
    if (!$userSubscription.isPro) {
      upgradeMessage = "Trending Topics is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }
    view = "trending";
    loading = true;
    loadingMessage = $t("loadingTrending");
    try {
      trendingArticles = await fetchTrendingNews(
        $settings.trendingKeywords,
        forceRefresh,
      );
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function refreshNews() {
    if (view === "trending") {
      loadTrending(true); // Force refresh
    } else {
      loadNews(true); // Force refresh
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

      // Reset translation state for new article
      isTranslated = false;
      originalTitle = "";
      originalDescription = "";

      // Auto-Analysis Logic
      if ($settings.autoSummarize) {
        doSummarize();
      }
      if ($settings.autoBias && $userSubscription.isPro) {
        doBiasCheck();
      }

      // Preloading Logic (Background)
      if ($userSubscription.isPro) {
        if ($settings.preloadScript) generateScript([article]);
        if ($settings.preloadPodcast) generatePodcastScript([article]);
        // Note: deepDive preloading removed as it would change view
      }
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

    // Toggle logic: If result exists, clear it (hide)
    if (biasResult) {
      biasResult = "";
      originalBiasResult = "";
      return;
    }

    if (!$userSubscription.isPro) {
      upgradeMessage = "Bias Check is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }
    biasLoading = true;
    try {
      const text = `${selectedArticle.title}\n\n${selectedArticle.description}`;
      const result = await checkBias(text);

      // Store original
      originalBiasResult = result;

      // Auto-translate if setting enabled and language is not English
      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        biasResult = await translate(result, targetLang);
      } else {
        biasResult = result;
      }
    } catch (e) {
      biasResult = "Error: " + e.message;
      originalBiasResult = "";
    } finally {
      biasLoading = false;
    }
  }

  function getAllArticles() {
    return view === "trending" ? trendingArticles : articles;
  }

  async function doSummarize() {
    if (!selectedArticle) return;

    // Toggle logic: If summary exists, clear it (hide)
    if (summary) {
      summary = "";
      originalSummary = "";
      return;
    }

    summaryLoading = true;
    try {
      const text = `${selectedArticle.title}\n\n${selectedArticle.description}`;
      const result = await summarize(text);

      // Store original
      originalSummary = result;

      // Auto-translate if setting enabled and language is not English
      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        summary = await translate(result, targetLang);
      } else {
        summary = result;
      }
    } catch (e) {
      summary = "Error: " + e.message;
      originalSummary = "";
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
      const result = await generateScript([selectedArticle]);

      // Store original
      originalAnalysisResult = result;

      // Auto-translate if setting enabled and language is not English
      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        analysisResult = await translate(result, targetLang);
      } else {
        analysisResult = result;
      }
    } catch (e) {
      analysisResult = "Error generating script: " + e.message;
      originalAnalysisResult = "";
    } finally {
      scriptLoading = false;
    }
  }

  async function doGeneratePodcastScript() {
    if (!selectedArticle) return;
    if (!$userSubscription.isPro) {
      upgradeMessage = "Podcast Script is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }

    scriptLoading = true;
    analysisTitle = $t("podcastScript");
    view = "analysis";

    try {
      const result = await generatePodcastScript([selectedArticle]);

      // Store original
      originalAnalysisResult = result;

      // Auto-translate if setting enabled and language is not English
      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        analysisResult = await translate(result, targetLang);
      } else {
        analysisResult = result;
      }
    } catch (e) {
      analysisResult = "Error generating podcast script: " + e.message;
      originalAnalysisResult = "";
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
    analysisTitle = $t("deepDiveAnalysis");
    view = "analysis";

    try {
      const result = await deepDive([selectedArticle]);

      // Store original
      originalAnalysisResult = result;

      // Auto-translate if setting enabled and language is not English
      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        analysisResult = await translate(result, targetLang);
      } else {
        analysisResult = result;
      }
    } catch (e) {
      analysisResult = `Error: ${e.message}`;
      originalAnalysisResult = "";
    } finally {
      scriptLoading = false;
    }
  }

  let showToast = $state(false);

  async function exportToMarkdown() {
    if (!selectedArticle) return;

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

  function backFromAnalysis() {
    if (selectedArticle) {
      view = "article";
    } else {
      backToFeed();
    }
  }

  async function toggleTranslation() {
    if (!selectedArticle) return;

    if (isTranslated) {
      // Revert to original
      selectedArticle.title = originalTitle;
      selectedArticle.description = originalDescription;

      // Revert AI content if exists
      if (originalSummary) summary = originalSummary;
      if (originalBiasResult) biasResult = originalBiasResult;
      if (originalAnalysisResult) analysisResult = originalAnalysisResult;

      isTranslated = false;
      return;
    }

    // Translate
    translating = true;
    try {
      // Save original if not saved yet
      if (!originalTitle) {
        originalTitle = selectedArticle.title;
        originalDescription = selectedArticle.description;
      }

      // Smart toggle: if UI is English, translate to Spanish; if Spanish, translate to English
      const targetLang = $locale === "es" ? "English" : "Spanish";

      // Translate article content
      const [translatedTitle, translatedDesc] = await Promise.all([
        translate(selectedArticle.title, targetLang),
        translate(selectedArticle.description, targetLang),
      ]);

      selectedArticle.title = translatedTitle;
      selectedArticle.description = translatedDesc;

      // Translate AI content if exists
      const promises = [];
      if (summary && !originalSummary) {
        originalSummary = summary;
        promises.push(
          translate(summary, targetLang).then((t) => (summary = t)),
        );
      } else if (summary && originalSummary) {
        promises.push(
          translate(originalSummary, targetLang).then((t) => (summary = t)),
        );
      }

      if (biasResult && !originalBiasResult) {
        originalBiasResult = biasResult;
        promises.push(
          translate(biasResult, targetLang).then((t) => (biasResult = t)),
        );
      } else if (biasResult && originalBiasResult) {
        promises.push(
          translate(originalBiasResult, targetLang).then(
            (t) => (biasResult = t),
          ),
        );
      }

      if (analysisResult && !originalAnalysisResult) {
        originalAnalysisResult = analysisResult;
        promises.push(
          translate(analysisResult, targetLang).then(
            (t) => (analysisResult = t),
          ),
        );
      } else if (analysisResult && originalAnalysisResult) {
        promises.push(
          translate(originalAnalysisResult, targetLang).then(
            (t) => (analysisResult = t),
          ),
        );
      }

      await Promise.all(promises);

      isTranslated = true;
    } catch (e) {
      console.error("Translation failed:", e);
      // Optional: show toast or error
    } finally {
      translating = false;
    }
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
    <div class="toast">{$t("copiedToClipboard")}</div>
  {/if}

  {#if !chromeAIAvailable}
    <div class="warning-banner">
      ⚠️ {$t("chromeAIUnavailable")}
      <button onclick={openSettings} class="link-btn">{$t("addAPIKey")}</button>
    </div>
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
        <h1>{$t("appTitle")}</h1>
        {#if $userSubscription.isPro}
          <button
            class="icon-btn fire-btn"
            class:active={view === "trending"}
            onclick={() => loadTrending()}
            title={$t("trendingTopics")}
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
            title={$t("myFeed")}
          >
            🏠
          </button>
        {/if}
      </div>
      <div class="header-actions">
        <button
          class="icon-btn refresh-btn"
          onclick={refreshNews}
          title={$t("refreshNews")}
        >
          🔄
        </button>
        {#if isRefreshing}
          <div class="refresh-indicator" title={loadingMessage}>
            <div class="spinner-small"></div>
            <span class="refresh-text">{$t("updating")}</span>
          </div>
        {/if}
        {#if $userSubscription.isPro && view !== "article" && view !== "analysis"}
          <button
            class="icon-btn select-btn"
            class:active={selectionMode}
            onclick={toggleSelectionMode}
            title="Select articles for video script"
          >
            {selectionMode ? $t("cancel") : $t("select")}
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
      <div class="article-nav">
        <button class="back-btn" onclick={backFromAnalysis}
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
        <button
          class="read-more"
          onclick={() => copyToClipboard(analysisResult)}
        >
          {$t("copyResult")}
        </button>
      {/if}
    </div>
  {:else if view === "article" && selectedArticle}
    <div class="article-view">
      <div class="article-nav">
        <button class="back-btn" onclick={backToFeed}
          >&larr; {$t("back")}</button
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
            title={$t("summarize")}
          >
            ✨ {$t("summarize")}
          </button>
          <button
            class="ai-chip"
            class:active={biasResult}
            onclick={doBiasCheck}
            disabled={biasLoading}
            title={$t("biasCheck")}
          >
            ⚖️ {$t("bias")}
          </button>
          <button
            class="ai-chip"
            onclick={doGenerateScript}
            title={$t("videoScript")}
          >
            🎬 {$t("script")} &rarr;
          </button>
          <button
            class="ai-chip"
            onclick={doGeneratePodcastScript}
            title={$t("podcastScript")}
          >
            🎙️ {$t("podcast")} &rarr;
          </button>
          <button
            class="ai-chip"
            onclick={doDeepDive}
            title={$t("deepDiveAnalysis")}
          >
            🧠 {$t("deepDive")} &rarr;
          </button>
          <button
            class="icon-btn translate-btn"
            onclick={toggleTranslation}
            disabled={translating}
            title={translating
              ? $t("translating")
              : isTranslated
                ? $t("showOriginal")
                : $locale === "en"
                  ? $t("translateToSpanish")
                  : $t("translateToEnglish")}
          >
            {translating ? "⏳" : "🌐"}
          </button>
          <button
            class="ai-chip"
            onclick={() =>
              window.open(
                `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedArticle.title)}`,
                "_blank",
              )}
            title={$t("searchYT")}
          >
            📺 {$t("searchYT")} &rarr;
          </button>
          <div class="divider"></div>
          <button
            class="ai-chip export-chip"
            onclick={exportToMarkdown}
            title={$t("export")}
          >
            📋 {$t("export")}
          </button>
        </div>

        {#if summary || summaryLoading}
          <div class="ai-result-card" class:loading={summaryLoading}>
            <div class="result-header">
              <h4>{$t("summary")}</h4>
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
              <div class="loading-pulse">
                <p class="loading-text">{$t("generatingSummary")}</p>
                <SkeletonLoader lines={3} />
              </div>
            {:else}
              <div class="markdown-content">
                <MarkdownRenderer content={summary} />
              </div>
            {/if}
          </div>
        {/if}

        {#if biasResult || biasLoading}
          <div class="ai-result-card bias-card" class:loading={biasLoading}>
            <div class="result-header">
              <h4>{$t("biasCheck")}</h4>
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
              <div class="loading-pulse">
                <SkeletonLoader lines={2} />
              </div>
            {:else}
              <div class="markdown-content">
                <MarkdownRenderer content={biasResult} />
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <a href={selectedArticle.link} target="_blank" class="read-more"
        >{$t("readFullArticle")}</a
      >
    </div>
  {:else if view === "trending"}
    <div class="feed" class:selection-mode={selectionMode}>
      <h2 class="section-title">🔥 {$t("trendingNow")}</h2>
      {#if loading}
        <LoadingSpinner text={loadingMessage} />
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
            {#if article.image}
              <div class="card-image">
                <img src={article.image} alt={article.title} loading="lazy" />
              </div>
            {/if}
            <div class="card-content">
              <h3>{article.title}</h3>
              <p class="snippet">{getSnippet(article.description)}</p>
            </div>
            <div class="card-footer">
              <span class="date"
                >{new Date(article.pubDate).toLocaleDateString()}</span
              >
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <p>{$t("noTrendingNews")}</p>
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
        <LoadingSpinner text={loadingMessage} />
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
                    {#if article.image}
                      <div class="card-image">
                        <img
                          src={article.image}
                          alt={article.title}
                          loading="lazy"
                        />
                      </div>
                    {/if}
                    <div class="card-content">
                      <h3>{article.title}</h3>
                      <p class="snippet">{getSnippet(article.description)}</p>
                    </div>
                    <div class="card-footer">
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
    flex-direction: row;
    gap: 1rem;
    align-items: flex-start;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--border-hover);
  }
  .card-image {
    width: 120px;
    height: 90px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 8px;
    background: var(--bg-tertiary);
  }
  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .card-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .card-content h3 {
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
  .loading-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
    font-style: normal;
  }
  .refresh-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-tertiary);
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    font-size: 0.8rem;
    color: var(--text-secondary);
    animation: fadeIn 0.3s ease-out;
  }
  .spinner-small {
    width: 12px;
    height: 12px;
    border: 2px solid var(--text-tertiary);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .refresh-text {
    white-space: nowrap;
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
    flex-wrap: wrap;
    padding: 0.2rem 0;
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
  .divider {
    width: 1px;
    height: 20px;
    background: var(--border-color);
    margin: 0 0.2rem;
  }
  .export-chip {
    border-style: dashed;
  }
  .ai-chip:hover:not(:disabled) {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }
  .warning-banner {
    background: #fff3cd;
    color: #856404;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.85rem;
    border-bottom: 1px solid #ffeeba;
  }
  .link-btn {
    background: none;
    border: none;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font: inherit;
    font-weight: bold;
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

  .deep-dive-btn {
    background: #9c27b0;
  }
  .deep-dive-btn:hover {
    background: #7b1fa2;
  }
</style>
