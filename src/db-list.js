(function () {
  let timer;
  const run = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.querySelectorAll('div[role="button"]').forEach((el) => {
        const h3 = el.querySelector(".col-span-7.min-w-0 h3");
        if (!h3 || h3.querySelector("a")) return;
        let fiber = el[Object.keys(el).find((k) => k.startsWith("__reactFiber$"))];
        while (fiber) {
          const id = fiber.memoizedProps?.question?.id || fiber.pendingProps?.question?.id;
          if (id?.length > 30) {
            const a = document.createElement("a");
            a.href = "/question-detail/" + id;
            a.textContent = h3.textContent;
            h3.textContent = "";
            h3.appendChild(a);
            break;
          }
          fiber = fiber.return;
        }
      });
    }, 100);
  };
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
