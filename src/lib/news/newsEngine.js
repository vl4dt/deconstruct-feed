import { sourceService } from './sourceService';
import { getCachedFeed, setCachedFeed } from '../cache/feedCache';
import { parseFeed } from './rssParser';

export async function fetchNewsForTopics(topics, forceRefresh = false, onProgress = null) {
    const allArticles = [];
    const allSources = await sourceService.getAllSources();

    for (const topic of topics) {
        if (onProgress) {
            onProgress(`Fetching ${topic}...`);
        }
        const feeds = allSources[topic] || [];
        for (const feedUrl of feeds) {
            try {
                const articles = await fetchRSS(feedUrl, forceRefresh);
                allArticles.push(...articles.map(a => ({ ...a, topic })));
            } catch (e) {
                console.error(`Failed to fetch ${feedUrl}`, e);
            }
        }
    }
    // Deduplicate
    const uniqueArticles = deduplicateArticles(allArticles);

    // Sort by date descending
    return uniqueArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

export async function fetchCachedNewsForTopics(topics) {
    const allArticles = [];
    const allSources = await sourceService.getAllSources();

    for (const topic of topics) {
        const feeds = allSources[topic] || [];
        for (const feedUrl of feeds) {
            try {
                // Get cached data ignoring TTL (pass Infinity)
                const cached = await getCachedFeed(feedUrl, Infinity);
                if (cached) {
                    allArticles.push(...cached.map(a => ({ ...a, topic })));
                }
            } catch (e) {
                console.error(`Failed to fetch cached data for ${feedUrl}`, e);
            }
        }
    }
    // Deduplicate
    const uniqueArticles = deduplicateArticles(allArticles);

    // Sort by date descending
    return uniqueArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}



async function fetchRSS(url, forceRefresh = false, sourceNameOverride = null) {
    // Try cache first unless force refresh
    if (!forceRefresh) {
        const cached = await getCachedFeed(url);
        if (cached) {
            // If we have an override, update the cached items source (in case it was cached without it)
            if (sourceNameOverride) {
                return cached.map(item => ({ ...item, source: sourceNameOverride }));
            }
            return cached;
        }
    }

    // Cache miss or force refresh - fetch from network
    console.log(`Fetching fresh data for ${url}`);
    const response = await fetch(url);
    const text = await response.text();

    // Parse using the environment-aware parser
    const articles = await parseFeed(text, sourceNameOverride);

    // Cache the results
    await setCachedFeed(url, articles);

    return articles;
}

// Deduplicate articles by title (case-insensitive)
function deduplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(article => {
        const key = article.title?.toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function fetchTrendingNews(keywords = [], forceRefresh = false) {
    const sources = [];

    // 1. Google News RSS (general trending)
    sources.push({
        url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
        name: 'Google News'
    });

    // 2. Yahoo News RSS (general trending)
    sources.push({
        url: 'https://news.yahoo.com/rss/',
        name: 'Yahoo News'
    });

    // 3. Bing News RSS for each keyword (keyword-specific)
    if (keywords && keywords.length > 0) {
        keywords.forEach(keyword => {
            sources.push({
                url: `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`,
                name: `Bing News (${keyword})`
            });
        });
    }

    console.log(`Fetching trending news from ${sources.length} sources...`);

    // Fetch from all sources in parallel (graceful error handling)
    const results = await Promise.allSettled(
        sources.map(async ({ url, name }) => {
            try {
                // Don't override source name - let fetchRSS extract the actual source from the feed
                const articles = await fetchRSS(url, forceRefresh);
                console.log(`✓ Fetched ${articles.length} articles from ${name}`);
                return articles;
            } catch (error) {
                console.warn(`✗ Failed to fetch from ${name}:`, error.message);
                return [];
            }
        })
    );

    // Combine all successful results
    let articles = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);

    // Tag all as 'Trending'
    articles = articles.map(a => ({ ...a, topic: 'Trending' }));

    // Deduplicate by title
    articles = deduplicateArticles(articles);

    // Filter by keywords if provided (additional filtering for Google/Yahoo articles)
    if (keywords && keywords.length > 0) {
        const lowerKeywords = keywords.map(k => k.toLowerCase());
        articles = articles.filter(article => {
            const searchText = `${article.title} ${article.description}`.toLowerCase();
            return lowerKeywords.some(keyword => searchText.includes(keyword));
        });
    }

    // Sort by date (newest first)
    articles.sort((a, b) => {
        const dateA = new Date(a.pubDate || 0);
        const dateB = new Date(b.pubDate || 0);
        return dateB.getTime() - dateA.getTime();
    });

    console.log(`✓ Returning ${articles.length} deduplicated trending articles`);
    return articles;
}

