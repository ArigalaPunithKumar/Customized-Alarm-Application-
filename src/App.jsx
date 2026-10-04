import React, { useEffect, useMemo, useState } from "react";
import {
  AlarmClock, Bell, CalendarDays, Check, ChevronRight, Clock3, Copy, Edit3,
  Moon, Pause, Plus, RotateCcw, Settings as SettingsIcon, Sparkles, Sun,
  Trash2, Upload, Vibrate, Volume2, X
} from "lucide-react";
import { useAlarms, formatClock } from "./store.jsx";

const meta={home:["Good evening","Stay on time, stay in control."],add:["Create an alarm","Plan your next reminder."],settings:["Settings","Tune your alarm experience."]};

export default function App(){
  const {ringing,settings}=useAlarms();
  const [page,setPage]=useState("home"),[editing,setEditing]=useState(null);
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia?.("(prefers-color-scheme: dark)").matches??false);
  useEffect(()=>{if(settings.theme!=="system"||!window.matchMedia)return;const m=window.matchMedia("(prefers-color-scheme: dark)"),h=e=>setSystemDark(e.matches);m.addEventListener?.("change",h);return()=>m.removeEventListener?.("change",h)},[settings.theme]);
  const theme=settings.theme==="dark"||(settings.theme==="system"&&systemDark)?"dark":"light";
  const openAdd=()=>{setEditing(null);setPage("add")};
  return <div className={`app ${theme}`} data-accent={settings.accent}>
    <Sidebar page={page} setPage={setPage}/>
    <main className="main"><Header page={page} onQuickAdd={openAdd}/>
      {page==="home"&&<Home onEdit={a=>{setEditing(a);setPage("add")}}/>}
      {page==="add"&&<AlarmForm alarm={editing} onDone={()=>{setEditing(null);setPage("home")}}/>}
      {page==="settings"&&<Settings/>}
    </main>
    {ringing&&<RingingScreen/>}
  </div>;
}

function Sidebar({page,setPage}){return <aside className="sidebar">
  <div className="brand"><div className="brand-icon"><AlarmClock size={20}/></div><span>Alarm Studio</span></div>
  <nav><button className={page==="home"?"active":""} onClick={()=>setPage("home")}><Clock3/>Alarms</button><button className={page==="settings"?"active":""} onClick={()=>setPage("settings")}><SettingsIcon/>Settings</button></nav>
  <div className="sidebar-note"><Sparkles size={17}/><div><b>Quietly on time</b><span>Local-first. No account needed.</span></div></div>
  <div className="sidebar-footer">v1.0.0 • React + localStorage</div>
</aside>}

function Header({page,onQuickAdd}){const {now,requestNotifications}=useAlarms();const [title,subtitle]=meta[page];return <header className="header">
  <div><p className="eyebrow">{title}</p><h1>{subtitle}</h1></div><div className="header-actions">
    <div className="live-pill"><i/>{now.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</div>
    <button className="icon-btn" title="Enable browser notifications" onClick={requestNotifications}><Bell/></button>
    {page==="home"&&<button className="primary" onClick={onQuickAdd}><Plus/>New alarm</button>}
  </div>
</header>}

function Home({onEdit}){const {alarms,settings,toggleAlarm,removeAlarm,duplicateAlarm,nextOccurrence,now}=useAlarms();
  const sorted=useMemo(()=>alarms.map(a=>({...a,next:nextOccurrence(a)})).sort((a,b)=>(a.next?.getTime()??Infinity)-(b.next?.getTime()??Infinity)),[alarms,now]);
  const upcoming=sorted.filter(a=>a.enabled&&a.next).slice(0,3);
  return <div className="page">
    <section className="hero-card"><div><span className="hero-kicker"><Sparkles/>Next up</span>{upcoming[0]?<><div className="hero-time">{formatClock(upcoming[0].time24,settings.timeFormat)}</div><div className="hero-meta"><b>{upcoming[0].label||"Alarm"}</b><span>{prettyDate(upcoming[0].next)}</span></div></>:<><div className="hero-time muted">--:--</div><div className="hero-meta"><b>No active alarms</b><span>Create one to get started.</span></div></>}</div><div className="orb"><div><AlarmClock size={34}/></div></div></section>
    <div className="stats-row"><Stat icon={<AlarmClock/>} value={alarms.filter(a=>a.enabled).length} label="Active alarms"/><Stat icon={<CalendarDays/>} value={upcoming.length} label="Upcoming"/><Stat icon={<Vibrate/>} value={alarms.filter(a=>a.vibration).length} label="With vibration"/><Stat icon={<Bell/>} value={alarms.filter(a=>a.reminder).length} label="5-min reminders"/></div>
    <section className="section-head"><div><p className="eyebrow">Your schedule</p><h2>All alarms</h2></div><span className="count">{alarms.length} total</span></section>
    <div className="alarm-grid">{sorted.length?<>{sorted.map(a=><AlarmCard key={a.id} alarm={a} onEdit={onEdit} onToggle={toggleAlarm} onDelete={removeAlarm} onDuplicate={duplicateAlarm}/>)}</>:<Empty/>}</div>
    <p className="browser-note">Browser limitation: a normal web page cannot guarantee an OS-level alarm after the browser process is fully closed.</p>
  </div>}

function Stat({icon,value,label}){return <div className="stat-card"><div className="stat-icon">{React.cloneElement(icon,{size:18})}</div><div><b>{value}</b><span>{label}</span></div></div>}
function Empty(){return <div className="empty"><div className="empty-icon"><AlarmClock/></div><h3>No alarms yet</h3><p>Create your first alarm and make it recurring, audible and easy to snooze.</p></div>}
function AlarmCard({alarm,onEdit,onToggle,onDelete,onDuplicate}){const {settings,nextOccurrence,sounds}=useAlarms();const next=nextOccurrence(alarm);const tone=alarm.soundId==="custom"?alarm.customSoundName||"Custom sound":sounds.find(s=>s.id===alarm.soundId)?.name||"Alarm tone";return <article className={`alarm-card ${alarm.enabled?"":"disabled"}`}>
  <div className="alarm-main"><div className="time-block"><span>{formatClock(alarm.time24,settings.timeFormat).split(" ")[0]}</span><small>{settings.timeFormat==="24h"?"":formatClock(alarm.time24).split(" ")[1]}</small></div>
  <div className="alarm-info"><div className="alarm-top"><h3>{alarm.label||"Untitled alarm"}</h3><span className={`status ${alarm.enabled?"on":"off"}`}>{alarm.enabled?"Active":"Off"}</span></div><p>{repeatLabel(alarm)} • {next?prettyDate(next):"Expired"}</p><div className="micro"><span><Volume2/>{tone}</span><span><Pause/>Snooze {alarm.snoozeMinutes}m</span>{alarm.reminder&&<span><Bell/>Reminder on</span>}</div></div>
  <label className="switch"><input aria-label={`Enable ${alarm.label||"alarm"}`} type="checkbox" checked={alarm.enabled} onChange={()=>onToggle(alarm.id)}/><span/></label></div>
  <div className="card-actions"><button onClick={()=>onEdit(alarm)}><Edit3/>Edit</button><button onClick={()=>onDuplicate(alarm.id)}><Copy/>Duplicate</button><button className="danger" onClick={()=>onDelete(alarm.id)}><Trash2/>Delete</button></div>
</article>}

function AlarmForm({alarm,onDone}){const {settings,sounds,addOrUpdateAlarm,playTone}=useAlarms();const today=new Date(),max=new Date();max.setFullYear(max.getFullYear()+1);
  const initial={id:alarm?.id||crypto.randomUUID(),date:alarm?.date||iso(today),time24:alarm?.time24||"07:00",label:alarm?.label||"Wake Up",repeat:alarm?.repeat||"once",customDays:alarm?.customDays||[],enabled:alarm?.enabled??true,soundId:alarm?.soundId||settings.defaultTone,customSoundName:alarm?.customSoundName||"",snoozeMinutes:alarm?.snoozeMinutes||settings.snoozeMinutes,reminder:alarm?.reminder??settings.reminderDefault,vibration:alarm?.vibration??settings.vibration,volume:alarm?.volume??settings.volume};
  const [form,setForm]=useState(initial),[error,setError]=useState(""),[customSound,setCustomSound]=useState(alarm?.customSoundUrl||null);const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  function submit(e){e.preventDefault();if(form.repeat==="once"&&parseLocal(form.date,form.time24)<new Date()){setError("Choose a future date and time.");return}if(form.repeat==="custom"&&!form.customDays.length){setError("Select at least one custom day.");return}setError("");addOrUpdateAlarm({...form,customSoundUrl:customSound,customSoundName:form.customSoundName});onDone()}
  function upload(e){const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("audio/")){setError("Please select an audio file.");return}if(file.size>5000000){setError("Keep uploaded audio under 5 MB.");return}const r=new FileReader();r.onload=()=>{setCustomSound(r.result);set("soundId","custom");set("customSoundName",file.name)};r.readAsDataURL(file)}
  return <div className="page"><form className="form-layout" onSubmit={submit}>
    <section className="panel"><div className="section-head"><div><p className="eyebrow">Schedule</p><h2>When should it ring?</h2></div><span className="step">01</span></div><div className="form-grid">
      <Field label="Date"><input type="date" min={iso(today)} max={iso(max)} value={form.date} onChange={e=>set("date",e.target.value)}/></Field><Field label={`Time (${settings.timeFormat==="12h"?"12-hour":"24-hour"})`}><input type="time" value={form.time24} onChange={e=>set("time24",e.target.value)}/></Field><Field wide label="Alarm label"><input maxLength={40} value={form.label} onChange={e=>set("label",e.target.value)} placeholder="Gym, study, meeting..."/></Field>
    </div><div className="subsection"><label className="field-label">Repeat</label><div className="segmented">{[["once","Once"],["daily","Every day"],["weekdays","Weekdays"],["weekends","Weekends"],["custom","Custom"]].map(([v,l])=><button type="button" key={v} className={form.repeat===v?"selected":""} onClick={()=>set("repeat",v)}>{l}</button>)}</div></div>
    {form.repeat==="custom"&&<div className="days-row">{["S","M","T","W","T","F","S"].map((d,i)=><button type="button" key={i} className={form.customDays.includes(i)?"selected":""} onClick={()=>set("customDays",form.customDays.includes(i)?form.customDays.filter(x=>x!==i):[...form.customDays,i])}>{d}</button>)}</div>}
    </section>
    <section className="panel"><div className="section-head"><div><p className="eyebrow">Sound</p><h2>Pick a tone</h2></div><span className="step">02</span></div><div className="sound-grid">
      {sounds.map(s=><button type="button" key={s.id} className={`sound-card ${form.soundId===s.id?"selected":""}`} onClick={()=>{set("soundId",s.id);if(settings.soundPreview)playTone(s.id)}}><span className="sound-icon">{s.icon}</span><span><b>{s.name}</b><small>{s.kind}</small></span>{form.soundId===s.id&&<Check/>}</button>)}
      <label className={`sound-card ${form.soundId==="custom"?"selected":""}`}><input type="file" accept="audio/*" onChange={upload}/><span className="sound-icon"><Upload/></span><span><b>Custom sound</b><small>{form.customSoundName||"Choose audio file"}</small></span>{form.soundId==="custom"&&<Check/>}</label>
    </div></section>
    <section className="panel"><div className="section-head"><div><p className="eyebrow">Behavior</p><h2>Before & after</h2></div><span className="step">03</span></div><div className="setting-list">
      <SettingRow icon={<Pause/>} title="Snooze duration" desc="Default for this alarm"><select value={form.snoozeMinutes} onChange={e=>set("snoozeMinutes",Number(e.target.value))}>{[5,10,15,20,30].map(x=><option key={x} value={x}>{x} minutes</option>)}</select></SettingRow>
      <SettingRow icon={<Bell/>} title="5-minute reminder" desc="Notify before ringing"><Switch checked={form.reminder} onChange={v=>set("reminder",v)}/></SettingRow>
      <SettingRow icon={<Vibrate/>} title="Vibration" desc="Use vibration when ringing"><Switch checked={form.vibration} onChange={v=>set("vibration",v)}/></SettingRow>
      <SettingRow icon={<Volume2/>} title="Volume" desc={`${form.volume}%`}><input className="range" type="range" min="10" max="100" value={form.volume} onChange={e=>set("volume",Number(e.target.value))}/></SettingRow>
    </div></section>
    {error&&<div className="error"><X/>{error}</div>}<div className="form-footer"><button type="button" className="ghost" onClick={onDone}>Cancel</button><button className="primary"><Check/>Save alarm</button></div>
  </form></div>}

function Settings(){const {settings,setSettings,playTone,requestNotifications,resetSettings}=useAlarms();const update=(k,v)=>setSettings(s=>({...s,[k]:v}));return <div className="page">
  <section className="panel"><div className="section-head"><div><p className="eyebrow">Alarm settings</p><h2>Defaults</h2></div></div><div className="setting-list">
    <SettingRow icon={<Pause/>} title="Default snooze duration" desc="Applied to new alarms"><select value={settings.snoozeMinutes} onChange={e=>update("snoozeMinutes",Number(e.target.value))}>{[5,10,15,20,30].map(x=><option key={x} value={x}>{x} minutes</option>)}</select></SettingRow>
    <SettingRow icon={<Volume2/>} title="Default volume" desc={`${settings.volume}%`}><input className="range" type="range" min="10" max="100" value={settings.volume} onChange={e=>update("volume",Number(e.target.value))}/></SettingRow>
    <SettingRow icon={<Sparkles/>} title="Gradual volume" desc="Gentle ramp-up on supported playback"><Switch checked={settings.gradualVolume} onChange={v=>update("gradualVolume",v)}/></SettingRow>
    <SettingRow icon={<Vibrate/>} title="Vibration" desc="Enable by default"><Switch checked={settings.vibration} onChange={v=>update("vibration",v)}/></SettingRow>
    <SettingRow icon={<Volume2/>} title="Default tone" desc="Preview the selected default"><button className="inline-select" onClick={()=>playTone(settings.defaultTone)}>{settings.defaultTone}</button></SettingRow>
    <SettingRow icon={<Bell/>} title="5-minute reminder by default" desc="Apply to newly created alarms"><Switch checked={settings.reminderDefault} onChange={v=>update("reminderDefault",v)}/></SettingRow>
    <SettingRow icon={<Clock3/>} title="Time format" desc="Display preference"><select value={settings.timeFormat} onChange={e=>update("timeFormat",e.target.value)}><option value="12h">12-hour</option><option value="24h">24-hour</option></select></SettingRow>
  </div></section>
  <section className="panel"><div className="section-head"><div><p className="eyebrow">Appearance</p><h2>Make it yours</h2></div></div>
    <SettingRow icon={settings.theme==="dark"?<Moon/>:<Sun/>} title="Theme" desc="Light, dark or follow device"><div className="segmented compact">{["light","dark","system"].map(x=><button type="button" key={x} className={settings.theme===x?"selected":""} onClick={()=>update("theme",x)}>{x}</button>)}</div></SettingRow>
    <SettingRow icon={<Sparkles/>} title="Accent" desc="UI accent color"><div className="accent-row">{["violet","blue","green","amber"].map(x=><button type="button" key={x} data-accent={x} className={settings.accent===x?"selected":""} onClick={()=>update("accent",x)} aria-label={x}/>)}</div></SettingRow>
  </section>
  <section className="panel"><div className="section-head"><div><p className="eyebrow">Notifications</p><h2>Alerts</h2></div></div><div className="setting-list">
    <SettingRow icon={<Bell/>} title="Alarm notifications" desc="Browser notification permission"><Switch checked={settings.notifications} onChange={v=>{update("notifications",v);if(v)requestNotifications()}}/></SettingRow>
    <SettingRow icon={<Bell/>} title="Pre-alarm notifications" desc="Notify five minutes before"><Switch checked={settings.preAlarmNotifications} onChange={v=>update("preAlarmNotifications",v)}/></SettingRow>
    <SettingRow icon={<Bell/>} title="Snooze notifications" desc="Notify when snooze finishes"><Switch checked={settings.snoozeNotifications} onChange={v=>update("snoozeNotifications",v)}/></SettingRow>
  </div></section>
  <section className="panel"><div className="section-head"><div><p className="eyebrow">General</p><h2>Utilities</h2></div></div><div className="utility-grid">
    <button onClick={()=>playTone(settings.defaultTone)}><Volume2/><span><b>Sound preview</b><small>Preview the default tone</small></span><ChevronRight/></button>
    <button onClick={()=>navigator.vibrate?.([100,80,180])}><Vibrate/><span><b>Vibration test</b><small>Test device feedback</small></span><ChevronRight/></button>
    <div><RotateCcw/><span><b>Reset settings</b><small>Restore defaults</small></span><button className="danger-outline" onClick={resetSettings}>Reset</button></div>
  </div><div className="about"><div className="brand-icon"><AlarmClock/></div><div><b>Alarm Studio</b><span>Version 1.0.0 • Frontend-only</span><small>React + Vite + localStorage.</small></div></div></section>
</div>}

function RingingScreen(){const {ringing,settings,dismiss,snooze,now}=useAlarms();const until=ringing?.snoozeUntil?new Date(ringing.snoozeUntil):null;const remaining=until?Math.max(0,Math.ceil((until-now)/1000)):0;if(!ringing)return null;return <div className="ring-overlay"><div className="ringing-panel">
  <div className="ring-orbit"><div className="ring-icon"><AlarmClock size={34}/></div></div><span className="hero-kicker">Alarm ringing</span><div className="ring-time">{now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div><h2>{ringing.alarm.label||"Alarm"}</h2><p>{new Date(ringing.scheduledAt).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</p>
  {until?<div className="snooze-count">Snoozed • {formatSeconds(remaining)} remaining</div>:<div className="ring-actions"><button className="snooze" onClick={()=>snooze()}><Pause/>Snooze {settings.snoozeMinutes}m</button><button className="dismiss" onClick={dismiss}><X/>Dismiss</button></div>}<div className="ring-note"><Volume2/>Tone plays until you act.</div>
</div></div>}

function SettingRow({icon,title,desc,children}){return <div className="setting-row"><div className="setting-leading"><div className="setting-icon">{React.cloneElement(icon,{size:17})}</div><div><b>{title}</b><span>{desc}</span></div></div><div>{children}</div></div>}
function Switch({checked,onChange}){return <label className="switch small"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span/></label>}
function Field({label,wide,children}){return <label className={`field ${wide?"wide":""}`}><span>{label}</span>{children}</label>}
function repeatLabel(a){if(a.repeat==="once")return"Once";if(a.repeat==="daily")return"Every day";if(a.repeat==="weekdays")return"Weekdays";if(a.repeat==="weekends")return"Weekends";return(a.customDays||[]).map(i=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]).join(" · ")}
function prettyDate(d){return d?d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})+" • "+d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"—"}
function iso(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function parseLocal(date,time){return new Date(`${date}T${time}:00`)}
function formatSeconds(s){return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
