// Background service worker for PiP Anywhere
// Triggers Picture-in-Picture on the "main" video in the active tab.

async function triggerPiPInActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      console.warn('[PiP Anywhere][debug] No active tab found.');
      return;
    }

    console.debug(
      '[PiP Anywhere][debug] Triggering PiP in tab:',
      tab.id,
      tab.url
    );

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: 'MAIN', // run in the page context
      func: () => {
        try {
          const debugPrefix = '[PiP Anywhere][debug]';

          const videos = Array.from(document.querySelectorAll('video'));

          if (!videos.length) {
            console.warn(`${debugPrefix} No <video> elements found on this page.`);
            return;
          }

          console.debug(`${debugPrefix} Found ${videos.length} <video> elements.`);

          // Filter to visible videos
          const visibleVideos = videos.filter((video, index) => {
            const rect = video.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0;
            if (visible) {
              console.debug(`${debugPrefix} Visible video details`, {
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
          console.debug(
            `${debugPrefix} Visible videos: ${visibleVideos.length}; All candidates: ${candidates.length}`
          );

          // Prefer playing videos
          const playingVideos = candidates.filter((video) => {
            return !video.paused && !video.ended && video.readyState >= 2;
          });

          const listToUse = playingVideos.length ? playingVideos : candidates;
          console.debug(
            `${debugPrefix} Playing videos: ${playingVideos.length}; Using list length: ${listToUse.length}`
          );

          if (!listToUse.length) {
            console.warn(`${debugPrefix} No suitable videos to use for PiP.`);
            return;
          }

          // Choose the "largest" video by resolution, fallback to client size
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
            console.warn(`${debugPrefix} Could not determine a main video element.`);
            return;
          }

          console.debug(`${debugPrefix} Selected main video`, {
            videoWidth: mainVideo.videoWidth,
            videoHeight: mainVideo.videoHeight,
            clientWidth: mainVideo.clientWidth,
            clientHeight: mainVideo.clientHeight,
            rect: mainVideo.getBoundingClientRect(),
            paused: mainVideo.paused,
            readyState: mainVideo.readyState
          });

          // Check PiP support
          if (!('pictureInPictureEnabled' in document) || !document.pictureInPictureEnabled) {
            console.warn(`${debugPrefix} Picture-in-Picture is not enabled in this browser.`);
            return;
          }

          // If some other video is already in PiP, exit first
          if (document.pictureInPictureElement && document.pictureInPictureElement !== mainVideo) {
            console.debug(`${debugPrefix} Exiting existing Picture-in-Picture first.`);
            try {
              document.exitPictureInPicture();
            } catch (e) {
              console.warn(`${debugPrefix} Failed to exit existing Picture-in-Picture:`, e);
            }
          }

          // Remove site-level PiP blocking if present (Crunchyroll etc.)
          if (mainVideo.hasAttribute('disablePictureInPicture')) {
            console.warn(
              `${debugPrefix} Video has disablePictureInPicture attribute, attempting to remove it.`
            );
            mainVideo.removeAttribute('disablePictureInPicture');
          }

          // Finally, request PiP
          mainVideo
            .requestPictureInPicture()
            .then(() => {
              console.debug(`${debugPrefix} Picture-in-Picture started.`);
            })
            .catch((error) => {
              console.error(
                `${debugPrefix} Failed to start Picture-in-Picture:`,
                error
              );
            });
        } catch (err) {
          console.error('[PiP Anywhere][debug] Error inside injected PiP function:', err);
        }
      }
    });
  } catch (error) {
    console.error('[PiP Anywhere][debug] Failed to trigger PiP in active tab:', error);
  }
}

// Toolbar button
chrome.action.onClicked.addListener(() => {
  console.debug('[PiP Anywhere][debug] Browser action clicked, triggering PiP.');
  triggerPiPInActiveTab();
});

// Keyboard shortcut
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'trigger-pip') {
    console.debug('[PiP Anywhere][debug] Command "trigger-pip" received.');
    triggerPiPInActiveTab();
  }
});