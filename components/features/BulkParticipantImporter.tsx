'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client, ClientGoal } from '@/types';
import { STANDARD_DRIVE_SUBFOLDERS } from '@/lib/seedData';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowRight,
  Database,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Check,
  Sparkles,
  Sliders,
  HelpCircle,
  Trash2,
  FileText,
  Users
} from 'lucide-react';

export interface FieldMapping {
  name: string;
  preferredName?: string;
  email: string;
  ndisNumber: string;
  dateOfBirth: string;
  primaryDisability: string;
  phone: string;
  totalBudget: string;
  coreBudget?: string;
  capacityBuildingBudget?: string;
  pbsBudget?: string;
  spentBudget?: string;
  planManagementType: string;
  planStartDate?: string;
  planEndDate?: string;
  riskLevel: string;
  supportCoordinatorName?: string;
  supportCoordinatorEmail?: string;
  supportCoordinatorPhone?: string;
  planManagerAgency?: string;
  planManagerEmail?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  suburb?: string;
  primaryGoal?: string;
}

export interface ValidationError {
  field: keyof FieldMapping;
  severity: 'error' | 'warning';
  message: string;
}

export interface ParsedParticipantRow {
  rowId: string;
  selected: boolean;
  raw: Record<string, string>;
  mapped: {
    name: string;
    preferredName?: string;
    email: string;
    ndisNumber: string;
    dateOfBirth: string;
    primaryDisability: string;
    phone: string;
    totalBudget: number;
    coreBudget?: number;
    capacityBuildingBudget?: number;
    pbsBudget?: number;
    spentBudget?: number;
    planManagementType: string;
    planStartDate?: string;
    planEndDate?: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    supportCoordinatorName?: string;
    supportCoordinatorEmail?: string;
    supportCoordinatorPhone?: string;
    planManagerAgency?: string;
    planManagerEmail?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    address: string;
    suburb?: string;
    primaryGoal?: string;
  };
  errors: ValidationError[];
  isDuplicateInDB: boolean;
  isDuplicateInFile: boolean;
}

export interface BulkParticipantImporterProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccessNavigate?: () => void;
  isModal?: boolean;
  modalTitle?: string;
  autoLoadPreviewData?: boolean;
  initialCsvText?: string;
  initialFileName?: string;
}

export const BulkParticipantImporter: React.FC<BulkParticipantImporterProps> = ({
  isOpen = true,
  onClose,
  onSuccessNavigate,
  isModal = false,
  modalTitle = 'Business Participant Roster Importer (CSV / Excel / Sheets)',
  autoLoadPreviewData = false,
  initialCsvText,
  initialFileName
}) => {
  const { clients, batchImportValidatedClients, generateParticipantTemplateCSV, currentUser } = useManagementStore();

  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'committing' | 'completed'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fileErrorMessage, setFileErrorMessage] = useState<string | null>(null);
  const [showErrorCommitPrompt, setShowErrorCommitPrompt] = useState(false);
  const [pastedSpreadsheetText, setPastedSpreadsheetText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [mappings, setMappings] = useState<FieldMapping>({
    name: '',
    preferredName: '',
    email: '',
    ndisNumber: '',
    dateOfBirth: '',
    primaryDisability: '',
    phone: '',
    totalBudget: '',
    coreBudget: '',
    capacityBuildingBudget: '',
    pbsBudget: '',
    spentBudget: '',
    planManagementType: '',
    planStartDate: '',
    planEndDate: '',
    riskLevel: '',
    supportCoordinatorName: '',
    supportCoordinatorEmail: '',
    supportCoordinatorPhone: '',
    planManagerAgency: '',
    planManagerEmail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    address: '',
    suburb: '',
    primaryGoal: ''
  });

  const [parsedRows, setParsedRows] = useState<ParsedParticipantRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'errors' | 'warnings' | 'valid'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: keyof FieldMapping } | null>(null);
  const [commitProgress, setCommitProgress] = useState(0);
  const [commitStatusText, setCommitStatusText] = useState('');
  const [commitResult, setCommitResult] = useState<{
    count: number;
    createdCount?: number;
    updatedCount?: number;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-guess column mappings from header names
  const autoDetectMappings = (detectedHeaders: string[]): FieldMapping => {
    const clean = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const findMatch = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const found = detectedHeaders.find((h) => clean(h) === pattern || clean(h).includes(pattern));
        if (found) return found;
      }
      return '';
    };

    return {
      name: findMatch(['fullname', 'participantname', 'clientname', 'name', 'participant', 'client']) || detectedHeaders[0] || '',
      preferredName: findMatch(['preferredname', 'nickname', 'firstname']) || '',
      email: findMatch(['emailaddress', 'participantemail']) || detectedHeaders.find((h) => clean(h) === 'email') || '',
      ndisNumber: findMatch(['ndisnumber', 'ndisno', 'ndis', 'ndisid', 'participantid']) || '',
      dateOfBirth: findMatch(['dateofbirth', 'birthdate', 'dob', 'birth', 'bday']) || '',
      primaryDisability: findMatch(['primarydisability', 'disability', 'diagnosis', 'condition']) || '',
      phone: findMatch(['contactphone', 'phonenumber', 'mobile']) || detectedHeaders.find((h) => clean(h) === 'phone') || '',
      totalBudget: findMatch(['totalbudget', 'planbudget', 'budget', 'funding', 'amount']) || '',
      coreBudget: findMatch(['corebudget', 'corefunding', 'core']) || '',
      capacityBuildingBudget: findMatch(['capacitybuildingbudget', 'capacitybuilding', 'therapybudget']) || '',
      pbsBudget: findMatch(['pbsbudget', 'behavioursupportbudget', 'pbs']) || '',
      spentBudget: findMatch(['spentbudget', 'spent', 'claimed']) || '',
      planManagementType: findMatch(['planmanagementtype', 'planmanagement', 'plantype', 'managementtype', 'management']) || '',
      planStartDate: findMatch(['planstartdate', 'startdate', 'planstart']) || '',
      planEndDate: findMatch(['planenddate', 'enddate', 'planend', 'reviewdate']) || '',
      riskLevel: findMatch(['risklevel', 'risk', 'safeguardlevel']) || '',
      supportCoordinatorName: findMatch(['supportcoordinatorname', 'supportcoordinator', 'coordinatorname', 'scname']) || '',
      supportCoordinatorEmail: findMatch(['supportcoordinatoremail', 'coordinatoremail', 'scemail']) || '',
      supportCoordinatorPhone: findMatch(['supportcoordinatorphone', 'coordinatorphone', 'scphone']) || '',
      planManagerAgency: findMatch(['planmanageragency', 'planmanager', 'pmagency']) || '',
      planManagerEmail: findMatch(['invoiceemail', 'planmanageremail', 'pmemail']) || '',
      emergencyContactName: findMatch(['emergencycontactname', 'emergencyname', 'contactname', 'guardian', 'nominee']) || '',
      emergencyContactPhone: findMatch(['emergencycontactphone', 'emergencyphone', 'guardianphone']) || '',
      address: findMatch(['address', 'streetaddress', 'street', 'location']) || '',
      suburb: findMatch(['suburb', 'city', 'town']) || '',
      primaryGoal: findMatch(['primarygoal', 'goal', 'ndisgoal', 'clinicalgoal']) || ''
    };
  };

  // Process raw data into structured rows with deep validation
  const validateRows = (
    rows: Record<string, string>[],
    currentMappings: FieldMapping
  ): ParsedParticipantRow[] => {
    const existingNdisSet = new Set(clients.map((c) => c.ndisNumber?.trim().toLowerCase()).filter(Boolean));
    const existingNameSet = new Set(clients.map((c) => c.name?.trim().toLowerCase()).filter(Boolean));
    const seenNdisInFile = new Set<string>();
    const seenNameInFile = new Set<string>();

    return rows.map((raw, idx) => {
      const rowId = `row-${idx + 1}`;
      const name = (raw[currentMappings.name] || '').trim();
      const preferredName = currentMappings.preferredName ? (raw[currentMappings.preferredName] || '').trim() : '';
      const email = (raw[currentMappings.email] || '').trim();
      const rawNdis = (raw[currentMappings.ndisNumber] || '').trim();
      const rawDob = (raw[currentMappings.dateOfBirth] || '').trim();
      const disability = (raw[currentMappings.primaryDisability] || '').trim() || 'Not stated';
      const phone = (raw[currentMappings.phone] || '').trim();
      const rawBudget = (raw[currentMappings.totalBudget] || '').trim();
      const rawCore = currentMappings.coreBudget ? (raw[currentMappings.coreBudget] || '').trim() : '';
      const rawCb = currentMappings.capacityBuildingBudget ? (raw[currentMappings.capacityBuildingBudget] || '').trim() : '';
      const rawPbs = currentMappings.pbsBudget ? (raw[currentMappings.pbsBudget] || '').trim() : '';
      const rawSpent = currentMappings.spentBudget ? (raw[currentMappings.spentBudget] || '').trim() : '';
      const rawPlanType = (raw[currentMappings.planManagementType] || '').trim();
      const planType =
        rawPlanType.toUpperCase() === 'NDIA'
          ? 'Agency-Managed (NDIA)'
          : rawPlanType.toLowerCase().includes('self')
          ? 'Self-Managed'
          : rawPlanType || 'Plan-Managed';
      const planStartDate = currentMappings.planStartDate ? (raw[currentMappings.planStartDate] || '').trim() : '';
      const planEndDate = currentMappings.planEndDate ? (raw[currentMappings.planEndDate] || '').trim() : '';
      const risk = (raw[currentMappings.riskLevel] || '').trim() || 'Medium';
      const scName = currentMappings.supportCoordinatorName ? (raw[currentMappings.supportCoordinatorName] || '').trim() : '';
      const scEmail = currentMappings.supportCoordinatorEmail ? (raw[currentMappings.supportCoordinatorEmail] || '').trim() : '';
      const scPhone = currentMappings.supportCoordinatorPhone ? (raw[currentMappings.supportCoordinatorPhone] || '').trim() : '';
      const pmAgency = currentMappings.planManagerAgency ? (raw[currentMappings.planManagerAgency] || '').trim() : '';
      const pmEmail = currentMappings.planManagerEmail ? (raw[currentMappings.planManagerEmail] || '').trim() : '';
      const contactName = (raw[currentMappings.emergencyContactName] || '').trim();
      const contactPhone = (raw[currentMappings.emergencyContactPhone] || '').trim();
      const address = (raw[currentMappings.address] || '').trim();
      const suburb = currentMappings.suburb ? (raw[currentMappings.suburb] || '').trim() : '';
      const primaryGoal = currentMappings.primaryGoal ? (raw[currentMappings.primaryGoal] || '').trim() : '';

      const errors: ValidationError[] = [];

      // 1. Validate Full Name
      if (!name) {
        errors.push({
          field: 'name',
          severity: 'error',
          message: 'Missing required field: Full Name is mandatory to create a participant.'
        });
      } else if (name.length < 2) {
        errors.push({
          field: 'name',
          severity: 'error',
          message: 'Malformed Name: Participant name must be at least 2 characters.'
        });
      }

      // 2. Validate Email (if provided)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email) {
        if (!emailRegex.test(email)) {
          errors.push({
            field: 'email',
            severity: 'error',
            message: `Malformed Email: "${email}" is not a valid email address format.`
          });
        }
      } else {
        errors.push({
          field: 'email',
          severity: 'warning',
          message: 'Optional: Email is not stated. Can be added during participant onboarding.'
        });
      }

      // 3. Validate NDIS Number
      const cleanDigitsNdis = rawNdis.replace(/[^0-9]/g, '');
      if (!rawNdis) {
        errors.push({
          field: 'ndisNumber',
          severity: 'warning',
          message: 'Missing NDIS Number. Will generate a provisional temporary ID if committed.'
        });
      } else if (/[a-zA-Z]/.test(rawNdis)) {
        errors.push({
          field: 'ndisNumber',
          severity: 'error',
          message: `Malformed NDIS Number: "${rawNdis}" contains alphabetical characters (expected 9 digits).`
        });
      } else if (cleanDigitsNdis.length !== 9) {
        errors.push({
          field: 'ndisNumber',
          severity: 'error',
          message: `Malformed NDIS Number: Contains ${cleanDigitsNdis.length} digits. Standard NDIS numbers must be exactly 9 digits.`
        });
      } else if (!cleanDigitsNdis.startsWith('43')) {
        errors.push({
          field: 'ndisNumber',
          severity: 'warning',
          message: `Notice: NDIS Number "${cleanDigitsNdis}" does not begin with standard prefix '43'.`
        });
      }

      // 4. Validate Date of Birth (preserve 'Not stated' when absent)
      let normalizedDob = rawDob;
      if (!rawDob || rawDob.toLowerCase() === 'not stated') {
        errors.push({
          field: 'dateOfBirth',
          severity: 'warning',
          message: 'Date of Birth is not stated. Marked for completion during Onboarding.'
        });
        normalizedDob = 'Not stated';
      } else {
        const parsedDate = new Date(rawDob);
        if (isNaN(parsedDate.getTime())) {
          errors.push({
            field: 'dateOfBirth',
            severity: 'error',
            message: `Malformed Date of Birth: "${rawDob}" cannot be parsed into a valid calendar date.`
          });
        } else {
          const now = new Date();
          if (parsedDate > now) {
            errors.push({
              field: 'dateOfBirth',
              severity: 'warning',
              message: `Notice: Date of Birth "${rawDob}" is recent or in 2026; please verify during onboarding.`
            });
            normalizedDob = parsedDate.toISOString().split('T')[0];
          } else {
            normalizedDob = parsedDate.toISOString().split('T')[0];
          }
        }
      }

      // 5. Duplicate Check
      const isDuplicateInDB =
        (cleanDigitsNdis && existingNdisSet.has(cleanDigitsNdis.toLowerCase())) ||
        (name && existingNameSet.has(name.toLowerCase()));

      let isDuplicateInFile = false;
      if (cleanDigitsNdis) {
        if (seenNdisInFile.has(cleanDigitsNdis)) isDuplicateInFile = true;
        seenNdisInFile.add(cleanDigitsNdis);
      }
      if (name) {
        if (seenNameInFile.has(name.toLowerCase())) isDuplicateInFile = true;
        seenNameInFile.add(name.toLowerCase());
      }

      if (isDuplicateInDB) {
        errors.push({
          field: 'name',
          severity: 'warning',
          message: 'Participant already exists in the Firestore database. Importing will merge/update this record.'
        });
      }
      if (isDuplicateInFile) {
        errors.push({
          field: 'name',
          severity: 'warning',
          message: 'Duplicate record detected within this imported file.'
        });
      }

      // Parse budgets — preserve 0 when unrecorded in the source file
      const parsedCore = rawCore ? Number(rawCore.replace(/[^0-9.]/g, '')) || 0 : undefined;
      const parsedCb = rawCb ? Number(rawCb.replace(/[^0-9.]/g, '')) || 0 : undefined;
      const parsedPbs = rawPbs ? Number(rawPbs.replace(/[^0-9.]/g, '')) || 0 : undefined;
      const parsedSpent = rawSpent ? Number(rawSpent.replace(/[^0-9.]/g, '')) || 0 : undefined;
      const computedSum = (parsedCore || 0) + (parsedCb || 0) + (parsedPbs || 0);
      const parsedBudget = rawBudget
        ? Number(rawBudget.replace(/[^0-9.]/g, '')) || 0
        : computedSum > 0
        ? computedSum
        : 0;

      if (!rawBudget && computedSum === 0) {
        errors.push({
          field: 'totalBudget',
          severity: 'warning',
          message: 'Budget not yet recorded ($0.00). Participant will be imported under Onboarding status.'
        });
      }

      // Risk level normalization
      let resolvedRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
      const lowerRisk = risk.toLowerCase();
      if (lowerRisk.includes('crit')) resolvedRisk = 'Critical';
      else if (lowerRisk.includes('high')) resolvedRisk = 'High';
      else if (lowerRisk.includes('low')) resolvedRisk = 'Low';

      const hasError = errors.some((e) => e.severity === 'error');

      return {
        rowId,
        selected: !hasError, // Select by default if no blocking errors
        raw,
        mapped: {
          name,
          preferredName: preferredName || undefined,
          email,
          ndisNumber: cleanDigitsNdis || rawNdis,
          dateOfBirth: normalizedDob,
          primaryDisability: disability,
          phone,
          totalBudget: parsedBudget,
          coreBudget: parsedCore,
          capacityBuildingBudget: parsedCb,
          pbsBudget: parsedPbs,
          spentBudget: parsedSpent,
          planManagementType: planType,
          planStartDate: planStartDate || undefined,
          planEndDate: planEndDate || undefined,
          riskLevel: resolvedRisk,
          supportCoordinatorName: scName || undefined,
          supportCoordinatorEmail: scEmail || undefined,
          supportCoordinatorPhone: scPhone || undefined,
          planManagerAgency: pmAgency || undefined,
          planManagerEmail: pmEmail || undefined,
          emergencyContactName: contactName,
          emergencyContactPhone: contactPhone,
          address,
          suburb: suburb || undefined,
          primaryGoal: primaryGoal || undefined
        },
        errors,
        isDuplicateInDB: !!isDuplicateInDB,
        isDuplicateInFile
      };
    });
  };

  // Smart table detector: handles standard CSVs and multi-table Executive Dashboard spreadsheets
  const extractSmartParticipantTableFromSheet = (
    worksheet: XLSX.WorkSheet
  ): { detectedHeaders: string[]; stringifiedRows: Record<string, string>[] } => {
    const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (!matrix || matrix.length === 0) {
      return { detectedHeaders: [], stringifiedRows: [] };
    }

    let headerRowIdx = 0;
    let startColIdx = 0;

    // Scan first 25 rows to locate a header row containing a Name column and an NDIS column
    for (let r = 0; r < Math.min(matrix.length, 25); r++) {
      const rowCells = (matrix[r] || []).map((c) => String(c ?? '').trim());
      const cleanCells = rowCells.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''));

      const nameCol = cleanCells.findIndex((c) =>
        ['participantname', 'fullname', 'clientname', 'name'].includes(c)
      );
      const ndisCol = cleanCells.findIndex((c) =>
        ['ndisnumber', 'ndisno', 'ndisid', 'ndis'].includes(c)
      );

      if (nameCol !== -1 && ndisCol !== -1) {
        headerRowIdx = r;
        startColIdx = Math.min(nameCol, ndisCol);
        break;
      }
    }

    const rawHeaderCells = (matrix[headerRowIdx] || []).slice(startColIdx).map((c) => String(c ?? '').trim());
    // Trim trailing empty header columns
    let lastNonEmptyCol = rawHeaderCells.length - 1;
    while (lastNonEmptyCol >= 0 && !rawHeaderCells[lastNonEmptyCol]) {
      lastNonEmptyCol--;
    }
    const detectedHeaders = rawHeaderCells
      .slice(0, lastNonEmptyCol + 1)
      .map((h, i) => h || `Column_${i + 1}`);

    const stringifiedRows: Record<string, string>[] = [];
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const rowSlice = (matrix[r] || []).slice(startColIdx, startColIdx + detectedHeaders.length);
      const rowObj: Record<string, string> = {};
      let hasMeaningfulValue = false;

      detectedHeaders.forEach((h, colIdx) => {
        const val = rowSlice[colIdx] !== undefined && rowSlice[colIdx] !== null ? String(rowSlice[colIdx]).trim() : '';
        rowObj[h] = val;
        if (val) hasMeaningfulValue = true;
      });

      // Skip blank rows or summary rows where the first column is 'Total'
      const firstCellVal = (rowObj[detectedHeaders[0]] || '').toLowerCase();
      if (!hasMeaningfulValue || firstCellVal === 'total') continue;

      stringifiedRows.push(rowObj);
    }

    return { detectedHeaders, stringifiedRows };
  };

  // Shared parser for CSV/TSV text (from file upload, Google Sheets export, or clipboard paste)
  const parseSpreadsheetText = (text: string, sourceName: string) => {
    try {
      const workbook = XLSX.read(text, { type: 'string' });
      // Prefer a sheet named 'Participants' if multiple sheets exist
      const targetSheetName =
        workbook.SheetNames.find((n) => n.toLowerCase().includes('participant')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[targetSheetName];
      const { detectedHeaders, stringifiedRows } = extractSmartParticipantTableFromSheet(worksheet);

      if (stringifiedRows.length === 0 || detectedHeaders.length === 0) {
        setFileErrorMessage('No participant rows were found. Ensure the sheet contains Participant Name and NDIS Number columns.');
        return;
      }

      setFileName(sourceName);
      setHeaders(detectedHeaders);
      setRawRows(stringifiedRows);
      const detectedMappings = autoDetectMappings(detectedHeaders);
      setMappings(detectedMappings);
      const validated = validateRows(stringifiedRows, detectedMappings);
      setParsedRows(validated);
      setStep('mapping');
      setFileErrorMessage(null);
    } catch (err) {
      console.error('Failed to parse spreadsheet text:', err);
      setFileErrorMessage('Failed to parse spreadsheet data. Please verify the CSV or pasted table format.');
    }
  };

  // Handle uploaded file (CSV or Excel)
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const targetSheetName =
            workbook.SheetNames.find((n) => n.toLowerCase().includes('participant')) || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[targetSheetName];
          const { detectedHeaders, stringifiedRows } = extractSmartParticipantTableFromSheet(worksheet);

          if (stringifiedRows.length === 0 || detectedHeaders.length === 0) {
            setFileErrorMessage('The Excel sheet appears to be empty. Please upload a sheet with participant rows.');
            return;
          }

          setHeaders(detectedHeaders);
          setRawRows(stringifiedRows);
          const detectedMappings = autoDetectMappings(detectedHeaders);
          setMappings(detectedMappings);
          const validated = validateRows(stringifiedRows, detectedMappings);
          setParsedRows(validated);
          setStep('mapping');
          setFileErrorMessage(null);
        } catch (err) {
          console.error('Failed to parse Excel:', err);
          setFileErrorMessage('Failed to parse Excel file. Please verify it is a valid .xlsx or .xls file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseSpreadsheetText(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Preload All 22 Business Participants from NDIS_Participants_Import_Template_V2
  const handlePreloadCompanyParticipants = async () => {
    const { COMPANY_DRIVE_PARTICIPANTS } = await import('@/lib/seedData');
    setFileName('NDIS_Participants_Import_Template_V2_Participants_22.csv');

    const sampleHeaders = [
      'Name',
      'NDIS Number',
      'Date of Birth',
      'Email',
      'Primary Disability',
      'Phone',
      'Total Budget',
      'Plan Management Type',
      'Risk Level',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Invoice Email',
      'Profile Status'
    ];

    const generatedRows = COMPANY_DRIVE_PARTICIPANTS.map((c) => ({
      'Name': c.name,
      'NDIS Number': c.ndisNumber,
      'Date of Birth': c.dateOfBirth || 'Not stated',
      'Email': c.email || '',
      'Primary Disability': c.primaryDisability || 'Not stated',
      'Phone': c.phone || '',
      'Total Budget': c.totalBudget ? String(c.totalBudget) : '',
      'Plan Management Type': c.planManagementType || 'Plan-Managed',
      'Risk Level': c.riskLevel || 'Medium',
      'Emergency Contact Name': c.emergencyContact?.name || '',
      'Emergency Contact Phone': c.emergencyContact?.phone || '',
      'Invoice Email': c.planManager?.email || '',
      'Profile Status': c.status === 'Active' ? 'Complete' : 'Needs Review'
    }));

    setHeaders(sampleHeaders);
    setRawRows(generatedRows);

    const presetMappings: FieldMapping = {
      name: 'Name',
      ndisNumber: 'NDIS Number',
      dateOfBirth: 'Date of Birth',
      email: 'Email',
      primaryDisability: 'Primary Disability',
      phone: 'Phone',
      totalBudget: 'Total Budget',
      planManagementType: 'Plan Management Type',
      riskLevel: 'Risk Level',
      emergencyContactName: 'Emergency Contact Name',
      emergencyContactPhone: 'Emergency Contact Phone',
      planManagerEmail: 'Invoice Email',
      address: ''
    };

    setMappings(presetMappings);
    const validated = validateRows(generatedRows, presetMappings);
    setParsedRows(validated);
    setStep('validation');
  };

  // Load sample dataset containing test validation errors to illustrate error highlighting
  const handleLoadSampleWithErrors = () => {
    setFileName('Participants_Data_Validation_Test_Sample.csv');

    const sampleHeaders = [
      'Full Name',
      'NDIS Number',
      'Date of Birth',
      'Email',
      'Primary Disability',
      'Total Budget',
      'Risk Level',
      'Contact Phone'
    ];

    const testRows = [
      {
        'Full Name': 'Marcus O\'Connor',
        'NDIS Number': '430192834',
        'Date of Birth': '1998-05-14',
        'Email': 'marcus.oc@breakthrough.org.au',
        'Primary Disability': 'Autism Spectrum Disorder',
        'Total Budget': '62000',
        'Risk Level': 'Medium',
        'Contact Phone': '0412 345 678'
      },
      {
        'Full Name': 'Elena Richardson',
        'NDIS Number': '43A91823B', // MALFORMED: contains letters!
        'Date of Birth': '2001-11-20',
        'Email': 'elena.richardson@domain.com',
        'Primary Disability': 'Intellectual Disability',
        'Total Budget': '45000',
        'Risk Level': 'Low',
        'Contact Phone': '0423 456 789'
      },
      {
        'Full Name': '', // MISSING NAME: error!
        'NDIS Number': '430881923',
        'Date of Birth': '1995-02-10',
        'Email': 'unnamed.participant@test.com',
        'Primary Disability': 'Acquired Brain Injury',
        'Total Budget': '80000',
        'Risk Level': 'High',
        'Contact Phone': '0434 567 890'
      },
      {
        'Full Name': 'Chloe Jenkins',
        'NDIS Number': '430291', // MALFORMED: only 6 digits!
        'Date of Birth': '2035-12-01', // MALFORMED: future date of birth!
        'Email': 'not-a-valid-email-syntax', // MALFORMED: bad email format!
        'Primary Disability': 'Down Syndrome',
        'Total Budget': '52000',
        'Risk Level': 'Medium',
        'Contact Phone': '0445 678 901'
      },
      {
        'Full Name': 'Ben Rusic', // Duplicate check (matches company participant)
        'NDIS Number': '430918234',
        'Date of Birth': '2006-04-12',
        'Email': 'ben.rusic@breakthrough.org.au',
        'Primary Disability': 'Autism Spectrum Disorder (Level 3)',
        'Total Budget': '62000',
        'Risk Level': 'High',
        'Contact Phone': '0456 789 012'
      },
      {
        'Full Name': 'Zoe Thompson',
        'NDIS Number': '', // MISSING NDIS: warning
        'Date of Birth': '2004-09-18',
        'Email': 'zoe.thompson@example.com',
        'Primary Disability': 'Psychosocial Disability',
        'Total Budget': '38000',
        'Risk Level': 'Low',
        'Contact Phone': '0467 890 123'
      },
      {
        'Full Name': 'David Armstrong',
        'NDIS Number': '431882941',
        'Date of Birth': '2002-07-25',
        'Email': '', // MISSING Email: warning
        'Primary Disability': 'Cerebral Palsy',
        'Total Budget': '74000',
        'Risk Level': 'High',
        'Contact Phone': '0478 901 234'
      }
    ];

    setHeaders(sampleHeaders);
    setRawRows(testRows);

    const testMappings: FieldMapping = {
      name: 'Full Name',
      ndisNumber: 'NDIS Number',
      dateOfBirth: 'Date of Birth',
      email: 'Email',
      primaryDisability: 'Primary Disability',
      phone: 'Contact Phone',
      totalBudget: 'Total Budget',
      planManagementType: '',
      riskLevel: 'Risk Level',
      emergencyContactName: '',
      emergencyContactPhone: '',
      address: ''
    };

    setMappings(testMappings);
    const validated = validateRows(testRows, testMappings);
    setParsedRows(validated);
    setStep('validation');
  };

  // Automatically preload validation preview data or initial CSV text if passed
  useEffect(() => {
    if (initialCsvText && initialCsvText.trim()) {
      parseSpreadsheetText(initialCsvText, initialFileName || 'Google_Drive_Participant_Roster.csv');
      return;
    }
    if (autoLoadPreviewData && parsedRows.length === 0) {
      handleLoadSampleWithErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadPreviewData, initialCsvText, initialFileName]);

  // Download Comprehensive NDIS Business Roster CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = generateParticipantTemplateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'NDIS_Business_Participants_Roster_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Re-run validation when mapping changes
  const handleApplyMappings = () => {
    const validated = validateRows(rawRows, mappings);
    setParsedRows(validated);
    setStep('validation');
  };

  // Quick Inline Edit for any table cell
  const handleCellSave = (rowId: string, field: keyof FieldMapping, newValue: string) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const updatedMapped = { ...row.mapped, [field]: newValue };
        if (field === 'totalBudget') {
          updatedMapped.totalBudget = Number(newValue.replace(/[^0-9.]/g, '')) || 0;
        }

        // Re-validate just this row
        const colKey = mappings[field] || String(field);
        const updatedRaw = { ...row.raw, [colKey]: newValue };
        const [revalidated] = validateRows([updatedRaw], { ...mappings, [field]: colKey });
        return {
          ...revalidated,
          rowId: row.rowId,
          selected: row.selected
        };
      })
    );
    setEditingCell(null);
  };

  // Auto-Sanitize & Repair Common Issues
  const handleAutoRepair = () => {
    setParsedRows((prev) =>
      prev.map((row) => {
        const m = { ...row.mapped };
        // Clean NDIS: strip symbols & letters if 9 digits can be extracted
        const digitsOnly = m.ndisNumber.replace(/[^0-9]/g, '');
        if (digitsOnly.length === 9) {
          m.ndisNumber = digitsOnly;
        } else if (!m.ndisNumber || m.ndisNumber.length === 0) {
          // generate clean provisional NDIS starting with 43
          m.ndisNumber = `43${Math.floor(1000000 + Math.random() * 9000000)}`;
        }

        // Clean Name
        if (m.name) {
          m.name = m.name.trim();
        }

        // Clean Email: trim & lower
        if (m.email) {
          m.email = m.email.trim().toLowerCase();
        }

        // Clean DOB
        if (m.dateOfBirth) {
          const d = new Date(m.dateOfBirth);
          if (!isNaN(d.getTime())) {
            const now = new Date();
            if (d > now) {
              // Future date fix to reasonable year
              d.setFullYear(2005);
            }
            m.dateOfBirth = d.toISOString().split('T')[0];
          }
        }

        const syntheticRaw: Record<string, string> = {
          ...row.raw,
          [mappings.name || 'name']: m.name,
          [mappings.email || 'email']: m.email,
          [mappings.ndisNumber || 'ndisNumber']: m.ndisNumber,
          [mappings.dateOfBirth || 'dateOfBirth']: m.dateOfBirth,
          [mappings.primaryDisability || 'primaryDisability']: m.primaryDisability,
          [mappings.phone || 'phone']: m.phone,
          [mappings.totalBudget || 'totalBudget']: String(m.totalBudget),
          [mappings.planManagementType || 'planManagementType']: m.planManagementType,
          [mappings.riskLevel || 'riskLevel']: m.riskLevel,
          [mappings.emergencyContactName || 'emergencyContactName']: m.emergencyContactName,
          [mappings.emergencyContactPhone || 'emergencyContactPhone']: m.emergencyContactPhone,
          [mappings.address || 'address']: m.address
        };

        const [revalidated] = validateRows([syntheticRaw], mappings);
        return {
          ...revalidated,
          rowId: row.rowId,
          selected: !revalidated.errors.some((e) => e.severity === 'error')
        };
      })
    );
  };

  // Toggle row selection
  const handleToggleSelectRow = (rowId: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, selected: !r.selected } : r))
    );
  };

  // Select all / none
  const handleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        const hasBlockingError = r.errors.some((e) => e.severity === 'error');
        if (select && hasBlockingError) return r; // don't select errors on bulk select
        return { ...r, selected: select };
      })
    );
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = parsedRows.length;
    const errors = parsedRows.filter((r) => r.errors.some((e) => e.severity === 'error')).length;
    const warnings = parsedRows.filter(
      (r) => !r.errors.some((e) => e.severity === 'error') && r.errors.some((e) => e.severity === 'warning')
    ).length;
    const valid = parsedRows.filter((r) => r.errors.length === 0).length;
    const selected = parsedRows.filter((r) => r.selected).length;
    const duplicates = parsedRows.filter((r) => r.isDuplicateInDB || r.isDuplicateInFile).length;

    return { total, errors, warnings, valid, selected, duplicates };
  }, [parsedRows]);

  // Filtered rows for display
  const displayedRows = useMemo(() => {
    return parsedRows.filter((r) => {
      // Search
      const searchLower = searchFilter.toLowerCase();
      const matchesSearch =
        !searchFilter ||
        r.mapped.name.toLowerCase().includes(searchLower) ||
        r.mapped.ndisNumber.includes(searchLower) ||
        r.mapped.email.toLowerCase().includes(searchLower) ||
        r.mapped.primaryDisability.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Filter tabs
      if (filterMode === 'errors') return r.errors.some((e) => e.severity === 'error');
      if (filterMode === 'warnings') {
        return !r.errors.some((e) => e.severity === 'error') && r.errors.some((e) => e.severity === 'warning');
      }
      if (filterMode === 'valid') return r.errors.length === 0;
      return true;
    });
  }, [parsedRows, filterMode, searchFilter]);

  // Transform and commit records directly to Firestore batch (with smart upsert/merge)
  const executeCommit = async (rowsToCommit: ParsedParticipantRow[]) => {
    if (!rowsToCommit || rowsToCommit.length === 0) {
      setFileErrorMessage('Please select at least one valid participant row to commit.');
      return;
    }

    setStep('committing');
    setCommitProgress(15);
    setCommitStatusText('Transforming participant records into clinical NDIS entities...');

    const newClients: Client[] = rowsToCommit.map((r, i) => {
      const cleanNdis = (r.mapped.ndisNumber || '').replace(/[^0-9]/g, '');
      const idSafe = (r.mapped.name || 'participant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
      const uniqueId =
        cleanNdis.length === 9
          ? `participant-${cleanNdis}`
          : `participant-${idSafe}-${Date.now().toString().slice(-5)}-${i + 1}`;

      const goalTitle =
        r.mapped.primaryGoal ||
        `Capacity Building & Positive Behaviour Support Goal — ${r.mapped.name || 'Participant'}`;

      const rawStatusStr = String(
        r.raw['Profile Status'] || r.raw['Status'] || r.raw['Action Needed'] || ''
      ).toLowerCase();
      const totalBudgetVal = typeof r.mapped.totalBudget === 'number' ? r.mapped.totalBudget : 0;
      const isOnboardingRecord = rawStatusStr.includes('onboarding');
      const resolvedStatus: 'Active' | 'Onboarding' = isOnboardingRecord ? 'Onboarding' : 'Active';

      const goals: ClientGoal[] = [
        {
          id: `g-${uniqueId}-1`,
          title: goalTitle,
          category: 'Capacity Building',
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          progressPercent: resolvedStatus === 'Active' ? 25 : 0,
          status: 'In Progress',
          gasScore: 0
        }
      ];

      const coreVal = r.mapped.coreBudget ?? 0;
      const cbVal = r.mapped.capacityBuildingBudget ?? 0;
      const pbsVal = r.mapped.pbsBudget ?? totalBudgetVal;

      return {
        id: uniqueId,
        ndisNumber: cleanNdis || r.mapped.ndisNumber || `43${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: r.mapped.name || 'Participant',
        ...(r.mapped.preferredName ? { preferredName: r.mapped.preferredName } : {}),
        ...(r.mapped.email && r.mapped.email.trim() ? { email: r.mapped.email.trim() } : {}),
        ...(r.mapped.phone && r.mapped.phone.trim() ? { phone: r.mapped.phone.trim(), contactNumber: r.mapped.phone.trim() } : {}),
        ...(r.mapped.address && r.mapped.address.trim() ? { address: r.mapped.address.trim() } : {}),
        ...(r.mapped.suburb && r.mapped.suburb.trim() ? { suburb: r.mapped.suburb.trim() } : {}),
        dateOfBirth: r.mapped.dateOfBirth || 'Not stated',
        primaryDisability: r.mapped.primaryDisability || 'Not stated',
        status: resolvedStatus,
        totalBudget: totalBudgetVal,
        allocatedBudget: totalBudgetVal,
        spentBudget: r.mapped.spentBudget ?? 0,
        budgetBreakdown: {
          core: coreVal,
          coreDailyActivities: coreVal,
          capacityBuildingTherapy: cbVal,
          capacityBuildingPBS: pbsVal,
          supportCoordination: 0,
          capital: 0
        },
        ...(r.mapped.supportCoordinatorName || r.mapped.supportCoordinatorEmail || r.mapped.supportCoordinatorPhone
          ? {
              supportCoordinator: {
                name: r.mapped.supportCoordinatorName || 'Support Coordinator',
                email: r.mapped.supportCoordinatorEmail || '',
                phone: r.mapped.supportCoordinatorPhone || ''
              }
            }
          : {}),
        ...(r.mapped.planManagerAgency || r.mapped.planManagerEmail
          ? {
              planManager: {
                agency: r.mapped.planManagerAgency || 'Plan Management Agency',
                email: r.mapped.planManagerEmail || ''
              }
            }
          : {}),
        planStartDate: r.mapped.planStartDate || new Date().toISOString().split('T')[0],
        planEndDate:
          r.mapped.planEndDate ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planManagementType: (r.mapped.planManagementType as any) || 'Plan-Managed',
        riskLevel: r.mapped.riskLevel || 'Medium',
        goals,
        primaryPractitionerId: currentUser?.practitionerId || 'prac-201',
        primaryPractitionerName: currentUser?.name || 'Practitioner',
        emergencyContact: {
          name: r.mapped.emergencyContactName || 'Nominee Contact',
          phone: r.mapped.emergencyContactPhone || '0400 000 000',
          relationship: 'Nominee / Support Contact'
        },
        restrictivePracticesActive: false,
        isCustomUserParticipant: true,
        driveFolderPath: `Staff Share Drive > Participants > Behaviour Support > ${r.mapped.name || 'Participant'}`,
        driveSubfolders: STANDARD_DRIVE_SUBFOLDERS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    setCommitProgress(40);
    setCommitStatusText(`Upserting & merging ${newClients.length} participants into Firestore "clients"...`);

    try {
      const result = await batchImportValidatedClients(newClients);
      setCommitProgress(100);
      setCommitStatusText(`Successfully committed ${result.count} participants to Firestore collection 'clients'!`);
      setCommitResult({
        count: result.count,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        error: result.error
      });
      setStep('completed');
    } catch (err: any) {
      console.error('Batch commit failed:', err);
      setCommitResult({ count: 0, error: err?.message || 'Firestore batch transaction failed.' });
      setStep('completed');
    }
  };

  // Commit selected participants directly to Firestore batch
  const handleCommitToFirestore = () => {
    const rowsToCommit = parsedRows.filter((r) => r.selected);
    if (rowsToCommit.length === 0) {
      setFileErrorMessage('Please select at least one valid participant row to commit.');
      return;
    }

    // Check if any selected row has hard errors
    const rowsWithErrors = rowsToCommit.filter((r) => r.errors.some((e) => e.severity === 'error'));
    if (rowsWithErrors.length > 0) {
      setShowErrorCommitPrompt(true);
      return;
    }

    executeCommit(rowsToCommit);
  };

  if (!isOpen) return null;

  const content = (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0 w-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">{modalTitle}</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20">
                Firestore Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Import, map, and validate participant records (CSV or Excel) with real-time field error highlighting before database commit
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* File error message */}
      {fileErrorMessage && (
        <div className="p-3.5 bg-rose-500/15 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{fileErrorMessage}</span>
          </div>
          <button
            onClick={() => setFileErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-0.5 rounded hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'upload' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            1
          </span>
          <span className={step === 'upload' ? 'text-teal-400 font-bold' : ''}>1. Source File</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'mapping' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            2
          </span>
          <span className={step === 'mapping' ? 'text-teal-400 font-bold' : ''}>2. Field Mapping</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'validation' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            3
          </span>
          <span className={step === 'validation' ? 'text-teal-400 font-bold' : ''}>3. Data Validation Grid</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === 'committing' || step === 'completed' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            4
          </span>
          <span className={step === 'completed' ? 'text-teal-400 font-bold' : ''}>4. Firestore Commit</span>
        </div>
      </div>

      {/* Main Body per Step */}
      <div className="p-6">
        {/* STEP 1: UPLOAD & SOURCE SELECTION */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Source Mode Toggle: File Upload vs Paste from Clipboard / Google Sheets */}
            <div className="flex items-center justify-between gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setShowPasteBox(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  !showPasteBox
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV or Excel File (.csv, .xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteBox(true)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  showPasteBox
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Paste Rows from Google Sheets / Clipboard</span>
              </button>
            </div>

            {!showPasteBox ? (
              /* Drag & Drop Area */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-3xl p-10 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/80 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .tsv, .txt, .xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                      Upload Business Participant Roster (CSV or Excel)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Drag and drop your spreadsheet here or click to browse. Supports <span className="text-teal-400 font-mono">.csv</span>,{' '}
                      <span className="text-teal-400 font-mono">.xlsx</span>, <span className="text-teal-400 font-mono">.xls</span>, and <span className="text-teal-400 font-mono">.tsv</span>.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                    <span>Existing participants matching by NDIS Number or Name are merged & updated automatically</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Paste from Google Sheets / Excel Clipboard */
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Paste Participant Rows Directly from Google Sheets or Excel
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Copy cells (including the header row) from Google Sheets or Excel and paste below. Tab-separated and comma-separated rows are automatically parsed.
                    </p>
                  </div>
                </div>
                <textarea
                  rows={7}
                  value={pastedSpreadsheetText}
                  onChange={(e) => setPastedSpreadsheetText(e.target.value)}
                  placeholder={`Name\tNDIS Number\tDate of Birth\tEmail\tPrimary Disability\tTotal Budget\tSupport Coordinator Name\nJordan Miller\t430891245\t2004-03-15\tjordan@example.com\tAutism Spectrum Disorder\t68500\tSarah Jenkins`}
                  className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!pastedSpreadsheetText.trim()}
                    onClick={() =>
                      parseSpreadsheetText(pastedSpreadsheetText, 'Pasted_Google_Sheets_Roster.csv')
                    }
                    className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>Parse & Map Pasted Rows</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option A: Download Comprehensive NDIS Business Roster Template */}
              <div
                onClick={handleDownloadTemplate}
                className="p-4 rounded-2xl bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/40 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                    23 NDIS Columns
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                  Download NDIS Business Roster CSV Template
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Includes Core, Therapy & PBS Budgets, Support Coordinator, Plan Manager, Plan Dates, and Primary Goal columns.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-xs text-teal-400 font-semibold">
                  <span>Download .CSV Template</span>
                  <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </div>

              {/* Option B: Breakthrough Company Participants (22) */}
              <div
                onClick={handlePreloadCompanyParticipants}
                className="p-4 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                    22 Participants
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Load Uploaded Business Roster V2 (22)
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Preloads all 22 participants from NDIS_Participants_Import_Template_V2 (4 Active, 18 Onboarding) for review and Firestore sync.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
                  <span>Preload & Validate</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Option C: Load Validation Error Test Sample */}
              <div
                onClick={handleLoadSampleWithErrors}
                className="p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold">
                    Validation Demo
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  Test Validation & Auto-Sanitizer
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Demonstrates automatic repair of malformed 9-digit NDIS numbers, dates of birth, and duplicate merging.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <span>Load Sample</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FIELD MAPPING */}
        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3">
              <Sliders className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-teal-300">
                  Map Spreadsheet Columns to Core & Extended NDIS Schema
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Columns from <span className="font-mono text-white">{fileName}</span> have been auto-matched. Verify core identity, NDIS budgets, Support Coordinator, and Plan Manager columns below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-1">
              {(
                [
                  { key: 'name', label: 'Full Name', badge: 'Required', required: true, desc: 'Participant full legal name' },
                  { key: 'ndisNumber', label: 'NDIS Number', badge: 'Required (9 Digits)', required: true, desc: '9-digit NDIS identifier' },
                  { key: 'dateOfBirth', label: 'Date of Birth', badge: 'Required', required: true, desc: 'YYYY-MM-DD or standard date' },
                  { key: 'preferredName', label: 'Preferred Name', badge: 'Optional', required: false, desc: 'Preferred first name' },
                  { key: 'email', label: 'Email Address', badge: 'Optional', required: false, desc: 'Participant or guardian email' },
                  { key: 'phone', label: 'Phone / Mobile', badge: 'Optional', required: false, desc: 'Contact phone number' },
                  { key: 'primaryDisability', label: 'Primary Disability', badge: 'Optional', required: false, desc: 'Primary NDIS diagnosis' },
                  { key: 'planManagementType', label: 'Plan Management Type', badge: 'NDIS Plan', required: false, desc: 'Plan-Managed, Self-Managed, NDIA' },
                  { key: 'planStartDate', label: 'Plan Start Date', badge: 'NDIS Plan', required: false, desc: 'Current NDIS plan start date' },
                  { key: 'planEndDate', label: 'Plan End Date', badge: 'NDIS Plan', required: false, desc: 'Current NDIS plan end date' },
                  { key: 'totalBudget', label: 'Total NDIS Budget ($)', badge: 'Funding', required: false, desc: 'Total plan funding amount' },
                  { key: 'coreBudget', label: 'Core Support Budget ($)', badge: 'Funding', required: false, desc: 'Core supports allocation' },
                  { key: 'capacityBuildingBudget', label: 'Capacity Building Budget ($)', badge: 'Funding', required: false, desc: 'Therapy / CB allocation' },
                  { key: 'pbsBudget', label: 'Behaviour Support (PBS) Budget ($)', badge: 'Funding', required: false, desc: 'Specialist PBS allocation' },
                  { key: 'spentBudget', label: 'Spent Budget ($)', badge: 'Funding', required: false, desc: 'Funds already claimed/spent' },
                  { key: 'riskLevel', label: 'Clinical Risk Level', badge: 'Clinical', required: false, desc: 'Low, Medium, High, Critical' },
                  { key: 'supportCoordinatorName', label: 'Support Coordinator Name', badge: 'Stakeholder', required: false, desc: 'Assigned Support Coordinator' },
                  { key: 'supportCoordinatorEmail', label: 'Support Coordinator Email', badge: 'Stakeholder', required: false, desc: 'Support Coordinator email' },
                  { key: 'planManagerAgency', label: 'Plan Manager Agency', badge: 'Stakeholder', required: false, desc: 'Plan management provider' },
                  { key: 'planManagerEmail', label: 'Plan Manager Email', badge: 'Stakeholder', required: false, desc: 'Billing/invoices email' },
                  { key: 'emergencyContactName', label: 'Emergency Contact Name', badge: 'Safety', required: false, desc: 'Guardian / Nominee name' },
                  { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', badge: 'Safety', required: false, desc: 'Guardian / Nominee phone' },
                  { key: 'address', label: 'Street Address', badge: 'Location', required: false, desc: 'Residential address' },
                  { key: 'primaryGoal', label: 'Primary NDIS Goal', badge: 'Clinical', required: false, desc: 'Initial clinical goal title' }
                ] as Array<{ key: keyof FieldMapping; label: string; badge: string; required: boolean; desc: string }>
              ).map((field) => (
                <div key={field.key} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">{field.label}</label>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        field.required
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {field.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{field.desc}</p>
                  <select
                    value={(mappings[field.key] as string) || ''}
                    onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium"
                  >
                    <option value="">-- None / Default --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h} (e.g. &quot;{rawRows[0]?.[h] || ''}&quot;)
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Back to Upload
              </button>
              <button
                onClick={handleApplyMappings}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/20"
              >
                <span>Proceed to Data Validation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: INTERACTIVE DATA VALIDATION GRID */}
        {step === 'validation' && (
          <div className="space-y-5">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</span>
                <div className="text-xl font-extrabold text-white mt-0.5">{metrics.total}</div>
                <span className="text-[10px] text-slate-500">From {fileName}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Ready to Commit</span>
                <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{metrics.valid}</div>
                <span className="text-[10px] text-emerald-400/80">0 issues found</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Malformed / Errors</span>
                <div className="text-xl font-extrabold text-rose-300 mt-0.5">{metrics.errors}</div>
                <span className="text-[10px] text-rose-400/80">Action required</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Warnings</span>
                <div className="text-xl font-extrabold text-amber-300 mt-0.5">{metrics.warnings}</div>
                <span className="text-[10px] text-amber-400/80">Non-blocking notice</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Duplicates</span>
                <div className="text-xl font-extrabold text-purple-300 mt-0.5">{metrics.duplicates}</div>
                <span className="text-[10px] text-purple-400/80">Existing in DB / file</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Selected</span>
                <div className="text-xl font-extrabold text-teal-300 mt-0.5">{metrics.selected}</div>
                <span className="text-[10px] text-teal-400/80">Will be committed</span>
              </div>
            </div>

            {/* Action Bar & Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    filterMode === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({metrics.total})
                </button>
                <button
                  onClick={() => setFilterMode('errors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    filterMode === 'errors'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Errors ({metrics.errors})
                </button>
                <button
                  onClick={() => setFilterMode('warnings')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    filterMode === 'warnings'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Warnings ({metrics.warnings})
                </button>
                <button
                  onClick={() => setFilterMode('valid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    filterMode === 'valid'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid ({metrics.valid})
                </button>
              </div>

              {/* Quick Repair & Selection Tools */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAutoRepair}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-bold border border-teal-500/20 flex items-center gap-1.5"
                  title="Automatically fix common formatting errors, sanitize NDIS numbers, and format dates"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Sanitize Formats</span>
                </button>

                <button
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Select Valid
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Prominent Red Alert Banner when errors exist */}
            {metrics.errors > 0 && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg shadow-rose-950/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                      <span>{metrics.errors} Participant Row{metrics.errors > 1 ? 's' : ''} Flagged with Malformed or Missing Data</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold tracking-wide">
                        Highlighted in Red Below
                      </span>
                    </h4>
                    <p className="text-xs text-rose-200/90 mt-1">
                      Rows with missing names, invalid NDIS number lengths/letters, or future dates are highlighted in red. Click any cell to edit inline, click &quot;Auto-Sanitize Formats&quot;, or exclude invalid rows before committing to Firestore.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    onClick={handleAutoRepair}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-900/30 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Sanitize Formats</span>
                  </button>
                  <button
                    onClick={() => {
                      setParsedRows((prev) =>
                        prev.map((r) =>
                          r.errors.some((e) => e.severity === 'error') ? { ...r, selected: false } : r
                        )
                      );
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    Exclude Red Rows
                  </button>
                </div>
              </div>
            )}

            {/* Validation Table with Visual Highlighting */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shadow-sm">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={metrics.selected === metrics.total && metrics.total > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded text-teal-500 focus:ring-teal-400"
                        />
                      </th>
                      <th className="p-3 w-12">#</th>
                      <th className="p-3 w-32">Status</th>
                      <th className="p-3 min-w-[160px]">Participant Name</th>
                      <th className="p-3 min-w-[140px]">NDIS Number</th>
                      <th className="p-3 min-w-[130px]">Date of Birth</th>
                      <th className="p-3 min-w-[180px]">Email Address</th>
                      <th className="p-3 min-w-[150px]">Primary Disability</th>
                      <th className="p-3 min-w-[100px]">Budget</th>
                      <th className="p-3 min-w-[90px]">Risk</th>
                      <th className="p-3 min-w-[240px]">Validation Issues & Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          No participant rows matching current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row, idx) => {
                        const hasErrors = row.errors.some((e) => e.severity === 'error');
                        const hasWarnings = row.errors.some((e) => e.severity === 'warning');

                        // Field error helpers
                        const nameError = row.errors.find((e) => e.field === 'name');
                        const ndisError = row.errors.find((e) => e.field === 'ndisNumber');
                        const dobError = row.errors.find((e) => e.field === 'dateOfBirth');
                        const emailError = row.errors.find((e) => e.field === 'email');

                        return (
                          <tr
                            key={row.rowId}
                            className={`transition-colors border-b border-slate-800/80 ${
                              hasErrors
                                ? 'bg-rose-950/45 hover:bg-rose-950/65 border-l-4 border-l-rose-500 text-rose-50 shadow-inner'
                                : hasWarnings
                                ? 'bg-amber-950/15 hover:bg-amber-950/25 border-l-4 border-l-amber-500/60'
                                : 'hover:bg-slate-800/40 border-l-4 border-l-emerald-500/40'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => handleToggleSelectRow(row.rowId)}
                                className="rounded text-teal-500 focus:ring-teal-400"
                              />
                            </td>

                            {/* Row Index */}
                            <td className="p-3 font-mono text-slate-500 text-[11px]">{idx + 1}</td>

                            {/* Status Badge */}
                            <td className="p-3 whitespace-nowrap">
                              {hasErrors ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-rose-600/30 text-rose-200 font-bold border border-rose-500/50 shadow-sm shadow-rose-950/50">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                  Missing / Malformed
                                </span>
                              ) : hasWarnings ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  Warning
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  Valid
                                </span>
                              )}
                            </td>

                            {/* Participant Name Cell (highlighted in red if missing or error) */}
                            <td
                              className={`p-3 font-bold ${
                                nameError
                                  ? 'bg-rose-950/40 text-rose-200'
                                  : 'text-white'
                              }`}
                              title={nameError?.message}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'name' ? (
                                <input
                                  type="text"
                                  autoFocus
                                  defaultValue={row.mapped.name}
                                  onBlur={(e) => handleCellSave(row.rowId, 'name', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave(row.rowId, 'name', (e.target as any).value);
                                  }}
                                  className="w-full p-1 bg-slate-900 border border-teal-500 rounded text-xs text-white"
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingCell({ rowId: row.rowId, field: 'name' })}
                                  className="cursor-pointer hover:underline flex items-center justify-between group"
                                >
                                  {nameError ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/50 font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.name || '[Missing Full Name]'}</span>
                                    </span>
                                  ) : (
                                    <span>{row.mapped.name}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* NDIS Number Cell (highlighted in red if malformed) */}
                            <td
                              className={`p-3 font-mono ${
                                ndisError?.severity === 'error'
                                  ? 'bg-rose-950/40 text-rose-200 font-bold'
                                  : ndisError?.severity === 'warning'
                                  ? 'bg-amber-950/20 text-amber-200'
                                  : 'text-teal-400'
                              }`}
                              title={ndisError?.message}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'ndisNumber' ? (
                                <input
                                  type="text"
                                  autoFocus
                                  defaultValue={row.mapped.ndisNumber}
                                  onBlur={(e) => handleCellSave(row.rowId, 'ndisNumber', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      handleCellSave(row.rowId, 'ndisNumber', (e.target as any).value);
                                  }}
                                  className="w-full p-1 bg-slate-900 border border-teal-500 rounded text-xs text-white font-mono"
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingCell({ rowId: row.rowId, field: 'ndisNumber' })}
                                  className="cursor-pointer hover:underline flex items-center justify-between"
                                >
                                  {ndisError?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/50 font-mono font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.ndisNumber || '[Missing NDIS #]'}</span>
                                    </span>
                                  ) : ndisError?.severity === 'warning' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/50 font-mono">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                      <span>{row.mapped.ndisNumber || '[Missing NDIS #]'}</span>
                                    </span>
                                  ) : (
                                    <span>{row.mapped.ndisNumber}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Date of Birth Cell (highlighted in red if malformed) */}
                            <td
                              className={`p-3 whitespace-nowrap font-mono ${
                                dobError?.severity === 'error'
                                  ? 'bg-rose-950/40 text-rose-200 font-bold'
                                  : dobError?.severity === 'warning'
                                  ? 'bg-amber-950/20 text-amber-200'
                                  : 'text-slate-300'
                              }`}
                              title={dobError?.message}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'dateOfBirth' ? (
                                <input
                                  type="date"
                                  autoFocus
                                  defaultValue={row.mapped.dateOfBirth}
                                  onBlur={(e) => handleCellSave(row.rowId, 'dateOfBirth', e.target.value)}
                                  className="p-1 bg-slate-900 border border-teal-500 rounded text-xs text-white"
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingCell({ rowId: row.rowId, field: 'dateOfBirth' })}
                                  className="cursor-pointer hover:underline"
                                >
                                  {dobError?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/50 font-mono font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.dateOfBirth || '[Invalid DOB]'}</span>
                                    </span>
                                  ) : dobError?.severity === 'warning' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/50 font-mono">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                      <span>{row.mapped.dateOfBirth}</span>
                                    </span>
                                  ) : (
                                    <span>{row.mapped.dateOfBirth}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Email Cell (highlighted in red if invalid format) */}
                            <td
                              className={`p-3 ${
                                emailError?.severity === 'error'
                                  ? 'bg-rose-950/40 text-rose-200 font-bold'
                                  : emailError?.severity === 'warning'
                                  ? 'text-slate-500'
                                  : 'text-slate-300'
                              }`}
                              title={emailError?.message}
                            >
                              {editingCell?.rowId === row.rowId && editingCell.field === 'email' ? (
                                <input
                                  type="email"
                                  autoFocus
                                  defaultValue={row.mapped.email}
                                  onBlur={(e) => handleCellSave(row.rowId, 'email', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave(row.rowId, 'email', (e.target as any).value);
                                  }}
                                  className="w-full p-1 bg-slate-900 border border-teal-500 rounded text-xs text-white"
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingCell({ rowId: row.rowId, field: 'email' })}
                                  className="cursor-pointer hover:underline truncate max-w-[200px]"
                                >
                                  {emailError?.severity === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/50 font-semibold truncate max-w-[200px]">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <span>{row.mapped.email || '[Invalid Email]'}</span>
                                    </span>
                                  ) : (
                                    <span>{row.mapped.email || <em className="text-slate-600 font-normal">None</em>}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Disability */}
                            <td className="p-3 text-slate-300 truncate max-w-[150px]">
                              {row.mapped.primaryDisability}
                            </td>

                            {/* Budget */}
                            <td className="p-3 font-mono text-slate-300">
                              ${row.mapped.totalBudget.toLocaleString()}
                            </td>

                            {/* Risk */}
                            <td className="p-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  row.mapped.riskLevel === 'Critical'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : row.mapped.riskLevel === 'High'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {row.mapped.riskLevel}
                              </span>
                            </td>

                            {/* Validation Errors & Tooltip Warnings */}
                            <td className="p-3">
                              {row.errors.length === 0 ? (
                                <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> All fields valid
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {row.errors.map((err, i) => (
                                    <div
                                      key={i}
                                      className={`text-[11px] flex items-center gap-1.5 ${
                                        err.severity === 'error' ? 'text-rose-400 font-semibold' : 'text-amber-400'
                                      }`}
                                    >
                                      {err.severity === 'error' ? (
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                      ) : (
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                      )}
                                      <span>{err.message}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Adjust Column Mappings
                </button>
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                >
                  Upload Different File
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-slate-400">Ready to commit: </span>
                  <strong className="text-white font-mono">{metrics.selected}</strong>
                  <span className="text-slate-400"> of {metrics.total} participants</span>
                </div>

                <button
                  onClick={handleCommitToFirestore}
                  disabled={metrics.selected === 0}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/20"
                >
                  <Database className="w-4 h-4" />
                  <span>Commit Batch to Firestore Database</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: COMMITTING PROGRESS */}
        {step === 'committing' && (
          <div className="py-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Committing Batch to Firestore</h3>
              <p className="text-xs text-slate-400 mt-1">{commitStatusText}</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-500 h-full transition-all duration-300"
                style={{ width: `${commitProgress}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-slate-500">{commitProgress}% complete</p>
          </div>
        )}

        {/* STEP 5: COMPLETED */}
        {step === 'completed' && (
          <div className="py-10 text-center space-y-4 max-w-md mx-auto">
            {commitResult?.error ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Commit Failed</h3>
                  <p className="text-xs text-rose-300 mt-1">{commitResult.error}</p>
                </div>
                <button
                  onClick={() => setStep('validation')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Return to Validation
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Batch Committed to Firestore</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Successfully synchronized <strong className="text-teal-400">{commitResult?.count}</strong> participant profiles directly to Firestore
                    {typeof commitResult?.createdCount === 'number' && typeof commitResult?.updatedCount === 'number' ? (
                      <span>
                        {' '}
                        (<strong>{commitResult.createdCount}</strong> newly created,{' '}
                        <strong>{commitResult.updatedCount}</strong> existing records merged & updated).
                      </span>
                    ) : (
                      '.'
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard 12-folder Google Drive structures, NDIS budget breakdowns, and audit logs have been initialized.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  {onSuccessNavigate && (
                    <button
                      onClick={onSuccessNavigate}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>View Participants Caseload</span>
                    </button>
                  )}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Done
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showErrorCommitPrompt && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Malformed Participant Records Detected</h3>
                <p className="text-xs text-rose-300 mt-1">
                  {metrics.errors} of your selected rows contain missing or malformed fields (highlighted in red).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              NDIS quality standards require valid names, 9-digit NDIS numbers, and legitimate dates of birth before storing to Firestore.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowErrorCommitPrompt(false);
                  handleAutoRepair();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto-Sanitize Formats & Proceed</span>
              </button>

              <button
                onClick={() => {
                  setShowErrorCommitPrompt(false);
                  const validSelected = parsedRows.filter(
                    (r) => !r.errors.some((e) => e.severity === 'error') && r.selected
                  );
                  setParsedRows((prev) =>
                    prev.map((r) =>
                      r.errors.some((e) => e.severity === 'error') ? { ...r, selected: false } : r
                    )
                  );
                  executeCommit(validSelected);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Exclude Red Rows & Commit Only Valid ({metrics.valid})</span>
              </button>

              <button
                onClick={() => setShowErrorCommitPrompt(false)}
                className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
              >
                Cancel & Review in Data Table
              </button>
            </div>
          </div>
        </div>
      )}

      {isModal ? (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {content}
          </div>
        </div>
      ) : (
        content
      )}
    </>
  );
};
