// script.js
// Runs in the page's MAIN world when injected by the background script.
// Finds the main video and toggles Picture-in-Picture.
//
// NOTE: This runs in the page context (MAIN world), so chrome.* APIs are NOT
// available here. The only way to report a result back to the extension is via
// the value this IIFE returns, which chrome.scripting.executeScript surfaces as
// the InjectionResult.result. Promises are awaited by executeScript, so we can
// return the final outcome of the async PiP request too.
(() => {
  const debugPrefix = '[PiP Anywhere][debug]';

  // Flip to true while developing to see verbose logs in the page console.
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.debug(debugPrefix, ...args); };
  const warn = (...args) => { if (DEBUG) console.warn(debugPrefix, ...args); };

  try {
    const videos = Array.from(document.querySelectorAll('video'));

    if (!videos.length) {
      warn('No <video> elements found on this page.');
      return { ok: false, reason: 'no-video' };
    }

    log(`Found ${videos.length} <video> elements.`);

    // Filter to visible videos (non-zero size)
    const visibleVideos = videos.filter((video, index) => {
      const rect = video.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      if (visible) {
        log('Visible video details', {
          index,
          rect,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          readyState: video.readyState
        });
      }
      return visible;
    });

    const candidates = visibleVideos.length ? visibleVideos : videos;
    log(`Visible videos: ${visibleVideos.length}; All candidates: ${candidates.length}`);

    // Prefer videos that are currently playing
    const playingVideos = candidates.filter((video) => {
      return !video.paused && !video.ended && video.readyState >= 2;
    });

    const listToUse = playingVideos.length ? playingVideos : candidates;
    log(`Playing videos: ${playingVideos.length}; Using list length: ${listToUse.length}`);

    if (!listToUse.length) {
      warn('No suitable videos to use for PiP.');
      return { ok: false, reason: 'no-video' };
    }

    // Choose the "main" video: largest area by resolution (fallback to client size)
    const mainVideo = listToUse.reduce((largest, video) => {
      if (!largest) return video;

      const largestArea =
        (largest.videoWidth || largest.clientWidth || 0) *
        (largest.videoHeight || largest.clientHeight || 0);

      const currentArea =
        (video.videoWidth || video.clientWidth || 0) *
        (video.videoHeight || video.clientHeight || 0);

      return currentArea > largestArea ? video : largest;
    }, null);

    if (!mainVideo) {
      warn('Could not determine a main video element.');
      return { ok: false, reason: 'no-video' };
    }

    log('Selected main video', {
      videoWidth: mainVideo.videoWidth,
      videoHeight: mainVideo.videoHeight,
      clientWidth: mainVideo.clientWidth,
      clientHeight: mainVideo.clientHeight,
      rect: mainVideo.getBoundingClientRect(),
      paused: mainVideo.paused,
      readyState: mainVideo.readyState
    });

    // Toggle: if the chosen video is already floating, exit PiP and stop.
    if (document.pictureInPictureElement === mainVideo) {
      log('Selected video is already in Picture-in-Picture; exiting (toggle).');
      return Promise.resolve(document.exitPictureInPicture())
        .then(() => {
          log('Picture-in-Picture exited.');
          return { ok: true, reason: 'exited' };
        })
        .catch((error) => {
          console.error(debugPrefix, 'Failed to exit Picture-in-Picture:', error);
          return { ok: false, reason: 'request-failed' };
        });
    }

    // Check PiP support
    if (!('pictureInPictureEnabled' in document) || !document.pictureInPictureEnabled) {
      warn('Picture-in-Picture is not enabled in this browser.');
      return { ok: false, reason: 'pip-unsupported' };
    }

    // If some OTHER element is already in PiP, exit that first.
    if (document.pictureInPictureElement && document.pictureInPictureElement !== mainVideo) {
      log('Exiting existing Picture-in-Picture first.');
      try {
        document.exitPictureInPicture();
      } catch (e) {
        warn('Failed to exit existing Picture-in-Picture:', e);
      }
    }

    // Some sites (Crunchyroll etc.) explicitly disable PiP via attribute.
    if (mainVideo.hasAttribute('disablePictureInPicture')) {
      warn('Video has disablePictureInPicture attribute, attempting to remove it.');
      mainVideo.removeAttribute('disablePictureInPicture');
    }

    // Now actually request Picture-in-Picture. This call must happen with no
    // preceding await so the user-gesture activation is still valid.
    return mainVideo.requestPictureInPicture()
      .then(() => {
        log('Picture-in-Picture started.');
        return { ok: true, reason: 'entered' };
      })
      .catch((error) => {
        console.error(debugPrefix, 'Failed to start Picture-in-Picture:', error);
        return { ok: false, reason: 'request-failed' };
      });
  } catch (err) {
    console.error(debugPrefix, 'Unexpected error in script.js:', err);
    return { ok: false, reason: 'error' };
  }
})();
