import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DollarSign, Plus, LogOut, ShieldCheck, User, Lock,
  ArrowLeft, Smartphone, CreditCard, UserPlus, History,
  X, Key, CheckSquare, Square, Send, Image as ImageIcon,
  Trash2, Clock, ShoppingCart, Briefcase, Bell, Eye, EyeOff,
  Cake, RefreshCw, AlertTriangle, Loader, Wifi, WifiOff, Search,
  CheckCircle, MessageSquare, ChevronRight, Sparkles, BarChart2,
  Users, Settings, Grid, List, TrendingUp, TrendingDown, Activity,
  ArrowUpRight, Zap, CalendarDays, AtSign, Hash, Check, Globe2,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, addDoc, query, onSnapshot, orderBy,
  serverTimestamp, doc, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCUFEEVL2b2MpOl9lFfpBzAyQn4HpTf05Q",
  authDomain: "smart-manager-b19f7.firebaseapp.com",
  projectId: "smart-manager-b19f7",
  storageBucket: "smart-manager-b19f7.firebasestorage.app",
  messagingSenderId: "460142501834",
  appId: "1:460142501834:web:7aa51d90c36167ac3d3933",
  measurementId: "G-D8EBTH9PJE"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
try { getAnalytics(fbApp); } catch {}

const APP_ID = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : 'default-app-id';
const GEMINI_KEY = "AIzaSyArZC6itvjovGkS6FDfZRruk3sH2c5_Prc";
const GEMINI_MODEL = 'gemini-1.5-flash';

const COL = { USERS: 'dues_app_users', TX: 'dues_app_transactions', SETTINGS: 'dues_app_settings', MSGS: 'dues_app_messages', CHATS: 'dues_app_chats' };
const col  = n  => collection(db, 'artifacts', APP_ID, 'public', 'data', n);
const dRef = (n, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', n, id);

const safeNum = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmtDate = v => {
  if (!v) return 'N/A';
  try { const d = v.seconds ? new Date(v.seconds * 1000) : new Date(v); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};
const fmtTime = v => {
  if (!v?.seconds) return '';
  return new Date(v.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const callGemini = async p => {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';
  } catch { return 'AI unavailable.'; }
};
const compressImg = file => new Promise(res => {
  const r = new FileReader(); r.readAsDataURL(file);
  r.onload = e => {
    const i = new Image(); i.src = e.target.result;
    i.onload = () => {
      const c = document.createElement('canvas');
      c.width = 800; c.height = i.height * (800 / i.width);
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.6));
    };
  };
});
const toUsername = name => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// ── Global CSS ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');

:root {
  --bg:    #02030a;
  --bg1:   #060810;
  --bg2:   #0a0d1a;
  --text:  #eef0ff;
  --sub:   #7a85b0;
  --muted: #353c5e;
  --i:     #7c6dfa;
  --v:     #9d6fff;
  --c:     #00d4ff;
  --g:     #00e5a0;
  --r:     #ff5a7e;
  --a:     #ff8c42;
  --y:     #ffd700;
  --pk:    #f06bff;
  --font:  'Outfit', system-ui, sans-serif;
  --head:  'Syne', system-ui, sans-serif;
  --mono:  'DM Mono', monospace;
  --rad:   18px;
  --rad-lg:24px;
  --rad-sm:12px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root {
  min-height:100vh; width:100%;
  background:var(--bg)!important;
  color:var(--text)!important;
  font-family:var(--font);
  -webkit-font-smoothing:antialiased;
  color-scheme:dark;
}
body { margin:0!important; display:block!important; }

::selection { background:rgba(124,109,250,0.3); }
::-webkit-scrollbar { width:3px; height:3px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:rgba(124,109,250,0.25); border-radius:99px; }
::-webkit-scrollbar-thumb:hover { background:rgba(124,109,250,0.5); }
input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.5) sepia(1) hue-rotate(220deg) brightness(0.9); cursor:pointer; }
button { cursor:pointer; }

/* ── keyframes ── */
@keyframes aurora {
  0%,100% { background-position:0% 50%; }
  50%      { background-position:100% 50%; }
}
@keyframes drift {
  0%,100% { transform:translate(0,0) scale(1) rotate(0deg); }
  33%     { transform:translate(60px,-40px) scale(1.08) rotate(5deg); }
  66%     { transform:translate(-35px,30px) scale(0.93) rotate(-3deg); }
}
@keyframes drift2 {
  0%,100% { transform:translate(0,0) scale(1); }
  40%     { transform:translate(-50px,35px) scale(1.05); }
  80%     { transform:translate(30px,-20px) scale(0.96); }
}
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes spinSlow { to { transform:rotate(360deg); } }
@keyframes fadeUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes scaleUp {
  from { opacity:0; transform:scale(0.86) translateY(12px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes slideL {
  from { opacity:0; transform:translateX(-20px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes slideR {
  from { opacity:0; transform:translateX(20px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes shimmer {
  from { background-position:-200% 0; }
  to   { background-position:200% 0; }
}
@keyframes glowPulse {
  0%,100% { box-shadow:0 0 0 0 rgba(124,109,250,0.4); }
  50%     { box-shadow:0 0 0 14px rgba(124,109,250,0); }
}
@keyframes numberUp {
  from { opacity:0; transform:translateY(8px) scale(0.9); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes tabIndicator {
  from { opacity:0; transform:scaleX(0); }
  to   { opacity:1; transform:scaleX(1); }
}
@keyframes scanline {
  from { transform:translateY(-100%); }
  to   { transform:translateY(100vh); }
}
@keyframes borderGlow {
  0%,100% { border-color: rgba(124,109,250,0.3); }
  50%     { border-color: rgba(0,212,255,0.5); }
}
@keyframes ripple {
  from { transform:scale(0); opacity:0.5; }
  to   { transform:scale(2.5); opacity:0; }
}
@keyframes floatY {
  0%,100% { transform:translateY(0px); }
  50%     { transform:translateY(-8px); }
}
@keyframes authCardIn {
  from { opacity:0; transform:translateY(32px) scale(0.96); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes topBarSlide {
  from { transform:scaleX(0); opacity:0; }
  to   { transform:scaleX(1); opacity:1; }
}
@keyframes inputFocusGlow {
  from { box-shadow:0 0 0 0 rgba(124,109,250,0.4); }
  to   { box-shadow:0 0 0 4px rgba(124,109,250,0.15); }
}

/* ── animation helpers ── */
.fu  { animation:fadeUp  0.44s cubic-bezier(.16,1,.3,1) both; }
.fi  { animation:fadeIn  0.3s ease both; }
.su  { animation:scaleUp 0.36s cubic-bezier(.16,1,.3,1) both; }
.sl  { animation:slideL  0.36s cubic-bezier(.16,1,.3,1) both; }
.sr  { animation:slideR  0.36s cubic-bezier(.16,1,.3,1) both; }
.d1  { animation-delay:.05s; }
.d2  { animation-delay:.10s; }
.d3  { animation-delay:.15s; }
.d4  { animation-delay:.20s; }
.d5  { animation-delay:.25s; }
.d6  { animation-delay:.30s; }
.page { animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both; }

/* ── glass surfaces ── */
.glass {
  background:rgba(255,255,255,0.028);
  backdrop-filter:blur(28px) saturate(180%);
  -webkit-backdrop-filter:blur(28px) saturate(180%);
  border:1px solid rgba(255,255,255,0.065);
}
.glass-dark {
  background:rgba(2,3,10,0.92);
  backdrop-filter:blur(40px);
  -webkit-backdrop-filter:blur(40px);
  border:1px solid rgba(255,255,255,0.08);
}

/* ── gradient text ── */
.gt-iris { background:linear-gradient(135deg,#7c6dfa,#c084fc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.gt-cool { background:linear-gradient(135deg,#00d4ff,#7c6dfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.gt-warm { background:linear-gradient(135deg,#ff8c42,#ffd700); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.gt-full { background:linear-gradient(135deg,#00d4ff,#7c6dfa,#f06bff); background-size:200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:aurora 4s ease infinite; }

/* ── neon border cards ── */
.neon-card {
  position:relative;
  border-radius:var(--rad-lg);
  background:rgba(10,13,26,0.85);
  border:1px solid rgba(124,109,250,0.15);
  overflow:hidden;
  animation:borderGlow 4s ease infinite;
}
.neon-card::before {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(135deg, rgba(124,109,250,0.03) 0%, transparent 60%);
  pointer-events:none;
}

/* ── scan line effect ── */
.scanline::after {
  content:'';
  position:absolute; left:0; right:0; height:2px;
  background:linear-gradient(transparent, rgba(0,212,255,0.04), transparent);
  animation:scanline 8s linear infinite;
  pointer-events:none;
}

/* ── PREMIUM INPUT ── */
.inp {
  width:100%;
  background:rgba(255,255,255,0.08);
  border:1.5px solid rgba(255,255,255,0.18);
  border-radius:14px;
  color:#ffffff;
  padding:14px 16px;
  font-size:14.5px;
  font-family:var(--font);
  font-weight:500;
  outline:none;
  transition:border-color .22s, background .22s, box-shadow .22s;
  letter-spacing:0.01em;
}
.inp:hover {
  border-color:rgba(255,255,255,0.32);
  background:rgba(255,255,255,0.11);
}
.inp:focus {
  border-color:rgba(124,109,250,0.8);
  background:rgba(124,109,250,0.07);
  box-shadow:0 0 0 4px rgba(124,109,250,0.12), 0 0 32px rgba(124,109,250,0.08);
  color:#ffffff;
}
.inp::placeholder { color:rgba(255,255,255,0.45); font-weight:400; }
.inp-icon   { padding-left:46px; }
.inp-icon-r { padding-right:46px; }
.field-wrap { position:relative; width:100%; }
.fi-l { position:absolute; left:15px; top:50%; transform:translateY(-50%); pointer-events:none; color:rgba(255,255,255,0.5); transition:color .2s; }
.field-wrap:focus-within .fi-l { color:rgba(124,109,250,0.8); }
.fi-r { position:absolute; right:14px; top:50%; transform:translateY(-50%); }

/* ── buttons ── */
.btn {
  display:inline-flex; align-items:center; justify-content:center; gap:7px;
  padding:12px 22px; border-radius:var(--rad-sm);
  font-family:var(--font); font-size:14px; font-weight:700;
  border:none; outline:none; white-space:nowrap; cursor:pointer;
  transition:all .22s cubic-bezier(.16,1,.3,1);
  position:relative; overflow:hidden;
}
.btn::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(rgba(255,255,255,0.1),transparent);
  opacity:0; transition:opacity .2s; pointer-events:none;
}
.btn:hover::before { opacity:1; }
.btn:active { transform:scale(0.96)!important; }
.btn:disabled { opacity:.4; cursor:not-allowed; transform:none!important; box-shadow:none!important; }

.btn-primary {
  background:linear-gradient(135deg,#4f3df0,#7c6dfa);
  color:white;
  box-shadow:0 4px 20px rgba(79,61,240,0.4), inset 0 1px 0 rgba(255,255,255,0.12);
}
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(79,61,240,0.6), 0 0 60px rgba(124,109,250,0.15); }

.btn-admin {
  background:linear-gradient(135deg,#c45000,#ff8c42);
  color:white;
  box-shadow:0 4px 20px rgba(255,140,66,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
}
.btn-admin:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(255,140,66,0.55); }

.btn-danger {
  background:rgba(255,90,126,0.1); color:var(--r);
  border:1px solid rgba(255,90,126,0.25);
}
.btn-danger:hover { background:rgba(255,90,126,0.22); transform:translateY(-1px); }

.btn-ghost {
  background:rgba(255,255,255,0.04); color:var(--sub);
  border:1px solid rgba(255,255,255,0.08);
}
.btn-ghost:hover { background:rgba(255,255,255,0.08); color:var(--text); border-color:rgba(255,255,255,0.14); transform:translateY(-1px); }

.btn-neon {
  background:transparent; color:var(--c);
  border:1px solid rgba(0,212,255,0.35);
  box-shadow:0 0 20px rgba(0,212,255,0.07), inset 0 0 20px rgba(0,212,255,0.03);
}
.btn-neon:hover { background:rgba(0,212,255,0.08); box-shadow:0 0 30px rgba(0,212,255,0.2); transform:translateY(-1px); }

.btn-sm   { padding:8px 15px; font-size:12px; border-radius:10px; gap:5px; }
.btn-icon { padding:9px; border-radius:10px; }
.btn-xs   { padding:5px 11px; font-size:11px; border-radius:8px; gap:4px; }

/* ── tags ── */
.tag {
  display:inline-flex; align-items:center; gap:4px;
  padding:3px 10px; border-radius:99px;
  font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
}
.t-iris  { background:rgba(124,109,250,.12); border:1px solid rgba(124,109,250,.3); color:#a393fb; }
.t-cyan  { background:rgba(0,212,255,.09);   border:1px solid rgba(0,212,255,.25);  color:#00d4ff; }
.t-green { background:rgba(0,229,160,.09);   border:1px solid rgba(0,229,160,.25);  color:#00e5a0; }
.t-red   { background:rgba(255,90,126,.09);  border:1px solid rgba(255,90,126,.25); color:#ff5a7e; }
.t-amber { background:rgba(255,140,66,.09);  border:1px solid rgba(255,140,66,.25); color:#ff8c42; }
.t-pink  { background:rgba(240,107,255,.09); border:1px solid rgba(240,107,255,.25);color:#f06bff; }

/* ── cards ── */
.card {
  background:rgba(255,255,255,0.028);
  border:1px solid rgba(255,255,255,0.065);
  border-radius:var(--rad-lg);
  padding:22px;
  transition:all .28s cubic-bezier(.16,1,.3,1);
}
.card-hover:hover {
  background:rgba(255,255,255,0.05);
  border-color:rgba(124,109,250,0.3);
  transform:translateY(-3px);
  box-shadow:0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,109,250,0.08), 0 0 60px rgba(124,109,250,0.05);
}

.mem-card {
  border-radius:var(--rad-lg); overflow:hidden;
  background:rgba(255,255,255,0.025);
  border:1px solid rgba(255,255,255,0.065);
  cursor:pointer; position:relative;
  transition:all .3s cubic-bezier(.16,1,.3,1);
}
.mem-card::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(124,109,250,0.07),transparent 60%);
  opacity:0; transition:opacity .3s; pointer-events:none; border-radius:inherit;
}
.mem-card:hover { border-color:rgba(124,109,250,0.35); transform:translateY(-5px) scale(1.01); box-shadow:0 28px 60px rgba(0,0,0,0.6), 0 0 40px rgba(124,109,250,0.08); }
.mem-card:hover::after { opacity:1; }
.mem-card:active { transform:translateY(-1px) scale(0.99); }

/* ── tabs ── */
.tab-rail { display:flex; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.055); border-radius:14px; padding:4px; gap:3px; }
.tab-btn {
  flex:1; padding:9px 11px; border-radius:10px;
  font-size:12px; font-weight:700; letter-spacing:.01em;
  display:flex; align-items:center; justify-content:center; gap:5px;
  color:var(--muted); background:transparent; border:1px solid transparent;
  cursor:pointer; transition:all .2s; white-space:nowrap; font-family:var(--font);
}
.tab-btn:hover { color:var(--sub); background:rgba(255,255,255,0.04); }
.tab-on { color:#a393fb!important; background:rgba(124,109,250,0.14)!important; border-color:rgba(124,109,250,0.28)!important; box-shadow:0 2px 12px rgba(124,109,250,0.12)!important; }

/* ── modal ── */
.modal-overlay {
  position:fixed; inset:0; z-index:600;
  background:rgba(0,0,0,0.88);
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  display:flex; align-items:center; justify-content:center; padding:20px;
  animation:fadeIn .18s ease;
}
.modal-box {
  width:100%; max-width:440px;
  background:#070a16;
  border:1px solid rgba(255,255,255,0.09);
  border-radius:26px; padding:32px;
  box-shadow:0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,109,250,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
  animation:scaleUp .28s cubic-bezier(.16,1,.3,1);
  position:relative;
}

/* ── topnav ── */
.topnav {
  position:sticky; top:0; z-index:300;
  background:rgba(2,3,10,0.9);
  backdrop-filter:blur(32px) saturate(200%); -webkit-backdrop-filter:blur(32px) saturate(200%);
  border-bottom:1px solid rgba(255,255,255,0.065);
}

/* ── stat card ── */
.stat { border-radius:var(--rad-lg); padding:22px; transition:all .28s cubic-bezier(.16,1,.3,1); position:relative; overflow:hidden; }
.stat:hover { transform:translateY(-3px); box-shadow:0 20px 40px rgba(0,0,0,0.4); }
.stat .big { font-family:var(--mono); font-size:30px; font-weight:500; letter-spacing:-.02em; animation:numberUp .5s cubic-bezier(.16,1,.3,1) both; }
.prog-track { height:3px; background:rgba(255,255,255,0.06); border-radius:99px; overflow:hidden; margin-top:14px; }
.prog-fill  { height:100%; border-radius:99px; transition:width 1.4s cubic-bezier(.16,1,.3,1); }

/* ── chat ── */
.b-own {
  background:linear-gradient(135deg,#3d2fd4,#6255e8);
  color:white; border-radius:18px 18px 4px 18px; padding:10px 15px;
  max-width:80%; font-size:13.5px; line-height:1.55;
  box-shadow:0 4px 18px rgba(79,61,240,0.3);
  animation:slideR .25s cubic-bezier(.16,1,.3,1);
}
.b-other {
  background:rgba(255,255,255,0.055); border:1px solid rgba(255,255,255,0.09);
  color:var(--text); border-radius:18px 18px 18px 4px; padding:10px 15px;
  max-width:80%; font-size:13.5px; line-height:1.55;
  animation:slideL .25s cubic-bezier(.16,1,.3,1);
}

/* ── tx row ── */
.tx-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px; border-radius:14px;
  background:rgba(255,255,255,0.022); border:1px solid rgba(255,255,255,0.055);
  gap:12px; transition:all .2s; animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;
}
.tx-row:hover { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); }

/* ── toggle ── */
.toggle { width:50px; height:27px; border-radius:99px; border:none; cursor:pointer; position:relative; transition:background .3s, box-shadow .3s; }
.toggle-thumb { position:absolute; top:3.5px; width:20px; height:20px; border-radius:50%; background:white; transition:left .3s cubic-bezier(.16,1,.3,1); box-shadow:0 2px 8px rgba(0,0,0,0.4); }

/* ── shimmer skel ── */
.skel { background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:10px; }

/* ── notif dot ── */
.ndot { width:8px; height:8px; border-radius:50%; background:var(--r); position:absolute; top:-2px; right:-2px; box-shadow:0 0 10px rgba(255,90,126,0.9); animation:glowPulse 2s ease infinite; }

.spin      { animation:spin .9s linear infinite; }
.spin-slow { animation:spinSlow 3s linear infinite; }

.no-scroll { -ms-overflow-style:none; scrollbar-width:none; }
.no-scroll::-webkit-scrollbar { display:none; }
.divider { height:1px; background:rgba(255,255,255,0.055); margin:20px 0; }

/* ── password strength ── */
.pw-bar-wrap { display:flex; gap:4px; margin-top:7px; }
.pw-bar { flex:1; height:3px; border-radius:99px; transition:background .35s, transform .35s; }
.pw-label { font-size:10.5px; font-weight:700; margin-top:5px; letter-spacing:.02em; }

/* ── forgot password ── */
.fp-overlay {
  position:absolute; inset:0; border-radius:26px;
  background:rgba(2,3,10,0.97);
  backdrop-filter:blur(4px);
  z-index:10; display:flex; flex-direction:column; justify-content:center;
  padding:32px;
  animation:scaleUp .28s cubic-bezier(.16,1,.3,1);
}
.fp-step-dot { width:8px; height:8px; border-radius:50%; transition:all .3s cubic-bezier(.16,1,.3,1); }

/* ════════════════════════════════════════
   ── PREMIUM AUTH PAGE ──
   ════════════════════════════════════════ */

/* Auth page wrapper */
.auth-page {
  min-height:100vh;
  display:flex;
  position:relative;
  overflow:hidden;
  background:#060510;
}

/* Glowing noise background */
.auth-page::before {
  content:'';
  position:absolute; inset:0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 50%, rgba(79,61,240,0.18) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 30%, rgba(0,212,255,0.1) 0%, transparent 50%),
    radial-gradient(ellipse 40% 40% at 60% 80%, rgba(240,107,255,0.08) 0%, transparent 50%);
  pointer-events:none;
}

/* THE AUTH CARD — glass morphism + depth */
.auth-card {
  background:
    linear-gradient(145deg,
      rgba(24,18,60,0.97) 0%,
      rgba(16,11,42,0.98) 40%,
      rgba(10,7,28,0.99) 100%);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:28px;
  padding:36px;
  width:100%;
  max-width:420px;
  position:relative;
  overflow:hidden;
  box-shadow:
    0 0 0 1px rgba(124,109,250,0.08),
    0 40px 100px rgba(0,0,0,0.9),
    0 0 80px rgba(124,109,250,0.04),
    inset 0 1px 0 rgba(255,255,255,0.08);
  animation:authCardIn .55s cubic-bezier(.16,1,.3,1) both;
  backdrop-filter:blur(40px);
  -webkit-backdrop-filter:blur(40px);
}

/* Prismatic top edge */
.auth-card::before {
  content:'';
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,
    transparent 0%,
    rgba(124,109,250,0.9) 20%,
    rgba(0,212,255,1) 45%,
    rgba(124,109,250,0.9) 65%,
    rgba(240,107,255,0.7) 85%,
    transparent 100%);
  box-shadow:0 0 40px rgba(124,109,250,0.8), 0 0 80px rgba(0,212,255,0.35), 0 0 120px rgba(124,109,250,0.2);
  transform-origin:left;
  animation:topBarSlide .7s cubic-bezier(.16,1,.3,1) .2s both;
}

/* Subtle inner glow */
.auth-card::after {
  content:'';
  position:absolute; top:0; left:0; right:0; height:220px;
  background:radial-gradient(ellipse at 50% 0%, rgba(124,109,250,0.18) 0%, transparent 70%);
  pointer-events:none;
}

/* Admin variant top bar */
.auth-card.admin-card::before {
  background:linear-gradient(90deg,
    transparent 0%,
    rgba(196,80,0,0.9) 20%,
    rgba(255,140,66,1) 45%,
    rgba(255,180,66,0.9) 65%,
    rgba(255,100,20,0.7) 85%,
    transparent 100%);
  box-shadow:0 0 40px rgba(255,140,66,0.8), 0 0 80px rgba(255,140,66,0.35), 0 0 120px rgba(255,140,66,0.2);
}
.auth-card.admin-card::after {
  background:radial-gradient(ellipse at 50% 0%, rgba(196,80,0,0.1) 0%, transparent 70%);
}

/* Noise texture overlay */
.auth-noise {
  position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  opacity:0.025;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* ── ROLE TABS ── */
.role-selector {
  display:flex;
  background:rgba(0,0,0,0.3);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:16px;
  padding:4px;
  gap:4px;
  margin-bottom:20px;
}

.role-tab {
  flex:1;
  padding:11px 8px;
  border-radius:12px;
  font-size:13.5px;
  font-weight:700;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border:1px solid transparent;
  cursor:pointer;
  transition:all .28s cubic-bezier(.16,1,.3,1);
  font-family:var(--font);
  background:transparent;
  color:rgba(255,255,255,0.3);
  letter-spacing:0.01em;
  position:relative;
}
.role-tab:hover {
  background:rgba(255,255,255,0.06);
  color:rgba(255,255,255,0.65);
}
.role-tab-member-on {
  background:linear-gradient(135deg, rgba(79,61,240,0.45) 0%, rgba(124,109,250,0.3) 100%) !important;
  border-color:rgba(164,147,251,0.75) !important;
  color:#ffffff !important;
  box-shadow:
    0 0 0 1px rgba(124,109,250,0.25),
    0 4px 24px rgba(79,61,240,0.45),
    inset 0 1px 0 rgba(255,255,255,0.2) !important;
  text-shadow:0 0 20px rgba(200,190,255,0.8), 0 0 40px rgba(124,109,250,0.5) !important;
}
.role-tab-admin-on {
  background:linear-gradient(135deg, rgba(196,80,0,0.5) 0%, rgba(255,140,66,0.32) 100%) !important;
  border-color:rgba(255,160,80,0.8) !important;
  color:#ffffff !important;
  box-shadow:
    0 0 0 1px rgba(255,140,66,0.25),
    0 4px 24px rgba(196,80,0,0.45),
    inset 0 1px 0 rgba(255,255,255,0.2) !important;
  text-shadow:0 0 20px rgba(255,230,180,0.8), 0 0 40px rgba(255,140,66,0.5) !important;
}

/* ── MODE TOGGLE (Sign In / Create Account) ── */
.mode-selector {
  display:flex;
  background:rgba(0,0,0,0.25);
  border:1px solid rgba(255,255,255,0.07);
  border-radius:14px;
  padding:3px;
  gap:3px;
  margin-bottom:24px;
}
.auth-mode-btn {
  flex:1;
  padding:10px 8px;
  border-radius:11px;
  font-size:13px;
  font-weight:700;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  border:1px solid transparent;
  cursor:pointer;
  transition:all .22s cubic-bezier(.16,1,.3,1);
  font-family:var(--font);
  background:transparent;
  color:rgba(255,255,255,0.65);
  letter-spacing:0.01em;
}
.auth-mode-btn:hover {
  color:#ffffff;
  background:rgba(255,255,255,0.1);
}
.auth-mode-on {
  background:rgba(255,255,255,0.14) !important;
  border-color:rgba(255,255,255,0.28) !important;
  color:#ffffff !important;
  text-shadow:0 0 12px rgba(255,255,255,0.4) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 12px rgba(0,0,0,0.4) !important;
}

/* ── AUTH HEADER ── */
.auth-header-icon {
  width:44px; height:44px; border-radius:14px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  position:relative;
}
.auth-header-icon::after {
  content:''; position:absolute; inset:-6px;
  border-radius:20px;
  opacity:0.15;
}

/* ── AUTH SUBMIT BUTTON ── */
.auth-submit-btn {
  width:100%;
  padding:15px;
  font-size:15px;
  font-weight:800;
  border-radius:16px;
  border:none;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  font-family:var(--font);
  letter-spacing:0.01em;
  transition:all .25s cubic-bezier(.16,1,.3,1);
  position:relative;
  overflow:hidden;
  margin-top:6px;
}
.auth-submit-btn::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(rgba(255,255,255,0.12), transparent);
  pointer-events:none;
}
.auth-submit-btn::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:rgba(0,0,0,0.2);
}
.auth-submit-member {
  background:linear-gradient(135deg, #4530e0, #7c6dfa 50%, #9b87ff);
  color:white;
  box-shadow:0 6px 30px rgba(79,61,240,0.45), 0 2px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15);
}
.auth-submit-member:hover {
  transform:translateY(-2px);
  box-shadow:0 12px 40px rgba(79,61,240,0.65), 0 0 80px rgba(124,109,250,0.2);
}
.auth-submit-member:active { transform:translateY(0); }
.auth-submit-admin {
  background:linear-gradient(135deg, #b34500, #ff8c42 50%, #ffaa66);
  color:white;
  box-shadow:0 6px 30px rgba(196,80,0,0.45), 0 2px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15);
}
.auth-submit-admin:hover {
  transform:translateY(-2px);
  box-shadow:0 12px 40px rgba(196,80,0,0.65), 0 0 80px rgba(255,140,66,0.2);
}

/* ── FEATURE PILLS ── */
.feat-pill {
  display:inline-flex; align-items:center; gap:5px;
  padding:5px 13px; border-radius:99px;
  font-size:11px; font-weight:600;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.12);
  color:rgba(255,255,255,0.88);
  transition:all .2s;
}
.feat-pill:hover {
  background:rgba(255,255,255,0.14);
  border-color:rgba(255,255,255,0.3);
  color:#ffffff;
  text-shadow:0 0 10px rgba(255,255,255,0.3);
}

/* ── LEFT PANEL ── */
.auth-left-panel {
  flex:1;
  display:flex;
  flex-direction:column;
  justify-content:center;
  padding:60px 56px;
  max-width:520px;
  position:relative;
  z-index:1;
}
.auth-feature-item {
  display:flex;
  align-items:flex-start;
  gap:14px;
  padding:14px 16px;
  border-radius:16px;
  border:1px solid transparent;
  transition:all .25s;
  cursor:default;
}
.auth-feature-item:hover {
  background:rgba(255,255,255,0.03);
  border-color:rgba(255,255,255,0.07);
}
.auth-feature-icon {
  width:38px; height:38px; border-radius:11px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}

/* ── hex grid background ── */
.hex-bg {
  position:absolute; inset:0; pointer-events:none; overflow:hidden; opacity:0.035;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66zM28 100L0 84V50l28 16 28-16v34L28 100z' fill='none' stroke='%237c6dfa' stroke-width='1'/%3E%3C/svg%3E");
  background-size:56px 100px;
}

/* ── grid noise overlay ── */
.grid-overlay {
  position:absolute; inset:0; pointer-events:none;
  backgroundImage:'linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)';
  backgroundSize:'28px 28px';
}

/* ── forgot password link ── */
.forgot-link {
  background:none; border:none; cursor:pointer;
  font-size:12.5px; font-weight:600; font-family:var(--font);
  text-align:center; padding:6px 0; margin-top:4px;
  transition:all .2s; display:flex; align-items:center; justify-content:center; gap:5px;
}
.forgot-link:hover { opacity:1 !important; text-decoration:underline; }
`;

const injectCSS = () => {
  if (document.getElementById('sm-v5')) return;
  const s = document.createElement('style');
  s.id = 'sm-v5'; s.textContent = CSS;
  document.head.appendChild(s);
};

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#02030a', bg1: '#060810', bg2: '#0a0d1a',
  text: '#eef0ff', sub: '#7a85b0', muted: '#353c5e',
  i: '#7c6dfa', v: '#9d6fff', c: '#00d4ff', g: '#00e5a0',
  r: '#ff5a7e', a: '#ff8c42', y: '#ffd700', pk: '#f06bff',
};

const GRAD = [
  ['#4f3df0','#7c6dfa'], ['#c45000','#ff8c42'],
  ['#00aadd','#00d4ff'], ['#e0004a','#ff5a7e'],
  ['#7b2fff','#9d6fff'], ['#007d5a','#00e5a0'],
  ['#b800cc','#f06bff'],
];

// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '?', size = 40, badge }) => {
  const i = (name.charCodeAt(0) || 0) % GRAD.length;
  const [a, b] = GRAD[i];
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.28), background:`linear-gradient(135deg,${a},${b})`, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:Math.round(size*0.38), fontFamily:"'Syne',sans-serif", userSelect:'none', boxShadow:`0 4px 16px ${a}50, inset 0 1px 0 rgba(255,255,255,0.2)` }}>
        {name.charAt(0).toUpperCase()}
      </div>
      {badge && <div className="ndot"/>}
    </div>
  );
};

// ── AnimNum ────────────────────────────────────────────────────────────────────
const AnimNum = ({ value, prefix='₹' }) => {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value; prev.current = value;
    if (from === to) return;
    const dur = 750, start = Date.now();
    const tick = () => { const p = Math.min((Date.now()-start)/dur,1); const e = 1-Math.pow(1-p,3); setDisp(from+(to-from)*e); if(p<1) requestAnimationFrame(tick); else setDisp(to); };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{prefix}{Math.abs(disp).toFixed(2)}</span>;
};

// ── Input ──────────────────────────────────────────────────────────────────────
const Inp = React.forwardRef(({ icon:Icon, iconRight, cls='', style:s, ...p }, ref) => (
  <div className="field-wrap">
    {Icon && <div className="fi-l"><Icon size={15}/></div>}
    <input ref={ref} className={`inp${Icon?' inp-icon':''}${iconRight?' inp-icon-r':''} ${cls}`} style={s} {...p}/>
    {iconRight && <div className="fi-r">{iconRight}</div>}
  </div>
));
const Tarea = ({ style:s, ...p }) => <textarea className="inp" style={{ minHeight:90, resize:'vertical', ...s }} {...p}/>;
const Sel = ({ style:s, children, ...p }) => <select className="inp" style={{ cursor:'pointer', ...s }} {...p}>{children}</select>;

// ── Toggle ─────────────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange }) => (
  <button onClick={onChange} className="toggle" style={{ background:on?'linear-gradient(135deg,#4f3df0,#7c6dfa)':'rgba(255,255,255,0.09)', boxShadow:on?'0 0 18px rgba(79,61,240,0.45)':'none' }}>
    <div className="toggle-thumb" style={{ left:on?27:4 }}/>
  </button>
);

// ── Modal ──────────────────────────────────────────────────────────────────────
const Modal = ({ onClose, title, children, wide }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" style={{ maxWidth:wide?560:440 }} onClick={e=>e.stopPropagation()}>
      <div style={{ position:'absolute', top:0, left:'8%', right:'8%', height:1, background:'linear-gradient(90deg,transparent,rgba(124,109,250,0.9),rgba(0,212,255,0.6),transparent)' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.text }}>{title}</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button>
      </div>
      {children}
    </div>
  </div>
);

// ── TabRail ────────────────────────────────────────────────────────────────────
const TabRail = ({ tabs, active, onChange, style:s }) => (
  <div className="tab-rail" style={s}>
    {tabs.map(t => (
      <button key={t.v} onClick={() => onChange(t.v)} className={`tab-btn${active===t.v?' tab-on':''}`}>
        {t.icon && <span style={{ display:'flex' }}>{t.icon}</span>}
        {t.label}
        {t.badge ? <span style={{ background:C.r, color:'white', borderRadius:99, minWidth:16, height:16, fontSize:9, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{t.badge}</span> : null}
      </button>
    ))}
  </div>
);

// ── Section Header ─────────────────────────────────────────────────────────────
const SH = ({ title, sub, action }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:22 }}>
    <div>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.text, letterSpacing:'-.02em' }}>{title}</h2>
      {sub && <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

// ── Empty ──────────────────────────────────────────────────────────────────────
const Empty = ({ icon:Icon, title, sub }) => (
  <div style={{ textAlign:'center', padding:'56px 20px', border:'1px dashed rgba(255,255,255,0.07)', borderRadius:20, color:C.muted }}>
    <Icon size={40} style={{ opacity:0.12, marginBottom:16 }}/>
    <p style={{ fontWeight:700, fontSize:15, color:C.sub, marginBottom:6 }}>{title}</p>
    {sub && <p style={{ fontSize:12 }}>{sub}</p>}
  </div>
);

// ── Alert Banner ───────────────────────────────────────────────────────────────
const AlertBanner = ({ msg, type='error' }) => {
  if (!msg) return null;
  const col = type === 'error' ? C.r : type === 'success' ? C.g : C.a;
  const bg  = type === 'error' ? 'rgba(255,90,126,.08)' : type === 'success' ? 'rgba(0,229,160,.08)' : 'rgba(255,140,66,.08)';
  const bc  = type === 'error' ? 'rgba(255,90,126,.25)' : type === 'success' ? 'rgba(0,229,160,.25)' : 'rgba(255,140,66,.25)';
  const Icon = type === 'error' ? AlertTriangle : CheckCircle;
  return (
    <div className="su" style={{ marginBottom:14, background:bg, border:`1px solid ${bc}`, borderRadius:12, padding:'11px 14px', display:'flex', gap:9, alignItems:'flex-start' }}>
      <Icon size={14} style={{ color:col, flexShrink:0, marginTop:1 }}/>
      <span style={{ fontSize:12.5, color:col, fontWeight:600, lineHeight:1.5 }}>{msg}</span>
    </div>
  );
};

// ── Connection Status ──────────────────────────────────────────────────────────
const ConnStatus = ({ online }) => (
  <div style={{ position:'fixed', bottom:22, right:22, zIndex:999, padding:'8px 16px', borderRadius:99, display:'flex', alignItems:'center', gap:7, fontSize:11, fontWeight:700, transition:'all .4s cubic-bezier(.16,1,.3,1)', background:online?'rgba(0,229,160,.1)':'rgba(255,90,126,.9)', border:`1px solid ${online?'rgba(0,229,160,.3)':'rgba(255,90,126,.4)'}`, color:online?C.g:'white', transform:online?'translateY(80px)':'translateY(0)', opacity:online?0:1, pointerEvents:'none' }}>
    {online ? <Wifi size={12}/> : <WifiOff size={12}/>}{online?'Online':'No Connection'}
  </div>
);

// ── TxRow ──────────────────────────────────────────────────────────────────────
const TxRow = ({ tx, onDelete, isAdmin }) => {
  const isPending = tx.status === 'pending';
  const isPay = tx.type === 'payment';
  const amt = safeNum(tx.amount);
  const accent = isPending ? C.a : isPay ? C.g : C.r;
  return (
    <div className="tx-row" style={{ borderLeft:`3px solid ${accent}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', color:accent, flexShrink:0, boxShadow:`0 0 14px ${accent}20` }}>
          {isPending ? <Clock size={16}/> : isPay ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
        </div>
        <div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
            <span style={{ fontWeight:700, fontSize:13.5, color:C.text }}>{String(tx.description||'Transaction')}</span>
            {isPending && <span className="tag t-amber">Pending</span>}
            <span className={(tx.category||'main')==='grocery'?'tag t-amber':'tag t-iris'}>{tx.category||'main'}</span>
          </div>
          <span style={{ fontSize:11, color:C.muted, fontFamily:'var(--mono)' }}>{fmtDate(tx.date)}</span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <span style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:15, color:isPending?C.muted:isPay?C.g:C.r }}>{isPay?'+':'−'}₹{amt.toFixed(2)}</span>
        {isAdmin && onDelete && <button className="btn btn-danger btn-icon btn-sm" onClick={e=>{e.stopPropagation();onDelete(tx.id);}}><Trash2 size={13}/></button>}
      </div>
    </div>
  );
};

// ── ChatBubble ─────────────────────────────────────────────────────────────────
const ChatBubble = ({ msg, isOwn, name }) => (
  <div className="fu" style={{ display:'flex', flexDirection:'column', alignItems:isOwn?'flex-end':'flex-start', marginBottom:14 }}>
    {!isOwn && <span style={{ fontSize:10, fontWeight:700, color:C.i, marginBottom:4, marginLeft:4 }}>{String(name)}</span>}
    <div className={isOwn?'b-own':'b-other'}>{String(msg.text)}</div>
    <span style={{ fontSize:10, color:C.muted, marginTop:4, fontFamily:'var(--mono)' }}>{fmtTime(msg.createdAt)}</span>
  </div>
);

// ── ChatPanel ──────────────────────────────────────────────────────────────────
const ChatPanel = ({ msgs=[], uid, onSend, ph }) => {
  const [text, setText] = useState('');
  const bot = useRef(null);
  useEffect(() => { bot.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs.length]);
  const send = e => { e.preventDefault(); if(!text.trim()) return; onSend(text); setText(''); };
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px' }}>
        {msgs.length===0 ? (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:C.muted, gap:10 }}>
            <MessageSquare size={34} style={{ opacity:0.12 }}/>
            <p style={{ fontSize:13 }}>Start the conversation</p>
          </div>
        ) : msgs.map(m => <ChatBubble key={m.id} msg={m} isOwn={m.senderId===uid} name={m.senderName}/>)}
        <div ref={bot}/>
      </div>
      <form onSubmit={send} style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.065)', display:'flex', gap:10, alignItems:'center', background:'rgba(0,0,0,0.3)', flexShrink:0 }}>
        <input className="inp" type="text" style={{ borderRadius:99, padding:'10px 18px', flex:1 }} placeholder={ph} value={text} onChange={e=>setText(e.target.value)}/>
        <button type="submit" style={{ width:40, height:40, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#4f3df0,#7c6dfa)', border:'none', cursor:'pointer', color:'white', boxShadow:'0 4px 16px rgba(79,61,240,0.45)', transition:'transform .2s, box-shadow .2s', flexShrink:0 }}
          onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.12)';e.currentTarget.style.boxShadow='0 6px 24px rgba(79,61,240,0.65)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 4px 16px rgba(79,61,240,0.45)';}}>
          <Send size={15}/>
        </button>
      </form>
    </div>
  );
};

// ── InviteCard ─────────────────────────────────────────────────────────────────
const InviteCard = ({ msg, onDiscuss }) => (
  <div className="card fu" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
    {msg.imageUrl && <img src={msg.imageUrl} alt="" style={{ width:'100%', maxHeight:220, objectFit:'cover', display:'block' }}/>}
    <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.055)', background:msg.imageUrl?'transparent':'linear-gradient(135deg,rgba(79,61,240,0.15),rgba(124,109,250,0.08))' }}>
      <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:C.text, marginBottom:6 }}>{String(msg.title)}</h3>
      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}><CalendarDays size={11}/>{fmtDate(msg.eventDate)}</div>
    </div>
    <div style={{ padding:'14px 20px' }}>
      <p style={{ fontSize:13, color:C.sub, lineHeight:1.7, marginBottom:14 }}>{String(msg.description)}</p>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.055)' }}>
        <span style={{ fontSize:11, color:C.muted }}>Posted {msg.createdAt?fmtDate(new Date(msg.createdAt.seconds*1000)):'recently'}</span>
        {onDiscuss && <button className="btn btn-ghost btn-sm" onClick={onDiscuss} style={{ gap:6 }}><MessageSquare size={12}/>Discuss</button>}
      </div>
    </div>
  </div>
);

// ── Particle Canvas ────────────────────────────────────────────────────────────
const ParticleCanvas = ({ color='124,109,250' }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length:55 }, () => ({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4, r:Math.random()*1.8+0.4, a:Math.random()*.4+0.08 }));
    let id;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>canvas.width) p.vx*=-1;
        if(p.y<0||p.y>canvas.height) p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${color},${p.a})`; ctx.fill();
      });
      pts.forEach((a,i) => pts.slice(i+1).forEach(b => {
        const d = Math.hypot(a.x-b.x, a.y-b.y);
        if(d<95) { ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle=`rgba(${color},${0.06*(1-d/95)})`; ctx.lineWidth=0.8; ctx.stroke(); }
      }));
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, [color]);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}/>;
};

// ── Password Input + Strength Meter ───────────────────────────────────────────
const pwStrength = pw => {
  if(!pw) return { score:0, label:'', color:'transparent' };
  let s=0;
  if(pw.length>=4) s++;
  if(pw.length>=8) s++;
  if(/[A-Z]/.test(pw)) s++;
  if(/[0-9]/.test(pw)) s++;
  if(/[^A-Za-z0-9]/.test(pw)) s++;
  const map=[{label:'',color:'transparent'},{label:'Too weak',color:C.r},{label:'Weak',color:C.a},{label:'Fair',color:C.y},{label:'Good',color:C.g},{label:'Strong 💪',color:C.c}];
  return { score:s, ...map[s] };
};

const PasswordInput = ({ value, onChange, placeholder='Password', showMeter=false, autoComplete, autoFocus }) => {
  const [show, setShow] = useState(false);
  const str = showMeter ? pwStrength(value) : null;
  return (
    <div>
      <Inp icon={Lock} type={show?'text':'password'} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete} autoFocus={autoFocus}
        iconRight={
          <button type="button" onClick={()=>setShow(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', color:show?C.i:'rgba(255,255,255,0.35)', display:'flex', padding:4, transition:'color .2s' }}>
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        }
      />
      {showMeter && value.length>0 && (
        <div>
          <div className="pw-bar-wrap">
            {[1,2,3,4,5].map(n => (
              <div key={n} className="pw-bar" style={{ background:n<=str.score?str.color:'rgba(255,255,255,0.06)', transform:n<=str.score?'scaleY(1.5)':'scaleY(1)' }}/>
            ))}
          </div>
          <p className="pw-label" style={{ color:str.color }}>{str.label}</p>
        </div>
      )}
    </div>
  );
};

// ── ForgotPasswordPanel ────────────────────────────────────────────────────────
const ForgotPasswordPanel = ({ users, onClose, accentCol, accentGrad, isAdmin }) => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [secAnswer, setSecAnswer] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFindUser = e => {
    e.preventDefault(); setErr('');
    const inp = username.trim().toLowerCase().replace(/\s+/g,'');
    const u = users.find(u => {
      const uname = (u.username||'').toLowerCase().replace(/\s+/g,'');
      return uname===inp && (isAdmin ? u.role==='admin' : true);
    });
    if(!u) return setErr(isAdmin?'No admin account with that username.':'No account found with that username.');
    setFoundUser(u); setStep(2);
  };

  const handleVerify = e => {
    e.preventDefault(); setErr('');
    const nameCheck = secAnswer.trim().toLowerCase();
    const fullName = (foundUser.name||'').toLowerCase();
    const bday = foundUser.birthday||'';
    if(nameCheck===fullName||(bday && nameCheck===bday)) { setStep(3); }
    else { setErr('Verification failed. Type your full name or birthday (YYYY-MM-DD).'); }
  };

  const handleReset = async e => {
    e.preventDefault(); setErr('');
    if(newPass.length<4) return setErr('Password must be at least 4 characters.');
    if(newPass!==confirmPass) return setErr('Passwords do not match.');
    setLoading(true);
    try { await updateDoc(dRef(COL.USERS, foundUser.id), { password:newPass }); setStep(4); }
    catch { setErr('Failed to update password. Try again.'); }
    setLoading(false);
  };

  const STEPS = ['Find','Verify','New Pass','Done'];
  return (
    <div className="fp-overlay">
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:24 }}>
        {STEPS.map((s,i) => (
          <React.Fragment key={s}>
            <div className="fp-step-dot" style={{ background:i+1<step?accentCol:i+1===step?accentCol:'rgba(255,255,255,0.1)', width:i+1===step?24:8, borderRadius:99, boxShadow:i+1===step?`0 0 12px ${accentCol}90`:'none' }}/>
            {i<3 && <div style={{ flex:1, height:1, background:i+1<step?`${accentCol}55`:'rgba(255,255,255,0.06)', transition:'background .4s' }}/>}
          </React.Fragment>
        ))}
      </div>

      {step<4 && (
        <button onClick={step===1?onClose:()=>{setStep(s=>s-1);setErr('');}} className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start', marginBottom:18, gap:6 }}>
          <ArrowLeft size={13}/>{step===1?'Back to Sign In':'Back'}
        </button>
      )}

      {step===1 && (
        <div className="fu">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:`${accentCol}18`, display:'flex', alignItems:'center', justifyContent:'center', color:accentCol }}><Key size={17}/></div>
            <div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:'#ffffff' }}>Forgot Password?</h3>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>Enter your {isAdmin?'admin ':''} username to begin</p>
            </div>
          </div>
          <AlertBanner msg={err}/>
          <form onSubmit={handleFindUser} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Inp icon={AtSign} type="text" placeholder="Your username" value={username} onChange={e=>setUsername(e.target.value)} autoCapitalize="none" autoFocus/>
            <button type="submit" className="btn" style={{ width:'100%', padding:'14px', background:accentGrad, color:'white', gap:8, fontSize:14 }}>
              Find My Account <ChevronRight size={16}/>
            </button>
          </form>
        </div>
      )}

      {step===2 && (
        <div className="fu">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <Avatar name={foundUser.name} size={44}/>
            <div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:'#ffffff' }}>{foundUser.name}</h3>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>@{foundUser.username}</p>
            </div>
          </div>
          <div style={{ background:`${accentCol}0d`, border:`1px solid ${accentCol}28`, borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
            <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>Type your <strong style={{color:'#ffffff'}}>full name</strong> or <strong style={{color:'#ffffff'}}>birthday</strong> (YYYY-MM-DD) to verify identity.</p>
          </div>
          <AlertBanner msg={err}/>
          <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Inp icon={User} type="text" placeholder="Full name or birthday (YYYY-MM-DD)" value={secAnswer} onChange={e=>setSecAnswer(e.target.value)} autoFocus/>
            <button type="submit" className="btn" style={{ width:'100%', padding:'14px', background:accentGrad, color:'white', gap:8, fontSize:14 }}>
              Verify Identity <ChevronRight size={16}/>
            </button>
          </form>
        </div>
      )}

      {step===3 && (
        <div className="fu">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:`${accentCol}18`, display:'flex', alignItems:'center', justifyContent:'center', color:accentCol }}><Lock size={17}/></div>
            <div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:'#ffffff' }}>Set New Password</h3>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>For <strong style={{color:accentCol}}>@{foundUser.username}</strong></p>
            </div>
          </div>
          <AlertBanner msg={err}/>
          <form onSubmit={handleReset} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <PasswordInput value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password" showMeter autoFocus autoComplete="new-password"/>
            <PasswordInput value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"/>
            <button type="submit" disabled={loading} className="btn" style={{ width:'100%', padding:'14px', background:accentGrad, color:'white', gap:8, fontSize:14, marginTop:4 }}>
              {loading ? <Loader size={16} className="spin"/> : <><Key size={15}/>Reset Password</>}
            </button>
          </form>
        </div>
      )}

      {step===4 && (
        <div className="fu" style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:`${accentCol}18`, border:`2px solid ${accentCol}44`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', boxShadow:`0 0 34px ${accentCol}35` }}>
            <CheckCircle size={32} style={{ color:accentCol }}/>
          </div>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:'#ffffff', marginBottom:8 }}>Password Reset!</h3>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:24 }}>Password updated successfully. Sign in with your new credentials.</p>
          <button className="btn" onClick={onClose} style={{ width:'100%', padding:'14px', background:accentGrad, color:'white', gap:8, fontSize:14 }}>
            <ArrowLeft size={15}/>Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// AUTH VIEW — COMPLETE PREMIUM REDESIGN
// ══════════════════════════════════════════════════════════════════════════════
const AuthView = ({ users, loginForm, setLoginForm, handleLogin, handleRegister, loadingState, error }) => {
  const [role, setRole] = useState('member');
  const [mode, setMode] = useState('signin');
  const [regForm, setRegForm] = useState({ name:'', username:'', password:'', confirm:'', birthday:'' });
  const [regErr, setRegErr] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [showRetry, setShowRetry] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const firstRun = users.length === 0;

  useEffect(() => { if(loadingState){ const t=setTimeout(()=>setShowRetry(true),9000); return()=>clearTimeout(t); } }, [loadingState]);

  const submitSignin = e => { e.preventDefault(); handleLogin(e, role); };
  const submitSignup = e => {
    e.preventDefault(); setRegErr(''); setRegSuccess('');
    if(!regForm.name.trim())       return setRegErr('Full name is required.');
    if(!regForm.username.trim())   return setRegErr('Username is required.');
    if(regForm.password.length<4)  return setRegErr('Password must be at least 4 characters.');
    if(regForm.password!==regForm.confirm) return setRegErr('Passwords do not match.');
    handleRegister(regForm, role, msg => {
      if(msg.ok) { setRegSuccess(msg.text); setMode('signin'); setRegForm({ name:'', username:'', password:'', confirm:'', birthday:'' }); }
      else setRegErr(msg.text);
    });
  };

  const isAdmin = role==='admin';
  const accentCol = isAdmin ? '#ff8c42' : '#7c6dfa';
  const accentGrad = isAdmin ? 'linear-gradient(135deg,#c45000,#ff8c42)' : 'linear-gradient(135deg,#4f3df0,#7c6dfa)';
  const particleColor = isAdmin ? '255,140,66' : '124,109,250';

  const FEATURES = [
    { icon:<Activity size={17}/>, col:'#7c6dfa', bg:'rgba(124,109,250,0.15)', title:'Live Dashboard', sub:'Real-time balance & transaction tracking' },
    { icon:<Sparkles size={17}/>, col:'#f06bff', bg:'rgba(240,107,255,0.15)', title:'AI-Powered Reminders', sub:'Generate smart payment nudges instantly' },
    { icon:<Globe2 size={17}/>, col:'#00d4ff', bg:'rgba(0,212,255,0.15)', title:'Group Management', sub:'Invite members, manage events, chat live' },
  ];

  return (
    <div className="auth-page">
      <div className="hex-bg"/>
      <ParticleCanvas color={particleColor}/>

      {/* Ambient background orbs */}
      <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:isAdmin?'radial-gradient(circle,rgba(196,80,0,0.1),transparent 70%)':'radial-gradient(circle,rgba(79,61,240,0.1),transparent 70%)', top:'-20%', left:'-15%', animation:'drift 16s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:isAdmin?'radial-gradient(circle,rgba(255,140,66,0.06),transparent 70%)':'radial-gradient(circle,rgba(0,212,255,0.05),transparent 70%)', bottom:'-15%', right:'-10%', animation:'drift2 20s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:`radial-gradient(circle,${accentCol}08,transparent 70%)`, top:'45%', left:'35%', animation:'drift 28s ease-in-out infinite 6s', pointerEvents:'none' }}/>

      {/* ── LEFT PANEL ── */}
      <div className="auth-left-panel fu">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:52 }}>
          <div style={{ width:50, height:50, borderRadius:16, background:accentGrad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 32px ${accentCol}60, inset 0 1px 0 rgba(255,255,255,0.2)`, animation:'floatY 4s ease-in-out infinite' }}>
            <DollarSign size={24} color="white"/>
          </div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'#ffffff', letterSpacing:'-.02em' }}>Smart Manager</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginTop:1 }}>Dues · Payments · Chat</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom:40 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:46, fontWeight:800, color:'#ffffff', lineHeight:1.05, letterSpacing:'-.04em', marginBottom:20 }}>
            Manage dues<br/>
            <span style={{ backgroundImage:accentGrad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              intelligently.
            </span>
          </h1>
          <p style={{ fontSize:15.5, color:'rgba(255,255,255,0.72)', lineHeight:1.75, maxWidth:360 }}>
            Track payments, send invitations, chat with members — all in one beautiful interface.
          </p>
        </div>

        {/* Feature pills row */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:36 }}>
          {['AI-powered','Real-time sync','UPI Payments','Group Chat','Event Invites'].map(f => (
            <span key={f} className="feat-pill"><Zap size={10} style={{ color:accentCol }}/>{f}</span>
          ))}
        </div>

        {/* Feature list */}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {FEATURES.map((f,i) => (
            <div key={f.title} className={`auth-feature-item fu d${i+1}`}>
              <div className="auth-feature-icon" style={{ background:f.bg, boxShadow:`0 0 18px ${f.col}20`, color:f.col }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:13.5, color:'#ffffff', marginBottom:3 }}>{f.title}</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.62)', lineHeight:1.5 }}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT AUTH CARD ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', position:'relative', zIndex:1 }}>
        <div className={`auth-card${isAdmin?' admin-card':''}`}>
          <div className="auth-noise"/>

          {forgotOpen && <ForgotPasswordPanel users={users} onClose={()=>setForgotOpen(false)} accentCol={accentCol} accentGrad={accentGrad} isAdmin={isAdmin}/>}

          {/* ── ROLE SELECTOR ── */}
          <div className="role-selector">
            {[
              { v:'member', icon:<User size={15}/>, label:'Member' },
              { v:'admin',  icon:<ShieldCheck size={15}/>, label:'Admin' }
            ].map(r => (
              <button
                key={r.v}
                onClick={()=>{setRole(r.v);setForgotOpen(false);setRegErr('');setRegSuccess('');}}
                className={`role-tab${r.v===role?(r.v==='admin'?' role-tab-admin-on':' role-tab-member-on'):''}`}
              >
                {r.icon}
                {r.label}
                {r.v===role && (
                  <div style={{ width:5, height:5, borderRadius:'50%', background:accentCol, boxShadow:`0 0 8px ${accentCol}, 0 0 14px ${accentCol}80` }}/>
                )}
              </button>
            ))}
          </div>

          {/* ── MODE TOGGLE ── */}
          {!firstRun && (
            <div className="mode-selector fu d1">
              {[{v:'signin',label:'Sign In'},{v:'signup',label:'Create Account'}].map(m => (
                <button
                  key={m.v}
                  onClick={()=>{setMode(m.v);setRegErr('');setRegSuccess('');setForgotOpen(false);}}
                  className={`auth-mode-btn${mode===m.v?' auth-mode-on':''}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* ── HEADER ── */}
          <div className="fu d2" style={{ display:'flex', alignItems:'center', gap:13, marginBottom:24 }}>
            <div
              className="auth-header-icon"
              style={{
                background: isAdmin
                  ? 'linear-gradient(135deg,rgba(196,80,0,0.3),rgba(255,140,66,0.15))'
                  : 'linear-gradient(135deg,rgba(79,61,240,0.3),rgba(124,109,250,0.15))',
                border:`1px solid ${accentCol}35`,
                color:accentCol,
                boxShadow:`0 0 24px ${accentCol}25, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}
            >
              {isAdmin ? <ShieldCheck size={18}/> : mode==='signup' ? <UserPlus size={18}/> : <User size={18}/>}
            </div>
            <div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:19, color:'#ffffff', letterSpacing:'-.02em', lineHeight:1.2 }}>
                {firstRun ? 'Create Admin' : mode==='signup' ? `New ${isAdmin?'Admin':'Member'}` : `${isAdmin?'Admin':'Member'} Sign In`}
              </h2>
              <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)', marginTop:4, lineHeight:1.4 }}>
                {firstRun ? 'Set up your administrator account' : mode==='signup' ? `Register a new ${isAdmin?'admin':'member'} account` : 'Enter your credentials to continue'}
              </p>
            </div>
          </div>

          {/* ── ALERT BANNERS ── */}
          <AlertBanner msg={regSuccess} type="success"/>
          <AlertBanner msg={regErr || error?.message || (error && String(error)) || ''}/>

          {/* ── LOADING ── */}
          {loadingState ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 0', gap:18 }}>
              <div style={{ position:'relative' }}>
                <Loader size={36} style={{ color:accentCol, animation:'spin .9s linear infinite' }}/>
                <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`2px solid ${accentCol}22`, animation:'glowPulse 2s ease infinite' }}/>
              </div>
              <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>Connecting…</p>
              {showRetry && <button className="btn btn-ghost btn-sm" onClick={()=>window.location.reload()}><RefreshCw size={13}/>Reload</button>}
            </div>

          ) : mode==='signin' || firstRun ? (
            /* ── SIGN IN FORM ── */
            <form onSubmit={submitSignin} className="fu d3" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <Inp
                icon={AtSign}
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}
                autoCapitalize="none"
                autoComplete="username"
              />
              <PasswordInput
                value={loginForm.password}
                onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}
                placeholder="Password"
                autoComplete="current-password"
              />

              <button
                type="submit"
                className={`auth-submit-btn fu d4 ${isAdmin?'auth-submit-admin':'auth-submit-member'}`}
              >
                Sign In as {isAdmin ? 'Admin' : 'Member'}
                <ChevronRight size={18}/>
              </button>

              {!firstRun && (
                <button
                  type="button"
                  onClick={()=>setForgotOpen(true)}
                  className="forgot-link"
                  style={{ color:accentCol, opacity:1, fontWeight:700 }}
                >
                  <Key size={11}/>Forgot password?
                </button>
              )}
            </form>

          ) : (
            /* ── SIGN UP FORM ── */
            <form onSubmit={submitSignup} className="fu d3" style={{ display:'flex', flexDirection:'column', gap:11 }}>
              <Inp icon={User} type="text" placeholder="Full Name" value={regForm.name} onChange={e=>setRegForm(p=>({...p,name:e.target.value}))}/>
              <Inp icon={AtSign} type="text" placeholder="Username" value={regForm.username} onChange={e=>setRegForm(p=>({...p,username:e.target.value}))} autoCapitalize="none"/>
              <PasswordInput value={regForm.password} onChange={e=>setRegForm(p=>({...p,password:e.target.value}))} placeholder="Password (min 4 chars)" showMeter autoComplete="new-password"/>
              <PasswordInput value={regForm.confirm} onChange={e=>setRegForm(p=>({...p,confirm:e.target.value}))} placeholder="Confirm Password" autoComplete="new-password"/>
              {!isAdmin && <Inp icon={Cake} type="date" value={regForm.birthday} onChange={e=>setRegForm(p=>({...p,birthday:e.target.value}))}/>}
              <button
                type="submit"
                className={`auth-submit-btn fu d4 ${isAdmin?'auth-submit-admin':'auth-submit-member'}`}
              >
                <UserPlus size={17}/>
                Create {isAdmin ? 'Admin' : 'Member'} Account
              </button>
            </form>
          )}

          {/* ── FOOTER ── */}
          <p className="fu d5" style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:24, lineHeight:1.7, letterSpacing:'0.02em' }}>
            Secured with Firebase · Smart Manager © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const AdminDash = ({ users, handleLogout, upiId, setUpiId, saveUpiId, newMemForm, setNewMemForm, createMember, populateDefaults, getMemberBalance, setSelMember, setView, transactions, sendMessage, handleApproval, isGroceryEnabled, toggleGrocery, chatMessages, sendChat, appUser }) => {
  const [tab, setTab] = useState('overview');
  const [msgForm, setMsgForm] = useState({ title:'', description:'', recipients:[], imageUrl:'', eventDate:'' });
  const [chatMode, setChatMode] = useState('public');
  const [selPriv, setSelPriv] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [memberAlert, setMemberAlert] = useState('');

  const pending = useMemo(() => transactions.filter(t=>t.status==='pending'), [transactions]);
  const members = useMemo(() => users.filter(u=>u.role!=='admin'), [users]);
  const filteredMembers = useMemo(() => members.filter(m=>!search||m.name.toLowerCase().includes(search.toLowerCase())), [members, search]);
  const pubChats = useMemo(() => chatMessages.filter(m=>m.type==='public'), [chatMessages]);
  const totalDue = useMemo(() => members.reduce((s,m)=>s+Math.max(0,getMemberBalance(m.id,'main')),0), [members, getMemberBalance]);
  const totalCollected = useMemo(() => transactions.filter(t=>t.type==='payment'&&t.status==='approved').reduce((s,t)=>s+safeNum(t.amount),0), [transactions]);
  const privUsers = useMemo(() => { const ids=new Set(); chatMessages.forEach(m=>{ if(m.type==='private'){ if(m.targetId==='admin'||m.targetId===appUser.id) ids.add(m.senderId); if(m.senderId===appUser.id) ids.add(m.targetId); } }); return Array.from(ids).map(id=>users.find(u=>u.id===id)).filter(Boolean); }, [chatMessages, appUser, users]);
  const privChats = useMemo(() => { if(!selPriv) return []; return chatMessages.filter(m=>m.type==='private'&&((m.senderId===selPriv.id&&(m.targetId==='admin'||m.targetId===appUser.id))||(m.senderId===appUser.id&&m.targetId===selPriv.id))); }, [chatMessages, selPriv, appUser]);
  const filteredTx = useMemo(() => filterCat==='all'?transactions:transactions.filter(t=>(t.category||'main')===filterCat), [transactions, filterCat]);

  const doSendChat = t => { if(chatMode==='public') sendChat({text:t,type:'public'}); else if(selPriv) sendChat({text:t,type:'private',targetId:selPriv.id}); };
  const handleImg = async e => { const f=e.target.files[0]; if(!f||f.size>5e6) return; try { const url=await compressImg(f); setMsgForm(p=>({...p,imageUrl:url})); } catch {} };
  const doAI = async () => { if(!msgForm.title) return; setAiLoading(true); const txt=await callGemini(`Write an engaging, warm event invitation for: "${msgForm.title}". Under 100 words, use emojis, friendly tone.`); setMsgForm(p=>({...p,description:txt})); setAiLoading(false); };
  const toggleRecip = id => setMsgForm(p=>({...p,recipients:p.recipients.includes(id)?p.recipients.filter(x=>x!==id):[...p.recipients,id]}));
  const selectAll = () => { const ids=members.map(u=>u.id); setMsgForm(p=>({...p,recipients:p.recipients.length===ids.length?[]:ids})); };

  const handleCreateMember = () => {
    createMember(msg => {
      if(msg.ok) { setMemberAlert('✓ ' + msg.text); setAddMemberOpen(false); setTimeout(()=>setMemberAlert(''),3500); }
      else setMemberAlert('Error: '+msg.text);
    });
  };

  const TABS = [
    { v:'overview',  label:'Overview',  icon:<BarChart2 size={13}/> },
    { v:'members',   label:'Members',   icon:<Users size={13}/> },
    { v:'approvals', label:'Approvals', icon:<CheckCircle size={13}/>, badge:pending.length||null },
    { v:'events',    label:'Events',    icon:<Bell size={13}/> },
    { v:'chat',      label:'Chat',      icon:<MessageSquare size={13}/> },
    { v:'settings',  label:'Settings',  icon:<Settings size={13}/> },
  ];

  const STATS = [
    { label:'Members',   val:members.length,               icon:<Users size={18}/>,       col:C.i, bg:'rgba(124,109,250,.08)', br:'rgba(124,109,250,.2)' },
    { label:'Main Due',  val:`₹${totalDue.toFixed(0)}`,    icon:<TrendingDown size={18}/>, col:C.r, bg:'rgba(255,90,126,.08)',  br:'rgba(255,90,126,.2)' },
    { label:'Collected', val:`₹${totalCollected.toFixed(0)}`,icon:<TrendingUp size={18}/>, col:C.g, bg:'rgba(0,229,160,.08)',   br:'rgba(0,229,160,.2)' },
    { label:'Pending',   val:pending.length,                icon:<Clock size={18}/>,        col:C.a, bg:'rgba(255,140,66,.08)',  br:'rgba(255,140,66,.2)' },
  ];

  return (
    <div style={{ background:C.bg, minHeight:'100vh' }}>
      <nav className="topnav">
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ height:62, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#4f3df0,#7c6dfa)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 22px rgba(79,61,240,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                <DollarSign size={18} color="white"/>
              </div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, background:'linear-gradient(135deg,#a393fb,#ff8c42)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', letterSpacing:'-.02em' }}>Smart Manager</div>
                <div style={{ fontSize:10, color:C.muted, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase' }}>Admin Console</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Avatar name={appUser.name} size={34}/>
              <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', background:'rgba(255,140,66,.1)', border:'1px solid rgba(255,140,66,.22)', borderRadius:10 }}>
                <ShieldCheck size={13} color={C.a}/>
                <span style={{ fontSize:12, fontWeight:700, color:C.a, fontFamily:"'Syne',sans-serif" }}>Admin</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ gap:6 }}><LogOut size={14}/>Logout</button>
            </div>
          </div>
          <div className="no-scroll" style={{ display:'flex', gap:4, paddingBottom:12, overflowX:'auto' }}>
            {TABS.map(t => (
              <button key={t.v} onClick={()=>setTab(t.v)} style={{ padding:'7px 15px', borderRadius:10, fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6, border:tab===t.v?'1px solid rgba(124,109,250,.3)':'1px solid transparent', background:tab===t.v?'rgba(124,109,250,.12)':'transparent', color:tab===t.v?'#a393fb':C.muted, fontFamily:"'Syne',sans-serif", cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap', position:'relative' }}>
                {t.icon}{t.label}
                {t.badge ? <span style={{ background:C.r, color:'white', borderRadius:99, minWidth:16, height:16, fontSize:9, fontWeight:900, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{t.badge}</span> : null}
                {tab===t.v && <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', width:18, height:2.5, borderRadius:99, background:'linear-gradient(90deg,#7c6dfa,#00d4ff)', animation:'tabIndicator .25s ease' }}/>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'30px 24px 80px' }}>
        {memberAlert && <AlertBanner msg={memberAlert} type={memberAlert.startsWith('✓')?'success':'error'}/>}

        {tab==='overview' && (
          <div className="page">
            <SH title="Dashboard" sub={`${members.length} members · ₹${totalDue.toFixed(0)} outstanding`}/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:14, marginBottom:32 }}>
              {STATS.map((s,i) => (
                <div key={i} className={`stat fu d${i+1}`} style={{ background:s.bg, border:`1px solid ${s.br}` }}>
                  <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right, ${s.col}10, transparent 70%)`, pointerEvents:'none', borderRadius:'inherit' }}/>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, position:'relative' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em' }}>{s.label}</span>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${s.col}18`, display:'flex', alignItems:'center', justifyContent:'center', color:s.col, boxShadow:`0 0 16px ${s.col}25` }}>{s.icon}</div>
                  </div>
                  <div className="big" style={{ color:s.col, position:'relative' }}>{s.val}</div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width:i===0?'100%':`${Math.min(60,100)}%`, background:`linear-gradient(90deg,${s.col}70,${s.col})` }}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="card fu d5" style={{ marginBottom:28, background:'rgba(124,109,250,0.04)', borderColor:'rgba(124,109,250,0.14)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:C.text }}>Collection Progress</h3>
                <span className="tag t-iris">{totalCollected>0?`${Math.round((totalCollected/Math.max(totalCollected+totalDue,1))*100)}% collected`:'no data'}</span>
              </div>
              <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#4f3df0,#7c6dfa,#00d4ff)', borderRadius:99, width:`${Math.round((totalCollected/Math.max(totalCollected+totalDue,1))*100)}%`, transition:'width 1.4s cubic-bezier(.16,1,.3,1)', boxShadow:'0 0 14px rgba(124,109,250,0.4)' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:11, color:C.muted, fontFamily:'var(--mono)' }}>
                <span>Collected: ₹{totalCollected.toFixed(0)}</span>
                <span>Due: ₹{totalDue.toFixed(0)}</span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:C.text }}>Recent Transactions</h3>
              <div style={{ display:'flex', gap:5 }}>
                {['all','main','grocery'].map(f => (
                  <button key={f} onClick={()=>setFilterCat(f)} className={`btn btn-xs ${filterCat===f?'btn-primary':'btn-ghost'}`} style={{ textTransform:'capitalize' }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {filteredTx.slice(0,12).map(tx => <TxRow key={tx.id} tx={tx} isAdmin/>)}
              {filteredTx.length===0 && <Empty icon={History} title="No transactions yet" sub="Transactions will appear here"/>}
            </div>
          </div>
        )}

        {tab==='members' && (
          <div className="page">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
              <SH title="Members" sub={`${filteredMembers.length} of ${members.length} shown`}/>
              <div style={{ display:'flex', gap:9, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
                  <input className="inp" placeholder="Search…" style={{ paddingLeft:34, width:190, borderRadius:12, padding:'9px 14px 9px 34px', fontSize:13 }} value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={()=>setViewMode(v=>v==='grid'?'list':'grid')}>{viewMode==='grid'?<List size={15}/>:<Grid size={15}/>}</button>
                <button className="btn btn-primary btn-sm" onClick={()=>setAddMemberOpen(true)} style={{ gap:6 }}><UserPlus size={14}/>Add</button>
              </div>
            </div>
            <div style={{ display:viewMode==='grid'?'grid':'flex', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', flexDirection:'column', gap:12 }}>
              {filteredMembers.map((m,i) => {
                const main=getMemberBalance(m.id,'main'), groc=getMemberBalance(m.id,'grocery');
                return (
                  <div key={m.id} className={`mem-card fu d${Math.min(i%5+1,5)}`} onClick={()=>{setSelMember(m.id);setView('member-detail');}}>
                    <div style={{ padding:'18px 18px 16px', position:'relative', zIndex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <Avatar name={m.name} size={44} badge={main>0}/>
                          <div>
                            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:C.text, marginBottom:2 }}>{m.name}</p>
                            <p style={{ fontSize:11.5, color:C.muted, fontFamily:'var(--mono)' }}>@{m.username}</p>
                          </div>
                        </div>
                        <ArrowUpRight size={16} color={C.muted} style={{ marginTop:2 }}/>
                      </div>
                      <div style={{ display:'flex', gap:9 }}>
                        <div style={{ flex:1, padding:'10px 12px', background:'rgba(124,109,250,.07)', borderRadius:12, border:'1px solid rgba(124,109,250,.15)' }}>
                          <p style={{ fontSize:9, color:C.i, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', marginBottom:4 }}>MAIN</p>
                          <p style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:16, color:main>0?C.r:C.g }}>₹{Math.abs(main).toFixed(0)}</p>
                        </div>
                        <div style={{ flex:1, padding:'10px 12px', background:'rgba(255,140,66,.07)', borderRadius:12, border:'1px solid rgba(255,140,66,.15)' }}>
                          <p style={{ fontSize:9, color:C.a, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', marginBottom:4 }}>GROCERY</p>
                          <p style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:16, color:groc>0?C.r:C.g }}>₹{Math.abs(groc).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ height:3, background:main>0?`linear-gradient(90deg,${C.r},${C.a})`:`linear-gradient(90deg,${C.g},${C.c})`, boxShadow:main>0?`0 0 10px ${C.r}60`:`0 0 10px ${C.g}60` }}/>
                  </div>
                );
              })}
            </div>
            {filteredMembers.length===0 && <div style={{ marginTop:16 }}><Empty icon={Users} title="No members found"/></div>}
          </div>
        )}

        {tab==='approvals' && (
          <div className="page">
            <SH title="Pending Approvals" sub={`${pending.length} payment${pending.length!==1?'s':''} awaiting`}/>
            {pending.length===0 ? <Empty icon={CheckCircle} title="All clear!" sub="No pending approvals"/> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {pending.map((tx,i) => {
                  const u=users.find(x=>x.id===tx.userId);
                  return (
                    <div key={tx.id} className={`card fu d${Math.min(i+1,5)}`} style={{ borderLeft:`4px solid ${C.a}`, background:'rgba(255,140,66,.04)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', padding:'18px 22px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <Avatar name={u?.name||'?'} size={46}/>
                        <div>
                          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:C.text, marginBottom:5 }}>{u?.name||'Unknown'}</p>
                          <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
                            <span className={(tx.category||'main')==='grocery'?'tag t-amber':'tag t-iris'}>{tx.category||'main'}</span>
                            <span style={{ fontSize:11, color:C.muted, fontFamily:'var(--mono)' }}>{fmtDate(tx.date)}</span>
                            <span style={{ fontSize:11, color:C.sub }}>{tx.description}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontFamily:'var(--mono)', fontWeight:500, fontSize:22, color:C.g }}>₹{safeNum(tx.amount).toFixed(2)}</span>
                        <button onClick={()=>handleApproval(tx.id,false)} className="btn btn-danger btn-icon" style={{ width:40, height:40, borderRadius:'50%', padding:0 }}><X size={17}/></button>
                        <button onClick={()=>handleApproval(tx.id,true)} className="btn btn-icon" style={{ width:40, height:40, borderRadius:'50%', padding:0, background:'rgba(0,229,160,.12)', color:C.g, border:'1px solid rgba(0,229,160,.28)' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,229,160,.25)';e.currentTarget.style.transform='scale(1.1)';e.currentTarget.style.boxShadow=`0 0 20px ${C.g}40`;}}
                          onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,229,160,.12)';e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none';}}>
                          <Check size={17}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab==='events' && (
          <div className="page">
            <SH title="Send Invitation" sub="Create and broadcast event invitations to members"/>
            <div className="card" style={{ background:'rgba(124,109,250,.04)', borderColor:'rgba(124,109,250,.14)' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  <Inp icon={Bell} type="text" placeholder="Event Title" value={msgForm.title} onChange={e=>setMsgForm(p=>({...p,title:e.target.value}))} style={{ flex:'2 1 200px' }}/>
                  <Inp icon={CalendarDays} type="date" value={msgForm.eventDate} onChange={e=>setMsgForm(p=>({...p,eventDate:e.target.value}))} style={{ flex:'1 1 160px' }}/>
                </div>
                <label style={{ border:'2px dashed rgba(124,109,250,.2)', borderRadius:16, padding:28, textAlign:'center', cursor:'pointer', display:'block', transition:'border-color .2s', position:'relative', background:'rgba(124,109,250,.02)' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(124,109,250,.45)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(124,109,250,.2)'}>
                  <input type="file" accept="image/*" style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} onChange={handleImg}/>
                  {msgForm.imageUrl ? <img src={msgForm.imageUrl} style={{ maxHeight:160, borderRadius:12, margin:'0 auto', display:'block' }} alt=""/> : <div style={{ color:C.muted }}><ImageIcon size={30} style={{ marginBottom:10, opacity:.3 }}/><p style={{ fontSize:13, fontWeight:600 }}>Upload image (optional)</p></div>}
                </label>
                <div style={{ position:'relative' }}>
                  <Tarea placeholder="Event description…" value={msgForm.description} onChange={e=>setMsgForm(p=>({...p,description:e.target.value}))} style={{ paddingBottom:50 }}/>
                  <button onClick={doAI} disabled={aiLoading} className="btn btn-sm" style={{ position:'absolute', bottom:10, right:10, background:'rgba(240,107,255,.12)', border:'1px solid rgba(240,107,255,.28)', color:C.pk, gap:5 }}>
                    {aiLoading ? <Loader size={11} className="spin"/> : <Sparkles size={11}/>}AI Draft
                  </button>
                </div>
                <div style={{ background:'rgba(255,255,255,.025)', borderRadius:16, padding:16, border:'1px solid rgba(255,255,255,.055)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.sub, textTransform:'uppercase', letterSpacing:'.07em' }}>Recipients</span>
                    <button onClick={selectAll} style={{ fontSize:11, color:C.i, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
                      {msgForm.recipients.length===members.length?'Deselect All':'Select All'}
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:7, maxHeight:160, overflowY:'auto' }}>
                    {members.map(u => { const sel=msgForm.recipients.includes(u.id); return (
                      <button key={u.id} onClick={()=>toggleRecip(u.id)} style={{ cursor:'pointer', padding:'8px 11px', borderRadius:10, fontSize:12, display:'flex', gap:7, alignItems:'center', background:sel?'rgba(124,109,250,.12)':'rgba(255,255,255,.03)', border:sel?'1px solid rgba(124,109,250,.3)':'1px solid rgba(255,255,255,.06)', color:sel?'#a393fb':C.text, fontFamily:'var(--font)', width:'100%', fontWeight:sel?700:400, transition:'all .15s' }}>
                        {sel?<CheckSquare size={12}/>:<Square size={12}/>}{u.name}
                      </button>
                    ); })}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={()=>{ if(!msgForm.title||msgForm.recipients.length===0) return; sendMessage(msgForm); setMsgForm({title:'',description:'',recipients:[],imageUrl:'',eventDate:''}); }} style={{ gap:8 }}>
                  <Send size={15}/>Broadcast Invitation
                </button>
              </div>
            </div>
          </div>
        )}

        {tab==='chat' && (
          <div className="page">
            <SH title="Community Chat"/>
            <div className="glass" style={{ borderRadius:22, overflow:'hidden', display:'flex', height:580, border:'1px solid rgba(255,255,255,0.065)' }}>
              <div style={{ width:200, borderRight:'1px solid rgba(255,255,255,0.065)', padding:12, display:'flex', flexDirection:'column', gap:5, flexShrink:0, background:'rgba(0,0,0,0.3)' }}>
                <TabRail tabs={[{v:'public',label:'Group'},{v:'private',label:'DMs'}]} active={chatMode} onChange={v=>{setChatMode(v);setSelPriv(null);}} style={{ marginBottom:8 }}/>
                {chatMode==='private' && (privUsers.length===0 ? <p style={{ fontSize:12, color:C.muted, textAlign:'center', marginTop:16, padding:'0 6px' }}>No DMs yet</p> : privUsers.map(u => (
                  <button key={u.id} onClick={()=>setSelPriv(u)} style={{ padding:'9px 10px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:9, fontSize:12, background:selPriv?.id===u.id?'rgba(124,109,250,.15)':'transparent', border:selPriv?.id===u.id?'1px solid rgba(124,109,250,.28)':'1px solid transparent', color:selPriv?.id===u.id?'#a393fb':C.text, fontFamily:'var(--font)', width:'100%', textAlign:'left', fontWeight:selPriv?.id===u.id?700:400, transition:'all .18s' }}>
                    <Avatar name={u.name} size={24}/>{u.name}
                  </button>
                )))}
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.065)', display:'flex', alignItems:'center', gap:9, flexShrink:0, background:'rgba(0,0,0,0.2)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:C.g, boxShadow:`0 0 12px ${C.g}` }}/>
                  <span style={{ fontWeight:700, fontSize:13, color:C.text, fontFamily:"'Syne',sans-serif" }}>{chatMode==='public'?'Public Group':selPriv?selPriv.name:'Select a user'}</span>
                </div>
                <ChatPanel msgs={chatMode==='public'?pubChats:privChats} uid={appUser.id} onSend={doSendChat} ph={chatMode==='public'?'Message group…':`DM ${selPriv?.name||''}…`}/>
              </div>
            </div>
          </div>
        )}

        {tab==='settings' && (
          <div className="page">
            <SH title="Settings"/>
            <div style={{ maxWidth:560, display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card" style={{ background:'rgba(79,61,240,.04)', borderColor:'rgba(79,61,240,.15)' }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}><Smartphone size={13}/>UPI Configuration</p>
                <div style={{ display:'flex', gap:10 }}>
                  <Inp icon={AtSign} type="text" placeholder="your@upi" value={upiId} onChange={e=>setUpiId(e.target.value)}/>
                  <button className="btn btn-primary" onClick={saveUpiId} style={{ whiteSpace:'nowrap' }}>Save</button>
                </div>
              </div>
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>Grocery Payments</p>
                    <p style={{ fontSize:12, color:C.muted }}>Enable a separate grocery tracking category</p>
                  </div>
                  <Toggle on={isGroceryEnabled} onChange={toggleGrocery}/>
                </div>
              </div>
              <div className="card">
                <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}><UserPlus size={13}/>Add Member (Quick)</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  <Inp type="text" placeholder="Full Name" value={newMemForm.name} onChange={e=>setNewMemForm({...newMemForm,name:e.target.value})} style={{ flex:'2 1 140px' }}/>
                  <Inp type="date" value={newMemForm.birthday} onChange={e=>setNewMemForm({...newMemForm,birthday:e.target.value})} style={{ flex:'1 1 150px' }}/>
                  <Inp type="text" placeholder="Password" value={newMemForm.password} onChange={e=>setNewMemForm({...newMemForm,password:e.target.value})} style={{ flex:'1 1 110px' }}/>
                  <button className="btn btn-primary" onClick={handleCreateMember} style={{ gap:6 }}><Plus size={14}/>Add</button>
                </div>
                <button onClick={populateDefaults} style={{ marginTop:12, background:'none', border:'none', cursor:'pointer', fontSize:11, color:C.muted, textDecoration:'underline', fontFamily:'var(--font)' }}>Populate default members</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {addMemberOpen && (
        <Modal onClose={()=>setAddMemberOpen(false)} title="Add New Member">
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <Inp icon={User} type="text" placeholder="Full Name" value={newMemForm.name} onChange={e=>setNewMemForm({...newMemForm,name:e.target.value})} autoFocus/>
            <Inp icon={Cake} type="date" value={newMemForm.birthday} onChange={e=>setNewMemForm({...newMemForm,birthday:e.target.value})}/>
            <Inp icon={Key} type="text" placeholder="Password" value={newMemForm.password} onChange={e=>setNewMemForm({...newMemForm,password:e.target.value})}/>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              <button className="btn btn-ghost" onClick={()=>setAddMemberOpen(false)} style={{ flex:1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateMember} style={{ flex:2, gap:7 }}><UserPlus size={14}/>Add Member</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const MemberDash = ({ appUser, handleLogout, getMemberBalance, transactions, upiId, changePassword, messages, reportPayment, isGroceryEnabled, chatMessages, sendChat }) => {
  const [tab, setTab] = useState('home');
  const [wallet, setWallet] = useState('main');
  const [payOpen, setPayOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [reportAmt, setReportAmt] = useState('');
  const [newPass, setNewPass] = useState('');
  const [chatMode, setChatMode] = useState('public');

  const balance = getMemberBalance(appUser.id, wallet);
  const inCredit = balance < 0;
  const mainBal = getMemberBalance(appUser.id, 'main');
  const myTx = useMemo(() => transactions.filter(t=>t.userId===appUser.id&&(t.category||'main')===wallet), [transactions, appUser.id, wallet]);
  const totalPaid = useMemo(() => transactions.filter(t=>t.userId===appUser.id&&t.type==='payment'&&t.status==='approved').reduce((s,t)=>s+safeNum(t.amount),0), [transactions, appUser.id]);
  const myMsgs = useMemo(() => messages.filter(m=>m.recipients?.includes(appUser.id)), [messages, appUser.id]);
  const pubChats = useMemo(() => chatMessages.filter(m=>m.type==='public'), [chatMessages]);
  const privChats = useMemo(() => chatMessages.filter(m=>m.type==='private'&&(m.senderId===appUser.id||m.targetId===appUser.id)), [chatMessages, appUser.id]);
  const isBday = () => { if(!appUser.birthday) return false; const t=new Date(),d=new Date(appUser.birthday); return t.getDate()===d.getDate()&&t.getMonth()===d.getMonth(); };

  const handlePay = e => { e.preventDefault(); const v=parseFloat(payAmt); if(!v||v<=0) return; reportPayment(payAmt,wallet,true); window.location.href=`upi://pay?pa=${upiId}&pn=SmartManager&am=${v.toFixed(2)}&cu=INR`; setPayOpen(false); setPayAmt(''); };
  const handleReport = e => { e.preventDefault(); if(!reportAmt||parseFloat(reportAmt)<=0) return; reportPayment(reportAmt,wallet); setReportOpen(false); setReportAmt(''); };
  const handlePassChange = e => { e.preventDefault(); if(!newPass||newPass.length<4) return; changePassword(newPass); setPassOpen(false); setNewPass(''); };

  const walletAccent = inCredit ? C.g : wallet==='main' ? C.i : C.a;
  const walletGrad = inCredit ? 'linear-gradient(135deg,#063d2a,#065f46)' : wallet==='main' ? 'linear-gradient(135deg,#1a1560,#2d2b8a)' : 'linear-gradient(135deg,#431407,#7c2d12)';

  const TABS = [
    { v:'home',   label:'Home',    icon:<Activity size={13}/> },
    { v:'wallet', label:'Wallet',  icon:<CreditCard size={13}/> },
    { v:'chat',   label:'Chat',    icon:<MessageSquare size={13}/> },
    { v:'events', label:'Events',  icon:<Bell size={13}/>, badge:myMsgs.length||null },
  ];

  return (
    <div style={{ background:C.bg, minHeight:'100vh', backgroundImage:'radial-gradient(ellipse at 50% -20%,rgba(79,61,240,.08),transparent 55%)' }}>
      <div className="topnav">
        <div style={{ maxWidth:540, margin:'0 auto', padding:'0 20px' }}>
          <div style={{ height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <Avatar name={appUser.name} size={38}/>
              <div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14.5, color:C.text }}>{appUser.name}</p>
                <p style={{ fontSize:10.5, color:C.muted, fontFamily:'var(--mono)', marginTop:1 }}>@{appUser.username}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <button className="btn btn-ghost btn-icon" onClick={()=>setPassOpen(true)}><Key size={15}/></button>
              <button className="btn btn-ghost btn-icon" onClick={handleLogout}><LogOut size={15}/></button>
            </div>
          </div>
          <TabRail tabs={TABS} active={tab} onChange={setTab} style={{ marginBottom:12 }}/>
        </div>
      </div>

      <div style={{ maxWidth:540, margin:'0 auto', padding:'22px 20px 80px' }}>
        {tab==='home' && (
          <div className="page">
            {isBday() && (
              <div className="su" style={{ background:'linear-gradient(135deg,#d946ef,#ff8c42)', borderRadius:22, padding:'24px 28px', marginBottom:22, boxShadow:'0 0 50px rgba(217,70,239,0.35)', position:'relative', overflow:'hidden', textAlign:'center' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(45deg,transparent 30%,rgba(255,255,255,0.08) 50%,transparent 70%)', animation:'shimmer 2.5s infinite', backgroundSize:'200% 100%' }}/>
                <Cake size={44} style={{ marginBottom:10, color:'white' }}/>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:'white', letterSpacing:'-.02em' }}>Happy Birthday! 🎉</h2>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.85)', marginTop:6 }}>Wishing you a wonderful day, {appUser.name}!</p>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
              {[
                { label:'Main Due', val:Math.abs(mainBal), col:mainBal>0?C.r:C.g, bg:mainBal>0?'rgba(255,90,126,.08)':'rgba(0,229,160,.08)', br:mainBal>0?'rgba(255,90,126,.2)':'rgba(0,229,160,.2)', extra:mainBal>0?'owes':'credit' },
                { label:'Total Paid', val:totalPaid, col:C.g, bg:'rgba(0,229,160,.08)', br:'rgba(0,229,160,.2)', extra:'all time' },
              ].map((s,i) => (
                <div key={i} className={`stat fu d${i+1}`} style={{ background:s.bg, border:`1px solid ${s.br}` }}>
                  <p style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>{s.label}</p>
                  <p className="big" style={{ color:s.col, fontSize:24 }}>₹{s.val.toFixed(0)}</p>
                  <p style={{ fontSize:10, color:s.col, marginTop:6, fontWeight:600, opacity:.7 }}>{s.extra}</p>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:C.text, marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
              <History size={15} color={C.i}/>Recent Activity
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {transactions.filter(t=>t.userId===appUser.id).slice(0,6).map(tx => <TxRow key={tx.id} tx={tx}/>)}
              {transactions.filter(t=>t.userId===appUser.id).length===0 && <Empty icon={History} title="No transactions yet"/>}
            </div>
          </div>
        )}

        {tab==='wallet' && (
          <div className="page">
            <TabRail tabs={[{v:'main',label:'Main',icon:<Briefcase size={13}/>},{v:'grocery',label:'Grocery',icon:<ShoppingCart size={13}/>}]} active={wallet} onChange={setWallet} style={{ marginBottom:22 }}/>
            <div className="su" style={{ background:walletGrad, borderRadius:26, padding:30, marginBottom:22, position:'relative', overflow:'hidden', boxShadow:`0 0 50px ${walletAccent}18, 0 28px 56px rgba(0,0,0,0.5)`, border:`1px solid ${walletAccent}28` }}>
              <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:`${walletAccent}12`, filter:'blur(50px)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'24px 24px', pointerEvents:'none', borderRadius:'inherit' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:walletAccent, letterSpacing:'.12em', textTransform:'uppercase' }}>{inCredit?'✦ In Credit':'⚡ Amount Due'}</span>
                  <span className={inCredit?'tag t-green':'tag t-red'}>{wallet}</span>
                </div>
                <h1 style={{ fontSize:52, fontWeight:500, letterSpacing:'-.03em', color:'white', marginBottom:26, fontFamily:'var(--mono)', textShadow:`0 0 40px ${walletAccent}30` }}>
                  <AnimNum value={Math.abs(balance)}/>
                </h1>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {balance>0 && (wallet==='main'||isGroceryEnabled) && (
                    <button className="btn" onClick={()=>{setPayAmt(balance.toFixed(2));setPayOpen(true);}} style={{ width:'100%', padding:'15px', fontSize:15, gap:10, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', color:'white', backdropFilter:'blur(10px)', borderRadius:16, boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
                      <Smartphone size={18}/>Pay ₹{balance.toFixed(2)} via UPI
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={()=>setReportOpen(true)} style={{ width:'100%', fontSize:14, gap:8, backdropFilter:'blur(10px)', borderColor:'rgba(255,255,255,0.15)' }}>
                    <CreditCard size={15}/>Report Manual Payment
                  </button>
                  {inCredit && <div style={{ background:'rgba(0,229,160,.15)', border:'1px solid rgba(0,229,160,.35)', borderRadius:14, padding:'12px 18px', textAlign:'center', fontSize:14, fontWeight:700, color:C.g }}>✓ Credit: ₹{Math.abs(balance).toFixed(2)}</div>}
                </div>
              </div>
            </div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:C.text, marginBottom:14 }}>Transaction History</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {myTx.length>0 ? myTx.map(tx => <TxRow key={tx.id} tx={tx}/>) : <Empty icon={History} title={`No ${wallet} transactions`}/>}
            </div>
          </div>
        )}

        {tab==='chat' && (
          <div className="page" style={{ height:'calc(100vh - 180px)', display:'flex', flexDirection:'column' }}>
            <TabRail tabs={[{v:'public',label:'Group Chat'},{v:'private',label:'Admin DM'}]} active={chatMode} onChange={setChatMode} style={{ marginBottom:14 }}/>
            <div style={{ flex:1, overflow:'hidden', borderRadius:20, border:'1px solid rgba(255,255,255,0.065)', background:'rgba(0,0,0,0.3)' }}>
              <ChatPanel msgs={chatMode==='public'?pubChats:privChats} uid={appUser.id} onSend={t=>sendChat({text:t,type:chatMode,...(chatMode==='private'?{targetId:'admin'}:{})})} ph={chatMode==='public'?'Send to group…':'Message admin…'}/>
            </div>
          </div>
        )}

        {tab==='events' && (
          <div className="page">
            <SH title="Invitations" sub={`${myMsgs.length} event${myMsgs.length!==1?'s':''}`}/>
            {myMsgs.length>0 ? myMsgs.map(m => <InviteCard key={m.id} msg={m} onDiscuss={()=>{setTab('chat');setChatMode('public');}}/>) : <Empty icon={Bell} title="No invitations yet" sub="Event invitations will appear here"/>}
          </div>
        )}
      </div>

      {payOpen && (
        <Modal onClose={()=>setPayOpen(false)} title="Pay via UPI">
          <p style={{ fontSize:13, color:C.sub, marginBottom:18, lineHeight:1.6 }}>Opens your UPI app to complete the payment.</p>
          <form onSubmit={handlePay} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <input className="inp" type="number" step="0.01" placeholder="0.00" value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={{ fontSize:28, fontWeight:500, padding:'18px 20px', fontFamily:'var(--mono)', textAlign:'center' }} autoFocus/>
            <div style={{ display:'flex', gap:8 }}>
              {[100,200,500].map(v => <button key={v} type="button" className="btn btn-ghost btn-sm" onClick={()=>setPayAmt(v.toString())} style={{ flex:1 }}>₹{v}</button>)}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button type="button" className="btn btn-ghost" onClick={()=>setPayOpen(false)} style={{ flex:1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex:2, gap:8 }}><Smartphone size={15}/>Open UPI App</button>
            </div>
          </form>
          <button onClick={()=>{setPayOpen(false);setReportOpen(true);}} style={{ width:'100%', marginTop:14, background:'none', border:'none', cursor:'pointer', fontSize:11.5, color:C.muted, textDecoration:'underline', fontFamily:'var(--font)' }}>Paid differently? Submit manual report</button>
        </Modal>
      )}

      {reportOpen && (
        <Modal onClose={()=>setReportOpen(false)} title="Manual Payment Report">
          <p style={{ fontSize:13, color:C.sub, marginBottom:18 }}>Report a payment made outside the app. Requires admin approval.</p>
          <form onSubmit={handleReport} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <input className="inp" type="number" step="0.01" placeholder="0.00" value={reportAmt} onChange={e=>setReportAmt(e.target.value)} style={{ fontSize:28, fontWeight:500, padding:'18px 20px', fontFamily:'var(--mono)', textAlign:'center' }} autoFocus/>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button type="button" className="btn btn-ghost" onClick={()=>setReportOpen(false)} style={{ flex:1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex:2, gap:8 }}><Send size={15}/>Submit Report</button>
            </div>
          </form>
        </Modal>
      )}

      {passOpen && (
        <Modal onClose={()=>{setPassOpen(false);setNewPass('');}} title="Change Password">
          <p style={{ fontSize:13, color:C.sub, marginBottom:18, lineHeight:1.6 }}>Choose a strong new password for your account.</p>
          <form onSubmit={handlePassChange} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <PasswordInput value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password (min 4 chars)" showMeter autoFocus autoComplete="new-password"/>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button type="button" className="btn btn-ghost" onClick={()=>{setPassOpen(false);setNewPass('');}} style={{ flex:1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex:2, gap:8 }}><Key size={15}/>Update Password</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER DETAIL VIEW
// ══════════════════════════════════════════════════════════════════════════════
const MemberDetail = ({ users, selMember, transactions, appUser, txForm, setTxForm, addTx, setSelMember, setView, getMemberBalance, delTx, resetPassword }) => {
  const member = users.find(u=>u.id===selMember);
  const [cat, setCat] = useState('main');
  const [reminderModal, setReminderModal] = useState(false);
  const [reminder, setReminder] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetDone, setResetDone] = useState(false);

  if(!member) return null;

  const bal = getMemberBalance(member.id, cat);
  const inCredit = bal < 0;
  const filtTx = transactions.filter(t=>t.userId===member.id&&(t.category||'main')===cat);
  const totalTx = transactions.filter(t=>t.userId===member.id).length;

  const genReminder = async () => { setAiLoading(true); setReminderModal(true); const t=await callGemini(`WhatsApp payment reminder for ${member.name}: owes ₹${Math.abs(bal).toFixed(2)} in ${cat} dues. Friendly, concise, under 50 words, no hashtags.`); setReminder(t); setAiLoading(false); };

  const handleAdminResetPass = async e => {
    e.preventDefault(); setResetErr('');
    if(resetNewPass.length<4) return setResetErr('Password must be at least 4 characters.');
    if(resetNewPass!==resetConfirm) return setResetErr('Passwords do not match.');
    try { await resetPassword(member.id, resetNewPass); setResetDone(true); setResetNewPass(''); setResetConfirm(''); }
    catch { setResetErr('Failed to reset password. Try again.'); }
  };

  return (
    <div style={{ background:C.bg, minHeight:'100vh', backgroundImage:'radial-gradient(ellipse at 50% -10%,rgba(124,109,250,.07),transparent 50%)' }}>
      <div className="topnav">
        <div style={{ maxWidth:740, margin:'0 auto', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{setSelMember(null);setView('dashboard');}} style={{ gap:7 }}><ArrowLeft size={14}/>Back</button>
          {appUser.role==='admin' && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{setResetPassOpen(true);setResetDone(false);setResetErr('');}} className="btn btn-sm" style={{ gap:6, background:'rgba(124,109,250,.1)', border:'1px solid rgba(124,109,250,.28)', color:C.i }}>
                <Key size={11}/>Reset Password
              </button>
              {bal>0 && (
                <button onClick={genReminder} className="btn btn-sm" style={{ gap:6, background:'rgba(240,107,255,.1)', border:'1px solid rgba(240,107,255,.28)', color:C.pk }}>
                  {aiLoading?<Loader size={11} className="spin"/>:<Sparkles size={11}/>}AI Reminder
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:740, margin:'0 auto', padding:'24px 24px 80px' }}>
        <div className="card fu" style={{ marginBottom:22, background:'rgba(124,109,250,.04)', borderColor:'rgba(124,109,250,.15)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#4f3df0,#7c6dfa,#00d4ff)', boxShadow:'0 0 20px rgba(124,109,250,0.3)' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <Avatar name={member.name} size={58}/>
              <div>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:23, color:C.text, letterSpacing:'-.02em', marginBottom:5 }}>{member.name}</h2>
                <p style={{ color:C.muted, fontSize:13, fontFamily:'var(--mono)', marginBottom:8 }}>@{member.username}</p>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  <span className="tag t-iris"><Hash size={9}/>{totalTx} tx</span>
                  {member.birthday && <span className="tag t-cyan"><Cake size={9}/>{new Date(member.birthday).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>}
                </div>
              </div>
            </div>
          </div>

          <TabRail tabs={[{v:'main',label:'Main',icon:<Briefcase size={13}/>},{v:'grocery',label:'Grocery',icon:<ShoppingCart size={13}/>}]} active={cat} onChange={setCat} style={{ marginBottom:18 }}/>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', background:inCredit?'rgba(0,229,160,.06)':'rgba(255,90,126,.06)', borderRadius:18, border:`1px solid ${inCredit?'rgba(0,229,160,.25)':'rgba(255,90,126,.25)'}`, marginBottom:18 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Balance</p>
              <div style={{ fontFamily:'var(--mono)', fontSize:34, fontWeight:500, color:inCredit?C.g:C.r, letterSpacing:'-.02em' }}>
                <AnimNum value={Math.abs(bal)}/>
              </div>
            </div>
            <span className={inCredit?'tag t-green':'tag t-red'} style={{ fontSize:12, padding:'6px 14px' }}>{inCredit?'Credit':'Owes'}</span>
          </div>

          {appUser.role==='admin' && (
            <form onSubmit={e=>addTx(e,cat)} style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              <Inp type="number" step="0.01" placeholder="Amount" value={txForm.amount} onChange={e=>setTxForm(p=>({...p,amount:e.target.value}))} style={{ flex:'2 1 100px' }}/>
              <Inp type="text" placeholder="Description (optional)" value={txForm.description} onChange={e=>setTxForm(p=>({...p,description:e.target.value}))} style={{ flex:'3 1 160px' }}/>
              <Sel value={txForm.type} onChange={e=>setTxForm(p=>({...p,type:e.target.value}))} style={{ flex:'1 1 130px' }}>
                <option value="due">Add Due</option>
                <option value="payment">Add Payment</option>
              </Sel>
              <button type="submit" className="btn btn-primary" style={{ gap:6 }}><Plus size={14}/>Add</button>
            </form>
          )}
        </div>

        <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:C.text, marginBottom:14 }}>
          Transactions <span style={{ color:C.muted, fontWeight:500 }}>· {cat}</span>
        </h3>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {filtTx.length>0 ? filtTx.map(tx => <TxRow key={tx.id} tx={tx} onDelete={delTx} isAdmin={appUser.role==='admin'}/>) : <Empty icon={History} title={`No ${cat} transactions`}/>}
        </div>
      </div>

      {reminderModal && (
        <Modal onClose={()=>setReminderModal(false)} title="AI Reminder Draft">
          <p style={{ fontSize:12, color:C.muted, marginBottom:16 }}>Review and copy this reminder for WhatsApp</p>
          {aiLoading ? (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 0', color:C.pk }}><Loader size={16} className="spin"/><span style={{ fontSize:13 }}>Generating…</span></div>
          ) : (
            <>
              <Tarea value={reminder} onChange={e=>setReminder(e.target.value)} style={{ marginBottom:14, minHeight:110 }}/>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" onClick={()=>setReminderModal(false)} style={{ flex:1 }}>Close</button>
                <button className="btn btn-primary" onClick={()=>navigator.clipboard?.writeText(reminder)} style={{ flex:2, gap:7 }}><Check size={14}/>Copy to Clipboard</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {resetPassOpen && (
        <Modal onClose={()=>{setResetPassOpen(false);setResetDone(false);setResetErr('');setResetNewPass('');setResetConfirm('');}} title="Reset Member Password">
          {resetDone ? (
            <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,229,160,.12)', border:'2px solid rgba(0,229,160,.35)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:`0 0 28px ${C.g}30` }}>
                <CheckCircle size={28} style={{ color:C.g }}/>
              </div>
              <p style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:6, fontFamily:"'Syne',sans-serif" }}>Password Reset!</p>
              <p style={{ fontSize:13, color:C.sub, marginBottom:22, lineHeight:1.6 }}><strong style={{color:C.text}}>{member.name}</strong>'s password has been updated.</p>
              <button className="btn btn-primary" onClick={()=>{setResetPassOpen(false);setResetDone(false);}} style={{ width:'100%' }}>Done</button>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, padding:'12px 14px', background:'rgba(124,109,250,.06)', border:'1px solid rgba(124,109,250,.15)', borderRadius:14 }}>
                <Avatar name={member.name} size={38}/>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:C.text }}>{member.name}</p>
                  <p style={{ fontSize:11, color:C.muted, fontFamily:'var(--mono)' }}>@{member.username}</p>
                </div>
              </div>
              <AlertBanner msg={resetErr}/>
              <form onSubmit={handleAdminResetPass} style={{ display:'flex', flexDirection:'column', gap:13 }}>
                <PasswordInput value={resetNewPass} onChange={e=>setResetNewPass(e.target.value)} placeholder="New password (min 4 chars)" showMeter autoFocus autoComplete="new-password"/>
                <PasswordInput value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"/>
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button type="button" className="btn btn-ghost" onClick={()=>{setResetPassOpen(false);setResetErr('');}} style={{ flex:1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex:2, gap:8 }}><Key size={14}/>Reset Password</button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
const App = () => {
  injectCSS();

  const [firebaseUser, setFBUser]  = useState(null);
  const [appUser,      setAppUser] = useState(null);
  const [users,        setUsers]   = useState([]);
  const [transactions, setTx]      = useState([]);
  const [messages,     setMsgs]    = useState([]);
  const [chatMsgs,     setChats]   = useState([]);
  const [loading,      setLoading] = useState(true);
  const [error,        setError]   = useState(null);
  const [upiId,        setUpiId]   = useState('');
  const [groceryOn,    setGrocOn]  = useState(false);
  const [view,         setView]    = useState('auth');
  const [selMember,    setSel]     = useState(null);
  const [online,       setOnline]  = useState(navigator.onLine);
  const [loginError,   setLoginErr] = useState(null);
  const [loginForm,    setLoginF]  = useState({ username:'', password:'' });
  const [newMemForm,   setNewMem]  = useState({ name:'', password:'', birthday:'' });
  const [txForm,       setTxForm]  = useState({ amount:'', description:'', type:'due' });

  useEffect(() => {
    const up=()=>setOnline(true), dn=()=>setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', dn);
    const init = async () => {
      try {
        if(typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch(e) { setError(e); setLoading(false); }
    };
    init();
    const unsub = onAuthStateChanged(auth, u => { setFBUser(u); if(!u) setLoading(false); });
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); unsub(); };
  }, []);

  useEffect(() => {
    if(!firebaseUser) return;
    const subs = [
      onSnapshot(query(col(COL.USERS), orderBy('createdAt','asc')),  s => { setUsers(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }, e => { setLoading(false); setError(e); }),
      onSnapshot(query(col(COL.TX),    orderBy('date','desc')),      s => setTx(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(col(COL.MSGS),  orderBy('createdAt','desc')), s => setMsgs(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(query(col(COL.CHATS), orderBy('createdAt','asc')),  s => setChats(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(dRef(COL.SETTINGS,'config'), s => { if(s.exists()){ setUpiId(s.data().upiId||''); setGrocOn(s.data().isGroceryEnabled||false); } }),
    ];
    return () => subs.forEach(u=>u());
  }, [firebaseUser]);

  const handleLogin = useCallback((e, role) => {
    e.preventDefault(); setLoginErr(null);
    if(users.length===0) {
      addDoc(col(COL.USERS), { username:loginForm.username.trim().toLowerCase(), password:loginForm.password, name:'Administrator', role:'admin', createdAt:serverTimestamp() })
        .then(()=>{ setLoginF({username:'',password:''}); setLoginErr({ message:'Admin created! Sign in now.', type:'success' }); });
      return;
    }
    const inp = loginForm.username.trim().toLowerCase().replace(/\s+/g,'');
    const u = users.find(u => {
      const uname = (u.username||'').toLowerCase().replace(/\s+/g,'');
      const match = uname===inp && u.password===loginForm.password;
      return role==='admin' ? match&&u.role==='admin' : match;
    });
    if(u) { setAppUser(u); setView('dashboard'); setLoginF({username:'',password:''}); setLoginErr(null); }
    else setLoginErr({ message: role==='admin'?'Invalid admin credentials.':'Invalid username or password.' });
  }, [users, loginForm]);

  const handleRegister = useCallback((form, role, cb) => {
    const uname = toUsername(form.username);
    if(!uname) return cb({ ok:false, text:'Invalid username.' });
    if(users.some(u=>(u.username||'').toLowerCase()===uname)) return cb({ ok:false, text:'Username already taken.' });
    addDoc(col(COL.USERS), { username:uname, password:form.password, name:form.name.trim(), role:role==='admin'?'admin':'member', birthday:form.birthday||'', createdAt:serverTimestamp() })
      .then(() => cb({ ok:true, text:`Account created! Sign in as ${role}.` }))
      .catch(() => cb({ ok:false, text:'Failed to create account. Try again.' }));
  }, [users]);

  const createMember = useCallback((cb) => {
    if(!newMemForm.name||!newMemForm.password) return cb?.({ ok:false, text:'Name and password required.' });
    const uname = toUsername(newMemForm.name);
    if(users.some(u=>u.username===uname)) return cb?.({ ok:false, text:'Member already exists.' });
    addDoc(col(COL.USERS), { ...newMemForm, username:uname, role:'member', createdAt:serverTimestamp() })
      .then(()=>{ setNewMem({name:'',password:'',birthday:''}); cb?.({ ok:true, text:`${newMemForm.name} added!` }); })
      .catch(()=>cb?.({ ok:false, text:'Failed to add member.' }));
  }, [newMemForm, users]);

  const populateDefs = () => {
    ['Animesh Shit','Kartick Sau','Indranil Paul','Soumen Giri','Soumyadeep Masanta'].forEach(name => {
      if(!users.some(u=>u.name===name))
        addDoc(col(COL.USERS), { username:toUsername(name), password:'123', name, role:'member', createdAt:serverTimestamp() });
    });
  };

  const addTx = (e, cat) => {
    e.preventDefault();
    const amt = parseFloat(txForm.amount);
    if(!amt||isNaN(amt)||amt<=0) return;
    addDoc(col(COL.TX), { userId:selMember, amount:amt, description:txForm.description||(txForm.type==='due'?'Dues Added':'Payment Recorded'), type:txForm.type, category:cat, status:'approved', date:new Date().toISOString(), createdAt:serverTimestamp(), createdBy:appUser.username })
      .then(()=>setTxForm({amount:'',description:'',type:'due'}));
  };

  const reportPay = (amt, cat, auto=false) =>
    addDoc(col(COL.TX), { userId:appUser.id, amount:parseFloat(amt), description:auto?'UPI Payment':'Manual Report', type:'payment', category:cat, status:'pending', date:new Date().toISOString(), createdAt:serverTimestamp(), createdBy:appUser.username });

  const approve = (id, ok) => ok ? updateDoc(dRef(COL.TX,id),{status:'approved'}) : deleteDoc(dRef(COL.TX,id));
  const saveUpi = () => setDoc(dRef(COL.SETTINGS,'config'),{upiId,isGroceryEnabled:groceryOn},{merge:true});
  const toggleGroc = () => { const n=!groceryOn; setGrocOn(n); setDoc(dRef(COL.SETTINGS,'config'),{isGroceryEnabled:n},{merge:true}); };
  const getBal = useCallback((uid, cat) => transactions.filter(t=>t.userId===uid&&(t.category||'main')===cat&&t.status==='approved').reduce((s,t)=>t.type==='due'?s+safeNum(t.amount):s-safeNum(t.amount),0), [transactions]);
  const sendMsg = d => addDoc(col(COL.MSGS),{...d,createdAt:serverTimestamp(),sender:appUser.username});
  const sendChat = d => addDoc(col(COL.CHATS),{...d,senderId:appUser.id,senderName:appUser.name,createdAt:serverTimestamp()});
  const changePass = p => { if(!p) return; updateDoc(dRef(COL.USERS,appUser.id),{password:p}); };
  const resetPassword = (uid, p) => updateDoc(dRef(COL.USERS,uid),{password:p});
  const delTx = id => { if(window.confirm('Delete transaction?')) deleteDoc(dRef(COL.TX,id)); };
  const logout = () => { setAppUser(null); setView('auth'); setLoginErr(null); };

  const authError = loginError?.type==='success' ? null : loginError;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:"'Outfit', system-ui, sans-serif" }}>
      <ConnStatus online={online}/>
      {view==='auth' && (
        <AuthView
          users={users}
          loginForm={loginForm}
          setLoginForm={setLoginF}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          loadingState={loading}
          error={authError}
        />
      )}
      {view==='dashboard' && appUser?.role==='admin' && (
        <AdminDash
          users={users} handleLogout={logout} upiId={upiId} setUpiId={setUpiId}
          saveUpiId={saveUpi} newMemForm={newMemForm} setNewMemForm={setNewMem}
          createMember={createMember} populateDefaults={populateDefs}
          getMemberBalance={getBal} setSelMember={setSel} setView={setView}
          transactions={transactions} sendMessage={sendMsg} handleApproval={approve}
          isGroceryEnabled={groceryOn} toggleGrocery={toggleGroc}
          chatMessages={chatMsgs} sendChat={sendChat} appUser={appUser}
        />
      )}
      {view==='dashboard' && appUser?.role==='member' && (
        <MemberDash
          appUser={appUser} handleLogout={logout} getMemberBalance={getBal}
          transactions={transactions} upiId={upiId} changePassword={changePass}
          messages={messages} reportPayment={reportPay} isGroceryEnabled={groceryOn}
          chatMessages={chatMsgs} sendChat={sendChat}
        />
      )}
      {view==='member-detail' && (
        <MemberDetail
          users={users} selMember={selMember} transactions={transactions}
          appUser={appUser} txForm={txForm} setTxForm={setTxForm}
          addTx={addTx} setSelMember={setSel} setView={setView}
          getMemberBalance={getBal} delTx={delTx} resetPassword={resetPassword}
        />
      )}
    </div>
  );
};

export default App;
