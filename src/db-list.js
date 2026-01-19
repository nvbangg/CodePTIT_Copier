(function () {
  if (window.__dbListInit) return;
  window.__dbListInit = true;
  const STORAGE_KEY = "dbExercisePage";
  let timer, restored, lastPath;

  const getFiber = (el) => el?.[Object.keys(el).find((prop) => prop.startsWith("__reactFiber$"))];
  const getPageNum = () => {
    const btn = [...document.querySelectorAll("button.bg-primary")].find((el) => /^\d+$/.test(el.textContent.trim()));
    return btn ? +btn.textContent.trim() : 1;
  };

  const restorePage = () => {
    if (restored) return;
    const saved = +sessionStorage.getItem(STORAGE_KEY);
    if (!saved || saved === 1 || getPageNum() === saved) return (restored = true);
    const pageBtn = [...document.querySelectorAll("button")].find((el) => /^\d+$/.test(el.textContent.trim()));
    for (let fiber = getFiber(pageBtn); fiber; fiber = fiber.return)
      if (typeof fiber.memoizedProps?.onPageChange === "function")
        return (restored = true), fiber.memoizedProps.onPageChange(saved - 1);
  };

  const run = () => {
    const isExercise = /^\/exercise\/?$/.test(location.pathname);
    if (lastPath !== location.pathname) (lastPath = location.pathname), isExercise && (restored = false);
    if (!isExercise) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.querySelectorAll('div[role="button"]').forEach((el) => {
        const h3 = el.querySelector(".col-span-7.min-w-0 h3");
        if (!h3 || h3.querySelector("a")) return;
        for (let fiber = getFiber(el); fiber; fiber = fiber.return) {
          const id = fiber.memoizedProps?.question?.id || fiber.pendingProps?.question?.id;
          if (id?.length > 30) {
            const link = Object.assign(document.createElement("a"), {
              href: "/question-detail/" + id,
              textContent: h3.textContent,
            });
            link.onclick = () => sessionStorage.setItem(STORAGE_KEY, getPageNum());
            h3.replaceChildren(link);
            break;
          }
        }
      });
      restorePage();
    }, 100);
  };

  run();
  addEventListener("popstate", run);
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
