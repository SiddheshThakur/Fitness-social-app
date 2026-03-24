import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ArrowLeft, 
  User, 
  Check, 
  MessageSquare, 
  Flame, 
  Calendar, 
  Target,
  Heart
} from 'lucide-react';

const INTERESTS = [
  { id: 'running', label: '🏃 Running' },
  { id: 'walking', label: '🚶 Walking' },
  { id: 'gym', label: '🏋️ Gym' },
  { id: 'yoga', label: '🧘 Yoga' },
  { id: 'cycling', label: '🚴 Cycling' },
  { id: 'hiking', label: '🥾 Hiking' },
  { id: 'swimming', label: '🏊 Swimming' },
  { id: 'sports', label: '⚽ Sports' }
];

const ACTIVITY_LEVELS = {
  beginner: { label: 'Beginner', color: 'bg-green-100 text-green-700', icon: '🌱' },
  active: { label: 'Active', color: 'bg-blue-100 text-blue-700', icon: '⚡' },
  athlete: { label: 'Athlete', color: 'bg-orange-100 text-orange-700', icon: '🏆' }
};

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [steps, setSteps] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;

    try {
      // 1. Fetch User Data
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        navigate('/discover');
        return;
      }
      const userData = userSnap.data();
      setProfile(userData);

      // 2. Fetch Current User Data (for shared interests)
      const currentUserRef = doc(db, 'users', currentUid);
      const currentUserSnap = await getDoc(currentUserRef);
      if (currentUserSnap.exists()) {
        setCurrentUserProfile(currentUserSnap.data());
      }

      // 3. Fetch Step History (last 30 days for better streak calc, though only showing 7)
      const stepsQuery = query(
        collection(db, 'steps'),
        where('uid', '==', userId),
        orderBy('date', 'desc'),
        limit(30)
      );
      const stepsSnap = await getDocs(stepsQuery);
      const stepsData = stepsSnap.docs.map(doc => doc.data());
      setSteps(stepsData);

      // 4. Fetch Connection Status
      const docId = [currentUid, userId].sort().join('_');
      const connSnap = await getDoc(doc(db, 'connections', docId));
      if (connSnap.exists()) {
        setConnectionStatus(connSnap.data().status);
      }

    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!auth.currentUser || !profile || connecting) return;
    const currentUid = auth.currentUser.uid;
    setConnecting(true);

    const docId = [currentUid, userId].sort().join('_');
    const connectionRef = doc(db, 'connections', docId);

    try {
      await setDoc(connectionRef, {
        userA: currentUid,
        userB: userId,
        status: 'connected',
        createdAt: serverTimestamp()
      });
      setConnectionStatus('connected');
    } catch (error) {
      console.error("Error connecting:", error);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        <p className="mt-4 text-gray-500 font-medium">Fetching profile...</p>
      </div>
    );
  }

  // Calculations
  const activity = ACTIVITY_LEVELS[profile?.activityLevel] || ACTIVITY_LEVELS.beginner;
  const joinedDate = profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Recently';
  
  // Weekly Steps (Last 7 Days)
  const today = new Date();
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = steps.find(s => s.date === dateStr);
    last7Days.push({ date: dateStr, steps: entry?.steps || 0 });
  }
  const weeklyTotal = last7Days.reduce((acc, curr) => acc + curr.steps, 0);
  const maxWeeklySteps = Math.max(...last7Days.map(d => d.steps), 1);

  // Best Streak (from the 30 days fetched)
  let bestStreak = 0;
  let currentStreak = 0;
  // Sort steps by date ascending for streak calculation
  const sortedSteps = [...steps].sort((a, b) => a.date.localeCompare(b.date));
  
  if (sortedSteps.length > 0) {
    // Basic streak: consecutive days with steps > 0
    let lastDate = null;
    sortedSteps.forEach(s => {
      if (s.steps > 0) {
        if (!lastDate) {
          currentStreak = 1;
        } else {
          const d1 = new Date(lastDate);
          const d2 = new Date(s.date);
          const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            currentStreak++;
          } else {
            bestStreak = Math.max(bestStreak, currentStreak);
            currentStreak = 1;
          }
        }
        lastDate = s.date;
      } else {
        bestStreak = Math.max(bestStreak, currentStreak);
        currentStreak = 0;
        lastDate = null;
      }
    });
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top Header/Action Bar */}
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <span className="font-bold text-gray-900">User Profile</span>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                <User className="w-16 h-16" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{profile?.name}</h1>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-xs font-black uppercase tracking-wider ${activity.color}`}>
              <span>{activity.icon}</span>
              {activity.label}
            </div>
          </div>

          <div className="flex items-center gap-4 w-full pt-2">
            <div className="flex-1 flex flex-col items-center">
              <span className="text-gray-400 text-[10px] font-bold uppercase">Member Since</span>
              <span className="font-extrabold text-gray-800 flex items-center gap-1 text-sm">
                <Calendar className="w-3 h-3" /> {joinedDate}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-gray-100"></div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-gray-400 text-[10px] font-bold uppercase">Best Streak</span>
              <span className="font-extrabold text-orange-500 flex items-center gap-1 text-sm">
                <Flame className="w-3 h-3 fill-orange-500" /> {bestStreak} Days
              </span>
            </div>
          </div>
        </section>

        {/* Interests Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile?.interests?.map(interestId => {
              const interest = INTERESTS.find(i => i.id === interestId);
              if (!interest) return null;
              const isShared = currentUserProfile?.interests?.includes(interestId);
              
              return (
                <div 
                  key={interestId}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isShared 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{interest.label}</span>
                    {isShared && (
                      <span className="text-[8px] flex items-center gap-0.5 mt-0.5 animate-pulse">
                        <Heart className="w-2 h-2 fill-green-700" /> You both love this!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weekly Stats Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              This Week
            </h2>
            <div className="text-right">
              <span className="text-xl font-black text-green-600">{weeklyTotal.toLocaleString()}</span>
              <span className="text-[10px] block font-bold text-gray-400 uppercase -mt-1">Total Steps</span>
            </div>
          </div>

          <div className="flex items-end justify-between h-24 gap-1.5 pt-4">
            {last7Days.reverse().map((day, idx) => {
              const height = (day.steps / maxWeeklySteps) * 100;
              const isToday = idx === 6;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-50 rounded-t-lg relative overflow-hidden h-full flex flex-col justify-end">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-700 ${isToday ? 'bg-green-500' : 'bg-green-200'}`}
                      style={{ height: `${Math.max(5, height)}%` }}
                    ></div>
                  </div>
                  <span className={`text-[9px] font-black uppercase ${isToday ? 'text-green-600' : 'text-gray-400'}`}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Button Section */}
        <div className="fixed bottom-6 left-0 right-0 px-6 max-w-md mx-auto z-20">
          {connectionStatus === 'connected' ? (
            <button 
              onClick={() => navigate(`/chat/${userId}`)}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 text-lg"
            >
              <MessageSquare className="w-6 h-6" />
              Message {profile?.name?.split(' ')[0]}
            </button>
          ) : (
            <button 
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-4 bg-[#22c55e] hover:bg-green-600 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 text-lg disabled:opacity-70"
            >
              {connecting ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Connect
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
