(function () {
  "use strict";

  // Element
  let titleEl = null;
  let tablesEls = [];
  let submitBtnEl = null;
  let fileInputEl = null;
  let submitHostEl = null;
  let actionHostEl = null;
  const BANNER_EL = ".username.container-fluid";

  let useIdSeparator = false;
  let pageType = null; // beta, classic, db, null
  const ICONS = {
    copy: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="rgba(30,144,255,.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h10a2 2 0 0 1 2 2v10"/><rect x="3" y="8" width="13" height="13" rx="2"/></svg>',
    vscode:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="#007ACC"><path d="M23.15 2.587L18.21.22a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>',
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const hasText = (el) => el?.textContent?.trim();
  const preventEvent = (e) => (e.preventDefault(), e.stopPropagation());

  const getPageType = () => {
    const { hostname, pathname } = location;
    if (hostname === "db.ptit.edu.vn" && /\/question-detail\/[A-Za-z0-9_]+/.test(pathname)) return "db";
    if (hostname === "code.ptit.edu.vn") {
      if (/\/beta\/problems\/[A-Za-z0-9_]+/.test(pathname)) return "beta";
      if (/\/student\/question\/[A-Za-z0-9_]+/.test(pathname)) return "classic";
    }
    return null;
  };

  // một vài bài có kí tự khoảng trắng đặc biệt
  const WHITESPACE = /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g;
  const getCellText = (cell) => cell.innerText.replace(WHITESPACE, " ").trimEnd();

  const getId = () => {
    const code = location.pathname.split("/").pop() || "";
    if (code.length > 15) return ""; // để không lấy id khi thực hành
    if (!useIdSeparator) return code;
    return code.replace(/([A-Za-z]+|\d+)/g, "_$1").slice(1);
  };

  const getExt = () => {
    const compilerText =
      pageType === "classic"
        ? $("#compiler")?.selectedOptions?.[0]?.textContent || ""
        : $(".compiler-container .ant-select-selection-item")?.textContent || "";
    const s = compilerText.toLowerCase();
    if (s.includes("py")) return ".py";
    if (s.includes("java")) return ".java";
    if (s.includes("c++") || s.includes("cpp")) return ".cpp";
    if (s.includes("c")) return ".c";
    return null;
  };

  // xóa dấu tiếng việt, xóa kí tự đặc biệt, in hoa chỉ chữ đầu mỗi từ, dùng gạch dưới để phân cách
  const formatTitle = (text) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]|đ|Đ/g, (m) => (m === "đ" ? "d" : m === "Đ" ? "D" : ""))
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .replace(/ /g, "_");

  const getTitleText = (withExt = true) => {
    if (!titleEl) return "";
    const code = getId();
    const fileName = [code, formatTitle(titleEl.textContent)].filter(Boolean).join("_");
    if (!withExt) return fileName;
    const ext = getExt();
    return ext ? `${fileName}${ext}` : fileName;
  };

  const getProblemData = () => {
    const name = getTitleText(false);
    if (!name) return null;
    const tests = [];
    tablesEls.forEach((t) => {
      t.querySelectorAll("tr:not(:first-child)").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (hasText(cells[0]) && hasText(cells[1])) {
          tests.push({
            input: getCellText(cells[0]),
            output: getCellText(cells[1]),
          });
        }
      });
    });
    return { name, url: location.href, tests };
  };

  const showStatus = (button) => {
    if (button.classList.contains("check")) return;
    button.classList.add("check");
    setTimeout(() => {
      button.classList.remove("check");
    }, 800);
  };

  const showAlert = (msg) => alert("❌ " + msg);

  const sendToCPH = async (data) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "sendToCPH",
        data,
      });
      return response?.success || false;
    } catch {
      return false;
    }
  };

  const addBtn = (className, html, onClick) => {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = html;
    btn.addEventListener("click", onClick);
    return btn;
  };

  const addCellBtn = (cell) => {
    if (!hasText(cell)) return;
    window.getComputedStyle(cell).position === "static" && (cell.style.position = "relative");
    const btn = addBtn("copy-btn", ICONS.copy, (e) => {
      preventEvent(e);
      navigator.clipboard.writeText(getCellText(cell));
      showStatus(e.currentTarget);
    });
    cell.appendChild(btn);
  };

  const addCellBtns = () => {
    tablesEls.forEach((t) => {
      // thay thẻ p bằng div để copy thuần cũng không lỗi dòng trống thừa
      const ps = t.querySelectorAll("tbody p");
      ps.forEach((p) => (p.outerHTML = `<div>${p.innerHTML}</div>`));

      t.querySelectorAll("tr:not(:first-child)").forEach((row) => {
        row.querySelectorAll("td").forEach(addCellBtn);
      });
    });
  };

  const addTitleBtn = () => {
    const btn = addBtn("title-copy-btn", ICONS.copy, (e) => {
      preventEvent(e);
      // trang DB chỉ xóa kí tự đặc biệt trong tiêu đề
      const text =
        pageType === "db" ? titleEl.textContent.trim().replace(/[\\/:*?"<>|]/g, "") + ".sql" : getTitleText(true);
      navigator.clipboard.writeText(text);
      showStatus(e.currentTarget);
    });
    pageType === "db" ? titleEl.prepend(btn) : titleEl.appendChild(btn);
  };

  const addActionBtns = () => {
    const bar = document.createElement("div");
    bar.className = "action-bar";
    // thêm nút Nhập vào VS Code
    const btn = addBtn("cph-btn", ICONS.vscode + "<span>Nhập vào VS Code</span>", async (e) => {
      preventEvent(e);
      const currenttarget = e.currentTarget; //! giữ nguyên
      const data = getProblemData();
      if (!data) {
        showAlert("Không thể lấy dữ liệu bài toán");
        return;
      }
      const success = await sendToCPH(data);
      success ? showStatus(currenttarget) : showAlert("Không tìm thấy CPH (VS Code)");
    });
    bar.appendChild(btn);

    // thêm nút chuyển đổi giữa classic và beta
    const code = getId();
    if (code) {
      const link = document.createElement("a");
      link.className = "switch-btn";
      link.href = `${location.origin}${pageType === "classic" ? "/beta/problems/" : "/student/question/"}${code}`;
      link.target = "_blank";
      link.textContent = pageType === "classic" ? "Mở ở Beta" : "Mở ở Classic";
      bar.appendChild(link);
    }
    actionHostEl.prepend(bar);
  };

  const attachClipboardFile = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return "Không có dữ liệu vừa sao chép";
      const ext = getExt();
      if (!ext) return "Không thể xác định ngôn ngữ lập trình";
      try {
        const dt = new DataTransfer();
        dt.items.add(new File([text], `${getId() || "solution"}${ext}`, { type: "text/plain" }));
        fileInputEl.files = dt.files;
      } catch {
        return "Không thể tạo file";
      }
      try {
        fileInputEl.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {
        return "Không thể gửi file";
      }
      return null;
    } catch {
      return "Không thể truy cập clipboard";
    }
  };

  const addSubmitBtn = () => {
    const btn = addBtn("submit-btn", "Nộp bài vừa sao chép", async (e) => {
      preventEvent(e);
      const error = await attachClipboardFile();
      if (error) {
        showAlert(error);
        return;
      }
      if (submitBtnEl.disabled) {
        showAlert("Nút nộp bài không khả dụng");
        return;
      }
      submitBtnEl.click();
    });
    btn.type = "button";
    submitHostEl.appendChild(btn);
  };

  let LAST_URL = null;
  let processTimer;
  let ensureTimer;
  let ensureDeadline;

  const process = () => {
    $$(".copy-btn, .title-copy-btn, .cph-btn, .switch-btn, .action-bar, .submit-btn").forEach((el) => el.remove());

    pageType = getPageType();
    titleEl = submitBtnEl = fileInputEl = submitHostEl = actionHostEl = null;
    tablesEls = [];

    const startEnsuring = () => {
      clearInterval(ensureTimer);
      ensureDeadline = Date.now() + 5000;
      ensureTimer = setInterval(() => {
        if (Date.now() > ensureDeadline) {
          clearInterval(ensureTimer);
          return;
        }

        if (pageType === "db") {
          if (!titleEl) titleEl = $("h3.font-medium.text-lg.text-foreground");
          const missingTitleBtn = !$(".title-copy-btn");
          if (!missingTitleBtn) {
            clearInterval(ensureTimer);
            return;
          }
          if (missingTitleBtn && titleEl) addTitleBtn();
        } else if (pageType) {
          const isBeta = pageType === "beta";
          if (!titleEl) titleEl = $(isBeta ? ".body-header h2" : ".submit__nav p span a.link--red");
          if (!tablesEls.length) tablesEls = $$(isBeta ? ".problem-container table" : ".submit__des table");
          if (!submitBtnEl)
            submitBtnEl = $(isBeta ? ".submit-status-container button.ant-btn-primary" : ".submit__pad__btn");
          if (!fileInputEl) fileInputEl = $(isBeta ? ".submit-container input[type='file']" : "#fileInput");
          if (!submitHostEl) submitHostEl = $(isBeta ? ".submit-container" : ".submit__pad");
          if (!actionHostEl) actionHostEl = $(isBeta ? ".body-header" : ".submit.student__submit");

          const hasBanner = !isBeta && !!$(BANNER_EL);
          const missingTitleBtn = !$(".title-copy-btn");
          const missingCellBtn = !$(".copy-btn");
          const missingActionBtns = !$(".cph-btn");
          const missingSubmitBtn = !$(".submit-btn");

          const readyBeta = isBeta && !missingTitleBtn && !missingCellBtn && !missingActionBtns && !missingSubmitBtn;
          const readyClassic =
            !isBeta && !missingTitleBtn && !missingCellBtn && !missingActionBtns && !missingSubmitBtn && !hasBanner;
          if (readyBeta || readyClassic) {
            clearInterval(ensureTimer);
            return;
          }

          if (hasBanner) $(BANNER_EL)?.remove();
          if (missingTitleBtn && titleEl) addTitleBtn();
          if (missingCellBtn && tablesEls.length) addCellBtns();
          if (missingActionBtns && actionHostEl) addActionBtns();
          if (missingSubmitBtn && submitBtnEl && submitHostEl && fileInputEl) addSubmitBtn();
        }
      }, 100);
    };

    pageType && startEnsuring();
  };

  const start = async () => {
    try {
      useIdSeparator = (await chrome.storage.sync.get({ useIdSeparator: false })).useIdSeparator;
    } catch {}
    LAST_URL = location.href;
    setTimeout(process, 100);
    const observer = new MutationObserver(() => {
      if (location.href !== LAST_URL) {
        LAST_URL = location.href;
        clearTimeout(processTimer);
        processTimer = setTimeout(process, 100);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.useIdSeparator) useIdSeparator = !!changes.useIdSeparator.newValue;
  });
  document.readyState !== "loading" ? start() : document.addEventListener("DOMContentLoaded", start);
})();
