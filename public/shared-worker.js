/**
 * Shared Worker for Cross-Tab State Synchronization
 * 
 * This worker maintains a single source of truth for application state
 * and broadcasts updates to all connected tabs.
 */

// Track all connected ports (tabs)
const ports = new Set();

// Shared state cache
const sharedState = {
    settings: null,
    savedItems: null,
    subscription: null,
    theme: null
};

// Connection counter for debugging
let connectionCount = 0;

/**
 * Handle new tab connections
 */
self.onconnect = function (event) {
    const port = event.ports[0];
    connectionCount++;

    console.log(`[SharedWorker] New connection (${connectionCount} total connections)`);

    ports.add(port);

    // Send current state to new connection
    if (sharedState.settings) {
        port.postMessage({
            type: 'STATE_UPDATE',
            store: 'settings',
            data: sharedState.settings
        });
    }

    if (sharedState.savedItems) {
        port.postMessage({
            type: 'STATE_UPDATE',
            store: 'savedItems',
            data: sharedState.savedItems
        });
    }

    if (sharedState.subscription) {
        port.postMessage({
            type: 'STATE_UPDATE',
            store: 'subscription',
            data: sharedState.subscription
        });
    }

    if (sharedState.theme) {
        port.postMessage({
            type: 'STATE_UPDATE',
            store: 'theme',
            data: sharedState.theme
        });
    }

    // Set up message handler for this port
    port.onmessage = function (event) {
        handleMessage(event.data, port);
    };

    // Clean up on disconnect
    port.onclose = function () {
        ports.delete(port);
        connectionCount--;
        console.log(`[SharedWorker] Connection closed (${connectionCount} remaining)`);
    };

    // Start the port
    port.start();
};

/**
 * Handle incoming messages from tabs
 */
function handleMessage(message, senderPort) {
    const { type, store, data, tabId } = message;

    switch (type) {
        case 'CONNECT':
            // Acknowledge connection
            senderPort.postMessage({
                type: 'CONNECTED',
                data: { tabId, connectionCount }
            });
            break;

        case 'STATE_UPDATE':
            // Update shared state
            if (store && data !== undefined) {
                sharedState[store] = data;

                // Broadcast to all other tabs (except sender)
                broadcastToOthers(
                    {
                        type: 'STATE_UPDATE',
                        store,
                        data,
                        timestamp: Date.now()
                    },
                    senderPort
                );
            }
            break;

        case 'REQUEST_STATE':
            // Send current state for requested store
            if (store && sharedState[store]) {
                senderPort.postMessage({
                    type: 'STATE_UPDATE',
                    store,
                    data: sharedState[store],
                    timestamp: Date.now()
                });
            } else {
                senderPort.postMessage({
                    type: 'STATE_NOT_FOUND',
                    store,
                    timestamp: Date.now()
                });
            }
            break;

        case 'PING':
            // Health check
            senderPort.postMessage({
                type: 'PONG',
                timestamp: Date.now(),
                connectionCount
            });
            break;

        default:
            console.warn('[SharedWorker] Unknown message type:', type);
    }
}

/**
 * Broadcast message to all connected tabs
 */
function broadcastToAll(message) {
    ports.forEach(port => {
        try {
            port.postMessage(message);
        } catch (error) {
            console.error('[SharedWorker] Error broadcasting message:', error);
            // Remove dead port
            ports.delete(port);
            connectionCount--;
        }
    });
}

/**
 * Broadcast message to all tabs except the sender
 */
function broadcastToOthers(message, senderPort) {
    ports.forEach(port => {
        if (port !== senderPort) {
            try {
                port.postMessage(message);
            } catch (error) {
                console.error('[SharedWorker] Error broadcasting message:', error);
                // Remove dead port
                ports.delete(port);
                connectionCount--;
            }
        }
    });
}

/**
 * Error handler
 */
self.onerror = function (error) {
    console.error('[SharedWorker] Error:', error);
};

console.log('[SharedWorker] Initialized and ready');
