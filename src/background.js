// Background service worker for PiP Anywhere
// Listens for toolbar button clicks and keyboard shortcuts,
// then tells the content script in the active tab to trigger PiP.

'use strict';

const LOG_PREFIX = '[PiP Anywhere]';

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function error(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Determine if a tab URL is a context where our content script is likely
 * to be injected. This is a soft check; the final truth comes from
 * sendMessage + lastError.
 */
function isSupportedTabUrl(url) {
  if (!url) return false;

  // Ignore browser internals and Web Store, where extensions can't inject.
  if (
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('https://chrome.google.com/webstore')
  ) {
    return false;
  }

  // Allow http(s), file, and other normal page schemes where the
  // manifest/content_scripts rules decide the final applicability.
  return true;
}

/**
 * Send a TRIGGER_PIP message to the active tab.
 * This function is always called as a result of a user action
 * (toolbar click or keyboard shortcut), satisfying the user-gesture
 * requirement for requestPictureInPicture downstream.
 */
async function triggerPiPInActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      warn('No active tab found.');
      return;
    }

    if (!isSupportedTabUrl(tab.url)) {
      warn('Active tab URL is not supported for PiP:', tab.url || '<unknown>');
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { type: 'TRIGGER_PIP' },
      (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          // Most common case: no content script on this page.
          warn('Could not contact content script:', lastError.message);
          return;
        }

        if (!response || typeof response.success !== 'boolean') {
          warn('Unexpected response from content script. PiP may not have been triggered.');
          return;
        }

        if (!response.success) {
          warn('Content script reported PiP failure.');
        } else {
          log('PiP triggered successfully.');
        }
      }
    );
  } catch (err) {
    error('Failed to trigger PiP in active tab:', String(err && err.message || err));
  }
}

// Handle toolbar button click (always a user gesture).
chrome.action.onClicked.addListener(() => {
  triggerPiPInActiveTab();
});

// Handle keyboard shortcut commands defined in manifest.json.
// Example: Ctrl/Cmd+Shift+P to trigger PiP on the active tab.
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'trigger-pip') {
      triggerPiPInActiveTab();
    }
  });
}