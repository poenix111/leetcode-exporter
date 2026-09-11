/* ============================================================
   LeetCode to PDF — Popup Script
   ============================================================ */

(function () {
  "use strict";

  const btnExport = document.getElementById("btn-export");
  const btnDownloadCode = document.getElementById("btn-download-code");
  const statusBar = document.getElementById("status-bar");
  const statusText = document.getElementById("status-text");

  const optHandwriting = document.getElementById("opt-handwriting");
  const optImages = document.getElementById("opt-images");
  const optCode = document.getElementById("opt-code");
  const codeConfigPanel = document.getElementById("code-config-panel");
  const selectTheme = document.getElementById("select-theme");
  const optLineNumbers = document.getElementById("opt-line-numbers");

  const storage = chrome?.storage?.sync || chrome?.storage?.local;

  /* ---- Load saved settings ---- */
  if (storage) {
    storage.get(
      {
        includeImages: true,
        includeHandwritingSpace: true,
        includeCode: true,
        codeTheme: "github-light",
        showLineNumbers: true,
      },
      (settings) => {
        if (settings) {
          optHandwriting.checked = settings.includeHandwritingSpace !== false;
          optImages.checked = settings.includeImages !== false;
          optCode.checked = settings.includeCode !== false;
          if (settings.codeTheme) {
            selectTheme.value = settings.codeTheme;
          }
          optLineNumbers.checked = settings.showLineNumbers !== false;
          codeConfigPanel.style.display = optCode.checked ? "flex" : "none";
        }
      }
    );
  }

  /* ---- Save settings on change ---- */
  function saveSettings() {
    if (storage) {
      storage.set({
        includeHandwritingSpace: optHandwriting.checked,
        includeImages: optImages.checked,
        includeCode: optCode.checked,
        codeTheme: selectTheme.value,
        showLineNumbers: optLineNumbers.checked,
      });
    }
  }

  optHandwriting.addEventListener("change", saveSettings);
  optImages.addEventListener("change", saveSettings);
  optCode.addEventListener("change", () => {
    codeConfigPanel.style.display = optCode.checked ? "flex" : "none";
    saveSettings();
  });
  selectTheme.addEventListener("change", saveSettings);
  optLineNumbers.addEventListener("change", saveSettings);

  function setStatus(type, text) {
    statusBar.className = "status-bar status-" + type;
    statusText.textContent = text;
  }

  /* ---- Extract code directly from Monaco's MAIN world model ---- */
  function fetchMainWorldCode(tabId, callback) {
    if (!chrome?.scripting?.executeScript) {
      callback(null);
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        func: () => {
          try {
            if (window.monaco && window.monaco.editor) {
              const models = window.monaco.editor.getModels();
              for (const m of models) {
                const lang = m.getLanguageId
                  ? m.getLanguageId()
                  : m.getModeId
                  ? m.getModeId()
                  : "";
                const val = m.getValue();
                const uriStr = m.uri ? m.uri.toString() : "";
                if (
                  lang &&
                  lang !== "plaintext" &&
                  !uriStr.includes("input") &&
                  val &&
                  val.trim().length > 0
                ) {
                  return { code: val, language: lang };
                }
              }
              if (models.length > 0) {
                const m = models[0];
                return {
                  code: m.getValue(),
                  language: m.getLanguageId
                    ? m.getLanguageId()
                    : m.getModeId
                    ? m.getModeId()
                    : "",
                };
              }
            }
          } catch (_) {}
          return null;
        },
      },
      (results) => {
        const data = results?.[0]?.result;
        callback(data || null);
      }
    );
  }

  /* ---- Ensure content script is injected in active tab ---- */
  function ensureContentScriptInjected(tabId, callback) {
    chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
      if (!chrome.runtime.lastError && response?.ok) {
        callback(true, response.ready);
      } else {
        if (chrome.scripting) {
          chrome.scripting.insertCSS(
            { target: { tabId }, files: ["content-button.css"] },
            () => {
              chrome.scripting.executeScript(
                {
                  target: { tabId },
                  files: ["highlight.min.js", "code-themes.js", "content.js"],
                },
                () => {
                  if (chrome.runtime.lastError) {
                    callback(false, false);
                  } else {
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tabId, { action: "ping" }, (res2) => {
                        callback(true, !!res2?.ready);
                      });
                    }, 250);
                  }
                }
              );
            }
          );
        } else {
          callback(false, false);
        }
      }
    });
  }

  /* ---- Status check ---- */
  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) {
        setStatus("error", "No active tab detected");
        btnExport.disabled = true;
        btnDownloadCode.disabled = true;
        return;
      }

      const isLeetCode =
        tab.url.includes("leetcode.com/problems/") ||
        tab.url.includes("leetcode.cn/problems/");

      if (!isLeetCode) {
        setStatus("error", "Open a LeetCode problem page");
        btnExport.disabled = true;
        btnDownloadCode.disabled = true;
        return;
      }

      setStatus("checking", "Connecting to page…");

      ensureContentScriptInjected(tab.id, (injected, isReady) => {
        if (!injected) {
          setStatus("error", "Please reload the LeetCode tab");
          btnExport.disabled = true;
          btnDownloadCode.disabled = true;
          return;
        }

        if (isReady) {
          setStatus("ready", "Ready to export! 📄💻");
          btnExport.disabled = false;
          btnDownloadCode.disabled = false;
        } else {
          setStatus("checking", "Waiting for problem description…");
          btnExport.disabled = false;
          btnDownloadCode.disabled = false;
        }
      });
    });
  }

  /* ---- Export to PDF Button ---- */
  btnExport.addEventListener("click", () => {
    saveSettings();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      btnExport.disabled = true;
      btnDownloadCode.disabled = true;
      setStatus("checking", "Preparing PDF view…");

      const options = {
        includeHandwritingSpace: optHandwriting.checked,
        includeImages: optImages.checked,
        includeCode: optCode.checked,
        codeTheme: selectTheme.value,
        showLineNumbers: optLineNumbers.checked,
      };

      ensureContentScriptInjected(tab.id, (injected) => {
        if (!injected) {
          setStatus("error", "Please refresh the LeetCode page");
          btnExport.disabled = false;
          btnDownloadCode.disabled = false;
          return;
        }

        fetchMainWorldCode(tab.id, (editorData) => {
          options.editorData = editorData;

          chrome.tabs.sendMessage(
            tab.id,
            { action: "exportPDF", options },
            (response) => {
              if (chrome.runtime.lastError || !response?.ok) {
                setStatus("error", "Export failed. Please refresh the page.");
                btnExport.disabled = false;
                btnDownloadCode.disabled = false;
              } else {
                setStatus("ready", "Print dialog opened! ✅");
                setTimeout(() => window.close(), 1000);
              }
            }
          );
        });
      });
    });
  });

  /* ---- Download Code File Button ---- */
  btnDownloadCode.addEventListener("click", () => {
    saveSettings();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      btnDownloadCode.disabled = true;
      setStatus("checking", "Extracting code solution…");

      ensureContentScriptInjected(tab.id, (injected) => {
        if (!injected) {
          setStatus("error", "Please refresh the LeetCode page");
          btnDownloadCode.disabled = false;
          return;
        }

        fetchMainWorldCode(tab.id, (editorData) => {
          chrome.tabs.sendMessage(
            tab.id,
            { action: "downloadCode", options: { editorData } },
            (response) => {
              if (chrome.runtime.lastError || !response?.ok) {
                setStatus("error", "Could not extract code. Is editor open?");
                btnDownloadCode.disabled = false;
              } else {
                setStatus("ready", "Code downloaded! 💾");
                setTimeout(() => {
                  btnDownloadCode.disabled = false;
                }, 1000);
              }
            }
          );
        });
      });
    });
  });

  checkCurrentTab();
})();
