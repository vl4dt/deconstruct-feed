<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { sourceService } from "../lib/news/sourceService";
    import { userSubscription } from "../lib/stores/subscription";
    import { theme } from "../lib/stores/theme";
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
        <h2>{selectedTopic ? selectedTopic : "Settings"}</h2>
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
                    placeholder="Add RSS URL"
                />
                <button onclick={addSource}>Add</button>
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
                    <li class="empty">No sources yet.</li>
                {/if}
            </ul>
        </div>
    {:else}
        <div class="section">
            <div class="theme-toggle">
                <h3>Theme</h3>
                <button class="toggle-btn" onclick={theme.toggle}>
                    {$theme === "light" ? "☀️ Light" : "🌙 Dark"}
                </button>
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
                    <p>Free Tier: {topics.length} / 3 Topics</p>
                    <button
                        class="upgrade-btn"
                        onclick={() => userSubscription.upgrade()}
                        >Upgrade to Pro</button
                    >
                </div>
            {/if}

            <h3>Topics</h3>
            <div class="input-group">
                <input
                    type="text"
                    bind:value={newTopic}
                    placeholder={$userSubscription.isPro || topics.length < 3
                        ? "New topic..."
                        : "Limit reached"}
                    disabled={!$userSubscription.isPro && topics.length >= 3}
                />
                <button
                    onclick={addTopic}
                    disabled={!$userSubscription.isPro && topics.length >= 3}
                    >Add</button
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
        padding: 1rem;
        background: var(--bg-primary);
        height: 100%;
        box-sizing: border-box;
        color: var(--text-primary);
    }
    header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
    }
    h2 {
        margin: 0;
        font-size: 1.2rem;
        flex: 1;
        color: var(--text-primary);
    }
    h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: var(--text-secondary);
    }
    .back-btn {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        color: var(--text-secondary);
    }
    .back-btn:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
    .input-group {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 0.9rem;
        background: var(--bg-card);
        color: var(--text-primary);
    }
    input:focus {
        outline: none;
        border-color: var(--accent-primary);
    }
    button {
        padding: 0.5rem 1rem;
        background: var(--accent-primary);
        color: var(--text-inverse);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    }
    button:hover {
        background: var(--accent-hover);
    }
    .list {
        list-style: none;
        padding: 0;
        margin: 0;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
    }
    li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-card);
        gap: 0.5rem;
    }
    li:last-child {
        border-bottom: none;
    }
    li.empty {
        color: var(--text-tertiary);
        justify-content: center;
        font-style: italic;
    }
    .item-btn {
        background: none;
        color: var(--text-primary);
        text-align: left;
        padding: 0;
        font-weight: 500;
        flex: 1;
    }
    .item-btn:hover {
        background: none;
        color: var(--accent-primary);
    }
    .delete-btn {
        background: none;
        color: var(--text-tertiary);
        padding: 0 0.5rem;
        font-size: 1.4rem;
        line-height: 1;
    }
    .delete-btn:hover {
        background: none;
        color: #f44336;
    }
    .url {
        font-size: 0.8rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 220px;
        display: block;
    }
    .actions {
        margin-top: 1.5rem;
        display: flex;
        justify-content: flex-end;
    }
    .done-btn {
        background: #4caf50;
        width: 100%;
    }
    .done-btn:hover {
        background: #43a047;
    }
    .topic-controls {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .move-btn {
        background: none;
        color: var(--text-tertiary);
        padding: 0;
        font-size: 0.8rem;
        line-height: 1;
        width: 20px;
        height: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .move-btn:hover:not(:disabled) {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
    .move-btn:disabled {
        color: var(--border-color);
        cursor: default;
    }
    .theme-toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    .theme-toggle h3 {
        margin: 0;
    }
    .toggle-btn {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }
    .toggle-btn:hover {
        background: var(--bg-secondary);
        border-color: var(--accent-primary);
    }
    .pro-badge {
        font-size: 0.7rem;
        padding: 0.2rem 0.5rem;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        color: var(--text-secondary);
        cursor: pointer;
        font-weight: 700;
    }
    .pro-badge.is-pro {
        background: linear-gradient(135deg, #ffd700, #ffa500);
        color: #000;
        border: none;
    }
    .upgrade-banner {
        background: var(--bg-tertiary);
        border: 1px solid var(--accent-primary);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        text-align: center;
    }
    .upgrade-banner p {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: var(--text-primary);
    }
    .upgrade-btn {
        background: linear-gradient(135deg, #4a90e2, #357abd);
        width: 100%;
    }
    .upgrade-btn:hover {
        opacity: 0.9;
    }
    input:disabled,
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* License Management Section */
    .license-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .license-info {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border-color);
    }

    .info-row:last-of-type {
        border-bottom: none;
    }

    .info-row .label {
        font-weight: 600;
        color: var(--text-secondary);
    }

    .info-row .value {
        color: var(--text-primary);
    }

    .info-row .value.pro {
        color: #4caf50;
        font-weight: 600;
    }

    .info-row .value.free {
        color: var(--text-tertiary);
    }

    .error-notice {
        background: #fff3cd;
        color: #856404;
        padding: 0.75rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-top: 0.75rem;
    }

    .activate-btn {
        width: 100%;
        margin-top: 1rem;
        background: linear-gradient(135deg, #4a90e2, #357abd);
    }

    .activate-btn:hover {
        opacity: 0.9;
    }

    .deactivate-btn {
        width: 100%;
        margin-top: 1rem;
        background: #f44336;
        color: white;
    }

    .deactivate-btn:hover {
        background: #d32f2f;
    }
</style>
