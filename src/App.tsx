import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Server, Settings, Info, Bell, Search, User, Play, 
  ExternalLink, Signal, Users, X, Copy, Check, ChevronRight, 
  Gamepad2, Package, ShoppingCart, Wallet, Shield, Crosshair, 
  Download, CheckCircle2, Star, Zap, Trophy, LogOut, MessageSquare, Target, Send, Trash2, Database,
  Mic, MicOff, Megaphone, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, getDoc, serverTimestamp, query, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';

// Types
interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: any;
}

interface ServerType {
  id: string;
  name: string;
  ip: string;
  players: number;
  maxPlayers: number;
  ping: number;
  map: string;
  gamemode: string;
  status: string;
  version: string;
  image: string;
}

interface NewsItem {
  id: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  image: string;
}

interface ModItem {
  id: string;
  name: string;
  size: string;
  desc: string;
  iconName: string;
}

interface ShopItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  iconName: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  coins: number;
  lwCoins?: number;
  exp?: number;
  level: number;
  role: string;
  discordUsername?: string;
  faction?: string;
  factionId?: string;
  lastLoginDate?: string;
  lastCheckIn?: string;
  streak?: number;
  inventory?: string[];
  chatColor?: string;
  lastSpinDate?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  role?: string;
  faction?: string;
  channel?: string;
  chatColor?: string;
  createdAt: any;
}

interface VoiceRoom {
  id: string;
  name: string;
  createdBy: string;
  participants: string[];
  maxParticipants: number;
  isPrivate: boolean;
  password?: string;
}

interface Faction {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  members: string[];
  description: string;
  logo?: string;
}

interface NotificationItem {
  id: string;
  uid: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
}

const CURRENT_VERSION = "v1.1.0";

const getIcon = (name: string, className?: string) => {
  const props = { size: 24, className };
  switch (name) {
    case 'Crosshair': return <Crosshair {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'Package': return <Package {...props} />;
    case 'Users': return <Users {...props} />;
    case 'Star': return <Star {...props} />;
    case 'Wallet': return <Wallet {...props} />;
    case 'Gamepad2': return <Gamepad2 {...props} />;
    default: return <Package {...props} />;
  }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth UI State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'home' | 'servers' | 'mods' | 'shop' | 'profile' | 'settings' | 'chat' | 'admin' | 'leaderboard' | 'voice' | 'factions'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<ServerType | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(() => localStorage.getItem('samp_autoupdate') === 'true');
  
  const [appConfig, setAppConfig] = useState<any>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  const [showServerModal, setShowServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [newServerData, setNewServerData] = useState<Partial<Server>>({ name: '', ip: '', maxPlayers: 1000, gamemode: 'Roleplay', status: 'online' });

  const [showModModal, setShowModModal] = useState(false);
  const [editingMod, setEditingMod] = useState<Mod | null>(null);
  const [newModData, setNewModData] = useState<Partial<Mod>>({ name: '', size: '', desc: '', iconName: 'Package', category: 'Other' });

  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<ShopItem | null>(null);
  const [newShopItemData, setNewShopItemData] = useState<Partial<ShopItem>>({ name: '', price: 0, desc: '', iconName: 'Star' });

  // Voice Party State
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [voiceRoomId, setVoiceRoomId] = useState<string | null>(null);
  const [joinVoiceId, setJoinVoiceId] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showCreateVoiceModal, setShowCreateVoiceModal] = useState(false);
  const [newVoiceRoomData, setNewVoiceRoomData] = useState<Partial<VoiceRoom>>({ name: '', maxParticipants: 3, isPrivate: false });

  // Factions State
  const [factions, setFactions] = useState<Faction[]>([]);
  const [showCreateFactionModal, setShowCreateFactionModal] = useState(false);
  const [newFactionData, setNewFactionData] = useState<Partial<Faction>>({ name: '', tag: '', description: '' });

  const [servers, setServers] = useState<ServerType[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [mods, setMods] = useState<ModItem[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatChannel, setChatChannel] = useState<'global' | 'faction'>('global');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const [installedMods, setInstalledMods] = useState<string[]>(() => {
    const saved = localStorage.getItem('samp_installed_mods');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLinkingDiscord, setIsLinkingDiscord] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authMode === 'register') {
        if (password !== confirmPassword) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }
        if (!displayName.trim()) {
          throw new Error("Vui lòng nhập tên nhân vật.");
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName });
        
        // Create profile in Firestore
        const userRef = doc(db, 'users', userCred.user.uid);
        await setDoc(userRef, {
          uid: userCred.user.uid,
          displayName: displayName,
          email: userCred.user.email,
          photoURL: '',
          coins: 0,
          level: 1,
          role: userCred.user.email === 'tminhquyen41@gmail.com' ? 'admin' : 'user',
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setAuthError('Email này đã được sử dụng.');
      else if (err.code === 'auth/invalid-credential') setAuthError('Email hoặc mật khẩu không đúng.');
      else if (err.code === 'auth/weak-password') setAuthError('Mật khẩu quá yếu (ít nhất 6 ký tự).');
      else setAuthError(err.message || "Đã xảy ra lỗi xác thực.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Player_Liberty',
            email: currentUser.email,
            photoURL: currentUser.photoURL || '',
            coins: 0,
            level: 1,
            role: currentUser.email === 'tminhquyen41@gmail.com' ? 'admin' : 'user',
            createdAt: serverTimestamp()
          };
          await setDoc(userRef, newProfile);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubAnnouncements = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });

    const unsubServers = onSnapshot(collection(db, 'servers'), (snapshot) => {
      setServers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServerType)));
    });

    const unsubNews = onSnapshot(query(collection(db, 'news'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem)));
    });

    const unsubMods = onSnapshot(collection(db, 'mods'), (snapshot) => {
      setMods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModItem)));
    });

    const unsubShop = onSnapshot(collection(db, 'shop'), (snapshot) => {
      setShopItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopItem)));
    });

    const unsubVoiceRooms = onSnapshot(collection(db, 'voiceRooms'), (snapshot) => {
      setVoiceRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoiceRoom)));
    });

    const unsubFactions = onSnapshot(collection(db, 'factions'), (snapshot) => {
      setFactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Faction)));
    });

    const currentChannel = chatChannel === 'faction' && profile?.faction ? profile.faction : 'global';
    const unsubMessages = onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(50)), (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(allMessages.filter(m => (m.channel || 'global') === currentChannel));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const unsubLeaderboard = onSnapshot(query(collection(db, 'users'), orderBy('coins', 'desc'), limit(10)), (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    const unsubConfig = onSnapshot(doc(db, 'appConfig', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppConfig(data);
        if (data.latestVersion && data.latestVersion !== CURRENT_VERSION) {
          const dismissedVersion = sessionStorage.getItem('dismissedUpdate');
          if (dismissedVersion !== data.latestVersion) {
            setShowUpdatePrompt(true);
          }
        }
      }
    });

    let unsubProfile = () => {};
    let unsubNotifs = () => {};
    if (user) {
      unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);

          // Daily Login Rewards Logic
          const today = new Date().toISOString().split('T')[0];
          if (data.lastLoginDate !== today) {
            let newStreak = (data.streak || 0) + 1;
            if (data.lastLoginDate) {
              const lastDate = new Date(data.lastLoginDate);
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              if (lastDate.toISOString().split('T')[0] !== yesterday.toISOString().split('T')[0]) {
                newStreak = 1; // Reset streak if missed a day
              }
            }
            
            const reward = newStreak >= 7 ? 100 : 10;
            
            setDoc(docSnap.ref, {
              lastLoginDate: today,
              streak: newStreak,
              coins: (data.coins || 0) + reward
            }, { merge: true });
            
            // Add notification
            addDoc(collection(db, 'notifications'), {
              uid: user.uid,
              title: 'Điểm danh hàng ngày',
              body: `Bạn nhận được ${reward} LW Coins cho chuỗi đăng nhập ${newStreak} ngày!`,
              read: false,
              createdAt: serverTimestamp()
            });
          }
        }
      });

      unsubNotifs = onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationItem));
        setNotifications(notifs.filter(n => n.uid === user.uid));
      });
    }

    return () => {
      unsubAnnouncements();
      unsubServers();
      unsubNews();
      unsubMods();
      unsubShop();
      unsubVoiceRooms();
      unsubFactions();
      unsubMessages();
      unsubLeaderboard();
      unsubConfig();
      unsubProfile();
      unsubNotifs();
    };
  }, [isAuthReady, user, chatChannel, profile?.faction]);

  // Save settings automatically
  useEffect(() => {
    localStorage.setItem('samp_autoupdate', String(autoUpdate));
    localStorage.setItem('samp_installed_mods', JSON.stringify(installedMods));
  }, [autoUpdate, installedMods]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleConnect = (server: ServerType) => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      let msg = `Connecting to ${server.name} (${server.ip}) as ${profile?.displayName}...\n\n(Game intent launched)`;
      if (profile?.discordUsername) {
        msg += `\n\n[Discord Bot] Đã cấp Role "🟢 Đang chơi" cho ${profile.discordUsername}`;
      }
      alert(msg);
    }, 1500);
  };

  const handleLinkDiscord = async () => {
    if (!user) return;
    setIsLinkingDiscord(true);
    setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          discordUsername: 'GamerLiberty'
        }, { merge: true });
        alert('Đã liên kết Discord thành công! Bot sẽ tự động cập nhật trạng thái của bạn khi vào game.');
      } catch (error) {
        console.error(error);
      } finally {
        setIsLinkingDiscord(false);
      }
    }, 1500);
  };

  const handleUnlinkDiscord = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        discordUsername: null
      }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  };

  // --- VOICE PARTY LOGIC ---
  const startVoiceParty = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setVoiceRoomId(newRoomId);
    } catch (e) {
      alert("Không thể truy cập Micro! Vui lòng cấp quyền.");
    }
  };

  const joinVoiceParty = async () => {
    if (!joinVoiceId.trim()) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      setVoiceRoomId(joinVoiceId.toUpperCase());
    } catch (e) {
      alert("Không thể truy cập Micro! Vui lòng cấp quyền.");
    }
  };

  const leaveVoiceParty = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setVoiceRoomId(null);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        author: profile?.displayName || 'Admin',
        createdAt: serverTimestamp()
      });
      setShowAddAnnouncement(false);
      setNewAnnouncement({ title: '', content: '' });
    } catch (e) {
      console.error("Error adding announcement:", e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa thông báo này?")) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (e) {
        console.error("Error deleting announcement:", e);
      }
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa Khu Phố này?")) {
      try {
        await deleteDoc(doc(db, 'servers', id));
      } catch (e) {
        console.error("Error deleting server:", e);
      }
    }
  };

  const handleDeleteMod = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa vật phẩm Chợ Đen này?")) {
      try {
        await deleteDoc(doc(db, 'mods', id));
      } catch (e) {
        console.error("Error deleting mod:", e);
      }
    }
  };

  const handleDeleteShopItem = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa vật phẩm Cửa Hàng này?")) {
      try {
        await deleteDoc(doc(db, 'shop', id));
      } catch (e) {
        console.error("Error deleting shop item:", e);
      }
    }
  };

  const handleSaveServer = async () => {
    if (!newServerData.name || !newServerData.ip) return;
    try {
      if (editingServer) {
        await updateDoc(doc(db, 'servers', editingServer.id), {
          ...newServerData
        });
      } else {
        await addDoc(collection(db, 'servers'), {
          ...newServerData,
          players: 0,
          ping: 0,
          createdAt: serverTimestamp()
        });
      }
      setShowServerModal(false);
      setEditingServer(null);
      setNewServerData({ name: '', ip: '', maxPlayers: 1000, gamemode: 'Roleplay', status: 'online' });
    } catch (e) {
      console.error("Error saving server:", e);
    }
  };

  const handleSaveMod = async () => {
    if (!newModData.name || !newModData.desc) return;
    try {
      if (editingMod) {
        await updateDoc(doc(db, 'mods', editingMod.id), {
          ...newModData
        });
      } else {
        await addDoc(collection(db, 'mods'), {
          ...newModData,
          createdAt: serverTimestamp()
        });
      }
      setShowModModal(false);
      setEditingMod(null);
      setNewModData({ name: '', size: '', desc: '', iconName: 'Package', category: 'Other' });
    } catch (e) {
      console.error("Error saving mod:", e);
    }
  };

  const handleSaveShopItem = async () => {
    if (!newShopItemData.name || newShopItemData.price === undefined) return;
    try {
      if (editingShopItem) {
        await updateDoc(doc(db, 'shop', editingShopItem.id), {
          ...newShopItemData
        });
      } else {
        await addDoc(collection(db, 'shop'), {
          ...newShopItemData,
          createdAt: serverTimestamp()
        });
      }
      setShowShopModal(false);
      setEditingShopItem(null);
      setNewShopItemData({ name: '', price: 0, desc: '', iconName: 'Star' });
    } catch (e) {
      console.error("Error saving shop item:", e);
    }
  };

  const handleBuyItem = async (item: ShopItem) => {
    if (!profile) return;
    if ((profile.lwCoins || 0) < item.price) {
      alert("Bạn không đủ LW Coins để mua vật phẩm này!");
      return;
    }
    
    if (window.confirm(`Xác nhận mua ${item.name} với giá ${item.price} LW Coins?`)) {
      try {
        const newCoins = (profile.lwCoins || 0) - item.price;
        const newInventory = [...(profile.inventory || []), item.id];
        
        await setDoc(doc(db, 'users', profile.uid), { 
          lwCoins: newCoins,
          inventory: newInventory
        }, { merge: true });
        
        alert(`Đã mua thành công ${item.name}!`);
      } catch (error) {
        console.error("Lỗi khi mua vật phẩm:", error);
        alert("Có lỗi xảy ra khi mua hàng.");
      }
    }
  };

  // --- END VOICE PARTY LOGIC ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !profile) return;
    
    const text = chatInput.trim();
    setChatInput('');
    
    try {
      await addDoc(collection(db, 'messages'), {
        text,
        uid: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        role: profile.role || 'user',
        faction: profile.faction || null,
        channel: chatChannel === 'faction' && profile.faction ? profile.faction : 'global',
        chatColor: profile.chatColor || null,
        createdAt: serverTimestamp()
      });

      // Add EXP for chatting
      const newExp = (profile.exp || 0) + 10;
      const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;
      await setDoc(doc(db, 'users', user.uid), { exp: newExp, level: newLevel }, { merge: true });

    } catch (error) {
      console.error("Error sending message", error);
      alert("Không thể gửi tin nhắn.");
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (profile?.role !== 'admin' && profile?.role !== 'leader') return;
    if (window.confirm('Xóa tin nhắn này?')) {
      try {
        await deleteDoc(doc(db, 'messages', msgId));
      } catch (error) {
        console.error("Error deleting message", error);
      }
    }
  };

  const toggleMod = (id: string) => {
    if (installedMods.includes(id)) {
      setInstalledMods(installedMods.filter(mId => mId !== id));
    } else {
      setInstalledMods([...installedMods, id]);
    }
  };

  const seedData = async () => {
    if (!profile || profile.role !== 'admin') {
      alert("Only admins can seed data.");
      return;
    }
    try {
      const s1 = doc(collection(db, 'servers'));
      await setDoc(s1, {
        name: 'Liberty World | Roleplay #1',
        ip: 'play.libertyworld.vn:7777',
        players: 850,
        maxPlayers: 1000,
        ping: 15,
        map: 'San Andreas',
        gamemode: 'Roleplay',
        status: 'online',
        version: '0.3.7-R4',
        image: 'https://storage.googleapis.com/macaulay-api-storage-dir/uploads/1743604488339-1743604488339.png',
        createdAt: serverTimestamp()
      });

      const n1 = doc(collection(db, 'news'));
      await setDoc(n1, {
        title: 'Update 3.0: The Heist',
        date: '2026-04-02',
        summary: 'New bank robbery mechanics, advanced police tracking, and new vehicles added to the dealership.',
        category: 'Update',
        image: 'https://picsum.photos/seed/news1/600/300',
        createdAt: serverTimestamp()
      });

      const m1 = doc(collection(db, 'mods'));
      await setDoc(m1, {
        name: 'HD Weapons Pack',
        size: '45 MB',
        desc: 'High quality weapon models and sounds.',
        iconName: 'Crosshair',
        createdAt: serverTimestamp()
      });

      const sh1 = doc(collection(db, 'shop'));
      await setDoc(sh1, {
        name: 'VIP Gold (30 Days)',
        price: 200,
        desc: 'Double EXP, Custom Name Color, Premium Kit',
        iconName: 'Star',
        createdAt: serverTimestamp()
      });

      alert("Seed data completed!");
    } catch (error) {
      console.error("Seed error", error);
      alert("Seed failed. See console.");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex h-screen bg-bg-dark items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-bg-dark items-center justify-center p-4 overflow-y-auto">
        <div className="bg-bg-card p-6 md:p-8 rounded-3xl border border-white/10 max-w-md w-full text-center shadow-2xl my-auto">
          <div className="w-16 h-16 bg-brand-primary rounded-2xl mx-auto flex items-center justify-center neon-glow mb-4">
            <Gamepad2 className="text-white w-8 h-8" />
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">Liberty World</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {authMode === 'login' ? 'Đăng nhập để vào máy chủ' : 'Tạo tài khoản công dân mới'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-4 text-left">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left mb-6">
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Tên nhân vật (In-game Name)</label>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-bg-dark border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-primary/50 text-white"
                  placeholder="Firstname_Lastname"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-bg-dark border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-primary/50 text-white"
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">Mật khẩu</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-bg-dark border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-primary/50 text-white"
                placeholder="••••••••"
              />
            </div>
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Xác nhận mật khẩu</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-bg-dark border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-primary/50 text-white"
                  placeholder="••••••••"
                />
              </div>
            )}
            
            <button 
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {isAuthLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (authMode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
            </button>
          </form>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">HOẶC</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            type="button"
            onClick={async () => {
              setAuthError('');
              setIsAuthLoading(true);
              try {
                await loginWithGoogle();
              } catch (err: any) {
                setAuthError(err.message || "Google login failed");
              } finally {
                setIsAuthLoading(false);
              }
            }}
            disabled={isAuthLoading}
            className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-3 disabled:opacity-70 mb-6"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <p className="text-sm text-gray-400">
            {authMode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button 
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }} 
              className="text-brand-primary hover:underline font-bold"
            >
              {authMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.ip.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-bg-dark overflow-hidden font-sans text-white selection:bg-brand-primary/30">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-bg-card border-r border-white/5 flex-col transition-all duration-300 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center neon-glow">
            <Gamepad2 className="text-white w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight">LIBERTY WORLD</span>
            <span className="block text-[10px] text-brand-primary font-bold">MOBILE EDITION</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<LayoutGrid size={20} />} label="Home" />
          <NavItem active={activeTab === 'servers'} onClick={() => setActiveTab('servers')} icon={<Server size={20} />} label="Khu Phố" />
          <NavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={20} />} label="Global Chat" />
          <NavItem active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={20} />} label="Leaderboard" />
          <NavItem active={activeTab === 'mods'} onClick={() => setActiveTab('mods')} icon={<Package size={20} />} label="Chợ Đen" />
          <NavItem active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} icon={<ShoppingCart size={20} />} label="Store" />
          <NavItem active={activeTab === 'factions'} onClick={() => setActiveTab('factions')} icon={<Users size={20} />} label="Bang Hội" />
          <NavItem active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} icon={<Mic size={20} />} label="Voice Party" />
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Profile" />
          <div className="pt-4 mt-4 border-t border-white/5">
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Settings" />
            {(profile?.role === 'admin' || profile?.role === 'leader') && (
              <NavItem active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Shield size={20} className={profile?.role === 'admin' ? "text-red-400" : "text-yellow-400"} />} label="Quản trị" />
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-blue-400 flex items-center justify-center shadow-lg overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium truncate">{profile?.displayName}</p>
              <p className="text-xs text-brand-primary font-semibold">Level {profile?.level || 1} • {profile?.role === 'admin' ? 'Admin' : profile?.role === 'leader' ? 'Leader' : 'VIP'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden pb-16 md:pb-0">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 bg-bg-dark/80 backdrop-blur-xl z-20 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center neon-glow">
              <Gamepad2 className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">LIBERTY</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNotifications(true)} className="p-2 text-gray-400 hover:text-white relative">
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full"></span>
              )}
            </button>
            <button onClick={() => setActiveTab('settings')} className="p-2 text-gray-400 hover:text-white">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* DESKTOP HEADER */}
        <header className="hidden md:flex h-20 border-b border-white/5 items-center justify-between px-8 bg-bg-dark/50 backdrop-blur-xl z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search servers, mods, items..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-brand-primary/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNotifications(true)} className="p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-bg-dark"></span>
              )}
            </button>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <button 
              onClick={() => servers.length > 0 && handleConnect(servers[0])}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition-all neon-glow active:scale-95"
            >
              <Play size={18} className="fill-current" />
              Quick Play
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            
            {/* HOME TAB */}
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 md:space-y-10">
                
                {/* Mobile Quick Play Banner */}
                <div className="md:hidden bg-gradient-to-r from-brand-primary/20 to-blue-500/20 border border-brand-primary/30 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">Ready to play?</h3>
                    <p className="text-xs text-gray-400">Join Liberty World now</p>
                  </div>
                  <button onClick={() => servers.length > 0 && handleConnect(servers[0])} className="bg-brand-primary text-white w-12 h-12 rounded-full flex items-center justify-center neon-glow active:scale-90 transition-transform">
                    <Play size={20} className="fill-current ml-1" />
                  </button>
                </div>

                {/* Hero Section */}
                <section className="relative h-64 md:h-80 rounded-3xl overflow-hidden group shadow-2xl bg-black flex items-center justify-center">
                  <img src="https://storage.googleapis.com/macaulay-api-storage-dir/uploads/1743604488339-1743604488339.png" alt="Liberty World Roleplay" className="absolute inset-0 w-full h-full object-contain opacity-80 transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 md:p-10 space-y-2 md:space-y-4 w-full">
                    <span className="bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider border border-brand-primary/30 backdrop-blur-md inline-block">Official Server</span>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg">Liberty World</h1>
                    <p className="text-gray-200 text-sm md:text-lg max-w-xl line-clamp-2 md:line-clamp-none drop-shadow-md">Welcome to Liberty World Roleplay. Join our community and start your new life today.</p>
                    <div className="hidden md:flex gap-4 pt-4">
                      <button onClick={() => servers.length > 0 && handleConnect(servers[0])} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Join Now</button>
                    </div>
                  </div>
                </section>

                {/* Announcements Section */}
                {announcements.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <Megaphone className="text-brand-primary" size={24} />
                        Thông Báo Từ Admin
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="bg-brand-primary/10 border border-brand-primary/30 rounded-2xl p-4 md:p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl"></div>
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg text-white">{announcement.title}</h3>
                              <span className="text-xs text-brand-primary font-bold bg-brand-primary/20 px-2 py-1 rounded">
                                {announcement.author}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{announcement.content}</p>
                            <p className="text-xs text-gray-500 mt-4">
                              {announcement.createdAt?.toDate().toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* News Grid */}
                <section>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold">Latest News</h2>
                    <button className="text-brand-primary text-sm font-semibold hover:underline">View All</button>
                  </div>
                  {news.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No news available.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {news.map((item) => (
                        <div key={item.id} className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] md:hover:border-white/20 transition-all cursor-pointer">
                          <div className="h-40 md:h-48 overflow-hidden">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="p-4 md:p-6 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded", item.category === 'Update' ? "bg-brand-primary/10 text-brand-primary" : "bg-purple-500/10 text-purple-500")}>{item.category}</span>
                              <span className="text-xs text-gray-500">{item.date}</span>
                            </div>
                            <h3 className="text-lg md:text-xl font-bold">{item.title}</h3>
                            <p className="text-gray-400 text-xs md:text-sm line-clamp-2">{item.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </motion.div>
            )}

            {/* SERVERS TAB */}
            {activeTab === 'servers' && (
              <motion.div key="servers" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4 md:space-y-6 h-full flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Khu Phố</h2>
                    <p className="text-sm text-gray-400">Khám phá các khu vực trong cộng đồng.</p>
                  </div>
                </div>

                {filteredServers.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No servers found.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:gap-4 pb-4">
                    {filteredServers.map((server) => (
                      <div 
                        key={server.id} 
                        onClick={() => setSelectedServer(server)}
                        className="bg-bg-card border border-white/5 p-4 md:p-5 rounded-2xl flex items-center gap-4 md:gap-6 active:scale-[0.98] md:hover:bg-bg-hover md:hover:border-brand-primary/30 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl md:text-2xl font-bold text-brand-primary shadow-inner">
                          {server.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base md:text-lg truncate group-hover:text-brand-primary transition-colors">{server.name}</h3>
                            {server.status === 'offline' ? (
                              <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div> Offline
                              </span>
                            ) : server.players >= server.maxPlayers ? (
                              <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div> Full
                              </span>
                            ) : (
                              <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> Online
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] md:text-xs text-gray-400 flex items-center gap-1 truncate">
                              <LayoutGrid size={12} /> {server.gamemode}
                            </span>
                            <span className="text-[10px] md:text-xs text-brand-accent flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></div>
                              {server.ping}ms
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs md:text-sm font-bold bg-white/5 px-2 py-1 rounded-md">{server.players} / {server.maxPlayers}</span>
                          <div className="w-16 md:w-24 h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-brand-primary" style={{ width: `${(server.players / server.maxPlayers) * 100}%` }}></div>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-600 md:hidden" size={20} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col h-full max-w-4xl mx-auto">
                <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Kênh Chat</h2>
                    <p className="text-sm text-gray-400">Trò chuyện với mọi người trên Launcher.</p>
                  </div>
                  <div className="flex bg-bg-card border border-white/10 rounded-xl p-1">
                    <button 
                      onClick={() => setChatChannel('global')}
                      className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", chatChannel === 'global' ? "bg-brand-primary text-white" : "text-gray-400 hover:text-white")}
                    >
                      Thế Giới
                    </button>
                    {profile?.faction && (
                      <button 
                        onClick={() => setChatChannel('faction')}
                        className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", chatChannel === 'faction' ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white")}
                      >
                        {profile.faction}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 bg-bg-card border border-white/5 rounded-2xl flex flex-col overflow-hidden relative">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">Chưa có tin nhắn nào. Hãy là người đầu tiên!</div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.uid === user?.uid;
                        return (
                          <div key={msg.id} className={cn("flex gap-3 max-w-[80%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {msg.photoURL ? <img src={msg.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={14} />}
                            </div>
                            <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-300">{msg.displayName}</span>
                                {msg.role === 'admin' && (
                                  <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                                )}
                                {msg.role === 'leader' && (
                                  <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold">LEADER</span>
                                )}
                                {msg.faction && chatChannel === 'global' && (
                                  <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-bold">{msg.faction}</span>
                                )}
                                <span className="text-[10px] text-gray-500">
                                  {msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                </span>
                              </div>
                              <div className="group relative flex items-center gap-2">
                                {isMe && (profile?.role === 'admin' || profile?.role === 'leader') && (
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                                <div className={cn(
                                  "px-4 py-2 rounded-2xl text-sm",
                                  isMe ? "bg-brand-primary text-white rounded-tr-sm" : "bg-white/10 text-gray-200 rounded-tl-sm"
                                )}>
                                  <span style={{ color: msg.chatColor || 'inherit' }}>{msg.text}</span>
                                </div>
                                {!isMe && (profile?.role === 'admin' || profile?.role === 'leader') && (
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-bg-dark/50 flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={chatChannel === 'global' ? "Nhập tin nhắn thế giới..." : `Nhập tin nhắn nội bộ ${profile?.faction}...`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary/50 text-sm"
                      maxLength={500}
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="bg-brand-primary text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} className="ml-1" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* MODS TAB */}
            {activeTab === 'mods' && (
              <motion.div key="mods" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Chợ Đen</h2>
                  <p className="text-sm text-gray-400">Nơi giao thương các vật phẩm, tài nguyên.</p>
                </div>
                {mods.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No mods available.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mods.map((mod) => {
                      const isInstalled = installedMods.includes(mod.id);
                      return (
                        <div key={mod.id} className="bg-bg-card border border-white/5 p-5 rounded-2xl flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-brand-primary">
                            {getIcon(mod.iconName)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-lg">{mod.name}</h3>
                              <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{mod.size}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1 mb-4">{mod.desc}</p>
                            <button 
                              onClick={() => toggleMod(mod.id)}
                              className={cn(
                                "w-full py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                                isInstalled 
                                  ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400" 
                                  : "bg-brand-primary text-white neon-glow hover:bg-brand-primary/90"
                              )}
                            >
                              {isInstalled ? <><CheckCircle2 size={16}/> Installed</> : <><Download size={16}/> Install Mod</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* SHOP TAB */}
            {activeTab === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Store</h2>
                    <p className="text-sm text-gray-400">Support the server and get premium perks.</p>
                  </div>
                  <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-brand-primary/30">
                    <Wallet size={18} className="text-brand-primary"/>
                    <span className="font-bold">{profile?.coins || 0} Coins</span>
                  </div>
                </div>
                {shopItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">Shop is empty.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shopItems.map((item) => (
                      <div key={item.id} className="bg-bg-card border border-white/5 p-6 rounded-2xl flex flex-col items-center text-center gap-4 hover:border-brand-primary/50 transition-colors">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                          {getIcon(item.iconName, "text-brand-primary w-10 h-10")}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{item.name}</h3>
                          <p className="text-sm text-gray-400 mt-2 h-10">{item.desc}</p>
                        </div>
                        <button 
                          onClick={() => handleBuyItem(item)}
                          className="w-full mt-auto bg-white/10 hover:bg-brand-primary text-white py-3 rounded-xl font-bold transition-colors"
                        >
                          Buy for {item.price} LW Coins
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                      <Trophy className="text-yellow-400" size={32} />
                      Bảng Xếp Hạng
                    </h2>
                    <p className="text-sm text-gray-400">Những người chơi giàu có nhất Liberty World.</p>
                  </div>
                </div>

                <div className="bg-bg-card border border-white/5 rounded-3xl overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-white/5">
                    <h3 className="font-bold text-lg text-yellow-400">Top Đại Gia (LW Coins)</h3>
                  </div>
                  <div className="p-2">
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">Chưa có dữ liệu.</div>
                    ) : (
                      leaderboard.map((user, index) => (
                        <div key={user.uid} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-colors">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg",
                            index === 0 ? "bg-yellow-500 text-black" : 
                            index === 1 ? "bg-gray-300 text-black" : 
                            index === 2 ? "bg-amber-700 text-white" : "bg-white/10 text-gray-400"
                          )}>
                            {index + 1}
                          </div>
                          <div className="w-12 h-12 rounded-full bg-bg-dark overflow-hidden border-2 border-white/10">
                            {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={24} className="m-auto mt-2 text-gray-500" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg flex items-center gap-2">
                              {user.displayName}
                              {user.role === 'admin' && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                              {user.role === 'leader' && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold">LEADER</span>}
                            </h4>
                            <p className="text-xs text-gray-400">Level {user.level || 1} {user.faction ? `• ${user.faction}` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-yellow-400 text-xl">{user.coins?.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Coins</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                <div className="bg-gradient-to-br from-brand-primary/20 to-blue-600/20 border border-brand-primary/30 rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="w-32 h-32 rounded-full bg-bg-dark border-4 border-brand-primary flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] overflow-hidden">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={64} className="text-brand-primary" />
                    )}
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <div className="inline-block bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/30 mb-2">
                      {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'leader' ? 'Leader' : 'VIP Gold Member'}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold">{profile?.displayName}</h2>
                    <p className="text-gray-400 mt-1">{profile?.email}</p>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="bg-bg-dark/50 p-4 rounded-2xl flex-1 text-center border border-white/5">
                      <p className="text-xs text-gray-400 uppercase font-bold">Level</p>
                      <p className="text-2xl font-bold text-brand-primary">{profile?.level || 1}</p>
                      <p className="text-[10px] text-gray-500">{profile?.exp || 0} EXP</p>
                    </div>
                    <div className="bg-bg-dark/50 p-4 rounded-2xl flex-1 text-center border border-white/5">
                      <p className="text-xs text-gray-400 uppercase font-bold">LW Coins</p>
                      <p className="text-2xl font-bold text-yellow-400">{profile?.lwCoins || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Daily Check-in */}
                  <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Star size={18} className="text-yellow-400" /> Điểm danh hàng ngày</h3>
                    <p className="text-sm text-gray-400">Điểm danh mỗi ngày để nhận LW Coins miễn phí!</p>
                    <button 
                      onClick={async () => {
                        if (!profile) return;
                        const today = new Date().toISOString().split('T')[0];
                        if (profile.lastCheckIn === today) {
                          alert("Bạn đã điểm danh hôm nay rồi!");
                          return;
                        }
                        try {
                          await setDoc(doc(db, 'users', profile.uid), {
                            lwCoins: (profile.lwCoins || 0) + 100,
                            lastCheckIn: today
                          }, { merge: true });
                          alert("Điểm danh thành công! Nhận 100 LW Coins.");
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      disabled={profile?.lastCheckIn === new Date().toISOString().split('T')[0]}
                      className="w-full bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary disabled:opacity-50 disabled:cursor-not-allowed border border-brand-primary/50 py-3 rounded-xl font-bold transition-colors"
                    >
                      {profile?.lastCheckIn === new Date().toISOString().split('T')[0] ? 'Đã điểm danh' : 'Điểm danh ngay (+100 Coins)'}
                    </button>
                  </div>
                  {/* Admin Panel Button (Mobile Only) */}
                  {(profile?.role === 'admin' || profile?.role === 'leader') && (
                    <div className="md:hidden bg-bg-card border border-red-500/30 p-6 rounded-2xl space-y-4 md:col-span-2">
                      <h3 className="font-bold text-lg text-red-400 flex items-center gap-2">
                        <Shield size={20} />
                        Khu vực Quản trị
                      </h3>
                      <p className="text-sm text-gray-400">Truy cập bảng điều khiển dành riêng cho Staff.</p>
                      <button 
                        onClick={() => setActiveTab('admin')}
                        className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 py-3 rounded-xl font-bold transition-colors"
                      >
                        Mở Bảng Quản Trị
                      </button>
                    </div>
                  )}

                  {/* Faction Card */}
                  <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4 md:col-span-2">
                    <h3 className="font-bold text-lg">Thông tin Roleplay</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
                        <div>
                          <p className="font-bold">Tổ chức (Faction)</p>
                          <p className="text-xs text-gray-400">{profile?.faction || 'Chưa tham gia'}</p>
                        </div>
                        <select 
                          className="bg-bg-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                          value={profile?.faction || ''}
                          onChange={(e) => {
                            if (user) {
                              setDoc(doc(db, 'users', user.uid), { faction: e.target.value || null }, { merge: true });
                            }
                          }}
                        >
                          <option value="">Không có</option>
                          <option value="LSPD">LSPD (Cảnh sát)</option>
                          <option value="EMS">EMS (Cứu thương)</option>
                          <option value="Ballas">Ballas Gang</option>
                          <option value="Grove Street">Grove Street</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl">
                        <div>
                          <p className="font-bold">Màu chữ Chat</p>
                          <p className="text-xs text-gray-400">Trang bị màu chữ</p>
                        </div>
                        <select 
                          className="bg-bg-dark border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
                          value={profile?.chatColor || ''}
                          onChange={(e) => {
                            if (user) {
                              setDoc(doc(db, 'users', user.uid), { chatColor: e.target.value || null }, { merge: true });
                            }
                          }}
                        >
                          <option value="">Mặc định</option>
                          <option value="#fbbf24" className="text-yellow-400">Vàng (VIP)</option>
                          <option value="#60a5fa" className="text-blue-400">Xanh dương</option>
                          <option value="#f87171" className="text-red-400">Đỏ</option>
                          <option value="#34d399" className="text-green-400">Xanh lá</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quests Card */}
                  <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-yellow-400">
                        <Target size={20} />
                        Nhiệm vụ Launcher
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between opacity-60">
                        <div>
                          <p className="font-bold text-sm">Đăng nhập lần đầu</p>
                          <p className="text-xs text-gray-400">+50 LW Coins</p>
                        </div>
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                          <Check size={14}/> Đã nhận
                        </span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Liên kết Discord</p>
                          <p className="text-xs text-gray-400">+100 LW Coins</p>
                        </div>
                        {profile?.discordUsername ? (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Check size={14}/> Đã nhận
                          </span>
                        ) : (
                          <button onClick={() => setActiveTab('settings')} className="bg-brand-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-brand-primary/80">
                            Làm ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lucky Wheel Card */}
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 p-6 rounded-2xl space-y-4 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400">
                        <Star size={20} />
                        Vòng Quay Nhân Phẩm
                      </h3>
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-bold">Mỗi ngày 1 lần</span>
                    </div>
                    <p className="text-sm text-gray-400 relative z-10">Thử vận may của bạn hôm nay để nhận LW Coins hoặc vật phẩm hiếm!</p>
                    <button 
                      onClick={() => setShowLuckyWheel(true)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] relative z-10"
                    >
                      Mở Vòng Quay
                    </button>
                  </div>

                  {/* Voice Party Card */}
                  <div className="bg-bg-card border border-brand-primary/20 p-6 rounded-2xl space-y-4 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-brand-primary">
                        <Mic size={20} />
                        Voice Party (Nhóm 2-3 người)
                      </h3>
                      {voiceRoomId && (
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> Đang trong phòng
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 relative z-10">Tạo phòng Voice Chat P2P để trò chuyện cùng bạn bè mà không cần Discord.</p>
                    
                    {!voiceRoomId ? (
                      <div className="flex flex-col md:flex-row gap-3 relative z-10">
                        <button 
                          onClick={startVoiceParty}
                          className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-brand-primary/20"
                        >
                          Tạo Phòng Mới
                        </button>
                        <div className="flex flex-1 gap-2">
                          <input 
                            type="text" 
                            placeholder="Nhập mã phòng..." 
                            value={joinVoiceId}
                            onChange={(e) => setJoinVoiceId(e.target.value)}
                            className="flex-1 bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                          />
                          <button 
                            onClick={joinVoiceParty}
                            className="bg-white/10 hover:bg-white/20 px-6 rounded-xl font-bold transition-colors"
                          >
                            Vào
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-bg-dark border border-brand-primary/30 rounded-xl p-4 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-gray-400">Mã phòng của bạn:</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-mono font-bold text-brand-primary tracking-widest">{voiceRoomId}</p>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(voiceRoomId);
                                  alert("Đã copy mã phòng!");
                                }}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={toggleMute}
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                isMuted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
                              )}
                            >
                              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <button 
                              onClick={leaveVoiceParty}
                              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg shadow-red-500/20"
                            >
                              <LogOut size={18} className="ml-1" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={profile?.photoURL || ''} alt="You" className={cn("w-10 h-10 rounded-full object-cover border-2", isMuted ? "border-red-500" : "border-green-500")} />
                            {!isMuted && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-dark"></div>}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-gray-500">
                            <Users size={16} />
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-gray-500">
                            <Users size={16} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discord Integration Card */}
                  <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 p-6 rounded-2xl space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-[#5865F2]">
                        <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.68,65.33C38,65.33,34.17,61,34.17,55.67s3.78-9.66,8.51-9.66c4.76,0,8.55,4.35,8.51,9.66,0,5.33-3.78,9.66-8.51,9.66Zm41.72,0c-4.73,0-8.51-4.33-8.51-9.66s3.78-9.66,8.51-9.66c4.76,0,8.55,4.35,8.51,9.66,0,5.33-3.78,9.66-8.51,9.66Z"/></svg>
                        Discord Rich Presence (Bot)
                      </h3>
                      <span className="text-xs bg-[#5865F2]/20 text-[#5865F2] px-2 py-1 rounded font-bold">BETA</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Liên kết tài khoản Discord để Bot tự động cấp Role <strong className="text-green-400">"🟢 Đang trong thành phố"</strong> khi bạn vào game.
                    </p>
                    {profile?.discordUsername ? (
                      <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-[#5865F2]/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center font-bold text-white">
                            {profile.discordUsername.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white">{profile.discordUsername}</p>
                            <div className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              Sẵn sàng đồng bộ
                            </div>
                          </div>
                        </div>
                        <button onClick={handleUnlinkDiscord} className="text-xs text-red-400 hover:underline">Hủy liên kết</button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleLinkDiscord}
                        disabled={isLinkingDiscord}
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {isLinkingDiscord ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          "Liên kết Discord ngay"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto md:mx-0 space-y-6 md:space-y-8">
                <h2 className="text-2xl md:text-3xl font-bold">Settings</h2>
                
                <div className="space-y-6">
                  <div className="bg-bg-card border border-white/5 p-5 rounded-2xl space-y-4">
                    <h3 className="font-bold text-brand-primary flex items-center gap-2"><User size={18} /> Player Profile</h3>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">In-Game Nickname</label>
                      <input 
                        type="text" 
                        value={profile?.displayName || ''}
                        onChange={(e) => {
                          if (user) {
                            setDoc(doc(db, 'users', user.uid), { displayName: e.target.value }, { merge: true });
                          }
                        }}
                        className="w-full bg-bg-dark border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-primary/50 text-white font-medium"
                        placeholder="Firstname_Lastname"
                      />
                      <p className="text-[10px] text-gray-500">Dữ liệu được đồng bộ tự động lên Cloud.</p>
                    </div>
                  </div>

                  <div className="bg-bg-card border border-white/5 p-5 rounded-2xl space-y-4">
                    <h3 className="font-bold text-brand-primary flex items-center gap-2"><Settings size={18} /> App Preferences</h3>
                    
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <div>
                        <p className="font-medium text-sm">Auto-Update Launcher</p>
                        <p className="text-[10px] text-gray-400">Download updates in background</p>
                      </div>
                      <button 
                        onClick={() => setAutoUpdate(!autoUpdate)}
                        className={cn("w-12 h-6 rounded-full relative transition-colors", autoUpdate ? "bg-brand-primary" : "bg-white/10")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", autoUpdate ? "right-1" : "left-1")}></div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">Clear Cache</p>
                        <p className="text-[10px] text-gray-400">Free up storage space</p>
                      </div>
                      <button className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Clear</button>
                    </div>
                  </div>

                  {profile?.role === 'admin' && (
                    <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl space-y-4">
                      <h3 className="font-bold text-red-500 flex items-center gap-2"><Shield size={18} /> Admin Area</h3>
                      <button 
                        onClick={() => {
                          const email = prompt("Nhập email của người dùng muốn cấp quyền Leader:");
                          if (email) {
                            alert("Tính năng cấp quyền đang được phát triển. Vui lòng chỉnh sửa trực tiếp trên Firebase Console.");
                          }
                        }}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-2.5 rounded-xl font-bold transition-colors text-sm"
                      >
                        Cấp quyền Leader
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={logout}
                    className="w-full bg-white/5 hover:bg-white/10 text-red-400 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    Đăng xuất
                  </button>
                  
                  <div className="text-center pt-4">
                    <p className="text-xs text-gray-600">Liberty World Launcher v2.0.0 (Cloud Sync)</p>
                    <p className="text-[10px] text-gray-600">Powered by Firebase</p>
                  </div>
                </div>
              </motion.div>
            )}
            {/* FACTIONS TAB */}
            {activeTab === 'factions' && (
              <motion.div key="factions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bang Hội</h2>
                    <p className="text-sm text-gray-400">Tham gia hoặc tạo bang hội của riêng bạn.</p>
                  </div>
                  <button 
                    onClick={() => setShowCreateFactionModal(true)}
                    className="bg-brand-primary text-bg-dark px-4 py-2 rounded-xl font-bold hover:bg-brand-primary/90 transition-colors flex items-center gap-2"
                  >
                    <Users size={18} /> Tạo Bang Hội (5000 LW Coins)
                  </button>
                </div>

                {factions.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">Chưa có bang hội nào.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {factions.map((faction) => (
                      <div key={faction.id} className="bg-bg-card border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:border-brand-primary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-bold text-xl text-brand-primary">
                            {faction.tag}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{faction.name}</h3>
                            <p className="text-sm text-gray-400">{faction.members.length} thành viên</p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (!profile) return;
                            if (profile.factionId) {
                              alert("Bạn đã ở trong một bang hội rồi!");
                              return;
                            }
                            if (window.confirm(`Xin gia nhập ${faction.name}?`)) {
                              await setDoc(doc(db, 'users', profile.uid), { factionId: faction.id, faction: faction.tag }, { merge: true });
                              await setDoc(doc(db, 'factions', faction.id), { members: [...faction.members, profile.uid] }, { merge: true });
                              alert("Đã gia nhập thành công!");
                            }
                          }}
                          disabled={profile?.factionId === faction.id}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors text-sm"
                        >
                          {profile?.factionId === faction.id ? 'Đã tham gia' : 'Gia nhập'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* VOICE PARTY TAB */}
            {activeTab === 'voice' && (
              <motion.div key="voice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Voice Party</h2>
                    <p className="text-sm text-gray-400">Tạo phòng trò chuyện với bạn bè (Tối đa 3 người).</p>
                  </div>
                  <button 
                    onClick={() => setShowCreateVoiceModal(true)}
                    className="bg-brand-primary text-bg-dark px-4 py-2 rounded-xl font-bold hover:bg-brand-primary/90 transition-colors flex items-center gap-2"
                  >
                    <Mic size={18} /> Tạo Phòng
                  </button>
                </div>

                {voiceRooms.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">Chưa có phòng Voice nào đang hoạt động.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {voiceRooms.map((room) => (
                      <div key={room.id} className="bg-bg-card border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg truncate">{room.name}</h3>
                          {room.isPrivate && <Shield size={16} className="text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Users size={16} /> {room.participants.length} / {room.maxParticipants}
                        </div>
                        <button 
                          onClick={async () => {
                            if (!profile) return;
                            if (room.participants.length >= room.maxParticipants && !room.participants.includes(profile.uid)) {
                              alert("Phòng đã đầy!");
                              return;
                            }
                            if (room.isPrivate && !room.participants.includes(profile.uid)) {
                              const pwd = prompt("Nhập mật khẩu phòng:");
                              if (pwd !== room.password) {
                                alert("Mật khẩu không đúng!");
                                return;
                              }
                            }
                            
                            if (!room.participants.includes(profile.uid)) {
                              await setDoc(doc(db, 'voiceRooms', room.id), {
                                participants: [...room.participants, profile.uid]
                              }, { merge: true });
                            }
                            setVoiceRoomId(room.id);
                            alert("Đã tham gia phòng Voice (Giao diện giả lập). Tính năng WebRTC đang được phát triển.");
                          }}
                          className="w-full mt-auto bg-white/10 hover:bg-brand-primary text-white py-2 rounded-xl font-bold transition-colors"
                        >
                          Tham gia
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ADMIN TAB */}
            {activeTab === 'admin' && (profile?.role === 'admin' || profile?.role === 'leader') && (
              <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield size={32} className={profile?.role === 'admin' ? "text-red-500" : "text-yellow-500"} />
                  <div>
                    <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${profile?.role === 'admin' ? "text-red-500" : "text-yellow-500"}`}>
                      {profile?.role === 'admin' ? 'Admin Dashboard' : 'Leader Dashboard'}
                    </h2>
                    <p className="text-sm text-gray-400">Quản lý nội dung hệ thống.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quick Actions */}
                  <div className="bg-bg-card border border-red-500/20 p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-lg">Hành động nhanh</h3>
                    <button 
                      onClick={() => setShowAddAnnouncement(true)}
                      className="w-full bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border border-brand-primary/50 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Megaphone size={18} />
                      Đăng Thông Báo Mới
                    </button>
                    {profile?.role === 'admin' && (
                      <>
                        <button 
                          onClick={seedData}
                          className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Database size={18} />
                          Tạo dữ liệu mẫu (Seed Data)
                        </button>
                        <p className="text-xs text-gray-500 text-center">Tự động tạo Server, Tin tức, Shop mẫu.</p>
                      </>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-lg">Thống kê</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-brand-primary">{servers.length}</p>
                        <p className="text-xs text-gray-400 uppercase">Servers</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-green-400">{shopItems.length}</p>
                        <p className="text-xs text-gray-400 uppercase">Shop Items</p>
                      </div>
                    </div>
                  </div>
                  {profile?.role === 'admin' && (
                    <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4 md:col-span-2">
                      <h3 className="font-bold text-lg">Cấu hình Ứng dụng</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-gray-400">Phiên bản mới nhất</label>
                          <input 
                            type="text" 
                            value={appConfig?.latestVersion || ''}
                            onChange={(e) => setDoc(doc(db, 'appConfig', 'main'), { latestVersion: e.target.value }, { merge: true })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
                            placeholder="e.g. v1.2.0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-gray-400">Link tải bản cập nhật</label>
                          <input 
                            type="text" 
                            value={appConfig?.updateUrl || ''}
                            onChange={(e) => setDoc(doc(db, 'appConfig', 'main'), { updateUrl: e.target.value }, { merge: true })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-bg-card border border-white/5 p-6 rounded-2xl">
                  <h3 className="font-bold text-lg mb-4">Hướng dẫn Quản trị</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">
                    Hiện tại, để thêm/sửa/xóa dữ liệu chi tiết (Tin tức, Shop, User, Mods), vui lòng truy cập trực tiếp vào <strong>Firebase Console</strong>. Dữ liệu thay đổi trên Firebase sẽ tự động cập nhật xuống Launcher của tất cả người chơi ngay lập tức.
                  </p>
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Mở Firebase Console <ExternalLink size={16} />
                  </a>
                </div>

                {/* Announcements Management */}
                <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-lg">Quản lý Thông báo</h3>
                  {announcements.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có thông báo nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white">{announcement.title}</h4>
                            <p className="text-xs text-gray-400">{announcement.createdAt?.toDate().toLocaleString('vi-VN')}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Servers Management */}
                <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Quản lý Khu Phố</h3>
                    <button 
                      onClick={() => {
                        setEditingServer(null);
                        setNewServerData({ name: '', ip: '', maxPlayers: 1000, gamemode: 'Roleplay', status: 'online' });
                        setShowServerModal(true);
                      }}
                      className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg font-bold hover:bg-brand-primary/30 transition-colors"
                    >
                      + Thêm Mới
                    </button>
                  </div>
                  {servers.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có Khu Phố nào.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {servers.map((server) => (
                        <div key={server.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white">{server.name}</h4>
                            <p className="text-xs text-gray-400">{server.ip}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingServer(server);
                                setNewServerData({ name: server.name, ip: server.ip, maxPlayers: server.maxPlayers, gamemode: server.gamemode, status: server.status, image: server.image });
                                setShowServerModal(true);
                              }}
                              className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteServer(server.id)}
                              className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mods Management */}
                <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Quản lý Chợ Đen</h3>
                    <button 
                      onClick={() => {
                        setEditingMod(null);
                        setNewModData({ name: '', size: '', desc: '', iconName: 'Package', category: 'Other' });
                        setShowModModal(true);
                      }}
                      className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg font-bold hover:bg-brand-primary/30 transition-colors"
                    >
                      + Thêm Mới
                    </button>
                  </div>
                  {mods.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có vật phẩm nào.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {mods.map((mod) => (
                        <div key={mod.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white">{mod.name}</h4>
                            <p className="text-xs text-gray-400">{mod.category}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingMod(mod);
                                setNewModData({ name: mod.name, size: mod.size, desc: mod.desc, iconName: mod.iconName, category: mod.category });
                                setShowModModal(true);
                              }}
                              className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMod(mod.id)}
                              className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shop Management */}
                <div className="bg-bg-card border border-white/5 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Quản lý Cửa Hàng</h3>
                    <button 
                      onClick={() => {
                        setEditingShopItem(null);
                        setNewShopItemData({ name: '', price: 0, desc: '', iconName: 'Star' });
                        setShowShopModal(true);
                      }}
                      className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-lg font-bold hover:bg-brand-primary/30 transition-colors"
                    >
                      + Thêm Mới
                    </button>
                  </div>
                  {shopItems.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có vật phẩm nào.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {shopItems.map((item) => (
                        <div key={item.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white">{item.name}</h4>
                            <p className="text-xs text-gray-400">{item.price} LW Coins</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingShopItem(item);
                                setNewShopItemData({ name: item.name, price: item.price, desc: item.desc, iconName: item.iconName });
                                setShowShopModal(true);
                              }}
                              className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteShopItem(item.id)}
                              className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg-dark/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-1 z-30 pb-safe">
        <BottomNavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<LayoutGrid size={20} />} label="Home" />
        <BottomNavItem active={activeTab === 'servers'} onClick={() => setActiveTab('servers')} icon={<Server size={20} />} label="Khu Phố" />
        <BottomNavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={20} />} label="Chat" />
        <BottomNavItem active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={20} />} label="Top" />
        <BottomNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Profile" />
      </nav>

      {/* SERVER DETAIL MODAL */}
      <AnimatePresence>
        {selectedServer && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedServer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl bg-bg-card border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-10 relative flex-1 overflow-y-auto custom-scrollbar space-y-6 md:space-y-8 pt-12 md:pt-10">
                {/* Mobile Drag Handle */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full md:hidden"></div>

                <button 
                  onClick={() => setSelectedServer(null)}
                  className="absolute top-4 right-4 w-8 h-8 md:w-10 md:h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-1 md:space-y-2">
                    <span className="bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-brand-primary/30">{selectedServer.status}</span>
                    <h2 className="text-2xl md:text-4xl font-bold leading-tight">{selectedServer.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-400">
                      <button onClick={() => copyToClipboard(selectedServer.ip)} className="flex items-center gap-1.5 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md">
                        {copiedIp === selectedServer.ip ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} 
                        {selectedServer.ip}
                      </button>
                      <span className="flex items-center gap-1.5"><Users size={14} /> {selectedServer.players} / {selectedServer.maxPlayers}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect(selectedServer)}
                    disabled={isConnecting}
                    className="w-full md:w-auto bg-brand-primary text-white px-8 py-4 rounded-2xl font-bold text-lg md:text-xl neon-glow active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                  >
                    {isConnecting ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Play size={20} className="fill-current" />
                        CONNECT
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 md:gap-6">
                  <StatCard label="Gamemode" value={selectedServer.gamemode} />
                  <StatCard label="Map" value={selectedServer.map} />
                  <StatCard label="Version" value={selectedServer.version} />
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-base md:text-lg">Server Description</h3>
                  <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                    Welcome to {selectedServer.name}. This server features custom mapping, advanced economy, and a dedicated staff team. Join our community to stay updated with the latest events and updates.
                    <br/><br/>
                    Make sure your in-game name is set to <strong className="text-white">{profile?.displayName}</strong> before connecting!
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center pt-16 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-card border border-white/10 rounded-b-3xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col md:absolute md:top-20 md:right-8"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-bg-dark/50">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Bell size={18} className="text-brand-primary" />
                  Thông báo
                </h3>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white bg-white/5 p-1.5 rounded-lg">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-sm">Không có thông báo nào.</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                        if (!notif.read) {
                          setDoc(doc(db, 'notifications', notif.id), { read: true }, { merge: true });
                        }
                      }}
                      className={cn(
                        "p-4 rounded-xl mb-2 cursor-pointer transition-colors border",
                        notif.read ? "bg-white/5 border-transparent opacity-70" : "bg-brand-primary/10 border-brand-primary/30"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={cn("font-bold text-sm", notif.read ? "text-gray-300" : "text-white")}>{notif.title}</h4>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                          {notif.createdAt ? new Date(notif.createdAt.toDate()).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{notif.body}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LUCKY WHEEL MODAL */}
      <AnimatePresence>
        {showLuckyWheel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSpinning && setShowLuckyWheel(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-bg-card border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.2)] text-center flex flex-col items-center"
            >
              <button 
                onClick={() => !isSpinning && setShowLuckyWheel(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
                Vòng Quay May Mắn
              </h3>

              <div className="relative w-64 h-64 mb-8">
                {/* Pointer */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 20H2L12 2Z"/></svg>
                </div>
                
                {/* Wheel */}
                <motion.div 
                  className="w-full h-full rounded-full border-4 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] overflow-hidden relative"
                  animate={{ rotate: isSpinning ? 360 * 5 + Math.random() * 360 : 0 }}
                  transition={{ duration: 3, ease: "circOut" }}
                  onAnimationComplete={() => {
                    if (isSpinning) {
                      setIsSpinning(false);
                      const rewards = ['10 Coins', '50 Coins', '100 Coins', 'Chúc may mắn', 'Màu Chat VIP', '20 Coins'];
                      const won = rewards[Math.floor(Math.random() * rewards.length)];
                      setSpinResult(won);
                      
                      if (user && won.includes('Coins')) {
                        const amount = parseInt(won);
                        setDoc(doc(db, 'users', user.uid), { 
                          coins: (profile?.coins || 0) + amount,
                          lastSpinDate: new Date().toISOString().split('T')[0]
                        }, { merge: true });
                      } else if (user) {
                        setDoc(doc(db, 'users', user.uid), { 
                          lastSpinDate: new Date().toISOString().split('T')[0]
                        }, { merge: true });
                      }
                    }
                  }}
                >
                  {/* Wheel Segments (Visual Only) */}
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#a855f7_0deg_60deg,#ec4899_60deg_120deg,#3b82f6_120deg_180deg,#eab308_180deg_240deg,#10b981_240deg_300deg,#f43f5e_300deg_360deg)] opacity-80"></div>
                  <div className="absolute inset-2 bg-bg-dark rounded-full flex items-center justify-center">
                    <Star size={48} className="text-purple-500/50" />
                  </div>
                </motion.div>
              </div>

              {spinResult ? (
                <div className="space-y-4 animate-in zoom-in duration-300">
                  <p className="text-gray-400">Kết quả của bạn:</p>
                  <p className="text-3xl font-bold text-yellow-400">{spinResult}</p>
                  <button 
                    onClick={() => { setSpinResult(null); setShowLuckyWheel(false); }}
                    className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    if (profile?.lastSpinDate === today) {
                      alert('Bạn đã quay hôm nay rồi! Hãy quay lại vào ngày mai.');
                      return;
                    }
                    setIsSpinning(true);
                    setSpinResult(null);
                  }}
                  disabled={isSpinning || profile?.lastSpinDate === new Date().toISOString().split('T')[0]}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profile?.lastSpinDate === new Date().toISOString().split('T')[0] ? 'Đã quay hôm nay' : 'Quay Ngay (Miễn phí)'}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD ANNOUNCEMENT MODAL */}
      <AnimatePresence>
        {showAddAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddAnnouncement(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-bg-card border border-brand-primary/30 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-brand-primary/20 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Megaphone size={20} />
                  Đăng Thông Báo
                </h3>
                <button onClick={() => setShowAddAnnouncement(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tiêu đề</label>
                  <input 
                    type="text" 
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    placeholder="Nhập tiêu đề thông báo..."
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Nội dung</label>
                  <textarea 
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                    placeholder="Nhập nội dung chi tiết..."
                    rows={4}
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddAnnouncement}
                disabled={!newAnnouncement.title || !newAnnouncement.content}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Đăng Ngay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SERVER MODAL */}
      <AnimatePresence>
        {showServerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowServerModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingServer ? 'Chỉnh sửa Khu Phố' : 'Thêm Khu Phố Mới'}</h3>
                <button onClick={() => setShowServerModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tên Khu Phố</label>
                  <input 
                    type="text"
                    value={newServerData.name || ''}
                    onChange={(e) => setNewServerData({...newServerData, name: e.target.value})}
                    placeholder="VD: Liberty World | Roleplay #1"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">IP Address</label>
                  <input 
                    type="text"
                    value={newServerData.ip || ''}
                    onChange={(e) => setNewServerData({...newServerData, ip: e.target.value})}
                    placeholder="VD: play.libertyworld.vn:7777"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Max Players</label>
                    <input 
                      type="number"
                      value={newServerData.maxPlayers || 1000}
                      onChange={(e) => setNewServerData({...newServerData, maxPlayers: parseInt(e.target.value) || 1000})}
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Status</label>
                    <select 
                      value={newServerData.status || 'online'}
                      onChange={(e) => setNewServerData({...newServerData, status: e.target.value as 'online' | 'offline' | 'maintenance'})}
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50 text-white"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="maintenance">Bảo trì</option>
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveServer}
                disabled={!newServerData.name || !newServerData.ip}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu Thay Đổi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOD MODAL */}
      <AnimatePresence>
        {showModModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingMod ? 'Chỉnh sửa Vật Phẩm' : 'Thêm Vật Phẩm Mới'}</h3>
                <button onClick={() => setShowModModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tên Vật Phẩm</label>
                  <input 
                    type="text"
                    value={newModData.name || ''}
                    onChange={(e) => setNewModData({...newModData, name: e.target.value})}
                    placeholder="VD: ENB Series v3"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Dung lượng</label>
                    <input 
                      type="text"
                      value={newModData.size || ''}
                      onChange={(e) => setNewModData({...newModData, size: e.target.value})}
                      placeholder="VD: 15MB"
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Danh mục</label>
                    <select 
                      value={newModData.category || 'Other'}
                      onChange={(e) => setNewModData({...newModData, category: e.target.value})}
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50 text-white"
                    >
                      <option value="Graphics">Graphics</option>
                      <option value="Weapons">Weapons</option>
                      <option value="Vehicles">Vehicles</option>
                      <option value="Skins">Skins</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Mô tả</label>
                  <textarea 
                    value={newModData.desc || ''}
                    onChange={(e) => setNewModData({...newModData, desc: e.target.value})}
                    placeholder="Mô tả chi tiết..."
                    rows={3}
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveMod}
                disabled={!newModData.name || !newModData.desc}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu Thay Đổi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHOP ITEM MODAL */}
      <AnimatePresence>
        {showShopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowShopModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingShopItem ? 'Chỉnh sửa Vật Phẩm' : 'Thêm Vật Phẩm Mới'}</h3>
                <button onClick={() => setShowShopModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tên Vật Phẩm</label>
                  <input 
                    type="text"
                    value={newShopItemData.name || ''}
                    onChange={(e) => setNewShopItemData({...newShopItemData, name: e.target.value})}
                    placeholder="VD: VIP Gold 30 Ngày"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Giá (LW Coins)</label>
                  <input 
                    type="number"
                    value={newShopItemData.price || 0}
                    onChange={(e) => setNewShopItemData({...newShopItemData, price: parseInt(e.target.value) || 0})}
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Mô tả</label>
                  <textarea 
                    value={newShopItemData.desc || ''}
                    onChange={(e) => setNewShopItemData({...newShopItemData, desc: e.target.value})}
                    placeholder="Mô tả chi tiết..."
                    rows={3}
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveShopItem}
                disabled={!newShopItemData.name || newShopItemData.price === undefined}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu Thay Đổi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE FACTION MODAL */}
      <AnimatePresence>
        {showCreateFactionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateFactionModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Tạo Bang Hội Mới</h3>
                <button onClick={() => setShowCreateFactionModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tên Bang Hội</label>
                  <input 
                    type="text"
                    value={newFactionData.name || ''}
                    onChange={(e) => setNewFactionData({...newFactionData, name: e.target.value})}
                    placeholder="VD: The Ballas"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tag Bang Hội (3-4 Ký tự)</label>
                  <input 
                    type="text"
                    maxLength={4}
                    value={newFactionData.tag || ''}
                    onChange={(e) => setNewFactionData({...newFactionData, tag: e.target.value.toUpperCase()})}
                    placeholder="VD: BAL"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Mô tả</label>
                  <textarea 
                    value={newFactionData.description || ''}
                    onChange={(e) => setNewFactionData({...newFactionData, description: e.target.value})}
                    placeholder="Mô tả về bang hội của bạn..."
                    rows={3}
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!profile || !newFactionData.name || !newFactionData.tag) return;
                  if ((profile.lwCoins || 0) < 5000) {
                    alert("Bạn không đủ 5000 LW Coins để tạo bang hội!");
                    return;
                  }
                  try {
                    const docRef = await addDoc(collection(db, 'factions'), {
                      name: newFactionData.name,
                      tag: newFactionData.tag,
                      description: newFactionData.description || '',
                      leaderId: profile.uid,
                      members: [profile.uid],
                      createdAt: serverTimestamp()
                    });
                    
                    await setDoc(doc(db, 'users', profile.uid), {
                      lwCoins: (profile.lwCoins || 0) - 5000,
                      factionId: docRef.id,
                      faction: newFactionData.tag
                    }, { merge: true });
                    
                    setShowCreateFactionModal(false);
                    setNewFactionData({ name: '', tag: '', description: '' });
                    alert("Tạo bang hội thành công!");
                  } catch (e) {
                    console.error("Lỗi khi tạo bang hội:", e);
                  }
                }}
                disabled={!newFactionData.name || !newFactionData.tag || newFactionData.tag.length < 3}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo Bang Hội (5000 LW Coins)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE VOICE ROOM MODAL */}
      <AnimatePresence>
        {showCreateVoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateVoiceModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Tạo Phòng Voice</h3>
                <button onClick={() => setShowCreateVoiceModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tên Phòng</label>
                  <input 
                    type="text"
                    value={newVoiceRoomData.name || ''}
                    onChange={(e) => setNewVoiceRoomData({...newVoiceRoomData, name: e.target.value})}
                    placeholder="VD: Phòng chém gió"
                    className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                <div className="flex items-center justify-between bg-bg-dark border border-white/10 rounded-xl px-4 py-3">
                  <label className="text-sm font-bold">Phòng Riêng Tư</label>
                  <input 
                    type="checkbox"
                    checked={newVoiceRoomData.isPrivate || false}
                    onChange={(e) => setNewVoiceRoomData({...newVoiceRoomData, isPrivate: e.target.checked})}
                    className="w-5 h-5 accent-brand-primary"
                  />
                </div>
                {newVoiceRoomData.isPrivate && (
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Mật Khẩu</label>
                    <input 
                      type="text"
                      value={newVoiceRoomData.password || ''}
                      onChange={(e) => setNewVoiceRoomData({...newVoiceRoomData, password: e.target.value})}
                      placeholder="Nhập mật khẩu phòng"
                      className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={async () => {
                  if (!profile || !newVoiceRoomData.name) return;
                  try {
                    const docRef = await addDoc(collection(db, 'voiceRooms'), {
                      name: newVoiceRoomData.name,
                      isPrivate: newVoiceRoomData.isPrivate || false,
                      password: newVoiceRoomData.password || '',
                      maxParticipants: 3,
                      participants: [profile.uid],
                      createdAt: serverTimestamp()
                    });
                    
                    setVoiceRoomId(docRef.id);
                    setShowCreateVoiceModal(false);
                    setNewVoiceRoomData({ name: '', maxParticipants: 3, isPrivate: false });
                    alert("Tạo phòng thành công! (Giao diện giả lập)");
                  } catch (e) {
                    console.error("Lỗi khi tạo phòng voice:", e);
                  }
                }}
                disabled={!newVoiceRoomData.name || (newVoiceRoomData.isPrivate && !newVoiceRoomData.password)}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo Phòng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPDATE PROMPT MODAL */}
      <AnimatePresence>
        {showUpdatePrompt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-brand-primary/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-brand-primary/20 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto text-brand-primary">
                <Download size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Bản Cập Nhật Mới!</h3>
                <p className="text-gray-400 text-sm">
                  Đã có phiên bản {appConfig?.latestVersion}. Vui lòng cập nhật để trải nghiệm các tính năng mới nhất.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    sessionStorage.setItem('dismissedUpdate', appConfig?.latestVersion);
                    setShowUpdatePrompt(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Để sau
                </button>
                <a 
                  href={appConfig?.updateUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
                >
                  Cập nhật ngay
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}} />
    </div>
  );
}

// Desktop Sidebar Nav Item
function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
        active ? "bg-brand-primary/10 text-brand-primary" : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-110")}>{icon}</div>
      <span className="font-medium">{label}</span>
      {active && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-brand-primary rounded-r-full" />}
    </button>
  );
}

// Mobile Bottom Nav Item
function BottomNavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative",
        active ? "text-brand-primary" : "text-gray-500 hover:text-gray-300"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "-translate-y-1")}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
      {active && <motion.div layoutId="activeBottomNav" className="absolute bottom-1 w-1 h-1 bg-brand-primary rounded-full" />}
    </button>
  );
}

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl flex flex-col justify-center">
      <p className="text-[9px] md:text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5 md:mb-1 truncate">{label}</p>
      <p className="font-semibold text-xs md:text-sm truncate">{value}</p>
    </div>
  );
}
