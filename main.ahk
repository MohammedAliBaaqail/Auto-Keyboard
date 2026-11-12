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
                        themeMap["radius"] := 22
                    }
                    if (!themeMap.Has("distance")) {
                        themeMap["distance"] := 3
                    }
                    if (!themeMap.Has("intensity")) {
                        themeMap["intensity"] := 18
                    }
                    if (!themeMap.Has("lightIntensity")) {
                        themeMap["lightIntensity"] := (themeMap.Has("intensity") ? themeMap["intensity"] : 18)
                    }
                    if (!themeMap.Has("darkIntensity")) {
                        themeMap["darkIntensity"] := (themeMap.Has("intensity") ? themeMap["intensity"] : 18)
                    }
                    if (!themeMap.Has("blur")) {
                        themeMap["blur"] := 8
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
            "alwaysOnTopHotkey", "^SPACE",
            "centerWindowHotkey", "^!c",
            "hideWindowHotkey", "^!h",
            "transparencyWheel", true,
            "opacity", 210,
            "appVolumeWheel", true,
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
        "theme", Map(
            "bgColor", "#e0e0e0",
            "accentColor", "#22c55e",
            "radius", 22,
            "distance", 3,
            "lightIntensity", 18,
            "darkIntensity", 18,
            "intensity", 18,
            "blur", 8
        )
    )
}

SaveConfigToFile() {
    global g_Config, CONFIG_FILE
    try {
        jsonStr := JSON.stringify(g_Config, 2)
        f := FileOpen(CONFIG_FILE, "w", "UTF-8")
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
    
    ; Unregister all existing hooks and stop auto clicker
    StopAutoClicker()
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
            if (trig != "" && outText != "") {
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
            if (src != "" && tgt != "") {
                try {
                    RegisterSingleRemap(src, tgt)
                } catch as err {
                    LogMessage("Remap error for " . src . ": " . err.Message)
                }
            }
        }
    }
}

RegisterSingleRemap(source, target) {
    global g_ActiveHotkeys
    
    ; Determine hook-safe source hotkey string to prevent self-triggering loops
    safeSource := (InStr(source, "$") || InStr(source, "*")) ? source : "$" . source

    ; Check for special built-in actions
    if (target = "MuteAudio") {
        Hotkey(safeSource, (*) => (SoundSetMute(-1), SoundBeep(650, 40)), "On")
        g_ActiveHotkeys.Push(safeSource)
        return
    }
    
    ; Key-to-key remap (e.g. CapsLock -> Control) with autorepeat protection
    if (source = "CapsLock" && target = "Control") {
        static isCapsHeld := false
        Hotkey("*CapsLock", (*) => (isCapsHeld ? "" : (isCapsHeld := true, Send("{Blind}{Ctrl DownR}"))), "On")
        Hotkey("*CapsLock up", (*) => (isCapsHeld := false, Send("{Blind}{Ctrl Up}")), "On")
        g_ActiveHotkeys.Push("*CapsLock")
        g_ActiveHotkeys.Push("*CapsLock up")
        return
    }
    
    ; General key / shortcut remap with hook ($)
    Hotkey(safeSource, (*) => Send("{" . target . "}"), "On")
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
    if (wm.Has("alwaysOnTopHotkey") && Trim(wm["alwaysOnTopHotkey"]) != "") {
        try {
            hk := Trim(wm["alwaysOnTopHotkey"])
            Hotkey(hk, (*) => ToggleAlwaysOnTop(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
    
    ; Center Window Hotkey
    if (wm.Has("centerWindowHotkey") && Trim(wm["centerWindowHotkey"]) != "") {
        try {
            hk := Trim(wm["centerWindowHotkey"])
            Hotkey(hk, (*) => CenterActiveWindow(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
    
    ; Boss Key / Hide Active Window Hotkey
    if (wm.Has("hideWindowHotkey") && Trim(wm["hideWindowHotkey"]) != "") {
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
    if (wm.Has("appVolumeMuteHotkey") && Trim(wm["appVolumeMuteHotkey"]) != "") {
        try {
            hk := Trim(wm["appVolumeMuteHotkey"])
            Hotkey(hk, (*) => ToggleActiveAppMute(), "On")
            g_ActiveHotkeys.Push(hk)
        }
    }
}

ToggleAlwaysOnTop() {
    global g_MainGui, g_Wv
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
    global g_MainGui, g_Wv
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
    global g_MainGui
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
    global g_MainGui, g_Wv
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
        
        if (g_Wv) {
            pct := Round((newAlpha / 255) * 100)
            msg := JSON.stringify(Map(
                "type", "moduleEvent",
                "module", "windowManager",
                "message", "Opacity: " . pct . "%"
            ))
            g_Wv.PostWebMessageAsString(msg)
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
    global g_MainGui, g_Wv
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
    global g_MainGui, g_Wv
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
            
            if (trig != "" && target != "") {
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
; GUI & WebView2 Window
; ==============================================================================

CreateMainWindow() {
    global g_MainGui, g_Wvc, g_Wv, APP_WIDTH, APP_HEIGHT, APP_NAME, g_Config
    
    g_MainGui := Gui("-Caption +Resize", APP_NAME)
    g_MainGui.Opt("+MinSize800x680")
    
    initBg := "212631"
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
                CoordMode("Mouse", "Screen")
                MouseGetPos(&initMouseX, &initMouseY)
                g_MainGui.GetPos(&initWinX, &initWinY, &initWinW, &initWinH)
                dir := msg.Has("dir") ? msg["dir"] : "se"
                minW := 600, minH := 520
                
                while GetKeyState("LButton", "P") {
                    MouseGetPos(&curX, &curY)
                    dx := curX - initMouseX
                    dy := curY - initMouseY
                    newW := initWinW
                    newH := initWinH
                    
                    if InStr(dir, "e") {
                        newW := Max(minW, initWinW + dx)
                    }
                    if InStr(dir, "s") {
                        newH := Max(minH, initWinH + dy)
                    }
                    
                    g_MainGui.Move(,,, newW, newH)
                    if (g_Wvc) {
                        try g_Wvc.Fill()
                    }
                    Sleep(8)
                }
                
            case "runLauncher":
                if (msg.Has("target")) {
                    RunLauncherTarget("", msg["target"])
                }
                
            case "toggleAutoClicker":
                ToggleAutoClicker()
                
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
