import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, ArrowLeft, Lock, Mail } from 'lucide-react';

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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Fetch user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    const role = userData?.role;
    switch(role) {
      case 'ADMIN': 
        navigate('/admin'); 
        break;
      case 'EVALUATOR': 
        navigate('/evaluator'); 
        break;
      case 'RPDU': 
        navigate('/rpdu'); 
        break;
      case 'PROPONENT': 
      default:
        navigate('/dashboard'); 
        break;
    }
  };

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-slate-50 flex font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* LEFT SIDE - BRANDING (40%) */}
      <div 
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 text-white relative bg-cover bg-center h-full overflow-hidden"
        style={{ backgroundImage: `url('/wmsu1_live.jpg')` }}
      >
        <div className="absolute inset-0 bg-red-900/85 mix-blend-multiply"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-12">
            <div className="flex items-center -space-x-2">
              <div className="relative z-10 w-11 h-11 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200/50 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="relative z-0 w-11 h-11 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200/50 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>
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
      <div className="w-full lg:w-3/5 h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className="bg-white p-6 sm:p-10 max-w-md w-full shadow-sm rounded-sm border border-slate-200/80 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto custom-scrollbar">
          {/* Return to Portal */}
          <div className="mb-6">
            <Link
              to="/"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#C8102E] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span>Back to Portal</span>
            </Link>
          </div>

          {/* Mobile Institutional Branding */}
          <div className="flex lg:hidden items-center gap-3 mb-8 pb-6 border-b border-slate-100">
            <div className="flex items-center -space-x-2">
              <div className="relative z-10 w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/WMSU.png" alt="WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div className="relative z-0 w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/RDEC-WMSU.png" alt="RDEC-WMSU Logo" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Western Mindanao State University</p>
              <h3 className="text-sm font-bold text-slate-900">Research Project Development System</h3>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-slate-600 mt-2 text-sm font-medium">Access your WMSU RPDS account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-[#C8102E] text-sm rounded-sm border-l-2 border-[#C8102E]">
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
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-[#C8102E] transition-colors text-slate-900 placeholder-slate-400 text-sm"
                  placeholder="Enter your email"
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
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-[#C8102E] transition-colors text-slate-900 placeholder-slate-400 text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group w-full bg-[#C8102E] text-white py-3 px-4 rounded-sm hover:bg-[#A00D26] transition-all duration-200 shadow-xs hover:shadow flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="h-5 w-20 bg-white/20 animate-pulse rounded-sm"></span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-8">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#C8102E] font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
