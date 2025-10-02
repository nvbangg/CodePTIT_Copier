chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: "https://github.com/nvbangg/CodePTIT_Copier"
  });
});