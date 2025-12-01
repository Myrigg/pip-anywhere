// Background service worker for PiP Anywhere
// Injects script.js into the active tab to trigger PiP.

function injectPiPScriptIntoTab(tabId) {
  if (!tabId) {
    console.warn('[PiP Anywhere][debug] No tabId provided to injectPiPScriptIntoTab.');
    return;
  }

  console.debug('[PiP Anywhere][debug] Injecting script.js into tab', tabId);

  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: 'MAIN',             // IMPORTANT: run in the page's main world
    files: ['script.js']       // IMPORTANT: inject a file, not an inline func
  }).catch(error => {
    console.error('[PiP Anywhere][debug] Failed to execute script.js:', error);
  });
}

// Toolbar button click
chrome.action.onClicked.addListener((tab) => {
  console.debug('[PiP Anywhere][debug] Browser action clicked.');
  if (tab && tab.id !== undefined) {
    injectPiPScriptIntoTab(tab.id);
  } else {
    // Fallback: query active tab if Chrome didn't pass one for some reason
    chrome.tabs.query({ active: true, currentWindow: true }, ([active]) => {
      if (active && active.id !== undefined) {
        injectPiPScriptIntoTab(active.id);
      } else {
        console.warn('[PiP Anywhere][debug] No active tab found on action click.');
      }
    });
  }
});

// Keyboard shortcut
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'trigger-pip') {
    console.debug('[PiP Anywhere][debug] Command "trigger-pip" received.');
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id !== undefined) {
        injectPiPScriptIntoTab(tab.id);
      } else {
        console.warn('[PiP Anywhere][debug] No active tab found for trigger-pip command.');
      }
    });
  }
});