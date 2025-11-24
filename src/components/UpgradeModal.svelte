<script>
    import { createEventDispatcher } from "svelte";
    import { t } from "../lib/stores/i18n";

    let {
        show = false,
        message = "Unlock premium features to supercharge your news curation",
    } = $props();

    const dispatch = createEventDispatcher();

    // Paddle configuration
    const PADDING_VENDOR_ID = "YOUR_VENDOR_ID";
    const PRICING = {
        monthly: {
            price: "$4.99",
            priceId: "pri_xxx_monthly",
            period: "/month",
            description: "Perfect for trying out Pro features",
        },
        annual: {
            price: "$49.00",
            priceId: "pri_xxx_annual",
            period: "/year",
            save: "Save 17%",
            description: "Best value for power users",
        },
        lifetime: {
            price: "$79.00",
            priceId: "pri_xxx_lifetime",
            period: "one-time",
            description: "Pay once, use forever",
        },
    };

    const PRO_FEATURES = [
        {
            icon: "🚀",
            title: "Unlimited Topics",
            desc: "Track as many topics as you want",
        },
        {
            icon: "🤖",
            title: "Advanced AI (Gemini)",
            desc: "Premium AI model for better insights",
        },
        {
            icon: "✨",
            title: "Unlimited Analyses",
            desc: "No limits on summaries & scripts",
        },
        {
            icon: "🔥",
            title: "Trending Topics",
            desc: "Stay ahead with trending news",
        },
        {
            icon: "🎬",
            title: "Video Scripts",
            desc: "Generate scripts for your content",
        },
        {
            icon: "🧠",
            title: "Deep Dive Analysis",
            desc: "In-depth AI-powered research",
        },
    ];

    let selectedTier = $state("annual");

    function close() {
        dispatch("close");
    }

    function openCheckout() {
        const tier = PRICING[selectedTier];
        const checkoutUrl = `https://buy.paddle.com/product/${tier.priceId}`;
        chrome.tabs.create({ url: checkoutUrl });
        dispatch("checkout-opened");
        close();
    }

    function showLicenseActivation() {
        dispatch("show-activation");
        close();
    }
</script>

{#if show}
    <div
        class="modal-backdrop"
        onclick={close}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === "Escape" && close()}
    >
        <div
            class="modal-content"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            tabindex="-1"
        >
            <div class="modal-header">
                <div class="header-content">
                    <div class="sparkle">✨</div>
                    <div>
                        <h3>{$t("upgradeToPro")}</h3>
                        <p class="header-subtitle">
                            Unlock the full power of AI-driven news curation
                        </p>
                    </div>
                </div>
                <button class="close-btn" onclick={close}>&times;</button>
            </div>

            <div class="modal-body">
                <div class="pricing-cards">
                    <label
                        class="pricing-card"
                        class:selected={selectedTier === "monthly"}
                    >
                        <input
                            type="radio"
                            name="tier"
                            value="monthly"
                            bind:group={selectedTier}
                        />
                        <div class="card-content">
                            <div class="card-header">
                                <span class="tier-name">Monthly</span>
                            </div>
                            <div class="price-section">
                                <span class="price"
                                    >{PRICING.monthly.price}</span
                                >
                                <span class="period"
                                    >{PRICING.monthly.period}</span
                                >
                            </div>
                            <p class="tier-description">
                                {PRICING.monthly.description}
                            </p>
                        </div>
                    </label>

                    <label
                        class="pricing-card recommended"
                        class:selected={selectedTier === "annual"}
                    >
                        <input
                            type="radio"
                            name="tier"
                            value="annual"
                            bind:group={selectedTier}
                        />
                        <div class="recommended-badge">BEST VALUE</div>
                        <div class="card-content">
                            <div class="card-header">
                                <span class="tier-name">Annual</span>
                                <span class="savings-badge"
                                    >{PRICING.annual.save}</span
                                >
                            </div>
                            <div class="price-section">
                                <span class="price">{PRICING.annual.price}</span
                                >
                                <span class="period"
                                    >{PRICING.annual.period}</span
                                >
                            </div>
                            <p class="tier-description">
                                {PRICING.annual.description}
                            </p>
                        </div>
                    </label>

                    <label
                        class="pricing-card"
                        class:selected={selectedTier === "lifetime"}
                    >
                        <input
                            type="radio"
                            name="tier"
                            value="lifetime"
                            bind:group={selectedTier}
                        />
                        <div class="card-content">
                            <div class="card-header">
                                <span class="tier-name">Lifetime</span>
                            </div>
                            <div class="price-section">
                                <span class="price"
                                    >{PRICING.lifetime.price}</span
                                >
                                <span class="period"
                                    >{PRICING.lifetime.period}</span
                                >
                            </div>
                            <p class="tier-description">
                                {PRICING.lifetime.description}
                            </p>
                        </div>
                    </label>
                </div>

                <div class="features-section">
                    <h4 class="features-title">Everything included:</h4>
                    <div class="features-grid">
                        {#each PRO_FEATURES as feature}
                            <div class="feature-item">
                                <span class="feature-icon">{feature.icon}</span>
                                <div class="feature-text">
                                    <div class="feature-name">
                                        {feature.title}
                                    </div>
                                    <div class="feature-desc">
                                        {feature.desc}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="upgrade-btn" onclick={openCheckout}>
                    <span class="btn-icon">🚀</span>
                    Continue to Checkout
                </button>
                <button class="license-link" onclick={showLicenseActivation}>
                    Already purchased? Activate license →
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
        animation: fadeIn 0.25s ease;
    }

    .modal-content {
        background: var(--bg-card, #ffffff);
        border-radius: 18px;
        width: 100%;
        max-width: 720px;
        max-height: 640px;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-radius: 18px 18px 0 0;
        position: relative;
    }

    .header-content {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
    }

    .sparkle {
        font-size: 1.75rem;
        animation: sparkle 2s ease-in-out infinite;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        color: white;
    }

    .header-subtitle {
        margin: 0.2rem 0 0 0;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        font-size: 1.4rem;
        cursor: pointer;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .modal-body {
        padding: 1.25rem;
    }

    .pricing-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        margin-bottom: 1.25rem;
    }

    .pricing-card {
        position: relative;
        cursor: pointer;
        border-radius: 12px;
        border: 2px solid var(--border-color, #e0e0e0);
        background: var(--bg-primary, #fff);
        padding: 1rem;
        transition: all 0.2s;
    }

    .pricing-card input[type="radio"] {
        position: absolute;
        opacity: 0;
    }

    .pricing-card:hover {
        border-color: #667eea;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
    }

    .pricing-card.selected {
        border-color: #667eea;
        background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0.05),
            rgba(118, 75, 162, 0.05)
        );
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
    }

    .pricing-card.recommended {
        border-color: #667eea;
    }

    .recommended-badge {
        position: absolute;
        top: -9px;
        right: 10px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    .card-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .tier-name {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-primary, #333);
    }

    .savings-badge {
        background: #4caf50;
        color: white;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        font-size: 0.6rem;
        font-weight: 700;
    }

    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.2rem;
    }

    .price {
        font-size: 1.6rem;
        font-weight: 800;
        color: #667eea;
    }

    .period {
        font-size: 0.75rem;
        color: var(--text-secondary, #666);
    }

    .tier-description {
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-secondary, #666);
        line-height: 1.3;
    }

    .features-section {
        background: var(--bg-tertiary, #f8f9fa);
        padding: 1rem;
        border-radius: 12px;
    }

    .features-title {
        margin: 0 0 0.75rem 0;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary, #666);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
    }

    .feature-item {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }

    .feature-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .feature-text {
        flex: 1;
    }

    .feature-name {
        font-weight: 600;
        color: var(--text-primary, #333);
        font-size: 0.8rem;
        margin-bottom: 0.1rem;
    }

    .feature-desc {
        font-size: 0.7rem;
        color: var(--text-secondary, #666);
        line-height: 1.3;
    }

    .modal-footer {
        padding: 1rem 1.25rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .upgrade-btn {
        width: 100%;
        padding: 0.75rem 1.25rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .upgrade-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .btn-icon {
        font-size: 1rem;
    }

    .license-link {
        background: none;
        border: none;
        color: #667eea;
        font-size: 0.8rem;
        cursor: pointer;
        padding: 0.4rem;
        font-weight: 500;
    }

    .license-link:hover {
        opacity: 0.8;
        text-decoration: underline;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateY(15px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes sparkle {
        0%,
        100% {
            transform: scale(1) rotate(0deg);
        }
        50% {
            transform: scale(1.1) rotate(10deg);
        }
    }

    .modal-content::-webkit-scrollbar {
        width: 5px;
    }

    .modal-content::-webkit-scrollbar-thumb {
        background: rgba(102, 126, 234, 0.3);
        border-radius: 3px;
    }
</style>
