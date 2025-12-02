<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { t } from "../lib/stores/i18n";

    export let steps = [];
    export let onComplete = () => {};
    export let onSkip = () => {};

    let currentStepIndex = 0;
    let targetRect = null;
    let tourActive = true;

    const dispatch = createEventDispatcher();

    $: currentStep = steps[currentStepIndex];
    $: isLastStep = currentStepIndex === steps.length - 1;

    function updateTargetPosition() {
        if (!currentStep) return;

        const element = document.querySelector(currentStep.target);
        if (element) {
            const rect = element.getBoundingClientRect();
            targetRect = {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                right: rect.right,
            };

            // Scroll element into view if needed
            element.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            // If target not found, skip to next step or handle error
            console.warn(`Tour target not found: ${currentStep.target}`);
            // nextStep(); // Optional: auto-skip
        }
    }

    function nextStep() {
        if (isLastStep) {
            completeTour();
        } else {
            currentStepIndex++;
            // Small delay to allow UI updates/scrolling
            setTimeout(updateTargetPosition, 100);
        }
    }

    function prevStep() {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            setTimeout(updateTargetPosition, 100);
        }
    }

    function skipTour() {
        tourActive = false;
        onSkip();
        dispatch("skip");
    }

    function completeTour() {
        tourActive = false;
        onComplete();
        dispatch("complete");
    }

    onMount(() => {
        // Initial position update
        setTimeout(updateTargetPosition, 500);

        // Handle window resize
        window.addEventListener("resize", updateTargetPosition);

        return () => {
            window.removeEventListener("resize", updateTargetPosition);
        };
    });

    // Re-calculate position when step changes
    $: if (currentStep) {
        setTimeout(updateTargetPosition, 100);
    }
</script>

{#if tourActive && targetRect}
    <div class="tour-overlay" transition:fade={{ duration: 200 }}>
        <!-- Highlight Box (Cutout effect using box-shadow) -->
        <div
            class="highlight-box"
            style="
                top: {targetRect.top - 4}px;
                left: {targetRect.left - 4}px;
                width: {targetRect.width + 8}px;
                height: {targetRect.height + 8}px;
            "
        ></div>

        <!-- Tooltip Card -->
        <div
            class="tour-card"
            class:position-bottom={currentStep.position === "bottom"}
            class:position-top={currentStep.position === "top"}
            class:position-left={currentStep.position === "left"}
            class:position-right={currentStep.position === "right"}
            style="
                top: {currentStep.position === 'bottom'
                ? targetRect.bottom + 16
                : currentStep.position === 'top'
                  ? targetRect.top - 16
                  : targetRect.top}px;
                left: {currentStep.position === 'right'
                ? targetRect.right + 16
                : currentStep.position === 'left'
                  ? targetRect.left - 16
                  : targetRect.left}px;
                transform: {currentStep.position === 'top'
                ? 'translateY(-100%)'
                : currentStep.position === 'left'
                  ? 'translateX(-100%)'
                  : 'none'};
            "
            transition:fly={{ y: 10, duration: 300 }}
        >
            <div class="tour-header">
                <h3>{currentStep.title}</h3>
                <button class="close-btn" onclick={skipTour}>×</button>
            </div>
            <p>{currentStep.description}</p>

            <div class="tour-footer">
                <div class="step-indicator">
                    {currentStepIndex + 1} / {steps.length}
                </div>
                <div class="tour-actions">
                    {#if currentStepIndex > 0}
                        <button class="secondary-btn" onclick={prevStep}
                            >{$t("back")}</button
                        >
                    {/if}
                    <button class="primary-btn" onclick={nextStep}>
                        {isLastStep ? $t("finish") : $t("next")}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .tour-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        pointer-events: none; /* Allow clicking through to underlying elements if needed, but we block mostly */
    }

    .highlight-box {
        position: absolute;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75); /* The overlay effect */
        pointer-events: none;
        transition: all 0.3s ease;
        z-index: 10000;
        border: 2px solid var(--accent-primary);
    }

    .tour-card {
        position: absolute;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.2rem;
        width: 300px;
        max-width: 90vw;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        pointer-events: auto;
        z-index: 10001;
        transition: all 0.3s ease;
    }

    /* Positioning adjustments */
    .position-bottom {
        /* Default handled in inline style */
    }

    .tour-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.8rem;
    }

    .tour-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-primary);
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--text-tertiary);
        font-size: 1.5rem;
        line-height: 0.5;
        cursor: pointer;
        padding: 0;
    }

    .close-btn:hover {
        color: var(--text-primary);
    }

    p {
        margin: 0 0 1.2rem 0;
        color: var(--text-secondary);
        font-size: 0.95rem;
        line-height: 1.5;
    }

    .tour-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .step-indicator {
        font-size: 0.85rem;
        color: var(--text-tertiary);
        font-weight: 500;
    }

    .tour-actions {
        display: flex;
        gap: 0.5rem;
    }

    .primary-btn {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .primary-btn:hover {
        background: var(--accent-hover);
    }

    .secondary-btn {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .secondary-btn:hover {
        background: var(--bg-secondary);
        color: var(--text-primary);
    }
</style>
