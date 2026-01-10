// Background service worker for the extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Quick Book AutoFill Extension Installed');
  
  // Initialize storage with default values if needed
  chrome.storage.local.get(['passengers', 'contact'], (result) => {
    if (!result.passengers) {
      chrome.storage.local.set({ passengers: [] });
    }
    if (!result.contact) {
      chrome.storage.local.set({ contact: {} });
    }
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStoredData') {
    chrome.storage.local.get(['passengers', 'contact'], (result) => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }
});

console.log('Background service worker loaded successfully');