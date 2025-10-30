(() => {
  "use strict";
  // SELECTORS
  const SEL = {
    db: {
      title: "h3.font-medium.text-lg.text-foreground",
    },
    beta: {
      title: ".body-header h2",
      action: ".body-header h2",
      tables: ".problem-container table",
      submitBtn: ".submit-status-container button.ant-btn-primary",
      fileInput: ".submit-container input[type='file']",
      submitHost: ".submit-container",
    },
    classic: {
      title: ".submit__nav p span a.link--red",
      action: ".submit__nav p",
      tables: ".submit__des table",
      banner: ".username.container-fluid",
      submitBtn: ".submit__pad__btn",
      fileInput: "#fileInput",
      submitHost: null,
    },
  };

  const ICONS = {
    copy: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="rgba(30,144,255,.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h10a2 2 0 0 1 2 2v10"/><rect x="3" y="8" width="13" height="13" rx="2"/></svg>',
    check:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    vscode:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="#007ACC"><path d="M23.15 2.587L18.21.22a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>',
  };

  let PAGE = null; // beta, classic, db, null
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const hasText = (el) => el?.textContent?.trim();
  const preventEvent = (e) => (e.preventDefault(), e.stopPropagation());

  const getPageType = () => {
    const { hostname, pathname } = location;
    if (hostname === "db.ptit.edu.vn" && /\/question-detail\/[A-Za-z0-9_]+/.test(pathname))
      return "db";
    if (hostname === "code.ptit.edu.vn") {
      if (/\/beta\/problems\/[A-Za-z0-9_]+/.test(pathname)) return "beta";
      if (/\/student\/question\/[A-Za-z0-9_]+/.test(pathname)) return "classic";
    }
    return null;
  };

  const getId = () => {
    const code = location.pathname.split("/").pop() || "";
    return code.length > 15 ? "" : code; // để không lấy id khi thực hành
  };

  // một vài bài có kí tự khoảng trắng đặc biệt
  const WHITESPACE = /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g;
  const getCellText = (cell) => cell.innerText.replace(WHITESPACE, " ").trimEnd();

  const getExt = () => {
    const compilerText =
      PAGE === "classic"
        ? $("#compiler")?.selectedOptions?.[0]?.textContent || ""
        : $(".compiler-container .ant-select-selection-item")?.textContent || "";
    const s = compilerText.toLowerCase();
    if (s.includes("py")) return ".py";
    if (s.includes("java")) return ".java";
    if (s.includes("c++") || s.includes("cpp")) return ".cpp";
    if (s.includes("c")) return ".c";
    return null;
  };

  // xóa dấu tiếng việt, xóa kí tự đặc biệt, chỉ in hoa chữ đầu, dùng gạch dưới để phân cách
  const formatTitle = (text) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]|đ|Đ/g, (m) => (m === "đ" ? "d" : m === "Đ" ? "D" : ""))
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .replace(/ /g, "_");

  const getTitleText = (titleEl) => {
    if (!titleEl) return "";
    const code = getId();
    // chỉ lấy text node đầu tiên để tránh lỗi
    const titleText = [...titleEl.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE
    )?.textContent;
    const base = [code, formatTitle(titleText)].filter(Boolean).join("_");
    const ext = getExt();
    return ext ? `${base}${ext}` : base;
  };

  const getProblemData = (titleEl) => {
    const name = getTitleText(titleEl);
    if (!name) return null;

    const ensureNewline = (text) => (text.endsWith("\n") ? text : text + "\n");
    const tests = [];
    const tables = $$(PAGE === "beta" ? SEL.beta.tables : SEL.classic.tables);
    tables.forEach((t) => {
      t.querySelectorAll("tr:not(:first-child)").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (hasText(cells[0]) && hasText(cells[1])) {
          tests.push({
            input: ensureNewline(getCellText(cells[0])),
            output: ensureNewline(getCellText(cells[1])),
          });
        }
      });
    });
    return { name, url: location.href, tests };
  };

  const showStatus = (button) => {
    if (button.classList.contains("copied")) return;
    const originalContent = button.innerHTML;
    button.innerHTML = ICONS.check;
    button.classList.add("copied");
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove("copied");
    }, 800);
  };

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
    if (!hasText(cell) || cell.dataset.copyAdded) return;
    window.getComputedStyle(cell).position === "static" && (cell.style.position = "relative");
    cell.dataset.copyAdded = "true";
    const btn = addBtn("copy-btn", ICONS.copy, (e) => {
      preventEvent(e);
      navigator.clipboard.writeText(getCellText(cell));
      showStatus(e.currentTarget);
    });
    cell.appendChild(btn);
  };
  const addCellBtns = (tables) => {
    tables.forEach((t) => {
      // thay p bằng div để copy thuần cũng xóa được dòng trống thừa
      const ps = t.querySelectorAll("tbody p");
      ps.forEach((p) => (p.outerHTML = `<div>${p.innerHTML}</div>`));
      t.querySelectorAll("tr:not(:first-child)").forEach((row) => {
        row.querySelectorAll("td").forEach(addCellBtn);
      });
    });
  };

  const addTitleBtn = (target) => {
    if (!target || target.dataset.copyAdded) return;
    target.dataset.copyAdded = "true";
    const btn = addBtn("title-copy-btn", ICONS.copy, (e) => {
      preventEvent(e);
      // trang DB chỉ xóa kí tự đặc biệt trong tiêu đề
      const text =
        PAGE === "db"
          ? target.textContent.trim().replace(/[\\/:*?"<>|]/g, "")
          : getTitleText(target);
      navigator.clipboard.writeText(text);
      showStatus(e.currentTarget);
    });
    target.insertBefore(btn, target.firstChild);
  };

  const addCPHBtn = (row, titleEl) => {
    if (!row || row.dataset.cphAdded) return;
    row.dataset.cphAdded = "true";
    const btn = addBtn("cph-btn", ICONS.vscode + "<span>Send to VS Code</span>", async (e) => {
      preventEvent(e);
      const currenttarget = e.currentTarget; //! giữ nguyên
      const data = getProblemData(titleEl);
      if (!data) return;
      const success = await sendToCPH(data);
      if (success) showStatus(currenttarget);
    });
    row.appendChild(btn);
  };

  const addSwitchBtn = (target) => {
    if (!target || target.dataset.switchAdded) return;
    const code = getId();
    if (!code) return;
    target.dataset.switchAdded = "true";
    const link = document.createElement("a");
    link.className = "switch-btn";
    link.href = `${location.origin}${
      PAGE === "classic" ? "/beta/problems/" : "/student/question/"
    }${code}`;
    link.target = "_blank";
    link.textContent = PAGE === "classic" ? "Open in Beta" : "Open in Classic";
    target.appendChild(link);
  };

  const addActionBtns = (target, titleEl) => {
    if (!target || target.dataset.actionRowAdded) return;
    target.dataset.actionRowAdded = "true";

    // để action row cùng hàng title trên trang classic
    if (PAGE === "classic") {
      target.style.display = "flex";
      target.style.alignItems = "center";
      target.style.flexWrap = "wrap";
    }
    const row = document.createElement("div");
    row.className = "action-row";
    target.appendChild(row);
    addCPHBtn(row, titleEl);
    addSwitchBtn(row);
  };

  const attachClipboardFile = async (fileInput) => {
    try {
      const text = await navigator.clipboard.readText();
      const ext = getExt();
      if (!text.trim() || !ext) return false;
      const file = new File([text], `${getId() || "solution"}${ext}`, { type: "text/plain" });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  };

  const addSubmitBtn = (submitBtnSelector, fileInputSelector, hostSelector) => {
    const submitBtn = $(submitBtnSelector);
    const fileInput = $(fileInputSelector);
    if (!submitBtn || !fileInput) return;

    const host = hostSelector ? $(hostSelector) : submitBtn.parentElement;
    if (!host) return;
    let btn = host.querySelector(".submit-btn");
    if (!btn) {
      btn = addBtn("submit-btn", "Nộp bài vừa sao chép", async (e) => {
        preventEvent(e);
        const ok = await attachClipboardFile(fileInput);
        if (ok && !submitBtn.disabled) submitBtn.click();
      });
      btn.type = "button";
      host.appendChild(btn);
    }
  };

  let LAST_URL = null;
  const process = () => {
    const currentUrl = location.href;
    if (currentUrl === LAST_URL) return;

    if (LAST_URL) {
      $$(".copy-btn, .title-copy-btn, .cph-btn, .switch-btn, .action-row, .submit-btn").forEach(
        (el) => el.remove()
      );
    }

    LAST_URL = currentUrl;
    PAGE = getPageType();
    if (PAGE === "db") {
      addTitleBtn($(SEL.db.title));
    } else if (PAGE === "beta") {
      const titleEl = $(SEL.beta.title);
      addTitleBtn(titleEl);
      addActionBtns($(SEL.beta.action), titleEl);
      addCellBtns($$(SEL.beta.tables));
      addSubmitBtn(SEL.beta.submitBtn, SEL.beta.fileInput, SEL.beta.submitHost);
    } else if (PAGE === "classic") {
      $(SEL.classic.banner)?.remove();
      const titleEl = $(SEL.classic.title);
      addTitleBtn(titleEl);
      addActionBtns($(SEL.classic.action), titleEl);
      addCellBtns($$(SEL.classic.tables));
      addSubmitBtn(SEL.classic.submitBtn, SEL.classic.fileInput, SEL.classic.submitHost);
    }
  };

  let processTimer, observer;
  const start = () => {
    observer = new MutationObserver(() => {
      if (location.href !== LAST_URL) {
        clearTimeout(processTimer);
        processTimer = setTimeout(process, 600);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(process, 300);
  };

  window.addEventListener("beforeunload", () => {
    clearTimeout(processTimer);
    observer?.disconnect();
  });

  document.readyState !== "loading"
    ? start()
    : document.addEventListener("DOMContentLoaded", start);
})();
