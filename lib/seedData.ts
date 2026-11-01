import {
  NDISSupportItem,
  UserProfile,
  Client,
  Practitioner,
  RestrictivePractice,
  Incident,
  CaseNote,
  Lead,
  ABCLog,
  BillingClaim,
  BSPDocument,
  AppNotification,
  CRMTask,
  AuditLog
} from '@/types';

export const OFFICIAL_2026_NDIS_PRICE_GUIDE: NDISSupportItem[] = [
  {
    code: '07_002_0115_8_3',
    name: 'Specialist Behavioural Intervention Support',
    category: 'Capacity Building - Relationships',
    pricePerUnit: 214.41,
    unitOfMeasure: 'Hour',
  },
  {
    code: '07_004_0115_8_3',
    name: 'Individual Behaviour Support Plan Development & Training',
    category: 'Capacity Building - Relationships',
    pricePerUnit: 214.41,
    unitOfMeasure: 'Hour',
  },
  {
    code: '15_056_0128_1_3',
    name: 'Assessment Recommendation Therapy Support - Allied Health',
    category: 'Capacity Building - Improved Daily Living',
    pricePerUnit: 193.99,
    unitOfMeasure: 'Hour',
  },
  {
    code: '15_043_0128_1_3',
    name: 'Dietitian Consultation & Meal Planning Supports',
    category: 'Capacity Building - Improved Daily Living',
    pricePerUnit: 193.99,
    unitOfMeasure: 'Hour',
  },
  {
    code: '15_054_0128_1_3',
    name: 'Speech Pathology Assessment & Augmentative Communication',
    category: 'Capacity Building - Improved Daily Living',
    pricePerUnit: 193.99,
    unitOfMeasure: 'Hour',
  },
  {
    code: '15_055_0128_1_3',
    name: 'Occupational Therapy Sensory Profiling & Environmental Audit',
    category: 'Capacity Building - Improved Daily Living',
    pricePerUnit: 193.99,
    unitOfMeasure: 'Hour',
  },
  {
    code: '15_799_0128_1_3',
    name: 'Provider Travel - Capacity Building Allied Health',
    category: 'Capacity Building - Improved Daily Living',
    pricePerUnit: 193.99,
    unitOfMeasure: 'Hour',
  },
  {
    code: '07_001_0106_8_3',
    name: 'Support Coordination - Level 2: Coordination of Supports',
    category: 'Capacity Building - Support Coordination',
    pricePerUnit: 100.14,
    unitOfMeasure: 'Hour',
  },
  {
    code: '07_002_0132_8_3',
    name: 'Specialist Support Coordination - Level 3: High Complex Needs',
    category: 'Capacity Building - Support Coordination',
    pricePerUnit: 190.54,
    unitOfMeasure: 'Hour',
  },
  {
    code: '01_011_0107_1_1',
    name: 'Assistance With Self-Care Activities - Standard Weekday Daytime',
    category: 'Core - Assistance with Daily Life',
    pricePerUnit: 67.56,
    unitOfMeasure: 'Hour',
  },
  {
    code: '01_015_0107_1_1',
    name: 'Assistance With Self-Care Activities - Weekday Evening',
    category: 'Core - Assistance with Daily Life',
    pricePerUnit: 74.44,
    unitOfMeasure: 'Hour',
  },
  {
    code: '01_013_0107_1_1',
    name: 'Assistance With Self-Care Activities - Saturday Support',
    category: 'Core - Assistance with Daily Life',
    pricePerUnit: 95.07,
    unitOfMeasure: 'Hour',
  },
  {
    code: '01_014_0107_1_1',
    name: 'Assistance With Self-Care Activities - Sunday Support',
    category: 'Core - Assistance with Daily Life',
    pricePerUnit: 122.59,
    unitOfMeasure: 'Hour',
  },
  {
    code: '04_104_0125_6_1',
    name: 'Access Community, Social and Rec Activities - Standard Weekday',
    category: 'Core - Social & Community Participation',
    pricePerUnit: 67.56,
    unitOfMeasure: 'Hour',
  },
  {
    code: '05_220600111_0105_1_2',
    name: 'Low Cost Assistive Technology for Sensory & Communication Support',
    category: 'Capital - Assistive Technology',
    pricePerUnit: 495.00,
    unitOfMeasure: 'Each',
  },
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-director',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@breakthrough.org.au',
    role: 'ADMIN',
    position: 'Clinical Director & Principal PBS Specialist',
    practitionerId: 'prac-201',
    workerScreeningStatus: 'Active',
    workerScreeningExpiry: '2028-09-30',
    policeCheckExpiry: '2027-11-15',
    ndisOrientationDone: true,
    activeCaseload: 14,
  },
  {
    id: 'user-specialist',
    name: 'Marcus Vance',
    email: 'marcus.vance@breakthrough.org.au',
    role: 'PRACTITIONER',
    position: 'Senior Behaviour Support Practitioner',
    practitionerId: 'prac-202',
    workerScreeningStatus: 'Active',
    workerScreeningExpiry: '2027-05-12',
    policeCheckExpiry: '2026-10-20',
    ndisOrientationDone: true,
    activeCaseload: 18,
  },
  {
    id: 'user-auditor',
    name: 'Elena Rostova',
    email: 'elena.rostova@breakthrough.org.au',
    role: 'VIEWER',
    position: 'Compliance & Quality Safeguards Officer',
    practitionerId: 'prac-203',
    workerScreeningStatus: 'Active',
    workerScreeningExpiry: '2028-01-14',
    policeCheckExpiry: '2027-06-30',
    ndisOrientationDone: true,
    activeCaseload: 0,
  },
  {
    id: 'user-coordinator',
    name: 'Sarah Davies',
    email: 'sarah.davies@breakthrough.org.au',
    role: 'SUPPORT_COORDINATOR',
    position: 'Lead Support Coordinator & Intake Specialist',
    practitionerId: 'prac-204',
    workerScreeningStatus: 'Active',
    workerScreeningExpiry: '2027-11-20',
    policeCheckExpiry: '2026-12-15',
    ndisOrientationDone: true,
    activeCaseload: 22,
  },
];

export const STANDARD_DRIVE_SUBFOLDERS = [
  'Goals Statement',
  'Emergency and Disaster Plan',
  'BSP',
  'Invoices',
  'FBA',
  'NDIS Plan',
  'Letters/ Correspondence',
  'Consent Form',
  'Assessments/ Reports',
  'Referral Form',
  'Progress Notes',
  'Service Agreement'
];

// Pure production initial state: starts empty until user ingests Drive folders, creates records, or clicks Load Sample Dataset
export const COMPANY_DRIVE_PARTICIPANTS: Client[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_PRACTITIONERS: Practitioner[] = [];
export const INITIAL_RESTRICTIVE_PRACTICES: RestrictivePractice[] = [];
export const INITIAL_INCIDENTS: Incident[] = [];
export const INITIAL_CASE_NOTES: CaseNote[] = [];
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_ABC_LOGS: ABCLog[] = [];
export const INITIAL_CLAIMS: BillingClaim[] = [];
export const INITIAL_BSP: BSPDocument = {
  id: 'bsp-template',
  clientId: '',
  clientName: '',
  version: '1.0',
  status: 'Draft',
  summary: '',
  primaryBehaviorsOfConcern: [],
  proactiveStrategies: [],
  reactiveStrategies: [],
  restrictivePractices: [],
  reviewDate: '',
  authorName: '',
  lastUpdated: new Date().toISOString()
};
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
export const INITIAL_CRM_TASKS: CRMTask[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// ============================================================================
// OPTIONAL SAMPLE NDIS PRACTICE DATASET (Loaded on-demand via One-Click Loader)
// ============================================================================

export const SAMPLE_CLIENTS: Client[] = [
  {
    id: 'cli-sample-01',
    name: 'Liam O’Connor',
    preferredName: 'Liam',
    ndisNumber: '430982103',
    dateOfBirth: '2011-04-18',
    gender: 'Male',
    phone: '0412 889 123',
    contactNumber: '0412 889 123',
    email: 'fiona.oconnor@example.com.au',
    address: '14 Elmwood Terrace, Hawthorn VIC 3122',
    suburb: 'Hawthorn',
    status: 'Active',
    primaryDisability: 'Autism Spectrum Disorder (Level 2)',
    secondaryDisabilities: ['ADHD Combined Type', 'Sensory Processing Disorder'],
    planStartDate: '2026-01-15',
    planEndDate: '2027-01-14',
    planManagementType: 'Plan-Managed',
    planManager: {
      agency: 'MyIntegra Plan Management',
      contactName: 'Accounts Team',
      email: 'claims@myintegra.com.au',
      phone: '1800 696 347'
    },
    supportCoordinator: {
      name: 'Hannah Sterling',
      agency: 'Melbourne Specialist Coordination',
      email: 'hannah@melbsc.org.au',
      phone: '0431 220 918'
    },
    budgetBreakdown: {
      core: 32000,
      capacityBuildingTherapy: 18500,
      capacityBuildingPBS: 14200,
      supportCoordination: 4500,
      capital: 1800
    },
    totalBudget: 71000,
    allocatedBudget: 64500,
    spentBudget: 24850,
    primaryPractitionerId: 'prac-201',
    primaryPractitionerName: 'Dr. Sarah Jenkins',
    riskLevel: 'Medium',
    emergencyContact: {
      name: 'Fiona O’Connor',
      relationship: 'Mother & Plan Nominee',
      phone: '0412 889 123'
    },
    highIntensityNeeds: ['Sensory Overload De-escalation', 'Community Transition Support'],
    communicationMethod: 'Verbal + Proloquo2Go AAC backup',
    mobilityNeeds: 'Independent',
    triggers: ['Unannounced schedule changes', 'High-decibel fluorescent environments', 'Multi-step verbal demands'],
    restrictivePracticesActive: true,
    bspExpiryDate: '2026-12-31',
    bspStatus: 'Commission Approved',
    driveFolderPath: 'Staff Share Drive > Participants > Behaviour Support > Liam O’Connor',
    isCompanyDriveParticipant: true,
    goals: [
      {
        id: 'goal-liam-1',
        title: 'Independent Emotional & Sensory Regulation',
        description: 'Utilize sensory break cards and AAC expression to reduce transition distress episodes by 60%.',
        category: 'Capacity Building',
        targetDate: '2026-12-15',
        progressPercent: 75,
        status: 'In Progress',
        gasScore: 1
      },
      {
        id: 'goal-liam-2',
        title: 'Community Access & Public Transport Confidence',
        description: 'Complete weekly accompanied tram transit to Hawthorn Community Centre with visual schedule.',
        category: 'Social & Community',
        targetDate: '2026-11-30',
        progressPercent: 60,
        status: 'In Progress',
        gasScore: 0
      }
    ],
    documents: [
      {
        id: 'doc-liam-bsp',
        name: 'Liam_OConnor_Comprehensive_BSP_2026.pdf',
        category: 'BSP Document',
        dateUploaded: '2026-02-10',
        fileType: 'application/pdf',
        fileSize: '1.4 MB',
        url: 'https://drive.google.com/file/d/sample-liam-bsp/view'
      },
      {
        id: 'doc-liam-fba',
        name: 'Functional_Behaviour_Assessment_Liam_OConnor.pdf',
        category: 'Clinical Report',
        dateUploaded: '2026-01-28',
        fileType: 'application/pdf',
        fileSize: '940 KB',
        url: 'https://drive.google.com/file/d/sample-liam-fba/view'
      }
    ],
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-10-20T14:30:00Z'
  },
  {
    id: 'cli-sample-02',
    name: 'Chloe Tahan',
    preferredName: 'Chloe',
    ndisNumber: '431205884',
    dateOfBirth: '1999-08-24',
    gender: 'Female',
    phone: '0423 551 790',
    contactNumber: '0423 551 790',
    email: 'chloe.tahan@example.com.au',
    address: '88 Victoria Street, Richmond VIC 3121',
    suburb: 'Richmond',
    status: 'Active',
    primaryDisability: 'Acquired Brain Injury (ABI)',
    secondaryDisabilities: ['Executive Functioning Impairment'],
    planStartDate: '2026-03-01',
    planEndDate: '2027-02-28',
    planManagementType: 'Agency-Managed (NDIA)',
    supportCoordinator: {
      name: 'Sarah Davies',
      agency: 'Breakthrough Coordination',
      email: 'sarah.davies@breakthrough.org.au',
      phone: '0408 712 300'
    },
    budgetBreakdown: {
      core: 54000,
      capacityBuildingTherapy: 26000,
      capacityBuildingPBS: 9500,
      supportCoordination: 6200,
      capital: 3500
    },
    totalBudget: 99200,
    allocatedBudget: 88000,
    spentBudget: 36400,
    primaryPractitionerId: 'prac-202',
    primaryPractitionerName: 'Marcus Vance',
    riskLevel: 'Low',
    emergencyContact: {
      name: 'Samir Tahan',
      relationship: 'Father',
      phone: '0419 302 441'
    },
    highIntensityNeeds: ['Cognitive Fatigue Pacing'],
    communicationMethod: 'Verbal + Digital Memory Prompts',
    mobilityNeeds: 'Light mobility cane for uneven outdoor terrain',
    triggers: ['Cognitive fatigue after 45m tasks', 'Competing background conversations'],
    restrictivePracticesActive: false,
    driveFolderPath: 'Staff Share Drive > Participants > Allied Health > Chloe Tahan',
    isCompanyDriveParticipant: true,
    goals: [
      {
        id: 'goal-chloe-1',
        title: 'Independent Meal Preparation & Kitchen Safety',
        description: 'Follow structured occupational therapy induction checklists for safe induction cooking.',
        category: 'Capacity Building',
        targetDate: '2026-12-01',
        progressPercent: 85,
        status: 'In Progress',
        gasScore: 2
      },
      {
        id: 'goal-chloe-2',
        title: 'Part-Time Supported Admin Employment Readiness',
        description: 'Build sustained cognitive stamina for 3-hour morning work blocks.',
        category: 'Capacity Building',
        targetDate: '2027-02-01',
        progressPercent: 50,
        status: 'In Progress',
        gasScore: 0
      }
    ],
    documents: [
      {
        id: 'doc-chloe-ot',
        name: 'OT_Functional_Capacity_Evaluation_Chloe_Tahan.pdf',
        category: 'Clinical Report',
        dateUploaded: '2026-03-14',
        fileType: 'application/pdf',
        fileSize: '2.1 MB',
        url: 'https://drive.google.com/file/d/sample-chloe-ot/view'
      }
    ],
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-10-22T11:15:00Z'
  },
  {
    id: 'cli-sample-03',
    name: 'Noah Nguyen',
    preferredName: 'Noah',
    ndisNumber: '430774912',
    dateOfBirth: '2006-11-05',
    gender: 'Male',
    phone: '0438 901 654',
    contactNumber: '0438 901 654',
    email: 'linh.nguyen@example.com.au',
    address: '42 High Street, Preston VIC 3072',
    suburb: 'Preston',
    status: 'Active',
    primaryDisability: 'Intellectual Disability & Autism Level 3',
    secondaryDisabilities: ['Complex Communication Needs'],
    planStartDate: '2026-02-01',
    planEndDate: '2027-01-31',
    planManagementType: 'Plan-Managed',
    planManager: {
      agency: 'Nib Thrive Plan Management',
      contactName: 'Claims Processing',
      email: 'invoices@nibthrive.com.au',
      phone: '1800 999 333'
    },
    budgetBreakdown: {
      core: 82000,
      capacityBuildingTherapy: 22000,
      capacityBuildingPBS: 21500,
      supportCoordination: 8400,
      capital: 4200
    },
    totalBudget: 138100,
    allocatedBudget: 125000,
    spentBudget: 58900,
    primaryPractitionerId: 'prac-201',
    primaryPractitionerName: 'Dr. Sarah Jenkins',
    riskLevel: 'High',
    emergencyContact: {
      name: 'Linh Nguyen',
      relationship: 'Mother',
      phone: '0438 901 654'
    },
    highIntensityNeeds: ['Positive Behaviour Support - Complex', 'Environmental Safety Supervision'],
    communicationMethod: 'Key Word Sign + LAMP Words for Life iPad',
    mobilityNeeds: 'Independent',
    triggers: ['Delayed meal routines', 'Unfamiliar relief support workers', 'Sudden tactile contact'],
    restrictivePracticesActive: true,
    bspExpiryDate: '2026-11-30',
    bspStatus: 'Commission Approved',
    driveFolderPath: 'Staff Share Drive > Participants > Behaviour Support > Noah Nguyen',
    isCompanyDriveParticipant: true,
    goals: [
      {
        id: 'goal-noah-1',
        title: 'Functional Communication Replacement via LAMP AAC',
        description: 'Independently request preferred breaks and food items using LAMP iPad across home and SIL settings.',
        category: 'Capacity Building',
        targetDate: '2026-11-30',
        progressPercent: 65,
        status: 'In Progress',
        gasScore: 1
      }
    ],
    documents: [],
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-10-24T16:00:00Z'
  }
];

export const SAMPLE_CASE_NOTES: CaseNote[] = [
  {
    id: 'cn-sample-101',
    clientId: 'cli-sample-01',
    clientName: 'Liam O’Connor',
    practitionerId: 'prac-201',
    practitionerName: 'Dr. Sarah Jenkins',
    date: '2026-10-24',
    format: 'SOAP',
    category: 'Positive Behaviour Support Session',
    sessionDurationMinutes: 60,
    nonFaceToFaceMinutes: 30,
    supportItemCode: '07_002_0115_8_3',
    subjective: 'Liam’s mother Fiona reported a significantly calmer morning school transition this week after introducing the laminated 4-step visual morning board.',
    objective: 'Observed Liam across a 60-minute home visit in Hawthorn. When presented with a task switch from iPad to tabletop activity, Liam independently tapped his "5 Minute Warning" timer card and transitioned with zero vocal protest.',
    assessment: 'Strong positive trajectory toward Goal 1 (Emotional & Sensory Regulation). Replacement behaviour (tapping timer card) is competing effectively with escape-maintained distress.',
    plan: '1. Model visual schedule usage with afternoon support worker.\n2. Fade verbal prompts to gestural prompts over next 14 days.\n3. Update ABC log dashboard prior to November team review.',
    linkedGoalIds: ['goal-liam-1'],
    status: 'Approved',
    flaggedForReview: false,
    isLocked: true,
    createdAt: '2026-10-24T10:30:00Z',
    updatedAt: '2026-10-24T10:30:00Z',
    linkedDriveFiles: [
      {
        id: 'doc-liam-bsp',
        driveFileId: 'sample-liam-bsp',
        name: 'Liam_OConnor_Comprehensive_BSP_2026.pdf',
        mimeType: 'application/pdf',
        url: 'https://drive.google.com/file/d/sample-liam-bsp/view',
        category: 'BSP Document',
        uploadedAt: '2026-10-24T10:30:00Z'
      }
    ]
  },
  {
    id: 'cn-sample-102',
    clientId: 'cli-sample-02',
    clientName: 'Chloe Tahan',
    practitionerId: 'prac-202',
    practitionerName: 'Marcus Vance',
    date: '2026-10-23',
    format: 'BIRP',
    category: 'Allied Health Therapy Session',
    sessionDurationMinutes: 60,
    nonFaceToFaceMinutes: 15,
    supportItemCode: '15_056_0128_1_3',
    subjective: 'Behaviour: Chloe engaged in a 60-minute executive function and energy-conservation coaching session at her Richmond apartment.',
    objective: 'Intervention: Implemented the 35-minute cognitive pacing protocol with scheduled 10-minute low-sensory rest intervals and colour-coded kitchen safety cues.',
    assessment: 'Response: Chloe completed a full 3-step meal preparation sequence without experiencing secondary cognitive headache or overwhelm.',
    plan: 'Plan: Continue weekly occupational coaching; review workplace readiness accommodations with Support Coordinator next Tuesday.',
    linkedGoalIds: ['goal-chloe-1'],
    status: 'Approved',
    flaggedForReview: false,
    isLocked: true,
    createdAt: '2026-10-23T14:00:00Z',
    updatedAt: '2026-10-23T14:00:00Z',
    linkedDriveFiles: []
  },
  {
    id: 'cn-sample-103',
    clientId: 'cli-sample-03',
    clientName: 'Noah Nguyen',
    practitionerId: 'prac-201',
    practitionerName: 'Dr. Sarah Jenkins',
    date: '2026-10-21',
    format: 'SIMPL',
    category: 'PBS Stakeholder Training',
    sessionDurationMinutes: 90,
    nonFaceToFaceMinutes: 30,
    supportItemCode: '07_004_0115_8_3',
    subjective: 'Situation: Conducted in-home Positive Behaviour Support training with two new afternoon support workers and mother Linh in Preston.',
    objective: 'Intervention: Demonstrated proactive sensory diet scheduling, LAMP AAC break request prompting, and low-arousal non-verbal de-escalation positioning.',
    assessment: 'Monitoring: Both support workers achieved 100% competency on the BSP fidelity checklist and demonstrated accurate ABC episode recording.',
    plan: 'Plan: Conduct 2-week follow-up observation and review environmental restraint fade milestones.',
    linkedGoalIds: ['goal-noah-1'],
    status: 'Approved',
    flaggedForReview: false,
    isLocked: true,
    createdAt: '2026-10-21T16:00:00Z',
    updatedAt: '2026-10-21T16:00:00Z',
    linkedDriveFiles: []
  }
];

export const SAMPLE_ABC_LOGS: ABCLog[] = [
  {
    id: 'abc-sample-01',
    clientId: 'cli-sample-01',
    clientName: 'Liam O’Connor',
    timestamp: '2026-10-22T15:45:00Z',
    timeOfDay: '15:45',
    dayOfWeek: 'Thursday',
    location: 'Home - Living Room',
    antecedent: 'Unplanned cancellation of afternoon park visit due to heavy thunderstorm.',
    behavior: 'Pacing rapidly near front door, elevated vocalizations, striking couch cushions for 8 minutes.',
    consequence: 'Presented visual rain contingency card + offered weighted lap pad and sensory corner choice; baseline calm restored within 6 minutes.',
    intensity: 3,
    durationMinutes: 8,
    perceivedFunction: 'Escape/Avoidance',
    recordedBy: 'Dr. Sarah Jenkins'
  },
  {
    id: 'abc-sample-02',
    clientId: 'cli-sample-03',
    clientName: 'Noah Nguyen',
    timestamp: '2026-10-20T17:15:00Z',
    timeOfDay: '17:15',
    dayOfWeek: 'Tuesday',
    location: 'Kitchen / Dining Area',
    antecedent: 'Evening meal preparation took 15 minutes longer than standard 5:00 PM schedule.',
    behavior: 'Banging kitchen counter and vocal distress prior to prompting LAMP iPad.',
    consequence: 'Support worker modeled "Wait + Snack" icon on LAMP AAC and provided immediate cracker appetizer.',
    intensity: 4,
    durationMinutes: 12,
    perceivedFunction: 'Tangible/Access',
    recordedBy: 'Marcus Vance'
  },
  {
    id: 'abc-sample-03',
    clientId: 'cli-sample-01',
    clientName: 'Liam O’Connor',
    timestamp: '2026-10-18T11:10:00Z',
    timeOfDay: '11:10',
    dayOfWeek: 'Sunday',
    location: 'Community - Local Supermarket',
    antecedent: 'High ambient noise and PA announcement in checkout aisle.',
    behavior: 'Hands over ears, crouching on floor, attempting to exit store immediately.',
    consequence: 'Applied noise-cancelling headphones and exited to quiet outdoor bench; Liam used AAC to request water.',
    intensity: 3,
    durationMinutes: 6,
    perceivedFunction: 'Sensory/Automatic',
    recordedBy: 'Fiona O’Connor (Nominee)'
  }
];

export const SAMPLE_BSP_DOCUMENTS: BSPDocument[] = [
  {
    id: 'bsp-sample-liam',
    clientId: 'cli-sample-01',
    clientName: 'Liam O’Connor',
    version: '2.4 (2026 Comprehensive)',
    status: 'Active',
    summary: 'Evidence-based Positive Behaviour Support Plan focusing on predictable visual schedules, sensory regulation breaks, and functional AAC communication.',
    primaryBehaviorsOfConcern: [
      'Transition-related vocal distress and property striking when routines change unexpectedly',
      'Sensory withdrawal or bolting in high-decibel community environments'
    ],
    proactiveStrategies: [
      '1. High predictability: Review visual schedule board each morning and 10 minutes before any community transition.',
      '2. Sensory diet: Provide noise-cancelling headphones prior to entering retail or transit hubs.',
      '3. Functional communication: Keep Proloquo2Go AAC and physical "Break" card within arm’s reach at all times.'
    ],
    reactiveStrategies: [
      '1. Immediately reduce verbal language to calm, single-word or visual gesture prompts.',
      '2. Create 2 metres of physical space and guide participant toward low-stimulation sensory zone.',
      '3. Offer validated calming tools (weighted lap pad, deep pressure squeeze ball) and wait for baseline respiration.'
    ],
    restrictivePractices: [],
    reviewDate: '2026-12-31',
    authorName: 'Dr. Sarah Jenkins, BCBA',
    lastUpdated: '2026-10-24T10:00:00Z'
  },
  {
    id: 'bsp-sample-noah',
    clientId: 'cli-sample-03',
    clientName: 'Noah Nguyen',
    version: '3.1 (2026 Comprehensive)',
    status: 'Active',
    summary: 'High-support Positive Behaviour Support Plan centered on LAMP Words for Life AAC communication and structured meal/transition routines.',
    primaryBehaviorsOfConcern: [
      'Counter-striking and self-injurious hand biting when access to preferred food or items is delayed',
      'Heightened distress during unfamiliar support worker handovers'
    ],
    proactiveStrategies: [
      '1. Mealtime predictability: Use visual countdown timer 15 minutes before scheduled meals and offer starter snack.',
      '2. Staff handover warm-up: New support workers must shadow 2 shifts and review video modelling profile first.',
      '3. Prompt LAMP AAC "Food / Break / Help" icons every 30 minutes during structured activities.'
    ],
    reactiveStrategies: [
      '1. Remove fragile items from immediate reach and adopt non-threatening side-by-side posture.',
      '2. Present visual "First / Then" board without verbal lecturing.',
      '3. Apply authorised environmental kitchen access protocol only during active boiling-water hazard.'
    ],
    restrictivePractices: [],
    reviewDate: '2026-11-30',
    authorName: 'Dr. Sarah Jenkins, BCBA',
    lastUpdated: '2026-10-21T15:00:00Z'
  }
];

export const SAMPLE_RESTRICTIVE_PRACTICES: RestrictivePractice[] = [
  {
    id: 'rp-sample-01',
    clientId: 'cli-sample-01',
    clientName: 'Liam O’Connor',
    type: 'Environmental',
    description: 'Temporary keypad lock on front street-facing courtyard gate during high-arousal storms to prevent bolting onto arterial road.',
    authorizedBy: 'Victorian Senior Practitioner / NDIS Quality & Safeguards Commission',
    authorizationDate: '2026-01-20',
    expiryDate: '2026-12-31',
    status: 'Authorised',
    monthlyReportStatus: 'Due',
    reductionStrategy: 'Systematic road-safety pedestrian training + AAC "Outside Walk" request card; gate unlocked during all supervised daylight hours (70% fade achieved).',
    bspSignOff: {
      signed: true,
      signedBy: 'Dr. Sarah Jenkins, BCBA',
      signedAt: '2026-01-18T11:00:00Z',
      credential: 'PRAC-PBS-ADV-2026'
    },
    apoSignOff: {
      signed: true,
      signedBy: 'David Henderson (Senior APO)',
      signedAt: '2026-01-20T14:20:00Z',
      apoRegistrationNumber: 'APO-VIC-09412'
    }
  },
  {
    id: 'rp-sample-02',
    clientId: 'cli-sample-03',
    clientName: 'Noah Nguyen',
    type: 'Environmental',
    description: 'Induction cooktop isolation switch engaged when kitchen is unstaffed to prevent accidental burn injury.',
    authorizedBy: 'Victorian Senior Practitioner / NDIS Quality & Safeguards Commission',
    authorizationDate: '2026-02-15',
    expiryDate: '2026-11-30',
    status: 'Pending APO Sign-off',
    monthlyReportStatus: 'Due',
    reductionStrategy: 'Daily supervised OT kitchen safety skills program with visual hot-surface indicators.',
    bspSignOff: {
      signed: true,
      signedBy: 'Dr. Sarah Jenkins, BCBA',
      signedAt: '2026-02-14T09:30:00Z',
      credential: 'PRAC-PBS-ADV-2026'
    },
    apoSignOff: {
      signed: false
    }
  }
];

export const SAMPLE_CLAIMS: BillingClaim[] = [
  {
    id: 'clm-sample-01',
    invoiceNumber: 'INV-261001',
    clientId: 'cli-sample-01',
    clientName: 'Liam O’Connor',
    ndisNumber: '430982103',
    supportItemCode: '07_002_0115_8_3',
    supportItemName: 'Specialist Behavioural Intervention Support',
    ndisSupportItem: '07_002_0115_8_3 - Specialist Behavioural Intervention Support',
    serviceDate: '2026-10-24',
    hours: 1.5,
    unitRate: 214.41,
    totalAmount: 321.62,
    status: 'Pending',
    claimType: 'Plan Managed'
  },
  {
    id: 'clm-sample-02',
    invoiceNumber: 'INV-261002',
    clientId: 'cli-sample-02',
    clientName: 'Chloe Tahan',
    ndisNumber: '431205884',
    supportItemCode: '15_056_0128_1_3',
    supportItemName: 'Assessment Recommendation Therapy Support - Allied Health',
    ndisSupportItem: '15_056_0128_1_3 - Assessment Recommendation Therapy Support',
    serviceDate: '2026-10-23',
    hours: 1.25,
    unitRate: 193.99,
    totalAmount: 242.49,
    status: 'Paid',
    claimType: 'NDIA Managed'
  },
  {
    id: 'clm-sample-03',
    invoiceNumber: 'INV-261003',
    clientId: 'cli-sample-03',
    clientName: 'Noah Nguyen',
    ndisNumber: '430774912',
    supportItemCode: '07_004_0115_8_3',
    supportItemName: 'Individual Behaviour Support Plan Development & Training',
    ndisSupportItem: '07_004_0115_8_3 - Behaviour Support Plan Training',
    serviceDate: '2026-10-21',
    hours: 2.0,
    unitRate: 214.41,
    totalAmount: 428.82,
    status: 'Pending',
    claimType: 'Plan Managed'
  }
];

export const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'inc-sample-01',
    clientId: 'cli-sample-03',
    clientName: 'Noah Nguyen',
    incidentDate: '2026-10-20',
    date: '2026-10-20',
    time: '17:20',
    location: 'Preston Residence - Kitchen',
    type: 'Behavioural Incident / Minor Property Impact',
    severity: 'Medium - Internal Governance Review',
    description: 'Participant struck kitchen counter during 15-minute meal delay; no injury sustained. De-escalated via LAMP AAC prompt.',
    immediateActionTaken: 'Cleared counter area, provided immediate snack, logged ABC episode, and briefed incoming evening worker.',
    isNdisReportable: false,
    status: 'Under Investigation',
    reportedBy: 'Marcus Vance',
    createdAt: '2026-10-20T17:30:00Z'
  }
];

export const SAMPLE_PRACTITIONERS: Practitioner[] = [
  {
    id: 'prac-201',
    name: 'Dr. Sarah Jenkins',
    position: 'Senior Behaviour Support Practitioner',
    role: 'Clinical Director & Principal PBS Specialist',
    qualification: 'PhD Clinical Psychology, BCBA',
    ndisRegistrationNumber: 'PRAC-PBS-2026-001',
    specialty: 'Positive Behaviour Support (Advanced)',
    email: 'sarah.jenkins@breakthrough.org.au',
    phone: '0411 200 301',
    caseloadCount: 14,
    maxCaseload: 18,
    billableTargetHours: 26,
    currentBillableHours: 24.5,
    schadsLevel: 'Level 8.1 (Principal Specialist)',
    hourlyPayRate: 78.5,
    workerScreeningId: 'NDIS-WS-8829104',
    workerScreeningExpiry: '2028-09-30',
    screeningStatus: 'Valid',
    screeningExpiryDate: '2028-09-30',
    policeCheckExpiryDate: '2027-11-15',
    ahpraNumber: 'PSY0001928374',
    status: 'Active'
  },
  {
    id: 'prac-202',
    name: 'Marcus Vance',
    position: 'Occupational Therapist',
    role: 'Senior Behaviour Support & OT Practitioner',
    qualification: 'M.OccTherapy, B.Sc',
    ndisRegistrationNumber: 'PRAC-OT-2026-002',
    specialty: 'Occupational Therapy & Functional Assessment',
    email: 'marcus.vance@breakthrough.org.au',
    phone: '0411 200 302',
    caseloadCount: 18,
    maxCaseload: 20,
    billableTargetHours: 28,
    currentBillableHours: 27.0,
    schadsLevel: 'Level 6.3 (Senior Clinician)',
    hourlyPayRate: 64.2,
    workerScreeningId: 'NDIS-WS-7741920',
    workerScreeningExpiry: '2027-05-12',
    screeningStatus: 'Valid',
    screeningExpiryDate: '2027-05-12',
    policeCheckExpiryDate: '2026-10-20',
    ahpraNumber: 'OCC0002291841',
    status: 'Active'
  }
];

export const SAMPLE_LEADS: Lead[] = [
  {
    id: 'lead-sample-01',
    prospectName: 'Oliver Sterling',
    name: 'Oliver Sterling',
    contactPerson: 'Karen Sterling (Mother)',
    contactName: 'Karen Sterling',
    contactEmail: 'karen.sterling@example.com.au',
    email: 'karen.sterling@example.com.au',
    contactPhone: '0409 881 234',
    phone: '0409 881 234',
    ndisNumber: '431559021',
    serviceRequested: 'Comprehensive Behaviour Support Plan & OT Sensory Assessment',
    fundingType: 'Plan-Managed',
    estimatedPlanValue: 18500,
    estimatedBudget: 18500,
    stage: 'Service Agreement Pending',
    source: 'Support Coordinator Referral',
    createdAt: '2026-10-19T09:00:00Z',
    updatedAt: '2026-10-19T09:00:00Z',
    notes: 'Referred by Melbourne Specialist Support Coordination; NDIS plan active with $18.5k CB Relationships funding.'
  }
];

export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-sample-01',
    title: 'Restrictive Practice Monthly Report Due',
    message: 'Monthly NDIS Commission portal report due for Liam O’Connor (Environmental gate protocol).',
    timestamp: new Date().toISOString(),
    read: false,
    type: 'compliance',
    severity: 'medium',
    linkTab: 'restrictive-practices'
  },
  {
    id: 'notif-sample-02',
    title: '2 Pending PRODA PACE Claims Ready',
    message: '$750.44 in signed PBS sessions ready for bulk PRODA CSV export or Xero invoice sync.',
    timestamp: new Date().toISOString(),
    read: false,
    type: 'billing',
    severity: 'low',
    linkTab: 'billing'
  }
];
