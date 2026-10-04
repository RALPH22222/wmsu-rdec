import type { CallForProposals, UserProfile, ProposalItem, ConceptProposal } from '../types';

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'user-admin-1',
    name: 'Dr. Maria Santos',
    email: 'rpdu.director@wmsu.edu.ph',
    role: 'admin',
    department: 'Research Development & Evaluation Center (RDEC)',
    title: 'RPDU Director / Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-researcher-1',
    name: 'Prof. Juan Dela Cruz',
    email: 'juan.delacruz@wmsu.edu.ph',
    role: 'researcher',
    department: 'College of Science & Mathematics',
    title: 'Associate Professor & Lead Proponent',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-evaluator-1',
    name: 'Dr. Elena Ramirez',
    email: 'elena.ramirez@wmsu.edu.ph',
    role: 'evaluator',
    department: 'College of Agriculture & Forestry',
    title: 'Senior Technical Evaluator',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_CALLS: CallForProposals[] = [
  {
    id: 'call-2027-01',
    code: 'CALL-2027-01',
    title: 'Institutional Research & Innovation Call 2027',
    fiscalYear: 2027,
    startDate: '2026-09-15',
    endDate: '2026-11-15',
    startTime: '08:00',
    endTime: '17:00',
    status: 'active',
    description:
      'Western Mindanao State University invites faculty, researchers, and project proponents to submit research proposals for institutional funding support, peer evaluation, and technology transfer.',
    maxBudgetPerProject: 500000,
    totalGrantBudget: 5000000,
    priorityAreas: [
      'Agriculture, Food Security & Sustainable Farming',
      'Artificial Intelligence & Digital Transformation',
      'Community Empowerment & Social Innovation',
      'Health, Wellness & Bio-prospecting',
      'Environmental Conservation & Biodiversity',
    ],
    eligibleRoles: ['Regular Faculty', 'Tenured Research Staff', 'College Deans'],
    requiredForms: ['DOST Form 1B (Proposal Form)', 'Detailed Budget Breakdown', 'Dean Endorsement Letter', 'Curriculum Vitae'],
    submissionCount: 42,
    acceptedCount: 12,
    underReviewCount: 26,
    rejectedCount: 4,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-15',
  },
  {
    id: 'call-2027-02',
    code: 'CALL-2027-02',
    title: 'Special Technology Transfer & Extension Call',
    fiscalYear: 2027,
    startDate: '2027-01-10',
    endDate: '2027-03-31',
    startTime: '09:00',
    endTime: '17:00',
    status: 'upcoming',
    description:
      'Targeted call for commercialization-ready technologies, community extension initiatives, and patent-backed research prototypes.',
    maxBudgetPerProject: 750000,
    totalGrantBudget: 3000000,
    priorityAreas: [
      'Artificial Intelligence & Digital Transformation',
      'Renewable Energy & Green Technology',
      'Community Empowerment & Social Innovation',
    ],
    eligibleRoles: ['Regular Faculty', 'Research Extensionists'],
    requiredForms: ['DOST Form 1B (Proposal Form)', 'Technology Commercialization Plan', 'Budget Justification'],
    submissionCount: 0,
    acceptedCount: 0,
    underReviewCount: 0,
    rejectedCount: 0,
    createdAt: '2026-09-20',
    updatedAt: '2026-09-20',
  },
  {
    id: 'call-2026-01',
    code: 'CALL-2026-01',
    title: 'Institutional Research Grants 2026',
    fiscalYear: 2026,
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    startTime: '08:00',
    endTime: '17:00',
    status: 'closed',
    description:
      'Completed submission cycle for FY 2026 institutional research funding. All submitted proposals have completed technical evaluation and funding allocation.',
    maxBudgetPerProject: 400000,
    totalGrantBudget: 4000000,
    priorityAreas: [
      'Health, Wellness & Bio-prospecting',
      'Agriculture, Food Security & Sustainable Farming',
      'Educational Innovation & Pedagogy',
    ],
    eligibleRoles: ['Regular Faculty', 'Research Staff'],
    requiredForms: ['DOST Form 1B (Proposal Form)', 'Endorsement Letter'],
    submissionCount: 68,
    acceptedCount: 24,
    underReviewCount: 0,
    rejectedCount: 44,
    closureReason: 'Submission window closed on scheduled deadline date.',
    createdAt: '2025-08-15',
    updatedAt: '2025-12-01',
  },
  {
    id: 'call-2028-01',
    code: 'CALL-2028-01',
    title: 'Inter-College Collaborative Research Call (Draft)',
    fiscalYear: 2028,
    startDate: '2027-09-15',
    endDate: '2027-11-15',
    startTime: '08:00',
    endTime: '17:00',
    status: 'draft',
    description:
      'Preliminary draft call focusing on cross-disciplinary research collaborations between College of Engineering and College of Medicine.',
    maxBudgetPerProject: 1000000,
    totalGrantBudget: 6000000,
    priorityAreas: [
      'Artificial Intelligence & Digital Transformation',
      'Health, Wellness & Bio-prospecting',
    ],
    eligibleRoles: ['Multi-disciplinary Research Teams'],
    requiredForms: ['DOST Form 1B (Proposal Form)', 'Inter-College Agreement Memorandum'],
    submissionCount: 0,
    acceptedCount: 0,
    underReviewCount: 0,
    rejectedCount: 0,
    createdAt: '2026-09-28',
    updatedAt: '2026-09-28',
  },
];

export const MOCK_PROPOSALS: ProposalItem[] = [
  {
    id: 'prop-001',
    title: 'AI-Driven Crop Disease Detection for Zamboanga Farmers',
    code: 'PROP-2027-CSM-01',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Prof. Juan Dela Cruz',
    department: 'College of Science & Mathematics',
    submittedAt: '2026-09-18',
    status: 'under_review',
    budgetRequested: 485000,
    thematicArea: 'Artificial Intelligence & Digital Transformation',
  },
];

export const INITIAL_CONCEPT_PROPOSALS: ConceptProposal[] = [
  {
    id: 'cp-001',
    code: 'CP-2027-CSM-01',
    title: 'AI-Powered Early Foliar Disease Detection for Zamboanga Peninsula Rubber Plantations',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Dr. Arnel Alvarez',
    leadInvestigatorEmail: 'arnel.alvarez@wmsu.edu.ph',
    coInvestigators: ['Engr. Fatima Hassan', 'Prof. Reynaldo Cruz'],
    college: 'College of Science & Mathematics',
    department: 'Department of Computer Science',
    submittedAt: '2026-09-22',
    submittedTime: '09:30 AM',
    screeningStatus: 'pending',
    budgetRequested: 485000,
    thematicArea: 'Artificial Intelligence & Digital Transformation',
    durationMonths: 12,
    executiveSummary:
      'Rubber tree (Hevea brasiliensis) plantations across the Zamboanga Peninsula face recurrent yield losses due to rubber leaf blight and anthracnose. This concept proposal outlines an edge-deployable computer vision diagnostic system integrated into an Android mobile tool for smallholder rubber tappers and municipal agrarian extension officers.',
    objectives: [
      'Assemble an annotated image corpus of 5,000+ localized rubber foliar disease symptoms in Region IX.',
      'Train lightweight Convolutional Neural Network (YOLOv8-Nano) optimized for offline field diagnosis without internet connectivity.',
      'Pilot-test detection accuracy in 3 agrarian partner cooperatives in Zamboanga Sibugay and City districts.',
      'Formulate policy guidelines for digital crop surveillance for the City Agriculturist Office.'
    ],
    expectedOutputs: {
      publications: '1 Scopus/WoS-indexed journal article on edge AI agronomy',
      patents: '1 UM/Software Copyright registered with IPOPHIL',
      products: 'RubberGuard Mobile Application (Android offline APK)',
      peopleServices: '120 smallholder agrarian agrarian farmers trained',
      placesPartnerships: '2 MOAs signed with rubber farming cooperatives',
      policies: '1 Provincial Crop Surveillance Advisory Policy Draft'
    },
    methodologySummary:
      'Field imagery will be collected across four sampling sites in Sibugay and Zamboanga City. Data preprocessing will include HSV color space segmentation followed by transfer learning on mobile architectures. Offline deployment will use TensorFlow Lite.',
    criteriaChecklist: {
      eligibleProponent: true,
      withinBudgetCap: true,
      alignedPriority: true,
      requiredFormsAttached: true,
    },
    attachments: [
      { name: 'DOST_Form_1B_Concept_Alvarez.pdf', size: '1.8 MB', type: 'PDF' },
      { name: 'Dean_Endorsement_CSM.pdf', size: '420 KB', type: 'PDF' },
      { name: 'Itemized_Preliminary_Budget.xlsx', size: '210 KB', type: 'Spreadsheet' }
    ]
  },
  {
    id: 'cp-002',
    code: 'CP-2027-CAF-02',
    title: 'Bioprospecting Indigenous Zamboanga Coastal Halophytes for Saline-Resilient Bio-Fertilizers',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Prof. Jocelyn Tan',
    leadInvestigatorEmail: 'jocelyn.tan@wmsu.edu.ph',
    coInvestigators: ['Dr. Michael S. Reyes', 'Ms. Sarah Jane Datu'],
    college: 'College of Agriculture & Forestry',
    department: 'Department of Agronomy & Soil Science',
    submittedAt: '2026-09-24',
    submittedTime: '10:15 AM',
    screeningStatus: 'pending',
    budgetRequested: 495000,
    thematicArea: 'Agriculture, Food Security & Sustainable Farming',
    durationMonths: 12,
    executiveSummary:
      'Intrusion of saltwater in low-lying coastal paddies in Western Mindanao impairs lowland rice cultivation. This concept proposes screening halotolerant rhizosphere bacteria from indigenous mangroves and saltmarsh vegetation to synthesize a bio-stimulant promoting salinity tolerance.',
    objectives: [
      'Isolate and characterize 30 halophilic microbial strains from Zamboanga coastal fringe zones.',
      'Screen isolates for nitrogen fixation, phosphate solubilization, and ACC deaminase activity under 150mM NaCl stress.',
      'Formulate a microbial carrier bio-fertilizer and conduct nursery trials on salt-affected rice varieties.',
      'Produce an instructional farm primer in Chavacano and Visayan.'
    ],
    expectedOutputs: {
      publications: '1 peer-reviewed publication in Philippine Journal of Science',
      patents: 'Utility Model application for halophyte microbial consortium',
      products: 'HaloGrow Liquid Bio-inoculant prototype',
      peopleServices: '30 agricultural extension workers trained',
      placesPartnerships: 'Collaboration with DA-RFO IX Research Division',
      policies: 'Soil Salinity Mitigation Framework for coastal farm belts'
    },
    methodologySummary:
      'Soil and root rhizobacteria sampling following standard BFAR/DENR environmental collection permits. In-vitro biochemical screening for plant growth-promoting traits, followed by factorial greenhouse pot trials measuring chlorophyll index and biomass yield.',
    criteriaChecklist: {
      eligibleProponent: true,
      withinBudgetCap: true,
      alignedPriority: true,
      requiredFormsAttached: true,
    },
    attachments: [
      { name: 'Concept_Note_CAF_Saline_Tan.pdf', size: '2.4 MB', type: 'PDF' },
      { name: 'Endorsement_Letter_Dean_CAF.pdf', size: '380 KB', type: 'PDF' },
      { name: 'Workplan_Gantt_Chart.pdf', size: '540 KB', type: 'PDF' }
    ]
  },
  {
    id: 'cp-003',
    code: 'CP-2027-CET-03',
    title: 'Off-Grid Hybrid Solar-Thermal Desalination System for Island Communities of Region IX',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Engr. Ronald Bautista',
    leadInvestigatorEmail: 'ronald.bautista@wmsu.edu.ph',
    coInvestigators: ['Engr. Clarissa Lim', 'Dr. Alvin Santos'],
    college: 'College of Engineering & Technology',
    department: 'Department of Mechanical Engineering',
    submittedAt: '2026-09-27',
    submittedTime: '02:45 PM',
    screeningStatus: 'pending',

    budgetRequested: 470000,
    thematicArea: 'Renewable Energy & Green Technology',
    durationMonths: 10,
    executiveSummary:
      'Isolated island barangays in Zamboanga experience acute drinking water shortages during dry monsoon periods. This project designs, constructs, and deploys an affordable, parabolic-trough solar thermal still capable of generating 45 liters/day of WHO-compliant potable drinking water from seawater with zero fuel consumption.',
    objectives: [
      'Design a compact modular solar concentrator using locally available aluminum composite panels.',
      'Fabricate and calibrate latent heat energy recovery condensers to maximize daily distillate throughput.',
      'Perform chemical and microbiological water potability tests per PNSDW standards.',
      'Establish community operation and maintenance training modules for island barangay councils.'
    ],
    expectedOutputs: {
      publications: '1 international conference paper in renewable energy systems',
      patents: '1 Utility Model on multi-stage evaporator recovery chamber',
      products: '1 working field prototype tested on Great Santa Cruz Island',
      peopleServices: '50 island households provided with emergency drinking supply',
      placesPartnerships: 'MOU with Barangay Council & City Disaster Risk Reduction Office',
      policies: 'Island Potable Water Resiliency Protocol'
    },
    methodologySummary:
      'Thermodynamic simulation in ANSYS CFD, prototype fabrication at WMSU CET FabLab, field installation with data logging for solar insolation, temperature sensors, and conductivity measurements.',
    criteriaChecklist: {
      eligibleProponent: true,
      withinBudgetCap: true,
      alignedPriority: true,
      requiredFormsAttached: true,
    },
    attachments: [
      { name: 'CET_Concept_Desalination_Bautista.pdf', size: '3.1 MB', type: 'PDF' },
      { name: 'Detailed_Cost_Estimation.xlsx', size: '185 KB', type: 'Spreadsheet' },
      { name: 'Dean_Endorsement_CET.pdf', size: '310 KB', type: 'PDF' }
    ]
  },
  {
    id: 'cp-004',
    code: 'CP-2027-CN-04',
    title: 'Community-Based Maternal and Infant Tele-Health Triage System for Geographically Isolated Areas',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Dr. Elena Ramirez',
    leadInvestigatorEmail: 'elena.ramirez@wmsu.edu.ph',
    coInvestigators: ['Prof. Maricel Yap', 'Dr. Victoriano Gomez'],
    college: 'College of Nursing',
    department: 'Department of Community Health Nursing',
    submittedAt: '2026-09-18',
    submittedTime: '11:20 AM',
    screeningStatus: 'passed',
    budgetRequested: 460000,
    thematicArea: 'Health, Wellness & Bio-prospecting',
    durationMonths: 12,
    executiveSummary:
      'Geographically Isolated and Disadvantaged Areas (GIDA) in Western Mindanao report high delays in perinatal emergency referrals. This project establishes a SMS/LoRa-based offline triage mobile protocol for Barangay Health Workers to flag pre-eclampsia, hemorrhage, and neonatal distress.',
    objectives: [
      'Survey maternal healthcare communication bottlenecks across 8 rural coastal clinics.',
      'Deploy localized clinical algorithm for high-risk obstetric symptoms on rugged tablets.',
      'Train 40 Barangay Health Workers on emergency alerting and referral pathways.',
      'Evaluate maternal referral lag time before and after system introduction.'
    ],
    expectedOutputs: {
      publications: '1 publication in Asian Journal of Public Health',
      patents: 'Copyright on Triage Clinical Decision Tree',
      products: 'Tele-Nanay Offline Mobile Alert System',
      peopleServices: '40 BHWs certified, 300 expectant mothers monitored',
      placesPartnerships: 'City Health Office IX Partnership Agreement',
      policies: 'Rural Maternal Triage Policy Brief'
    },
    methodologySummary:
      'Mixed-methods implementation science approach. Formative design with midwives, followed by quasi-experimental comparative intervention across 4 test vs 4 control barangays.',
    criteriaChecklist: {
      eligibleProponent: true,
      withinBudgetCap: true,
      alignedPriority: true,
      requiredFormsAttached: true,
    },
    attachments: [
      { name: 'Concept_TeleNanay_Ramirez.pdf', size: '2.1 MB', type: 'PDF' },
      { name: 'Dean_Endorsement_Nursing.pdf', size: '390 KB', type: 'PDF' },
      { name: 'Ethics_Initial_Clearance.pdf', size: '512 KB', type: 'PDF' }
    ],
    screeningRemarks:
      'PASSED: Fully compliant with WMSU priority health research agenda. Budget is realistic and within ceiling. Proponent has completed prior institutional grant successfully. Recommended to proceed to full proposal with detailed ethics protocol.',
    screenedBy: 'Dr. Maria Santos - RPDU Head',
    screenedAt: '2026-09-20'
  },
  {
    id: 'cp-005',
    code: 'CP-2027-CLA-05',
    title: 'Digital Archival and Interactive Audio-Visual Preservation of Indigenous Sama-Bajau Oral Epics',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Prof. Maria Theresa Santos',
    leadInvestigatorEmail: 'theresa.santos@wmsu.edu.ph',
    coInvestigators: ['Mr. Nadzmi Sahid', 'Ms. Kimberly Tan'],
    college: 'College of Liberal Arts',
    department: 'Department of History & Social Sciences',
    submittedAt: '2026-09-19',
    submittedTime: '03:10 PM',
    screeningStatus: 'passed',
    budgetRequested: 395000,
    thematicArea: 'Community Empowerment & Social Innovation',
    durationMonths: 8,
    executiveSummary:
      'The oral literature, songs, and historical narratives of the indigenous Sama-Bajau communities in Rio Hondo and Campo Islam risk rapid erosion due to generational displacement. This project captures high-fidelity digital audio-visual recordings, linguistic annotations, and establishes an open-access institutional repository at the WMSU Library.',
    objectives: [
      'Record and transcribe 20 hours of master elder chants and oral narratives.',
      'Produce bilingual transcriptions and cultural contextual notes in Sinama, English, and Filipino.',
      'Mount an interactive digital exhibition kiosk in the WMSU RDEC Heritage wing.',
      'Publish an open-access cultural sourcebook.'
    ],
    expectedOutputs: {
      publications: '1 indexed journal paper in Philippine Studies',
      patents: 'Digital Media Copyright registrations',
      products: 'Open-access Multimedia Oral History Portal',
      peopleServices: '15 indigenous youth cultural ambassadors trained',
      placesPartnerships: 'National Commission on Indigenous Peoples (NCIP) IX Agreement',
      policies: 'Intangible Cultural Heritage Preservation Guideline'
    },
    methodologySummary:
      'Ethno-historical field documentation adhering to Free, Prior, and Informed Consent (FPIC) protocols from NCIP and elder councils. Linguistic transcription verified through community validation circles.',
    criteriaChecklist: {
      eligibleProponent: true,
      withinBudgetCap: true,
      alignedPriority: true,
      requiredFormsAttached: true,
    },
    attachments: [
      { name: 'Concept_SamaBajau_Heritage.pdf', size: '2.7 MB', type: 'PDF' },
      { name: 'NCIP_FPIC_Letter.pdf', size: '820 KB', type: 'PDF' },
      { name: 'Dean_Endorsement_CLA.pdf', size: '295 KB', type: 'PDF' }
    ],
    screeningRemarks:
      'PASSED: Exemplary cultural preservation concept. High societal impact for Western Mindanao ethnic heritage. Endorsed to submit full proposal with final NCIP council resolution.',
    screenedBy: 'Dr. Maria Santos - RPDU Head',
    screenedAt: '2026-09-21'
  },
  {
    id: 'cp-006',
    code: 'CP-2027-CTE-06',
    title: 'Immersive Mixed-Reality Simulator for Maritime Cadet Safety Drills',
    callId: 'call-2027-01',
    callTitle: 'Institutional Research & Innovation Call 2027',
    leadInvestigator: 'Dr. Jonathan Perez',
    leadInvestigatorEmail: 'jonathan.perez@wmsu.edu.ph',
    coInvestigators: ['Engr. Danilo Mendoza'],
    college: 'College of Teacher Education',
    department: 'Department of Educational Technology',
    submittedAt: '2026-09-25',
    submittedTime: '01:50 PM',
    screeningStatus: 'failed',

    budgetRequested: 780000,
    thematicArea: 'Artificial Intelligence & Digital Transformation',
    durationMonths: 18,
    executiveSummary:
      'Development of high-end VR simulation headsets and haptic gloves to simulate maritime fire and abandon-ship drills for maritime trainees.',
    objectives: [
      'Procure high-end VR workstations and optical tracking equipment.',
      'Model 3D virtual ship cargo hulls.',
      'Test learner reaction times during simulated emergency drills.'
    ],
    expectedOutputs: {
      publications: '1 conference paper',
      patents: 'Software registration',
      products: 'Virtual Reality Simulation Software',
      peopleServices: '30 cadets evaluated'
    },
    methodologySummary:
      'Procurement of equipment followed by Unreal Engine software programming and testing.',
    criteriaChecklist: {
      eligibleProponent: true,
      withinBudgetCap: false,
      alignedPriority: true,
      requiredFormsAttached: false,
    },
    attachments: [
      { name: 'Concept_Perez_VR.pdf', size: '1.2 MB', type: 'PDF' }
    ],
    screeningRemarks:
      'FAILED: Proposal budget of ₱780,000 significantly exceeds the maximum institutional grant ceiling of ₱500,000 for CALL-2027-01. Furthermore, the submission is missing the mandatory Dean Endorsement Letter and Line-Item Budget justification. Equipment procurement comprises 85% of budget without justification for institutional capability.',
    failureReasons: [
      'Budget exceeds maximum institutional grant ceiling (₱500,000)',
      'Incomplete submission documents (Missing College Dean Endorsement)',
      'High capital outlay/equipment ratio exceeding allowable RDEC limits'
    ],
    screenedBy: 'Dr. Maria Santos - RPDU Head',
    screenedAt: '2026-09-26'
  }
];

