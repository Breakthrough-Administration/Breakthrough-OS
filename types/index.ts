export type UserRole = 'ADMIN' | 'PRACTITIONER' | 'VIEWER' | 'SUPPORT_COORDINATOR' | 'PARTICIPANT' | 'PENDING';

export type WorkerScreeningStatus = 'Active' | 'Valid' | 'Expiring Soon' | 'Expiring' | 'Pending' | 'Expired';

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  displayName?: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  photoURL?: string;
  position?: string;
  practitionerId?: string;
  participantId?: string;
  linkedClientId?: string;
  ndisNumber?: string;
  isInviteOnly?: boolean;
  workerScreeningStatus?: WorkerScreeningStatus;
  workerScreeningExpiry?: string;
  policeCheckExpiry?: string;
  ndisOrientationDone?: boolean;
  activeCaseload?: number;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientGoal {
  id: string;
  title: string;
  description?: string;
  category: 'Core' | 'Capacity Building' | 'Capital' | 'Social & Community' | string;
  targetDate: string;
  progressPercent: number;
  progress?: number;
  status: 'In Progress' | 'Achieved' | 'Deferred';
  gasScore?: -2 | -1 | 0 | 1 | 2;
  gasHistory?: { date: string; score: -2 | -1 | 0 | 1 | 2; note: string }[];
  linkedNoteIds?: string[];
}

export interface Client {
  id: string;
  ndisNumber: string;
  name: string;
  preferredName?: string;
  gender?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  address?: string | {
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    mmmZone?: string;
  };
  suburb?: string;
  dateOfBirth: string;
  status: 'Active' | 'Onboarding' | 'Archived' | 'Pending Plan';
  primaryDisability: string;
  secondaryDisabilities?: string[];
  goals: ClientGoal[];
  planStartDate: string;
  planEndDate: string;
  planManagementType?: 'Agency-Managed (NDIA)' | 'Plan-Managed' | 'Self-Managed' | 'NDIA-Managed';
  planType?: string;
  planManager?: {
    agency?: string;
    contactName?: string;
    email?: string;
    phone?: string;
  };
  supportCoordinator?: {
    name?: string;
    agency?: string;
    email?: string;
    phone?: string;
  };
  budgetBreakdown?: {
    core?: number;
    capacityBuildingTherapy?: number;
    capacityBuildingPBS?: number;
    supportCoordination?: number;
    capital?: number;
  };
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  primaryPractitionerId: string;
  primaryPractitionerName: string;
  allocatedPractitionerId?: string;
  allocatedPractitionerName?: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  emergencyContact: {
    name: string;
    relationship?: string;
    relation?: string;
    phone: string;
  };
  gpContact?: {
    doctorName?: string;
    clinicName?: string;
    phone?: string;
  };
  highIntensityNeeds?: string[];
  communicationMethod?: string;
  mobilityNeeds?: string;
  triggers?: string[];
  deescalationStrategies?: string;
  primarySupportItemCode?: string;
  agreedHourlyRate?: number;
  weeklyAllocatedHours?: number;
  restrictivePracticesActive: boolean;
  bspExpiryDate?: string;
  bspStatus?: string;
  isCustomUserParticipant?: boolean;
  driveFolderPath?: string;
  driveFolderUrl?: string;
  driveFolderId?: string;
  driveSubfolders?: string[];
  isCompanyDriveParticipant?: boolean;
  documents?: AttachedDocument[];
  attachedDocuments?: AttachedDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CaseNote {
  id: string;
  clientId: string;
  clientName: string;
  ndisNumber?: string;
  practitionerId: string;
  practitionerName: string;
  date: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  sessionDurationMinutes: number;
  durationMinutes?: number;
  nonFaceToFaceMinutes?: number;
  travelMinutes?: number;
  billableHours?: number;
  format: 'SIMPL' | 'BIRP' | 'Standard' | 'SOAP';
  category?: string;
  serviceType?: string;
  supportItemCode?: string;
  supportItemName?: string;
  linkedSupportItemCode?: string;
  invoiceNumber?: string;
  billedAmount?: number;
  hourlyRate?: number;
  totalAmount?: number;
  text?: string;
  content?: string;
  situation?: string;
  intervention?: string;
  progress?: string;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  ndisClaimGenerated?: boolean;
  subjective: string; // Situation / Subjective
  objective: string;  // Intervention / Objective
  assessment: string; // Measurement / Assessment
  plan: string;       // Next steps / Plan
  soapSubjective?: string;
  soapObjective?: string;
  soapAssessment?: string;
  soapPlan?: string;
  linkedGoalIds: string[];
  linkedDocumentIds?: string[];
  linkedDriveFiles?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
    sizeBytes?: number;
    category?: string;
    tags?: string[];
    uploadedAt?: string;
    driveFileId?: string;
  }>;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Archived';
  flaggedForReview: boolean;
  isLocked?: boolean;
  reviewNotes?: string;
  billable?: boolean;
  isVerified?: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestrictivePractice {
  id: string;
  clientId: string;
  clientName: string;
  practiceType?: 'Chemical' | 'Mechanical' | 'Physical' | 'Environmental' | 'Seclusion' | string;
  type?: string;
  subtype?: string;
  description?: string;
  status: 'Proposed' | 'Authorized' | 'Authorised' | 'Active' | 'Superseded' | 'Expired' | string;
  authorizationBody?: string; // e.g. "VIC Senior Practitioner"
  authorizingBody?: string;
  authorizationReference?: string;
  authorizationExpiry?: string;
  authorisationStatus?: string;
  authorisedBy?: string;
  authorizedBy?: string;
  clinicalRationale?: string;
  rationale?: string;
  authorizationDate?: string;
  reductionProtocol?: string;
  reductionStrategy?: string;
  fadePlanStatus?: string;
  startDate?: string;
  expiryDate?: string;
  reductionPlanSummary?: string;
  monthlyReportStatus?: 'Submitted' | 'Due' | 'Overdue' | string;
  lastReportedDate?: string;
  monthlyUsageCount?: number;
  clinicalSupervisorId?: string;
  bspSignOff?: {
    signed: boolean;
    signedBy?: string;
    signedAt?: string;
    credential?: string;
  };
  apoSignOff?: {
    signed: boolean;
    signedBy?: string;
    signedAt?: string;
    apoRegistrationNumber?: string;
  };
}

export type IncidentCategory =
  | 'Injury'
  | 'Medication Error'
  | 'Restrictive Practice Issue'
  | 'Abuse / Neglect Allegation'
  | 'Property Damage'
  | 'Behaviour of Concern'
  | 'Missing Person'
  | 'Other';

export interface Incident {
  id: string;
  clientId: string;
  clientName: string;
  practitionerId?: string;
  practitionerName?: string;
  incidentDate: string;
  date?: string;
  time?: string;
  location?: string;
  title?: string;
  category?: IncidentCategory | string;
  incidentTime?: string;
  reportedDate?: string;
  reportedByRole?: string;
  reportedByName?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical / Reportable' | 'Critical - 24h Commission Reportable' | string;
  status: 'Investigating' | 'Under Investigation' | 'Reported to NDIS Commission' | 'Closed' | 'Corrective Action Required' | 'Resolved' | 'Open' | string;
  type?: string;
  injuries?: string;
  investigationNotes?: string;
  isNdisReportable?: boolean;
  ndis24hrNotified?: boolean;
  ndis5daySubmitted?: boolean;
  description?: string;
  immediateActionTaken?: string;
  actionTaken?: string;
  reportedToNDISCommission?: boolean;
  commissionReferenceNumber?: string;
  commissionReportedDate?: string;
  rootCauseAnalysis?: string;
  correctiveActions?: string;
  reportedBy?: string;
  attachments?: AttachedDocument[];
  documents?: AttachedDocument[];
  createdAt: string;
}

export interface Lead {
  id: string;
  prospectName: string;
  name?: string;
  contactPerson?: string;
  ndisNumber?: string;
  contactName: string;
  contactEmail: string;
  email?: string;
  contactPhone: string;
  phone?: string;
  stage: 'New Intake' | 'Screening & Qualification' | 'Service Agreement Pending' | 'Converted to Client' | 'Disqualified' | string;
  status?: string;
  source: 'NDIS Portal' | 'Support Coordinator Referral' | 'Direct Website' | 'Hospital / Allied Health' | string;
  estimatedPlanValue: number;
  estimatedBudget?: number;
  serviceRequested?: string;
  assignedPractitionerId?: string;
  assignedPractitionerName?: string;
  supportNeeds?: string;
  fundingType?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Practitioner {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: 'Senior Behaviour Support Practitioner' | 'Core Behaviour Specialist' | 'Provisional Practitioner' | 'Speech Pathologist' | 'Occupational Therapist' | 'Lead Support Coordinator & Intake Specialist' | string;
  role?: string;
  qualification: string;
  ndisRegistrationNumber: string;
  registrationNumber?: string;
  pbsRegistrationLevel?: 'Core Practitioner' | 'Proficient Practitioner' | 'Advanced Practitioner' | 'Specialist Practitioner' | 'Support Coordinator' | string;
  specialties?: string[];
  specialty?: string;
  status?: string;
  caseloadCount?: number;
  maxCaseload?: number;
  billableTargetHours?: number;
  currentBillableHours?: number;
  schadsLevel?: string;
  hourlyPayRate?: number;
  workerScreeningId?: string;
  ahpraNumber?: string;
  workerScreeningNumber?: string;
  workerScreeningExpiry?: string;
  wwccNumber?: string;
  wwccExpiry?: string;
  screeningStatus: 'Valid' | 'Expiring Soon' | 'Expiring' | 'Expired';
  workerScreeningStatus?: 'Active' | 'Pending' | 'Expiring Soon' | 'Expiring' | 'Expired' | 'Valid';
  screeningId?: string;
  screeningExpiry?: string;
  screeningExpiryDate: string;
  policeCheckExpiry?: string;
  policeCheckExpiryDate: string;
  cprExpiryDate?: string;
  firstAidExpiryDate?: string;
  medicationCertExpiryDate?: string;
  mandatoryTrainingExpiryDate?: string;
  ndisOrientationCompleted?: boolean;
  cpdHoursThisYear?: number;
  cpdHoursRequired?: number;
  caseloadLimit?: number;
  activeCaseloadCount?: number;
  activeCaseload?: number;
  historicalSuccessRate?: number; // e.g. 98 (%)
  completedSessionsCount?: number; // e.g. 420
  rating?: number; // e.g. 4.9
  courseCompletions?: Array<{
    courseId: string;
    courseTitle: string;
    completedAt: string;
    expiresAt?: string;
    provider?: string;
    badge?: string;
    status: 'Completed' | 'In Progress' | 'Expired';
    certificateUrl?: string;
  }>;
}

export interface ABCLog {
  id: string;
  clientId: string;
  clientName: string;
  timestamp: string;
  timeOfDay: string; // HH:mm
  dayOfWeek: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: number; // 1-5
  durationMinutes: number;
  location: string;
  perceivedFunction: 'Escape/Avoidance' | 'Attention/Social' | 'Tangible/Access' | 'Sensory/Automatic';
  recordedBy: string;
}

export interface BSPDocument {
  id: string;
  clientId: string;
  clientName: string;
  version: string; // e.g. "v1.2"
  status:
    | 'Draft'
    | 'Panel Review'
    | 'Submitted to NDIS'
    | 'Active'
    | 'Approved'
    | 'Superseded'
    | 'Under Review'
    | 'Panel Submitted'
    | 'Re-Authorized'
    | 'Current'
    | 'Due in 30 Days'
    | string;
  summary: string;
  primaryBehaviorsOfConcern: string[];
  primaryBehavioursOfConcern?: string[];
  triggers?: string[];
  proactiveStrategies: string[];
  reactiveStrategies: string[];
  restrictivePractices: RestrictivePractice[] | string[];
  reviewDate: string;
  authorName: string;
  lastUpdated: string;
}

export interface NDISSupportItem {
  id?: string;
  code: string;
  name: string;
  category: string;
  pricePerUnit: number;
  unitOfMeasure: 'Hour' | 'Each' | 'Day';
}

export interface BillingClaim {
  id: string;
  clientId: string;
  clientName: string;
  ndisNumber: string;
  serviceDate: string;
  dateOfService?: string;
  ndisSupportItem: string; // e.g. "07_002_0115_8_3 - Specialist Behavioural Intervention"
  supportItemCode: string;
  supportItemNumber?: string;
  hours: number;
  hoursWorked?: number;
  quantity?: number;
  unitRate: number;
  rate?: number;
  unitPrice?: number;
  totalAmount: number;
  status: 'Pending' | 'Approved' | 'Submitted PACE' | 'Paid' | 'Rejected';
  invoiceNumber: string;
  claimReference?: string;
  isPaceCompliant?: boolean;
  reconciliationStatus?: 'Reconciled' | 'Pending' | 'Failed' | 'SLA_Breach_Risk';
  reconciliationError?: string;
  slaDeadline?: string;
  paymentReceivedDate?: string;
  xeroInvoiceId?: string;
  validationFlag?: string;
  validationResult?: BillingValidationResult;
  practitionerId?: string;
  practitionerName?: string;
  supportItemName?: string;
  ndisCategory?: string;
  claimType?: 'Plan Managed' | 'NDIA Managed' | 'Self Managed' | string;
  attachments?: AttachedDocument[];
  documents?: AttachedDocument[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OfflineDelta<T = Record<string, any>> {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId: string;
  payload: T;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
  action: string;
  entity?: string;
  entityId?: string;
  category?: string;
  targetId?: string;
  userEmail?: string;
  userRole?: UserRole | string;
  details: string;
  ipAddress?: string;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface CommunicationLog {
  id: string;
  entityType: 'Client' | 'Lead';
  entityId: string;
  entityName: string;
  type: 'Phone Call' | 'Email' | 'In-Person Meeting' | 'NDIS Portal Note';
  timestamp: string;
  authorName: string;
  summary: string;
  followUpRequired: boolean;
  followUpDate?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'incident' | 'agreement' | 'hr' | 'compliance' | 'client' | 'billing' | 'clinical' | 'general' | 'system' | 'crm';
  severity: 'high' | 'medium' | 'info' | 'low' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export type NoteCategory = 'Clinical' | 'Financial' | 'Compliance' | 'HR' | 'Intake' | 'BSP & Safety' | 'General';

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Deferred';

export interface CRMTask {
  id: string;
  title: string;
  description: string;
  category: NoteCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  clientId?: string;
  clientName?: string;
  leadId?: string;
  leadName?: string;
  isSyncedFromKeep?: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledShift {
  id: string;
  practitionerId: string;
  practitionerName?: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  supportType?: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled' | string;
  schadsClassification?: string;
  googleCalendarEventId?: string;
}

export interface KeepChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface KeepNoteItem {
  id: string;
  userId: string;
  title: string;
  text: string;
  color: string;
  category: NoteCategory;
  isPinned: boolean;
  isArchived: boolean;
  labels: string[];
  checklist: KeepChecklistItem[];
  clientId?: string;
  clientName?: string;
  executiveSummary?: string;
  syncedToCrmCount?: number;
  lastSyncedToCrm?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Document Storage & File Management (R11)
// ==========================================

export type DocumentCategory =
  | 'Consent Form'
  | 'Assessment PDF'
  | 'NDIS Plan Document'
  | 'Incident Photo Evidence'
  | 'Billing Receipt'
  | 'BSP Document'
  | 'Clinical Report'
  | 'Invoicing & Claims'
  | 'Service Agreement'
  | 'Legal Document'
  | 'Other';

export type AllowedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'image/jpeg'
  | 'image/png';

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileSize: number; // Max 26,214,400 bytes (25MB)
  mimeType: AllowedMimeType | string;
  category: DocumentCategory;
  storagePath: string; // e.g. "clients/{clientId}/documents/{docId}/{fileName}"
  downloadUrl: string;
  clientId?: string;
  clientName?: string;
  entityType: 'Client' | 'Incident' | 'BillingClaim' | 'BSPDocument' | 'Practitioner' | 'General';
  entityId: string;
  uploadedBy: string; // User ID
  uploadedByName: string;
  assignedPractitionerId?: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentTag =
  | 'Clinical'
  | 'Financial'
  | 'Legal'
  | 'Compliance'
  | 'NDIS Plan'
  | 'Behavioural'
  | 'Medical'
  | 'Governance'
  | string;

export interface AttachedDocument {
  id: string;
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  dateUploaded?: string;
  fileType?: string;
  fileSize?: string;
  category: 'consent' | 'assessment' | 'bsp' | 'incident_photo' | 'other' | DocumentCategory;
  tags?: DocumentTag[];
  clientId?: string;
  clientName?: string;
  caseNoteId?: string;
  driveFileId?: string;
  iconUrl?: string;
  incidentId?: string;
  claimId?: string;
  storagePath?: string;
  downloadUrl?: string;
  metadata?: Record<string, any>;
}

export interface DriveSyncLog {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  action:
    | 'LINK_DOCUMENT'
    | 'UNLINK_DOCUMENT'
    | 'BATCH_TAG'
    | 'AUTO_TAG_SUGGEST'
    | 'STORAGE_AUDIT'
    | 'POLL_SYNC';
  fileName: string;
  fileId?: string;
  driveFileId?: string;
  clientId?: string;
  clientName?: string;
  firestorePath?: string;
  details?: string;
  metadata?: {
    sizeBytes?: number;
    category?: string;
    tags?: string[];
    error?: string;
    source?: string;
  };
}

export interface PickerSearchInsight {
  id: string;
  query: string;
  count: number;
  lastSearchedAt: string;
  categorySuggestion?: string;
  lastPractitionerName?: string;
}

// ==========================================
// Clinical AI Engines & Semantic Search (M2: R2, R3, R4, R6)
// ==========================================

export interface RiskAssessment {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  score: number; // 0 - 100
  rationale: string;
  calculatedAt: string;
  triggeredAlerts: string[];
  directorNotificationRequired?: boolean;
  factorScores?: {
    incidentRisk: number;
    restrictiveRisk: number;
    budgetVelocityRisk: number;
    engagementRisk: number;
    clinicalNotesRisk: number;
  };
}

export interface AntecedentCluster {
  antecedent: string;
  count: number;
  percentage: number;
  description?: string;
  recommendedModifications?: string[];
}

export interface ABCPatternAnalysis {
  topAntecedents: AntecedentCluster[];
  temporalDistribution: Record<string, number>;
  timeOfDayDistribution?: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  dayOfWeekDistribution?: Record<string, number>;
  dominantFunction: 'Escape/Avoidance' | 'Attention/Social' | 'Tangible/Access' | 'Sensory/Automatic' | string;
  functionBreakdown?: Record<string, { count: number; percentage: number }>;
  pbsRecommendations: string[];
  proactiveStrategies: string[];
  reactiveStrategies: string[];
  replacementSkills: string[];
  clinicalHypothesis: string;
}

export interface ComprehensiveBSPSection {
  sectionNumber: number;
  title: string;
  content: string;
  items?: string[];
  subsections?: Record<string, string | string[]>;
}

export interface ComprehensiveBSPResult {
  id: string;
  clientId: string;
  clientName: string;
  ndisNumber: string;
  version: string;
  status: 'Draft' | 'Panel Review' | 'Submitted to NDIS' | 'Active' | 'Superseded';
  createdDate: string;
  reviewDate: string;
  authorName: string;
  authorQualification?: string;
  sections: {
    section1_participantProfile: ComprehensiveBSPSection;
    section2_presentingBehaviours: ComprehensiveBSPSection;
    section3_antecedentAnalysis: ComprehensiveBSPSection;
    section4_functionalAssessment: ComprehensiveBSPSection;
    section5_proactiveStrategies: ComprehensiveBSPSection;
    section6_replacementSkills: ComprehensiveBSPSection;
    section7_reactiveAndRestrictivePractices: ComprehensiveBSPSection;
  };
  summary: string;
  primaryBehaviorsOfConcern: string[];
  proactiveStrategies: string[];
  reactiveStrategies: string[];
  restrictivePractices: RestrictivePractice[];
  htmlContent: string;
  markdownContent: string;
}

export interface SearchResult {
  id: string;
  category: 'CLIENT' | 'CASE_NOTE' | 'PRACTITIONER' | 'BILLING' | 'INCIDENT' | 'RESTRICTIVE_PRACTICE' | 'ABC_LOG';
  title: string;
  subtitle: string;
  snippet: string;
  targetTab: string;
  entityId: string;
  score: number;
  badge: {
    label: string;
    color: string;
  };
  matchedField?: string;
  matchedHighlights?: string[];
  metadata?: Record<string, any>;
}

// ==========================================
// Financial Intelligence & Integrations (M3: R5, R8, R9, R13)
// ==========================================

export interface BillingValidationBadge {
  type: 'green' | 'amber' | 'red';
  code: string;
  message: string;
  suggestedFix?: string;
}

export interface BillingValidationResult {
  isClean: boolean;
  badges: BillingValidationBadge[];
  errors: string[];
  warnings: string[];
}

export interface ProdaProcessedClaim {
  claimId: string;
  clientId?: string;
  ndisNumber?: string;
  amount?: number;
  status: 'Paid' | 'Rejected' | 'Pending';
  paceReference?: string | null;
  rejectionCode?: string | null;
  rejectionReason?: string | null;
}

export interface ProdaBatchSubmission {
  batchId: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  submittedClaimsCount: number;
  approvedCount: number;
  rejectedCount: number;
  submittedAt?: string;
  completedAt?: string;
  timestamp?: string;
  claims?: ProdaProcessedClaim[];
  errors?: Array<{ claimId: string; errorCode: string; errorMessage: string }>;
}

export interface XeroOAuthState {
  isConnected: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  expiresAt?: string | number | null;
  lastSyncAt?: string;
}

export interface XeroInvoiceLineItem {
  description: string;
  itemCode?: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  accountCode?: string;
}

export interface XeroInvoice {
  invoiceId: string;
  invoiceNumber: string;
  tenantId?: string;
  type: 'ACCREC' | 'ACCPAY';
  contact: {
    name: string;
    accountNumber?: string;
    emailAddress?: string;
  };
  lineItems: XeroInvoiceLineItem[];
  date: string;
  dueDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
  total: number;
  amountDue: number;
  amountPaid: number;
  createdAt?: string;
}

export interface XeroPayment {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  reference?: string;
}

export interface NDISPriceGuideSyncResult {
  syncedCount: number;
  changesCount: number;
  changes: Array<{
    code: string;
    name: string;
    oldRate: number;
    newRate: number;
  }>;
  revalidatedClaimsCount: number;
  timestamp: string;
}

// ==========================================
// Statutory Compliance Automation Suite (M4: R12)
// ==========================================

export interface MonthlyComplianceMetrics {
  activeRestrictivePracticesCount: number;
  unauthorizedUsesCount: number;
  totalIncidentsCount: number;
  reportableIncidentsCount: number;
  screeningComplianceRatePercent: number;
  screeningExpiringSoonCount: number;
  screeningExpiredCount: number;
  totalClaimsCount: number;
  totalBillingSubmittedAmount: number;
  paceSubmissionRatePercent: number;
}

export interface MonthlyComplianceReport {
  reportId: string;
  reportingMonth: string; // e.g. "2026-08" or "2026-08-01"
  generatedAt: string;
  practiceDirectorEmail: string;
  metrics: MonthlyComplianceMetrics;
  auditSummary: string;
  htmlContent?: string;
  pdfBase64?: string;
  emailedSuccessfully?: boolean;
  status: 'Draft' | 'Generated' | 'Dispatched' | 'Acknowledged';
}

export interface RPReportEntry {
  practiceId: string;
  participantId?: string;
  clientName: string;
  participantName?: string;
  participantNdisNumber?: string;
  practiceType: 'Chemical' | 'Mechanical' | 'Physical' | 'Environmental' | 'Seclusion' | string;
  authorizationStatus?: 'Authorized' | 'Emergency / Unauthorized' | 'Active' | 'Superseded' | 'Expired';
  status?: string;
  authorizationReference: string;
  authorizingBody?: string;
  usageFrequencyThisMonth?: number;
  reductionPlanMilestonesAchieved?: string[];
  reductionPlanSummary?: string;
  adverseEventsLogged?: boolean;
  startDate?: string;
  expiryDate?: string;
  monthlyReportStatus?: 'Submitted' | 'Due' | 'Overdue';
}

export interface NDISCommissionRPReport {
  submissionId: string;
  reportingPeriod: string;
  providerRegistrationNumber: string;
  generatedAt?: string;
  extractedPractices: RPReportEntry[];
  summary?: {
    totalActivePractices: number;
    authorizedCount: number;
    unauthorizedEmergencyCount: number;
    fadingMilestonesAchievedCount: number;
    adverseEventsCount: number;
  };
}

export interface NDISAuditBundleManifestItem {
  fileName: string;
  category: string;
  recordCount: number;
  sizeBytes: number;
  description: string;
}

export interface NDISAuditBundle {
  bundleId: string;
  participantId: string;
  participantName: string;
  ndisNumber: string;
  generatedAt: string;
  bundleVersion?: string;
  integrityHash: string; // SHA-256
  packageSizeBytes: number;
  manifest: string[] | NDISAuditBundleManifestItem[];
  documentsIncluded?: {
    clientProfile: boolean;
    activeBSP: boolean;
    caseNotesCount: number;
    incidentsCount: number;
    restrictivePracticesCount: number;
    practitionerScreeningVerified: boolean;
    abcLogsCount?: number;
  };
  dataPayload?: {
    client: Client;
    bsp: BSPDocument | null;
    caseNotes: CaseNote[];
    incidents: Incident[];
    restrictivePractices: RestrictivePractice[];
    practitioners: Practitioner[];
    abcLogs?: ABCLog[];
  };
  htmlSummary?: string;
}

export type BSPReviewStatus = 'Current' | 'Due in 30 Days' | 'Under Review' | 'Panel Submitted' | 'Re-Authorized' | 'Expired';

export interface BSPReviewAlert {
  bspId: string;
  clientId?: string;
  clientName: string;
  authorName?: string;
  reviewDate?: string;
  daysRemaining: number;
  status: 'EXPIRED' | 'URGENT_14_DAYS' | 'WARNING_30_DAYS' | 'ON_TRACK' | BSPReviewStatus;
  severity?: 'high' | 'medium' | 'low' | 'info';
  recommendation?: string;
}

export interface BSPReviewTransitionResult {
  bspId: string;
  previousStatus: string;
  newStatus: BSPReviewStatus;
  transitionDate: string;
  actorId: string;
  actorName: string;
  panelNotes?: string;
  newReviewDate?: string;
}

export type IncidentWorkflowStatus = 'Open' | 'Investigating' | 'Clinical Review' | 'Director Sign-off' | 'Closed';

export interface IncidentStep1Lodgement {
  completed: boolean;
  lodgedBy: string;
  lodgedAt: string;
  ndis24hNotified: boolean;
  ndisReportable: boolean;
}

export interface IncidentStep2RootCause {
  completed: boolean;
  investigatorId?: string;
  investigatorName?: string;
  completedAt?: string;
  rootCauseCategory?: 'Environmental' | 'Communication Breakdown' | 'Staffing Gap' | 'Medical' | 'Sensory Overload' | 'Unspecified';
  analysisNotes?: string;
  witnessStatements?: Array<{ witnessName: string; statement: string; date: string }>;
}

export interface IncidentStep3CorrectiveActions {
  completed: boolean;
  qualityOfficerId?: string;
  qualityOfficerName?: string;
  completedAt?: string;
  actionItems: string[];
  bspAmendmentRequired: boolean;
  protocolUpdatesSummary?: string;
}

export interface IncidentStep4DirectorSignOff {
  completed: boolean;
  directorId?: string;
  directorName?: string;
  signedAt?: string;
  closureDecision: 'Approved & Closed' | 'Re-investigation Required';
  directorNotes?: string;
}

export interface IncidentSignOffWorkflow {
  incidentId: string;
  currentStep: 1 | 2 | 3 | 4;
  currentStatus: IncidentWorkflowStatus;
  step1_lodgement: IncidentStep1Lodgement;
  step2_rootCause: IncidentStep2RootCause;
  step3_correctiveActions: IncidentStep3CorrectiveActions;
  step4_directorSignOff: IncidentStep4DirectorSignOff;
  history?: Array<{
    step: number;
    fromStatus: string;
    toStatus: string;
    actorName: string;
    timestamp: string;
    notes?: string;
  }>;
}

export interface IncidentWorkflowTransitionResult {
  incidentId: string;
  previousStatus: string;
  newStatus: IncidentWorkflowStatus;
  signedOffBy?: string;
  timestamp: string;
  workflow?: IncidentSignOffWorkflow;
}

// ==========================================
// Milestone 5: Participant Portal, PWA & AI Chatbot (R14, R15, R16)
// ==========================================

export interface PlainLanguageSessionNote {
  id: string;
  sessionDate: string;
  date?: string;
  practitionerName: string;
  durationMinutes: number;
  summary: string;
  sessionSummary: string;
  plainLanguageProgress: string;
  nextSessionFocus?: string;
  positiveHighlights: string[];
  skillsPracticed: string[];
  homePracticeSuggestions: string[];
  goalsAddressed: string[];
  serviceType?: string;
  verified?: boolean;
}

export interface ParticipantPortalData {
  participantProfile: {
    id: string;
    name: string;
    ndisNumber: string;
    primaryDisability?: string;
    planStartDate: string;
    planEndDate: string;
    primaryPractitionerName: string;
    primaryPractitionerId?: string;
    email?: string;
    phone?: string;
    goals?: ClientGoal[];
  };
  budgetSummary?: {
    totalFunding: number;
    usedFunding: number;
    remainingFunding: number;
    utilizationPercent: number;
  };
  budgetOverview: {
    totalBudget: number;
    spentBudget: number;
    remainingBudget: number;
    utilizationPercentage: number;
  };
  upcomingAppointments: ScheduledShift[];
  sessionNotes?: PlainLanguageSessionNote[];
  redactedSessionNotes: PlainLanguageSessionNote[];
  goals?: ClientGoal[];
  recentIncidents: Array<{
    id: string;
    date: string;
    type?: string;
    status?: string;
    description: string;
    actionTaken?: string;
    severity?: string;
  }>;
}

export interface OfflineSyncQueueItem {
  id: string;
  timestamp: string;
  entity: 'CaseNote' | 'ABCLog' | 'Incident' | 'BillingClaim' | 'Client' | string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  payload: any;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED' | 'synced';
  lastError?: string;
}

export interface PWAInstallStatus {
  isInstalled: boolean;
  isInstallPromptSupported: boolean;
  isOfflineCapable: boolean;
  serviceWorkerRegistered: boolean;
}

export interface ChatbotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'bot' | 'system';
  text: string;
  timestamp: string;
  isCrisis?: boolean;
  isEscalated?: boolean;
  escalatedTo?: string;
  guardrailTriggered?: boolean;
  escalationReason?: 'MEDICAL_QUERY' | 'CLINICAL_DIAGNOSIS' | 'SAFETY_CONCERN' | 'COMPLEX_REQUEST';
}

export interface ParticipantChatbotQueryResult {
  reply: string;
  message?: string;
  guardrailTriggered: boolean;
  isEscalated: boolean;
  isCrisis: boolean;
  escalatedTo?: string;
  practitionerNotified?: string;
  category?: 'budget' | 'appointment' | 'goals' | 'general' | 'medical_blocked' | 'crisis_escalated' | 'clinical_escalated';
}

// ==========================================
// HR Leave & Availability Management (Phase 3.3)
// ==========================================

export type LeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'TOIL'
  | 'Public Holiday'
  | "Personal/Carer's Leave"
  | 'Unpaid Leave';

export type LeaveStatus = 'Pending Approval' | 'Approved' | 'Declined' | 'Cancelled';

export interface PractitionerLeave {
  id: string;
  practitionerId: string;
  practitionerName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  leaveType: LeaveType;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 17hats CRM & Business Automation Types
// ==========================================

export interface SeventeenHatsConfig {
  apiKey?: string;
  brandId?: string;
  webhookSecret?: string;
  defaultStage?: string;
  autoSyncLeads?: boolean;
  lastSyncedAt?: string;
  connectionStatus?: 'Connected' | 'Disconnected' | 'Error';
}

export interface SeventeenHatsLeadPayload {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  project_name?: string;
  notes?: string;
  tags?: string[];
}

export interface SeventeenHatsWebhookEvent {
  event_name: 'lead_created' | 'invoice_paid' | 'contract_signed' | 'questionnaire_submitted' | 'contact_updated' | string;
  timestamp: string;
  data: Record<string, any>;
}

// ==========================================
// Company Policy & SOP Knowledge Base (RAG)
// ==========================================

export interface PolicyDocument {
  id: string;
  title: string;
  category: 'NDIS_PRACTICE_STANDARDS' | 'RESTRICTIVE_PRACTICES' | 'INCIDENT_MANAGEMENT' | 'CASE_NOTES_AUDIT' | 'CODE_OF_CONDUCT' | 'EMERGENCY_MANAGEMENT';
  documentNumber: string;
  version: string;
  effectiveDate: string;
  summary: string;
  contentChunks: string[];
  mandatoryRequirements: string[];
  citationRef: string;
  tags: string[];
}

export interface PolicySearchResult {
  documentId: string;
  title: string;
  category: string;
  relevanceScore: number;
  matchedChunk: string;
  citationRef: string;
  mandatoryRequirements: string[];
}

export interface PolicyAuditResult {
  isAuditCompliant: boolean;
  complianceScore: number; // 0-100
  passedStandards: string[];
  flaggedDeficiencies: {
    standard: string;
    requirement: string;
    finding: string;
    suggestedRemedy: string;
    severity: 'High' | 'Medium' | 'Low';
  }[];
  citationReferences: string[];
}

// ==========================================
// Integration Diagnostic & Health Metrics
// ==========================================

export interface IntegrationHealthMetric {
  serviceId: 'proda' | 'xero' | 'seventeenHats' | 'googleWorkspace' | 'sendgrid' | 'twilio' | 'firebase';
  serviceName: string;
  status: 'Operational' | 'Degraded' | 'Offline' | 'Connecting';
  latencyMs: number;
  lastCheckedAt: string;
  tokenExpiresAt?: string;
  activeEndpoints: string[];
  errorRatePercent: number;
  recentLogs: { timestamp: string; level: 'info' | 'warn' | 'error'; message: string }[];
}




