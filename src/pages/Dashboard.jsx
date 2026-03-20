import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Activity, LogOut, Users, MessageSquare } from 'lucide-react';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user's profile on mount to ensure they completed setup
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          // If no profile, they haven't finished setup
          navigate('/setup');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, navigate]);

  // Handles adding 1000 steps manually (since we don't have a real pedometer)
  const handleAddSteps = async () => {
    if (!profile) return;
    const newSteps = (profile.steps || 0) + 1000;
    try {
      await updateDoc(doc(db, 'users', user.uid), { steps: newSteps });
      setProfile({ ...profile, steps: newSteps });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!profile) return null; // Wait for redirect to /setup

  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-24">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hello, {profile.displayName}</h1>
          <p className="text-sm text-gray-400">Time to hit your {profile.goal.replace('_', ' ')} goals!</p>
        </div>
        <button onClick={handleLogout} className="rounded-full bg-gray-900 p-2 text-gray-400 hover:text-white">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Main Stats Card */}
      <div className="glass-panel mb-8 rounded-3xl p-6 shadow-xl shadow-primary/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Today's Steps</p>
            <p className="text-3xl font-bold text-white">{profile.steps?.toLocaleString() || 0}</p>
          </div>
        </div>
        
        <button 
          onClick={handleAddSteps}
          className="w-full rounded-xl bg-primary/10 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          + Add 1,000 Steps
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/discover" className="glass flex flex-col items-center justify-center rounded-3xl p-6 transition-transform hover:scale-105">
          <Users className="mb-2 h-8 w-8 text-blue-500" />
          <span className="font-medium text-white">Discover</span>
        </Link>
        <Link to="/chat" className="glass flex flex-col items-center justify-center rounded-3xl p-6 transition-transform hover:scale-105">
          <MessageSquare className="mb-2 h-8 w-8 text-emerald-500" />
          <span className="font-medium text-white">Chats</span>
        </Link>
      </div>
    </div>
  );
}
