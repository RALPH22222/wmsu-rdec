import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDepartments, updateProfile, type UserDepartment, type SexType } from '../../lib/api';
import {
  User,
  Phone,
  Building2,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
} from 'lucide-react';

type ProfileTab = 'personal' | 'contact' | 'affiliation';

export const ProfilePage: React.FC = () => {
  const { session, user, profile, loadingProfile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [departments, setDepartments] = useState<UserDepartment[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // Capitalize first letter of each word helper
  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str.replace(/\b([a-z])/g, (c) => c.toUpperCase());
  };

  // Form State for chopped names and attributes
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [sex, setSex] = useState<SexType | ''>('');
  const [contactNumber, setContactNumber] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch departments from backend
  useEffect(() => {
    let isMounted = true;
    getDepartments()
      .then((data) => {
        if (isMounted) {
          setDepartments(data);
          setLoadingDepts(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load departments', err);
        if (isMounted) setLoadingDepts(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync profile data into form fields when loaded
  useEffect(() => {
    if (profile || user) {
      const initialFirst = profile?.first_name || user?.user_metadata?.first_name || '';
      const initialMiddle = profile?.middle_name || user?.user_metadata?.middle_name || '';
      const initialLast = profile?.last_name || user?.user_metadata?.last_name || '';
      const initialSuffix = profile?.suffix || user?.user_metadata?.suffix || '';
      const rawSex = profile?.sex || user?.user_metadata?.sex || '';
      const initialContact = profile?.contact_number || user?.user_metadata?.contact_number || '';
      const initialDept = profile?.department_id
        ? String(profile.department_id)
        : user?.user_metadata?.department_id
        ? String(user.user_metadata.department_id)
        : '';

      setFirstName(capitalizeWords(initialFirst));
      setMiddleName(capitalizeWords(initialMiddle));
      setLastName(capitalizeWords(initialLast));
      setSuffix(capitalizeWords(initialSuffix));
      setSex(rawSex ? (String(rawSex).toUpperCase() as SexType) : '');
      setContactNumber(initialContact);
      setDepartmentId(initialDept);
    }
  }, [profile, user]);

  const handleReset = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (profile || user) {
      const initialFirst = profile?.first_name || user?.user_metadata?.first_name || '';
      const initialMiddle = profile?.middle_name || user?.user_metadata?.middle_name || '';
      const initialLast = profile?.last_name || user?.user_metadata?.last_name || '';
      const initialSuffix = profile?.suffix || user?.user_metadata?.suffix || '';
      const rawSex = profile?.sex || user?.user_metadata?.sex || '';
      const initialContact = profile?.contact_number || user?.user_metadata?.contact_number || '';
      const initialDept = profile?.department_id
        ? String(profile.department_id)
        : user?.user_metadata?.department_id
        ? String(user.user_metadata.department_id)
        : '';

      setFirstName(capitalizeWords(initialFirst));
      setMiddleName(capitalizeWords(initialMiddle));
      setLastName(capitalizeWords(initialLast));
      setSuffix(capitalizeWords(initialSuffix));
      setSex(rawSex ? (String(rawSex).toUpperCase() as SexType) : '');
      setContactNumber(initialContact);
      setDepartmentId(initialDept);
    }
  };

  // Capitalize first letter of each word automatically as the user types
  const handleNameInput = (
    value: string,
    setter: (val: string) => void
  ) => {
    const filtered = value.replace(/[^A-Za-z\s\-]/g, '');
    const capitalized = filtered.replace(/\b([a-z])/g, (c) => c.toUpperCase());
    setter(capitalized);
    if (errorMsg) setErrorMsg(null);
    if (successMsg) setSuccessMsg(null);
  };

  const handleContactInput = (value: string) => {
    const filtered = value.replace(/(?!^\+)[^\d]/g, '');
    setContactNumber(filtered);
    if (errorMsg) setErrorMsg(null);
    if (successMsg) setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('First Name and Last Name are required.');
      setActiveTab('personal');
      return;
    }

    if (firstName.trim().length > 50 || lastName.trim().length > 50) {
      setErrorMsg('First Name and Last Name must not exceed 50 characters.');
      setActiveTab('personal');
      return;
    }

    if (contactNumber && !/^\+?[0-9]{10,15}$/.test(contactNumber.trim())) {
      setErrorMsg('Please enter a valid telephone or mobile contact number (10 to 15 digits).');
      setActiveTab('contact');
      return;
    }

    if (!session?.access_token) {
      setErrorMsg('Active session not found. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(session.access_token, {
        first_name: capitalizeWords(firstName.trim()),
        middle_name: middleName.trim() ? capitalizeWords(middleName.trim()) : null,
        last_name: capitalizeWords(lastName.trim()),
        suffix: suffix.trim() ? capitalizeWords(suffix.trim()) : null,
        sex: sex ? (sex as SexType) : null,
        contact_number: contactNumber.trim() || null,
        department_id: departmentId ? parseInt(departmentId, 10) : null,
      });

      await refreshProfile();
      setSuccessMsg('Academic profile updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // Skeleton UI for loading state (Austere subtle light gray blocks)
  if (loadingProfile && !profile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="h-10 w-80 bg-slate-100 rounded-sm" />
        <div className="bg-white p-8 rounded-sm space-y-6">
          <div className="h-5 w-40 bg-slate-100 rounded-sm" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-100 rounded-sm" />
              <div className="h-9 w-full bg-slate-100 rounded-sm" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-100 rounded-sm" />
              <div className="h-9 w-full bg-slate-100 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = profile?.email || session?.user?.email || 'N/A';
  const assignedDept = departments.find((d) => String(d.id) === departmentId)?.name;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Category Tab Navigation Table */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-sm shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'personal'
              ? 'text-red-800 border-red-800 bg-red-50/50'
              : 'text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">Personal Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'contact'
              ? 'text-red-800 border-red-800 bg-red-50/50'
              : 'text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50'
          }`}
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span className="truncate">Demographic & Contact</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('affiliation')}
          className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold transition-all rounded-sm flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
            activeTab === 'affiliation'
              ? 'text-red-800 border-red-800 bg-red-50/50'
              : 'text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Academic Affiliation</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 rounded-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{successMsg}</div>
        </div>
      )}

      {/* Profile Form Canvas */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: PERSONAL DETAILS */}
        {activeTab === 'personal' && (
          <div className="bg-white p-6 sm:p-8 rounded-sm shadow-2xs space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                Personal Identification
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Enter your official name as recognized in university registries and research publications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              {/* First Name */}
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="text-xs uppercase tracking-wider text-slate-600 font-semibold block"
                >
                  First Name <span className="text-red-800">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    id="firstName"
                    type="text"
                    required
                    maxLength={50}
                    value={firstName}
                    onChange={(e) => handleNameInput(e.target.value, setFirstName)}
                    placeholder="Enter your first name"
                    className="w-full bg-slate-50/70 border-b border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Middle Name */}
              <div className="space-y-2">
                <label
                  htmlFor="middleName"
                  className="text-xs uppercase tracking-wider text-slate-600 font-semibold block"
                >
                  Middle Name
                </label>
                <div className="relative flex items-center">
                  <input
                    id="middleName"
                    type="text"
                    maxLength={50}
                    value={middleName}
                    onChange={(e) => handleNameInput(e.target.value, setMiddleName)}
                    placeholder="Enter your middle name"
                    className="w-full bg-slate-50/70 border-b border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="text-xs uppercase tracking-wider text-slate-600 font-semibold block"
                >
                  Last Name <span className="text-red-800">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="lastName"
                    type="text"
                    required
                    maxLength={50}
                    value={lastName}
                    onChange={(e) => handleNameInput(e.target.value, setLastName)}
                    placeholder="Enter your last name"
                    className="w-full bg-slate-50/70 border-b border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Suffix */}
              <div className="space-y-2">
                <label
                  htmlFor="suffix"
                  className="text-xs uppercase tracking-wider text-slate-600 font-semibold block"
                >
                  Suffix
                </label>
                <div className="relative flex items-center">
                  <input
                    id="suffix"
                    type="text"
                    maxLength={20}
                    value={suffix}
                    onChange={(e) => handleNameInput(e.target.value, setSuffix)}
                    placeholder="Enter your suffix"
                    className="w-full bg-slate-50/70 border-b border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Sex Selector - Left-aligned and compact width */}
              <div className="md:col-span-2 flex justify-start pt-1">
                <div className="w-full max-w-[240px] space-y-2">
                  <label
                    htmlFor="sex"
                    className="text-xs uppercase tracking-wider text-slate-600 font-semibold block text-left"
                  >
                    Sex
                  </label>
                  <div className="relative">
                    <select
                      id="sex"
                      value={sex}
                      onChange={(e) => {
                        setSex(e.target.value as SexType);
                        if (errorMsg) setErrorMsg(null);
                        if (successMsg) setSuccessMsg(null);
                      }}
                      className="w-full bg-slate-50/70 border-b border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-800 focus:bg-white transition-colors cursor-pointer text-left"
                    >
                      <option value="">Select Sex</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEMOGRAPHIC & CONTACT */}
        {activeTab === 'contact' && (
          <div className="bg-white p-6 sm:p-8 rounded-sm shadow-2xs space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                Contact & Communication Points
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Official contact coordinates for research notifications and administrative correspondence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              {/* Contact Number */}
              <div className="space-y-2">
                <label
                  htmlFor="contactNumber"
                  className="text-xs uppercase tracking-wider text-slate-600 font-semibold block"
                >
                  Contact Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    id="contactNumber"
                    type="tel"
                    maxLength={15}
                    value={contactNumber}
                    onChange={(e) => handleContactInput(e.target.value)}
                    placeholder="Enter your contact number"
                    className="w-full bg-slate-50/70 border-b border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Read-Only Institutional Email */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-slate-600 font-semibold block">
                    Institutional Email
                  </label>
                  <span className="text-[10px] font-semibold text-red-800 uppercase tracking-wider">
                    Read Only
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={userEmail}
                    className="w-full bg-slate-100 text-slate-600 border-b border-slate-200 pl-9 pr-3 py-2 text-sm cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  Bound to university authentication account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACADEMIC AFFILIATION */}
        {activeTab === 'affiliation' && (
          <div className="bg-white p-6 sm:p-8 rounded-sm shadow-2xs space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                Academic Affiliation & Department
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Your organizational college or departmental unit within Western Mindanao State University.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 pt-2">
              {/* Department Dropdown */}
              <div className="space-y-2 max-w-xl">
                <label
                  htmlFor="departmentId"
                  className="text-xs uppercase tracking-wider text-slate-600 font-semibold block"
                >
                  College / Department
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  {loadingDepts ? (
                    <div className="h-9 w-full bg-slate-100 animate-pulse rounded-sm" />
                  ) : (
                    <select
                      id="departmentId"
                      value={departmentId}
                      onChange={(e) => {
                        setDepartmentId(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                        if (successMsg) setSuccessMsg(null);
                      }}
                      className="w-full bg-slate-50/70 border-b border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-800 focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="">Select College / Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {assignedDept && (
                  <p className="text-[11px] text-slate-500 font-normal mt-1">
                    Currently assigned to: <span className="font-semibold text-slate-700">{assignedDept}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-5 py-2.5 rounded-sm text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-sm bg-red-800 hover:bg-red-900 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-block h-3.5 w-16 bg-white/30 animate-pulse rounded-xs" />
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
