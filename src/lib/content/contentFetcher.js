/**
 * Fetches and extracts the main content from a URL.
 * Used for background processing of saved articles.
 */
export async function fetchArticleContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove scripts, styles, and other non-content elements
        const toRemove = doc.querySelectorAll('nav, header, footer, script, style, noscript, iframe, .ad, .ads, .sidebar, .menu, .comments, .related');
        toRemove.forEach(el => el.remove());

        // Heuristics for content
        let content = "";
        const article = doc.querySelector("article");
        const main = doc.querySelector("main");
        const contentDiv = doc.querySelector("#content, .content, #main, .main, .post-content, .article-body, .entry-content");

        if (article) {
            content = article.innerText;
        } else if (main) {
            content = main.innerText;
        } else if (contentDiv) {
            content = contentDiv.innerText;
        } else {
            // Fallback to body
            content = doc.body.innerText;
        }

        // Clean up content
        content = content.replace(/\s+/g, " ").trim();

        // Limit content length (approx 20k chars)
        if (content.length > 20000) {
            content = content.substring(0, 20000) + "...";
        }

        return content;
    } catch (error) {
        console.error(`Error fetching article content for ${url}:`, error);
        return null;
    }
}
