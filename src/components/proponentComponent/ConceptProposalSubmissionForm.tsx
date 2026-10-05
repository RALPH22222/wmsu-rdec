import React, { useState, useEffect, useId } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Trash2,
  Download,
  Eye,
  X,
  FileCheck,
  Calendar,
  Search,
  Plus,
  AlertCircle,
  Layers
} from 'lucide-react';
import { useCallForProposals } from '../../context/CallForProposalsContext';
import { useAuth } from '../../context/AuthContext';
import type { ConceptProposal, ConceptProposalAttachment } from '../../types';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
}

const WMSU_COLLEGES = [
  'College of Science & Mathematics',
  'College of Agriculture & Forestry',
  'College of Engineering',
  'College of Computing Studies',
  'College of Liberal Arts',
  'College of Nursing',
  'College of Teacher Education',
  'College of Architecture',
  'College of Public Administration & Development Studies',
  'College of Criminal Justice Education',
  'College of Asian & Islamic Studies',
  'College of Sports Science & Physical Education',
  'College of Home Economics',
];

const RESEARCH_AGENDAS = [
  {
    id: 'Agriculture, Food Security & Sustainable Farming',
    name: 'Agriculture, Food Security & Sustainable Farming',
    desc: 'Sustainable farming initiatives, crop resilience, fisheries, halophyte bioscreening, and food security in Western Mindanao.',
    badge: 'Regional Priority',
  },
  {
    id: 'Artificial Intelligence & Digital Transformation',
    name: 'Artificial Intelligence & Digital Transformation',
    desc: 'Computer vision, machine learning for agriculture, smart university systems, IoT, and edge diagnostics.',
    badge: 'High Impact',
  },
  {
    id: 'Community Empowerment & Social Innovation',
    name: 'Community Empowerment & Social Innovation',
    desc: 'Indigenous knowledge systems, peace & conflict resolution, psychosocial coping, public governance, and inclusive education.',
    badge: 'Social Impact',
  },
  {
    id: 'Health, Wellness & Bio-prospecting',
    name: 'Health, Wellness & Bio-prospecting',
    desc: 'Ethnomedicinal plants of Region IX, public health diagnostics, nutrition, and natural product chemistry.',
    badge: 'Health Priority',
  },
  {
    id: 'Environmental Conservation & Biodiversity',
    name: 'Environmental Conservation & Biodiversity',
    desc: 'Zamboanga mangrove conservation, watershed protection, climate change adaptation, and biodiversity inventory.',
    badge: 'Environmental',
  },
  {
    id: 'Institutional & Multi-Disciplinary Innovation',
    name: 'Institutional & Multi-Disciplinary Innovation',
    desc: 'Cross-cutting technological, socio-economic, and educational innovations tailored to Western Mindanao State University.',
    badge: 'Cross-Cutting',
  },
];

export const ConceptProposalSubmissionForm: React.FC = () => {
  const { activeCall, conceptProposals, submitConceptProposal, showToast } = useCallForProposals();
  const { user } = useAuth();

  const endorsementInputId = useId();
  const conceptDocInputId = useId();

  // Tab View: 'submit' | 'my-submissions'
  const [activeTab, setActiveTab] = useState<'submit' | 'my-submissions'>('submit');

  // 1. Research Agenda State
  const [selectedAgenda, setSelectedAgenda] = useState<string>(RESEARCH_AGENDAS[0].name);

  // Determine logged-in user profile
  const loggedInName =
    user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.user_metadata?.name ||
        (user?.email ? user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '') ||
        'Prof. Juan Dela Cruz';

  const loggedInCollege =
    user?.user_metadata?.college && WMSU_COLLEGES.includes(user.user_metadata.college)
      ? user.user_metadata.college
      : WMSU_COLLEGES[0];

  // 2. Concept Proposal Details - Interchangeable with logged-in user
  const [proposalTitle, setProposalTitle] = useState('');
  const [leadInvestigator, setLeadInvestigator] = useState(loggedInName);
  const [leadEmail, setLeadEmail] = useState(user?.email || 'juan.delacruz@wmsu.edu.ph');
  const [college, setCollege] = useState(loggedInCollege);
  const [department, setDepartment] = useState('Department of Computer Science');
  const [conceptProposalFile, setConceptProposalFile] = useState<UploadedFile | null>(null);

  // Sync if logged-in user changes
  useEffect(() => {
    if (user) {
      if (loggedInName) setLeadInvestigator(loggedInName);
      if (loggedInCollege) setCollege(loggedInCollege);
      if (user.email) setLeadEmail(user.email);
      if (user.user_metadata?.department) setDepartment(user.user_metadata.department);
    }
  }, [user]);

  // 3. Endorsement PDF State
  const [endorsementPdf, setEndorsementPdf] = useState<UploadedFile | null>(null);

  // Drag states
  const [isDraggingEndorsement, setIsDraggingEndorsement] = useState(false);
  const [isDraggingConcept, setIsDraggingConcept] = useState(false);

  // Modals & UI status
  const [submitting, setSubmitting] = useState(false);
  const [submittedProposal, setSubmittedProposal] = useState<ConceptProposal | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedSubmissionDetails, setSelectedSubmissionDetails] = useState<ConceptProposal | null>(null);

  // Filter states for submitted proposals
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'pending' | 'passed' | 'failed'>('all');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [submissionAgendaFilter, setSubmissionAgendaFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    if (selectedSubmissionDetails) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedSubmissionDetails]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // File Upload Handlers
  const handleFileUpload = (
    files: FileList | null,
    category: 'endorsement_pdf' | 'concept_proposal'
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (category === 'endorsement_pdf') {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setErrors((prev) => ({
          ...prev,
          endorsement: 'The Dean Endorsement Form must be in PDF format.',
        }));
        return;
      }
    }

    const fileSizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const fileInfo: UploadedFile = {
      name: file.name,
      size: fileSizeFormatted,
      type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      uploadedAt: now,
    };

    if (category === 'endorsement_pdf') {
      setEndorsementPdf(fileInfo);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.endorsement;
        return next;
      });
      showToast(`Uploaded endorsement PDF: ${file.name}`);
    } else {
      setConceptProposalFile(fileInfo);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.conceptFile;
        return next;
      });
      showToast(`Uploaded Concept Proposal file: ${file.name}`);
    }
  };

  // Validation
  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!proposalTitle.trim()) {
      errs.title = 'Please enter your Concept Proposal Title.';
    } else if (proposalTitle.trim().length < 10) {
      errs.title = 'Proposal title must be at least 10 characters long.';
    }

    if (!selectedAgenda) {
      errs.agenda = 'Please select a research agenda.';
    }

    if (!conceptProposalFile) {
      errs.conceptFile = 'Please upload your Concept Proposal document (PDF or Word format).';
    }

    if (!endorsementPdf) {
      errs.endorsement = 'Please upload your official College Dean Endorsement PDF.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please upload required files and select your research agenda.');
      return;
    }

    setSubmitting(true);

    const attachments: ConceptProposalAttachment[] = [];

    if (conceptProposalFile) {
      attachments.push({
        name: conceptProposalFile.name,
        size: conceptProposalFile.size,
        type: conceptProposalFile.type,
        category: 'concept_proposal',
      });
    }

    if (endorsementPdf) {
      attachments.push({
        name: endorsementPdf.name,
        size: endorsementPdf.size,
        type: 'PDF',
        category: 'endorsement_pdf',
      });
    }

    const newProposal = submitConceptProposal({
      title: proposalTitle.trim(),
      callId: activeCall?.id || 'call-2027-01',
      callTitle: activeCall?.title || 'Institutional Research & Innovation Call 2027',
      leadInvestigator: leadInvestigator.trim(),
      leadInvestigatorEmail: leadEmail.trim(),
      coInvestigators: [],
      college,
      department,
      thematicArea: selectedAgenda,
      budgetRequested: activeCall?.maxBudgetPerProject || 500000,
      durationMonths: 12,
      executiveSummary: `Concept Proposal submitted under ${selectedAgenda}. File: ${conceptProposalFile?.name || 'Attached'}`,
      objectives: ['Implement research milestones as detailed in attached concept proposal.'],
      expectedOutputs: {},
      methodologySummary: `Refer to uploaded concept proposal document: ${conceptProposalFile?.name || 'Document attached.'}`,
      criteriaChecklist: {
        eligibleProponent: true,
        withinBudgetCap: true,
        alignedPriority: true,
        requiredFormsAttached: Boolean(endorsementPdf),
      },
      attachments,
    });

    setSubmitting(false);
    setSubmittedProposal(newProposal);
    setSuccessModalOpen(true);
  };

  // Proponent's submissions list
  const mySubmissions = conceptProposals.filter((p) => {
    return (
      p.leadInvestigatorEmail?.toLowerCase() === leadEmail.toLowerCase() ||
      p.leadInvestigator?.toLowerCase() === leadInvestigator.toLowerCase() ||
      p.leadInvestigator.includes('Juan') ||
      p.leadInvestigator.includes('Alvarez') ||
      p.leadInvestigator.includes('Tan')
    );
  });

  const filteredSubmissions = mySubmissions.filter((item) => {
    const matchesStatus =
      submissionStatusFilter === 'all' || item.screeningStatus === submissionStatusFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(submissionSearchQuery.toLowerCase()) ||
      item.thematicArea.toLowerCase().includes(submissionSearchQuery.toLowerCase()) ||
      (item.callTitle && item.callTitle.toLowerCase().includes(submissionSearchQuery.toLowerCase()));
    const matchesAgenda =
      submissionAgendaFilter === 'all' || item.thematicArea === submissionAgendaFilter;

    return matchesStatus && matchesSearch && matchesAgenda;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Clean Light Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Concept Proposal Submission
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Select your research agenda, enter your proposal title, and upload your Concept Proposal and Endorsement PDF.
          </p>
        </div>

        <a
          href="/DOST_Form_No.1b.docx"
          download
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-white hover:bg-slate-50 text-slate-700 transition-colors border border-slate-300 shadow-2xs shrink-0 self-start sm:self-auto"
          title="Download Concept Proposal Template"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download Concept Proposal Template</span>
        </a>
      </div>

      {/* VIEW TABS: Submit New vs Track My Submissions */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'border-[#C8102E] text-[#C8102E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Submit Concept Proposal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-submissions')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'my-submissions'
                ? 'border-[#C8102E] text-[#C8102E]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Submitted Proposals</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {mySubmissions.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: STREAMLINED SUBMISSION FORM */}
      {activeTab === 'submit' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: SELECT RESEARCH AGENDA */}
          <div className="bg-white rounded-sm border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-50 text-[#C8102E] font-bold text-xs flex items-center justify-center border border-red-100">
                  1
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Select Research Agenda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose the institutional research priority aligned with your proposal.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#C8102E] uppercase tracking-wider">
                Required
              </span>
            </div>

            {errors.agenda && (
              <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errors.agenda}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {RESEARCH_AGENDAS.map((agenda) => {
                const isSelected = selectedAgenda === agenda.name;

                return (
                  <div
                    key={agenda.id}
                    onClick={() => {
                      setSelectedAgenda(agenda.name);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.agenda;
                        return next;
                      });
                    }}
                    className={`p-4 rounded-sm border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#C8102E] bg-red-50/20 ring-1 ring-[#C8102E] shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isSelected
                              ? 'bg-red-100 text-[#C8102E]'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {agenda.badge}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {agenda.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                        {agenda.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span
                        className={`font-semibold ${
                          isSelected ? 'text-[#C8102E]' : 'text-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ Selected Agenda' : 'Click to select'}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-[#C8102E] bg-[#C8102E] text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SUBMIT CONCEPT PROPOSAL (TITLE & FILE) */}
          <div className="bg-white rounded-sm border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-50 text-[#C8102E] font-bold text-xs flex items-center justify-center border border-red-100">
                  2
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Submit Concept Proposal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter the proposal title and attach your completed Concept Proposal document.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#C8102E] uppercase tracking-wider">
                Required
              </span>
            </div>

            {/* Proposal Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Concept Proposal Title <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={proposalTitle}
                onChange={(e) => {
                  setProposalTitle(e.target.value);
                  if (errors.title) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.title;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. AI-Powered Early Foliar Disease Detection for Zamboanga Peninsula Rubber Plantations"
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded border bg-white focus:outline-none transition-all ${
                  errors.title
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E]'
                }`}
              />
              {errors.title && <p className="text-xs text-red-600 font-medium">{errors.title}</p>}
            </div>

            {/* Concept Proposal Document Upload */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#C8102E]" />
                  <span>Concept Proposal Document (PDF or Word)</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400">Prescribed template</span>
              </label>

              {errors.conceptFile && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errors.conceptFile}
                </p>
              )}

              {conceptProposalFile ? (
                <div className="p-3.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-[#C8102E]/10 text-[#C8102E] flex items-center justify-center font-bold text-xs shrink-0">
                      {conceptProposalFile.type}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {conceptProposalFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {conceptProposalFile.size} &bull; Uploaded at {conceptProposalFile.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConceptProposalFile(null)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingConcept(true);
                  }}
                  onDragLeave={() => setIsDraggingConcept(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingConcept(false);
                    handleFileUpload(e.dataTransfer.files, 'concept_proposal');
                  }}
                  className={`p-6 border-2 border-dashed rounded text-center transition-all cursor-pointer ${
                    isDraggingConcept
                      ? 'border-[#C8102E] bg-red-50/40'
                      : errors.conceptFile
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                  onClick={() => document.getElementById(conceptDocInputId)?.click()}
                >
                  <input
                    id={conceptDocInputId}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'concept_proposal')}
                  />
                  <div className="w-10 h-10 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto mb-2 border border-red-100">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag &amp; drop Concept Proposal file
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Accepts completed Concept Proposal in PDF, DOC, or DOCX format.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: UPLOAD ENDORSEMENT PDF */}
          <div className="bg-white rounded-sm border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-50 text-[#C8102E] font-bold text-xs flex items-center justify-center border border-red-100">
                  3
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Upload Endorsement PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official College Dean or Department Chairperson endorsement form in PDF format.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#C8102E] uppercase tracking-wider">
                Required
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[#C8102E]" />
                  <span>College Dean / Dept Chairperson Endorsement PDF</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-[#C8102E] border border-red-200">
                  PDF format required
                </span>
              </label>

              {errors.endorsement && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errors.endorsement}
                </p>
              )}

              {endorsementPdf ? (
                <div className="p-3.5 bg-emerald-50/60 rounded border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate">
                        {endorsementPdf.name}
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        {endorsementPdf.size} &bull; Uploaded at {endorsementPdf.uploadedAt} &bull; Verified
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEndorsementPdf(null)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingEndorsement(true);
                  }}
                  onDragLeave={() => setIsDraggingEndorsement(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingEndorsement(false);
                    handleFileUpload(e.dataTransfer.files, 'endorsement_pdf');
                  }}
                  className={`p-6 border-2 border-dashed rounded text-center transition-all cursor-pointer ${
                    isDraggingEndorsement
                      ? 'border-[#C8102E] bg-red-50/40'
                      : errors.endorsement
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                  onClick={() => document.getElementById(endorsementInputId)?.click()}
                >
                  <input
                    id={endorsementInputId}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'endorsement_pdf')}
                  />
                  <div className="w-10 h-10 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto mb-2 border border-red-100">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag &amp; drop Dean Endorsement Form
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Accepts official signed PDF file up to 15 MB.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold rounded bg-[#C8102E] hover:bg-[#a50d26] text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Submit Concept Proposal</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MY SUBMISSIONS TRACKER */}
      {activeTab === 'my-submissions' && (
        <div className="space-y-6">
          {/* Top Header Bar (Matching CallForProposalsManager) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#C8102E]">
                Research Proponent Portal
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                My Submitted Concept Proposals
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Track real-time preliminary screening decisions, compliance reviews, and download endorsement documents.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className="px-5 py-3 rounded-sm bg-[#C8102E] text-white text-xs font-bold shadow-sm hover:bg-[#a00c24] hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Concept Proposal</span>
            </button>
          </div>

          {/* Filters & Search Bar (Matching CallForProposalsManager) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Submissions', count: mySubmissions.length },
                {
                  id: 'pending',
                  label: 'Under Screening',
                  count: mySubmissions.filter((c) => c.screeningStatus === 'pending').length,
                },
                {
                  id: 'passed',
                  label: 'Passed',
                  count: mySubmissions.filter((c) => c.screeningStatus === 'passed').length,
                },
                {
                  id: 'failed',
                  label: 'Revisions Required',
                  count: mySubmissions.filter((c) => c.screeningStatus === 'failed').length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubmissionStatusFilter(tab.id as any)}
                  className={`px-3.5 py-2 rounded-sm text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${
                    submissionStatusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${
                      submissionStatusFilter === tab.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & Agenda Select */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-grow md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={submissionSearchQuery}
                  onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                  placeholder="Search proposal title or agenda..."
                  className="w-full pl-9 pr-3 py-2 rounded-sm border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                />
              </div>

              <select
                value={submissionAgendaFilter}
                onChange={(e) => setSubmissionAgendaFilter(e.target.value)}
                className="px-3 py-2 rounded-sm border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8102E] cursor-pointer max-w-[200px]"
              >
                <option value="all">All Agendas</option>
                {RESEARCH_AGENDAS.map((agenda) => (
                  <option key={agenda.id} value={agenda.name}>
                    {agenda.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards List Grid (Full-width Horizontal Cards Matching CallForProposalsManager) */}
          <div className="grid grid-cols-1 gap-4">
            {filteredSubmissions.length === 0 ? (
              <div className="bg-white rounded-sm border border-slate-200 p-12 text-center space-y-3 shadow-xs">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">No Concept Proposals Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {mySubmissions.length === 0
                    ? "You haven't submitted any concept proposals yet under this account. Click below to submit your first proposal."
                    : 'There are no proposals matching your selected filter or search criteria.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8102E] text-white rounded-sm text-xs font-bold shadow-xs hover:bg-[#a00c24] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Submit Concept Proposal
                </button>
              </div>
            ) : (
              filteredSubmissions.map((item) => {
                const isPending = item.screeningStatus === 'pending';
                const isPassed = item.screeningStatus === 'passed';
                const isFailed = item.screeningStatus === 'failed';

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-sm border transition-all p-5 sm:p-6 shadow-xs hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                      isPassed
                        ? 'border-emerald-300/80 bg-gradient-to-r from-emerald-50/20 via-white to-white'
                        : isFailed
                        ? 'border-rose-300/80 bg-gradient-to-r from-rose-50/20 via-white to-white'
                        : 'border-slate-200/90'
                    }`}
                  >
                    {/* Proposal Details */}
                    <div className="space-y-3 flex-grow min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Under Preliminary Screening
                          </span>
                        )}
                        {isPassed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Passed Screening
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Revisions Required
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#C8102E] transition-colors leading-snug">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            <Layers className="w-3 h-3 text-[#C8102E]" />
                            {item.thematicArea}
                          </span>
                        </div>
                      </div>

                      {/* Timeline & Metadata */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-[#C8102E]" />
                          <span>
                            Submitted {item.submittedAt} {item.submittedTime && `at ${item.submittedTime}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.attachments.length} Document{item.attachments.length === 1 ? '' : 's'} Uploaded
                          </span>
                        </div>
                      </div>

                      {/* Screening remarks preview if available */}
                      {(item.screeningRemarks || (item.failureReasons && item.failureReasons.length > 0)) && (
                        <div
                          className={`p-3 rounded-sm text-xs leading-relaxed border ${
                            isPassed
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : 'bg-rose-50/70 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5 mb-0.5">
                            <span>RPDU Screening Verdict {item.screenedBy ? `(${item.screenedBy})` : ''}:</span>
                          </div>
                          {item.screeningRemarks && <p className="text-[11px] line-clamp-2">{item.screeningRemarks}</p>}
                          {item.failureReasons && item.failureReasons.length > 0 && (
                            <p className="text-[11px] font-semibold mt-1">
                              Flagged items: {item.failureReasons.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Panel on right (Matching CallForProposalsManager) */}
                    <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmissionDetails(item)}
                        className="px-4 py-2.5 rounded-sm text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#C8102E] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="View Proposal Details & Documents"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionDetails(item)}
                          className="px-3.5 py-2.5 rounded-sm text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="View Revisions Required"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Revisions</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBMISSION SUCCESS MODAL (Styled like CallFormModal) */}
      {successModalOpen && submittedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-hidden">
          <div className="bg-white rounded-sm border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-white px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Concept Proposal Submitted
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {submittedProposal.callTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccessModalOpen(false);
                  setActiveTab('my-submissions');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-xs">
                    Successfully Queued for Preliminary Screening
                  </h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                    Your proposal and dean endorsement document have been securely logged in the WMSU RDEC database.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-sm border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-slate-500 font-medium">Submission Timestamp:</span>
                  <span className="font-semibold text-slate-800">
                    {submittedProposal.submittedAt} at {submittedProposal.submittedTime}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-slate-500 font-medium">Research Agenda:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                    {submittedProposal.thematicArea}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Screening Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pending Preliminary Screening
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                The RPDU committee will evaluate your concept proposal against university priority alignment, budget caps, and endorsement completeness.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSuccessModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessModalOpen(false);
                  setActiveTab('my-submissions');
                }}
                className="px-5 py-2 text-xs font-bold rounded-sm bg-[#C8102E] text-white hover:bg-[#a00c24] transition-colors cursor-pointer shadow-xs"
              >
                View in My Submissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROPOSAL DETAILS MODAL (Matching Submitting Proposal Structure & Without ID) */}
      {selectedSubmissionDetails && (() => {
        const matchedAgenda = RESEARCH_AGENDAS.find(
          (a) => a.name === selectedSubmissionDetails.thematicArea
        );

        const conceptDoc =
          selectedSubmissionDetails.attachments.find(
            (att) =>
              att.category === 'concept_proposal' ||
              att.name.toLowerCase().includes('concept') ||
              (!att.category?.includes('endorsement') && !att.name.toLowerCase().includes('endorsement'))
          ) || selectedSubmissionDetails.attachments[0];

        const endorsementDoc =
          selectedSubmissionDetails.attachments.find(
            (att) =>
              att.category === 'endorsement_pdf' ||
              att.name.toLowerCase().includes('endorsement')
          ) ||
          (selectedSubmissionDetails.attachments.length > 1
            ? selectedSubmissionDetails.attachments[1]
            : null);

        const otherDocs = selectedSubmissionDetails.attachments.filter(
          (att) => att !== conceptDoc && att !== endorsementDoc
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 overflow-hidden backdrop-blur-xs">
            <div className="bg-white rounded-sm shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Clean White Header (Without ID/Code) */}
              <div className="bg-white px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#C8102E] shrink-0" />
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Concept Proposal Submission Details
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Submitted {selectedSubmissionDetails.submittedAt} {selectedSubmissionDetails.submittedTime && `at ${selectedSubmissionDetails.submittedTime}`} &bull; {selectedSubmissionDetails.callTitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionDetails(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Body (Matching the 3 Steps of Submitting Proposal) */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                {/* Screening Status Banner */}
                {selectedSubmissionDetails.screeningStatus === 'passed' && (
                  <div className="p-4 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Preliminary Screening Passed &bull; Endorsed for Full Proposal
                      </h4>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        {selectedSubmissionDetails.screeningRemarks ||
                          'Your Concept Proposal has passed preliminary compliance screening and is endorsed to proceed to full proposal submission.'}
                      </p>
                      {selectedSubmissionDetails.screenedBy && (
                        <p className="text-[11px] text-emerald-700 pt-0.5">
                          Verified by: <strong>{selectedSubmissionDetails.screenedBy}</strong> {selectedSubmissionDetails.screenedAt && `on ${selectedSubmissionDetails.screenedAt}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedSubmissionDetails.screeningStatus === 'failed' && (
                  <div className="p-4 rounded-sm bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-rose-100 text-rose-700 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                          Screening Decision: Revisions Required
                        </h4>
                        <p className="text-xs text-rose-900 leading-relaxed mt-0.5">
                          {selectedSubmissionDetails.screeningRemarks ||
                            'The preliminary screening committee noted deficiencies requiring adjustment before this proposal can proceed.'}
                        </p>
                      </div>

                      {selectedSubmissionDetails.failureReasons && selectedSubmissionDetails.failureReasons.length > 0 && (
                        <div className="bg-white/80 p-3 rounded border border-rose-200 space-y-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-rose-800">
                            Non-Compliance Reasons:
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 text-xs text-rose-950">
                            {selectedSubmissionDetails.failureReasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedSubmissionDetails.sectionComments && (
                        <div className="bg-white/80 p-3 rounded border border-rose-200 space-y-1.5">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-rose-800">
                            Specific Evaluator Remarks by Section:
                          </span>
                          <div className="space-y-1 text-xs text-rose-950 divide-y divide-rose-100">
                            {selectedSubmissionDetails.sectionComments.title && (
                              <p className="pt-1">
                                <strong>Title Revision:</strong> {selectedSubmissionDetails.sectionComments.title}
                              </p>
                            )}
                            {selectedSubmissionDetails.sectionComments.rationaleSignificance && (
                              <p className="pt-1">
                                <strong>Rationale &amp; Significance:</strong>{' '}
                                {selectedSubmissionDetails.sectionComments.rationaleSignificance}
                              </p>
                            )}
                            {selectedSubmissionDetails.sectionComments.objectives && (
                              <p className="pt-1">
                                <strong>Objectives:</strong> {selectedSubmissionDetails.sectionComments.objectives}
                              </p>
                            )}
                            {selectedSubmissionDetails.sectionComments.estimatedBudget && (
                              <p className="pt-1">
                                <strong>Estimated Budget:</strong>{' '}
                                {selectedSubmissionDetails.sectionComments.estimatedBudget}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedSubmissionDetails.screeningStatus === 'pending' && (
                  <div className="p-4 rounded-sm bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Under Preliminary Screening
                      </h4>
                      <p className="text-xs text-amber-900 leading-relaxed mt-0.5">
                        Your proposal document and official dean endorsement are currently under preliminary evaluation by the RPDU staff. You will be notified once a screening verdict has been issued.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 1: SELECT RESEARCH AGENDA (Matching Step 1 of Submission Form) */}
                <div className="space-y-3 bg-white p-4 rounded-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-50 text-[#C8102E] font-bold text-xs flex items-center justify-center border border-red-100">
                        1
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          Selected Research Agenda
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Institutional research priority aligned with your proposal.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-red-100 text-[#C8102E]">
                      {matchedAgenda?.badge || 'Institutional Priority'}
                    </span>
                  </div>

                  <div className="p-3 bg-red-50/20 rounded border border-red-200/80">
                    <h5 className="text-xs font-bold text-slate-900">
                      {selectedSubmissionDetails.thematicArea}
                    </h5>
                    {matchedAgenda?.desc && (
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {matchedAgenda.desc}
                      </p>
                    )}
                  </div>
                </div>

                {/* STEP 2: SUBMIT CONCEPT PROPOSAL (TITLE & FILE) (Matching Step 2 of Submission Form) */}
                <div className="space-y-4 bg-white p-4 rounded-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-50 text-[#C8102E] font-bold text-xs flex items-center justify-center border border-red-100">
                        2
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          Concept Proposal (Title &amp; Document)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Proposal title and completed concept proposal document.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Concept Proposal Title
                    </label>
                    <div className="p-3 bg-slate-50 rounded-sm border border-slate-200">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {selectedSubmissionDetails.title}
                      </h5>
                    </div>
                  </div>

                  {/* Attached Concept Proposal Document */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#C8102E]" />
                      <span>Attached Concept Proposal Document</span>
                    </label>

                    {conceptDoc ? (
                      <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded bg-[#C8102E]/10 text-[#C8102E] flex items-center justify-center font-bold text-xs shrink-0">
                            {conceptDoc.type || 'PDF'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate" title={conceptDoc.name}>
                              {conceptDoc.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {conceptDoc.size} &bull; Uploaded concept proposal document
                            </p>
                          </div>
                        </div>

                        <a
                          href={conceptDoc.dataUrl || '#'}
                          download={conceptDoc.name}
                          onClick={(e) => {
                            if (!conceptDoc.dataUrl) {
                              e.preventDefault();
                              showToast(`Downloading Concept Proposal: ${conceptDoc.name}`);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-[#C8102E] hover:text-white rounded border border-slate-200 transition-colors shrink-0"
                          title={`Download ${conceptDoc.name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No concept proposal file attached.</p>
                    )}
                  </div>
                </div>

                {/* STEP 3: UPLOAD ENDORSEMENT PDF (Matching Step 3 of Submission Form) */}
                <div className="space-y-3 bg-white p-4 rounded-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-50 text-[#C8102E] font-bold text-xs flex items-center justify-center border border-red-100">
                        3
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          College Dean / Chairperson Endorsement Form
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Official signed endorsement PDF from college administration.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      PDF Verified
                    </span>
                  </div>

                  {endorsementDoc ? (
                    <div className="p-3 bg-emerald-50/60 rounded-sm border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950 truncate" title={endorsementDoc.name}>
                            {endorsementDoc.name}
                          </p>
                          <p className="text-[10px] text-emerald-700">
                            {endorsementDoc.size} &bull; Official Dean Endorsement Form
                          </p>
                        </div>
                      </div>

                      <a
                        href={endorsementDoc.dataUrl || '#'}
                        download={endorsementDoc.name}
                        onClick={(e) => {
                          if (!endorsementDoc.dataUrl) {
                            e.preventDefault();
                            showToast(`Downloading Endorsement Form: ${endorsementDoc.name}`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-700 hover:text-white rounded border border-emerald-200 transition-colors shrink-0"
                        title={`Download ${endorsementDoc.name}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No endorsement form uploaded.</p>
                  )}

                  {otherDocs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Additional Uploaded Documents ({otherDocs.length})
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {otherDocs.map((att, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{att.name}</p>
                              <p className="text-[10px] text-slate-400">{att.size}</p>
                            </div>
                            <a
                              href={att.dataUrl || '#'}
                              download={att.name}
                              className="p-1 text-slate-400 hover:text-[#C8102E]"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Western Mindanao State University &bull; RDEC
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionDetails(null)}
                    className="px-4 py-2 text-xs font-bold rounded-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {selectedSubmissionDetails.screeningStatus === 'failed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubmissionDetails(null);
                        setActiveTab('submit');
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-sm bg-[#C8102E] text-white hover:bg-[#a00c24] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Revise &amp; Resubmit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
