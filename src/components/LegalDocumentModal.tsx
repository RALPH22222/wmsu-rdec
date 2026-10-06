import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export type LegalDocumentType = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY';

export interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: LegalDocumentType;
  onAccept?: () => void;
}

interface LegalDocData {
  id: string;
  type: string;
  title: string;
  version: string;
  content: string;
  effective_date: string;
}

/**
 * Helper to parse inline markdown syntax like **bold** into React nodes
 */
const parseInlineMarkdown = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {boldText}
        </strong>
      );
    }
    return part;
  });
};

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  isOpen,
  onClose,
  documentType,
  onAccept,
}) => {
  const [docData, setDocData] = useState<LegalDocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('legal_documents')
        .select('id, type, title, version, content, effective_date')
        .eq('type', documentType)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbError) {
        setError(`Database error: ${dbError.message}`);
        setDocData(null);
      } else if (!data) {
        setError(
          `No active document found in the database for ${
            documentType === 'TERMS_OF_SERVICE' ? 'Terms of Service' : 'Privacy Policy'
          }. Please run the database migration and seed script.`
        );
        setDocData(null);
      } else {
        setDocData(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query database';
      setError(`Connection error: ${msg}`);
      setDocData(null);
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  useEffect(() => {
    if (isOpen) {
      fetchDocument();
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, fetchDocument]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isPrivacy = documentType === 'PRIVACY_POLICY';

  /**
   * Structured document renderer:
   * Parses sections (###), bullet points with labels (- **Label:** Desc),
   * headers, and paragraphs into elegant, readable academic layout.
   */
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    const blocks = content.split(/\n\s*\n/);

    return (
      <div className="space-y-4">
        {blocks.map((block, idx) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // H1 / H2 Headers
          if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
            const headingText = trimmed.replace(/^#+\s*/, '');
            return (
              <div key={idx} className="pb-1 pt-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {parseInlineMarkdown(headingText)}
                </h3>
              </div>
            );
          }

          // H3 Section Headers (e.g. ### 1. Acceptance of Terms)
          if (trimmed.startsWith('### ')) {
            const sectionText = trimmed.replace(/^###\s*/, '');
            return (
              <div key={idx} className="pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#C8102E] shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {parseInlineMarkdown(sectionText)}
                  </h4>
                </div>
              </div>
            );
          }

          // Bullet List Blocks (- or *)
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const listLines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
            return (
              <div key={idx} className="bg-white p-4 rounded-sm shadow-2xs space-y-2.5 my-2">
                {listLines.map((line, lIdx) => {
                  const cleaned = line.replace(/^[-*]\s*/, '');
                  // Check if line has a bold prefix like **Personal Information:** Content
                  const boldLabelMatch = cleaned.match(/^\*\*([^*]+)\*\*:\s*(.*)/);

                  if (boldLabelMatch) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                        <span className="w-1.5 h-1.5 rounded-none bg-[#C8102E] mt-2 shrink-0" />
                        <div className="leading-relaxed">
                          <strong className="font-semibold text-slate-900">
                            {boldLabelMatch[1]}:{' '}
                          </strong>
                          <span className="text-slate-600">
                            {parseInlineMarkdown(boldLabelMatch[2])}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-none bg-[#C8102E] mt-2 shrink-0" />
                      <span className="leading-relaxed">{parseInlineMarkdown(cleaned)}</span>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Standard Paragraph
          return (
            <p key={idx} className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {parseInlineMarkdown(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Dialog Card - SweetAlert Style, Clean Academic Aesthetic */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-lg sm:max-w-2xl rounded-sm shadow-xl p-6 sm:p-8 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SweetAlert Animated Icon Badge */}
        <div className="flex flex-col items-center text-center space-y-3 shrink-0">
          <div className="w-14 h-14 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center shadow-2xs">
            {isPrivacy ? (
              <ShieldCheck className="w-7 h-7 text-[#C8102E]" strokeWidth={2} />
            ) : (
              <FileText className="w-7 h-7 text-[#C8102E]" strokeWidth={2} />
            )}
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Western Mindanao State University
            </span>
            <h3 id="legal-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {loading ? 'Loading Policy Document...' : docData?.title || (isPrivacy ? 'Privacy Policy' : 'Terms of Service')}
            </h3>
          </div>

          {/* Version and Effective Date Metadata */}
          {!loading && docData && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm font-medium">
                Version {docData.version}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Effective:{' '}
                {new Date(docData.effective_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Policy Body */}
        <div className="mt-6 mb-6 overflow-y-auto px-2 sm:px-3 flex-1 custom-scrollbar bg-slate-50/70 p-4 sm:p-5 rounded-sm">
          {loading ? (
            /* Skeleton Loading UI per rules.md */
            <div className="space-y-4">
              <div className="h-4 bg-slate-200/80 animate-pulse rounded-xs w-3/4" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-full" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-5/6" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-4/5" />
              <div className="h-4 bg-slate-200/80 animate-pulse rounded-xs w-1/2 pt-2" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-full" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-11/12" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-3/4" />
              <div className="h-4 bg-slate-200/80 animate-pulse rounded-xs w-2/3 pt-2" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-full" />
              <div className="h-3.5 bg-slate-100 animate-pulse rounded-xs w-4/5" />
            </div>
          ) : error ? (
            /* Database Error State - No static fallback */
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5 text-[#C8102E]" />
              </div>
              <h5 className="text-sm font-bold text-slate-900">Document Unavailable</h5>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={fetchDocument}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C8102E] text-white text-xs font-semibold rounded-sm hover:bg-[#A00D26] transition-colors cursor-pointer mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Database Query</span>
              </button>
            </div>
          ) : (
            renderFormattedContent(docData?.content || '')
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-sm text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Close
          </button>

          {onAccept && !loading && !error && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="py-2.5 px-6 rounded-sm text-xs sm:text-sm font-semibold text-white bg-[#C8102E] hover:bg-[#A00D26] shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Understand & Agree</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentModal;
