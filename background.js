
import { syncFromDrive, syncToDrive } from './js/googleDriveSync.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('JetPrompt extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncFromDrive') {
    syncFromDrive().then(response => sendResponse(response));
    return true; // Indicates that sendResponse will be called asynchronously
  } else if (request.action === 'syncToDrive') {
    syncToDrive().then(response => sendResponse(response));
    return true; // Indicates that sendResponse will be called asynchronously
  } else if (request.action === 'getPrompts') {
    // Handle getPrompts request from content script
    chrome.storage.sync.get(['jetprompt_prompts'], (result) => {
      sendResponse(result.jetprompt_prompts || []);
    });
    return true;
  }
});


