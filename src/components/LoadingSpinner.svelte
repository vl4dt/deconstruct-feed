<script>
    export let size = "40px";
    export let color = "var(--accent-primary)";
    export let text = "";
</script>

<div class="spinner-container">
    <div
        class="spinner"
        style:width={size}
        style:height={size}
        style:border-top-color={color}
    ></div>
    {#if text}
        <p class="spinner-text">{text}</p>
    {/if}
</div>

<style>
    .spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem;
    }

    .spinner {
        border: 3px solid var(--bg-tertiary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .spinner-text {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin: 0;
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
    }
</style>
