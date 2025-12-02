<script>
    import { createEventDispatcher } from "svelte";
    import { fade, scale } from "svelte/transition";

    export let show = false;
    export let title = "Confirm";
    export let message = "Are you sure?";
    export let confirmText = "Confirm";
    export let cancelText = "Cancel";

    const dispatch = createEventDispatcher();

    function confirm() {
        dispatch("confirm");
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

{#if show}
    <div
        class="modal-overlay"
        transition:fade={{ duration: 200 }}
        role="button"
        tabindex="0"
        onclick={cancel}
        onkeydown={(e) => e.key === "Escape" && cancel()}
    >
        <div
            class="modal-dialog"
            role="dialog"
            aria-labelledby="dialog-title"
            tabindex="-1"
            transition:scale={{ duration: 200, start: 0.9 }}
            onclick={(e) => e.stopPropagation()}
        >
            <div class="modal-header">
                <h3 id="dialog-title">{title}</h3>
            </div>
            <div class="modal-body">
                <p>{message}</p>
            </div>
            <div class="modal-footer">
                {#if cancelText}
                    <button class="btn btn-secondary" onclick={cancel}>
                        {cancelText}
                    </button>
                {/if}
                <button class="btn btn-primary" onclick={confirm}>
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }

    .modal-dialog {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        overflow: hidden;
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-secondary);
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.2rem;
        color: var(--text-primary);
    }

    .modal-body {
        padding: 1.5rem;
    }

    .modal-body p {
        margin: 0;
        color: var(--text-primary);
        line-height: 1.5;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        background: var(--bg-secondary);
    }

    .btn {
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-secondary {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    .btn-secondary:hover {
        background: var(--bg-card);
    }

    .btn-primary {
        background: var(--accent-primary);
        color: white;
    }

    .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
</style>
