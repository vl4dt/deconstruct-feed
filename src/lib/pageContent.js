export async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No active tab found");

    // Skip chrome:// and edge:// pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error("Cannot analyze browser system pages");
    }

    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Simple content extraction
                const title = document.title;
                const url = window.location.href;

                // Try to find the main content
                let content = "";

                // Heuristics for content
                const article = document.querySelector("article");
                const main = document.querySelector("main");
                const contentDiv = document.querySelector("#content, .content, #main, .main, .post-content, .article-body");

                if (article) {
                    content = article.innerText;
                } else if (main) {
                    content = main.innerText;
                } else if (contentDiv) {
                    content = contentDiv.innerText;
                } else {
                    // Fallback to body but try to exclude common non-content elements
                    const clone = document.body.cloneNode(true);
                    const toRemove = clone.querySelectorAll('nav, header, footer, script, style, noscript, iframe, .ad, .ads, .sidebar, .menu');
                    toRemove.forEach(el => el.remove());
                    content = clone.innerText;
                }

                // Clean up content (basic)
                content = content.replace(/\s+/g, " ").trim();

                // Limit content length to avoid token limits (approx 15k chars)
                if (content.length > 15000) {
                    content = content.substring(0, 15000) + "...";
                }

                return { title, url, content };
            }
        });

        if (result && result[0] && result[0].result) {
            return result[0].result;
        }
        throw new Error("Failed to extract content");
    } catch (e) {
        console.error("Script execution failed:", e);
        throw new Error("Could not access page content. Try refreshing the page.");
    }
}
