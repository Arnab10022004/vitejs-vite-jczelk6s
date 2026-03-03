import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DollarSign, Plus, Minus, LogOut, ShieldCheck, User, Lock,
  ArrowLeft, Smartphone, CreditCard, UserPlus, History,
  X, Key, CheckSquare, Square, Send, Image as ImageIcon,
  Trash2, Clock, ShoppingCart, Briefcase,
  Cake, RefreshCw, AlertTriangle, Loader, Wifi, WifiOff,
  CheckCircle, MessageSquare, ChevronRight, Sparkles
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, addDoc, query, onSnapshot, orderBy,
  serverTimestamp, doc, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';

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

const col = (name) => collection(db, 'artifacts', APP_ID, 'public', 'data', name);
const dRef = (name, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', name, id);
const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmtDate = (v) => { if (!v) return 'N/A'; try { if (v.seconds) return new Date(v.seconds * 1000).toLocaleDateString(); return new Date(v).toLocaleDateString(); } catch { return '—'; } };
const callGemini = async (p) => { try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] }) }); const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.'; } catch { return 'AI unavailable.'; } };
const compressImage = (file) => new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const W = 800; canvas.width = W; canvas.height = img.height * (W / img.width); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; }; });

// Design tokens — all colors live here
const C = {
  bg: '#050714',
  surface: '#0d1224',
  surface2: '#111827',
  border: 'rgba(255,255,255,0.08)',
  text: '#e2e8f0',
  muted: '#64748b',
  cyan: '#00f5ff',
  violet: '#7c3aed',
  fuchsia: '#d946ef',
  amber: '#f59e0b',
  green: '#22c55e',
  red: '#f43f5e',
};

// Shared style factories
const S = {
  card: (x = {}) => ({ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, ...x }),
  cardSm: (x = {}) => ({ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, ...x }),
  input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: C.text, padding: '12px 14px', width: '100%', outline: 'none', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' },
  btnPrimary: (x = {}) => ({ background: 'linear-gradient(135deg, #00f5ff, #7c3aed)', color: '#050714', fontWeight: 800, border: 'none', borderRadius: 12, padding: '13px 22px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', ...x }),
  btnGhost: (x = {}) => ({ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: C.text, borderRadius: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', ...x }),
  tag: (color, bg, br) => ({ background: bg, border: `1px solid ${br}`, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'inline-block' }),
};

const TAGS = {
  cyan: S.tag(C.cyan, 'rgba(0,245,255,0.1)', 'rgba(0,245,255,0.25)'),
  orange: S.tag(C.amber, 'rgba(245,158,11,0.1)', 'rgba(245,158,11,0.25)'),
  green: S.tag(C.green, 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0.25)'),
  red: S.tag(C.red, 'rgba(244,63,94,0.1)', 'rgba(244,63,94,0.25)'),
};

// ─── Reusable Components ──────────────────────────────────────────────────────
const Avatar = ({ name, size = 40 }) => (
  <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: 'linear-gradient(135deg, #7c3aed, #00f5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: Math.round(size * 0.4), flexShrink: 0, userSelect: 'none' }}>
    {(name || '?').charAt(0).toUpperCase()}
  </div>
);

const NeonInput = React.forwardRef(({ style: ext, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  return (
    <input ref={ref} {...props}
      style={{ ...S.input, borderColor: focused ? C.cyan : 'rgba(255,255,255,0.12)', boxShadow: focused ? '0 0 0 3px rgba(0,245,255,0.1)' : 'none', transition: 'border-color 0.2s, box-shadow 0.2s', ...ext }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
});

const NeonTextarea = ({ style: ext, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea {...props}
      style={{ ...S.input, minHeight: 80, resize: 'vertical', borderColor: focused ? C.cyan : 'rgba(255,255,255,0.12)', boxShadow: focused ? '0 0 0 3px rgba(0,245,255,0.1)' : 'none', transition: 'border-color 0.2s, box-shadow 0.2s', ...ext }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
};

const NeonSelect = ({ style: ext, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select {...props}
      style={{ ...S.input, appearance: 'none', cursor: 'pointer', borderColor: focused ? C.cyan : 'rgba(255,255,255,0.12)', boxShadow: focused ? '0 0 0 3px rgba(0,245,255,0.1)' : 'none', transition: 'border-color 0.2s, box-shadow 0.2s', ...ext }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
};

const Tabs = ({ tabs, active, onChange, style: ext }) => (
  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 5, gap: 4, ...ext }}>
    {tabs.map(t => (
      <button key={t.v} onClick={() => onChange(t.v)}
        style={{ flex: 1, padding: '9px 8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: active === t.v ? '1px solid rgba(0,245,255,0.25)' : '1px solid transparent', background: active === t.v ? 'rgba(0,245,255,0.1)' : 'transparent', color: active === t.v ? C.cyan : C.muted, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all 0.18s' }}>
        {t.icon && t.icon}{t.label}
        {t.badge ? <span style={{ background: C.red, color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>{t.badge}</span> : null}
      </button>
    ))}
  </div>
);

const Modal = ({ onClose, title, children }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'smFadeIn 0.15s ease' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: '1px solid rgba(0,245,255,0.2)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 0 60px rgba(0,245,255,0.12)', animation: 'smSlideUp 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{title}</h3>
        <button onClick={onClose} style={{ ...S.btnGhost({ padding: 7, display: 'flex' }) }}><X size={15} /></button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Connection Status ────────────────────────────────────────────────────────
const ConnectionStatus = ({ isOnline }) => (
  <div style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 999, padding: '7px 14px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.9)', border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.5)'}`, color: isOnline ? C.green : 'white', transform: isOnline ? 'translateY(80px)' : 'translateY(0)', opacity: isOnline ? 0 : 1, transition: 'all 0.4s', pointerEvents: 'none' }}>
    {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}{isOnline ? 'Online' : 'Offline'}
  </div>
);

// ─── Chat ─────────────────────────────────────────────────────────────────────
const ChatBubble = ({ msg, isOwn, senderName }) => {
  const time = msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{ padding: '9px 13px', maxWidth: '82%', fontSize: 13, lineHeight: 1.5, borderRadius: 14, borderTopRightRadius: isOwn ? 4 : 14, borderTopLeftRadius: isOwn ? 14 : 4, background: isOwn ? 'linear-gradient(135deg, #7c3aed, #00c4ff)' : 'rgba(255,255,255,0.06)', border: isOwn ? 'none' : `1px solid ${C.border}`, color: 'white' }}>
        {!isOwn && <p style={{ fontSize: 10, fontWeight: 700, color: C.cyan, marginBottom: 3 }}>{String(senderName)}</p>}
        {String(msg.text)}
      </div>
      <span style={{ fontSize: 10, color: C.muted, marginTop: 3, paddingInline: 4 }}>{time}</span>
    </div>
  );
};

const ChatComponent = ({ messages = [], currentUserId, onSend, placeholder }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  const handleSend = (e) => { e.preventDefault(); if (!text.trim()) return; onSend(text); setText(''); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '52vh', background: 'rgba(0,0,0,0.25)', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {messages.length === 0 ? <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted }}><MessageSquare size={28} style={{ marginBottom: 8, opacity: 0.3 }} /><p style={{ fontSize: 13 }}>No messages yet</p></div> : messages.map(m => <ChatBubble key={m.id} msg={m} isOwn={m.senderId === currentUserId} senderName={m.senderName} />)}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 9, alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
        <NeonInput type="text" style={{ borderRadius: 999, padding: '9px 16px' }} placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00f5ff, #7c3aed)', border: 'none', cursor: 'pointer', color: 'white' }}><Send size={15} /></button>
      </form>
    </div>
  );
};

// ─── Transaction Item ─────────────────────────────────────────────────────────
const TransactionItem = React.memo(({ tx, onDelete, isAdmin }) => {
  const isPending = tx.status === 'pending';
  const isPay = tx.type === 'payment';
  const amt = safeNum(tx.amount);
  const accent = isPending ? C.amber : isPay ? C.green : C.red;
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${accent}`, borderRadius: 14, padding: '13px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}1a`, color: accent }}>
            {isPending ? <Clock size={14} /> : isPay ? <Plus size={14} /> : <Minus size={14} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{String(tx.description || 'Transaction')}</span>
              {isPending && <span style={TAGS.orange}>Pending</span>}
              <span style={(tx.category || 'main') === 'grocery' ? TAGS.orange : TAGS.cyan}>{tx.category || 'main'}</span>
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtDate(tx.date)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: isPending ? C.muted : isPay ? C.green : C.red }}>{isPay ? '+' : '−'}₹{amt.toFixed(2)}</span>
          {isAdmin && onDelete && <button onClick={e => { e.stopPropagation(); onDelete(tx.id); }} style={{ padding: 6, borderRadius: 8, background: 'rgba(244,63,94,0.12)', border: 'none', cursor: 'pointer', color: C.red, display: 'flex' }}><Trash2 size={13} /></button>}
        </div>
      </div>
    </div>
  );
});

// ─── Invitation Card ──────────────────────────────────────────────────────────
const InvitationCard = ({ msg, onDiscuss }) => (
  <div style={{ ...S.card({ padding: 0, overflow: 'hidden', marginBottom: 16 }) }}>
    {msg.imageUrl && <img src={msg.imageUrl} alt="Event" style={{ width: '100%', display: 'block' }} />}
    <div style={{ padding: '13px 17px', borderBottom: `1px solid ${C.border}`, background: msg.imageUrl ? 'transparent' : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(0,245,255,0.08))' }}>
      <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: C.text }}>{String(msg.title)}</h3>
      <p style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{fmtDate(msg.eventDate)}</p>
    </div>
    <div style={{ padding: '13px 17px' }}>
      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>{String(msg.description)}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, color: C.muted }}>Posted: {msg.createdAt ? fmtDate(new Date(msg.createdAt.seconds * 1000)) : 'Recently'}</span>
        {onDiscuss && <button onClick={onDiscuss} style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.2)', color: C.cyan, borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}><MessageSquare size={11} />Discuss</button>}
      </div>
    </div>
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const LoginView = ({ users, loginForm, setLoginForm, handleLogin, isSubmitting, loadingState, error }) => {
  const [showRetry, setShowRetry] = useState(false);
  useEffect(() => { if (loadingState) { const t = setTimeout(() => setShowRetry(true), 8000); return () => clearTimeout(t); } }, [loadingState]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: C.bg, position: 'relative', overflow: 'hidden', backgroundImage: 'linear-gradient(rgba(0,245,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.025) 1px,transparent 1px)', backgroundSize: '44px 44px' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(0,245,255,0.04)', filter: 'blur(80px)', top: '-15%', left: '-20%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(124,58,237,0.06)', filter: 'blur(80px)', bottom: '0%', right: '-10%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(217,70,239,0.04)', filter: 'blur(60px)', top: '40%', left: '60%', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        <div style={{ background: C.surface, border: '1px solid rgba(0,245,255,0.18)', borderRadius: 24, padding: 32, boxShadow: '0 0 60px rgba(0,245,255,0.08), 0 24px 48px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #00f5ff, #7c3aed, #d946ef)' }} />
          <div style={{ textAlign: 'center', marginBottom: 28, marginTop: 6 }}>
            <div style={{ width: 76, height: 76, borderRadius: 22, background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(124,58,237,0.25))', border: '1px solid rgba(0,245,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 28px rgba(0,245,255,0.15)' }}>
              <DollarSign style={{ color: C.cyan, width: 34, height: 34 }} />
            </div>
            <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 8, background: 'linear-gradient(135deg, #00f5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SMART MANAGER</h1>
            <p style={{ color: C.muted, fontSize: 13 }}>{loadingState ? 'Connecting securely...' : users.length === 0 ? 'Create admin account' : 'Welcome back'}</p>
          </div>
          {error && <div style={{ marginBottom: 16, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 12, padding: 13, display: 'flex', alignItems: 'center', gap: 10 }}><AlertTriangle size={15} style={{ color: C.red, flexShrink: 0 }} /><span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{error.message || String(error)}</span></div>}
          {loadingState ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 16 }}>
              <Loader size={30} style={{ color: C.cyan, animation: 'smSpin 1s linear infinite' }} />
              {showRetry && <button onClick={() => window.location.reload()} style={{ ...S.btnGhost({ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }) }}><RefreshCw size={13} />Reload App</button>}
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
                <NeonInput type="text" style={{ paddingLeft: 40 }} placeholder="Username" value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} disabled={isSubmitting} autoCapitalize="none" />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
                <NeonInput type="password" style={{ paddingLeft: 40 }} placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} disabled={isSubmitting} />
              </div>
              <button type="submit" disabled={isSubmitting} style={{ ...S.btnPrimary({ width: '100%', padding: '14px', fontSize: 15, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }), opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? <Loader size={18} style={{ animation: 'smSpin 1s linear infinite' }} /> : <><span>Sign In</span><ChevronRight size={18} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = ({ users, handleLogout, upiId, setUpiId, saveUpiId, newMemberForm, setNewMemberForm, createMember, populateDefaults, getMemberBalance, setSelectedMemberId, setView, transactions, sendMessage, isSubmitting, handleApproval, isGroceryEnabled, toggleGroceryPayment, chatMessages, sendChatMessage, appUser }) => {
  const [tab, setTab] = useState('members');
  const [msgForm, setMsgForm] = useState({ title: '', description: '', recipients: [], imageUrl: '', eventDate: '' });
  const [chatMode, setChatMode] = useState('public');
  const [selPriv, setSelPriv] = useState(null);
  const [genAI, setGenAI] = useState(false);

  const pending = useMemo(() => transactions.filter(t => t.status === 'pending'), [transactions]);
  const pubChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  const privUsers = useMemo(() => { const ids = new Set(); chatMessages.forEach(m => { if (m.type === 'private') { if (m.targetId === 'admin' || m.targetId === appUser.id) ids.add(m.senderId); if (m.senderId === appUser.id) ids.add(m.targetId); } }); return Array.from(ids).map(id => users.find(u => u.id === id)).filter(u => u && u.id !== appUser.id); }, [chatMessages, appUser, users]);
  const privChats = useMemo(() => { if (!selPriv) return []; return chatMessages.filter(m => m.type === 'private' && ((m.senderId === selPriv.id && (m.targetId === 'admin' || m.targetId === appUser.id)) || (m.senderId === appUser.id && m.targetId === selPriv.id))); }, [chatMessages, selPriv, appUser]);

  const sendChat = (text) => { if (chatMode === 'public') sendChatMessage({ text, type: 'public' }); else if (selPriv) sendChatMessage({ text, type: 'private', targetId: selPriv.id }); };
  const handleImg = async (e) => { const f = e.target.files[0]; if (!f || f.size > 5e6) return alert('Too large'); try { const u = await compressImage(f); setMsgForm(p => ({ ...p, imageUrl: u })); } catch { alert('Error'); } };
  const doGenAI = async () => { if (!msgForm.title) return alert('Enter title'); setGenAI(true); const t = await callGemini(`Short, friendly event invitation for: "${msgForm.title}". Max 80 words.`); setMsgForm(p => ({ ...p, description: t })); setGenAI(false); };
  const toggleRecip = (id) => setMsgForm(p => ({ ...p, recipients: p.recipients.includes(id) ? p.recipients.filter(x => x !== id) : [...p.recipients, id] }));
  const toggleAll = () => { const ids = users.filter(u => u.role !== 'admin').map(u => u.id); setMsgForm(p => ({ ...p, recipients: p.recipients.length === ids.length ? [] : ids })); };

  const PAGE = { background: C.bg, minHeight: '100vh', padding: '24px 16px 80px', maxWidth: 900, margin: '0 auto' };

  return (
    <div style={PAGE}>
      {/* Header */}
      <div style={{ ...S.card({ background: 'linear-gradient(135deg, #0d1224, rgba(124,58,237,0.12))', borderColor: 'rgba(124,58,237,0.25)', marginBottom: 22 }) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'linear-gradient(135deg, #7c3aed, #d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}><ShieldCheck size={22} style={{ color: 'white' }} /></div>
            <div><h2 style={{ fontWeight: 800, fontSize: 18, color: C.text }}>Admin Panel</h2><p style={{ fontSize: 12, color: C.muted }}>Smart Manager</p></div>
          </div>
          <button onClick={handleLogout} style={{ ...S.btnGhost({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }) }}><LogOut size={14} />Logout</button>
        </div>
        <Tabs active={tab} onChange={setTab} tabs={[{ v: 'members', label: 'Members' }, { v: 'approvals', label: 'Approvals', badge: pending.length || null }, { v: 'events', label: 'Events' }, { v: 'messages', label: 'Messages' }, { v: 'history', label: 'History' }]} />
      </div>

      {/* Members */}
      {tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={S.cardSm()}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={12} />Payment Settings</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 13 }}>
              <NeonInput placeholder="UPI ID" value={upiId} onChange={e => setUpiId(e.target.value)} style={{ padding: '10px 13px' }} />
              <button onClick={saveUpiId} style={{ ...S.btnPrimary({ padding: '10px 20px', fontSize: 13, whiteSpace: 'nowrap' }) }}>Save</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 13px', background: 'rgba(255,255,255,0.03)', borderRadius: 11, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Grocery Payments</span>
              <button onClick={toggleGroceryPayment} style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: isGroceryEnabled ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.12)', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: isGroceryEnabled ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.25s', display: 'block' }} />
              </button>
            </div>
          </div>

          <div style={S.cardSm()}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={12} />Add Member</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <NeonInput placeholder="Full Name" value={newMemberForm.name} onChange={e => setNewMemberForm({ ...newMemberForm, name: e.target.value })} style={{ flex: '2 1 130px', padding: '10px 13px' }} />
              <NeonInput type="date" value={newMemberForm.birthday} onChange={e => setNewMemberForm({ ...newMemberForm, birthday: e.target.value })} style={{ flex: '1 1 140px', padding: '10px 13px' }} />
              <NeonInput placeholder="Password" value={newMemberForm.password} onChange={e => setNewMemberForm({ ...newMemberForm, password: e.target.value })} style={{ flex: '1 1 110px', padding: '10px 13px' }} />
              <button onClick={createMember} disabled={isSubmitting} style={{ ...S.btnPrimary({ padding: '10px 22px', fontSize: 13 }) }}>Add</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 13 }}>
            {users.filter(u => u.role !== 'admin').map(m => {
              const main = safeNum(getMemberBalance(m.id, 'main'));
              const groc = safeNum(getMemberBalance(m.id, 'grocery'));
              return (
                <button key={m.id} onClick={() => { setSelectedMemberId(m.id); setView('member-detail'); }}
                  style={{ ...S.cardSm({ cursor: 'pointer', textAlign: 'left', width: '100%' }) }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.3)'; e.currentTarget.style.background = 'rgba(0,245,255,0.03)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><Avatar name={m.name} size={38} /><div><p style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{m.name}</p><p style={{ fontSize: 11, color: C.muted }}>@{m.username}</p></div></div>
                    <ChevronRight size={15} style={{ color: C.muted }} />
                  </div>
                  <div style={{ display: 'flex', gap: 9 }}>
                    <div style={{ flex: 1, padding: '8px 11px', background: 'rgba(0,245,255,0.05)', borderRadius: 9, border: '1px solid rgba(0,245,255,0.12)' }}><p style={{ fontSize: 9, color: C.cyan, marginBottom: 2, fontWeight: 700, letterSpacing: '0.06em' }}>MAIN</p><p style={{ fontWeight: 800, fontSize: 14, color: main > 0 ? C.red : C.green }}>₹{main.toFixed(2)}</p></div>
                    <div style={{ flex: 1, padding: '8px 11px', background: 'rgba(245,158,11,0.05)', borderRadius: 9, border: '1px solid rgba(245,158,11,0.12)' }}><p style={{ fontSize: 9, color: C.amber, marginBottom: 2, fontWeight: 700, letterSpacing: '0.06em' }}>GROCERY</p><p style={{ fontWeight: 800, fontSize: 14, color: groc > 0 ? C.red : C.green }}>₹{groc.toFixed(2)}</p></div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={populateDefaults} style={{ ...S.btnGhost({ fontSize: 12, alignSelf: 'flex-start' }) }}>+ Populate Default Members</button>
        </div>
      )}

      {/* Approvals */}
      {tab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {pending.length === 0 ? <div style={{ ...S.card({ textAlign: 'center', padding: 48, color: C.muted }) }}><CheckCircle size={30} style={{ marginBottom: 12, opacity: 0.3 }} /><p>No pending approvals</p></div>
            : pending.map(tx => (
              <div key={tx.id} style={{ ...S.cardSm({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${C.amber}` }) }}>
                <div><p style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{users.find(u => u.id === tx.userId)?.name || 'Unknown'}</p><p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{tx.category} · {fmtDate(tx.date)}</p></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 800, color: C.green, fontSize: 15 }}>₹{safeNum(tx.amount).toFixed(2)}</span>
                  <button onClick={() => handleApproval(tx.id, false)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}><X size={15} /></button>
                  <button onClick={() => handleApproval(tx.id, true)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}><CheckCircle size={15} /></button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Events */}
      {tab === 'events' && (
        <div style={S.card()}>
          <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 20, color: C.text }}>Compose Invitation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
              <NeonInput placeholder="Event Title" value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} style={{ flex: '2 1 160px' }} />
              <NeonInput type="date" value={msgForm.eventDate} onChange={e => setMsgForm({ ...msgForm, eventDate: e.target.value })} style={{ flex: '1 1 150px' }} />
            </div>
            <label style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 13, padding: 22, textAlign: 'center', cursor: 'pointer', position: 'relative', display: 'block' }}>
              <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} onChange={handleImg} />
              {msgForm.imageUrl ? <img src={msgForm.imageUrl} style={{ maxHeight: 120, borderRadius: 9, margin: '0 auto' }} alt="preview" /> : <div style={{ color: C.muted }}><ImageIcon size={26} style={{ marginBottom: 7, opacity: 0.5 }} /><p style={{ fontSize: 12 }}>Click to upload image</p></div>}
            </label>
            <div style={{ position: 'relative' }}>
              <NeonTextarea placeholder="Event details..." value={msgForm.description} onChange={e => setMsgForm({ ...msgForm, description: e.target.value })} />
              <button onClick={doGenAI} disabled={genAI} style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(217,70,239,0.15)', border: '1px solid rgba(217,70,239,0.3)', color: C.fuchsia, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                {genAI ? <Loader size={11} style={{ animation: 'smSpin 1s linear infinite' }} /> : <Sparkles size={11} />}AI Write
              </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 13, padding: 15, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 11 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Recipients</span>
                <button onClick={toggleAll} style={{ fontSize: 11, color: C.cyan, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{msgForm.recipients.length === users.filter(u => u.role !== 'admin').length ? 'Deselect All' : 'Select All'}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 7, maxHeight: 140, overflowY: 'auto' }}>
                {users.filter(u => u.role !== 'admin').map(u => { const sel = msgForm.recipients.includes(u.id); return (<button key={u.id} onClick={() => toggleRecip(u.id)} style={{ cursor: 'pointer', padding: '8px 11px', borderRadius: 9, fontSize: 12, display: 'flex', gap: 7, alignItems: 'center', background: sel ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)', border: sel ? '1px solid rgba(0,245,255,0.25)' : `1px solid ${C.border}`, color: sel ? C.cyan : C.text, fontFamily: 'inherit', width: '100%' }}>{sel ? <CheckSquare size={12} /> : <Square size={12} />}{u.name}</button>); })}
              </div>
            </div>
            <button onClick={() => { sendMessage(msgForm); setMsgForm({ title: '', description: '', recipients: [], imageUrl: '', eventDate: '' }); alert('Sent!'); }} style={{ ...S.btnPrimary({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }) }}><Send size={15} />Send Invitation</button>
          </div>
        </div>
      )}

      {/* Messages */}
      {tab === 'messages' && (
        <div style={{ ...S.card({ padding: 0, overflow: 'hidden', height: 520, display: 'flex' }) }}>
          <div style={{ width: 190, borderRight: `1px solid ${C.border}`, padding: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Tabs active={chatMode} onChange={(v) => { setChatMode(v); setSelPriv(null); }} tabs={[{ v: 'public', label: 'Public' }, { v: 'private', label: 'Private' }]} style={{ marginBottom: 5 }} />
            {chatMode === 'private' && (privUsers.length === 0 ? <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16 }}>No chats</p> : privUsers.map(u => <button key={u.id} onClick={() => setSelPriv(u)} style={{ padding: '8px 10px', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: selPriv?.id === u.id ? 'rgba(0,245,255,0.1)' : 'transparent', color: selPriv?.id === u.id ? C.cyan : C.text, border: selPriv?.id === u.id ? '1px solid rgba(0,245,255,0.2)' : '1px solid transparent', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}><Avatar name={u.name} size={26} />{u.name}</button>))}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '11px 15px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: C.text }}><User size={14} style={{ color: C.cyan }} />{chatMode === 'public' ? 'Public Group' : selPriv ? selPriv.name : 'Select a user'}</div>
            <div style={{ flex: 1, overflow: 'hidden', padding: 11 }}><ChatComponent messages={chatMode === 'public' ? pubChats : privChats} currentUserId={appUser.id} onSend={sendChat} placeholder="Type a message..." /></div>
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {transactions.length === 0 ? <div style={{ ...S.card({ textAlign: 'center', padding: 48, color: C.muted }) }}><History size={30} style={{ marginBottom: 12, opacity: 0.3 }} /><p>No transactions yet</p></div>
            : transactions.map(tx => { const u = users.find(x => x.id === tx.userId); const isPay = tx.type === 'payment'; return (<div key={tx.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${tx.status === 'pending' ? C.amber : isPay ? C.green : C.red}`, borderRadius: 13, padding: '12px 15px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><p style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{u?.name || 'Unknown'} — {String(tx.description || 'Transaction')}</p><div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}><span style={(tx.category || 'main') === 'grocery' ? TAGS.orange : TAGS.cyan}>{tx.category || 'main'}</span><span style={{ fontSize: 11, color: C.muted }}>{fmtDate(tx.date)}</span>{tx.status === 'pending' && <span style={TAGS.orange}>Pending</span>}</div></div><span style={{ fontWeight: 800, color: isPay ? C.green : C.red, fontSize: 14 }}>{isPay ? '+' : '−'}₹{safeNum(tx.amount).toFixed(2)}</span></div></div>); })}
        </div>
      )}
    </div>
  );
};

// ─── MEMBER DASHBOARD ─────────────────────────────────────────────────────────
const MemberDashboard = ({ appUser, handleLogout, getMemberBalance, transactions, upiId, changePassword, messages, reportPayment, isGroceryEnabled, chatMessages, sendChatMessage }) => {
  const [tab, setTab] = useState('dashboard');
  const [list, setList] = useState('main');
  const [isPaying, setIsPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [chatMode, setChatMode] = useState('public');
  const [isPassModal, setIsPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [isReport, setIsReport] = useState(false);
  const [payAmt, setPayAmt] = useState('');

  const balance = getMemberBalance(appUser.id, list);
  const isSavings = balance < 0;
  const due = balance > 0 ? balance : 0;

  const myTx = useMemo(() => transactions.filter(t => t.userId === appUser.id && (t.category || 'main') === list), [transactions, appUser.id, list]);
  const myMsgs = useMemo(() => messages.filter(m => m.recipients?.includes(appUser.id)), [messages, appUser.id]);
  const pubChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  const privChats = useMemo(() => chatMessages.filter(m => m.type === 'private' && (m.senderId === appUser.id || m.targetId === appUser.id)), [chatMessages, appUser.id]);

  const handlePay = (e) => { e.preventDefault(); const v = parseFloat(amount); if (!amount || isNaN(v) || v <= 0) return alert('Enter a valid amount'); reportPayment(amount, list, true); window.location.href = `upi://pay?pa=${upiId}&pn=SmartManager&am=${v.toFixed(2)}&cu=INR`; setIsPaying(false); setAmount(''); };
  const handleReport = (e) => { e.preventDefault(); reportPayment(payAmt, list); setIsReport(false); setPayAmt(''); };
  const handlePass = (e) => { e.preventDefault(); changePassword(newPass); setIsPassModal(false); setNewPass(''); };
  const isBday = () => { if (!appUser.birthday) return false; const t = new Date(), d = new Date(appUser.birthday); return t.getDate() === d.getDate() && t.getMonth() === d.getMonth(); };

  const balBg = isSavings ? 'linear-gradient(135deg, #052814, #064e3b)' : list === 'main' ? 'linear-gradient(135deg, #060620, #1e1060)' : 'linear-gradient(135deg, #1a0a00, #431407)';
  const balBorder = isSavings ? 'rgba(34,197,94,0.4)' : list === 'main' ? 'rgba(0,245,255,0.3)' : 'rgba(245,158,11,0.3)';
  const balGlow = isSavings ? '0 0 40px rgba(34,197,94,0.15)' : list === 'main' ? '0 0 40px rgba(0,245,255,0.12)' : '0 0 40px rgba(245,158,11,0.12)';
  const balLabel = isSavings ? C.green : list === 'main' ? C.cyan : C.amber;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #00f5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dashboard</h2>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Welcome, {appUser.name.split(' ')[0]}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsPassModal(true)} style={{ ...S.btnGhost({ padding: 10, display: 'flex' }) }}><Key size={17} /></button>
          <button onClick={handleLogout} style={{ ...S.btnGhost({ padding: 10, display: 'flex' }) }}><LogOut size={17} /></button>
        </div>
      </div>

      <Tabs tabs={[{ v: 'dashboard', label: 'Overview' }, { v: 'chat', label: 'Community' }]} active={tab} onChange={setTab} style={{ marginBottom: 20 }} />

      {tab === 'dashboard' && (
        <div>
          {isBday() && <div style={{ background: 'linear-gradient(135deg, #d946ef, #f59e0b)', borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 20, boxShadow: '0 0 40px rgba(217,70,239,0.3)', color: 'white' }}><Cake size={44} style={{ marginBottom: 8 }} /><h2 style={{ fontWeight: 800, fontSize: 22 }}>Happy Birthday! 🎉</h2></div>}
          {myMsgs.length > 0 && <div style={{ marginBottom: 20 }}>{myMsgs.map(m => <InvitationCard key={m.id} msg={m} onDiscuss={() => { setTab('chat'); setChatMode('public'); }} />)}</div>}

          <Tabs tabs={[{ v: 'main', label: 'Main', icon: <Briefcase size={13} /> }, { v: 'grocery', label: 'Grocery', icon: <ShoppingCart size={13} /> }]} active={list} onChange={setList} style={{ marginBottom: 16 }} />

          <div style={{ background: balBg, border: `1px solid ${balBorder}`, borderRadius: 22, padding: 28, marginBottom: 20, boxShadow: balGlow, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `${balBorder.slice(0, -4)},0.06)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: balLabel, marginBottom: 6 }}>{isSavings ? 'Total Savings' : 'Current Due'}</p>
              <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 20, color: 'white' }}>₹{Math.abs(balance).toFixed(2)}</h1>
              {balance > 0 && (list === 'main' || isGroceryEnabled) && <button onClick={() => { setAmount(due.toString()); setIsPaying(true); }} style={{ ...S.btnPrimary({ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }) }}><Smartphone size={17} />Pay Now via UPI</button>}
              {isSavings && <div style={{ background: 'rgba(34,197,94,0.15)', borderRadius: 11, padding: '9px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.green }}>✓ You are in credit!</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
            <History size={15} style={{ color: C.cyan }} />
            <h3 style={{ fontWeight: 700, fontSize: 15, color: C.text }}>History</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myTx.length > 0 ? myTx.map(tx => <TransactionItem key={tx.id} tx={tx} />) : <div style={{ textAlign: 'center', padding: 36, color: C.muted, border: `1px dashed rgba(255,255,255,0.1)`, borderRadius: 14, fontSize: 13 }}>No transactions yet.</div>}
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div>
          <Tabs tabs={[{ v: 'public', label: 'Public Group' }, { v: 'private', label: 'Admin Support' }]} active={chatMode} onChange={setChatMode} style={{ marginBottom: 14 }} />
          <ChatComponent messages={chatMode === 'public' ? pubChats : privChats} currentUserId={appUser.id} onSend={txt => sendChatMessage({ text: txt, type: chatMode, ...(chatMode === 'private' ? { targetId: 'admin' } : {}) })} placeholder="Type a message..." />
        </div>
      )}

      {isPaying && <Modal onClose={() => setIsPaying(false)} title="Pay via UPI"><p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Enter amount to open your UPI app.</p><form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}><NeonInput type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: 26, fontWeight: 800, padding: '16px' }} placeholder="0.00" autoFocus /><div style={{ display: 'flex', gap: 9 }}><button type="button" onClick={() => setIsPaying(false)} style={{ ...S.btnGhost({ flex: 1 }) }}>Cancel</button><button type="submit" style={{ ...S.btnPrimary({ flex: 1 }) }}>Pay</button></div></form><button onClick={() => { setIsPaying(false); setIsReport(true); setPayAmt(''); }} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.cyan, textDecoration: 'underline', fontFamily: 'inherit' }}>Paid cash? Manual report</button></Modal>}
      {isReport && <Modal onClose={() => setIsReport(false)} title="Manual Report"><form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}><NeonInput type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} style={{ fontSize: 26, fontWeight: 800, padding: '16px' }} placeholder="Amount paid" /><div style={{ display: 'flex', gap: 9 }}><button type="button" onClick={() => setIsReport(false)} style={{ ...S.btnGhost({ flex: 1 }) }}>Cancel</button><button type="submit" style={{ ...S.btnPrimary({ flex: 1 }) }}>Submit</button></div></form></Modal>}
      {isPassModal && <Modal onClose={() => setIsPassModal(false)} title="Change Password"><form onSubmit={handlePass} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}><NeonInput type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" /><div style={{ display: 'flex', gap: 9 }}><button type="button" onClick={() => setIsPassModal(false)} style={{ ...S.btnGhost({ flex: 1 }) }}>Cancel</button><button type="submit" style={{ ...S.btnPrimary({ flex: 1 }) }}>Save</button></div></form></Modal>}
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

  const genReminder = async () => { setIsGenAI(true); setShowReminder(true); const txt = await callGemini(`Polite WhatsApp reminder for ${member.name} to pay ₹${Math.abs(due).toFixed(2)} for ${list} dues. Friendly, under 50 words.`); setReminderText(txt); setIsGenAI(false); };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', background: C.bg, minHeight: '100vh' }}>
      <button onClick={() => { setSelectedMemberId(null); setView('dashboard'); }} style={{ ...S.btnGhost({ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, marginBottom: 22 }) }}><ArrowLeft size={15} />Back</button>

      <div style={S.card({ marginBottom: 22 })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}><Avatar name={member.name} size={52} /><div><h2 style={{ fontWeight: 800, fontSize: 20, color: C.text }}>{member.name}</h2><p style={{ color: C.muted, fontSize: 13 }}>@{member.username}</p></div></div>
          {appUser.role === 'admin' && due > 0 && <button onClick={genReminder} style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.3)', color: C.fuchsia, borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}><Sparkles size={12} />AI Draft</button>}
        </div>

        {showReminder && (
          <div style={{ marginBottom: 18, background: 'rgba(217,70,239,0.08)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 13, padding: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.fuchsia, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Draft</span>
              <button onClick={() => setShowReminder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', fontFamily: 'inherit' }}><X size={13} /></button>
            </div>
            {isGenAI ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.fuchsia }}><Loader size={13} style={{ animation: 'smSpin 1s linear infinite' }} />Generating...</div>
              : <div><NeonTextarea value={reminderText} onChange={e => setReminderText(e.target.value)} style={{ marginBottom: 9 }} /><button onClick={() => { navigator.clipboard.writeText(reminderText); alert('Copied!'); }} style={{ background: 'rgba(217,70,239,0.15)', border: '1px solid rgba(217,70,239,0.2)', color: C.fuchsia, borderRadius: 8, padding: '6px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Copy</button></div>}
          </div>
        )}

        <Tabs tabs={[{ v: 'main', label: 'Main', icon: <Briefcase size={12} /> }, { v: 'grocery', label: 'Grocery', icon: <ShoppingCart size={12} /> }]} active={list} onChange={setList} style={{ marginBottom: 14 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: due > 0 ? 'rgba(244,63,94,0.07)' : 'rgba(34,197,94,0.07)', borderRadius: 13, border: `1px solid ${due > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(34,197,94,0.2)'}`, marginBottom: 15 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Balance</span>
          <span style={{ fontWeight: 800, fontSize: 24, color: due > 0 ? C.red : C.green }}>₹{Math.abs(due).toFixed(2)}</span>
        </div>

        {appUser.role === 'admin' && (
          <form onSubmit={e => addTransaction(e, list)} style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <NeonInput type="number" step="0.01" placeholder="Amount" value={transactionForm.amount} onChange={e => setTransactionForm(p => ({ ...p, amount: e.target.value }))} style={{ flex: '2 1 100px' }} />
            <NeonSelect value={transactionForm.type} onChange={e => setTransactionForm(p => ({ ...p, type: e.target.value }))} style={{ flex: '1 1 110px' }}>
              <option value="due">Due</option>
              <option value="payment">Payment</option>
            </NeonSelect>
            <button type="submit" style={{ ...S.btnPrimary({ padding: '12px 22px', fontSize: 13 }) }}>Add</button>
          </form>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {filteredTx.length > 0 ? filteredTx.map(tx => <TransactionItem key={tx.id} tx={tx} onDelete={deleteTransaction} isAdmin={appUser.role === 'admin'} />) : <div style={{ textAlign: 'center', padding: 36, color: C.muted, border: `1px dashed rgba(255,255,255,0.1)`, borderRadius: 14, fontSize: 13 }}>No transactions for this category.</div>}
      </div>
    </div>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
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

  // Inject keyframes once
  useEffect(() => {
    const id = 'sm-kf';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes smSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes smFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes smSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(s);
  }, []);

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
    const u1 = onSnapshot(query(col(COL.USERS), orderBy('createdAt', 'asc')), s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, e => { setLoading(false); setError(e); });
    const u2 = onSnapshot(query(col(COL.TX), orderBy('date', 'desc')), s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(col(COL.MSGS), orderBy('createdAt', 'desc')), s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(col(COL.CHATS), orderBy('createdAt', 'asc')), s => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u5 = onSnapshot(dRef(COL.SETTINGS, 'config'), s => { if (s.exists()) { setUpiId(s.data().upiId || ''); setIsGroceryEnabled(s.data().isGroceryEnabled || false); } });
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [firebaseUser]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (users.length === 0) { addDoc(col(COL.USERS), { username: loginForm.username.trim().toLowerCase(), password: loginForm.password, name: 'Administrator', role: 'admin', createdAt: serverTimestamp() }).then(() => { alert('Admin created!'); setLoginForm({ username: '', password: '' }); }); return; }
    const input = loginForm.username.trim().toLowerCase().replace(/\s+/g, '');
    const u = users.find(u => (u.username || '').toLowerCase().replace(/\s+/g, '') === input && u.password === loginForm.password);
    if (u) { setAppUser(u); setView('dashboard'); setLoginForm({ username: '', password: '' }); } else alert('Invalid credentials.');
  };

  const createMember = () => { if (!newMemberForm.name || !newMemberForm.password) return alert('Name and password required'); addDoc(col(COL.USERS), { ...newMemberForm, username: newMemberForm.name.replace(/\s+/g, '').toLowerCase(), role: 'member', createdAt: serverTimestamp() }).then(() => { alert('Added!'); setNewMemberForm({ name: '', password: '', birthday: '' }); }); };
  const populateDefaults = () => { ['Animesh Shit', 'Kartick Sau', 'Indranil Paul', 'Soumen Giri', 'Soumyadeep Masanta'].forEach(name => { if (!users.some(u => u.name === name)) addDoc(col(COL.USERS), { username: name.replace(/\s+/g, '').toLowerCase(), password: '123', name, role: 'member', createdAt: serverTimestamp() }); }); alert('Defaults added!'); };
  const addTransaction = (e, cat) => { e.preventDefault(); const amt = parseFloat(transactionForm.amount); if (!amt || isNaN(amt) || amt <= 0) return alert('Enter valid amount'); addDoc(col(COL.TX), { userId: selectedMemberId, amount: amt, description: transactionForm.description || (transactionForm.type === 'due' ? 'Dues Added' : 'Payment'), type: transactionForm.type, category: cat, status: 'approved', date: new Date().toISOString(), createdAt: serverTimestamp(), createdBy: appUser.username }).then(() => setTransactionForm({ amount: '', description: '', type: 'due' })); };
  const reportPayment = (amt, cat, auto = false) => addDoc(col(COL.TX), { userId: appUser.id, amount: parseFloat(amt), description: auto ? 'App Payment' : 'Manual Report', type: 'payment', category: cat, status: 'pending', date: new Date().toISOString(), createdAt: serverTimestamp(), createdBy: appUser.username });
  const handleApproval = (id, ok) => ok ? updateDoc(dRef(COL.TX, id), { status: 'approved' }) : deleteDoc(dRef(COL.TX, id));
  const saveUpiId = () => setDoc(dRef(COL.SETTINGS, 'config'), { upiId, isGroceryEnabled }, { merge: true }).then(() => alert('Saved!'));
  const toggleGrocery = () => { const next = !isGroceryEnabled; setIsGroceryEnabled(next); setDoc(dRef(COL.SETTINGS, 'config'), { isGroceryEnabled: next }, { merge: true }); };
  const getMemberBalance = (uid, cat) => transactions.filter(t => t.userId === uid && (t.category || 'main') === cat && t.status === 'approved').reduce((acc, t) => t.type === 'due' ? acc + safeNum(t.amount) : acc - safeNum(t.amount), 0);
  const sendMessage = (data) => addDoc(col(COL.MSGS), { ...data, createdAt: serverTimestamp(), sender: appUser.username });
  const sendChatMessage = (data) => addDoc(col(COL.CHATS), { ...data, senderId: appUser.id, senderName: appUser.name, createdAt: serverTimestamp() });
  const changePassword = (p) => { if (!p) return alert('Enter a password'); updateDoc(dRef(COL.USERS, appUser.id), { password: p }).then(() => alert('Password changed!')); };
  const deleteTransaction = (id) => { if (window.confirm('Delete?')) deleteDoc(dRef(COL.TX, id)); };
  const logout = () => { setAppUser(null); setView('login'); };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <ConnectionStatus isOnline={isOnline} />
      {view === 'login' && <LoginView users={users} loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} isSubmitting={false} loadingState={loading} error={error} />}
      {view === 'dashboard' && appUser?.role === 'admin' && <AdminDashboard users={users} handleLogout={logout} upiId={upiId} setUpiId={setUpiId} saveUpiId={saveUpiId} newMemberForm={newMemberForm} setNewMemberForm={setNewMemberForm} createMember={createMember} populateDefaults={populateDefaults} getMemberBalance={getMemberBalance} setSelectedMemberId={setSelectedMemberId} setView={setView} transactions={transactions} sendMessage={sendMessage} isSubmitting={false} handleApproval={handleApproval} isGroceryEnabled={isGroceryEnabled} toggleGroceryPayment={toggleGrocery} chatMessages={chatMessages} sendChatMessage={sendChatMessage} appUser={appUser} />}
      {view === 'dashboard' && appUser?.role === 'member' && <MemberDashboard appUser={appUser} handleLogout={logout} getMemberBalance={getMemberBalance} transactions={transactions} upiId={upiId} changePassword={changePassword} messages={messages} reportPayment={reportPayment} isGroceryEnabled={isGroceryEnabled} chatMessages={chatMessages} sendChatMessage={sendChatMessage} />}
      {view === 'member-detail' && <MemberDetailView users={users} selectedMemberId={selectedMemberId} transactions={transactions} appUser={appUser} transactionForm={transactionForm} setTransactionForm={setTransactionForm} addTransaction={addTransaction} setSelectedMemberId={setSelectedMemberId} setView={setView} getMemberBalance={getMemberBalance} deleteTransaction={deleteTransaction} />}
    </div>
  );
};

export default App;
