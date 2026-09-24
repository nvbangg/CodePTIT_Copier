(() => {
  "use strict";

  const syncToggle = async (toggleId, storageKey, defaultVal = false) => {
    const toggleEl = document.getElementById(toggleId);
    if (!toggleEl) return;

    try {
      const syncData = await chrome.storage.sync.get({ [storageKey]: defaultVal });
      toggleEl.checked = !!syncData[storageKey];
    } catch {}

    toggleEl.addEventListener("change", () => {
      chrome.storage.sync.set({ [storageKey]: toggleEl.checked }).catch(() => {});
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    syncToggle("tab-toggle", "useIdSeparator");
    syncToggle("grades-toggle", "hideGrades");
  });
})();
