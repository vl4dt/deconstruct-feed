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
  import { fetchArticleContent } from "../lib/content/articleFetcher";
  import Settings from "../components/Settings.svelte";
  import UpgradeModal from "../components/UpgradeModal.svelte";
  import Logo from "../components/Logo.svelte";
  import FeedView from "./components/FeedView.svelte";
  import ArticleView from "./components/ArticleView.svelte";
  import TrendingView from "./components/TrendingView.svelte";
  import AnalysisView from "./components/AnalysisView.svelte";
  import CurrentPageView from "./components/CurrentPageView.svelte";
  import SavedView from "./components/SavedView.svelte";

  import { userSubscription } from "../lib/stores/subscription";
  import { theme } from "../lib/stores/theme";
  import { settings } from "../lib/stores/settings";
  import { savedItems } from "../lib/stores/savedItems";
  import { t, locale } from "../lib/stores/i18n";

  let articles = [];
  let loading = false;
  let isRefreshing = false;
  let loadingMessage = "Loading...";
  let selectedArticle = null;
  let summary = "";
  let summaryLoading = false;
  let topics = [];
  let view = "feed"; // feed, settings, article, trending, analysis, current-page, saved
  let previousView = "feed";
  let expandedTopics = new Set();
  let collapsedTopics = new Set();

  // Selection Mode State
  let selectionMode = false;
  let selectedArticleIds = new Set();
  let generatedScript = "";
  let scriptLoading = false;
  let analysisResult = "";
  let analysisTitle = "";
  let analysisType = ""; // script, podcast, deepdive

  // Search State
  let searchQuery = "";

  // Trending State
  let trendingArticles = [];

  // Bias Check State
  let biasResult = "";
  let biasLoading = false;

  // Upgrade Modal State
  let showUpgradeModal = false;
  let upgradeMessage = "";

  // Chrome AI State
  let chromeAIAvailable = true;

  // Translation State
  let translating = false;
  let isTranslated = false;
  let originalTitle = "";
  let originalDescription = "";
  let originalSummary = "";
  let originalBiasResult = "";
  let originalAnalysisResult = "";

  // Current Page State
  let currentPage = null;
  let pageLoading = false;
  let pageError = "";
  let analysisSource = "article";

  // Collections State
  let activeCollection = "all";
  let showCreateCollection = false;
  let newCollectionName = "";
  let movingArticleLink = null;

  // Derived state for grouped articles
  $: groupedArticles = (() => {
    const groups = {};
    topics.forEach((topic) => {
      groups[topic] = [];
    });
    articles.forEach((article) => {
      if (groups[article.topic]) {
        groups[article.topic].push(article);
      }
    });
    for (const topic in groups) {
      groups[topic].sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );
    }
    return groups;
  })();

  onMount(async () => {
    loading = true;
    try {
      loadingMessage = $t("initializingTheme");
      await theme.init();

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

      await checkContextMenuQuery();
    } catch (e) {
      console.error("Initialization error:", e);
    } finally {
      loading = false;
      setTimeout(() => {
        window.scrollTo(0, 0);
        const feedEl = document.querySelector(".feed");
        if (feedEl) feedEl.scrollTop = 0;
      }, 100);
    }
  });

  async function checkContextMenuQuery() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await chrome.storage.session.get("contextMenuQuery");
      if (result.contextMenuQuery) {
        console.log("Context menu search detected:", result.contextMenuQuery);
        view = "trending";
        await performContextMenuSearch(result.contextMenuQuery);
        await chrome.storage.session.remove("contextMenuQuery");
      }
    } catch (error) {
      console.error("Error checking context menu query:", error);
    }
  }

  async function performContextMenuSearch(query) {
    try {
      loading = true;
      loadingMessage = `Searching for "${query}"...`;
      const results = await fetchTrendingNews([query], true);
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
    if (!forceRefresh) {
      try {
        const cachedArticles = await fetchCachedNewsForTopics(topics);
        if (cachedArticles && cachedArticles.length > 0) {
          articles = cachedArticles;
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

  function selectArticle(article) {
    if (selectionMode) {
      toggleSelection(article);
    } else {
      selectedArticle = article;
      summary = "";
      biasResult = "";
      previousView = view;
      view = "article";

      isTranslated = false;
      originalTitle = "";
      originalDescription = "";

      if ($settings.autoSummarize) {
        doSummarize();
      }
      if ($settings.autoBias && $userSubscription.isPro) {
        doBiasCheck();
      }

      if ($userSubscription.isPro) {
        if ($settings.preloadScript) generateScript([article]);
        if ($settings.preloadPodcast) generatePodcastScript([article]);
      }
    }
  }

  function toggleSelection(article) {
    const newSet = new Set(selectedArticleIds);
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

  async function generateVideoScript(forceRefresh = false) {
    if (selectedArticleIds.size === 0) return;

    const selectedArticles = getAllArticles().filter((a) =>
      selectedArticleIds.has(a.link),
    );
    scriptLoading = true;
    analysisTitle = "Video Script";
    analysisSource = null;
    analysisType = "script";
    view = "analysis";

    try {
      // Fetch full content for selected articles
      for (let i = 0; i < selectedArticles.length; i++) {
        if (!selectedArticles[i].content) {
          analysisResult = `Fetching content for article ${i + 1} of ${selectedArticles.length}...`;
          const content = await fetchArticleContent(selectedArticles[i].link);
          if (content) {
            selectedArticles[i].content = content;
          }
        }
      }
      analysisResult = "Generating script...";

      analysisResult = await generateScript(
        selectedArticles,
        null,
        forceRefresh,
      );
    } catch (e) {
      analysisResult = "Error generating script: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  async function performDeepDive(forceRefresh = false) {
    if (selectedArticleIds.size === 0) return;

    const selectedArticles = getAllArticles().filter((a) =>
      selectedArticleIds.has(a.link),
    );
    scriptLoading = true;
    analysisTitle = "Deep Dive Analysis";
    analysisSource = null;
    analysisType = "deepdive";
    view = "analysis";

    try {
      // Fetch full content for selected articles
      for (let i = 0; i < selectedArticles.length; i++) {
        if (!selectedArticles[i].content) {
          analysisResult = `Fetching content for article ${i + 1} of ${selectedArticles.length}...`;
          const content = await fetchArticleContent(selectedArticles[i].link);
          if (content) {
            selectedArticles[i].content = content;
          }
        }
      }
      analysisResult = "Performing deep dive...";

      analysisResult = await deepDive(selectedArticles, null, forceRefresh);
    } catch (e) {
      analysisResult = "Error performing deep dive: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  async function doBiasCheck(forceRefresh = false) {
    if (!selectedArticle) return;

    if (biasResult && !forceRefresh) {
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
      if (!selectedArticle.content) {
        // Temporary loading indicator in the result area if needed,
        // but biasLoading handles the spinner.
        // We can just await.
        const content = await fetchArticleContent(selectedArticle.link);
        if (content) {
          selectedArticle.content = content;
        }
      }

      const text = selectedArticle.content
        ? `${selectedArticle.title}\n\n${selectedArticle.content}`
        : `${selectedArticle.title}\n\n${selectedArticle.description}`;

      const result = await checkBias(text, null, forceRefresh);
      originalBiasResult = result;

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

  async function doSummarize(forceRefresh = false) {
    if (!selectedArticle) return;

    if (summary && !forceRefresh) {
      summary = "";
      originalSummary = "";
      return;
    }

    summaryLoading = true;
    try {
      if (!selectedArticle.content) {
        const content = await fetchArticleContent(selectedArticle.link);
        if (content) {
          selectedArticle.content = content;
        }
      }

      const text = selectedArticle.content
        ? `${selectedArticle.title}\n\n${selectedArticle.content}`
        : `${selectedArticle.title}\n\n${selectedArticle.description}`;

      const result = await summarize(text, null, forceRefresh);
      originalSummary = result;

      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        summary = await translate(result, targetLang);
      } else {
        summary = result;
      }
    } catch (e) {
      summary = "Error: " + e.message;
    } finally {
      summaryLoading = false;
    }
  }

  async function doPageBias(forceRefresh = false) {
    if (!currentPage) return;

    if (biasResult && !forceRefresh) {
      biasResult = "";
      originalBiasResult = "";
      return;
    }

    biasLoading = true;
    try {
      const result = await checkBias(currentPage.content, null, forceRefresh);
      originalBiasResult = result;

      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        biasResult = await translate(result, targetLang);
      } else {
        biasResult = result;
      }
    } catch (e) {
      biasResult = "Error: " + e.message;
    } finally {
      biasLoading = false;
    }
  }

  async function doPageSummarize(forceRefresh = false) {
    if (!currentPage) return;

    if (summary && !forceRefresh) {
      summary = "";
      originalSummary = "";
      return;
    }

    summaryLoading = true;
    try {
      const result = await summarize(currentPage.content, null, forceRefresh);
      originalSummary = result;

      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        summary = await translate(result, targetLang);
      } else {
        summary = result;
      }
    } catch (e) {
      summary = "Error: " + e.message;
    } finally {
      summaryLoading = false;
    }
  }

  async function doGenerateScript(forceRefresh = false) {
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
    analysisType = "script";

    try {
      if (!selectedArticle.content) {
        analysisResult = "Fetching content...";
        const content = await fetchArticleContent(selectedArticle.link);
        if (content) {
          selectedArticle.content = content;
        }
      }
      analysisResult = "Generating script...";

      const result = await generateScript(
        [selectedArticle],
        null,
        forceRefresh,
      );
      originalAnalysisResult = result;

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

  async function doGeneratePodcastScript(forceRefresh = false) {
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
    analysisType = "podcast";

    try {
      if (!selectedArticle.content) {
        analysisResult = "Fetching content...";
        const content = await fetchArticleContent(selectedArticle.link);
        if (content) {
          selectedArticle.content = content;
        }
      }
      analysisResult = "Generating podcast script...";

      const result = await generatePodcastScript(
        [selectedArticle],
        null,
        forceRefresh,
      );
      originalAnalysisResult = result;

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

  async function doDeepDive(forceRefresh = false) {
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
    analysisType = "deepdive";

    try {
      if (!selectedArticle.content) {
        analysisResult = "Fetching content...";
        const content = await fetchArticleContent(selectedArticle.link);
        if (content) {
          selectedArticle.content = content;
        }
      }
      analysisResult = "Performing deep dive...";

      const result = await deepDive([selectedArticle], null, forceRefresh);
      originalAnalysisResult = result;

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

  async function doPageDeepDive(forceRefresh = false) {
    if (!currentPage) return;
    if (!$userSubscription.isPro) {
      upgradeMessage = "Deep Dive is a Pro feature. Upgrade to unlock!";
      showUpgradeModal = true;
      return;
    }

    scriptLoading = true;
    analysisTitle = "Deep Dive Analysis";
    view = "analysis";
    analysisSource = "page";
    analysisType = "deepdive";

    try {
      const mockArticle = {
        title: "Current Page",
        description: currentPage.content,
      };
      const result = await deepDive([mockArticle], null, forceRefresh);
      originalAnalysisResult = result;

      if ($settings.autoTranslateAI && $locale !== "en") {
        const targetLang = $locale === "es" ? "Spanish" : "English";
        analysisResult = await translate(result, targetLang);
      } else {
        analysisResult = result;
      }
    } catch (e) {
      analysisResult = "Error: " + e.message;
    } finally {
      scriptLoading = false;
    }
  }

  let showToast = false;

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
      if (analysisSource === "page") {
        view = "current-page";
      } else if (analysisSource === "article") {
        view = "article";
      } else {
        view = previousView || "feed";
      }
    } else if (view === "article") {
      view = previousView || "feed";
      selectedArticle = null;
      summary = "";
      biasResult = "";
    } else {
      view = "feed";
      selectedArticle = null;
      summary = "";
    }
  }

  async function toggleTranslation() {
    if (!selectedArticle) return;

    if (isTranslated) {
      // Restore original content
      if (selectedArticle._originalTitle) {
        selectedArticle.title = selectedArticle._originalTitle;
        selectedArticle.description = selectedArticle._originalDescription;
      }
      isTranslated = false;
      return;
    }

    translating = true;
    try {
      // Store original content on the article object if not already stored
      if (!selectedArticle._originalTitle) {
        selectedArticle._originalTitle = selectedArticle.title;
        selectedArticle._originalDescription = selectedArticle.description;

        // Also update local state for consistency
        originalTitle = selectedArticle.title;
        originalDescription = selectedArticle.description;
      }

      const translatedTitle = await translate(
        selectedArticle.title,
        $settings.targetLanguage,
        $settings.geminiKey,
      );
      const translatedDesc = await translate(
        selectedArticle.description,
        $settings.targetLanguage,
        $settings.geminiKey,
      );

      selectedArticle.title = translatedTitle;
      selectedArticle.description = translatedDesc;
      isTranslated = true;
    } catch (e) {
      console.error("Translation failed:", e);
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
    loadNews();
  }

  function handleUpgrade() {
    showUpgradeModal = false;
    view = "settings";
  }

  function toggleTopic(event) {
    const topic = event.detail;
    const newSet = new Set(expandedTopics);
    if (newSet.has(topic)) {
      newSet.delete(topic);
    } else {
      newSet.add(topic);
    }
    expandedTopics = newSet;
  }

  function toggleCollapse(event) {
    const topic = event.detail;
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

  async function toggleSave(event) {
    const { article, event: e } = event.detail;
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

  async function regenerateAnalysis() {
    if (view === "analysis") {
      if (analysisType === "script") {
        if (analysisSource === "article") {
          await doGenerateScript(true);
        } else {
          await generateVideoScript(true);
        }
      } else if (analysisType === "podcast") {
        await doGeneratePodcastScript(true);
      } else if (analysisType === "deepdive") {
        if (analysisSource === "page") {
          await doPageDeepDive(true);
        } else if (analysisSource === "article") {
          await doDeepDive(true);
        } else {
          await performDeepDive(true);
        }
      }
    }
  }

  async function moveArticleTo(event) {
    const collectionId = event.detail;
    if (!movingArticleLink) return;
    await savedItems.moveItem(movingArticleLink, collectionId);
    movingArticleLink = null;
  }

  function getTextContent(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
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
        <div class="brand">
          <img src="/icons/logo.svg" alt="NewsLens AI" class="brand-logo" />
          <Logo />
        </div>
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
        <button
          class="refresh-btn"
          class:disabled={isRefreshing}
          disabled={isRefreshing}
          onclick={() => loadNews(true)}
          title={isRefreshing ? loadingMessage : $t("refreshNews")}
        >
          <svg
            class:spinning={isRefreshing}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path
              d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
            />
          </svg>
          <span>{isRefreshing ? $t("updating") : $t("refresh")}</span>
        </button>
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
        <button class="icon-btn" onclick={openSettings} title={$t("settings")}
          >⚙️</button
        >
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
    <CurrentPageView
      {pageLoading}
      {pageError}
      {currentPage}
      {summary}
      {summaryLoading}
      {biasResult}
      {biasLoading}
      on:back={handleBack}
      on:retry={loadCurrentPage}
      on:doPageSummarize={(e) => doPageSummarize(e.detail)}
      on:doPageBias={(e) => doPageBias(e.detail)}
      on:doPageDeepDive={() => doPageDeepDive()}
      on:copyToClipboard={(e) => copyToClipboard(e.detail)}
      on:clearSummary={() => (summary = "")}
      on:clearBias={() => (biasResult = "")}
    />
  {:else if view === "analysis"}
    <AnalysisView
      {analysisTitle}
      {analysisResult}
      {scriptLoading}
      on:back={handleBack}
      on:copyToClipboard={(e) => copyToClipboard(e.detail)}
      on:regenerateAnalysis={regenerateAnalysis}
    />
  {:else if view === "article" && selectedArticle}
    <ArticleView
      {selectedArticle}
      {summary}
      {summaryLoading}
      {biasResult}
      {biasLoading}
      {translating}
      {isTranslated}
      on:back={handleBack}
      on:toggleSave={toggleSave}
      on:doSummarize={(e) => doSummarize(e.detail)}
      on:doBiasCheck={(e) => doBiasCheck(e.detail)}
      on:doGenerateScript={() => doGenerateScript()}
      on:doGeneratePodcastScript={() => doGeneratePodcastScript()}
      on:doDeepDive={() => doDeepDive()}
      on:toggleTranslation={toggleTranslation}
      on:exportToMarkdown={exportToMarkdown}
      on:copyToClipboard={(e) => copyToClipboard(e.detail)}
      on:clearSummary={() => (summary = "")}
      on:clearBias={() => (biasResult = "")}
    />
  {:else if view === "trending"}
    <TrendingView
      {loading}
      {loadingMessage}
      {trendingArticles}
      {selectionMode}
      {selectedArticleIds}
      on:selectArticle={(e) => selectArticle(e.detail)}
      on:toggleSave={toggleSave}
      on:generateVideoScript={() => generateVideoScript(false)}
      on:performDeepDive={() => performDeepDive(false)}
    />
  {:else if view === "saved"}
    <SavedView
      {selectionMode}
      {selectedArticleIds}
      {activeCollection}
      {showCreateCollection}
      {newCollectionName}
      {movingArticleLink}
      on:selectArticle={(e) => selectArticle(e.detail)}
      on:toggleSave={toggleSave}
      on:createCollection={createCollection}
      on:confirmCreateCollection={confirmCreateCollection}
      on:cancelCreateCollection={() => (showCreateCollection = false)}
      on:setActiveCollection={(e) => (activeCollection = e.detail)}
      on:setMovingArticleLink={(e) => (movingArticleLink = e.detail)}
      on:moveArticleTo={moveArticleTo}
      on:generateVideoScript={() => generateVideoScript(false)}
      on:performDeepDive={() => performDeepDive(false)}
      on:updateNewCollectionName={(e) => (newCollectionName = e.detail)}
    />
  {:else}
    <FeedView
      {loading}
      {loadingMessage}
      {topics}
      {groupedArticles}
      {expandedTopics}
      {collapsedTopics}
      {selectionMode}
      {selectedArticleIds}
      on:selectArticle={(e) => selectArticle(e.detail)}
      on:toggleSave={toggleSave}
      on:toggleTopic={toggleTopic}
      on:toggleCollapse={toggleCollapse}
      on:openSettings={openSettings}
      on:generateVideoScript={() => generateVideoScript(false)}
      on:performDeepDive={() => performDeepDive(false)}
    />
  {/if}
</main>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    box-sizing: border-box;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  :global(body.is-popup) {
    width: 780px;
    height: 600px;
  }

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
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .brand-logo {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
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
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .spinning {
    animation: spin 1s linear infinite;
    transform-origin: center;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
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

  .refresh-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--border-color);
  }

  .refresh-btn.disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>
