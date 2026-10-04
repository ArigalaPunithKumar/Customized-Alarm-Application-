# Customized Alarm Application

Modern responsive alarm application built with React, Vite, Lucide React and localStorage.

## Included

- One-time, daily, weekday, weekend and custom-weekday alarms.
- Date scheduling up to 12 months ahead.
- 12/24-hour display.
- Enable/disable, edit, delete and duplicate actions.
- Built-in alarm tones plus local custom audio uploads.
- Looping alarm playback while the ringing screen is active.
- Snooze durations of 5, 10, 15, 20 or 30 minutes.
- Optional five-minute pre-alarm notifications.
- Vibration and browser notifications where supported.
- Light, dark and system themes with accent selection.
- Responsive mobile, tablet and desktop layout.
- localStorage persistence; no backend and no environment variables.

## Run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Browser limitation

A normal browser page cannot guarantee an OS-level alarm after the browser process is completely closed. This frontend provides in-page scheduling and browser notifications where the platform permits them. Guaranteed alarms after force-close/shutdown require native platform alarm APIs.

## Storage

Alarm definitions and settings are stored locally in the browser under `alarm-studio-v2`.