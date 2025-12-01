// Content script for PiP Anywhere
// This runs in the context of the web page (YouTube, Crunchyroll, etc).

/**
 * Get all candidate <video> elements on the page.
 */
function getCandidateVideos() {
  const videos = Array.from(document.querySelectorAll('video'));

  if (!videos.length) {
    console.warn('[PiP Anywhere][debug] No <video> elements found on this page.');

    if (!window.__pipAnywhereNoVideoNotified) {
      window.__pipAnywhereNoVideoNotified = true;
      try {
        alert('PiP Anywhere: No video elements found for Picture-in-Picture.');
      } catch (notificationError) {
        console.warn(
          '[PiP Anywhere][debug] Failed to show no-video notification:',
          notificationError
        );
      }
    }
    return [];
  }
  
  console.debug(`[PiP Anywhere][debug] Found ${videos.length} <video> elements.`);
  
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

  console.debug(
    `[PiP Anywhere][debug] Visible videos: ${visibleVideos.length}; ` +
      `All candidates: ${videos.length}`
  );

  visibleVideos.forEach((video, index) => {
    const rect = video.getBoundingClientRect();
    console.debug('[PiP Anywhere][debug] Visible video details', {
      index,
      rect: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      },
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
      src: video.currentSrc || video.src
    });
  });

  const candidates = visibleVideos.length ? visibleVideos : videos;

  // Prefer currently playing videos
  const playingVideos = candidates.filter(video => {
    const isPlaying = !video.paused && !video.ended && video.readyState >= 2;
    return isPlaying;
  });

  const listToUse = playingVideos.length ? playingVideos : candidates;

  console.debug(
    `[PiP Anywhere][debug] Playing videos: ${playingVideos.length}; ` +
      `Using list length: ${listToUse.length}`
  );

  // Choose the largest by resolution
  const mainVideo = listToUse.reduce((largest, video) => {
    const largestArea =
      (largest?.videoWidth || 0) * (largest?.videoHeight || 0);
    const currentArea = (video.videoWidth || 0) * (video.videoHeight || 0);
    return currentArea > largestArea ? video : largest;
  }, null);

  if (!mainVideo) {
    console.warn('[PiP Anywhere][debug] Could not determine a main video element.');
  }

  if (mainVideo) {
    const rect = mainVideo.getBoundingClientRect();
    console.debug('[PiP Anywhere][debug] Selected main video', {
      videoWidth: mainVideo.videoWidth,
      videoHeight: mainVideo.videoHeight,
      clientWidth: mainVideo.clientWidth,
      clientHeight: mainVideo.clientHeight,
      rect: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      },
      paused: mainVideo.paused,
      ended: mainVideo.ended,
      readyState: mainVideo.readyState,
      src: mainVideo.currentSrc || mainVideo.src
    });
  }

  return mainVideo;
}

/**
 * Try to make a given <video> enter Picture-in-Picture.
 */
async function requestPiPForVideo(video) {
  if (!video) {
    console.warn('[PiP Anywhere][debug] No video element passed to requestPiPForVideo.');
    return false;
  }

  if (!document.pictureInPictureEnabled) {
    console.warn('[PiP Anywhere][debug] Picture-in-Picture is not enabled in this browser.');
    return false;
  }

  // Some sites (like Crunchyroll) explicitly disable PiP via this attribute.
  if (video.hasAttribute('disablePictureInPicture')) {
    console.warn(
      '[PiP Anywhere][debug] Video has disablePictureInPicture attribute, attempting to remove it.'
    );
    video.removeAttribute('disablePictureInPicture');
  }

  try {
    await video.requestPictureInPicture();
    console.log('[PiP Anywhere][debug] Picture-in-Picture started.');
    return true;
  } catch (error) {
    console.error(
      '[PiP Anywhere][debug] Failed to start Picture-in-Picture:',
      error
      {
        name: error?.name,
        message: error?.message,
        error
      }
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
    console.log('[PiP Anywhere][debug] A video is already in Picture-in-Picture.');
    // You could optionally exit PiP here with:
    // await document.exitPictureInPicture();
    return true;
  }

  const video = findMainVideo();

  if (!video) {
    console.warn('[PiP Anywhere][debug] Could not find a suitable video for PiP.');
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
    console.debug('[PiP Anywhere][debug] Received TRIGGER_PIP message from background.', {
      sender
    });

    requestPiPForMainVideo().then(success => {
      console.debug('[PiP Anywhere][debug] Responding to TRIGGER_PIP with', { success });
      sendResponse({ success });
    });

    // Return true to indicate we will respond asynchronously
    return true;
  }
});
