import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { UserPlus, Activity, Search, ArrowLeft } from 'lucide-react';

export default function Discover({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all users to discover
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList = [];
        querySnapshot.forEach((doc) => {
          // Don't include the current user in the discover list
          if (doc.id !== user.uid) {
            usersList.push({ id: doc.id, ...doc.data() });
          }
        });
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user.uid]);

  const filteredUsers = users.filter((u) => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <header className="mb-8 flex items-center gap-4">
        <Link to="/dashboard" className="rounded-full bg-gray-900 p-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Discover</h1>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Find fitness buddies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-900/50 py-3 pl-12 pr-4 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading athletes...</div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500">No users found.</div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="glass flex items-center justify-between rounded-2xl p-4 transition-transform hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-primary text-lg font-bold text-white shadow-lg">
                    {u.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{u.displayName}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Activity className="h-3 w-3 text-primary" />
                      <span>{u.steps || 0} steps</span>
                      <span className="mx-1">•</span>
                      <span className="capitalize">{u.goal?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                
                <Link 
                  to={`/chat/${u.id}`}
                  className="rounded-xl bg-primary/10 p-3 text-primary transition-colors hover:bg-primary/20"
                >
                  <UserPlus className="h-5 w-5" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
