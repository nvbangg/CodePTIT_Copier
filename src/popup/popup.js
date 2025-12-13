document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("id-separator-toggle");

  try {
    const result = await chrome.storage.sync.get({ useIdSeparator: false });
    toggle.checked = !!result.useIdSeparator;
  } catch {}

  toggle.addEventListener("change", async () => {
    try {
      await chrome.storage.sync.set({ useIdSeparator: toggle.checked });
    } catch {}
  });
});
