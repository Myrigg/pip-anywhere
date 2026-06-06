// options.js
// Lets the user opt in to (or out of) the broad <all_urls> host permission,
// which is what allows PiP to reach videos inside cross-origin iframes.

const ALL_URLS = { origins: ['<all_urls>'] };

const checkbox = document.getElementById('allFrames');
const status = document.getElementById('status');

function setStatus(message) {
  status.textContent = message || '';
}

// Reflect the currently granted permission state in the checkbox.
function refresh() {
  chrome.permissions.contains(ALL_URLS, (granted) => {
    checkbox.checked = !!granted;
    setStatus(granted
      ? 'Enabled — PiP can reach embedded videos on all sites.'
      : 'Off — PiP works on the active tab and its same-origin frames only.');
  });
}

checkbox.addEventListener('change', () => {
  // This handler runs from a user gesture, which is required for
  // chrome.permissions.request().
  if (checkbox.checked) {
    chrome.permissions.request(ALL_URLS, (granted) => {
      if (chrome.runtime.lastError) {
        setStatus('Could not request permission: ' + chrome.runtime.lastError.message);
      }
      if (!granted) {
        // User dismissed or denied the prompt — revert the toggle.
        checkbox.checked = false;
        setStatus('Permission not granted.');
        return;
      }
      refresh();
    });
  } else {
    chrome.permissions.remove(ALL_URLS, () => {
      if (chrome.runtime.lastError) {
        setStatus('Could not remove permission: ' + chrome.runtime.lastError.message);
      }
      refresh();
    });
  }
});

document.addEventListener('DOMContentLoaded', refresh);
