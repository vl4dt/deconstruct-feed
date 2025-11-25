
import { sourceService } from './sourceService';
import { getCachedFeed, setCachedFeed } from '../cache/feedCache';

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

function extractImageFromItem(item) {
    // Try 1: <enclosure> tag with image type
    const enclosure = item.querySelector('enclosure[type^="image"]');
    if (enclosure?.getAttribute('url')) {
        return enclosure.getAttribute('url');
    }

    // Try 2: <media:content> or <media:thumbnail> (Media RSS)
    const mediaContent = item.querySelector('content[medium="image"], thumbnail');
    if (mediaContent?.getAttribute('url')) {
        return mediaContent.getAttribute('url');
    }

    // Try 3: Extract from description HTML
    const description = item.querySelector('description')?.textContent;
    if (description) {
        const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch?.[1]) {
            return imgMatch[1];
        }
    }

    // Try 4: <image> tag
    const imageTag = item.querySelector('image');
    if (imageTag?.textContent) {
        return imageTag.textContent;
    }

    return null;
}

async function fetchRSS(url, forceRefresh = false) {
    // Try cache first unless force refresh
    if (!forceRefresh) {
        const cached = await getCachedFeed(url);
        if (cached) {
            return cached;
        }
    }

    // Cache miss or force refresh - fetch from network
    console.log(`Fetching fresh data for ${url}`);
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    const articles = items.map(item => ({
        title: item.querySelector('title')?.textContent,
        link: item.querySelector('link')?.textContent,
        description: item.querySelector('description')?.textContent,
        pubDate: item.querySelector('pubDate')?.textContent,
        source: url,
        guid: item.querySelector('guid')?.textContent || item.querySelector('link')?.textContent,
        image: extractImageFromItem(item)
    }));

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
        return dateB - dateA;
    });

    console.log(`✓ Returning ${articles.length} deduplicated trending articles`);
    return articles;
}

