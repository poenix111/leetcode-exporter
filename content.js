/* ============================================================
   LeetCode to PDF — Content Script
   Extracts problem description and triggers print-to-PDF
   ============================================================ */

(function () {
  "use strict";

  // Prevent multiple injections
  if (window.__LEETCODE_TO_PDF_INJECTED__) return;
  window.__LEETCODE_TO_PDF_INJECTED__ = true;

  const BTN_ID = "leetcode-pdf-export-btn";

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
      const clean = document.title.replace(/\s*[-–—|]\s*LeetCode.*$/i, "").trim();
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
      ? queryFirst(DIFFICULTY_SELECTORS, descRoot) || queryFirst(DIFFICULTY_SELECTORS)
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

    let targetEl = descRoot;

    // Modern LeetCode structure:
    // descRoot is [data-track-load="description_content"]
    // child 0 = Title + Badges + Topics/Companies
    // child 1 = The actual description content (problem statement, examples, constraints)
    if (descRoot.children.length >= 2 && descRoot.children[1].innerText?.length > 30) {
      targetEl = descRoot.children[1];
    }

    const clone = targetEl.cloneNode(true);

    // Remove buttons, toolbars, interactive tags, and ads
    const elementsToRemove = clone.querySelectorAll(
      'button, [class*="subscribe"], [class*="like"], [class*="share"], ' +
      '[class*="toolbar"], [class*="action"], [class*="feedback"], ' +
      '[class*="tag-container"], [data-state], [aria-haspopup]'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Resolve relative URLs to absolute URLs
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("http") && !src.startsWith("data:")) {
        img.src = new URL(src, window.location.origin).href;
      }
    });

    return clone.innerHTML;
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

  function buildPrintDocument(title, difficulty, descriptionHTML, options = {}) {
    const { includeImages = true, includeHandwritingSpace = true } = options;

    const diffBadge = difficulty.text
      ? `<span class="difficulty-badge" style="color:${difficulty.color}; border: 1px solid ${difficulty.color};">${difficulty.text}</span>`
      : "";

    const imageRule = includeImages
      ? ""
      : "img, svg { display: none !important; }";

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
    }

    .problem-header h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
      margin-bottom: 8px;
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
      page-break-inside: avoid;
    }

    .description-content svg {
      max-width: 100%;
      height: auto;
    }

    /* Handwriting section */
    .handwriting-section {
      margin-top: 24px;
      page-break-before: always;
    }

    .handwriting-title {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    .handwriting-title span {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
    }

    .handwriting-sub {
      font-size: 8.5pt !important;
      font-weight: 400 !important;
      color: #9ca3af;
    }

    .grid-sheet {
      width: 100%;
      min-height: 820px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background-size: 20px 20px;
      background-image:
        linear-gradient(to right, rgba(209, 213, 219, 0.45) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(209, 213, 219, 0.45) 1px, transparent 1px);
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .grid-sheet {
        min-height: 95vh;
      }
    }

    ${imageRule}
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

  ${handwritingSection}
</body>
</html>`;
  }

  /* ---- Invisible iframe Print Driver (Zero popup blocking / No CSP issues) ---- */

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

    // Wait for images to load, then trigger native print
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
      const timeout = setTimeout(doPrint, 2500); // 2.5s fallback
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
      alert("LeetCode to PDF:\n\nDescription content is still loading. Please wait 2 seconds and try again.");
      return;
    }

    function proceed(finalOptions) {
      const fullDoc = buildPrintDocument(title, difficulty, html, finalOptions);
      triggerIframePrint(fullDoc);
    }

    if (options) {
      proceed(options);
    } else {
      // Fetch settings with fallback
      const defaults = { includeImages: true, includeHandwritingSpace: true };
      try {
        if (chrome?.storage?.sync) {
          chrome.storage.sync.get(defaults, (data) => proceed(data || defaults));
        } else if (chrome?.storage?.local) {
          chrome.storage.local.get(defaults, (data) => proceed(data || defaults));
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
    btn.title = "Export problem description to clean PDF for handwriting";
    btn.setAttribute("aria-label", "Export problem description to PDF");
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

  // Run on load and periodically observe SPA changes
  checkAndInject();

  const interval = setInterval(() => {
    checkAndInject();
  }, 1000);

  // Stop polling after 30s to conserve resources, but observer keeps listening
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
    }
    return true;
  });
})();
