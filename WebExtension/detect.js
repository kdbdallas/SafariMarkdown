// Runs on every page. Kept tiny on purpose: it only decides whether the page is a
// Markdown file that Safari is showing as plain text. The renderer and its
// libraries are injected by background.js only when this check passes.
(() => {
    const MARKDOWN_TYPES = new Set([
        "text/markdown",
        "text/x-markdown",
        "text/x-gfm",
        "text/vnd.daringfireball.markdown",
    ]);
    const MARKDOWN_EXTENSION = /\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext|rmd)$/i;

    const contentType = (document.contentType || "").toLowerCase();

    let path = location.pathname;
    try {
        path = decodeURIComponent(path);
    } catch {
        // Malformed escape sequence; test the raw path instead.
    }

    const isMarkdown =
        MARKDOWN_TYPES.has(contentType) ||
        (contentType === "text/plain" && MARKDOWN_EXTENSION.test(path));
    if (!isMarkdown) return;

    // Safari displays a plain-text document as a single <pre> inside <body>.
    const body = document.body;
    const pre = body && body.children.length === 1 ? body.firstElementChild : null;
    if (!pre || pre.tagName !== "PRE") return;

    // Hide the raw text while the renderer loads to avoid a flash of Markdown source.
    pre.style.visibility = "hidden";
    const reveal = () => {
        pre.style.visibility = "";
    };

    browser.runtime
        .sendMessage({ type: "markdown-viewer:render" })
        .then((response) => {
            if (!response || !response.ok) reveal();
        })
        .catch((error) => {
            console.error("[Markdown Viewer] Could not render page:", error);
            reveal();
        });
})();
