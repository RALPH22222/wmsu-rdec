import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/apiConfig';
import { request } from '../lib/apiRequest';

export function ExternalPacketCompletion({ id, onSaved }: { id: string; onSaved: () => void }) {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!file || !title.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append('title', title.trim()); body.append('manuscript_file', file);
      await request(`${API_ENDPOINTS.PIPELINE.EXTERNAL_FUNDING_REQUESTS}/${id}/complete`, session?.access_token, { method: 'PUT', body });
      onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to complete packet.'); }
    finally { setBusy(false); }
  };
  return <details className="w-full bg-neutral-50 p-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-red-800">Complete legacy packet — title/manuscript not recorded</summary>
    <fieldset disabled={busy} className="space-y-3">
      <p className="text-sm text-slate-600">Existing supporting documents are preserved.</p>
      <label className="block text-sm">Proposal title<input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className="block min-h-11 w-full bg-white px-3" /></label>
      <label className="block text-sm">Full manuscript (PDF or Word, up to 15 MB)<input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block min-h-11 max-w-full" /></label>
      {file && file.size > 15 * 1024 * 1024 && <p role="alert" className="text-sm text-red-800">Choose a manuscript of 15 MB or smaller.</p>}
      <button type="button" disabled={!title.trim() || !file || file.size > 15 * 1024 * 1024} onClick={save} className="min-h-11 bg-red-800 px-4 text-sm text-white disabled:opacity-50">{busy ? 'Saving…' : 'Complete packet'}</button>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </fieldset>
  </details>;
}
