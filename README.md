# AutoHotKeyboard

**AutoHotKeyboard** is a modern Windows desktop utility powered by **AutoHotkey v2** as the native automation engine and **Microsoft Edge WebView2** for a pixel-perfect, hardware-accelerated **Neumorphic (Soft UI)** tactile user interface.

---

## ✨ Features & Modules

### 1. ⚡ Text Expander & Multiline Snippets
* **Zero-Latency Expansion**: Triggers (e.g. `@@1`) expand instantly upon typing the last character anywhere in Windows (no Space or Enter required).
* **Multiline Support**: Toggle multiline expansion for full email templates, code boilerplate, or addresses with preserved formatting.
* **Pre-configured Examples**:
  * `@@1` $\rightarrow$ `myemail@gmail.com`
  * `@@sig` $\rightarrow$ Multi-line professional signature

### 2. ⌨️ Key Remapper & Custom Shortcuts
* **Low-Level Hook Remapping**: Seamlessly remap keys at the Windows keyboard hook layer.
* **Pre-configured Examples**:
  * `CapsLock` $\rightarrow$ `Control` (essential for programmers/vim users).
  * `Ctrl + Alt + M` $\rightarrow$ Mute/Unmute master volume with acoustic chime feedback.

### 3. 🪟 Window Management
* **Always-on-Top (`Ctrl + Space`)**: Pin the active window above all others.
* **Center Window (`Ctrl + Alt + C`)**: Snaps the foreground window to the exact center of your screen.
* **Boss Key (`Ctrl + Alt + H`)**: Instantly hides the active window.
* **Scrollwheel Opacity (`Win + Mouse Wheel`)**: Dynamically adjust any window's transparency on the fly.
* **Soft UI Opacity Slider**: Live interactive translucency preview.

### 4. 🚀 Quick App Launcher & Command Runner
* **Dual Trigger Modes**: Launch apps, open URLs, or run shell scripts by typing a text trigger (e.g. `@calc`) OR by pressing a custom global shortcut (e.g. `Ctrl+Alt+D`).
* **Built-in File Browser**: One-click file picker to locate `.exe`, `.lnk`, or application paths directly from the UI.
* **Pre-configured Examples**:
  * `@calc` $\rightarrow$ Windows Calculator
  * `@yt` $\rightarrow$ YouTube
  * `@gh` $\rightarrow$ GitHub

### 5. 🖱️ Auto-Clicker & Key Repeater
* **High-Speed Non-Blocking Engine**: Accurate timer-based clicker capable of up to 60 Clicks Per Second (CPS).
* **Tactile CPS Slider**: Smoothly dial CPS from 1 to 60.
* **Flexible Action Types**: Left, Right, or Middle click; Single or Double click.
* **Global Hotkey (`F8`)**: Toggle clicking on/off anywhere in Windows with chime feedback.

---

## 🎨 Advanced Neumorphic Theming Engine

AutoHotKeyboard features a custom HSL-based clay extrusion engine with 7 handcrafted presets and granular live sliders:

* **7 Curated Presets**:
  * **Soft Clay** (`#e0e5ec`): Classic balanced cool-gray neumorphic clay.
  * **Obsidian** (`#1e222b`): Stealth midnight dark mode with electric cyan accents.
  * **Retro Sharp** (`#f2f4f7`): Embossed brutalist mechanical look with **0px blur** and sharp **6px corners**.
  * **Warm Sand** (`#e8dfd5`): Ultra-curved organic pebble shape with **30px radius** and pillowy diffused shadows.
  * **Cyber Violet** (`#2b2640`): Moody chromatic plum twilight with neon lavender accents.
  * **Sage Mint** (`#dbe5de`): Botanical pastel with calming **24px rounded corners**.
  * **Arctic Frost** (`#edf2f7`): High-key silver with strong **60% luminous light highlight pop**.
* **5 Fine-Tuning Sliders**:
  * **Radius** (`0px` – `40px`): Dynamic squircle roundness.
  * **Distance** (`1px` – `15px`): 3D clay extrusion offset.
  * **Light Shadow** (`1%` – `100%`): Independent intensity for top-left luminous highlight.
  * **Dark Shadow** (`1%` – `100%`): Independent intensity for bottom-right depth shadow.
  * **Blur** (`0px` – `25px`): From sharp hard-edge embossing (0px) to ultra-soft ambient clay diffusion.
* **Custom Color Pickers**: Full hexadecimal and native color picker support with high-contrast dual-rim indicators.

---

## 📂 Project Structure

```text
AutoHotKeyboard/
├── main.ahk              # AutoHotkey v2 core engine & IPC dispatcher
├── Run-App.bat           # 1-click launcher script
├── config.json           # User configuration & persistent state
├── .gitignore            # Git exclusion rules
├── README.md             # Project documentation
├── lib/                  # AutoHotkey v2 dependencies
│   ├── ComVar.ahk        # COM variable wrapper
│   ├── JSON.ahk          # High-performance JSON parser & serializer
│   ├── Promise.ahk       # Async promise implementation
│   └── WebView2/         # WebView2 wrapper & native loader DLLs
│       ├── WebView2.ahk
│       ├── 32bit/WebView2Loader.dll
│       └── 64bit/WebView2Loader.dll
└── ui/                   # Front-end user interface
    ├── index.html        # HTML5 semantic structure
    ├── style.css         # Neumorphic CSS design system & dynamic variables
    └── app.js            # Two-way WebView2 IPC bridge & state management
```

---

## 🚀 Getting Started

### Prerequisites
1. **Windows 10 / 11** (with Edge WebView2 runtime installed, built-in by default).
2. **AutoHotkey v2** (Download from [autohotkey.com](https://www.autohotkey.com/v2/)).

### Running the App
1. Clone this repository:
   ```bash
   git clone https://github.com/MohammedAliBaaqail/Auto-Keyboard.git
   ```
2. Navigate into the folder:
   ```bash
   cd Auto-Keyboard
   ```
3. Run `Run-App.bat` or launch with AutoHotkey v2:
   ```bash
   "C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe" main.ahk
   ```

---

## 📄 License
MIT License. Open-source for personal and commercial productivity.
