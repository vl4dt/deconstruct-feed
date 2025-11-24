<script>
  import { onMount } from "svelte";
  import { theme } from "../lib/stores/theme";
  import Settings from "../components/Settings.svelte";

  onMount(async () => {
    await theme.init();
  });

  function handleBack() {
    // Close the options page tab/window
    window.close();
  }
</script>

<main>
  <div class="container">
    <Settings on:back={handleBack} />
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, sans-serif;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  main {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }
  .container {
    width: 100%;
    max-width: 500px;
    background: var(--bg-primary);
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    min-height: 600px;
    border: 1px solid var(--border-color);
  }
</style>
