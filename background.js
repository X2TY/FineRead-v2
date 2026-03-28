// FineRead Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fineread-scan-selection',
    title: 'Scan with FineRead',
    contexts: ['selection', 'page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if(info.menuItemId === 'fineread-scan-selection'){
    const text = info.selectionText || '';
    chrome.storage.session.set({ pendingText: text, pendingUrl: tab.url });
    chrome.action.openPopup();
  }
});
