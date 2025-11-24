<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { sourceService } from "../lib/news/sourceService";
    import { userSubscription } from "../lib/stores/subscription";
    import { theme } from "../lib/stores/theme";
    import { settings } from "../lib/stores/settings";
    import { t, locale, availableLanguages } from "../lib/stores/i18n";
    import UpgradeModal from "../components/UpgradeModal.svelte";
    import LicenseActivation from "../components/LicenseActivation.svelte";

    const dispatch = createEventDispatcher();

    let topics = $state([]);
    let sources = $state({});
    let newTopic = $state("");
    let newSource = $state("");
    let selectedTopic = $state(null);

    // Modal State
    let showUpgradeModal = $state(false);
    let upgradeMessage = $state("");
    let showLicenseActivation = $state(false);

    onMount(async () => {
        await userSubscription.init();
        await settings.init();
        await loadData();
    });

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

    function selectTopic(topic) {
        selectedTopic = topic;
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
</script>

<div class="settings-container">
    <UpgradeModal
        show={showUpgradeModal}
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
                    {$theme === "light"
                        ? "☀️ " + $t("light")
                        : "🌙 " + $t("dark")}
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
            <div class="input-group">
                <input
                    type="text"
                    bind:value={newTopic}
                    placeholder={$userSubscription.isPro || topics.length < 3
                        ? $t("add") + " topic..."
                        : "Limit reached"}
                    disabled={!$userSubscription.isPro && topics.length >= 3}
                />
                <button
                    onclick={addTopic}
                    disabled={!$userSubscription.isPro && topics.length >= 3}
                    >{$t("add")}</button
                >
            </div>
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
                            onclick={() => selectTopic(topic)}>{topic}</button
                        >
                        <button
                            class="delete-btn"
                            onclick={() => removeTopic(topic)}>×</button
                        >
                    </li>
                {/each}
            </ul>
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
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .delete-btn:hover {
        background: rgba(244, 67, 54, 0.1);
        color: #f44336;
        transform: none;
    }

    /* Preferences Rows */
    .pref-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem 0;
        border-bottom: 1px solid var(--border-color);
    }
    .pref-row:last-child {
        border-bottom: none;
    }
    .pref-row span {
        font-weight: 500;
        color: var(--text-primary);
    }

    /* Modern Toggle Switch */
    .toggle-switch {
        width: 44px;
        height: 24px;
        border-radius: 12px;
        position: relative;
        background: var(--bg-tertiary);
        transition: background 0.3s ease;
        padding: 0;
        overflow: visible;
        border: 1px solid var(--border-color);
    }
    .toggle-switch::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
    .toggle-switch.active {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
    }
    .toggle-switch.active::after {
        transform: translateX(20px);
    }
    .toggle-switch:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* License Info */
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
</style>
