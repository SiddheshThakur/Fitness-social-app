import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Activity 
} from 'lucide-react';
import Skeleton from '../components/Skeleton';

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [isActiveToday, setIsActiveToday] = useState(false);
  const [otherUserSteps, setOtherUserSteps] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const currentUid = auth.currentUser?.uid;
  const chatId = [currentUid, userId].sort().join('_');

  useEffect(() => {
    if (!currentUid || !userId) return;

    // 1. Fetch Other User Profile & Active Status
    const fetchOtherUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setOtherUser(data);

          // Check if active today (has steps)
          const today = new Date();
          const dateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
          const stepDoc = await getDoc(doc(db, 'steps', `${userId}_${dateStr}`));
          if (stepDoc.exists()) {
            const stepData = stepDoc.data();
            setOtherUserSteps(stepData.steps || 0);
            setIsActiveToday(stepData.steps > 0);
          }
        }

        // Fetch current user profile for senderName
        const currentDoc = await getDoc(doc(db, 'users', currentUid));
        if (currentDoc.exists()) {
          setCurrentUserProfile(currentDoc.data());
        }
      } catch (error) {
        console.error("Error fetching chat participant:", error);
      }
    };
    fetchOtherUser();

    // 2. Real-time Messages Listener
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('sentAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      
      // Auto-scroll to bottom
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [userId, chatId, currentUid]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !currentUid) return;

    try {
      const textToSend = newMessage.trim();
      setNewMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: textToSend,
        senderId: currentUid,
        senderName: currentUserProfile?.name || 'User',
        sentAt: serverTimestamp()
      });
      
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = (e) => {
    const el = e.target;
    el.style.height = 'inherit';
    const computed = window.getComputedStyle(el);
    const height = parseInt(computed.getPropertyValue('border-top-width'), 10)
                  + parseInt(computed.getPropertyValue('padding-top'), 10)
                  + el.scrollHeight
                  + parseInt(computed.getPropertyValue('padding-bottom'), 10)
                  + parseInt(computed.getPropertyValue('border-bottom-width'), 10);
    
    // Limit to approx 3 lines (e.g. 80-100px)
    el.style.height = `${Math.min(height, 120)}px`;
  };

  const formatMessageTime = (sentAt) => {
    if (!sentAt) return '';
    const date = sentAt.toDate ? sentAt.toDate() : new Date(sentAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Fixed Header */}
      <header className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white z-10 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        
        <div className="flex items-center gap-3">
          {otherUser ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100">
                {otherUser.photoURL ? (
                  <img src={otherUser.photoURL} alt={otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 font-bold">
                    {otherUser.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-gray-900 leading-tight">{otherUser.name}</h2>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isActiveToday ? 'bg-[#22c55e]' : 'bg-gray-300'}`}></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {isActiveToday ? 'Active Today' : 'Away'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <Skeleton width="40px" height="40px" circle={true} />
              <div className="flex flex-col gap-1">
                <Skeleton width="100px" height="14px" />
                <Skeleton width="60px" height="10px" />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Activity Banner */}
      {otherUserSteps > 0 && (
        <div className="bg-green-50/50 py-2 border-b border-green-100/50 flex items-center justify-center transition-opacity duration-1000 animate-in fade-in slide-in-from-top-1">
          <p className="text-[10px] font-bold text-green-600 flex items-center gap-1.5 uppercase tracking-wider">
            <span>🏃</span>
            {otherUser?.name?.split(' ')[0]} has walked {otherUserSteps.toLocaleString()} steps today!
          </p>
        </div>
      )}

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-2 pb-20">
            <MessageSquare className="w-12 h-12" />
            <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUid;
            const nextMsg = messages[idx + 1];
            const isLastFromSender = !nextMsg || nextMsg.senderId !== msg.senderId;

            return (
              <div 
                key={msg.id || idx} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}
              >
                <div 
                  className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm block ${
                    isMe 
                      ? 'bg-[#22c55e] text-white rounded-2xl rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                {isLastFromSender && (
                  <span className="text-[9px] font-bold text-gray-300 uppercase mt-1 px-1">
                    {formatMessageTime(msg.sentAt)}
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Bar */}
      <div className="p-4 sm:p-6 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2 bg-gray-50 rounded-[28px] p-2 border border-gray-100 focus-within:border-green-200 focus-within:bg-white transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            rows={1}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              adjustTextareaHeight(e);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-base font-medium py-3 px-4 resize-none max-h-[120px] scrollbar-hide min-h-[44px]"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!newMessage.trim()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#22c55e] hover:bg-green-600 text-white rounded-full transition-all active:scale-90 disabled:opacity-30 disabled:grayscale mb-1 mr-1"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
        {/* Note: In production, consider listening to window resize/visualViewport for mobile keyboard centering */}
      </div>
    </div>
  );
}

// Added icon for empty state if missing
function MessageSquare(props) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
