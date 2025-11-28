# API Documentation

This document provides comprehensive API documentation for NewsLens AI's core services and functions.

## Table of Contents

- [AI Service API](#ai-service-api)
- [News Engine API](#news-engine-api)
- [Source Service API](#source-service-api)
- [Cache APIs](#cache-apis)
- [Storage & Stores](#storage--stores)
- [Page Content API](#page-content-api)

---

## AI Service API

**Location**: `src/lib/ai/aiService.js`

The AI Service provides all AI-powered analysis features with support for multiple providers.

### Core Functions

#### `isChromeAIAvailable()`

Checks if Chrome's built-in AI is available and triggers download if needed.

```javascript
async function isChromeAIAvailable(): Promise<boolean>
```

**Returns**: `true` if Chrome AI is available, `false` otherwise

**Example**:
```javascript
const available = await isChromeAIAvailable();
if (!available) {
  console.log('Chrome AI not available, falling back to other provider');
}
```

---

#### `summarize(text, apiKey, forceRefresh)`

Generates a concise summary of the provided text using the configured AI provider.

```javascript
async function summarize(
  text: string,
  apiKey?: string | null,
  forceRefresh?: boolean
): Promise<string>
```

**Parameters**:
- `text` - The article/text content toummarize
- `apiKey` - (Optional) API key override (not currently used, uses settings)
- `forceRefresh` - (Optional) Skip cache and generate fresh summary

**Returns**: Markdown-formatted summary string

**Throws**: Error if AI provider unavailable or API fails

**Example**:
```javascript
const articleText = `${article.title}\n\n${article.description}`;
const summary = await summarize(articleText);
console.log(summary); // Markdown-formatted summary
```

---

#### `checkBias(text, apiKey, forceRefresh)`

Analyzes text for bias, emotional language, and objectivity.

```javascript
async function check Bias(
  text: string,
  apiKey?: string | null,
  forceRefresh?: boolean
): Promise<string>
```

**Parameters**:
- `text` - The text to analyze for bias
- `apiKey` - (Optional) API key override
- `forceRefresh` - (Optional) Skip cache

**Returns**: Markdown analysis including:
- Objectivity rating (1-10)
- Identified biases
- Emotional language examples
- Framing analysis

**Example**:
```javascript
const biasReport = await checkBias(articleText);
// Returns: "**Objectivity Score: 7/10**\n\n## Analysis\n..."
```

---

#### `translate(text, targetLangCode, apiKey, forceRefresh)`

Translates text to the target language while preserving tone and formatting.

```javascript
async function translate(
  text: string,
  targetLangCode: string,
  apiKey?: string | null,
  forceRefresh?: boolean
): Promise<string>
```

**Parameters**:
- `text` - Text to translate
- `targetLangCode` - Target language code ('en', 'es', 'fr', etc.)
- `apiKey` - (Optional) API key override
- `forceRefresh` - (Optional) Skip cache

**Returns**: Translated text

**Note**: Uses `getLanguageName()` from `i18n/languageMap.js` to convert codes to full names.

**Example**:
```javascript
const translated = await translate(summary, 'es');
// Translates to Spanish
```

---

#### `generateScript(articles, apiKey, forceRefresh)`

Generates a YouTube video script from one or more articles.

```javascript
async function generateScript(
  articles: Article[],
  apiKey?: string | null,
  forceRefresh?: boolean
): Promise<string>
```

**Parameters**:
- `articles` - Array of article objects with `title` and `description`
- `apiKey` - (Optional) API key override
- `forceRefresh` - (Optional) Skip cache

**Returns**: Markdown-formatted video script with:
- Engaging hook
- Story coverage
- Transitions
- Call to action

**Example**:
```javascript
const script = await generateScript([article1, article2]);
```

---

#### `generatePodcastScript(articles, apiKey, forceRefresh)`

Generates a two-host podcast dialogue script.

```javascript
async function generatePodcastScript(
  articles: Article[],
  apiKey?: string | null,
  forceRefresh?: boolean
): Promise<string>
```

**Parameters**: Same as `generateScript()`

**Returns**: Markdown dialogue script with:
- Two hosts (Alex and Sam)
- Natural conversation
- Music cues
- Topic transitions

---

#### `deepDive(articles, apiKey, forceRefresh)`

Performs comprehensive multi-article analysis.

```javascript
async function deepDive(
  articles: Article[],
  apiKey?: string | null,
  forceRefresh?: boolean
): Promise<string>
```

**Parameters**: Same as `generateScript()`

**Returns**: Markdown analysis including:
- Common themes
- Contradictions
- Causal relationships
- Comprehensive insights

---

### Internal Functions

#### `generateContent(prompt, systemPrompt, cacheKey, forceRefresh)`

Internal function that handles AI provider selection and content generation.

```javascript
async function generateContent(
  prompt: string,
  systemPrompt: string,
  cacheKey: string,
  forceRefresh?: boolean
): Promise<string>
```

**Provider Routing**:
- `chrome`: Chrome Built-in AI (LanguageModel API)
- `gemini`: Google Gemini API
- `local`: Local LLM (Ollama/LM Studio)
- `openai`: OpenAI API
- `anthropic`: Anthropic Claude API

---

## News Engine API

**Location**: `src/lib/news/newsEngine.js`

Handles RSS feed fetching, parsing, and news aggregation.

### Functions

#### `fetchNewsForTopics(topics, forceRefresh, onProgress)`

Fetches news for multiple topics from all configured sources.

```javascript
async function fetchNewsForTopics(
  topics: string[],
  forceRefresh?: boolean,
  onProgress?: (message: string) => void
): Promise<Article[]>
```

**Parameters**:
- `topics` - Array of topic names
- `forceRefresh` - Skip cache and fetch fresh data
- `onProgress` - Callback for progress updates

**Returns**: Array of deduplicated articles sorted by date (newest first)

**Article Structure**:
```javascript
{
  title: string,
  link: string,
  description: string,
  pubDate: string,
  source: string,
  sourceLink: string,
  guid: string,
  image: string | null,
  topic: string
}
```

**Example**:
```javascript
const articles = await fetchNewsForTopics(
  ['Technology', 'Science'],
  false,
  (msg) => console.log(msg)
);
```

---

#### `fetchCachedNewsForTopics(topics)`

Retrieves cached news without fetching from network.

```javascript
async function fetchCachedNewsForTopics(
  topics: string[]
): Promise<Article[]>
```

**Use Case**: Load instant content on app startup

---

#### `fetchTrendingNews(keywords, forceRefresh)`

Fetches trending news from multiple aggregators.

```javascript
async function fetchTrendingNews(
  keywords?: string[],
  forceRefresh?: boolean
): Promise<Article[]>
```

**Parameters**:
- `keywords` - Optional keywords to filter trending news
- `forceRefresh` - Skip cache

**Sources**:
- Google News RSS
- Yahoo News RSS
- Bing News RSS (keyword-specific)

**Returns**: Deduplicated, filtered, and sorted articles

---

### Internal Functions

#### `fetchRSS(url, forceRefresh, sourceNameOverride)`

Fetches and parses a single RSS feed.

**Features**:
- Caching support
- Image extraction (multiple methods)
- Source detection (multiple strategies)
- Error handling

#### `deduplicateArticles(articles)`

Removes duplicate articles by title (case-insensitive).

#### `extractImageFromItem(item)`

Extracts article image from RSS item using multiple strategies:
1. `<enclosure>` tag
2. Media RSS (`<media:content>`, `<media:thumbnail>`)
3. HTML `<img>` in description
4. `<image>` tag

---

## Source Service API

**Location**: `src/lib/news/sourceService.js`

Manages news topics and RSS feed sources.

### Class: SourceService

#### Methods

##### `init()`

Initializes the service from Chrome storage or creates defaults.

```javascript
async init(): Promise<void>
```

##### `getTopics()`

Returns all configured topics.

```javascript
async getTopics(): Promise<string[]>
```

##### `getSources(topic)`

Returns RSS feed URLs for a specific topic.

```javascript
async getSources(topic: string): Promise<string[]>
```

##### `getAllSources()`

Returns all sources organized by topic.

```javascript
async getAllSources(): Promise<Record<string, string[]>>
```

##### `addTopic(topic)`

Adds a new topic with automatic source discovery.

```javascript
async addTopic(topic: string): Promise<void>
```

**Automatic Discovery**: Creates Google News RSS feed for the topic.

##### `removeTopic(topic)`

Removes a topic (keeps sources in case of re-addition).

```javascript
async removeTopic(topic: string): Promise<void>
```

##### `addSource(topic, url)`

Adds a custom RSS feed to a topic.

```javascript
async addSource(topic: string, url: string): Promise<void>
```

##### `removeSource(topic, url)`

Removes an RSS feed from a topic.

```javascript
async removeSource(topic: string, url: string): Promise<void>
```

##### `updateTopics(newTopics)`

Updates the topic order.

```javascript
async updateTopics(newTopics: string[]): Promise<void>
```

---

## Cache APIs

### AI Cache

**Location**: `src/lib/cache/aiCache.js`

Caches AI analysis results to reduce API calls and improve performance.

#### Functions

##### `getCachedAIResult(contentHash, key)`

Retrieves cached AI result.

```javascript
async function getCachedAIResult(
  contentHash: string,
  key: string
): Promise<string | null>
```

##### `setCachedAIResult(contentHash, key, result)`

Stores AI result in cache.

```javascript
async function setCachedAIResult(
  contentHash: string,
  key: string,
  result: string
): Promise<void>
```

##### `hashContent(content)`

Creates a hash of content for cache keys.

```javascript
function hashContent(content: string): string
```

---

### Feed Cache

**Location**: `src/lib/cache/feedCache.js`

Caches RSS feed results to reduce network requests.

#### Functions

##### `getCachedFeed(url, ttl)`

Retrieves cached feed if not expired.

```javascript
async function getCachedFeed(
  url: string,
  ttl?: number
): Promise<Article[] | null>
```

**Parameters**:
- `url` - RSS feed URL
- `ttl` - Time-to-live in milliseconds (default: 15 minutes)

##### `setCachedFeed(url, articles)`

Stores feed in cache.

```javascript
async function setCachedFeed(
  url: string,
  articles: Article[]
): Promise<void>
```

---

## Storage & Stores

NewsLens uses Svelte stores for reactive state management.

### Settings Store

**Location**: `src/lib/stores/settings.js`

#### Store Structure

```javascript
{
  autoSummarize: boolean,
  autoBias: boolean,
  autoTranslateAI: boolean,
  preloadScript: boolean,
  preloadPodcast: boolean,
  aiProvider: 'chrome' | 'gemini' | 'local' | 'openai' | 'anthropic',
  geminiKey: string,
  geminiModel: string,
  localAIUrl: string,
  localAIModel: string,
  openaiKey: string,
  openaiModel: string,
  anthropicKey: string,
  anthropicModel: string,
  trendingKeywords: string[]
}
```

#### Methods

- `init()` - Load from storage
- `update(newSettings)` - Update settings
- Subscribe with: `$settings` or `get(settings)`

---

### Subscription Store

**Location**: `src/lib/stores/subscription.js`

Manages Pro subscription status and license validation.

#### Store Structure

```javascript
{
  isPro: boolean,
  isActive: boolean,
  productId: string,
  expiresAt: Date | null,
  licenseKey: string
}
```

---

### Theme Store

**Location**: `src/lib/stores/theme.js`

Manages dark/light theme.

#### Methods

- `init()` - Initialize theme
- `toggle()` - Toggle theme
- `set(theme)` - Set specific theme ('light', 'dark', 'system')

---

### Saved Items Store

**Location**: `src/lib/stores/savedItems.js`

Manages saved articles and collections.

#### Store Structure

```javascript
{
  items: SavedItem[],
  collections: Collection[]
}
```

---

## Page Content API

**Location**: `src/lib/pageContent.js`

Extracts main content from web pages for analysis.

### Function

#### `getPageContent()`

Extracts content from the current active tab.

```javascript
async function getPageContent(): Promise<{
  title: string,
  content: string,
  url: string
}>
```

**Returns**:
- `title` - Page title
- `content` - Extracted main text content
- `url` - Page URL

**Implementation**: Uses content scripts injected via `chrome.scripting.executeScript`

---

## Type Definitions

### Article

```typescript
interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceLink: string;
  guid: string;
  image?: string | null;
  topic?: string;
}
```

### SavedItem

```typescript
interface SavedItem {
  link: string;
  article: Article;
  savedAt: number;
  collectionId?: string;
}
```

### Collection

```typescript
interface Collection {
  id: string;
  name: string;
  createdAt: number;
}
```

---

## Error Handling

All API functions may throw errors. Recommended pattern:

```javascript
try {
  const result = await summarize(text);
  // Use result
} catch (error) {
  console.error('AI analysis failed:', error);
  // Show user-friendly error message
}
```

Common error scenarios:
- Network failures (RSS feeds, APIs)
- API key missing or invalid
- Chrome AI not available
- Rate limits exceeded

---

## Best Practices

1. **Use Cache Wisely**: Set `forceRefresh=false` unless user explicitly requests refresh
2. **Handle Errors Gracefully**: Always wrap AI/network calls in try-catch
3. **Progressive Loading**: Use `fetchCachedNewsForTopics()` for instant load, then fetch fresh in background
4. **Provider Fallback**: If Chrome AI fails, guide user to configure alternative provider
5. **Debounce User Input**: Avoid excessive API calls on user actions

---

## Examples

### Complete News Fetch Workflow

```javascript
// 1. Load topics
const topics = await sourceService.getTopics();

// 2. Load cached for instant display
const cachedArticles = await fetchCachedNewsForTopics(topics);
articles = cachedArticles;

// 3. Fetch fresh in background
const freshArticles = await fetchNewsForTopics(topics, false);
articles = freshArticles;
```

### Complete Article Analysis Workflow

```javascript
// 1. Summarize
const summary = await summarize(articleText);

// 2. Check bias (Pro)
const bias = await checkBias(articleText);

// 3. Translate if needed
if (locale !== 'en') {
  const translatedSummary = await translate(summary, 'es');
}
```

---

For implementation details and architecture, see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
