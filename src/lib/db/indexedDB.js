const DB_NAME = 'newslens_db';
const DB_VERSION = 3;

class NewsLensDB {
    constructor() {
        this.db = null;
        this.initPromise = null;
    }

    async init() {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = /** @type {IDBOpenDBRequest} */ (event.target).result;
                console.log(`🔄 Upgrading IndexedDB from version ${event.oldVersion} to ${event.newVersion}`);

                // AI Cache store - v3: compound key for contentHash + analysisType
                if (db.objectStoreNames.contains('aiCache')) {
                    db.deleteObjectStore('aiCache');
                }

                const aiCacheStore = db.createObjectStore('aiCache', { keyPath: ['contentHash', 'analysisType'] });
                aiCacheStore.createIndex('contentHash', 'contentHash', { unique: false });
                aiCacheStore.createIndex('analysisType', 'analysisType', { unique: false });
                aiCacheStore.createIndex('createdAt', 'createdAt', { unique: false });
                aiCacheStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });

                // Feed Cache store
                if (!db.objectStoreNames.contains('feedCache')) {
                    const feedCacheStore = db.createObjectStore('feedCache', { keyPath: 'cacheKey' });
                    feedCacheStore.createIndex('topic', 'topic', { unique: false });
                    feedCacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('Created feedCache store');
                }

                // Saved Items store (v2)
                if (!db.objectStoreNames.contains('savedItems')) {
                    const savedItemsStore = db.createObjectStore('savedItems', { keyPath: 'link' });
                    savedItemsStore.createIndex('savedAt', 'savedAt', { unique: false });
                    savedItemsStore.createIndex('collection', 'collection', { unique: false });
                    savedItemsStore.createIndex('source', 'source', { unique: false });
                    console.log('Created savedItems store');
                }

                // Collections store (v2)
                if (!db.objectStoreNames.contains('collections')) {
                    const collectionsStore = db.createObjectStore('collections', { keyPath: 'id' });
                    collectionsStore.createIndex('name', 'name', { unique: true });
                    collectionsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Created collections store');
                }
            };
        });

        return this.initPromise;
    }

    async get(storeName, key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName, indexName = null, query = null) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const source = indexName ? store.index(indexName) : store;
            const request = query ? source.getAll(query) : source.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteByIndex(storeName, indexName, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.openCursor(IDBKeyRange.only(value));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
const dbInstance = new NewsLensDB();

export default dbInstance;
