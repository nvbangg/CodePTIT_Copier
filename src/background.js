chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendToCPH") {
    fetch("http://localhost:27121/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.data),
    })
      .then((response) => sendResponse({ success: response.ok }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});
