
const FEED_REGISTRY_DEFAULTS = {
    'Technology': [
        'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
        'https://feeds.arstechnica.com/arstechnica/index',
        'https://techcrunch.com/feed/'
    ],
    'Science': [
        'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
        'https://www.wired.com/feed/category/science/latest/rss'
    ],
    'World': [
        'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        'http://feeds.bbci.co.uk/news/world/rss.xml'
    ],
    'Business': [
        'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
        'http://feeds.bbci.co.uk/news/business/rss.xml'
    ]
};

class SourceService {
    constructor() {
        this.sources = null;
        this.topics = null;
    }

    async init() {
        if (this.sources) return;

        const data = await chrome.storage.sync.get(['sources', 'topics']);

        if (!data.sources) {
            // Migration / Initialization
            console.log('Initializing sources from defaults...');
            this.sources = { ...FEED_REGISTRY_DEFAULTS };
            this.topics = Object.keys(this.sources);
            await this.save();
        } else {
            this.sources = data.sources;
            this.topics = data.topics || Object.keys(this.sources);
        }
    }

    async save() {
        await chrome.storage.sync.set({
            sources: this.sources,
            topics: this.topics
        });
    }

    async getTopics() {
        await this.init();
        return this.topics;
    }

    async getSources(topic) {
        await this.init();
        return this.sources[topic] || [];
    }

    async getAllSources() {
        await this.init();
        return this.sources;
    }

    async addTopic(topic) {
        await this.init();
        if (!this.topics.includes(topic)) {
            this.topics.push(topic);

            // Automatic Source Discovery
            if (!this.sources[topic]) {
                this.sources[topic] = [
                    `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
                ];
            }

            await this.save();
        }
    }

    async addTopicWithSource(topic, url) {
        await this.init();

        // Add topic if it doesn't exist
        if (!this.topics.includes(topic)) {
            this.topics.push(topic);
        }

        // Initialize sources array if needed
        if (!this.sources[topic]) {
            this.sources[topic] = [];
        }

        // Add the custom URL if not present
        if (!this.sources[topic].includes(url)) {
            this.sources[topic].push(url);
        }

        await this.save();
    }

    async removeTopic(topic) {
        await this.init();
        this.topics = this.topics.filter(t => t !== topic);
        // We keep the sources in case they add it back, or we could delete them.
        // For now, let's keep them to preserve any custom sources user might have added.
        await this.save();
    }

    async addSource(topic, url) {
        await this.init();
        if (!this.sources[topic]) {
            this.sources[topic] = [];
        }
        if (!this.sources[topic].includes(url)) {
            this.sources[topic].push(url);
            await this.save();
        }
    }

    async removeSource(topic, url) {
        await this.init();
        if (this.sources[topic]) {
            this.sources[topic] = this.sources[topic].filter(u => u !== url);
            await this.save();
        }
    }

    async updateTopics(newTopics) {
        await this.init();
        this.topics = newTopics;
        await this.save();
    }
}

export const sourceService = new SourceService();
