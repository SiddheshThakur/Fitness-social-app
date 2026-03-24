import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, or, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { Flame, Plus, Minus } from 'lucide-react';
import WeeklyChart from '../components/WeeklyChart';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import useToast from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  const [todaySteps, setTodaySteps] = useState(0);
  const [inputSteps, setInputSteps] = useState(0);
  
  const [streak, setStreak] = useState(0);
  const [saving, setSaving] = useState(false);

  const [weeklyData, setWeeklyData] = useState({});
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    
    // Get user's local date string YYYY-MM-DD
    const today = new Date();
    // Offset by timezone to get correct local date string
    const dateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
      // 1. Fetch Profile
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setProfile(userSnap.data());
      }

      // 2. Fetch past 30 days of steps for Streak & Today
      const q = query(
        collection(db, 'steps'),
        where('uid', '==', uid),
        orderBy('date', 'desc'),
        limit(30)
      );
      
      const stepsSnap = await getDocs(q);
      const entries = [];
      const dataMap = {};
      stepsSnap.forEach(d => {
        const data = d.data();
        entries.push(data);
        dataMap[data.date] = data.steps;
      });
      setWeeklyData(dataMap);

      // Find today's entry
      const todayEntry = entries.find(e => e.date === dateStr);
      if (todayEntry) {
        setTodaySteps(todayEntry.steps || 0);
        setInputSteps(todayEntry.steps || 0);
      }

      // Calculate streak
      let currentStreak = 0;
      let checkDate = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDateStr = new Date(checkDate.getTime() - (checkDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const entry = entries.find(e => e.date === checkDateStr);
        
        if (entry && entry.steps > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          // If today is 0, we check yesterday. If yesterday has steps, streak might just be continuing today
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break; // streak broken
        }
      }
      setStreak(currentStreak);

      fetchConnections(uid, dateStr);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async (uid, dateStr) => {
    try {
      const q = query(
        collection(db, 'connections'),
        or(where('userA', '==', uid), where('userB', '==', uid))
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      const promises = snap.docs.map(async (connectionDoc) => {
        const data = connectionDoc.data();
        const friendUid = data.userA === uid ? data.userB : data.userA;
        
        const profSnap = await getDoc(doc(db, 'users', friendUid));
        if (!profSnap.exists()) return null;
        const profData = profSnap.data();

        const stepSnap = await getDoc(doc(db, 'steps', `${friendUid}_${dateStr}`));
        const isActiveToday = stepSnap.exists() && stepSnap.data().steps > 0;

        return {
          uid: friendUid,
          firstName: profData.name?.split(' ')[0] || 'Friend',
          photoURL: profData.photoURL,
          isActiveToday
        };
      });

      const results = await Promise.all(promises);
      setFriends(results.filter(Boolean));
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleUpdateSteps = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    const uid = auth.currentUser.uid;
    const today = new Date();
    const dateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
      const stepRef = doc(db, 'steps', `${uid}_${dateStr}`);
      await setDoc(stepRef, {
        uid,
        date: dateStr,
        steps: inputSteps,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setTodaySteps(inputSteps);
      setWeeklyData(prev => ({
        ...prev,
        [dateStr]: inputSteps
      }));
      
      // Recalibrate streak locally if crossing the 0 threshold
      if (todaySteps === 0 && inputSteps > 0) {
        setStreak(prev => prev + 1);
      } else if (todaySteps > 0 && inputSteps === 0) {
        setStreak(Math.max(0, streak - 1));
      }
      
      showToast("Steps logged! Keep it up 🔥", "success");

    } catch (error) {
      console.error('Error saving steps:', error);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const adjustSteps = (amount) => {
    setInputSteps(prev => Math.max(0, prev + amount));
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-lg mx-auto pb-24 px-4 pt-8">
        <div className="space-y-2">
          <Skeleton width="180px" height="32px" />
          <Skeleton width="100px" height="18px" />
        </div>
        
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
          <Skeleton width="200px" height="200px" circle={true} />
          <Skeleton width="120px" height="20px" className="mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Skeleton height="70px" className="rounded-2xl" />
          <Skeleton height="70px" className="rounded-2xl" />
          <Skeleton height="70px" className="rounded-2xl" />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <Skeleton width="150px" height="20px" />
          <div className="flex gap-4">
            <Skeleton width="40px" height="40px" circle={true} />
            <Skeleton width="40px" height="40px" circle={true} />
            <Skeleton width="40px" height="40px" circle={true} />
          </div>
        </div>
      </div>
    );
  }

  // Time-based greeting
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const name = profile?.name?.split(' ')[0] || 'there';
  const goal = profile?.stepGoal || 8000;
  const percentage = Math.min(100, Math.round((todaySteps / goal) * 100));

  // SVG Ring settings
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-6">
      {/* 1. GREETING HEADER */}
      <header className="pt-4 pb-2 px-1">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight truncate">
          {greeting}, {name}! 👋
        </h1>
        {profile?.activityLevel && (
          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full capitalize border border-green-200 uppercase tracking-widest">
            {profile.activityLevel}
          </span>
        )}
      </header>

      {/* 2. STEP PROGRESS RING */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative flex items-center justify-center">
          <svg className="transform -rotate-90 w-64 h-64" viewBox="0 0 200 200">
            {/* Background Ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#f3f4f6"
              strokeWidth="16"
            />
            {/* Progress Ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#22c55e"
              strokeWidth="16"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                transition: 'stroke-dashoffset 1s ease-in-out'
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-black text-gray-900 tracking-tighter">{todaySteps.toLocaleString()}</span>
            <span className="text-sm font-bold text-gray-400 mt-1">/ {goal.toLocaleString()} steps</span>
          </div>
        </div>
        <p className="mt-4 font-bold text-green-600 bg-green-50 px-4 py-1.5 rounded-full text-sm">
          {percentage}% of daily goal
        </p>
      </section>

      {/* 3. STEP INPUT SECTION */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-bold text-gray-800 text-center text-lg">Log your steps today</h2>
        <div className="flex items-center justify-center space-x-6 py-2">
          <button 
            onClick={() => adjustSteps(-500)}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors shadow-sm"
          >
            <Minus className="w-8 h-8" />
          </button>
          
          <input
            type="number"
            value={inputSteps}
            onChange={(e) => setInputSteps(Number(e.target.value))}
            className="w-24 text-center text-4xl font-black bg-transparent focus:outline-none border-b-4 border-gray-100 focus:border-[#22c55e] py-1"
          />
          
          <button 
            onClick={() => adjustSteps(500)}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors shadow-sm"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
        
        <button
          onClick={handleUpdateSteps}
          disabled={saving || inputSteps === todaySteps}
          className="w-full bg-[#22c55e] hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {saving ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Set steps"
          )}
        </button>
      </section>

      {/* 4. STREAK COUNTER */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl p-5 border border-orange-100 flex items-center shadow-sm">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mr-4 shrink-0">
          <Flame className={`w-8 h-8 ${streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-300'}`} />
        </div>
        <div>
          <h3 className="font-extrabold text-gray-900 text-xl">
            {streak > 0 ? `${streak} day streak` : "Start your streak!"}
          </h3>
          <p className="text-sm font-medium text-orange-800/70">
            {streak > 0 ? "You're on fire! Keep it up." : "Log steps today to begin."}
          </p>
        </div>
      </section>

      {/* 5. TODAY'S STATS ROW */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Steps</span>
          <span className="text-lg font-black text-gray-900">{todaySteps >= 10000 ? (todaySteps/1000).toFixed(1)+'k' : todaySteps}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Goal</span>
          <span className="text-lg font-black text-gray-900">{goal >= 10000 ? (goal/1000).toFixed(1)+'k' : goal}</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Done</span>
          <span className="text-lg font-black text-[#22c55e]">{percentage}%</span>
        </div>
      </section>

      {/* WEEKLY CHART */}
      <WeeklyChart stepsData={weeklyData} stepGoal={goal} />

      {/* 6. FRIENDS ACTIVE TODAY */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">Friends active today 👟</h2>
          {!loadingFriends && friends.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              ({friends.filter(f => f.isActiveToday).length} of {friends.length} active)
            </span>
          )}
        </div>
        
        {loadingFriends ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center space-y-2 shrink-0">
                <Skeleton width="40px" height="40px" circle={true} />
                <Skeleton width="30px" height="8px" />
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <EmptyState 
            emoji="🤝"
            title="Find your fitness crew"
            subtitle="Connect with people on Discover to build your network"
            buttonText="Explore Discover"
            onButtonClick={() => navigate('/discover')}
          />
        ) : friends.filter(f => f.isActiveToday).length === 0 ? (
          <EmptyState 
            emoji="👟"
            title="None of your friends are active today"
            subtitle="Be the first to log your steps and lead the way!"
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x hide-scrollbar">
            {friends.filter(f => f.isActiveToday).map(friend => (
              <Link 
                key={friend.uid} 
                to={`/chat/${friend.uid}`}
                className="flex flex-col items-center space-y-1.5 shrink-0 snap-center group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-100">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-sm">
                        {friend.firstName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${friend.isActiveToday ? 'bg-[#22c55e]' : 'bg-gray-300'}`}></div>
                </div>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-[#22c55e] transition-colors truncate w-14 text-center">
                  {friend.firstName}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
