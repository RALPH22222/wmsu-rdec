import type {
  DetailedProposal,
  Evaluation,
  EvaluationCriterionScore,
  Evaluator,
  EvaluatorAssignment,
  ProposalRevision,
} from '../types';
import { EVALUATION_CRITERIA, computeTotalScore } from '../lib/proposalPipeline';

/** The evaluator used for the evaluator portal when the signed-in email matches no seeded evaluator. */
export const DEMO_EVALUATOR_ID = 'ev-001';

const CALL_ID = 'call-2027-01';
const CALL_TITLE = 'Institutional Research & Innovation Call 2027';
const RPDU_DIRECTOR = 'Dr. Maria Santos (RPDU Director)';
// Proponent actions are recorded by role so the status history stays safe to show in blind views.
const PROPONENT = 'Proponent';
const SYSTEM = 'System';

// ============================================================================
// Evaluators
// ============================================================================

export const MOCK_EVALUATORS: Evaluator[] = [
  {
    id: 'ev-001',
    name: 'Dr. Elena Ramirez',
    email: 'elena.ramirez@wmsu.edu.ph',
    title: 'Professor & Senior Technical Evaluator',
    college: 'College of Agriculture & Forestry',
    department: 'Department of Crop Science & Plant Protection',
    expertise: ['Agriculture, Food Security & Sustainable Farming', 'Health, Wellness & Bio-prospecting'],
    isExternal: false,
  },
  {
    id: 'ev-002',
    name: 'Dr. Rafael Montenegro',
    email: 'rafael.montenegro@wmsu.edu.ph',
    title: 'Associate Professor, Machine Learning',
    college: 'College of Computing Studies',
    department: 'Department of Information Technology',
    expertise: ['Artificial Intelligence & Digital Transformation'],
    isExternal: false,
  },
  {
    id: 'ev-003',
    name: 'Engr. Lourdes Bautista',
    email: 'lourdes.bautista@wmsu.edu.ph',
    title: 'Professor, Energy Systems Engineering',
    college: 'College of Engineering & Technology',
    department: 'Department of Mechanical Engineering',
    expertise: ['Renewable Energy & Green Technology', 'Artificial Intelligence & Digital Transformation'],
    isExternal: false,
  },
  {
    id: 'ev-004',
    name: 'Dr. Nadia Abubakar',
    email: 'nadia.abubakar@wmsu.edu.ph',
    title: 'Professor, Development Studies',
    college: 'College of Liberal Arts',
    department: 'Department of Psychology',
    expertise: ['Community Empowerment & Social Innovation'],
    isExternal: false,
  },
  {
    id: 'ev-005',
    name: 'Dr. Marco Villanueva',
    email: 'marco.villanueva@wmsu.edu.ph',
    title: 'Associate Professor, Public Health Nursing',
    college: 'College of Nursing',
    department: 'Department of Medical-Surgical Nursing',
    expertise: ['Health, Wellness & Bio-prospecting'],
    isExternal: false,
  },
  {
    id: 'ev-006',
    name: 'Dr. Priscilla Enriquez',
    email: 'priscilla.enriquez@wmsu.edu.ph',
    title: 'Professor, Computer Vision',
    college: 'College of Science & Mathematics',
    department: 'Department of Computer Science',
    expertise: ['Artificial Intelligence & Digital Transformation'],
    isExternal: false,
  },
  {
    id: 'ev-007',
    name: 'Dr. Samuel Dizon',
    email: 'samuel.dizon@region9.dost.gov.ph',
    title: 'Senior Science Research Specialist (External)',
    college: 'Department of Science and Technology – Region IX',
    department: 'Technical Services Division',
    expertise: ['Agriculture, Food Security & Sustainable Farming', 'Renewable Energy & Green Technology'],
    isExternal: true,
  },
  {
    id: 'ev-008',
    name: 'Dr. Corazon Lim',
    email: 'corazon.lim@wmsu.edu.ph',
    title: 'Associate Professor, Social Studies Education',
    college: 'College of Teacher Education',
    department: 'Department of Social Studies Education',
    expertise: ['Community Empowerment & Social Innovation'],
    isExternal: false,
  },
];

// ============================================================================
// Detailed proposals
// ============================================================================

export const INITIAL_DETAILED_PROPOSALS: DetailedProposal[] = [
  {
    id: 'dp-001',
    code: 'DP-2027-CSM-01',
    conceptProposalId: 'cp-001',
    callId: CALL_ID,
    callTitle: CALL_TITLE,
    title: 'AI-Powered Early Foliar Disease Detection for Zamboanga Peninsula Rubber Plantations',
    proponentId: 'user-researcher-2',
    leadInvestigator: 'Dr. Arnel Alvarez',
    leadInvestigatorEmail: 'arnel.alvarez@wmsu.edu.ph',
    coInvestigators: ['Engr. Fatima Hassan', 'Prof. Reynaldo Cruz'],
    college: 'College of Science & Mathematics',
    department: 'Department of Computer Science',
    thematicArea: 'Artificial Intelligence & Digital Transformation',
    durationMonths: 12,
    budgetRequested: 485000,
    abstract:
      'Rubber tree (Hevea brasiliensis) plantations across the Zamboanga Peninsula lose an estimated 15–30% of latex yield each wet season to Corynespora leaf fall and anthracnose. This project develops RubberGuard, an offline Android diagnostic tool that runs a lightweight YOLOv8-Nano model on low-cost phones so smallholder tappers and municipal agricultural technicians can identify foliar disease at the first visible lesion, without mobile data.',
    rationale:
      'Smallholder rubber farms in Zamboanga Sibugay and the upland barangays of Zamboanga City are served by too few extension workers to inspect plantations on a regular cycle, and most farms have weak or no mobile signal. Diagnosis usually happens only after defoliation is widespread. An offline, phone-based classifier trained on local symptom imagery would shorten detection time and give the City and Provincial Agriculturist Offices field data they currently lack.',
    objectives: [
      'Assemble an annotated image corpus of at least 5,000 localized rubber foliar disease symptoms from four sampling sites in Region IX.',
      'Train and compress a YOLOv8-Nano detector that reaches at least 90% mAP@0.5 while running fully offline on entry-level Android devices.',
      'Pilot-test RubberGuard with three partner cooperatives in Zamboanga Sibugay and Zamboanga City and measure field detection accuracy against agronomist diagnosis.',
      'Draft digital crop surveillance guidelines for adoption by the City Agriculturist Office.',
    ],
    methodology:
      'Leaf imagery will be collected monthly across four sampling sites (Ipil, Kabasalan, Tumaga, and Pasonanca) under varied lighting and canopy conditions. Images will be annotated by two plant pathologists with inter-rater agreement checked on a 10% overlap set. Preprocessing uses HSV segmentation and augmentation; models are trained by transfer learning and quantized to TensorFlow Lite. Field validation follows a stratified design across the three cooperatives, comparing app diagnoses with confirmed laboratory results using precision, recall, and Cohen’s kappa.',
    expectedOutputs: {
      publications: '1 Scopus/WoS-indexed journal article on edge AI for plantation crops',
      patents: '1 software copyright registration with IPOPHL',
      products: 'RubberGuard offline Android application (APK) and annotated image dataset',
      peopleServices: '120 smallholder rubber farmers and 15 agricultural technicians trained',
      placesPartnerships: '2 MOAs with rubber farming cooperatives in Zamboanga Sibugay',
      policies: '1 provincial crop surveillance advisory draft',
    },
    timeline: [
      { phase: 'Field imagery collection & annotation', months: '1–3', deliverable: 'Annotated corpus of 5,000+ images' },
      { phase: 'Model training & compression', months: '4–6', deliverable: 'Quantized YOLOv8-Nano model and benchmark report' },
      { phase: 'App development & cooperative pilot', months: '7–9', deliverable: 'RubberGuard APK deployed in 3 cooperatives' },
      { phase: 'Field validation & policy drafting', months: '10–12', deliverable: 'Validation report, manuscript, and advisory draft' },
    ],
    manuscript: { name: 'DP-2027-CSM-01_Full_Proposal.pdf', size: '3.4 MB', type: 'PDF', uploadedAt: '2026-10-03T01:30:00.000Z' },
    submittedAt: '2026-10-03T01:30:00.000Z',
    status: 'pending_assignment',
    currentRound: 1,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-10-03T01:30:00.000Z', by: PROPONENT, note: 'Detailed proposal submitted', round: 1 },
    ],
  },
  {
    id: 'dp-002',
    code: 'DP-2027-CAF-02',
    conceptProposalId: 'cp-002',
    callId: CALL_ID,
    callTitle: CALL_TITLE,
    title: 'Bioprospecting Indigenous Zamboanga Coastal Halophytes for Saline-Resilient Bio-Fertilizers',
    proponentId: 'user-researcher-3',
    leadInvestigator: 'Prof. Jocelyn Tan',
    leadInvestigatorEmail: 'jocelyn.tan@wmsu.edu.ph',
    coInvestigators: ['Dr. Michael S. Reyes', 'Ms. Sarah Jane Datu'],
    college: 'College of Agriculture & Forestry',
    department: 'Department of Agronomy & Soil Science',
    thematicArea: 'Agriculture, Food Security & Sustainable Farming',
    durationMonths: 12,
    budgetRequested: 495000,
    abstract:
      'Saltwater intrusion into low-lying coastal paddies of Western Mindanao is reducing lowland rice yields. This project isolates halotolerant plant growth-promoting bacteria from the rhizosphere of indigenous mangroves and saltmarsh plants along the Zamboanga coast and formulates them into a carrier-based bio-fertilizer that improves rice establishment under salinity stress.',
    rationale:
      'Farmers in coastal barangays such as Talon-Talon, Mampang, and Arena Blanco report yield losses after king tides and prolonged dry spells raise soil salinity. Chemical amelioration is costly and gypsum is rarely available locally. Microbes already adapted to saline coastal soils are a low-cost, locally sourced option that has not been characterized for Zamboanga.',
    objectives: [
      'Isolate and characterize 30 halophilic bacterial strains from Zamboanga coastal fringe zones.',
      'Screen isolates for nitrogen fixation, phosphate solubilization, and ACC deaminase activity under 150 mM NaCl stress.',
      'Formulate a carrier-based microbial bio-fertilizer and run nursery and pot trials on salt-affected rice varieties.',
      'Produce an instructional farm primer in Chavacano and Visayan.',
    ],
    methodology:
      'Rhizosphere soil and root samples will be collected from six coastal sites under DENR and BFAR collection permits. Isolates are screened in vitro for plant growth-promoting traits and identified by 16S rRNA sequencing. The best three isolates are combined into a vermicast carrier and tested in a randomized complete block greenhouse trial (four salinity levels × four treatments × four replicates), measuring chlorophyll index, tiller count, biomass, and grain yield.',
    expectedOutputs: {
      publications: '1 peer-reviewed article in the Philippine Journal of Science',
      patents: '1 utility model application for the halophyte microbial consortium',
      products: 'HaloGrow carrier-based bio-inoculant prototype',
      peopleServices: '30 agricultural extension workers trained',
      placesPartnerships: 'Research collaboration with DA-RFO IX Research Division',
      policies: 'Soil salinity mitigation framework for coastal farm belts',
    },
    timeline: [
      { phase: 'Coastal sampling & isolation', months: '1–3', deliverable: 'Culture collection of 30 characterized isolates' },
      { phase: 'Biochemical screening & identification', months: '4–6', deliverable: 'Screening report and 16S rRNA identities' },
      { phase: 'Formulation & greenhouse trials', months: '7–10', deliverable: 'HaloGrow prototype and trial dataset' },
      { phase: 'Farmer primer & dissemination', months: '11–12', deliverable: 'Bilingual primer and manuscript' },
    ],
    manuscript: { name: 'DP-2027-CAF-02_Full_Proposal.pdf', size: '4.1 MB', type: 'PDF', uploadedAt: '2026-09-30T02:15:00.000Z' },
    submittedAt: '2026-09-30T02:15:00.000Z',
    status: 'pending_assignment',
    currentRound: 1,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-09-30T02:15:00.000Z', by: PROPONENT, note: 'Detailed proposal submitted', round: 1 },
    ],
  },
  {
    id: 'dp-003',
    code: 'DP-2027-COE-03',
    callId: CALL_ID,
    callTitle: CALL_TITLE,
    title: 'Solar-Powered Smart Microgrid Controller for Off-Grid Island Barangays of Zamboanga City',
    proponentId: 'user-researcher-4',
    leadInvestigator: 'Engr. Benjamin Salazar',
    leadInvestigatorEmail: 'benjamin.salazar@wmsu.edu.ph',
    coInvestigators: ['Engr. Abdulhakim Jumaani', 'Engr. Rosalie Mendoza'],
    college: 'College of Engineering & Technology',
    department: 'Department of Electrical Engineering',
    thematicArea: 'Renewable Energy & Green Technology',
    durationMonths: 10,
    budgetRequested: 470000,
    abstract:
      'Island barangays such as Sacol, Manalipa, and Tigtabon rely on diesel generators that run only a few hours each night. This project designs and field-tests a low-cost smart controller for community solar-battery microgrids that schedules loads, protects batteries from deep discharge, and reports performance over LoRa so that barangay energy cooperatives can keep systems running between technician visits.',
    rationale:
      'Existing donated solar installations on Zamboanga islands frequently fail within two years because batteries are over-discharged and faults go unreported. A controller designed around local load profiles and maintainable with locally available parts would extend battery life and make community-run microgrids viable.',
    objectives: [
      'Characterize household and community load profiles in two island barangays over a full dry and wet season.',
      'Design and build a microcontroller-based load scheduler with battery state-of-charge protection and LoRa telemetry.',
      'Install and monitor a 5 kWp pilot microgrid with the controller on Sacol Island for six months.',
      'Develop an operation and maintenance training module for barangay energy cooperatives.',
    ],
    methodology:
      'Load profiles are logged with clamp-on energy meters in 40 households. Controller logic is simulated in MATLAB/Simulink against measured solar irradiance before prototyping on an ESP32 platform. The pilot installation is compared with an existing uncontrolled system on a neighbouring island using battery depth-of-discharge, unserved energy, and uptime as outcome measures.',
    expectedOutputs: {
      publications: '1 international conference paper on rural microgrid control',
      patents: '1 utility model on the load-priority scheduling circuit',
      products: 'Field-tested smart microgrid controller prototype',
      peopleServices: '60 island households served; 12 cooperative members trained',
      placesPartnerships: 'MOU with the Barangay Council of Sacol and ZAMCELCO',
      policies: 'Island microgrid operation protocol for the City Energy Office',
    },
    timeline: [
      { phase: 'Load profiling & site survey', months: '1–2', deliverable: 'Load profile dataset and site report' },
      { phase: 'Controller design & simulation', months: '3–4', deliverable: 'Validated control algorithm' },
      { phase: 'Prototype build & installation', months: '5–6', deliverable: 'Installed 5 kWp pilot microgrid' },
      { phase: 'Monitoring & cooperative training', months: '7–10', deliverable: 'Performance report and O&M module' },
    ],
    manuscript: { name: 'DP-2027-COE-03_Full_Proposal.pdf', size: '5.2 MB', type: 'PDF', uploadedAt: '2026-09-15T03:00:00.000Z' },
    submittedAt: '2026-09-15T03:00:00.000Z',
    status: 'under_review',
    currentRound: 1,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-09-15T03:00:00.000Z', by: PROPONENT, note: 'Detailed proposal submitted', round: 1 },
      { status: 'under_review', at: '2026-09-17T06:20:00.000Z', by: RPDU_DIRECTOR, note: 'Evaluator panel complete (3/3)', round: 1 },
    ],
  },
  {
    id: 'dp-004',
    code: 'DP-2027-CLA-04',
    callId: CALL_ID,
    callTitle: CALL_TITLE,
    title: 'Participatory Mapping of Livelihood Vulnerabilities among Sama-Bajau Coastal Communities in Zamboanga City',
    proponentId: 'user-researcher-1',
    leadInvestigator: 'Prof. Juan Dela Cruz',
    leadInvestigatorEmail: 'juan.delacruz@wmsu.edu.ph',
    coInvestigators: ['Ms. Hadja Sitti Kasim', 'Mr. Ronel Valdez'],
    college: 'College of Liberal Arts',
    department: 'Department of Social Sciences',
    thematicArea: 'Community Empowerment & Social Innovation',
    durationMonths: 9,
    budgetRequested: 350000,
    abstract:
      'Sama-Bajau households in Rio Hondo, Mariki, and Taluksangay depend on near-shore fishing and seaweed farming that are increasingly disrupted by coastal reclamation and declining catch. Using participatory mapping and household livelihood surveys, this project documents livelihood assets, risks, and coping strategies and co-develops livelihood priorities with community leaders for the City Social Welfare and Development Office.',
    rationale:
      'Local social protection programs rarely reach sea-dwelling Sama-Bajau households because they are under-represented in barangay registries. No recent, community-validated data exists on their livelihood vulnerabilities, which limits the design of culturally appropriate livelihood support.',
    objectives: [
      'Produce community-validated resource and hazard maps for three Sama-Bajau settlements.',
      'Profile the livelihood assets and income sources of 150 households.',
      'Identify the main shocks and coping strategies affecting household food and income security.',
      'Co-develop a prioritized livelihood support agenda with community leaders and the CSWDO.',
    ],
    methodology:
      'A convergent mixed-methods design combines participatory mapping workshops, a structured household survey, and focus group discussions with fisherfolk, seaweed farmers, and women’s groups. Fieldwork follows Free, Prior and Informed Consent protocols with NCIP and community elders, uses Sinama-speaking enumerators, and validates findings in community assemblies before reporting.',
    expectedOutputs: {
      publications: '1 article in a Philippine social science journal',
      patents: 'Copyright registration of the community map atlas',
      products: 'Community resource and hazard maps; household livelihood dataset',
      peopleServices: '150 households profiled; 20 community mappers trained',
      placesPartnerships: 'Partnership with the CSWDO and NCIP Region IX',
      policies: 'Policy brief on livelihood support for sea-dwelling communities',
    },
    timeline: [
      { phase: 'Entry, FPIC & instrument validation', months: '1–2', deliverable: 'FPIC certificate and validated instruments' },
      { phase: 'Participatory mapping workshops', months: '3–4', deliverable: 'Draft community maps' },
      { phase: 'Household survey & FGDs', months: '5–7', deliverable: 'Survey dataset and FGD transcripts' },
      { phase: 'Validation & agenda setting', months: '8–9', deliverable: 'Final report and policy brief' },
    ],
    manuscript: { name: 'DP-2027-CLA-04_Full_Proposal.pdf', size: '2.9 MB', type: 'PDF', uploadedAt: '2026-09-16T05:45:00.000Z' },
    submittedAt: '2026-09-16T05:45:00.000Z',
    status: 'revision_requested',
    currentRound: 1,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-09-16T05:45:00.000Z', by: PROPONENT, note: 'Detailed proposal submitted', round: 1 },
      { status: 'under_review', at: '2026-09-19T02:10:00.000Z', by: RPDU_DIRECTOR, note: 'Evaluator panel complete (3/3)', round: 1 },
      { status: 'revision_requested', at: '2026-10-02T07:40:00.000Z', by: SYSTEM, note: 'Round 1 complete: Revision Requested', round: 1 },
    ],
  },
  {
    id: 'dp-005',
    code: 'DP-2027-CN-05',
    callId: CALL_ID,
    callTitle: CALL_TITLE,
    title: 'Community-Based Screening and Nutrition Intervention for Childhood Stunting in Coastal Barangays of Zamboanga City',
    proponentId: 'user-researcher-5',
    leadInvestigator: 'Dr. Maricel Ocampo',
    leadInvestigatorEmail: 'maricel.ocampo@wmsu.edu.ph',
    coInvestigators: ['Ms. Jennifer Arquiza, RN', 'Dr. Victoriano Gomez'],
    college: 'College of Nursing',
    department: 'Department of Community Health',
    thematicArea: 'Health, Wellness & Bio-prospecting',
    durationMonths: 12,
    budgetRequested: 460000,
    abstract:
      'Stunting among children under five in Zamboanga City’s coastal barangays remains above the regional average. This project trains Barangay Nutrition Scholars to run quarterly anthropometric screening and delivers a 6-month community feeding and caregiver education program using locally available fish and vegetables, measuring changes in height-for-age z-scores against comparison barangays.',
    rationale:
      'Operation Timbang data show persistent stunting in fishing communities despite existing feeding programs, which are short and rarely paired with caregiver education. A community-run model that uses local food sources and trained volunteers could be sustained by barangay health budgets after the project ends.',
    objectives: [
      'Train 30 Barangay Nutrition Scholars and health workers in standardized WHO anthropometric measurement.',
      'Screen all children aged 6–59 months in four coastal barangays and identify stunted and at-risk children.',
      'Implement a 6-month feeding and caregiver education intervention using locally sourced ingredients.',
      'Compare changes in height-for-age z-scores between intervention and comparison barangays.',
    ],
    methodology:
      'A quasi-experimental design with two intervention and two comparison barangays matched on baseline stunting prevalence. Measurements follow WHO Child Growth Standards with duplicate readings and monthly calibration. The feeding protocol is reviewed by a registered nutritionist-dietitian. Analysis uses difference-in-differences on HAZ scores with mixed-effects models to account for clustering by barangay.',
    expectedOutputs: {
      publications: '1 article in the Asian Journal of Public Health',
      patents: 'Copyright registration of the nutrition screening toolkit',
      products: 'Community nutrition screening toolkit and local recipe guide',
      peopleServices: '30 BNS and BHWs trained; 400 children screened; 120 caregivers educated',
      placesPartnerships: 'Partnership agreement with the City Health Office and four barangay councils',
      policies: 'Policy brief on sustaining community feeding programs',
    },
    timeline: [
      { phase: 'Training & baseline screening', months: '1–3', deliverable: 'Trained BNS cohort and baseline dataset' },
      { phase: 'Feeding & caregiver education', months: '4–9', deliverable: 'Monthly attendance and intake records' },
      { phase: 'Endline screening', months: '10', deliverable: 'Endline anthropometric dataset' },
      { phase: 'Analysis & dissemination', months: '11–12', deliverable: 'Final report, manuscript, and policy brief' },
    ],
    manuscript: { name: 'DP-2027-CN-05_Full_Proposal.pdf', size: '3.8 MB', type: 'PDF', uploadedAt: '2026-09-15T00:40:00.000Z' },
    submittedAt: '2026-09-15T00:40:00.000Z',
    status: 'approved',
    currentRound: 2,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-09-15T00:40:00.000Z', by: PROPONENT, note: 'Detailed proposal submitted', round: 1 },
      { status: 'under_review', at: '2026-09-16T03:00:00.000Z', by: RPDU_DIRECTOR, note: 'Evaluator panel complete (3/3)', round: 1 },
      { status: 'revision_requested', at: '2026-09-22T08:15:00.000Z', by: SYSTEM, note: 'Round 1 complete: Revision Requested', round: 1 },
      { status: 'under_review', at: '2026-09-26T04:30:00.000Z', by: PROPONENT, note: 'Revision 1 uploaded', round: 2 },
      { status: 'approved', at: '2026-09-30T06:50:00.000Z', by: SYSTEM, note: 'Round 2 complete: Approved', round: 2 },
    ],
  },
  {
    id: 'dp-006',
    code: 'DP-2027-CSM-06',
    callId: CALL_ID,
    callTitle: CALL_TITLE,
    title: 'Edge-AI Early Warning System for Coconut Scale Insect Infestation in Zamboanga Peninsula Coconut Farms',
    proponentId: 'user-researcher-2',
    leadInvestigator: 'Dr. Arnel Alvarez',
    leadInvestigatorEmail: 'arnel.alvarez@wmsu.edu.ph',
    coInvestigators: ['Engr. Fatima Hassan', 'Mr. Khalid Sahibul'],
    college: 'College of Science & Mathematics',
    department: 'Department of Computer Science',
    thematicArea: 'Artificial Intelligence & Digital Transformation',
    durationMonths: 12,
    budgetRequested: 480000,
    abstract:
      'Coconut scale insect (Aspidiotus rigidus) outbreaks can wipe out a farm’s production for two years, and early infestations are hard to see from the ground. This project extends the team’s offline edge-AI pipeline to detect early scale insect damage from smartphone photos of fronds and from low-altitude drone imagery, and sends geotagged alerts to PCA Region IX for rapid containment.',
    rationale:
      'Zamboanga Peninsula is one of the country’s largest coconut-producing regions, and past outbreaks in other regions spread faster than manual surveillance could track. An early warning system that farmers and PCA technicians can use offline would allow containment before infestations spread across barangays.',
    objectives: [
      'Build a labeled dataset of healthy and scale-infested coconut fronds from 10 farms in Zamboanga Sibugay and Zamboanga del Norte.',
      'Train an offline classifier that distinguishes early-stage scale infestation from nutrient deficiency and other leaf discoloration.',
      'Deploy a mobile and drone-assisted surveillance workflow with geotagged alerts to PCA Region IX.',
    ],
    methodology:
      'Imagery is captured at fixed plots across 10 farms, with ground-truth infestation levels confirmed by PCA entomologists. Data are split by farm to prevent leakage between training and test sets. Models are trained with transfer learning, compressed for on-device inference, and evaluated with per-class precision and recall. The surveillance workflow is piloted with PCA technicians for four months and compared with routine visual inspection.',
    expectedOutputs: {
      publications: '1 Scopus-indexed article on AI-assisted pest surveillance',
      patents: '1 software copyright registration with IPOPHL',
      products: 'Offline coconut scale insect detection app and alert dashboard',
      peopleServices: '80 coconut farmers and 10 PCA technicians trained',
      placesPartnerships: 'Data-sharing agreement with PCA Region IX',
      policies: 'Recommended surveillance protocol for coconut scale insect',
    },
    timeline: [
      { phase: 'Plot setup & image collection', months: '1–3', deliverable: 'Labeled dataset from 10 farms' },
      { phase: 'Model development & compression', months: '4–6', deliverable: 'On-device classifier and evaluation report' },
      { phase: 'Surveillance workflow pilot', months: '7–10', deliverable: 'Pilot deployment with PCA technicians' },
      { phase: 'Evaluation & dissemination', months: '11–12', deliverable: 'Final report, manuscript, and protocol' },
    ],
    manuscript: { name: 'DP-2027-CSM-06_Full_Proposal.pdf', size: '3.6 MB', type: 'PDF', uploadedAt: '2026-09-22T01:05:00.000Z' },
    submittedAt: '2026-09-22T01:05:00.000Z',
    status: 'under_review',
    currentRound: 2,
    statusHistory: [
      { status: 'pending_assignment', at: '2026-09-22T01:05:00.000Z', by: PROPONENT, note: 'Detailed proposal submitted', round: 1 },
      { status: 'under_review', at: '2026-09-24T02:30:00.000Z', by: RPDU_DIRECTOR, note: 'Evaluator panel complete (3/3)', round: 1 },
      { status: 'revision_requested', at: '2026-09-29T09:10:00.000Z', by: SYSTEM, note: 'Round 1 complete: Revision Requested', round: 1 },
      { status: 'under_review', at: '2026-10-03T05:25:00.000Z', by: PROPONENT, note: 'Revision 1 uploaded', round: 2 },
    ],
  },
];

// ============================================================================
// Evaluator assignments. Due date = assignedAt + 14 days; when a revision opens a new round,
// uploadRevision restarts every panel member's clock at upload + 14 days (dp-005, dp-006).
// ============================================================================

export const INITIAL_ASSIGNMENTS: EvaluatorAssignment[] = [
  // dp-002 — panel incomplete (2 of 3)
  { id: 'asg-002a', proposalId: 'dp-002', evaluatorId: 'ev-001', blindLabel: 'Evaluator A', assignedAt: '2026-10-01T02:00:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-15' },
  { id: 'asg-002b', proposalId: 'dp-002', evaluatorId: 'ev-007', blindLabel: 'Evaluator B', assignedAt: '2026-10-02T03:30:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-16' },
  // dp-003 — round 1 in progress; asg-003c is overdue
  { id: 'asg-003a', proposalId: 'dp-003', evaluatorId: 'ev-003', blindLabel: 'Evaluator A', assignedAt: '2026-09-16T01:00:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-09-30' },
  { id: 'asg-003b', proposalId: 'dp-003', evaluatorId: 'ev-007', blindLabel: 'Evaluator B', assignedAt: '2026-09-16T01:20:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-09-30' },
  { id: 'asg-003c', proposalId: 'dp-003', evaluatorId: 'ev-001', blindLabel: 'Evaluator C', assignedAt: '2026-09-17T06:20:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-01' },
  // dp-004 — round 1 complete, revision requested
  { id: 'asg-004a', proposalId: 'dp-004', evaluatorId: 'ev-004', blindLabel: 'Evaluator A', assignedAt: '2026-09-18T01:00:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-02' },
  { id: 'asg-004b', proposalId: 'dp-004', evaluatorId: 'ev-008', blindLabel: 'Evaluator B', assignedAt: '2026-09-18T01:15:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-02' },
  { id: 'asg-004c', proposalId: 'dp-004', evaluatorId: 'ev-005', blindLabel: 'Evaluator C', assignedAt: '2026-09-19T02:10:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-03' },
  // dp-005 — approved after round 2 (round 2 opened 2026-09-26)
  { id: 'asg-005a', proposalId: 'dp-005', evaluatorId: 'ev-005', blindLabel: 'Evaluator A', assignedAt: '2026-09-15T05:00:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-10' },
  { id: 'asg-005b', proposalId: 'dp-005', evaluatorId: 'ev-001', blindLabel: 'Evaluator B', assignedAt: '2026-09-16T02:40:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-10' },
  { id: 'asg-005c', proposalId: 'dp-005', evaluatorId: 'ev-004', blindLabel: 'Evaluator C', assignedAt: '2026-09-16T03:00:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-10' },
  // dp-006 — round 2 in progress (round 2 opened 2026-10-03)
  { id: 'asg-006a', proposalId: 'dp-006', evaluatorId: 'ev-002', blindLabel: 'Evaluator A', assignedAt: '2026-09-23T03:00:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-17' },
  { id: 'asg-006b', proposalId: 'dp-006', evaluatorId: 'ev-001', blindLabel: 'Evaluator B', assignedAt: '2026-09-24T02:10:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-17' },
  { id: 'asg-006c', proposalId: 'dp-006', evaluatorId: 'ev-003', blindLabel: 'Evaluator C', assignedAt: '2026-09-24T02:30:00.000Z', assignedBy: RPDU_DIRECTOR, dueDate: '2026-10-17' },
];

// ============================================================================
// Evaluations
// ============================================================================

/** Scores in EVALUATION_CRITERIA order: relevance, objectives, methodology, feasibility, budget, outputs. */
type ScoreRow = [number, number, number, number, number, number];

const scoreSheet = (row: ScoreRow): EvaluationCriterionScore[] =>
  EVALUATION_CRITERIA.map((criterion, i) => ({ criterionId: criterion.id, score: row[i] }));

const evaluation = (base: Omit<Evaluation, 'scores' | 'totalScore'>, row: ScoreRow): Evaluation => {
  const scores = scoreSheet(row);
  return { ...base, scores, totalScore: computeTotalScore(scores) };
};

export const INITIAL_EVALUATIONS: Evaluation[] = [
  // dp-003 — round 1 (1 of 3 received)
  evaluation(
    {
      id: 'eval-003a',
      proposalId: 'dp-003',
      assignmentId: 'asg-003a',
      evaluatorId: 'ev-003',
      round: 1,
      remarks:
        'Well-scoped engineering project with a clear problem statement drawn from failed island installations. The simulation-before-prototype approach and the comparison site are appropriate. Budget is reasonable for a 5 kWp pilot.',
      actionSheet: [
        { id: 'ai-003a-1', section: 'methodology', severity: 'suggested', comment: 'State the battery chemistry and the depth-of-discharge threshold the controller will enforce.' },
      ],
      recommendation: 'approve',
      submittedAt: '2026-09-26T07:00:00.000Z',
    },
    [9, 8, 8, 8, 9, 9]
  ),

  // dp-004 — round 1 complete (approve, revise, revise)
  evaluation(
    {
      id: 'eval-004a',
      proposalId: 'dp-004',
      assignmentId: 'asg-004a',
      evaluatorId: 'ev-004',
      round: 1,
      remarks:
        'Timely and culturally grounded study. The FPIC process and use of Sinama-speaking enumerators are strengths. The budget is lean but honoraria for community mappers could be better justified.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-09-28T03:20:00.000Z',
    },
    [8, 8, 8, 8, 6, 8]
  ),
  evaluation(
    {
      id: 'eval-004b',
      proposalId: 'dp-004',
      assignmentId: 'asg-004b',
      evaluatorId: 'ev-008',
      round: 1,
      remarks:
        'Relevant topic with strong community partnerships, but the sampling of 150 households is not justified against the population of the three settlements, and several budget lines lack a basis. The work plan also needs adjustment around community calendars.',
      actionSheet: [
        { id: 'ai-004b-1', section: 'methodology', severity: 'required', comment: 'Describe the sampling frame and how the 150 households will be selected across the three settlements, given that many households are not in barangay registries.' },
        { id: 'ai-004b-2', section: 'budget', severity: 'required', comment: 'Provide a basis for the ₱72,000 enumerator honoraria and the boat rental line; both appear high relative to the number of field days.' },
        { id: 'ai-004b-3', section: 'timeline', severity: 'suggested', comment: 'Months 5–7 of fieldwork overlap with Ramadan; consider rescheduling FGDs or extending the survey window.' },
      ],
      recommendation: 'revise',
      submittedAt: '2026-09-30T06:05:00.000Z',
    },
    [8, 7, 6, 6, 5, 7]
  ),
  evaluation(
    {
      id: 'eval-004c',
      proposalId: 'dp-004',
      assignmentId: 'asg-004c',
      evaluatorId: 'ev-005',
      round: 1,
      remarks:
        'The mixed-methods design is sound, but objective 3 is not measurable as written and the policy output is not tied to a specific decision-maker. Addressing these will strengthen the proposal.',
      actionSheet: [
        { id: 'ai-004c-1', section: 'objectives', severity: 'required', comment: 'Rephrase objective 3 with measurable indicators, for example the proportion of households reporting each shock and coping strategy.' },
        { id: 'ai-004c-2', section: 'outputs', severity: 'suggested', comment: 'Name the CSWDO program the policy brief is intended to inform.' },
      ],
      recommendation: 'revise',
      submittedAt: '2026-10-02T07:40:00.000Z',
    },
    [8, 7, 7, 6, 6, 8]
  ),

  // dp-005 — round 1 (approve, revise, revise)
  evaluation(
    {
      id: 'eval-005a-r1',
      proposalId: 'dp-005',
      assignmentId: 'asg-005a',
      evaluatorId: 'ev-005',
      round: 1,
      remarks:
        'Important public health problem with a feasible community-based design. Partnership with the City Health Office improves sustainability. Ready for implementation.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-09-19T02:30:00.000Z',
    },
    [8, 8, 8, 8, 8, 9]
  ),
  evaluation(
    {
      id: 'eval-005b-r1',
      proposalId: 'dp-005',
      assignmentId: 'asg-005b',
      evaluatorId: 'ev-001',
      round: 1,
      remarks:
        'The intervention is promising, but measurement quality controls and the food procurement budget need more detail before the study can be endorsed.',
      actionSheet: [
        { id: 'ai-005b-1', section: 'methodology', severity: 'required', comment: 'Specify the measurement protocol: equipment, duplicate readings, and how inter-observer reliability among BNS will be checked.' },
        { id: 'ai-005b-2', section: 'budget', severity: 'required', comment: 'Break down the ₱180,000 feeding supplies line by item, quantity, and number of feeding days.' },
      ],
      recommendation: 'revise',
      submittedAt: '2026-09-21T05:10:00.000Z',
    },
    [8, 7, 6, 7, 7, 7]
  ),
  evaluation(
    {
      id: 'eval-005c-r1',
      proposalId: 'dp-005',
      assignmentId: 'asg-005c',
      evaluatorId: 'ev-004',
      round: 1,
      remarks:
        'Strong community engagement component. The objectives, however, do not reference the national nutrition targets the project claims to support.',
      actionSheet: [
        { id: 'ai-005c-1', section: 'objectives', severity: 'required', comment: 'Align the objectives with the Philippine Plan of Action for Nutrition targets and state the expected change in stunting prevalence.' },
      ],
      recommendation: 'revise',
      submittedAt: '2026-09-22T08:15:00.000Z',
    },
    [7, 7, 7, 6, 6, 7]
  ),

  // dp-005 — round 2 (approve ×3)
  evaluation(
    {
      id: 'eval-005a-r2',
      proposalId: 'dp-005',
      assignmentId: 'asg-005a',
      evaluatorId: 'ev-005',
      round: 2,
      remarks:
        'The revision addresses the panel’s comments thoroughly. The added measurement reliability protocol is a clear improvement.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-09-28T02:00:00.000Z',
    },
    [9, 9, 9, 9, 7, 9]
  ),
  evaluation(
    {
      id: 'eval-005b-r2',
      proposalId: 'dp-005',
      assignmentId: 'asg-005b',
      evaluatorId: 'ev-001',
      round: 2,
      remarks:
        'Measurement protocol and itemized feeding budget are now adequate. The local recipe guide is a useful, sustainable output.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-09-29T06:30:00.000Z',
    },
    [9, 8, 8, 9, 8, 9]
  ),
  evaluation(
    {
      id: 'eval-005c-r2',
      proposalId: 'dp-005',
      assignmentId: 'asg-005c',
      evaluatorId: 'ev-004',
      round: 2,
      remarks:
        'Objectives are now aligned with PPAN targets and have measurable indicators. Recommended for funding.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-09-30T06:50:00.000Z',
    },
    [9, 9, 9, 9, 9, 9]
  ),

  // dp-006 — round 1 (revise, revise, approve)
  evaluation(
    {
      id: 'eval-006a-r1',
      proposalId: 'dp-006',
      assignmentId: 'asg-006a',
      evaluatorId: 'ev-002',
      round: 1,
      remarks:
        'Technically ambitious and relevant to the region. The validation design risks optimistic accuracy figures, and the drone component is under-specified for a 12-month project.',
      actionSheet: [
        { id: 'ai-006a-1', section: 'methodology', severity: 'required', comment: 'Report the expected class balance and confirm that train/test splits are made by farm, not by image, to avoid leakage.' },
        { id: 'ai-006a-2', section: 'timeline', severity: 'suggested', comment: 'Either reduce the drone component to a feasibility test or extend the pilot phase; months 7–10 look crowded.' },
      ],
      recommendation: 'revise',
      submittedAt: '2026-09-27T04:15:00.000Z',
    },
    [7, 7, 6, 7, 8, 7]
  ),
  evaluation(
    {
      id: 'eval-006b-r1',
      proposalId: 'dp-006',
      assignmentId: 'asg-006b',
      evaluatorId: 'ev-001',
      round: 1,
      remarks:
        'Good agronomic grounding and strong partnership with PCA. The training targets and drone equipment costs need clarification.',
      actionSheet: [
        { id: 'ai-006b-1', section: 'outputs', severity: 'required', comment: 'Clarify how the 80 farmers will be selected and what competency they are expected to demonstrate after training.' },
        { id: 'ai-006b-2', section: 'budget', severity: 'suggested', comment: 'Consider renting rather than purchasing the drone, or justify ownership beyond the project period.' },
      ],
      recommendation: 'revise',
      submittedAt: '2026-09-28T07:45:00.000Z',
    },
    [8, 7, 7, 6, 7, 7]
  ),
  evaluation(
    {
      id: 'eval-006c-r1',
      proposalId: 'dp-006',
      assignmentId: 'asg-006c',
      evaluatorId: 'ev-003',
      round: 1,
      remarks:
        'Sound, well-organized proposal that builds sensibly on the team’s earlier work. Minor points only; recommended.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-09-29T09:10:00.000Z',
    },
    [8, 8, 8, 8, 8, 8]
  ),

  // dp-006 — round 2 (1 of 3 received)
  evaluation(
    {
      id: 'eval-006a-r2',
      proposalId: 'dp-006',
      assignmentId: 'asg-006a',
      evaluatorId: 'ev-002',
      round: 2,
      remarks:
        'The farm-level data split and the scaled-down drone feasibility test resolve my concerns. The methodology is now rigorous.',
      actionSheet: [],
      recommendation: 'approve',
      submittedAt: '2026-10-05T03:00:00.000Z',
    },
    [9, 8, 8, 8, 8, 8]
  ),
];

// ============================================================================
// Revisions
// ============================================================================

export const INITIAL_REVISIONS: ProposalRevision[] = [
  {
    id: 'rev-005-1',
    proposalId: 'dp-005',
    revisionNumber: 1,
    respondsToRound: 1,
    file: { name: 'DP-2027-CN-05_Revision_1.pdf', size: '4.0 MB', type: 'PDF', uploadedAt: '2026-09-26T04:30:00.000Z' },
    changeSummary:
      'Added a measurement quality-control protocol, itemized the feeding supplies budget, and aligned the objectives with PPAN 2023–2028 targets.',
    responses: [
      { actionItemId: 'ai-005b-1', response: 'Section 4.3 now specifies calibrated length boards and digital scales, duplicate readings by two trained BNS, and a monthly inter-observer reliability check (TEM).' },
      { actionItemId: 'ai-005b-2', response: 'Annex C breaks the ₱180,000 feeding line into fish, vegetables, rice, and fuel, costed for 120 children over 120 feeding days.' },
      { actionItemId: 'ai-005c-1', response: 'Objectives 2 and 4 now cite the PPAN stunting reduction target and state an expected 5-percentage-point reduction in the intervention barangays.' },
    ],
    uploadedAt: '2026-09-26T04:30:00.000Z',
    uploadedBy: PROPONENT,
  },
  {
    id: 'rev-006-1',
    proposalId: 'dp-006',
    revisionNumber: 1,
    respondsToRound: 1,
    file: { name: 'DP-2027-CSM-06_Revision_1.pdf', size: '3.9 MB', type: 'PDF', uploadedAt: '2026-10-03T05:25:00.000Z' },
    changeSummary:
      'Revised the validation design to split data by farm, reduced the drone work to a feasibility test, defined farmer selection and training competencies, and replaced the drone purchase with rental.',
    responses: [
      { actionItemId: 'ai-006a-1', response: 'Section 5.2 reports the expected class balance (about 1:3 infested to healthy) and confirms leave-farm-out splits for all evaluations.' },
      { actionItemId: 'ai-006a-2', response: 'The drone component is now a two-farm feasibility test in months 8–9; the mobile workflow remains the main deliverable.' },
      { actionItemId: 'ai-006b-1', response: 'Farmers will be nominated by PCA from barangays with past outbreaks; training ends with a field practical on capturing and submitting a valid alert.' },
      { actionItemId: 'ai-006b-2', response: 'The drone purchase has been replaced by a rental line; the ₱65,000 saved is reallocated to field validation travel within the same total.' },
    ],
    uploadedAt: '2026-10-03T05:25:00.000Z',
    uploadedBy: PROPONENT,
  },
];
