import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowLeft } from 'lucide-react';

export default function ChatList({ user }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // For this MVP, we will just list all other users as potential chats.
  // In a real app, you'd only list users you've already sent messages to.
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.uid) {
            usersList.push({ id: doc.id, ...doc.data() });
          }
        });
        setChats(usersList);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [user.uid]);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <header className="mb-8 flex items-center gap-4">
        <Link to="/dashboard" className="rounded-full bg-gray-900 p-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
      </header>

      {loading ? (
        <div className="text-center text-gray-500">Loading chats...</div>
      ) : (
        <div className="grid gap-3">
          {chats.length === 0 ? (
            <div className="text-center text-gray-500">No one to chat with yet. head over to Discover!</div>
          ) : (
            chats.map((chatUser) => (
              <Link
                key={chatUser.id}
                to={`/chat/${chatUser.id}`}
                className="glass-panel flex items-center gap-4 rounded-2xl p-4 transition-transform hover:scale-[1.02]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-lg font-bold text-white">
                  {chatUser.displayName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">{chatUser.displayName}</h3>
                  <p className="text-sm text-gray-400">Tap to start chatting</p>
                </div>
                <MessageSquare className="h-5 w-5 text-gray-500" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
