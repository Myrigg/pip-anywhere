// Background service worker for PiP Anywhere
// Injects script.js into the active tab to toggle PiP, and surfaces a brief
// badge when something goes wrong (no video, blocked, unsupported).

// Flip to true while developing to see verbose logs in the worker console.
const DEBUG = false;
const debugPrefix = '[PiP Anywhere][debug]';
const log = (...args) => { if (DEBUG) console.debug(debugPrefix, ...args); };
const warn = (...args) => { if (DEBUG) console.warn(debugPrefix, ...args); };

// Human-readable badge for each failure reason. Success clears the badge.
const FAILURE_BADGES = {
  'no-video': { text: '∅', title: 'No video found on this page' },
  'pip-unsupported': { text: '!', title: 'Picture-in-Picture is not available here' },
  'request-failed': { text: '✕', title: 'This site blocked Picture-in-Picture' },
  'error': { text: '!', title: 'Something went wrong starting Picture-in-Picture' },
  'inject-failed': { text: '!', title: 'Cannot run on this page' }
};

// Failures ranked most-specific first, so a real "blocked" beats a sibling
// frame that simply had no video.
const FAILURE_PRIORITY = ['request-failed', 'pip-unsupported', 'error', 'no-video', 'inject-failed'];

function clearBadge(tabId) {
  chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
}

function showFailureBadge(tabId, reason) {
  const badge = FAILURE_BADGES[reason] || FAILURE_BADGES.error;
  Promise.allSettled([
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#c0392b' }),
    chrome.action.setBadgeText({ tabId, text: badge.text }),
    chrome.action.setTitle({ tabId, title: `PiP Anywhere — ${badge.title}` })
  ]).catch(() => {});

  // Best-effort auto-clear. The worker may be torn down before this fires,
  // in which case the badge clears on the next successful trigger anyway.
  setTimeout(() => {
    clearBadge(tabId);
    chrome.action.setTitle({ tabId, title: '' }).catch(() => {});
  }, 4000);
}

// Reduce the per-frame results down to a single outcome for the tab.
function resolveOutcome(results) {
  const outcomes = (results || [])
    .map((r) => r && r.result)
    .filter((r) => r && typeof r.reason === 'string');

  if (outcomes.some((o) => o.ok)) {
    return { ok: true };
  }

  for (const reason of FAILURE_PRIORITY) {
    if (outcomes.some((o) => o.reason === reason)) {
      return { ok: false, reason };
    }
  }

  // No usable results at all (e.g. nothing injected) — stay silent.
  return null;
}

function injectPiPScriptIntoTab(tabId) {
  if (!tabId) {
    warn('No tabId provided to injectPiPScriptIntoTab.');
    return;
  }

  log('Injecting script.js into tab', tabId);

  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: 'MAIN',             // IMPORTANT: run in the page's main world
    files: ['script.js']       // IMPORTANT: inject a file, not an inline func
  }).then((results) => {
    const outcome = resolveOutcome(results);
    if (!outcome) return;
    if (outcome.ok) {
      clearBadge(tabId);
    } else {
      log('PiP failed:', outcome.reason);
      showFailureBadge(tabId, outcome.reason);
    }
  }).catch((error) => {
    console.error(debugPrefix, 'Failed to execute script.js:', error);
    // Injection itself failed (e.g. chrome:// pages, web store, PDF viewer).
    showFailureBadge(tabId, 'inject-failed');
  });
}

// Toolbar button click
chrome.action.onClicked.addListener((tab) => {
  log('Browser action clicked.');
  if (tab && tab.id !== undefined) {
    injectPiPScriptIntoTab(tab.id);
  } else {
    // Fallback: query active tab if Chrome didn't pass one for some reason
    chrome.tabs.query({ active: true, currentWindow: true }, ([active]) => {
      if (active && active.id !== undefined) {
        injectPiPScriptIntoTab(active.id);
      } else {
        warn('No active tab found on action click.');
      }
    });
  }
});

// Keyboard shortcut
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'trigger-pip') {
    log('Command "trigger-pip" received.');
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab && tab.id !== undefined) {
        injectPiPScriptIntoTab(tab.id);
      } else {
        warn('No active tab found for trigger-pip command.');
      }
    });
  }
});
