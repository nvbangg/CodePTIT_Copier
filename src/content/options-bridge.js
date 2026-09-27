(() => {
  "use strict";

  const syncAll = (data) => {
    const docEl = document.documentElement;
    for (const [key, val] of Object.entries(data)) {
      if (docEl) docEl.dataset[key] = String(val);
      try {
        sessionStorage.setItem("ptit_" + key, String(val));
      } catch {}
    }
  };

  chrome.storage.sync.get(null).then((data) => syncAll(data || {}));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      const updated = {};
      for (const [key, change] of Object.entries(changes)) {
        updated[key] = change.newValue;
      }
      syncAll(updated);
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === "triggerDrlReview") {
      window.dispatchEvent(new CustomEvent("ptit-drl-trigger", { detail: msg }));
    }
  });

  window.addEventListener("ptit-drl-stat", (event) => {
    chrome.runtime.sendMessage({
      action: "drlStatUpdate",
      ...event.detail
    }).catch(() => {});
  });
})();
