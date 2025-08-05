


chrome.runtime.onInstalled.addListener(() => {
  console.log('JetPrompt extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'getPrompts') {
    // Handle getPrompts request from content script
    chrome.storage.sync.get(['jetprompt_prompts'], (result) => {
      sendResponse(result.jetprompt_prompts || []);
    });
    return true;
  }
});


