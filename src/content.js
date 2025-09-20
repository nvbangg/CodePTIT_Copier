(() => {
  "use strict";
  const WORD_SEPARATOR = ""; // Thay đổi phân cách sang "_" nếu muốn
  const ICONS = {
    copy: '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1-2 2v1"/></svg>',
    check:
      '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    rowCopy:
      '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1-2 2v1"/><path d="M2 2h5v2"/></svg>',
  };

  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
  .copy-btn,.title-copy-btn,.row-copy-btn{background:rgba(30,144,255,.5);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:3px;padding:2px;position:relative;outline:none!important;user-select:none}
  .copy-btn{position:absolute;top:0;right:0}
  .title-copy-btn{margin-right:8px;top:-2px;vertical-align:middle;display:inline-flex}
  .row-copy-btn{position:absolute;left:-26px;top:0;background:rgba(255,165,0,.7);z-index:100}
  .copied{background:rgba(50,205,50,1)!important} `;
    document.head.appendChild(style);
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const isBeta = () => location.pathname.includes("/beta");
  const hasText = (el) => el?.textContent?.trim();
  const preventEvent = (e) => (e.preventDefault(), e.stopPropagation());
  const setRelative = (el) =>
    window.getComputedStyle(el).position === "static" &&
    (el.style.position = "relative");

  const showCopied = (button) => {
    const originalContent = button.innerHTML;
    button.innerHTML = ICONS.check;
    button.classList.add("copied");
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove("copied");
    }, 800);
  };

  const copy = (text, button) => (
    navigator.clipboard.writeText(text), showCopied(button)
  );

  const copyRow = (row, button) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return false;
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

  const getTestcase = (cell) =>
    (cell.innerText ?? "")
      .replace(
        /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g,
        " "
      )
      .trimEnd();

  const createButton = (type, onClick) => {
    const btn = document.createElement("button");
    btn.className =
      type === "title"
        ? "title-copy-btn"
        : type === "row"
        ? "row-copy-btn"
        : "copy-btn";
    btn.innerHTML = type === "row" ? ICONS.rowCopy : ICONS.copy;
    btn.addEventListener("click", onClick);
    return btn;
  };

  const addCellBtn = (cell) => {
    if (!hasText(cell) || cell.dataset.copyAdded) return;
    setRelative(cell);
    cell.dataset.copyAdded = "true";
    cell.appendChild(
      createButton(
        "copy",
        (e) => (
          preventEvent(e),
          ((content) => content.trim() && copy(content, e.currentTarget))(
            getTestcase(cell)
          )
        )
      )
    );
  };

  const addTitleBtn = (titleEl) => {
    if (!titleEl || titleEl.dataset.copyAdded) return;
    titleEl.dataset.copyAdded = "true";
    const btn = createButton(
      "title",
      (e) => (
        preventEvent(e),
        (({ code, title }) =>
          (code || title) &&
          copy(`${code.trim()}_${formatTitle(title)}`, e.currentTarget))(
          getProblem()
        )
      )
    );
    titleEl.insertBefore(btn, titleEl.firstChild);
  };

  const addRowBtn = (row) => {
    if (!row || row.dataset.rowCopyAdded) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 2 || !hasText(cells[0]) || !hasText(cells[1])) return;
    setRelative(cells[0]);
    row.dataset.rowCopyAdded = "true";
    cells[0].appendChild(
      createButton(
        "row",
        (e) => (preventEvent(e), copyRow(row, e.currentTarget))
      )
    );
  };

  const getProblem = () => {
    const code = location.pathname.split("/").pop() ?? "";
    if (isBeta()) {
      return {
        code,
        title: $("h2")?.textContent?.trim() ?? "",
      };
    }
    const titleLink = $(".submit__nav p span a.link--red");
    return {
      code,
      title: titleLink?.textContent?.trim() ?? "",
    };
  };

  // Chuyển thẻ p thành div trong tbody
  const convertPtoDiv = () =>
    $$("tbody p").forEach((p) => (p.outerHTML = `<div>${p.innerHTML}</div>`));

  const processLegacyPage = () => {
    if (!/\/student\/question\/[A-Za-z0-9_]+/.test(location.pathname)) return;
    const titleElement = $(".submit__nav p span a.link--red");
    titleElement && addTitleBtn(titleElement);
    $$(".submit__des tr:not(:first-child)").forEach((row) => {
      row.querySelectorAll("td").forEach(addCellBtn);
      addRowBtn(row);
    });
  };

  const processBetaPage = () => {
    if (!/\/beta\/problems\/[A-Za-z0-9_]+/.test(location.pathname)) return;
    $$("table:not(.ant-table-fixed) tr:not(:first-child)").forEach((row) => {
      row
        .querySelectorAll("td")
        .forEach(
          (cell) =>
            hasText(cell) &&
            !cell.querySelector(".copy-btn") &&
            addCellBtn(cell)
        );
      addRowBtn(row);
    });
    const titleElement = $$("h2").find(
      (el) => hasText(el) && !el.parentElement?.querySelector(".title-copy-btn")
    );
    titleElement && addTitleBtn(titleElement);
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

  const process = () => {
    const beta = isBeta();
    cleanup();
    beta ? processBetaPage() : processLegacyPage();
    convertPtoDiv();
  };

  let observerTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      observer.lastUrl !== location.href
        ? ((observer.lastUrl = location.href), process())
        : (() => {
            const beta = isBeta();
            (beta ? processBetaPage : processLegacyPage)();
            convertPtoDiv();
          })();
    }, 300);
  });
  observer.lastUrl = location.href;

  const start = () => {
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
