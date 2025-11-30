<script>
    export let width = "160";
    export let height = "32";
</script>

<svg
    {width}
    {height}
    viewBox="0 0 160 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="NewsLens AI"
>
    <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="100%" y2="0">
            <stop offset="0%" stop-color="#3b82f6" />
            <stop offset="50%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
    </defs>

    <text
        x="0"
        y="24"
        font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-weight="800"
        font-size="22"
        letter-spacing="-0.5"
        fill="url(#logo-gradient)"
    >
        NewsLens <tspan font-weight="400" fill="currentColor" opacity="0.9"
            >AI</tspan
        >
    </text>
</svg>

<style>
    svg {
        display: block;
        user-select: none;
    }
</style>
