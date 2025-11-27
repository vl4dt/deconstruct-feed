<script>
  import { onMount } from "svelte";
  import {
    fetchNewsForTopics,
    fetchCachedNewsForTopics,
    fetchTrendingNews,
  } from "../lib/news/newsEngine";
  import { getPageContent } from "../lib/pageContent";
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
  import { savedItems } from "../lib/stores/savedItems";
  import { t, locale } from "../lib/stores/i18n";

  let articles = $state([]);
  let loading = $state(false);
  let isRefreshing = $state(false);
  let loadingMessage = $state("Loading...");
  let selectedArticle = $state(null);
  let summary = $state("");
  let summaryLoading = $state(false);
  let topics = $state([]);
  let view = $state("feed"); // feed, settings, article, trending, analysis, current-page
  let previousView = $state("feed");
  let expandedTopics = $state(new Set());
  let collapsedTopics = $state(new Set());

  // Selection Mode State
  let selectionMode = $state(false);
  let selectedArticleIds = $state(new Set());
  let generatedScript = $state("");
  let scriptLoading = $state(false);
  let analysisResult = $state("");
  let analysisTitle = $state("");

  // Search State

  let searchQuery = $state("");

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

  // Current Page State
  let currentPage = $state(null);
  let pageLoading = $state(false);
  let pageError = $state("");
  let analysisSource = $state("article");

  // Collections State
  let activeCollection = $state("all");
  let showCreateCollection = $state(false);
  let newCollectionName = $state("");
  let movingArticleLink = $state(null); // Article link being moved

  let filteredItems = $derived(
    activeCollection === "all"
      ? $savedItems.items
      : $savedItems.items.filter((i) => i.collectionId === activeCollection),
  );

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

      // Detect if running as popup
      const views = chrome.extension.getViews({ type: "popup" });
      if (views.includes(window)) {
        document.body.classList.add("is-popup");
      }

      loadingMessage = $t("checkingSubscription");
      await userSubscription.init();

      loadingMessage = $t("loadingSettings");
      await settings.init();
      await savedItems.init();

      loadingMessage = $t("loadingTopics");
      await loadTopics();

      loadingMessage = $t("checkingAI");
      chromeAIAvailable = await isChromeAIAvailable();

      if (topics.length > 0) {
        loadingMessage = $t("fetchingNews");
        await loadNews();
      }

      // Check for context menu query
      await checkContextMenuQuery();
    } catch (e) {
      console.error("Initialization error:", e);
    } finally {
      loading = false;
      // Ensure view starts at the top
      setTimeout(() => {
        window.scrollTo(0, 0);
        const feedEl = document.querySelector(".feed");
        if (feedEl) feedEl.scrollTop = 0;
      }, 100);
    }
  });

  // Check for context menu search query
  async function checkContextMenuQuery() {
    try {
      // Small delay to ensure storage write completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await chrome.storage.session.get("contextMenuQuery");
      if (result.contextMenuQuery) {
        console.log("Context menu search detected:", result.contextMenuQuery);

        // Switch to trending view and search
        view = "trending";
        await performContextMenuSearch(result.contextMenuQuery);

        // Clear the query
        await chrome.storage.session.remove("contextMenuQuery");
      } else {
        console.log("No context menu query found");
      }
    } catch (error) {
      console.error("Error checking context menu query:", error);
    }
  }

  // Perform search from context menu
  async function performContextMenuSearch(query) {
    try {
      loading = true;
      loadingMessage = `Searching for "${query}"...`;

      // Fetch news with the search query as a keyword
      const results = await fetchTrendingNews([query], true);

      console.log(`Found ${results.length} articles for "${query}"`);

      // Update articles
      trendingArticles = results;
    } catch (error) {
      console.error("Context menu search failed:", error);
    } finally {
      loading = false;
    }
  }

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
      previousView = view; // Save current view (feed or trending)
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
    analysisSource = "article";

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
    analysisSource = "article";

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
    analysisSource = "article";

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
**Source:** [${selectedArticle.source || selectedArticle.topic}](${selectedArticle.link}) | **Date:** ${new Date(selectedArticle.pubDate).toLocaleDateString()}
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

  function handleBack() {
    if (view === "analysis") {
      view = analysisSource === "page" ? "current-page" : "article";
    } else if (view === "article") {
      // Return to previous view (feed or trending)
      view = previousView;
      selectedArticle = null;
      summary = "";
      // Only clear selection mode if we're going back to feed and it wasn't active there?
      // For now, let's keep selection mode state as is or reset it if desired.
      // Resetting selection mode might be annoying if user wants to select more.
      // Let's just clear the article specific state.
    } else {
      // Default fallback
      view = "feed";
      selectedArticle = null;
      summary = "";
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

      // Smart toggle: if UI is not English, translate to English; otherwise stay in current language
      const targetLang = $locale === "en" ? "es" : "en";

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

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    view = "trending";
    loading = true;
    loadingMessage = `Searching for "${searchQuery}"...`;

    try {
      const results = await fetchTrendingNews([searchQuery], true);
      trendingArticles = results;
      // showSearch = false;
      // searchQuery = "";
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadCurrentPage() {
    view = "current-page";
    pageLoading = true;
    pageError = "";
    currentPage = null;
    // Reset AI states
    summary = "";
    biasResult = "";
    analysisResult = "";

    try {
      currentPage = await getPageContent();
    } catch (e) {
      pageError = e.message;
    } finally {
      pageLoading = false;
    }
  }

  async function doPageSummarize() {
    if (!currentPage) return;
    if (summary) {
      summary = "";
      return;
    }

    summaryLoading = true;
    try {
      summary = await summarize(currentPage.content);
    } catch (e) {
      summary = "Error: " + e.message;
    } finally {
      summaryLoading = false;
    }
  }

  async function doPageBias() {
    if (!currentPage) return;
    if (biasResult) {
      biasResult = "";
      return;
    }

    biasLoading = true;
    try {
      biasResult = await checkBias(currentPage.content);
    } catch (e) {
      biasResult = "Error: " + e.message;
    } finally {
      biasLoading = false;
    }
  }

  async function doPageDeepDive() {
    if (!currentPage) return;
    if (!$userSubscription.isPro) {
      upgradeMessage = "Deep Dive is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }

    scriptLoading = true;
    analysisTitle = "Page Deep Dive";
    view = "analysis";
    analysisSource = "page";

    try {
      // Create a mock article object for deepDive
      const mockArticle = {
        title: currentPage.title,
        description: currentPage.content,
        link: currentPage.url,
        pubDate: new Date().toISOString(),
        source: "Current Page",
      };
      analysisResult = await deepDive([mockArticle]);
    } catch (e) {
      analysisResult = "Error: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  async function toggleSave(article, e) {
    e.stopPropagation();
    const isSaved = $savedItems.items.some((i) => i.link === article.link);

    if (isSaved) {
      await savedItems.removeItem(article.link);
    } else {
      const result = await savedItems.saveItem(article);
      if (!result.success) {
        upgradeMessage = result.error;
        showUpgradeModal = true;
      }
    }
  }

  function createCollection() {
    if (!$userSubscription.isPro) {
      upgradeMessage = "Collections are a Pro feature.";
      showUpgradeModal = true;
      return;
    }
    showCreateCollection = true;
  }

  async function confirmCreateCollection() {
    if (!newCollectionName.trim()) return;
    await savedItems.createCollection(newCollectionName);
    showCreateCollection = false;
    newCollectionName = "";
  }

  async function moveArticleTo(collectionId) {
    if (!movingArticleLink) return;
    await savedItems.moveItem(movingArticleLink, collectionId);
    movingArticleLink = null;
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
            class="nav-btn"
            class:active={view === "trending"}
            onclick={() => {
              view = "trending";
              loadTrending();
            }}
            title={$t("trending")}
          >
            Trending
          </button>

          <button
            class="nav-btn"
            class:active={view === "current-page"}
            onclick={() => {
              view = "current-page";
              loadCurrentPage();
            }}
            title="Current Page"
          >
            Page
          </button>
        {/if}

        <button
          class="nav-btn"
          class:active={view === "feed"}
          onclick={() => {
            view = "feed";
          }}
          title={$t("myFeed")}
        >
          Feed
        </button>
        <button
          class="nav-btn"
          class:active={view === "saved"}
          onclick={() => {
            view = "saved";
          }}
          title="Saved Items"
        >
          Saved
        </button>
      </div>
      <div class="header-actions">
        <button class="icon-btn" onclick={loadNews} title={$t("refresh")}>
          Refresh
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

  {#if view === "feed" || view === "trending"}
    <div class="main-search-container">
      <div class="search-input-wrapper">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={$t("search") + "..."}
          bind:value={searchQuery}
          onkeydown={(e) => e.key === "Enter" && handleSearch()}
        />
        {#if searchQuery}
          <button
            class="clear-search-btn"
            onclick={() => {
              searchQuery = "";
              if (view === "trending") loadTrending();
            }}>×</button
          >
        {/if}
      </div>
    </div>
  {/if}

  {#if view === "settings"}
    <Settings on:back={closeSettings} />
  {:else if view === "current-page"}
    <div class="article-view">
      <div class="article-nav">
        <button class="back-btn" onclick={() => (view = "feed")}
          >&larr; {$t("back")}</button
        >
      </div>
      {#if pageLoading}
        <LoadingSpinner text="Analyzing page..." />
      {:else if pageError}
        <div class="error-state">
          <p>{pageError}</p>
          <button onclick={loadCurrentPage}>Retry</button>
        </div>
      {:else if currentPage}
        <h2>{currentPage.title}</h2>
        <p class="meta">
          <a href={currentPage.url} target="_blank">{currentPage.url}</a>
        </p>

        <div class="ai-section">
          <div class="ai-toolbar">
            <button
              class="ai-chip"
              class:active={summary}
              onclick={doPageSummarize}
              disabled={summaryLoading}
              title={$t("summarize")}
            >
              <svg
                class="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </button>
            <button
              class="ai-chip"
              class:active={biasResult}
              onclick={doPageBias}
              disabled={biasLoading}
              title={$t("biasCheck")}
            >
              <svg
                class="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </button>
            <button
              class="ai-chip"
              onclick={doPageDeepDive}
              title={$t("deepDiveAnalysis")}
            >
              <svg
                class="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
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
      {/if}
    </div>
  {:else if view === "analysis"}
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
        <button class="back-btn" onclick={handleBack}
          >&larr; {$t("back")}</button
        >
        <button
          class="icon-btn save-btn"
          class:active={$savedItems.items.some(
            (i) => i.link === selectedArticle.link,
          )}
          onclick={(e) => toggleSave(selectedArticle, e)}
          title={$savedItems.items.some((i) => i.link === selectedArticle.link)
            ? "Remove from saved"
            : "Save for later"}
        >
          {$savedItems.items.some((i) => i.link === selectedArticle.link)
            ? "Saved"
            : "Save"}
        </button>
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
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </button>
          <button
            class="ai-chip"
            class:active={biasResult}
            onclick={doBiasCheck}
            disabled={biasLoading}
            title={$t("biasCheck")}
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
          <button
            class="ai-chip"
            onclick={doGenerateScript}
            title={$t("videoScript")}
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
          <button
            class="ai-chip"
            onclick={doGeneratePodcastScript}
            title={$t("podcastScript")}
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
          <button
            class="ai-chip"
            onclick={doDeepDive}
            title={$t("deepDiveAnalysis")}
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
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
          <div class="divider"></div>
          <button
            class="generate-btn"
            onclick={() =>
              window.open(
                `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedArticle.title)}`,
                "_blank",
              )}
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <div class="divider"></div>
          <button
            class="ai-chip export-chip"
            onclick={exportToMarkdown}
            title={$t("export")}
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
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
                    title="Copy to clipboard">Copy</button
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
                    title="Copy to clipboard">Copy</button
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
      <h2 class="section-title">Trending Now</h2>
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
            <div class="card-image">
              {#if article.image}
                <img src={article.image} alt={article.title} loading="lazy" />
              {/if}
            </div>
            <div class="card-content">
              <h3>{article.title}</h3>
              <p class="snippet">{getSnippet(article.description)}</p>
            </div>
            <div class="card-actions">
              <button
                class="icon-btn save-btn"
                class:active={$savedItems.items.some(
                  (i) => i.link === article.link,
                )}
                onclick={(e) => toggleSave(article, e)}
                title={$savedItems.items.some((i) => i.link === article.link)
                  ? "Remove from saved"
                  : "Save for later"}
              >
                {$savedItems.items.some((i) => i.link === article.link)
                  ? "Saved"
                  : "Save"}
              </button>
            </div>
            <div class="card-footer">
              <a
                href={article.sourceLink || "#"}
                target="_blank"
                class="source source-link"
                onclick={(e) => e.stopPropagation()}
              >
                {article.source || "Unknown Source"}
              </a>
              <span class="separator">•</span>
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
  {:else if view === "saved"}
    <div class="feed">
      <div class="saved-header">
        <h2 class="section-title">
          Saved Items ({$savedItems.items.length})
        </h2>
        {#if $userSubscription.isPro}
          <button
            class="icon-btn add-btn"
            onclick={createCollection}
            title="New Collection">New</button
          >
        {/if}
      </div>

      {#if showCreateCollection}
        <div class="create-collection-row">
          <input bind:value={newCollectionName} placeholder="Collection Name" />
          <button class="primary-btn" onclick={confirmCreateCollection}
            >Create</button
          >
          <button
            class="cancel-btn"
            onclick={() => (showCreateCollection = false)}>Cancel</button
          >
        </div>
      {/if}

      {#if $userSubscription.isPro}
        <div class="saved-content-wrapper">
          <div class="collection-sidebar">
            <button
              class="collection-tab"
              class:active={activeCollection === "all"}
              onclick={() => (activeCollection = "all")}>All</button
            >
            {#each $savedItems.collections as collection}
              <button
                class="collection-tab"
                class:active={activeCollection === collection.id}
                onclick={() => (activeCollection = collection.id)}
              >
                {collection.name}
              </button>
            {/each}
          </div>
          <div class="saved-items-list">
            {#if filteredItems.length === 0}
              <p>No saved items yet.</p>
              <p class="sub-text">Bookmark articles to read them later.</p>
            {:else}
              {#each filteredItems as article}
                <div
                  class="card"
                  class:selected={selectedArticleIds.has(article.link)}
                  class:moving={movingArticleLink === article.link}
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
                  <div class="card-image">
                    {#if article.image}
                      <img
                        src={article.image}
                        alt={article.title}
                        loading="lazy"
                      />
                    {/if}
                  </div>
                  <div class="card-content">
                    <h3>{article.title}</h3>
                    <p class="snippet">{getSnippet(article.description)}</p>
                  </div>
                  <div class="card-actions">
                    {#if $userSubscription.isPro}
                      <div class="move-dropdown-container">
                        <button
                          class="icon-btn move-btn"
                          onclick={(e) => {
                            e.stopPropagation();
                            console.log("Move clicked", article.title);
                            movingArticleLink =
                              movingArticleLink === article.link
                                ? null
                                : article.link;
                          }}
                          title="Move to collection"
                        >
                          Move
                        </button>
                        {#if movingArticleLink === article.link}
                          <div class="move-dropdown">
                            <button
                              onclick={(e) => {
                                e.stopPropagation();
                                moveArticleTo("all");
                              }}>All (Default)</button
                            >
                            {#each $savedItems.collections as col}
                              <button
                                onclick={(e) => {
                                  e.stopPropagation();
                                  moveArticleTo(col.id);
                                }}>{col.name}</button
                              >
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {/if}
                    <button
                      class="icon-btn save-btn active"
                      onclick={(e) => toggleSave(article, e)}
                      title="Remove from saved"
                    >
                      Saved
                    </button>
                  </div>
                  <div class="card-footer">
                    <span class="source"
                      >{article.source || "Unknown Source"}</span
                    >
                    <span class="separator">•</span>
                    <span class="date"
                      >{new Date(article.pubDate).toLocaleDateString()}</span
                    >
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {:else}
        <!-- Free tier: simple list without sidebar -->
        {#if filteredItems.length === 0}
          <div class="empty-state">
            <p>No saved items yet.</p>
            <p class="sub-text">Bookmark articles to read them later.</p>
          </div>
        {:else}
          {#each filteredItems as article}
            <div
              class="card"
              class:selected={selectedArticleIds.has(article.link)}
              class:moving={movingArticleLink === article.link}
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
              <div class="card-image">
                {#if article.image}
                  <img src={article.image} alt={article.title} loading="lazy" />
                {/if}
              </div>
              <div class="card-content">
                <h3>{article.title}</h3>
                <p class="snippet">{getSnippet(article.description)}</p>
              </div>
              <div class="card-actions">
                <button
                  class="icon-btn save-btn active"
                  onclick={(e) => toggleSave(article, e)}
                  title="Remove from saved"
                >
                  Saved
                </button>
              </div>
              <div class="card-footer">
                <a
                  href={article.sourceLink || "#"}
                  target="_blank"
                  class="source source-link"
                  onclick={(e) => e.stopPropagation()}
                >
                  {article.source || "Unknown Source"}
                </a>
                <span class="separator">•</span>
                <span class="date"
                  >{new Date(article.pubDate).toLocaleDateString()}</span
                >
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>
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
                    <div class="card-image">
                      {#if article.image}
                        <img
                          src={article.image}
                          alt={article.title}
                          loading="lazy"
                        />
                      {/if}
                    </div>
                    <div class="card-content">
                      <h3>{article.title}</h3>
                      <p class="snippet">{getSnippet(article.description)}</p>
                    </div>
                    <div class="card-actions">
                      <button
                        class="icon-btn save-btn"
                        class:active={$savedItems.items.some(
                          (i) => i.link === article.link,
                        )}
                        onclick={(e) => toggleSave(article, e)}
                        title={$savedItems.items.some(
                          (i) => i.link === article.link,
                        )
                          ? "Remove from saved"
                          : "Save for later"}
                      >
                        {$savedItems.items.some((i) => i.link === article.link)
                          ? "Saved"
                          : "Save"}
                      </button>
                    </div>
                    <div class="card-footer">
                      <a
                        href={article.sourceLink || "#"}
                        target="_blank"
                        class="source source-link"
                        onclick={(e) => e.stopPropagation()}
                      >
                        {article.source || "Unknown Source"}
                      </a>
                      <span class="separator">•</span>
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
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    box-sizing: border-box;
    /* Default to responsive (Side Panel) */
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  :global(body.is-popup) {
    /* Fixed size for Popup */
    width: 780px;
    height: 600px;
  }

  /* Side panel mode detection: wider than 850px means side panel */
  @media (min-width: 850px) {
    :global(body) {
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    width: 100%;
    height: 100%;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
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
  .search-bar {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
    animation: slideLeft 0.2s ease-out;
  }
  @keyframes slideLeft {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .search-bar input {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 0.3rem 0.8rem;
    font-size: 0.9rem;
    color: var(--text-primary);
    width: 140px;
    outline: none;
  }
  .search-bar input:focus {
    border-color: var(--accent-primary);
    background: var(--bg-primary);
  }
  .icon-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .main-search-container {
    padding: 1rem 1rem 0 1rem;
    background: var(--bg-primary);
    position: sticky;
    top: 0;
    z-index: 9;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    width: 18px;
    height: 18px;
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .main-search-container input {
    width: 100%;
    padding: 0.8rem 1rem 0.8rem 2.5rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .main-search-container input:focus {
    background: var(--bg-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
  }

  .clear-search-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .clear-search-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  .feed {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    overflow-y: auto;
    overflow-x: auto;
    flex: 1;
    min-height: 0; /* Allow flex item to shrink for scrolling */
    /* Ensure scroll starts at top */
    scroll-behavior: smooth;
  }
  .feed::-webkit-scrollbar {
    width: 8px;
  }
  .feed::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }
  .feed::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
  .feed::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
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

  .card.moving {
    z-index: 1000;
    position: relative;
  }

  .card-actions {
    display: flex;
    align-items: flex-start;
  }

  .save-btn {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .save-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--border-color);
  }

  .save-btn.active {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }

  .saved-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .add-btn {
    font-size: 0.85rem;
    font-weight: 500;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    transition: all 0.2s;
  }

  .add-btn:hover {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }

  .create-collection-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .create-collection-row input {
    flex: 1;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .primary-btn,
  .cancel-btn {
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .primary-btn {
    background: var(--accent-primary);
    color: white;
  }

  .cancel-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .saved-content-wrapper {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .collection-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 120px;
    flex-shrink: 0;
  }

  .saved-items-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .collection-tab {
    background: var(--bg-secondary);
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 500;
    text-align: left;
    transition: all 0.2s;
  }

  .collection-tab:hover {
    background: var(--bg-tertiary);
  }

  .collection-tab.active {
    background: var(--accent-primary);
    color: white;
    font-weight: 600;
  }

  .move-btn {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    transition: all 0.2s;
  }

  .move-btn:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
  }

  .move-dropdown-container {
    position: relative;
  }

  .move-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 100;
    min-width: 150px;
    overflow: hidden;
  }

  .move-dropdown button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
  }

  .move-dropdown button:hover {
    background: var(--bg-tertiary);
  }

  .collection-tabs button.active {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }

  /* Responsive adjustments for narrow screens (e.g. side panel) */
  @media (max-width: 450px) {
    .card {
      flex-direction: column;
      gap: 0.5rem;
    }
    .card-image {
      width: 100%;
      height: 140px;
    }
    .card-content {
      width: 100%;
    }
    .header-left h1 {
      font-size: 1rem;
    }
    .icon-btn {
      font-size: 1rem;
      padding: 0.2rem;
    }
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--border-hover);
  }
  .card-image {
    width: 120px;
    height: 90px;
    min-width: 120px;
    min-height: 90px;
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
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.8em;
    max-height: 2.8em;
  }
  .snippet {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.55em;
    max-height: 2.55em;
  }
  .card-footer {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.3rem;
  }
  .card-footer .source {
    font-weight: 600;
    color: var(--accent-primary);
  }
  .card-footer .source-link {
    text-decoration: none;
    transition: all 0.2s;
  }
  .card-footer .source-link:hover {
    text-decoration: underline;
    opacity: 0.8;
  }
  .card-footer .separator {
    margin: 0 0.3rem;
    color: var(--text-tertiary);
  }

  .article-view {
    padding: 1rem;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0; /* Allow flex item to shrink for scrolling */
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
  }
  .back-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
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
    overflow-wrap: break-word;
    word-break: break-word;
    max-width: 100%;
  }
  .content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }
  .content :global(pre),
  .content :global(code) {
    white-space: pre-wrap;
    overflow-x: auto;
    max-width: 100%;
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

  .ai-toolbar {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .ai-chip {
    font-size: 0.85rem;
    font-weight: 500;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .ai-chip:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
  }
  .ai-chip.active {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }
  .ai-chip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .export-chip {
    margin-left: auto;
  }
  .translate-btn {
    font-size: 0.85rem;
    font-weight: 500;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
  }

  .btn-icon {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  .ai-chip {
    font-size: 0.85rem;
    font-weight: 500;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn {
    font-size: 0.85rem;
    font-weight: 500;
    background: transparent;
    color: var(--text-secondary);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .nav-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--border-color);
  }

  .nav-btn.active {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
    font-weight: 600;
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
