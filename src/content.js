(() => {
  "use strict";
  let WORD_SEPARATOR = "";
  const ICONS = {
    copy: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h10a2 2 0 0 1 2 2v10"/><rect x="3" y="8" width="13" height="13" rx="2"/></svg>',
    check:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    rowCopy:
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h10a2 2 0 0 1 2 2v10"/><rect x="3" y="8" width="13" height="13" rx="2"/><path d="M7 13h7"/><path d="M7 17h6"/></svg>',
  };

  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
  .copy-btn,.title-copy-btn,.row-copy-btn{background:rgba(30,144,255,.4);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;width:25px;height:25px;border-radius:5px;padding:2px;position:relative;outline:none!important;user-select:none}
  .copy-btn{position:absolute;top:0;right:0}
  .title-copy-btn{margin-right:8px;top:-3px;display:inline-flex;vertical-align:middle}
  .row-copy-btn{position:absolute;left:-26px;top:0;background:rgba(255,165,0,.5)}
  .copied{background:rgba(50,205,50,1)!important}`;
    document.head.appendChild(style);
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const isBeta = () => location.pathname.includes("/beta/problems");
  const hasText = (el) => el?.textContent?.trim();
  const preventEvent = (e) => (e.preventDefault(), e.stopPropagation());

  const showCopied = (button) => {
    const originalContent = button.innerHTML;
    button.innerHTML = ICONS.check;
    button.classList.add("copied");
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove("copied");
    }, 800);
  };

  const getTestcase = (cell) =>
    (cell.innerText ?? "")
      .replace(
        /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g,
        " "
      )
      .trimEnd();

  const copy = (text, button) => (
    navigator.clipboard.writeText(text), showCopied(button)
  );

  const copyRow = (row, button) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;
    const [input, output] = [getTestcase(cells[0]), getTestcase(cells[1])];
    input.trim() && navigator.clipboard.writeText(input);
    setTimeout(
      () => output.trim() && navigator.clipboard.writeText(output),
      400
    );
    showCopied(button);
  };

  const formatTitle = (title) =>
    !title
      ? ""
      : title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]|[đĐ]/g, (m) =>
            m === "đ" ? "d" : m === "Đ" ? "D" : ""
          )
          .replace(/[^A-Za-z0-9]+/g, " ")
          .trim()
          .replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
          .replace(/ /g, WORD_SEPARATOR);

  const addCellBtn = (cell) => {
    if (!hasText(cell) || cell.dataset.copyAdded) return;
    window.getComputedStyle(cell).position === "static" &&
      (cell.style.position = "relative");
    cell.dataset.copyAdded = "true";
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.innerHTML = ICONS.copy;
    btn.addEventListener(
      "click",
      (e) => (
        preventEvent(e),
        ((content) => content.trim() && copy(content, e.currentTarget))(
          getTestcase(cell)
        )
      )
    );
    cell.appendChild(btn);
  };

  const addRowBtn = (row) => {
    if (!row || row.dataset.rowCopyAdded) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 2 || !hasText(cells[0]) || !hasText(cells[1])) return;
    window.getComputedStyle(cells[0]).position === "static" &&
      (cells[0].style.position = "relative");
    row.dataset.rowCopyAdded = "true";
    const btn = document.createElement("button");
    btn.className = "row-copy-btn";
    btn.innerHTML = ICONS.rowCopy;
    btn.addEventListener(
      "click",
      (e) => (preventEvent(e), copyRow(row, e.currentTarget))
    );
    cells[0].appendChild(btn);
  };

  const addTitleBtn = (titleEl) => {
    if (!titleEl || titleEl.dataset.copyAdded) return;
    titleEl.dataset.copyAdded = "true";
    const btn = document.createElement("button");
    btn.className = "title-copy-btn";
    btn.innerHTML = ICONS.copy;
    btn.addEventListener(
      "click",
      (e) => (
        preventEvent(e),
        (() => {
          const code = (location.pathname.split("/").pop() || "").trim();
          const titleText = (titleEl.textContent || "").trim();
          const joiner = WORD_SEPARATOR || "_";
          const name = [code, formatTitle(titleText)]
            .filter(Boolean)
            .join(joiner);
          name && copy(name, e.currentTarget);
        })()
      )
    );
    titleEl.insertBefore(btn, titleEl.firstChild);
  };

  const processTables = (tables) => {
    tables.forEach((t) => {
      t.querySelectorAll("tbody p").forEach(
        (p) => (p.outerHTML = `<div>${p.innerHTML}</div>`)
      );
      t.querySelectorAll("tr:not(:first-child)").forEach((row) => {
        row.querySelectorAll("td").forEach(addCellBtn);
        addRowBtn(row);
      });
    });
  };

  const processLegacyPage = () => {
    if (!/\/student\/question\/[A-Za-z0-9_]+/.test(location.pathname)) return;
    const container = $(".submit__des");
    if (!container) return;
    addTitleBtn($(".submit__nav p span a.link--red"));
    const tables = [...container.querySelectorAll("table")];
    processTables(tables);
  };

  const processBetaPage = () => {
    if (!/\/beta\/problems\/[A-Za-z0-9_]+/.test(location.pathname)) return;
    addTitleBtn($$("h2").find(hasText));
    processTables($$("table"));
  };

  const cleanup = () => {
    $$(".copy-btn, .title-copy-btn, .row-copy-btn").forEach((btn) =>
      btn.remove()
    );
    $$("[data-copy-added], [data-row-copy-added]").forEach(
      (el) => (
        el.removeAttribute("data-copy-added"),
        el.removeAttribute("data-row-copy-added")
      )
    );
  };

  const process = () => (
    cleanup(), isBeta() ? processBetaPage() : processLegacyPage()
  );

  let observerTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      observer.lastUrl !== location.href
        ? ((observer.lastUrl = location.href), process())
        : (isBeta() ? processBetaPage : processLegacyPage)();
    }, 500);
  });
  observer.lastUrl = location.href;

  const start = async () => {
    try {
      const result = await chrome.storage.sync.get({ useUnderscore: false });
      WORD_SEPARATOR = result.useUnderscore ? "_" : "";
    } catch {
      WORD_SEPARATOR = "";
    }
    addStyles();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    process();
  };

  document.readyState !== "loading"
    ? start()
    : document.addEventListener("DOMContentLoaded", start);
})();
