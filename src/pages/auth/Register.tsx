import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, User, Mail, Lock, Phone, Building2 } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    password: '',
    contactNumber: '',
    collegeDepartment: '',
    sex: 'MALE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          suffix: formData.suffix,
          contact_number: formData.contactNumber,
          college_department: formData.collegeDepartment,
          sex: formData.sex,
          role: 'PROPONENT'
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      // Assuming email confirmation is required or auto-login depending on Supabase settings.
      // Redirecting to login to keep it simple.
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white p-12 max-w-2xl w-full shadow-sm rounded-sm">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Create an Account</h1>
          <p className="text-slate-600 mt-2 text-sm">Register as a Proponent in the RPDS</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                First Name *
              </label>
              <div className="flex items-center">
                <User className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Middle Name
              </label>
              <div className="flex items-center">
                <User className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Last Name *
              </label>
              <div className="flex items-center">
                <User className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Suffix (e.g., Jr., Ph.D.)
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Email Address *
              </label>
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Password *
              </label>
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Contact Number
              </label>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                College / Department
              </label>
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                <input
                  type="text"
                  name="collegeDepartment"
                  value={formData.collegeDepartment}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                Sex
              </label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-slate-300 py-2 focus:outline-none focus:border-red-800 transition-colors text-slate-900 cursor-pointer"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
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
                  Register Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-red-800 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
