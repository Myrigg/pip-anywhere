// Content script for PiP Anywhere
// This runs in the context of the web page (YouTube, Crunchyroll, etc).

/**
 * Find the "main" video element on the page.
 * Strategy:
 * 1. If there's a currently playing video, use that.
 * 2. Otherwise, pick the video with the largest resolution (width * height).
 */
function findMainVideo() {
  const videos = Array.from(document.querySelectorAll('video'));

  if (!videos.length) {
    console.warn('[PiP Anywhere] No <video> elements found on this page.');
    return null;
  }

  // Prefer a currently playing video
  const playingVideo = videos.find(video => {
    const isPlaying = !video.paused && !video.ended && video.readyState >= 2;
    return isPlaying;
  });

  if (playingVideo) {
    return playingVideo;
  }

  // Fallback: choose the largest video by resolution
  const largestVideo = videos.reduce((largest, video) => {
    const largestArea = (largest.videoWidth || 0) * (largest.videoHeight || 0);
    const currentArea = (video.videoWidth || 0) * (video.videoHeight || 0);
    return currentArea > largestArea ? video : largest;
  });

  return largestVideo || null;
}

/**
 * Request Picture-in-Picture for the main video.
 * Returns a Promise that resolves to true/false depending on success.
 */
async function requestPiPForMainVideo() {
  // If some video is already in PiP, try to reuse that
  if (document.pictureInPictureElement) {
    console.log('[PiP Anywhere] A video is already in Picture-in-Picture.');
    // You could optionally exit PiP here:
    // await document.exitPictureInPicture();
    return true;
  }

  const video = findMainVideo();

  if (!video) {
    console.warn('[PiP Anywhere] Could not find a suitable video for PiP.');
    return false;
  }

  if (!document.pictureInPictureEnabled) {
    console.warn('[PiP Anywhere] Picture-in-Picture is not enabled in this browser.');
    return false;
  }

  try {
    await video.requestPictureInPicture();
    console.log('[PiP Anywhere] Picture-in-Picture started.');
    return true;
  } catch (error) {
    console.error('[PiP Anywhere] Failed to start Picture-in-Picture:', error);
    return false;
  }
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return; // Ignore unrelated messages
  }

  if (message.type === 'TRIGGER_PIP') {
    requestPiPForMainVideo().then(success => {
      sendResponse({ success });
    });

    // Return true to indicate we will respond asynchronously
    return true;
  }
});