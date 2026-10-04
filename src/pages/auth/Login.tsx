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
    <div className="min-h-screen bg-neutral-50 flex">
      {/* LEFT SIDE - BRANDING (40%) */}
      <div 
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 text-white relative bg-cover bg-center"
        style={{ backgroundImage: `url('/wmsu1_live.jpg')` }}
      >
        <div className="absolute inset-0 bg-red-900/85 mix-blend-multiply"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <img src="/WMSU.png" alt="WMSU Logo" className="w-12 h-12 object-contain" />
            <img src="/RDEC.jpg" alt="RDEC Logo" className="w-12 h-12 object-contain rounded-full bg-white p-0.5" />
            <div>
              <h2 className="font-bold text-lg leading-tight">WMSU</h2>
              <p className="text-white/90 text-sm">Research Project Development System</p>
            </div>
          </div>
          
          <div className="space-y-8 mt-24">
            <h1 className="text-4xl font-semibold leading-tight drop-shadow-md">
              Welcome Back.
            </h1>
            <p className="text-red-50 text-lg leading-relaxed max-w-md drop-shadow-sm">
              Sign in to manage your research proposals, review assignments, and access WMSU RPDS features.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-red-200 text-sm">
          &copy; {new Date().getFullYear()} Western Mindanao State University
        </div>
      </div>

      {/* RIGHT SIDE - FORM (60%) */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8 py-12">
        <div className="bg-white p-10 max-w-md w-full shadow-sm rounded-sm">
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-slate-600 mt-2 text-sm">Access your WMSU RPDS account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded-sm border-l-2 border-red-800">
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

            <div className="pt-4">
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
            </div>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-8">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-red-800 font-medium hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
