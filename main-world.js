/* ============================================================
   LeetCode to PDF — Main World Script
   Runs in the page context (MAIN world) to access window.monaco
   ============================================================ */

(function () {
  "use strict";

  // Mark that main-world bridge is ready
  document.documentElement.setAttribute("data-leetcode-pdf-ready", "1");

  function getMonacoCode() {
    if (typeof window === "undefined" || !window.monaco || !window.monaco.editor) {
      return null;
    }

    try {
      // 1. Prefer getEditors() to find the active/main solution editor
      if (typeof window.monaco.editor.getEditors === "function") {
        const editors = window.monaco.editor.getEditors();
        let bestEditor = null;
        let maxArea = 0;

        for (const ed of editors) {
          const dom = ed.getDomNode ? ed.getDomNode() : null;
          if (!dom) continue;

          // Exclude console / testcase / result panels
          const isConsole = dom.closest(
            '[class*="console"], [class*="testcase"], [class*="test-result"]'
          );
          if (isConsole) continue;

          const rect = dom.getBoundingClientRect();
          const area = rect.width * rect.height;
          const model = ed.getModel ? ed.getModel() : null;
          const lang = model
            ? (model.getLanguageId ? model.getLanguageId() : (model.getModeId ? model.getModeId() : ""))
            : "";

          // Prioritize non-plaintext editors with area > 0
          if (lang && lang !== "plaintext" && area > 0) {
            if (area > maxArea) {
              maxArea = area;
              bestEditor = ed;
            }
          }
        }

        if (bestEditor) {
          const m = bestEditor.getModel ? bestEditor.getModel() : null;
          const code = bestEditor.getValue ? bestEditor.getValue() : "";
          if (code && code.trim().length > 0) {
            return {
              code,
              language: m ? (m.getLanguageId ? m.getLanguageId() : (m.getModeId ? m.getModeId() : "")) : "",
            };
          }
        }

        // Fallback: any non-console editor with the largest area
        for (const ed of editors) {
          const dom = ed.getDomNode ? ed.getDomNode() : null;
          if (!dom) continue;
          const isConsole = dom.closest(
            '[class*="console"], [class*="testcase"], [class*="test-result"]'
          );
          if (isConsole) continue;

          const rect = dom.getBoundingClientRect();
          const area = rect.width * rect.height;
          if (area > maxArea) {
            maxArea = area;
            bestEditor = ed;
          }
        }

        if (bestEditor) {
          const m = bestEditor.getModel ? bestEditor.getModel() : null;
          const code = bestEditor.getValue ? bestEditor.getValue() : "";
          if (code && code.trim().length > 0) {
            return {
              code,
              language: m ? (m.getLanguageId ? m.getLanguageId() : (m.getModeId ? m.getModeId() : "")) : "",
            };
          }
        }
      }

      // 2. Fallback to getModels()
      if (typeof window.monaco.editor.getModels === "function") {
        const models = window.monaco.editor.getModels();
        for (const m of models) {
          const lang = m.getLanguageId ? m.getLanguageId() : (m.getModeId ? m.getModeId() : "");
          const val = m.getValue ? m.getValue() : "";
          const uriStr = m.uri ? m.uri.toString() : "";
          if (
            lang &&
            lang !== "plaintext" &&
            !uriStr.includes("input") &&
            !uriStr.includes("console") &&
            val &&
            val.trim().length > 0
          ) {
            return { code: val, language: lang };
          }
        }

        for (const m of models) {
          const val = m.getValue ? m.getValue() : "";
          if (val && val.trim().length > 0) {
            return {
              code: val,
              language: m.getLanguageId ? m.getLanguageId() : (m.getModeId ? m.getModeId() : ""),
            };
          }
        }
      }
    } catch (err) {
      console.warn("LeetCode to PDF: Error extracting Monaco code in MAIN world", err);
    }

    return null;
  }

  function handleRequest() {
    const data = getMonacoCode();
    try {
      document.documentElement.setAttribute(
        "data-leetcode-pdf-code",
        JSON.stringify(data || null)
      );
    } catch (_) {}
  }

  window.addEventListener("LEETCODE_PDF_REQ_CODE", handleRequest);
  document.addEventListener("LEETCODE_PDF_REQ_CODE", handleRequest);
})();
