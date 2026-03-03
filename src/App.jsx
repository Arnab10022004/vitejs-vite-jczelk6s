import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DollarSign, Plus, Minus, LogOut, ShieldCheck, User, Lock,
  ArrowLeft, Smartphone, CreditCard, UserPlus, History,
  X, Key, CheckSquare, Square, Send, Image as ImageIcon,
  Trash2, Clock, ShoppingCart, Briefcase, Bell,
  Cake, RefreshCw, AlertTriangle, Loader, Wifi, WifiOff,
  CheckCircle, MessageSquare, ChevronRight, Sparkles, Search,
  TrendingUp, TrendingDown, Eye, EyeOff, Activity, Zap,
  BarChart2, Users, Settings, Star, Grid, List
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, addDoc, query, onSnapshot, orderBy,
  serverTimestamp, doc, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';

// ─── Firebase ─────────────────────────────────────────────────────────────────
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
getAnalytics(fbApp);

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const GEMINI_KEY = "AIzaSyArZC6itvjovGkS6FDfZRruk3sH2c5_Prc";
const COL = { USERS: 'dues_app_users', TX: 'dues_app_transactions', SETTINGS: 'dues_app_settings', MSGS: 'dues_app_messages', CHATS: 'dues_app_chats' };

const col = (n) => collection(db, 'artifacts', APP_ID, 'public', 'data', n);
const dRef = (n, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', n, id);

const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmtDate = (v) => { if (!v) return 'N/A'; try { if (v.seconds) return new Date(v.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } };
const callGemini = async (p) => { try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] }) }); const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.'; } catch { return 'AI unavailable.'; } };
const compressImage = (file) => new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const W = 800; canvas.width = W; canvas.height = img.height * (W / img.width); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; });

// ─── Global Styles Injection ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #03040f;
    --surface: rgba(255,255,255,0.04);
    --surface-hover: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.08);
    --border-bright: rgba(255,255,255,0.15);
    --text: #f1f5f9;
    --muted: #64748b;
    --cyan: #22d3ee;
    --blue: #3b82f6;
    --violet: #8b5cf6;
    --fuchsia: #e879f9;
    --green: #34d399;
    --amber: #fbbf24;
    --red: #fb7185;
    --font: 'Outfit', 'Segoe UI', system-ui, sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  html, body, #root {
    min-height: 100vh; width: 100%;
    background: var(--bg) !important;
    color: var(--text) !important;
    font-family: var(--font) !important;
    -webkit-font-smoothing: antialiased;
    color-scheme: dark;
  }
  body { margin: 0 !important; display: block !important; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }

  ::selection { background: rgba(139,92,246,0.35); color: white; }

  button, input, select, textarea { font-family: var(--font) !important; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideRight { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes slideLeft { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); } 50% { box-shadow: 0 0 0 8px rgba(139,92,246,0); } }
  @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
  @keyframes orb-drift { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.95); } }
  @keyframes gradient-shift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  @keyframes count-up { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .animate-fadeUp { animation: fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-fadeIn { animation: fadeIn 0.25s ease both; }
  .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-slideRight { animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-slideLeft { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }
  .stagger-5 { animation-delay: 0.25s; }

  .glass {
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .glass-bright {
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.12);
  }

  .shimmer-bg {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }

  .gradient-text {
    background: linear-gradient(135deg, #22d3ee, #8b5cf6, #e879f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .gradient-text-warm {
    background: linear-gradient(135deg, #fbbf24, #fb7185, #e879f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .card-hover {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
  }
  .card-hover:hover {
    transform: translateY(-3px);
    border-color: rgba(139,92,246,0.3) !important;
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.15);
  }
  .card-hover:active { transform: translateY(-1px) scale(0.99); }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    font-weight: 700;
    border: none;
    border-radius: 14px;
    padding: 13px 24px;
    cursor: pointer;
    font-size: 14px;
    letter-spacing: 0.01em;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 20px rgba(99,102,241,0.3);
    position: relative;
    overflow: hidden;
  }
  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.45); }
  .btn-primary:hover::after { opacity: 1; }
  .btn-primary:active { transform: translateY(0) scale(0.98); }
  .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

  .btn-ghost {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text);
    border-radius: 12px;
    padding: 10px 16px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }
  .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
  .btn-ghost:active { transform: translateY(0); }

  .btn-danger {
    background: rgba(251,113,133,0.12);
    border: 1px solid rgba(251,113,133,0.25);
    color: #fb7185;
    border-radius: 10px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s;
  }
  .btn-danger:hover { background: rgba(251,113,133,0.2); transform: translateY(-1px); }

  .input-field {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    color: var(--text);
    padding: 13px 16px;
    width: 100%;
    outline: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }
  .input-field:focus {
    border-color: rgba(139,92,246,0.5);
    background: rgba(139,92,246,0.06);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.1), 0 0 20px rgba(139,92,246,0.08);
  }
  .input-field::placeholder { color: rgba(100,116,139,0.8); font-weight: 400; }

  .tab-active {
    background: rgba(139,92,246,0.15) !important;
    border-color: rgba(139,92,246,0.3) !important;
    color: #a78bfa !important;
    box-shadow: 0 0 16px rgba(139,92,246,0.1);
  }

  .balance-positive { color: #fb7185; }
  .balance-negative { color: #34d399; }

  .tag { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .tag-cyan { background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.25); color: #22d3ee; }
  .tag-amber { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; }
  .tag-green { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25); color: #34d399; }
  .tag-red { background: rgba(251,113,133,0.1); border: 1px solid rgba(251,113,133,0.25); color: #fb7185; }
  .tag-violet { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); color: #a78bfa; }

  .noise-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E");
    opacity: 0.4;
    pointer-events: none;
    border-radius: inherit;
  }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 200;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }
  .modal-content {
    background: #0d1117;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 28px;
    padding: 32px;
    width: 100%; max-width: 440px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
    animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }

  .stat-card {
    border-radius: 20px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .stat-card:hover { transform: translateY(-3px); }

  .progress-bar {
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .glow-cyan { box-shadow: 0 0 30px rgba(34,211,238,0.2); }
  .glow-violet { box-shadow: 0 0 30px rgba(139,92,246,0.2); }
  .glow-green { box-shadow: 0 0 30px rgba(52,211,153,0.2); }
  .glow-red { box-shadow: 0 0 30px rgba(251,113,133,0.2); }

  .page-enter { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

  .chat-bubble-own {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border-radius: 18px 18px 4px 18px;
    padding: 10px 15px;
    max-width: 78%;
    font-size: 13px;
    line-height: 1.5;
  }
  .chat-bubble-other {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text);
    border-radius: 18px 18px 18px 4px;
    padding: 10px 15px;
    max-width: 78%;
    font-size: 13px;
    line-height: 1.5;
  }

  .member-card-grid {
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    cursor: pointer;
    position: relative;
  }
  .member-card-grid::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(139,92,246,0.08), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .member-card-grid:hover { transform: translateY(-4px); border-color: rgba(139,92,246,0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.1); }
  .member-card-grid:hover::before { opacity: 1; }
  .member-card-grid:active { transform: translateY(-2px) scale(0.99); }
`;

// ─── Inject styles ────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('sm-global')) return;
  const s = document.createElement('style');
  s.id = 'sm-global';
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#03040f', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  text: '#f1f5f9', muted: '#64748b',
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6', fuchsia: '#e879f9',
  green: '#34d399', amber: '#fbbf24', red: '#fb7185',
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #22d3ee, #6366f1)',
  'linear-gradient(135deg, #e879f9, #8b5cf6)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #fbbf24, #fb7185)',
];
const Avatar = ({ name = '?', size = 40, style: ext }) => {
  const idx = name.charCodeAt(0) % GRADIENTS.length;
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: GRADIENTS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: Math.round(size * 0.38), flexShrink: 0, userSelect: 'none', boxShadow: `0 4px 12px rgba(99,102,241,0.3)`, ...ext }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// ─── Animated Number ──────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, prefix = '₹' }) => {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = displayed;
    const end = value;
    if (start === end) return;
    const duration = 600;
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{prefix}{Math.abs(displayed).toFixed(2)}</span>;
};

// ─── Input Components ─────────────────────────────────────────────────────────
const Input = React.forwardRef(({ icon: Icon, rightIcon, style: ext, className = '', ...props }, ref) => (
  <div style={{ position: 'relative', width: '100%' }}>
    {Icon && <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />}
    <input ref={ref} className={`input-field ${className}`} style={{ paddingLeft: Icon ? 42 : 16, paddingRight: rightIcon ? 42 : 16, ...ext }} {...props} />
    {rightIcon}
  </div>
));
const Textarea = ({ style: ext, ...props }) => <textarea className="input-field" style={{ minHeight: 85, resize: 'vertical', ...ext }} {...props} />;
const Select = ({ style: ext, children, ...props }) => <select className="input-field" style={{ cursor: 'pointer', appearance: 'none', ...ext }} {...props}>{children}</select>;

// ─── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ onClose, title, children, maxWidth = 440 }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{title}</h3>
        <button className="btn-ghost" onClick={onClose} style={{ padding: 8, display: 'flex' }}><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
const TabBar = ({ tabs, active, onChange, style: ext }) => (
  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 5, gap: 4, ...ext }}>
    {tabs.map(t => (
      <button key={t.v} onClick={() => onChange(t.v)}
        style={{ flex: 1, padding: '9px 10px', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: '1px solid transparent', color: active === t.v ? '#a78bfa' : C.muted, background: 'transparent', transition: 'all 0.2s', letterSpacing: '0.01em', whiteSpace: 'nowrap', position: 'relative' }}
        className={active === t.v ? 'tab-active' : ''}>
        {t.icon && <span style={{ display: 'flex' }}>{t.icon}</span>}
        {t.label}
        {t.badge ? <span style={{ background: C.red, color: 'white', borderRadius: 99, width: 16, height: 16, fontSize: 9, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span> : null}
      </button>
    ))}
  </div>
);

// ─── Connection Status ────────────────────────────────────────────────────────
const ConnectionStatus = ({ isOnline }) => (
  <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999, padding: '8px 16px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)', background: isOnline ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.9)', border: `1px solid ${isOnline ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.5)'}`, color: isOnline ? C.green : 'white', transform: isOnline ? 'translateY(100px)' : 'translateY(0)', opacity: isOnline ? 0 : 1, pointerEvents: 'none' }}>
    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}{isOnline ? 'Online' : 'Offline'}
  </div>
);

// ─── Transaction Item ─────────────────────────────────────────────────────────
const TxItem = React.memo(({ tx, onDelete, isAdmin }) => {
  const isPending = tx.status === 'pending';
  const isPay = tx.type === 'payment';
  const amt = safeNum(tx.amount);
  const accent = isPending ? C.amber : isPay ? C.green : C.red;
  return (
    <div className="animate-fadeUp" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${accent}`, borderRadius: 16, padding: '14px 16px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}18`, color: accent, fontSize: 14 }}>
          {isPending ? <Clock size={15} /> : isPay ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{String(tx.description || 'Transaction')}</span>
            {isPending && <span className="tag tag-amber">Pending</span>}
            <span className={(tx.category || 'main') === 'grocery' ? 'tag tag-amber' : 'tag tag-cyan'}>{tx.category || 'main'}</span>
          </div>
          <p style={{ fontSize: 11, color: C.muted, fontFamily: 'var(--mono)' }}>{fmtDate(tx.date)}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: isPending ? C.muted : isPay ? C.green : C.red, fontFamily: 'var(--mono)' }}>{isPay ? '+' : '−'}₹{amt.toFixed(2)}</span>
        {isAdmin && onDelete && <button className="btn-danger" onClick={e => { e.stopPropagation(); onDelete(tx.id); }} style={{ padding: '6px 10px', borderRadius: 9 }}><Trash2 size={13} /></button>}
      </div>
    </div>
  );
});

// ─── Invitation Card ──────────────────────────────────────────────────────────
const InvitationCard = ({ msg, onDiscuss }) => (
  <div className="glass animate-fadeUp" style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 16 }}>
    {msg.imageUrl && <img src={msg.imageUrl} alt="Event" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />}
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: msg.imageUrl ? 'transparent' : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))' }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 5 }}>{String(msg.title)}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}><Clock size={11} /><span>{fmtDate(msg.eventDate)}</span></div>
    </div>
    <div style={{ padding: '14px 18px' }}>
      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 14 }}>{String(msg.description)}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, color: C.muted }}>Posted {msg.createdAt ? fmtDate(new Date(msg.createdAt.seconds * 1000)) : 'recently'}</span>
        {onDiscuss && <button className="btn-ghost" onClick={onDiscuss} style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10 }}><MessageSquare size={12} />Discuss</button>}
      </div>
    </div>
  </div>
);

// ─── Chat ─────────────────────────────────────────────────────────────────────
const ChatBubble = ({ msg, isOwn, senderName }) => {
  const time = msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
  return (
    <div className="animate-fadeUp" style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isOwn && <span style={{ fontSize: 10, fontWeight: 700, color: C.violet, marginBottom: 4, marginLeft: 4 }}>{String(senderName)}</span>}
      <div className={isOwn ? 'chat-bubble-own' : 'chat-bubble-other'}>{String(msg.text)}</div>
      <span style={{ fontSize: 10, color: C.muted, marginTop: 4, fontFamily: 'var(--mono)' }}>{time}</span>
    </div>
  );
};

const ChatView = ({ messages = [], currentUserId, onSend, placeholder }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  const handleSend = (e) => { e.preventDefault(); if (!text.trim()) return; onSend(text); setText(''); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '55vh', background: 'rgba(0,0,0,0.3)', borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 ? <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 8 }}><MessageSquare size={30} style={{ opacity: 0.2 }} /><p style={{ fontSize: 13 }}>Start the conversation</p></div> : messages.map(m => <ChatBubble key={m.id} msg={m} isOwn={m.senderId === currentUserId} senderName={m.senderName} />)}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <input className="input-field" type="text" style={{ borderRadius: 99, padding: '10px 18px', flex: 1 }} placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', cursor: 'pointer', color: 'white', boxShadow: '0 4px 15px rgba(99,102,241,0.4)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Send size={15} /></button>
      </form>
    </div>
  );
};

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
const LoginView = ({ users, loginForm, setLoginForm, handleLogin, isSubmitting, loadingState, error }) => {
  const [role, setRole] = useState('member'); // 'member' | 'admin'
  const [showPass, setShowPass] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const particleRef = useRef(null);

  useEffect(() => { if (loadingState) { const t = setTimeout(() => setShowRetry(true), 8000); return () => clearTimeout(t); } }, [loadingState]);

  // Animated canvas background
  useEffect(() => {
    const canvas = particleRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((a, i) => particles.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 80)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }));
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const adminHint = users.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden', backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%)' }}>
      {/* Particle canvas */}
      <canvas ref={particleRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Decorative orbs */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', top: '-20%', left: '-15%', animation: 'orb-drift 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,121,249,0.05) 0%, transparent 70%)', bottom: '-10%', right: '-5%', animation: 'orb-drift 15s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div className="animate-fadeUp" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #e879f9)', backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 0 40px rgba(99,102,241,0.35), 0 0 80px rgba(99,102,241,0.15)', animation2: 'pulse-ring 2s ease infinite' }}>
            <DollarSign size={36} style={{ color: 'white', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1 }}>
            <span className="gradient-text">SMART</span>{' '}
            <span style={{ color: C.text }}>MANAGER</span>
          </h1>
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Dues & finances, simplified</p>
        </div>

        {/* Role Selector */}
        <div className="animate-fadeUp stagger-1" style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[{ v: 'member', icon: <User size={15} />, label: 'Member' }, { v: 'admin', icon: <ShieldCheck size={15} />, label: 'Admin' }].map(r => (
            <button key={r.v} onClick={() => setRole(r.v)}
              style={{ flex: 1, padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', border: role === r.v ? '1px solid rgba(139,92,246,0.4)' : `1px solid ${C.border}`, background: role === r.v ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))' : 'rgba(255,255,255,0.03)', color: role === r.v ? '#a78bfa' : C.muted, boxShadow: role === r.v ? '0 0 20px rgba(139,92,246,0.1)' : 'none' }}>
              {r.icon}{r.label}
              {role === r.v && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 8px rgba(167,139,250,0.8)' }} />}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="animate-fadeUp stagger-2" style={{ background: 'rgba(13,17,23,0.95)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 28, padding: 32, boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: role === 'admin' ? 'linear-gradient(90deg, #fbbf24, #fb7185, #e879f9)' : 'linear-gradient(90deg, #22d3ee, #6366f1, #8b5cf6)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: role === 'admin' ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,113,133,0.15))' : 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(99,102,241,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: role === 'admin' ? C.amber : C.cyan }}>
              {role === 'admin' ? <ShieldCheck size={18} /> : <User size={18} />}
            </div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{adminHint ? 'Create Admin Account' : role === 'admin' ? 'Admin Sign In' : 'Member Sign In'}</h2>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{adminHint ? 'First-time setup' : 'Enter your credentials'}</p>
            </div>
          </div>

          {error && (
            <div className="animate-scaleIn" style={{ marginBottom: 20, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={15} style={{ color: C.red, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{error.message || String(error)}</span>
            </div>
          )}

          {loadingState ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <Loader size={32} style={{ color: C.violet, animation: 'spin 1s linear infinite' }} />
                <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.2)', animation: 'pulse-ring 2s ease infinite' }} />
              </div>
              {showRetry && <button className="btn-ghost" onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}><RefreshCw size={13} />Reload App</button>}
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); handleLogin(e, role); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input icon={User} type="text" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} disabled={isSubmitting} autoCapitalize="none" autoComplete="username" />
              <Input icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} disabled={isSubmitting}
                rightIcon={<button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex' }}>{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: 15, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: role === 'admin' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: role === 'admin' ? '0 4px 20px rgba(245,158,11,0.3)' : '0 4px 20px rgba(99,102,241,0.3)' }}>
                {isSubmitting ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><span>Sign In as {role === 'admin' ? 'Admin' : 'Member'}</span><ChevronRight size={18} /></>}
              </button>
            </form>
          )}
        </div>

        <p className="animate-fadeUp stagger-4" style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 20, lineHeight: 1.6 }}>
          Secured by Firebase Authentication<br />Smart Manager © 2025
        </p>
      </div>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = ({ users, handleLogout, upiId, setUpiId, saveUpiId, newMemberForm, setNewMemberForm, createMember, populateDefaults, getMemberBalance, setSelectedMemberId, setView, transactions, sendMessage, isSubmitting, handleApproval, isGroceryEnabled, toggleGroceryPayment, chatMessages, sendChatMessage, appUser }) => {
  const [tab, setTab] = useState('overview');
  const [msgForm, setMsgForm] = useState({ title: '', description: '', recipients: [], imageUrl: '', eventDate: '' });
  const [chatMode, setChatMode] = useState('public');
  const [selPriv, setSelPriv] = useState(null);
  const [genAI, setGenAI] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const pending = useMemo(() => transactions.filter(t => t.status === 'pending'), [transactions]);
  const pubChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  const totalDue = useMemo(() => users.filter(u => u.role !== 'admin').reduce((s, m) => s + Math.max(0, safeNum(getMemberBalance(m.id, 'main'))), 0), [users, getMemberBalance]);
  const totalCollected = useMemo(() => transactions.filter(t => t.type === 'payment' && t.status === 'approved').reduce((s, t) => s + safeNum(t.amount), 0), [transactions]);
  const members = useMemo(() => users.filter(u => u.role !== 'admin').filter(m => !searchQ || m.name.toLowerCase().includes(searchQ.toLowerCase())), [users, searchQ]);

  const privUsers = useMemo(() => { const ids = new Set(); chatMessages.forEach(m => { if (m.type === 'private') { if (m.targetId === 'admin' || m.targetId === appUser.id) ids.add(m.senderId); if (m.senderId === appUser.id) ids.add(m.targetId); } }); return Array.from(ids).map(id => users.find(u => u.id === id)).filter(Boolean); }, [chatMessages, appUser, users]);
  const privChats = useMemo(() => { if (!selPriv) return []; return chatMessages.filter(m => m.type === 'private' && ((m.senderId === selPriv.id && (m.targetId === 'admin' || m.targetId === appUser.id)) || (m.senderId === appUser.id && m.targetId === selPriv.id))); }, [chatMessages, selPriv, appUser]);

  const sendChat = (t) => { if (chatMode === 'public') sendChatMessage({ text: t, type: 'public' }); else if (selPriv) sendChatMessage({ text: t, type: 'private', targetId: selPriv.id }); };
  const handleImg = async (e) => { const f = e.target.files[0]; if (!f || f.size > 5e6) return; try { setMsgForm(p => ({ ...p, imageUrl: await compressImage(f) })); } catch { } };
  const doGenAI = async () => { if (!msgForm.title) return; setGenAI(true); setMsgForm(p => ({ ...p, description: await callGemini(`Write a short, exciting event invitation for: "${msgForm.title}". Under 80 words, friendly tone.`) })); setGenAI(false); };
  const toggleRecip = id => setMsgForm(p => ({ ...p, recipients: p.recipients.includes(id) ? p.recipients.filter(x => x !== id) : [...p.recipients, id] }));

  const STAT_CARDS = [
    { label: 'Total Members', value: users.filter(u => u.role !== 'admin').length, icon: <Users size={18} />, color: C.cyan, bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.2)' },
    { label: 'Total Due', value: `₹${totalDue.toFixed(0)}`, icon: <TrendingDown size={18} />, color: C.red, bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.2)' },
    { label: 'Collected', value: `₹${totalCollected.toFixed(0)}`, icon: <TrendingUp size={18} />, color: C.green, bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
    { label: 'Pending', value: pending.length, icon: <Clock size={18} />, color: C.amber, bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  ];

  const TABS = [
    { v: 'overview', label: 'Overview', icon: <BarChart2 size={13} /> },
    { v: 'members', label: 'Members', icon: <Users size={13} /> },
    { v: 'approvals', label: 'Approvals', icon: <CheckCircle size={13} />, badge: pending.length || null },
    { v: 'events', label: 'Events', icon: <Bell size={13} /> },
    { v: 'messages', label: 'Chat', icon: <MessageSquare size={13} /> },
    { v: 'settings', label: 'Settings', icon: <Settings size={13} /> },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', backgroundImage: 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)' }}>
      {/* Top Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${C.border}`, background: 'rgba(3,4,15,0.85)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>
              <DollarSign size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em' }}>Smart Manager</h1>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Console</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
              <ShieldCheck size={13} style={{ color: C.amber }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Admin</span>
            </div>
            <button className="btn-ghost" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><LogOut size={14} />Logout</button>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 12px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
            {TABS.map(t => (
              <button key={t.v} onClick={() => setTab(t.v)}
                style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, border: tab === t.v ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent', background: tab === t.v ? 'rgba(139,92,246,0.15)' : 'transparent', color: tab === t.v ? '#a78bfa' : C.muted, transition: 'all 0.2s', position: 'relative' }}>
                {t.icon}{t.label}
                {t.badge ? <span style={{ background: C.red, color: 'white', borderRadius: 99, width: 15, height: 15, fontSize: 9, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>{t.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="page-enter">
            <h2 style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 6, letterSpacing: '-0.03em' }}>Good to see you, <span className="gradient-text">Admin</span> ✦</h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Here's your financial snapshot</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 32 }}>
              {STAT_CARDS.map((s, i) => (
                <div key={i} className={`stat-card animate-fadeUp stagger-${i + 1}`} style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: 'var(--mono)', letterSpacing: '-0.02em', animation: 'count-up 0.5s ease both' }}>{s.value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16 }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.slice(0, 8).map(tx => <TxItem key={tx.id} tx={tx} isAdmin={true} onDelete={() => { }} />)}
              {transactions.length === 0 && <div style={{ textAlign: 'center', padding: 44, color: C.muted, border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: 16, fontSize: 13 }}>No transactions yet</div>}
            </div>
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text }}>Members</h2>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{members.length} members</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                  <input className="input-field" placeholder="Search..." style={{ paddingLeft: 36, padding: '9px 14px 9px 34px', width: 180, borderRadius: 12, fontSize: 13 }} value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                </div>
                <button className="btn-ghost" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} style={{ padding: 9, display: 'flex' }}>{viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}</button>
              </div>
            </div>

            <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {members.map((m, i) => {
                const main = safeNum(getMemberBalance(m.id, 'main'));
                const groc = safeNum(getMemberBalance(m.id, 'grocery'));
                return (
                  <div key={m.id} className={`member-card-grid animate-fadeUp stagger-${Math.min(i + 1, 5)}`} onClick={() => { setSelectedMemberId(m.id); setView('member-detail'); }}>
                    <div style={{ padding: '18px 18px 14px', position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <Avatar name={m.name} size={42} />
                          <div>
                            <p style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 2 }}>{m.name}</p>
                            <p style={{ fontSize: 11, color: C.muted, fontFamily: 'var(--mono)' }}>@{m.username}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: C.muted, marginTop: 4 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(34,211,238,0.06)', borderRadius: 12, border: '1px solid rgba(34,211,238,0.12)' }}>
                          <p style={{ fontSize: 9, color: C.cyan, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>MAIN</p>
                          <p style={{ fontWeight: 900, fontSize: 15, color: main > 0 ? C.red : C.green, fontFamily: 'var(--mono)' }}>₹{main.toFixed(0)}</p>
                        </div>
                        <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(251,191,36,0.06)', borderRadius: 12, border: '1px solid rgba(251,191,36,0.12)' }}>
                          <p style={{ fontSize: 9, color: C.amber, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>GROCERY</p>
                          <p style={{ fontWeight: 900, fontSize: 15, color: groc > 0 ? C.red : C.green, fontFamily: 'var(--mono)' }}>₹{groc.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Member */}
            <div className="glass" style={{ borderRadius: 20, padding: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={13} />Add New Member</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Input type="text" placeholder="Full Name" value={newMemberForm.name} onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })} style={{ flex: '2 1 140px' }} />
                <Input type="date" value={newMemberForm.birthday} onChange={e => setNewMemberForm({ ...newMemberForm, birthday: e.target.value })} style={{ flex: '1 1 150px' }} />
                <Input type="text" placeholder="Password" value={newMemberForm.password} onChange={e => setNewMemberForm({ ...newMemberForm, password: e.target.value })} style={{ flex: '1 1 110px' }} />
                <button className="btn-primary" onClick={createMember} disabled={isSubmitting} style={{ padding: '13px 24px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}><Plus size={14} />Add Member</button>
              </div>
              <button onClick={populateDefaults} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, textDecoration: 'underline', fontFamily: 'var(--font)' }}>+ Populate default members</button>
            </div>
          </div>
        )}

        {/* Approvals */}
        {tab === 'approvals' && (
          <div className="page-enter">
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text, marginBottom: 6 }}>Pending Approvals</h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>{pending.length} awaiting review</p>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.muted, border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: 22 }}>
                <CheckCircle size={40} style={{ marginBottom: 14, opacity: 0.2 }} />
                <p style={{ fontSize: 15, fontWeight: 700 }}>All clear!</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>No pending approvals</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map((tx, i) => {
                  const u = users.find(x => x.id === tx.userId);
                  return (
                    <div key={tx.id} className={`animate-fadeUp stagger-${Math.min(i + 1, 5)}`} style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', borderLeft: `3px solid ${C.amber}`, borderRadius: 18, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={u?.name || '?'} size={40} />
                        <div>
                          <p style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{u?.name || 'Unknown'}</p>
                          <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{tx.category} · {fmtDate(tx.date)}</p>
                          <p style={{ fontSize: 11, color: C.muted }}>{tx.description}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontWeight: 900, color: C.green, fontSize: 18, fontFamily: 'var(--mono)' }}>₹{safeNum(tx.amount).toFixed(2)}</span>
                        <button onClick={() => handleApproval(tx.id, false)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.3)', cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.25)'; e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}><X size={16} /></button>
                        <button onClick={() => handleApproval(tx.id, true)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', cursor: 'pointer', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.25)'; e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}><CheckCircle size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {tab === 'events' && (
          <div className="page-enter">
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text, marginBottom: 6 }}>Send Invitation</h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>Create and broadcast event invitations</p>
            <div className="glass" style={{ borderRadius: 24, padding: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <Input type="text" placeholder="Event Title" value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} style={{ flex: '2 1 200px' }} />
                  <Input type="date" value={msgForm.eventDate} onChange={e => setMsgForm({ ...msgForm, eventDate: e.target.value })} style={{ flex: '1 1 160px' }} />
                </div>

                <label style={{ border: '2px dashed rgba(139,92,246,0.2)', borderRadius: 16, padding: 28, textAlign: 'center', cursor: 'pointer', position: 'relative', display: 'block', transition: 'all 0.2s', background: 'rgba(139,92,246,0.03)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'}>
                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} onChange={handleImg} />
                  {msgForm.imageUrl ? <img src={msgForm.imageUrl} style={{ maxHeight: 140, borderRadius: 10, margin: '0 auto', display: 'block' }} alt="preview" /> : <div style={{ color: C.muted }}><ImageIcon size={28} style={{ marginBottom: 8, opacity: 0.4 }} /><p style={{ fontSize: 13, fontWeight: 600 }}>Upload event image</p><p style={{ fontSize: 11, marginTop: 4 }}>Max 5MB</p></div>}
                </label>

                <div style={{ position: 'relative' }}>
                  <Textarea placeholder="Event description..." value={msgForm.description} onChange={e => setMsgForm({ ...msgForm, description: e.target.value })} style={{ paddingBottom: 48 }} />
                  <button onClick={doGenAI} disabled={genAI} style={{ position: 'absolute', bottom: 10, right: 10, background: 'linear-gradient(135deg, rgba(232,121,249,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(232,121,249,0.3)', color: C.fuchsia, borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s', fontFamily: 'var(--font)' }}>
                    {genAI ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}AI Write
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recipients</span>
                    <button onClick={() => { const ids = users.filter(u => u.role !== 'admin').map(u => u.id); setMsgForm(p => ({ ...p, recipients: p.recipients.length === ids.length ? [] : ids })); }} style={{ fontSize: 11, color: C.violet, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      {msgForm.recipients.length === users.filter(u => u.role !== 'admin').length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 7, maxHeight: 150, overflowY: 'auto' }}>
                    {users.filter(u => u.role !== 'admin').map(u => { const sel = msgForm.recipients.includes(u.id); return (<button key={u.id} onClick={() => toggleRecip(u.id)} style={{ cursor: 'pointer', padding: '8px 11px', borderRadius: 10, fontSize: 12, display: 'flex', gap: 7, alignItems: 'center', background: sel ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)', border: sel ? '1px solid rgba(139,92,246,0.3)' : `1px solid ${C.border}`, color: sel ? '#a78bfa' : C.text, fontFamily: 'var(--font)', width: '100%', fontWeight: sel ? 700 : 400, transition: 'all 0.15s' }}>{sel ? <CheckSquare size={12} /> : <Square size={12} />}{u.name}</button>); })}
                  </div>
                </div>

                <button className="btn-primary" onClick={() => { if (!msgForm.title || msgForm.recipients.length === 0) return alert('Fill title and recipients'); sendMessage(msgForm); setMsgForm({ title: '', description: '', recipients: [], imageUrl: '', eventDate: '' }); alert('Sent!'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                  <Send size={15} />Send Invitation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages / Chat */}
        {tab === 'messages' && (
          <div className="page-enter">
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text, marginBottom: 24 }}>Community Chat</h2>
            <div className="glass" style={{ borderRadius: 24, overflow: 'hidden', display: 'flex', height: 580 }}>
              {/* Sidebar */}
              <div style={{ width: 200, borderRight: `1px solid ${C.border}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <TabBar tabs={[{ v: 'public', label: 'Public' }, { v: 'private', label: 'DMs' }]} active={chatMode} onChange={v => { setChatMode(v); setSelPriv(null); }} style={{ marginBottom: 8 }} />
                {chatMode === 'private' && (privUsers.length === 0 ? <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16, padding: '0 8px' }}>No private chats</p> : privUsers.map(u => (
                  <button key={u.id} onClick={() => setSelPriv(u)} style={{ padding: '9px 10px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, background: selPriv?.id === u.id ? 'rgba(139,92,246,0.15)' : 'transparent', color: selPriv?.id === u.id ? '#a78bfa' : C.text, border: selPriv?.id === u.id ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent', fontFamily: 'var(--font)', width: '100%', textAlign: 'left', fontWeight: selPriv?.id === u.id ? 700 : 400, transition: 'all 0.18s' }}>
                    <Avatar name={u.name} size={24} />{u.name}
                  </button>
                )))}
              </div>
              {/* Chat */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{chatMode === 'public' ? 'Public Group' : selPriv ? selPriv.name : 'Select a user'}</span>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <ChatView messages={chatMode === 'public' ? pubChats : privChats} currentUserId={appUser.id} onSend={sendChat} placeholder={chatMode === 'public' ? 'Message group...' : `Message ${selPriv?.name || ''}...`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="page-enter">
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text, marginBottom: 24 }}>Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
              <div className="glass" style={{ borderRadius: 22, padding: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={13} />UPI Settings</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Input type="text" placeholder="UPI ID (e.g. 9876543210@upi)" value={upiId} onChange={e => setUpiId(e.target.value)} />
                  <button className="btn-primary" onClick={saveUpiId} style={{ padding: '13px 24px', whiteSpace: 'nowrap', fontSize: 13 }}>Save</button>
                </div>
              </div>
              <div className="glass" style={{ borderRadius: 22, padding: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><ShoppingCart size={13} />Payment Categories</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Grocery Payments</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Enable separate grocery tracking</p>
                  </div>
                  <button onClick={toggleGroceryPayment} style={{ width: 48, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: isGroceryEnabled ? 'linear-gradient(135deg, #34d399, #059669)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s', boxShadow: isGroceryEnabled ? '0 0 12px rgba(52,211,153,0.4)' : 'none', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: isGroceryEnabled ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.16,1,0.3,1)', display: 'block', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MEMBER DASHBOARD ─────────────────────────────────────────────────────────
const MemberDashboard = ({ appUser, handleLogout, getMemberBalance, transactions, upiId, changePassword, messages, reportPayment, isGroceryEnabled, chatMessages, sendChatMessage }) => {
  const [tab, setTab] = useState('home');
  const [list, setList] = useState('main');
  const [isPaying, setIsPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [chatMode, setChatMode] = useState('public');
  const [isPassModal, setIsPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [isReport, setIsReport] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [showPass, setShowPass] = useState(false);

  const balance = getMemberBalance(appUser.id, list);
  const isSavings = balance < 0;
  const due = balance > 0 ? balance : 0;

  const myTx = useMemo(() => transactions.filter(t => t.userId === appUser.id && (t.category || 'main') === list), [transactions, appUser.id, list]);
  const myMsgs = useMemo(() => messages.filter(m => m.recipients?.includes(appUser.id)), [messages, appUser.id]);
  const pubChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  const privChats = useMemo(() => chatMessages.filter(m => m.type === 'private' && (m.senderId === appUser.id || m.targetId === appUser.id)), [chatMessages, appUser.id]);

  const totalPaid = useMemo(() => transactions.filter(t => t.userId === appUser.id && t.type === 'payment' && t.status === 'approved').reduce((s, t) => s + safeNum(t.amount), 0), [transactions, appUser.id]);

  const handlePay = (e) => { e.preventDefault(); const v = parseFloat(amount); if (!amount || isNaN(v) || v <= 0) return alert('Enter a valid amount'); reportPayment(amount, list, true); window.location.href = `upi://pay?pa=${upiId}&pn=SmartManager&am=${v.toFixed(2)}&cu=INR`; setIsPaying(false); setAmount(''); };
  const handleReport = (e) => { e.preventDefault(); if (!payAmt || parseFloat(payAmt) <= 0) return alert('Enter amount'); reportPayment(payAmt, list); setIsReport(false); setPayAmt(''); };
  const handlePass = (e) => { e.preventDefault(); if (!newPass) return; changePassword(newPass); setIsPassModal(false); setNewPass(''); };
  const isBday = () => { if (!appUser.birthday) return false; const t = new Date(), d = new Date(appUser.birthday); return t.getDate() === d.getDate() && t.getMonth() === d.getMonth(); };

  const TABS = [
    { v: 'home', label: 'Home', icon: <Activity size={13} /> },
    { v: 'wallet', label: 'Wallet', icon: <CreditCard size={13} /> },
    { v: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
    { v: 'events', label: 'Events', icon: <Bell size={13} />, badge: myMsgs.length || null },
  ];

  const getBalBg = () => {
    if (isSavings) return 'linear-gradient(135deg, rgba(5,40,20,0.9), rgba(6,78,59,0.7))';
    if (list === 'main') return 'linear-gradient(135deg, rgba(6,6,32,0.9), rgba(30,16,96,0.7))';
    return 'linear-gradient(135deg, rgba(26,10,0,0.9), rgba(67,20,7,0.7))';
  };
  const getBalAccent = () => isSavings ? C.green : list === 'main' ? C.cyan : C.amber;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 60%)' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(3,4,15,0.85)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Avatar name={appUser.name} size={38} />
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{appUser.name}</p>
              <p style={{ fontSize: 10, color: C.muted, fontFamily: 'var(--mono)', marginTop: 1 }}>@{appUser.username}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => setIsPassModal(true)} style={{ padding: 9, display: 'flex' }}><Key size={16} /></button>
            <button className="btn-ghost" onClick={handleLogout} style={{ padding: 9, display: 'flex' }}><LogOut size={16} /></button>
          </div>
        </div>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 12px' }}>
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Home */}
        {tab === 'home' && (
          <div className="page-enter">
            {isBday() && (
              <div className="animate-fadeUp" style={{ background: 'linear-gradient(135deg, #d946ef, #f59e0b)', borderRadius: 22, padding: 28, textAlign: 'center', marginBottom: 22, boxShadow: '0 0 50px rgba(217,70,239,0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)', animation: 'shimmer 2s infinite' }} />
                <Cake size={46} style={{ marginBottom: 10, color: 'white' }} />
                <h2 style={{ fontWeight: 900, fontSize: 24, color: 'white', letterSpacing: '-0.02em' }}>Happy Birthday! 🎉</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Wishing you a wonderful day!</p>
              </div>
            )}

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <div className="animate-fadeUp stagger-1 stat-card" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: C.cyan, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Main Due</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: safeNum(getMemberBalance(appUser.id, 'main')) > 0 ? C.red : C.green, fontFamily: 'var(--mono)' }}>₹{Math.abs(getMemberBalance(appUser.id, 'main')).toFixed(0)}</p>
              </div>
              <div className="animate-fadeUp stagger-2 stat-card" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Total Paid</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: C.green, fontFamily: 'var(--mono)' }}>₹{totalPaid.toFixed(0)}</p>
              </div>
            </div>

            {/* Recent transactions */}
            <h3 style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={15} style={{ color: C.violet }} />Recent Transactions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.filter(t => t.userId === appUser.id).slice(0, 5).map(tx => <TxItem key={tx.id} tx={tx} />)}
              {transactions.filter(t => t.userId === appUser.id).length === 0 && <div style={{ textAlign: 'center', padding: 40, color: C.muted, border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: 16, fontSize: 13 }}>No transactions yet</div>}
            </div>
          </div>
        )}

        {/* Wallet */}
        {tab === 'wallet' && (
          <div className="page-enter">
            <TabBar tabs={[{ v: 'main', label: 'Main', icon: <Briefcase size={13} /> }, { v: 'grocery', label: 'Grocery', icon: <ShoppingCart size={13} /> }]} active={list} onChange={setList} style={{ marginBottom: 22 }} />

            {/* Balance card */}
            <div className="animate-scaleIn" style={{ background: getBalBg(), border: `1px solid ${getBalAccent()}33`, borderRadius: 26, padding: 32, marginBottom: 22, boxShadow: `0 0 50px ${getBalAccent()}18, 0 24px 48px rgba(0,0,0,0.4)`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: `${getBalAccent()}08`, filter: 'blur(40px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none', borderRadius: 'inherit' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: getBalAccent(), letterSpacing: '0.12em', textTransform: 'uppercase' }}>{isSavings ? '✦ In Credit' : '⚡ Amount Due'}</span>
                  <span className={isSavings ? 'tag tag-green' : 'tag tag-red'}>{list}</span>
                </div>
                <h1 style={{ fontSize: 50, fontWeight: 900, letterSpacing: '-0.04em', color: 'white', marginBottom: 24, fontFamily: 'var(--mono)', textShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
                  <AnimatedNumber value={Math.abs(balance)} />
                </h1>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {balance > 0 && (list === 'main' || isGroceryEnabled) && (
                    <button className="btn-primary" onClick={() => { setAmount(due.toString()); setIsPaying(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px', fontSize: 15, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      <Smartphone size={18} />Pay ₹{due.toFixed(2)} via UPI
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => setIsReport(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                    <CreditCard size={15} />Report Manual Payment
                  </button>
                  {isSavings && <div style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 14, padding: '12px 18px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: C.green }}>✓ You have a credit of ₹{Math.abs(balance).toFixed(2)}</div>}
                </div>
              </div>
            </div>

            <h3 style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14 }}>Transaction History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myTx.length > 0 ? myTx.map(tx => <TxItem key={tx.id} tx={tx} />) : <div style={{ textAlign: 'center', padding: 40, color: C.muted, border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: 16, fontSize: 13 }}>No {list} transactions yet.</div>}
            </div>
          </div>
        )}

        {/* Chat */}
        {tab === 'chat' && (
          <div className="page-enter">
            <TabBar tabs={[{ v: 'public', label: 'Group Chat' }, { v: 'private', label: 'Admin DM' }]} active={chatMode} onChange={setChatMode} style={{ marginBottom: 16 }} />
            <ChatView messages={chatMode === 'public' ? pubChats : privChats} currentUserId={appUser.id} onSend={txt => sendChatMessage({ text: txt, type: chatMode, ...(chatMode === 'private' ? { targetId: 'admin' } : {}) })} placeholder={chatMode === 'public' ? 'Send to group...' : 'Message admin...'} />
          </div>
        )}

        {/* Events */}
        {tab === 'events' && (
          <div className="page-enter">
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: C.text, marginBottom: 20 }}>Invitations</h2>
            {myMsgs.length > 0 ? myMsgs.map(m => <InvitationCard key={m.id} msg={m} onDiscuss={() => { setTab('chat'); setChatMode('public'); }} />) : (
              <div style={{ textAlign: 'center', padding: 60, color: C.muted, border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: 22 }}>
                <Bell size={36} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p style={{ fontSize: 15, fontWeight: 700 }}>No invitations yet</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Event invitations will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UPI Pay Modal */}
      {isPaying && (
        <Modal onClose={() => setIsPaying(false)} title="Pay via UPI">
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>Opens your UPI app to complete payment.</p>
          <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: 28, fontWeight: 900, padding: '18px 20px', fontFamily: 'var(--mono)' }} autoFocus />
            {[100, 200, 500].map(v => <button key={v} type="button" onClick={() => setAmount(v.toString())} className="btn-ghost" style={{ fontSize: 13, padding: '8px 16px', display: 'inline-block', width: 'fit-content' }}>₹{v}</button>)}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn-ghost" onClick={() => setIsPaying(false)} style={{ flex: 1, padding: '13px' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, padding: '13px' }}>Open UPI App</button>
            </div>
          </form>
          <button onClick={() => { setIsPaying(false); setIsReport(true); }} style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.muted, textDecoration: 'underline', fontFamily: 'var(--font)' }}>Paid differently? Submit manual report</button>
        </Modal>
      )}

      {isReport && (
        <Modal onClose={() => setIsReport(false)} title="Manual Payment Report">
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Report a payment made outside the app.</p>
          <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input type="number" step="0.01" placeholder="Amount paid" value={payAmt} onChange={e => setPayAmt(e.target.value)} style={{ fontSize: 28, fontWeight: 900, padding: '18px 20px', fontFamily: 'var(--mono)' }} autoFocus />
            <p style={{ fontSize: 11, color: C.amber }}>⚡ Requires admin approval</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-ghost" onClick={() => setIsReport(false)} style={{ flex: 1, padding: '13px' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, padding: '13px' }}>Submit Report</button>
            </div>
          </form>
        </Modal>
      )}

      {isPassModal && (
        <Modal onClose={() => setIsPassModal(false)} title="Change Password">
          <form onSubmit={handlePass} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input type={showPass ? 'text' : 'password'} placeholder="New password" value={newPass} onChange={e => setNewPass(e.target.value)} autoFocus
              rightIcon={<button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-ghost" onClick={() => setIsPassModal(false)} style={{ flex: 1, padding: '13px' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, padding: '13px' }}>Update Password</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ─── MEMBER DETAIL ────────────────────────────────────────────────────────────
const MemberDetailView = ({ users, selectedMemberId, transactions, appUser, transactionForm, setTransactionForm, addTransaction, setSelectedMemberId, setView, getMemberBalance, deleteTransaction }) => {
  const member = users.find(u => u.id === selectedMemberId);
  const [list, setList] = useState('main');
  const [showReminder, setShowReminder] = useState(false);
  const [reminderText, setReminderText] = useState('');
  const [isGenAI, setIsGenAI] = useState(false);

  if (!member) return null;
  const filteredTx = transactions.filter(t => t.userId === member.id && (t.category || 'main') === list);
  const due = getMemberBalance(member.id, list);
  const totalTxCount = transactions.filter(t => t.userId === member.id).length;

  const genReminder = async () => { setIsGenAI(true); setShowReminder(true); setReminderText(await callGemini(`WhatsApp reminder for ${member.name}: pay ₹${Math.abs(due).toFixed(2)} ${list} dues. Friendly, <50 words.`)); setIsGenAI(false); };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.07) 0%, transparent 55%)' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(3,4,15,0.85)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => { setSelectedMemberId(null); setView('dashboard'); }} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
            <ArrowLeft size={15} />Back
          </button>
          {appUser.role === 'admin' && due > 0 && (
            <button onClick={genReminder} style={{ background: 'linear-gradient(135deg, rgba(232,121,249,0.15), rgba(139,92,246,0.12))', border: '1px solid rgba(232,121,249,0.3)', color: C.fuchsia, borderRadius: 12, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font)', transition: 'all 0.2s' }}>
              <Sparkles size={13} />AI Reminder
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Profile card */}
        <div className="glass animate-fadeUp" style={{ borderRadius: 24, padding: 28, marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #8b5cf6, #e879f9, #22d3ee)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar name={member.name} size={58} style={{ boxShadow: '0 0 30px rgba(139,92,246,0.3)' }} />
              <div>
                <h2 style={{ fontWeight: 900, fontSize: 22, color: C.text, letterSpacing: '-0.02em' }}>{member.name}</h2>
                <p style={{ color: C.muted, fontSize: 13, fontFamily: 'var(--mono)', marginTop: 4 }}>@{member.username}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="tag tag-violet">{totalTxCount} transactions</span>
                  {member.birthday && <span className="tag tag-cyan"><Cake size={9} style={{ display: 'inline', marginRight: 3 }} />{new Date(member.birthday).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* AI Reminder */}
          {showReminder && (
            <div className="animate-scaleIn" style={{ marginBottom: 20, background: 'rgba(232,121,249,0.07)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.fuchsia, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}><Sparkles size={11} />AI Draft</span>
                <button onClick={() => setShowReminder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={14} /></button>
              </div>
              {isGenAI ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.fuchsia }}><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />Generating reminder...</div>
                : <div><Textarea value={reminderText} onChange={e => setReminderText(e.target.value)} style={{ marginBottom: 10, fontSize: 13 }} /><button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(reminderText); }} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>Copy to clipboard</button></div>}
            </div>
          )}

          <TabBar tabs={[{ v: 'main', label: 'Main', icon: <Briefcase size={13} /> }, { v: 'grocery', label: 'Grocery', icon: <ShoppingCart size={13} /> }]} active={list} onChange={setList} style={{ marginBottom: 18 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: due > 0 ? 'rgba(251,113,133,0.06)' : 'rgba(52,211,153,0.06)', borderRadius: 16, border: `1px solid ${due > 0 ? 'rgba(251,113,133,0.2)' : 'rgba(52,211,153,0.2)'}`, marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Current Balance</p>
              <div style={{ fontSize: 32, fontWeight: 900, color: due > 0 ? C.red : C.green, fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>
                <AnimatedNumber value={Math.abs(due)} />
              </div>
            </div>
            <span className={due > 0 ? 'tag tag-red' : 'tag tag-green'} style={{ fontSize: 11, padding: '5px 12px' }}>{due > 0 ? 'Owes' : 'Credit'}</span>
          </div>

          {appUser.role === 'admin' && (
            <form onSubmit={e => addTransaction(e, list)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Input type="number" step="0.01" placeholder="Amount" value={transactionForm.amount} onChange={e => setTransactionForm(p => ({ ...p, amount: e.target.value }))} style={{ flex: '2 1 100px' }} />
              <Input type="text" placeholder="Description (optional)" value={transactionForm.description} onChange={e => setTransactionForm(p => ({ ...p, description: e.target.value }))} style={{ flex: '3 1 150px' }} />
              <Select value={transactionForm.type} onChange={e => setTransactionForm(p => ({ ...p, type: e.target.value }))} style={{ flex: '1 1 120px' }}>
                <option value="due">Add Due</option>
                <option value="payment">Add Payment</option>
              </Select>
              <button type="submit" className="btn-primary" style={{ padding: '13px 22px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}><Plus size={14} />Add</button>
            </form>
          )}
        </div>

        {/* Transactions */}
        <h3 style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14 }}>Transactions · <span style={{ color: C.muted, fontWeight: 600 }}>{list}</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredTx.length > 0 ? filteredTx.map(tx => <TxItem key={tx.id} tx={tx} onDelete={deleteTransaction} isAdmin={appUser.role === 'admin'} />) : (
            <div style={{ textAlign: 'center', padding: 44, color: C.muted, border: `1px dashed rgba(255,255,255,0.08)`, borderRadius: 18, fontSize: 13 }}>No {list} transactions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const App = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [isGroceryEnabled, setIsGroceryEnabled] = useState(false);
  const [view, setView] = useState('login');
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newMemberForm, setNewMemberForm] = useState({ name: '', password: '', birthday: '' });
  const [transactionForm, setTransactionForm] = useState({ amount: '', description: '', type: 'due' });

  injectStyles();

  useEffect(() => {
    const up = () => setIsOnline(true), dn = () => setIsOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', dn);
    const init = async () => { try { if (typeof __initial_auth_token !== 'undefined') await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); } catch (e) { setError(e); setLoading(false); } };
    init();
    const unsub = onAuthStateChanged(auth, u => { setFirebaseUser(u); if (!u) setLoading(false); });
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); unsub(); };
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const subs = [
      onSnapshot(query(col(COL.USERS), orderBy('createdAt', 'asc')), s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, e => { setLoading(false); setError(e); }),
      onSnapshot(query(col(COL.TX), orderBy('date', 'desc')), s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(col(COL.MSGS), orderBy('createdAt', 'desc')), s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(col(COL.CHATS), orderBy('createdAt', 'asc')), s => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(dRef(COL.SETTINGS, 'config'), s => { if (s.exists()) { setUpiId(s.data().upiId || ''); setIsGroceryEnabled(s.data().isGroceryEnabled || false); } }),
    ];
    return () => subs.forEach(u => u());
  }, [firebaseUser]);

  const handleLogin = useCallback((e, role) => {
    e.preventDefault();
    if (users.length === 0) {
      addDoc(col(COL.USERS), { username: loginForm.username.trim().toLowerCase(), password: loginForm.password, name: 'Administrator', role: 'admin', createdAt: serverTimestamp() })
        .then(() => { alert('Admin account created! Please sign in.'); setLoginForm({ username: '', password: '' }); });
      return;
    }
    const input = loginForm.username.trim().toLowerCase().replace(/\s+/g, '');
    const u = users.find(u => {
      const match = (u.username || '').toLowerCase().replace(/\s+/g, '') === input && u.password === loginForm.password;
      if (role === 'admin') return match && u.role === 'admin';
      return match;
    });
    if (u) { setAppUser(u); setView('dashboard'); setLoginForm({ username: '', password: '' }); }
    else alert(role === 'admin' ? 'Invalid admin credentials.' : 'Invalid username or password.');
  }, [users, loginForm]);

  const createMember = useCallback(() => {
    if (!newMemberForm.name || !newMemberForm.password) return alert('Name and password required');
    addDoc(col(COL.USERS), { ...newMemberForm, username: newMemberForm.name.replace(/\s+/g, '').toLowerCase(), role: 'member', createdAt: serverTimestamp() })
      .then(() => { alert('Member added!'); setNewMemberForm({ name: '', password: '', birthday: '' }); });
  }, [newMemberForm]);

  const populateDefaults = () => { ['Animesh Shit', 'Kartick Sau', 'Indranil Paul', 'Soumen Giri', 'Soumyadeep Masanta'].forEach(name => { if (!users.some(u => u.name === name)) addDoc(col(COL.USERS), { username: name.replace(/\s+/g, '').toLowerCase(), password: '123', name, role: 'member', createdAt: serverTimestamp() }); }); alert('Defaults populated!'); };
  const addTransaction = (e, cat) => { e.preventDefault(); const amt = parseFloat(transactionForm.amount); if (!amt || isNaN(amt) || amt <= 0) return alert('Enter valid amount'); addDoc(col(COL.TX), { userId: selectedMemberId, amount: amt, description: transactionForm.description || (transactionForm.type === 'due' ? 'Dues Added' : 'Payment Recorded'), type: transactionForm.type, category: cat, status: 'approved', date: new Date().toISOString(), createdAt: serverTimestamp(), createdBy: appUser.username }).then(() => setTransactionForm({ amount: '', description: '', type: 'due' })); };
  const reportPayment = (amt, cat, auto = false) => addDoc(col(COL.TX), { userId: appUser.id, amount: parseFloat(amt), description: auto ? 'UPI Payment' : 'Manual Payment Report', type: 'payment', category: cat, status: 'pending', date: new Date().toISOString(), createdAt: serverTimestamp(), createdBy: appUser.username });
  const handleApproval = (id, ok) => ok ? updateDoc(dRef(COL.TX, id), { status: 'approved' }) : deleteDoc(dRef(COL.TX, id));
  const saveUpiId = () => setDoc(dRef(COL.SETTINGS, 'config'), { upiId, isGroceryEnabled }, { merge: true }).then(() => alert('Saved!'));
  const toggleGrocery = () => { const n = !isGroceryEnabled; setIsGroceryEnabled(n); setDoc(dRef(COL.SETTINGS, 'config'), { isGroceryEnabled: n }, { merge: true }); };
  const getMemberBalance = useCallback((uid, cat) => transactions.filter(t => t.userId === uid && (t.category || 'main') === cat && t.status === 'approved').reduce((s, t) => t.type === 'due' ? s + safeNum(t.amount) : s - safeNum(t.amount), 0), [transactions]);
  const sendMessage = (d) => addDoc(col(COL.MSGS), { ...d, createdAt: serverTimestamp(), sender: appUser.username });
  const sendChatMessage = (d) => addDoc(col(COL.CHATS), { ...d, senderId: appUser.id, senderName: appUser.name, createdAt: serverTimestamp() });
  const changePassword = (p) => { if (!p) return; updateDoc(dRef(COL.USERS, appUser.id), { password: p }).then(() => alert('Password updated!')); };
  const deleteTransaction = (id) => { if (window.confirm('Delete this transaction?')) deleteDoc(dRef(COL.TX, id)); };
  const logout = () => { setAppUser(null); setView('login'); };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif" }}>
      <ConnectionStatus isOnline={isOnline} />
      {view === 'login' && <LoginView users={users} loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} isSubmitting={false} loadingState={loading} error={error} />}
      {view === 'dashboard' && appUser?.role === 'admin' && <AdminDashboard users={users} handleLogout={logout} upiId={upiId} setUpiId={setUpiId} saveUpiId={saveUpiId} newMemberForm={newMemberForm} setNewMemberForm={setNewMemberForm} createMember={createMember} populateDefaults={populateDefaults} getMemberBalance={getMemberBalance} setSelectedMemberId={setSelectedMemberId} setView={setView} transactions={transactions} sendMessage={sendMessage} isSubmitting={false} handleApproval={handleApproval} isGroceryEnabled={isGroceryEnabled} toggleGroceryPayment={toggleGrocery} chatMessages={chatMessages} sendChatMessage={sendChatMessage} appUser={appUser} />}
      {view === 'dashboard' && appUser?.role === 'member' && <MemberDashboard appUser={appUser} handleLogout={logout} getMemberBalance={getMemberBalance} transactions={transactions} upiId={upiId} changePassword={changePassword} messages={messages} reportPayment={reportPayment} isGroceryEnabled={isGroceryEnabled} chatMessages={chatMessages} sendChatMessage={sendChatMessage} />}
      {view === 'member-detail' && <MemberDetailView users={users} selectedMemberId={selectedMemberId} transactions={transactions} appUser={appUser} transactionForm={transactionForm} setTransactionForm={setTransactionForm} addTransaction={addTransaction} setSelectedMemberId={setSelectedMemberId} setView={setView} getMemberBalance={getMemberBalance} deleteTransaction={deleteTransaction} />}
    </div>
  );
};

export default App;
