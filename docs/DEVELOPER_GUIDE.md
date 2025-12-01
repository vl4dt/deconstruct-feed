# NewsLens AI Developer Guide

This guide provides technical information for developers working on NewsLens AI.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Build System](#build-system)
- [Development Workflow](#development-workflow)
- [Svelte 5 Patterns](#svelte-5-patterns)
- [State Management](#state-management)
- [Chrome Extension Architecture](#chrome-extension-architecture)
- [Internationalization](#internationalization)
- [Theming System](#theming-system)
- [Testing](#testing)

## Project Overview

NewsLens AI is a Chrome extension that combines:
- **News Aggregation**: RSS feed parsing and curation
- **AI Analysis**: Multi-provider AI integration (Chrome AI, Gemini, Local LLM, OpenAI, Anthropic)
- **Content Creation**: Script and podcast generation
- **Modern UI**: Svelte 5 with reactive state management

## Tech Stack

### Core Technologies
- **Svelte 5**: Latest version with runes (`$state`, `$derived`, `$effect`)
- **Vite**: Build tool and dev server
- **JavaScript**: ES6+ with JSDoc type hints
- **CSS**: Vanilla CSS with CSS Variables for theming
- **Marked**: Markdown parsing for AI-generated content

### Chrome APIs Used
- `chrome.storage` - Persistent and sync storage
- `chrome.sidePanel` - Side panel integration
- `chrome.scripting` - Content script injection
- `chrome.contextMenus` - Right-click menu integration
- `chrome.alarms` - Background tasks
- **Chrome AI** (`window.ai.languageModel`) - On-device AI

### AI Providers
- Chrome Built-in AI (Gemini Nano)
- Google Gemini API
- OpenAI API
- Anthropic Claude API
- Local LLM (Ollama, LM Studio)

## Project Structure

```
newslens-ai/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icons/                 # Extension icons
│
├── src/
│   ├── popup/                 # Main UI (popup/side panel)
│   │   └── Popup.svelte      # Main app component
│   │
│   ├── options/               # Settings page
│   │   └── Options.svelte
│   │
│   ├── background/            # Background service worker
│   │   └── index.js
│   │
│   ├── components/            # Reusable Svelte components
│   │   ├── Settings.svelte
│   │   ├── MarkdownRenderer.svelte
│   │   ├── LoadingSpinner.svelte
│   │   ├── SkeletonLoader.svelte
│   │   ├── UpgradeModal.svelte
│   │   ├── LicenseActivation.svelte
│   │   └── OfflineBanner.svelte
│   │
│   ├── lib/                   # Core business logic
│   │   ├── ai/               # AI service integrations
│   │   │   └── aiService.js # Main AI service
│   │   │
│   │   ├── news/             # News fetching & parsing
│   │   │   ├── newsEngine.js
│   │   │   └── sourceService.js
│   │   │
│   │   ├── cache/            # Caching system
│   │   │   ├── aiCache.js
│   │   │   └── feedCache.js
│   │   │
│   │   ├── stores/           # Svelte stores
│   │   │   ├── settings.js
│   │   │   ├── subscription.js
│   │   │   ├── theme.js
│   │   │   ├── savedItems.js
│   │   │   └── i18n.js
│   │   │
│   │   ├── i18n/             # Internationalization
│   │   │   ├── en.js
│   │   │   ├── es.js
│   │   │   └── languageMap.js
│   │   │
│   │   ├── db/               # IndexedDB
│   │   │   ├── indexedDB.js
│   │   │   ├── savedItemsDB.js
│   │   │   ├── feedCacheDB.js
│   │   │   └── aiCacheDB.js
│   │   │
│   │   ├── pageContent.js    # Page content extraction
│   │   ├── offlineDetector.js # Network status
│   │   └── sharedWorkerBridge.js # Cross-tab sync
│   │
│   ├── styles/                # Global styles
│   │   ├── global.css
│   │   ├── popup.css
│   │   └── options.css
│   │
│   └── types/                 # (Future) TypeScript definitions
│
├── docs/                      # Documentation
│   ├── USER_GUIDE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── AI_PROVIDERS.md
│
├── backend/                   # Optional Vercel backend (for Pro subscriptions)
│   └── api/
│
├── popup.html                 # Popup entry point
├── options.html               # Options page entry point
├── vite.config.js            # Vite configuration
├── svelte.config.js          # Svelte configuration
└── package.json              # Dependencies
```

## Build System

### Vite Configuration

**File**: `vite.config.js`

Key configurations:
- Multiple entry points (popup, options, background)
- Rollup manifest output
- Chrome extension compatibility
- Hot Module Replacement (HMR)

```javascript
export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        popup: 'popup.html',
        options: 'options.html',
        background: 'src/background/index.js'
      },
      output: {
        entryFileNames: 'src/[name]/[name].js'
      }
    }
  }
});
```

### Build Commands

```powershell
# Development mode (watch + HMR)
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

### Build Output

Build creates `dist/` directory:
```
dist/
├── popup.html
├── options.html
├── manifest.json
├── src/
│   ├── popup/
│   ├── options/
│   └── background/
└── assets/        # CSS, images
```

## Development Workflow

### Setup

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Start Dev Server**
   ```powershell
   npm run dev
   ```

3. **Load Extension**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked → Select `dist/` folder

### Hot Reload

Vite watches for changes and rebuilds automatically. However, Chrome extensions require manual reload:

1. Make code changes
2. Vite rebuilds (watch console)
3. Click reload icon on extension in `chrome://extensions/`

**Tip**: Use Extension Reloader for auto-reload during development.

### Debugging

#### Console Logs
- **Popup/Side Panel**: Right-click extension → Inspect
- **Background**: chrome://extensions/ → Inspect background page
- **Content Scripts**: Regular page inspector

#### Chrome Storage
```javascript
// View storage
chrome.storage.sync.get(null, (data) => console.log(data));
chrome.storage.local.get(null, (data) => console.log(data));

// Clear storage
chrome.storage.sync.clear();
chrome.storage.local.clear();
```

## Svelte 5 Patterns

NewsLens AI uses Svelte 5 with the new runes syntax.

### State Management

#### Reactive State with `$state`

```svelte
<script>
  // OLD (Svelte 4): let articles = [];
  // NEW (Svelte 5):
  let articles = $state([]);
  
  function addArticle(article) {
    articles = [...articles, article]; // Triggers reactivity
  }
</script>
```

#### Derived State with `$derived`

```svelte
<script>
  let articles = $state([]);
  
  // Automatically recomputes when articles changes
  let articleCount = $derived(articles.length);
  
  // Complex derived state
  let groupedArticles = $derived.by(() => {
    const groups = {};
    articles.forEach(a => {
      if (!groups[a.topic]) groups[a.topic] = [];
      groups[a.topic].push(a);
    });
    return groups;
  });
</script>
```

#### Side Effects with `$effect`

```svelte
<script>
  let theme = $state('light');
  
  // Runs when theme changes
  $effect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  });
</script>
```

### Props

```svelte
<script>
  // Destructure props with defaults
  let { article, onClose = () => {} } = $props();
  
  // Readonly props
  let title = $derived(article.title);
</script>
```

### Component Communication

#### Parent to Child (Props)
```svelte
<!-- Parent.svelte -->
<ChildComponent article={selectedArticle} />

<!-- Child.svelte -->
<script>
  let { article } = $props();
</script>
```

#### Child to Parent (Callbacks)
```svelte
<!-- Parent.svelte -->
<ChildComponent onSelect={(article) => handleSelect(article)} />

<!-- Child.svelte -->
<script>
  let { onSelect } = $props();
  
  function handleClick() {
    onSelect(article);
  }
</script>

<button onclick={handleClick}>Select</button>
```

#### Event Dispatching (Legacy Alternative)
For complex events, consider using custom event dispatching or stores.

## State Management

### Svelte Stores

NewsLens uses custom stores for global state.

#### Creating a Store

```javascript
// src/lib/stores/example.js
import { writable, get } from 'svelte/store';

function createExampleStore() {
  const { subscribe, update, set } = writable({
    data: null,
    loading: false
  });
  
  return {
    subscribe,
    async init() {
      const data = await chrome.storage.local.get('example');
      set({ data: data.example, loading: false });
    },
    async updateData(newData) {
      update(state => ({ ...state, data: newData }));
      await chrome.storage.local.set({ example: newData });
    }
  };
}

export const exampleStore = createExampleStore();
```

#### Using Stores in Components

```svelte
<script>
  import { exampleStore } from '../lib/stores/example';
  import { onMount } from 'svelte';
  
  onMount(() => {
    exampleStore.init();
  });
  
  // Auto-subscribing with $ prefix
  $: data = $exampleStore.data;
  
  // Or manual subscription
  let data;
  const unsubscribe = exampleStore.subscribe(state => {
    data = state.data;
  });
  
  // Cleanup
  onDestroy(unsubscribe);
</script>

<div>{data}</div>
```

### Chrome Storage Integration

All stores persist to Chrome storage:

```javascript
// Save
await chrome.storage.sync.set({ key: value });

// Load
const { key } = await chrome.storage.sync.get('key');

// Listen for changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.key) {
    console.log('Key changed:', changes.key.newValue);
  }
});
```

**Storage Limits**:
- `chrome.storage.sync`: 100KB total, syncs across devices
- `chrome.storage.local`: 10MB total, local only

## Chrome Extension Architecture

### Manifest V3

NewsLens uses Manifest V3 (required for new extensions).

**Key Differences from V2**:
- Service workers instead of background pages
- `host_permissions` instead of broad permissions
- `scripting` API for content scripts

### Service Worker

**File**: `src/background/index.js`

Service workers are event-driven and don't persist:

```javascript
// Handle extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Create context menus
  chrome.contextMenus.create({
    id: 'analyze-page',
    title: 'Analyze with NewsLens AI',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-page') {
    // Open side panel or trigger analysis
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
```

### Content Scripts

Inject scripts to extract page content:

```javascript
// src/lib/pageContent.js
export async function getPageContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // This runs in page context
      return {
        title: document.title,
        content: document.body.innerText,
        url: location.href
      };
    }
  });
  
  return results[0].result;
}
```

### Side Panel Integration

Enable side panel mode:

```javascript
// In manifest.json
"side_panel": {
  "default_path": "popup.html"
}

// Programmatically open
chrome.sidePanel.open({ windowId });
```

Detect if running in popup vs side panel:

```javascript
const views = chrome.extension.getViews({ type: 'popup' });
const isPopup = views.includes(window);
```

## Internationalization

### i18n System

**Files**:
- `src/lib/stores/i18n.js` - Store and logic
- `src/lib/i18n/en.js` - English translations
- `src/lib/i18n/es.js` - Spanish translations

### Adding Translations

```javascript
// src/lib/i18n/en.js
export default {
  welcome: 'Welcome to NewsLens AI',
  settings: 'Settings',
  // ...
};

// src/lib/i18n/es.js
export default {
  welcome: 'Bienvenido a NewsLens AI',
  settings: 'Configuración',
  // ...
};
```

### Using Translations

```svelte
<script>
  import { t, locale } from '../lib/stores/i18n';
</script>

<h1>{$t('welcome')}</h1>
<p>Current locale: {$locale}</p>

<button onclick={() => locale.set('es')}>
  Español
</button>
```

## Theming System

### CSS Variables

All colors defined in `src/styles/global.css`:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --accent: #4a90e2;
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --text-primary: #ffffff;
  --accent: #5aa3ff;
  /* ... */
}
```

### Theme Store

```javascript
// src/lib/stores/theme.js
export const theme = {
  init: async () => {
    const { theme } = await chrome.storage.local.get('theme');
    applyTheme(theme || 'system');
  },
  set: (newTheme) => {
    applyTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
  },
  toggle: () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    theme.set(next);
  }
};
```

## Testing

### Manual Testing Checklist

- [ ] Test in popup mode
- [ ] Test in side panel mode
- [ ] Test all AI providers (Chrome AI, Gemini, Local, OpenAI, Anthropic)
- [ ] Test offline behavior (cached news)
- [ ] Test with empty/no topics
- [ ] Test Pro features with/without license
- [ ] Test translations (EN, ES)
- [ ] Test theme switching
- [ ] Test on different screen sizes
- [ ] Test performance with many articles

### Unit Testing (Future)

Consider adding:
- Vitest for unit tests
- Testing Library for component tests
- Mock Chrome APIs with `sinon-chrome`

## Performance Optimization

### Best Practices

1. **Use Caching**
   - Cache RSS feeds (15min TTL)
   - Cache AI results by content hash
   - Load cached content first, fetch fresh in background

2. **Lazy Loading**
   - Don't load all articles at once
   - Implement virtual scrolling for large lists
   - Lazy load images

3. **Debounce/Throttle**
   - Debounce search input
   - Throttle scroll events
   - Rate-limit API calls

4. **Code Splitting**
   - Vite automatically code-splits
   - Lazy load heavy components

5. **Minimize Reflows**
   - Use CSS transforms instead of position changes
   - Batch DOM updates
   - Use `will-change` for animations

## Common Patterns

### Async Data Loading

```svelte
<script>
  let articles = $state([]);
  let loading = $state(false);
  let error = $state(null);
  
  async function loadArticles() {
    loading = true;
    error = null;
    try {
      articles = await fetchNewsForTopics(topics);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
  
  onMount(loadArticles);
</script>

{#if loading}
  <LoadingSpinner />
{:else if error}
  <div class="error">{error}</div>
{:else}
  {#each articles as article}
    <ArticleCard {article} />
  {/each}
{/if}
```

### Modal/Dialog Pattern

```svelte
<script>
  let showModal = $state(false);
  
  function openModal() {
    showModal = true;
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    showModal = false;
    document.body.style.overflow = '';
  }
</script>

{#if showModal}
  <div class="modal-backdrop" onclick={closeModal}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <!-- Modal content -->
      <button onclick={closeModal}>Close</button>
    </div>
  </div>
{/if}
```

## Troubleshooting

### Common Issues

**HMR Not Working**
- Restart Vite dev server
- Clear browser cache
- Reload extension

**Chrome AI Not Available**
- Check Chrome version (127+)
- Check `chrome://components` for model download
- Use Chrome Dev or Canary

**Storage Issues**
- Check quota: `chrome.storage.sync.getBytesInUse()`
- Clear storage if corrupted
- Use `storage.local` for large data

**Build Errors**
- Delete `node_modules` and reinstall
- Clear Vite cache: `rm -rf .vite`
- Check for syntax errors in Svelte files

---

For API reference, see [API.md](API.md).  
For architecture overview, see [ARCHITECTURE.md](ARCHITECTURE.md).
