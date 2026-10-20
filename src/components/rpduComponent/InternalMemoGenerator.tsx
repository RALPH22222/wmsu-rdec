import { useEffect, useRef, useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import { AlertCircle, CheckCircle2, Download, Eye, Printer, ScrollText } from 'lucide-react';
import {
  downloadGeneratedMemoWord, generateMemo, getMemoTemplates, saveGeneratedMemo,
  type RecipientOptions,
} from '../../lib/memoApi';
import { memoIssueDate, type GeneratedMemo, type GenerateMemoRequest, type InternalMemoFields, type InternalMemoTemplate } from '../../lib/internalMemo';

interface InternalMemoGeneratorProps {
  proposals: RecipientOptions['proposals'];
  token?: string | null;
  proposalsLoading?: boolean;
  onSaved: () => Promise<void>;
}

const labels: Record<keyof InternalMemoFields, string> = {
  memoNumber: 'Memorandum number', dateIssued: 'Date issued', to: 'To', through: 'Through (optional)',
  from: 'From', signatoryName: 'Signatory name', signatoryTitle: 'Signatory position',
  eventDate: 'Event date', eventTime: 'Event time', venue: 'Venue',
  implementationStart: 'Implementation start', implementationEnd: 'Implementation end',
  designation: 'Designation / assignment', additionalNotes: 'Additional notes (optional)',
};

const inputClass = 'w-full rounded-md border-0 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand/40 disabled:opacity-60';
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export function InternalMemoGenerator({ proposals, token, proposalsLoading = false, onSaved }: InternalMemoGeneratorProps) {
  const [templates, setTemplates] = useState<InternalMemoTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [templateId, setTemplateId] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [fields, setFields] = useState<InternalMemoFields>(() => ({
    memoNumber: '', dateIssued: memoIssueDate(), to: '', through: '', from: '',
    signatoryName: '', signatoryTitle: '', eventDate: '', eventTime: '', venue: '',
    implementationStart: '', implementationEnd: '', designation: '', additionalNotes: '',
  }));
  const [preview, setPreview] = useState<{ memo: GeneratedMemo; request: GenerateMemoRequest } | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [action, setAction] = useState<'preview' | 'word' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const requestVersion = useRef(0);
  const previewFrame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMemoTemplates(token).then((data) => {
      if (cancelled) return;
      setTemplates(data);
      setTemplateId((current) => data.some((item) => item.id === current) ? current : (data[0]?.id || ''));
    }).catch((err: unknown) => {
      if (!cancelled) setTemplatesError(err instanceof Error ? err.message : 'Unable to load memorandum templates.');
    }).finally(() => { if (!cancelled) setTemplatesLoading(false); });
    return () => { cancelled = true; requestVersion.current += 1; };
  }, [token, retry]);

  const template = templates.find((item) => item.id === templateId);
  const proposal = proposals.find((item) => item.id === proposalId);
  const busy = action !== null;

  const invalidatePreview = () => {
    requestVersion.current += 1;
    setPreview(null);
    setPreviewReady(false);
    setSuccess(null);
    setSaved(false);
  };

  const renderField = (name: keyof InternalMemoFields, type: HTMLInputTypeAttribute = 'text') => (
    <div className="min-w-0" key={name}>
      <label htmlFor={`internal-memo-${name}`} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {labels[name]}{template?.requiredFields.includes(name) && <span aria-hidden="true" className="text-brand"> *</span>}
      </label>
      <input
        id={`internal-memo-${name}`}
        type={type}
        value={fields[name]}
        required={template?.requiredFields.includes(name)}
        maxLength={500}
        min={name === 'implementationEnd' ? fields.implementationStart || undefined : name === 'eventDate' ? fields.dateIssued || undefined : undefined}
        onChange={(event) => {
          invalidatePreview();
          setFields((current) => ({ ...current, [name]: event.target.value }));
        }}
        className={inputClass}
      />
    </div>
  );

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!template || !proposal || busy) return;
    invalidatePreview();
    const version = requestVersion.current;
    const payload: GenerateMemoRequest = { templateId, conceptProposalId: proposalId, fields };
    setError(null);
    setAction('preview');
    try {
      const memo = await generateMemo(payload, token);
      if (requestVersion.current === version) setPreview({ memo, request: payload });
    } catch (err: unknown) {
      if (requestVersion.current === version) setError(err instanceof Error ? err.message : 'Unable to generate memorandum.');
    } finally {
      setAction(null);
    }
  };

  const handleDownload = async () => {
    if (!preview || busy) return;
    setAction('word');
    setError(null);
    try {
      const blob = await downloadGeneratedMemoWord(preview.request, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = preview.memo.fileName.replace(/\.[^.]+$/, '') + '.docx';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to download memorandum.');
    } finally {
      setAction(null);
    }
  };

  const handleSave = async () => {
    if (!preview || busy || saved) return;
    setAction('save');
    setError(null);
    try {
      await saveGeneratedMemo(preview.request, token);
      setSaved(true);
      setSuccess('Memorandum saved to the memo desk and the selected proponent’s portal.');
      await onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save memorandum.');
    } finally {
      setAction(null);
    }
  };

  return (
    <section aria-labelledby="internal-memo-heading" className="space-y-5 bg-white p-5 sm:p-6">
      <div className="pb-3">
        <h2 id="internal-memo-heading" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900">
          <ScrollText aria-hidden="true" className="h-4 w-4 text-brand" />
          Generate Internal Memorandum
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Prepare routing memoranda for steps 4.1, 8.1, 10.1 and 11.1. Review the draft before saving it to the portal.
        </p>
      </div>

      {templatesLoading || proposalsLoading ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Loading memorandum templates and projects…</span>
          <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 motion-safe:animate-pulse">
            <div className="h-16 rounded-md bg-slate-100" /><div className="h-16 rounded-md bg-slate-100" />
            <div className="h-10 rounded-md bg-slate-100" /><div className="h-10 rounded-md bg-slate-100" />
          </div>
        </div>
      ) : templatesError ? (
        <div role="alert" className="text-xs text-red-700">
          {templatesError}
          <button type="button" onClick={() => { setTemplatesLoading(true); setTemplatesError(null); setRetry((value) => value + 1); }} className="ml-3 cursor-pointer font-semibold underline">Retry</button>
        </div>
      ) : templates.length === 0 || proposals.length === 0 ? (
        <p className="text-sm text-slate-600">{templates.length === 0 ? 'No memorandum templates are available.' : 'No qualified projects are available for a memorandum yet.'}</p>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
            <legend className="sr-only">Memorandum details. Asterisk indicates a required field.</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="internal-memo-template" className="mb-1.5 block text-xs font-semibold text-slate-700">Routing template <span aria-hidden="true" className="text-brand">*</span></label>
                <select id="internal-memo-template" required value={templateId} onChange={(event) => {
                  invalidatePreview();
                  setTemplateId(event.target.value);
                  setFields((current) => ({ ...current, eventDate: '', eventTime: '', venue: '', implementationStart: '', implementationEnd: '', designation: '' }));
                }} className={inputClass}>
                  {templates.map((item) => <option key={item.id} value={item.id}>Step {item.step} — {item.title}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="internal-memo-project" className="mb-1.5 block text-xs font-semibold text-slate-700">Research project <span aria-hidden="true" className="text-brand">*</span></label>
                <select id="internal-memo-project" required value={proposalId} onChange={(event) => { invalidatePreview(); setProposalId(event.target.value); }} className={inputClass}>
                  <option value="">Select a project</option>
                  {proposals.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.proponentName}</option>)}
                </select>
              </div>
            </div>
            {template && <p className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Subject:</span> {template.subject}</p>}
            {proposal && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs leading-5 text-slate-600">
                <span><span className="font-semibold text-slate-800">Study leader:</span> {proposal.proponentName}{proposal.department ? ` · ${proposal.department}` : ''}</span>
                <span><span className="font-semibold text-slate-800">Requested budget:</span> {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(proposal.requestedBudget ?? proposal.approvedBudget ?? proposal.proposedBudget))}</span>
                {template?.step === '10.1' && proposal.inceptionMeetingDate && <span><span className="font-semibold text-slate-800">Scheduled inception:</span> {proposal.inceptionMeetingDate.slice(0, 10)}</span>}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">{renderField('memoNumber')}{renderField('dateIssued', 'date')}</div>
            <div className="grid gap-4 sm:grid-cols-3">{renderField('to')}{renderField('through')}{renderField('from')}</div>
            <div className="grid gap-4 sm:grid-cols-2">{renderField('signatoryName')}{renderField('signatoryTitle')}</div>
            {(template?.step === '4.1' || template?.step === '10.1') && <div className="grid gap-4 sm:grid-cols-3">{renderField('eventDate', 'date')}{renderField('eventTime', 'time')}{renderField('venue')}</div>}
            {template?.step === '8.1' && <div className="grid gap-4 sm:grid-cols-2">{renderField('implementationStart', 'date')}{renderField('implementationEnd', 'date')}</div>}
            {template?.step === '11.1' && renderField('designation')}
            <div>
              <label htmlFor="internal-memo-notes" className="mb-1.5 block text-xs font-semibold text-slate-700">{labels.additionalNotes}</label>
              <textarea id="internal-memo-notes" rows={2} maxLength={4000} value={fields.additionalNotes} onChange={(event) => { invalidatePreview(); setFields((current) => ({ ...current, additionalNotes: event.target.value })); }} className={inputClass} />
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Use the memorandum number assigned by your office.</p>
            <button type="submit" disabled={busy || !template || !proposal} className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#A00C24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
              <Eye aria-hidden="true" className="h-4 w-4" />{action === 'preview' ? 'Generating preview…' : 'Generate preview'}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {success && <p role="status" className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{success}</p>}
      {preview && (
        <div className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Draft preview · Step {preview.memo.step}</h3>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" disabled={busy || !previewReady} onClick={() => {
                try { previewFrame.current?.contentWindow?.print(); }
                catch { setError('Unable to open printing. Download Word to print this memorandum.'); }
              }} className={secondaryButtonClass}><Printer aria-hidden="true" className="h-4 w-4" />Print / Save PDF</button>
              <button type="button" disabled={busy} onClick={handleDownload} className={secondaryButtonClass}><Download aria-hidden="true" className="h-4 w-4" />{action === 'word' ? 'Downloading…' : 'Download Word'}</button>
              <button type="button" disabled={busy || saved || !previewReady} onClick={handleSave} className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-[#A00C24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">{action === 'save' ? 'Saving…' : saved ? 'Saved to portal' : 'Save to portal'}</button>
            </div>
          </div>
          <iframe ref={previewFrame} srcDoc={preview.memo.html} sandbox="allow-same-origin allow-modals" title="Generated memorandum preview" onLoad={() => setPreviewReady(true)} className="h-[620px] w-full border-0 bg-slate-50" />
          <p className="text-xs leading-5 text-slate-500">Saving makes this memorandum available to the selected proponent. Route the signed memorandum through your office’s approval process.</p>
        </div>
      )}
    </section>
  );
}
