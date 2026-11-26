import React, { useEffect, useId, useState } from 'react';
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
  Clock,
} from 'lucide-react';
import { formatSubmissionDateTime } from '../../lib/format';
import { formatUserFullName } from '../../utils/userUtils';
import { DeactivationCountdown } from '../../components/ui/DeactivationCountdown';

type ProfileTab = 'personal' | 'contact' | 'affiliation';

interface RoleBadgeStyle {
  label: string;
  badgeClass: string;
  avatarClass: string;
}

function getRoleBadgeStyle(role?: string | null, isRpduHead?: boolean): RoleBadgeStyle {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN') {
    return {
      label: 'Administrator',
      badgeClass: 'border-slate-900 bg-slate-900 text-white',
      avatarClass: 'border-slate-900 bg-slate-900 text-white',
    };
  }
  if (normalized === 'RPDU') {
    if (isRpduHead) {
      return {
        label: 'RPDU Head',
        badgeClass: 'border-amber-300 bg-amber-100 text-amber-900',
        avatarClass: 'border-amber-300 bg-amber-100 text-amber-800',
      };
    }
    return {
      label: 'RPDU Staff',
      badgeClass: 'border-slate-300 bg-slate-200/80 text-slate-800',
      avatarClass: 'border-slate-200 bg-slate-100 text-slate-700',
    };
  }
  if (normalized === 'EVALUATOR') {
    return {
      label: 'Technical Evaluator',
      badgeClass: 'border-emerald-300 bg-emerald-100 text-emerald-900',
      avatarClass: 'border-emerald-300 bg-emerald-100 text-emerald-800',
    };
  }
  return {
    label: 'Proponent',
    badgeClass: 'border-red-200 bg-red-50 text-brand',
    avatarClass: 'border-red-100 bg-red-50 text-brand',
  };
}

const INPUT_CLASS =
  'min-h-11 w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20';

const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-wider text-slate-600';

const capitalizeWords = (str: string) => {
  if (!str) return '';
  return str.replace(/\b([a-z])/g, (c) => c.toUpperCase());
};

interface ProfileFormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: SexType | '';
  contactNumber: string;
  departmentId: string;
}

export const ProfilePage: React.FC = () => {
  const { session, user, profile, loadingProfile, refreshProfile } = useAuth();
  const tabIdPrefix = useId();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [departments, setDepartments] = useState<UserDepartment[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const initialValues: ProfileFormValues = {
    firstName: capitalizeWords(profile?.first_name || user?.user_metadata?.first_name || ''),
    middleName: capitalizeWords(profile?.middle_name || user?.user_metadata?.middle_name || ''),
    lastName: capitalizeWords(profile?.last_name || user?.user_metadata?.last_name || ''),
    suffix: capitalizeWords(profile?.suffix || user?.user_metadata?.suffix || ''),
    sex: (profile?.sex || user?.user_metadata?.sex)
      ? (String(profile?.sex || user?.user_metadata?.sex).toUpperCase() as SexType)
      : '',
    contactNumber: profile?.contact_number || user?.user_metadata?.contact_number || '',
    departmentId: profile?.department_id
      ? String(profile.department_id)
      : user?.user_metadata?.department_id
        ? String(user.user_metadata.department_id)
        : '',
  };

  const sourceKey = JSON.stringify([profile?.id ?? user?.id ?? '', initialValues]);
  const [draft, setDraft] = useState<{ key: string; values: ProfileFormValues } | null>(null);
  const values = draft && draft.key === sourceKey ? draft.values : initialValues;
  const { firstName, middleName, lastName, suffix, sex, contactNumber, departmentId } = values;

  const updateField = <K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) => {
    setDraft((prev) => {
      const base = prev && prev.key === sourceKey ? prev.values : initialValues;
      return { key: sourceKey, values: { ...base, [field]: value } };
    });
    if (errorMsg) setErrorMsg(null);
    if (successMsg) setSuccessMsg(null);
  };

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleReset = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDraft(null);
  };

  const handleNameInput = (
    value: string,
    field: 'firstName' | 'middleName' | 'lastName' | 'suffix',
  ) => {
    const filtered = value.replace(/[^A-Za-z\s-]/g, '');
    const capitalized = filtered.replace(/\b([a-z])/g, (c) => c.toUpperCase());
    updateField(field, capitalized);
  };

  const handleContactInput = (value: string) => {
    const filtered = value.replace(/(?!^\+)[^\d]/g, '');
    updateField('contactNumber', filtered);
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
      setDraft(null);
      setSuccessMsg('Academic profile updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile && !profile) {
    return (
      <div role="status" aria-busy="true" className="mx-auto max-w-4xl space-y-6">
        <span className="sr-only">Loading institutional profile</span>
        <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
          <div className="flex items-center gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
            <div className="h-14 w-14 shrink-0 rounded-sm bg-slate-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-52 max-w-full rounded-sm bg-slate-200" />
              <div className="h-4 w-64 max-w-full rounded-sm bg-slate-100" />
            </div>
          </div>
          <div className="h-12 w-full border-b border-slate-200" />
          <div className="space-y-6 rounded-sm border border-slate-200 bg-white p-6 sm:p-8">
            <div className="h-5 w-44 rounded-sm bg-slate-200" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="space-y-2">
                  <div className="h-3 w-24 rounded-sm bg-slate-100" />
                  <div className="h-11 w-full rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const resolvedRole = profile?.role || user?.user_metadata?.role || 'PROPONENT';
  const isRpduHead = Boolean(profile?.is_rpdu_head || user?.user_metadata?.is_rpdu_head);
  const roleStyle = getRoleBadgeStyle(resolvedRole, isRpduHead);
  const userEmail = profile?.email || session?.user?.email || 'N/A';
  const assignedDept = departments.find((d) => String(d.id) === departmentId)?.name || profile?.departments?.name || '';
  const displayName =
    [firstName, middleName, lastName, suffix].filter((part) => part.trim()).join(' ').trim() ||
    formatUserFullName(profile, user, roleStyle.label);
  const initials = [firstName, lastName]
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase();

  const tabs: { id: ProfileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'personal', label: 'Personal Details', icon: User },
    { id: 'contact', label: 'Demographic & Contact', icon: Phone },
    { id: 'affiliation', label: 'Academic Affiliation', icon: Building2 },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {profile?.role === 'EVALUATOR' && (profile.is_temporary_evaluator || profile.evaluator_closes_at) && (
        <div role="status" className="flex flex-col gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p>
              {profile.evaluator_closes_at
                ? `All assigned evaluations are submitted and no proposals remain. Your evaluator account will automatically deactivate on ${formatSubmissionDateTime(profile.evaluator_closes_at)} (12 hours after completion) unless reactivated by RPDU.`
                : 'Evaluator account notice: your access remains active until 12 hours after you finish evaluating all assigned proposals.'}
            </p>
          </div>
          {profile.evaluator_closes_at && (
            <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-none border border-amber-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-amber-950 sm:self-center">
              <DeactivationCountdown
                closesAt={profile.evaluator_closes_at}
                prefix="Deactivating in "
                expiredLabel="Deactivated"
              />
            </div>
          )}
        </div>
      )}

      {/* Institutional Profile Summary Banner */}
      <section aria-label="Account summary" className="rounded-sm border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border text-lg font-extrabold tracking-tight ${roleStyle.avatarClass}`}
            >
              {initials || <User className="h-6 w-6" strokeWidth={1.75} />}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="min-w-0 break-words text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {displayName}
                </h2>
                <span
                  className={`inline-flex shrink-0 items-center rounded-none border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${roleStyle.badgeClass}`}
                >
                  {roleStyle.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 sm:text-sm">
                <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>{userEmail}</span>
                </span>
                {assignedDept && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{assignedDept}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Underline Tabs */}
      <div className="border-b border-slate-200">
        <div role="tablist" aria-label="Profile sections" className="flex space-x-6 overflow-x-auto sm:space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${tabIdPrefix}-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`${tabIdPrefix}-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8102E] sm:text-sm ${
                  active
                    ? 'border-[#C8102E] text-[#C8102E]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Banners */}
      {errorMsg && (
        <div role="alert" className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="text-sm font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div role="status" className="flex items-start gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="text-sm font-medium leading-relaxed">{successMsg}</div>
        </div>
      )}

      {/* Profile Form Canvas */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: PERSONAL DETAILS */}
        {activeTab === 'personal' && (
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-personal`}
            aria-labelledby={`${tabIdPrefix}-tab-personal`}
            className="rounded-sm border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 space-y-6"
          >
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                Personal Identification
              </h3>
              <p className="text-sm text-slate-600">
                Enter your official name as recognized in university registries and research publications.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* First Name */}
              <div className="space-y-1.5">
                <label htmlFor="firstName" className={LABEL_CLASS}>
                  First Name <span className="text-brand">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="firstName"
                    type="text"
                    required
                    maxLength={50}
                    value={firstName}
                    onChange={(e) => handleNameInput(e.target.value, 'firstName')}
                    placeholder="Enter your first name"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
              </div>

              {/* Middle Name */}
              <div className="space-y-1.5">
                <label htmlFor="middleName" className={LABEL_CLASS}>
                  Middle Name
                </label>
                <input
                  id="middleName"
                  type="text"
                  maxLength={50}
                  value={middleName}
                  onChange={(e) => handleNameInput(e.target.value, 'middleName')}
                  placeholder="Enter your middle name"
                  className={INPUT_CLASS}
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label htmlFor="lastName" className={LABEL_CLASS}>
                  Last Name <span className="text-brand">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => handleNameInput(e.target.value, 'lastName')}
                  placeholder="Enter your last name"
                  className={INPUT_CLASS}
                />
              </div>

              {/* Suffix */}
              <div className="space-y-1.5">
                <label htmlFor="suffix" className={LABEL_CLASS}>
                  Suffix
                </label>
                <input
                  id="suffix"
                  type="text"
                  maxLength={20}
                  value={suffix}
                  onChange={(e) => handleNameInput(e.target.value, 'suffix')}
                  placeholder="e.g. Jr., III, PhD"
                  className={INPUT_CLASS}
                />
              </div>

              {/* Sex */}
              <div className="space-y-1.5">
                <label htmlFor="sex" className={LABEL_CLASS}>
                  Sex
                </label>
                <select
                  id="sex"
                  value={sex}
                  onChange={(e) => updateField('sex', e.target.value as SexType | '')}
                  className={`${INPUT_CLASS} cursor-pointer`}
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
        )}

        {/* TAB 2: DEMOGRAPHIC & CONTACT */}
        {activeTab === 'contact' && (
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-contact`}
            aria-labelledby={`${tabIdPrefix}-tab-contact`}
            className="rounded-sm border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 space-y-6"
          >
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                Contact &amp; Communication Points
              </h3>
              <p className="text-sm text-slate-600">
                Official contact details for research notifications and administrative correspondence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Contact Number */}
              <div className="space-y-1.5">
                <label htmlFor="contactNumber" className={LABEL_CLASS}>
                  Contact Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="contactNumber"
                    type="tel"
                    maxLength={15}
                    value={contactNumber}
                    onChange={(e) => handleContactInput(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  10 to 15 digits, optional leading + for international numbers.
                </p>
              </div>

              {/* Read-Only Institutional Email */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="institutionalEmail" className={LABEL_CLASS}>
                    Institutional Email
                  </label>
                  <span className="rounded-none border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Read Only
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="institutionalEmail"
                    type="email"
                    readOnly
                    disabled
                    value={userEmail}
                    className="min-h-11 w-full cursor-not-allowed select-none rounded border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-600"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Bound to your university authentication account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACADEMIC AFFILIATION */}
        {activeTab === 'affiliation' && (
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-affiliation`}
            aria-labelledby={`${tabIdPrefix}-tab-affiliation`}
            className="rounded-sm border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 space-y-6"
          >
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                Academic Affiliation &amp; Department
              </h3>
              <p className="text-sm text-slate-600">
                Your organizational college or departmental unit within Western Mindanao State University.
              </p>
            </div>

            <div className="max-w-xl space-y-2">
              <label htmlFor="departmentId" className={LABEL_CLASS}>
                College / Department
              </label>
              <div className="relative flex items-center">
                <Building2 className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                {loadingDepts ? (
                  <div className="h-11 w-full rounded bg-slate-100 motion-safe:animate-pulse" />
                ) : (
                  <select
                    id="departmentId"
                    value={departmentId}
                    onChange={(e) => updateField('departmentId', e.target.value)}
                    className={`${INPUT_CLASS} cursor-pointer pl-10`}
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
                <p className="text-xs text-slate-600">
                  Currently assigned to: <span className="font-semibold text-slate-900">{assignedDept}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Global Action Bar */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors enabled:hover:bg-slate-50 enabled:hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-brand px-5 py-3 text-sm font-semibold text-white shadow-2xs transition-colors enabled:hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{saving ? 'Saving…' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
