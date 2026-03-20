import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Target, ArrowRight } from 'lucide-react';

export default function Setup({ user }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  // Saves user profile data to Firestore
  const handleSetup = async (e) => {
    e.preventDefault();
    if (!displayName || !goal) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        goal,
        email: user.email,
        steps: 0,
        createdAt: new Date().toISOString()
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Target className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-white">Complete Profile</h1>
          <p className="mt-2 text-gray-400">Let's set up your fitness journey</p>
        </div>

        <form onSubmit={handleSetup} className="glass rounded-3xl p-8">
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-white outline-none focus:border-primary"
                placeholder="How should we call you?"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Fitness Goal</label>
              <select
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-white outline-none focus:border-primary"
              >
                <option value="" disabled>Select a goal</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="endurance">Endurance</option>
                <option value="stay_active">Just Stay Active</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue to Dashboard'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
