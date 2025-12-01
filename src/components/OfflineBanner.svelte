<script>
    import { onlineStatus } from "../lib/offlineDetector.js";
</script>

{#if !$onlineStatus}
    <div class="offline-banner">
        <span class="offline-icon">📡</span>
        <span class="offline-text">Offline Mode - Showing cached content</span>
    </div>
{/if}

<style>
    .offline-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
        color: white;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 500;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        animation: slideIn 0.3s ease-out;
    }

    .offline-icon {
        font-size: 16px;
        animation: pulse 2s ease-in-out infinite;
    }

    .offline-text {
        letter-spacing: 0.3px;
    }

    @keyframes slideIn {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.7;
            transform: scale(1.1);
        }
    }

    /* Dark mode support */
    :global([data-theme="dark"]) .offline-banner {
        background: linear-gradient(135deg, #f57c00 0%, #e64a19 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
</style>
