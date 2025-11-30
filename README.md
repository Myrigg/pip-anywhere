# PiP Anywhere

A lightweight Chrome/Chromium extension that lets you trigger **Picture-in-Picture** (PiP) mode on video sites including **YouTube**, **Crunchyroll**, and most HTML5 video players across the web.

This extension uses **Manifest V3**, runs entirely client-side, and works with:
- Google Chrome  
- Brave  
- Microsoft Edge  
- Any Chromium-based browser that supports MV3  

---

## ✨ Features

- One-click **Picture-in-Picture** via toolbar button  
- Optional keyboard shortcut (default: `Ctrl+Shift+P` on Windows/Linux, `Command+Shift+P` on macOS)  
- Works on most sites using `<video>` elements  
- Automatically finds the main playing video  
- Handles sites like Crunchyroll that disable PiP via `disablePictureInPicture`  
- Clean code: Manifest V3 + background service worker + content script  

---

## 🔧 Installation (Developer Mode)

you can install it in **Developer Mode**.

1. Download the repository ZIP:  
   **Code → Download ZIP**

2. Extract the ZIP to a folder.

3. Open Chrome and navigate to:  
   `chrome://extensions`

4. Enable **Developer mode** (toggle in the top right).

5. Click **Load unpacked** and select the folder containing `manifest.json`.

6. The extension should now appear as **PiP Anywhere**.

Optional: Pin the icon via Chrome’s puzzle-piece menu for quick access.

---

## 🚀 Usage

### Toolbar Button
- Go to any supported video site (YouTube, Crunchyroll, etc.)
- Start playing a video
- Click the **PiP Anywhere** toolbar icon
- The video pops into Picture-in-Picture mode

### Keyboard Shortcut
Default:
- **Windows/Linux:** `Ctrl + Shift + P`
- **macOS:** `Command + Shift + P`

You can change this at:  
`chrome://extensions/shortcuts`

---

## 🧠 How It Works (Technical Overview)

**Content Script (`src/contentScript.js`)**
- Runs on matching sites
- Finds the main video:
  - Prefers visible, currently playing videos  
  - Falls back to the largest video element  
- Removes `disablePictureInPicture` if present  
- Calls `requestPictureInPicture()`  
- Responds to messages from the background worker  

**Background Service Worker (`src/background.js`)**
- Listens for toolbar button clicks  
- Sends a `TRIGGER_PIP` message to the active tab  
- Handles keyboard shortcut commands  

**Manifest (`manifest.json`)**
- Defines MV3 extension metadata  
- Registers content scripts  
- Registers the background service worker  
- Defines the PiP trigger command  
- Grants minimal required permissions  

---

## 🧪 Known Limitations

- Some DRM-protected video players may still block PiP even after removing `disablePictureInPicture`.
- Pages without `<video>` elements will show a console message but otherwise behave normally.
- Some sites use multiple nested iframes; `all_frames: true` helps, but rare cases may require site-specific logic.

---

## 📜 License

MIT License  
Feel free to modify, extend, or reuse.

---

## ❤️ Contributions

Pull requests and suggestions are welcome!
