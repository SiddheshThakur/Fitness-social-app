import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  query, 
  where 
} from 'firebase/firestore';
import { Search, UserPlus, Check, MessageSquare, Footprints } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import useToast from '../hooks/useToast';

const INTERESTS = [
  { id: 'all', label: 'All' },
  { id: 'running', label: '🏃 Running' },
  { id: 'walking', label: '🚶 Walking' },
  { id: 'gym', label: '🏋️ Gym' },
  { id: 'yoga', label: '🧘 Yoga' },
  { id: 'cycling', label: '🚴 Cycling' },
  { id: 'hiking', label: '🥾 Hiking' },
  { id: 'swimming', label: '🏊 Swimming' }
];

const ACTIVITY_LEVELS = {
  beginner: { label: 'Beginner', color: 'bg-green-100 text-green-700' },
  active: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
  athlete: { label: 'Athlete', color: 'bg-orange-100 text-orange-700' }
};

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [connecting, setConnecting] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;

    const today = new Date();
    // Use same local date logic as Dashboard
    const dateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
      // 1. Fetch current user profile for shared interests check
      const currentUserRef = doc(db, 'users', currentUid);
      const currentUserSnap = await getDoc(currentUserRef);
      if (currentUserSnap.exists()) {
        setCurrentUserProfile(currentUserSnap.data());
      }

      // 2. Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = [];
      const stepsPromises = [];
      
      usersSnap.forEach(userDoc => {
        if (userDoc.id !== currentUid) {
          allUsers.push({ id: userDoc.id, ...userDoc.data() });
          // Path: steps/{uid}_{today}
          stepsPromises.push(getDoc(doc(db, 'steps', `${userDoc.id}_${dateStr}`)));
        }
      });

      const stepsSnaps = await Promise.all(stepsPromises);
      const stepsMap = {};
      stepsSnaps.forEach(snap => {
        if (snap.exists()) {
          const data = snap.data();
          stepsMap[data.uid] = data.steps;
        }
      });

      // 3. Fetch connections involving current user
      const q = query(
        collection(db, 'connections'),
        where('userA', '==', currentUid)
      );
      const q2 = query(
        collection(db, 'connections'),
        where('userB', '==', currentUid)
      );

      const [connSnap1, connSnap2] = await Promise.all([getDocs(q), getDocs(q2)]);
      const connectionsMap = {};
      
      [...connSnap1.docs, ...connSnap2.docs].forEach(doc => {
        const data = doc.data();
        const otherUid = data.userA === currentUid ? data.userB : data.userA;
        connectionsMap[otherUid] = data.status;
      });

      // Combine step data into user objects
      const finalUsers = allUsers.map(u => ({
        ...u,
        todaySteps: stepsMap[u.id] || null
      }));

      setUsers(finalUsers);
      setConnections(connectionsMap);
    } catch (error) {
      console.error("Error fetching discover data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (theirUid, theirName) => {
    if (!auth.currentUser || connecting[theirUid]) return;
    const currentUid = auth.currentUser.uid;

    setConnecting(prev => ({ ...prev, [theirUid]: true }));

    // Doc ID: currentUid_theirUid (sorted)
    const docId = [currentUid, theirUid].sort().join('_');
    const connectionRef = doc(db, 'connections', docId);

    try {
      await setDoc(connectionRef, {
        userA: currentUid,
        userB: theirUid,
        status: 'connected',
        createdAt: serverTimestamp()
      });

      // Update local state immediately
      setConnections(prev => ({ ...prev, [theirUid]: 'connected' }));
      showToast(`Connected with ${theirName}! 👋`, "success");
    } catch (error) {
      console.error("Error creating connection:", error);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setConnecting(prev => ({ ...prev, [theirUid]: false }));
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'all') return true;
    return u.interests?.includes(filter);
  });

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-4 flex flex-col items-center">
          <Skeleton width="80px" height="80px" circle={true} />
          <Skeleton width="100px" height="18px" />
          <Skeleton width="60px" height="12px" />
          <div className="flex gap-1 justify-center">
            <Skeleton width="40px" height="16px" rounded="rounded-md" />
            <Skeleton width="40px" height="16px" rounded="rounded-md" />
          </div>
          <Skeleton width="100%" height="44px" rounded="rounded-xl" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-4 pt-8 max-w-lg mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          Discover people 🔍
        </h1>
        <p className="text-gray-500 font-medium">Find others who share your passion</p>
      </header>

      {/* Filter Bar */}
      <div className="flex overflow-x-auto gap-2 pb-6 -mx-4 px-4 no-scrollbar">
        {INTERESTS.map(item => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
              filter === item.id 
                ? 'bg-purple-600 text-white shadow-md transform scale-105' 
                : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? renderSkeleton() : (
        <>
          {filteredUsers.length === 0 ? (
            <EmptyState 
              emoji={filter === 'all' ? '🌱' : '🔍'}
              title={filter === 'all' ? "You're one of the first!" : "No one here yet"}
              subtitle={filter === 'all' ? "Share the app with friends to find people to connect with" : "Try a different interest filter"}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredUsers.map(user => {
                const status = connections[user.id];
                const activity = ACTIVITY_LEVELS[user.activityLevel] || ACTIVITY_LEVELS.beginner;
                // Shared interests highlight
                const userInterests = user.interests || [];
                
                return (
                  <div key={user.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    {/* Wrap Info in Clickable area */}
                    <div 
                      onClick={() => navigate(`/user/${user.id}`)}
                      className="cursor-pointer flex flex-col items-center w-full"
                    >
                      {/* Profile Photo */}
                      <div className="w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-100 mb-3 hover:scale-105 transition-transform">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                            <span className="text-2xl font-bold">{user.name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <h3 className="font-extrabold text-gray-900 text-sm mb-1 truncate w-full hover:text-purple-600 transition-colors">{user.name}</h3>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 ${activity.color}`}>
                        {activity.label}
                      </div>

                      {/* Interests */}
                      <div className="flex flex-wrap gap-1 justify-center mb-4 min-h-[44px]">
                        {userInterests.slice(0, 3).map(interestId => {
                          const interest = INTERESTS.find(i => i.id === interestId);
                          if (!interest) return null;
                          const isShared = currentUserProfile?.interests?.includes(interestId);
                          return (
                            <span 
                              key={interestId} 
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5 ${
                                isShared ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isShared && <Check className="w-2 h-2" />}
                              {interest.label.includes(' ') ? interest.label.split(' ')[1] : interest.label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Steps */}
                      <div className="text-[11px] font-bold text-gray-500 mb-4 bg-gray-50 px-3 py-1 rounded-full flex items-center gap-1">
                        <Footprints className="w-3 h-3 text-gray-400" />
                        {user.todaySteps !== null ? `${user.todaySteps.toLocaleString()} steps` : "Not logged yet"}
                      </div>
                    </div>

                    {/* Connect Button (Keep separate to avoid bubbling issues if needed, or just let it be) */}
                    <div className="w-full mt-auto">
                      {status === 'connected' ? (
                        <button 
                          onClick={() => navigate(`/chat/${user.id}`)}
                          className="w-full py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Connected
                        </button>
                      ) : status === 'pending' ? (
                        <button 
                          disabled 
                          className="w-full py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold border border-gray-200 cursor-not-allowed"
                        >
                          Pending...
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleConnect(user.id, user.name)}
                          disabled={connecting[user.id]}
                          className="w-full py-2 bg-[#22c55e] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center"
                        >
                          {connecting[user.id] ? (
                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            "Connect +"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
