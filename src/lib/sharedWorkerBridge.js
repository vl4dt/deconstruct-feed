/**
 * Shared Worker Bridge
 * 
 * Utility module for managing shared worker connections and communication.
 * Provides a unified interface for stores to sync state across tabs.
 */

class SharedWorkerBridge {
    constructor() {
        this.worker = null;
        this.port = null;
        this.listeners = new Map();
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    /**
     * Initialize connection to shared worker
     */
    async init() {
        try {
            // Create shared worker
            this.worker = new SharedWorker(
                chrome.runtime.getURL('shared-worker.js'),
                { name: 'newslens-state-sync' }
            );

            this.port = this.worker.port;

            // Set up message handler
            this.port.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            // Set up error handler
            this.port.onmessageerror = (event) => {
                console.error('SharedWorker message error:', event);
                this.handleConnectionError();
            };

            // Start the port
            this.port.start();

            // Send connection handshake
            this.send({ type: 'CONNECT', tabId: crypto.randomUUID() });

            this.connected = true;
            this.reconnectAttempts = 0;

            console.log('✅ SharedWorker connected');
            return true;
        } catch (error) {
            console.error('Failed to initialize SharedWorker:', error);
            this.handleConnectionError();
            return false;
        }
    }

    /**
     * Handle connection errors with retry logic
     */
    handleConnectionError() {
        this.connected = false;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`Retrying SharedWorker connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.init();
            }, delay);
        } else {
            console.warn('SharedWorker connection failed. Falling back to local-only mode.');
            // Notify listeners about fallback mode
            this.notifyListeners('CONNECTION_FAILED', { fallbackMode: true });
        }
    }

    /**
     * Send message to shared worker
     */
    send(message) {
        // Allow CONNECT message to pass through even if not yet marked as connected
        if ((!this.connected && message.type !== 'CONNECT') || !this.port) {
            console.warn('SharedWorker not connected. Message not sent:', message);
            return false;
        }

        try {
            this.port.postMessage(message);
            return true;
        } catch (error) {
            console.error('Failed to send message to SharedWorker:', error);
            this.handleConnectionError();
            return false;
        }
    }

    /**
     * Handle incoming messages from shared worker
     */
    handleMessage(message) {
        const { type, store, data } = message;

        // Notify registered listeners for this store/type
        this.notifyListeners(type, data, store);
    }

    /**
     * Register a listener for specific store updates
     */
    on(type, callback, store = null) {
        const key = store ? `${store}:${type}` : type;

        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Notify all listeners for a given type/store
     */
    notifyListeners(type, data, store = null) {
        // Notify specific store listeners
        if (store) {
            const storeKey = `${store}:${type}`;
            const storeListeners = this.listeners.get(storeKey);
            if (storeListeners) {
                storeListeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('Error in SharedWorker listener:', error);
                    }
                });
            }
        }

        // Notify global listeners for this type
        const globalListeners = this.listeners.get(type);
        if (globalListeners) {
            globalListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in SharedWorker listener:', error);
                }
            });
        }
    }

    /**
     * Broadcast a state update to all tabs
     */
    broadcastStateUpdate(store, state) {
        return this.send({
            type: 'STATE_UPDATE',
            store,
            data: state,
            timestamp: Date.now()
        });
    }

    /**
     * Request current state from worker
     */
    requestState(store) {
        return this.send({
            type: 'REQUEST_STATE',
            store,
            timestamp: Date.now()
        });
    }

    /**
     * Close the connection
     */
    close() {
        if (this.port) {
            this.port.close();
        }
        this.connected = false;
        this.listeners.clear();
    }
}

// Singleton instance
let bridgeInstance = null;

/**
 * Get or create the SharedWorker bridge instance
 */
export function getSharedWorkerBridge() {
    if (!bridgeInstance) {
        bridgeInstance = new SharedWorkerBridge();
    }
    return bridgeInstance;
}

/**
 * Initialize the shared worker bridge
 */
export async function initSharedWorker() {
    const bridge = getSharedWorkerBridge();
    return await bridge.init();
}

/**
 * Check if SharedWorker is connected
 */
export function isSharedWorkerConnected() {
    return bridgeInstance && bridgeInstance.connected;
}
