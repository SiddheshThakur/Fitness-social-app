import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Activity, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handles user login via Firebase
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On success, App.jsx's onAuthStateChanged listener handles redirection
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />

      <div className="z-10 w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-700 shadow-lg shadow-primary/30">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-400">Enter your details to sign in</p>
        </div>

        <form onSubmit={handleLogin} className="glass rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mb-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 pl-11 text-white placeholder-gray-500 outline-none transition-all focus:border-primary focus:bg-gray-900 focus:ring-1 focus:ring-primary"
                  placeholder="name@example.com"
                />
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <a href="#" className="text-xs font-medium text-primary hover:text-primary-hover">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 pl-11 text-white placeholder-gray-500 outline-none transition-all focus:border-primary focus:bg-gray-900 focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign in'}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary transition-colors hover:text-primary-hover">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
