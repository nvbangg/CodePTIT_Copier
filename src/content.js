(() => {
  "use strict";
  let PAGE_TYPE = null;

  const S_DB_TITLE = "h3.font-medium.text-lg.text-foreground";
  const S_BETA_TITLE = "h2";
  const S_BETA_TABLES = "table";
  const S_LEGACY_TITLE = ".submit__nav p span a.link--red";
  const S_LEGACY_CONTAINER = ".submit__des";
  const S_LEGACY_TABLES = "table";

  const getPageType = () => {
    if (PAGE_TYPE) return PAGE_TYPE;
    const { hostname, pathname } = location;
    if (hostname === "db.ptit.edu.vn" && /\/question-detail\/[A-Za-z0-9_]+/.test(pathname))
      return (PAGE_TYPE = "db");
    if (hostname === "code.ptit.edu.vn") {
      if (/\/beta\/problems\/[A-Za-z0-9_]+/.test(pathname)) return (PAGE_TYPE = "beta");
      if (/\/student\/question\/[A-Za-z0-9_]+/.test(pathname)) return (PAGE_TYPE = "legacy");
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
  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
  .copy-btn,.title-copy-btn,.cph-btn{background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:5px;padding:2px;position:relative;outline:none!important;user-select:none}
  .copy-btn{position:absolute;top:0;right:0}
  .title-copy-btn{margin-right:5px;display:inline-flex;vertical-align:middle}
  .cph-btn{width:auto;flex:0 0 auto;white-space:nowrap;align-self:flex-start;height:30px;padding:6px 12px;margin-bottom:10px;gap:6px;display:flex;background:rgba(255,165,0,.5);font-size:15px;color:#000}
  .copied{background:rgba(50,205,50,1)!important}`;
    document.head.appendChild(style);
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const hasText = (el) => el?.textContent?.trim();
  const preventEvent = (e) => (e.preventDefault(), e.stopPropagation());

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
    clearTimeout(observerTimer);
    button.setAttribute("data-cph-status", "true");
    button.classList.add("copied");
    setTimeout(() => {
      button.classList.remove("copied");
      button.removeAttribute("data-cph-status");
    }, 800);
  };

  const formatTitle = (title) =>
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]|đ|Đ/g, (m) => (m === "đ" ? "d" : m === "Đ" ? "D" : ""))
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .replace(/ /g, "_");

  const getTitleText = () => {
    const code = location.pathname.split("/").pop() || "";
    const titleEl = getPageType() === "beta" ? $$(S_BETA_TITLE).find(hasText) : $(S_LEGACY_TITLE);
    if (!titleEl) return "";
    return [code, formatTitle(titleEl.textContent)].filter(Boolean).join("_");
  };

  const extractProblemData = () => {
    const name = getTitleText();
    if (!name) return null;

    const ensureNewline = (text) => (text.endsWith("\n") ? text : text + "\n");
    const tests = [];
    const tables = $(S_LEGACY_CONTAINER)?.querySelectorAll(S_LEGACY_TABLES) || $$(S_BETA_TABLES);
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
  const addBtns = (tables) => {
    tables.forEach((t) => {
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
      const text = isDB ? titleEl.textContent.trim().replace(/[\\/:*?"<>|]/g, "") : getTitleText();
      navigator.clipboard.writeText(text);
      showCopied(e.currentTarget);
    });
    titleEl.insertBefore(btn, titleEl.firstChild);
  };

  const addCPHBtn = (titleEl) => {
    if (!titleEl) return;
    const parent = titleEl.parentElement;
    if (!parent || parent.dataset.cphAdded) return;
    parent.dataset.cphAdded = "true";
    const btn = addBtn("cph-btn", ICONS.vscode + "<span>Import to VS Code</span>", async (e) => {
      preventEvent(e);
      const target = e.currentTarget;
      const data = extractProblemData();
      if (!data) return;
      const success = await sendToCPH(data);
      if (success) showCPHStatus(target, true);
    });
    parent.insertBefore(btn, titleEl);
  };

  let NEED_CLEAN = false;
  const process = () => {
    if ($("[data-cph-status]") || $("[data-copy-status]")) return;
    if (NEED_CLEAN) {
      $$("[data-copy-added], [data-cph-added]").forEach(
        (el) => el.removeAttribute("data-copy-added") || el.removeAttribute("data-cph-added")
      );
      $$(".copy-btn, .title-copy-btn, .cph-btn").forEach((b) => b.remove());
      NEED_CLEAN = false;
    }

    const pageType = getPageType();
    if (pageType === "db") {
      addTitleBtn($(S_DB_TITLE), true);
    } else if (pageType === "beta") {
      const titleEl = $$(S_BETA_TITLE).find(hasText);
      addCPHBtn(titleEl);
      addTitleBtn(titleEl);
      addBtns($$(S_BETA_TABLES));
    } else if (pageType === "legacy") {
      const titleEl = $(S_LEGACY_TITLE);
      addCPHBtn(titleEl);
      addTitleBtn(titleEl);
      addBtns([...($(S_LEGACY_CONTAINER)?.querySelectorAll(S_LEGACY_TABLES) ?? [])]);
    }
  };

  let observerTimer;
  const observer = new MutationObserver(() => {
    if ($("[data-cph-status]")) return;
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      if (observer.lastUrl !== location.href) {
        observer.lastUrl = location.href;
        PAGE_TYPE = null;
        NEED_CLEAN = true;
      }
      process();
    }, 500);
  });
  observer.lastUrl = location.href;

  const start = () => {
    addStyles();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    process();
  };

  document.readyState !== "loading"
    ? start()
    : document.addEventListener("DOMContentLoaded", start);
})();
