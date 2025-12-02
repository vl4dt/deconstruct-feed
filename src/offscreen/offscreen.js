import { parseRSSDocument } from '../lib/news/rssParser.js';

chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message, sender, sendResponse) {
    // Return true to indicate we will send a response asynchronously
    if (message.target !== 'offscreen') {
        return false;
    }

    if (message.type === 'parse-rss') {
        try {
            const { xmlText, sourceNameOverride } = message.data;
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML Parsing Error: ' + parserError.textContent);
            }

            const articles = parseRSSDocument(doc, sourceNameOverride);
            sendResponse({ status: 'success', data: articles });
        } catch (error) {
            console.error('Offscreen parsing error:', error);
            sendResponse({ status: 'error', error: error.message });
        }
        return true; // Keep channel open for async response
    }
}
