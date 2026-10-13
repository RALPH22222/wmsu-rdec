import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  FileSignature,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';

interface ContractData {
  contractNumber: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
  contractAmount: string;
  compensationArrangement: 'Deloading' | 'Honorarium';
  schoolYear: string;
  collegeDepartment: string;
  coResearchers: string;
}

interface PreviewResponseData {
  html: string;
  contractData: ContractData;
  title: string;
  recipientName: string;
}

export default function ContractPreviewPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const location = useLocation();
  const { session } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<PreviewResponseData | null>(null);

  // Retrieve any custom contractData passed via router state or sessionStorage
  const getInitialContractData = (): Partial<ContractData> => {
    if (location.state && (location.state as { contractData?: ContractData }).contractData) {
      return (location.state as { contractData: ContractData }).contractData;
    }
    if (conceptId) {
      const stored = sessionStorage.getItem(`psc_contract_data_${conceptId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return {};
  };

  useEffect(() => {
    if (!session?.access_token || !conceptId) return;

    let active = true;
    setLoading(true);
    setError('');

    const contractData = getInitialContractData();

    fetch(`${API_BASE_URL}/letters/mine/contracts/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        conceptId,
        contractData,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to generate contract preview.');
        if (active) {
          setPreviewData(data.data);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error generating preview.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [conceptId, session?.access_token]);

  const handleDownloadPdf = async () => {
    if (!session?.access_token || !conceptId || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const contractData = previewData?.contractData || getInitialContractData();
      const filename = `${contractData.contractNumber || 'PSC'}-Pre-Filled-Contract.pdf`;

      const res = await fetch(`${API_BASE_URL}/letters/mine/contracts/download-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conceptId,
          contractData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download contract PDF.');
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error downloading PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (frameRef.current?.contentWindow) {
      frameRef.current.contentWindow.print();
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* Top Navigation & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to={`/proponent/documents?type=PSC&id=${conceptId}`}
              state={{ selectedType: 'PSC', selectedId: conceptId }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Documents
            </Link>

            <div className="border-l border-slate-200 pl-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <FileSignature size={14} className="text-[#C8102E]" />
                Professional Service Contract (PSC)
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-md sm:max-w-xl">
                {previewData?.title || 'Contract Preview'}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !previewData?.html}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || downloading}
              className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-red-800 text-white px-4 py-2 text-xs font-bold rounded cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Download size={14} className={downloading ? 'animate-bounce' : ''} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Contract Meta Ribbon */}
        {previewData && (
          <div className="bg-slate-50 px-5 py-3 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              <div>
                <span className="text-slate-500">Contract No:</span>{' '}
                <strong className="text-slate-900">{previewData.contractData?.contractNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">Study Leader:</span>{' '}
                <strong className="text-slate-900">{previewData.recipientName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Compensation:</span>{' '}
                <strong className="text-slate-900">
                  {previewData.contractData?.compensationArrangement === 'Deloading'
                    ? 'Teaching De-loading'
                    : 'Research Honorarium'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Duration:</span>{' '}
                <strong className="text-slate-900">{previewData.contractData?.durationMonths} Months</strong>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <Clock size={12} className="text-amber-600" />
              Pre-Filled Official Copy (6 Pages)
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Full-Page Live Document Viewer */}
        <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="h-[800px] flex flex-col items-center justify-center space-y-3 bg-slate-50">
              <div className="w-10 h-10 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Generating 6-page contract preview...</p>
            </div>
          ) : previewData?.html ? (
            <iframe
              ref={frameRef}
              title="PSC 6-Page Official Document Preview"
              sandbox="allow-modals allow-same-origin"
              srcDoc={previewData.html}
              className="h-[850px] w-full bg-white border-0"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Contract document preview is unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
