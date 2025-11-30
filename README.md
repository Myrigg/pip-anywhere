# PiP Anywhere

A lightweight Chromium extension that lets you trigger Picture-in-Picture (PiP) mode on supported video sites.
Currently enabled for YouTube and Crunchyroll—the places where people most often want PiP and where video players tend to fight it.

The extension uses Manifest V3, runs entirely client-side, and works on:

- Google Chrome
- Brave
- Microsoft Edge
- Any Chromium browser with MV3 support

---

## ✨ Features

- One-click Picture-in-Picture via the toolbar button
- Optional keyboard shortcut (Ctrl+Shift+P on Windows/Linux, Command+Shift+P on macOS)
- Automatically detects the main visible/playing video
- Handles platforms that try to disable PiP (e.g., Crunchyroll)
- Minimal permissions, MV3-compliant, clean architecture

---

## 🔧 Installation (Developer Mode)

1. Download the repository ZIP:
   Code → Download ZIP

2. Extract it somewhere convenient.

3. Open:
   chrome://extensions

4. Enable Developer mode.

5. Click Load unpacked and select the folder containing manifest.json.

6. You’ll see PiP Anywhere appear in your extensions list.

(Optional) Pin the icon using Chrome’s puzzle-piece menu.

---

## 🚀 Usage

### Toolbar Button
1. Go to YouTube or Crunchyroll
2. Play any video
3. Click the PiP Anywhere icon
4. The video pops into Picture-in-Picture mode

### Keyboard Shortcut
- Windows/Linux: Ctrl + Shift + P
- macOS: Command + Shift + P

You can customize this via:
chrome://extensions/shortcuts

---

## 🧠 How It Works

### Content Script — src/contentScript.js
Runs only on YouTube and Crunchyroll. It:

- Locates the main video on the page using a robust heuristic
- Handles late-loading or DRM-wrapped video elements
- Removes disablePictureInPicture when needed
- Requests PiP
- Responds to messages from the background worker

### Background Service Worker — src/background.js
- Listens for toolbar clicks and keyboard shortcut commands
- Sends a TRIGGER_PIP message to the active tab
- Guarantees the PiP request happens within a user-gesture context

### Manifest — manifest.json
- Defines MV3 metadata
- Limits content script injection to YouTube + Crunchyroll
- Minimizes permissions (activeTab, tabs)
- Registers the background worker and PiP command

---

## 🧪 Known Limitations

- Only runs automatically on YouTube and Crunchyroll.
- DRM-heavy players may still block PiP even if the UI suggests otherwise.
- Sites outside the supported list won’t trigger PiP unless future versions add an opt-in allowlist.

---

## 📜 License

MIT License.
Fork freely—extend, improve, experiment.

---

## ❤️ Contributions

Feedback and pull requests are welcome.