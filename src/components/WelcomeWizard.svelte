<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { t } from "../lib/stores/i18n";
    import { sourceService } from "../lib/news/sourceService";
    import { settings, onboardingHelpers } from "../lib/stores/settings";
    import { isChromeAIAvailable } from "../lib/ai/aiService";

    const dispatch = createEventDispatcher();

    let currentStep = 0;
    let selectedTopics = [];
    let customTopic = "";
    let selectedAIProvider = "chrome";
    let chromeAIAvailable = true;
    let apiKey = "";

    const popularTopics = [
        "Technology",
        "Science",
        "Business",
        "Health",
        "Sports",
        "Politics",
        "Entertainment",
        "World News",
    ];

    onMount(async () => {
        chromeAIAvailable = await isChromeAIAvailable();
        if (!chromeAIAvailable) {
            selectedAIProvider = "gemini";
        }
    });

    function toggleTopic(topic) {
        if (selectedTopics.includes(topic)) {
            selectedTopics = selectedTopics.filter((t) => t !== topic);
        } else {
            if (selectedTopics.length < 5) {
                selectedTopics = [...selectedTopics, topic];
            }
        }
    }

    function addCustomTopic() {
        if (customTopic && !selectedTopics.includes(customTopic)) {
            if (selectedTopics.length < 5) {
                selectedTopics = [...selectedTopics, customTopic];
                customTopic = "";
            }
        }
    }

    function handleKeyPress(e) {
        if (e.key === "Enter") {
            addCustomTopic();
        }
    }

    async function nextStep() {
        if (currentStep === 0 && selectedTopics.length === 0) {
            alert(
                $t("onboarding.selectAtLeastOneTopic") ||
                    "Please select at least one topic",
            );
            return;
        }

        if (currentStep < 2) {
            currentStep++;
        } else {
            await completeWizard();
        }
    }

    function prevStep() {
        if (currentStep > 0) {
            currentStep--;
        }
    }

    async function completeWizard() {
        // Add topics
        for (const topic of selectedTopics) {
            await sourceService.addTopic(topic);
        }

        // Configure AI
        if (selectedAIProvider !== "chrome") {
            await settings.set("aiProvider", selectedAIProvider);
            if (apiKey) {
                await settings.set(`${selectedAIProvider}Key`, apiKey);
            }
        }

        // Mark onboarding complete
        await onboardingHelpers.completeOnboarding();
        await onboardingHelpers.updateChecklistProgress("addedTopic", true);
        await onboardingHelpers.updateChecklistProgress("configuredAI", true);

        dispatch("complete");
    }

    async function skipWizard() {
        await onboardingHelpers.skipOnboarding();
        dispatch("skip");
    }

    function getProviderName(provider) {
        const names = {
            chrome: "Chrome AI",
            gemini: "Google Gemini",
            openai: "OpenAI",
            anthropic: "Anthropic Claude",
            local: "Local LLM",
        };
        return names[provider] || provider;
    }
</script>

<div class="wizard-overlay" on:click|self={skipWizard}>
    <div class="wizard-container">
        <div class="wizard-header">
            <h1>{$t("onboarding.welcome")}</h1>
            <p>{$t("onboarding.tagline")}</p>
        </div>

        <div class="progress-bar">
            <div
                class="progress"
                style="width: {((currentStep + 1) / 3) * 100}%"
            ></div>
        </div>

        {#if currentStep === 0}
            <!-- Step 1: Topics -->
            <div class="wizard-step">
                <h2>{$t("onboarding.step1Title")}</h2>
                <p>{$t("onboarding.step1Description")}</p>

                <div class="topic-grid">
                    {#each popularTopics as topic}
                        <button
                            class="topic-chip"
                            class:selected={selectedTopics.includes(topic)}
                            on:click={() => toggleTopic(topic)}
                        >
                            {topic}
                        </button>
                    {/each}
                </div>

                <div class="custom-topic">
                    <input
                        type="text"
                        placeholder={$t("onboarding.addCustomTopic")}
                        bind:value={customTopic}
                        on:keypress={handleKeyPress}
                    />
                    <button on:click={addCustomTopic}>{$t("add")}</button>
                </div>

                {#if selectedTopics.length > 0}
                    <div class="selected-topics">
                        <strong
                            >{$t("selected")} ({selectedTopics.length}/5):</strong
                        >
                        {#each selectedTopics as topic}
                            <span class="selected-chip">
                                {topic}
                                <button
                                    class="remove-chip"
                                    on:click={() => toggleTopic(topic)}
                                    >×</button
                                >
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else if currentStep === 1}
            <!-- Step 2: AI Provider -->
            <div class="wizard-step">
                <h2>{$t("onboarding.step2Title")}</h2>
                <p>{$t("onboarding.step2Description")}</p>

                <div class="ai-options">
                    {#if chromeAIAvailable}
                        <label class="ai-option recommended">
                            <input
                                type="radio"
                                bind:group={selectedAIProvider}
                                value="chrome"
                            />
                            <div class="option-content">
                                <div class="option-header">
                                    <strong>Chrome AI</strong>
                                    <span class="badge"
                                        >{$t("onboarding.recommended")}</span
                                    >
                                </div>
                                <p>
                                    ✓ Free &nbsp; ✓ Fast &nbsp; ✓ Private
                                    (On-device)
                                </p>
                                <small>No setup required</small>
                            </div>
                        </label>
                    {/if}

                    <label class="ai-option">
                        <input
                            type="radio"
                            bind:group={selectedAIProvider}
                            value="gemini"
                        />
                        <div class="option-content">
                            <strong>Google Gemini</strong>
                            <p>Powerful & Affordable</p>
                            <small>Requires API key</small>
                        </div>
                    </label>

                    <details>
                        <summary>More options...</summary>
                        <label class="ai-option">
                            <input
                                type="radio"
                                bind:group={selectedAIProvider}
                                value="openai"
                            />
                            <div class="option-content">
                                <strong>OpenAI</strong>
                                <small>Requires API key</small>
                            </div>
                        </label>

                        <label class="ai-option">
                            <input
                                type="radio"
                                bind:group={selectedAIProvider}
                                value="anthropic"
                            />
                            <div class="option-content">
                                <strong>Anthropic Claude</strong>
                                <small>Requires API key</small>
                            </div>
                        </label>

                        <label class="ai-option">
                            <input
                                type="radio"
                                bind:group={selectedAIProvider}
                                value="local"
                            />
                            <div class="option-content">
                                <strong>Local LLM</strong>
                                <small>Ollama or LM Studio</small>
                            </div>
                        </label>
                    </details>
                </div>

                {#if selectedAIProvider !== "chrome"}
                    <div class="api-key-input">
                        <label>
                            API Key (optional - you can add this later in
                            Settings):
                            <input
                                type="password"
                                placeholder="Enter your API key..."
                                bind:value={apiKey}
                            />
                        </label>
                        <a
                            href={selectedAIProvider === "gemini"
                                ? "https://makersuite.google.com/app/apikey"
                                : selectedAIProvider === "openai"
                                  ? "https://platform.openai.com/api-keys"
                                  : "https://console.anthropic.com"}
                            target="_blank"
                            class="get-key-link"
                        >
                            Get API Key →
                        </a>
                    </div>
                {/if}
            </div>
        {:else if currentStep === 2}
            <!-- Step 3: Ready -->
            <div class="wizard-step">
                <div class="success-icon">🎉</div>
                <h2>{$t("onboarding.step3Title")}</h2>
                <p>{$t("onboarding.step3Description")}</p>

                <div class="summary-box">
                    <h3>{$t("onboarding.yourSetup")}</h3>
                    <ul>
                        <li>
                            <strong>{$t("onboarding.topicsLabel")}:</strong>
                            {selectedTopics.join(", ")}
                        </li>
                        <li>
                            <strong>{$t("onboarding.aiProviderLabel")}:</strong>
                            {getProviderName(selectedAIProvider)}
                        </li>
                    </ul>
                </div>

                <div class="quick-tips">
                    <h3>{$t("onboarding.quickTips")}</h3>
                    <ul>
                        <li>📰 Click any article to see details</li>
                        <li>✨ Use "Summarize" for quick AI summaries</li>
                        <li>🌐 Translate articles with the globe icon</li>
                        <li>📑 Bookmark articles to save for later</li>
                    </ul>
                </div>
            </div>
        {/if}

        <div class="wizard-actions">
            <button class="btn-secondary" on:click={skipWizard}>
                {$t("onboarding.skip")}
            </button>

            <div class="right-actions">
                {#if currentStep > 0}
                    <button class="btn-secondary" on:click={prevStep}>
                        ← {$t("back")}
                    </button>
                {/if}

                <button class="btn-primary" on:click={nextStep}>
                    {currentStep === 2
                        ? $t("onboarding.startReading")
                        : $t("onboarding.next") + " →"}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .wizard-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
        animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .wizard-container {
        background: var(--bg-primary);
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s ease;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .wizard-header {
        text-align: center;
        padding: 2rem 2rem 1rem;
        border-bottom: 1px solid var(--border-color);
    }

    .wizard-header h1 {
        font-size: 1.8rem;
        margin: 0 0 0.5rem;
        color: var(--text-primary);
    }

    .wizard-header p {
        color: var(--text-secondary);
        margin: 0;
    }

    .progress-bar {
        height: 4px;
        background: var(--border-color);
    }

    .progress {
        height: 100%;
        background: var(--accent-primary);
        transition: width 0.3s ease;
    }

    .wizard-step {
        padding: 2rem;
        min-height: 300px;
    }

    .wizard-step h2 {
        margin: 0 0 0.5rem;
        font-size: 1.4rem;
        color: var(--text-primary);
    }

    .wizard-step > p {
        color: var(--text-secondary);
        margin: 0 0 1.5rem;
    }

    .topic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .topic-chip {
        padding: 0.75rem;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-card);
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
        color: var(--text-primary);
    }

    .topic-chip:hover {
        border-color: var(--accent-primary);
        transform: translateY(-2px);
    }

    .topic-chip.selected {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }

    .custom-topic {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .custom-topic input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-card);
        color: var(--text-primary);
    }

    .custom-topic button {
        padding: 0.75rem 1.5rem;
        background: var(--accent-primary);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
    }

    .selected-topics {
        padding: 1rem;
        background: var(--bg-card);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .selected-topics strong {
        display: block;
        margin-bottom: 0.75rem;
        color: var(--text-primary);
    }

    .selected-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.8rem;
        background: var(--accent-primary);
        color: white;
        border-radius: 20px;
        margin: 0.25rem;
        font-size: 0.9rem;
    }

    .remove-chip {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }

    .ai-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .ai-option {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .ai-option:hover {
        border-color: var(--accent-primary);
        background: var(--bg-card);
    }

    .ai-option:has(input:checked) {
        border-color: var(--accent-primary);
        background: rgba(var(--accent-primary-rgb, 59, 130, 246), 0.05);
    }

    .ai-option.recommended {
        border-color: var(--accent-primary);
        background: rgba(var(--accent-primary-rgb, 59, 130, 246), 0.05);
    }

    .ai-option input[type="radio"] {
        margin-top: 0.25rem;
    }

    .option-content {
        flex: 1;
    }

    .option-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
    }

    .badge {
        padding: 0.2rem 0.5rem;
        background: var(--accent-primary);
        color: white;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .option-content p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }

    .option-content small {
        color: var(--text-tertiary);
    }

    details {
        margin-top: 0.5rem;
    }

    details summary {
        cursor: pointer;
        color: var(--accent-primary);
        font-size: 0.9rem;
        padding: 0.5rem;
    }

    details[open] summary {
        margin-bottom: 0.75rem;
    }

    .api-key-input {
        margin-top: 1.5rem;
        padding: 1rem;
        background: var(--bg-card);
        border-radius: 8px;
    }

    .api-key-input label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .api-key-input input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-primary);
        color: var(--text-primary);
        margin-top: 0.5rem;
    }

    .get-key-link {
        display: inline-block;
        margin-top: 0.5rem;
        color: var(--accent-primary);
        text-decoration: none;
        font-size: 0.9rem;
    }

    .get-key-link:hover {
        text-decoration: underline;
    }

    .success-icon {
        font-size: 4rem;
        text-align: center;
        margin-bottom: 1rem;
        animation: bounce 0.6s ease;
    }

    @keyframes bounce {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-20px);
        }
    }

    .summary-box,
    .quick-tips {
        background: var(--bg-card);
        padding: 1.25rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid var(--border-color);
    }

    .summary-box h3,
    .quick-tips h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        color: var(--text-primary);
    }

    .summary-box ul,
    .quick-tips ul {
        margin: 0;
        padding-left: 1.5rem;
        color: var(--text-secondary);
    }

    .summary-box li,
    .quick-tips li {
        margin-bottom: 0.5rem;
    }

    .wizard-actions {
        display: flex;
        justify-content: space-between;
        padding: 1.5rem 2rem;
        border-top: 1px solid var(--border-color);
    }

    .right-actions {
        display: flex;
        gap: 0.75rem;
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-primary {
        background: var(--accent-primary);
        color: white;
        border: none;
    }

    .btn-primary:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
    }

    .btn-secondary {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
    }

    .btn-secondary:hover {
        background: var(--bg-card);
        border-color: var(--accent-primary);
    }
</style>
