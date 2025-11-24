<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { sourceService } from "../lib/news/sourceService";
    import { theme } from "../lib/stores/theme";

    const dispatch = createEventDispatcher();

    let topics = $state([]);
    let sources = $state({});
    let newTopic = $state("");
    let newSource = $state("");
    let selectedTopic = $state(null);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        topics = await sourceService.getTopics();
        sources = await sourceService.getAllSources();
    }

    async function addTopic() {
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
</script>

<div class="settings-container">
    <header>
        <button class="back-btn" onclick={goBack}>&larr;</button>
        <h2>{selectedTopic ? selectedTopic : "Settings"}</h2>
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
            <h3>Topics</h3>
            <div class="input-group">
                <input
                    type="text"
                    bind:value={newTopic}
                    placeholder="New topic..."
                />
                <button onclick={addTopic}>Add</button>
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
</style>
