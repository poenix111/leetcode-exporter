/* ============================================================
   LeetCode to PDF — Content Script
   Extracts problem description and code solution, triggers print-to-PDF
   ============================================================ */

(function () {
  "use strict";

  const BTN_ID = "leetcode-pdf-export-btn";

  // Clean up any previously injected button so updates always bind the latest version
  const oldBtn = document.getElementById(BTN_ID);
  if (oldBtn) oldBtn.remove();

  /* ---- Selectors (Ordered by reliability on modern LeetCode) ---- */
  const DESCRIPTION_SELECTORS = [
    '[data-track-load="description_content"]', // Modern LeetCode
    '[data-cy="question-content"]',
    ".elfjS",
    'div[class*="description"] [class*="content"]',
    'div[class*="question-content"]',
  ];

  const TITLE_SELECTORS = [
    'a[href*="/problems/"][class*="no-underline"]',
    'div[class*="text-title-large"]',
    '.text-title-large',
    'a[href^="/problems/"]',
    '[data-cy="question-title"]',
  ];

  const DIFFICULTY_SELECTORS = [
    '[class*="text-difficulty-"]',
    '[class*="text-easy"]',
    '[class*="text-olive"]',
    '[class*="text-medium"]',
    '[class*="text-yellow"]',
    '[class*="text-hard"]',
    '[class*="text-pink"]',
    'span[class*="difficulty"]',
    'div[class*="difficulty"]',
  ];

  /* ---- Language and File Mapping ---- */
  const LANG_MAP = {
    "cpp": { name: "C++", ext: ".cpp", hljs: "cpp" },
    "c++": { name: "C++", ext: ".cpp", hljs: "cpp" },
    "java": { name: "Java", ext: ".java", hljs: "java" },
    "python": { name: "Python", ext: ".py", hljs: "python" },
    "python3": { name: "Python3", ext: ".py", hljs: "python" },
    "c": { name: "C", ext: ".c", hljs: "c" },
    "csharp": { name: "C#", ext: ".cs", hljs: "csharp" },
    "c#": { name: "C#", ext: ".cs", hljs: "csharp" },
    "javascript": { name: "JavaScript", ext: ".js", hljs: "javascript" },
    "typescript": { name: "TypeScript", ext: ".ts", hljs: "typescript" },
    "php": { name: "PHP", ext: ".php", hljs: "php" },
    "swift": { name: "Swift", ext: ".swift", hljs: "swift" },
    "kotlin": { name: "Kotlin", ext: ".kt", hljs: "kotlin" },
    "dart": { name: "Dart", ext: ".dart", hljs: "dart" },
    "golang": { name: "Go", ext: ".go", hljs: "go" },
    "go": { name: "Go", ext: ".go", hljs: "go" },
    "ruby": { name: "Ruby", ext: ".rb", hljs: "ruby" },
    "scala": { name: "Scala", ext: ".scala", hljs: "scala" },
    "rust": { name: "Rust", ext: ".rs", hljs: "rust" },
    "racket": { name: "Racket", ext: ".rkt", hljs: "scheme" },
    "erlang": { name: "Erlang", ext: ".erl", hljs: "erlang" },
    "elixir": { name: "Elixir", ext: ".ex", hljs: "elixir" },
    "sql": { name: "SQL", ext: ".sql", hljs: "sql" },
    "mysql": { name: "MySQL", ext: ".sql", hljs: "sql" },
    "mssql": { name: "MS SQL Server", ext: ".sql", hljs: "sql" },
    "oraclesql": { name: "Oracle SQL", ext: ".sql", hljs: "sql" },
    "postgresql": { name: "PostgreSQL", ext: ".sql", hljs: "sql" },
    "pythondata": { name: "Pandas", ext: ".py", hljs: "python" },
  };

  /* ---- Helpers ---- */

  function queryFirst(selectors, root = document) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function getProblemSlug() {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const probIndex = pathParts.indexOf("problems");
    if (probIndex !== -1 && pathParts[probIndex + 1]) {
      return pathParts[probIndex + 1];
    }
    return "leetcode-solution";
  }

  function resolveLanguageInfo(rawLang) {
    if (!rawLang) return { name: "Code", ext: ".txt", hljs: "plaintext" };
    const clean = rawLang.toLowerCase().replace(/\s+/g, "");
    return LANG_MAP[clean] || { name: rawLang, ext: ".txt", hljs: clean };
  }

  function detectLanguageFromDOM(editorEl) {
    if (editorEl) {
      const ta = editorEl.querySelector("textarea.inputarea");
      const mode = ta?.getAttribute("data-mode-id");
      if (mode && LANG_MAP[mode.toLowerCase()]) {
        return LANG_MAP[mode.toLowerCase()];
      }
    }

    const buttons = Array.from(
      document.querySelectorAll("button, [role='button']")
    );
    for (const btn of buttons) {
      const text = btn.innerText?.trim();
      if (text) {
        const key = text.toLowerCase().replace(/\s+/g, "");
        if (LANG_MAP[key]) return LANG_MAP[key];
      }
    }

    return { name: "Code", ext: ".txt", hljs: "plaintext" };
  }

  function ensureMainWorldBridge() {
    if (document.documentElement.getAttribute("data-leetcode-pdf-ready") === "1") {
      return;
    }
    try {
      if (chrome?.runtime?.getURL) {
        const existing = document.getElementById("leetcode-pdf-main-bridge");
        if (!existing) {
          const script = document.createElement("script");
          script.id = "leetcode-pdf-main-bridge";
          script.src = chrome.runtime.getURL("main-world.js");
          (document.head || document.documentElement).appendChild(script);
        }
      }
    } catch (_) {}
  }

  function fetchCodeFromMainWorld() {
    ensureMainWorldBridge();
    try {
      document.documentElement.removeAttribute("data-leetcode-pdf-code");
      window.dispatchEvent(new CustomEvent("LEETCODE_PDF_REQ_CODE"));
      const raw = document.documentElement.getAttribute("data-leetcode-pdf-code");
      document.documentElement.removeAttribute("data-leetcode-pdf-code");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.code === "string" && parsed.code.trim().length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  }

  function extractCodeFromDOM() {
    const editors = Array.from(document.querySelectorAll(".monaco-editor"));
    if (editors.length === 0) return null;

    // Filter candidate editor that is not console/testcase
    let mainEditor = editors.find((ed) => {
      const isConsole = ed.closest(
        '[class*="console"], [class*="testcase"], [class*="test-result"]'
      );
      const ta = ed.querySelector("textarea.inputarea");
      const mode = ta?.getAttribute("data-mode-id");
      return !isConsole && mode && mode !== "plaintext";
    });

    if (!mainEditor) {
      let maxArea = 0;
      for (const ed of editors) {
        const rect = ed.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea) {
          maxArea = area;
          mainEditor = ed;
        }
      }
    }

    if (!mainEditor) return null;

    const lang = detectLanguageFromDOM(mainEditor);
    const viewLines = mainEditor.querySelector(".view-lines");
    let code = "";

    if (viewLines) {
      const lines = Array.from(viewLines.querySelectorAll(".view-line"));
      // Sort lines by vertical position because Monaco recycles DOM elements in arbitrary tree order
      lines.sort((a, b) => {
        const topA = parseFloat(a.style.top) || a.getBoundingClientRect().top || 0;
        const topB = parseFloat(b.style.top) || b.getBoundingClientRect().top || 0;
        return topA - topB;
      });

      code = lines
        .map((line) => line.textContent.replace(/\u00a0/g, " "))
        .join("\n");
    }

    return { code, language: lang };
  }

  function getSolutionCode(options = {}) {
    // 1. If code was supplied via options (e.g. from popup)
    if (options?.editorData?.code && options.editorData.code.trim().length > 0) {
      const langInfo = resolveLanguageInfo(options.editorData.language);
      return { code: options.editorData.code, language: langInfo };
    }

    // 2. Query Monaco model directly via main-world bridge
    const mainWorldData = fetchCodeFromMainWorld();
    if (mainWorldData && mainWorldData.code && mainWorldData.code.trim().length > 0) {
      let langInfo = resolveLanguageInfo(mainWorldData.language);
      if (!langInfo || langInfo.hljs === "plaintext") {
        const domLang = detectLanguageFromDOM();
        if (domLang && domLang.hljs !== "plaintext") {
          langInfo = domLang;
        }
      }
      return { code: mainWorldData.code, language: langInfo };
    }

    // 3. Fallback: extract from Monaco DOM (with line order sorting)
    return extractCodeFromDOM();
  }

  function getRootDescriptionElement() {
    // 1. Try standard selectors
    const standard = queryFirst(DESCRIPTION_SELECTORS);
    if (standard) return standard;

    // 2. Look for element with data-track-load containing description
    const trackEl = document.querySelector('[data-track-load*="description"]');
    if (trackEl) return trackEl;

    // 3. Fallback: Find container that has problem text (Example, Constraints, etc.)
    const candidates = document.querySelectorAll("div");
    for (const div of candidates) {
      const text = div.innerText || "";
      if (
        text.length > 150 &&
        text.length < 20000 &&
        text.includes("Example") &&
        text.includes("Constraints") &&
        div.children.length >= 1
      ) {
        return div;
      }
    }
    return null;
  }

  function extractTitle(descRoot) {
    // 1. Search inside description container first
    if (descRoot) {
      const scopedTitle = queryFirst(TITLE_SELECTORS, descRoot);
      if (scopedTitle && scopedTitle.innerText.trim()) {
        return scopedTitle.innerText.trim();
      }
    }

    // 2. Global search
    const globalTitle = queryFirst(TITLE_SELECTORS);
    if (globalTitle && globalTitle.innerText.trim()) {
      return globalTitle.innerText.trim();
    }

    // 3. Document title fallback: "83. Remove Duplicates from Sorted List - LeetCode"
    if (document.title) {
      const clean = document.title
        .replace(/\s*[-–—|]\s*LeetCode.*$/i, "")
        .trim();
      if (clean) return clean;
    }

    // 4. URL fallback
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const probIndex = pathParts.indexOf("problems");
    if (probIndex !== -1 && pathParts[probIndex + 1]) {
      return pathParts[probIndex + 1]
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    return "LeetCode Problem";
  }

  function extractDifficulty(descRoot) {
    const colors = {
      Easy: { color: "#00b8a3", bg: "#e6f8f5" },
      Medium: { color: "#ffc01e", bg: "#fff9e6" },
      Hard: { color: "#ff375f", bg: "#ffebee" },
    };

    // 1. Search by difficulty selector
    const el = descRoot
      ? queryFirst(DIFFICULTY_SELECTORS, descRoot) ||
        queryFirst(DIFFICULTY_SELECTORS)
      : queryFirst(DIFFICULTY_SELECTORS);

    if (el) {
      const text = el.innerText.trim();
      for (const [key, val] of Object.entries(colors)) {
        if (text.includes(key)) {
          return { text: key, ...val };
        }
      }
    }

    // 2. Scan all small text nodes for Easy/Medium/Hard
    const root = descRoot || document;
    const elements = root.querySelectorAll("span, div, p");
    for (const node of elements) {
      const text = node.innerText?.trim();
      if (colors[text] && node.children.length === 0) {
        return { text, ...colors[text] };
      }
    }

    return { text: "", color: "#888", bg: "#f0f0f0" };
  }

  function extractDescriptionHTML(descRoot) {
    if (!descRoot) return null;

    const clone = descRoot.cloneNode(true);

    // Remove the first child if it contains the problem title / difficulty badge
    if (clone.children.length > 0) {
      const firstChild = clone.children[0];
      const hasTitleOrProbLink =
        firstChild.querySelector('a[href*="/problems/"]') ||
        firstChild.querySelector('[class*="text-title"]') ||
        (firstChild.innerText && /^\d+\.\s+/.test(firstChild.innerText.trim()));

      if (hasTitleOrProbLink) {
        firstChild.remove();
      }
    }

    // Remove interactive buttons ("Topics", "Companies", accordion toggles, etc.)
    clone.querySelectorAll("button").forEach((b) => b.remove());

    // Remove feedback links, subscription banners, and toolbars
    clone
      .querySelectorAll(
        '[class*="toolbar"], [class*="feedback"], [class*="subscribe"], [class*="reaction"]'
      )
      .forEach((el) => el.remove());

    // Remove bottom reaction bar (thumbs up/down counter, submission stats)
    Array.from(clone.querySelectorAll("div")).forEach((div) => {
      const text = div.innerText || "";
      if (text.includes("Accepted") && text.includes("Submissions")) {
        div.remove();
      } else if (
        div.querySelectorAll("svg").length >= 3 &&
        !text.includes("Example") &&
        !text.includes("Constraint")
      ) {
        div.remove();
      }
    });

    // Resolve relative URLs to absolute URLs so all diagrams render properly
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("http") && !src.startsWith("data:")) {
        img.src = new URL(src, window.location.origin).href;
      }
    });

    return clone.innerHTML;
  }

  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  function highlightCodeToHTML(code, hljsLang, showLineNumbers = true) {
    let highlighted = "";
    try {
      if (window.hljs) {
        if (hljsLang && window.hljs.getLanguage(hljsLang)) {
          highlighted = window.hljs.highlight(code, {
            language: hljsLang,
            ignoreIllegals: true,
          }).value;
        } else {
          highlighted = window.hljs.highlightAuto(code).value;
        }
      } else {
        highlighted = escapeHtml(code);
      }
    } catch (_) {
      highlighted = escapeHtml(code);
    }

    const rawLines = highlighted.split("\n");
    return rawLines
      .map((lineContent, index) => {
        const lineNum = index + 1;
        const lineHtml = lineContent || "&nbsp;";
        if (showLineNumbers) {
          return `<div class="code-line"><span class="code-line-number">${lineNum}</span><span class="code-line-code">${lineHtml}</span></div>`;
        } else {
          return `<div class="code-line"><span class="code-line-code">${lineHtml}</span></div>`;
        }
      })
      .join("");
  }

  function buildCodeSection(code, langInfo, options = {}) {
    const {
      includeCode = true,
      codeTheme = "github-light",
      showLineNumbers = true,
    } = options;

    if (!includeCode || !code || code.trim().length === 0) {
      return "";
    }

    const slug = getProblemSlug();
    const filename = `${slug}${langInfo.ext}`;
    const formattedCode = highlightCodeToHTML(
      code,
      langInfo.hljs,
      showLineNumbers
    );
    const themeObj =
      (window.CODE_THEMES && window.CODE_THEMES[codeTheme]) || {
        name: codeTheme,
      };

    return `
    <div class="code-section theme-${codeTheme}">
      <div class="code-section-header">
        <span>💻 Solution Code</span>
        <span class="code-section-meta">${langInfo.name} · ${themeObj.name || codeTheme}</span>
      </div>
      <div class="code-window">
        <div class="code-window-header">
          <div class="code-window-controls">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="code-window-title">${filename}</div>
          <div class="code-window-badge">${langInfo.name}</div>
        </div>
        <div class="code-body">
          ${formattedCode}
        </div>
      </div>
    </div>`;
  }

  function downloadCodeFile(code, filename) {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function handleDownloadCode(options = {}) {
    const sol = getSolutionCode(options);
    if (!sol || !sol.code || sol.code.trim().length === 0) {
      alert(
        "LeetCode to PDF:\n\n" +
          "Could not detect solution code from the editor.\n" +
          "Please ensure the code editor is open with code present."
      );
      return false;
    }

    const slug = getProblemSlug();
    const filename = `${slug}${sol.language.ext}`;
    downloadCodeFile(sol.code, filename);
    showToast(`Downloaded ${filename}! 💾`);
    return true;
  }

  function showToast(message) {
    const existing = document.getElementById("leetcode-pdf-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "leetcode-pdf-toast";
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2800);
  }

  /* ---- Print Template Builder ---- */

  function buildPrintDocument(
    title,
    difficulty,
    descriptionHTML,
    solutionData,
    options = {}
  ) {
    const { includeImages = true, includeHandwritingSpace = true } = options;

    const diffBadge = difficulty.text
      ? `<span class="difficulty-badge" style="color:${difficulty.color}; border: 1px solid ${difficulty.color};">${difficulty.text}</span>`
      : "";

    const imageRule = includeImages
      ? ""
      : "img, svg { display: none !important; }";

    const codeSection =
      solutionData && solutionData.code
        ? buildCodeSection(solutionData.code, solutionData.language, options)
        : "";

    const handwritingSection = includeHandwritingSpace
      ? `
      <div class="handwriting-section">
        <div class="handwriting-title">
          <span>✍️ Solution &amp; Notes</span>
          <span class="handwriting-sub">Space for approach, edge cases, and code</span>
        </div>
        <div class="grid-sheet"></div>
      </div>`
      : "";

    const problemUrl = window.location.href;
    const themesCSS = window.getAllThemesCSS ? window.getAllThemesCSS() : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — LeetCode</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #262626;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }

    .problem-header {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
      break-inside: avoid;
      page-break-inside: avoid;
      break-after: avoid;
      page-break-after: avoid;
    }

    .problem-header h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
      margin-bottom: 8px;
    }

    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      page-break-after: avoid;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 9pt;
      color: #6b7280;
    }

    .difficulty-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    .problem-url {
      color: #6b7280;
      text-decoration: none;
      word-break: break-all;
    }

    .description-content {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #374151;
    }

    .description-content p {
      margin-bottom: 10px;
    }

    .description-content strong, .description-content b {
      font-weight: 700;
      color: #111827;
    }

    .description-content code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 9.5pt;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 1.5px 5px;
      color: #1f2937;
    }

    .description-content pre {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 9.5pt;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 14px;
      margin: 12px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      break-inside: avoid;
      page-break-inside: avoid;
      color: #1f2937;
    }

    .description-content pre code {
      background: transparent;
      border: none;
      padding: 0;
    }

    .description-content ul, .description-content ol {
      margin: 8px 0 12px 24px;
    }

    .description-content li {
      margin-bottom: 4px;
    }

    .description-content img {
      max-width: 100%;
      height: auto;
      margin: 10px 0;
      display: block;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .description-content svg {
      max-width: 100%;
      height: auto;
    }

    /* ---- Code Section Styles ---- */
    .code-section {
      margin-top: 22px;
      margin-bottom: 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .code-section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 4px;
      margin-bottom: 10px;
      break-after: avoid;
      page-break-after: avoid;
    }

    .code-section-header span:first-child {
      font-size: 12pt;
      font-weight: 700;
      color: #111827;
    }

    .code-section-meta {
      font-size: 8.5pt;
      font-weight: 500;
      color: #6b7280;
    }

    .code-window {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      font-family: "JetBrains Mono", Consolas, "SFMono-Regular", Menlo, Monaco, monospace;
      font-size: 9.2pt;
      line-height: 1.55;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      break-inside: avoid;
      page-break-inside: avoid;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    .code-window-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
      border-top-left-radius: 7px;
      border-top-right-radius: 7px;
      font-size: 8.5pt;
      user-select: none;
      break-after: avoid;
      page-break-after: avoid;
    }

    .code-window-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 50px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot-red { background: #ff5f56; border: 1px solid #e0443e; }
    .dot-yellow { background: #ffbd2e; border: 1px solid #dea123; }
    .dot-green { background: #27c93f; border: 1px solid #1aab29; }

    .code-window-title {
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    .code-window-badge {
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(125, 125, 125, 0.15);
    }

    .code-body {
      padding: 10px 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .code-line {
      display: flex;
      align-items: flex-start;
      min-height: 19px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .code-line-number {
      display: inline-block;
      min-width: 44px;
      max-width: 44px;
      padding-right: 12px;
      text-align: right;
      font-size: 8.5pt;
      border-right: 1px solid transparent;
      user-select: none;
      flex-shrink: 0;
    }

    .code-line-code {
      padding-left: 12px;
      padding-right: 12px;
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Handwriting section */
    .handwriting-section {
      margin-top: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .handwriting-title {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 4px;
      margin-bottom: 10px;
      break-after: avoid;
      page-break-after: avoid;
    }

    .handwriting-title span {
      font-size: 12pt;
      font-weight: 700;
      color: #111827;
    }

    .handwriting-sub {
      font-size: 8pt !important;
      font-weight: 400 !important;
      color: #9ca3af;
    }

    .grid-sheet {
      width: 100%;
      min-height: 380px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background-size: 20px 20px;
      background-image:
        linear-gradient(to right, rgba(209, 213, 219, 0.45) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(209, 213, 219, 0.45) 1px, transparent 1px);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Print media overrides */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .problem-header {
        break-inside: avoid;
        page-break-inside: avoid;
        break-after: avoid;
        page-break-after: avoid;
      }
      .grid-sheet {
        min-height: 380px;
      }
      .code-window {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        overflow: visible !important;
      }
      .code-body {
        overflow: visible !important;
      }
    }

    ${imageRule}

    ${themesCSS}
  </style>
</head>
<body>
  <div class="problem-header">
    <h1>${title}</h1>
    <div class="header-meta">
      ${diffBadge}
      <a class="problem-url" href="${problemUrl}">${problemUrl}</a>
    </div>
  </div>

  <div class="description-content">
    ${descriptionHTML}
  </div>

  ${codeSection}

  ${handwritingSection}
</body>
</html>`;
  }

  /* ---- Invisible iframe Print Driver ---- */

  function triggerIframePrint(html) {
    const existing = document.getElementById("leetcode-pdf-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "leetcode-pdf-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.style.zIndex = "-1";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    showToast("Preparing print dialog… 🖨️");

    const images = Array.from(doc.querySelectorAll("img"));
    let loadedCount = 0;
    let printed = false;

    function doPrint() {
      if (printed) return;
      printed = true;
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 250);
    }

    if (images.length === 0) {
      doPrint();
    } else {
      const timeout = setTimeout(doPrint, 2500);
      images.forEach((img) => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount >= images.length) {
            clearTimeout(timeout);
            doPrint();
          }
        } else {
          img.onload = img.onerror = () => {
            loadedCount++;
            if (loadedCount >= images.length) {
              clearTimeout(timeout);
              doPrint();
            }
          };
        }
      });
    }
  }

  /* ---- Main Export Logic ---- */

  function executeExport(options = null) {
    const descRoot = getRootDescriptionElement();
    if (!descRoot) {
      alert(
        "LeetCode to PDF:\n\n" +
          "Could not detect the problem description content.\n" +
          "Please ensure you are on the 'Description' tab of a LeetCode problem."
      );
      return;
    }

    const title = extractTitle(descRoot);
    const difficulty = extractDifficulty(descRoot);
    const html = extractDescriptionHTML(descRoot);

    if (!html || html.trim().length === 0) {
      alert(
        "LeetCode to PDF:\n\nDescription content is still loading. Please wait 2 seconds and try again."
      );
      return;
    }

    function proceed(finalOptions) {
      const solutionData = finalOptions.includeCode !== false
        ? getSolutionCode(finalOptions)
        : null;

      const fullDoc = buildPrintDocument(
        title,
        difficulty,
        html,
        solutionData,
        finalOptions
      );
      triggerIframePrint(fullDoc);
    }

    if (options) {
      proceed(options);
    } else {
      const defaults = {
        includeImages: true,
        includeHandwritingSpace: true,
        includeCode: true,
        codeTheme: "github-light",
        showLineNumbers: true,
      };
      try {
        const storage = chrome?.storage?.sync || chrome?.storage?.local;
        if (storage) {
          storage.get(defaults, (data) => proceed(data || defaults));
        } else {
          proceed(defaults);
        }
      } catch (_) {
        proceed(defaults);
      }
    }
  }

  /* ---- Floating Button Injection ---- */

  function injectFloatingButton() {
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.title = "Export problem description and code solution to PDF";
    btn.setAttribute("aria-label", "Export problem to PDF");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="12" x2="12" y2="18"/>
        <polyline points="9 15 12 18 15 15"/>
      </svg>
      <span>Export PDF</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeExport();
    });

    document.body.appendChild(btn);
  }

  /* ---- Check readiness & inject ---- */

  function checkAndInject() {
    const desc = getRootDescriptionElement();
    if (desc) {
      injectFloatingButton();
    }
  }

  checkAndInject();

  const interval = setInterval(() => {
    checkAndInject();
  }, 1000);

  setTimeout(() => clearInterval(interval), 30000);

  const observer = new MutationObserver(() => {
    if (!document.getElementById(BTN_ID)) {
      checkAndInject();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  /* ---- Message listener from extension popup ---- */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "ping") {
      const isReady = !!getRootDescriptionElement();
      sendResponse({ ok: true, ready: isReady });
    } else if (msg.action === "exportPDF") {
      executeExport(msg.options);
      sendResponse({ ok: true });
    } else if (msg.action === "downloadCode") {
      const success = handleDownloadCode(msg.options);
      sendResponse({ ok: success });
    }
    return true;
  });
})();
