#Requires AutoHotkey v2.0
; ==============================================================================
; AudioSession.ahk - Core Audio WASAPI Session Controller for AutoHotkey v2
; Enables per-application volume retrieval, adjustment, and muting
; ==============================================================================

class AudioSession {
    static CLSID_MMDeviceEnumerator := "{BCDE0395-E52F-467C-8E3D-C4579291692E}"
    static IID_IMMDeviceEnumerator  := "{A95664D2-9614-4F35-A746-DE8DB63617E6}"
    static IID_IAudioSessionManager2 := "{77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F}"
    static IID_IAudioSessionControl2 := "{BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D}"
    static IID_ISimpleAudioVolume    := "{87CE5498-68D6-44E5-9215-6DA47EF883D8}"

    static GUIDFromString(str, &guid) {
        guid := Buffer(16, 0)
        DllCall("ole32\CLSIDFromString", "WStr", str, "Ptr", guid)
        return guid
    }

    /**
     * Enumerates all active audio sessions on default render endpoint.
     * Matches exact PID, or falls back to matching process name (for multi-process apps like Chrome, Spotify).
     * Populates matchedSessions array with session info and active ISimpleAudioVolume pointers.
     * Note: Caller MUST release each session["volPtr"] when done.
     */
    static GetSessions(targetPid, &matchedSessions, &targetProcName) {
        matchedSessions := []
        targetProcName := ""
        if (!targetPid)
            return false

        try targetProcName := StrLower(ProcessGetName(targetPid))

        try {
            pEnumerator := ComObject(this.CLSID_MMDeviceEnumerator, this.IID_IMMDeviceEnumerator)
            ; IMMDeviceEnumerator::GetDefaultAudioEndpoint(eRender=0, eMultimedia=1, &pDevice)
            ComCall(4, pEnumerator, "Int", 0, "Int", 1, "Ptr*", &pDevice := 0)
            if (!pDevice)
                return false

            this.GUIDFromString(this.IID_IAudioSessionManager2, &clsidManager)
            ; IMMDevice::Activate
            ComCall(3, pDevice, "Ptr", clsidManager, "UInt", 7, "Ptr", 0, "Ptr*", &pSessionManager := 0)
            if (!pSessionManager) {
                ObjRelease(pDevice)
                return false
            }

            ; IAudioSessionManager2::GetSessionEnumerator
            ComCall(5, pSessionManager, "Ptr*", &pSessionEnumerator := 0)
            if (!pSessionEnumerator) {
                ObjRelease(pSessionManager)
                ObjRelease(pDevice)
                return false
            }

            ; IAudioSessionEnumerator::GetCount
            ComCall(3, pSessionEnumerator, "Int*", &count := 0)

            this.GUIDFromString(this.IID_IAudioSessionControl2, &clsidControl2)
            this.GUIDFromString(this.IID_ISimpleAudioVolume, &clsidSimpleVolume)

            allSessions := []
            loop count {
                i := A_Index - 1
                ComCall(4, pSessionEnumerator, "Int", i, "Ptr*", &pSessionControl := 0)
                if (!pSessionControl)
                    continue

                pSessionControl2 := 0
                try ComCall(0, pSessionControl, "Ptr", clsidControl2, "Ptr*", &pSessionControl2 := 0)
                sessionPid := 0
                if (pSessionControl2) {
                    ; IAudioSessionControl2::GetProcessId
                    ComCall(14, pSessionControl2, "UInt*", &sessionPid := 0)
                    ObjRelease(pSessionControl2)
                }

                pSimpleVolume := 0
                try ComCall(0, pSessionControl, "Ptr", clsidSimpleVolume, "Ptr*", &pSimpleVolume := 0)
                ObjRelease(pSessionControl)

                if (pSimpleVolume) {
                    sessionProcName := ""
                    if (sessionPid > 0) {
                        try sessionProcName := StrLower(ProcessGetName(sessionPid))
                    }
                    allSessions.Push(Map("pid", sessionPid, "name", sessionProcName, "volPtr", pSimpleVolume))
                }
            }

            ObjRelease(pSessionEnumerator)
            ObjRelease(pSessionManager)
            ObjRelease(pDevice)

            ; Match exact PID
            for s in allSessions {
                if (s["pid"] = targetPid) {
                    matchedSessions.Push(s)
                }
            }

            ; Multi-process fallback: match by executable name
            if (matchedSessions.Length = 0 && targetProcName != "") {
                for s in allSessions {
                    if (s["name"] = targetProcName) {
                        matchedSessions.Push(s)
                    }
                }
            }

            ; Release any unmatched ISimpleAudioVolume pointers
            for s in allSessions {
                isMatched := false
                for m in matchedSessions {
                    if (m["volPtr"] = s["volPtr"]) {
                        isMatched := true
                        break
                    }
                }
                if (!isMatched) {
                    ObjRelease(s["volPtr"])
                }
            }

            return matchedSessions.Length > 0
        } catch {
            return false
        }
    }

    /**
     * Gets master volume level of application (0.0 to 1.0) or -1.0 if not active.
     */
    static GetVolume(targetPid, &outMuted := 0) {
        outMuted := 0
        if (!this.GetSessions(targetPid, &sessions, &procName))
            return -1.0

        vol := -1.0
        for s in sessions {
            curVol := 0.0
            isMuted := 0
            ; ISimpleAudioVolume::GetMasterVolume
            ComCall(4, s["volPtr"], "Float*", &curVol := 0.0)
            ; ISimpleAudioVolume::GetMute
            ComCall(6, s["volPtr"], "Int*", &isMuted := 0)
            vol := curVol
            outMuted := isMuted
            ObjRelease(s["volPtr"])
        }
        return vol
    }

    /**
     * Sets or adjusts application volume.
     * @param valOrDelta absolute (0.0 - 1.0) or relative delta (-0.05, +0.05)
     * @param isRelative true to add delta to current volume
     */
    static SetVolume(targetPid, valOrDelta, isRelative := false, &outNewVol := 0, &outMuted := 0) {
        outNewVol := -1.0
        outMuted := 0
        if (!this.GetSessions(targetPid, &sessions, &procName))
            return false

        for s in sessions {
            curVol := 0.0
            isMuted := 0
            ComCall(4, s["volPtr"], "Float*", &curVol := 0.0)
            ComCall(6, s["volPtr"], "Int*", &isMuted := 0)

            if (isRelative) {
                newVol := Min(1.0, Max(0.0, curVol + valOrDelta))
            } else {
                newVol := Min(1.0, Max(0.0, valOrDelta))
            }

            ; ISimpleAudioVolume::SetMasterVolume
            ComCall(3, s["volPtr"], "Float", newVol, "Ptr", 0)

            ; Automatically unmute if increasing volume above 0
            if (newVol > 0 && isMuted) {
                ComCall(5, s["volPtr"], "Int", 0, "Ptr", 0)
                isMuted := 0
            }

            outNewVol := newVol
            outMuted := isMuted
            ObjRelease(s["volPtr"])
        }
        return true
    }

    /**
     * Toggles mute state of target application sessions.
     */
    static ToggleMute(targetPid, &outMuted := 0) {
        outMuted := 0
        if (!this.GetSessions(targetPid, &sessions, &procName))
            return false

        for s in sessions {
            isMuted := 0
            ComCall(6, s["volPtr"], "Int*", &isMuted := 0)
            newMute := isMuted ? 0 : 1
            ; ISimpleAudioVolume::SetMute
            ComCall(5, s["volPtr"], "Int", newMute, "Ptr", 0)
            outMuted := newMute
            ObjRelease(s["volPtr"])
        }
        return true
    }
}
