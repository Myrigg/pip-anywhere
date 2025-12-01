# PiP Anywhere

Force Picture-in-Picture (PiP) on the main video element of any page where the
browser allows it — no hardcoded site list, no per-site hacks.

## Features

- One-click / one-shortcut PiP on any page with a `<video>`
- Smart main-video detection:
  - Prefers visible videos
  - Prefers currently playing videos
  - Breaks ties by largest resolution
- Works on YouTube, Crunchyroll, and most other HTML5 players
- Ignores pages with no video instead of throwing errors

## Installation (Developer Mode)

1. Clone or download this folder
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the folder containing `manifest.json`

Pin the icon for quick access.

## Usage

- Click the **PiP Anywhere** toolbar icon  
- Or use the keyboard shortcut (default: `Ctrl+Shift+P`, macOS: `⌘+Shift+P`)  
- If a suitable video is visible on the active tab, it will enter Picture-in-Picture

## Known Limitations

- Sites with heavy DRM may block PiP entirely; the extension cannot bypass this
- If you trigger PiP before a site has created its `<video>` element
  (e.g. just after navigation on a SPA), you might need to click again once playback starts

## License

Do whatever sensible thing you like with it. Enjoy your floating anime / lectures / cat videos.
