import { initGradeCalculator } from "./grade-calculator.js";

const syncToggle = async (toggleId, storageKey, defaultValue = false) => {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;

  try {
    const data = await chrome.storage.sync.get({ [storageKey]: defaultValue });
    toggle.checked = Boolean(data[storageKey]);
  } catch {}

  toggle.addEventListener("change", () => {
    chrome.storage.sync.set({ [storageKey]: toggle.checked }).catch(() => {});
  });
};

document.addEventListener("DOMContentLoaded", () => {
  syncToggle("grades-toggle", "hideGrades");
  initGradeCalculator();
});
