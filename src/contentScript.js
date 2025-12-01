// Content script for PiP Anywhere
// This runs in the context of the web page (YouTube, Crunchyroll, etc).

/**
 * Get all candidate <video> elements on the page.
 */
function getCandidateVideos() {
  const videos = Array.from(document.querySelectorAll('video'));

  if (!videos.length) {
    console.warn('[PiP Anywhere] No <video> elements found on this page.');
    return [];
  }

  return videos;
}

/**
 * Find the "main" video element on the page.
 * Strategy:
 * 1. Prefer a visible, currently playing video.
 * 2. Otherwise, pick the visible video with the largest resolution.
 */
function findMainVideo() {
  const videos = getCandidateVideos();
  if (!videos.length) {
    return null;
  }

  // Filter to visible videos only
  const visibleVideos = videos.filter(video => {
    const rect = video.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  const candidates = visibleVideos.length ? visibleVideos : videos;

  // Prefer currently playing videos
  const playingVideos = candidates.filter(video => {
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
    console.warn('[PiP Anywhere] Could not determine a main video element.');
  }

  return mainVideo;
}

/**
 * Try to make a given <video> enter Picture-in-Picture.
 */
async function requestPiPForVideo(video) {
  if (!video) {
    console.warn('[PiP Anywhere] No video element passed to requestPiPForVideo.');
    return false;
  }

  if (!document.pictureInPictureEnabled) {
    console.warn('[PiP Anywhere] Picture-in-Picture is not enabled in this browser.');
    return false;
  }

  // Some sites (like Crunchyroll) explicitly disable PiP via this attribute.
  if (video.hasAttribute('disablePictureInPicture')) {
    console.warn(
      '[PiP Anywhere] Video has disablePictureInPicture attribute, attempting to remove it.'
    );
    video.removeAttribute('disablePictureInPicture');
  }

  try {
    await video.requestPictureInPicture();
    console.log('[PiP Anywhere] Picture-in-Picture started.');
    return true;
  } catch (error) {
    console.error(
      '[PiP Anywhere] Failed to start Picture-in-Picture:',
      error
    );
    return false;
  }
}

/**
 * Request Picture-in-Picture for the main video on the page.
 * Returns a Promise that resolves to true/false depending on success.
 */
async function requestPiPForMainVideo() {
  // If some video is already in PiP, just log and return.
  if (document.pictureInPictureElement) {
    console.log('[PiP Anywhere] A video is already in Picture-in-Picture.');
    // You could optionally exit PiP here with:
    // await document.exitPictureInPicture();
    return true;
  }

  const video = findMainVideo();

  if (!video) {
    console.warn('[PiP Anywhere] Could not find a suitable video for PiP.');
    return false;
  }

  return requestPiPForVideo(video);
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
