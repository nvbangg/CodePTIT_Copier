import { initGradeCalculator } from "./grade-calculator.js";

const DRL_TARGET_URL = "https://slink.ptit.edu.vn/lop-hanh-chinh#diem-ren-luyen";

const isDrlPageUrl = (url = "") =>
  url.startsWith("https://slink.ptit.edu.vn/lop-hanh-chinh") &&
  url.includes("diem-ren-luyen");

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

const initDrlPopup = async () => {
  const drlCard = document.getElementById("drl-card");
  const saveBtn = document.getElementById("drl-save-btn");
  const submitBtn = document.getElementById("drl-submit-btn");
  const statEl = document.getElementById("drl-stat");
  const unsubmittedToggle = document.getElementById("drl-unsubmitted-toggle");
  if (!saveBtn || !submitBtn) return;

  if (drlCard) {
    drlCard.open = localStorage.getItem("drlCardOpen") === "true";
    drlCard.addEventListener("toggle", () => {
      localStorage.setItem("drlCardOpen", drlCard.open);
    });
    drlCard.querySelector(".info-help")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === "drlStatUpdate" && statEl) {
      statEl.hidden = false;
      statEl.className = `drl-stat ${msg.isError ? "error" : msg.isDone ? "success" : ""}`;
      statEl.textContent = msg.message;

      if (msg.isDone) {
        saveBtn.disabled = false;
        submitBtn.disabled = false;
      }
    }
  });

  const triggerReview = async (submitDirectly) => {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!isDrlPageUrl(currentTab?.url)) {
      if (currentTab?.id) {
        await chrome.tabs.update(currentTab.id, { url: DRL_TARGET_URL });
      } else {
        await chrome.tabs.create({ url: DRL_TARGET_URL });
      }

      if (statEl) {
        statEl.hidden = false;
        statEl.className = "drl-stat";
        statEl.textContent = "Đang chuyển đến trang Điểm rèn luyện. Tải xong hãy nhấn lại nút!";
      }
      return;
    }

    if (
      submitDirectly &&
      !window.confirm("Bạn có chắc chắn muốn GỬI LUÔN điểm rèn luyện cho cả lớp? Điểm sau khi gửi sẽ không thể chỉnh sửa lại.")
    ) {
      return;
    }

    saveBtn.disabled = true;
    submitBtn.disabled = true;
    if (statEl) {
      statEl.hidden = false;
      statEl.className = "drl-stat";
      statEl.textContent = "Đang kết nối tới trang Slink...";
    }

    const includeUnsubmitted = Boolean(unsubmittedToggle?.checked);
    chrome.tabs.sendMessage(currentTab.id, {
      action: "triggerDrlReview",
      submitDirectly,
      includeUnsubmitted
    }).catch(() => {
      if (statEl) {
        statEl.className = "drl-stat error";
        statEl.textContent = "Không thể kết nối. Hãy thử tải lại trang Slink!";
      }
      saveBtn.disabled = false;
      submitBtn.disabled = false;
    });
  };

  saveBtn.addEventListener("click", () => triggerReview(false));
  submitBtn.addEventListener("click", () => triggerReview(true));
};

document.addEventListener("DOMContentLoaded", () => {
  syncToggle("grades-toggle", "hideGrades");
  syncToggle("drl-unsubmitted-toggle", "drlIncludeUnsubmitted", false);
  initDrlPopup();
  initGradeCalculator();
});
