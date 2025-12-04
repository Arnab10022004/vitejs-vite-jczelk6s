import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DollarSign, Plus, Minus, LogOut, ShieldCheck, User, Calendar, Lock, 
  ArrowLeft, Smartphone, CreditCard, Save, UserPlus, History, QrCode, 
  X, Key, Mail, Bell, CheckSquare, Square, Send, Image as ImageIcon, 
  Trash2, Clock, ShoppingCart, Briefcase, TrendingUp, TrendingDown, 
  Gift, Cake, RefreshCw, AlertTriangle, Loader, Wifi, WifiOff, 
  CheckCircle, XCircle, MessageSquare, ExternalLink
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
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
// Your web app's Firebase configuration
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
// We wrap this in a try-catch block to prevent crashes if config is invalid
let app, auth, db, analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // Analytics is optional and may fail in some environments, so we handle it safely
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

const appId = 'smart-manager-app'; // Fixed App ID for your deployment

// --- 2. CONSTANTS & COLLECTIONS ---
const USERS_COLLECTION = 'dues_app_users';
const TRANSACTIONS_COLLECTION = 'dues_app_transactions';
const SETTINGS_COLLECTION = 'dues_app_settings';
const MESSAGES_COLLECTION = 'dues_app_messages';
const CHATS_COLLECTION = 'dues_app_chats';

// --- 3. HELPER FUNCTIONS ---

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

const formatDateSafe = (isoString) => {
  if (!isoString) return 'Date N/A';
  try { return new Date(isoString).toLocaleDateString(); } catch (e) { return 'Invalid'; }
};

// --- 4. SUB-COMPONENTS ---

const ConnectionStatus = ({ isOnline }) => (
  <div className={`fixed bottom-4 right-4 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold shadow-lg z-50 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
    {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>} {isOnline ? 'Online' : 'Offline'}
  </div>
);

const ChatBubble = ({ msg, isOwn, senderName }) => {
  const timeString = msg.createdAt?.seconds 
    ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    : '...';

  return (
    <div className={`flex flex-col mb-2 ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && <span className="text-[10px] text-slate-400 mb-0.5 ml-1">{senderName}</span>}
      <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-sm ${isOwn ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
        {msg.text}
      </div>
      <span className="text-[9px] text-slate-300 mt-0.5 mx-1">{timeString}</span>
    </div>
  );
};

const ChatComponent = ({ messages, currentUserId, onSend, placeholder }) => {
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
    <div className="flex flex-col h-[60vh] md:h-[500px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        {messages.length === 0 ? <div className="text-center text-slate-400 mt-10 text-sm">No messages yet.</div> : 
          messages.map(msg => <ChatBubble key={msg.id} msg={msg} isOwn={msg.senderId === currentUserId} senderName={msg.senderName} />)
        }
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="bg-white p-3 border-t border-slate-200 flex gap-2">
        <input type="text" className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"><Send size={18} /></button>
      </form>
    </div>
  );
};

const TransactionItem = React.memo(({ tx, userName, onDelete, isAdmin }) => {
  const isPending = tx.status === 'pending';
  return (
    <div className={`flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm mb-2 ${isPending ? 'border-yellow-200 bg-yellow-50/50' : 'border-slate-100'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPending ? 'bg-yellow-100 text-yellow-600' : (tx.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}`}>
          {isPending ? <Clock size={16}/> : (tx.type === 'payment' ? <Plus size={16} /> : <Minus size={16} />)}
        </div>
        <div>
          <div className="flex items-center gap-2">
             <p className="font-semibold text-sm text-slate-800">{tx.description || 'Transaction'}</p>
             <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${(tx.category || 'main') === 'grocery' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{(tx.category || 'main') === 'grocery' ? 'Grocery' : 'Main'}</span>
             {isPending && <span className="bg-yellow-100 text-yellow-700 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">Pending</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5"><Calendar size={10} /> {formatDateSafe(tx.date)} &bull; {userName || 'System'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-bold text-sm ${isPending ? 'text-slate-400' : (tx.type === 'payment' ? 'text-emerald-600' : 'text-rose-600')}`}>{tx.type === 'payment' ? '-' : '+'} ₹{Number(tx.amount || 0).toFixed(2)}</span>
        {isAdmin && onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} 
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
});

const InvitationCard = ({ msg, onDiscuss }) => (
  <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-6">
    <div className={`p-4 border-b border-slate-100 ${!msg.imageUrl ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-white text-slate-800'}`}>
        <h3 className="font-bold text-lg">{msg.title}</h3>
        <p className={`text-xs flex items-center gap-1 mt-1 ${!msg.imageUrl ? 'text-indigo-100' : 'text-slate-500'}`}><Clock size={12}/> Event Date: {formatDateSafe(msg.eventDate)}</p>
    </div>
    {msg.imageUrl && <div className="w-full bg-slate-50 border-b border-slate-100"><img src={msg.imageUrl} alt="Event" className="w-full h-auto block" /></div>}
    <div className="p-4">
      <p className="text-slate-600 whitespace-pre-line text-sm leading-relaxed mb-3">{msg.description}</p>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
         <span>Posted: {msg.createdAt ? formatDateSafe(new Date(msg.createdAt.seconds * 1000)) : 'Recently'}</span>
         {onDiscuss && <button onClick={onDiscuss} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-bold text-[10px] flex items-center gap-1 hover:bg-indigo-100 transition-colors"><MessageSquare size={12}/> Discuss</button>}
      </div>
    </div>
  </div>
);

// --- 5. MAIN VIEW COMPONENTS ---

const LoginView = ({ users, loginForm, setLoginForm, handleLogin, isSubmitting, loadingState, error }) => {
  const [showRetry, setShowRetry] = useState(false);
  
  useEffect(() => {
    let timer;
    if (loadingState) {
      timer = setTimeout(() => setShowRetry(true), 8000); 
    }
    return () => clearTimeout(timer);
  }, [loadingState]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><DollarSign className="text-white w-8 h-8" /></div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">SMART MANAGER</h1>
          <p className="text-slate-500 mt-2 text-sm">{loadingState ? "Secure Connection..." : (users.length === 0 ? "Create Admin Account" : "Member Login")}</p>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-lg text-left text-xs text-red-600 font-bold flex items-center gap-2"><AlertTriangle size={16}/>{error.message || "Connection failed"}</div>}
        {loadingState ? (
           <div className="flex flex-col items-center justify-center py-8">
             <Loader className="animate-spin text-blue-600 mb-2" size={32}/>
             {showRetry && <button onClick={() => window.location.reload()} className="mt-4 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1"><RefreshCw size={12}/> Tap to Retry</button>}
           </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))} disabled={isSubmitting} autoCapitalize="none" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="password" className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} disabled={isSubmitting} />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:scale-100">
              {isSubmitting ? <Loader className="animate-spin" size={18} /> : "Login"}
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

  // Memoize heavy filters
  const pendingApprovals = useMemo(() => transactions.filter(t => t.status === 'pending'), [transactions]);
  const publicChats = useMemo(() => chatMessages.filter(m => m.type === 'public'), [chatMessages]);
  
  const privateChatUsers = useMemo(() => {
    const userIds = new Set(
      chatMessages.filter(m => m.type === 'private')
      .map(m => m.senderId === appUser.id ? m.targetId : m.senderId)
    );
    return Array.from(userIds)
      .map(uid => users.find(u => u.id === uid))
      .filter(u => u && u.id !== 'admin' && u.id !== appUser.id);
  }, [chatMessages, appUser.id, users]);
  
  const activePrivateChats = selectedPrivateUser 
    ? chatMessages.filter(m => m.type === 'private' && (m.senderId === selectedPrivateUser.id || m.targetId === selectedPrivateUser.id)) 
    : [];

  const handleSendChat = (text) => {
    if (chatMode === 'public') sendChatMessage({ text, type: 'public' });
    else if (selectedPrivateUser) sendChatMessage({ text, type: 'private', targetId: selectedPrivateUser.id });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) return alert("File too big");
    try { const url = await compressImage(file); setMsgForm(prev => ({ ...prev, imageUrl: url })); } catch (e) { alert("Error"); }
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
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8 shadow-xl">
        <div className="flex justify-between mb-6">
          <div className="flex items-center gap-3"><ShieldCheck className="text-blue-400 w-8 h-8" /><div><h2 className="text-xl font-bold">Admin</h2><p className="text-sm opacity-70">Smart Manager</p></div></div>
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
                 <div className="flex gap-2 items-center"><span className="font-bold text-lg">₹{tx.amount}</span><button onClick={() => handleApproval(tx.id, false)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X size={18}/></button><button onClick={() => handleApproval(tx.id, true)} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckCircle size={18}/></button></div>
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
                    <div className="text-blue-600 font-bold">Main: ₹{getMemberBalance(m.id, 'main')}</div>
                    <div className="text-orange-600 font-bold">Groc: ₹{getMemberBalance(m.id, 'grocery')}</div>
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
           </div>
           <div className="flex-1 p-0 flex flex-col bg-white">
              <div className="p-3 font-bold border-b bg-slate-50 text-slate-700 flex items-center gap-2">
                {chatMode === 'public' ? <><Users size={16}/> Public Group</> : (selectedPrivateUser ? <><User size={16}/> {selectedPrivateUser.name}</> : "Select a user")}
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
    if(!amount || amount <= 0) return alert("Invalid amount");
    reportPayment(amount, activeList, true); 
    window.location.href = `upi://pay?pa=${upiId}&pn=SmartManager&am=${parseFloat(amount).toFixed(2)}&cu=INR`;
    setIsPaying(false); 
    setAmount(''); 
  };

  const handleReportPayment = (e) => { e.preventDefault(); reportPayment(amount, activeList); setIsPaying(false); setAmount(''); };
  const handleSubmitPass = (e) => { e.preventDefault(); changePassword(amount); setIsPaying(false); };

  const isBirthdayToday = () => { if (!appUser.birthday) return false; const today = new Date(); const dob = new Date(appUser.birthday); return today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth(); };

  return (
    <div className="max-w-md mx-auto pb-24">
      <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">My Dashboard</h2><button onClick={handleLogout}><LogOut className="text-slate-400"/></button></div>
      <div className="flex border-b mb-4"><button onClick={() => setActiveTab('dashboard')} className={`flex-1 pb-2 font-bold ${activeTab==='dashboard'?'text-blue-600 border-b-2 border-blue-600':'text-slate-400'}`}>Overview</button><button onClick={() => setActiveTab('chat')} className={`flex-1 pb-2 font-bold ${activeTab==='chat'?'text-blue-600 border-b-2 border-blue-600':'text-slate-400'}`}>Community</button></div>

      {activeTab === 'dashboard' && (
        <>
          {isBirthdayToday() && <div className="mb-6 bg-pink-500 p-6 rounded-2xl shadow-xl text-white text-center animate-pulse"><Cake size={48} className="mx-auto mb-2"/><h2 className="text-2xl font-bold">Happy Birthday! 🎉</h2></div>}
          {myMessages.length > 0 && <div className="mb-6 space-y-4">{myMessages.map(msg => <InvitationCard key={msg.id} msg={msg} onDiscuss={() => {setActiveTab('chat'); setChatMode('public');}} />)}</div>}
          <div className="flex bg-slate-200 p-1 rounded-xl mb-4"><button onClick={() => setActiveList('main')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeList==='main'?'bg-white text-blue-700 shadow':''}`}>Main</button><button onClick={() => setActiveList('grocery')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeList==='grocery'?'bg-white text-orange-600 shadow':''}`}>Grocery</button></div>
          <div className={`p-6 rounded-2xl shadow-lg mb-6 text-white transition-colors duration-500 ${isSavings ? 'bg-emerald-600' : (activeList==='main'?'bg-blue-600':'bg-orange-600')}`}>
             <p className="opacity-80 text-sm">Balance</p><h1 className="text-4xl font-bold">₹{Math.abs(balance).toFixed(2)}</h1><p className="text-sm opacity-80">{balance < 0 ? 'Savings' : 'Due'}</p>
             {balance > 0 && (activeList === 'main' || isGroceryEnabled) && <button onClick={() => {setAmount(currentDue); setIsPaying('app');}} className="mt-4 bg-white text-slate-900 px-4 py-2 rounded font-bold w-full flex items-center justify-center gap-2 hover:bg-opacity-90"><Smartphone size={16}/> Pay Now</button>}
          </div>
          {isPaying && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in">
                  <h3 className="font-bold mb-2 text-lg">{isPaying === 'app' ? "Pay via UPI" : (isPaying === 'manual' ? "Manual Report" : "Change Password")}</h3>
                  {isPaying !== 'pass' && <p className="text-sm text-slate-500 mb-4">{isPaying === 'app' ? "Enter amount to open your UPI app." : "Tell admin you paid cash."}</p>}
                  <form onSubmit={isPaying === 'app' ? handlePay : (isPaying === 'manual' ? handleReportPayment : handleSubmitPass)}>
                    <input type={isPaying === 'pass' ? 'text' : 'number'} value={amount} onChange={e=>setAmount(e.target.value)} className="border p-3 w-full rounded-lg mb-4 text-lg font-medium" placeholder={isPaying==='pass'?"New Password":"₹ Amount"} autoFocus />
                    <div className="flex gap-2"><button type="button" onClick={()=>setIsPaying(false)} className="flex-1 bg-slate-100 py-3 rounded-lg font-bold text-slate-600">Cancel</button><button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold">{isPaying === 'app' ? "Pay" : "Submit"}</button></div>
                  </form>
                  {isPaying === 'app' && <button onClick={()=>{setIsPaying('manual'); setAmount('');}} className="w-full mt-4 text-xs text-blue-600 underline">Paid cash? Manual Report</button>}
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={18}/> History</h3><button onClick={()=>{setIsPaying('pass'); setAmount('');}} className="text-xs text-slate-400 flex items-center gap-1"><Key size={12}/> Change Pass</button></div>
          <div className="space-y-2">{myTx.length > 0 ? myTx.map(tx => <TransactionItem key={tx.id} tx={tx} />) : <p className="text-center py-8 text-slate-400">No transactions.</p>}</div>
        </>
      )}

      {activeTab === 'chat' && (
        <div className="h-[70vh] flex flex-col">
           <div className="flex bg-slate-100 p-1 rounded mb-2"><button onClick={()=>setChatMode('public')} className={`flex-1 py-1 text-xs font-bold rounded ${chatMode==='public'?'bg-white shadow':''}`}>Public Group</button><button onClick={()=>setChatMode('private')} className={`flex-1 py-1 text-xs font-bold rounded ${chatMode==='private'?'bg-white shadow':''}`}>Admin Support</button></div>
           <ChatComponent messages={chatMode==='public'?publicChats:privateChats} currentUserId={appUser.id} onSend={(txt) => sendChatMessage({ text: txt, type: chatMode, ...(chatMode==='private'?{targetId:'admin'}:{}) })} placeholder="Type a message..." />
        </div>
      )}
    </div>
  );
};

const MemberDetailView = ({ users, selectedMemberId, transactions, appUser, transactionForm, setTransactionForm, addTransaction, setSelectedMemberId, setView, getMemberBalance, deleteTransaction }) => {
  const member = users.find(u => u.id === selectedMemberId);
  const [list, setList] = useState('main');
  if (!member) return null;
  const filteredTx = transactions.filter(t => t.userId === member.id && (t.category||'main')===list);
  return (
    <div className="max-w-2xl mx-auto pb-20">
      <button onClick={() => { setSelectedMemberId(null); setView('dashboard'); }} className="mb-4 flex items-center gap-2 text-slate-500"><ArrowLeft size={20} /> Back</button>
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
         <h2 className="text-2xl font-bold">{member.name}</h2><p className="text-slate-500 text-sm">@{member.username}</p>
         <div className="flex bg-slate-100 p-1 rounded mt-4 mb-4"><button onClick={() => setList('main')} className={`flex-1 py-1 text-sm font-bold rounded ${list==='main'?'bg-white shadow':''}`}>Main</button><button onClick={() => setList('grocery')} className={`flex-1 py-1 text-sm font-bold rounded ${list==='grocery'?'bg-white shadow':''}`}>Grocery</button></div>
         <p className="text-2xl font-bold text-right mb-4">₹{Math.abs(getMemberBalance(member.id, list)).toFixed(2)} <span className="text-sm font-normal text-slate-500">{getMemberBalance(member.id, list) < 0 ? 'Savings' : 'Due'}</span></p>
         {appUser.role === 'admin' && (
           <form onSubmit={(e) => addTransaction(e, list)} className="flex gap-2"><input type="number" step="0.01" className="border p-2 rounded flex-1" placeholder="Amount" value={transactionForm.amount} onChange={e=>setTransactionForm(prev=>({...prev, amount:e.target.value}))} /><input className="border p-2 rounded flex-1" placeholder="Desc" value={transactionForm.description} onChange={e=>setTransactionForm(prev=>({...prev, description:e.target.value}))} /><select className="border p-2 rounded" value={transactionForm.type} onChange={e=>setTransactionForm(prev=>({...prev, type:e.target.value}))}><option value="due">Due</option><option value="payment">Pay</option></select><button className="bg-blue-600 text-white px-4 rounded font-bold">Add</button></form>
         )}
      </div>
      <div className="space-y-2">{filteredTx.length > 0 ? filteredTx.map(tx => <TransactionItem key={tx.id} tx={tx} onDelete={deleteTransaction} isAdmin={appUser.role === 'admin'} />) : <p className="text-center text-slate-400">No data</p>}</div>
    </div>
  );
};

// --- APP COMPONENT ---
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

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    if (!firebaseConfig) { setError({ message: "Config Missing" }); setLoading(false); return; }
    
    const init = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (e) { setError(e); setLoading(false); }
    };
    init();
    const unsubAuth = onAuthStateChanged(auth, u => { setFirebaseUser(u); if (!u) setLoading(false); });
    return () => unsubAuth();
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
  const getMemberBalance = (uid, cat) => transactions.filter(t => t.userId === uid && (t.category||'main')===cat && t.status==='approved').reduce((acc, t) => t.type==='due' ? acc+t.amount : acc-t.amount, 0);
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