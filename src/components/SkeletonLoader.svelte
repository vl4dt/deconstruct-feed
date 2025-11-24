<script>
    export let lines = 3;
    export let height = "1em";
    export let width = "100%";
    export let style = "";
</script>

<div class="skeleton-container" {style}>
    {#each Array(lines) as _, i}
        <div
            class="skeleton-line"
            style:height
            style:width={i === lines - 1 && lines > 1 ? "70%" : width}
        ></div>
    {/each}
</div>

<style>
    .skeleton-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .skeleton-line {
        background: var(--bg-tertiary);
        border-radius: 4px;
        position: relative;
        overflow: hidden;
    }

    .skeleton-line::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.05) 20%,
            rgba(255, 255, 255, 0.1) 60%,
            rgba(255, 255, 255, 0)
        );
        animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
        100% {
            transform: translateX(100%);
        }
    }
</style>
