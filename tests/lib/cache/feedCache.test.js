import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedFeed, setCachedFeed } from '../../../src/lib/cache/feedCache';

describe('feedCache', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};

        global.chrome.storage.local.get = vi.fn((keys) => {
            if (typeof keys === 'string') {
                return Promise.resolve({ [keys]: mockStorage[keys] });
            }
            if (keys === null) {
                return Promise.resolve(mockStorage);
            }
            const result = {};
            (Array.isArray(keys) ? keys : [keys]).forEach(key => {
                if (mockStorage[key]) result[key] = mockStorage[key];
            });
            return Promise.resolve(result);
        });

        global.chrome.storage.local.set = vi.fn((items) => {
            Object.assign(mockStorage, items);
            return Promise.resolve();
        });
    });

    describe('setCachedFeed', () => {
        it('should cache feed data', async () => {
            const url = 'https://example.com/feed.xml';
            const articles = [
                { title: 'Article 1', link: 'url1', description: 'desc1' },
                { title: 'Article 2', link: 'url2', description: 'desc2' }
            ];

            await setCachedFeed(url, articles);

            expect(mockStorage[`feed_${url}`]).toBeDefined();
            expect(mockStorage[`feed_${url}`].articles).toEqual(articles);
        });

        it('should include timestamp', async () => {
            const url = 'https://example.com/feed.xml';
            const before = Date.now();

            await setCachedFeed(url, []);

            const after = Date.now();
            const cached = mockStorage[`feed_${url}`];

            expect(cached.timestamp).toBeGreaterThanOrEqual(before);
            expect(cached.timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('getCachedFeed', () => {
        it('should retrieve cached feed within TTL', async () => {
            const url = 'https://example.com/feed.xml';
            const articles = [
                { title: 'Test Article', link: 'url', description: 'desc' }
            ];

            await setCachedFeed(url, articles);

            // Default TTL is 15 minutes, so this should work
            const cached = await getCachedFeed(url);

            expect(cached).toEqual(articles);
        });

        it('should return null for non-existent feed', async () => {
            const result = await getCachedFeed('https://nonexistent.com/feed');
            expect(result).toBeNull();
        });

        it('should return null for expired feed', async () => {
            const url = 'https://example.com/feed.xml';
            const expiredTime = Date.now() - (20 * 60 * 1000); // 20 minutes ago

            mockStorage[`feed_${url}`] = {
                articles: [{ title: 'Old Article' }],
                timestamp: expiredTime
            };

            const result = await getCachedFeed(url);
            expect(result).toBeNull();
        });

        it('should respect custom TTL', async () => {
            const url = 'https://example.com/feed.xml';
            const articles = [{ title: 'Article' }];

            await setCachedFeed(url, articles);

            // Very short TTL (1ms)
            await new Promise(resolve => setTimeout(resolve, 10));
            const result = await getCachedFeed(url, 1);

            expect(result).toBeNull();
        });

        it('should return cached feed with infinite TTL', async () => {
            const url = 'https://example.com/feed.xml';
            const oldTimestamp = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1 year ago

            mockStorage[`feed_${url}`] = {
                articles: [{ title: 'Very Old Article' }],
                timestamp: oldTimestamp
            };

            const result = await getCachedFeed(url, Infinity);
            expect(result).not.toBeNull();
            expect(result[0].title).toBe('Very Old Article');
        });
    });
});
