import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCallForProposals } from '../context/CallForProposalsContext';
import { useAuth } from '../context/AuthContext';
import { CallForm as AdminCallForm } from '../components/adminComponent/CallForm';
import { CallForm as RpduCallForm } from '../components/rpduComponent/CallForm';

export function CallFormPage({ role, mode = 'edit' }: { role: 'admin' | 'rpdu'; mode?: 'create' | 'edit' }) {
  const { callId } = useParams();
  const { user, profile, loadingProfile } = useAuth();
  const navigate = useNavigate();
  const { calls, loadingCalls, createCall, updateCall, refreshCalls } = useCallForProposals();
  const isCreating = mode === 'create';
  const call = calls.find((item) => item.id === callId);
  const CallForm = role === 'admin' ? AdminCallForm : RpduCallForm;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        <Link to={`/${role}`} className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#C8102E]">
          <ArrowLeft className="w-4 h-4" />
          Back to Call for Proposals
        </Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span aria-current="page" className="text-slate-900 font-semibold">{isCreating ? 'Create New Call' : 'Edit Call'}</span>
      </nav>

      {loadingCalls || loadingProfile ? (
        <div role="status" aria-busy="true" className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <span className="sr-only">Loading call details...</span>
          <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
            <div className="px-6 py-4.5 border-b border-slate-200/80 flex items-center gap-2.5">
              <div className="w-5 h-5 bg-slate-200 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-64 max-w-full bg-slate-200 rounded" />
                <div className="h-4 w-48 max-w-full bg-slate-100 rounded" />
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 border-t border-slate-100 pt-4">
                <div className="sm:col-span-8 space-y-2">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="h-11 bg-slate-100 rounded-lg" />
                </div>
                <div className="sm:col-span-4 space-y-2">
                  <div className="h-3 w-12 bg-slate-200 rounded" />
                  <div className="h-11 bg-slate-100 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-14 bg-slate-200 rounded" />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-9 bg-slate-100 rounded-lg" />
                  <div className="h-9 bg-slate-100 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-28 bg-slate-100 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-40 bg-slate-200 rounded" />
                <div className="h-16 bg-slate-100 rounded-lg" />
              </div>
              <div className="space-y-3">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-48 bg-slate-100 rounded-lg" />
              </div>
              <div className="space-y-4 pt-2">
                <div className="h-4 w-56 max-w-full bg-slate-200 rounded" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  {[0, 1].map((index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                      <div className="h-11 bg-slate-100 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex justify-end gap-2.5">
              <div className="h-9 w-20 bg-slate-200 rounded-lg" />
              <div className="h-9 w-40 bg-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      ) : !isCreating && call && profile?.role !== 'ADMIN' && call.createdBy !== user?.id ? (
        <div role="alert" className="bg-white border border-slate-200 rounded-sm p-8 text-sm text-slate-600">
          Only the call creator or an admin can edit this window.
        </div>
      ) : isCreating || call ? (
        <CallForm
          key={isCreating ? 'new' : call?.id}
          initialData={isCreating ? undefined : call}
          existingCalls={calls}
          onSave={async (data) => {
            if (isCreating) {
              await createCall(data);
            } else if (call) {
              await updateCall(call.id, data);
            }
          }}
          onBack={() => navigate(`/${role}`)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-sm p-8 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Call unavailable</h2>
          <p className="text-sm text-slate-500">This call could not be loaded. It may have been deleted.</p>
          <button type="button" onClick={() => void refreshCalls()} className="text-sm font-semibold text-[#C8102E] hover:underline cursor-pointer">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
