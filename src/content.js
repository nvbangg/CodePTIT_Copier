(() => {
  "use strict";
  let PAGE_TYPE = null; // db, beta, classic, null

  // SELECTORS
  const S_DB_TITLE = "h3.font-medium.text-lg.text-foreground";
  const S_BETA_TITLE = "h2";
  const S_BETA_TABLES = "table";
  const S_CLASSIC_TITLE = ".submit__nav p span a.link--red";
  const S_CLASSIC_CONTAINER = ".submit__des";
  const S_CLASSIC_TABLES = "table";
  const S_CLASSIC_BANNER = ".username.container-fluid";
  const S_CLASSIC_ACTION = ".submit__nav p";
  const S_BETA_ACTION = ".body-header h2";

  const getPageType = () => {
    if (PAGE_TYPE) return PAGE_TYPE;
    const { hostname, pathname } = location;
    if (hostname === "db.ptit.edu.vn" && /\/question-detail\/[A-Za-z0-9_]+/.test(pathname))
      return (PAGE_TYPE = "db");
    if (hostname === "code.ptit.edu.vn") {
      if (/\/beta\/problems\/[A-Za-z0-9_]+/.test(pathname)) return (PAGE_TYPE = "beta");
      if (/\/student\/question\/[A-Za-z0-9_]+/.test(pathname)) return (PAGE_TYPE = "classic");
    }
    return (PAGE_TYPE = null);
  };

  const ICONS = {
    copy: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="rgba(30,144,255,.4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h10a2 2 0 0 1 2 2v10"/><rect x="3" y="8" width="13" height="13" rx="2"/></svg>',
    check:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    vscode:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="#007ACC"><path d="M23.15 2.587L18.21.22a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>',
  };
  let stylesAdded = false;
  const addStyles = () => {
    if (stylesAdded) return;
    stylesAdded = true;
    const style = document.createElement("style");
    style.textContent = `
  .copy-btn,.title-copy-btn{width:26px;height:26px;border-radius:5px;padding:0px;background:transparent;display:flex;align-items:center;justify-content:center;position:relative;border:none;outline:none!important;user-select:none;cursor:pointer}
  .copy-btn{position:absolute;top:0;right:0}
  .title-copy-btn{margin-right:5px;display:inline-flex;vertical-align:middle}
  .copied{background:rgba(50,205,50,1)!important}
  .cph-btn,.switch-btn{width:auto;height:26px!important;border-radius:8px!important;padding:2px 8px;background:rgba(255,165,0,.5);color:#000;font-size:14px!important;display:inline-flex!important;align-items:center;gap:6px;white-space:wrap;border:none;outline:none!important;user-select:none;cursor:pointer;margin-left:5px;vertical-align:middle}
  .cph-btn svg{width:18px;height:18px}
  .switch-btn{border:1px solid rgba(30,144,255,.4)!important;color:rgba(30,144,255,.8)!important;background:0!important}
  .action-row{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:8px;vertical-align:middle}`;
    document.head.appendChild(style);
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const hasText = (el) => el?.textContent?.trim();
  const preventEvent = (e) => (e.preventDefault(), e.stopPropagation());
  const getId = () => {
    const code = location.pathname.split("/").pop() || "";
    return code.length > 15 ? "" : code; // để không lấy id khi thực hành
  };

  // một vài bài có kí tự khoảng trắng đặc biệt
  const WHITESPACE = /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g;
  const getText = (cell) => cell.innerText.replace(WHITESPACE, " ").trimEnd();

  const showCopied = (button) => {
    const originalContent = button.innerHTML;
    button.innerHTML = ICONS.check;
    button.classList.add("copied");
    button.setAttribute("data-copy-status", "true");
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove("copied");
      button.removeAttribute("data-copy-status");
    }, 800);
  };

  const showCPHStatus = (button, success) => {
    if (!success || !button) return;
    button.classList.add("copied");
    setTimeout(() => {
      button.classList.remove("copied");
    }, 800);
  };

  // xóa dấu tiếng việt, xóa kí tự đặc biệt, chỉ in hoa chữ đầu, dùng gạch dưới để phân cách
  const formatTitle = (title) =>
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]|đ|Đ/g, (m) => (m === "đ" ? "d" : m === "Đ" ? "D" : ""))
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .replace(/ /g, "_");

  const getTitleText = () => {
    const code = getId();
    const pageType = getPageType();
    const titleEl = pageType === "beta" ? $$(S_BETA_TITLE).find(hasText) : $(S_CLASSIC_TITLE);
    if (!titleEl) return "";
    // chỉ lấy text node đầu tiên trên trang beta để tránh lỗi
    const titleText =
      pageType === "beta"
        ? [...titleEl.childNodes].find((n) => n.nodeType === Node.TEXT_NODE)?.textContent
        : titleEl.textContent;
    return [code, formatTitle(titleText)].filter(Boolean).join("_");
  };

  const getProblemData = () => {
    const name = getTitleText();
    if (!name) return null;

    const ensureNewline = (text) => (text.endsWith("\n") ? text : text + "\n");
    const tests = [];
    const tables = $(S_CLASSIC_CONTAINER)?.querySelectorAll(S_CLASSIC_TABLES) || $$(S_BETA_TABLES);
    tables.forEach((t) => {
      t.querySelectorAll("tr:not(:first-child)").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (hasText(cells[0]) && hasText(cells[1])) {
          tests.push({
            input: ensureNewline(getText(cells[0])),
            output: ensureNewline(getText(cells[1])),
          });
        }
      });
    });
    return { name, url: location.href, tests };
  };

  const sendToCPH = async (data) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "sendToCPH",
        data: data,
      });
      return response?.success || false;
    } catch {
      return false;
    }
  };

  const addBtn = (className, icon, onClick) => {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = icon;
    btn.addEventListener("click", onClick);
    return btn;
  };

  const addCellBtn = (cell) => {
    if (!hasText(cell) || cell.dataset.copyAdded) return;
    window.getComputedStyle(cell).position === "static" && (cell.style.position = "relative");
    cell.dataset.copyAdded = "true";
    const btn = addBtn("copy-btn", ICONS.copy, (e) => {
      preventEvent(e);
      navigator.clipboard.writeText(getText(cell));
      showCopied(e.currentTarget);
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

  const addTitleBtn = (titleEl, isDB) => {
    if (!titleEl || titleEl.dataset.copyAdded) return;
    titleEl.dataset.copyAdded = "true";
    const btn = addBtn("title-copy-btn", ICONS.copy, (e) => {
      preventEvent(e);
      // trang DB chỉ xóa kí tự đặc biệt trong tiêu đề
      const text = isDB ? titleEl.textContent.trim().replace(/[\\/:*?"<>|]/g, "") : getTitleText();
      navigator.clipboard.writeText(text);
      showCopied(e.currentTarget);
    });
    titleEl.insertBefore(btn, titleEl.firstChild);
  };

  const addCPHBtn = (target) => {
    if (!target || target.dataset.cphAdded) return;
    target.dataset.cphAdded = "true";
    const btn = addBtn("cph-btn", ICONS.vscode + "<span>Send to VS Code</span>", async (e) => {
      preventEvent(e);
      const target = e.currentTarget;
      const data = getProblemData();
      if (!data) return;
      const success = await sendToCPH(data);
      if (success) showCPHStatus(target, true);
    });
    target.appendChild(btn);
  };

  const addSwitchBtn = (target, pageType) => {
    if (!target || target.dataset.switchAdded) return;
    const code = getId();
    if (!code) return;
    target.dataset.switchAdded = "true";
    const link = document.createElement("a");
    link.className = "switch-btn";
    link.href = `${location.origin}${
      pageType === "classic" ? "/beta/problems/" : "/student/question/"
    }${code}`;
    link.target = "_blank";
    link.textContent = pageType === "classic" ? "Open in Beta" : "Open in Classic";
    target.appendChild(link);
  };

  const addActionRow = (pageType) => {
    const anchor = pageType === "classic" ? $(S_CLASSIC_ACTION) : $(S_BETA_ACTION);
    if (!anchor || anchor.dataset.actionRowAdded) return;
    anchor.dataset.actionRowAdded = "true";

    // để action row cùng hàng title trên trang classic
    if (pageType === "classic") {
      anchor.style.display = "flex";
      anchor.style.alignItems = "center";
      anchor.style.flexWrap = "wrap";
    }
    const row = document.createElement("div");
    row.className = "action-row";
    anchor.appendChild(row);
    addCPHBtn(row);
    addSwitchBtn(row, pageType);
  };

  let LAST_URL = null;
  const process = () => {
    if (LAST_URL) {
      $$("[data-copy-added],[data-cph-added],[data-switch-added],[data-action-row-added]").forEach(
        (el) => {
          el.removeAttribute("data-copy-added");
          el.removeAttribute("data-cph-added");
          el.removeAttribute("data-switch-added");
          el.removeAttribute("data-action-row-added");
        }
      );
      $$(".copy-btn, .title-copy-btn, .cph-btn, .switch-btn, .action-row").forEach((el) =>
        el.remove()
      );
    }
    PAGE_TYPE = null;
    LAST_URL = location.href;

    const pageType = getPageType();
    if (pageType === "db") {
      addTitleBtn($(S_DB_TITLE), true);
    } else if (pageType === "beta") {
      const titleEl = $$(S_BETA_TITLE).find(hasText);
      addTitleBtn(titleEl);
      addActionRow("beta");
      addCellBtns($$(S_BETA_TABLES));
    } else if (pageType === "classic") {
      $(S_CLASSIC_BANNER)?.remove();
      const titleEl = $(S_CLASSIC_TITLE);
      addTitleBtn(titleEl);
      addActionRow("classic");
      addCellBtns([...($(S_CLASSIC_CONTAINER)?.querySelectorAll(S_CLASSIC_TABLES) ?? [])]);
    }
  };

  let processTimer, observer;
  const start = () => {
    addStyles();
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
