import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white p-12 max-w-md w-full shadow-sm rounded-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">WMSU RPDS</h1>
          <p className="text-slate-600 mt-2 text-sm">Research Project Development System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="relative">
            <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
              Email Address
            </label>
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900 placeholder-slate-400"
                placeholder="juan.delacruz@wmsu.edu.ph"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
              Password
            </label>
            <div className="flex items-center">
              <Lock className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900 placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-800 text-white py-3 px-4 rounded-sm hover:bg-red-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? (
              <span className="h-5 w-20 bg-white/20 animate-pulse rounded-sm"></span>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-red-800 font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
