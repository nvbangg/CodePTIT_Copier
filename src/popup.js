document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("underscore-toggle");

  try {
    const result = await chrome.storage.sync.get({ useUnderscore: false });
    toggle.checked = !!result.useUnderscore;
  } catch {}

  toggle.addEventListener("change", async () => {
    try {
      await chrome.storage.sync.set({ useUnderscore: toggle.checked });
    } catch {}
  });
});
