; ==============================================================================
; AutoHotKeyboard v2.0 - Core Engine
; Framework: AutoHotkey v2 + Microsoft Edge WebView2 Front-End
; Design: 100% Faithful Neumorphic (Soft UI) with Light Green Accent
; Supported Modules:
;   1. Text Expander (with Multiline Expansion & Snippets)
;   2. Key Remapper & Custom Shortcuts
;   3. Window Management (Always-on-Top, Transparency, Center, Boss Key)
;   4. Quick App Launcher & Runner
;   5. Auto-Clicker & Key Repeater
; ==============================================================================

#Requires AutoHotkey v2
#SingleInstance Force
Persistent(true)
try DllCall("shell32\SetCurrentProcessExplicitAppUserModelID", "wstr", "AutoHotKeyboard.Engine.v2")

; Ensure strictly only ONE AutoHotKeyboard instance is running across processes
curPid := DllCall("GetCurrentProcessId")
try {
    for proc in ComObjGet("winmgmts:").ExecQuery("Select * from Win32_Process Where Name = 'AutoHotkey64.exe'") {
        if (proc.ProcessId != curPid && InStr(proc.CommandLine, "main.ahk")) {
            try ProcessClose(proc.ProcessId)
        }
    }
}

; Suppress hotkey flood warning dialog (e.g. for key repeat or rapid auto-clicking)
A_MaxHotkeysPerInterval := 50000
A_HotkeyInterval := 2000
A_MenuMaskKey := "vkE8"

; Include required support libraries
#Include lib\ComVar.ahk
#Include lib\Promise.ahk
#Include lib\JSON.ahk
#Include lib\WebView2\WebView2.ahk
#Include lib\AudioSession.ahk

; Global constants and variables
global APP_NAME := "AutoHotKeyboard"
global APP_WIDTH := 880
global APP_HEIGHT := 760
global CONFIG_FILE := A_ScriptDir . "\config.json"

global g_MainGui := 0
global g_Wvc := 0
global g_Wv := 0
global g_Config := Map()
global g_IsEngineActive := true

; Module active hook tracking
global g_ActiveHotstrings := []
global g_ActiveHotkeys := []
global g_AutoClickerRunning := false
global g_AutoClickerCount := 0
global g_LastExternalHwnd := 0
global g_LastPolledHwnd := 0
global g_ShadedWindows := Map()
global g_BorderlessWindows := Map()

; Macro Recorder tracking (initialized in auto-execute section)
global g_MacroRecorderHook := ""
global g_MacroIsRecording := false
global g_MacroLastTime := 0
global g_MacroRealDelays := false
global g_MacroDefDelay := 50
global g_MacroActiveTimers := Map()
global g_MacroActiveKeys := Map()
global g_MacroIsExecuting := false

LogMessage(msg) {
    OutputDebug("[AutoHotKeyboard] " . msg)
}

; Initialize Application
InitConfig()
CreateMainWindow()
SetupTrayMenu()
OnExit(OnAppExit)

OnAppExit(exitReason, exitCode) {
    global g_Wvc
    SetTimer(CheckActiveAppFocus, 0)
    SaveConfigToFile()
    StopAutoClicker()
    UnregisterAllHooks()
    if (g_Wvc) {
        try g_Wvc.Close()
        g_Wvc := 0
    }
}

; ==============================================================================
; Configuration Management
; ==============================================================================

InitConfig() {
    global g_Config, g_IsEngineActive, CONFIG_FILE
    
    if (FileExist(CONFIG_FILE)) {
        try {
            content := FileRead(CONFIG_FILE, "UTF-8")
            if (Trim(content) != "") {
                g_Config := JSON.parse(content, false, true)
                
                ; Migration check for legacy config formats
                if (!g_Config.Has("textExpander") && g_Config.Has("shortcuts")) {
                    g_Config["textExpander"] := Map(
                        "enabled", true,
                        "items", g_Config["shortcuts"]
                    )
                }
                
                ; Fill any missing module defaults
                defaults := GetDefaultConfig()
                for modName, modVal in defaults {
                    if (!g_Config.Has(modName)) {
                        g_Config[modName] := modVal
                    }
                }
                
                ; Ensure theme has all Neumorphism parameters
                if (g_Config.Has("theme") && IsObject(g_Config["theme"])) {
                    themeMap := g_Config["theme"]
                    if (!themeMap.Has("radius")) {
                        themeMap["radius"] := 14
                    }
                    if (!themeMap.Has("distance")) {
                        themeMap["distance"] := 3
                    }
                    if (!themeMap.Has("intensity")) {
                        themeMap["intensity"] := 10
                    }
                    if (!themeMap.Has("lightIntensity")) {
                        themeMap["lightIntensity"] := (themeMap.Has("intensity") ? themeMap["intensity"] : 9)
                    }
                    if (!themeMap.Has("darkIntensity")) {
                        themeMap["darkIntensity"] := (themeMap.Has("intensity") ? themeMap["intensity"] : 8)
                    }
                    if (!themeMap.Has("blur")) {
                        themeMap["blur"] := 8
                    }
                    if (!themeMap.Has("customPresets")) {
                        themeMap["customPresets"] := []
                    }
                }
            } else {
                g_Config := GetDefaultConfig()
                SaveConfigToFile()
            }
        } catch as err {
            LogMessage("Config read error: " . err.Message)
            g_Config := GetDefaultConfig()
            SaveConfigToFile()
        }
    } else {
        g_Config := GetDefaultConfig()
        SaveConfigToFile()
    }
    
    ; Master engine toggle state
    if g_Config.Has("enabled") {
        g_IsEngineActive := (g_Config["enabled"] = true || g_Config["enabled"] = 1)
    } else {
        g_IsEngineActive := true
        g_Config["enabled"] := true
    }
    
    ApplyAllModules()
}

GetDefaultConfig() {
    return Map(
        "enabled", true,
        "activeTab", "textExpander",
        "textExpander", Map(
            "enabled", true,
            "items", [
                Map("id", "te-1", "input", "@@1", "output", "myemail@gmail.com", "multiline", false),
                Map("id", "te-2", "input", "@@sig", "output", "Best regards,`nYour Name`nSenior Engineer", "multiline", true)
            ]
        ),
        "keyRemapper", Map(
            "enabled", true,
            "items", [
                Map("id", "kr-1", "source", "CapsLock", "target", "Control", "name", "CapsLock to Control"),
                Map("id", "kr-2", "source", "^!m", "target", "MuteAudio", "name", "Mute Master Audio (Ctrl+Alt+M)")
            ]
        ),
        "windowManager", Map(
            "enabled", true,
            "alwaysOnTopEnabled", true,
            "alwaysOnTopHotkey", "^SPACE",
            "centerWindowEnabled", true,
            "centerWindowHotkey", "^!c",
            "hideWindowEnabled", true,
            "hideWindowHotkey", "^!h",
            "transparencyWheel", true,
            "opacity", 210,
            "appVolumeWheel", true,
            "appVolumeMuteEnabled", true,
            "appVolumeMuteHotkey", "!m"
        ),
        "appLauncher", Map(
            "enabled", true,
            "items", [
                Map("id", "al-1", "trigger", "@calc", "triggerType", "string", "target", "calc.exe", "name", "Calculator"),
                Map("id", "al-2", "trigger", "@yt", "triggerType", "string", "target", "https://www.youtube.com", "name", "YouTube"),
                Map("id", "al-3", "trigger", "@gh", "triggerType", "string", "target", "https://github.com", "name", "GitHub")
            ]
        ),
        "autoClicker", Map(
            "enabled", true,
            "hotkey", "F8",
            "button", "Left",
            "clickType", "Single",
            "cps", 20,
            "limit", 0
        ),
        "macroRecorder", Map(
            "enabled", true,
            "items", [
                Map(
                    "id", "macro-1",
                    "name", "Fast Reload Combo",
                    "trigger", "F9",
                    "playbackMode", "NoRepeat",
                    "repeatInterval", 50,
                    "enabled", true,
                    "steps", [
                        Map("action", "Down", "key", "r", "delay", 40),
                        Map("action", "Up", "key", "r", "delay", 100),
                        Map("action", "Down", "key", "1", "delay", 40),
                        Map("action", "Up", "key", "1", "delay", 50)
                    ]
                )
            ]
        ),
        "theme", Map(
            "bgColor", "#b85d68",
            "accentColor", "#00cc18",
            "radius", 14,
            "distance", 3,
            "lightIntensity", 9,
            "darkIntensity", 8,
            "intensity", 10,
            "blur", 8,
            "customPresets", []
        )
    )
}

SaveConfigToFile() {
    global g_Config, CONFIG_FILE
    try {
        jsonStr := JSON.stringify(g_Config, 2)
        f := FileOpen(CONFIG_FILE, "w", "UTF-8-RAW")
        if (f) {
            f.Write(jsonStr)
            f.Close()
        }
    } catch as err {
        LogMessage("Failed to save config: " . err.Message)
    }
}

; ==============================================================================
; Master Engine Dispatcher
; ==============================================================================

ApplyAllModules() {
    global g_IsEngineActive
    
    ; Unregister all existing hooks and stop auto clicker and macros
    StopAutoClicker()
    StopAllMacros()
    UnregisterAllHooks()
    
    if (!g_IsEngineActive) {
        LogMessage("Master engine suspended (OFF)")
        return
    }
    
    ApplyTextExpander()
    ApplyKeyRemapper()
    ApplyWindowManager()
    ApplyAppLauncher()
    ApplyAutoClicker()
    ApplyMacroRecorder()
}

UnregisterAllHooks() {
    global g_ActiveHotstrings, g_ActiveHotkeys
    
    for trig in g_ActiveHotstrings {
        try Hotstring(":*:" . trig, "Off")
    }
    g_ActiveHotstrings := []
    
    for hk in g_ActiveHotkeys {
        try Hotkey(hk, "Off")
    }
    g_ActiveHotkeys := []
    StopAllMacros()
}

; ==============================================================================
; 1. Text Expander Module (with Multiline Support)
; ==============================================================================

ApplyTextExpander() {
    global g_Config, g_ActiveHotstrings
    
    if (!g_Config.Has("textExpander") || !g_Config["textExpander"].Has("items")) {
        return
    }
    
    modConfig := g_Config["textExpander"]
    if (modConfig.Has("enabled") && !modConfig["enabled"]) {
        return
    }
    
    for item in modConfig["items"] {
        if (IsObject(item) && item.Has("input") && item.Has("output")) {
            trig := Trim(item["input"])
            outText := item["output"]
            isEnabled := (!item.Has("enabled") || item["enabled"] = true || item["enabled"] = 1 || item["enabled"] = "1")
            if (trig != "" && outText != "" && isEnabled) {
                try {
                    handler := CreateExpanderHandler(trig, outText)
                    Hotstring(":*:" . trig, handler, "On")
                    g_ActiveHotstrings.Push(trig)
                } catch as err {
                    LogMessage("Expander error for " . trig . ": " . err.Message)
                }
            }
        }
    }
}

CreateExpanderHandler(trigger, replacement) {
    return (*) => OnExpanderTriggered(trigger, replacement)
}

OnExpanderTriggered(trigger, replacement) {
    global g_Wv, g_IsEngineActive
    if (!g_IsEngineActive) {
        return
    }
    
    ; SendText sends exact unicode characters, including newlines, tabs, and special chars verbatim
    SendText(replacement)
    
    if (g_Wv) {
        try {
            msg := JSON.stringify(Map(
                "type", "moduleEvent",
                "module", "textExpander",
                "message", "Expanded: " . trigger
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    }
}

; ==============================================================================
; 2. Key Remapper & Custom Shortcuts Module
; ==============================================================================

ApplyKeyRemapper() {
    global g_Config, g_ActiveHotkeys
    
    if (!g_Config.Has("keyRemapper") || !g_Config["keyRemapper"].Has("items")) {
        return
    }
    
    modConfig := g_Config["keyRemapper"]
    if (modConfig.Has("enabled") && !modConfig["enabled"]) {
        return
    }
    
    for item in modConfig["items"] {
        if (IsObject(item) && item.Has("source") && item.Has("target")) {
            src := Trim(item["source"])
            tgt := Trim(item["target"])
            isEnabled := (!item.Has("enabled") || item["enabled"] = true || item["enabled"] = 1 || item["enabled"] = "1")
            if (src != "" && tgt != "" && isEnabled) {
                try {
                    RegisterSingleRemap(src, tgt)
                } catch as err {
                    LogMessage("Remap error for " . src . ": " . err.Message)
                }
            }
        }
    }
}

FormatSendString(rawKey) {
    ahkKey := NormalizeHotkeyToAhk(rawKey)
    if (ahkKey = "")
        ahkKey := rawKey
        
    ; Separate leading modifiers (^, !, +, #) from base key
    if RegExMatch(ahkKey, "^([\^!+#]*)(.+)$", &m) {
        mods := m[1]
        base := m[2]
        if (StrLen(base) > 1 && !RegExMatch(base, "^\{.+\}$")) {
            return mods . "{" . base . "}"
        }
        return mods . base
    }
    return ahkKey
}

RegisterSingleRemap(source, target) {
    global g_ActiveHotkeys
    
    cleanSource := Trim(source)
    cleanTarget := Trim(target)
    if (cleanSource = "" || cleanTarget = "")
        return

    ; Convert human-readable source (e.g. "Ctrl+Shift+A") to AHK format (e.g. "^+A")
    ahkSource := NormalizeHotkeyToAhk(cleanSource)
    if (ahkSource = "")
        ahkSource := cleanSource

    ; Determine hook-safe source hotkey string to prevent self-triggering loops
    safeSource := (InStr(ahkSource, "$") || InStr(ahkSource, "*")) ? ahkSource : "$" . ahkSource

    ; Check for special built-in actions
    if (cleanTarget = "MuteAudio") {
        Hotkey(safeSource, (*) => (SoundSetMute(-1), SoundBeep(650, 40)), "On")
        g_ActiveHotkeys.Push(safeSource)
        return
    }
    
    ; Modifier key remap (e.g. CapsLock -> Control, or any key to Ctrl/Shift/Alt)
    if (cleanTarget = "Control" || cleanTarget = "Ctrl" || cleanTarget = "Shift" || cleanTarget = "Alt") {
        modKey := (cleanTarget = "Control" || cleanTarget = "Ctrl") ? "Ctrl" : cleanTarget
        static isHeld := false
        Hotkey("*" . ahkSource, (*) => (isHeld ? "" : (isHeld := true, Send("{Blind}{" . modKey . " DownR}"))), "On")
        Hotkey("*" . ahkSource . " up", (*) => (isHeld := false, Send("{Blind}{" . modKey . " Up}")), "On")
        g_ActiveHotkeys.Push("*" . ahkSource)
        g_ActiveHotkeys.Push("*" . ahkSource . " up")
        return
    }
    
    ; General key / compound shortcut remap with hook ($)
    if (InStr(cleanTarget, "+") || InStr(cleanTarget, " ") || RegExMatch(cleanTarget, "^[\^!+#]")) {
        sendPattern := FormatSendString(cleanTarget)
        Hotkey(safeSource, (*) => Send(sendPattern), "On")
    } else {
        Hotkey(safeSource, (*) => Send("{Blind}{" . cleanTarget . "}"), "On")
    }
    g_ActiveHotkeys.Push(safeSource)
}

; ==============================================================================
; 3. Window Management Module
; ==============================================================================

ApplyWindowManager() {
    global g_Config, g_ActiveHotkeys
    
    if (!g_Config.Has("windowManager")) {
        return
    }
    
    wm := g_Config["windowManager"]
    if (wm.Has("enabled") && !wm["enabled"]) {
        return
    }
    
    ; Always-on-Top Hotkey
    if ((!wm.Has("alwaysOnTopEnabled") || wm["alwaysOnTopEnabled"]) && wm.Has("alwaysOnTopHotkey") && Trim(wm["alwaysOnTopHotkey"]) != "") {
        try {
            hk := Trim(wm["alwaysOnTopHotkey"])
            Hotkey(hk, (*) => ToggleAlwaysOnTop(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
    
    ; Center Window Hotkey
    if ((!wm.Has("centerWindowEnabled") || wm["centerWindowEnabled"]) && wm.Has("centerWindowHotkey") && Trim(wm["centerWindowHotkey"]) != "") {
        try {
            hk := Trim(wm["centerWindowHotkey"])
            Hotkey(hk, (*) => CenterActiveWindow(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
    
    ; Boss Key / Hide Active Window Hotkey
    if ((!wm.Has("hideWindowEnabled") || wm["hideWindowEnabled"]) && wm.Has("hideWindowHotkey") && Trim(wm["hideWindowHotkey"]) != "") {
        try {
            hk := Trim(wm["hideWindowHotkey"])
            Hotkey(hk, (*) => HideActiveWindow(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
    
    ; Mouse Wheel Transparency (#WheelUp / #WheelDown)
    if (wm.Has("transparencyWheel") && wm["transparencyWheel"]) {
        try {
            Hotkey("#WheelUp", (*) => AdjustActiveWindowTransparency(20), "On")
            Hotkey("#WheelDown", (*) => AdjustActiveWindowTransparency(-20), "On")
            g_ActiveHotkeys.Push("#WheelUp")
            g_ActiveHotkeys.Push("#WheelDown")
        }
    }
    
    ; Focused Application Volume Control (!WheelUp / !WheelDown, ^!PgUp / ^!PgDn)
    if (wm.Has("appVolumeWheel") && wm["appVolumeWheel"]) {
        try {
            Hotkey("!WheelUp", (*) => AdjustActiveAppVolume(0.05), "On")
            Hotkey("!WheelDown", (*) => AdjustActiveAppVolume(-0.05), "On")
            Hotkey("^!PgUp", (*) => AdjustActiveAppVolume(0.05), "On")
            Hotkey("^!PgDn", (*) => AdjustActiveAppVolume(-0.05), "On")
            g_ActiveHotkeys.Push("!WheelUp")
            g_ActiveHotkeys.Push("!WheelDown")
            g_ActiveHotkeys.Push("^!PgUp")
            g_ActiveHotkeys.Push("^!PgDn")
        }
    }

    ; Mute Active Application Hotkey
    if ((!wm.Has("appVolumeMuteEnabled") || wm["appVolumeMuteEnabled"]) && wm.Has("appVolumeMuteHotkey") && Trim(wm["appVolumeMuteHotkey"]) != "") {
        try {
            hk := Trim(wm["appVolumeMuteHotkey"])
            Hotkey(hk, (*) => ToggleActiveAppMute(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }

    ; Click-Through Ghost Mode Hotkey
    if (wm.Has("clickThroughGhostHotkey") && Trim(wm["clickThroughGhostHotkey"]) != "") {
        try {
            hk := Trim(wm["clickThroughGhostHotkey"])
            Hotkey(hk, (*) => ToggleGhostMode(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }

    ; Window Shade / Roll Up Hotkey
    if ((!wm.Has("windowShadeEnabled") || wm["windowShadeEnabled"]) && wm.Has("windowShadeHotkey") && Trim(wm["windowShadeHotkey"]) != "") {
        try {
            hk := Trim(wm["windowShadeHotkey"])
            Hotkey(hk, (*) => ToggleWindowShade(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }

    ; Force Borderless Fullscreen Hotkey
    if ((!wm.Has("borderlessEnabled") || wm["borderlessEnabled"]) && wm.Has("borderlessHotkey") && Trim(wm["borderlessHotkey"]) != "") {
        try {
            hk := Trim(wm["borderlessHotkey"])
            Hotkey(hk, (*) => ToggleBorderlessFullscreen(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
}

ToggleAlwaysOnTop() {
    global g_MainGui, g_Wv, g_Config
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("alwaysOnTopEnabled") && !g_Config["windowManager"]["alwaysOnTopEnabled"]) {
        return
    }
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd) {
            return
        }
        isTop := WinGetExStyle("ahk_id " . hwnd) & 0x8
        WinSetAlwaysOnTop(-1, "ahk_id " . hwnd)
        SoundBeep(isTop ? 600 : 900, 60)
        
        if (g_Wv) {
            msg := JSON.stringify(Map(
                "type", "moduleEvent",
                "module", "windowManager",
                "message", isTop ? "Always-on-Top: Disabled" : "Always-on-Top: Enabled"
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    }
}

CenterActiveWindow() {
    global g_MainGui, g_Wv, g_Config
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("centerWindowEnabled") && !g_Config["windowManager"]["centerWindowEnabled"]) {
        return
    }
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd) {
            return
        }
        MonitorGetWorkArea(, &l, &t, &r, &b)
        WinGetPos(,, &w, &h, "ahk_id " . hwnd)
        newX := l + (r - l - w) // 2
        newY := t + (b - t - h) // 2
        WinMove(newX, newY,,, "ahk_id " . hwnd)
        SoundBeep(850, 50)
        
        if (g_Wv) {
            msg := JSON.stringify(Map(
                "type", "moduleEvent",
                "module", "windowManager",
                "message", "Active Window Centered"
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    }
}

HideActiveWindow() {
    global g_MainGui, g_Config
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("hideWindowEnabled") && !g_Config["windowManager"]["hideWindowEnabled"]) {
        return
    }
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd) {
            return
        }
        WinMinimize("ahk_id " . hwnd)
        SoundBeep(500, 40)
    }
}

AdjustActiveWindowTransparency(delta) {
    global g_MainGui, g_Wv, g_Config
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("transparencyWheel") && !g_Config["windowManager"]["transparencyWheel"]) {
        return
    }
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd) {
            return
        }
        curAlpha := WinGetTransparent("ahk_id " . hwnd)
        if (curAlpha = "") {
            curAlpha := 255
        }
        newAlpha := Min(255, Max(40, curAlpha + delta))
        WinSetTransparent(newAlpha, "ahk_id " . hwnd)
        
        ; If Click-Through Ghost Mode is active in config
        if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("clickThroughGhost") && g_Config["windowManager"]["clickThroughGhost"]) {
            if (newAlpha < 255) {
                WinSetExStyle("+0x20", "ahk_id " . hwnd)
            } else {
                WinSetExStyle("-0x20", "ahk_id " . hwnd)
            }
        }
        
        if (g_Wv) {
            pct := Round((newAlpha / 255) * 100)
            ghostNote := (newAlpha < 255 && g_Config["windowManager"].Has("clickThroughGhost") && g_Config["windowManager"]["clickThroughGhost"]) ? " [Ghost Click-Through]" : ""
            msg := JSON.stringify(Map(
                "type", "moduleEvent",
                "module", "windowManager",
                "message", "Opacity: " . pct . "%" . ghostNote
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    }
}

ToggleGhostMode() {
    global g_MainGui, g_Wv, g_Config
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd)
            return
        exStyle := WinGetExStyle("ahk_id " . hwnd)
        isGhost := (exStyle & 0x20)
        if (isGhost) {
            WinSetExStyle("-0x20", "ahk_id " . hwnd)
            WinSetTransparent(255, "ahk_id " . hwnd)
            SoundBeep(600, 50)
            msg := "Ghost Mode: Disabled (Normal)"
        } else {
            curAlpha := WinGetTransparent("ahk_id " . hwnd)
            if (curAlpha = "" || curAlpha = 255) {
                WinSetTransparent(180, "ahk_id " . hwnd)
            }
            WinSetExStyle("+0x20", "ahk_id " . hwnd)
            SoundBeep(950, 50)
            msg := "Ghost Mode: Enabled (Click-Through)"
        }
        if (g_Wv) {
            postMsg := JSON.stringify(Map("type", "moduleEvent", "module", "windowManager", "message", msg))
            g_Wv.PostWebMessageAsString(postMsg)
        }
    }
}

ToggleWindowShade() {
    global g_MainGui, g_ShadedWindows, g_Config, g_Wv
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("windowShadeEnabled") && !g_Config["windowManager"]["windowShadeEnabled"])
        return
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd)
            return
        
        if (g_ShadedWindows.Has(hwnd)) {
            info := g_ShadedWindows[hwnd]
            g_ShadedWindows.Delete(hwnd)
            WinMove(info["x"], info["y"], info["w"], info["h"], "ahk_id " . hwnd)
            SoundBeep(850, 50)
            msg := "Window Shade: Unrolled"
        } else {
            minMax := WinGetMinMax("ahk_id " . hwnd)
            if (minMax = 1) {
                WinRestore("ahk_id " . hwnd)
            }
            WinGetPos(&x, &y, &w, &h, "ahk_id " . hwnd)
            g_ShadedWindows[hwnd] := Map("x", x, "y", y, "w", w, "h", h)
            
            captionH := DllCall("GetSystemMetrics", "int", 4, "int")
            frameH := DllCall("GetSystemMetrics", "int", 33, "int")
            titleBarHeight := Max(32, captionH + (frameH * 2) + 4)
            WinMove(x, y, w, titleBarHeight, "ahk_id " . hwnd)
            SoundBeep(650, 50)
            msg := "Window Shade: Rolled Up"
        }
        if (g_Wv) {
            postMsg := JSON.stringify(Map("type", "moduleEvent", "module", "windowManager", "message", msg))
            g_Wv.PostWebMessageAsString(postMsg)
        }
    }
}

ToggleBorderlessFullscreen() {
    global g_MainGui, g_BorderlessWindows, g_Config, g_Wv
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("borderlessEnabled") && !g_Config["windowManager"]["borderlessEnabled"])
        return
    try {
        hwnd := WinGetID("A")
        if (hwnd = g_MainGui.Hwnd)
            return
        
        if (g_BorderlessWindows.Has(hwnd)) {
            info := g_BorderlessWindows[hwnd]
            g_BorderlessWindows.Delete(hwnd)
            WinSetStyle(info["style"], "ahk_id " . hwnd)
            WinMove(info["x"], info["y"], info["w"], info["h"], "ahk_id " . hwnd)
            DllCall("SetWindowPos", "ptr", hwnd, "ptr", 0, "int", 0, "int", 0, "int", 0, "int", 0, "uint", 0x0027)
            SoundBeep(700, 50)
            msg := "Borderless: Restored Window"
        } else {
            minMax := WinGetMinMax("ahk_id " . hwnd)
            if (minMax = 1) {
                WinRestore("ahk_id " . hwnd)
            }
            WinGetPos(&x, &y, &w, &h, "ahk_id " . hwnd)
            curStyle := WinGetStyle("ahk_id " . hwnd)
            g_BorderlessWindows[hwnd] := Map("x", x, "y", y, "w", w, "h", h, "style", curStyle)
            
            hMon := DllCall("MonitorFromWindow", "ptr", hwnd, "uint", 2, "ptr")
            monInfo := Buffer(40, 0)
            NumPut("uint", 40, monInfo, 0)
            DllCall("GetMonitorInfo", "ptr", hMon, "ptr", monInfo)
            monLeft := NumGet(monInfo, 4, "int")
            monTop := NumGet(monInfo, 8, "int")
            monRight := NumGet(monInfo, 12, "int")
            monBottom := NumGet(monInfo, 16, "int")
            monW := monRight - monLeft
            monH := monBottom - monTop
            
            WinSetStyle("-0x00C40000", "ahk_id " . hwnd)
            WinMove(monLeft, monTop, monW, monH, "ahk_id " . hwnd)
            DllCall("SetWindowPos", "ptr", hwnd, "ptr", 0, "int", 0, "int", 0, "int", 0, "int", 0, "uint", 0x0027)
            SoundBeep(950, 50)
            msg := "Force Borderless Fullscreen Enabled"
        }
        if (g_Wv) {
            postMsg := JSON.stringify(Map("type", "moduleEvent", "module", "windowManager", "message", msg))
            g_Wv.PostWebMessageAsString(postMsg)
        }
    }
}

GetActiveExternalWindow() {
    global g_MainGui, g_LastExternalHwnd
    curHwnd := WinExist("A")
    if (curHwnd && curHwnd != g_MainGui.Hwnd) {
        g_LastExternalHwnd := curHwnd
        return curHwnd
    }
    if (g_LastExternalHwnd && WinExist("ahk_id " . g_LastExternalHwnd)) {
        return g_LastExternalHwnd
    }
    return 0
}

AdjustActiveAppVolume(delta) {
    global g_MainGui, g_Wv, g_Config
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("appVolumeWheel") && !g_Config["windowManager"]["appVolumeWheel"]) {
        return
    }
    try {
        hwnd := GetActiveExternalWindow()
        if (!hwnd) {
            return
        }
        pid := WinGetPID("ahk_id " . hwnd)
        if (!pid) {
            return
        }
        procName := ""
        try procName := ProcessGetName(pid)
        if (procName = "") {
            procName := "Application"
        }
        
        if (AudioSession.SetVolume(pid, delta, true, &newVol, &isMuted)) {
            pct := Round(newVol * 100)
            icon := isMuted ? "🔇" : (pct = 0 ? "🔈" : (pct < 50 ? "🔉" : "🔊"))
            ToolTip(icon . " " . procName . " Volume: " . pct . "%")
            SetTimer(() => ToolTip(), -1400)
            
            if (g_Wv) {
                msg := JSON.stringify(Map(
                    "type", "activeAppVolumeChanged",
                    "pid", pid,
                    "name", procName,
                    "volume", pct,
                    "muted", isMuted
                ))
                g_Wv.PostWebMessageAsString(msg)
            }
        } else {
            ToolTip("🔈 " . procName . " (No active audio session)")
            SetTimer(() => ToolTip(), -1400)
        }
    }
}

ToggleActiveAppMute() {
    global g_MainGui, g_Wv, g_Config
    if (g_Config.Has("windowManager") && g_Config["windowManager"].Has("appVolumeMuteEnabled") && !g_Config["windowManager"]["appVolumeMuteEnabled"]) {
        return
    }
    try {
        hwnd := GetActiveExternalWindow()
        if (!hwnd) {
            return
        }
        pid := WinGetPID("ahk_id " . hwnd)
        if (!pid) {
            return
        }
        procName := ""
        try procName := ProcessGetName(pid)
        if (procName = "") {
            procName := "Application"
        }
        
        if (AudioSession.ToggleMute(pid, &isMuted)) {
            curVol := AudioSession.GetVolume(pid)
            pct := curVol >= 0 ? Round(curVol * 100) : 0
            statusText := isMuted ? "MUTED" : "UNMUTED"
            icon := isMuted ? "🔇" : "🔊"
            ToolTip(icon . " " . procName . ": " . statusText . " (" . pct . "%)")
            SetTimer(() => ToolTip(), -1400)
            
            if (g_Wv) {
                msg := JSON.stringify(Map(
                    "type", "activeAppVolumeChanged",
                    "pid", pid,
                    "name", procName,
                    "volume", pct,
                    "muted", isMuted
                ))
                g_Wv.PostWebMessageAsString(msg)
            }
        }
    }
}

CheckActiveAppFocus() {
    global g_MainGui, g_Wv, g_LastExternalHwnd, g_LastPolledHwnd
    if (!g_Wv) {
        return
    }
    try {
        curHwnd := WinExist("A")
        if (curHwnd && curHwnd != g_MainGui.Hwnd) {
            g_LastExternalHwnd := curHwnd
            if (curHwnd != g_LastPolledHwnd) {
                g_LastPolledHwnd := curHwnd
                pid := WinGetPID("ahk_id " . curHwnd)
                procName := ""
                try procName := ProcessGetName(pid)
                if (procName != "") {
                    vol := AudioSession.GetVolume(pid, &isMuted)
                    pct := vol >= 0 ? Round(vol * 100) : -1
                    g_Wv.PostWebMessageAsString(JSON.stringify(Map(
                        "type", "activeAppVolumeChanged",
                        "pid", pid,
                        "name", procName,
                        "volume", pct,
                        "muted", isMuted
                    )))
                }
            }
        }
    }
}

; ==============================================================================
; 4. Quick App Launcher & Runner Module
; ==============================================================================

ApplyAppLauncher() {
    global g_Config, g_ActiveHotstrings, g_ActiveHotkeys
    
    if (!g_Config.Has("appLauncher") || !g_Config["appLauncher"].Has("items")) {
        return
    }
    
    launcherConfig := g_Config["appLauncher"]
    if (launcherConfig.Has("enabled") && !launcherConfig["enabled"]) {
        return
    }
    
    for item in launcherConfig["items"] {
        if (IsObject(item) && item.Has("trigger") && item.Has("target")) {
            trig := Trim(item["trigger"])
            target := Trim(item["target"])
            type := item.Has("triggerType") ? item["triggerType"] : "string"
            
            isEnabled := (!item.Has("enabled") || item["enabled"] = true || item["enabled"] = 1 || item["enabled"] = "1")
            if (trig != "" && target != "" && isEnabled) {
                try {
                    handler := CreateLauncherHandler(trig, target)
                    if (type = "hotkey" || type = "shortcut") {
                        ahkHk := NormalizeHotkeyToAhk(trig)
                        if (ahkHk != "") {
                            Hotkey(ahkHk, handler, "On")
                            g_ActiveHotkeys.Push(ahkHk)
                        }
                    } else {
                        Hotstring(":*:" . trig, handler, "On")
                        g_ActiveHotstrings.Push(trig)
                    }
                } catch as err {
                    LogMessage("Launcher error for " . trig . ": " . err.Message)
                }
            }
        }
    }
}

NormalizeHotkeyToAhk(rawHk) {
    clean := Trim(rawHk)
    if (clean = "")
        return ""
        
    ; If it already looks like pure AHK notation (e.g. ^!c, +F12, #Space, $^c)
    if RegExMatch(clean, "^[\$*~<>\^!+#]+[A-Za-z0-9_]+$") || RegExMatch(clean, "^(?i)(F\d{1,2}|Space|Tab|Enter|Esc|Escape|BS|Backspace|Delete|Del|Insert|Ins|Home|End|PgUp|PgDn)$") {
        return clean
    }
    
    ; Replace human-readable compound formats like "Ctrl + Alt + C"
    mods := ""
    key := ""
    parts := StrSplit(clean, "+")
    
    for part in parts {
        p := StrLower(Trim(part))
        if (p = "ctrl" || p = "control") {
            mods .= "^"
        } else if (p = "alt") {
            mods .= "!"
        } else if (p = "shift") {
            mods .= "+"
        } else if (p = "win" || p = "windows" || p = "meta" || p = "cmd") {
            mods .= "#"
        } else {
            actual := Trim(part)
            if (p = "space")
                actual := "Space"
            else if (p = "esc" || p = "escape")
                actual := "Esc"
            else if (p = "enter" || p = "return")
                actual := "Enter"
            else if (p = "tab")
                actual := "Tab"
            else if (p = "backspace" || p = "bs")
                actual := "Backspace"
            else if (p = "delete" || p = "del")
                actual := "Del"
            else if RegExMatch(actual, "^(?i)f(\d{1,2})$", &fm)
                actual := "F" . fm[1]
            key := actual
        }
    }
    
    if (key = "")
        return clean
        
    return mods . key
}

CreateLauncherHandler(trigger, target) {
    return (*) => RunLauncherTarget(trigger, target)
}

RunLauncherTarget(trigger, target) {
    global g_Wv, g_IsEngineActive
    if (!g_IsEngineActive) {
        return
    }
    
    try {
        Run(target)
        SoundBeep(950, 50)
        if (g_Wv) {
            msg := JSON.stringify(Map(
                "type", "moduleEvent",
                "module", "appLauncher",
                "message", "Launched: " . target
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    } catch as err {
        SoundBeep(400, 100)
        LogMessage("Run target failed: " . err.Message)
    }
}

; ==============================================================================
; 5. Auto-Clicker & Key Repeater Module
; ==============================================================================

ApplyAutoClicker() {
    global g_Config, g_ActiveHotkeys
    
    if (!g_Config.Has("autoClicker")) {
        return
    }
    
    ac := g_Config["autoClicker"]
    if (!ac.Has("hotkey") || Trim(ac["hotkey"]) = "") {
        return
    }
    
    try {
        hk := Trim(ac["hotkey"])
        Hotkey(hk, (*) => ToggleAutoClicker(), "On")
        g_ActiveHotkeys.Push(hk)
    } catch as err {
        LogMessage("AutoClicker hotkey error: " . err.Message)
    }
}

ToggleAutoClicker() {
    global g_AutoClickerRunning, g_AutoClickerCount, g_Config, g_IsEngineActive
    
    if (!g_IsEngineActive) {
        return
    }
    
    g_AutoClickerRunning := !g_AutoClickerRunning
    g_AutoClickerCount := 0
    
    if (g_AutoClickerRunning) {
        cps := 20
        if (g_Config.Has("autoClicker") && g_Config["autoClicker"].Has("cps")) {
            cps := Max(1, Min(100, g_Config["autoClicker"]["cps"]))
        }
        interval := Max(10, 1000 // cps)
        SetTimer(DoAutoClick, interval)
        SoundBeep(1100, 60)
    } else {
        SetTimer(DoAutoClick, 0)
        SoundBeep(550, 60)
    }
    
    NotifyWebAutoClicker()
}

StopAutoClicker() {
    global g_AutoClickerRunning
    g_AutoClickerRunning := false
    SetTimer(DoAutoClick, 0)
    NotifyWebAutoClicker()
}

DoAutoClick() {
    global g_AutoClickerRunning, g_AutoClickerCount, g_Config
    
    if (!g_AutoClickerRunning) {
        SetTimer(DoAutoClick, 0)
        return
    }
    
    btn := "Left"
    clickType := "Single"
    limit := 0
    
    if (g_Config.Has("autoClicker")) {
        ac := g_Config["autoClicker"]
        if (ac.Has("button")) {
            btn := ac["button"]
        }
        if (ac.Has("clickType")) {
            clickType := ac["clickType"]
        }
        if (ac.Has("limit")) {
            limit := ac["limit"]
        }
    }
    
    if (clickType = "Double") {
        Click(btn . " 2")
    } else {
        Click(btn)
    }
    
    g_AutoClickerCount++
    if (limit > 0 && g_AutoClickerCount >= limit) {
        StopAutoClicker()
        SoundBeep(800, 80)
    }
}

NotifyWebAutoClicker() {
    global g_Wv, g_AutoClickerRunning
    if (g_Wv) {
        try {
            msg := JSON.stringify(Map(
                "type", "autoClickerState",
                "running", g_AutoClickerRunning
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    }
}

; ==============================================================================
; 6. Macro Recording & Playback Module (Hardware-level capture & sequencer)
; ==============================================================================

ApplyMacroRecorder() {
    global g_Config, g_ActiveHotkeys, g_IsEngineActive
    
    StopAllMacros()
    
    if (!g_Config.Has("macroRecorder") || !g_Config["macroRecorder"].Has("items")) {
        return
    }
    
    modConfig := g_Config["macroRecorder"]
    if (modConfig.Has("enabled") && !modConfig["enabled"]) {
        return
    }
    
    for item in modConfig["items"] {
        if (IsObject(item) && item.Has("trigger") && item.Has("steps")) {
            trig := Trim(item["trigger"])
            isEnabled := (!item.Has("enabled") || item["enabled"] = true || item["enabled"] = 1)
            if (trig != "" && isEnabled && g_IsEngineActive) {
                try {
                    RegisterSingleMacro(item)
                } catch as err {
                    LogMessage("Macro register error for " . trig . ": " . err.Message)
                }
            }
        }
    }
}

RegisterSingleMacro(item) {
    global g_ActiveHotkeys
    
    trig := Trim(item["trigger"])
    ahkHk := NormalizeHotkeyToAhk(trig)
    if (ahkHk = "")
        ahkHk := trig
        
    safeHk := (InStr(ahkHk, "$") || InStr(ahkHk, "*")) ? ahkHk : "$" . ahkHk
    mode := item.Has("playbackMode") ? item["playbackMode"] : "NoRepeat"
    
    switch mode {
        case "RepeatWhileHolding":
            Hotkey(safeHk, (*) => StartMacroHold(item), "On")
            Hotkey(safeHk . " Up", (*) => StopMacroHold(item), "On")
            g_ActiveHotkeys.Push(safeHk)
            g_ActiveHotkeys.Push(safeHk . " Up")
            
        case "Toggle":
            Hotkey(safeHk, (*) => ToggleMacroLoop(item), "On")
            g_ActiveHotkeys.Push(safeHk)
            
        default: ; NoRepeat / Once
            Hotkey(safeHk, (*) => ExecuteMacroAsync(item), "On")
            g_ActiveHotkeys.Push(safeHk)
    }
}

ExecuteMacroAsync(item) {
    global g_IsEngineActive
    if (!g_IsEngineActive)
        return
    if (!item.Has("steps") || !IsObject(item["steps"]))
        return
        
    SetTimer(() => PlayMacroSteps(item["steps"]), -1)
}

StartMacroHold(item) {
    global g_IsEngineActive, g_MacroActiveTimers
    if (!g_IsEngineActive)
        return
    if (!item.Has("steps") || !IsObject(item["steps"]))
        return
        
    if (!IsSet(g_MacroActiveTimers) || !IsObject(g_MacroActiveTimers))
        g_MacroActiveTimers := Map()
        
    mId := item.Has("id") ? item["id"] : "hold_macro"
    if (g_MacroActiveTimers.Has(mId))
        return
        
    interval := item.Has("repeatInterval") ? Max(10, Integer(item["repeatInterval"])) : 50
    timerFn := () => PlayMacroSteps(item["steps"])
    g_MacroActiveTimers[mId] := timerFn
    
    SetTimer(timerFn, -1)
    SetTimer(timerFn, interval)
}

StopMacroHold(item) {
    global g_MacroActiveTimers
    if (!IsSet(g_MacroActiveTimers) || !IsObject(g_MacroActiveTimers))
        return
        
    mId := item.Has("id") ? item["id"] : "hold_macro"
    if (g_MacroActiveTimers.Has(mId)) {
        fn := g_MacroActiveTimers[mId]
        SetTimer(fn, 0)
        g_MacroActiveTimers.Delete(mId)
    }
}

ToggleMacroLoop(item) {
    global g_IsEngineActive, g_MacroActiveTimers, g_Wv
    if (!g_IsEngineActive)
        return
    if (!item.Has("steps") || !IsObject(item["steps"]))
        return
        
    if (!IsSet(g_MacroActiveTimers) || !IsObject(g_MacroActiveTimers))
        g_MacroActiveTimers := Map()
        
    mId := item.Has("id") ? item["id"] : "toggle_macro"
    if (g_MacroActiveTimers.Has(mId)) {
        fn := g_MacroActiveTimers[mId]
        SetTimer(fn, 0)
        g_MacroActiveTimers.Delete(mId)
        SoundBeep(600, 60)
        if (g_Wv) {
            try g_Wv.PostWebMessageAsString(JSON.stringify(Map("type", "macroLoopState", "id", mId, "running", false)))
        }
    } else {
        interval := item.Has("repeatInterval") ? Max(10, Integer(item["repeatInterval"])) : 50
        timerFn := () => PlayMacroSteps(item["steps"])
        g_MacroActiveTimers[mId] := timerFn
        SetTimer(timerFn, interval)
        SoundBeep(1100, 60)
        if (g_Wv) {
            try g_Wv.PostWebMessageAsString(JSON.stringify(Map("type", "macroLoopState", "id", mId, "running", true)))
        }
    }
}

StopAllMacros() {
    global g_MacroActiveTimers
    if (!IsSet(g_MacroActiveTimers) || !IsObject(g_MacroActiveTimers)) {
        g_MacroActiveTimers := Map()
        return
    }
    for mId, fn in g_MacroActiveTimers {
        try SetTimer(fn, 0)
    }
    g_MacroActiveTimers.Clear()
}

PlayMacroSteps(steps) {
    global g_MacroIsExecuting
    if (!IsObject(steps) || g_MacroIsExecuting)
        return
        
    g_MacroIsExecuting := true
    try {
        for s in steps {
            if (!IsObject(s))
                continue
                
            act := s.Has("action") ? s["action"] : "Down"
            k := s.Has("key") ? s["key"] : ""
            del := s.Has("delay") ? Max(5, Integer(s["delay"])) : 50
            
            if (act = "Delay") {
                Sleep(del)
                continue
            }
            if (k = "")
                continue
                
            ; Mouse clicks
            if (k = "LButton" || k = "RButton" || k = "MButton" || k = "Left" || k = "Right" || k = "Middle") {
                btn := (k = "Left") ? "LButton" : ((k = "Right") ? "RButton" : ((k = "Middle") ? "MButton" : k))
                if (act = "Click") {
                    Click(btn)
                } else if (act = "Down") {
                    SendEvent("{" . btn . " Down}")
                } else if (act = "Up") {
                    SendEvent("{" . btn . " Up}")
                }
            } else {
                ; Keyboard key
                if (act = "Down") {
                    SendEvent("{" . k . " Down}")
                } else if (act = "Up") {
                    SendEvent("{" . k . " Up}")
                } else {
                    SendEvent("{" . k . "}")
                }
            }
            Sleep(del)
        }
    } finally {
        g_MacroIsExecuting := false
    }
}

; --- Low-Level Macro Recorder Hook ---

StartMacroRecording(options := "") {
    global g_MacroRecorderHook, g_MacroIsRecording, g_MacroLastTime, g_MacroRealDelays, g_MacroDefDelay, g_MacroActiveKeys
    
    StopMacroRecording()
    
    g_MacroIsRecording := true
    g_MacroLastTime := 0
    g_MacroDefDelay := 50
    g_MacroRealDelays := false
    g_MacroActiveKeys := Map()
    
    if (IsObject(options)) {
        if (options.Has("defDelay"))
            g_MacroDefDelay := Max(10, Integer(options["defDelay"]))
        if (options.Has("realDelays"))
            g_MacroRealDelays := (options["realDelays"] = true || options["realDelays"] = 1 || options["realDelays"] = "true")
    }
    
    ih := InputHook("I0")
    ih.KeyOpt("{All}", "+N")
    ih.VisibleNonText := false
    ih.OnKeyDown := (hook, vk, sc) => OnMacroRecordKeyDown(vk, sc)
    ih.OnKeyUp := (hook, vk, sc) => OnMacroRecordKeyUp(vk, sc)
    
    g_MacroRecorderHook := ih
    ih.Start()
    SoundBeep(1100, 70)
}

StopMacroRecording() {
    global g_MacroRecorderHook, g_MacroIsRecording, g_MacroActiveKeys, g_Wv
    if (g_MacroRecorderHook) {
        try g_MacroRecorderHook.Stop()
        g_MacroRecorderHook := ""
    }
    g_MacroActiveKeys := Map()
    if (g_MacroIsRecording) {
        g_MacroIsRecording := false
        SoundBeep(700, 70)
        if (g_Wv) {
            try g_Wv.PostWebMessageAsString(JSON.stringify(Map("type", "macroRecordingStopped")))
        }
    }
}

OnMacroRecordKeyDown(vk, sc) {
    global g_MacroIsRecording, g_MacroLastTime, g_MacroRealDelays, g_MacroDefDelay, g_MacroActiveKeys, g_Wv
    if (!g_MacroIsRecording || !g_Wv)
        return
        
    kName := NormalizeRecordedKey(vk, sc)
    if (kName = "")
        return
        
    ; Ignore auto-repeat keydown
    if (g_MacroActiveKeys.Has(kName))
        return
        
    tNow := A_TickCount
    del := (g_MacroRealDelays && g_MacroLastTime > 0) ? Max(10, tNow - g_MacroLastTime) : g_MacroDefDelay
    g_MacroLastTime := tNow
    g_MacroActiveKeys[kName] := tNow
    
    ahkKey := (StrLen(kName) = 1) ? StrLower(kName) : ((kName = "Win") ? "LWin" : kName)
    
    try {
        msg := JSON.stringify(Map(
            "type", "macroStepRecorded",
            "action", "Down",
            "key", ahkKey,
            "delay", del
        ))
        g_Wv.PostWebMessageAsString(msg)
    }
}

OnMacroRecordKeyUp(vk, sc) {
    global g_MacroIsRecording, g_MacroLastTime, g_MacroRealDelays, g_MacroDefDelay, g_MacroActiveKeys, g_Wv
    if (!g_MacroIsRecording || !g_Wv)
        return
        
    kName := NormalizeRecordedKey(vk, sc)
    if (kName = "")
        return
        
    tNow := A_TickCount
    del := g_MacroDefDelay
    if (g_MacroActiveKeys.Has(kName)) {
        tDown := g_MacroActiveKeys[kName]
        del := g_MacroRealDelays ? Max(10, tNow - tDown) : g_MacroDefDelay
        g_MacroActiveKeys.Delete(kName)
    } else if (g_MacroRealDelays && g_MacroLastTime > 0) {
        del := Max(10, tNow - g_MacroLastTime)
    }
    g_MacroLastTime := tNow
    
    ahkKey := (StrLen(kName) = 1) ? StrLower(kName) : ((kName = "Win") ? "LWin" : kName)
    
    try {
        msg := JSON.stringify(Map(
            "type", "macroStepRecorded",
            "action", "Up",
            "key", ahkKey,
            "delay", del
        ))
        g_Wv.PostWebMessageAsString(msg)
    }
}

NormalizeRecordedKey(vk, sc) {
    if (vk >= 0x41 && vk <= 0x5A)
        return Chr(vk)
    if (vk >= 0x30 && vk <= 0x39)
        return Chr(vk)
    if (vk >= 0x60 && vk <= 0x69)
        return "Numpad" . (vk - 0x60)
    if (vk >= 0x70 && vk <= 0x87)
        return "F" . (vk - 0x6F)
        
    switch vk {
        case 0x11, 0xA2, 0xA3: return "Ctrl"
        case 0x10, 0xA0, 0xA1: return "Shift"
        case 0x12, 0xA4, 0xA5: return "Alt"
        case 0x5B, 0x5C: return "Win"
        case 0x1B: return "Escape"
        case 0x20: return "Space"
        case 0x09: return "Tab"
        case 0x0D: return "Enter"
        case 0x08: return "Backspace"
        case 0x2E: return "Delete"
        case 0x2D: return "Insert"
        case 0x24: return "Home"
        case 0x23: return "End"
        case 0x21: return "PgUp"
        case 0x22: return "PgDn"
        case 0x26: return "Up"
        case 0x28: return "Down"
        case 0x25: return "Left"
        case 0x27: return "Right"
        case 0x14: return "CapsLock"
        case 0x90: return "NumLock"
        case 0x91: return "ScrollLock"
        case 0x2C: return "PrintScreen"
        case 0x13: return "Pause"
        case 0x6A: return "NumpadMult"
        case 0x6B: return "NumpadAdd"
        case 0x6D: return "NumpadSub"
        case 0x6E: return "NumpadDot"
        case 0x6F: return "NumpadDiv"
        case 0xBA: return ";"
        case 0xBB: return "="
        case 0xBC: return ","
        case 0xBD: return "-"
        case 0xBE: return "."
        case 0xBF: return "/"
        case 0xC0: return "``"
        case 0xDB: return "["
        case 0xDC: return "\"
        case 0xDD: return "]"
        case 0xDE: return "'"
    }
    
    kName := GetKeyName(Format("vk{:02x}sc{:03x}", vk, sc))
    if (kName = "")
        return ""
    switch kName {
        case "Control", "Ctrl", "LControl", "RControl", "LCtrl", "RCtrl": return "Ctrl"
        case "Shift", "LShift", "RShift": return "Shift"
        case "Alt", "LAlt", "RAlt": return "Alt"
        case "Win", "LWin", "RWin": return "Win"
    }
    return kName
}

; ==============================================================================
; GUI & WebView2 Window
; ==============================================================================

CreateMainWindow() {
    global g_MainGui, g_Wvc, g_Wv, APP_WIDTH, APP_HEIGHT, APP_NAME, g_Config
    
    g_MainGui := Gui("-Caption +Resize", APP_NAME)
    g_MainGui.Opt("+MinSize720x520")
    
    initBg := "b85d68"
    if (g_Config.Has("theme") && g_Config["theme"].Has("bgColor")) {
        cleanHex := StrReplace(g_Config["theme"]["bgColor"], "#", "")
        if (StrLen(cleanHex) = 6) {
            initBg := cleanHex
        }
    }
    g_MainGui.BackColor := initBg
    
    posX := (A_ScreenWidth - APP_WIDTH) // 2
    posY := (A_ScreenHeight - APP_HEIGHT) // 2
    
    g_MainGui.OnEvent("Close", (*) => ExitApp())
    g_MainGui.OnEvent("Size", OnGuiSize)
    
    ; Windows 11 hardware-accelerated rounded corners
    DllCall("dwmapi\DwmSetWindowAttribute", "ptr", g_MainGui.Hwnd, "uint", 33, "uint*", 2, "uint", 4)
    ; Disable DWM default border to remove top border line artifact (DWMWA_COLOR_NONE = 0xFFFFFFFE)
    DllCall("dwmapi\DwmSetWindowAttribute", "ptr", g_MainGui.Hwnd, "uint", 34, "uint*", 0xFFFFFFFE, "uint", 4)
    
    ; Suppress Windows default top non-client frame calculation to eliminate the top white line artifact
    OnMessage(0x0083, OnNcCalcSize)
    
    ; Set App Icon for Windows Taskbar & System Tray
    iconPath := A_ScriptDir . "\app-icon.ico"
    if FileExist(iconPath) {
        try {
            TraySetIcon(iconPath)
            cxBig := DllCall("GetSystemMetrics", "int", 11, "int")   ; SM_CXICON
            cyBig := DllCall("GetSystemMetrics", "int", 12, "int")   ; SM_CYICON
            cxSm  := DllCall("GetSystemMetrics", "int", 49, "int")   ; SM_CXSMICON
            cySm  := DllCall("GetSystemMetrics", "int", 50, "int")   ; SM_CYSMICON
            if (cxBig < 32) cxBig := 32
            if (cyBig < 32) cyBig := 32
            if (cxSm < 16) cxSm := 16
            if (cySm < 16) cySm := 16

            hIconBig := DllCall("LoadImage", "ptr", 0, "str", iconPath, "uint", 1, "int", cxBig, "int", cyBig, "uint", 0x00000010, "ptr")
            hIconSmall := DllCall("LoadImage", "ptr", 0, "str", iconPath, "uint", 1, "int", cxSm, "int", cySm, "uint", 0x00000010, "ptr")
            if (hIconBig)
                SendMessage(0x0080, 1, hIconBig, g_MainGui.Hwnd)
            if (hIconSmall)
                SendMessage(0x0080, 0, hIconSmall, g_MainGui.Hwnd)
        }
    }

    g_MainGui.Show(Format("x{} y{} w{} h{}", posX, posY, APP_WIDTH, APP_HEIGHT))
    
    InitWebView2()
}

OnNcCalcSize(wParam, lParam, msg, hwnd) {
    global g_MainGui
    if (g_MainGui && hwnd = g_MainGui.Hwnd) {
        return 0
    }
}

InitWebView2() {
    global g_MainGui, g_Wvc, g_Wv
    
    ; Dedicated WebView2 user data folder in AppData to prevent conflict with running Edge browser (0x800700AA)
    userDataDir := A_AppData . "\AutoHotKeyboard\WebView2"
    if !DirExist(userDataDir) {
        try DirCreate(userDataDir)
    }
    
    ; Resolve architecture-specific WebView2Loader.dll path
    loaderDll := A_ScriptDir . "\lib\WebView2\" . (A_PtrSize = 8 ? "64bit" : "32bit") . "\WebView2Loader.dll"
    if (!FileExist(loaderDll)) {
        loaderDll := A_ScriptDir . "\WebView2Loader.dll"
    }
    
    ; Attempt initialization with primary data directory, fallback to process-specific temp directory if locked
    try {
        g_Wvc := WebView2.CreateControllerAsync(g_MainGui.Hwnd, 0, userDataDir, "", loaderDll).await2(8000)
    } catch as err {
        LogMessage("Primary WebView2 data folder busy or failed (" . err.Message . "), trying isolated session...")
        tempDataDir := A_Temp . "\AutoHotKeyboard_WV_" . ProcessExist()
        try {
            if !DirExist(tempDataDir)
                DirCreate(tempDataDir)
            g_Wvc := WebView2.CreateControllerAsync(g_MainGui.Hwnd, 0, tempDataDir, "", loaderDll).await2(8000)
        } catch as err2 {
            LogMessage("FATAL: Failed to initialize WebView2 component: " . err2.Message)
            MsgBox("Failed to initialize WebView2 component: " . err2.Message, "AutoHotKeyboard Error", 16)
            ExitApp()
        }
    }
    
    try {
        g_Wv := g_Wvc.CoreWebView2
        try g_Wvc.DefaultBackgroundColor := 0
        try g_Wvc.Fill()
        
        settings := g_Wv.Settings
        settings.AreDefaultContextMenusEnabled := false
        settings.IsStatusBarEnabled := false
        settings.AreDevToolsEnabled := true
        
        g_Wv.add_WebMessageReceived(WebView2.Handler(OnWebMessageReceived, 3))
        g_Wv.add_NavigationCompleted(WebView2.Handler((*) => SendInitialStateToWeb(), 3))
        
        ; Inject initial config & theme before page DOM is created to prevent any reset or flash
        try {
            initJson := JSON.stringify(g_Config)
            g_Wv.AddScriptToExecuteOnDocumentCreatedAsync("window.__INITIAL_CONFIG__ = " . initJson . ";")
        }
        
        htmlUri := "file:///" . StrReplace(A_ScriptDir . "\ui\index.html", "\", "/")
        g_Wv.Navigate(htmlUri)
        LogMessage("WebView2 successfully initialized and navigated to: " . htmlUri)
        
        ; Start polling for active window changes to update Window Manager volume live
        SetTimer(CheckActiveAppFocus, 400)
        
    } catch as err {
        LogMessage("FATAL: Failed to configure WebView2: " . err.Message)
        MsgBox("Failed to configure WebView2: " . err.Message, "AutoHotKeyboard Error", 16)
        ExitApp()
    }
}

OnGuiSize(guiObj, minMax, width, height) {
    global g_Wvc
    if (g_Wvc && minMax != -1) {
        try g_Wvc.Fill()
    }
}

; ==============================================================================
; WebUI Message Dispatcher
; ==============================================================================

OnWebMessageReceived(thisPtr, senderPtr, argsPtr) {
    global g_MainGui, g_Wv, g_Config, g_IsEngineActive, CONFIG_FILE
    
    args := WebView2.WebMessageReceivedEventArgs(argsPtr)
    rawJson := args.TryGetWebMessageAsString()
    
    if (rawJson = "") {
        return
    }
    
    try {
        msg := JSON.parse(rawJson, false, true)
        action := msg.Has("action") ? msg["action"] : ""
        
        switch action {
            case "getInitialState":
                SendInitialStateToWeb()
                
            case "saveState":
                if (msg.Has("config") && IsObject(msg["config"])) {
                    g_Config := msg["config"]
                    if (g_Config.Has("enabled")) {
                        g_IsEngineActive := (g_Config["enabled"] = true || g_Config["enabled"] = 1)
                    }
                    if (g_Config.Has("theme") && g_Config["theme"].Has("bgColor")) {
                        cleanHex := StrReplace(g_Config["theme"]["bgColor"], "#", "")
                        if (StrLen(cleanHex) = 6) {
                            try g_MainGui.BackColor := cleanHex
                        }
                    }
                    SaveConfigToFile()
                    ApplyAllModules()
                }
                
            case "startDrag":
                CoordMode("Mouse", "Screen")
                MouseGetPos(&initMouseX, &initMouseY)
                g_MainGui.GetPos(&initWinX, &initWinY)
                while GetKeyState("LButton", "P") {
                    MouseGetPos(&curX, &curY)
                    g_MainGui.Move(initWinX + (curX - initMouseX), initWinY + (curY - initMouseY))
                    Sleep(8)
                }
                
            case "startResize":
                dir := msg.Has("dir") ? msg["dir"] : "se"
                dirCode := 8
                switch dir {
                    case "w":  dirCode := 1  ; Left
                    case "e":  dirCode := 2  ; Right
                    case "n":  dirCode := 3  ; Top
                    case "nw": dirCode := 4  ; Top-left
                    case "ne": dirCode := 5  ; Top-right
                    case "s":  dirCode := 6  ; Bottom
                    case "sw": dirCode := 7  ; Bottom-left
                    case "se": dirCode := 8  ; Bottom-right
                }
                DllCall("ReleaseCapture")
                PostMessage(0x0112, 0xF000 + dirCode, 0, g_MainGui.Hwnd)
                
            case "runLauncher":
                if (msg.Has("target")) {
                    RunLauncherTarget("", msg["target"])
                }
                
            case "toggleAutoClicker":
                ToggleAutoClicker()

            case "startMacroRecording":
                opts := msg.Has("options") ? msg["options"] : msg
                StartMacroRecording(opts)

            case "setMacroRecordingOptions":
                global g_MacroRealDelays, g_MacroDefDelay
                if (msg.Has("realDelays"))
                    g_MacroRealDelays := (msg["realDelays"] = true || msg["realDelays"] = 1 || msg["realDelays"] = "true")
                if (msg.Has("defDelay"))
                    g_MacroDefDelay := Max(10, Integer(msg["defDelay"]))

            case "stopMacroRecording":
                StopMacroRecording()

            case "testMacro":
                if (msg.Has("macro") && IsObject(msg["macro"])) {
                    mObj := msg["macro"]
                    st := mObj.Has("steps") ? mObj["steps"] : []
                    SetTimer(() => PlayMacroSteps(st), -1)
                }

            case "stopAllMacros":
                StopAllMacros()
                
            case "minimize":
                g_MainGui.Minimize()
                
            case "close":
                SaveConfigToFile()
                ExitApp()
                
            case "reload":
                InitConfig()
                SendInitialStateToWeb()
                
            case "openConfig":
                try Run('explorer.exe /select,"' . CONFIG_FILE . '"')
                
            case "browseApp":
                try {
                    selectedFile := FileSelect(1, , "Select Application or Executable", "Programs (*.exe; *.lnk; *.bat; *.cmd; *.com; *.ps1; *.vbs)|All Files (*.*)")
                    if (selectedFile != "") {
                        SplitPath(selectedFile, &outFileName, &outDir, &outExt, &outNameNoExt)
                        if (g_Wv) {
                            resMsg := JSON.stringify(Map(
                                "type", "appSelected",
                                "path", selectedFile,
                                "name", outNameNoExt
                            ))
                            g_Wv.PostWebMessageAsString(resMsg)
                        }
                    }
                } catch as err {
                    LogMessage("browseApp error: " . err.Message)
                }

            case "getActiveAppVolume":
                hwnd := GetActiveExternalWindow()
                if (hwnd) {
                    pid := WinGetPID("ahk_id " . hwnd)
                    procName := ""
                    try procName := ProcessGetName(pid)
                    vol := AudioSession.GetVolume(pid, &isMuted)
                    pct := vol >= 0 ? Round(vol * 100) : -1
                    if (g_Wv) {
                        g_Wv.PostWebMessageAsString(JSON.stringify(Map(
                            "type", "activeAppVolumeChanged",
                            "pid", pid,
                            "name", procName,
                            "volume", pct,
                            "muted", isMuted
                        )))
                    }
                }

            case "setActiveAppVolume":
                hwnd := GetActiveExternalWindow()
                if (hwnd && msg.Has("volume")) {
                    pid := msg.Has("pid") && msg["pid"] > 0 ? msg["pid"] : WinGetPID("ahk_id " . hwnd)
                    volNorm := msg["volume"] / 100.0
                    AudioSession.SetVolume(pid, volNorm, false, &newVol, &isMuted)
                }

            case "toggleMuteActiveApp":
                ToggleActiveAppMute()
        }
    } catch as err {
        LogMessage("WebMessage dispatch error: " . err.Message)
    }
}

SendInitialStateToWeb() {
    global g_Wv, g_Config, g_IsEngineActive, g_AutoClickerRunning
    if (!g_Wv) {
        return
    }
    
    try {
        response := Map(
            "type", "init",
            "enabled", g_IsEngineActive,
            "autoClickerRunning", g_AutoClickerRunning,
            "config", g_Config
        )
        jsonStr := JSON.stringify(response)
        g_Wv.PostWebMessageAsString(jsonStr)
    } catch as err {
        LogMessage("Failed to send initial state: " . err.Message)
    }
}

; ==============================================================================
; Tray Menu
; ==============================================================================

SetupTrayMenu() {
    global g_MainGui, APP_NAME
    
    iconPath := A_ScriptDir . "\app-icon.ico"
    if FileExist(iconPath) {
        try TraySetIcon(iconPath)
    }
    
    tray := A_TrayMenu
    tray.Delete()
    tray.Add("Show AutoHotKeyboard", (*) => (g_MainGui.Restore(), g_MainGui.Show()))
    tray.Add("Toggle Active/Suspended", (*) => ToggleEngineFromTray())
    tray.Add()
    tray.Add("Exit", (*) => ExitApp())
    tray.Default := "Show AutoHotKeyboard"
}

ToggleEngineFromTray() {
    global g_IsEngineActive, g_Config, g_Wv
    g_IsEngineActive := !g_IsEngineActive
    g_Config["enabled"] := g_IsEngineActive
    SaveConfigToFile()
    ApplyAllModules()
    
    if (g_Wv) {
        try {
            msg := JSON.stringify(Map(
                "type", "updateState",
                "enabled", g_IsEngineActive,
                "config", g_Config
            ))
            g_Wv.PostWebMessageAsString(msg)
        }
    }
}
