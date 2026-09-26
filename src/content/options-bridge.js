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
})();
