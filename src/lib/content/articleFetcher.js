
export async function fetchArticleContent(url) {
    if (!url) return null;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch article: ${response.statusText}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        return extractContentFromDoc(doc, url);
    } catch (e) {
        console.error("Error fetching article content:", e);
        return null;
    }
}

function extractContentFromDoc(doc, url) {
    // 1. Remove clutter
    const clutterSelectors = [
        'nav', 'header', 'footer', 'script', 'style', 'noscript', 'iframe',
        '.ad', '.ads', '.sidebar', '.menu', '.cookie-banner', '.newsletter-signup',
        '[role="alert"]', '[role="banner"]', '[role="navigation"]'
    ];

    clutterSelectors.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => el.remove());
    });

    // 2. Try to find the main content container
    let content = "";

    // Priority selectors for article content
    const contentSelectors = [
        'article',
        '[itemprop="articleBody"]',
        '.article-body',
        '.post-content',
        '.story-body',
        '.entry-content',
        'main',
        '#content',
        '#main'
    ];

    for (const selector of contentSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
            // Check if it has enough text to be the main content
            if (element.innerText.length > 200) {
                content = element.innerText;
                break;
            }
        }
    }

    // 3. Fallback: Body text if no specific container found
    if (!content) {
        content = doc.body.innerText;
    }

    // 4. Clean up
    // Remove excessive whitespace
    content = content.replace(/\s+/g, " ").trim();

    // Limit length (approx 15k chars to stay within reasonable token limits)
    if (content.length > 15000) {
        content = content.substring(0, 15000) + "...";
    }

    return content;
}
