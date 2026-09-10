/* ============================================================
   LeetCode to PDF — Popup Script
   ============================================================ */

(function () {
  "use strict";

  const btnExport = document.getElementById("btn-export");
  const statusBar = document.getElementById("status-bar");
  const statusText = document.getElementById("status-text");
  const optHandwriting = document.getElementById("opt-handwriting");
  const optImages = document.getElementById("opt-images");

  const storage = chrome?.storage?.sync || chrome?.storage?.local;

  /* ---- Load saved settings ---- */
  if (storage) {
    storage.get(
      { includeImages: true, includeHandwritingSpace: true },
      (settings) => {
        if (settings) {
          optHandwriting.checked = settings.includeHandwritingSpace !== false;
          optImages.checked = settings.includeImages !== false;
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
      });
    }
  }

  optHandwriting.addEventListener("change", saveSettings);
  optImages.addEventListener("change", saveSettings);

  function setStatus(type, text) {
    statusBar.className = "status-bar status-" + type;
    statusText.textContent = text;
  }

  /* ---- Ensure content script is injected in active tab ---- */
  function ensureContentScriptInjected(tabId, callback) {
    chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
      if (!chrome.runtime.lastError && response?.ok) {
        callback(true, response.ready);
      } else {
        // Content script not yet injected into this tab; inject via scripting API
        if (chrome.scripting) {
          chrome.scripting.insertCSS(
            { target: { tabId }, files: ["content-button.css"] },
            () => {
              chrome.scripting.executeScript(
                { target: { tabId }, files: ["content.js"] },
                () => {
                  if (chrome.runtime.lastError) {
                    callback(false, false);
                  } else {
                    // Retry ping
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
        return;
      }

      const isLeetCode =
        tab.url.includes("leetcode.com/problems/") ||
        tab.url.includes("leetcode.cn/problems/");

      if (!isLeetCode) {
        setStatus("error", "Open a LeetCode problem page");
        btnExport.disabled = true;
        return;
      }

      setStatus("checking", "Connecting to page…");

      ensureContentScriptInjected(tab.id, (injected, isReady) => {
        if (!injected) {
          setStatus("error", "Please reload the LeetCode tab");
          btnExport.disabled = true;
          return;
        }

        if (isReady) {
          setStatus("ready", "Ready to export! 📄");
          btnExport.disabled = false;
        } else {
          setStatus("checking", "Waiting for problem description…");
          btnExport.disabled = false; // Allow user to click anyway
        }
      });
    });
  }

  /* ---- Export Button ---- */
  btnExport.addEventListener("click", () => {
    saveSettings();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      btnExport.disabled = true;
      setStatus("checking", "Preparing print view…");

      const options = {
        includeHandwritingSpace: optHandwriting.checked,
        includeImages: optImages.checked,
      };

      ensureContentScriptInjected(tab.id, (injected) => {
        if (!injected) {
          setStatus("error", "Please refresh the LeetCode page");
          btnExport.disabled = false;
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          { action: "exportPDF", options },
          (response) => {
            if (chrome.runtime.lastError || !response?.ok) {
              setStatus("error", "Export failed. Please refresh the page.");
              btnExport.disabled = false;
            } else {
              setStatus("ready", "Print dialog opened! ✅");
              setTimeout(() => window.close(), 1000);
            }
          }
        );
      });
    });
  });

  checkCurrentTab();
})();
