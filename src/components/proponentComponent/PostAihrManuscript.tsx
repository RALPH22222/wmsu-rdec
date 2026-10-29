import { useState } from 'react';
import type { ProponentProposal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { request } from '../../lib/apiRequest';
import { ACCEPTED_PREVIEW_DOCUMENT_TYPES, ANONYMITY_ATTESTATION_LABEL, MAX_UPLOAD_BYTES } from '../../lib/proposalPipeline';
import { DocumentLink } from '../ui/DocumentLink';

export function PostAihrManuscript({ proposal, onSaved }: { proposal: ProponentProposal; onSaved: () => void }) {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!file || !attested || busy) return;
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append('detailed_file', file); body.append('anonymity_attested', 'true');
      await request(`${API_ENDPOINTS.PIPELINE.PROPOSAL_BY_ID(proposal.id)}/post-aihr`, session?.access_token, { method: 'POST', body });
      setFile(null); setAttested(false); onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to submit manuscript.'); }
    finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-3">
    {proposal.aihrOutcome && <p className="text-sm text-slate-700">AIHR outcome: {proposal.aihrOutcome.replaceAll('_', ' ')}. {proposal.technicalReviewReady ? 'Cleared for technical review.' : proposal.aihrOutcome === 'CONDITIONALLY_APPROVED' ? 'Await the en banc decision.' : proposal.aihrOutcome === 'FAIL' ? 'This proposal cannot proceed to technical review.' : ''}</p>}
    {proposal.aihrResult && <div className="space-y-2 text-sm text-slate-600">{proposal.aihrResult.presentedOn && <p>Presented: {proposal.aihrResult.presentedOn}</p>}{proposal.aihrResult.loggedAt && <p>Outcome recorded: {new Date(proposal.aihrResult.loggedAt).toLocaleString()}</p>}{proposal.aihrResult.remarks && <p className="whitespace-pre-wrap">{proposal.aihrResult.remarks}</p>}<DocumentLink href={proposal.aihrResult.scoresheetFileUrl} label="Official AIHR result summary" /></div>}
    <DocumentLink href={proposal.manuscriptUrl} label="Current manuscript" />
    {!!proposal.manuscriptVersions?.length && <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Manuscript history</summary><ul className="space-y-2">{proposal.manuscriptVersions.map((version) => <li key={version.id}><DocumentLink href={version.fileUrl} label={`Version ${version.version} · ${version.stage.replaceAll('_', ' ')}${version.current ? ' · Current' : ''}`} muted /><span className="ml-2 text-xs text-slate-600">{version.submittedAt ? new Date(version.submittedAt).toLocaleString() : 'Receipt date not recorded'}</span></li>)}</ul></details>}
    {proposal.canUpdateAfterAihr && <fieldset disabled={busy} className="space-y-3 bg-neutral-50 p-4">
      <legend className="text-sm font-semibold">Submit updated proposal after AIHR</legend>
      <p className="text-sm text-slate-600">Optional when changes were made. Previous files remain available. Reviewer assignment locks the current manuscript.</p>
      <label className="block text-sm">Updated manuscript<input type="file" accept={ACCEPTED_PREVIEW_DOCUMENT_TYPES} onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block min-h-11 max-w-full" /></label>
      {file && file.size > MAX_UPLOAD_BYTES && <p role="alert" className="text-sm text-red-800">Choose a file of 15 MB or smaller.</p>}
      <label className="flex min-h-11 items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 accent-red-800" /><span>Anonymity attestation (required). {ANONYMITY_ATTESTATION_LABEL}</span></label>
      <button type="button" disabled={!file || !attested || file.size > MAX_UPLOAD_BYTES} onClick={submit} className="min-h-11 bg-red-800 px-4 text-sm text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Submit updated manuscript'}</button>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </fieldset>}
  </div>;
}
