
import { sourceService } from './sourceService';

export async function fetchNewsForTopics(topics) {
    const allArticles = [];
    const allSources = await sourceService.getAllSources();

    for (const topic of topics) {
        const feeds = allSources[topic] || [];
        for (const feedUrl of feeds) {
            try {
                const articles = await fetchRSS(feedUrl);
                allArticles.push(...articles.map(a => ({ ...a, topic })));
            } catch (e) {
                console.error(`Failed to fetch ${feedUrl}`, e);
            }
        }
    }
    // Sort by date descending
    return allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

async function fetchRSS(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    return items.map(item => ({
        title: item.querySelector('title')?.textContent,
        link: item.querySelector('link')?.textContent,
        description: item.querySelector('description')?.textContent,
        pubDate: item.querySelector('pubDate')?.textContent,
        source: url,
        guid: item.querySelector('guid')?.textContent || item.querySelector('link')?.textContent
    }));
}

export async function fetchTrendingNews() {
    const url = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
    try {
        const articles = await fetchRSS(url);
        return articles.map(a => ({ ...a, topic: 'Trending' }));
    } catch (e) {
        console.error("Failed to fetch trending news", e);
        return [];
    }
}

