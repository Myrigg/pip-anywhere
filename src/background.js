// Background service worker for PiP Anywhere
// Listens for toolbar button clicks (and later keyboard shortcuts)
// and tells the content script in the active tab to trigger PiP.

/**
 * Send a TRIGGER_PIP message to the active tab.
 */
async function triggerPiPInActiveTab() {
  try {
    // Find the active tab in the current window
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      console.warn('[PiP Anywhere] No active tab found.');
      return;
    }

    // Send a message to the content script in this tab
    chrome.tabs.sendMessage(
      tab.id,
      { type: 'TRIGGER_PIP' },
      (response) => {
        if (chrome.runtime.lastError) {
          // This happens if there is no content script on the page
          console.warn(
            '[PiP Anywhere] Could not contact content script:',
            chrome.runtime.lastError.message
          );
          return;
        }

        if (!response || !response.success) {
          console.warn('[PiP Anywhere] Content script reported PiP failure.');
        } else {
          console.log('[PiP Anywhere] PiP triggered successfully.');
        }
      }
    );
  } catch (error) {
    console.error('[PiP Anywhere] Failed to trigger PiP in active tab:', error);
  }
}

// Handle toolbar button click
chrome.action.onClicked.addListener(() => {
  triggerPiPInActiveTab();
});

// Handle keyboard shortcut commands defined in manifest.json.
// Users can press Ctrl/Cmd+Shift+P (default) to trigger PiP on the active tab.
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'trigger-pip') {
    triggerPiPInActiveTab();
  }
});
