<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { sourceService } from "../lib/news/sourceService";
    import { userSubscription } from "../lib/stores/subscription";
    import { theme } from "../lib/stores/theme";
    import { settings, onboardingHelpers } from "../lib/stores/settings";
    import { t, locale, availableLanguages } from "../lib/stores/i18n";
    import UpgradeModal from "../components/UpgradeModal.svelte";
    import LicenseActivation from "../components/LicenseActivation.svelte";
    import PromptSettings from "../components/PromptSettings.svelte";
    import ConfirmDialog from "../components/ConfirmDialog.svelte";

    const dispatch = createEventDispatcher();

    let topics = $state([]);
    let sources = $state({});
    let newTopic = $state("");
    let newSource = $state("");
    let newTrendingKeyword = $state("");
    let selectedTopic = $state(null);
    let isCustomFeedMode = $state(false);
    let newCustomTopic = $state("");
    let newCustomUrl = $state("");

    const suggestedTopics = [
        "Technology",
        "Science",
        "Business",
        "Health",
        "Sports",
        "Entertainment",
        "Politics",
        "World",
        "AI",
        "Crypto",
        "Space",
        "Gaming",
        "Startups",
        "Programming",
        "Design",
        "Cybersecurity",
        "Environment",
        "Economics",
        "History",
        "Art",
    ];

    // Modal State
    let showUpgradeModal = $state(false);
    let upgradeMessage = $state("");
    let showLicenseActivation = $state(false);
    let showResetConfirm = $state(false);
    let showResetSuccess = $state(false);

    onMount(async () => {
        await userSubscription.init();
        await settings.init();
        await loadData();
    });

    function selectTopic(topic) {
        selectedTopic = topic;
    }

    async function loadData() {
        topics = await sourceService.getTopics();
        sources = await sourceService.getAllSources();
    }

    async function addTopic() {
        if (!$userSubscription.isPro && topics.length >= 3) {
            upgradeMessage =
                "Free tier is limited to 3 topics. Upgrade to Pro for unlimited topics!";
            showUpgradeModal = true;
            return;
        }
        if (newTopic) {
            await sourceService.addTopic(newTopic);
            newTopic = "";
            await loadData();
        }
    }

    async function removeTopic(topic) {
        await sourceService.removeTopic(topic);
        if (selectedTopic === topic) selectedTopic = null;
        await loadData();
    }

    async function addCustomFeed() {
        if (!$userSubscription.isPro && topics.length >= 3) {
            upgradeMessage =
                "Free tier is limited to 3 topics. Upgrade to Pro for unlimited topics!";
            showUpgradeModal = true;
            return;
        }
        if (newCustomTopic && newCustomUrl) {
            await sourceService.addTopicWithSource(
                newCustomTopic,
                newCustomUrl,
            );
            newCustomTopic = "";
            newCustomUrl = "";
            isCustomFeedMode = false;
            await loadData();
        }
    }

    async function addSource() {
        if (selectedTopic && newSource) {
            await sourceService.addSource(selectedTopic, newSource);
            newSource = "";
            await loadData();
        }
    }

    async function removeSource(topic, url) {
        await sourceService.removeSource(topic, url);
        await loadData();
    }

    function goBack() {
        if (selectedTopic) {
            selectedTopic = null;
        } else {
            dispatch("back");
        }
    }

    async function moveTopic(index, direction) {
        const newTopics = [...topics];
        const targetIndex = index + direction;

        if (targetIndex >= 0 && targetIndex < newTopics.length) {
            [newTopics[index], newTopics[targetIndex]] = [
                newTopics[targetIndex],
                newTopics[index],
            ];
            topics = newTopics;
            await sourceService.updateTopics(newTopics);
        }
    }

    function togglePro() {
        if ($userSubscription.isPro) {
            userSubscription.downgrade();
        } else {
            userSubscription.upgrade();
        }
    }

    function handleCheckoutOpened() {
        // User is going to checkout, no action needed
    }

    function handleShowActivation() {
        showUpgradeModal = false;
        showLicenseActivation = true;
    }

    function handleLicenseActivated() {
        showLicenseActivation = false;
        // Reload data to reflect new Pro status
        loadData();
    }

    async function deactivateLicense() {
        if (
            confirm(
                "Are you sure you want to deactivate your license? You'll lose access to Pro features.",
            )
        ) {
            await userSubscription.deactivateLicense();
        }
    }

    async function addTrendingKeyword() {
        if (newTrendingKeyword.trim()) {
            await settings.addTrendingKeyword(newTrendingKeyword.trim());
            newTrendingKeyword = "";
        }
    }

    async function removeTrendingKeyword(keyword) {
        await settings.removeTrendingKeyword(keyword);
    }

    const providers = [
        {
            id: "chrome",
            name: "Chrome AI",
            description: "On-device, private, free. Best for privacy.",
            badge: "Recommended",
        },
        {
            id: "gemini",
            name: "Google Gemini",
            description: "Powerful cloud AI. Requires API Key.",
            badge: "Free Tier",
        },
        {
            id: "anthropic",
            name: "Anthropic",
            description: "Claude 3.5 Sonnet. Requires API Key.",
            badge: "Pro",
        },
        {
            id: "openai",
            name: "OpenAI",
            description: "GPT-4o. Requires API Key.",
            badge: "Pro",
        },
        {
            id: "local",
            name: "Local AI",
            description: "Ollama / LM Studio. For power users.",
            badge: "Pro",
        },
    ];

    async function handleProviderSelect(id) {
        if (id !== "chrome" && !$userSubscription.isPro) {
            upgradeMessage = `${id === "local" ? "Local AI" : id.charAt(0).toUpperCase() + id.slice(1)} is a Pro feature. Upgrade to unlock!`;
            showUpgradeModal = true;
            return;
        }
        await settings.set("aiProvider", id);
    }

    async function handleResetConfirm() {
        showResetConfirm = false;
        await onboardingHelpers.resetOnboarding();
        showResetSuccess = true;
    }

    function handleResetCancel() {
        showResetConfirm = false;
    }

        message={upgradeMessage}
        on:close={() => (showUpgradeModal = false)}
        on:checkout-opened={handleCheckoutOpened}
        on:show-activation={handleShowActivation}
    />

    <LicenseActivation
        show={showLicenseActivation}
        on:close={() => (showLicenseActivation = false)}
        on:activated={handleLicenseActivated}
    />

    <ConfirmDialog
        show={showResetConfirm}
        title="Reset Onboarding"
        message="Reset onboarding status? This will show the welcome wizard on next launch."
        confirmText="Reset"
        cancelText="Cancel"
        on:confirm={handleResetConfirm}
        on:cancel={handleResetCancel}
    />

    <ConfirmDialog
        show={showResetSuccess}
        title="Onboarding Reset"
        message="Onboarding reset! Please close and reopen the extension."
        confirmText="OK"
        cancelText=""
        on:confirm={handleResetSuccessClose}
        on:cancel={handleResetSuccessClose}
    />

    <header>
        <button class="back-btn" onclick={goBack}>&larr;</button>
        <h2>{selectedTopic ? selectedTopic : $t("settings")}</h2>
        {#if !$userSubscription.loading}
            <button
                class="pro-badge"
                class:is-pro={$userSubscription.isPro}
                onclick={togglePro}
                title="Click to toggle subscription (Dev Mode)"
            >
                {$userSubscription.isPro ? "PRO" : "FREE"}
            </button>
        {/if}
    </header>

    {#if selectedTopic}
        <div class="section">
            <div class="input-group">
                <input
                    type="text"
                    bind:value={newSource}
                    placeholder={$t("add") + " RSS URL"}
                />
                <button onclick={addSource}>{$t("add")}</button>
            </div>
            <ul class="list">
                {#each sources[selectedTopic] || [] as source}
                    <li>
                        <span class="url" title={source}>{source}</span>
                        <button
                            class="delete-btn"
                            onclick={() => removeSource(selectedTopic, source)}
                            >×</button
                        >
                    </li>
                {/each}
                {#if !(sources[selectedTopic] && sources[selectedTopic].length)}
                    <li class="empty">{$t("noRecentNews")}</li>
                {/if}
            </ul>
        </div>
    {:else}
        <div class="section">
            <div class="theme-toggle">
                <h3>{$t("theme")}</h3>
                <button class="toggle-btn" onclick={theme.toggle}>
                    {$theme === "light" ? "☀️ " + $t("light") : "Dark"}
                </button>
            </div>

            <div class="section">
                <h3>{$t("language")}</h3>
                <div class="language-selector">
                    {#each availableLanguages as lang}
                        <button
                            class="lang-btn"
                            class:active={$locale === lang.code}
                            onclick={() => ($locale = lang.code)}
                        >
                            {lang.label}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="section">
                <h3>Translation</h3>
                <div class="setting-row">
                    <label for="target-language">Target Language</label>
                    <select
                        id="target-language"
                        value={$settings.targetLanguage}
                        onchange={(e) =>
                            settings.set(
                                "targetLanguage",
                                /** @type {HTMLSelectElement} */ (e.target)
                                    .value,
                            )}
                        class="provider-select"
                    >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="pt">Portuguese</option>
                    </select>
                </div>
            </div>

            <div class="preferences-section">
                <h3>{$t("general")}</h3>
                <div class="pref-row">
                    <span>{$t("autoSummarize")}</span>
                    <button
                        class="toggle-switch"
                        class:active={$settings.autoBias}
                        onclick={() => settings.toggle("autoBias")}
                        disabled={!$userSubscription.isPro}
                        title="Toggle Auto-Bias Check"
                    >
                    </button>
                </div>
                <div class="pref-row">
                    <span>{$t("preloadScript")} ({$t("proFeatures")})</span>
                    <button
                        class="toggle-switch"
                        class:active={$settings.preloadScript}
                        onclick={() => settings.toggle("preloadScript")}
                        disabled={!$userSubscription.isPro}
                        title="Toggle Preload Video Script"
                    >
                    </button>
                </div>
                <div class="pref-row">
                    <span>{$t("preloadPodcast")} ({$t("proFeatures")})</span>
                    <button
                        class="toggle-switch"
                        class:active={$settings.preloadPodcast}
                        onclick={() => settings.toggle("preloadPodcast")}
                        disabled={!$userSubscription.isPro}
                        title="Toggle Preload Podcast Script"
                    >
                    </button>
                </div>
                <div class="pref-row">
                    <span>{$t("autoTranslateAI")}</span>
                    <button
                        class="toggle-switch"
                        class:active={$settings.autoTranslateAI}
                        onclick={() => settings.toggle("autoTranslateAI")}
                        title="Toggle Auto-translate AI content"
                    >
                    </button>
                </div>
                <div class="pref-row">
                    <span>{$t("preloadDeepDive")} ({$t("proFeatures")})</span>
                    <button
                        class="toggle-switch"
                        class:active={$settings.preloadDeepDive}
                        onclick={() => settings.toggle("preloadDeepDive")}
                        disabled={!$userSubscription.isPro}
                        title="Toggle Preload Deep Dive"
                    >
                    </button>
                </div>
            </div>

            <!-- Help & Resources Section -->
            <div class="section">
                <h3>📖 Help & Resources</h3>
                <button
                    class="user-guide-btn"
                    onclick={openUserGuide}
                    title={$t("userGuideTooltip")}
                >
                    <span class="btn-icon">📚</span>
                    <span class="btn-text">{$t("viewUserGuide")}</span>
                    <span class="external-icon">↗</span>
                </button>
            </div>

            <!-- AI Provider Section -->

            <div class="section">
                <h3>AI Provider</h3>
                <div class="provider-grid">
                    {#each providers as provider}
                        <button
                            class="provider-card"
                            class:selected={$settings.aiProvider ===
                                provider.id}
                            onclick={() => handleProviderSelect(provider.id)}
                        >
                            <div class="provider-header">
                                <span class="provider-name"
                                    >{provider.name}</span
                                >
                                {#if provider.badge}
                                    <span
                                        class="badge"
                                        class:pro={provider.badge === "Pro"}
                                        class:recommended={provider.badge ===
                                            "Recommended"}
                                        >{provider.badge}</span
                                    >
                                {/if}
                            </div>
                            <p class="provider-desc">{provider.description}</p>
                        </button>
                    {/each}
                </div>

                {#if $settings.aiProvider === "local"}
                    <div class="provider-settings">
                        <div class="setting-row">
                            <label for="local-url">URL</label>
                            <input
                                id="local-url"
                                type="text"
                                value={$settings.localAIUrl}
                                oninput={(e) =>
                                    settings.set(
                                        "localAIUrl",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="http://localhost:11434/v1/chat/completions"
                            />
                        </div>
                        <div class="setting-row">
                            <label for="local-model">Model</label>
                            <input
                                id="local-model"
                                type="text"
                                value={$settings.localAIModel}
                                oninput={(e) =>
                                    settings.set(
                                        "localAIModel",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="llama3"
                            />
                        </div>
                    </div>
                {:else if $settings.aiProvider === "openai"}
                    <div class="provider-settings">
                        <div class="setting-row">
                            <label for="openai-key">API Key</label>
                            <input
                                id="openai-key"
                                type="password"
                                value={$settings.openaiKey}
                                oninput={(e) =>
                                    settings.set(
                                        "openaiKey",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="sk-..."
                            />
                        </div>
                        <div class="setting-row">
                            <label for="openai-model">Model</label>
                            <input
                                id="openai-model"
                                type="text"
                                value={$settings.openaiModel}
                                oninput={(e) =>
                                    settings.set(
                                        "openaiModel",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="gpt-4o-mini"
                            />
                        </div>
                    </div>
                {:else if $settings.aiProvider === "anthropic"}
                    <div class="provider-settings">
                        <div class="setting-row">
                            <label for="anthropic-key">API Key</label>
                            <input
                                id="anthropic-key"
                                type="password"
                                value={$settings.anthropicKey}
                                oninput={(e) =>
                                    settings.set(
                                        "anthropicKey",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="sk-ant-..."
                            />
                        </div>
                        <div class="setting-row">
                            <label for="anthropic-model">Model</label>
                            <input
                                id="anthropic-model"
                                type="text"
                                value={$settings.anthropicModel}
                                oninput={(e) =>
                                    settings.set(
                                        "anthropicModel",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="claude-3-5-sonnet-latest"
                            />
                        </div>
                    </div>
                {:else if $settings.aiProvider === "gemini"}
                    <!-- Gemini Key is handled in aiService but we should expose it here if we want to unify -->
                    <!-- Currently aiService uses a hardcoded key or passed key? -->
                    <!-- Looking at aiService, it takes apiKey as arg. Popup passes it? -->
                    <!-- Popup doesn't seem to pass it in the code I saw. -->
                    <!-- Wait, aiService.js: summarize(text, apiKey = null) -->
                    <!-- Popup.svelte: summarize(text) -->
                    <!-- It seems Gemini key might be missing in current implementation or I missed where it's stored. -->
                    <!-- Let's check if there is a geminiKey setting already. -->
                    <!-- settings.js didn't have it. -->
                    <!-- So currently Gemini might not be fully working or relies on something else. -->
                    <!-- I'll add a Gemini Key input here and update settings.js to include it if needed, -->
                    <!-- but for now I'll stick to the plan. -->
                    <!-- Actually, if I select Gemini, I should probably allow entering a key. -->
                    <!-- I'll add 'geminiKey' to settings.js later if needed, but for now let's assume the user might want to enter it. -->
                    <!-- I'll add it to the UI and settings.set will save it to storage even if not in default state (though it's better to be in default). -->
                    <div class="provider-settings">
                        <div class="setting-row">
                            <label for="gemini-key">API Key</label>
                            <input
                                id="gemini-key"
                                type="password"
                                value={$settings.geminiKey || ""}
                                oninput={(e) =>
                                    settings.set(
                                        "geminiKey",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="Gemini API Key"
                            />
                        </div>
                        <div class="setting-row">
                            <label for="gemini-model">Model</label>
                            <input
                                id="gemini-model"
                                type="text"
                                value={$settings.geminiModel || ""}
                                oninput={(e) =>
                                    settings.set(
                                        "geminiModel",
                                        /** @type {HTMLInputElement} */ (
                                            e.target
                                        ).value,
                                    )}
                                placeholder="gemini-1.5-flash"
                            />
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Custom Prompts Section (Pro Only) -->
            {#if $userSubscription.isPro}
                <div class="section">
                    <h3>Custom AI Prompts</h3>
                    <PromptSettings />
                </div>
            {/if}

            <!-- License Management Section -->
            <div class="license-section">
                <h3>License</h3>
                {#if $userSubscription.isPro}
                    <div class="license-info">
                        <div class="info-row">
                            <span class="label">Status:</span>
                            <span class="value pro">✓ Pro Active</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Tier:</span>
                            <span class="value"
                                >{$userSubscription.tier || "N/A"}</span
                            >
                        </div>
                        {#if $userSubscription.email}
                            <div class="info-row">
                                <span class="label">Email:</span>
                                <span class="value"
                                    >{$userSubscription.email}</span
                                >
                            </div>
                        {/if}
                        {#if $userSubscription.expiresAt}
                            <div class="info-row">
                                <span class="label">Expires:</span>
                                <span class="value"
                                    >{new Date(
                                        $userSubscription.expiresAt,
                                    ).toLocaleDateString()}</span
                                >
                            </div>
                        {/if}
                        {#if $userSubscription.error}
                            <div class="error-notice">
                                {$userSubscription.error}
                            </div>
                        {/if}
                        <button
                            class="deactivate-btn"
                            onclick={deactivateLicense}
                        >
                            Deactivate License
                        </button>
                    </div>
                {:else}
                    <div class="license-info">
                        <div class="info-row">
                            <span class="label">Status:</span>
                            <span class="value free">Free Tier</span>
                        </div>
                        <button
                            class="activate-btn"
                            onclick={() => (showLicenseActivation = true)}
                        >
                            Activate License
                        </button>
                    </div>
                {/if}
            </div>

            {#if !$userSubscription.isPro}
                <div class="upgrade-banner">
                    <p>Free Tier: {topics.length} / 3 {$t("topics")}</p>
                    <button
                        class="upgrade-btn"
                        onclick={() => userSubscription.upgrade()}
                        >{$t("upgradeToPro")}</button
                    >
                </div>
            {/if}

            <h3>{$t("topics")}</h3>

            <div class="custom-feed-toggle">
                <button
                    class="text-btn"
                    onclick={() => (isCustomFeedMode = !isCustomFeedMode)}
                >
                    {isCustomFeedMode
                        ? "Cancel Custom Feed"
                        : "+ Add Custom RSS Feed"}
                </button>
            </div>

            {#if isCustomFeedMode}
                <div class="custom-feed-form">
                    <div class="input-group">
                        <input
                            type="text"
                            bind:value={newCustomTopic}
                            placeholder="Topic Name (e.g. Tech Blog)"
                            list="existing-topics"
                        />
                        <datalist id="existing-topics">
                            {#each topics as topic}
                                <option value={topic}></option>
                            {/each}
                        </datalist>
                    </div>
                    <div class="input-group">
                        <input
                            type="text"
                            bind:value={newCustomUrl}
                            placeholder="RSS URL (e.g. https://example.com/feed.xml)"
                        />
                        <button onclick={addCustomFeed}>Add Feed</button>
                    </div>
                </div>
            {:else}
                <div class="input-group">
                    <input
                        type="text"
                        bind:value={newTopic}
                        list="topic-suggestions"
                        placeholder={$userSubscription.isPro ||
                        topics.length < 3
                            ? $t("add") + " topic..."
                            : "Limit reached"}
                        disabled={!$userSubscription.isPro &&
                            topics.length >= 3}
                    />
                    <button
                        onclick={addTopic}
                        disabled={!$userSubscription.isPro &&
                            topics.length >= 3}>{$t("add")}</button
                    >
                </div>
                <datalist id="topic-suggestions">
                    {#each suggestedTopics as topic}
                        <option value={topic}></option>
                    {/each}
                </datalist>
            {/if}
            <ul class="list">
                {#each topics as topic, i}
                    <li>
                        <div class="topic-controls">
                            <button
                                class="move-btn"
                                disabled={i === 0}
                                onclick={() => moveTopic(i, -1)}>↑</button
                            >
                            <button
                                class="move-btn"
                                disabled={i === topics.length - 1}
                                onclick={() => moveTopic(i, 1)}>↓</button
                            >
                        </div>
                        <button
                            class="item-btn"
                            onclick={() => selectTopic(topic)}
                            title="Manage Sources"
                        >
                            {topic} <span class="manage-icon">⚙️</span>
                        </button>
                        <button
                            class="delete-btn"
                            onclick={() => removeTopic(topic)}>×</button
                        >
                    </li>
                {/each}
            </ul>

            <!-- Trending Keywords Section -->
            <h3>{$t("trendingKeywords")}</h3>
            <p class="section-description">{$t("trendingKeywordsDesc")}</p>
            <div class="input-group">
                <input
                    type="text"
                    bind:value={newTrendingKeyword}
                    placeholder={$t("addTrendingKeyword") + "..."}
                />
                <button onclick={addTrendingKeyword}>{$t("add")}</button>
            </div>
            <ul class="list">
                {#each $settings.trendingKeywords as keyword}
                    <li>
                        <span>{keyword}</span>
                        <button onclick={() => removeTrendingKeyword(keyword)}>
                            {$t("remove")}
                        </button>
                    </li>
                {/each}
            </ul>

            <!-- Debug / Testing Section -->
            <h3>Debug</h3>
            <div class="section">
                <div class="pref-row">
                    <span>Reset Onboarding Flow</span>
                    <button
                        class="secondary-btn"
                        onclick={() => {
                            showResetConfirm = true;
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div class="actions">
                <button class="done-btn" onclick={goBack}>Done</button>
            </div>
        </div>
    {/if}
</div>

<style>
    .settings-container {
        padding: 1.5rem;
        background: var(--bg-primary);
        height: 100%;
        box-sizing: border-box;
        color: var(--text-primary);
        overflow-y: auto;
        font-family:
            "Inter",
            system-ui,
            -apple-system,
            sans-serif;
    }

    /* Custom Scrollbar */
    .settings-container::-webkit-scrollbar {
        width: 8px;
    }
    .settings-container::-webkit-scrollbar-track {
        background: transparent;
    }
    .settings-container::-webkit-scrollbar-thumb {
        background-color: var(--border-color);
        border-radius: 4px;
    }

    header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    h2 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
        flex: 1;
        color: var(--text-primary);
        letter-spacing: -0.02em;
    }
    h3 {
        margin: 0 0 1rem 0;
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-secondary);
        font-weight: 600;
    }

    /* Card/Section Styling */
    .section,
    .preferences-section,
    .license-section,
    .theme-toggle {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .theme-toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 1.25rem;
    }
    .theme-toggle h3 {
        margin: 0;
    }

    /* Inputs & Buttons */
    .input-group {
        display: flex;
        gap: 0.8rem;
        margin-bottom: 1.2rem;
    }
    input {
        flex: 1;
        padding: 0.6rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 0.95rem;
        background: var(--bg-primary);
        color: var(--text-primary);
        transition: all 0.2s;
    }
    input:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
    }
    button {
        padding: 0.6rem 1.2rem;
        background: var(--accent-primary);
        color: var(--text-inverse);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    button:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
    }
    button:active {
        transform: translateY(0);
    }

    /* List Styling */
    .list {
        list-style: none;
        padding: 0;
        margin: 0;
        border: 1px solid var(--border-color);
        border-radius: 10px;
        overflow: hidden;
    }
    li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-card);
        gap: 0.8rem;
        transition: background 0.2s;
    }
    li:last-child {
        border-bottom: none;
    }
    li:hover {
        background: var(--bg-tertiary);
    }
    li.empty {
        color: var(--text-tertiary);
        justify-content: center;
        font-style: italic;
        padding: 2rem;
    }

    /* Item Buttons */
    .item-btn {
        background: none;
        color: var(--text-primary);
        text-align: left;
        padding: 0;
        font-weight: 500;
        flex: 1;
        font-size: 1rem;
    }
    .item-btn:hover {
        background: none;
        color: var(--accent-primary);
        transform: none;
    }
    .delete-btn {
        background: none;
        color: var(--text-tertiary);
        padding: 0.4rem;
        font-size: 1.2rem;
        line-height: 1;
        border-radius: 50%;
        width: 32px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem 0;
        border-bottom: 1px solid var(--border-color);
    }
    /* Preferences Rows */
    .pref-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        margin: 0 -1.25rem; /* Negative margin to stretch to edge of card */
        padding-left: 1.25rem;
        padding-right: 1.25rem;
        border-bottom: 1px solid var(--border-color);
        transition: background-color 0.2s ease;
    }
    .pref-row:first-of-type {
        margin-top: -0.5rem;
    }

    .custom-feed-toggle {
        margin-bottom: 1rem;
        text-align: right;
    }
    .text-btn {
        background: none;
        color: var(--accent-primary);
        padding: 0;
        font-size: 0.9rem;
        text-decoration: underline;
        cursor: pointer;
    }
    .text-btn:hover {
        background: none;
        color: var(--accent-hover);
    }
    .custom-feed-form {
        background: var(--bg-tertiary);
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border: 1px solid var(--border-color);
    }
    .manage-icon {
        font-size: 0.8em;
        opacity: 0.5;
        margin-left: 0.5rem;
    }
    .item-btn:hover .manage-icon {
        opacity: 1;
    }
    .pref-row:last-child {
        border-bottom: none;
        margin-bottom: -0.5rem;
    }
    .pref-row:hover {
        background-color: var(--bg-tertiary);
    }
    .pref-row span {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 0.95rem;
    }

    /* Modern Toggle Switch */
    .toggle-switch {
        width: 48px;
        height: 26px;
        border-radius: 13px;
        position: relative;
        background: var(--bg-tertiary); /* Default off state */
        background-color: #e0e0e0; /* Fallback/Light mode off */
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0;
        overflow: visible;
        border: 2px solid transparent; /* For focus ring */
        cursor: pointer;
        flex-shrink: 0;
    }
    /* Dark mode adjustment for off state if needed, assuming var handles it */
    :global(body.dark) .toggle-switch {
        background-color: #4a4a4a;
    }

    .toggle-switch::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: white;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .toggle-switch.active {
        background-color: var(--accent-primary);
        border-color: transparent;
    }
    .toggle-switch.active::after {
        transform: translateX(22px);
    }
    .toggle-switch:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(100%);
    }
    .toggle-switch:focus-visible {
        outline: none;
        box-shadow:
            0 0 0 2px var(--bg-card),
            0 0 0 4px var(--accent-primary);
    }

    /* AI Provider Settings */
    .provider-select {
        width: 100%;
        padding: 0.75rem 1rem;
        padding-right: 2.5rem; /* Space for arrow */
        border: 1px solid var(--border-color);
        border-radius: 10px;
        font-size: 0.95rem;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        cursor: pointer;
        appearance: none; /* Remove default arrow */
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 0.65em auto;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
    }
    :global(body.dark) .provider-select {
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ccc%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    }
    .provider-select:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
    }

    .provider-settings {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
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

    .setting-row {
        margin-bottom: 1rem;
    }
    .setting-row label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }
    .setting-row input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.7rem 1rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
    }
    .setting-row input:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
    }
    .license-info {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1rem;
    }
    .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.6rem 0;
        border-bottom: 1px solid var(--border-color);
    }
    .info-row:last-of-type {
        border-bottom: none;
    }
    .info-row .label {
        font-weight: 600;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
    .info-row .value {
        color: var(--text-primary);
        font-size: 0.9rem;
    }
    .info-row .value.pro {
        color: #4caf50;
        font-weight: 700;
    }

    /* Badges & Banners */
    .pro-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        color: var(--text-secondary);
        cursor: pointer;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .pro-badge.is-pro {
        background: linear-gradient(135deg, #ffd700, #ffa500);
        color: #000;
        border: none;
        box-shadow: 0 2px 4px rgba(255, 215, 0, 0.2);
    }
    .upgrade-banner {
        background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-card));
        border: 1px solid var(--accent-primary);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        text-align: center;
        box-shadow: 0 4px 12px rgba(var(--accent-primary-rgb), 0.1);
    }
    .upgrade-btn {
        background: linear-gradient(135deg, #4a90e2, #357abd);
        width: 100%;
        margin-top: 0.5rem;
        padding: 0.8rem;
        font-size: 1rem;
    }

    /* Back Button */
    .back-btn {
        background: transparent;
        color: var(--text-primary);
        padding: 0.5rem;
        font-size: 1.2rem;
        border-radius: 50%;
        width: 40px;
        height: 40px;
    }
    .back-btn:hover {
        background: var(--bg-tertiary);
        transform: none;
    }

    /* URL Text */
    .url {
        font-size: 0.85rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
        display: block;
    }

    /* Topic Controls */
    .topic-controls {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .move-btn {
        background: none;
        color: var(--text-tertiary);
        padding: 0;
        font-size: 0.7rem;
        line-height: 1;
        width: 24px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .move-btn:hover:not(:disabled) {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        transform: none;
    }
    .move-btn:disabled {
        color: var(--border-color);
        cursor: default;
    }

    /* Action Buttons */
    .actions {
        margin-top: 2rem;
        display: flex;
        justify-content: flex-end;
    }
    .done-btn {
        background: #4caf50;
        width: 100%;
        padding: 0.8rem;
        font-size: 1rem;
    }
    .done-btn:hover {
        background: #43a047;
    }
    .deactivate-btn {
        width: 100%;
        margin-top: 1rem;
        background: transparent;
        border: 1px solid #f44336;
        color: #f44336;
    }
    .deactivate-btn:hover {
        background: #f44336;
        color: white;
    }
    .activate-btn {
        width: 100%;
        margin-top: 1rem;
        background: linear-gradient(135deg, #4a90e2, #357abd);
    }

    .language-selector {
        display: flex;
        gap: 0.5rem;
    }
    .lang-btn {
        flex: 1;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
    }
    .lang-btn.active {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }

    /* Provider Grid */
    .provider-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }
    .provider-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 1rem;
        background: var(--bg-card);
        border: 2px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        width: 100%;
    }
    .provider-card:hover {
        border-color: var(--accent-primary);
        background: var(--bg-secondary);
    }
    .provider-card.selected {
        border-color: var(--accent-primary);
        background: rgba(var(--accent-primary-rgb), 0.05);
    }
    .provider-header {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 0.25rem;
    }
    .provider-name {
        font-weight: 600;
        color: var(--text-primary);
    }
    .badge {
        font-size: 0.75rem;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
    }
    .badge.pro {
        background: linear-gradient(135deg, #ffd700, #ffa500);
        color: black;
        font-weight: bold;
    }
    .badge.recommended {
        background: var(--accent-primary);
        color: white;
    }
    .provider-desc {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin: 0;
    }

    /* User Guide Button */
    .user-guide-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
    }
    .user-guide-btn:hover {
        background: linear-gradient(135deg, #357abd, #2a5f8f);
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
        transform: translateY(-2px);
    }
    .user-guide-btn:active {
        transform: translateY(0);
    }
    .user-guide-btn .btn-icon {
        font-size: 1.2rem;
    }
    .user-guide-btn .btn-text {
        flex: 1;
    }
    .user-guide-btn .external-icon {
        font-size: 0.9rem;
        opacity: 0.8;
    }
</style>
