chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.commands.onCommand.addListener((shortcut) => {
  console.log("Reloading extension...");
  if (shortcut.includes("+M")) {
    chrome.runtime.reload();
  }
});

export {};
