import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Send } from 'lucide-react';

export default function ChatRoom({ user }) {
  const { userId: otherUserId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Generate a unique chat ID based on both user IDs so they share the same room
  const chatId = [user.uid, otherUserId].sort().join('_');

  // Fetch the other user's info for the header
  useEffect(() => {
    const fetchOtherUser = async () => {
      const docSnap = await getDoc(doc(db, 'users', otherUserId));
      if (docSnap.exists()) {
        setOtherUser(docSnap.data());
      }
    };
    fetchOtherUser();
  }, [otherUserId]);

  // Listen for real-time messages in this specific chat room
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-gray-800 bg-gray-900/50 p-4 backdrop-blur-md">
        <Link to="/chat" className="rounded-full bg-gray-800 p-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
            {otherUser?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="font-bold text-white">{otherUser?.displayName || 'Loading...'}</h2>
            <p className="text-xs text-primary">Active</p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="mt-20 text-center text-gray-500 text-sm">Say hi to start the conversation!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                    isMe 
                      ? 'bg-primary text-white rounded-br-sm' 
                      : 'bg-gray-800 text-white rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-800 bg-gray-900/50 p-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full rounded-full border border-gray-800 bg-gray-900 px-4 py-3 pr-12 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
