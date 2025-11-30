# PiP Anywhere  
A lightweight Chromium extension that forces Picture-in-Picture (PiP) mode on any website that contains a video element. One click or one shortcut pops the main video out into a floating window—even on sites that try to block it.

The extension aims to provide PiP **everywhere the browser allows it**, without maintaining a giant domain list.

---

## ✨ Features

- One-click PiP using the toolbar button  
- Global keyboard shortcut  
  - Windows/Linux: **Ctrl + Shift + P**  
  - macOS: **Command + Shift + P**  
- Works on YouTube, Crunchyroll, Netflix, and many others  
- Automatically identifies the main video on the page  
- Removes PiP-blocking attributes from videos  
- Minimal permissions (Manifest V3)  
- Background worker guarantees PiP is triggered with a valid user gesture

---

## 🧠 How It Works

### Background Service Worker — `src/background.js`
Listens for:
- Toolbar icon clicks  
- Keyboard shortcut commands  

When triggered, it sends a `TRIGGER_PIP` message to the active tab.  
It gracefully handles pages where no content script is injected.

### Content Script — `src/contentScript.js`
Injected into supported sites. It:

- Finds all `<video>` elements  
- Picks the primary video (largest, visible, currently playing)  
- Removes `disablePictureInPicture` when present  
- Attempts `video.requestPictureInPicture()`  
- Returns success/failure status to the background worker  

### Manifest — `manifest.json`
Defines:
- MV3 structure  
- PiP command and icons  
- Script injection rules  
- Permissions (`activeTab`, `tabs`)  
- Background service worker

---

## 🔧 Installation (Developer Mode)

1. Download or clone the repository  
2. Open **chrome://extensions**  
3. Enable **Developer mode**  
4. Click **Load unpacked**  
5. Select the folder containing `manifest.json`  

Optionally pin the toolbar icon for quicker access.

---

## 🚀 Usage

### Toolbar Button
Click the PiP Anywhere icon on any page with a video to instantly start Picture-in-Picture.

### Keyboard Shortcut
Use the global shortcut:

- **Ctrl + Shift + P** (Windows/Linux)  
- **Command + Shift + P** (macOS)

Customize shortcuts here:  
**chrome://extensions/shortcuts**

---

## ⚠️ Known Limitations

- Some DRM-locked players may still block PiP entirely  
- Auto-injection only occurs on domains listed in `content_scripts.matches`  
- Triggering PiP on pages with no videos simply does nothing  

---

## ❤️ Contributing

Feedback and pull requests are welcome.  
Experiment, tweak, extend—make PiP work the way you want everywhere the browser permits.
