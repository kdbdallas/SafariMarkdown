// Injects the Markdown renderer into a tab once detect.js has confirmed the page
// is a Markdown file. Loading the libraries on demand keeps them off every
// other page the user visits.

const STYLESHEETS = [
    "vendor/github-markdown.css",
    "vendor/highlight-github.css",
    "render.css",
];

const SCRIPTS = [
    "vendor/marked.min.js",
    "vendor/purify.min.js",
    "vendor/highlight.min.js",
    "render.js",
];

browser.runtime.onMessage.addListener((message, sender) => {
    if (!message || message.type !== "markdown-viewer:render" || !sender.tab) return;

    const target = { tabId: sender.tab.id };

    return (async () => {
        await browser.scripting.insertCSS({ target, files: STYLESHEETS });
        await browser.scripting.executeScript({ target, files: SCRIPTS });
        return { ok: true };
    })().catch((error) => {
        console.error("[Markdown Viewer] Injection failed:", error);
        return { ok: false, error: String(error) };
    });
});
