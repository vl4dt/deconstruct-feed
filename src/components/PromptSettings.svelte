<script>
    import { settings } from "../lib/stores/settings";

    let expandedPrompts = $state(new Set());

    const promptTypes = [
        {
            id: "summarize",
            label: "Summarize",
            desc: "Article summarization prompts",
            vars: "{content}",
        },
        {
            id: "script",
            label: "Video Script",
            desc: "YouTube script generation prompts",
            vars: "{articles}",
        },
        {
            id: "podcast",
            label: "Podcast Script",
            desc: "Podcast script generation prompts",
            vars: "{articles}",
        },
        {
            id: "deepDive",
            label: "Deep Dive",
            desc: "Multi-article analysis prompts",
            vars: "{articles}",
        },
        {
            id: "bias",
            label: "Bias Check",
            desc: "Bias detection prompts",
            vars: "{content}",
        },
    ];

    function togglePrompt(type) {
        if (expandedPrompts.has(type)) {
            expandedPrompts.delete(type);
        } else {
            expandedPrompts.add(type);
        }
        expandedPrompts = new Set(expandedPrompts);
    }

    async function handleInput(type, field, event) {
        await settings.setPrompt(type, field, event.target.value);
    }

    async function resetPrompt(type) {
        if (
            confirm(
                `Reset "${promptTypes.find((p) => p.id === type)?.label}" prompts to default?`,
            )
        ) {
            await settings.resetPrompt(type);
        }
    }

    async function resetAll() {
        if (confirm("Reset ALL prompts to defaults? This cannot be undone.")) {
            await settings.resetAllPrompts();
        }
    }
</script>

<div class="prompt-settings">
    <div class="info-banner">
        <span class="info-icon">💡</span>
        <p>
            Customize AI prompts to match your preferred style and tone. Use <code
                >{"{content}"}</code
            >
            or <code>{"{articles}"}</code> as placeholders.
        </p>
    </div>

    {#each promptTypes as promptType}
        <div class="prompt-section">
            <button
                class="prompt-header"
                onclick={() => togglePrompt(promptType.id)}
            >
                <span class="prompt-title">
                    {promptType.label}
                    <span class="prompt-desc">{promptType.desc}</span>
                </span>
                <span class="expand-icon"
                    >{expandedPrompts.has(promptType.id) ? "▼" : "▶"}</span
                >
            </button>

            {#if expandedPrompts.has(promptType.id)}
                <div class="prompt-content">
                    <div class="prompt-field">
                        <label>System Prompt</label>
                        <textarea
                            value={$settings.customPrompts[promptType.id]
                                ?.system || ""}
                            oninput={(e) =>
                                handleInput(promptType.id, "system", e)}
                            rows="3"
                            placeholder="Defines the AI's role and behavior..."
                        ></textarea>
                    </div>

                    <div class="prompt-field">
                        <label
                            >User Prompt Template <span class="var-hint"
                                >Use: {promptType.vars}</span
                            ></label
                        >
                        <textarea
                            value={$settings.customPrompts[promptType.id]
                                ?.user || ""}
                            oninput={(e) =>
                                handleInput(promptType.id, "user", e)}
                            rows="4"
                            placeholder="The instruction template..."
                        ></textarea>
                    </div>

                    <button
                        class="reset-btn"
                        onclick={() => resetPrompt(promptType.id)}
                    >
                        Reset to Default
                    </button>
                </div>
            {/if}
        </div>
    {/each}

    <button class="reset-all-btn" onclick={resetAll}>
        Reset All Prompts to Defaults
    </button>
</div>

<style>
    .prompt-settings {
        padding: 1rem 0;
    }

    .info-banner {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
    }

    .info-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .info-banner p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.5;
    }

    .info-banner code {
        background: var(--bg-primary);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-size: 0.85rem;
        color: var(--accent-primary);
    }

    .prompt-section {
        margin-bottom: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-card);
    }

    .prompt-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background 0.2s;
    }

    .prompt-header:hover {
        background: var(--bg-tertiary);
    }

    .prompt-title {
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .prompt-desc {
        font-size: 0.85rem;
        font-weight: 400;
        color: var(--text-tertiary);
    }

    .expand-icon {
        color: var(--text-tertiary);
        font-size: 0.9rem;
    }

    .prompt-content {
        padding: 1rem;
        border-top: 1px solid var(--border-color);
        background: var(--bg-primary);
    }

    .prompt-field {
        margin-bottom: 1rem;
    }

    .prompt-field label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-secondary);
    }

    .var-hint {
        font-size: 0.8rem;
        color: var(--text-tertiary);
        font-weight: 400;
        font-style: italic;
    }

    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: "Consolas", "Monaco", monospace;
        background: var(--bg-secondary);
        color: var(--text-primary);
        resize: vertical;
        min-height: 60px;
    }

    textarea:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
    }

    .reset-btn {
        padding: 0.5rem 1rem;
        background: none;
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
    }

    .reset-btn:hover {
        background: var(--bg-secondary);
        border-color: var(--accent-primary);
        color: var(--accent-primary);
        transform: none;
    }

    .reset-all-btn {
        width: 100%;
        padding: 0.75rem;
        background: var(--bg-secondary);
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        margin-top: 1rem;
        transition: all 0.2s;
    }

    .reset-all-btn:hover {
        background: #fee;
        border-color: #f44;
        color: #f44;
        transform: none;
    }
</style>
