
/**
 * RSS Parser Library
 * Handles parsing of RSS feeds in both Window (Popup) and Service Worker (Background) environments.
 */

// Main entry point
export async function parseFeed(xmlText, sourceNameOverride = null) {
    // Check if we are in a Service Worker environment
    const isServiceWorker = typeof window === 'undefined' || !window.DOMParser;

    if (isServiceWorker) {
        return await parseInOffscreen(xmlText, sourceNameOverride);
    } else {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        return parseRSSDocument(doc, sourceNameOverride);
    }
}

// Send to offscreen document for parsing
async function parseInOffscreen(xmlText, sourceNameOverride) {
    console.log('Parsing RSS in offscreen document...');

    // Ensure offscreen document exists (handled by background script mostly, but good to be safe)
    // Note: We assume the background script has already set up the offscreen document or will do so.
    // Direct communication with offscreen document via runtime.sendMessage

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'parse-rss',
            data: { xmlText, sourceNameOverride }
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Runtime error sending to offscreen:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (response && response.status === 'success') {
                resolve(response.data);
            } else {
                reject(new Error(response?.error || 'Unknown error parsing RSS in offscreen'));
            }
        });
    });
}

// Pure DOM logic - extracts articles from a parsed XML Document
export function parseRSSDocument(xml, sourceNameOverride = null) {
    // Extract channel-level defaults
    const channelTitle = xml.querySelector('channel > title')?.textContent?.trim();
    const channelLink = xml.querySelector('channel > link')?.textContent?.trim();

    const items = Array.from(xml.querySelectorAll('item'));
    return items.map(item => {
        // Extract article link first
        const articleLink = item.querySelector('link')?.textContent?.trim();

        // Try to extract source from the item itself
        let itemSource = null;

        // Method 1: Check for <source> tag
        const sourceTag = item.querySelector('source');
        if (sourceTag) {
            itemSource = sourceTag.textContent?.trim();
        }

        // Method 2: Extract from article link domain
        if (articleLink && !itemSource) {
            try {
                const linkUrl = new URL(articleLink);
                const hostname = linkUrl.hostname.replace('www.', '');
                const domainParts = hostname.split('.');
                if (domainParts.length >= 2) {
                    const mainDomain = domainParts[0];
                    itemSource = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
                }
            } catch (e) {
                // Invalid URL
            }
        }

        // Fallback
        const finalSource = sourceNameOverride || itemSource || channelTitle || 'Unknown Source';
        const finalSourceLink = articleLink || channelLink || '#';

        return {
            title: item.querySelector('title')?.textContent,
            link: articleLink,
            description: item.querySelector('description')?.textContent,
            pubDate: item.querySelector('pubDate')?.textContent,
            source: finalSource,
            sourceLink: finalSourceLink,
            guid: item.querySelector('guid')?.textContent || articleLink,
            image: extractImageFromItem(item)
        };
    });
}

function extractImageFromItem(item) {
    // Try 1: <enclosure> tag with image type
    const enclosure = item.querySelector('enclosure[type^="image"]');
    if (enclosure?.getAttribute('url')) {
        return enclosure.getAttribute('url');
    }

    // Try 2: <media:content> or <media:thumbnail>
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
