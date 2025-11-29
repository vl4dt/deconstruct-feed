import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedAIResult, setCachedAIResult, hashContent, cleanupAICache } from '../../../src/lib/cache/aiCache';

describe('aiCache', () => {
    let mockStorage = {};

    beforeEach(() => {
        // Reset mock storage
        mockStorage = {};

        // Override chrome.storage.local methods
        global.chrome.storage.local.get = vi.fn((keys) => {
            if (typeof keys === 'string') {
                return Promise.resolve({ [keys]: mockStorage[keys] });
            }
            if (keys === null) {
                return Promise.resolve(mockStorage);
            }
            const result = {};
            keys.forEach(key => {
                if (mockStorage[key]) result[key] = mockStorage[key];
            });
            return Promise.resolve(result);
        });

        global.chrome.storage.local.set = vi.fn((items) => {
            Object.assign(mockStorage, items);
            return Promise.resolve();
        });

        global.chrome.storage.local.remove = vi.fn((keys) => {
            const keysArray = Array.isArray(keys) ? keys : [keys];
            keysArray.forEach(key => delete mockStorage[key]);
            return Promise.resolve();
        });
    });

    describe('hashContent', () => {
        it('should generate consistent hashes for same content', () => {
            const content = 'test content for hashing';
            const hash1 = hashContent(content);
            const hash2 = hashContent(content);

            expect(hash1).toBe(hash2);
            expect(hash1).toBeTruthy();
        });

        it('should generate different hashes for different content', () => {
            const hash1 = hashContent('content one');
            const hash2 = hashContent('content two');

            expect(hash1).not.toBe(hash2);
        });

        it('should include content length in hash', () => {
            const shortContent = 'short';
            const longContent = 'a'.repeat(2000);

            const hash1 = hashContent(shortContent);
            const hash2 = hashContent(longContent);

            expect(hash1).toContain('_5'); // length 5
            expect(hash2).toContain('_2000'); // length 2000
        });
    });

    describe('setCachedAIResult', () => {
        it('should cache AI results with metadata', async () => {
            const hash = 'test123';
            const type = 'summary';
            const result = 'This is a test summary';

            await setCachedAIResult(hash, type, result);

            const cacheKey = `ai_cache_${type}_${hash}`;
            expect(mockStorage[cacheKey]).toBeDefined();
            expect(mockStorage[cacheKey].result).toBe(result);
            expect(mockStorage[cacheKey].contentHash).toBe(hash);
            expect(mockStorage[cacheKey].analysisType).toBe(type);
            expect(mockStorage[cacheKey].version).toBe(1);
        });

        it('should include timestamps', async () => {
            const before = Date.now();
            await setCachedAIResult('hash', 'bias', 'result');
            const after = Date.now();

            const cacheKey = 'ai_cache_bias_hash';
            const cached = mockStorage[cacheKey];

            expect(cached.createdAt).toBeGreaterThanOrEqual(before);
            expect(cached.createdAt).toBeLessThanOrEqual(after);
            expect(cached.lastAccessedAt).toBe(cached.createdAt);
        });
    });

    describe('getCachedAIResult', () => {
        it('should retrieve cached results', async () => {
            const hash = 'test456';
            const type = 'summary';
            const result = 'Cached summary content';

            // First cache it
            await setCachedAIResult(hash, type, result);

            // Then retrieve it
            const retrieved = await getCachedAIResult(hash, type);

            expect(retrieved).toBe(result);
        });

        it('should return null for non-existent cache', async () => {
            const result = await getCachedAIResult('nonexistent', 'summary');
            expect(result).toBeNull();
        });

        it('should return null for expired cache', async () => {
            const hash = 'expired';
            const type = 'summary';

            // Create expired cache entry
            const cacheKey = `ai_cache_${type}_${hash}`;
            const expiredTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
            mockStorage[cacheKey] = {
                version: 1,
                result: 'Old content',
                contentHash: hash,
                analysisType: type,
                createdAt: expiredTime,
                lastAccessedAt: expiredTime
            };

            const result = await getCachedAIResult(hash, type);
            expect(result).toBeNull();
        });

        it('should return null for wrong version', async () => {
            const hash = 'wrongversion';
            const type = 'summary';
            const cacheKey = `ai_cache_${type}_${hash}`;

            mockStorage[cacheKey] = {
                version: 999, // Wrong version
                result: 'Content',
                contentHash: hash,
                analysisType: type,
                createdAt: Date.now(),
                lastAccessedAt: Date.now()
            };

            const result = await getCachedAIResult(hash, type);
            expect(result).toBeNull();
        });

        it('should update lastAccessedAt on retrieval', async () => {
            const hash = 'access';
            const type = 'summary';

            await setCachedAIResult(hash, type, 'content');

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 10));

            const cacheKey = `ai_cache_${type}_${hash}`;
            const originalAccessTime = mockStorage[cacheKey].lastAccessedAt;

            await getCachedAIResult(hash, type);

            expect(mockStorage[cacheKey].lastAccessedAt).toBeGreaterThan(originalAccessTime);
        });
    });

    describe('cleanupAICache', () => {
        it('should remove oldest entries when exceeding limit', async () => {
            // Create 205 cache entries (limit is 200)
            for (let i = 0; i < 205; i++) {
                const cacheKey = `ai_cache_summary_hash${i}`;
                mockStorage[cacheKey] = {
                    version: 1,
                    result: `Content ${i}`,
                    contentHash: `hash${i}`,
                    analysisType: 'summary',
                    createdAt: Date.now() - (205 - i) * 1000, // Oldest first
                    lastAccessedAt: Date.now() - (205 - i) * 1000
                };
            }

            await cleanupAICache();

            const remainingKeys = Object.keys(mockStorage).filter(k => k.startsWith('ai_cache_'));
            expect(remainingKeys.length).toBeLessThanOrEqual(200);
        });

        it('should keep most recently accessed entries', async () => {
            // Create entries with different access times
            mockStorage['ai_cache_summary_old'] = {
                version: 1,
                result: 'Old',
                contentHash: 'old',
                analysisType: 'summary',
                createdAt: Date.now() - 10000,
                lastAccessedAt: Date.now() - 10000
            };

            mockStorage['ai_cache_summary_recent'] = {
                version: 1,
                result: 'Recent',
                contentHash: 'recent',
                analysisType: 'summary',
                createdAt: Date.now() - 5000,
                lastAccessedAt: Date.now() - 1000
            };

            // Add many more to trigger cleanup
            for (let i = 0; i < 200; i++) {
                mockStorage[`ai_cache_summary_filler${i}`] = {
                    version: 1,
                    result: `Filler ${i}`,
                    contentHash: `filler${i}`,
                    analysisType: 'summary',
                    createdAt: Date.now() - 5000,
                    lastAccessedAt: Date.now() - 2000
                };
            }

            await cleanupAICache();

            // Recent should still be there
            expect(mockStorage['ai_cache_summary_recent']).toBeDefined();
        });

        it('should not cleanup if under limit', async () => {
            // Create only 50 entries
            for (let i = 0; i < 50; i++) {
                mockStorage[`ai_cache_summary_hash${i}`] = {
                    version: 1,
                    result: `Content ${i}`,
                    contentHash: `hash${i}`,
                    analysisType: 'summary',
                    createdAt: Date.now(),
                    lastAccessedAt: Date.now()
                };
            }

            const beforeCount = Object.keys(mockStorage).length;
            await cleanupAICache();
            const afterCount = Object.keys(mockStorage).length;

            expect(afterCount).toBe(beforeCount);
        });
    });
});
