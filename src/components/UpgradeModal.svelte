<script>
    import { createEventDispatcher } from "svelte";

    export let show = false;
    export let message = "This is a Pro feature. Upgrade to unlock!";

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }

    function upgrade() {
        dispatch("upgrade");
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
                <h3>✨ Pro Feature</h3>
                <button class="close-btn" onclick={close}>&times;</button>
            </div>
            <div class="modal-body">
                <p>{message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick={close}>Maybe Later</button>
                <button class="btn-upgrade" onclick={upgrade}
                    >Upgrade Now</button
                >
            </div>
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
        max-width: 320px;
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
        padding: 1.5rem;
        text-align: center;
        color: var(--text-primary, #333);
        font-size: 1rem;
        line-height: 1.5;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    button {
        padding: 0.6rem 1.2rem;
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

    .btn-cancel:hover {
        background: var(--bg-tertiary, #f5f5f5);
        color: var(--text-primary, #333);
    }

    .btn-upgrade {
        background: var(--accent-primary, #6200ea);
        color: white;
        box-shadow: 0 4px 10px rgba(98, 0, 234, 0.3);
    }

    .btn-upgrade:hover {
        background: var(--accent-hover, #3700b3);
        transform: translateY(-1px);
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
