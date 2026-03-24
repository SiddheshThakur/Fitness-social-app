import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { User, MessageSquare, Search, ArrowRight } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function ChatListPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;

    try {
      // 1. Fetch all connections for the current user
      const q1 = query(collection(db, 'connections'), where('userA', '==', currentUid));
      const q2 = query(collection(db, 'connections'), where('userB', '==', currentUid));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const allConnections = [...snap1.docs, ...snap2.docs];

      if (allConnections.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // 2. For each connection, get profile and last message
      const conversationPromises = allConnections.map(async (connDoc) => {
        const data = connDoc.data();
        const otherUid = data.userA === currentUid ? data.userB : data.userA;
        const chatId = [currentUid, otherUid].sort().join('_');

        // Fetch other user profile
        const profileSnap = await getDoc(doc(db, 'users', otherUid));
        const profile = profileSnap.exists() ? profileSnap.data() : { name: 'Unknown User' };

        // Fetch last message
        const msgQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const msgSnap = await getDocs(msgQuery);
        const lastMsg = msgSnap.docs[0]?.data() || null;

        return {
          otherUid,
          profile,
          lastMsg,
          updatedAt: lastMsg?.timestamp?.toMillis() || data.createdAt?.toMillis() || 0
        };
      });

      const results = await Promise.all(conversationPromises);
      
      // 3. Sort by most recent message first
      results.sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(results);

    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const truncate = (str, n) => {
    return str?.length > n ? str.substr(0, n - 1) + "..." : str;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-8 max-w-lg mx-auto space-y-4">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Messages 💬</h1>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-gray-100">
            <Skeleton width="52px" height="52px" circle={true} />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton width="100px" height="16px" />
                <Skeleton width="40px" height="10px" />
              </div>
              <Skeleton width="70%" height="14px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-4 pt-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-black text-gray-900 mb-8">Messages 💬</h1>

      {conversations.length === 0 ? (
        <div className="py-20">
          <EmptyState 
            emoji="💬"
            title="No conversations yet"
            subtitle="Connect with people on Discover to start chatting"
            buttonText="Go to Discover"
            onButtonClick={() => navigate('/discover')}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const isUnread = conv.lastMsg && conv.lastMsg.senderId !== auth.currentUser.uid;
            
            return (
              <div 
                key={conv.otherUid}
                onClick={() => navigate(`/chat/${conv.otherUid}`)}
                className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-all hover:bg-gray-50"
              >
                {/* Profile Photo */}
                <div className="relative shrink-0">
                  <div className="w-[52px] h-[52px] rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100">
                    {conv.profile.photoURL ? (
                      <img src={conv.profile.photoURL} alt={conv.profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 font-bold">
                        {conv.profile.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* Unread Indicator */}
                  {isUnread && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-[#22c55e] border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-extrabold text-gray-900 truncate pr-1">{conv.profile.name}</h3>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2 shrink-0">
                      {conv.lastMsg ? formatTime(conv.lastMsg.timestamp) : ''}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${isUnread ? 'text-gray-900 font-bold' : 'text-gray-500 font-medium'}`}>
                    {conv.lastMsg ? truncate(conv.lastMsg.text, 35) : "Started a connection"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
