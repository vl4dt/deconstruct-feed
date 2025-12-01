<script>
    import { marked } from "marked";

    let { content = "" } = $props();

    // Configure marked for better output
    marked.setOptions({
        breaks: true,
        gfm: true,
    });

    // Parse markdown to HTML using Svelte 5 runes
    let html = $derived.by(() => {
        let processedContent = content || "";

        // Strip ALL code fence markers (AI sometimes has multiple fences that create unwanted code blocks)
        // Remove ```markdown or ``` from anywhere in the content
        processedContent = processedContent.replace(/```markdown\s*/gi, "");
        processedContent = processedContent.replace(/```\s*/g, "");

        // Normalize indentation to prevent unintended code blocks
        // AI sometimes indents entire paragraphs which markdown treats as code blocks (4+ spaces)
        const lines = processedContent.split("\n");
        const minIndent = lines
            .filter((line) => line.trim().length > 0) // Ignore empty lines
            .map((line) => line.match(/^(\s*)/)[1].length) // Get leading whitespace
            .reduce((min, indent) => Math.min(min, indent), Infinity);

        // If there's consistent indentation, remove it
        if (minIndent > 0 && minIndent !== Infinity) {
            processedContent = lines
                .map((line) => line.substring(minIndent))
                .join("\n");
        }

        const parsed = marked.parse(processedContent);

        return parsed;
    });
</script>

<div class="markdown-content">
    {@html html}
</div>

<style>
    :global(.markdown-content h1) {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 1rem 0 0.5rem 0;
        color: var(--text-primary);
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 0.25rem;
    }

    :global(.markdown-content h2) {
        font-size: 1.3rem;
        font-weight: 700;
        margin: 0.875rem 0 0.5rem 0;
        color: var(--text-primary);
    }

    :global(.markdown-content h3) {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0.75rem 0 0.5rem 0;
        color: var(--text-primary);
    }

    :global(.markdown-content h4),
    :global(.markdown-content h5),
    :global(.markdown-content h6) {
        font-size: 1rem;
        font-weight: 600;
        margin: 0.5rem 0 0.25rem 0;
        color: var(--text-secondary);
    }

    :global(.markdown-content p) {
        margin: 0.5rem 0;
        line-height: 1.6;
        color: var(--text-primary);
    }

    :global(.markdown-content ul),
    :global(.markdown-content ol) {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
        color: var(--text-primary);
    }

    :global(.markdown-content li) {
        margin: 0.25rem 0;
        line-height: 1.5;
    }

    :global(.markdown-content code) {
        background: var(--bg-tertiary);
        padding: 0.125rem 0.25rem;
        border-radius: 3px;
        font-family: "Consolas", "Monaco", "Courier New", monospace;
        font-size: 0.875em;
        color: var(--accent-primary);
    }

    :global(.markdown-content pre) {
        background: var(--bg-tertiary);
        padding: 0.75rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 0.5rem 0;
        border: 1px solid var(--border-color);
    }

    :global(.markdown-content pre code) {
        background: none;
        padding: 0;
        color: var(--text-primary);
    }

    :global(.markdown-content strong) {
        font-weight: 700;
        color: var(--text-primary);
    }

    :global(.markdown-content em) {
        font-style: italic;
    }

    :global(.markdown-content a) {
        color: var(--accent-primary);
        text-decoration: none;
        border-bottom: 1px dotted var(--accent-primary);
    }

    :global(.markdown-content a:hover) {
        border-bottom-style: solid;
    }

    :global(.markdown-content blockquote) {
        border-left: 3px solid var(--accent-primary);
        padding-left: 1rem;
        margin: 0.5rem 0;
        color: var(--text-secondary);
        font-style: italic;
    }

    :global(.markdown-content table) {
        border-collapse: collapse;
        width: 100%;
        margin: 0.5rem 0;
    }

    :global(.markdown-content th),
    :global(.markdown-content td) {
        border: 1px solid var(--border-color);
        padding: 0.5rem;
        text-align: left;
    }

    :global(.markdown-content th) {
        background: var(--bg-tertiary);
        font-weight: 600;
    }

    :global(.markdown-content hr) {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 1rem 0;
    }
</style>
