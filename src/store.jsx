import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "alarm-studio-v2";
const BUILT_IN_SOUNDS = [
  { id: "classic", name: "Classic Alarm", kind: "Built-in", icon: "◉" },
  { id: "digital", name: "Digital Beep", kind: "Built-in", icon: "◌" },
  { id: "gentle", name: "Gentle Morning", kind: "Built-in", icon: "✦" },
  { id: "sunrise", name: "Sunrise", kind: "Built-in", icon: "☀" },
  { id: "nature", name: "Nature", kind: "Built-in", icon: "♧" },
  { id: "electronic", name: "Electronic", kind: "Built-in", icon: "⌁" },
  { id: "wake", name: "Wake Up", kind: "Built-in", icon: "↟" }
];

const DEFAULT_SETTINGS = {
  snoozeMinutes: 5, volume: 80, gradualVolume: true, vibration: true,
  defaultTone: "classic", reminderDefault: false, timeFormat: "12h",
  theme: "system", accent: "violet", notifications: true,
  preAlarmNotifications: true, snoozeNotifications: true, soundPreview: true
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      alarms: Array.isArray(raw.alarms) ? raw.alarms : [],
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) }
    };
  } catch {
    return { alarms: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

const Context = createContext(null);

export function AlarmProvider({ children }) {
  const initial = useMemo(load, []);
  const [alarms, setAlarms] = useState(initial.alarms);
  const [settings, setSettings] = useState(initial.settings);
  const [ringing, setRinging] = useState(null);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(new Date());
  const triggered = useRef(new Set());
  const audioCtxRef = useRef(null);
  const activeOscillators = useRef([]);
  const customAudioRef = useRef(null);
  const toneTimerRef = useRef(null);
  const vibrationTimerRef = useRef(null);
  const previousCheckRef = useRef(new Date());
  const snoozeTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ alarms, settings }));
  }, [alarms, settings]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => checkAlarms(new Date()), 1000);
    checkAlarms(new Date());
    return () => clearInterval(timer);
  }, [alarms, settings]);

  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) checkAlarms(new Date()); };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [alarms, settings]);

  useEffect(() => () => stopTone(), []);

  function notify(title, body) {
    if (!settings.notifications || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch {}
    }
  }

  async function requestNotifications() {
    if ("Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
  }

  function ensureAudio() {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  function beep(soundId, volume = settings.volume / 100) {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const map = {
      classic: [880, 660], digital: [1250, 750], gentle: [523, 659],
      sunrise: [392, 523], nature: [660, 880], electronic: [700, 1100], wake: [440, 880]
    };
    const tones = map[soundId] || map.classic;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = soundId === "electronic" ? "square" : "sine";
    osc.frequency.setValueAtTime(tones[0], ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.02, volume) * 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.frequency.setValueAtTime(tones[1], ctx.currentTime + 0.22);
    osc.stop(ctx.currentTime + 0.58);
    activeOscillators.current.push(osc);
    osc.onended = () => {
      activeOscillators.current = activeOscillators.current.filter(item => item !== osc);
    };
  }

  function playTone(soundId = settings.defaultTone, loop = false, customUrl = null, volume = settings.volume) {
    stopTone();
    if (customUrl) {
      const audio = new Audio(customUrl);
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, volume / 100));
      customAudioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }
    beep(soundId, volume / 100);
    if (loop) toneTimerRef.current = setInterval(() => beep(soundId, volume / 100), settings.gradualVolume ? 1600 : 1200);
  }

  function startVibration(enabled) {
    if (!enabled || !("vibrate" in navigator)) return;
    navigator.vibrate([500, 250, 500]);
    vibrationTimerRef.current = setInterval(() => navigator.vibrate([500, 250, 500]), 1600);
  }

  function stopTone() {
    if (toneTimerRef.current) clearInterval(toneTimerRef.current);
    toneTimerRef.current = null;
    activeOscillators.current.forEach(osc => { try { osc.stop(); } catch {} });
    activeOscillators.current = [];
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
      customAudioRef.current = null;
    }
    if (vibrationTimerRef.current) clearInterval(vibrationTimerRef.current);
    vibrationTimerRef.current = null;
    try { navigator.vibrate?.(0); } catch {}
  }

  function parseDateParts(iso, time) {
    if (!iso || !time) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(`${iso}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function nextOccurrence(alarm, from = new Date()) {
    if (!alarm?.time24) return null;
    if (alarm.repeat === "once") {
      const d = parseDateParts(alarm.date, alarm.time24);
      return d && d >= from ? d : null;
    }
    const start = new Date(from);
    start.setSeconds(0, 0);
    for (let i = 0; i <= 370; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dow = d.getDay();
      const allowed = alarm.repeat === "daily" ? true :
        alarm.repeat === "weekdays" ? dow >= 1 && dow <= 5 :
        alarm.repeat === "weekends" ? dow === 0 || dow === 6 :
        (alarm.customDays || []).includes(dow);
      if (!allowed) continue;
      const candidate = new Date(d);
      const [h, m] = alarm.time24.split(":").map(Number);
      candidate.setHours(h, m, 0, 0);
      if (candidate > from) return candidate;
    }
    return null;
  }

  function activeNext(alarm) { return nextOccurrence(alarm, new Date()); }

  function checkAlarms(current) {
    const previous = previousCheckRef.current;
    previousCheckRef.current = current;
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const next = nextOccurrence(alarm, new Date(current.getTime() - 1000));
      if (!next) continue;
      const key = `${alarm.id}-${next.getTime()}`;
      const crossedReminder = previous.getTime() < next.getTime() - 300000 && current.getTime() >= next.getTime() - 300000;
      const crossedAlarm = previous.getTime() < next.getTime() && current.getTime() >= next.getTime();
      if (alarm.reminder && settings.preAlarmNotifications && crossedReminder && !triggered.current.has(`${key}-pre`)) {
        triggered.current.add(`${key}-pre`);
        notify("⏰ Alarm in 5 minutes", `${alarm.label} — ${formatClock(alarm.time24)}`);
        setToast({ type: "reminder", message: `${alarm.label} starts in 5 minutes` });
      }
      if (crossedAlarm && !triggered.current.has(key)) {
        triggered.current.add(key);
        triggerAlarm(alarm, next);
      }
      if (current.getTime() - next.getTime() > 60000) triggered.current.delete(key);
    }
  }

  function triggerAlarm(alarm, scheduledAt) {
    setRinging({ alarm, scheduledAt: scheduledAt.toISOString(), snoozeUntil: null });
    notify(`⏰ ${alarm.label || "Alarm"}`, `Alarm scheduled for ${formatClock(alarm.time24)}`);
    playTone(alarm.soundId, true, alarm.soundId === "custom" ? alarm.customSoundUrl : null, alarm.volume ?? settings.volume);
    startVibration(alarm.vibration ?? settings.vibration);
  }

  function dismiss() {
    if (!ringing) return;
    stopTone();
    if (snoozeTimerRef.current) clearTimeout(snoozeTimerRef.current);
    const { alarm } = ringing;
    if (alarm.repeat === "once") {
      setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, enabled: false } : a));
    }
    setRinging(null);
  }

  function snooze(minutes = settings.snoozeMinutes) {
    if (!ringing) return;
    stopTone();
    const until = new Date(Date.now() + minutes * 60000);
    const isoUntil = until.toISOString();
    setRinging(prev => ({ ...prev, snoozeUntil: isoUntil }));
    setToast({ type: "success", message: `Snoozed until ${until.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` });
    if (snoozeTimerRef.current) clearTimeout(snoozeTimerRef.current);
    snoozeTimerRef.current = setTimeout(() => {
      setRinging(prev => {
        if (!prev || prev.snoozeUntil !== isoUntil) return prev;
        playTone(prev.alarm.soundId, true, prev.alarm.soundId === "custom" ? prev.alarm.customSoundUrl : null, prev.alarm.volume ?? settings.volume);
        startVibration(prev.alarm.vibration ?? settings.vibration);
        if (settings.snoozeNotifications) notify(`⏰ ${prev.alarm.label || "Alarm"}`, "Snooze finished");
        return { ...prev, snoozeUntil: null, scheduledAt: isoUntil };
      });
    }, minutes * 60000);
  }

  function addOrUpdateAlarm(alarm) {
    const prepared = { ...alarm, updatedAt: Date.now() };
    const duplicateFound = alarms.some(a =>
      a.id !== prepared.id &&
      a.enabled &&
      prepared.enabled &&
      a.time24 === prepared.time24 &&
      a.repeat === prepared.repeat &&
      a.date === prepared.date &&
      JSON.stringify(a.customDays || []) === JSON.stringify(prepared.customDays || [])
    );
    if (duplicateFound) {
      setToast({ type: "error", message: "An identical active alarm already exists." });
      return;
    }
    setAlarms(prev => {
      const idx = prev.findIndex(a => a.id === prepared.id);
      if (idx < 0) return [...prev, { ...prepared, createdAt: Date.now() }];
      const next = [...prev]; next[idx] = prepared; return next;
    });
    setToast({ type: "success", message: alarm.id ? "Alarm updated" : "Alarm created" });
  }

  function removeAlarm(id) {
    setAlarms(prev => prev.filter(a => a.id !== id));
    if (ringing?.alarm.id === id) { stopTone(); setRinging(null); }
    setToast({ type: "success", message: "Alarm deleted" });
  }

  function toggleAlarm(id) { setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)); }

  function duplicateAlarm(id) {
    const source = alarms.find(a => a.id === id);
    if (!source) return;
    addOrUpdateAlarm({ ...source, id: crypto.randomUUID(), label: `${source.label || "Alarm"} copy`, enabled: false });
  }

  function resetSettings() {
    setSettings({ ...DEFAULT_SETTINGS });
    setToast({ type: "success", message: "Settings reset" });
  }

  const value = {
    alarms, settings, setSettings, ringing, now, toast, setToast,
    sounds: BUILT_IN_SOUNDS, addOrUpdateAlarm, removeAlarm, toggleAlarm, duplicateAlarm,
    nextOccurrence: activeNext, formatClock, requestNotifications, playTone, dismiss, snooze,
    resetSettings
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAlarms() { return useContext(Context); }

export function formatClock(time24, format = "12h") {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  if (format === "24h") return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
