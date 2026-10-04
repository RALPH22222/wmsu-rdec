import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, ArrowLeft, User, Mail, Lock, Phone, Building2, CheckCircle2, ChevronDown } from 'lucide-react';

type Department = {
  id: number;
  name: string;
};

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    password: '',
    contactNumber: '',
    departmentId: '',
    sex: 'MALE',
    agreeToTerms: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
        
      if (error) {
        console.error('Error fetching departments:', error);
      } else if (data) {
        setDepartments(data);
      }
      setLoadingDepartments(false);
    };

    fetchDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const name = target.name;
    
    if (target.type === 'checkbox') {
      setFormData({ ...formData, [name]: target.checked });
      if (error) setError(null);
      return;
    }

    const value = target.value;
    
    // Filter invalid characters immediately as typed
    if (['firstName', 'middleName', 'lastName', 'suffix'].includes(name)) {
      // Names: letters, spaces, hyphens only
      const filteredValue = value.replace(/[^A-Za-z\s\-]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
    } else if (name === 'contactNumber') {
      // Contact: numbers and optional leading '+'
      const filteredValue = value.replace(/(?!^\+)[^\d]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    if (error) setError(null);
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First Name and Last Name are required.');
      return false;
    }
    if (formData.firstName.length > 50 || formData.lastName.length > 50) {
      setError('Names must not exceed 50 characters.');
      return false;
    }
    const nameRegex = /^[A-Za-z\s\-]+$/;
    if (!nameRegex.test(formData.firstName) || !nameRegex.test(formData.lastName)) {
      setError('Names can only contain letters, spaces, and hyphens.');
      return false;
    }
    if (formData.contactNumber && !/^\+?[0-9]{10,15}$/.test(formData.contactNumber)) {
      setError('Please enter a valid contact number (10-15 digits).');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.departmentId) {
      setError('Please select your College/Department.');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError(null);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) return;
    
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to register.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          suffix: formData.suffix,
          contact_number: formData.contactNumber,
          department_id: parseInt(formData.departmentId),
          sex: formData.sex,
          role: 'PROPONENT'
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    } 

    setSuccess(true);
    setLoading(false);
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
              Advance Your<br />Research Journey.
            </h1>
            <p className="text-red-50 text-lg leading-relaxed max-w-md drop-shadow-sm">
              Join the WMSU RPDS platform to submit concept proposals, undergo rigorous screening, and manage your research implementation.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 text-red-200 text-sm">
          &copy; {new Date().getFullYear()} Western Mindanao State University
        </div>
      </div>

      {/* RIGHT SIDE - FORM (60%) */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8 py-12">
        <div className="bg-white p-10 max-w-2xl w-full shadow-sm rounded-sm">
          <div className="mb-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Create an Account</h2>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <React.Fragment key={step}>
                    <div 
                      className={`w-8 h-8 rounded-sm flex items-center justify-center text-sm font-medium transition-colors
                        ${currentStep === step ? 'bg-red-800 text-white' : 
                          currentStep > step ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {currentStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                    </div>
                    {step < 3 && <div className={`w-8 h-px ${currentStep > step ? 'bg-red-200' : 'bg-slate-200'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <p className="text-slate-600 mt-2 text-sm">
              {currentStep === 1 && 'Step 1: Personal Information'}
              {currentStep === 2 && 'Step 2: Academic Information'}
              {currentStep === 3 && 'Step 3: Account Security'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded-sm border-l-2 border-red-800">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-red-50 text-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Verify your email address</h3>
              <p className="text-slate-600 max-w-sm mx-auto leading-relaxed">
                We've sent a verification link to <span className="font-medium text-slate-900">{formData.email}</span>. 
                Please check your inbox (and spam folder) to activate your account.
              </p>
              <div className="pt-12">
                <Link 
                  to="/login"
                  className="inline-flex items-center justify-center bg-slate-900 text-white px-8 py-3 rounded-sm hover:bg-slate-800 transition-colors font-medium text-sm w-full max-w-xs"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleRegister} className="space-y-8 min-h-[300px] flex flex-col justify-between">
                {/* STEP 1: PERSONAL INFO */}
                {currentStep === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
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
                          maxLength={50}
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
                          maxLength={50}
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
                          maxLength={50}
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
                          maxLength={20}
                          value={formData.suffix}
                          onChange={handleChange}
                          className="w-full bg-transparent border-b border-slate-300 py-2 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                        Sex *
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

                    <div className="relative">
                      <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                        Contact Number
                      </label>
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                        <input
                          type="tel"
                          name="contactNumber"
                          maxLength={15}
                          placeholder="+639..."
                          value={formData.contactNumber}
                          onChange={handleChange}
                          className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 focus:outline-none focus:border-red-800 transition-colors text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: ACADEMIC INFO */}
                {currentStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
                    <div className="relative w-full">
                      <label className="text-xs uppercase tracking-wider text-slate-600 block mb-2 font-medium">
                        College / Department *
                      </label>
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-slate-400 absolute left-0" strokeWidth={1.5} />
                        {loadingDepartments ? (
                          <div className="w-full h-10 bg-slate-100 animate-pulse rounded-sm ml-8"></div>
                        ) : (
                          <div className="relative w-full">
                            <div
                              onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                              className="w-full bg-transparent border-b border-slate-300 py-2 pl-8 pr-8 focus:outline-none focus:border-red-800 transition-colors cursor-pointer flex justify-between items-center"
                            >
                              <span className={formData.departmentId ? "text-slate-900" : "text-slate-500"}>
                                {formData.departmentId 
                                  ? departments.find(d => d.id.toString() === formData.departmentId)?.name 
                                  : "Select your department"}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                            </div>
                            
                            {deptDropdownOpen && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                                <div className="py-1">
                                  {departments.map((dept) => (
                                    <div
                                      key={dept.id}
                                      onClick={() => {
                                        setFormData({ ...formData, departmentId: dept.id.toString() });
                                        setDeptDropdownOpen(false);
                                      }}
                                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-900 transition-colors ${
                                        formData.departmentId === dept.id.toString() ? "bg-red-50 text-red-900 font-medium" : "text-slate-700"
                                      }`}
                                    >
                                      {dept.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: ACCOUNT INFO */}
                {currentStep === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <p className="text-xs text-slate-500 mt-2">Must be at least 6 characters long.</p>
                      </div>
                    </div>

                    <div className="pt-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        className="mt-1 w-4 h-4 text-red-800 bg-slate-100 border-slate-300 rounded focus:ring-red-800 cursor-pointer"
                      />
                      <label htmlFor="agreeToTerms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                        I agree to the <a href="#" className="text-red-800 font-medium hover:underline">Terms of Service</a> and <a href="#" className="text-red-800 font-medium hover:underline">Privacy Policy</a>. I understand that the information provided will be used in accordance with the Data Privacy Act of 2012.
                      </label>
                    </div>
                  </div>
                )}

                {/* NAVIGATION BUTTONS */}
                <div className="pt-8 flex items-center gap-4 mt-auto">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={loading}
                      className="px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 bg-red-800 text-white px-8 py-3 rounded-sm hover:bg-red-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-red-800 text-white px-8 py-3 rounded-sm hover:bg-red-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="h-5 w-20 bg-white/20 animate-pulse rounded-sm"></span>
                      ) : (
                        <>
                          Complete Registration <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-8 text-center border-t border-slate-100 pt-8">
                <p className="text-sm text-slate-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-red-800 font-medium hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
