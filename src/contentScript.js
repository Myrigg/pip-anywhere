// Content script for PiP Anywhere
// Runs in the context of the web page (YouTube, Crunchyroll, etc).
// Assumes the PiP trigger comes from a user gesture in the extension UI.

'use strict';

const LOG_PREFIX = '[PiP Anywhere]';

/**
 * Safely log with a consistent prefix.
 */
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
 * Get all candidate <video> elements on the page.
 * Filters out non-HTMLVideoElement nodes defensively.
 */
function getCandidateVideos() {
  const collected = new Set();
  const visitedDocuments = new Set();

  function collectFromDocument(doc) {
    if (!doc || visitedDocuments.has(doc)) return;
    visitedDocuments.add(doc);

    // Grab any <video> elements directly in this document.
    const nodeList = doc.querySelectorAll('video');
    Array.from(nodeList).forEach((el) => {
      if (el instanceof HTMLVideoElement) {
        collected.add(el);
      }
    });

    // Recurse into shadow roots.
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el.shadowRoot) {
        collectFromDocument(el.shadowRoot);
      }
    });

    // Recurse into same-origin iframes when permitted.
    const frames = doc.querySelectorAll('iframe');
    frames.forEach((frame) => {
      try {
        if (frame.contentDocument) {
          collectFromDocument(frame.contentDocument);
        }
      } catch (err) {
        // Cross-origin frames will throw; ignore them quietly.
      }
    });
  }

  collectFromDocument(document);

  const videos = Array.from(collected);

  if (!videos.length) {
    warn('No <video> elements found on this page (including frames/shadow DOM).');
    return [];
  }

  return videos;
}

/**
 * Basic on-page video collection without traversing frames/shadow roots.
 * Mirrors the simpler logic from the earlier working version so we have
 * another way to locate videos.
 */
function getSimpleCandidateVideos() {
  const videos = Array.from(document.querySelectorAll('video')).filter(
    (el) => el instanceof HTMLVideoElement
  );

  if (!videos.length) {
    warn('No <video> elements found via simple querySelectorAll.');
    return [];
  }

  return videos;
}

/**
 * Compute an "area score" for a video element to decide which is most likely
 * the main player.
 *
 * Strategy:
 * 1. Prefer intrinsic resolution (videoWidth * videoHeight) when available.
 * 2. Fall back to layout size (DOM rect width * height) if intrinsic is 0.
 */
function getVideoAreaScore(video) {
  if (!(video instanceof HTMLVideoElement)) return 0;

  const intrinsicArea = (video.videoWidth || 0) * (video.videoHeight || 0);
  if (intrinsicArea > 0) {
    return intrinsicArea;
  }

  const rect = video.getBoundingClientRect();
  const domArea = rect.width * rect.height;
  return domArea > 0 ? domArea : 0;
}

/**
 * Check if a video element is visually "visible".
 * Uses DOM geometry; does not consider CSS opacity or z-index.
 */
function isVideoVisible(video) {
  const rect = video.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Heuristic for "currently playing" videos.
 * We intentionally keep this slightly relaxed because some streaming
 * players don't keep readyState in a cleanly spec-following state.
 */
function isVideoPlaying(video) {
  if (!(video instanceof HTMLVideoElement)) return false;

  const isPaused = video.paused;
  const isEnded = video.ended;
  const ready = video.readyState; // 0–4

  // Relaxed condition: playing if not paused/ended and we have at least metadata.
  return !isPaused && !isEnded && ready >= 1;
}

/**
 * Find the "main" video element on the page.
 *
 * Strategy:
 * 1. Collect all <video> elements.
 * 2. Prefer visible videos; if none are visible, fall back to all.
 * 3. Within that set, prefer videos that appear to be playing.
 * 4. Choose the largest candidate by area score (intrinsic or DOM fallback).
 */
function findMainVideo() {
  const videos = getCandidateVideos();
  if (!videos.length) {
    return null;
  }

  const visibleVideos = videos.filter(isVideoVisible);
  const initialCandidates = visibleVideos.length ? visibleVideos : videos;

  // Prefer currently playing videos if any look active.
  const playingVideos = initialCandidates.filter(isVideoPlaying);
  const candidates = playingVideos.length ? playingVideos : initialCandidates;

  if (!candidates.length) {
    warn('No candidate videos after filtering.');
    return null;
  }

  const mainVideo = candidates.reduce((best, current) => {
    if (!best) return current;

    const bestScore = getVideoAreaScore(best);
    const currentScore = getVideoAreaScore(current);

    return currentScore > bestScore ? current : best;
  }, null);

  if (!mainVideo) {
    warn('Could not determine a main video element.');
    return null;
  }

  return mainVideo;
}

/**
 * Legacy/alternate main video finder that mirrors the earlier version of
 * the extension. This provides a fallback strategy alongside the more
 * exhaustive frame/shadow DOM search.
 */
function findMainVideoFallback() {
  const videos = getSimpleCandidateVideos();
  if (!videos.length) {
    return null;
  }

  // Filter to visible videos only
  const visibleVideos = videos.filter((video) => {
    const rect = video.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  const candidates = visibleVideos.length ? visibleVideos : videos;

  // Prefer currently playing videos
  const playingVideos = candidates.filter((video) => {
    const isPlaying = !video.paused && !video.ended && video.readyState >= 2;
    return isPlaying;
  });

  const listToUse = playingVideos.length ? playingVideos : candidates;

  // Choose the largest by resolution
  const mainVideo = listToUse.reduce((largest, video) => {
    const largestArea =
      (largest?.videoWidth || 0) * (largest?.videoHeight || 0);
    const currentArea = (video.videoWidth || 0) * (video.videoHeight || 0);
    return currentArea > largestArea ? video : largest;
  }, null);

  if (!mainVideo) {
    warn('Could not determine a main video element via fallback strategy.');
  }

  return mainVideo;
}

/**
 * Try to make a given <video> enter Picture-in-Picture.
 * Returns a boolean success flag.
 *
 * NOTE: This function should only be called in response to a user gesture
 * (e.g. clicking the extension's browser action), which must be enforced
 * on the background/service worker side.
 */
async function requestPiPForVideo(video) {
  if (!(video instanceof HTMLVideoElement)) {
    warn('requestPiPForVideo called without a valid HTMLVideoElement.');
    return false;
  }

  if (!document.pictureInPictureEnabled) {
    warn('Picture-in-Picture is not enabled in this browser.');
    return false;
  }

  // Some sites explicitly disable PiP via this attribute.
  // We only remove it in response to an explicit extension-triggered action.
  if (video.hasAttribute('disablePictureInPicture')) {
    warn(
      'Video has disablePictureInPicture attribute, attempting to remove it.'
    );
    video.removeAttribute('disablePictureInPicture');
  }

  try {
    await video.requestPictureInPicture();
    log('Picture-in-Picture started.');
    return true;
  } catch (err) {
    // Avoid logging overly detailed or sensitive data from the page.
    error('Failed to start Picture-in-Picture.', String(err && err.message || err));
    return false;
  }
}

/**
 * Request Picture-in-Picture for the main video on the page.
 * Returns a Promise<boolean> indicating success.
 */
async function requestPiPForMainVideo() {
  // If some video is already in PiP, just log and return success.
  if (document.pictureInPictureElement) {
    log('A video is already in Picture-in-Picture.');
    // Optional: you could exit PiP here if you want a toggle behavior.
    // await document.exitPictureInPicture();
    return true;
  }

  let video = findMainVideo();

  // Fallback to the legacy detection logic if the exhaustive search fails.
  if (!video) {
    log('Falling back to legacy video detection logic.');
    video = findMainVideoFallback();
  }

  if (!video) {
    warn('Could not find a suitable video for PiP.');
    return false;
  }

  return requestPiPForVideo(video);
}

/**
 * Message handler from the extension background/service worker.
 * We defensively:
 * - Validate the message shape.
 * - Restrict handling to known message types.
 * - Wrap async logic in try/catch to avoid breaking the listener.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // Basic validation: ignore anything that doesn't look like our protocol.
    if (!message || typeof message !== 'object' || !message.type) {
      return; // Ignore unrelated or malformed messages
    }

    // Optional extra check: ensure message is from *this* extension.
    // In practice, content scripts only receive messages from their own extension,
    // but this is a harmless extra guard.
    if (sender && sender.id && chrome.runtime && chrome.runtime.id) {
      if (sender.id !== chrome.runtime.id) {
        warn('Received message from unexpected sender id; ignoring.');
        return;
      }
    }

    if (message.type === 'TRIGGER_PIP') {
      requestPiPForMainVideo().then(success => {
        try {
          sendResponse({ success: Boolean(success) });
        } catch (err) {
          // If the response channel is already closed, just log and move on.
          warn('Failed to send response for TRIGGER_PIP:', String(err && err.message || err));
        }
      });

      // Return true to indicate we will respond asynchronously.
      return true;
    }

    // Unknown message type: ignore silently or log if you want.
    // warn('Unknown message type received:', message.type);
  } catch (err) {
    error('Unexpected error in onMessage listener:', String(err && err.message || err));
    // Don’t rethrow, we don’t want to break other listeners or the page.
  }
});
