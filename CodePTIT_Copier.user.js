// ==UserScript==
// @name         CodePTIT Copier
// @namespace    https://github.com/nvbangg/CodePTIT_Copier
// @version      1.2
// @description  Script CodePTIT Copier. Xóa dòng trống thừa và copy nhanh Testcase trên CodePTIT (bản cũ lẫn mới).
// @author       nvbangg (https://github.com/nvbangg)
// @copyright    Copyright (c) 2025 Nguyễn Văn Bằng (nvbangg, github.com/nvbangg)
// @homepage     https://github.com/nvbangg/CodePTIT_Copier
// @match        https://code.ptit.edu.vn/student/question*
// @match        https://code.ptit.edu.vn/beta*
// @icon         https://code.ptit.edu.vn/favicon.ico
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/536045/CodePTIT%20Copier.user.js
// @updateURL https://update.greasyfork.org/scripts/536045/CodePTIT%20Copier.meta.js
// ==/UserScript==

//! HÃY XEM HƯỚNG DẪN TẠI: https://github.com/nvbangg/CodePTIT_Copier

(() => {
  "use strict";

  // Settings mặc định
  const DEFAULT_SETTINGS = {
    fileExtension: ".cpp",
    removeAccents: true,
    textCase: "titleCase",
    separator: "noSpaces",
  };
  const settings = { ...DEFAULT_SETTINGS, ...GM_getValue("settings", {}) };
  const ICONS = {
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1-2 2v1"/></svg>',
    check:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    rowCopy:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1-2 2v1"/><path d="M2 2h5v2"/></svg>',
  };

  const FORMATTERS = {
    case: {
      titleCase: (str) =>
        str.replace(
          /\S+/g,
          (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ),
      uppercase: (str) => str.toUpperCase(),
      lowercase: (str) => str.toLowerCase(),
      keepOriginal: (str) => str,
    },
    separator: { keepOriginal: " ", underscore: "_", dash: "-", noSpaces: "" },
  };
  const OPTIONS = {
    textCase: {
      titleCase: "In Hoa Đầu Từ",
      uppercase: "IN HOA",
      lowercase: "in thường",
      keepOriginal: "Giữ nguyên",
    },
    separator: {
      noSpaces: "Xóa khoảng cách",
      underscore: "Gạch dưới (_)",
      dash: "Gạch ngang (-)",
      keepOriginal: "Giữ nguyên",
    },
  };

  // CSS tối ưu - gộp các class chung
  GM_addStyle(`
    .copy-btn,.title-copy-btn,.row-copy-btn{background:rgba(30,144,255,.5);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;padding:2px;position:relative;outline:none!important;user-select:none}
    .copy-btn{position:absolute;top:0;right:0}
    .title-copy-btn{margin-right:5px;vertical-align:middle}
    .row-copy-btn{position:absolute;left:-23px;top:0;background:rgba(255,165,0,.7);z-index:100}
    .row-copy-tooltip{position:absolute;bottom:100%;left:0;margin-bottom:8px;background:rgba(0,0,0,.8);color:white;padding:4px 6px;font-size:11px;white-space:nowrap;display:none;z-index:1000}
    .row-copy-btn.show-tooltip .row-copy-tooltip{display:block}
    .copied{background:rgba(50,205,50,1)!important}
    .settings-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}
    .settings-modal{background:#fff;border-radius:8px;width:300px;padding:15px;max-width:90vw;position:relative}
    .settings-modal h3{margin:0 0 10px;text-align:center}
    .settings-group{margin-bottom:10px}.settings-group label{display:block;margin-bottom:4px}
    .settings-input,.settings-select{width:100%;padding:5px;border:1px solid #ddd;border-radius:4px}
    .settings-buttons{display:flex;justify-content:center;margin-top:15px;gap:10px}
    .settings-btn-save,.settings-btn-reset{padding:6px 15px;border:none;border-radius:4px;cursor:pointer}
    .settings-btn-save{background:#1890ff;color:#fff}.settings-btn-reset{background:#d8d8d8;color:#333}
    .settings-footer{border-top:1px solid #eee;margin-top:15px;padding-top:10px;text-align:center}
    .settings-footer a{color:#1890ff!important}
    .settings-close{position:absolute;top:15px;right:15px;width:25px;height:25px;cursor:pointer;text-align:center;line-height:25px;font-size:25px;font-weight:bold;color:#333}
  `);

  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const isBeta = () => location.pathname.includes("/beta");
  const isValidTestCase = (el) =>
    el?.textContent?.trim() &&
    !el.querySelector(".copy-btn") &&
    !el.closest("table");
  const debounce = (fn, delay = 300) => {
    let timer;
    return (...args) => (
      clearTimeout(timer), (timer = setTimeout(() => fn(...args), delay))
    );
  };

  const showCopyEffect = (button, duration = 800) => {
    const originalContent = button.innerHTML;
    button.innerHTML = ICONS.check;
    button.classList.add("copied");
    setTimeout(
      () => (
        (button.innerHTML = originalContent), button.classList.remove("copied")
      ),
      duration
    );
  };

  const addTooltipEvents = (btn) => {
    let timer,
      isHovering = false;
    btn.addEventListener(
      "mouseenter",
      () => (
        (isHovering = true),
        btn.classList.remove("show-tooltip"),
        (timer = setTimeout(
          () => isHovering && btn.classList.add("show-tooltip"),
          1000
        ))
      )
    );
    btn.addEventListener(
      "mouseleave",
      () => (
        (isHovering = false),
        clearTimeout(timer),
        btn.classList.remove("show-tooltip")
      )
    );
  };

  const copyToClipboard = (text, button) => {
    try {
      GM_setClipboard(text, "text");
      showCopyEffect(button);
      return true;
    } catch (e) {
      console.error("Copy failed:", e);
      return false;
    }
  };

  const copyRowContent = (row, button) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return false;
    const secondCellContent = getTestcaseContent(cells[1]),
      firstCellContent = getTestcaseContent(cells[0]);
    if (!secondCellContent.trim() && !firstCellContent.trim()) return false;
    secondCellContent.trim() && GM_setClipboard(secondCellContent, "text");
    setTimeout(
      () =>
        firstCellContent.trim() && GM_setClipboard(firstCellContent, "text"),
      300
    );
    showCopyEffect(button, 1000);
    return true;
  };
  const formatTitle = (title) => {
    if (!title) return "";
    const normalized = settings.removeAccents
      ? title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]|[đĐ]/g, (m) =>
            m === "đ" ? "d" : m === "Đ" ? "D" : ""
          )
      : title.normalize("NFC");
    return (FORMATTERS.case[settings.textCase] || FORMATTERS.case.keepOriginal)(
      normalized
    ).replace(/\s+/g, FORMATTERS.separator[settings.separator] || "");
  };
  const getTestcaseContent = (cell) =>
    (cell.querySelector("code, pre")?.innerText || cell.innerText || "")
      .replace(
        /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g,
        " "
      )
      .trimEnd();

  // Gộp các hàm tạo button thành 1 hàm duy nhất
  const createButton = (type, onClick, extraContent = "") => {
    const btn = document.createElement("button");
    btn.className =
      type === "title"
        ? "title-copy-btn"
        : type === "row"
        ? "row-copy-btn"
        : "copy-btn";
    btn.innerHTML = type === "row" ? ICONS.rowCopy + extraContent : ICONS.copy;
    if (type === "row") addTooltipEvents(btn);
    btn.addEventListener("click", onClick);
    return btn;
  };

  const addCopyButton = (cell) => {
    if (!cell?.textContent?.trim() || cell.dataset.copyAdded) return;
    window.getComputedStyle(cell).position === "static" &&
      (cell.style.position = "relative");
    cell.dataset.copyAdded = "true";
    cell.appendChild(
      createButton("copy", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const content = getTestcaseContent(cell);
        content.trim() && copyToClipboard(content, e.currentTarget);
      })
    );
  };
  const addTitleCopyButton = (titleEl) => {
    if (!titleEl || titleEl.dataset.copyAdded) return;
    titleEl.dataset.copyAdded = "true";
    const btn = createButton("title", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { code, title } = getProblemInfo();
      (code || title) &&
        copyToClipboard(
          `${code.trim()}_${formatTitle(title)}${settings.fileExtension}`,
          e.currentTarget
        );
    });
    Object.assign(btn.style, {
      marginRight: "8px",
      verticalAlign: "middle",
      display: "inline-flex",
    });
    titleEl.insertBefore(btn, titleEl.firstChild);
  };

  const addRowCopyButton = (row) => {
    if (!row || row.dataset.rowCopyAdded) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;
    const firstCell = cells[0];
    if (!firstCell?.textContent?.trim()) return;
    window.getComputedStyle(firstCell).position === "static" &&
      (firstCell.style.position = "relative");
    row.dataset.rowCopyAdded = "true";
    firstCell.appendChild(
      createButton(
        "row",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          copyRowContent(row, e.currentTarget);
        },
        '<div class="row-copy-tooltip">Copy input và output để Paste nhanh bằng KeyClipboard</div>'
      )
    );
  };

  const getProblemInfo = () => {
    if (isBeta()) {
      const problemCode = location.pathname.includes("/beta/problems/")
        ? location.pathname.split("/").pop().toUpperCase()
        : "";
      const element = $("h1") || $("h2");
      return { code: problemCode, title: element?.textContent.trim() || "" };
    }
    const titleElement = $(".submit__nav p span a.link--red");
    return titleElement
      ? {
          code: titleElement.href.match(/\/([^\/]+)$/)?.[1] || "",
          title: titleElement.textContent.trim(),
        }
      : { code: "", title: "" };
  };

  // Chuyển đổi các thẻ p thành div trong bảng tbody
  const convertParagraphsToDiv = () => {
    const table = document.querySelector("tbody");
    if (!table) return;
    Array.from(table.getElementsByTagName("p")).forEach(
      (p) => (p.outerHTML = `<div>${p.innerHTML}</div>`)
    );
  };

  const showSettingsModal = () => {
    $(".settings-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    const createOptions = (optionsObj, selected) =>
      Object.entries(optionsObj)
        .map(
          ([value, text]) =>
            `<option value="${value}" ${
              selected === value ? "selected" : ""
            }>${text}</option>`
        )
        .join("");

    overlay.innerHTML = `<div class="settings-modal">
      <span class="settings-close">×</span>
      <h3>⚙️ Settings</h3>
      <div class="settings-group"><label>Đuôi file: <input type="text" id="fileExtension" class="settings-input" value="${
        settings.fileExtension
      }"></label></div>
      <div class="settings-group"><label><input type="checkbox" id="removeAccents" ${
        settings.removeAccents ? "checked" : ""
      }> Xóa dấu tiếng Việt</label></div>
      <div class="settings-group"><label>Kiểu chữ: <select id="textCase" class="settings-select">${createOptions(
        OPTIONS.textCase,
        settings.textCase
      )}</select></label></div>
      <div class="settings-group"><label>Khoảng cách: <select id="separator" class="settings-select">${createOptions(
        OPTIONS.separator,
        settings.separator
      )}</select></label></div>
      <div class="settings-buttons"><button class="settings-btn-reset">Reset</button><button class="settings-btn-save">Lưu</button></div>
      <div class="settings-footer">CodePTIT Copier v1.2 <a href="https://github.com/nvbangg/CodePTIT_Copier" target="_blank">github.com/nvbangg/CodePTIT_Copier</a></div>
    </div>`;

    document.body.appendChild(overlay);
    const closeModal = () => overlay.remove();
    $(".settings-btn-save", overlay).addEventListener("click", () => {
      Object.assign(settings, {
        fileExtension: $("#fileExtension", overlay).value,
        removeAccents: $("#removeAccents", overlay).checked,
        textCase: $("#textCase", overlay).value,
        separator: $("#separator", overlay).value,
      });
      GM_setValue("settings", settings);
      closeModal();
    });
    $(".settings-btn-reset", overlay).addEventListener("click", () => {
      $("#fileExtension", overlay).value = DEFAULT_SETTINGS.fileExtension;
      $("#removeAccents", overlay).checked = DEFAULT_SETTINGS.removeAccents;
      $("#textCase", overlay).value = DEFAULT_SETTINGS.textCase;
      $("#separator", overlay).value = DEFAULT_SETTINGS.separator;
    });
    $(".settings-close", overlay).addEventListener("click", closeModal);
    overlay.addEventListener(
      "click",
      (e) => e.target === overlay && closeModal()
    );
  };

  const processLegacyPage = () => {
    const titleElement = $(".submit__nav p span a.link--red");
    if (titleElement) addTitleCopyButton(titleElement);
    $$(".submit__des tr:not(:first-child)").forEach((row) => {
      row.querySelectorAll("td").forEach(addCopyButton);
      addRowCopyButton(row);
    });
    $$(".submit__des [class*='testcase']")
      .filter(isValidTestCase)
      .forEach(addCopyButton);
  };
  const processBetaPage = () => {
    if (!/\/beta\/problems\/[A-Za-z0-9_]+/.test(location.pathname)) return;
    $$("table:not(.ant-table-fixed)").forEach((table) => {
      if (table?.querySelectorAll("tr").length > 1) {
        table.querySelectorAll("tr:not(:first-child)").forEach((row) => {
          row
            .querySelectorAll("td")
            .forEach(
              (cell) =>
                cell?.textContent?.trim() &&
                !cell.querySelector(".copy-btn") &&
                addCopyButton(cell)
            );
          addRowCopyButton(row);
        });
      }
    });
    $$("[class*='testcase']").filter(isValidTestCase).forEach(addCopyButton);
    const titleElement = $$("h1, h2").find(
      (el) =>
        el?.textContent?.trim() &&
        !el.parentElement?.querySelector(".title-copy-btn")
    );
    titleElement && addTitleCopyButton(titleElement);
  };
  const cleanupButtons = () => (
    $$(".copy-btn, .title-copy-btn, .row-copy-btn").forEach((btn) =>
      btn.remove()
    ),
    $$("[data-copy-added], [data-row-copy-added]").forEach((el) =>
      el.removeAttribute(
        el.dataset.copyAdded ? "data-copy-added" : "data-row-copy-added"
      )
    )
  );
  const processPage = () => (
    cleanupButtons(),
    isBeta() ? processBetaPage() : processLegacyPage(),
    convertParagraphsToDiv()
  );

  // Khởi tạo
  (() => {
    GM_registerMenuCommand("Settings", showSettingsModal);
    const observer = new MutationObserver(
      debounce(() => {
        if (observer.lastUrl !== location.href)
          return (observer.lastUrl = location.href), processPage();
        (isBeta() ? processBetaPage : processLegacyPage)();
        convertParagraphsToDiv();
      }, 300)
    );
    observer.lastUrl = location.href;
    const startObserver = () => (
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false,
      }),
      processPage()
    );
    document.readyState !== "loading"
      ? startObserver()
      : document.addEventListener("DOMContentLoaded", startObserver);
  })();
})();