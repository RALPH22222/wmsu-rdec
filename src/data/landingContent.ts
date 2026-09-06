export interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface GuidelineItem {
  title: string;
  description: string;
}

export interface CriteriaItem {
  title: string;
  description: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  icon: string;
  items: FAQItem[];
}

export interface LandingContent {
  hero: {
    badge: string;
    title_prefix: string;
    title_highlight: string;
    description: string;
    images: string[];
  };
  stats: StatItem[];
  about: {
    badge: string;
    title: string;
    description: string;
    bullets: string[];
    image_url: string;
  };
  guidelines: {
    badge: string;
    title: string;
    description: string;
    pro_tip: string;
    items: GuidelineItem[];
  };
  criteria: {
    badge: string;
    title: string;
    description: string;
    items: CriteriaItem[];
  };
  templates: {
    research_url: string;
    project_url: string;
    lib_template_url: string;
    lib_sample_url: string;
  };
  process_steps: ProcessStep[];
  faq: {
    hero: {
      badge: string;
      titlePrefix: string;
      titleHighlight: string;
      description: string;
    };
    categories: FAQCategory[];
    support: {
      title: string;
      description: string;
      email: string;
      phone: string;
    };
  };
}

export const landingContent: LandingContent = {
  hero: {
    badge: "Western Mindanao State University",
    title_prefix: "WMSU",
    title_highlight: "Project Proposal",
    description: "A streamlined admin and monitoring system for project proposals — fast, responsive, and intuitive. Experience seamless navigation and effortless proposal management with our user-centric design.",
    images: [
      "/wmsu1_live.jpg",
      "/wmsu2_live.jpg",
      "/wmsu3_live.jpg"
    ]
  },
  stats: [
    { value: 200, suffix: "+", label: "Research Proposals" },
    { value: 84, suffix: "%", label: "Funding Success Rate" },
    { value: 300, suffix: "+", label: "Total Proponents" }
  ],
  about: {
    badge: "About Our Office",
    title: "Research Development & Evaluation Center",
    description: "The central hub RDEC for research excellence at Western Mindanao State University. We facilitate innovative research projects, provide administrative support, and ensure compliance with academic standards and funding requirements.",
    bullets: [
      "Proposal Guidance",
      "Funding Support",
      "Compliance Monitoring",
      "Research Ethics"
    ],
    image_url: "/rdec_live.jpg"
  },
  guidelines: {
    badge: "Essentials",
    title: "Submission Guidelines & Requirements",
    description: "Your roadmap to a successful proposal submission. Follow these core requirements to ensure a smooth approval process.",
    pro_tip: "Gather your CVs, consent forms, and research instruments before you start to avoid timeouts or errors.",
    items: [
      {
        title: "Complete Documentation",
        description: "Incomplete attachments lead to automatic rejection. Ensure every required file is uploaded before you hit submit."
      },
      {
        title: "7-Day Revision Window",
        description: "Feedback received? You have exactly 7 working days to resubmit your revised proposal. Plan your timeline carefully."
      },
      {
        title: "Stay Updated",
        description: "We notify via portal & email. Check your spam folder regularly so you don't miss critical updates about your proposal."
      },
      {
        title: "Official Channels Only",
        description: "All communication happens inside the portal. Avoid direct emails for procedural steps. Keep it official and documented."
      }
    ]
  },
  criteria: {
    badge: "Our Standards",
    title: "Evaluation Criteria",
    description: "Learn how proposals are judged to ensure your project meets the highest standards for approval and funding.",
    items: [
      {
        title: "Relevance to Institutional Goals",
        description: "Proposals must align with WMSU's strategic objectives, addressing key priorities in education, research, and community development that support the university's mission and vision."
      },
      {
        title: "Originality and Innovation",
        description: "Projects should demonstrate creative thinking, novel approaches, and innovative solutions that contribute new knowledge or improve existing practices in their respective fields."
      },
      {
        title: "Methodological Soundness",
        description: "Research designs and implementation plans must be scientifically rigorous, appropriate for the objectives, and demonstrate clear, logical methodology for data collection and analysis."
      },
      {
        title: "Feasibility",
        description: "Projects must be realistically achievable within proposed timelines, budgets, and available resources, with clear implementation plans and capable project teams."
      },
      {
        title: "Ethical Compliance",
        description: "All research must adhere to WMSU's ethical standards, ensuring participant safety, data privacy, intellectual property rights, and responsible conduct of research."
      },
      {
        title: "Budget Justification",
        description: "Budget allocations must be reasonable, well-documented, and directly support project objectives, with clear justification for all expenses and cost-effective resource utilization."
      }
    ]
  },
  templates: {
    research_url: "/DOST_Form_No.1b.docx",
    project_url: "",
    lib_template_url: "",
    lib_sample_url: ""
  },
  process_steps: [
    {
      title: "Download & Submit Documentation",
      description: "Ensure you have your DOST project proposal template ready and all required fields are properly filled out. Proceed to the Submission page to submit your proposal. Double-check all information before submitting, as it cannot be edited unless the R&D requests a revision."
    },
    {
      title: "Admin Checking & Assignment",
      description: "The proposal you submit first goes to the Admin, where it will be checked for initial review. The Admin will then assign it to the appropriate R&D staff for evaluation, though the Admin also maintains the option to directly review and evaluate the proposal themselves."
    },
    {
      title: "R&D Technical Evaluation",
      description: "Once your proposal is forwarded by the Admin, the Research and Development (R&D) division will review your submitted information and attached documents. They will then evaluate your proposal and may request a revision, reject the submission, or pass it to the evaluators for further review."
    },
    {
      title: "Evaluators' Assessment Panel",
      description: "Once passed by the R&D division, the proposal is forwarded to the evaluators for assessment. Evaluators review the proposal and assign scores based on key aspects such as the title, timeline, and budget to determine feasibility."
    },
    {
      title: "Consolidated Review & Endorsement",
      description: "After receiving all evaluators' scores and feedback, the R&D division reviews and consolidates the results. Based on this evaluation, the R&D may request revisions, reject the submission, or endorse it for funding."
    },
    {
      title: "RDEC Funding Deliberation",
      description: "This step will be reviewed by the Research and Development (R&D) Committee. The committee will meet and discuss the proposal, and based on their evaluation, they will decide whether to approve the project for funding or not."
    },
    {
      title: "Implementation & Progress Monitoring",
      description: "After your project has been funded, you may request the budget for the start of the quarter and for the following quarters. You are required to report your progress percentage, submit reports, and provide the necessary documents until the project is successfully completed."
    }
  ],
  faq: {
    hero: {
      badge: "Support Center",
      titlePrefix: "Frequently Asked",
      titleHighlight: "Questions",
      description: "Find quick answers to questions about proposals, submission, funding, and technical help."
    },
    categories: [
      {
        id: "general",
        name: "General Questions",
        icon: "general",
        items: [
          {
            id: "q_gen_1",
            question: "What are the proposal submission deadlines?",
            answer: "Proposal deadlines vary by funding source. Regular internal reviews occur monthly on the last Friday of each month, while external funding opportunities have specific timelines announced on our portal."
          },
          {
            id: "q_gen_2",
            question: "How long does the proposal review process take?",
            answer: "Standard review takes 2-3 weeks. Complex proposals or those requiring ethics clearance may take 4-6 weeks."
          },
          {
            id: "q_gen_3",
            question: "Who can submit research proposals?",
            answer: "All WMSU faculty members, graduate students, and research staff are eligible to submit proposals."
          }
        ]
      },
      {
        id: "submission",
        name: "Submission Process",
        icon: "submission",
        items: [
          {
            id: "q_sub_1",
            question: "What documents are required for proposal submission?",
            answer: "Required documents include: completed DOST Form 1B, project timeline, budget breakdown, and endorsement from department head."
          },
          {
            id: "q_sub_2",
            question: "Can I submit proposals electronically?",
            answer: "Yes! All proposals must be submitted through our online portal. The system accepts PDF documents and provides confirmation."
          }
        ]
      },
      {
        id: "funding",
        name: "Funding & Budget",
        icon: "funding",
        items: [
          {
            id: "q_fund_1",
            question: "What funding sources are available through WMSU?",
            answer: "We support funding avenues including internal WMSU grants, DOST, CHED, and international collaborations."
          },
          {
            id: "q_fund_2",
            question: "Can I get help with budget preparation?",
            answer: "Yes! Our research support team provides budget consultation to align with funding requirements."
          }
        ]
      },
      {
        id: "technical",
        name: "Technical Support",
        icon: "technical",
        items: [
          {
            id: "q_tech_1",
            question: "What if I encounter technical issues with the portal?",
            answer: "For technical support, email research.support@wmsu.edu.ph or call +63 (62) 991-4569."
          }
        ]
      }
    ],
    support: {
      title: "Still have questions?",
      description: "Please reach out to our support team for further help.",
      email: "research@wmsu.edu.ph",
      phone: "+63 (62) 991-4569"
    }
  }
};
