
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
    // Sort by date descending
    return allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
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
    // Sort by date descending
    return allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
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

export async function fetchTrendingNews(forceRefresh = false) {
    const url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
    try {
        const articles = await fetchRSS(url, forceRefresh);
        return articles.map(a => ({ ...a, topic: 'Trending' }));
    } catch (e) {
        console.error("Failed to fetch trending news", e);
        return [];
    }
}

