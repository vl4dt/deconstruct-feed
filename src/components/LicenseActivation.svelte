<script>
    import { createEventDispatcher } from "svelte";
    import { userSubscription } from "../lib/stores/subscription";

    let { show = false } = $props();

    const dispatch = createEventDispatcher();

    let licenseKey = $state("");
    let isActivating = $state(false);
    let error = $state("");
    let success = $state(false);

    function close() {
        dispatch("close");
        // Reset state
        licenseKey = "";
        error = "";
        success = false;
    }

    async function activateLicense() {
        if (!licenseKey.trim()) {
            error = "Please enter a license key";
            return;
        }

        // Format validation
        const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        if (!pattern.test(licenseKey.trim())) {
            error =
                "Invalid license key format. Should be: XXXX-XXXX-XXXX-XXXX";
            return;
        }

        isActivating = true;
        error = "";

        try {
            const result = await userSubscription.activateLicense(
                licenseKey.trim(),
            );

            if (result.success) {
                success = true;
                setTimeout(() => {
                    close();
                    dispatch("activated");
                }, 1500);
            } else {
                error = result.error || "License activation failed";
            }
        } catch (err) {
            error = "Network error. Please try again.";
        } finally {
            isActivating = false;
        }
    }

    function formatLicenseKey(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        let formatted = "";

        for (let i = 0; i < value.length && i < 16; i++) {
            if (i > 0 && i % 4 === 0) {
                formatted += "-";
            }
            formatted += value[i];
        }

        licenseKey = formatted;
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
        >
            <div class="modal-header">
                <h3>Activate License</h3>
                <button class="close-btn" onclick={close}>&times;</button>
            </div>
            <div class="modal-body">
                {#if success}
                    <div class="success-message">
                        <div class="success-icon">✓</div>
                        <p>License activated successfully!</p>
                    </div>
                {:else}
                    <p class="instruction">
                        Enter your license key to unlock Pro features
                    </p>
                    <input
                        type="text"
                        bind:value={licenseKey}
                        oninput={formatLicenseKey}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        maxlength="19"
                        disabled={isActivating}
                        class:error
                    />
                    {#if error}
                        <p class="error-message">{error}</p>
                    {/if}
                {/if}
            </div>
            {#if !success}
                <div class="modal-footer">
                    <button
                        class="btn-cancel"
                        onclick={close}
                        disabled={isActivating}>Cancel</button
                    >
                    <button
                        class="btn-activate"
                        onclick={activateLicense}
                        disabled={isActivating || !licenseKey}
                    >
                        {isActivating ? "Activating..." : "Activate"}
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
        background: var(--bg-card, #ffffff);
        border-radius: 16px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color, #e0e0e0);
        overflow: hidden;
        animation: scaleUp 0.2s ease-out;
    }

    .modal-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color, #e0e0e0);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-tertiary, #f5f5f5);
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--accent-primary, #6200ea);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-secondary, #666);
        padding: 0;
        line-height: 1;
    }

    .modal-body {
        padding: 2rem 1.5rem;
    }

    .instruction {
        margin: 0 0 1rem 0;
        color: var(--text-secondary, #666);
        font-size: 0.9rem;
        text-align: center;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid var(--border-color, #e0e0e0);
        border-radius: 8px;
        font-size: 1rem;
        font-family: "Courier New", monospace;
        text-align: center;
        letter-spacing: 2px;
        background: var(--bg-primary, #fff);
        color: var(--text-primary, #333);
        transition: border-color 0.2s;
    }

    input:focus {
        outline: none;
        border-color: var(--accent-primary, #6200ea);
    }

    input.error {
        border-color: #f44336;
    }

    input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .error-message {
        margin: 0.5rem 0 0 0;
        color: #f44336;
        font-size: 0.85rem;
        text-align: center;
    }

    .success-message {
        text-align: center;
        padding: 1rem 0;
    }

    .success-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 1rem;
        background: #4caf50;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        color: white;
        animation: scaleUp 0.3s ease-out;
    }

    .success-message p {
        margin: 0;
        color: var(--text-primary, #333);
        font-weight: 600;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
        border-top: 1px solid var(--border-color, #e0e0e0);
    }

    button {
        padding: 0.6rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
        border: none;
    }

    .btn-cancel {
        background: transparent;
        color: var(--text-secondary, #666);
    }

    .btn-cancel:hover:not(:disabled) {
        background: var(--bg-tertiary, #f5f5f5);
        color: var(--text-primary, #333);
    }

    .btn-activate {
        background: var(--accent-primary, #6200ea);
        color: white;
        box-shadow: 0 4px 10px rgba(98, 0, 234, 0.3);
    }

    .btn-activate:hover:not(:disabled) {
        background: var(--accent-hover, #3700b3);
        transform: translateY(-1px);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes scaleUp {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
