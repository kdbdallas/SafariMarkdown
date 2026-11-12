// Replaces Safari's plain-text view of a Markdown file with rendered HTML.
// Injected by background.js after marked, DOMPurify and highlight.js, which
// share this content-script world and are available as globals.
(() => {
    if (window.__markdownViewerRendered) return;
    window.__markdownViewerRendered = true;

    const pre = document.body && document.body.querySelector(":scope > pre");
    if (!pre) return;

    try {
        render(pre);
    } catch (error) {
        console.error("[Markdown Viewer] Rendering failed:", error);
        document.body.classList.remove("mdv-body", "mdv-show-raw");
        pre.style.visibility = "";
    }

    function render(pre) {
        const source = pre.textContent;
        const { frontMatter, markdown } = splitFrontMatter(source);

        const html = marked.parse(markdown, { gfm: true, breaks: false });
        const content = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });

        const article = document.createElement("article");
        article.className = "markdown-body mdv-article";
        if (frontMatter !== null) article.appendChild(frontMatterBlock(frontMatter));
        article.appendChild(content);

        addHeadingAnchors(article);
        highlightCode(article);
        markExternalLinks(article);

        ensureMeta("viewport", "width=device-width, initial-scale=1");
        ensureMeta("color-scheme", "light dark");

        pre.classList.add("mdv-raw");
        pre.style.visibility = "";
        document.body.classList.add("mdv-body");
        document.body.insertBefore(article, pre);
        document.body.insertBefore(toolbar(), article);

        setTitle(article);
        scrollToHash();
    }

    // YAML front matter ("---" ... "---" at the top of the file) is common in
    // docs sites; show it as a collapsed block instead of a stray <hr> and text.
    function splitFrontMatter(source) {
        const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(source);
        if (!match) return { frontMatter: null, markdown: source };
        return { frontMatter: match[1], markdown: source.slice(match[0].length) };
    }

    function frontMatterBlock(yaml) {
        const details = document.createElement("details");
        details.className = "mdv-front-matter";
        const summary = document.createElement("summary");
        summary.textContent = "Front matter";
        const block = document.createElement("pre");
        const code = document.createElement("code");
        code.className = "language-yaml";
        code.textContent = yaml;
        block.appendChild(code);
        details.append(summary, block);
        return details;
    }

    // GitHub-style heading ids so in-page links like [Install](#install) work.
    function addHeadingAnchors(root) {
        const used = new Map();
        for (const heading of root.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
            const base = slugify(heading.textContent) || "section";
            const count = used.get(base) || 0;
            used.set(base, count + 1);
            const id = count === 0 ? base : `${base}-${count}`;
            heading.id = id;

            const anchor = document.createElement("a");
            anchor.className = "mdv-anchor";
            anchor.href = `#${encodeURIComponent(id)}`;
            anchor.setAttribute("aria-label", `Link to this section: ${heading.textContent}`);
            anchor.textContent = "#";
            heading.prepend(anchor);
        }
    }

    function slugify(text) {
        return text
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s_-]/gu, "")
            .replace(/\s/g, "-");
    }

    function highlightCode(root) {
        hljs.configure({ ignoreUnescapedHTML: true });
        for (const code of root.querySelectorAll("pre > code")) {
            const languageClass = [...code.classList].find((c) => c.startsWith("language-"));
            const language = languageClass && languageClass.slice("language-".length);
            if (language && hljs.getLanguage(language)) {
                hljs.highlightElement(code);
            }
        }
    }

    function markExternalLinks(root) {
        for (const link of root.querySelectorAll("a[href]")) {
            let url;
            try {
                url = new URL(link.getAttribute("href"), location.href);
            } catch {
                continue;
            }
            if (url.origin !== location.origin) link.rel = "noopener noreferrer";
        }
    }

    function ensureMeta(name, content) {
        if (document.head.querySelector(`meta[name="${name}"]`)) return;
        const meta = document.createElement("meta");
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
    }

    function toolbar() {
        const bar = document.createElement("div");
        bar.className = "mdv-toolbar";
        const button = document.createElement("button");
        button.type = "button";
        const sync = () => {
            const raw = document.body.classList.contains("mdv-show-raw");
            button.textContent = raw ? "Rendered" : "Raw";
            button.title = raw ? "Show rendered Markdown" : "Show Markdown source";
        };
        button.addEventListener("click", () => {
            document.body.classList.toggle("mdv-show-raw");
            sync();
        });
        sync();
        bar.appendChild(button);
        return bar;
    }

    function setTitle(article) {
        const h1 = article.querySelector("h1");
        const fileName = decodeSafely(location.pathname.split("/").pop() || "");
        const heading = h1 ? h1.textContent.replace(/^#/, "").trim() : "";
        if (heading) document.title = fileName ? `${heading} \u2013 ${fileName}` : heading;
        else if (fileName) document.title = fileName;
    }

    function scrollToHash() {
        if (!location.hash) return;
        const id = decodeSafely(location.hash.slice(1));
        const target = document.getElementById(id);
        if (target) target.scrollIntoView();
    }

    function decodeSafely(value) {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }
})();
