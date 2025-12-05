import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DollarSign, Plus, Minus, LogOut, ShieldCheck, User, Calendar, Lock, 
  ArrowLeft, Smartphone, CreditCard, Save, UserPlus, History, QrCode, 
  X, Key, Mail, Bell, CheckSquare, Square, Send, Image as ImageIcon, 
  Trash2, Clock, ShoppingCart, Briefcase, TrendingUp, TrendingDown, 
  Gift, Cake, RefreshCw, AlertTriangle, Loader, Wifi, WifiOff, 
  CheckCircle, XCircle, MessageSquare, ExternalLink, ChevronRight, Sparkles, LayoutDashboard
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, orderBy, 
  serverTimestamp, doc, setDoc, updateDoc, deleteDoc, where 
} from 'firebase/firestore';

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCUFEEVL2b2MpOl9lFfpBzAyQn4HpTf05Q",
  authDomain: "smart-manager-b19f7.firebaseapp.com",
  projectId: "smart-manager-b19f7",
  storageBucket: "smart-manager-b19f7.firebasestorage.app",
  messagingSenderId: "460142501834",
  appId: "1:460142501834:web:7aa51d90c36167ac3d3933",
  measurementId: "G-D8EBTH9PJE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const apiKey = "AIzaSyArZC6itvjovGkS6FDfZRruk3sH2c5_Prc"; 

// Collections
const USERS_COLLECTION = 'dues_app_users';
const TRANSACTIONS_COLLECTION = 'dues_app_transactions';
const SETTINGS_COLLECTION = 'dues_app_settings';
const MESSAGES_COLLECTION = 'dues_app_messages';
const CHATS_COLLECTION = 'dues_app_chats';

// --- 2. HELPER FUNCTIONS ---

const callGemini = async (prompt) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate.";
  } catch (error) {
    return "AI Unavailable.";
  }
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

const formatDateSafe = (val) => {
  if (!val) return 'N/A';
  try {
    if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString();
    return new Date(val).toLocaleDateString();
  } catch (e) { return 'Invalid Date'; }
};

// Safe number parsing to prevent NaN
const safeNumber = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

// --- 3. SUB-COMPONENTS ---

const ConnectionStatus = ({ isOnline }) => (
  <div className={`fixed bottom-6 right-6 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold shadow-xl z-50 transition-all duration-500 ${isOnline ? 'bg-emerald-500 text-white translate-y-20 opacity-0 hover:translate-y-0 hover:opacity-100' : 'bg-rose-500 text-white translate-y-0 opacity-100'}`}>
    {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>} {isOnline ? 'Online' : 'Offline'}
  </div>
);

const ChatBubble = ({ msg, isOwn, senderName }) => {
  let timeString = '...';
  if (msg.createdAt && msg.createdAt.seconds) {
    timeString = new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  return (
    <div className={`flex flex-col mb-2 ${isOwn ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
      <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-sm ${
        isOwn 
          ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
          : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm'
      }`}>
        {!isOwn && <p className="text-[10px] font-bold text-indigo-500 mb-0.5 opacity-80">{String(senderName)}</p>}
        {String(msg.text)}
      </div>
      <span className="text-[9px] text-slate-300 mt-0.5 mx-1 font-medium">{timeString}</span>
    </div>
  );
};

const ChatComponent = ({ messages = [], currentUserId, onSend, placeholder }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="flex flex-col h-[60vh] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        {messages.length === 0 ? 
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={32} className="mb-2 opacity-20"/>
            <p className="text-sm">No messages yet</p>
          </div> : 
          messages.map(msg => <ChatBubble key={msg.id} msg={msg} isOwn={msg.senderId === currentUserId} senderName={msg.senderName} />)
        }
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="bg-white p-3 border-t border-slate-100 flex gap-2 items-center">
        <input 
          type="text" 
          className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
          placeholder={placeholder} 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
        />
        <button type="submit" className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

const TransactionItem = React.memo(({ tx, userName, onDelete, isAdmin }) => {
  const isPending = tx.status === 'pending';
  // Force number conversion
  const amount = safeNumber(tx.amount);

  return (
    <div className={`group flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm mb-2 ${isPending ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 hover:border-indigo-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-100 text-amber-600' : (tx.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}`}>
          {isPending ? <Clock size={16}/> : (tx.type === 'payment' ? <Plus size={16} /> : <Minus size={16} />)}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
             <p className="font-semibold text-sm text-slate-800">{String(tx.description || 'Transaction')}</p>
             {isPending && <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Pending</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
             <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
               (tx.category || 'main') === 'grocery' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'
             }`}>
               {(tx.category || 'main') === 'grocery' ? 'Grocery' : 'Main'}
             </span>
             <span>• {formatDateSafe(tx.date)}</span>
             <span>• {userName || 'System'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-bold text-sm ${isPending ? 'text-slate-400' : (tx.type === 'payment' ? 'text-emerald-600' : 'text-slate-800')}`}>
          {tx.type === 'payment' ? '+' : '-'} ₹{amount.toFixed(2)}
        </span>
        {isAdmin && onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} 
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Delete Transaction"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
});

const InvitationCard = ({ msg, onDiscuss }) => (
  <div className="bg-white rounded-[1.5rem] shadow-lg border border-slate-200 overflow-hidden mb-6 group hover:shadow-xl transition-all">
    {msg.imageUrl && (
      <div className="w-full bg-slate-50 border-b border-slate-100">
        <img src={msg.imageUrl} alt="Event Invitation" className="w-full h-auto block" />
      </div>
    )}
    <div className={`p-4 border-b border-slate-100 ${!msg.imageUrl ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-white text-slate-800'}`}>
        <h3 className="font-bold text-lg">{String(msg.title)}</h3>
        <p className={`text-xs flex items-center gap-1 mt-1 ${!msg.imageUrl ? 'text-indigo-100' : 'text-slate-500'}`}><Clock size={12}/> Event Date: {formatDateSafe(msg.eventDate)}</p>
    </div>
    <div className="p-4">
      <p className="text-slate-600 whitespace-pre-line text-sm leading-relaxed mb-3">{String(msg.description)}</p>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
         <span>Posted: {msg.createdAt ? formatDateSafe(new Date(msg.createdAt.seconds * 1000)) : 'Recently'}</span>
         {onDiscuss && (
           <button 
             onClick={onDiscuss} 
             className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-bold text-[10px] flex items-center gap-1 hover:bg-indigo-100 transition-colors"
           >
             <MessageSquare size={12}/> Discuss
           </button>
         )}
      </div>
    </div>
  </div>
);

// --- 5. DASHBOARD COMPONENTS ---

const LoginView = ({ users, loginForm, setLoginForm, handleLogin, isSubmitting, loadingState, error }) => {
  const [showRetry, setShowRetry] = useState(false);
  useEffect(() => { if (loadingState) setTimeout(() => setShowRetry(true), 8000); }, [loadingState]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 p-6">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-white/60 max-w-sm w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="text-center mb-8 mt-2">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200 transform -rotate-6">
            <DollarSign className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">SMART MANAGER</h1>
          <p className="text-slate-500 mt-2 text-sm">{loadingState ? "Secure Connection..." : (users.length === 0 ? "Create Admin Account" : "Member Login")}</p>
        </div>
        {error && <div className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-left text-xs text-rose-600 font-bold flex items-center gap-3"><AlertTriangle size={16} className="shrink-0"/><span>{error.message || String(error)}</span></div>}
        {loadingState ? (
           <div className="flex flex-col items-center justify-center py-8 space-y-4">
             <Loader className="animate-spin text-indigo-600" size={32}/>
             {showRetry && <button onClick={() => window.location.reload()} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-5 py-3 rounded-full hover:bg-indigo-100 flex items-center gap-2"><RefreshCw size={14}/> Reload App</button>}
           </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-4 text-slate-400"><User size={18} /></div>
                <input type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-400" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))} disabled={isSubmitting} autoCapitalize="none" />
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-4 text-slate-400"><Lock size={18} /></div>
                <input type="password" className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-400" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} disabled={isSubmitting} />
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:scale-100 mt-4">
              {isSubmitting ? <Loader className="animate-spin" size={20} /> : <><span className="text-lg">Sign In</span> <ArrowLeft className="rotate-180" size={20}/></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ 
  users, handleLogout, upiId, setUpiId, saveUpiId, newMemberForm, setNewMemberForm, createMember, 
  populateDefaults, getMemberBalance, setSelectedMemberId, setView, transactions, sendMessage, 
  isSubmitting, handleApproval, isGroceryEnabled, toggleGroceryPayment, chatMessages, sendChatMessage, appUser
}) => {
  const [activeTab, setActiveTab] = useState('members');
  const [msgForm, setMsgForm] = useState({ title: '', description: '', recipients: [], imageUrl: '', eventDate: '' });
  const [chatMode, setChatMode] = useState('public');
  const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const pendingApprovals = useMemo(() => transactions.filter(t => t.status === 'pending'), [transactions]);
  const publicChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  
  const privateChatUsers = useMemo(() => {
    if (!appUser) return [];
    const userIds = new Set();
    chatMessages.forEach(m => {
      if (m.type === 'private') {
         if (m.targetId === 'admin' || m.targetId === appUser.id) userIds.add(m.senderId);
         if (m.senderId === appUser.id) userIds.add(m.targetId);
      }
    });
    return Array.from(userIds)
      .map(uid => users.find(u => u.id === uid))
      .filter(u => u && u.id !== 'admin' && u.id !== appUser.id);
  }, [chatMessages, appUser, users]);
  
  const activePrivateChats = useMemo(() => {
      if (!selectedPrivateUser) return [];
      return chatMessages.filter(m => 
        m.type === 'private' && (
          (m.senderId === selectedPrivateUser.id && (m.targetId === 'admin' || m.targetId === appUser.id)) ||
          (m.senderId === appUser.id && m.targetId === selectedPrivateUser.id)
        )
      );
  }, [chatMessages, selectedPrivateUser, appUser]);

  const handleSendChat = (text) => {
    if (chatMode === 'public') sendChatMessage({ text, type: 'public' });
    else if (selectedPrivateUser) sendChatMessage({ text, type: 'private', targetId: selectedPrivateUser.id });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) return alert("File too big");
    try { const url = await compressImage(file); setMsgForm(prev => ({ ...prev, imageUrl: url })); } catch (e) { alert("Error"); }
  };

  const handleAIGenerate = async () => {
    if (!msgForm.title) return alert("Please enter Title");
    setIsGeneratingAI(true);
    const text = await callGemini(`Write short invitation: ${msgForm.title}`);
    setMsgForm(prev => ({ ...prev, description: text }));
    setIsGeneratingAI(false);
  };

  const toggleRecipient = (userId) => {
    if (msgForm.recipients.includes(userId)) setMsgForm(prev => ({ ...prev, recipients: prev.recipients.filter(id => id !== userId) }));
    else setMsgForm(prev => ({ ...prev, recipients: [...prev.recipients, userId] }));
  };
  const toggleSelectAll = () => {
    const memberIds = users.filter(u => u.role !== 'admin').map(u => u.id);
    if (msgForm.recipients.length === memberIds.length) setMsgForm(prev => ({ ...prev, recipients: [] }));
    else setMsgForm(prev => ({ ...prev, recipients: memberIds }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 pt-6">
      <div className="bg-slate-900 text-white p-6 rounded-[2rem] mb-8 shadow-2xl shadow-slate-500/20 border border-slate-800">
        <div className="flex justify-between mb-6">
          <div className="flex items-center gap-3"><ShieldCheck className="text-indigo-400 w-8 h-8" /><div><h2 className="text-xl font-bold">Admin</h2><p className="text-sm opacity-70">Smart Manager</p></div></div>
          <button onClick={handleLogout}><LogOut size={20} /></button>
        </div>
        <div className="flex gap-4 border-b border-slate-700 pb-1 overflow-x-auto text-sm no-scrollbar">
          {['members', 'messages', 'approvals', 'history', 'events'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-2 font-bold capitalize whitespace-nowrap border-b-2 transition-all ${activeTab === tab ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>{tab} {tab === 'approvals' && pendingApprovals.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] ml-1">{pendingApprovals.length}</span>}</button>
          ))}
        </div>
      </div>

      {activeTab === 'approvals' && (
        <div className="space-y-3">
           {pendingApprovals.length === 0 ? <p className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200">No pending approvals.</p> : pendingApprovals.map(tx => (
              <div key={tx.id} className="bg-white p-4 rounded-xl border-l-4 border-yellow-400 shadow-sm flex justify-between items-center animate-in fade-in">
                 <div><p className="font-bold">{users.find(u=>u.id===tx.userId)?.name}</p><p className="text-xs text-slate-500">{tx.category} Payment</p></div>
                 <div className="flex gap-2 items-center"><span className="font-bold text-lg">₹{safeNumber(tx.amount).toFixed(2)}</span><button onClick={() => handleApproval(tx.id, false)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X size={18}/></button><button onClick={() => handleApproval(tx.id, true)} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckCircle size={18}/></button></div>
              </div>
           ))}
        </div>
      )}
      
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><CreditCard size={14}/> Payment Control</h3>
             <div className="flex gap-2 mb-4"><input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="UPI ID" className="flex-1 border p-2 rounded text-sm"/><button onClick={saveUpiId} className="bg-green-600 text-white px-4 rounded text-sm font-bold">Save</button></div>
             <div className="flex justify-between items-center bg-slate-50 p-3 rounded border"><div className="text-sm font-bold text-slate-700">Grocery Payments</div><button onClick={toggleGroceryPayment} className={`w-10 h-6 rounded-full relative transition-colors ${isGroceryEnabled ? 'bg-green-500' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGroceryEnabled ? 'translate-x-5' : 'translate-x-1'}`} /></button></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Add New Member</h3>
            <div className="flex flex-col md:flex-row gap-2">
              <input className="border p-2 rounded flex-1" placeholder="Name" value={newMemberForm.name} onChange={e => setNewMemberForm({...newMemberForm, name: e.target.value})} />
              <input type="date" className="border p-2 rounded" value={newMemberForm.birthday} onChange={e => setNewMemberForm({...newMemberForm, birthday: e.target.value})} />
              <input className="border p-2 rounded w-32" placeholder="Pass" value={newMemberForm.password} onChange={e => setNewMemberForm({...newMemberForm, password: e.target.value})} />
              <button onClick={createMember} disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">Add</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {users.filter(u => u.role !== 'admin').map(m => (
              <div key={m.id} onClick={() => { setSelectedMemberId(m.id); setView('member-detail'); }} className="bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:border-blue-400 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center"><div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">{m.name ? m.name.charAt(0) : '?'}</div><div><p className="font-bold">{m.name}</p><p className="text-xs text-slate-500">@{m.username}</p></div></div>
                  <div className="text-right text-xs">
                    <div className="text-blue-600 font-bold">Main: ₹{safeNumber(getMemberBalance(m.id, 'main')).toFixed(2)}</div>
                    <div className="text-orange-600 font-bold">Groc: ₹{safeNumber(getMemberBalance(m.id, 'grocery')).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
           <h3 className="font-bold mb-4">Compose Invitation</h3>
           <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Title" value={msgForm.title} onChange={e => setMsgForm({...msgForm, title: e.target.value})} /><input type="date" className="border p-2 rounded" value={msgForm.eventDate} onChange={e => setMsgForm({...msgForm, eventDate: e.target.value})} /></div>
              <div className="border-2 border-dashed p-6 text-center cursor-pointer relative hover:bg-slate-50"><input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={handleImageUpload} />{msgForm.imageUrl ? <img src={msgForm.imageUrl} className="h-32 mx-auto rounded" /> : <div className="flex flex-col items-center text-slate-400"><ImageIcon/><span className="text-xs mt-1">Tap to upload</span></div>}</div>
              <textarea className="border p-2 rounded w-full h-24" placeholder="Details..." value={msgForm.description} onChange={e => setMsgForm({...msgForm, description: e.target.value})} />
              <div className="bg-slate-50 p-4 rounded border"><div className="flex justify-between mb-2 text-sm font-bold"><span>Recipients</span><button onClick={toggleSelectAll} className="text-blue-600">All</button></div><div className="grid grid-cols-2 gap-2 h-32 overflow-y-auto">{users.filter(u=>u.role!=='admin').map(u=><div key={u.id} onClick={()=>toggleRecipient(u.id)} className={`cursor-pointer text-xs p-2 rounded border flex gap-2 items-center transition-colors ${msgForm.recipients.includes(u.id)?'bg-blue-100 border-blue-400 text-blue-700':'bg-white hover:bg-slate-100'}`}>{msgForm.recipients.includes(u.id)?<CheckSquare size={14}/>:<Square size={14}/>} {u.name}</div>)}</div></div>
              <button onClick={(e) => { e.preventDefault(); sendMessage(msgForm); setMsgForm({title:'', description:'', recipients:[], imageUrl:'', eventDate:''}); alert("Sent"); }} className="w-full bg-blue-600 text-white py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-blue-700"><Send size={16}/> Send Invitation</button>
           </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-sm h-[500px] flex overflow-hidden border border-slate-200">
           <div className="w-1/3 border-r bg-slate-50 p-2 overflow-y-auto">
              <div className="flex gap-1 mb-2"><button onClick={() => { setChatMode('public'); setSelectedPrivateUser(null); }} className={`flex-1 py-2 text-xs font-bold rounded ${chatMode==='public'?'bg-white shadow text-blue-600':'text-slate-500'}`}>Public</button><button onClick={() => setChatMode('private')} className={`flex-1 py-2 text-xs font-bold rounded ${chatMode==='private'?'bg-white shadow text-blue-600':'text-slate-500'}`}>Private</button></div>
              {chatMode === 'private' && privateChatUsers.map(u => (
                <div key={u.id} onClick={() => setSelectedPrivateUser(u)} className={`p-2 rounded cursor-pointer text-sm mb-1 flex items-center gap-2 ${selectedPrivateUser?.id === u.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'}`}>
                  <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold">{u.name ? u.name[0] : '?'}</div> {u.name}
                </div>
              ))}
              {chatMode === 'private' && privateChatUsers.length === 0 && <p className="text-center text-xs text-slate-400 mt-4">No chats yet</p>}
           </div>
           <div className="flex-1 p-0 flex flex-col bg-white">
              <div className="p-3 font-bold border-b bg-slate-50 text-slate-700 flex items-center gap-2">
                {chatMode === 'public' ? <><User size={16}/> Public Group</> : (selectedPrivateUser ? <><User size={16}/> {selectedPrivateUser.name}</> : "Select a user")}
              </div>
              <div className="flex-1 overflow-hidden p-2">
                <ChatComponent messages={chatMode === 'public' ? publicChats : activePrivateChats} currentUserId={appUser.id} onSend={handleSendChat} placeholder="Type a message..." />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const MemberDashboard = ({ appUser, handleLogout, getMemberBalance, transactions, upiId, changePassword, messages, reportPayment, isGroceryEnabled, chatMessages, sendChatMessage }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeList, setActiveList] = useState('main');
  const [isPaying, setIsPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [chatMode, setChatMode] = useState('public');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const balance = getMemberBalance(appUser.id, activeList);
  const isSavings = balance < 0;
  const currentDue = balance > 0 ? balance : 0;
  
  // Memoize
  const myTx = useMemo(() => transactions.filter(t => t.userId === appUser.id && (t.category || 'main') === activeList), [transactions, appUser.id, activeList]);
  const myMessages = useMemo(() => messages.filter(m => m.recipients && m.recipients.includes(appUser.id)), [messages, appUser.id]);
  const publicChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  const privateChats = useMemo(() => chatMessages.filter(m => m.type === 'private' && (m.senderId === appUser.id || m.targetId === appUser.id)), [chatMessages, appUser.id]);

  const handlePay = (e) => { 
    e.preventDefault(); 
    const payVal = parseFloat(amount);
    if(!amount || isNaN(payVal) || payVal <= 0) return alert("Invalid amount");
    reportPayment(amount, activeList, true); 
    window.location.href = `upi://pay?pa=${upiId}&pn=SmartManager&am=${payVal.toFixed(2)}&cu=INR`;
    setIsPaying(false); 
    setAmount(''); 
  };

  const handleReportPayment = (e) => { e.preventDefault(); reportPayment(payAmount, activeList); setIsReporting(false); setPayAmount(''); };
  const handleSubmitPass = (e) => { e.preventDefault(); changePassword(newPass); setIsChangingPass(false); };

  const isBirthdayToday = () => { if (!appUser.birthday) return false; const today = new Date(); const dob = new Date(appUser.birthday); return today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth(); };

  return (
    <div className="max-w-md mx-auto pb-24 px-6 pt-8">
      <div className="flex justify-between items-center mb-8">
         <div><h2 className="text-3xl font-black text-slate-800">Dashboard</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Welcome, {appUser.name.split(' ')[0]}</p></div>
         <div className="flex gap-3"><button onClick={() => setIsChangingPass(true)} className="p-3.5 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-indigo-600 transition-all shadow-sm"><Key size={20} /></button><button onClick={handleLogout} className="p-3.5 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-rose-600 transition-all shadow-sm"><LogOut size={20} /></button></div>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 relative shadow-inner">
         <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 font-bold text-sm rounded-xl transition-colors ${activeTab==='dashboard'?'bg-white shadow-sm text-slate-800':'text-slate-400'}`}>Overview</button>
         <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 font-bold text-sm rounded-xl transition-colors ${activeTab==='chat'?'bg-white shadow-sm text-slate-800':'text-slate-400'}`}>Community</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isBirthdayToday() && <div className="mb-8 bg-gradient-to-r from-pink-500 to-rose-500 p-8 rounded-[2rem] shadow-xl shadow-pink-500/30 text-white text-center animate-pulse"><Cake size={56} className="mx-auto mb-3"/><h2 className="text-3xl font-black">Happy Birthday! 🎉</h2></div>}
          
          {myMessages.length > 0 && <div className="mb-8 space-y-6">{myMessages.map(msg => <InvitationCard key={msg.id} msg={msg} onDiscuss={() => {setActiveTab('chat'); setChatMode('public');}} />)}</div>}
          
          <div className="flex gap-4 mb-5 overflow-x-auto pb-2 no-scrollbar">
             <button onClick={() => setActiveList('main')} className={`flex-1 py-4 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${activeList==='main'?'bg-indigo-600 border-indigo-600 text-white shadow-lg':'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}><Briefcase size={18}/> Main</button>
             <button onClick={() => setActiveList('grocery')} className={`flex-1 py-4 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${activeList==='grocery'?'bg-orange-500 border-orange-500 text-white shadow-lg':'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}><ShoppingCart size={18}/> Grocery</button>
          </div>

          <div className={`p-8 rounded-[2.5rem] shadow-2xl mb-10 text-white transition-all duration-500 relative overflow-hidden ${isSavings ? 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-200' : (activeList==='main'?'bg-gradient-to-br from-indigo-600 to-purple-800 shadow-indigo-200':'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-200')}`}>
             <div className="relative z-10">
                <p className="opacity-80 text-sm font-medium mb-1">{isSavings ? 'Total Savings' : 'Current Due'}</p>
                <h1 className="text-5xl font-black mb-8 tracking-tighter">₹{Math.abs(balance).toFixed(2)}</h1>
                {balance > 0 && (activeList === 'main' || isGroceryEnabled) && <button onClick={() => {setAmount(currentDue); setIsPaying('app');}} className="w-full bg-white text-slate-900 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-lg"><Smartphone size={20}/> Pay Now</button>}
                {isSavings && <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl text-center font-medium text-sm">You are in credit!</div>}
             </div>
          </div>

          {/* Payment Modal */}
          {isPaying && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in">
                  <h3 className="font-bold mb-2 text-xl">Pay via UPI</h3>
                  <p className="text-sm text-slate-500 mb-4">Enter amount to launch your UPI app.</p>
                  <form onSubmit={handlePay}>
                    <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full border p-4 rounded-xl mb-4 text-xl font-bold" placeholder="Amount" autoFocus />
                    <div className="flex gap-2"><button type="button" onClick={()=>setIsPaying(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">Cancel</button><button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Pay</button></div>
                  </form>
                  <button onClick={()=>{setIsPaying(false); setIsReporting(true); setPayAmount('');}} className="w-full mt-4 text-xs text-blue-600 underline">Paid cash? Manual Report</button>
              </div>
            </div>
          )}
          {isReporting && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl"><h3 className="font-bold mb-2 text-xl">Manual Report</h3><input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} className="w-full border p-4 rounded-xl mb-4 text-xl font-bold" placeholder="Amount" /><div className="flex gap-2"><button onClick={()=>setIsReporting(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">Cancel</button><button onClick={handleReportPayment} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Submit</button></div></div></div>}
          
          {isChangingPass && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl"><h3 className="font-bold mb-4 text-xl">Change Password</h3><input type="text" value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full border p-4 rounded-xl mb-4" placeholder="New Password" /><div className="flex gap-2"><button onClick={()=>setIsChangingPass(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">Cancel</button><button onClick={handleSubmitPass} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Save</button></div></div></div>}
          
          <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={18}/> History</h3><button onClick={()=>{setIsChangingPass(true); setNewPass('');}} className="text-xs text-slate-400 flex items-center gap-1"><Key size={12}/> Change Pass</button></div>
          <div className="space-y-3 pb-10">{myTx.length > 0 ? myTx.map(tx => <TransactionItem key={tx.id} tx={tx} />) : <p className="text-center py-8 text-slate-400">No transactions.</p>}</div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="h-[70vh] flex flex-col">
           <div className="flex bg-slate-100 p-1 rounded-xl mb-4"><button onClick={()=>setChatMode('public')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chatMode==='public'?'bg-white shadow text-indigo-600':'text-slate-500'}`}>Public Group</button><button onClick={()=>setChatMode('private')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chatMode==='private'?'bg-white shadow text-indigo-600':'text-slate-500'}`}>Admin Support</button></div>
           <ChatComponent messages={chatMode==='public'?publicChats:privateChats} currentUserId={appUser.id} onSend={(txt) => sendChatMessage({ text: txt, type: chatMode, ...(chatMode==='private'?{targetId:'admin'}:{}) })} placeholder="Type a message..." />
        </div>
      )}
    </div>
  );
};

const MemberDetailView = ({ users, selectedMemberId, transactions, appUser, transactionForm, setTransactionForm, addTransaction, setSelectedMemberId, setView, getMemberBalance, deleteTransaction }) => {
  const member = users.find(u => u.id === selectedMemberId);
  const [list, setList] = useState('main');
  const [showReminder, setShowReminder] = useState(false);
  const [reminderText, setReminderText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Safe number helper
  const safeNumber = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  if (!member) return null;
  const filteredTx = transactions.filter(t => t.userId === member.id && (t.category||'main')===list);
  const currentDue = getMemberBalance(member.id, list);

  const generateReminder = async () => { setIsGeneratingAI(true); setShowReminder(true); const text = await callGemini(`Reminder for ${member.name}: Pay ₹${Math.abs(currentDue)} ${list} due.`); setReminderText(text); setIsGeneratingAI(false); };

  return (
    <div className="max-w-2xl mx-auto pb-20 p-4 pt-6">
      <button onClick={() => { setSelectedMemberId(null); setView('dashboard'); }} className="mb-6 flex items-center gap-2 text-slate-500 font-bold bg-white px-4 py-2 rounded-full shadow-sm w-fit"><ArrowLeft size={20} /> Back</button>
      
      <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100 mb-8">
         <div className="flex justify-between items-start mb-6"><div><h2 className="text-3xl font-bold text-slate-800">{member.name}</h2><p className="text-slate-500">@{member.username}</p></div>{appUser.role === 'admin' && currentDue > 0 && <button onClick={generateReminder} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1"><Sparkles size={12}/> Draft</button>}</div>
         
         {showReminder && (
            <div className="mt-4 bg-purple-50 border border-purple-100 p-4 rounded-2xl animate-in fade-in">
               <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-purple-800">AI Draft</span><button onClick={() => setShowReminder(false)}><X size={14} className="text-purple-400"/></button></div>
               {isGeneratingAI ? <div className="flex items-center gap-2 text-xs text-purple-600"><Loader className="animate-spin" size={12}/> Generating...</div> : (
                 <div><textarea className="w-full p-3 text-sm border-none rounded-xl bg-white/50 text-slate-700 h-20 mb-2 outline-none" value={reminderText} onChange={(e)=>setReminderText(e.target.value)} /><button onClick={() => {navigator.clipboard.writeText(reminderText); alert("Copied!");}} className="text-xs bg-white border border-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1 text-purple-700 font-bold hover:bg-purple-50 shadow-sm">Copy</button></div>
               )}
            </div>
         )}

         <div className="flex bg-slate-50 p-1.5 rounded-xl mb-6"><button onClick={() => setList('main')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${list==='main'?'bg-white text-indigo-600 shadow-md':'text-slate-500'}`}>Main</button><button onClick={() => setList('grocery')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${list==='grocery'?'bg-white text-orange-600 shadow-md':'text-slate-500'}`}>Grocery</button></div>
         <p className="text-2xl font-bold text-right mb-4">₹{Math.abs(currentDue).toFixed(2)}</p>
         {appUser.role === 'admin' && (
           <form onSubmit={(e) => addTransaction(e, list)} className="flex gap-3"><input type="number" step="0.01" className="bg-slate-50 p-4 rounded-2xl flex-1 font-bold" placeholder="Amount" value={transactionForm.amount} onChange={e=>setTransactionForm(prev=>({...prev, amount:e.target.value}))} /><select className="bg-slate-50 p-4 rounded-2xl font-bold" value={transactionForm.type} onChange={e=>setTransactionForm(prev=>({...prev, type:e.target.value}))}><option value="due">Due</option><option value="payment">Pay</option></select><button className="bg-indigo-600 text-white px-6 rounded-2xl font-bold">Add</button></form>
         )}
      </div>
      <div className="space-y-3">{filteredTx.length > 0 ? filteredTx.map(tx => <TransactionItem key={tx.id} tx={tx} onDelete={deleteTransaction} isAdmin={appUser.role === 'admin'} />) : <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-medium">No transactions found.</div>}</div>
    </div>
  );
};

// --- APP ---
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newMemberForm, setNewMemberForm] = useState({ name: '', password: '', birthday: '' });
  const [transactionForm, setTransactionForm] = useState({ amount: '', description: '', type: 'due' });

  // Safe number helper
  const safeNumber = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    if (!firebaseConfig) { setError({ message: "Config Missing" }); setLoading(false); return; }
    const init = async () => { try { if (typeof __initial_auth_token !== 'undefined') await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); } catch (e) { setError(e); setLoading(false); } };
    init();
    return onAuthStateChanged(auth, u => { setFirebaseUser(u); if (!u) setLoading(false); });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub1 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), orderBy('createdAt', 'asc')), s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, e => { setLoading(false); setError(e); });
    const unsub2 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', TRANSACTIONS_COLLECTION), orderBy('date', 'desc')), s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', MESSAGES_COLLECTION), orderBy('createdAt', 'desc')), s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub4 = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', CHATS_COLLECTION), orderBy('createdAt', 'asc')), s => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub5 = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', SETTINGS_COLLECTION, 'config'), s => { if(s.exists()) { setUpiId(s.data().upiId||''); setIsGroceryEnabled(s.data().isGroceryEnabled||false); }});
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [firebaseUser]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (users.length === 0) {
       addDoc(collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), { username: loginForm.username, password: loginForm.password, name: "Administrator", role: 'admin', createdAt: serverTimestamp() }).then(() => {alert("Admin created!"); setLoginForm({username:'', password:''});});
       return;
    }
    const inputUser = loginForm.username.trim().toLowerCase().replace(/\s+/g, '');
    const user = users.find(u => (u.username||'').toLowerCase().replace(/\s+/g, '') === inputUser && u.password === loginForm.password);
    if (user) { setAppUser(user); setView('dashboard'); setLoginForm({username:'', password:''}); } else { alert("Invalid credentials"); }
  };

  const createMember = () => addDoc(collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), { ...newMemberForm, username: newMemberForm.name.replace(/\s+/g, '').toLowerCase(), role: 'member', createdAt: serverTimestamp() }).then(() => { alert("Added"); setNewMemberForm({name:'', password:'', birthday:''}); });
  const populateDefaults = () => { ["Animesh Shit", "Kartick Sau", "Indranil Paul", "Soumen Giri", "Soumyadeep Masanta"].forEach(name => { if (!users.some(u => u.name === name)) addDoc(collection(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION), { username: name.replace(/\s+/g, '').toLowerCase(), password: "123", name, role: 'member', createdAt: serverTimestamp() }); }); alert("Defaults added"); };
  const addTransaction = (e, cat) => { e.preventDefault(); addDoc(collection(db, 'artifacts', appId, 'public', 'data', TRANSACTIONS_COLLECTION), { userId: selectedMemberId, amount: parseFloat(transactionForm.amount), description: transactionForm.description, type: transactionForm.type, category: cat, status: 'approved', date: new Date().toISOString(), createdAt: serverTimestamp(), createdBy: appUser.username }).then(() => setTransactionForm({amount:'', description:'', type:'due'})); };
  const reportPayment = (amt, cat, auto=false) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', TRANSACTIONS_COLLECTION), { userId: appUser.id, amount: parseFloat(amt), description: auto?'App Payment':'Manual Report', type: 'payment', category: cat, status: 'pending', date: new Date().toISOString(), createdAt: serverTimestamp(), createdBy: appUser.username });
  const handleApproval = (id, approved) => approved ? updateDoc(doc(db, 'artifacts', appId, 'public', 'data', TRANSACTIONS_COLLECTION, id), { status: 'approved' }) : deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', TRANSACTIONS_COLLECTION, id));
  const saveUpiId = () => setDoc(doc(db, 'artifacts', appId, 'public', 'data', SETTINGS_COLLECTION, 'config'), { upiId, isGroceryEnabled }, { merge: true }).then(()=>alert("Saved"));
  const toggleGroceryPayment = () => { setIsGroceryEnabled(!isGroceryEnabled); setDoc(doc(db, 'artifacts', appId, 'public', 'data', SETTINGS_COLLECTION, 'config'), { isGroceryEnabled: !isGroceryEnabled }, { merge: true }); };
  const getMemberBalance = (uid, cat) => transactions.filter(t => t.userId === uid && (t.category||'main')===cat && t.status==='approved').reduce((acc, t) => t.type==='due' ? acc+safeNumber(t.amount) : acc-safeNumber(t.amount), 0);
  const sendMessage = (data) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', MESSAGES_COLLECTION), { ...data, createdAt: serverTimestamp(), sender: appUser.username });
  const sendChatMessage = (data) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', CHATS_COLLECTION), { ...data, senderId: appUser.id, senderName: appUser.name, createdAt: serverTimestamp() });
  const changePassword = (pass) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', USERS_COLLECTION, appUser.id), { password: pass }).then(()=>alert("Changed"));
  const deleteTransaction = (id) => { if(window.confirm("Delete?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', TRANSACTIONS_COLLECTION, id)); };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 font-sans">
      <ConnectionStatus isOnline={isOnline} />
      {view === 'login' && <LoginView users={users} loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} isSubmitting={isSubmitting} firebaseUser={firebaseUser} loadingState={loading} error={error} />}
      {view === 'dashboard' && appUser?.role === 'admin' && <AdminDashboard users={users} handleLogout={() => setView('login')} upiId={upiId} setUpiId={setUpiId} saveUpiId={saveUpiId} newMemberForm={newMemberForm} setNewMemberForm={setNewMemberForm} createMember={createMember} populateDefaults={populateDefaults} getMemberBalance={getMemberBalance} setSelectedMemberId={setSelectedMemberId} setView={setView} transactions={transactions} sendMessage={sendMessage} isSubmitting={isSubmitting} handleApproval={handleApproval} isGroceryEnabled={isGroceryEnabled} toggleGroceryPayment={toggleGroceryPayment} chatMessages={chatMessages} sendChatMessage={sendChatMessage} appUser={appUser} />}
      {view === 'dashboard' && appUser?.role === 'member' && <MemberDashboard appUser={appUser} handleLogout={() => setView('login')} getMemberBalance={getMemberBalance} transactions={transactions} upiId={upiId} changePassword={changePassword} messages={messages} reportPayment={reportPayment} isGroceryEnabled={isGroceryEnabled} chatMessages={chatMessages} sendChatMessage={sendChatMessage} />}
      {view === 'member-detail' && <MemberDetailView users={users} selectedMemberId={selectedMemberId} transactions={transactions} appUser={appUser} transactionForm={transactionForm} setTransactionForm={setTransactionForm} addTransaction={addTransaction} setSelectedMemberId={setSelectedMemberId} setView={setView} getMemberBalance={getMemberBalance} deleteTransaction={deleteTransaction} />}
    </div>
  );
};

export default App;
